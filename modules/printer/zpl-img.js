/**
 * ZPL图像打印模块
 * 处理图像到ZPL命令的转换和打印功能
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const utils = require('../utils');
// 修改导入方式，zpl-image提供的是方法而不是一个函数
const { rgbaToZ64 } = require('zpl-image');
const appModule = require('../app');
// 引入日志模块
const logger = require('../logger');
// 新增导入，用于处理图像
const PNG = require('pngjs').PNG;

/**
 * 将图片转换为ZPL命令
 * @param {string} base64Data - base64编码的图片数据
 * @param {Object} options - 打印选项
 * @param {number} [options.blackWhiteThreshold=128] - 黑白转换阈值(0-255)
 * @param {number} [options.x=0] - 起始X坐标
 * @param {number} [options.y=0] - 起始Y坐标
 * @param {boolean} [options.compress=true] - 是否使用压缩
 * @param {boolean} [options.invert=false] - 是否反转黑白
 * @returns {Promise<string>} ZPL命令字符串
 */
async function convertImageToZPL(base64Data, options = {}) {
  try {
    console.log('开始将图片转换为ZPL命令');
    
    // 设置默认选项
    const defaultOptions = {
      blackWhiteThreshold: 128,
      x: 0,
      y: 0,
      compress: true,
      invert: false
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 去除可能的Data URL前缀
    let imageData = base64Data;
    if (base64Data.startsWith('data:image')) {
      imageData = base64Data.split(',')[1];
    }
    
    // 将Base64图片保存为临时文件
    const tempDir = path.join(os.tmpdir(), 'wms-print-zpl');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempImgPath = path.join(tempDir, `temp-img-${Date.now()}.png`);
    await utils.saveBase64ToFile(imageData, tempImgPath);
    console.log(`图片已保存到临时文件: ${tempImgPath}`);
    
    // 使用pngjs读取图像并转换为ZPL命令
    return new Promise((resolve, reject) => {
      try {
        // 读取PNG文件
        const pngData = fs.readFileSync(tempImgPath);
        const png = PNG.sync.read(pngData);
        
        // 使用zpl-image库中的rgbaToZ64方法转换图像
        const blackPercentage = Math.round((mergedOptions.blackWhiteThreshold / 255) * 99);
        const zplResult = rgbaToZ64(png.data, png.width, { 
          black: blackPercentage, 
          rotate: 'N', // 不旋转
          notrim: false // 允许裁剪空白
        });
        
        // 构建完整的ZPL命令
        let fullZplCommand = '^XA'; // ZPL开始
        
        // 添加位置信息
        fullZplCommand += `^FO${mergedOptions.x},${mergedOptions.y}`;
        
        // 添加图像命令 - 使用zpl-image生成的ZPL命令
        fullZplCommand += `^GFA,${zplResult.length},${zplResult.length},${zplResult.rowlen},${zplResult.z64}`;
        
        // 结束ZPL命令
        fullZplCommand += '^XZ';
        
        // 清理临时文件
        try {
          fs.unlinkSync(tempImgPath);
          console.log('清理临时文件成功');
        } catch (e) {
          console.warn('清理临时文件失败:', e);
        }
        
        resolve(fullZplCommand);
      } catch (error) {
        console.error('转换图片为ZPL失败:', error);
        
        // 清理临时文件
        try {
          fs.unlinkSync(tempImgPath);
        } catch (e) {
          // 忽略清理错误
        }
        
        reject(error);
      }
    });
  } catch (error) {
    console.error('转换图片为ZPL过程中发生错误:', error);
    throw error;
  }
}

/**
 * 发送ZPL命令到打印机
 * @param {string} zplCommand - ZPL命令
 * @param {string} printerName - 打印机名称
 * @returns {Promise<object>} 打印结果
 */
async function sendZPLToPrinter(zplCommand, printerName) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`开始发送ZPL命令到打印机: ${printerName}`);
      
      // 将ZPL命令保存到临时文件
      const tempDir = path.join(os.tmpdir(), 'wms-print-zpl');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const zplFilePath = path.join(tempDir, `zpl-cmd-${Date.now()}.txt`);
      fs.writeFileSync(zplFilePath, zplCommand, 'utf8');
      
      // 根据操作系统选择不同的打印方式
      if (process.platform === 'win32') {
        // Windows系统通过copy命令发送到打印机
        const command = `copy /b "${zplFilePath}" "${printerName}"`;
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
          
          console.log('ZPL命令已成功发送到打印机');
          resolve({ success: true, message: 'ZPL打印命令已发送' });
          
          // 清理临时文件
          try {
            fs.unlinkSync(zplFilePath);
            console.log('清理临时文件成功:', zplFilePath);
          } catch (e) {
            console.warn('清理临时文件失败:', e);
          }
        });
      } else {
        // Linux/macOS通过lp命令打印
        const command = `lp -d "${printerName}" "${zplFilePath}"`;
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`执行打印命令失败: ${error.message}`);
            reject(new Error(`打印失败: ${error.message}`));
            return;
          }
          
          console.log('ZPL命令已成功发送到打印机');
          resolve({ success: true, message: 'ZPL打印命令已发送' });
          
          // 清理临时文件
          try {
            fs.unlinkSync(zplFilePath);
            console.log('清理临时文件成功');
          } catch (e) {
            console.warn('清理临时文件失败:', e);
          }
        });
      }
    } catch (error) {
      console.error('发送ZPL命令到打印机时发生错误:', error);
      reject(error);
    }
  });
}

