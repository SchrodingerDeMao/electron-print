const { Menu, dialog, app } = require('electron');
const windowManager = require('./window');

/**
 * 创建中文应用菜单
 */
function createChineseMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于打印服务',
              message: `WMS 打印服务 v${app.getVersion()}`,
              detail: '用于处理WMS系统的打印任务',
              buttons: ['确定']
            });
          }
        },
        { type: 'separator' },
        { 
          label: '退出', 
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    // {
    //   label: '编辑',
    //   submenu: [
    //     { label: '复制', role: 'copy', accelerator: 'CmdOrCtrl+C' },
    //     { label: '粘贴', role: 'paste', accelerator: 'CmdOrCtrl+V' },
    //     { label: '剪切', role: 'cut', accelerator: 'CmdOrCtrl+X' },
    //     { type: 'separator' },
    //     { label: '全选', role: 'selectAll', accelerator: 'CmdOrCtrl+A' }
    //   ]
    // },
    {
      label: '查看',
      submenu: [
        { label: '重新加载', role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { label: '强制重新加载', role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { type: 'separator' },
        { label: '恢复默认大小', role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
        { label: '放大', role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
        { label: '缩小', role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { type: 'separator' },
        { 
          label: '开发者工具', 
          role: 'toggleDevTools', 
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I'
        }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize', accelerator: 'CmdOrCtrl+M' },
        { label: '关闭', role: 'close', accelerator: 'CmdOrCtrl+W' },
        { 
          label: '最小化到托盘', 
          click: () => {
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow) {
              mainWindow.hide();
            }
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { 
          label: '打印机管理', 
          click: () => {
            // 打开系统打印机设置
            const command = process.platform === 'win32' ? 
              'rundll32 printui.dll,PrintUIEntry /il' : 
              (process.platform === 'darwin' ? 'open -a "系统偏好设置" "打印与扫描"' : 'system-config-printer');
            
            require('child_process').exec(command, (error) => {
              if (error) {
                console.error('打开打印机设置失败:', error);
                dialog.showErrorBox('错误', '无法打开系统打印机设置');
              }
            });
          }
        },
        { 
          label: '检查更新', 
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '检查更新',
              message: '当前已是最新版本',
              buttons: ['确定']
            });
          }
        },
        { type: 'separator' },
        { 
          label: '关于', 
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于',
              message: `WMS 打印服务 v${app.getVersion()}`,
              detail: '版权所有 ©wms科技 2025',
              buttons: ['确定']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * 创建托盘菜单
 * @param {Object} options - 托盘菜单选项
 * @param {Function} options.onShowWindow - 显示窗口的回调函数
 * @param {Function} options.onRestartServer - 重启服务器的回调函数
 * @param {Function} options.onQuit - 退出应用的回调函数
 * @returns {Menu} 创建的托盘菜单
 */
function createTrayMenu(options = {}) {
  const { onShowWindow, onRestartServer, onQuit } = options;
  
  const template = [
    { 
      label: '显示窗口', 
      click: () => {
        if (typeof onShowWindow === 'function') {
          onShowWindow();
        } else {
          windowManager.showMainWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: '重启服务器',
      click: () => {
        if (typeof onRestartServer === 'function') {
          onRestartServer();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        if (typeof onQuit === 'function') {
          onQuit();
        } else {
          app.isQuitting = true;
          app.quit();
        }
      }
    }
  ];
  
  return Menu.buildFromTemplate(template);
}

module.exports = {
  createChineseMenu,
  createTrayMenu
}; 