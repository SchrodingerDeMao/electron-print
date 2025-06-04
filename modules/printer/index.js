/**
 * 打印模块入口文件
 * 统一导出所有打印相关功能
 */

const pdf = require('./pdf');
const image = require('./image');
const label = require('./label');
const list = require('./list');
const cpclImg = require('./cpcl-img');
const zplImg = require('./zpl-img');

// 导出所有打印功能
module.exports = {
  // 打印机列表相关
  getPrinterList: list.getPrinterList,
  
  // PDF打印相关
  printPdf: pdf.printPdf,
  checkPdfPrintingEnvironment: pdf.checkPdfPrintingEnvironment,
  saveTempPdf: pdf.saveTempPdf,
  
  // 图片打印相关
  printImage: image.printImage,
  directPrintImage: image.directPrintImage,
  directPrintRawImage: image.directPrintRawImage,
  
  // 标签打印相关
  printLabelUsingHtml: label.printLabelUsingHtml,
  
  // CPCL图片打印相关
  printImageWithCPCL: cpclImg.printImageWithCPCL,
  convertImageToCPCL: cpclImg.convertImageToCPCL,
  sendCPCLToPrinter: cpclImg.sendCPCLToPrinter,
  saveCPCLCommandToFile: cpclImg.saveCPCLCommandToFile,
  printBase64WithPngCPCL: cpclImg.printBase64WithPngCPCL,
  
  // ZPL图片打印相关
  printImageWithZPL: zplImg.printImageWithZPL,
  convertImageToZPL: zplImg.convertImageToZPL,
  sendZPLToPrinter: zplImg.sendZPLToPrinter,
  saveZPLCommandToFile: zplImg.saveZPLCommandToFile,
  printRawImageWithZPL: zplImg.printRawImageWithZPL,
  printBase64WithZPL: zplImg.printBase64WithZPL
}; 