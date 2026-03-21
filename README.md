# FFmpeg 工具箱

一个现代化的 FFmpeg 可视化桌面工具，让视频处理变得简单直观。

## 功能特性

### 核心功能

- **格式转换** - 支持多种视频格式转换 (MP4, AVI, MOV, WebM, MKV)
- **视频编辑** - 裁剪、拼接、水印、字幕 (开发中)
- **压缩优化** - 视频压缩、码率调整 (开发中)
- **媒体提取** - 帧提取、GIF生成、音频提取 (开发中)

### 特色功能

- 拖拽上传文件
- 预设模板 (微信、抖音、YouTube、B站)
- FFmpeg 命令预览与复制
- 任务队列管理
- 批量处理支持
- electron-store 数据持久化

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Electron | 28+ | 跨平台桌面框架 |
| React | 18 | 前端框架 |
| TypeScript | 5 | 类型安全 |
| Ant Design | 5 | UI 组件库 |
| Zustand | 4 | 状态管理 |
| Vite | 5 | 构建工具 |
| Lucide React | - | 图标库 |

## 项目结构

```
ffmpeg-utils/
├── electron/                 # Electron 主进程
│   ├── main.ts              # 主进程入口
│   ├── preload.ts           # 预加载脚本
│   └── services/
│       ├── ffmpeg.ts        # FFmpeg 服务封装
│       └── fileSystem.ts    # 文件系统操作
├── src/                      # React 应用
│   ├── main.tsx             # 应用入口
│   ├── App.tsx              # 根组件
│   ├── components/          # 通用组件
│   │   ├── Layout/          # 布局组件
│   │   ├── FileDrop/        # 文件拖拽上传
│   │   ├── CommandPreview/  # 命令预览
│   │   └── TaskQueue/       # 任务队列
│   ├── modules/             # 功能模块
│   │   ├── Convert/         # 格式转换
│   │   ├── Edit/            # 视频编辑
│   │   ├── Compress/        # 压缩优化
│   │   ├── Extract/         # 媒体提取
│   │   └── Queue/           # 任务队列
│   ├── stores/              # Zustand 状态管理
│   ├── types/               # TypeScript 类型定义
│   └── styles/              # 全局样式
├── resources/               # 资源文件
│   └── ffmpeg/              # FFmpeg 二进制文件
├── docs/                    # 文档
│   └── superpowers/         # 设计文档
├── vitest.config.ts         # 测试配置
└── package.json
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# Web 开发模式
npm run dev

# Electron 开发模式
npm run electron:dev
```

### 运行测试

```bash
npm test
```

### 构建打包

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 使用说明

### 格式转换

1. 在左侧导航栏选择「格式转换」
2. 拖拽或点击上传视频文件
3. 选择输出格式、编码器和分辨率
4. 可选择预设模板快速配置
5. 点击「开始转换」添加到任务队列

### 预设模板

内置以下预设：

| 预设 | 分辨率 | 码率 | 适用场景 |
|------|--------|------|----------|
| 微信视频 | 720p | 1M | 微信发送 |
| 抖音视频 | 1080p | 2M | 抖音上传 |
| YouTube | 1080p | 8M | YouTube 上传 |
| B站视频 | 1080p | 6M | Bilibili 上传 |

## 设计规范

### 色彩系统

| 角色 | 色值 | 用途 |
|------|------|------|
| Primary | `#0D9488` | 主色调 |
| Secondary | `#14B8A6` | 次要元素 |
| CTA | `#F97316` | 行动按钮 |
| Success | `#22C55E` | 成功状态 |
| Error | `#EF4444` | 错误状态 |

### 字体

- 标题：Poppins
- 正文：Open Sans
- 代码：JetBrains Mono

## 开发计划

### 已完成

- [x] 项目基础架构
- [x] Electron 主进程
- [x] React 应用框架
- [x] 状态管理 (Zustand)
- [x] UI 组件库
- [x] 格式转换模块
- [x] 视频编辑模块 (裁剪/拼接/水印/字幕)
- [x] 压缩优化模块 (目标大小/质量优先/快速压缩)
- [x] 媒体提取模块 (帧提取/GIF生成/音频提取/截图)
- [x] 任务队列
- [x] FFmpeg 服务集成
- [x] 单元测试
- [x] 打包配置

### 计划中

- [ ] 视频滤镜效果
- [ ] 批量水印
- [ ] 云端处理支持

## 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT License

## 致谢

- [FFmpeg](https://ffmpeg.org/) - 强大的多媒体处理框架
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React](https://react.dev/) - 用户界面库
- [Ant Design](https://ant.design/) - 企业级 UI 组件库