---
title: 示例文章标题
cover: cover-image.jpg
theme: orangeheart
---

# 示例文章

这是一篇示例文章，展示了正确的frontmatter格式。

## 文章结构

1. **frontmatter部分**：包含文章的元数据
   - `title`: 文章标题
   - `cover`: 封面图片文件名（相对于article目录）
   - `theme`: 可选的主题设置

2. **正文部分**：使用Markdown格式编写

## 图片使用

您可以将图片文件（.jpg, .png, .gif等）放在同一个article目录中，然后在frontmatter中引用：

```markdown
---
title: 我的文章
cover: my-cover-image.jpg
---
```

## 注意事项

- 封面图片路径是相对于article目录的相对路径
- 支持的图片格式：jpg, jpeg, png, gif
- 文章保存后会自动发布到微信公众号草稿箱
- 已处理的文章会移动到processed目录 