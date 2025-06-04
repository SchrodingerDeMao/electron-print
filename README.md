# WMS打印服务

这是一个为WMS系统打造的打印服务，基于Electron和WebSocket技术，用于实现浏览器到本地打印机的直接打印功能。

## 功能特点

- 支持获取本地打印机列表
- 支持PDF和图片打印
- 支持静默打印（无需用户确认）
- 支持自定义打印选项（份数、纸张方向、尺寸等）
- 支持PDF文件保存
- 支持WebSocket通信，可以被任何支持WebSocket的客户端调用
- 提供完整的状态监控界面
- 服务端口显示与一键复制功能
- 智能客户端连接管理（防重复、显示连接时长）
- PDF和图片数据验证和错误处理功能
- 完整的日志系统，支持主进程和渲染进程之间的日志传输
- 系统托盘集成，支持最小化到托盘

## 安装

### 安装包

您可以从release页面下载最新的安装包：

- Windows: `WMS打印服务-Setup-x.x.x.exe`
- macOS: `WMS打印服务-x.x.x.dmg`
- Linux: `WMS打印服务-x.x.x.AppImage`

### 从源码构建

```bash
# 克隆仓库
git clone https://gitee.com/a_gentleman_in_the_summer/electron-print.git

# 进入目录
cd wms-print-service

# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建安装包
npm run build
```

## 使用说明

### 桌面应用

1. 运行WMS打印服务应用
2. 应用将在后台启动WebSocket服务器，默认端口8765
3. 您可以通过托盘图标菜单或主界面操作打印服务
4. 应用界面显示服务器状态、连接的客户端、打印机列表和系统日志
5. 服务器状态卡片中可查看当前服务端口，并可一键复制端口号
6. 客户端连接区域实时显示已连接设备的IP地址和连接时长
7. 系统智能管理客户端连接，防止重复IP显示，确保连接数统计准确

### 用户界面功能

应用界面分为以下几个主要区域：

1. **标题栏** - 显示应用名称和版本号，并提供"最小化到托盘"和"退出应用"按钮
2. **服务器状态卡片** - 显示WebSocket服务器运行状态和端口号
   - 状态指示器：显示服务器是否在线
   - 端口号：显示当前服务端口，可一键复制
   - 重启按钮：重新启动WebSocket服务器
   - 已连接客户端列表：显示当前连接的客户端IP和连接时长
3. **打印机列表卡片** - 显示系统可用打印机
   - 打印机名称和状态
   - 已连接设备数量统计
   - 刷新按钮：重新获取打印机列表
4. **打印任务记录卡片** - 显示所有处理过的打印任务
   - 打印机名称
   - 任务状态（完成/失败/等待中）
   - 任务提交时间
   - 清空按钮：清除历史任务记录

### 应用快捷操作

- **复制端口号** - 点击端口号旁的复制按钮可将服务端口号复制到剪贴板
- **最小化到托盘** - 点击"最小化到托盘"按钮或关闭窗口会将应用最小化到系统托盘
- **重启服务器** - 点击"重启服务器"按钮可重新启动WebSocket服务
- **刷新打印机** - 点击"刷新打印机"按钮可重新获取系统打印机列表
- **清空任务记录** - 点击"清空记录"按钮可清除打印任务历史记录

### 前端集成

在您的Web应用中，可以使用WebSocket与打印服务进行通信：

