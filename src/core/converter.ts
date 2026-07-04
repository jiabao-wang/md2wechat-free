import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseMarkdownFile } from './markdown';
import { renderArticle, replaceImageUrls, generatePreviewHtml, prepareForWeChat } from './renderer';
import { getTheme, getThemes } from './themes';
import { WeChatClient } from '../wechat/client';
import { DraftManager } from '../wechat/draft';
import { WeChatConfig, CliResult } from '../types';

export interface ConvertOptions {
  theme?: string;
  cover?: string;
  draft?: boolean;
  preview?: boolean;
  output?: string;
  uploadImages?: boolean;
}

export class MarkdownToWeChat {
  private wechatConfig?: WeChatConfig;
  private draftManager?: DraftManager;

  setWeChatConfig(config: WeChatConfig) {
    this.wechatConfig = config;
    const client = new WeChatClient(config);
    this.draftManager = new DraftManager(client);
  }

  listThemes() {
    return getThemes();
  }

  async convert(filePath: string, options: ConvertOptions = {}): Promise<CliResult<any>> {
    try {
      const parsed = parseMarkdownFile(filePath);
      const themeId = options.theme || parsed.meta.theme || 'default';
      const rendered = renderArticle(parsed, themeId);
      const theme = getTheme(themeId);

      let finalHtml = rendered.html;

      if (options.uploadImages || options.draft) {
        if (!this.draftManager) {
          return { success: false, error: 'WeChat configuration required for image upload' };
        }
        const mediaManager = this.draftManager.getMediaManager();
        const urlMap = await mediaManager.uploadArticleImages(rendered.images);
        finalHtml = replaceImageUrls(finalHtml, urlMap);
      }

      const articleContent = prepareForWeChat(finalHtml);

      if (options.preview || options.output) {
        const previewHtml = generatePreviewHtml(
          parsed.content,
          theme.css,
          rendered.meta.title
        );
        if (options.output) {
          this.saveHtml(previewHtml, options.output);
        } else {
          await this.previewHtml(previewHtml);
        }
      }

      if (options.draft) {
        if (!this.draftManager) {
          return { success: false, error: 'WeChat configuration required for draft creation' };
        }
        let coverUrl: string | undefined;
        let autoCoverImage: { localPath?: string; originalUrl: string } | undefined;
        if (options.cover && /^https?:\/\//.test(options.cover)) {
          coverUrl = options.cover;
        }
        if (!options.cover) {
          const firstImg = parsed.firstImage;
          if (firstImg) {
            autoCoverImage = {
              originalUrl: firstImg.originalUrl,
              localPath: firstImg.localPath,
            };
          }
        }
        const result = await this.draftManager.createArticleDraft(
          articleContent,
          rendered.meta,
          (options.cover && !coverUrl) ? options.cover : undefined,
          coverUrl,
          autoCoverImage
        );
        return {
          success: true,
          data: {
            mediaId: result.media_id,
            title: rendered.meta.title,
            images: rendered.images.length,
          },
        };
      }

      return {
        success: true,
        data: {
          html: articleContent,
          meta: rendered.meta,
          theme: theme.name,
          images: rendered.images,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async inspect(filePath: string): Promise<CliResult<any>> {
    try {
      const parsed = parseMarkdownFile(filePath);
      return {
        success: true,
        data: {
          title: parsed.meta.title,
          author: parsed.meta.author,
          digest: parsed.meta.digest,
          cover: parsed.meta.cover,
          theme: parsed.meta.theme,
          images: parsed.images.map(img => ({
            original: img.originalUrl,
            local: img.localPath,
            isLocal: !!img.localPath,
          })),
          imageCount: parsed.images.length,
          wordCount: parsed.content.replace(/<[^>]*>/g, '').length,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private saveHtml(html: string, outputPath: string) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, html, 'utf-8');
  }

  private async previewHtml(html: string) {
    const tempFile = path.join(os.tmpdir(), `md2wechat-preview-${Date.now()}.html`);
    fs.writeFileSync(tempFile, html, 'utf-8');
    const open = (await import('open')).default;
    await open(`file://${tempFile}`);
  }
}
