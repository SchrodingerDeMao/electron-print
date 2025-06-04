const { BrowserWindow, app } = require('electron');
const path = require('path');
const url = require('url');

// 窗口引用
let mainWindow = null;
let printerWindow = null;

/**
 * 创建主窗口
 * @returns {BrowserWindow} 创建的主窗口对象
 */
function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true, // 启用Node.js集成
      contextIsolation: true, // 启用上下文隔离
      preload: path.join(__dirname, '../../preload.js')
    },
    icon: path.join(__dirname, '../../assets', 'icon.png')
  });

  // 加载应用的HTML页面
  mainWindow.loadFile(path.join(__dirname, '../../index.html'));

  // 设置窗口标题
  mainWindow.setTitle('WMS 打印服务');

  // 在开发环境下打开开发者工具
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 页面加载完成后的处理由main.js中注册

  return mainWindow;
}

/**
 * 创建打印窗口（隐藏）
 * @returns {BrowserWindow} 创建的打印窗口对象
 */
function createPrinterWindow() {
  printerWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // 隐藏窗口
    webPreferences: {
      nodeIntegration: false, // 禁用Node集成提高安全性
      contextIsolation: true, // 启用上下文隔离
      javascript: true, // 允许JavaScript
      webSecurity: true, // 启用Web安全策略
      enableRemoteModule: false, // 禁用remote模块
      spellcheck: false, // 禁用拼写检查
      sandbox: true // 启用沙箱
    }
  });

  // 加载一个空白页面
  printerWindow.loadURL('about:blank');

  // 禁止显示打印窗口
  printerWindow.setMenuBarVisibility(false);
  printerWindow.setAutoHideMenuBar(true);

  // 当打印窗口关闭时
  printerWindow.on('closed', () => {
    printerWindow = null;
  });

  return printerWindow;
}

/**
 * 显示主窗口
 */
function showMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
}

/**
 * 获取主窗口对象
 * @returns {BrowserWindow|null} 主窗口对象或null
 */
function getMainWindow() {
  return mainWindow;
}

/**
 * 获取打印窗口对象
 * @returns {BrowserWindow|null} 打印窗口对象或null
 */
function getPrinterWindow() {
  return printerWindow;
}

/**
 * 设置窗口引用
 * @param {string} type - 窗口类型('main'或'printer')
 * @param {BrowserWindow} window - 窗口实例
 */
function setWindowReference(type, window) {
  if (type === 'main') {
    mainWindow = window;
  } else if (type === 'printer') {
    printerWindow = window;
  }
}

// 导出模块函数
module.exports = {
  createWindow,
  createPrinterWindow,
  showMainWindow,
  getMainWindow,
  getPrinterWindow,
  setWindowReference
}; 