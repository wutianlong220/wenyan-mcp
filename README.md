# 微信公众号文章发布工具

一个本地文件监控脚本，可以自动将Markdown文章发布到微信公众号草稿箱。

## 功能特点

✅ **自动监控**：监控指定目录的文件变化，自动发布新文章
✅ **统一目录**：文章和图片放在同一个目录中，方便管理
✅ **智能识别**：自动识别文章和图片文件
✅ **错误处理**：完善的错误处理和日志记录
✅ **文件管理**：已处理的文件自动移动到processed目录

## 快速开始

### 1. 设置环境变量

```bash
export WECHAT_APP_ID=your_app_id
export WECHAT_APP_SECRET=your_app_secret
```

### 2. 安装依赖

```bash
npm install
npm run build
```

### 3. 启动监控

```bash
./start-publisher.sh
```

### 4. 创建文章

在 `~/Desktop/Articles/` 目录中创建Markdown文章：

```markdown
---
title: 我的第一篇文章
cover: cover-image.jpg
---

# 文章标题

这是文章内容...
```

将封面图片 `cover-image.jpg` 放在同一目录中，保存文件后脚本会自动发布。

## 目录结构

```
~/Desktop/Articles/
├── my-article.md          # 文章文件
├── cover-image.jpg        # 封面图片
└── processed/             # 已处理的文件
    ├── my-article.md
    └── cover-image.jpg
```

## 使用方法

### 启动监控

```bash
# 使用启动脚本（推荐）
./start-publisher.sh

# 直接运行
node publish-monitor.js
```

### 测试功能

```bash
node test-publish.js
```

## 文章格式

文章必须包含正确的frontmatter格式：

```markdown
---
title: 文章标题
cover: cover-image.jpg
theme: orangeheart  # 可选
---

文章内容...
```

## 支持的格式

- **文章格式**：`.md`
- **图片格式**：`.jpg`, `.jpeg`, `.png`, `.gif`

## 注意事项

1. **网络环境**：发布前请关闭VPN以确保IP稳定
2. **IP白名单**：确保当前IP已添加到微信公众号IP白名单
3. **文件路径**：封面图片路径使用相对路径（相对于article目录）

## 故障排除

### 常见问题

1. **IP白名单错误**
   ```bash
   curl ifconfig.me  # 查看当前IP
   ```

2. **环境变量未设置**
   ```bash
   echo $WECHAT_APP_ID
   echo $WECHAT_APP_SECRET
   ```

3. **权限错误**
   ```bash
   ls -la ~/Desktop/Articles/
   ```

## 详细文档

- [使用说明](使用说明.md) - 详细的使用指南
- [方案1](方案1.md) - 本地脚本方案说明

## 停止监控

按 `Ctrl+C` 停止监控脚本。

## 技术支持

如果遇到问题，请检查：
1. 网络连接是否正常
2. 环境变量是否正确设置
3. 文件格式是否符合要求
4. 微信公众号配置是否正确
