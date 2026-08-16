import axios, { AxiosInstance } from 'axios';
import { NotionConfig } from '../types';

export interface NotionArticleSummary {
  pageId: string;
  url: string;
  title: string;
  status: string;
  summary: string;
  author: string;
  category: string;
  coverUrl?: string;
  tags: string[];
  publishedDate?: string;
  lastEditedTime: string;
}

export interface NotionArticle extends NotionArticleSummary {
  markdown: string;
  firstImageUrl?: string;
  unsupportedBlocks: string[];
}

function plainText(items: any[] = []): string {
  return items.map(item => item.plain_text || item.text?.content || '').join('');
}

function richText(items: any[] = []): string {
  return items.map((item, index) => {
    let text = item.plain_text || item.text?.content || '';
    const href = item.href || item.text?.link?.url;
    if (item.type === 'equation') text = `$${item.equation?.expression || ''}$`;
    const leading = text.match(/^\s*/)?.[0] || '';
    const trailing = text.match(/\s*$/)?.[0] || '';
    const core = text.slice(leading.length, text.length - trailing.length || undefined);
    if (item.annotations?.code) text = `${leading}\`${core.replace(/`/g, '\\`')}\`${trailing}`;
    else {
      text = core;
      if (item.annotations?.bold) text = `**${text}**`;
      if (item.annotations?.italic) text = `*${text}*`;
      if (item.annotations?.strikethrough) text = `~~${text}~~`;
      text = leading + text + trailing;
    }
    if (href) text = `[${text}](${href})`;
    const nextText = items[index + 1]?.plain_text || items[index + 1]?.text?.content || '';
    if ((item.annotations?.bold || item.annotations?.italic || item.annotations?.strikethrough)
      && !/\s$/.test(text) && nextText && !/^\s/.test(nextText)) text += ' ';
    return text;
  }).join('');
}

function asBlockquote(content: string): string {
  return content.split('\n').map(line => line ? `> ${line}` : '>').join('\n');
}

function fileUrl(file: any): string | undefined {
  if (!file) return undefined;
  if (file.type === 'file') return file.file?.url;
  if (file.type === 'external') return file.external?.url;
  return file.file?.url || file.external?.url;
}

function propText(property: any): string {
  if (!property) return '';
  if (property.type === 'title') return plainText(property.title);
  if (property.type === 'rich_text') return plainText(property.rich_text);
  return '';
}

function pageSummary(page: any): NotionArticleSummary {
  const p = page.properties || {};
  return {
    pageId: page.id,
    url: page.url,
    title: propText(p.Title) || 'Untitled',
    status: p.Status?.select?.name || '',
    summary: propText(p.Summary),
    author: propText(p.Author),
    category: p.Category?.select?.name || '',
    coverUrl: fileUrl(p.Cover?.files?.[0]) || fileUrl(page.cover),
    tags: (p.Tags?.multi_select || []).map((item: any) => item.name),
    publishedDate: p['Published Date']?.date?.start,
    lastEditedTime: page.last_edited_time || '',
  };
}

export class NotionClient {
  private http: AxiosInstance;
  private dataSourceId: string;

  constructor(config: NotionConfig) {
    this.dataSourceId = config.dataSourceId.replace(/^collection:\/\//, '');
    this.http = axios.create({
      baseURL: 'https://api.notion.com/v1',
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Notion-Version': '2026-03-11',
        'Content-Type': 'application/json',
      },
    });
  }

  private async request<T>(method: 'get' | 'post', url: string, data?: any): Promise<T> {
    const maxAttempts = 4;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.http.request<T>({ method, url, data });
        return response.data;
      } catch (error: any) {
        const status = Number(error.response?.status || 0);
        const code = String(error.code || '');
        const retryable = ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'EAI_AGAIN'].includes(code)
          || status === 429 || status >= 500;
        if (!retryable || attempt === maxAttempts) {
          const message = error.response?.data?.message || error.message;
          throw new Error(`Notion API: ${message}`);
        }
        const retryAfter = Number(error.response?.headers?.['retry-after'] || 0) * 1000;
        const delay = retryAfter || Math.min(500 * (2 ** (attempt - 1)), 4000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Notion API: request failed');
  }

