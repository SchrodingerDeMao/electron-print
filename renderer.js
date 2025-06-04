// 打印管理渲染进程
// 存储应用状态的变量
let printers = [];
let printJobs = [];
let connectedClients = [];
let serverStatus = false;

// DOM 元素引用
const elements = {
  appVersion: document.getElementById('app-version'),
  printersList: document.getElementById('printer-list'),
  serverStatus: document.getElementById('server-status'),
  // clientStatus: document.getElementById('client-status'),
  connectedClients: document.getElementById('connected-clients'),
  printJobsList: document.getElementById('print-job-list'),
  minimizeBtn: document.getElementById('minimize-btn'),
  quitBtn: document.getElementById('quit-btn'),
  refreshServerBtn: document.getElementById('refresh-server-btn'),
  refreshPrintersBtn: document.getElementById('refresh-printers-btn'),
  clearJobsBtn: document.getElementById('clear-jobs-btn'),
  // 添加刷新客户端按钮引用
  refreshClientsBtn: document.getElementById('refresh-clients-btn'),
  // 添加服务端口元素引用
  serverPort: document.getElementById('server-port'),
  copyPortBtn: document.getElementById('copy-port-btn'),
  // 添加服务器地址元素引用 - 更新为新的独立地址元素
  serverAddressBar: document.getElementById('server-address-bar'),
  serverAddressLocal: document.getElementById('server-address-local'),
  serverAddressLoopback: document.getElementById('server-address-loopback'),
  serverAddressLan: document.getElementById('server-address-lan'),
  copyAddressLocalBtn: document.getElementById('copy-address-local-btn'),
  copyAddressLoopbackBtn: document.getElementById('copy-address-loopback-btn'),
  copyAddressLanBtn: document.getElementById('copy-address-lan-btn')
};

// 创建控制台日志样式
const consoleStyles = {
  log: 'color: #1890ff',
  info: 'color: #52c41a; font-weight: bold',
  warn: 'color: #faad14; font-weight: bold',
  error: 'color: #f5222d; font-weight: bold'
};

/**
 * 格式化日志消息
 * @param {string} level - 日志级别
 * @param {string} timestamp - 时间戳
 * @param {Array} args - 日志参数
 * @returns {Array} - 格式化后的日志参数
 */
function formatLogMessage(level, timestamp, args) {
  const date = new Date(timestamp);
  const timeStr = date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  const prefix = `[${timeStr}] [${level.toUpperCase()}]`;
  
  // 如果支持彩色控制台，使用样式
  if (window.chrome && window.chrome.webstore) {
    return [`%c${prefix}`, consoleStyles[level], ...args];
  } else {
    return [prefix, ...args];
  }
}

/**
 * 初始化应用
 */
async function initApp() {
  try {
    console.log('正在初始化打印管理应用...');
    
    // 更新应用版本
    await updateAppVersion();
    
    // 加载打印机列表
    await loadPrinters();
    
    // 检查服务器状态
    await checkServerStatus();
    
    // 获取服务器端口
    await updateServerPort();
    
    // 更新服务器访问地址
    await updateServerAddress();
    
    // 注册事件监听器
    registerEventListeners();
    
    // 设置定时刷新客户端连接时间的定时器（每60秒刷新一次）
    setInterval(() => {
      if (connectedClients.length > 0) {
        updateConnectedClientsUI();
      }
    }, 60000);
    
    console.log('应用初始化完成');
  } catch (error) {
    console.error('应用初始化失败:', error);
    alert(`初始化失败: ${error.message}`);
  }
}

/**
 * 更新应用版本显示
 */
async function updateAppVersion() {
  try {
    const version = await window.electronAPI.getAppVersion();
    elements.appVersion.textContent = `v${version}`;
    console.log(`应用版本: ${version}`);
  } catch (error) {
    console.error('获取应用版本失败:', error);
    elements.appVersion.textContent = 'v未知';
  }
}

