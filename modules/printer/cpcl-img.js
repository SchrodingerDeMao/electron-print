/**
 * CPCL图像打印模块
 * 处理Canvas转CPCL命令的打印功能
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const utils = require('../utils');
const appModule = require('../app');
// 引入日志模块
const logger = require('../logger');
// 引入canvas库
const { createCanvas, loadImage } = require('canvas');

/**
 * 将图片转换为CPCL命令
 * @param {string} base64Data - base64编码的图片数据
 * @param {Object} options - 打印选项
 * @param {number} [options.width] - 图片宽度(点)
 * @param {number} [options.height] - 图片高度(点)
 * @param {number} [options.x] - 起始X坐标
 * @param {number} [options.y] - 起始Y坐标
 * @param {boolean} [options.dithering] - 是否进行抖动处理
 * @param {boolean} [options.invert] - 是否反转黑白
 * @returns {Promise<string>} CPCL命令字符串
 */
async function convertImageToCPCL(base64Data, options = {}) {
  try {
    console.log('开始将图片转换为CPCL命令');
    
    // 去除可能的Data URL前缀
    let imageData = base64Data;
    if (base64Data.startsWith('data:image')) {
      imageData = base64Data.split(',')[1];
    }
    
    // 将Base64图片保存为临时文件
    const tempDir = path.join(os.tmpdir(), 'wms-print-cpcl');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempImgPath = path.join(tempDir, `temp-img-${Date.now()}.png`);
    await utils.saveBase64ToFile(imageData, tempImgPath);
    console.log(`图片已保存到临时文件: ${tempImgPath}`);
    
    // 读取图片信息并处理为单色位图
    const imgBuffer = fs.readFileSync(tempImgPath);
    
    // 创建隐藏窗口用于处理图像
    let printerWindow = appModule.getPrinterWindow();
    if (!printerWindow) {
      printerWindow = appModule.createPrinterWindow();
    }
    
    // 使用Electron的webContents将图片转换为单色位图
    await printerWindow.loadURL('about:blank');
    
    // 创建用于图像处理的HTML
    const processImageHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>图像处理</title>
      </head>
      <body>
        <canvas id="imageCanvas" style="display:none;"></canvas>
        <script>
          // 将图片转换为单色位图
          function processImage(imgSrc, options) {
            return new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = function() {
                const width = options.width || img.width;
                const height = options.height || img.height;
                
                // 创建canvas
                const canvas = document.getElementById('imageCanvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // 清除画布
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                
                // 绘制图像
                ctx.drawImage(img, 0, 0, width, height);
                
                // 获取图像数据
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                
                // 转换为黑白图像
                const threshold = 128;
                const binaryData = new Uint8Array(Math.ceil(width * height / 8));
                
                for (let y = 0; y < height; y++) {
                  for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    // 计算灰度值 (0.299*R + 0.587*G + 0.114*B)
                    const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                    
                    // 比较阈值，确定是黑点还是白点
                    const pixelValue = options.invert ? (gray > threshold ? 1 : 0) : (gray > threshold ? 0 : 1);
                    
                    // 计算位图的对应位置，8个点为一个字节
                    const byteIdx = Math.floor((y * width + x) / 8);
                    const bitIdx = 7 - ((y * width + x) % 8); // MSB优先
                    
                    if (pixelValue) {
                      binaryData[byteIdx] |= (1 << bitIdx);
                    }
                  }
                }
                
                // 将二进制数据转换为base64
                let binaryStr = '';
                for (let i = 0; i < binaryData.length; i++) {
                  binaryStr += String.fromCharCode(binaryData[i]);
                }
                const base64Output = btoa(binaryStr);
                
                // 返回处理结果
                resolve({
                  width,
                  height,
                  binaryData: base64Output,
                  bytesPerRow: Math.ceil(width / 8)
                });
              };
              
              img.onerror = function() {
                reject(new Error('图片加载失败'));
              };
              
              img.src = imgSrc;
            });
          }
          
          // 全局对象用于存储处理结果
          window.imageProcessor = { processImage };
        </script>
      </body>
      </html>
    `;
    
    await printerWindow.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(processImageHtml)}`);
    
    // 调用渲染进程中的处理函数
    const processingResult = await printerWindow.webContents.executeJavaScript(`
      window.imageProcessor.processImage("data:image/png;base64,${imageData}", ${JSON.stringify(options)})
    `);
    
    console.log(`图片处理完成: ${processingResult.width}x${processingResult.height} 像素`);
    
    // 生成CPCL命令
    const x = options.x || 0;
    const y = options.y || 0;
    const width = processingResult.width;
    const height = processingResult.height;
    const bytesPerRow = processingResult.bytesPerRow;
    const binaryData = processingResult.binaryData;
    
    // 构建CPCL命令
    let cpclCommand = '! 0 200 200 400 1\r\n'; // 标准CPCL开头，分辨率200dpi
    cpclCommand += `EG ${width} ${height} ${bytesPerRow} ${binaryData}\r\n`; // EG命令用于打印位图
    cpclCommand += 'FORM\r\n';
    cpclCommand += 'PRINT\r\n';
    
    console.log('CPCL命令生成完成');
    
    // 清理临时文件
    try {
      fs.unlinkSync(tempImgPath);
    } catch (e) {
      console.warn('清理临时文件失败:', e);
    }
    
    return cpclCommand;
  } catch (error) {
    console.error('转换图片为CPCL失败:', error);
    throw error;
  }
}

