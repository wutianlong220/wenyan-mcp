#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { publishToDraft } from './dist/publish.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量文件
function loadEnvFile() {
    const envPath = path.join(__dirname, 'env.local');
    if (fs.existsSync(envPath)) {
        console.log('📄 加载环境变量文件: env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        envLines.forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                process.env[key.trim()] = value;
                console.log(`   ${key.trim()}: ${value}`);
            }
        });
        console.log('✅ 环境变量已加载');
    } else {
        console.log('⚠️  未找到 env.local 文件');
    }
}

// 配置
const ARTICLE_DIR = '/Users/dabaobaodemac/Desktop/Articles'; // 文章目录
const PROCESSED_DIR = '/Users/dabaobaodemac/Desktop/Articles/processed'; // 已处理目录

// 确保目录存在
if (!fs.existsSync(ARTICLE_DIR)) {
    fs.mkdirSync(ARTICLE_DIR, { recursive: true });
}
if (!fs.existsSync(PROCESSED_DIR)) {
    fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

// 获取文件名（不含扩展名）
function getBaseName(filePath) {
    return path.basename(filePath, path.extname(filePath));
}

// 查找匹配的图片文件
function findMatchingImage(articleBaseName) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    
    for (const ext of imageExtensions) {
        const imagePath = path.join(ARTICLE_DIR, articleBaseName + ext);
        if (fs.existsSync(imagePath)) {
            return imagePath;
        }
    }
    
    return null;
}

// 处理单篇文章发布
async function publishArticle(articlePath) {
    try {
        const articleBaseName = getBaseName(articlePath);
        console.log(`\n📝 正在处理文章: ${path.basename(articlePath)}`);
        
        // 查找匹配的图片
        const imagePath = findMatchingImage(articleBaseName);
        if (!imagePath) {
            console.log(`⚠️  未找到匹配的图片文件: ${articleBaseName}`);
            console.log(`   支持的图片格式: jpg, jpeg, png, gif`);
            return false;
        }
        
        console.log(`🖼️  找到匹配图片: ${path.basename(imagePath)}`);
        
        // 读取文章内容
        const content = fs.readFileSync(articlePath, 'utf8');
        
        // 解析frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch) {
            throw new Error('文章格式错误，缺少frontmatter');
        }
        
        const frontmatter = frontmatterMatch[1];
        const body = frontmatterMatch[2];
        
        // 提取标题
        const titleMatch = frontmatter.match(/title:\s*(.+)/);
        const title = titleMatch ? titleMatch[1].trim() : articleBaseName;
        
        console.log(`📋 文章标题: ${title}`);
        console.log(`🖼️  封面图片: ${path.basename(imagePath)}`);
        
        // 发布文章
        console.log(`🚀 正在发布到微信公众号草稿箱...`);
        const result = await publishToDraft(title, body, imagePath);
        
        console.log(`✅ 文章发布成功！媒体ID: ${result.media_id}`);
        
        // 移动文件到已处理目录
        const processedArticlePath = path.join(PROCESSED_DIR, path.basename(articlePath));
        const processedImagePath = path.join(PROCESSED_DIR, path.basename(imagePath));
        
        fs.renameSync(articlePath, processedArticlePath);
        fs.renameSync(imagePath, processedImagePath);
        
        console.log(`📁 文件已移动到已处理目录`);
        console.log(`   - 文章: ${path.basename(processedArticlePath)}`);
        console.log(`   - 图片: ${path.basename(processedImagePath)}`);
        
        return true;
        
    } catch (error) {
        console.error(`❌ 发布失败: ${error.message}`);
        return false;
    }
}

// 扫描并处理所有文章
async function scanAndPublish() {
    console.log(`🔍 扫描文章目录: ${ARTICLE_DIR}`);
    
    const files = fs.readdirSync(ARTICLE_DIR);
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    
    if (markdownFiles.length === 0) {
        console.log(`📭 文章目录为空，没有找到.md文件`);
        return;
    }
    
    console.log(`📄 找到 ${markdownFiles.length} 个文章文件:`);
    markdownFiles.forEach(file => console.log(`   - ${file}`));
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of markdownFiles) {
        const articlePath = path.join(ARTICLE_DIR, file);
        const success = await publishArticle(articlePath);
        
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
        
        // 添加延迟，避免API调用过于频繁
        if (markdownFiles.length > 1) {
            console.log(`⏳ 等待2秒后处理下一篇文章...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log(`\n📊 处理完成:`);
    console.log(`   ✅ 成功: ${successCount} 篇`);
    console.log(`   ❌ 失败: ${failCount} 篇`);
    
    if (successCount > 0) {
        console.log(`\n🎉 请登录微信公众号后台查看草稿箱:`);
        console.log(`   https://mp.weixin.qq.com/`);
    }
}

// 主函数
async function main() {
    console.log(`🚀 微信公众号文章发布工具`);
    console.log(`================================`);
    
    // 加载环境变量
    loadEnvFile();
    
    // 检查环境变量
    if (!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET) {
        console.error(`❌ 请设置环境变量:`);
        console.error(`   export WECHAT_APP_ID=your_app_id`);
        console.error(`   export WECHAT_APP_SECRET=your_app_secret`);
        console.error('');
        console.error('或者创建 env.local 文件并添加以下内容:');
        console.error('WECHAT_APP_ID=your_app_id');
        console.error('WECHAT_APP_SECRET=your_app_secret');
        process.exit(1);
    }
    
    // 扫描并发布所有文章
    await scanAndPublish();
    console.log(`\n✨ 处理完成！`);
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