/**
 * 加载打印机列表
 */
async function loadPrinters() {
  try {
    console.log('正在加载打印机列表...');
    
    if (elements.printersList) {
      elements.printersList.innerHTML = '<div class="list-item">正在加载打印机...</div>';
      
      // 调用主进程API获取打印机
      printers = await window.electronAPI.getPrinters();
      updatePrintersList();
      
      console.log(`已加载 ${printers.length} 台打印机`);
    } else {
      console.error('找不到打印机列表元素');
    }
  } catch (error) {
    console.error('加载打印机失败:', error);
    if (elements.printersList) {
      elements.printersList.innerHTML = '<div class="list-item error">加载打印机失败</div>';
    }
  }
}

/**
 * 更新打印机列表显示
 */
function updatePrintersList() {
  if (!elements.printersList) {
    console.error('找不到打印机列表元素');
    return;
  }
  
  if (printers.length === 0) {
    elements.printersList.innerHTML = '<div class="list-item">未检测到打印机</div>';
    return;
  }
  
  elements.printersList.innerHTML = printers.map(printer => `
    <div class="list-item">
      <div class="printer-name">${printer.name}</div>
      <div class="printer-status ${printer.status === 'online' ? 'online' : 'offline'}">
        ${printer.status === 'online' ? '在线' : '离线'}
      </div>
    </div>
  `).join('');
  
  // 更新客户端状态
  // if (elements.clientStatus) {
  //   elements.clientStatus.textContent = `已连接设备: ${connectedClients.length}`;
  // }
}

/**
 * 检查服务器状态
 */
async function checkServerStatus() {
  try {
    console.log('正在检查服务器状态...');
    elements.serverStatus.classList.add('checking');
    elements.serverStatus.textContent = '正在检查服务器状态...';
    
    serverStatus = await window.electronAPI.getServerStatus();
    updateServerStatusUI(serverStatus);
    
    console.log(`服务器状态: ${serverStatus ? '在线' : '离线'}`);
  } catch (error) {
    console.error('检查服务器状态失败:', error);
    updateServerStatusUI(false);
  }
}

/**
 * 获取并更新服务器端口显示
 */
async function updateServerPort() {
  try {
    if (elements.serverPort) {
      const port = await window.electronAPI.getServerPort();
      elements.serverPort.textContent = port;
      console.log(`服务器端口: ${port}`);
      
      // 端口更新后，也更新访问地址
      await updateServerAddress();
    }
  } catch (error) {
    console.error('获取服务器端口失败:', error);
    if (elements.serverPort) {
      elements.serverPort.textContent = '未知';
    }
  }
}

/**
 * 复制服务端口到剪贴板
 */
function copyPortToClipboard() {
  if (elements.serverPort) {
    const port = elements.serverPort.textContent;
    if (port && port !== '-' && port !== '未知') {
      navigator.clipboard.writeText(port)
        .then(() => {
          console.log(`端口号 ${port} 已复制到剪贴板`);
          // 添加复制成功的视觉反馈
          const btn = elements.copyPortBtn;
          btn.classList.add('copy-success');
          setTimeout(() => {
            btn.classList.remove('copy-success');
          }, 1000);
        })
        .catch(err => {
          console.error('复制到剪贴板失败:', err);
        });
    }
  }
}

/**
 * 更新服务器状态显示
 */
function updateServerStatusUI(isOnline) {
  elements.serverStatus.classList.remove('checking', 'online', 'offline');
  
  if (isOnline) {
    elements.serverStatus.classList.add('online');
    elements.serverStatus.textContent = '服务器运行中';
  } else {
    elements.serverStatus.classList.add('offline');
    elements.serverStatus.textContent = '服务器离线';
  }
}

/**
 * 更新连接客户端显示
 * @param {boolean} forceRefresh - 是否强制刷新连接时间
 */
