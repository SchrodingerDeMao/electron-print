/**
 * 文件系统工具模块
 * 封装文件操作相关功能
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 确保目录存在，如不存在则创建
 * @param {string} dirPath - 目录路径
 * @returns {boolean} 操作是否成功
 */
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`已创建目录: ${dirPath}`);
    }
    return true;
  } catch (err) {
    console.error(`创建目录失败: ${dirPath}`, err.message);
    return false;
  }
}

/**
 * 安全删除文件
 * @param {string} filePath - 文件路径
 * @returns {boolean} 是否成功删除
 */
function safeDeleteFile(filePath) {
  if (!filePath) return false;
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`已删除文件: ${filePath}`);
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`删除文件失败: ${filePath}`, err.message);
    return false;
  }
}

/**
 * 获取临时目录路径
 * @param {string} subDir - 子目录名称
 * @returns {string} 完整临时目录路径
 */
function getTempDir(subDir = 'wms-print') {
  const tempDir = path.join(os.tmpdir(), subDir);
  ensureDirectoryExists(tempDir);
  return tempDir;
}

/**
 * 清理目录中的过期文件
 * @param {string} dirPath - 目录路径
 * @param {number} maxAgeHours - 最大保留时间(小时)
 * @returns {number} 删除的文件数量
 */
function cleanupOldFiles(dirPath, maxAgeHours = 24) {
  if (!fs.existsSync(dirPath)) return 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    const now = Date.now();
    let cleanedCount = 0;
    
    files.forEach(file => {
      try {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        // 删除超过指定时间的文件
        if (now - stats.mtime.getTime() > maxAgeHours * 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      } catch (err) {
        console.warn(`检查或删除文件失败: ${file}`, err.message);
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`已清理 ${cleanedCount} 个过期文件，目录: ${dirPath}`);
    }
    
    return cleanedCount;
  } catch (err) {
    console.error(`清理目录失败: ${dirPath}`, err.message);
    return 0;
  }
}

/**
 * 保存数据到临时文件
 * @param {Buffer|string} data - 要保存的数据
 * @param {string} extension - 文件扩展名 (包含点，如 '.pdf')
 * @param {string} [prefix='temp'] - 文件名前缀
 * @returns {string} 保存的文件路径
 */
function saveTempFile(data, extension, prefix = 'temp') {
  const tempDir = getTempDir();
  const timestamp = Date.now();
  const fileName = `${prefix}-${timestamp}${extension}`;
  const filePath = path.join(tempDir, fileName);
  
  try {
    // 如果数据是字符串且可能是Base64，尝试转换
    let fileData = data;
    if (typeof data === 'string' && /^[A-Za-z0-9+/=]+$/.test(data)) {
      fileData = Buffer.from(data, 'base64');
    }
    
    fs.writeFileSync(filePath, fileData);
    console.log(`已保存临时文件: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error(`保存临时文件失败: ${filePath}`, err.message);
    throw err;
  }
}

/**
 * 清空目录中的所有文件
 * @param {string} dirPath - 目录路径
 * @returns {number} 清理的文件数量
 */
function cleanupAllFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    let cleanedCount = 0;
    
    files.forEach(file => {
      try {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      } catch (err) {
        console.warn(`删除文件失败: ${file}`, err.message);
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`已清空目录 ${dirPath}，删除了 ${cleanedCount} 个文件`);
    }
    
    return cleanedCount;
  } catch (err) {
    console.error(`清空目录失败: ${dirPath}`, err.message);
    return 0;
  }
}

module.exports = {
  ensureDirectoryExists,
  safeDeleteFile,
  getTempDir,
  cleanupOldFiles,
  saveTempFile,
  cleanupAllFiles
}; 