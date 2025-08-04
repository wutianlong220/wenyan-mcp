#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 配置
const ARTICLES_DIR = '/Users/dabaobaodemac/Desktop/WeChatOfficialAccount/article';
const MCP_SERVER_PATH = '/Users/dabaobaodemac/Desktop/myCode/GitHubCodeRepository/wenyan-mcp/dist/index.js';

// 支持的主题
const THEMES = {
    'default': '经典简洁布局',
    'orangeheart': '温暖橙色调',
    'rainbow': '多彩活泼主题',
    'lapis': '清新蓝色调',
    'pie': '现代锐利风格',
    'maize': '柔和玉米色调',
    'purple': '简洁紫色主题',
    'phycat': '薄荷绿色调'
};

// 图片格式优先级
const IMAGE_EXTENSIONS = ['.jpg', '.png', '.jpeg'];

// 解析命令行参数
function parseArgs(args) {
    const parsed = {
        files: [],
        theme: 'default',
        command: null
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '-ls') {
            parsed.command = 'list';
        } else if (arg === '-all') {
            parsed.command = 'all';
        } else if (arg === '-t' && i + 1 < args.length) {
            parsed.theme = args[i + 1];
            i++; // 跳过下一个参数
        } else if (arg.startsWith('-t')) {
            // 处理 -t主题名 的格式
            parsed.theme = arg.substring(2);
        } else if (arg.endsWith('.md')) {
            parsed.files.push(arg);
        }
    }

    return parsed;
}

// 查找匹配的图片文件
function findMatchingImage(articleBaseName) {
    for (const ext of IMAGE_EXTENSIONS) {
        const imagePath = path.join(ARTICLES_DIR, articleBaseName + ext);
        if (fs.existsSync(imagePath)) {
            return path.basename(imagePath);
        }
    }
    return null;
}

// 获取文章状态
function getArticleStatus() {
    const files = fs.readdirSync(ARTICLES_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    const status = [];

    for (const mdFile of mdFiles) {
        const baseName = path.basename(mdFile, '.md');
        const imageFile = findMatchingImage(baseName);
        
        if (imageFile) {
            status.push({
                article: mdFile,
                image: imageFile,
                status: 'READY'
            });
        } else {
            status.push({
                article: mdFile,
                image: null,
                status: 'MISSING_IMAGE'
            });
        }
    }

    return status;
}

// 显示文章状态
function showArticleStatus() {
    const status = getArticleStatus();
    
    console.log('📋 文章状态列表：');
    if (status.length === 0) {
        console.log('📭 article目录为空');
        return;
    }

    for (const item of status) {
        if (item.status === 'READY') {
            console.log(`✅ READY: ${item.article} (${item.image})`);
        } else {
            console.log(`❌ MISSING_IMAGE: ${item.article}`);
        }
    }
}

// 调用MCP服务器
function callMCP(content, themeId) {
    return new Promise((resolve, reject) => {
        const mcpProcess = spawn('node', [MCP_SERVER_PATH]);
        
        let output = '';
        let errorOutput = '';

        mcpProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        mcpProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        mcpProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`MCP服务器错误: ${errorOutput}`));
                return;
            }

            try {
                const lines = output.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                const response = JSON.parse(lastLine);
                
                if (response.result && response.result.content) {
                    resolve(response.result.content[0].text);
                } else {
                    reject(new Error('MCP响应格式错误'));
                }
            } catch (error) {
                reject(new Error(`解析MCP响应失败: ${error.message}`));
            }
        });

        // 发送MCP请求
        const request = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
                name: "publish_article",
                arguments: {
                    content: content,
                    theme_id: themeId
                }
            }
        };

        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        mcpProcess.stdin.end();
    });
}

