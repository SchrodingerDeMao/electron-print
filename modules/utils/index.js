/**
 * 工具模块入口文件
 * 集中导出所有实用工具函数
 */

const fs = require('./fs');
const validation = require('./validation');
const temp = require('./temp');
const config = require('./config');

/**
 * 睡眠/延迟函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} 延迟结束的Promise
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成唯一ID
 * @param {string} prefix - ID前缀
 * @returns {string} 唯一ID
 */
function generateId(prefix = '') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}${timestamp}-${random}`;
}

/**
 * 将Base64数据保存到文件
 * @param {string} base64Data - Base64编码的数据
 * @param {string} filePath - 保存的文件路径
 * @returns {Promise<string>} 保存的文件路径
 */
async function saveBase64ToFile(base64Data, filePath) {
  return new Promise((resolve, reject) => {
    try {
      // 去除可能存在的 data:image/xxx;base64, 前缀
      let cleanData = base64Data;
      if (base64Data.includes('base64,')) {
        cleanData = base64Data.split('base64,')[1];
      }
      
      // 将Base64解码为Buffer
      const buffer = Buffer.from(cleanData, 'base64');
      
      // 确保目录存在
      const dirPath = require('path').dirname(filePath);
      fs.ensureDirectoryExists(dirPath);
      
      // 写入文件
      require('fs').writeFileSync(filePath, buffer);
      console.log(`已将Base64数据保存到文件: ${filePath}`);
      resolve(filePath);
    } catch (error) {
      console.error(`保存Base64数据到文件失败: ${error.message}`);
      reject(error);
    }
  });
}

module.exports = {
  // 配置
  config,
  
  // 文件系统工具
  ensureDirectoryExists: fs.ensureDirectoryExists,
  safeDeleteFile: fs.safeDeleteFile,
  getTempDir: fs.getTempDir,
  cleanupOldFiles: fs.cleanupOldFiles,
  saveTempFile: fs.saveTempFile,
  cleanupAllFiles: fs.cleanupAllFiles,
  saveBase64ToFile,
  
  // 数据验证工具
  validateBase64: validation.validateBase64,
  validatePdfData: validation.validatePdfData,
  validateImageData: validation.validateImageData,
  validatePrinterName: validation.validatePrinterName,
  isLabelPrinter: validation.isLabelPrinter,
  formatClientIP: validation.formatClientIP,
  
  // 临时文件管理
  TEMP_DIR: temp.TEMP_DIR,
  DEBUG_DIR: temp.DEBUG_DIR,
  cleanupTempFile: temp.cleanupTempFile,
  cleanupDebugFiles: temp.cleanupDebugFiles,
  cleanupTempDir: temp.cleanupTempDir,
  cleanupAllTempFiles: temp.cleanupAllTempFiles,
  saveTempPdf: temp.saveTempPdf,
  saveTempHtml: temp.saveTempHtml,
  saveTempImage: temp.saveTempImage,
  saveDebugFile: temp.saveDebugFile,
  
  // 通用工具
  sleep,
  generateId
}; 