  async listArticles(options: { query?: string; category?: string; status?: string; cursor?: string; pageSize?: number } = {}) {
    const filters: any[] = [
      { property: 'type', select: { equals: 'Post' } },
    ];
    if (options.status) filters.push({ property: 'Status', select: { equals: options.status } });
    if (options.category) filters.push({ property: 'Category', select: { equals: options.category } });
    if (options.query?.trim()) filters.push({ property: 'Title', title: { contains: options.query.trim() } });
    const body: any = {
      page_size: Math.min(Math.max(options.pageSize || 10, 1), 100),
      filter: filters.length === 1 ? filters[0] : { and: filters },
      sorts: [
        { property: 'Published Date', direction: 'descending' },
        { timestamp: 'last_edited_time', direction: 'descending' },
      ],
    };
    if (options.cursor) body.start_cursor = options.cursor;
    const result: any = await this.request('post', `/data_sources/${this.dataSourceId}/query`, body);
    const articles = (result.results || []).map(pageSummary);
    return { articles, hasMore: result.has_more === true, nextCursor: result.next_cursor || null };
  }

  async retrievePage(pageId: string): Promise<any> {
    return this.request('get', `/pages/${pageId}`);
  }

  private async listChildren(blockId: string): Promise<any[]> {
    const blocks: any[] = [];
    let cursor: string | undefined;
    do {
      const suffix = cursor ? `?page_size=100&start_cursor=${encodeURIComponent(cursor)}` : '?page_size=100';
      const result: any = await this.request('get', `/blocks/${blockId}/children${suffix}`);
      blocks.push(...(result.results || []));
      cursor = result.has_more ? result.next_cursor : undefined;
    } while (cursor);
    return blocks;
  }

  private async blockToMarkdown(block: any, unsupported: Set<string>, depth = 0): Promise<string> {
    const value = block[block.type] || {};
    const text = richText(value.rich_text || value.caption || []);
    const children = block.has_children ? await this.blocksToMarkdown(block.id, unsupported, depth + 1) : '';
    switch (block.type) {
      case 'paragraph': return `${text}${children ? `\n${children}` : ''}`;
      case 'heading_1': return `# ${text}`;
      case 'heading_2': return `## ${text}`;
      case 'heading_3': return `### ${text}`;
      case 'bulleted_list_item': return `${'  '.repeat(depth)}- ${text}${children ? `\n${children}` : ''}`;
      case 'numbered_list_item': return `${'  '.repeat(depth)}1. ${text}${children ? `\n${children}` : ''}`;
      case 'to_do': return `${'  '.repeat(depth)}- [${value.checked ? 'x' : ' '}] ${text}${children ? `\n${children}` : ''}`;
      case 'quote': return asBlockquote([text, children].filter(Boolean).join('\n\n'));
      case 'callout': return asBlockquote([`${value.icon?.emoji || '💡'} ${text}`, children].filter(Boolean).join('\n\n'));
      case 'toggle': return `**${text}**${children ? `\n${children}` : ''}`;
      case 'code': return `\`\`\`${value.language || ''}\n${plainText(value.rich_text)}\n\`\`\``;
      case 'divider': return '---';
      case 'equation': return `$$\n${value.expression || ''}\n$$`;
      case 'image': {
        const url = fileUrl(value);
        return url ? `![${plainText(value.caption)}](${url})` : '';
      }
      case 'bookmark':
      case 'link_preview':
      case 'embed': return `> 🔗 [${text || value.url}](${value.url})`;
      case 'table': {
        if (!value.has_column_header) return children;
        const rows = children.split('\n\n');
        const columns = Math.max((rows[0]?.match(/\|/g) || []).length - 1, 1);
        rows.splice(1, 0, `| ${Array(columns).fill('---').join(' | ')} |`);
        return rows.join('\n');
      }
      case 'table_row': return `| ${(value.cells || []).map((cell: any[]) => richText(cell)).join(' | ')} |`;
      case 'column_list':
      case 'column':
      case 'synced_block': return children;
      case 'table_of_contents': return '';
      case 'child_page': return `## ${value.title || '子页面'}`;
      default:
        unsupported.add(block.type);
        return children || `> ⚠️ 暂不支持的 Notion 组件：${block.type}`;
    }
  }

  private async blocksToMarkdown(blockId: string, unsupported: Set<string>, depth = 0): Promise<string> {
    const blocks = await this.listChildren(blockId);
    const parts: string[] = [];
    for (const block of blocks) {
      const md = await this.blockToMarkdown(block, unsupported, depth);
      // Empty Notion paragraph blocks are layout placeholders. Do not carry
      // them into Markdown, where they can become extra lines in WeChat.
      if (md.trim()) parts.push(md.replace(/\s+$/, ''));
    }
    return parts.join('\n\n');
  }

  async getArticle(pageId: string): Promise<NotionArticle> {
    const page = await this.retrievePage(pageId);
    const summary = pageSummary(page);
    const unsupported = new Set<string>();
    const markdown = await this.blocksToMarkdown(page.id, unsupported);
    const firstImageUrl = markdown.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/)?.[1];
    return { ...summary, markdown, firstImageUrl, unsupportedBlocks: [...unsupported] };
  }
}
