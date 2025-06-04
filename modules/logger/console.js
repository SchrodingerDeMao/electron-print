/**
 * 控制台日志拦截模块
 * 重写console方法，将日志转发到渲染进程
 */

// 日志队列 - 当主窗口未就绪时暂存日志
const pendingLogs = [];
const MAX_PENDING_LOGS = 500;

// 保存原始控制台方法
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;

// 主窗口引用获取函数
let getMainWindow;

/**
 * 将日志发送到渲染进程
 * @param {string} level - 日志级别
 * @param {Array} args - 日志参数
 */
function sendLogToRenderer(level, args) {
  // 不要在这个函数中调用 console 方法，避免递归
  try {
    // 构建日志数据对象
    const logData = {
      level,
      args: args.map(arg => {
        if (arg instanceof Error) {
          return arg.stack || arg.message;
        }
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return `[无法序列化对象: ${typeof arg}]`;
          }
        }
        return String(arg);
      }),
      timestamp: new Date().toISOString()
    };
    
    // 获取主窗口
    const mainWindow = getMainWindow ? getMainWindow() : null;
    
    // 如果主窗口可用，直接发送
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.isLoading() === false) {
      mainWindow.webContents.send('log-message', logData);
    } else {
      // 否则添加到队列
      pendingLogs.push(logData);
      // 限制队列大小
      if (pendingLogs.length > MAX_PENDING_LOGS) {
        pendingLogs.shift();
      }
    }
  } catch (err) {
    // 出错时使用原始方法输出错误，但不要调用重写的console方法
    originalError('日志系统错误:', err);
  }
}

/**
 * 发送队列中的日志
 */
function sendPendingLogs() {
  const mainWindow = getMainWindow ? getMainWindow() : null;
  if (mainWindow && !mainWindow.isDestroyed() && pendingLogs.length > 0) {
    try {
      pendingLogs.forEach(logData => {
        mainWindow.webContents.send('log-message', logData);
      });
      originalLog('已发送所有待处理日志到渲染进程，共', pendingLogs.length, '条');
      pendingLogs.length = 0; // 清空队列
    } catch (err) {
      originalError('发送待处理日志失败:', err);
    }
  }
}

/**
 * 初始化控制台方法覆盖
 * @param {Object} options - 配置选项
 * @param {Function} options.getMainWindow - 获取主窗口的函数
 */
function initConsoleOverride(options = {}) {
  // 保存主窗口获取函数
  getMainWindow = options.getMainWindow;
  
  // 重写控制台方法
  console.log = function() {
    // 先使用原始方法输出
    originalLog.apply(console, arguments);
    // 然后发送到渲染进程
    sendLogToRenderer('log', Array.from(arguments));
  };
  
  console.info = function() {
    // 先使用原始方法输出
    originalInfo.apply(console, arguments);
    // 然后发送到渲染进程
    sendLogToRenderer('info', Array.from(arguments));
  };
  
  console.warn = function() {
    // 先使用原始方法输出
    originalWarn.apply(console, arguments);
    // 然后发送到渲染进程
    sendLogToRenderer('warn', Array.from(arguments));
  };
  
  console.error = function() {
    // 先使用原始方法输出
    originalError.apply(console, arguments);
    // 然后发送到渲染进程
    sendLogToRenderer('error', Array.from(arguments));
  };
  
  // 全局日志方法
  global.log = console.log;
  global.info = console.info;
  global.warn = console.warn;
  global.error = console.error;
  
  originalLog('日志系统已初始化');
  
  return { pendingLogs };
}

/**
 * 清空日志队列
 */
function clearLogs() {
  pendingLogs.length = 0;
  originalLog('日志队列已清空');
}

/**
 * 获取待处理日志队列
 * @returns {Array} 待处理日志数组
 */
function getPendingLogs() {
  return pendingLogs;
}

/**
 * 恢复原始控制台方法
 */
function restoreConsole() {
  console.log = originalLog;
  console.info = originalInfo;
  console.warn = originalWarn;
  console.error = originalError;
  
  // 移除全局日志方法
  if (global.log) delete global.log;
  if (global.info) delete global.info;
  if (global.warn) delete global.warn;
  if (global.error) delete global.error;
  
  originalLog('已恢复原始控制台方法');
}

// 导出功能
module.exports = {
  initConsoleOverride,
  sendLogToRenderer,
  sendPendingLogs,
  clearLogs,
  getPendingLogs,
  restoreConsole
}; 