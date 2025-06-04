/**
 * 打印机列表管理模块
 * 处理获取系统打印机列表等功能
 */

// 引入应用模块获取窗口引用
const appModule = require('../app');

/**
 * 获取系统打印机列表
 * @returns {Promise<Array>} 打印机列表
 */
async function getPrinterList() {
  try {
    console.log('开始获取系统打印机列表...');
    
    const mainWindow = appModule.getMainWindow();
    if (!mainWindow) {
      console.error('主窗口未找到，无法获取打印机列表');
      return [];
    }
    
    if (mainWindow.isDestroyed()) {
      console.error('主窗口已销毁，无法获取打印机列表');
      return [];
    }
    
    // 首先尝试使用Electron的方法
    let printers = [];
    try {
      // 使用异步的getPrintersAsync方法替代弃用的getPrinters
      if (typeof mainWindow.webContents.getPrintersAsync === 'function') {
        console.log('使用 getPrintersAsync 方法获取打印机...');
        printers = await mainWindow.webContents.getPrintersAsync();
      } else if (typeof mainWindow.webContents.getPrinters === 'function') {
        console.log('使用 getPrinters 方法获取打印机...');
        printers = mainWindow.webContents.getPrinters();
      } else {
        console.warn('Electron webContents 不支持打印机获取方法');
      }
      
      console.log(`Electron API 获取到 ${printers ? printers.length : 0} 台打印机`);
    } catch (electronError) {
      console.warn('使用 Electron API 获取打印机失败:', electronError.message);
    }
    
    // 如果Electron方法失败，尝试使用pdf-to-printer模块作为备用
    if (!printers || printers.length === 0) {
      try {
        console.log('尝试使用 pdf-to-printer 模块获取打印机...');
        const printer = require('pdf-to-printer');
        const pdfPrinters = await printer.getPrinters();
        
        // 将字符串数组转换为对象数组，保持格式一致
        if (Array.isArray(pdfPrinters)) {
          printers = pdfPrinters.map((name, index) => ({
            name: typeof name === 'string' ? name : (name.name || `打印机_${index}`),
            description: typeof name === 'object' ? name.description : '',
            isDefault: typeof name === 'object' ? name.isDefault : index === 0,
            status: 'idle'
          }));
          console.log(`pdf-to-printer 获取到 ${printers.length} 台打印机`);
        }
      } catch (pdfPrinterError) {
        console.warn('使用 pdf-to-printer 获取打印机也失败:', pdfPrinterError.message);
      }
    }
    
    // 如果前两种方法都失败，在Windows下尝试使用系统命令
    if ((!printers || printers.length === 0) && process.platform === 'win32') {
      try {
        console.log('尝试使用 Windows 系统命令获取打印机...');
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execPromise = promisify(exec);
        
        // 使用 wmic 命令获取打印机列表
        const { stdout } = await execPromise('wmic printer get name,status /format:csv', { timeout: 5000 });
        const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
        
        const wmicPrinters = [];
        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 2 && parts[1]?.trim()) {
            wmicPrinters.push({
              name: parts[1].trim(),
              description: '',
              isDefault: wmicPrinters.length === 0, // 第一个作为默认
              status: parts[2]?.trim() || 'idle'
            });
          }
        }
        
        if (wmicPrinters.length > 0) {
          printers = wmicPrinters;
          console.log(`Windows 命令行获取到 ${printers.length} 台打印机`);
        }
      } catch (wmicError) {
        console.warn('使用 Windows 命令行获取打印机也失败:', wmicError.message);
        
        // 最后的备用方案：尝试使用 PowerShell
        try {
          console.log('尝试使用 PowerShell 获取打印机...');
          const { stdout: psOutput } = await execPromise('powershell "Get-Printer | Select-Object Name,PrinterStatus | ConvertTo-Json"', { timeout: 5000 });
          const psResult = JSON.parse(psOutput);
          const psPrinters = Array.isArray(psResult) ? psResult : [psResult];
          
          printers = psPrinters.map((printer, index) => ({
            name: printer.Name,
            description: '',
            isDefault: index === 0,
            status: printer.PrinterStatus === 'Normal' ? 'idle' : 'offline'
          }));
          
          console.log(`PowerShell 获取到 ${printers.length} 台打印机`);
        } catch (psError) {
          console.warn('使用 PowerShell 获取打印机也失败:', psError.message);
        }
      }
    }
    
    // 确保返回的是统一格式的数组
    if (!Array.isArray(printers)) {
      console.warn('获取到的打印机列表不是数组格式，返回空数组');
      return [];
    }
    
    // 标准化打印机对象格式
    const standardizedPrinters = printers.map((printer, index) => {
      if (typeof printer === 'string') {
        return {
          name: printer,
          description: '',
          isDefault: index === 0,
          status: 'idle'
        };
      } else if (typeof printer === 'object' && printer !== null) {
        return {
          name: printer.name || printer.displayName || `打印机_${index}`,
          description: printer.description || printer.desc || '',
          isDefault: printer.isDefault === true || index === 0,
          status: printer.status || 'idle'
        };
      } else {
        return {
          name: `打印机_${index}`,
          description: '',
          isDefault: index === 0,
          status: 'idle'
        };
      }
    });
    
    console.log(`最终返回 ${standardizedPrinters.length} 台打印机:`);
    standardizedPrinters.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (默认: ${p.isDefault})`);
    });
    
    return standardizedPrinters;
  } catch (error) {
    console.error('获取打印机列表失败:', error);
    console.error('错误堆栈:', error.stack);
    return [];
  }
}

/**
 * 测试所有可能的打印机获取方法
 * @returns {Promise<Object>} 测试结果
 */
async function testPrinterListMethods() {
  const results = {
    electron: { success: false, printers: [], error: null },
    pdfToPrinter: { success: false, printers: [], error: null },
    nodeOs: { success: false, printers: [], error: null }
  };
  
  // 测试1: Electron webContents方法
  try {
    const mainWindow = appModule.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (typeof mainWindow.webContents.getPrintersAsync === 'function') {
        const electronPrinters = await mainWindow.webContents.getPrintersAsync();
        results.electron.success = true;
        results.electron.printers = electronPrinters;
        console.log('✅ Electron getPrintersAsync 方法成功');
      } else if (typeof mainWindow.webContents.getPrinters === 'function') {
        const electronPrinters = mainWindow.webContents.getPrinters();
        results.electron.success = true;
        results.electron.printers = electronPrinters;
        console.log('✅ Electron getPrinters 方法成功');
      } else {
        results.electron.error = 'Electron webContents 不支持打印机获取方法';
      }
    } else {
      results.electron.error = '主窗口不可用';
    }
  } catch (error) {
    results.electron.error = error.message;
    console.log('❌ Electron 方法失败:', error.message);
  }
  
  // 测试2: pdf-to-printer方法
  try {
    const printer = require('pdf-to-printer');
    const pdfPrinters = await printer.getPrinters();
    results.pdfToPrinter.success = true;
    results.pdfToPrinter.printers = pdfPrinters;
    console.log('✅ pdf-to-printer 方法成功');
  } catch (error) {
    results.pdfToPrinter.error = error.message;
    console.log('❌ pdf-to-printer 方法失败:', error.message);
  }
  
  // 测试3: Node.js OS 方法（Windows特定）
  if (process.platform === 'win32') {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execPromise = promisify(exec);
      
      // 使用 wmic 命令获取打印机
      const { stdout } = await execPromise('wmic printer get name,status /format:csv');
      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
      const wmicPrinters = lines.map(line => {
        const parts = line.split(',');
        if (parts.length >= 2) {
          return {
            name: parts[1]?.trim(),
            status: parts[2]?.trim()
          };
        }
        return null;
      }).filter(p => p && p.name);
      
      results.nodeOs.success = true;
      results.nodeOs.printers = wmicPrinters;
      console.log('✅ Windows wmic 方法成功');
    } catch (error) {
      results.nodeOs.error = error.message;
      console.log('❌ Windows wmic 方法失败:', error.message);
    }
  }
  
  return results;
}

// 导出模块功能
module.exports = {
  getPrinterList,
  testPrinterListMethods
}; 