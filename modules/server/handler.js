/**
 * WebSocket请求处理模块
 * 负责处理WebSocket客户端发送的各类请求
 */

const utils = require('../utils');

/**
 * 处理WebSocket消息
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {string|Buffer} message 接收到的消息
 * @param {Object} options 配置选项
 * @param {Function} options.getMainWindow 获取主窗口的函数
 * @param {Function} options.getPrinterList 获取打印机列表的函数
 * @param {Function} options.printPdf 打印PDF的函数
 * @param {Function} options.printImage 打印图片的函数
 * @param {Function} options.directPrintImage 直接打印图片的函数
 * @param {Function} options.printImageWithCPCL CPCL方式打印图片的函数
 * @param {Function} options.printBase64WithPngCPCL 打印Base64WithPngCPCL的函数
 * @param {Function} options.printImageWithZPL ZPL方式打印图片的函数
 * @param {Function} options.printBase64WithZPL 打印Base64WithZPL的函数
 */
async function handleMessage(ws, message, options = {}) {
  const { 
    getMainWindow, 
    getPrinterList, 
    printPdf, 
    printImage, 
    directPrintImage,
    printImageWithCPCL,
    printBase64WithPngCPCL,
    printImageWithZPL,
    printBase64WithZPL
  } = options;
  
  console.log('收到消息:', message);
  console.log('options注入成功:', options);
  
  try {
    // 解析消息，处理可能的不同格式
    let data;
    if (typeof message === 'string') {
      data = JSON.parse(message);
      console.log('收到字符串消息，长度:', message.length);
    } else if (message instanceof Buffer) {
      data = JSON.parse(message.toString('utf8'));
      console.log('收到Buffer消息，长度:', message.length);
    } else {
      // 尝试转换为字符串
      data = JSON.parse(message.toString());
      console.log('收到其他类型消息，长度:', message.toString().length);
    }
    
    // 获取请求ID，确保响应能匹配到请求
    const requestId = data.requestId || data.id || `auto_${Date.now()}`;
    console.log(`请求ID: ${requestId}`);
    
    // 检查客户端是否优先文本响应
    const preferTextResponse = data.preferTextResponse === true;
    console.log(`优先文本响应: ${preferTextResponse}`);
    
    // 根据消息类型处理
    const messageType = data.action || data.type;
    console.log(`收到消息类型: ${messageType}`);
    
    // 获取主窗口实例
    const mainWindow = getMainWindow();
    
    switch (messageType) {
      case 'getPrinters':
      case 'get-printers':
        await handleGetPrinters(ws, requestId, getPrinterList);
        break;
      
      case 'printPdf':
      case 'print-pdf':
        await handlePrintPdf(ws, data, requestId, mainWindow, printPdf);
        break;
      
      case 'printImage':
      case 'print-image':
        await handlePrintImage(ws, data, requestId, mainWindow, printImage);
        break;
      
      case 'savePdf':
      case 'save-pdf':
        await handleSavePdf(ws, data, requestId, mainWindow);
        break;
      
      case 'directPrintImage':
      case 'direct-print-image':
        await handleDirectPrintImage(ws, data, requestId, mainWindow, directPrintImage);
        break;
      
      case 'printCPCL':
      case 'print-cpcl':
      case 'printImageWithCPCL':
      case 'print-image-with-cpcl':
        await handlePrintImageWithCPCL(ws, data, requestId, mainWindow, printImageWithCPCL);
        break;
      
      case 'printPngCPCL':
      case 'print-png-cpcl':
        await handlePrintBase64WithPngCPCL(ws, data, requestId, mainWindow, printBase64WithPngCPCL);
        break;
      
      case 'printZPL':
      case 'print-zpl':
      case 'printImageWithZPL':
      case 'print-image-with-zpl':
        await handlePrintImageWithZPL(ws, data, requestId, mainWindow, printImageWithZPL);
        break;
      
      case 'printBase64WithZPL':
      case 'print-base64-with-zpl':
        await handlePrintBase64WithZPL(ws, data, requestId, mainWindow, printBase64WithZPL);
        break;
      
      default:
        console.log(`未知消息类型: ${messageType}`);
        ws.send(JSON.stringify({
          event: 'error',
          requestId,
          error: `未知的消息类型: ${messageType}`
        }));
        console.log(`已发送未知消息类型错误响应: ${messageType}`);
    }
  } catch (err) {
    console.error('处理消息出错:', err);
    try {
      ws.send(JSON.stringify({
        event: 'error',
        error: `消息处理出错: ${err.message}`
      }));
      console.log('已发送消息处理错误响应:', err.message);
    } catch (sendError) {
      console.error('发送错误响应失败:', sendError);
    }
  }
}