```javascript
// 创建WebSocket连接
const ws = new WebSocket('ws://localhost:8765');

// 连接成功事件
ws.onopen = function() {
  console.log('已连接到打印服务');
};

// 接收消息
ws.onmessage = function(event) {
  const response = JSON.parse(event.data);
  console.log('收到响应:', response);
};

// 获取打印机列表
function getPrinters() {
  ws.send(JSON.stringify({
    action: 'getPrinters',
    requestId: 'req-' + Date.now()
  }));
}

// 打印PDF
function printPdf(pdfData, options = {}) {
  ws.send(JSON.stringify({
    action: 'printPdf',
    requestId: 'req-' + Date.now(),
    data: pdfData, // Base64编码的PDF数据
    options: {
      printer: 'HP LaserJet Pro', // 打印机名称
      silent: true, // 静默打印
      copies: 1, // 打印份数
      landscape: false, // 纵向/横向
      width: 210, // 纸张宽度(mm)
      height: 297 // 纸张高度(mm)
    }
  }));
}

// 打印图片
function printImage(imageData, options = {}) {
  ws.send(JSON.stringify({
    action: 'printImage',
    requestId: 'req-' + Date.now(),
    data: imageData, // Base64编码的图片数据
    options: {
      printer: 'HP LaserJet Pro', // 打印机名称
      silent: true, // 静默打印
      copies: 1, // 打印份数
      width: 100, // 图片宽度(mm)
      height: 150 // 图片高度(mm)
    }
  }));
}

// 保存PDF
function savePdf(pdfData, options = {}) {
  ws.send(JSON.stringify({
    action: 'savePdf',
    requestId: 'req-' + Date.now(),
    data: pdfData, // Base64编码的PDF数据
    options: {
      defaultPath: '文档.pdf' // 默认保存文件名
    }
  }));
}
```

## 进程间通信（IPC）接口

WMS打印服务使用Electron的IPC机制在主进程和渲染进程之间进行通信。以下是通过`preload.js`提供的核心API接口：

### 应用信息接口

| API名称 | 说明 |
|-------|------|
| `getAppVersion` | 获取应用版本号 |
| `minimizeToTray` | 将应用最小化到系统托盘 |
| `quitApp` | 退出应用程序 |

### 服务器管理接口

| API名称 | 说明 |
|-------|------|
| `getServerStatus` | 获取WebSocket服务器运行状态 |
| `restartServer` | 重启WebSocket服务器 |
| `getServerPort` | 获取当前WebSocket服务器端口号 |

### 打印机相关接口

| API名称 | 说明 |
|-------|------|
| `getPrinters` | 获取系统可用打印机列表 |

### 日志接口

| API名称 | 说明 |
|-------|------|
| `sendLog` | 发送日志到主进程 |
| `clearLogs` | 清空日志记录 |

### 事件订阅接口

| API名称 | 说明 |
|-------|------|
| `onClientConnect` | 监听客户端连接事件 |
| `onClientDisconnect` | 监听客户端断开连接事件 |
| `onPrintJob` | 监听新打印任务事件 |
| `onPrintJobUpdate` | 监听打印任务状态更新事件 |
| `onPrintError` | 监听打印错误事件 |
| `onServerStatus` | 监听服务器状态变更事件 |
| `onLogMessage` | 监听日志消息事件 |

### 示例：使用渲染进程API

```javascript
// 获取应用版本
const version = await window.electronAPI.getAppVersion();
console.log(`当前应用版本: ${version}`);

// 监听客户端连接事件
const unsubscribe = window.electronAPI.onClientConnect((client) => {
  console.log(`新客户端连接: ${client.ip}`);
  // 更新UI显示
});

// 监听打印任务状态变更
window.electronAPI.onPrintJobUpdate((job) => {
  console.log(`打印任务 ${job.id} 状态更新为: ${job.status}`);
  // 更新UI显示
});

// 重启服务器
async function restartServer() {
  try {
    await window.electronAPI.restartServer();
    console.log('服务器已重启');
  } catch (error) {
    console.error('重启服务器失败:', error);
  }
}
```

## WebSocket API

打印服务通过WebSocket提供以下API：

### 获取打印机列表

请求:
```json
{
  "action": "getPrinters",
  "requestId": "1234567890"
}
```

响应:
```json
{
  "event": "printerList",
  "type": "printers",
  "requestId": "1234567890",
  "printers": [
    {
      "name": "HP LaserJet Pro",
      "status": "online",
      "isDefault": true
    }
  ]
}
```

