/**
 * WebSocket客户端管理模块
 * 负责管理WebSocket客户端连接
 */

// 存储连接的客户端
const clients = new Set();

/**
 * 处理新客户端连接
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {http.IncomingMessage} req HTTP请求对象
 * @param {Object} options 配置选项
 * @param {Function} options.getMainWindow 获取主窗口的函数
 */
function handleNewClient(ws, req, options = {}) {
  const { getMainWindow } = options;
  
  // 添加客户端到集合
  clients.add(ws);
  
  // 获取客户端IP
  let ip = extractClientIP(req);
  
  // 将IP保存在WebSocket实例中，方便后续处理
  ws.clientIP = ip;
  
  console.log(`客户端已连接: ${ip}`);
  
  // 通知UI有新客户端连接
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    setTimeout(() => {
      mainWindow.webContents.send('client-connect', { 
        ip, 
        time: new Date().toISOString() 
      });
    }, 1000);
  }
}

/**
 * 处理客户端断开连接
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {Object} options 配置选项
 * @param {Function} options.getMainWindow 获取主窗口的函数
 */
function handleClientDisconnect(ws, options = {}) {
  const { getMainWindow } = options;
  
  // 从集合中移除客户端
  removeClient(ws);
  
  // 获取保存的客户端IP
  const ip = ws.clientIP || '未知';
  console.log(`客户端已断开: ${ip}`);
  
  // 通知UI客户端断开连接
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('client-disconnect', { 
      ip, 
      time: new Date().toISOString() 
    });
  }
}

/**
 * 从客户端集合中移除WebSocket客户端
 * @param {WebSocket} ws WebSocket客户端实例
 */
function removeClient(ws) {
  clients.delete(ws);
}

/**
 * 清空客户端集合
 */
function clearClients() {
  clients.clear();
}

/**
 * 获取所有连接的客户端
 * @returns {Set<WebSocket>} 客户端集合
 */
function getClients() {
  return clients;
}

/**
 * 获取客户端数量
 * @returns {number} 客户端数量
 */
function getClientCount() {
  return clients.size;
}

/**
 * 从请求中提取客户端IP地址
 * @param {http.IncomingMessage} req HTTP请求对象
 * @returns {string} 客户端IP地址
 */
function extractClientIP(req) {
  let ip = '未知';
  
  try {
    // 尝试多种可能的位置获取IP
    if (req.socket && req.socket.remoteAddress) {
      ip = req.socket.remoteAddress;
    } else if (req.connection && req.connection.remoteAddress) {
      ip = req.connection.remoteAddress;
    } else if (req.headers && req.headers['x-forwarded-for']) {
      // 如果有代理，可能在这个头部
      ip = req.headers['x-forwarded-for'].split(',')[0].trim();
    } else if (req.client && req.client.remoteAddress) {
      ip = req.client.remoteAddress;
    }
    
    // 格式化IP地址（去除IPv6前缀等）
    ip = formatClientIP(ip);
  } catch (ipError) {
    console.error('获取客户端IP失败:', ipError);
    ip = '获取失败';
  }
  
  return ip;
}

/**
 * 格式化客户端IP地址
 * @param {string} ip 原始IP地址
 * @returns {string} 格式化后的IP地址
 */
function formatClientIP(ip) {
  if (!ip) return '未知';
  
  // 移除IPv6本地地址前缀
  if (ip.includes('::ffff:')) {
    return ip.replace('::ffff:', '');
  }
  
  // 如果是localhost的IPv6表示
  if (ip === '::1') {
    return '127.0.0.1';
  }
  
  return ip;
}

module.exports = {
  handleNewClient,
  handleClientDisconnect,
  removeClient,
  clearClients,
  getClients,
  getClientCount,
  formatClientIP
}; 