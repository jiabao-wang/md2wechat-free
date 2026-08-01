export interface WeChatConfig {
  appId: string;
  appSecret: string;
}

export interface NotionConfig {
  token: string;
  dataSourceId: string;
  databaseId?: string;
}

export interface AppConfig {
  wechat: WeChatConfig;
  notion?: NotionConfig;
  theme: string;
  outputDir: string;
}

export interface ArticleMeta {
  title?: string;
  author?: string;
  digest?: string;
  cover?: string;
  theme?: string;
}

export interface ParsedArticle {
  meta: ArticleMeta;
  content: string;
  images: ImageRef[];
  firstImage?: ImageRef;
}

export interface ImageRef {
  originalUrl: string;
  localPath?: string;
  wechatUrl?: string;
  mediaId?: string;
}

export interface RenderedArticle {
  html: string;
  meta: ArticleMeta;
  images: ImageRef[];
}

export interface UploadedImage {
  mediaId: string;
  url: string;
}

export interface DraftResult {
  mediaId: string;
  draftId?: string;
}

export interface Theme {
  id: string;
  name: string;
  css: string;
}

export interface CliResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