function updateConnectedClientsUI(forceRefresh = false) {
  // if (elements.clientStatus) {
  //   elements.clientStatus.textContent = `已连接设备: ${connectedClients.length}`;
  // }
  
  // 更新客户端列表区域
  if (elements.connectedClients) {
    if (connectedClients.length === 0) {
      elements.connectedClients.innerHTML = '<div class="client-message">暂无连接</div>';
      return;
    }
    
    // 当前时间
    const now = new Date();
    
    // 生成客户端列表HTML
    const clientsHtml = connectedClients.map(client => {
      // 计算连接时长
      const connectedTime = new Date(client.time);
      const diffMs = now - connectedTime;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      
      let timeDisplay;
      if (diffHours > 0) {
        timeDisplay = `已连接${diffHours}小时${diffMins % 60}分钟`;
      } else if (diffMins > 0) {
        timeDisplay = `已连接${diffMins}分钟`;
      } else {
        timeDisplay = '刚刚连接';
      }
      
      return `
        <div class="client-item" title="连接时间: ${new Date(client.time).toLocaleString()}">
          <span class="client-icon">📱</span>
          <span class="client-ip">${client.ip || '未知'}</span>
          <span class="client-time">${timeDisplay}</span>
        </div>
      `;
    }).join('');
    
    elements.connectedClients.innerHTML = clientsHtml;
  }
}

/**
 * 刷新所有客户端连接状态显示
 */
function refreshClientsStatus() {
  console.log('刷新客户端连接状态...');
  
  // 显示刷新动画
  if (elements.refreshClientsBtn) {
    elements.refreshClientsBtn.disabled = true;
    elements.refreshClientsBtn.classList.add('rotating');
  }
  
  // 更新连接时间显示
  updateConnectedClientsUI(true);
  
  // 延迟移除动画
  setTimeout(() => {
    if (elements.refreshClientsBtn) {
      elements.refreshClientsBtn.disabled = false;
      elements.refreshClientsBtn.classList.remove('rotating');
    }
  }, 500);
}

/**
 * 更新打印任务列表显示
 */
function updatePrintJobsList() {
  if (printJobs.length === 0) {
    elements.printJobsList.innerHTML = '<li class="empty">无打印任务</li>';
    return;
  }
  
  elements.printJobsList.innerHTML = printJobs.map(job => `
    <li class="job-item ${job.status}">
      <div class="job-header">
        <span class="job-id">${job.id}</span>
        <span class="job-status">${getJobStatusText(job.status)}</span>
      </div>
      <div class="job-details">
        <div class="job-printer">打印机: ${job.printer}</div>
        <div class="job-time">时间: ${formatDate(job.timestamp)}</div>
        ${job.error ? `<div class="job-error">错误: ${job.error}</div>` : ''}
      </div>
    </li>
  `).join('');
}

/**
 * 获取任务状态文本
 */
function getJobStatusText(status) {
  const statusMap = {
    'pending': '等待中',
    'printing': '打印中',
    'completed': '已完成',
    'failed': '失败',
    'canceled': '已取消'
  };
  return statusMap[status] || '未知';
}

/**
 * 格式化日期
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN');
}

/**
 * 清除所有打印任务
 */
function clearPrintJobs() {
  printJobs = [];
  updatePrintJobsList();
  console.log('已清除所有打印任务');
}

/**
 * 复制文本到剪贴板并显示成功反馈
 * @param {string} text - 要复制的文本
 * @param {HTMLElement} button - 复制按钮元素
 */
function copyTextToClipboard(text, button) {
  if (!text || text === '无法获取地址') return;
  
  navigator.clipboard.writeText(text)
    .then(() => {
      console.log(`文本 "${text}" 已复制到剪贴板`);
      // 添加复制成功的视觉反馈
      button.classList.add('copy-success');
      setTimeout(() => {
        button.classList.remove('copy-success');
      }, 1000);
    })
    .catch(err => {
      console.error('复制到剪贴板失败:', err);
    });
}