### 打印PDF

请求:
```json
{
  "action": "printPdf",
  "requestId": "1234567890",
  "data": "BASE64_ENCODED_PDF_DATA",
  "options": {
    "printer": "HP LaserJet Pro",
    "silent": true,
    "copies": 2,
    "landscape": false,
    "width": 210,
    "height": 297
  }
}
```

响应:
```json
{
  "event": "printResult",
  "type": "printResult",
  "requestId": "1234567890",
  "success": true,
  "message": "已使用 HP LaserJet Pro 打印机打印PDF"
}
```

### 打印图片

请求:
```json
{
  "action": "printImage",
  "requestId": "1234567890",
  "data": "BASE64_ENCODED_IMAGE_DATA",
  "options": {
    "printer": "HP LaserJet Pro",
    "silent": true,
    "copies": 1,
    "landscape": false,
    "width": 100,
    "height": 150
  }
}
```

响应:
```json
{
  "event": "printResult",
  "type": "printResult",
  "requestId": "1234567890",
  "success": true,
  "message": "已使用 HP LaserJet Pro 打印机打印图片"
}
```

### 使用CPCL命令打印图片

请求:
```json
{
  "action": "printCPCL",
  "requestId": "1234567890",
  "data": "BASE64_ENCODED_IMAGE_DATA",
  "options": {
    "printer": "CPCL兼容的打印机",
    "width": 200,
    "height": 200,
    "x": 0,
    "y": 0,
    "dithering": false,
    "invert": false
  }
}
```

响应:
```json
{
  "event": "printResult",
  "type": "printResult",
  "requestId": "1234567890",
  "success": true,
  "message": "CPCL打印命令已发送"
}
```

### 使用ZPL命令打印图片

请求:
```json
{
  "action": "printZPL",
  "requestId": "1234567890",
  "data": "BASE64_ENCODED_IMAGE_DATA",
  "options": {
    "printer": "ZPL兼容的打印机",
    "blackWhiteThreshold": 128,
    "x": 0,
    "y": 0,
    "compress": true,
    "invert": false
  }
}
```

响应:
```json
{
  "event": "printResult",
  "type": "printResult",
  "requestId": "1234567890",
  "success": true,
  "message": "ZPL打印命令已发送"
}
```

### 保存PDF

请求:
```json
{
  "action": "savePdf",
  "requestId": "1234567890",
  "data": "BASE64_ENCODED_PDF_DATA",
  "options": {
    "defaultPath": "document.pdf"
  }
}
```

响应:
```json
{
  "event": "saveResult",
  "requestId": "1234567890",
  "success": true,
  "filePath": "/Users/username/Downloads/document.pdf"
}
```

## 数据验证功能

打印服务内置了全面的数据验证机制，确保接收到的数据可以正确处理：

- Base64格式验证：确保传入的数据是有效的Base64编码
- PDF魔数（Magic Number）检查：验证PDF文件是以`%PDF-`开头的有效PDF文件
- 数据大小检查：确保数据不为空且大小合理
- 数据格式支持：同时支持原始Base64和`data:application/pdf;base64,`或`data:image/*;base64,`前缀格式
- 调试模式：在调试模式下，会将接收到的数据保存到临时目录用于问题排查

## 用户界面设计

应用使用简洁现代的卡片式布局设计，主要包含以下UI元素：

### 颜色主题

使用蓝色主题，搭配以下主要色彩：
- 主色: `#1890ff` (蓝色)
- 成功色: `#52c41a` (绿色)
- 警告色: `#faad14` (琥珀色)
- 错误色: `#f5222d` (红色)
- 背景色: `#f0f2f5` (淡灰色)

### 状态指示器

- 在线/成功状态：绿色背景带绿色文字
- 离线/错误状态：红色背景带红色文字
- 检测中状态：黄色背景带黄色文字

### 交互元素

