import express from 'express';
import multer from 'multer';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Request, Response } from 'express';
import { loadConfig, saveConfig } from '../config';
import { parseMarkdown } from '../core/markdown';
import { renderArticle, replaceImageUrls, generatePreviewHtml, prepareForWeChat } from '../core/renderer';
import { getThemes } from '../core/themes';
import { WeChatClient } from '../wechat/client';
import { DraftManager } from '../wechat/draft';

const app = express();

const uploadDir = path.join(os.tmpdir(), 'md2wechat-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, uploadDir),
  filename: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    cb(null, `${name}_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/config', (_req: Request, res: Response) => {
  const config = loadConfig();
  res.json({
    success: true,
    data: {
      appId: config.wechat.appId,
      appSecret: config.wechat.appSecret ? '********' : '',
      hasSecret: !!config.wechat.appSecret,
      theme: config.theme,
    }
  });
});

app.post('/api/config', (req: Request, res: Response) => {
  try {
    const { appId, appSecret, theme } = req.body;
    const current = loadConfig();
    const updates: any = {};
    if (appId !== undefined || appSecret !== undefined) {
      updates.wechat = {
        appId: appId ?? current.wechat.appId,
        appSecret: (appSecret && appSecret !== '********') ? appSecret : current.wechat.appSecret,
      };
    }
    if (theme) updates.theme = theme;
    saveConfig(updates);
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/themes', (_req: Request, res: Response) => {
  const themes = getThemes().map(t => ({ id: t.id, name: t.name }));
  res.json({ success: true, data: themes });
});

app.post('/api/preview', (req: Request, res: Response) => {
  try {
    const { markdown, theme } = req.body;
    if (!markdown) {
      return res.json({ success: false, error: 'Markdown content required' });
    }
    const parsed = parseMarkdown(markdown);
    const themeId = theme || 'default';
    const rendered = renderArticle(parsed, themeId);
    const themes = getThemes();
    const selectedTheme = themes.find(t => t.id === themeId) || themes[0];
    const previewHtml = generatePreviewHtml(
      parsed.content,
      selectedTheme.css,
      parsed.meta.title
    );
    const firstImg = parsed.firstImage;
    res.json({
      success: true,
      data: {
        html: rendered.html,
        previewHtml,
        meta: rendered.meta,
        firstImage: firstImg ? {
          original: firstImg.originalUrl,
          isLocal: !!firstImg.localPath,
          localPath: firstImg.localPath,
          isUrl: /^https?:\/\//.test(firstImg.originalUrl),
        } : null,
        images: rendered.images.map(img => ({
          original: img.originalUrl,
          isLocal: !!img.localPath,
        })),
      }
    });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/upload/markdown', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.json({ success: false, error: 'No file uploaded' });
    }
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const parsed = parseMarkdown(content, path.dirname(req.file.path));
    const firstImg = parsed.firstImage;
    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        content,
        meta: parsed.meta,
        firstImage: firstImg ? {
          original: firstImg.originalUrl,
          isLocal: !!firstImg.localPath,
          localPath: firstImg.localPath,
          isUrl: /^https?:\/\//.test(firstImg.originalUrl),
        } : null,
      }
    });
    fs.unlinkSync(req.file.path);
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/upload/cover', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.json({ success: false, error: 'No file uploaded' });
    }
    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
      }
    });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/default-cover', (_req: Request, res: Response) => {
  const defaultCoverPath = path.resolve(__dirname, '..', '..', 'cover', 'cover.jpeg');
  if (fs.existsSync(defaultCoverPath)) {
    res.sendFile(defaultCoverPath);
  } else {
    res.status(404).json({ success: false, error: 'Default cover not found' });
  }
});

app.post('/api/publish', upload.fields([
  { name: 'cover', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    const { markdown, theme, title, author, digest, coverUrl, autoCover } = req.body;
    if (!markdown) {
      return res.json({ success: false, error: 'Markdown 内容不能为空' });
    }
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const config = loadConfig();
    if (!config.wechat.appId || !config.wechat.appSecret) {
      return res.json({ success: false, error: '请先配置微信公众号 AppID 和 AppSecret' });
    }

    const parsed = parseMarkdown(markdown || '');
    if (title) parsed.meta.title = title;
    if (author) parsed.meta.author = author;
    if (digest) parsed.meta.digest = digest;

    const themeId = theme || config.theme || 'default';
    const rendered = renderArticle(parsed, themeId);
    let finalHtml = rendered.html;

    const client = new WeChatClient(config.wechat);
    const draftManager = new DraftManager(client);
    const mediaManager = draftManager.getMediaManager();

    if (rendered.images.length > 0) {
      const urlMap = await mediaManager.uploadArticleImages(rendered.images);
      finalHtml = replaceImageUrls(finalHtml, urlMap);
    }

    const articleContent = prepareForWeChat(finalHtml);

    let coverPath: string | undefined;
    if (files && files.cover && files.cover[0]) {
      coverPath = files.cover[0].path;
    }

    let autoCoverImage: { localPath?: string; originalUrl: string } | undefined;
    if (autoCover !== 'false' && autoCover !== false && !coverPath && !coverUrl && !parsed.meta.cover) {
      const firstImg = parsed.firstImage;
      if (firstImg) {
        autoCoverImage = {
          originalUrl: firstImg.originalUrl,
          localPath: firstImg.localPath,
        };
      }
    }

    const result = await draftManager.createArticleDraft(
      articleContent,
      rendered.meta,
      coverPath,
      coverUrl || undefined,
      autoCoverImage
    );

    if (coverPath && fs.existsSync(coverPath)) {
      fs.unlinkSync(coverPath);
    }

    res.json({
      success: true,
      data: {
        mediaId: result.media_id,
        title: rendered.meta.title,
        usedCover: autoCoverImage ? 'auto' : (coverPath ? 'file' : (coverUrl ? 'url' : (parsed.meta.cover ? 'meta' : 'default'))),
      }
    });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

app.use(express.static(path.join(__dirname, '..', '..', 'public')));

export function startWebServer(port: number = 3000): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`\n  🚀 md2wechat Web UI 已启动`);
      console.log(`  📝 访问地址: http://localhost:${port}\n`);
      resolve();
    });
  });
}