/**
 * 处理获取打印机列表请求
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {string} requestId 请求ID
 * @param {Function} getPrinterList 获取打印机列表的函数
 */
async function handleGetPrinters(ws, requestId, getPrinterList) {
  // 获取打印机列表
  const printers = await getPrinterList();
  console.log(`获取到打印机列表，数量: ${printers.length}`);
  
  const printersResponse = {
    event: 'printerList',
    type: 'printers', // 兼容旧格式
    requestId,
    printers
  };
  
  ws.send(JSON.stringify(printersResponse));
  console.log('已发送打印机列表响应');
}

/**
 * 处理打印PDF请求
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {Object} data 请求数据
 * @param {string} requestId 请求ID
 * @param {BrowserWindow} mainWindow 主窗口实例
 * @param {Function} printPdf 打印PDF的函数
 */
async function handlePrintPdf(ws, data, requestId, mainWindow, printPdf) {
  try {
    // 解析PDF数据和选项
    let pdfData, options = {};
    
    // 支持不同的数据结构格式
    if (data.data) {
      pdfData = data.data;
      options = data.options || {};
      console.log('使用data字段的PDF数据');
    } else if (data.pdf) {
      pdfData = data.pdf;
      options = data.options || {};
      console.log('使用pdf字段的PDF数据');
    } else {
      throw new Error('缺少PDF数据');
    }
    
    const printerName = options.printer;
    console.log(`选择的打印机: ${printerName || '默认打印机'}`);
    console.log(`打印选项:`, JSON.stringify(options));
    
    // 通知UI收到打印任务
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job', { 
        id: requestId,
        printer: printerName, 
        timestamp: new Date().toISOString(),
        status: 'pending'
      });
      console.log('已通知UI收到打印任务');
    }
    
    // 使用工具模块验证PDF数据
    const { cleanData, buffer } = utils.validatePdfData(pdfData);
    console.log(`Base64解码后PDF大小: ${buffer.length}字节`);
    
    // 保存PDF文件副本用于调试(可选)
    try {
      utils.saveDebugFile(buffer, 'pdf', `debug-${requestId}`);
      console.log(`已保存PDF调试副本`);
    } catch (debugError) {
      console.warn('保存调试PDF副本失败:', debugError.message);
    }
    
    // 保存到临时文件
    const filePath = utils.saveTempPdf(buffer);
    console.log(`临时PDF文件已保存: ${filePath}`);
    
    // 打印PDF
    console.log('开始打印PDF文件...');
    const result = await printPdf(filePath, printerName, options);
    console.log(`打印结果:`, result);
    
    // 返回结果
    const printResponse = {
      event: 'printResult',
      type: 'printResult', // 兼容旧格式
      requestId,
      success: true,
      ...result
    };
    ws.send(JSON.stringify(printResponse));
    console.log('已发送打印成功响应');
    
    // 更新UI打印任务状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'completed',
        printer: printerName,
        timestamp: new Date().toISOString(),
        result
      });
      console.log('已更新UI打印任务状态为已完成');
    }
  } catch (printError) {
    console.error('打印过程出错:', printError);
    const errorResponse = {
      event: 'printResult',
      type: 'error', // 兼容旧格式
      requestId,
      success: false,
      error: printError.message
    };
    ws.send(JSON.stringify(errorResponse));
    console.log('已发送打印错误响应:', printError.message);
    
    // 更新UI打印任务状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'failed',
        error: printError.message,
        printer: options?.printer,
        timestamp: new Date().toISOString()
      });
      console.log('已更新UI打印任务状态为失败');
    }
  }
}

/**
 * 处理打印图片请求
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {Object} data 请求数据
 * @param {string} requestId 请求ID
 * @param {BrowserWindow} mainWindow 主窗口实例
 * @param {Function} printImage 打印图片的函数
 */
