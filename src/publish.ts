import { JSDOM } from "jsdom";
import FormData from 'form-data';
import fetch from 'node-fetch';
import { fileFromPath } from 'formdata-node/file-from-path';
import path from "path";
import fs from "fs";

const tokenUrl = "https://api.weixin.qq.com/cgi-bin/token";
const publishUrl = "https://api.weixin.qq.com/cgi-bin/draft/add";
const uploadUrl = `https://api.weixin.qq.com/cgi-bin/material/add_material`;
const dockerImagePath = "/mnt/host-downloads";

function getAppId(): string {
    return process.env.WECHAT_APP_ID || "";
}

function getAppSecret(): string {
    return process.env.WECHAT_APP_SECRET || "";
}

function getHostImagePath(): string {
    return process.env.HOST_IMAGE_PATH || "";
}

type UploadResponse = {
    media_id: string;
    url: string
};

async function fetchAccessToken() {
    try {
        const appId = getAppId();
        const appSecret = getAppSecret();
        
        if (!appId || !appSecret) {
            throw new Error("环境变量未设置：WECHAT_APP_ID 或 WECHAT_APP_SECRET");
        }
        
        const response = await fetch(`${tokenUrl}?grant_type=client_credential&appid=${appId}&secret=${appSecret}`);
        const data = await response.json();
        if (data.access_token) {
            return data;
        } else if (data.errcode) {
            throw new Error(`获取 Access Token 失败，错误码：${data.errcode}，${data.errmsg}`);
        } else {
            throw new Error(`获取 Access Token 失败: ${data}`);
        }
    } catch (error) {
        throw error;
    }
}

async function uploadMaterial(type: string, fileData: Buffer, fileName: string, accessToken: string): Promise<UploadResponse> {
    console.log(`📤 开始上传素材: ${type}, ${fileName}`);
    console.log(`📊 文件数据大小: ${fileData.length} 字节`);
    
    const form = new FormData();
    form.append('media', fileData, { filename: fileName });
    
    const url = `${uploadUrl}?access_token=${accessToken}&type=${type}`;
    console.log(`🌐 发送请求到: ${url}`);
    
    const response = await fetch(url, {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
    });
    
    console.log(`📡 响应状态: ${response.status}`);
    const data = await response.json();
    console.log(`📋 响应数据:`, data);
    if (data.errcode) {
        console.error(`❌ API错误: ${data.errcode} - ${data.errmsg}`);
        throw new Error(`上传失败，错误码：${data.errcode}，错误信息：${data.errmsg}`);
    }
    const result = data.url ? data.url.replace("http://", "https://") : '';
    data.url = result;
    console.log(`✅ 上传成功: ${data.media_id}`);
    return data;
}

async function uploadImage(imageUrl: string, accessToken: string, fileName?: string): Promise<UploadResponse> {
    console.log(`🖼️  开始处理图片: ${imageUrl}`);
    if (imageUrl.startsWith("http")) {
        const response = await fetch(imageUrl);
        if (!response.ok || !response.body) {
            throw new Error(`Failed to download image from URL: ${imageUrl}`);
        }
        const buffer = await response.buffer();
        const fileNameFromUrl = fileName || imageUrl.split('/').pop() || 'image.jpg';
        return await uploadMaterial('image', buffer, fileNameFromUrl, accessToken);
    } else {
        let localImagePath = imageUrl;
        if (!path.isAbsolute(imageUrl)) {
            localImagePath = path.resolve('/Users/dabaobaodemac/Desktop/WeChatOfficialAccount/article', imageUrl);
        }
        if (!fs.existsSync(localImagePath)) {
            throw new Error(`图片文件不存在: ${localImagePath}`);
        }
        const buffer = fs.readFileSync(localImagePath);
        const fileNameFromLocal = fileName || path.basename(localImagePath);
        return await uploadMaterial('image', buffer, fileNameFromLocal, accessToken);
    }
}

async function uploadImages(content: string, accessToken: string): Promise<{ html: string, firstImageId: string }> {
    console.log('🔍 检查内容中的图片...');
    console.log('内容包含 <img 标签:', content.includes('<img'));
    
    if (!content.includes('<img')) {
        console.log('❌ 未找到图片标签');
        return { html: content, firstImageId: "" };
    }

    const dom = new JSDOM(content);
    const document = dom.window.document;
    const images = Array.from(document.querySelectorAll('img'));
    
    console.log(`📸 找到 ${images.length} 张图片`);

    const uploadPromises = images.map(async (element, index) => {
        const dataSrc = element.getAttribute('src');
        console.log(`图片 ${index + 1}: ${dataSrc}`);
        
        if (dataSrc) {
            if (!dataSrc.startsWith('https://mmbiz.qpic.cn')) {
                console.log(`正在上传图片: ${dataSrc}`);
                const resp = await uploadImage(dataSrc, accessToken);
                element.setAttribute('src', resp.url);
                console.log(`图片上传成功: ${resp.media_id}`);
                return resp.media_id;
            } else {
                console.log(`图片已存在: ${dataSrc}`);
                return dataSrc;
            }
        }
        return null;
    });

    const mediaIds = (await Promise.all(uploadPromises)).filter(Boolean);
    const firstImageId = mediaIds[0] || "";
    
    console.log(`✅ 图片处理完成，第一张图片ID: ${firstImageId}`);

    const updatedHtml = dom.serialize();
    return { html: updatedHtml, firstImageId };
}

export async function publishToDraft(title: string, content: string, cover: string) {
    try {
        const accessToken = await fetchAccessToken();
        const { html, firstImageId } = await uploadImages(content, accessToken.access_token);
        let thumbMediaId = "";
        if (cover) {
            const resp = await uploadImage(cover, accessToken.access_token, "cover.jpg");
            thumbMediaId = resp.media_id;
        } else {
            if (firstImageId.startsWith("https://mmbiz.qpic.cn")) {
                const resp = await uploadImage(firstImageId, accessToken.access_token, "cover.jpg");
                thumbMediaId = resp.media_id;
            } else {
                thumbMediaId = firstImageId;
            }
        }
        if (!thumbMediaId) {
            throw new Error("你必须指定一张封面图或者在正文中至少出现一张图片。");
        }
        const response = await fetch(`${publishUrl}?access_token=${accessToken.access_token}`, {
            method: 'POST',
            body: JSON.stringify({
                articles: [{
                    title: title,
                    content: html,
                    thumb_media_id: thumbMediaId,
                }]
            })
        });
        const data = await response.json();
        if (data.media_id) {
            return data;
        } else if (data.errcode) {
            throw new Error(`上传到公众号草稿失败，错误码：${data.errcode}，${data.errmsg}`);
        } else {
            throw new Error(`上传到公众号草稿失败: ${data}`);
        }
    } catch (error) {
        throw error;
    }
}
