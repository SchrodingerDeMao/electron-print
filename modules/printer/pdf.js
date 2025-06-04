/**
 * PDF打印模块
 * 处理PDF打印相关功能
 */

const fs = require('fs');
const path = require('path');
const printer = require('pdf-to-printer');
const utils = require('../utils');
const { exec } = require('child_process');


/**
 * 检测系统PDF打印环境
 * @returns {Promise<{ready: boolean, message: string}>} 环境检测结果
 */
async function checkPdfPrintingEnvironment() {
  try {
    // 检查平台
    const platform = process.platform;
    console.log(`当前操作系统平台: ${platform}`);
    
    // 使用统一的打印机列表获取方法检查打印机
    let printers = [];
    try {
      // 优先使用我们改进的统一接口
      const listModule = require('./list');
      printers = await listModule.getPrinterList();
      console.log(`环境检测: 通过统一接口获取到 ${printers.length} 台打印机`);
    } catch (listError) {
      console.warn('环境检测: 统一接口获取打印机失败，尝试使用pdf-to-printer:', listError.message);
      
      // 备用方案：使用pdf-to-printer
      try {
        const rawPrinters = await printer.getPrinters();
        printers = Array.isArray(rawPrinters) ? rawPrinters : [];
        console.log(`环境检测: pdf-to-printer获取到 ${printers.length} 台打印机`);
      } catch (pdfPrinterError) {
        console.warn('环境检测: pdf-to-printer也失败:', pdfPrinterError.message);
        printers = [];
      }
    }
    
    // 如果两种方法都获取不到打印机，给出警告但不阻止打印
    if (!printers || printers.length === 0) {
      console.warn('环境检测: 无法获取打印机列表，但这不一定意味着系统没有打印机');
      // 不再直接返回失败，而是给出警告继续执行
      return {
        ready: true,
        warning: true,
        message: '无法获取打印机列表，但系统可能仍有可用打印机。如果浏览器能正常打印，请忽略此警告。'
      };
    }

    console.log(`环境检测: 检测到${printers.length}台打印机`);
    
    // 在Windows下检查PDF相关软件
    if (platform === 'win32') {
      try {
        // 检查常见PDF阅读器的安装路径
        const adobeReaderPath = 'C:\\Program Files (x86)\\Adobe\\Acrobat Reader DC\\Reader\\AcroRd32.exe';
        const foxit = 'C:\\Program Files (x86)\\Foxit Software\\Foxit Reader\\FoxitReader.exe';
        const sumatra = 'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe';
        
        const hasAdobeReader = fs.existsSync(adobeReaderPath);
        const hasFoxit = fs.existsSync(foxit);
        const hasSumatra = fs.existsSync(sumatra);
        
        if (!hasAdobeReader && !hasFoxit && !hasSumatra) {
          console.warn('未检测到常见PDF阅读器，可能影响打印质量');
          return {
            ready: true,
            warning: true,
            message: '未检测到常见PDF阅读器(如Adobe Reader)，这可能影响PDF打印功能，建议安装PDF阅读软件'
          };
        }
      } catch (err) {
        console.warn('PDF软件检测过程出错:', err);
      }
    }
    
    return {
      ready: true,
      message: '系统打印环境检测正常'
    };
  } catch (error) {
    console.error('打印环境检测失败:', error);
    // 即使检测失败也不阻止打印，只给出警告
    return {
      ready: true,
      warning: true,
      message: `打印环境检测出现问题: ${error.message}，但仍尝试继续打印`
    };
  }
}

/**
 * 打印PDF文件
 * @param {string} pdfPath - PDF文件路径
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @param {boolean} [options.landscape=false] - 是否横向打印
 * @param {boolean} [options.silent=true] - 是否静默打印(不显示打印对话框)
 * @param {number} [options.copies=1] - 打印份数
 * @param {number} [options.width] - 纸张宽度(mm)
 * @param {number} [options.height] - 纸张高度(mm)
 */