async function handlePrintImage(ws, data, requestId, mainWindow, printImage) {
  try {
    // 解析图片数据和选项
    let imageData, options = {};
    
    // 支持不同的数据结构格式
    if (data.data) {
      imageData = data.data;
      options = data.options || {};
      console.log('使用data字段的图片数据');
    } else if (data.image) {
      imageData = data.image;
      options = data.printOptions || {};
      console.log('使用image字段的图片数据');
    } else {
      throw new Error('缺少图片数据');
    }
    
    const printerName = options.printer;
    console.log(`选择的打印机: ${printerName || '默认打印机'}`);
    console.log(`打印选项:`, JSON.stringify(options));
    
    // 通知UI收到打印任务
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job', { 
        id: requestId,
        printer: printerName, 
        timestamp: new Date().toISOString(),
        status: 'pending',
        type: 'image'
      });
      console.log('已通知UI收到图片打印任务');
    }
    
    // 使用工具模块验证图片数据
    const validatedImageData = utils.validateImageData(imageData);
    console.log(`处理图片打印任务: ID=${requestId}, 数据长度=${validatedImageData.length}字节, 打印机=${printerName || '默认'}`);
    
    // 打印图片
    const result = await printImage(validatedImageData, printerName, options);
    console.log(`图片打印结果:`, result);
    
    // 返回结果
    const printResponse = {
      event: 'printResult',
      type: 'printResult', // 兼容旧格式
      requestId,
      success: true,
      ...result
    };
    ws.send(JSON.stringify(printResponse));
    console.log('已发送图片打印成功响应');
    
    // 更新UI打印任务状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'completed',
        printer: printerName,
        timestamp: new Date().toISOString(),
        result,
        type: 'image'
      });
      console.log('已更新UI图片打印任务状态为已完成');
    }
  } catch (printError) {
    console.error('图片打印过程出错:', printError);
    const errorResponse = {
      event: 'printResult',
      type: 'error', // 兼容旧格式
      requestId,
      success: false,
      error: printError.message
    };
    ws.send(JSON.stringify(errorResponse));
    console.log('已发送图片打印错误响应:', printError.message);
    
    // 更新UI打印任务状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'failed',
        error: printError.message,
        printer: options?.printer,
        timestamp: new Date().toISOString(),
        type: 'image'
      });
      console.log('已更新UI图片打印任务状态为失败');
    }
  }
}

/**
 * 处理直接打印图片请求
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {Object} data 请求数据
 * @param {string} requestId 请求ID
 * @param {BrowserWindow} mainWindow 主窗口实例
 * @param {Function} directPrintImage 直接打印图片的函数
 */
async function handleDirectPrintImage(ws, data, requestId, mainWindow, directPrintImage) {
  try {
    // 解析图片数据和选项
    let imageData, options = {};
    
    // 支持不同的数据结构格式
    if (data.data) {
      imageData = data.data;
      options = data.options || {};
      console.log('使用data字段的图片数据进行直接打印');
    } else if (data.image) {
      imageData = data.image;
      options = data.options || {};
      console.log('使用image字段的图片数据进行直接打印');
    } else {
      throw new Error('缺少图片数据');
    }
    
    const printerName = options.printer;
    console.log(`选择的打印机: ${printerName || '默认打印机'}`);
    console.log(`直接打印选项:`, JSON.stringify(options));
    
    // 通知UI收到打印任务
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job', { 
        id: requestId,
        printer: printerName, 
        timestamp: new Date().toISOString(),
        status: 'pending',
        type: 'direct-image'
      });
      console.log('已通知UI收到直接图片打印任务');
    }
    
    // 使用工具模块验证图片数据
    const validatedImageData = utils.validateImageData(imageData);
    console.log(`处理直接图片打印任务: ID=${requestId}, 数据长度=${validatedImageData.length}字节, 打印机=${printerName || '默认'}`);
    
    // 执行直接打印
    const result = await directPrintImage(validatedImageData, printerName, options);
    console.log(`直接图片打印结果:`, result);
    
    // 返回结果
    const printResponse = {
      event: 'printResult',
      type: 'printResult',
      requestId,
      success: true,
      ...result
    };
    ws.send(JSON.stringify(printResponse));
    console.log('已发送直接图片打印成功响应');
    
    // 更新UI打印任务状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'completed',
        printer: printerName,
        timestamp: new Date().toISOString(),
        result,
        type: 'direct-image'
      });
      console.log('已更新UI直接图片打印任务状态为已完成');
    }
  } catch (printError) {
    console.error('直接图片打印过程出错:', printError);
    const errorResponse = {
      event: 'printResult',
      type: 'error',
      requestId,
      success: false,
      error: printError.message
    };
    ws.send(JSON.stringify(errorResponse));
    console.log('已发送直接图片打印错误响应:', printError.message);
    
    // 更新UI打印任务状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'failed',
        error: printError.message,
        printer: options?.printer,
        timestamp: new Date().toISOString(),
        type: 'direct-image'
      });
      console.log('已更新UI直接图片打印任务状态为失败');
    }
  }
}

