# WMS打印服务模块架构文档

## 概述

WMS打印服务是一个基于Electron的桌面应用程序，用于实现浏览器到本地打印机的打印功能。应用采用模块化设计，将不同功能拆分为独立模块，提高代码的可维护性和可扩展性。

本文档详细介绍了各个模块的功能和架构，帮助开发者快速了解系统结构。

## 目录结构

```
modules/
├── app/                # 应用核心功能模块
│   ├── index.js        # 模块入口
│   ├── window.js       # 窗口管理
│   ├── menu.js         # 菜单管理
│   ├── tray.js         # 系统托盘管理
│   └── ipc.js          # 进程间通信管理
├── logger/             # 日志模块
│   ├── index.js        # 模块入口
│   └── console.js      # 控制台重写实现
├── printer/            # 打印功能模块
│   ├── index.js        # 模块入口
│   ├── list.js         # 打印机列表管理
│   ├── pdf.js          # PDF打印功能
│   ├── image.js        # 图片打印功能
│   └── label.js        # 标签打印功能
├── server/             # WebSocket服务器模块
│   ├── index.js        # 服务器管理
│   ├── client.js       # 客户端连接管理
│   └── handler.js      # 请求处理器
└── utils/              # 工具模块
    ├── index.js        # 模块入口
    ├── config.js       # 全局配置信息
    ├── fs.js           # 文件系统操作
    ├── temp.js         # 临时文件管理
    └── validation.js   # 数据验证功能
```

## 模块详解

### 1. App模块 (modules/app)

负责应用程序的核心功能，包括窗口管理、菜单管理、系统托盘和IPC通信。

#### 1.1 window.js - 窗口管理

```javascript
// 主要API
createWindow()         // 创建主窗口
createPrinterWindow()  // 创建隐藏的打印窗口
showMainWindow()       // 显示主窗口
getMainWindow()        // 获取主窗口实例
getPrinterWindow()     // 获取打印窗口实例
```

主要负责创建和管理Electron窗口，包括主程序窗口和隐藏的打印窗口。设置窗口属性、加载页面、监听窗口事件等。

#### 1.2 menu.js - 菜单管理

```javascript
// 主要API
createChineseMenu()    // 创建中文应用菜单
createTrayMenu()       // 创建托盘菜单
```

负责创建和管理应用程序菜单和上下文菜单，定义菜单项和对应的操作。

#### 1.3 tray.js - 系统托盘管理

```javascript
// 主要API
createTray(options)    // 创建系统托盘图标
updateTrayStatus()     // 更新托盘图标状态
minimizeToTray()       // 最小化应用到托盘
destroyTray()          // 销毁托盘图标
```

负责创建和管理系统托盘图标，设置图标状态、菜单和事件处理。

#### 1.4 ipc.js - 进程间通信管理

```javascript
// 主要API
setupIPC(options)      // 设置IPC通信处理程序
removeAllIPCHandlers() // 移除所有IPC处理程序
```

管理主进程和渲染进程之间的通信，注册IPC事件处理程序，处理渲染进程的请求。

### 2. Logger模块 (modules/logger)

负责日志系统的实现，包括控制台重写、日志记录和传输等功能。

#### 2.1 index.js - 日志模块入口

```javascript
// 主要API
initLogger(options)     // 初始化日志系统
sendLogToRenderer(log) // 将日志发送到渲染进程
sendPendingLogs()      // 发送缓存的日志
clearLogs()            // 清空日志
getPendingLogs()       // 获取待处理的日志
```

提供日志系统的主要功能，初始化日志系统，管理日志队列，将日志转发到渲染进程。

#### 2.2 console.js - 控制台重写

实现对Node.js原生console对象的包装，拦截所有控制台输出，转发到日志系统并显示在UI界面上。

### 3. Printer模块 (modules/printer)

负责所有打印相关功能，包括获取打印机列表、打印PDF、打印图片和标签打印等。

#### 3.1 list.js - 打印机列表管理

