/**
 * WebSocket服务器模块
 * 负责创建和管理WebSocket服务器
 */

const WebSocket = require('ws');
const http = require('http');
const { app } = require('electron');
const clientManager = require('./client');
const handler = require('./handler');
const utils = require('../utils');

// 服务器实例
let server = null;
let wss = null;

/**
 * 启动WebSocket服务器
 * @param {Object} options 服务器配置选项
 * @param {number} options.port 服务器端口号
 * @param {Function} options.getMainWindow 获取主窗口的函数
 * @param {Function} options.updateTrayStatus 更新托盘状态的函数
 * @returns {Promise<boolean>} 启动结果
 */
function startWebSocketServer(options = {}) {
  const { port = 8765, getMainWindow, updateTrayStatus } = options;
  
  return new Promise((resolve, reject) => {
    try {
      console.log('正在启动WebSocket服务器...');
      
      // 如果服务器已存在，先关闭
      if (server) {
        console.log('关闭现有服务器...');
        server.close();
        server = null;
      }
      if (wss) {
        console.log('关闭现有WebSocket服务器...');
        wss.close();
        wss = null;
      }
      
      // 创建HTTP服务器
      server = http.createServer((req, res) => {
        // 提供简单的状态检查接口
        if (req.url === '/status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'running',
            version: app.getVersion(),
            printers: options.getPrinterList().then(list => list.length).catch(() => 0) // 处理异步结果
          }));
          return;
        }
        
        res.writeHead(404);
        res.end();
      });
      
      // 创建WebSocket服务器
      wss = new WebSocket.Server({ server, path: '/' });
      
      // WebSocket连接事件
      wss.on('connection', (ws, req) => {
        // 处理客户端连接
        clientManager.handleNewClient(ws, req, { getMainWindow });
        
        // 处理消息
        ws.on('message', async (message) => {
          // 消息处理交给handler模块
          handler.handleMessage(ws, message, {
            getMainWindow,
            ...options
          });
        });
        
        // 处理连接关闭
        ws.on('close', () => {
          clientManager.handleClientDisconnect(ws, { getMainWindow });
        });
        
        // 处理连接错误
        ws.on('error', (error) => {
          console.error(`WebSocket客户端错误:`, error);
          clientManager.removeClient(ws);
        });
        
        // 发送欢迎消息
        try {
          ws.send(JSON.stringify({
            event: 'welcome',
            data: {
              version: app.getVersion(),
              time: new Date().toISOString()
            }
          }));
        } catch (error) {
          console.error('发送欢迎消息失败:', error);
        }
      });
      
      // 监听错误
      wss.on('error', (error) => {
        console.error('WebSocket服务器错误:', error);
        if (!server.listening) {
          reject(error);
        }
      });
      
      // 启动服务器
      server.listen(port, () => {
        console.log(`WebSocket服务器已启动: ws://localhost:${port}`);
        
        // 通知UI服务器已启动
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('server-status', { 
            running: true, 
            port: port,
            address: `ws://localhost:${port}`
          });
        }
        if (updateTrayStatus) {
          updateTrayStatus(true);
        }
        
        resolve(true);
      });
      
      // 监听服务器错误
      server.on('error', (err) => {
        console.error('HTTP服务器错误:', err);
        
        // 如果端口被占用，尝试其他端口
        if (err.code === 'EADDRINUSE') {
          console.log(`端口 ${port} 已被占用，尝试使用其他端口`);
          server.close();
          
          // 尝试使用随机端口
          const randomPort = Math.floor(Math.random() * 10000) + 50000;
          console.log(`尝试使用随机端口: ${randomPort}`);
          
          server.listen(randomPort, () => {
            console.log(`WebSocket服务器已启动: ws://localhost:${randomPort}`);
            
            // 通知UI服务器已启动
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('server-status', { 
                running: true, 
                port: randomPort,
                address: `ws://localhost:${randomPort}`
              });
            }
            
            resolve(true);
          });
        } else {
          reject(err);
        }
      });
    } catch (error) {
      console.error('启动WebSocket服务器失败:', error);
      reject(error);
    }
  });
}

/**
 * 停止WebSocket服务器
 * @returns {Promise<boolean>} 停止结果
 */
function stopWebSocketServer() {
  return new Promise((resolve, reject) => {
    try {
      if (wss) {
        console.log('正在关闭WebSocket服务器...');
        
        // 关闭所有客户端连接
        wss.clients.forEach(client => {
          client.close(1000, '服务器关闭');
        });
        
        // 清空客户端集合
        clientManager.clearClients();
        
        // 关闭WebSocket服务器
        wss.close(() => {
          console.log('WebSocket服务器已关闭');
          
          // 关闭HTTP服务器
          if (server) {
            server.close((err) => {
              if (err) {
                console.error('关闭HTTP服务器失败:', err);
                reject(err);
              } else {
                console.log('HTTP服务器已关闭');
                server = null;
                wss = null;
                resolve(true);
              }
            });
          } else {
            wss = null;
            resolve(true);
          }
        });
      } else {
        resolve(true);
      }
    } catch (error) {
      console.error('关闭服务器失败:', error);
      reject(error);
    }
  });
}

/**
 * 获取服务器状态
 * @returns {boolean} 服务器是否运行中
 */
function getServerStatus() {
  return !!wss && wss.clients.size >= 0;
}

/**
 * 获取服务器地址信息
 * @returns {Object|null} 服务器地址信息
 */
function getServerAddress() {
  return server && server.listening ? server.address() : null;
}

/**
 * 获取连接的客户端数量
 * @returns {number} 客户端数量
 */
function getClientCount() {
  return wss ? wss.clients.size : 0;
}

module.exports = {
  startWebSocketServer,
  stopWebSocketServer,
  getServerStatus,
  getServerAddress,
  getClientCount
}; 