/**
 * App模块入口文件
 * 集中导出所有app相关模块，简化导入
 */

const windowManager = require('./window');
const menuManager = require('./menu');
const trayManager = require('./tray');
const ipcManager = require('./ipc');

module.exports = {
  window: windowManager,
  menu: menuManager,
  tray: trayManager,
  ipc: ipcManager,
  
  // 方便直接访问的别名
  createWindow: windowManager.createWindow,
  createPrinterWindow: windowManager.createPrinterWindow,
  showMainWindow: windowManager.showMainWindow,
  getMainWindow: windowManager.getMainWindow,
  getPrinterWindow: windowManager.getPrinterWindow,
  
  createChineseMenu: menuManager.createChineseMenu,
  createTrayMenu: menuManager.createTrayMenu,
  
  createTray: trayManager.createTray,
  updateTrayStatus: trayManager.updateTrayStatus,
  minimizeToTray: trayManager.minimizeToTray,
  destroyTray: trayManager.destroyTray,
  
  setupIPC: ipcManager.setupIPC,
  removeAllIPCHandlers: ipcManager.removeAllIPCHandlers
}; 