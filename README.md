# Grasscutter 启动器

一个现代化的 Grasscutter 私服启动器，提供简洁美观的用户界面和丰富的功能。

## 功能特点

- **一键启动**: 快速启动 Grasscutter 服务器和游戏客户端
- **资源下载**: 从官方或自定义源下载所需资源
- **自定义配置**: 灵活配置服务器和客户端参数
- **实时状态**: 监控服务器运行状态和性能
- **多主题支持**: 提供多种主题切换选项
- **响应式设计**: 完美适配桌面和移动设备

## 安装说明

### 系统要求
- Node.js 14.0 或更高版本
- Java 17 或更高版本 (用于运行 Grasscutter 服务器)

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/Lcyys666/YS-Private-Server-Script-Launcher.git
cd YS-Private-Server-Script-Launcher
```

2. 安装依赖
```bash
npm install
```

3. 启动应用
```bash
npm start
```

4. 在浏览器中访问 `http://localhost:3000`

## 使用说明

### 启动服务器
1. 在"设置"页面配置 Grasscutter 路径
2. 返回"启动"页面，点击"启动服务器"按钮
3. 等待服务器启动完成后，可以点击"启动游戏"按钮

### 下载资源
1. 进入"下载"页面
2. 选择需要下载的资源类型
3. 点击对应资源的"下载"按钮
4. 也可以添加自定义下载源

### 自定义设置
1. 进入"设置"页面
2. 配置服务器路径、游戏路径等参数
3. 选择界面主题和显示模式
4. 点击"保存设置"按钮应用更改

## 开发说明

### 技术栈
- 前端: HTML, CSS, JavaScript
- 后端: Node.js, Express
- 模板引擎: EJS

### 项目结构
```
grasscutter-launcher/
├── public/              # 静态资源
│   ├── css/             # 样式文件
│   ├── js/              # 客户端脚本
│   └── images/          # 图片资源
├── views/               # EJS 模板
├── routes/              # 路由处理
├── app.js               # 应用入口
└── package.json         # 项目配置
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件

## 致谢

- [Grasscutter](https://github.com/Grasscutters/Grasscutter) - 开源的游戏服务器重新实现
- 所有贡献者和用户 