/**
 * 发送CPCL命令到打印机
 * @param {string} cpclCommand - CPCL命令
 * @param {string} printerName - 打印机名称
 * @returns {Promise<object>} 打印结果
 */
async function sendCPCLToPrinter(cpclCommand, printerName) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`开始发送CPCL命令到打印机: ${printerName}`);
      
      // 将CPCL命令保存到临时文件
      const tempDir = path.join(os.tmpdir(), 'wms-print-cpcl');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const cpclFilePath = path.join(tempDir, `cpcl-cmd-${Date.now()}.txt`);
      fs.writeFileSync(cpclFilePath, cpclCommand, 'utf8');
      
      // 根据操作系统选择不同的打印方式
      if (process.platform === 'win32') {
        // Windows系统通过copy命令发送到打印机
        const command = `copy /b "${cpclFilePath}" "${printerName}"`;
        console.log(`执行命令: ${command}`);
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`执行打印命令失败: ${error.message}`);
            reject(new Error(`打印失败: ${error.message}`));
            return;
          }
          
          if (stderr) {
            console.warn(`打印警告: ${stderr}`);
          }
          
          console.log('CPCL命令已成功发送到打印机');
          resolve({ success: true, message: 'CPCL打印命令已发送' });
          
          // 清理临时文件
          try {
            console.warn('清理临时文件成功:', cpclFilePath);
            fs.unlinkSync(cpclFilePath);
          } catch (e) {
            console.warn('清理临时文件失败:', e);
          }
        });
      } else {
        // Linux/macOS通过lp命令打印
        const command = `lp -d "${printerName}" "${cpclFilePath}"`;
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`执行打印命令失败: ${error.message}`);
            reject(new Error(`打印失败: ${error.message}`));
            return;
          }
          
          console.log('CPCL命令已成功发送到打印机');
          resolve({ success: true, message: 'CPCL打印命令已发送' });
          
          // 清理临时文件
          try {
            fs.unlinkSync(cpclFilePath);
          } catch (e) {
            console.warn('清理临时文件失败:', e);
          }
        });
      }
    } catch (error) {
      console.error('发送CPCL命令失败:', error);
      reject(error);
    }
  });
}

/**
 * 使用CPCL命令打印图片
 * @param {string} base64Data - base64编码的图片数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @param {number} [options.width] - 图片宽度(点)
 * @param {number} [options.height] - 图片高度(点)
 * @param {number} [options.x] - 起始X坐标
 * @param {number} [options.y] - 起始Y坐标
 * @param {boolean} [options.dithering] - 是否进行抖动处理
 * @param {boolean} [options.invert] - 是否反转黑白
 * @returns {Promise<object>} 打印结果
 */
async function printImageWithCPCL(base64Data, printerName, options = {}) {
  try {
    console.log('开始CPCL打印流程');
    
    // 1. 转换图片为CPCL命令
    const cpclCommand = await convertImageToCPCL(base64Data, options);
    
    // 2. 发送命令到打印机
    const result = await sendCPCLToPrinter(cpclCommand, printerName);
    
    return result;
  } catch (error) {
    console.error('CPCL打印失败:', error);
    throw error;
  }
}

/**
 * 生成并保存CPCL命令到文件
 * @param {string} base64Data - base64编码的图片数据
 * @param {string} outputPath - 输出文件路径
 * @param {Object} options - 打印选项
 * @returns {Promise<string>} 输出文件路径
 */