/**
 * 注册事件监听器
 */
function registerEventListeners() {
  console.log('注册事件监听器...');
  
  // 按钮事件
  if (elements.minimizeBtn) {
    elements.minimizeBtn.addEventListener('click', () => {
      window.electronAPI.minimizeToTray();
    });
  }
  
  if (elements.quitBtn) {
    elements.quitBtn.addEventListener('click', () => {
      window.electronAPI.quitApp();
    });
  }
  
  if (elements.refreshServerBtn) {
    elements.refreshServerBtn.addEventListener('click', async () => {
      try {
        elements.refreshServerBtn.disabled = true;
        elements.refreshServerBtn.textContent = '正在重启...';
        await window.electronAPI.restartServer();
        setTimeout(() => {
          elements.refreshServerBtn.disabled = false;
          elements.refreshServerBtn.textContent = '重启服务器';
          checkServerStatus();
          // 服务器重启后刷新端口
          updateServerPort();
        }, 2000);
      } catch (error) {
        console.error('重启服务器失败:', error);
        elements.refreshServerBtn.disabled = false;
        elements.refreshServerBtn.textContent = '重启服务器';
      }
    });
  }
  
  if (elements.refreshPrintersBtn) {
    elements.refreshPrintersBtn.addEventListener('click', loadPrinters);
  }
  
  if (elements.clearJobsBtn) {
    elements.clearJobsBtn.addEventListener('click', clearPrintJobs);
  }
  
  // 添加刷新客户端按钮事件
  if (elements.refreshClientsBtn) {
    elements.refreshClientsBtn.addEventListener('click', refreshClientsStatus);
  }
  
  // 复制端口按钮事件
  if (elements.copyPortBtn) {
    elements.copyPortBtn.addEventListener('click', copyPortToClipboard);
  }
  
  // 复制各地址按钮事件
  if (elements.copyAddressLocalBtn) {
    elements.copyAddressLocalBtn.addEventListener('click', () => {
      if (elements.serverAddressLocal) {
        const address = elements.serverAddressLocal.textContent;
        copyTextToClipboard(address, elements.copyAddressLocalBtn);
      }
    });
  }
  
  if (elements.copyAddressLoopbackBtn) {
    elements.copyAddressLoopbackBtn.addEventListener('click', () => {
      if (elements.serverAddressLoopback) {
        const address = elements.serverAddressLoopback.textContent;
        copyTextToClipboard(address, elements.copyAddressLoopbackBtn);
      }
    });
  }
  
  if (elements.copyAddressLanBtn) {
    elements.copyAddressLanBtn.addEventListener('click', () => {
      if (elements.serverAddressLan) {
        const address = elements.serverAddressLan.textContent;
        copyTextToClipboard(address, elements.copyAddressLanBtn);
      }
    });
  }
  
  // 主进程事件
  window.electronAPI.onClientConnect((data) => {
    console.log('客户端连接:', data);

    // 检查是否已存在相同IP的客户端
    const existingClientIndex = connectedClients.findIndex(client => client.ip === data.ip);
    
    if (existingClientIndex !== -1) {
      // 如果已存在，只更新时间
      console.log(`更新已存在的客户端连接: ${data.ip}`);
      connectedClients[existingClientIndex].time = data.time;
    } else {
      // 如果不存在，添加到列表
      console.log(`添加新客户端连接: ${data.ip}`);
      connectedClients.push({
        id: `client-${Date.now()}`, // 使用时间戳创建唯一ID
        ip: data.ip,
        time: data.time
      });
    }
    
    updateConnectedClientsUI();
  });
  
  window.electronAPI.onClientDisconnect((data) => {
    console.log('客户端断开连接:', data);
    const index = connectedClients.findIndex(client => client.ip === data.ip);
    if (index !== -1) {
      connectedClients.splice(index, 1);
    }
    updateConnectedClientsUI();
  });
  
  window.electronAPI.onPrintJob((job) => {
    console.log('收到打印任务:', job);
    printJobs.unshift(job);
    if (printJobs.length > 100) { // 限制最多保存100个打印任务
      printJobs.pop();
    }
    updatePrintJobsList();
  });
  
  // 监听打印任务状态更新
  window.electronAPI.onPrintJobUpdate((updateData) => {
    console.log('收到打印任务状态更新:', updateData);
    
    // 在打印任务数组中查找对应的任务
    const jobIndex = printJobs.findIndex(job => job.id === updateData.id);
    
    if (jobIndex !== -1) {
      // 更新任务状态
      printJobs[jobIndex] = {
        ...printJobs[jobIndex],
        ...updateData
      };
      
      // 将更新后的任务移到列表顶部（可选）
      if (jobIndex > 0) {
        const updatedJob = printJobs.splice(jobIndex, 1)[0];
        printJobs.unshift(updatedJob);
      }
      
      // 更新UI显示
      updatePrintJobsList();
      
      console.log(`打印任务 ${updateData.id} 状态已更新为 ${updateData.status}`);
    } else {
      console.warn(`找不到要更新的打印任务: ${updateData.id}`);
      
      // 如果找不到对应任务但有完整任务信息，也可以添加为新任务
      if (updateData.printer && updateData.timestamp) {
        printJobs.unshift(updateData);
        updatePrintJobsList();
        console.log(`添加新任务: ${updateData.id}`);
      }
    }
  });
  
  window.electronAPI.onPrintError((error) => {
    console.error('打印错误:', error);
  });
  
  window.electronAPI.onServerStatus((status) => {
    console.log('服务器状态变更:', status);
    serverStatus = status.running;
    updateServerStatusUI(serverStatus);
    // 状态变更后更新端口显示和服务器地址
    updateServerPort();
  });
  
  // 仅注册日志消息监听，不在UI上显示
  window.electronAPI.onLogMessage((logData) => {
    // 只在控制台输出日志，使用格式化的样式
    const formattedArgs = formatLogMessage(
      logData.level, 
      logData.timestamp, 
      logData.args || []
    );
    
    switch (logData.level) {
      case 'error':
        console.error(...formattedArgs);
        break;
      case 'warn':
        console.warn(...formattedArgs);
        break;
      case 'info':
        console.info(...formattedArgs);
        break;
      default:
        console.log(...formattedArgs);
    }
  });
  
  // 添加清除控制台的快捷键
  document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+K 或 Cmd+Shift+K 清除控制台
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'K') {
      console.clear();
      console.log('控制台已清除');
    }
  });
  
  // 添加测试打印机获取方法按钮事件
  const testPrinterMethodsBtn = document.getElementById('test-printer-methods-btn');
  if (testPrinterMethodsBtn) {
    testPrinterMethodsBtn.addEventListener('click', testPrinterMethods);
  }
}

