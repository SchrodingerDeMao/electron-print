/**
 * 数据验证工具模块
 * 封装各种数据验证和格式化功能
 */

/**
 * 验证Base64格式数据
 * @param {string} data - 要验证的数据
 * @param {string} dataType - 数据类型描述，用于错误信息
 * @returns {string} 处理后的Base64数据
 * @throws {Error} 如果数据不是有效的Base64格式
 */
function validateBase64(data, dataType = 'data') {
  // 检查数据类型
  if (!data || typeof data !== 'string') {
    throw new Error(`${dataType}数据格式无效: ${typeof data}`);
  }
  
  // 验证是否为有效的Base64格式
  const isBase64Valid = /^[A-Za-z0-9+/=]+$/.test(data.replace(/\s/g, ''));
  
  // 处理Data URL格式
  if (!isBase64Valid && data.startsWith('data:')) {
    const base64Match = data.match(/^data:[^;]+;base64,([A-Za-z0-9+/=]+)$/);
    if (base64Match) {
      return base64Match[1];
    }
  }
  
  if (!isBase64Valid) {
    throw new Error(`${dataType}数据不是有效的Base64格式`);
  }
  
  return data;
}

/**
 * 验证PDF数据
 * @param {string} pdfData - PDF的Base64数据
 * @returns {Object} 包含清洗后的数据和Buffer对象
 * @throws {Error} 如果数据不是有效的PDF
 */
function validatePdfData(pdfData) {
  // 验证Base64
  let cleanData = pdfData;
  
  // 去除可能的Data URL前缀
  if (pdfData.startsWith('data:application/pdf;base64,')) {
    cleanData = pdfData.replace('data:application/pdf;base64,', '');
  }
  
  // 验证Base64格式
  cleanData = validateBase64(cleanData, 'PDF');
  
  // 将Base64转换为Buffer
  const buffer = Buffer.from(cleanData, 'base64');
  
  // 检查数据大小
  if (buffer.length === 0) {
    throw new Error('PDF数据长度为0');
  }
  
  // 验证PDF魔数
  const pdfMagicNumber = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-
  if (buffer.length >= 5 && !buffer.slice(0, 5).equals(pdfMagicNumber)) {
    console.warn('警告: PDF数据没有正确的PDF头部');
    console.log('实际魔数:', buffer.slice(0, 10).toString('hex'));
    console.log('期望魔数:', pdfMagicNumber.toString('hex'));
  } else if (buffer.length >= 5) {
    console.log('PDF魔数验证通过');
  }
  
  return { cleanData, buffer };
}

/**
 * 验证图片数据
 * @param {string} imageData - 图片的Base64数据或Data URL
 * @returns {string} 处理后的图片数据
 * @throws {Error} 如果数据不是有效的图片格式
 */
function validateImageData(imageData) {
  // 如果是Data URL格式，直接返回
  if (imageData.startsWith('data:image')) {
    return imageData;
  }
  
  // 否则验证为Base64格式
  return validateBase64(imageData, '图片');
}

/**
 * 验证打印机名称
 * @param {string} printerName - 打印机名称
 * @param {Array} availablePrinters - 可用打印机列表
 * @returns {string|null} 验证后的打印机名称，未找到返回null
 */