async function printPdf(pdfPath, printerName, options = {}) {
  try {
    console.log(`正在准备使用pdf-to-printer打印PDF文件: ${pdfPath}`);
    console.log(`选择的打印机: ${printerName || '默认打印机'}`);
    console.log(`打印尺寸设置: ${options.width || '自动'}x${options.height || '自动'} mm`);
    
    // 检查文件是否存在
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF文件不存在: ${pdfPath}`);
    }
    
    // 检查PDF打印环境
    const envCheck = await checkPdfPrintingEnvironment();
    if (!envCheck.ready) {
      console.error('PDF打印环境检测失败:', envCheck.message);
      throw new Error(envCheck.message);
    } else if (envCheck.warning) {
      console.warn('PDF打印环境警告:', envCheck.message);
    }
    
    // 获取可用打印机列表
    let availablePrinters = [];
    try {
      // 优先使用统一的打印机列表获取方法
      const listModule = require('./list');
      availablePrinters = await listModule.getPrinterList();
      console.log(`通过统一接口获取到 ${availablePrinters.length} 台打印机`);
    } catch (listError) {
      console.warn('使用统一接口获取打印机失败，尝试直接使用pdf-to-printer:', listError.message);
      
      // 备用方案：直接使用pdf-to-printer
      try {
        const rawPrinters = await printer.getPrinters();
        // 标准化格式
        availablePrinters = rawPrinters.map((p, index) => ({
          name: typeof p === 'string' ? p : (p.name || `打印机_${index}`),
          description: typeof p === 'object' ? p.description : '',
          isDefault: index === 0,
          status: 'idle'
        }));
        console.log(`直接获取到 ${availablePrinters.length} 台打印机`);
      } catch (printerError) {
        console.error('获取打印机列表完全失败:', printerError.message);
        availablePrinters = [];
      }
    }
    
    // 检查指定的打印机是否存在
    let validPrinterName = utils.validatePrinterName(printerName, availablePrinters);
    
    if (validPrinterName) {
      console.log(`找到匹配打印机: ${validPrinterName}`);
    } else if (printerName) {
      console.log(`未找到匹配打印机: ${printerName}, 将使用系统默认打印机`);
    }
    
    // 构建pdf-to-printer的打印选项
    const printerOptions = {};
    
    // 设置打印机名称
    if (validPrinterName) {
      printerOptions.printer = validPrinterName;
    }
    
    // 设置打印份数
    if (options.copies && options.copies > 1) {
      printerOptions.copies = options.copies;
    }
    
    // 设置静默打印
    if (options.silent !== false) {
      printerOptions.silent = true;
    }
    
    // 设置纸张方向
    if (options.landscape === true || (options.width && options.height && options.width > options.height)) {
      printerOptions.landscape = true;
      console.log('使用横向打印模式');
    }

    // 设置自定义纸张尺寸
    if (options.width && options.height) {
      console.log(`设置自定义页面尺寸: ${options.width}mm x ${options.height}mm`);
      
      // 根据平台设置纸张尺寸选项
      if (process.platform === 'win32') {
        // Windows平台特定选项
        // 添加自定义页面大小
        printerOptions.paperSize = {
          width: options.width, // 毫米
          height: options.height // 毫米
        };
        
        // Windows特定的打印选项
        printerOptions.win32 = {
          pageSize: `${options.width}x${options.height}mm`
        };
      } else if (process.platform === 'darwin') {
        // macOS平台特定选项
        printerOptions.mac = {
          paperSize: { 
            width: options.width,
            height: options.height,
            unit: 'mm'
          },
          // macOS可能需要额外设置
          orientation: options.landscape === true ? 'landscape' : 'portrait'
        };
      } else if (process.platform === 'linux') {
        // Linux平台特定选项
        printerOptions.linux = {
          paperSize: `Custom.${options.width}x${options.height}mm`
        };
      }
    }
    
    console.log('打印选项:', JSON.stringify(printerOptions, null, 2));
    
    // 针对不同平台执行打印操作
    try {
      if (process.platform === 'darwin' && !printer.supportedPlatform) {
        // macOS平台下的兼容处理方式
        console.log('检测到macOS平台，使用兼容模式打印...');
        
        // 使用macOS原生命令行 lp 命令打印
        let lpCommand = `lp "${pdfPath}"`;
        if (validPrinterName) {
          lpCommand += ` -d "${validPrinterName}"`;
        }
        if (options.copies && options.copies > 1) {
          lpCommand += ` -n ${options.copies}`;
        }
        if (options.landscape) {
          lpCommand += ` -o landscape`;
        }
        
        console.log(`执行macOS打印命令: ${lpCommand}`);
        
        await new Promise((resolve, reject) => {
          exec(lpCommand, (error, stdout, stderr) => {
            if (error) {
              console.error(`macOS打印命令执行失败: ${error.message}`);
              console.error(`stderr: ${stderr}`);
              reject(error);
              return;
            }
            console.log(`macOS打印命令输出: ${stdout}`);
            resolve();
          });
        });
        
        console.log('macOS打印命令执行完成');
      } else {
        // 其他平台使用pdf-to-printer
        console.log('使用pdf-to-printer打印PDF');
        await printer.print(pdfPath, printerOptions);
        console.log('pdf-to-printer打印完成');
      }
      
      return {
        success: true,
        printerName: validPrinterName || '默认打印机',
        message: `PDF已成功发送到打印机: ${validPrinterName || '默认打印机'}`
      };
    } catch (printError) {
      console.error('PDF打印失败，尝试使用默认打印方式:', printError);
      
      // 如果指定的打印机打印失败，尝试使用系统默认打印机
      if (validPrinterName && options.fallbackToPrintDefault !== false) {
        console.log('尝试使用系统默认打印机打印...');
        try {
          await printer.print(pdfPath);
          console.log('使用默认打印机打印成功');
          return {
            success: true,
            printerName: '默认打印机',
            message: '使用默认打印机打印成功',
            fallback: true
          };
        } catch (fallbackError) {
          console.error('使用默认打印机也失败:', fallbackError);
          throw new Error(`PDF打印失败，默认打印机也无法打印: ${fallbackError.message || '未知错误'}`);
        }
      }
      
      throw new Error(`打印失败: ${printError.message || '未知错误'}`);
    }
  } catch (error) {
    console.error('PDF打印过程发生异常:', error);
    
    // 确保在发生异常时也清理临时文件
    if (pdfPath && fs.existsSync(pdfPath)) {
      utils.cleanupTempFile(pdfPath);
    }
    
    throw error;
  }
}

/**
 * 保存PDF文件到临时目录
 * @param {Buffer} pdfData - PDF数据
 * @returns {string} - 保存的文件路径
 */
function saveTempPdf(pdfData) {
  return utils.saveTempPdf(pdfData);
}

// 导出模块功能
module.exports = {
  checkPdfPrintingEnvironment,
  printPdf,
  saveTempPdf
}; 