/**
 * 更新服务器访问地址显示
 */
async function updateServerAddress() {
  try {
    const port = await window.electronAPI.getServerPort();
    
    // 获取本地IP地址
    const localIP = await getLocalIP();
    
    // 更新三种不同的地址显示
    if (elements.serverAddressLocal) {
      elements.serverAddressLocal.textContent = `localhost:${port}`;
    }
    
    if (elements.serverAddressLoopback) {
      elements.serverAddressLoopback.textContent = `127.0.0.1:${port}`;
    }
    
    if (elements.serverAddressLan) {
      elements.serverAddressLan.textContent = `${localIP}:${port}`;
    }
    
    console.log(`服务器访问地址已更新: localhost:${port}, 127.0.0.1:${port}, ${localIP}:${port}`);
  } catch (error) {
    console.error('更新服务器访问地址失败:', error);
    
    // 设置默认值
    if (elements.serverAddressLocal) {
      elements.serverAddressLocal.textContent = '无法获取地址';
    }
    
    if (elements.serverAddressLoopback) {
      elements.serverAddressLoopback.textContent = '无法获取地址';
    }
    
    if (elements.serverAddressLan) {
      elements.serverAddressLan.textContent = '无法获取地址';
    }
  }
}

/**
 * 获取本地IP地址
 * @returns {Promise<string>} - 本地IP地址
 */
