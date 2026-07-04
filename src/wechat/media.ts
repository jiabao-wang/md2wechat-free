import * as fs from 'fs';
import FormData from 'form-data';
import * as path from 'path';
import axios from 'axios';
import { WeChatClient } from './client';
import { UploadedImage, ImageRef } from '../types';

export class MediaManager {
  private client: WeChatClient;

  constructor(client: WeChatClient) {
    this.client = client;
  }

  async uploadImage(filePath: string): Promise<UploadedImage> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const token = await this.client.getAccessToken();
    const form = new FormData();
    form.append('media', fs.createReadStream(filePath));

    const response = await axios.post(
      'https://api.weixin.qq.com/cgi-bin/material/add_material',
      form,
      {
        params: {
          access_token: token,
          type: 'image',
        },
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (response.data.errcode && response.data.errcode !== 0) {
      throw new Error(`Upload failed: ${response.data.errmsg} (${response.data.errcode})`);
    }

    return {
      mediaId: response.data.media_id,
      url: response.data.url,
    };
  }

  async uploadImageFromUrl(imageUrl: string): Promise<UploadedImage> {
    const os = await import('os');
    const tempDir = path.join(os.tmpdir(), 'md2wechat');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const ext = path.extname(imageUrl) || '.jpg';
    const tempFile = path.join(tempDir, `img_${Date.now()}${ext}`);

    try {
      const response = await axios.get(imageUrl, { responseType: 'stream' });
      const writer = fs.createWriteStream(tempFile);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      return await this.uploadImage(tempFile);
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  async uploadArticleImages(images: ImageRef[]): Promise<Map<string, string>> {
    const urlMap = new Map<string, string>();

    for (const img of images) {
      try {
        let result: UploadedImage;
        if (img.localPath) {
          result = await this.uploadImage(img.localPath);
        } else if (img.originalUrl.startsWith('http')) {
          result = await this.uploadImageFromUrl(img.originalUrl);
        } else {
          continue;
        }

        img.wechatUrl = result.url;
        img.mediaId = result.mediaId;
        urlMap.set(img.originalUrl, result.url);
      } catch (err: any) {
        console.warn(`Warning: Failed to upload image ${img.originalUrl}: ${err.message}`);
      }
    }

    return urlMap;
  }

  async uploadThumbImage(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Cover file not found: ${filePath}`);
    }

    const token = await this.client.getAccessToken();
    const form = new FormData();
    form.append('media', fs.createReadStream(filePath));

    const response = await axios.post(
      'https://api.weixin.qq.com/cgi-bin/material/add_material',
      form,
      {
        params: {
          access_token: token,
          type: 'thumb',
        },
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (response.data.errcode && response.data.errcode !== 0) {
      throw new Error(`Thumb upload failed: ${response.data.errmsg} (${response.data.errcode})`);
    }

    return response.data.media_id;
  }

  async uploadThumbImageFromUrl(imageUrl: string): Promise<string> {
    const os = await import('os');
    const tempDir = path.join(os.tmpdir(), 'md2wechat');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    let ext = path.extname(imageUrl.split('?')[0]) || '.jpg';
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext.toLowerCase())) {
      ext = '.jpg';
    }
    const tempFile = path.join(tempDir, `thumb_${Date.now()}${ext}`);

    try {
      const response = await axios.get(imageUrl, {
        responseType: 'stream',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      const writer = fs.createWriteStream(tempFile);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      return await this.uploadThumbImage(tempFile);
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }
}