/**
 * 处理保存PDF请求
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {Object} data 请求数据
 * @param {string} requestId 请求ID
 * @param {BrowserWindow} mainWindow 主窗口实例
 */
async function handleSavePdf(ws, data, requestId, mainWindow) {
  try {
    const { dialog } = require('electron');
    const fs = require('fs');
    
    // 处理保存PDF请求
    let pdfData, options = {};
    
    // 支持不同的数据结构格式
    if (data.data) {
      pdfData = data.data;
      options = data.options || {};
      console.log('使用data字段的PDF数据进行保存');
    } else if (data.pdf) {
      pdfData = data.pdf;
      options = data.options || {};
      console.log('使用pdf字段的PDF数据进行保存');
    } else {
      throw new Error('缺少PDF数据');
    }
    
    console.log(`处理PDF保存请求: ID=${requestId}, 数据长度=${pdfData.length}字节`);
    
    // 通知UI收到PDF保存请求
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job', { 
        id: requestId,
        printer: '文件保存', 
        timestamp: new Date().toISOString(),
        status: 'pending',
        message: '准备保存PDF文件'
      });
      console.log('已通知UI收到PDF保存请求');
    }
    
    // 使用工具模块验证PDF数据
    const { cleanData, buffer } = utils.validatePdfData(pdfData);
    console.log(`Base64解码后PDF大小: ${buffer.length}字节`);
    
    // 验证PDF头部魔数
    const pdfMagicNumber = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-
    if (buffer.length >= 5 && !buffer.slice(0, 5).equals(pdfMagicNumber)) {
      console.warn('警告: PDF数据没有正确的PDF头部');
      console.log('实际魔数:', buffer.slice(0, 10).toString('hex'));
    } else {
      console.log('PDF魔数验证通过');
    }
    
    console.log('显示保存对话框...');
    // 显示保存对话框
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '保存PDF',
      defaultPath: options.defaultPath || 'document.pdf',
      filters: [
        { name: 'PDF文件', extensions: ['pdf'] }
      ]
    });
    
    if (canceled) {
      console.log('用户取消了PDF保存操作');
      ws.send(JSON.stringify({
        event: 'saveResult',
        requestId,
        success: false,
        canceled: true
      }));
      console.log('已发送用户取消保存响应');
      
      // 通知UI保存被取消
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('print-job-update', {
          id: requestId,
          status: 'canceled',
          printer: '文件保存',
          timestamp: new Date().toISOString(),
          message: '用户取消了保存操作'
        });
        console.log('已更新UI状态：用户取消保存');
      }
      return;
    }
    
    // 写入文件
    fs.writeFileSync(filePath, buffer);
    console.log(`PDF文件已保存: ${filePath}`);
    
    ws.send(JSON.stringify({
      event: 'saveResult',
      requestId,
      success: true,
      filePath
    }));
    console.log('已发送保存成功响应');
    
    // 通知UI保存成功
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'completed',
        printer: '文件保存',
        timestamp: new Date().toISOString(),
        message: `文件已保存: ${filePath.split('\\').pop()}`
      });
      console.log('已更新UI状态：保存成功');
    }
  } catch (saveError) {
    console.error('保存PDF出错:', saveError);
    ws.send(JSON.stringify({
      event: 'saveResult',
      requestId,
      success: false,
      error: saveError.message
    }));
    console.log('已发送保存错误响应:', saveError.message);
    
    // 通知UI保存失败
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'failed',
        printer: '文件保存',
        timestamp: new Date().toISOString(),
        error: saveError.message
      });
      console.log('已更新UI状态：保存失败');
    }
  }
}

/**
 * 处理CPCL方式打印图片请求
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {Object} data 请求数据
 * @param {string} requestId 请求ID
 * @param {BrowserWindow} mainWindow 主窗口实例
 * @param {Function} printImageWithCPCL CPCL方式打印图片的函数
 */
