const { contextBridge, ipcRenderer } = require('electron');

// 将指定的 Electron API 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息接口
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  quitApp: () => ipcRenderer.send('quit-app'),
  
  // 服务器管理接口
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  restartServer: () => ipcRenderer.invoke('restart-server'),
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  
  // 新增获取本地IP地址接口
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  
  // 打印机相关接口
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  
  // 测试打印机获取方法
  testPrinterMethods: () => ipcRenderer.invoke('test-printer-methods'),
  
  // 日志接口 - 保留但简化
  sendLog: (level, ...args) => ipcRenderer.send('logger', { level, args }),
  clearLogs: () => ipcRenderer.send('clear-logs'),
  
  // 事件订阅接口
  onClientConnect: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('client-connect', subscription);
    return () => ipcRenderer.removeListener('client-connect', subscription);
  },
  
  onClientDisconnect: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('client-disconnect', subscription);
    return () => ipcRenderer.removeListener('client-disconnect', subscription);
  },
  
  onPrintJob: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('print-job', subscription);
    return () => ipcRenderer.removeListener('print-job', subscription);
  },
  
  onPrintJobUpdate: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('print-job-update', subscription);
    return () => ipcRenderer.removeListener('print-job-update', subscription);
  },
  
  onPrintError: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('print-error', subscription);
    return () => ipcRenderer.removeListener('print-error', subscription);
  },
  
  onServerStatus: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('server-status', subscription);
    return () => ipcRenderer.removeListener('server-status', subscription);
  },
  
  // 日志事件订阅 - 保留用于控制台输出
  onLogMessage: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('log-message', subscription);
    return () => ipcRenderer.removeListener('log-message', subscription);
  }
}); 