async function getLocalIP() {
  try {
    // 这里通过主进程提供的接口获取本地IP
    // 如果没有这个接口，则返回一个占位符
    // 实际应用中，你可能需要添加一个获取本地IP的IPC接口
    return window.electronAPI.getLocalIP?.() || '192.168.x.x';
  } catch (error) {
    console.error('获取本地IP地址失败:', error);
    return '192.168.x.x';
  }
}

// 在打印机相关功能区域添加测试功能
async function testPrinterMethods() {
  try {
    console.log('开始测试所有打印机获取方法...');
    const results = await window.electronAPI.testPrinterMethods();
    
    console.log('测试结果:', results);
    
    if (results.error) {
      console.error(`测试失败: ${results.error}`);
      alert(`测试失败: ${results.error}`);
      return;
    }
    
    // 显示测试结果
    console.log('=== 打印机获取方法测试结果 ===');
    
    if (results.electron.success) {
      console.log(`✅ Electron 方法成功: 获取到 ${results.electron.printers.length} 台打印机`);
      results.electron.printers.forEach((printer, index) => {
        const name = typeof printer === 'string' ? printer : printer.name;
        console.log(`  ${index + 1}. ${name}`);
      });
    } else {
      console.warn(`❌ Electron 方法失败: ${results.electron.error}`);
    }
    
    if (results.pdfToPrinter.success) {
      console.log(`✅ pdf-to-printer 方法成功: 获取到 ${results.pdfToPrinter.printers.length} 台打印机`);
      results.pdfToPrinter.printers.forEach((printer, index) => {
        const name = typeof printer === 'string' ? printer : printer.name;
        console.log(`  ${index + 1}. ${name}`);
      });
    } else {
      console.warn(`❌ pdf-to-printer 方法失败: ${results.pdfToPrinter.error}`);
    }
    
    if (typeof process !== 'undefined' && process.platform === 'win32') {
      if (results.nodeOs && results.nodeOs.success) {
        console.log(`✅ Windows 命令行方法成功: 获取到 ${results.nodeOs.printers.length} 台打印机`);
        results.nodeOs.printers.forEach((printer, index) => {
          console.log(`  ${index + 1}. ${printer.name} (${printer.status})`);
        });
      } else if (results.nodeOs) {
        console.warn(`❌ Windows 命令行方法失败: ${results.nodeOs.error}`);
      }
    }
    
    console.log('测试完成！');
    
    // 显示简单的结果提示
    let message = '测试完成！\n\n';
    if (results.electron.success) {
      message += `✅ Electron 方法: 获取到 ${results.electron.printers.length} 台打印机\n`;
    } else {
      message += `❌ Electron 方法: ${results.electron.error}\n`;
    }
    
    if (results.pdfToPrinter.success) {
      message += `✅ pdf-to-printer 方法: 获取到 ${results.pdfToPrinter.printers.length} 台打印机\n`;
    } else {
      message += `❌ pdf-to-printer 方法: ${results.pdfToPrinter.error}\n`;
    }
    
    if (results.nodeOs) {
      if (results.nodeOs.success) {
        message += `✅ Windows 命令行方法: 获取到 ${results.nodeOs.printers.length} 台打印机\n`;
      } else {
        message += `❌ Windows 命令行方法: ${results.nodeOs.error}\n`;
      }
    }
    
    message += '\n详细结果请查看开发者控制台（F12）';
    alert(message);
    
  } catch (error) {
    console.error('测试打印机方法出错:', error);
    alert(`测试出错: ${error.message}`);
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp); 