async function handlePrintImageWithCPCL(ws, data, requestId, mainWindow, printImageWithCPCL) {
  // 解析图片数据和选项
  let imageData, options = {};
  
  try {
    // 支持不同的数据结构格式
    if (data.data) {
      imageData = data.data;
      options = data.options || {};
      console.log('使用data字段的图片数据进行CPCL打印');
    } else if (data.image) {
      imageData = data.image;
      options = data.options || {};
      console.log('使用image字段的图片数据进行CPCL打印');
    } else {
      throw new Error('缺少图片数据');
    }
    
    const printerName = options.printer;
    console.log(`选择的打印机: ${printerName || '默认打印机'}`);
    console.log(`CPCL打印选项:`, JSON.stringify(options));
    
    // 通知UI收到打印任务
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job', { 
        id: requestId,
        printer: printerName, 
        timestamp: new Date().toISOString(),
        status: 'pending',
        type: 'cpcl-image'
      });
      console.log('已通知UI收到CPCL图片打印任务');
    }
    
    // 使用工具模块验证图片数据
    const validatedImageData = utils.validateImageData(imageData);
    console.log(`处理CPCL图片打印任务: ID=${requestId}, 数据长度=${validatedImageData.length}字节, 打印机=${printerName || '默认'}`);
    
    // 设置CPCL特定选项
    const cpclOptions = {
      ...options,
      // CPCL选项
      width: options.width,
      height: options.height,
      x: options.x || 0,
      y: options.y || 0,
      dithering: options.dithering || false,
      invert: options.invert || false
    };
    
    // 执行CPCL打印
    const result = await printImageWithCPCL(validatedImageData, printerName, cpclOptions);
    console.log(`CPCL图片打印结果:`, result);
    
    // 返回结果
    const printResponse = {
      event: 'printResult',
      type: 'printResult',
      requestId,
      success: true,
      ...result
    };
    ws.send(JSON.stringify(printResponse));
    console.log('已发送CPCL图片打印成功响应');
    
    // 更新UI打印任务状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'completed',
        printer: printerName,
        timestamp: new Date().toISOString(),
        result,
        type: 'cpcl-image'
      });
      console.log('已更新UI CPCL图片打印任务状态为已完成');
    }
  } catch (printError) {
    console.error('CPCL图片打印过程出错:', printError);
    const errorResponse = {
      event: 'printResult',
      type: 'error',
      requestId,
      success: false,
      error: printError.message
    };
    ws.send(JSON.stringify(errorResponse));
    console.log('已发送CPCL图片打印错误响应:', printError.message);
    
    // 更新UI打印任务状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'failed',
        error: printError.message,
        printer: options.printer || '未知打印机',
        timestamp: new Date().toISOString(),
        type: 'cpcl-image'
      });
      console.log('已更新UI CPCL图片打印任务状态为失败');
    }
  }
}

/**
 * 处理Base64WithPngCPCL打印请求
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {Object} data 请求数据
 * @param {string} requestId 请求ID
 * @param {BrowserWindow} mainWindow 主窗口实例
 * @param {Function} printBase64WithPngCPCL 打印Base64WithPngCPCL的函数
 */
