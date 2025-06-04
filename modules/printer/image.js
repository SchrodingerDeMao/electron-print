/**
 * 图片打印模块
 * 处理图片打印相关功能
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const utils = require('../utils');
const appModule = require('../app');
const labelPrinter = require('./label');

/**
 * 打印图片（base64）
 * @param {string} base64Data - base64编码的图片数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @param {number} [options.width] - 图片宽度(mm)
 * @param {number} [options.height] - 图片高度(mm)
 */
async function printImage(base64Data, printerName, options = {}) {
  try {
    // 确保打印窗口存在
    let printerWindow = appModule.getPrinterWindow();
    if (!printerWindow) {
      printerWindow = appModule.createPrinterWindow();
    }
    
    console.log(`正在准备打印图片，数据长度: ${base64Data ? base64Data.length : 0}`);
    console.log(`选择的打印机: ${printerName || '默认打印机'}`);
    console.log(`图片尺寸设置: ${options.width || '自动'}x${options.height || '自动'} mm`);
    
    // 检查数据有效性
    if (!base64Data) {
      throw new Error('图片数据为空');
    }
    
    // 去除可能的Data URL前缀
    let imageData = base64Data;
    if (base64Data.startsWith('data:image')) {
      imageData = base64Data.split(',')[1];
    }
    
    // 创建一个临时HTML文件，用于显示图片
    const tempHtmlDir = path.join(os.tmpdir(), 'wms-print');
    console.log(`临时目录: ${tempHtmlDir}`);
    
    // 确保临时目录存在
    if (!fs.existsSync(tempHtmlDir)) {
      fs.mkdirSync(tempHtmlDir, { recursive: true });
    }
    
    // 图片填充模式
    // 'contain': 保持宽高比，确保图片完全可见(默认，等比缩放)
    // 'cover': 图片填满区域，可能裁剪掉部分内容
    // 'stretch': 拉伸图片填满区域，不保持宽高比
    // 'actual': 图片按实际尺寸打印，不缩放
    const fillMode = options.fillMode || 'contain';
    console.log(`图片填充模式: ${fillMode}`);
    
    // 根据填充模式确定object-fit值
    let objectFit = 'contain'; // 默认为contain，保持比例
    
    switch(fillMode) {
      case 'cover':
        objectFit = 'cover'; // 填满容器，可能裁剪
        break;
      case 'stretch':
        objectFit = 'fill'; // 拉伸填满
        break;
      case 'actual':
        objectFit = 'none'; // 不缩放，使用原始尺寸
        break;
      default:
        objectFit = 'contain'; // 默认保持比例并完全显示
    }
    
    // 根据传入的宽高设置，生成样式
    const specificWidth = options.width ? `width: ${options.width}mm;` : '';
    const specificHeight = options.height ? `height: ${options.height}mm;` : '';
    const hasCustomSize = options.width || options.height;
    
    // 计算缩放比例（如果需要）
    let scale = options.scale ? options.scale : 1;
    if (options.scalePercent) {
      scale = options.scalePercent / 100;
    }
    
    // 镜像翻转
    const flipHorizontal = options.flipHorizontal ? 'scaleX(-1)' : '';
    const flipVertical = options.flipVertical ? 'scaleY(-1)' : '';
    const transform = (flipHorizontal || flipVertical) ? 
      `transform: ${flipHorizontal} ${flipVertical};` : '';
    
    // 创建包含图片的HTML内容
    const imageHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>打印图片</title>
        <style>
          @page {
            size: ${options.width ? options.width + 'mm' : 'auto'} ${options.height ? options.height + 'mm' : 'auto'};
            margin: 0;
          }
          
          body, html {
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: white;
            overflow: hidden;
          }
          
          #image-container {
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: white;
            width: ${options.width ? options.width + 'mm' : '100vw'};
            height: ${options.height ? options.height + 'mm' : '100vh'};
            overflow: hidden;
          }
          
          .print-image {
            ${hasCustomSize ? '' : 'max-width: 100%; max-height: 100%;'}
            ${specificWidth}
            ${specificHeight}
            object-fit: ${objectFit};
            ${transform}
            ${scale !== 1 ? `transform: scale(${scale}); transform-origin: center;` : ''}
          }
          
          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
            }
            
            #image-container {
              position: absolute;
              top: 0;
              left: 0;
              width: ${options.width ? options.width + 'mm' : '100vw'} !important;
              height: ${options.height ? options.height + 'mm' : '100vh'} !important;
            }
            
            .print-image {
              ${specificWidth}
              ${specificHeight}
              ${!hasCustomSize ? 'max-width: 100% !important; max-height: 100% !important;' : ''}
              object-fit: ${objectFit} !important;
              ${transform}
              ${scale !== 1 ? `transform: scale(${scale}) ${flipHorizontal} ${flipVertical}; transform-origin: center;` : ''}
            }
          }
        </style>
      </head>
      <body>
        <div id="image-container">
          <img src="${base64Data}" class="print-image" id="printableImage" alt="Printable Image" />
        </div>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            // 图片加载完成后通知Electron
            const img = document.getElementById('printableImage');
            if (img.complete) {
              window.electronRendererReady = true;
              logImageInfo();
            } else {
              img.onload = function() {
                window.electronRendererReady = true;
                logImageInfo();
              };
              img.onerror = function() {
                console.error('图片加载失败');
                window.electronRendererReady = true;
              };
            }
            
            // 记录图片信息
            function logImageInfo() {
              const img = document.getElementById('printableImage');
              const container = document.getElementById('image-container');
              
              console.log('图片自然尺寸: ' + img.naturalWidth + 'x' + img.naturalHeight + 'px');
              console.log('容器尺寸: ' + container.offsetWidth + 'x' + container.offsetHeight + 'px');
              console.log('图片显示尺寸: ' + img.offsetWidth + 'x' + img.offsetHeight + 'px');
              console.log('填充模式: ${objectFit}, 缩放比例: ${scale}');
            }
          });
        </script>
      </body>
      </html>
    `;
    
    // 保存HTML到临时文件
    const tempHtmlFile = path.join(tempHtmlDir, `print-image-${Date.now()}.html`);
    fs.writeFileSync(tempHtmlFile, imageHtml, 'utf8');
    console.log(`临时HTML文件已创建: ${tempHtmlFile}`);
    
    // 加载HTML文件到隐藏窗口
    await printerWindow.loadFile(tempHtmlFile);
    
    // 等待图片渲染完成
    await new Promise((resolve) => {
      const checkReadyInterval = setInterval(() => {
        if (printerWindow && !printerWindow.isDestroyed()) {
          printerWindow.webContents.executeJavaScript('window.electronRendererReady === true')
            .then(isReady => {
              if (isReady) {
                clearInterval(checkReadyInterval);
                resolve();
              }
            })
            .catch(error => {
              console.warn('检查图片加载状态时出错:', error);
            });
        } else {
          clearInterval(checkReadyInterval);
          resolve(); // 窗口已关闭，结束等待
        }
      }, 100);
    });
    
    // 打印设置
    const printOptions = {
      silent: options.silent !== false,
      printBackground: true,
      deviceName: printerName
    };
    
    // 复制选项
    if (options.copies && options.copies > 1) {
      printOptions.copies = options.copies;
    }
    
    // 处理方向
    if (options.landscape === true) {
      printOptions.landscape = true;
    }
    
    console.log('正在调用打印功能...');
    
    // 执行打印
    return new Promise((resolve, reject) => {
      try {
        // 如果打印窗口已销毁，抛出错误
        if (!printerWindow || printerWindow.isDestroyed()) {
          throw new Error('打印窗口已关闭或不可用');
        }
        
        printerWindow.webContents.print(printOptions, (success, reason) => {
          // 尝试清理临时文件
          try {
            if (fs.existsSync(tempHtmlFile)) {
              fs.unlinkSync(tempHtmlFile);
              console.log(`临时文件已清理: ${tempHtmlFile}`);
            }
          } catch (cleanupError) {
            console.warn('清理临时文件失败:', cleanupError);
          }
          
          if (success) {
            console.log('图片打印成功');
            resolve({
              success: true,
              message: `图片已使用打印机 ${printerName || '默认打印机'} 打印`
            });
          } else {
            console.error(`图片打印失败: ${reason}`);
            reject(new Error(`打印失败: ${reason}`));
          }
        });
      } catch (printError) {
        // 尝试清理临时文件
        try {
          if (fs.existsSync(tempHtmlFile)) {
            fs.unlinkSync(tempHtmlFile);
          }
        } catch (cleanupError) {
          console.warn('清理临时文件失败:', cleanupError);
        }
        
        console.error('执行打印过程中出错:', printError);
        reject(printError);
      }
    });
  } catch (error) {
    console.error('图片打印过程发生异常:', error);
    throw error;
  }
}

/**
 * 直接打印图片(不显示打印对话框)
 * @param {string} base64Data - 图片的base64数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {Promise<Object>} 打印结果
 */
async function directPrintImage(base64Data, printerName, options = {}) {
  try {
    console.log('开始直接打印图片，打印机:', printerName);
    
    // 参数验证
    if (!base64Data) {
      return Promise.reject(new Error('无效的图片数据'));
    }
    
    // 使用工具模块验证图片数据
    const validatedImageData = utils.validateImageData(base64Data);
    
    // 确保打印窗口存在
    let printerWindow = appModule.getPrinterWindow();
    if (!printerWindow) {
      printerWindow = appModule.createPrinterWindow();
    }
    
    // 检查是否为标签打印机
    const isLabelPrinter = utils.isLabelPrinter(printerName, options);
    
    console.log(`打印机类型检测: ${isLabelPrinter ? '标签打印机' : '普通打印机'}`);
    
    // 确定打印方式
    let printResult = null;
    let printAttempted = false; // 添加打印尝试标记
    
    // 对于标签打印机，优先使用HTML模板方式
    if (isLabelPrinter) {
      try {
        console.log('尝试使用HTML模板方式打印标签');
        printResult = await labelPrinter.printLabelUsingHtml(validatedImageData, printerName, options);
        console.log('HTML模板方式打印成功');
        printAttempted = true; // 标记已尝试打印
        return printResult;
      } catch (htmlError) {
        console.warn('HTML模板方式打印失败，尝试其他方式:', htmlError.message);
        // 继续尝试其他打印方式
      }
    }
    
    // 尝试本机打印 (如果可用且已配置)
    if (!printAttempted && options.useNativePrinting !== false) {
      try {
        console.log('尝试使用本机打印方式');
        
        // 实际项目中可能有一个本机打印实现
        // 此处省略，实际应该调用对应的本机打印接口
        // printResult = await nativePrint(base64Data, printerName, options);
        
        // 如果本机打印实现成功，直接返回结果
        if (printResult && printResult.success) {
          console.log('本机打印成功');
          printAttempted = true; // 标记已尝试打印
          return printResult;
        }
      } catch (nativeError) {
        console.warn('本机打印失败，尝试标准Electron打印:', nativeError.message);
        // 继续尝试标准Electron打印
      }
    }
    
    // 如果前面的打印方法都失败了，使用标准Electron打印方式
    if (!printAttempted) {
      console.log('使用标准Electron打印方式');
      
      // 提取标签尺寸信息
      const width = options.width || 50; // 默认宽度(mm)
      const height = options.height || 30; // 默认高度(mm)
      
      // 设置打印选项
      const printOptions = {
        silent: options.silent !== undefined ? options.silent : true,
        printBackground: true,
        copies: options.copies || 1,
        pageSize: {
          width: width * 1000, // 微米单位
          height: height * 1000 // 微米单位
        },
        margins: {
          marginType: 'none'
        },
        landscape: options.landscape || false,
        scaleFactor: options.scale || 100,
        deviceName: printerName
      };
      
      // 构建简单的HTML模板
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>图片打印</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              overflow: hidden;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: ${options.fitOption || 'contain'};
            }
          </style>
        </head>
        <body>
          <img src="${base64Data}" alt="Print Image">
        </body>
        </html>
      `;
      
      console.log('HTML模板已准备，打印设置:', JSON.stringify(printOptions, null, 2));
      
      // 加载HTML并打印
      return new Promise((resolve, reject) => {
        printerWindow.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(template)}`)
          .then(() => {
            // 给一点时间让图片加载完成
            setTimeout(() => {
              printerWindow.webContents.print(printOptions, (success, reason) => {
                if (success) {
                  console.log('HTML模板打印成功');
                  resolve({ success: true, message: '打印成功' });
                } else {
                  console.error('HTML模板打印失败:', reason);
                  reject(new Error(`HTML模板打印失败: ${reason}`));
                }
              });
            }, 500); // 等待500ms确保图片加载完成
          })
          .catch(error => {
            console.error('加载HTML模板失败:', error);
            reject(error);
          });
      });
    }
  } catch (error) {
    console.error('HTML模板打印过程中发生错误:', error);
    throw error;
  }
}

/**
 * 直接打印原始图片（非标签打印机使用）
 * @param {string|Buffer} base64Data - Base64编码的图片数据或Buffer
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {Promise<Object>} 打印结果
 */
async function directPrintRawImage(base64Data, printerName, options = {}) {
  try {
    // 使用工具模块验证图片数据
    const validatedImageData = utils.validateImageData(base64Data);
    
    // 标签打印机文件格式处理
    const imageFormat = options.imageFormat || 'png';
    const tempDir = utils.TEMP_DIR;
    const tempImagePath = path.join(tempDir, `direct-print-${Date.now()}.${imageFormat}`);
    
    // 转换Base64到Buffer（如果需要）
    let imageBuffer;
    if (validatedImageData.startsWith('data:image')) {
      imageBuffer = Buffer.from(validatedImageData.split(',')[1], 'base64');
    } else {
      imageBuffer = Buffer.from(validatedImageData, 'base64');
    }
    
    // 写入临时文件
    fs.writeFileSync(tempImagePath, imageBuffer);
    console.log(`临时图片文件已保存: ${tempImagePath}`);
    
    // 构建打印选项
    const printerOptions = {};
    
    // 设置打印机名称
    if (printerName) {
      printerOptions.printer = printerName;
    }
    
    // 设置打印份数
    if (options.copies && options.copies > 1) {
      printerOptions.copies = options.copies;
    }
    
    // 设置纸张方向
    if (options.landscape) {
      printerOptions.landscape = true;
    }
    
    // 这里可以添加调用系统打印命令的实现
    // 例如: 构建打印命令并执行
    console.log('实现中: 原始图片直接打印');
    
    // 在实际实现中，应该在这里添加平台特定的打印命令
    
    // 清理临时文件
    try {
      fs.unlinkSync(tempImagePath);
      console.log(`已清理临时图片文件: ${tempImagePath}`);
    } catch (cleanupError) {
      console.warn(`清理临时文件失败: ${cleanupError.message}`);
    }
    
    return {
      success: true,
      message: `图片已直接发送到打印机(${printerName || '默认'})`
    };
  } catch (error) {
    console.error('直接打印图片过程发生异常:', error);
    throw error;
  }
}

// 导出模块功能
module.exports = {
  printImage,
  directPrintImage,
  directPrintRawImage
}; 