// 发布单篇文章
async function publishArticle(filename, themeId) {
    try {
        console.log(`📝 正在处理文章: ${filename}`);
        
        // 检查文件是否存在
        const articlePath = path.join(ARTICLES_DIR, filename);
        if (!fs.existsSync(articlePath)) {
            throw new Error(`找不到文件: ${filename}`);
        }

        // 检查是否有对应的图片
        const baseName = path.basename(filename, '.md');
        const imageFile = findMatchingImage(baseName);
        if (!imageFile) {
            throw new Error(`未找到匹配的图片文件: ${baseName}`);
        }

        console.log(`🖼️  找到匹配图片: ${imageFile}`);
        console.log(`🎨 使用主题: ${themeId}`);

        // 读取文章内容
        const content = fs.readFileSync(articlePath, 'utf8');
        
        // 调用MCP发布
        console.log(`🚀 正在通过MCP发布到微信公众号...`);
        const result = await callMCP(content, themeId);
        
        console.log(`✅ ${result}`);
        
        // 移动文件到processed目录
        const processedDir = path.join(ARTICLES_DIR, 'processed');
        if (!fs.existsSync(processedDir)) {
            fs.mkdirSync(processedDir, { recursive: true });
        }
        
        const processedArticlePath = path.join(processedDir, filename);
        const processedImagePath = path.join(processedDir, imageFile);
        
        fs.renameSync(articlePath, processedArticlePath);
        fs.renameSync(path.join(ARTICLES_DIR, imageFile), processedImagePath);
        
        console.log(`📁 文件已移动到 processed 目录`);
        
        return true;
        
    } catch (error) {
        console.error(`❌ 发布失败: ${error.message}`);
        return false;
    }
}

// 发布所有文章
async function publishAllArticles(themeId) {
    const status = getArticleStatus();
    const readyArticles = status.filter(item => item.status === 'READY');
    
    if (readyArticles.length === 0) {
        console.log('📭 没有可发布的文章');
        return;
    }

    console.log(`📄 找到 ${readyArticles.length} 个可发布的文章`);
    
    let successCount = 0;
    let failCount = 0;

    for (const item of readyArticles) {
        const success = await publishArticle(item.article, themeId);
        
        if (success) {
            successCount++;
        } else {
            failCount++;
        }

        // 添加延迟，避免API调用过于频繁
        if (readyArticles.length > 1) {
            console.log(`⏳ 等待2秒后处理下一篇文章...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log(`\n📊 处理完成:`);
    console.log(`   ✅ 成功: ${successCount} 篇`);
    console.log(`   ❌ 失败: ${failCount} 篇`);
}

// 显示帮助信息
function showHelp() {
    console.log(`
🚀 微信公众号文章发布工具 (MCP客户端)

使用方法:
  ./start.sh [文件名.md]           # 发布单篇文章 (默认主题)
  ./start.sh [文件名.md] -t [主题]  # 发布单篇文章 (指定主题)
  ./start.sh -all                 # 发布所有文章 (默认主题)
  ./start.sh -all -t [主题]       # 发布所有文章 (指定主题)
  ./start.sh -ls                  # 查看所有文章状态

支持的主题:
  default      - 经典简洁布局
  orangeheart  - 温暖橙色调
  rainbow      - 多彩活泼主题
  lapis        - 清新蓝色调
  pie          - 现代锐利风格
  maize        - 柔和玉米色调
  purple       - 简洁紫色主题
  phycat       - 薄荷绿色调

参数位置灵活:
  ./start.sh -t lapis 论持久战.md    # 可以
  ./start.sh 论持久战.md -t lapis    # 也可以

示例:
  ./start.sh 测试文章.md
  ./start.sh 测试文章.md -t lapis
  ./start.sh -all -t rainbow
  ./start.sh -ls
`);
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
        showHelp();
        return;
    }

    const parsed = parseArgs(args);

    // 检查主题是否有效
    if (!THEMES[parsed.theme]) {
        console.error(`❌ 无效的主题: ${parsed.theme}`);
        console.log(`支持的主题: ${Object.keys(THEMES).join(', ')}`);
        return;
    }

    try {
        if (parsed.command === 'list') {
            showArticleStatus();
        } else if (parsed.command === 'all') {
            console.log(`🚀 开始发布所有文章，使用主题: ${parsed.theme}`);
            await publishAllArticles(parsed.theme);
        } else if (parsed.files.length > 0) {
            for (const file of parsed.files) {
                await publishArticle(file, parsed.theme);
            }
        } else {
            console.error('❌ 请指定要发布的文章文件名或使用 -all 发布所有文章');
            console.log('使用 ./start.sh -h 查看帮助');
        }
    } catch (error) {
        console.error(`❌ 执行失败: ${error.message}`);
    }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
    console.error(`❌ 未处理的Promise拒绝:`, reason);
});

process.on('SIGINT', () => {
    console.log(`\n👋 程序已停止`);
    process.exit(0);
});

// 启动程序
main().catch(console.error); 