async function handlePrintBase64WithPngCPCL(ws, data, requestId, mainWindow, printBase64WithPngCPCL) {
  // 解析Base64WithPngCPCL数据和选项
  let base64WithPngCPCLData, options = {};
  
  try {
    // 支持不同的数据结构格式
    if (data.data) {
      base64WithPngCPCLData = data.data;
      options = data.options || {};
      console.log('使用data字段的Base64WithPngCPCL数据');
    } else if (data.base64WithPngCPCL) {
      base64WithPngCPCLData = data.base64WithPngCPCL;
      options = data.options || {};
      console.log('使用base64WithPngCPCL字段的Base64WithPngCPCL数据');
    } else {
      throw new Error('缺少Base64WithPngCPCL数据');
    }
    
    const printerName = options.printer;
    console.log(`选择的打印机: ${printerName || '默认打印机'}`);
    console.log(`Base64WithPngCPCL打印选项:`, JSON.stringify(options));
    
    // 通知UI收到打印任务
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job', { 
        id: requestId,
        printer: printerName, 
        timestamp: new Date().toISOString(),
        status: 'pending',
        type: 'base64-with-png-cpcl'
      });
      console.log('已通知UI收到Base64WithPngCPCL打印任务');
    }
    
    // 使用工具模块验证Base64WithPngCPCL数据
    const validatedBase64WithPngCPCLData = utils.validateImageData(base64WithPngCPCLData);
    console.log(`处理Base64WithPngCPCL打印任务: ID=${requestId}, 数据长度=${validatedBase64WithPngCPCLData.length}字节, 打印机=${printerName || '默认'}`);
    
    // 打印Base64WithPngCPCL
    const result = await printBase64WithPngCPCL(validatedBase64WithPngCPCLData, printerName, options);
    console.log(`Base64WithPngCPCL打印结果:`, result);
    
    // 返回结果
    const printResponse = {
      event: 'printResult',
      type: 'printResult',
      requestId,
      success: true,
      ...result
    };
    ws.send(JSON.stringify(printResponse));
    console.log('已发送Base64WithPngCPCL打印成功响应');
    
    // 更新UI打印任务状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'completed',
        printer: printerName,
        timestamp: new Date().toISOString(),
        result,
        type: 'base64-with-png-cpcl'
      });
      console.log('已更新UI Base64WithPngCPCL打印任务状态为已完成');
    }
  } catch (printError) {
    console.error('Base64WithPngCPCL打印过程出错:', printError);
    const errorResponse = {
      event: 'printResult',
      type: 'error',
      requestId,
      success: false,
      error: printError.message
    };
    ws.send(JSON.stringify(errorResponse));
    console.log('已发送Base64WithPngCPCL打印错误响应:', printError.message);
    
    // 更新UI打印任务状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', {
        id: requestId,
        status: 'failed',
        error: printError.message,
        printer: options.printer || '未知打印机',
        timestamp: new Date().toISOString(),
        type: 'base64-with-png-cpcl'
      });
      console.log('已更新UI Base64WithPngCPCL打印任务状态为失败');
    }
  }
}

/**
 * 处理ZPL图像打印请求
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {Object} data 请求数据
 * @param {string} requestId 请求ID
 * @param {BrowserWindow} mainWindow 主窗口实例
 * @param {Function} printImageWithZPL ZPL方式打印图片的函数
 */
async function handlePrintImageWithZPL(ws, data, requestId, mainWindow, printImageWithZPL) {
  try {
    // 解析图像数据和选项
    let imageData, options = {};
    
    // 支持不同的数据结构格式
    if (data.data) {
      imageData = data.data;
      options = data.options || {};
      console.log('使用data字段的图像数据');
    } else if (data.image) {
      imageData = data.image;
      options = data.options || {};
      console.log('使用image字段的图像数据');
    } else {
      throw new Error('缺少图像数据');
    }
    
    const printerName = options.printer;
    console.log(`选择的打印机: ${printerName || '默认打印机'}`);
    console.log(`ZPL打印选项:`, JSON.stringify(options));
    
    // 通知UI收到打印任务
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job', { 
        id: requestId,
        printer: printerName, 
        timestamp: new Date().toISOString(),
        status: 'pending',
        type: 'zpl-image'
      });
      console.log('已通知UI收到ZPL打印任务');
    }
    
    // 使用工具模块验证图像数据
    const validatedImageData = utils.validateImageData(imageData);
    console.log(`处理ZPL图片打印任务: ID=${requestId}, 数据长度=${validatedImageData.length}字节, 打印机=${printerName || '默认'}`);
    
    // 保存图像文件副本用于调试(可选)
    try {
      utils.saveDebugFile(Buffer.from(validatedImageData, 'base64'), 'img', `debug-zpl-${requestId}`);
      console.log(`已保存ZPL图像调试副本`);
    } catch (debugError) {
      console.warn('保存调试图像副本失败:', debugError.message);
    }
    
    // 使用ZPL打印图像
    console.log('开始ZPL打印图像...');
    const result = await printImageWithZPL(validatedImageData, printerName, options);
    console.log('ZPL打印图像结果:', result);
    
    // 通知UI打印结果
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', { 
        id: requestId,
        printer: printerName, 
        timestamp: new Date().toISOString(),
        status: result.success ? 'completed' : 'failed',
        result
      });
      console.log('已通知UI更新ZPL打印任务状态');
    }
    
    // 发送响应到客户端
    ws.send(JSON.stringify({
      event: 'printResult',
      type: 'printResult',
      requestId,
      success: result.success,
      message: result.message
    }));
    console.log('已发送ZPL打印结果响应');
    
  } catch (error) {
    console.error('处理ZPL图像打印请求出错:', error);
    
    // 通知UI打印失败
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', { 
        id: requestId,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
      console.log('已通知UI ZPL打印任务失败');
    }
    
    // 发送错误响应到客户端
    ws.send(JSON.stringify({
      event: 'error',
      type: 'printError',
      requestId,
      error: `ZPL打印出错: ${error.message}`
    }));
    console.log('已发送ZPL打印错误响应:', error.message);
  }
}