function validatePrinterName(printerName, availablePrinters) {
  console.log(`开始验证打印机名称: "${printerName}"`);
  console.log(`可用打印机列表:`, availablePrinters);
  
  if (!printerName) {
    console.log('打印机名称为空，返回null');
    return null;
  }
  
  if (!availablePrinters || !Array.isArray(availablePrinters)) {
    console.warn('可用打印机列表为空或不是数组，返回null');
    return null;
  }
  
  if (availablePrinters.length === 0) {
    console.warn('可用打印机列表为空，返回null');
    return null;
  }
  
  console.log(`在 ${availablePrinters.length} 台打印机中查找: "${printerName}"`);
  
  // 创建打印机名称数组，处理不同的数据格式
  const printerNames = availablePrinters.map((printer, index) => {
    let name;
    if (typeof printer === 'string') {
      name = printer;
    } else if (typeof printer === 'object' && printer !== null) {
      name = printer.name || printer.displayName || printer.deviceName || `打印机_${index}`;
    } else {
      name = `打印机_${index}`;
    }
    console.log(`  ${index + 1}. "${name}"`);
    return name;
  });
  
  // 1. 查找完全匹配的打印机（不区分大小写）
  console.log('步骤1: 查找完全匹配（不区分大小写）...');
  const exactMatchIndex = printerNames.findIndex(name => 
    name && name.toLowerCase() === printerName.toLowerCase()
  );
  
  if (exactMatchIndex !== -1) {
    const matchedName = printerNames[exactMatchIndex];
    console.log(`✅ 找到完全匹配的打印机: "${matchedName}"`);
    return matchedName;
  }
  
  // 2. 查找部分匹配的打印机（包含关系，不区分大小写）
  console.log('步骤2: 查找部分匹配（包含关系）...');
  const partialMatchIndex = printerNames.findIndex(name => 
    name && name.toLowerCase().includes(printerName.toLowerCase())
  );
  
  if (partialMatchIndex !== -1) {
    const matchedName = printerNames[partialMatchIndex];
    console.log(`✅ 找到部分匹配的打印机: "${matchedName}"`);
    return matchedName;
  }
  
  // 3. 反向查找：打印机名称是否包含在输入中
  console.log('步骤3: 反向查找（输入包含打印机名称）...');
  const reverseMatchIndex = printerNames.findIndex(name => 
    name && printerName.toLowerCase().includes(name.toLowerCase())
  );
  
  if (reverseMatchIndex !== -1) {
    const matchedName = printerNames[reverseMatchIndex];
    console.log(`✅ 找到反向匹配的打印机: "${matchedName}"`);
    return matchedName;
  }
  
  // 4. 模糊匹配：去除空格和特殊字符后比较
  console.log('步骤4: 模糊匹配（去除空格和特殊字符）...');
  const normalizedInput = printerName.toLowerCase().replace(/[\s\-_\.]/g, '');
  const fuzzyMatchIndex = printerNames.findIndex(name => {
    if (!name) return false;
    const normalizedName = name.toLowerCase().replace(/[\s\-_\.]/g, '');
    return normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName);
  });
  
  if (fuzzyMatchIndex !== -1) {
    const matchedName = printerNames[fuzzyMatchIndex];
    console.log(`✅ 找到模糊匹配的打印机: "${matchedName}"`);
    return matchedName;
  }
  
  console.log(`❌ 未找到匹配的打印机: "${printerName}"`);
  console.log('可尝试的打印机名称:');
  printerNames.forEach((name, index) => {
    console.log(`  - "${name}"`);
  });
  
  return null;
}

/**
 * 检查是否为标签打印机
 * @param {string} printerName - 打印机名称
 * @param {Object} options - 打印选项
 * @returns {boolean} 是否是标签打印机
 */
function isLabelPrinter(printerName, options = {}) {
  // 如果选项中明确指定了是标签打印机
  if (options.isLabelPrinter === true) {
    return true;
  }
  
  // 根据打印机名称判断
  if (printerName) {
    const lowerName = printerName.toLowerCase();
    return lowerName.includes('label') || 
           lowerName.includes('标签') ||
           lowerName.includes('hprt') ||
           lowerName.includes('tsc') ||
           lowerName.includes('zebra') ||
           lowerName.includes('dymo');
  }
  
  return false;
}

/**
 * 格式化客户端IP地址
 * @param {string} ip - IP地址
 * @returns {string} 格式化后的IP地址
 */
function formatClientIP(ip) {
  if (!ip) return '未知';
  
  // 格式化IPv6格式的本地地址
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1 (本地)';
  } else if (ip && ip.startsWith('::ffff:')) {
    // 移除IPv6映射前缀
    return ip.substring(7);
  }
  
  return ip;
}

module.exports = {
  validateBase64,
  validatePdfData,
  validateImageData,
  validatePrinterName,
  isLabelPrinter,
  formatClientIP,
}; 