/**
 * 标签打印模块
 * 处理标签打印相关功能
 */

const appModule = require('../app');
const utils = require('../utils');


/**
 * 使用HTML模板方式打印标签
 * @param {string} base64Data - 图片的base64数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {Promise<Object>} 打印结果
 */
async function printLabelUsingHtml(base64Data, printerName, options = {}) {
  try {
    console.log('开始使用HTML模板方式打印标签');
    
    // 确保打印窗口存在
    let printerWindow = appModule.getPrinterWindow();
    if (!printerWindow) {
      printerWindow = appModule.createPrinterWindow();
    }
    
    // 提取标签尺寸信息
    const width = options.width || 50; // 默认宽度(mm)
    const height = options.height || 30; // 默认高度(mm)
    const dpi = options.dpi || 203; // 默认DPI为203
    
    // 将毫米转换为像素 (1英寸=25.4毫米)
    const widthInPixels = Math.round((width / 25.4) * dpi);
    const heightInPixels = Math.round((height / 25.4) * dpi);
    
    console.log(`标签尺寸: ${width}mm x ${height}mm (${widthInPixels}px x ${heightInPixels}px) @ ${dpi}dpi`);
    
    // 确定打印方向
    let isLandscape = options.landscape || false;
    let pageWidth = width;
    let pageHeight = height;
    
    // 根据方向调整尺寸
    if (isLandscape) {
      // 横向打印时交换宽高
      pageWidth = height;
      pageHeight = width;
      console.log(`横向打印模式，调整页面尺寸为: ${pageWidth}mm x ${pageHeight}mm`);
    } else {
      console.log(`纵向打印模式，页面尺寸: ${pageWidth}mm x ${pageHeight}mm`);
    }
    
    // 构建HTML模板 - 优化模板以防止分页
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>标签打印</title>
        <style>
          @page {
            size: ${pageWidth}mm ${pageHeight}mm;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            width: ${pageWidth}mm;
            height: ${pageHeight}mm;
          }
          .label-container {
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .label-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: ${options.fitOption || 'contain'};
            display: block;
            ${isLandscape ? 'transform: rotate(90deg);' : ''}
          }
          @media print {
            html, body {
              width: ${pageWidth}mm;
              height: ${pageHeight}mm;
              page-break-inside: avoid;
              page-break-after: avoid;
              page-break-before: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <img src="${base64Data}" class="label-image" alt="Label Image">
        </div>
        <script>
          // 通知主进程图片已加载
          window.addEventListener('load', function() {
            window.electronRendererReady = true;
          });
        </script>
      </body>
      </html>
    `;
    
    // 打印设置
    const printOptions = {
      silent: options.silent !== undefined ? options.silent : true,
      printBackground: true,
      copies: options.copies || 1,
      margins: {
        marginType: 'none' // 无边距
      },
      deviceName: printerName
    };
    
    // 处理自定义纸张大小 (以微米为单位)
    printOptions.pageSize = {
      width: pageWidth * 1000, // 微米
      height: pageHeight * 1000, // 微米
      isCustomSize: true
    };
    
    // 由于我们已经在HTML中处理了方向，这里设置为false避免重复旋转
    printOptions.landscape = false;
    
    // 确保不会打印多页
    printOptions.pageRanges = [{from: 0, to: 0}];
    
    console.log('打印选项:', JSON.stringify(printOptions, null, 2));
    
    return new Promise((resolve, reject) => {
      try {
        // 加载HTML模板
        console.log('加载HTML模板长度:', template.length);
        printerWindow.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(template)}`)
          .then(() => {
            // 等待内容加载完成
            setTimeout(() => {
              try {
                // 执行打印
                printerWindow.webContents.print(printOptions, (success, reason) => {
                  if (success) {
                    console.log('HTML模板打印成功');
                    resolve({ success: true, message: '打印成功', type: 'html-template' });
                  } else {
                    const error = new Error(`HTML模板打印失败: ${reason}`);
                    console.error(error);
                    reject(error);
                  }
                });
              } catch (printError) {
                console.error('打印调用失败:', printError);
                reject(printError);
              }
            }, 500); // 延长等待时间确保内容已完全渲染
          })
          .catch(error => {
            console.error('加载HTML模板失败:', error);
            reject(error);
          });
      } catch (error) {
        console.error('加载模板过程中发生错误:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('HTML模板打印标签过程中发生错误:', error);
    return Promise.reject(error);
  }
}

// 导出模块功能
module.exports = {
  printLabelUsingHtml
}; 