/**
 * 处理Base64WithZPL打印请求
 * @param {WebSocket} ws WebSocket客户端实例
 * @param {Object} data 请求数据
 * @param {string} requestId 请求ID
 * @param {BrowserWindow} mainWindow 主窗口实例
 * @param {Function} printBase64WithZPL 打印Base64WithZPL的函数
 */
async function handlePrintBase64WithZPL(ws, data, requestId, mainWindow, printBase64WithZPL) {
  try {
    // 解析图像数据和选项
    let imageData, options = {};
    
    // 支持不同的数据结构格式
    if (data.data) {
      imageData = data.data;
      options = data.options || {};
      console.log('使用data字段的图像数据');
    } else if (data.image) {
      imageData = data.image;
      options = data.options || {};
      console.log('使用image字段的图像数据');
    } else {
      throw new Error('缺少图像数据');
    }
    
    const printerName = options.printer;
    console.log(`选择的打印机: ${printerName || '默认打印机'}`);
    console.log(`Base64WithZPL打印选项:`, JSON.stringify(options));
    
    // 通知UI收到打印任务
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job', { 
        id: requestId,
        printer: printerName, 
        timestamp: new Date().toISOString(),
        status: 'pending',
        type: 'base64-zpl'
      });
      console.log('已通知UI收到Base64WithZPL打印任务');
    }
    
    // 使用工具模块验证图像数据
    const validatedImageData = utils.validateImageData(imageData);
    console.log(`处理Base64WithZPL打印任务: ID=${requestId}, 数据长度=${validatedImageData.length}字节, 打印机=${printerName || '默认'}`);
    
    // 保存图像文件副本用于调试(可选)
    try {
      utils.saveDebugFile(Buffer.from(validatedImageData, 'base64'), 'img', `debug-base64-zpl-${requestId}`);
      console.log(`已保存Base64WithZPL图像调试副本`);
    } catch (debugError) {
      console.warn('保存调试图像副本失败:', debugError.message);
    }
    
    // 使用Base64WithZPL打印图像
    console.log('开始Base64WithZPL打印图像...');
    const result = await printBase64WithZPL(validatedImageData, printerName, options);
    console.log('Base64WithZPL打印图像结果:', result);
    
    // 通知UI打印结果
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', { 
        id: requestId,
        printer: printerName, 
        timestamp: new Date().toISOString(),
        status: result.success ? 'completed' : 'failed',
        result
      });
      console.log('已通知UI更新Base64WithZPL打印任务状态');
    }
    
    // 发送响应到客户端
    ws.send(JSON.stringify({
      event: 'printResult',
      type: 'printResult',
      requestId,
      success: result.success,
      message: result.message
    }));
    console.log('已发送Base64WithZPL打印结果响应');
    
  } catch (error) {
    console.error('处理Base64WithZPL打印请求出错:', error);
    
    // 通知UI打印失败
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('print-job-update', { 
        id: requestId,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
      console.log('已通知UI Base64WithZPL打印任务失败');
    }
    
    // 发送错误响应到客户端
    ws.send(JSON.stringify({
      event: 'error',
      type: 'printError',
      requestId,
      error: `Base64WithZPL打印出错: ${error.message}`
    }));
    console.log('已发送Base64WithZPL打印错误响应:', error.message);
  }
}

module.exports = {
  handleMessage,
  handleGetPrinters,
  handlePrintPdf,
  handlePrintImage,
  handleDirectPrintImage,
  handleSavePdf,
  handlePrintImageWithCPCL,
  handlePrintBase64WithPngCPCL,
  handlePrintImageWithZPL,
  handlePrintBase64WithZPL
}; 