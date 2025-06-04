/**
 * 日志系统入口文件
 * 统一导出所有日志相关功能
 */

const consoleLogger = require('./console');

/**
 * 初始化日志系统
 * @param {Object} options - 日志系统配置选项
 * @param {Function} options.getMainWindow - 获取主窗口的函数
 */
function initLogger(options = {}) {
  // 初始化控制台日志拦截
  consoleLogger.initConsoleOverride(options);
  
  // 返回初始化结果
  return {
    pendingLogs: consoleLogger.getPendingLogs(),
  };
}

/**
 * 发送待处理的日志
 */
function sendPendingLogs() {
  consoleLogger.sendPendingLogs();
}

/**
 * 清空日志队列
 */
function clearLogs() {
  consoleLogger.clearLogs();
}

// 导出日志模块功能
module.exports = {
  initLogger,
  sendPendingLogs,
  clearLogs,
  getPendingLogs: consoleLogger.getPendingLogs,
  // 直接导出控制台覆盖方法，便于在需要时直接访问
  console: consoleLogger
}; 