/**
 * 保存ZPL命令到文件
 * @param {string} base64Data - base64编码的图片数据
 * @param {string} outputPath - 输出文件路径
 * @param {Object} options - 转换选项
 * @returns {Promise<object>} 保存结果
 */
async function saveZPLCommandToFile(base64Data, outputPath, options = {}) {
  try {
    console.log(`开始将图片转换为ZPL并保存到文件: ${outputPath}`);
    
    // 转换图片为ZPL
    const zplCommand = await convertImageToZPL(base64Data, options);
    
    // 保存到文件
    fs.writeFileSync(outputPath, zplCommand, 'utf8');
    console.log(`ZPL命令已保存到文件: ${outputPath}`);
    
    return { success: true, message: `ZPL命令已保存到 ${outputPath}` };
  } catch (error) {
    console.error('保存ZPL命令到文件失败:', error);
    throw error;
  }
}

/**
 * 使用ZPL命令打印图片
 * @param {string} base64Data - base64编码的图片数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {Promise<object>} 打印结果
 */
async function printImageWithZPL(base64Data, printerName, options = {}) {
  try {
    console.log(`开始使用ZPL打印图片到打印机: ${printerName}`);
    
    // 转换图片为ZPL命令
    const zplCommand = await convertImageToZPL(base64Data, options);
    
    // 发送ZPL命令到打印机
    const result = await sendZPLToPrinter(zplCommand, printerName);
    
    return result;
  } catch (error) {
    console.error('使用ZPL打印图片失败:', error);
    throw error;
  }
}

/**
 * 使用ZPL命令打印原始图片
 * @param {string} imgPath - 图片文件路径
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {Promise<object>} 打印结果
 */
async function printRawImageWithZPL(imgPath, printerName, options = {}) {
  try {
    console.log(`开始使用ZPL打印原始图片文件: ${imgPath}`);
    
    // 将图片转换为ZPL命令
    return new Promise((resolve, reject) => {
      zplImage(imgPath, { blackWhiteThreshold: options.blackWhiteThreshold || 128 })
        .then(async zpl => {
          console.log('ZPL命令生成完成');
          
          // 构建完整的ZPL命令
          const fullZplCommand = `^XA^FO${options.x || 0},${options.y || 0}${zpl}^XZ`;
          
          // 发送ZPL命令到打印机
          try {
            const result = await sendZPLToPrinter(fullZplCommand, printerName);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
        .catch(error => {
          console.error('转换图片为ZPL失败:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('使用ZPL打印原始图片失败:', error);
    throw error;
  }
}

/**
 * 使用Base64编码的图片数据进行ZPL打印
 * @param {string} base64Data - base64编码的图片数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {Promise<object>} 打印结果
 */
async function printBase64WithZPL(base64Data, printerName, options = {}) {
  try {
    return await printImageWithZPL(base64Data, printerName, options);
  } catch (error) {
    console.error('使用Base64数据进行ZPL打印失败:', error);
    throw error;
  }
}

// 导出模块方法
module.exports = {
  convertImageToZPL,
  sendZPLToPrinter,
  saveZPLCommandToFile,
  printImageWithZPL,
  printRawImageWithZPL,
  printBase64WithZPL
}; 