- 按钮：主操作蓝色按钮，次要操作灰色按钮，危险操作红色按钮
- 复制功能：点击后有绿色动画反馈
- 列表：带轻微阴影的白色卡片，内部项目使用分隔线区分

## 打印选项详解

### PDF打印选项

| 选项名 | 类型 | 说明 |
|-------|------|------|
| printer | string | 打印机名称，不指定则使用系统默认打印机 |
| silent | boolean | 是否静默打印，默认为true |
| copies | number | 打印份数，默认为1 |
| landscape | boolean | 是否横向打印，默认为false |
| width | number | 纸张宽度(毫米)，不指定则使用默认纸张 |
| height | number | 纸张高度(毫米)，不指定则使用默认纸张 |

### 图片打印选项

| 选项名 | 类型 | 说明 |
|-------|------|------|
| printer | string | 打印机名称，不指定则使用系统默认打印机 |
| silent | boolean | 是否静默打印，默认为true |
| copies | number | 打印份数，默认为1 |
| landscape | boolean | 是否横向打印，基于尺寸自动判断 |
| width | number | 图片宽度(毫米)，不指定则自适应 |
| height | number | 图片高度(毫米)，不指定则自适应 |

### ZPL打印选项

| 选项名 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| printer | string | null | 打印机名称，不指定则使用系统默认打印机 |
| blackWhiteThreshold | number | 128 | 黑白转换阈值(0-255)，值越低黑色区域越多 |
| x | number | 0 | 图像在标签上的起始X坐标 |
| y | number | 0 | 图像在标签上的起始Y坐标 |
| compress | boolean | true | 是否使用压缩模式 |
| invert | boolean | false | 是否反转黑白颜色 |

## 日志系统

服务内置了完整的日志系统，用于记录各类事件和错误：

- 界面日志显示：应用主界面实时显示系统运行日志
- 日志级别：支持以下级别的日志，每个级别使用不同颜色显示
  - `log`: 普通日志 (蓝色)
  - `info`: 信息日志 (绿色)
  - `warn`: 警告日志 (琥珀色)
  - `error`: 错误日志 (红色)
- 跨进程日志传输：主进程(main)和渲染进程(renderer)之间的日志同步显示
- 日志队列管理：当主窗口未就绪时日志会进入队列，待窗口就绪后显示

### 日志处理流程

1. 主进程中产生日志（通过console方法）
2. 日志被拦截并格式化为JSON对象
3. 如果主窗口已就绪，通过IPC发送到渲染进程
4. 如果主窗口未就绪，日志存入队列，等待窗口就绪后发送
5. 渲染进程接收到日志后，在UI中显示并根据级别应用不同样式

## 错误处理

服务内置了完善的错误处理机制：

- PDF打印失败时会尝试使用默认打印机进行打印
- 打印机未找到时提供友好错误提示
- 数据格式错误时提供详细的错误信息
- 通过UI界面显示所有打印任务的状态和错误信息

## 事件通知系统

应用通过IPC实现实时事件通知，提供以下事件：

| 事件名 | 触发时机 | 传递数据 |
|-------|------|------|
| `client-connect` | 新客户端连接 | 客户端IP和连接时间 |
| `client-disconnect` | 客户端断开连接 | 客户端IP和断开时间 |
| `print-job` | 收到新打印任务 | 任务ID、打印机、时间戳、状态 |
| `print-job-update` | 打印任务状态更新 | 任务ID、新状态、时间戳、结果 |
| `print-error` | 打印过程发生错误 | 错误信息、相关任务ID |
| `server-status` | 服务器状态变更 | 运行状态、端口号 |
| `log-message` | 产生新日志 | 日志级别、内容、时间戳 |

## 故障排除

如果遇到打印问题，请检查：

1. 确保打印服务正在运行，托盘图标显示为正常状态
2. 检查打印机是否在线且正常工作
3. PDF数据是否有效，可尝试保存PDF文件查看
4. 查看应用日志，了解详细错误信息
5. 如遇服务无法启动，可尝试重启应用或更换端口