```javascript
// 主要API
getPrinterList()       // 获取系统打印机列表
```

获取系统可用打印机列表，包括打印机名称、状态和默认打印机标记。

#### 3.2 pdf.js - PDF打印功能

```javascript
// 主要API
printPdf(pdfPath, printerName, options) // 打印PDF文件
checkPdfPrintingEnvironment()           // 检查PDF打印环境
saveTempPdf(pdfBuffer)                  // 保存临时PDF文件
```

处理PDF文档的打印，支持选择打印机、设置打印选项（份数、颜色、纸张大小等）。

#### 3.3 image.js - 图片打印功能

```javascript
// 主要API
printImage(base64Data, printerName, options)       // 打印图片
directPrintImage(base64Data, printerName, options) // 直接打印图片（针对标签打印机优化）
directPrintRawImage(imgPath, printerName, options) // 使用底层API打印图片
```

处理图片的打印，支持多种打印方式和打印选项，优化针对标签打印机的打印流程。

#### 3.4 label.js - 标签打印功能

```javascript
// 主要API
printLabelUsingHtml(imageData, printerName, options) // 使用HTML模板打印标签
```

专门针对标签打印机优化的打印功能，使用HTML模板解决标签打印常见问题（如重复打印、页面溢出等）。

### 4. Server模块 (modules/server)

负责WebSocket服务器的实现，处理与浏览器的通信，接收和处理打印请求。

#### 4.1 index.js - 服务器管理

```javascript
// 主要API
startWebSocketServer(options) // 启动WebSocket服务器
stopWebSocketServer()         // 停止WebSocket服务器
getServerStatus()             // 获取服务器状态
getServerAddress()            // 获取服务器地址信息
getClientCount()              // 获取客户端连接数量
```

管理WebSocket服务器的创建、启动和停止，处理服务器事件和错误，支持端口自动切换功能。

#### 4.2 client.js - 客户端连接管理

```javascript
// 主要API
handleNewClient(ws, req, options)       // 处理新客户端连接
handleClientDisconnect(ws, options)     // 处理客户端断开连接
removeClient(ws)                        // 移除客户端
clearClients()                          // 清空客户端集合
getClients()                            // 获取所有客户端
getClientCount()                        // 获取客户端数量
```

管理WebSocket客户端连接，处理连接和断开事件，维护客户端集合，提供IP地址提取和格式化功能。

#### 4.3 handler.js - 请求处理器

```javascript
// 主要API
handleMessage(ws, message, options)                         // 处理WebSocket消息
handleGetPrinters(ws, requestId, getPrinterList)            // 处理获取打印机列表请求
handlePrintPdf(ws, data, requestId, mainWindow, printPdf)   // 处理打印PDF请求
handlePrintImage(ws, data, requestId, mainWindow, printImage) // 处理打印图片请求
handleDirectPrintImage(ws, data, requestId, mainWindow, directPrintImage) // 处理直接打印图片请求
handleSavePdf(ws, data, requestId, mainWindow)             // 处理保存PDF请求
```

处理从WebSocket客户端接收到的各类请求，分派到不同的处理函数，并返回处理结果。

### 5. Utils模块 (modules/utils)

提供各种通用工具函数，支持其他模块的功能实现。

#### 5.1 config.js - 全局配置信息

```javascript
// 主要配置项
port                  // WebSocket服务器端口
debugMode             // 是否启用调试模式
tempDir               // 临时文件目录
debugDir              // 调试文件目录
maxTempFileAge        // 临时文件最大保留时间
maxDebugFileAge       // 调试文件最大保留时间
```

提供应用程序的全局配置信息，统一管理配置项，支持从环境变量和配置文件加载。

#### 5.2 fs.js - 文件系统操作

```javascript
// 主要API
ensureDirectoryExists(dirPath)         // 确保目录存在
saveBase64ToFile(base64Data, filePath) // 保存Base64数据到文件
saveBufferToFile(buffer, filePath)     // 保存Buffer数据到文件
readFileAsBase64(filePath)             // 以Base64格式读取文件
```

