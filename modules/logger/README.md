# 日志系统模块

此模块提供了完整的日志系统功能，支持主进程和渲染进程之间的日志传输，并提供控制台日志重写和管理功能。

## 主要功能

- 控制台日志拦截和转发
- 主进程到渲染进程的日志传输
- 日志队列管理
- 日志格式化和序列化

## 使用方法

### 初始化日志系统

在主进程（main.js）中导入并初始化日志系统：

```javascript
const logger = require('./modules/logger');

// 初始化日志系统，传入获取主窗口的函数
const { pendingLogs } = logger.initLogger({
  getMainWindow: () => mainWindow
});
```

### 使用日志系统

初始化后，可以直接使用console方法记录日志：

```javascript
console.log('普通日志信息');
console.info('信息级别日志');
console.warn('警告级别日志');
console.error('错误级别日志');

// 或使用全局方法
log('普通日志信息');
info('信息级别日志');
warn('警告级别日志');
error('错误级别日志');
```

### 管理待处理日志

当主窗口未准备好时，日志会存储在队列中。窗口准备好后，可以发送待处理日志：

```javascript
// 发送所有待处理日志
logger.sendPendingLogs();

// 清空日志队列
logger.clearLogs();
```

### 在IPC通信中使用

在设置IPC通信时，传入日志相关的方法：

```javascript
appModule.setupIPC({
  // 其他参数...
  pendingLogs: logger.getPendingLogs(),
  clearLogs: logger.clearLogs
});
```

## 模块结构

- `index.js` - 模块入口，提供统一的API
- `console.js` - 控制台重写和日志处理的核心实现

## API 参考

### logger.initLogger(options)

初始化日志系统。

- `options.getMainWindow` - 获取主窗口的函数，用于发送日志到渲染进程

### logger.sendPendingLogs()

发送所有待处理的日志到渲染进程。

### logger.clearLogs()

清空待处理日志队列。

### logger.getPendingLogs()

获取待处理日志队列。

### logger.console.restoreConsole()

恢复原始的控制台方法，停止日志拦截。 