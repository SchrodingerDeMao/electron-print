/**
 * 临时文件管理模块
 * 封装临时文件处理相关功能
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const fsUtils = require('./fs');

// 常量定义
const TEMP_DIR = path.join(os.tmpdir(), 'wms-print');
const DEBUG_DIR = path.join(os.tmpdir(), 'wms-print-debug');

/**
 * 清理临时文件
 * @param {string} filePath - 文件路径
 */
function cleanupTempFile(filePath) {
  fsUtils.safeDeleteFile(filePath);
}

/**
 * 清理过期的调试文件
 * @param {number} maxAgeHours - 文件最大保留时间(小时)，默认24小时
 */
function cleanupDebugFiles(maxAgeHours = 24) {
  if (!fs.existsSync(DEBUG_DIR)) return;
  
  const cleanedCount = fsUtils.cleanupOldFiles(DEBUG_DIR, maxAgeHours);
  if (cleanedCount > 0) {
    console.log(`已清理 ${cleanedCount} 个过期调试文件`);
  }
}

/**
 * 清理临时目录中的旧文件
 * @param {number} maxAgeHours - 文件最大保留时间(小时)，默认12小时
 */
function cleanupTempDir(maxAgeHours = 12) {
  if (!fs.existsSync(TEMP_DIR)) return;
  
  const cleanedCount = fsUtils.cleanupOldFiles(TEMP_DIR, maxAgeHours);
  if (cleanedCount > 0) {
    console.log(`应用启动时已清理 ${cleanedCount} 个过期临时文件`);
  }
}

/**
 * 清理所有临时文件
 */
function cleanupAllTempFiles() {
  // 清理主临时目录
  fsUtils.cleanupAllFiles(TEMP_DIR);
  
  // 清理调试目录
  fsUtils.cleanupAllFiles(DEBUG_DIR);
}

/**
 * 保存PDF数据到临时文件
 * @param {Buffer|string} pdfData - PDF数据
 * @returns {string} 保存的文件路径
 */
function saveTempPdf(pdfData) {
  try {
    // 确保数据是Buffer类型
    let buffer = pdfData;
    if (typeof pdfData === 'string') {
      buffer = Buffer.from(pdfData, 'base64');
    }
    
    // 生成临时文件路径并保存
    return fsUtils.saveTempFile(buffer, '.pdf', 'print');
  } catch (error) {
    console.error('保存临时PDF文件失败:', error.message);
    throw error;
  }
}

/**
 * 保存HTML到临时文件
 * @param {string} htmlContent - HTML内容
 * @returns {string} 保存的文件路径
 */
function saveTempHtml(htmlContent) {
  try {
    // 生成临时文件路径并保存
    return fsUtils.saveTempFile(htmlContent, '.html', 'html-print');
  } catch (error) {
    console.error('保存临时HTML文件失败:', error.message);
    throw error;
  }
}

/**
 * 保存图片数据到临时文件
 * @param {Buffer|string} imageData - 图片数据
 * @param {string} format - 图片格式(扩展名)
 * @returns {string} 保存的文件路径
 */
function saveTempImage(imageData, format = 'png') {
  try {
    // 确保数据是Buffer类型
    let buffer = imageData;
    if (typeof imageData === 'string') {
      // 如果是Data URL格式，提取Base64部分
      if (imageData.startsWith('data:image')) {
        buffer = Buffer.from(imageData.split(',')[1], 'base64');
      } else {
        buffer = Buffer.from(imageData, 'base64');
      }
    }
    
    // 确保扩展名以点开头
    const ext = format.startsWith('.') ? format : `.${format}`;
    
    // 生成临时文件路径并保存
    return fsUtils.saveTempFile(buffer, ext, 'image');
  } catch (error) {
    console.error(`保存临时图片文件(${format})失败:`, error.message);
    throw error;
  }
}

/**
 * 保存调试文件
 * @param {Buffer|string} data - 数据
 * @param {string} fileType - 文件类型(扩展名)
 * @param {string} prefix - 文件前缀
 * @returns {string} 保存的文件路径
 */
function saveDebugFile(data, fileType, prefix = 'debug') {
  try {
    // 确保调试目录存在
    fsUtils.ensureDirectoryExists(DEBUG_DIR);
    
    // 生成文件名
    const timestamp = Date.now();
    const fileName = `${prefix}-${timestamp}.${fileType}`;
    const filePath = path.join(DEBUG_DIR, fileName);
    
    // 确保数据是Buffer类型
    let buffer = data;
    if (typeof data === 'string' && fileType !== 'txt' && fileType !== 'html') {
      if (data.startsWith('data:')) {
        buffer = Buffer.from(data.split(',')[1], 'base64');
      } else {
        buffer = Buffer.from(data, 'base64');
      }
    }
    
    // 保存文件
    fs.writeFileSync(filePath, buffer);
    console.log(`已保存调试文件: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('保存调试文件失败:', error.message);
    return null;
  }
}

module.exports = {
  TEMP_DIR,
  DEBUG_DIR,
  cleanupTempFile,
  cleanupDebugFiles,
  cleanupTempDir,
  cleanupAllTempFiles,
  saveTempPdf,
  saveTempHtml,
  saveTempImage,
  saveDebugFile
}; 