### 常见问题解决方案

| 问题 | 解决方案 |
|------|--------|
| 服务器状态显示"离线" | 点击"重启服务器"按钮尝试重新启动服务 |
| 端口被占用 | 应用会自动尝试使用其他端口，查看服务器状态卡片中显示的实际端口 |
| 找不到指定打印机 | 检查打印机名称是否正确，系统会尝试部分匹配，或使用默认打印机 |
| PDF数据无效 | 确保正确编码为Base64格式，检查文件是否损坏 |
| 打印任务长时间"等待中" | 检查打印机状态，可能是缺纸、墨盒问题或脱机状态 |

## API列表

| 方法名 | 说明 |
|-------|------|
| getPrinters | 获取系统打印机列表 |
| printPdf | 打印PDF数据 |
| printImage | 打印图片数据 |
| savePdf | 保存PDF到文件 |

## 系统要求

- Windows 7/8/10/11
- macOS 10.13+
- 主流Linux发行版
- 至少1GB内存
- 至少100MB硬盘空间
- 已安装打印机驱动

## 许可证

ISC 

## 最近更新

**2025年4月17日更新**

- 新增服务端口显示与一键复制功能
- 优化客户端连接管理，防止IP重复统计
- 增加客户端连接时长显示
- 改进IP地址格式化，对IPv6地址增强可读性
- 完善端口冲突处理机制
- 优化UI界面布局与交互体验 

## 标签打印机直接打印

对于HPRT D45BT等标签打印机，可以使用`directPrintImage`接口进行直接打印。该功能经过优化，解决了打印重复和方向问题。

```javascript
// 标签打印机直接打印示例
ws.send(JSON.stringify({
  action: 'directPrintImage',
  requestId: 'req-' + Date.now(),
  data: imageBase64Data, // Base64编码的图片数据
  options: {
    printer: 'HPRT D45BT',    // 打印机名称
    isLabelPrinter: true,     // 明确指定为标签打印机
    width: 100,               // 标签宽度，单位毫米
    height: 75,               // 标签高度，单位毫米
    dpi: 203,                 // 打印机分辨率，默认203dpi
    fitOption: 'contain',     // 图片适应方式: 'contain'完整显示或'cover'填充
    silent: true,             // 静默打印
    copies: 1,                // 打印份数
    
    // 打印方向控制
    landscape: false,         // 是否横向打印
    
    // 图片处理选项
    scale: 100,               // 缩放比例(%)
    printBackground: true,    // 打印背景
    
    // 页面控制选项（防止打印多份）
    pageRanges: [{from: 0, to: 0}], // 仅打印第一页
    
    // 高级选项
    useNativePrinting: false, // 是否使用本机打印方式
    fallbackToPrintDefault: true, // 失败时是否尝试系统默认打印
    preRotateImage: false,    // 是否在打印前预旋转图片
    imageFormat: 'png'        // 临时文件保存格式
  }
}));
```

### directPrintImage函数工作流程

`directPrintImage`函数使用智能打印策略，按以下步骤工作：

1. **自动检测标签打印机** - 根据打印机名称或`isLabelPrinter`参数识别标签打印机
2. **分阶段尝试打印** - 使用标记确保每次请求仅执行一次打印
3. **多种打印策略** - 按优先级依次尝试：
   - HTML模板方式（对标签打印机）
   - 本机打印方式（如果可用）
   - 标准Electron打印方式
4. **错误恢复机制** - 如果启用了`fallbackToPrintDefault`，在打印失败时会尝试使用系统默认方式打印

系统自动识别以下品牌的标签打印机：
- HPRT（汉印）
- TSC
- Zebra
- DYMO
- 以及包含"label"或"标签"字样的其他打印机

对于未被自动识别的标签打印机，可以通过设置`isLabelPrinter: true`参数明确指定。

### 解决常见标签打印问题

#### 解决打印重复问题

