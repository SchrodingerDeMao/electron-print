const { app, BrowserWindow, dialog } = require('electron');

// 引入统一的app模块
const appModule = require('./modules/app');
// 引入日志模块
const logger = require('./modules/logger');
// 引入工具模块
const utils = require('./modules/utils');
// 引入打印模块
const printerModule = require('./modules/printer');
// 引入服务器模块
const serverModule = require('./modules/server');

// 保持对window对象的全局引用，避免JavaScript对象被垃圾回收时，窗口被自动关闭
let mainWindow;
let printerWindow;
const PORT = utils.config.port; // 使用配置模块中的端口

/**
 * 获取系统打印机列表
 * @returns {Promise<Array>} 打印机列表
 */
async function getPrinterList() {
  return printerModule.getPrinterList();
}

/**
 * 打印图片（base64）
 * @param {string} base64Data - base64编码的图片数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @param {number} [options.width] - 图片宽度(mm)
 * @param {number} [options.height] - 图片高度(mm)
 */
async function printImage(base64Data, printerName, options = {}) {
  return printerModule.printImage(base64Data, printerName, options);
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
  return printerModule.printPdf(pdfPath, printerName, options);
}

/**
 * 启动WebSocket服务器
 */
function startWebSocketServer() {
  return serverModule.startWebSocketServer({
    port: PORT,
    getMainWindow: appModule.getMainWindow,
    updateTrayStatus: appModule.updateTrayStatus,
    getPrinterList,
    printPdf,
    printImage,
    directPrintImage,
    printImageWithCPCL,
    printBase64WithPngCPCL: printerModule.printBase64WithPngCPCL,
    printImageWithZPL,
    printBase64WithZPL
  });
}

/**
 * 停止WebSocket服务器
 */
function stopWebSocketServer() {
  return serverModule.stopWebSocketServer();
}

/**
 * 设置 IPC 通信处理程序
 */
function setupIPC() {
  // 使用模块化的IPC设置函数
  appModule.setupIPC({
    startWebSocketServer,
    stopWebSocketServer,
    printPdf,
    PORT,
    pendingLogs: logger.getPendingLogs(), // 使用logger模块的API获取pendingLogs
    clearLogs: logger.clearLogs, // 添加clearLogs方法
    getServerStatus: serverModule.getServerStatus,
    getServerAddress: serverModule.getServerAddress
  });
  
  // 以下是原有setupIPC函数中的特殊处理，如果appModule.setupIPC中没有实现的部分
  // 目前appModule.ipc已覆盖所有功能，此处留空以备将来扩展
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.on('ready', () => {
  try {
    // 初始化日志系统
    const { pendingLogs } = logger.initLogger({
      getMainWindow: () => appModule.getMainWindow()
    });
    
    console.log('应用启动...');
    
    // 清理过期调试文件
    utils.cleanupDebugFiles(utils.config.maxDebugFileAge);
    
    // 清理临时目录中的旧文件
    utils.cleanupTempDir(utils.config.maxTempFileAge);
    
    // 创建中文菜单 - 使用菜单管理模块
    appModule.createChineseMenu();
    
    // 创建系统托盘图标 - 使用托盘管理模块
    appModule.createTray({
      onRestartServer: async () => {
        await stopWebSocketServer();
        await startWebSocketServer();
        
        const mainWindow = appModule.getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('server-status', { running: true });
        }
      }
    });
    
    // 创建窗口 - 使用窗口管理模块
    mainWindow = appModule.createWindow();
    
    // 窗口关闭时不退出应用，而是最小化到托盘
    mainWindow.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        appModule.minimizeToTray();
        return false;
      }
      return true;
    });
    
    // 页面加载完成后发送待处理的日志
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('主窗口已加载，发送待处理日志');
      logger.sendPendingLogs();
    });
    
    // 创建打印窗口（延迟创建，防止初始化失败）
    setTimeout(() => {
      try {
        printerWindow = appModule.createPrinterWindow();
      } catch (err) {
        console.error('创建打印窗口失败:', err);
      }
    }, 1000);
    
    // 设置IPC通信处理程序
    setupIPC();
    
    // 启动WebSocket服务器
    startWebSocketServer().then(() => {
      console.log(`WebSocket服务器已启动，端口: ${PORT}`);
      mainWindow = appModule.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('server-status', { running: true });
      }
      appModule.updateTrayStatus(true);
    }).catch(error => {
      console.error('启动WebSocket服务器失败:', error);
      mainWindow = appModule.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('server-status', { running: false, error: error.message });
      }
      appModule.updateTrayStatus(false);
    });
    
    console.log('应用初始化完成');
  } catch (error) {
    console.error('应用初始化失败:', error);
    dialog.showErrorBox('初始化失败', `应用启动时发生错误: ${error.message}`);
  }
});

// 在所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在macOS上，除非用户用Cmd + Q确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 在应用退出前关闭WebSocket服务器
app.on('before-quit', () => {
  app.isQuitting = true;
  
  // 销毁托盘图标
  appModule.destroyTray();
});

// 当应用被激活时（macOS 特性）
app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，通常在应用程序中重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = appModule.createWindow();
  } else {
    // 显示现有窗口
    appModule.showMainWindow();
  }
});

// 在应用第二次实例启动时
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // 如果无法获取锁，说明已经有一个实例在运行，退出当前实例
  app.quit();
} else {
  // 监听第二个实例的启动
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 如果用户尝试运行第二个实例，我们应该聚焦到主窗口
    appModule.showMainWindow();
  });
}

/**
 * 直接打印图片(不显示打印对话框)
 * @param {string} base64Data - 图片的base64数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {Promise<Object>} 打印结果
 */
async function directPrintImage(base64Data, printerName, options = {}) {
  return printerModule.directPrintImage(base64Data, printerName, options);
}

/**
 * 使用CPCL命令打印图片
 * @param {string} base64Data - 图片的base64数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {Promise<Object>} 打印结果
 */
async function printImageWithCPCL(base64Data, printerName, options = {}) {
  return printerModule.printImageWithCPCL(base64Data, printerName, options);
}

/**
 * 使用ZPL命令打印图片
 * @param {string} base64Data - 图片的base64数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @param {number} [options.blackWhiteThreshold=128] - 黑白转换阈值(0-255)
 * @param {number} [options.x=0] - 起始X坐标
 * @param {number} [options.y=0] - 起始Y坐标
 * @returns {Promise<Object>} 打印结果
 */
async function printImageWithZPL(base64Data, printerName, options = {}) {
  return printerModule.printImageWithZPL(base64Data, printerName, options);
}

/**
 * 使用Base64数据直接ZPL打印
 * @param {string} base64Data - 图片的base64数据
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {Promise<Object>} 打印结果
 */
async function printBase64WithZPL(base64Data, printerName, options = {}) {
  return printerModule.printBase64WithZPL(base64Data, printerName, options);
}

// 在app.on('will-quit')中添加配置
// 监听应用退出事件
app.on('will-quit', () => {
  console.log('应用即将退出，执行清理操作...');
  
  // 停止WebSocket服务器
  stopWebSocketServer();
  
  // 移除所有IPC处理程序 - 由ipcManager模块提供
  appModule.removeAllIPCHandlers();
  
  // 清理所有临时文件
  utils.cleanupAllTempFiles();
  
  console.log('清理操作完成，应用正在退出');
});