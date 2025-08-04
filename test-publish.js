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

// 测试配置
const TEST_ARTICLE_DIR = '/Users/dabaobaodemac/Desktop/Articles';
const TEST_ARTICLE = 'test-article.md';

async function testPublish() {
    console.log('🧪 开始测试发布功能...\n');
    
    // 加载环境变量
    loadEnvFile();
    
    // 检查环境变量
    if (!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET) {
        console.error('❌ 请设置环境变量:');
        console.error('export WECHAT_APP_ID=your_app_id');
        console.error('export WECHAT_APP_SECRET=your_app_secret');
        console.error('');
        console.error('或者创建 env.local 文件并添加以下内容:');
        console.error('WECHAT_APP_ID=your_app_id');
        console.error('WECHAT_APP_SECRET=your_app_secret');
        return;
    }
    
    // 检查测试文章是否存在
    const articlePath = path.join(TEST_ARTICLE_DIR, TEST_ARTICLE);
    if (!fs.existsSync(articlePath)) {
        console.error(`❌ 测试文章不存在: ${articlePath}`);
        console.log('请先创建测试文章');
        return;
    }
    
    try {
        console.log(`📝 读取测试文章: ${TEST_ARTICLE}`);
        
        // 读取文章内容
        const content = fs.readFileSync(articlePath, 'utf8');
        
        // 解析frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch) {
            throw new Error('文章格式错误，缺少frontmatter');
        }
        
        const frontmatter = frontmatterMatch[1];
        const body = frontmatterMatch[2];
        
        // 提取标题和封面
        const titleMatch = frontmatter.match(/title:\s*(.+)/);
        const coverMatch = frontmatter.match(/cover:\s*(.+)/);
        
        const title = titleMatch ? titleMatch[1].trim() : '测试文章';
        let cover = coverMatch ? coverMatch[1].trim() : '';
        
        // 如果封面路径是相对路径，转换为绝对路径
        if (cover && !path.isAbsolute(cover)) {
            cover = path.join(TEST_ARTICLE_DIR, cover);
        }
        
        // 检查封面文件是否存在
        if (cover && !fs.existsSync(cover)) {
            console.warn(`⚠️  封面文件不存在: ${cover}`);
            cover = '';
        }
        
        console.log(`📋 文章标题: ${title}`);
        console.log(`🖼️  封面图片: ${cover || '无'}`);
        console.log(`📄 文章长度: ${body.length} 字符`);
        
        // 发布文章
        console.log('\n🚀 正在发布到微信公众号草稿箱...');
        const result = await publishToDraft(title, body, cover);
        
        console.log('\n✅ 测试成功！');
        console.log(`📱 媒体ID: ${result.media_id}`);
        console.log(`🔗 请登录微信公众号后台查看草稿箱`);
        
    } catch (error) {
        console.error(`\n❌ 测试失败: ${error.message}`);
        
        if (error.message.includes('IP')) {
            console.log('\n💡 建议:');
            console.log('1. 检查当前IP是否在白名单中');
            console.log('2. 关闭VPN后重试');
            console.log('3. 使用 curl ifconfig.me 查看当前IP');
        }
    }
}

// 运行测试
testPublish(); 