# md2wechat 使用文档与技术原理

> 一款将 Markdown 文件一键转换为微信公众号格式 HTML 并发布到草稿箱的工具。

## 目录

- [1. 项目介绍](#1-项目介绍)
- [2. 技术原理](#2-技术原理)
- [3. 安装与配置](#3-安装与配置)
- [4. 可视化 Web 界面使用指南](#4-可视化-web-界面使用指南)
- [5. 命令行使用指南](#5-命令行使用指南)
- [6. 主题系统](#6-主题系统)
- [7. Front Matter 元信息](#7-front-matter-元信息)
- [8. 批量发布](#8-批量发布)
- [9. 自定义主题开发](#9-自定义主题开发)
- [10. 常见问题排查](#10-常见问题排查)

---

## 1. 项目介绍

### 1.1 为什么需要 md2wechat？

微信公众号后台编辑器有几个长期痛点：

1. **不支持 Markdown**：习惯用 Markdown 写作的技术博主、作者必须手动排版
2. **代码块支持差**：粘贴代码格式错乱，手机端不换行、不高亮
3. **样式不统一**：每次调整格式都要重复操作，难以保持文章风格一致
4. **图片需手动上传**：正文图片要一张张手动上传插入
5. **批量发布困难**：有系列文章或历史文章迁移时操作繁琐

md2wechat 就是为解决这些问题而生的。你只需要专注写作（用你最熟悉的 Markdown 编辑器），剩下的排版、代码高亮、图片上传、发布草稿全部自动化。

### 1.2 核心能力

- ✅ 完整 Markdown 语法支持（含 GFM 表格、任务列表、删除线等）
- ✅ 190+ 语言代码语法高亮
- ✅ 11 套精心设计的排版主题
- ✅ 手机端深度适配（代码换行、列表样式、表格滚动）
- ✅ 本地图片自动上传微信素材库
- ✅ **智能封面**：支持本地文件/在线URL/自动检测正文第一张图/Front Matter/默认封面
- ✅ 一键发布到公众号草稿箱
- ✅ 可视化 Web 界面（在线编辑、实时预览）
- ✅ 批量发布（目录/多选，进度条，失败重试）
- ✅ 命令行工具（可集成 CI/CD）
- ✅ 配置本地项目目录存储，隐私安全

---

## 2. 技术原理

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    用户层                            │
│   ┌──────────────┐    ┌──────────────────────┐      │
│   │ CLI 命令行    │    │ Web 可视化界面(浏览器) │      │
│   └──────┬───────┘    └──────────┬───────────┘      │
└──────────┼───────────────────────┼──────────────────┘
           │                       │
           ▼                       ▼
┌─────────────────────────────────────────────────────┐
│                  核心转换层 (core/)                   │
│                                                     │
│  ┌────────────┐   ┌──────────┐   ┌───────────────┐  │
│  │ markdown.ts│──▶│renderer.ts│──▶│  themes.ts    │  │
│  │ marked 解析 │   │ juice 内联│   │ 11 套 CSS 主题│  │
│  │ hljs 高亮   │   │ cheerio  │   │               │  │
│  │ 代码行包裹  │   │ 清洗过滤  │   │               │  │
│  └────────────┘   └─────┬────┘   └───────────────┘  │
└────────────────────────┼────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│               微信 API 层 (wechat/)                  │
│                                                     │
│  ┌────────────┐   ┌──────────┐   ┌───────────────┐  │
│  │ client.ts  │──▶│ media.ts │──▶│  draft.ts     │  │
│  │ access_token│   │ 图片上传 │   │ 草稿箱创建    │  │
│  │ 自动刷新   │   │ 封面上传 │   │               │  │
│  └────────────┘   └──────────┘   └───────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 2.2 转换流水线详解

一篇 Markdown 文章到公众号草稿，经历以下步骤：

#### 步骤 1：Markdown 解析（markdown.ts）

使用 [marked](https://github.com/markedjs/marked) 作为解析器，并自定义了两个关键渲染器：

- **listitem 渲染器**：marked 默认会在列表项内包裹 `<p>` 标签，导致微信渲染时出现额外间距和多余符号。我们直接去掉 `<p>` 包裹，输出纯净的 `<li>内容</li>`。
- **code 渲染器**：使用 highlight.js 做语法高亮后，**逐行用 `<section>` 块级元素包裹**，每行都带 `white-space:pre-wrap; word-break:break-word` 内联样式。这是解决手机端代码块不换行的关键——不依赖微信可能过滤的 CSS 属性，而是在 HTML 结构层面强制每行一个块。

```
原始代码:
function hello() {
  console.log("hi");
}

解析后伪结构:
<pre><code class="hljs">
  <section style="display:block;white-space:pre-wrap;...">function hello() {</section>
  <section style="display:block;white-space:pre-wrap;...">  console.log("hi");</section>
  <section style="display:block;white-space:pre-wrap;...">}</section>
</code></pre>
```

#### 步骤 2：CSS 内联（renderer.ts + juice）

微信公众号编辑器**不支持 `<style>` 标签**，所有 CSS 必须以内联 `style` 属性的形式写在每个元素上。

我们使用 [juice](https://github.com/Automattic/juice) 库将主题 CSS 和 hljs 样式全部内联到 HTML 元素上。

例如，主题 CSS 写的 `.wechat-article h1 { color: #07c160; }`，经过 juice 处理后，每个 `<h1>` 标签都会变成 `<h1 style="color:#07c160;">`。

#### 步骤 3：后处理与清洗（renderer.ts + cheerio）

使用 [cheerio](https://github.com/cheeriojs/cheerio)（Node.js 版 jQuery）对 HTML 做最终处理：

- 再次确保 `<pre>` 和 `<section>` 代码行有正确的换行样式（防御性处理）
- 移除空的列表项（可能产生多余圆点）
- 解开列表项中残留的 `<p>` 标签
- 移除 `<script>`、`<iframe>`、`<style>`、`<form>` 等危险标签
- 移除所有 `on*` 事件属性（防 XSS）
- 将指向 `mp.weixin.qq.com`、`weixin.qq.com` 的链接转为纯文本（微信会拦截指向自身域名的链接，报 45166 错误）

#### 步骤 4：图片上传（media.ts）

- 扫描 HTML 中所有 `<img>` 标签
- 本地图片（非 http/https/data: 开头）通过微信 `material/add_material` 接口上传为永久素材
- 网络图片（http/https 开头）支持直接通过URL下载后上传（封面图）
- 上传成功后获取微信 CDN URL（`https://mmbiz.qpic.cn/...`）
- 替换 HTML 中所有本地路径为微信 URL

#### 步骤 5：封面上传与草稿创建（draft.ts）

封面按以下优先级自动选择：
1. 用户手动选择的本地文件
2. 用户手动输入的URL封面
3. Front Matter 中的 `cover` 字段（支持本地路径和在线URL）
4. **自动检测正文第一张图片**（支持本地和网络图片）
5. 项目默认封面 `cover/cover.jpeg` 作为兜底

封面图片（thumb类型）通过 `material/add_material?type=thumb` 接口上传，获取 `thumb_media_id`。网络URL封面会先下载到临时目录，上传后自动清理。

最后调用 `/draft/add` 接口创建草稿，传入 articles 数组包含 title/author/digest/content/thumb_media_id。

### 2.3 为什么代码块用 `<section>` 而不是 `<span>`？

这是经过多次踩坑得出的结论：

| 方案 | 问题 |
|------|------|
| `white-space: pre` + `overflow-x:auto` | 微信移动端 WebView 不支持横向滚动，内容被截断 |
| `<span style="display:block">` 包裹每行 | 部分安卓微信内核下 inline 元素转 block 渲染不稳定 |
| `word-break: break-all` | 太激进，会在 `/`、`→`、中文标点处随意断行 |
| `<section>` 块级元素 + `word-break: break-word` ✅ | 原生块级元素稳定，只在超长单词处断行 |

### 2.4 配置存储

配置文件保存在项目根目录下的 `.md2wechat/` 文件夹中：
- **配置文件路径**：`<项目目录>/.md2wechat/config.json`
- 该目录已加入 `.gitignore`，不会被提交到代码仓库

内容示例：
```json
{
  "wechat": {
    "appId": "wx353d973b...",
    "appSecret": "103608a02c65cd649bf4d..."
  },
  "theme": "default"
}
```

AppSecret 以明文存储（本地工具，无服务端传输），请妥善保管本地配置文件。

> 💡 **兼容旧版本**：如果检测到用户主目录下（`~/.md2wechat/config.json`）有旧配置，会自动迁移到项目目录下。

---

## 3. 安装与配置

### 3.1 环境准备

1. **安装 Node.js**：前往 https://nodejs.org 下载 LTS 版本（≥16），安装时勾选"Add to PATH"
2. **注册微信公众号**：
   - 个人使用可注册订阅号（免费），推荐认证以获得完整接口权限
   - 地址：https://mp.weixin.qq.com
3. **获取开发者凭证**：
   - 登录公众平台 → 开发 → 基本配置
   - 记录 AppID 和 AppSecret
4. **配置 IP 白名单**：
   - 在同一页面，找到"IP白名单"，点击"修改"
   - 添加你的服务器/本机出口 IP（访问 https://ip.cn 查看）
   - ⚠️ IP 变更后需重新添加，否则会报 `40164 invalid ip` 错误

### 3.2 安装 md2wechat

```bash
# 克隆或下载代码
git clone https://github.com/jiabao-wang/md2wechat-free.git
cd md2wechat-free

# 安装依赖
npm install

# 构建 TypeScript
npm run build

# （可选）全局链接，之后可在任意目录使用 md2wechat 命令
npm link
```

### 3.3 配置凭证

**方式一：命令行**
```bash
md2wechat config wx你的AppID 你的AppSecret
# 同时设置默认主题
md2wechat config wx你的AppID 你的AppSecret --theme github
```

**方式二：Web 界面**
```bash
md2wechat web
```
打开 http://localhost:3000 后点击右上角⚙️设置按钮，填入 AppID 和 AppSecret，保存。

---

## 4. 可视化 Web 界面使用指南

### 4.1 启动

```bash
md2wechat web                # 默认端口 3000，自动打开浏览器
md2wechat web -p 8080        # 指定端口
md2wechat web --no-open      # 不自动打开浏览器
```

开发模式（修改代码后自动编译，需另开终端运行 `tsc -w`）：
```bash
npm run dev -- web
```

### 4.2 界面布局

```
┌─────────────────────────────────────────────────────────┐
│ 📝 md2wechat [主题名]  ⚙️设置  👁️刷新预览  🚀发布草稿   │
├──────────────┬──────────────────────────────────────────┤
│ 📄 文章信息  │  [✏️编辑] [👁️预览] [📑分屏] [📦批量发布]  │
│  标题        ├──────────────────────────────────────────┤
│  作者        │                                          │
│  摘要        │                                          │
│              │            编辑/预览区                    │
│ 🎨 主题选择  │                                          │
│  [下拉选择]   │                                          │
│              │                                          │
│ 📁 文件操作  │                                          │
│  导入 MD     │                                          │
│  封面图片    │                                          │
│              │                                          │
│ ℹ️ 状态      │                                          │
│  配置状态    │                                          │
│  图片数      │                                          │
│  字数        │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### 4.3 单篇发布流程

1. **写内容**：在编辑区直接输入 Markdown，或点击"📎 点击选择 .md 文件"导入本地文件
2. **填信息**：在左侧栏填写标题、作者、摘要（留空则取 frontmatter 或一级标题）
3. **选主题**：在"🎨 主题选择"下拉框选择喜欢的主题
4. **选封面**（三种方式，任选其一或留空自动检测）：
   - 点击"🖼️ 点击选择封面图"上传本地图片
   - 在"或粘贴图片URL"输入框粘贴网络图片链接
   - 勾选"无封面时自动使用正文第一张图片"（默认开启），无需手动设置
5. **预览**：切换到"👁️预览"或"📑分屏"查看效果，封面预览区会显示当前选中的封面及来源
6. **发布**：点击右上角"🚀 发布草稿"，等待提示成功
7. **去公众平台**：登录微信公众平台 → 草稿箱，即可看到文章，可编辑或群发

### 4.4 实时预览

编辑时会自动防抖 600ms 后刷新预览。也可以点击右上角"👁️ 刷新预览"立即刷新。

---

## 5. 命令行使用指南

### 5.1 常用命令

```bash
# 查看帮助
md2wechat --help

# 查看版本
md2wechat --version
```

### 5.2 转换（不发布）

```bash
# 浏览器预览
md2wechat convert article.md --preview

# 输出 HTML 文件
md2wechat convert article.md -o output.html

# 指定主题
md2wechat convert article.md -t github -o output.html
```

### 5.3 发布到草稿箱

```bash
# 最简方式（使用 frontmatter 中的配置，无封面则用默认封面）
md2wechat convert article.md --draft

# 指定封面和主题
md2wechat convert article.md --draft -c ./cover.jpg -t cyberpunk
```

### 5.4 查看元信息

```bash
md2wechat inspect article.md
# 输出：标题、作者、主题、图片列表等信息
```

### 5.5 查看可用主题

```bash
md2wechat themes
```

### 5.6 在 npm scripts 中使用

未全局安装时：
```bash
# 方式一：ts-node 开发模式
npm run dev -- convert article.md --draft

# 方式二：先 build 再运行
npm run build
node dist/cli/index.js convert article.md --draft
```

---

## 6. 主题系统

### 6.1 主题列表

| ID | 名称 | 适合场景 |
|----|------|---------|
| `default` | 默认绿 | 通用，微信绿品牌色 |
| `elegant` | 优雅红 | 情感、观点、生活类 |
| `tech` | 科技蓝 | 技术、产品、商业分析 |
| `ft` | 金融时报 | 财经、评论、深度报道 |
| `nyt` | 纽约时报 | 新闻、时事、严肃阅读 |
| `github` | GitHub | 技术教程、开源项目介绍 |
| `claude` | Claude | AI、温和配色、长文阅读 |
| `academic` | 学术论文 | 学术、论文笔记、研究报告 |
| `glass` | 激光玻璃 | 科技、未来感、设计类 |
| `gold` | 轻奢金 | 品牌、奢侈品、生活美学 |
| `cyberpunk` | 赛博朋克 | 极客、游戏、亚文化 |

### 6.2 主题选择优先级

封面/主题的选择优先级（高→低）：
1. 命令行参数 `-t <theme>` / Web界面下拉选择
2. Markdown 文件 frontmatter 中的 `theme` 字段
3. 配置文件中的默认主题
4. `default`（默认绿）

---

## 7. Front Matter 元信息

在 Markdown 文件最顶部用 `---` 包裹 YAML 格式的元信息：

```markdown
---
title: 我的第一篇文章
author: 张三
digest: 这是文章的摘要，会显示在公众号分享卡片上
theme: github
cover: ./images/cover.jpg
---

# 正文标题

这里是正文内容...
```

### 支持的字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `title` | 文章标题 | `title: 如何学习 TypeScript` |
| `author` | 作者名 | `author: 技术小编` |
| `digest` | 文章摘要（120字以内最佳） | `digest: 一篇入门指南` |
| `theme` | 主题ID | `theme: github` |
| `cover` | 封面图片路径或URL | `cover: ./cover.jpg` 或 `cover: https://example.com/cover.jpg` |

> **封面选择优先级**（高→低）：手动选择本地文件 > 手动输入URL > Front Matter cover字段 > 自动检测正文第一张图 > 项目默认封面。批量发布时本地路径封面可正常使用（后端读取文件），会自动标记为"文章"来源。

---

## 8. 批量发布

### 8.1 使用场景

- 博客从其他平台迁移到公众号（几十上百篇文章）
- 系列文章一次性发布
- 定期批量生成内容草稿

### 8.2 操作步骤

1. 启动 Web 界面：`md2wechat web`
2. 切换到"📦 批量发布"标签
3. 点击"📂 选择目录"选择包含 Markdown 文件的文件夹（会递归扫描所有 `.md/.markdown/.txt`）
   - 或点击"📄 选择文件"手动多选文件
4. 设置顶部的"默认作者"和"默认主题"
5. 检查每个文件卡片：
   - 可单独修改标题、作者、主题
   - 封面缩略图显示当前封面来源标签：
     - 🔵 **自动**：检测到正文第一张图片（本地或URL），将自动使用
     - 🟣 **文章**：Front Matter 中指定的封面
     - 🟢 **本地**：手动选择的本地文件
     - 🟠 **URL**：手动输入的网络图片URL
     - ⚪ **默认**：未检测到图片，使用项目默认封面
   - 点击封面缩略图可选择本地文件，在"封面URL"输入框可粘贴网络图片链接
   - 点击右上角 X 可从列表中移除该文件
6. 点击"🚀 开始批量发布"
7. 观察进度条：
   - 每个文件状态实时更新（等待中 → 上传中 → ✅成功 / ❌失败）
   - 失败项会显示错误信息和"🔄 重试"按钮
8. 全部完成后查看汇总：成功X篇，失败Y篇

### 8.3 批量发布注意事项

- **速率限制**：微信 API 有调用频率限制，工具已做串行处理（不并发），但大量文件时如果遇到 `45009`（频率超限）错误，请稍等几分钟后重试失败项
- **封面大小**：微信封面图建议尺寸 900×383 像素，大小不超过 5MB，支持 JPG/PNG
- **图片数量**：每篇文章正文中的图片数量无严格限制，但每张图片上传都是一次 API 调用，图片多的文章耗时较长
- **失败重试**：点击失败项的"🔄 重试"按钮只会重新上传该文件，不会影响其他已完成的文章

---

## 9. 自定义主题开发

### 9.1 创建主题文件

在项目根目录创建 `themes/` 文件夹（与 `src/`、`public/` 同级），放入 `.css` 文件，文件名即为主题 ID。

例如创建 `themes/mytheme.css`：

```css
/* 基础样式继承，可覆盖以下变量 */
.wechat-article {
  color: #333;
  font-size: 16px;
}

/* 一级标题 */
.wechat-article h1 {
  font-size: 22px;
  color: #1a1a1a;
  border-bottom: 2px solid #your-color;
  padding-bottom: 10px;
}

/* 二级标题 */
.wechat-article h2 {
  font-size: 19px;
  color: #your-color;
  border-left: 4px solid #your-color;
  padding-left: 10px;
}

/* 引用块 */
.wechat-article blockquote {
  border-left-color: #your-color;
  background: #your-bg;
}

/* 代码块 */
.wechat-article pre {
  background: #1e1e1e;
}
.wechat-article pre code {
  color: #d4d4d4;
}

/* 链接 */
.wechat-article a {
  color: #your-color;
}

/* 加粗 */
.wechat-article strong {
  color: #your-color;
}
```

### 9.2 主题选择器

CSS 必须以 `.wechat-article` 作为根选择器，所有元素样式都在其作用域下。重启 Web 服务后即可在主题下拉框中看到你的自定义主题。

### 9.3 代码高亮配色

代码块的语法高亮颜色遵循 hljs 的类名（如 `.hljs-keyword`、`.hljs-string` 等）。如果需要自定义代码配色，可以参考 [highlight.js 主题](https://github.com/highlightjs/highlight.js/tree/main/src/styles) 覆写对应的 `.hljs-*` 类。

---

## 10. 常见问题排查

### 10.1 配置相关

**Q: 提示"请先配置微信公众号 AppID 和 AppSecret"**
→ 运行 `md2wechat config <appid> <secret>` 或在 Web 界面设置中配置。

**Q: 报错 40164 "invalid ip"**
→ 你的 IP 不在白名单中。登录公众平台 → 开发 → 基本配置 → IP白名单，添加当前 IP。

**Q: 报错 40001 "invalid credential" / 40013 "invalid appid"**
→ AppID 或 AppSecret 填写错误，请重新检查。注意不要有多余空格。

### 10.2 发布相关

**Q: 报错 45166 "invalid content hint"**
→ 内容被微信安全拦截。常见原因：
- CSS 没有正确内联（工具已自动处理）
- 包含指向 `mp.weixin.qq.com` 的链接（工具已自动转为纯文本）
- 包含 `<script>`/`<iframe>` 等标签（工具已自动移除）
- 正文内容为空或过少

**Q: 报错 45009 "reach max api daily quota limit" / 频率超限**
→ 当天 API 调用次数超限，或短时间内请求过于频繁。等待 24 小时后重试，或降低批量发布速度。

**Q: 报错 40004 "invalid media type"（封面上传失败）**
→ 封面图片格式不支持或文件过大。使用 JPG/PNG，小于 5MB。

### 10.3 显示相关

**Q: 手机端代码块不换行或乱码**
→ 确保使用最新版本。本工具从 HTML 结构层面（`<section>` 逐行包裹）解决了此问题，不依赖可能被微信过滤的 CSS。

**Q: 列表项出现多余圆点"●"**
→ 已修复。旧版本 marked 输出 `<li><p>text</p></li>` 会导致额外符号，新版自定义 listitem 渲染器已移除 `<p>`。

**Q: 代码中的 `/` 被单独断行**
→ 已修复。之前使用 `word-break: break-all` 会在任意字符处断行，现已改为 `word-break: break-word`，只在真正超长的连续字符处断行。

**Q: 暗色主题在公众号中显示白边**
→ 已修复。暗色主题不再给 `.wechat-article` 根元素设置背景色（微信内容区背景固定为白色），仅对代码块等局部元素使用暗色背景。

### 10.4 图片相关

**Q: 本地图片上传失败**
→ 检查图片路径是否正确（相对路径相对于 Markdown 文件所在目录）；图片不能过大（建议单张 < 5MB）；网络图片（http/https开头）不需要上传，直接保留原链接。

**Q: 发布后图片不显示**
→ 微信素材图片 URL 有防盗链，只能在微信生态内（公众号、朋友圈等）显示，在外部浏览器直接打开可能看不到，这是正常现象。

### 10.5 重置配置

如需重新配置，删除配置文件即可：
- 直接在项目目录下删除 `.md2wechat/config.json` 文件夹
- 或在命令行执行：
  - Windows: `rmdir /s /q .md2wechat`（在项目根目录下）
  - macOS/Linux: `rm -rf .md2wechat/`（在项目根目录下）