打印服务针对标签打印可能出现的"打印两次"或"打印在两页纸上"的问题进行了优化：

1. **使用打印尝试标记防止重复打印**
2. **HTML模板优化**，使用CSS `@page` 规则设置精确的标签大小
3. **页面控制设置**：`pageRanges: [{from: 0, to: 0}]` 仅打印第一页
4. **CSS打印媒体查询优化**：
   ```css
   @media print {
     html, body {
       page-break-inside: avoid;
       page-break-after: avoid;
       page-break-before: avoid;
     }
   }
   ```

#### 解决打印方向问题

如果标签打印内容方向不正确，可以通过以下选项调整：

1. **设置打印方向**：
   ```javascript
   landscape: false,  // 纵向打印
   ```
   或
   ```javascript
   landscape: true,   // 横向打印
   ```

2. **内部实现原理**：
   当设置为横向打印时，系统会：
   - 交换页面的宽度和高度尺寸
   - 在CSS中添加图像旋转变换
   - 这种方法确保图像正确呈现，无论打印机驱动如何处理方向

3. **针对特殊打印机**：
   部分标签打印机可能需要额外调整。例如，HPRT打印机可以尝试：
   ```javascript
   landscape: true,      // 横向打印
   width: 100,           // 实际物理高度
   height: 50,           // 实际物理宽度
   ```

#### 解决内容溢出问题

如果标签内容超出了标签的物理尺寸，请使用以下设置：

1. **设置正确的标签尺寸**：
   ```javascript
   width: 100,    // 实际标签宽度，单位毫米
   height: 75,    // 实际标签高度，单位毫米
   ```

2. **控制图片适应方式**：
   ```javascript
   fitOption: 'contain'  // 确保图片完整显示在标签内（默认）
   ```
   或
   ```javascript
   fitOption: 'cover'    // 填充整个标签（可能裁剪图片边缘）
   ```

3. **使用无边距设置**：
   系统已默认配置`marginType: 'none'`确保内容不会因边距问题而溢出

### 标签打印机参数详解

| 参数名 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| isLabelPrinter | boolean | false | 明确指定打印机为标签打印机 |
| width | number | 50 | 标签宽度（毫米） |
| height | number | 30 | 标签高度（毫米） |
| dpi | number | 203 | 打印机分辨率（每英寸点数） |
| fitOption | string | 'contain' | 图片适应方式：'contain'确保图片完整显示，'cover'填充整个标签 |
| silent | boolean | true | 是否静默打印（不显示打印对话框） |
| copies | number | 1 | 打印份数 |
| landscape | boolean | false | 是否横向打印 |
| scale | number | 100 | 图像缩放比例(%) |
| printBackground | boolean | true | 是否打印背景 |
| pageRanges | array | [{from:0,to:0}] | 控制打印页范围，防止分页问题 |
| useNativePrinting | boolean | true | 是否尝试使用本机打印方式 |
| fallbackToPrintDefault | boolean | false | 如果打印失败，是否尝试使用系统默认打印方式 |
| preRotateImage | boolean | false | 是否在打印前预旋转图片（需要安装图像处理库） |
| imageFormat | string | 'png' | 临时文件保存的图片格式 |

### 特定打印机配置

对于特定品牌的打印机，可能需要进行特别的配置：

#### HPRT打印机优化配置
```javascript
options: {
  isLabelPrinter: true,
  dpi: 203,             // HPRT打印机通常为203dpi
  landscape: false,     // 明确指定打印方向
  fallbackToPrintDefault: true, // HPRT打印机在驱动问题时可尝试系统打印
  imageFormat: 'png'    // 使用PNG格式提升打印质量
}
```

#### TSC打印机优化配置
```javascript
options: {
  isLabelPrinter: true,
  dpi: 300,             // TSC部分型号为300dpi
  scale: 100,           // 建议使用100%比例
  fallbackToPrintDefault: false // TSC打印机通常不需要系统回退
}
```
