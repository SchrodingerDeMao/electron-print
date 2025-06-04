/**
 * 应用配置模块
 * 存储应用全局配置值
 */

const os = require('os');
const path = require('path');

/**
 * 默认配置选项
 */
const defaultConfig = {
  // 服务器设置
  port: 20000, // 默认WebSocket端口
  
  // 应用设置
  appName: 'WMS打印服务',
  iconPath: path.join(process.resourcesPath, 'assets', 'icon.png'),
  devMode: process.argv.includes('--dev'),
  
  // 日志设置
  maxPendingLogs: 500, // 最大待处理日志数
  
  // 临时文件设置
  tempDir: path.join(os.tmpdir(), 'wms-print'),
  debugDir: path.join(os.tmpdir(), 'wms-print-debug'),
  
  // 打印设置
  defaultCopies: 1,
  defaultPrinterSearchMethod: 'partial', // 'exact' | 'partial'
  enableDebugFileOutput: true,
  maxTempFileAge: 12, // 小时
  maxDebugFileAge: 24, // 小时
  
  // 托盘设置
  minimizeToTrayOnClose: true,
  
  // 标签打印机设置
  labelPrinterKeywords: ['label', '标签', 'hprt', 'tsc', 'zebra', 'dymo'],
  defaultLabelWidth: 50, // mm
  defaultLabelHeight: 30, // mm
  defaultLabelDpi: 203
};

// 导出配置对象
module.exports = defaultConfig; 