封装文件系统操作，提供目录创建、文件读写、Base64编码解码等功能。

#### 5.3 temp.js - 临时文件管理

```javascript
// 主要API
saveTempFile(data, extension)        // 保存临时文件
saveTempPdf(pdfData)                 // 保存临时PDF文件
saveDebugFile(data, type, prefix)    // 保存调试文件
cleanupTempFile(filePath)            // 清理单个临时文件
cleanupTempDir(maxAge)               // 清理临时目录
cleanupDebugFiles(maxAge)            // 清理调试文件
cleanupAllTempFiles()                // 清理所有临时文件
```

管理应用程序产生的临时文件，提供文件创建、保存和清理功能，防止临时文件占用过多磁盘空间。

#### 5.4 validation.js - 数据验证功能

```javascript
// 主要API
validateBase64(data, dataType)       // 验证Base64数据
validatePdfData(pdfData)             // 验证PDF数据
validateImageData(imageData)         // 验证图片数据
```

提供数据验证功能，确保接收到的数据符合要求，包括Base64编码验证、PDF魔数检查、图片格式验证等。

## 跨模块交互

### 主要交互流程

1. **打印流程**
   - main.js → server/handler.js → printer/[pdf|image].js → utils/temp.js → utils/validation.js

2. **日志流程**
   - 任意模块 → logger/console.js → logger/index.js → app/window.js (渲染进程)

3. **IPC通信流程**
   - 渲染进程 → app/ipc.js → 相应模块处理函数 → 渲染进程

4. **服务器启动流程**
   - main.js → server/index.js → server/client.js → server/handler.js

### 模块间依赖关系

```
app ───────┐
           │
logger ←───┤
           │
printer ←──┼─── main.js
           │
server ←───┤
           │
utils ←────┘
```

- main.js依赖所有模块
- server模块依赖utils模块
- printer模块依赖utils模块
- 所有模块可能使用logger模块

## 最佳实践

### 模块设计原则

1. **单一职责原则**：每个模块只负责单一的功能领域
2. **封装内部实现**：只暴露必要的API，隐藏实现细节
3. **最小化依赖**：减少模块间相互依赖，使用依赖注入模式
4. **统一错误处理**：使用一致的错误处理机制
5. **参数验证**：所有公开API都应验证输入参数

### 代码风格指南

1. **命名规范**：
   - 模块使用小写字母命名
   - 函数使用驼峰命名法
   - 常量使用大写字母和下划线

2. **注释规范**：
   - 所有模块、函数和复杂逻辑都应有注释
   - 使用JSDoc格式的函数注释
   - 关键算法和复杂逻辑需要详细说明

3. **错误处理**：
   - 使用try-catch包装异步操作
   - 提供有意义的错误消息
   - 记录错误到日志系统

## 扩展指南

### 添加新模块

1. 创建新的模块目录 `modules/new-module/`
2. 创建模块入口文件 `index.js`
3. 实现模块功能
4. 在 `index.js` 中导出公共API
5. 在需要使用的地方引入模块

### 扩展现有模块

1. 在不破坏现有API的前提下添加新功能
2. 保持向后兼容性
3. 更新模块文档
4. 添加新的测试用例

## 总结

WMS打印服务采用模块化架构，将不同功能分离为独立模块，提高了代码的可维护性和可扩展性。每个模块负责特定的功能领域，并提供清晰的API接口供其他模块调用。这种架构便于团队协作开发和后续功能扩展。

## 最近更新记录

### 2025年6月 - 打印机检测与获取优化

#### 🔧 主要修复内容

**1. 解决"检测不到系统打印机驱动"问题**

- **问题描述**：用户界面显示打印机列表正常，但打印时提示"未检测到系统打印机驱动"
- **根本原因**：`checkPdfPrintingEnvironment` 函数过于严格，阻止了正常的打印流程
- **解决方案**：
  - 修改PDF环境检测逻辑，不再阻止打印流程
  - 将错误信息改为警告，允许用户继续打印
  - 添加友好的提示信息："如果浏览器能正常打印，请忽略此警告"

