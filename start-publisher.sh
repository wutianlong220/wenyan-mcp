#!/bin/bash
# start-publisher.sh

echo "🚀 微信公众号文章批量发布工具"
echo "================================"

# 加载环境变量文件
if [ -f "env.local" ]; then
    echo "📄 加载环境变量文件: env.local"
    export $(cat env.local | xargs)
    echo "✅ 环境变量已加载"
else
    echo "⚠️  未找到 env.local 文件"
fi

# 检查环境变量
if [ -z "$WECHAT_APP_ID" ] || [ -z "$WECHAT_APP_SECRET" ]; then
    echo "❌ 请设置环境变量:"
    echo "export WECHAT_APP_ID=your_app_id"
    echo "export WECHAT_APP_SECRET=your_app_secret"
    echo ""
    echo "或者创建 env.local 文件并添加以下内容:"
    echo "WECHAT_APP_ID=your_app_id"
    echo "WECHAT_APP_SECRET=your_app_secret"
    exit 1
fi

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 检查dist目录是否存在
if [ ! -d "dist" ]; then
    echo "🔨 编译TypeScript代码..."
    npm run build
fi

# 创建文章目录
mkdir -p ~/Desktop/Articles
mkdir -p ~/Desktop/Articles/processed

echo "✅ 环境检查完成"
echo "📁 文章目录: ~/Desktop/Articles"
echo "📁 已处理目录: ~/Desktop/Articles/processed"
echo ""
echo "📋 使用说明:"
echo "1. 将文章文件(.md)和对应的图片文件(.jpg/.png)放入 ~/Desktop/Articles/ 目录"
echo "2. 确保文件名相同（不含扩展名），如: a.md 和 a.jpg"
echo "3. 运行此脚本批量发布所有文章"
echo "4. 已处理的文件会自动移动到 processed 目录"
echo ""

# 检查是否有文章文件
md_files=$(find ~/Desktop/Articles -name "*.md" -maxdepth 1 2>/dev/null | wc -l)
if [ "$md_files" -eq 0 ]; then
    echo "📭 文章目录为空，没有找到.md文件"
    echo "请先添加文章文件到 ~/Desktop/Articles/ 目录"
    exit 0
fi

echo "📄 找到 $md_files 个文章文件，开始批量发布..."
echo ""

# 启动批量发布脚本
node publish-monitor.js 