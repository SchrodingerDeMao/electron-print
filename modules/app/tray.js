const { Tray, app } = require('electron');
const path = require('path');
const fs = require('fs');
const windowManager = require('./window');
const menuManager = require('./menu');

// 托盘图标引用
let tray = null;

/**
 * 创建系统托盘图标
 * @param {Object} options - 托盘选项
 * @param {Function} options.onRestartServer - 重启服务器的回调函数
 * @returns {Tray} 创建的托盘图标对象
 */
function createTray(options = {}) {
  // 检查是否已存在托盘图标
  if (tray !== null) {
    return tray;
  }
  
  try {
    console.log('正在创建系统托盘图标...');
    
    // 托盘图标路径 - 使用绝对路径
    const iconPath = path.join(__dirname, '../../assets', 'icon.png');
    console.log(`尝试加载托盘图标: ${iconPath}`);
    
    // 确保图标文件存在
    if (!fs.existsSync(iconPath)) {
      console.error(`图标文件不存在: ${iconPath}`);
      // 尝试使用备用图标（如果是Windows系统，使用系统图标）
      if (process.platform === 'win32') {
        const nativeImage = require('electron').nativeImage;
        const defaultIcon = nativeImage.createFromPath(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32\\SecurityAndMaintenance.png'));
        tray = new Tray(defaultIcon);
        console.log('使用系统默认图标作为备用');
      } else {
        // 创建一个空白图标
        const nativeImage = require('electron').nativeImage;
        const emptyIcon = nativeImage.createEmpty();
        tray = new Tray(emptyIcon);
        console.log('使用空白图标作为备用');
      }
    } else {
      // 使用nativeImage加载图标，避免直接使用文件路径
      const nativeImage = require('electron').nativeImage;
      const icon = nativeImage.createFromPath(iconPath);
      
      // 检查图标是否有效
      if (icon.isEmpty()) {
        console.error('图标加载失败：图标为空');
        // 创建默认图标
        tray = new Tray(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32\\SecurityAndMaintenance.png'));
      } else {
        console.log('成功加载图标');
        tray = new Tray(icon);
      }
    }
    
    // 设置鼠标悬停提示
    tray.setToolTip('WMS 打印服务');
    
    // 创建托盘菜单并设置
    const trayMenu = menuManager.createTrayMenu({
      onShowWindow: () => {
        windowManager.showMainWindow();
      },
      onRestartServer: () => {
        if (typeof options.onRestartServer === 'function') {
          options.onRestartServer();
        }
      },
      onQuit: () => {
        app.isQuitting = true;
        app.quit();
      }
    });
    
    // 设置右键菜单
    tray.setContextMenu(trayMenu);
    
    // 点击托盘图标显示窗口
    tray.on('click', () => {
      windowManager.showMainWindow();
    });
    
    console.log('系统托盘图标创建成功');
    
  } catch (error) {
    console.error('创建系统托盘图标失败:', error);
    try {
      // 再次尝试使用备用方法创建托盘图标
      const nativeImage = require('electron').nativeImage;
      const emptyIcon = nativeImage.createEmpty();
      tray = new Tray(emptyIcon);
      tray.setToolTip('WMS 打印服务 (备用图标)');
      console.log('使用备用方法创建了托盘图标');
    } catch (secondError) {
      console.error('备用托盘图标创建也失败:', secondError);
    }
  }
  
  return tray;
}

/**
 * 设置托盘图标状态
 * @param {boolean} isOnline - 服务器是否在线
 */
function updateTrayStatus(isOnline) {
  if (!tray) return;
  
  try {
    if (isOnline) {
      tray.setToolTip('WMS 打印服务 - 在线');
      // 可以根据状态更改图标，如果有不同状态的图标
    } else {
      tray.setToolTip('WMS 打印服务 - 离线');
    }
  } catch (error) {
    console.error('更新托盘图标状态失败:', error);
  }
}

/**
 * 最小化到托盘
 */
function minimizeToTray() {
  try {
    // 确保托盘图标已创建
    if (!tray) {
      createTray();
    }
    
    // 隐藏窗口
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
    
    // 显示通知消息
    if (tray && process.platform === 'win32') {
      try {
        // Windows 10+ 支持托盘通知
        tray.displayBalloon({
          title: 'WMS 打印服务',
          content: '应用已最小化到系统托盘。\n点击托盘图标可恢复窗口。',
          iconType: 'info'
        });
      } catch (notifyError) {
        console.warn('显示托盘通知失败:', notifyError);
      }
    }
    
    console.log('已成功最小化到托盘');
  } catch (error) {
    console.error('最小化到托盘失败:', error);
    
    // 如果最小化到托盘失败，至少尝试隐藏窗口
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.hide();
        console.log('已隐藏主窗口');
      } catch (hideError) {
        console.error('隐藏窗口也失败:', hideError);
      }
    }
  }
}

/**
 * 销毁托盘图标
 */
function destroyTray() {
  if (tray) {
    try {
      tray.destroy();
      tray = null;
      console.log('托盘图标已销毁');
    } catch (error) {
      console.error('销毁托盘图标失败:', error);
    }
  }
}

/**
 * 获取托盘实例
 * @returns {Tray|null} 托盘图标实例或null
 */
function getTray() {
  return tray;
}

module.exports = {
  createTray,
  updateTrayStatus,
  minimizeToTray,
  destroyTray,
  getTray
}; 