async function saveCPCLCommandToFile(base64Data, outputPath, options = {}) {
  try {
    // 生成CPCL命令
    const cpclCommand = await convertImageToCPCL(base64Data, options);
    
    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(outputPath, cpclCommand, 'utf8');
    console.log(`CPCL命令已保存到: ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    console.error('保存CPCL命令失败:', error);
    throw error;
  }
}

/**
 * 将二值化位图编码为十六进制字符串
 * @param {string} bitmap - 二值化的位图数据(0和1组成的字符串)
 * @returns {string} 十六进制编码的字符串
 */
function encodeToHex(bitmap) {
  // 移除换行符
  const lines = bitmap.split('\n').filter(line => line.length > 0);
  const height = lines.length;
  if (height === 0) return '';
  
  const width = lines[0].length;
  console.log(`编码位图: ${width}x${height}`);
  
  let result = '';
  // 每8位转换为一个字节
  for (let y = 0; y < height; y++) {
    const line = lines[y].padEnd(Math.ceil(width / 8) * 8, '0');
    for (let i = 0; i < line.length; i += 8) {
      const byte = line.substring(i, i + 8);
      // 将8位二进制转换为十六进制
      const hexValue = parseInt(byte, 2).toString(16).padStart(2, '0').toUpperCase();
      result += hexValue;
    }
  }
  
  return result;
}

/**
 * 将PNG图像转换为CPCL命令
 * @param {string} pngPath - PNG图像文件路径
 * @param {Object} options - 转换选项
 * @param {number} [options.x=0] - 起始X坐标
 * @param {number} [options.y=0] - 起始Y坐标
 * @param {number} [options.threshold=128] - 二值化阈值(0-255)
 * @returns {Promise<string>} CPCL命令字符串
 */
async function pngToCPCLBase64(pngPath, options = {}) {
  try {
    console.log(`开始处理PNG图像: ${pngPath}`);
    
    // 加载图像
    const image = await loadImage(pngPath);
    const width = image.width;
    const height = image.height;
    console.log(`图像尺寸: ${width}x${height}`);
    
    // 创建canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // 绘制图像
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    // 二值化参数
    const threshold = options.threshold || 128;
    console.log(`使用阈值: ${threshold}`);
    
    // 二值化处理
    let bitmap = '';
    for (let y = 0; y < height; y++) {
      let row = '';
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // 计算灰度值
        const gray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
        // 根据阈值判断黑白
        row += gray < threshold ? '1' : '0';
      }
      bitmap += row + '\n';
    }
    
    // 计算每行字节数
    const bytesPerRow = Math.ceil(width / 8);
    
    // 起始坐标
    const x = options.x || 0;
    const y = options.y || 0;
    
    // 构建CPCL命令
    const cpclCommand = `! 0 200 200 ${height} 1\r\n`
      + `EG ${width} ${height} ${x} ${y} ${encodeToHex(bitmap)}\r\n`
      + `FORM\r\n`
      + `PRINT\r\n`;
    
    console.log('CPCL命令生成完成',cpclCommand);
    return cpclCommand;
  } catch (error) {
    console.error('PNG转CPCL处理失败:', error);
    throw error;
  }
}

/**
 * 使用新的PNG到CPCL方法打印图片
 * @param {string} pngPath - PNG图像文件路径
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {Promise<object>} 打印结果
 */
async function printPngWithCPCL(pngPath, printerName, options = {}) {
  try {
    console.log(`使用PNG到CPCL方法打印图片: ${pngPath}`);
    
    // 1. 转换PNG为CPCL命令
    const cpclCommand = await pngToCPCLBase64(pngPath, options);
    
    // 2. 发送命令到打印机
    return await sendCPCLToPrinter(cpclCommand, printerName);
  } catch (error) {
    console.error('PNG CPCL打印失败:', error);
    throw error;
  }
}

/**
 * 使用新的方法将Base64图像转为PNG然后打印
 * @param {string} base64Data - Base64编码的图像数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {Promise<object>} 打印结果
 */
async function printBase64WithPngCPCL(base64Data, printerName, options = {}) {
  try {
    console.log('开始使用PNG CPCL方法打印Base64图像');
    
    // 去除可能的Data URL前缀
    let imageData = base64Data;
    if (base64Data.startsWith('data:image')) {
      imageData = base64Data.split(',')[1];
    }
    
    // 保存为临时PNG文件
    const tempDir = path.join(os.tmpdir(), 'wms-print-cpcl');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempPngPath = path.join(tempDir, `temp-png-${Date.now()}.png`);
    await utils.saveBase64ToFile(imageData, tempPngPath);
    console.log(`Base64图像已保存为临时PNG: ${tempPngPath}`);
    
    try {
      // 使用PNG打印方法
      const result = await printPngWithCPCL(tempPngPath, printerName, options);
      return result;
    } finally {
      // 清理临时文件
      try {
        fs.unlinkSync(tempPngPath);
        console.warn('清理临时文件成功:', tempPngPath);
      } catch (e) {
        console.warn('清理临时文件失败:', e);
      }
    }
  } catch (error) {
    console.error('Base64 PNG CPCL打印失败:', error);
    throw error;
  }
}

module.exports = {
  convertImageToCPCL,
  printImageWithCPCL,
  sendCPCLToPrinter,
  saveCPCLCommandToFile,
  // 新增的方法
  encodeToHex,
  pngToCPCLBase64,
  printPngWithCPCL,
  printBase64WithPngCPCL
}; 