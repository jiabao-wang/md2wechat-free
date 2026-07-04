import * as path from 'path';
import * as fs from 'fs';
import { WeChatClient } from './client';
import { MediaManager } from './media';
import { ArticleMeta } from '../types';

export interface DraftArticle {
  title: string;
  author?: string;
  digest?: string;
  content: string;
  content_source_url?: string;
  thumb_media_id: string;
  need_open_comment?: number;
  only_fans_can_comment?: number;
}

export class DraftManager {
  private client: WeChatClient;
  private media: MediaManager;

  constructor(client: WeChatClient) {
    this.client = client;
    this.media = new MediaManager(client);
  }

  getMediaManager(): MediaManager {
    return this.media;
  }

  async createDraft(article: DraftArticle): Promise<{ media_id: string }> {
    const result = await this.client.request<any>(
      'post',
      '/draft/add',
      {
        articles: [this.formatArticle(article)],
      }
    );
    return { media_id: result.media_id };
  }

  async createArticleDraft(
    htmlContent: string,
    meta: ArticleMeta,
    coverPath?: string,
    coverUrl?: string,
    autoCoverImage?: { localPath?: string; originalUrl: string }
  ): Promise<{ media_id: string }> {
    let thumbMediaId = '';

    const resolveLocalCover = (p: string): string => {
      return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    };

    if (coverPath) {
      const resolved = resolveLocalCover(coverPath);
      if (fs.existsSync(resolved)) {
        thumbMediaId = await this.media.uploadThumbImage(resolved);
      } else {
        throw new Error(`封面文件不存在: ${resolved}`);
      }
    } else if (coverUrl && /^https?:\/\//.test(coverUrl)) {
      thumbMediaId = await this.media.uploadThumbImageFromUrl(coverUrl);
    } else if (meta.cover) {
      if (/^https?:\/\//.test(meta.cover)) {
        thumbMediaId = await this.media.uploadThumbImageFromUrl(meta.cover);
      } else {
        const metaCoverPath = resolveLocalCover(meta.cover);
        if (fs.existsSync(metaCoverPath)) {
          thumbMediaId = await this.media.uploadThumbImage(metaCoverPath);
        }
      }
    } else if (autoCoverImage) {
      if (autoCoverImage.localPath && fs.existsSync(autoCoverImage.localPath)) {
        thumbMediaId = await this.media.uploadThumbImage(autoCoverImage.localPath);
      } else if (/^https?:\/\//.test(autoCoverImage.originalUrl)) {
        thumbMediaId = await this.media.uploadThumbImageFromUrl(autoCoverImage.originalUrl);
      }
    }

    if (!thumbMediaId) {
      const defaultCover = path.resolve(__dirname, '..', '..', 'cover', 'cover.jpeg');
      if (fs.existsSync(defaultCover)) {
        thumbMediaId = await this.media.uploadThumbImage(defaultCover);
      }
    }

    if (!thumbMediaId) {
      throw new Error('封面图片是必需的，请提供封面或在配置文件中设置。');
    }

    const article: DraftArticle = {
      title: meta.title || 'Untitled',
      author: meta.author || '',
      digest: meta.digest || '',
      content: htmlContent,
      thumb_media_id: thumbMediaId,
      need_open_comment: 0,
      only_fans_can_comment: 0,
    };

    return this.createDraft(article);
  }

  private formatArticle(article: DraftArticle): any {
    return {
      title: article.title,
      author: article.author || '',
      digest: article.digest || '',
      content: article.content,
      content_source_url: article.content_source_url || '',
      thumb_media_id: article.thumb_media_id,
      need_open_comment: article.need_open_comment || 0,
      only_fans_can_comment: article.only_fans_can_comment || 0,
    };
  }
}