**2. 实现多层次打印机获取策略**

在 `modules/printer/list.js` 中实现了智能的多层次获取策略：

```javascript
// 1. Electron API (首选)
mainWindow.webContents.getPrintersAsync()

// 2. pdf-to-printer 模块 (备选)
printer.getPrinters()

// 3. Windows 命令行 (wmic)
wmic printer get name,status /format:csv

// 4. PowerShell 备用方案
Get-Printer | Select-Object Name,PrinterStatus | ConvertTo-Json
```

**3. 增强打印机名称验证算法**

在 `modules/utils/validation.js` 中实现了智能匹配：

```javascript
// 多级匹配策略
1. 完全匹配（不区分大小写）
2. 部分匹配（包含关系）
3. 反向匹配（输入包含打印机名称）
4. 模糊匹配（去除空格和特殊字符）
```

**4. 统一数据格式标准化**

所有打印机获取方法返回统一格式：

```javascript
{
  name: string,           // 打印机名称
  description: string,    // 描述信息
  isDefault: boolean,     // 是否为默认打印机
  status: string         // 状态（idle/offline）
}
```

#### 🛠️ 新增调试工具

**1. 测试功能按钮**

在用户界面的打印机列表卡片中添加了"测试获取方法"按钮：
- 测试所有可用的打印机获取方法
- 显示详细的成功/失败状态
- 提供调试信息帮助问题定位

**2. 测试API接口**

新增IPC接口 `test-printer-methods`：
- 在主进程中调用 `testPrinterListMethods` 函数
- 返回详细的测试结果
- 支持前端实时调试

**3. 详细日志输出**

增强了所有打印机相关操作的日志记录：
- 每个获取步骤的详细状态
- 匹配算法的执行过程
- 错误原因和解决建议

#### 📋 文件变更清单

| 文件路径 | 变更类型 | 主要内容 |
|---------|---------|----------|
| `modules/printer/list.js` | 重大更新 | 多层次获取策略、Windows命令行支持 |
| `modules/printer/pdf.js` | 优化 | 环境检测逻辑改进、统一接口调用 |
| `modules/utils/validation.js` | 增强 | 智能匹配算法、详细日志输出 |
| `modules/app/ipc.js` | 新增 | 测试打印机方法的IPC处理 |
| `preload.js` | 新增 | 测试API暴露到渲染进程 |
| `renderer.js` | 新增 | 测试按钮事件处理和UI反馈 |
| `index.html` | 新增 | 测试按钮UI元素 |

#### 🎯 性能改进

**1. 错误处理优化**
- 不再因单一方法失败而阻止整个流程
- 提供多个备用方案确保功能可用性
- 友好的错误提示和解决建议

**2. 兼容性提升**
- 支持不同版本的Electron API
- Windows系统命令行兼容性
- 打印机驱动差异处理

**3. 用户体验改进**
- 实时调试工具
- 详细的状态反馈
- 智能的错误恢复机制

#### 🔍 调试使用指南

**使用测试功能：**
1. 启动WMS打印服务应用
2. 在"打印机列表"卡片中点击"测试获取方法"按钮
3. 查看弹窗显示的测试结果摘要
4. 按F12打开开发者控制台查看详细日志
5. 根据测试结果判断哪种方法有效

**测试结果分析：**
- ✅ 表示该方法成功获取到打印机
- ❌ 表示该方法失败，查看错误原因
- 至少一种方法成功即可正常使用打印功能

#### 🚀 升级说明

此次更新完全向后兼容，现有的打印功能不受影响。新的获取策略作为增强功能，提高了系统的稳定性和兼容性。

建议用户在升级后：
1. 使用测试功能验证打印机获取状态
2. 如遇问题，查看详细的调试日志
3. 报告测试结果以便进一步优化

---
*文档最近更新: 2025年1月* 