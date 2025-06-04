const { ipcMain, app } = require('electron');
const path = require('path');
const os = require('os');
const windowManager = require('./window');
const trayManager = require('./tray');

/**
 * 设置 IPC 通信处理程序
 * @param {Object} options - 选项对象
 * @param {Function} options.startWebSocketServer - 启动WebSocket服务器的函数
 * @param {Function} options.stopWebSocketServer - 停止WebSocket服务器的函数
 * @param {Function} options.printPdf - 打印PDF的函数
 * @param {Number} options.PORT - WebSocket服务器端口
 */
function setupIPC(options = {}) {
  const { 
    startWebSocketServer, 
    stopWebSocketServer, 
    printPdf, 
    PORT = 20000, 
    pendingLogs = [] 
  } = options;

  // 获取应用版本
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // 获取打印机列表
  ipcMain.handle('get-printers', async () => {
    try {
      // 确保主窗口存在
      const mainWindow = windowManager.getMainWindow();
      if (!mainWindow) {
        return [];
      }
      
      console.log('正在获取系统打印机列表...');
      // 使用异步方法获取打印机
      const printers = await mainWindow.webContents.getPrintersAsync();
      
      // 处理打印机状态 (假设所有打印机都在线)
      const enhancedPrinters = printers.map(printer => ({
        ...printer,
        status: 'online'  // 默认假设打印机都在线
      }));
      
      console.log(`获取到 ${enhancedPrinters.length} 台打印机`);
      return enhancedPrinters;
    } catch (error) {
      console.error('获取打印机列表失败:', error);
      return [];
    }
  });

  // 获取服务器状态
  ipcMain.handle('get-server-status', (event, _options) => {
    // 由于wss不是直接传递给此模块的，我们需要从options中获取服务器状态
    if (typeof options.getServerStatus === 'function') {
      return options.getServerStatus();
    }
    return false;
  });

  // 重启服务器
  ipcMain.handle('restart-server', async () => {
    if (typeof stopWebSocketServer === 'function') {
      await stopWebSocketServer();
    }
    
    if (typeof startWebSocketServer === 'function') {
      return startWebSocketServer();
    }
    
    return { success: false, error: '未提供服务器启动函数' };
  });

  // 最小化到托盘
  ipcMain.on('minimize-to-tray', () => {
    trayManager.minimizeToTray();
  });

  // 退出应用
  ipcMain.on('quit-app', () => {
    app.isQuitting = true;
    app.quit();
  });
  
  // 清空日志
  ipcMain.on('clear-logs', () => {
    if (typeof options.clearLogs === 'function') {
      options.clearLogs();
    } else if (Array.isArray(pendingLogs)) {
      pendingLogs.length = 0;
    }
    console.log('日志已清空');
  });

  // 添加获取当前服务端口的处理
  ipcMain.handle('get-server-port', () => {
    // 如果有获取服务器地址的方法
    if (typeof options.getServerAddress === 'function') {
      const address = options.getServerAddress();
      if (address && typeof address === 'object') {
        return address.port;
      }
    }
    // 否则返回默认端口
    return PORT;
  });
  
  // 添加获取本地IP地址的处理
  ipcMain.handle('get-local-ip', () => {
    try {
      // 获取所有网络接口
      const interfaces = os.networkInterfaces();
      
      // 查找非内部IP地址
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          // 跳过内部和非IPv4地址
          if (!iface.internal && iface.family === 'IPv4') {
            return iface.address;
          }
        }
      }
      
      // 如果没有找到，返回本地回环地址
      return '127.0.0.1';
    } catch (error) {
      console.error('获取本地IP地址失败:', error);
      return '127.0.0.1';
    }
  });

  // 设置默认打印机
  ipcMain.handle('setDefaultPrinter', (event, printerName) => {
    // 由于Electron API不直接支持设置系统默认打印机，
    // 这里只存储应用内的默认打印机
    app.printerName = printerName;
    return { success: true, printer: printerName };
  });

  // 打印PDF
  ipcMain.handle('printPDF', async (event, pdfPath, printerName, silent) => {
    try {
      if (typeof printPdf === 'function') {
        const result = await printPdf(pdfPath, printerName, { silent });
        return result;
      }
      return { success: false, error: '未提供PDF打印函数' };
    } catch (error) {
      console.error('打印PDF失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取应用版本（旧API兼容）
  ipcMain.handle('getAppVersion', () => {
    return app.getVersion();
  });

  // 退出应用（旧API兼容）
  ipcMain.handle('quitApp', () => {
    app.quit();
    return true;
  });

  // 最小化到托盘（旧API兼容）
  ipcMain.handle('minimizeToTray', () => {
    trayManager.minimizeToTray();
    return true;
  });

  // 显示窗口
  ipcMain.handle('showWindow', () => {
    windowManager.showMainWindow();
    return true;
  });

  // 打开开发者工具
  ipcMain.handle('openDevTools', () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.openDevTools();
    }
    return true;
  });

  // 重启应用
  ipcMain.handle('restartApp', () => {
    app.relaunch();
    app.exit(0);
    return true;
  });

  // 处理getAssetPath同步请求
  ipcMain.on('getAssetPath', (event, assetName) => {
    event.returnValue = path.join(app.getAppPath(), 'assets', assetName);
  });

  // 添加测试打印机获取方法的处理程序
  ipcMain.handle('test-printer-methods', async () => {
    try {
      const listModule = require('../printer/list');
      const testResults = await listModule.testPrinterListMethods();
      console.log('=== 打印机获取方法测试结果 ===');
      console.log('Electron 方法:', testResults.electron);
      console.log('pdf-to-printer 方法:', testResults.pdfToPrinter);
      console.log('Windows 命令行方法:', testResults.nodeOs);
      return testResults;
    } catch (error) {
      console.error('测试打印机获取方法失败:', error);
      return { error: error.message };
    }
  });
}

/**
 * 移除所有IPC处理程序
 */
function removeAllIPCHandlers() {
  // 移除所有handle
  ipcMain.removeHandler('get-app-version');
  ipcMain.removeHandler('get-printers');
  ipcMain.removeHandler('get-server-status');
  ipcMain.removeHandler('restart-server');
  ipcMain.removeHandler('get-server-port');
  ipcMain.removeHandler('get-local-ip');
  ipcMain.removeHandler('setDefaultPrinter');
  ipcMain.removeHandler('printPDF');
  ipcMain.removeHandler('getAppVersion');
  ipcMain.removeHandler('quitApp');
  ipcMain.removeHandler('minimizeToTray');
  ipcMain.removeHandler('showWindow');
  ipcMain.removeHandler('openDevTools');
  ipcMain.removeHandler('restartApp');
  ipcMain.removeHandler('test-printer-methods');
  
  // 注意：on类型的监听器需要保存引用才能移除
  // 此处为简化，不处理on类型的监听器
}

module.exports = {
  setupIPC,
  removeAllIPCHandlers
}; 