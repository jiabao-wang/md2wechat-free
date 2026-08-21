import * as fs from 'fs';
import * as path from 'path';
import { marked, Renderer } from 'marked';
import hljs from 'highlight.js';
import matter from 'gray-matter';
import * as cheerio from 'cheerio';
import { ParsedArticle, ArticleMeta, ImageRef } from '../types';

const renderer = new Renderer();

renderer.listitem = function(text: string, task: boolean, checked: boolean): string {
  let cleanText = text;
  if (/^<p>/.test(cleanText)) {
    cleanText = cleanText.replace(/^<p>/, '');
    const pCloseIdx = cleanText.indexOf('</p>');
    if (pCloseIdx !== -1) {
      cleanText = cleanText.substring(0, pCloseIdx) + cleanText.substring(pCloseIdx + 4);
    }
  }
  cleanText = cleanText.replace(/^\s+/, '').replace(/\s+$/, '');
  cleanText = cleanText.replace(/^<br\s*\/?>\s*/, '').replace(/\s*<br\s*\/?>$/, '');
  if (task) {
    const checkbox = `<span style="display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;border:1px solid #ccc;border-radius:3px;margin-right:6px;vertical-align:middle;font-size:12px;">${checked ? '✓' : ''}</span>`;
    return `<li style="list-style:none;">${checkbox}${cleanText}</li>`;
  }
  return `<li>${cleanText}</li>`;
};

renderer.list = function(body: string, ordered: boolean, start: number): string {
  const type = ordered ? 'ol' : 'ul';
  const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
  return `<${type}${startAttr}>${body}</${type}>`;
};

function highlightCode(code: string, lang: string): string {
  let highlighted: string;
  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(code, { language: lang }).value;
    } catch (_) {
      highlighted = hljs.highlightAuto(code).value;
    }
  } else {
    highlighted = hljs.highlightAuto(code).value;
  }
  return wrapCodeLines(highlighted);
}

function wrapCodeLines(highlightedHtml: string): string {
  const lines = highlightedHtml.split('\n');
  const wrappedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (i === lines.length - 1 && line.trim() === '') continue;
    if (line === '') {
      // Mars-Editor uses one block element per code line because WeChat can
      // split raw newlines inside <pre>. Keep an empty code line with nbsp,
      // never with <br>, so the draft HTML has no line-break tags at all.
      wrappedLines.push('<section style="display:block;line-height:1.6;min-height:1em;">&nbsp;</section>');
    } else {
      wrappedLines.push(`<section style="display:block;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;">${line}</section>`);
    }
  }
  return wrappedLines.join('');
}

renderer.code = function(code: string, lang: string | undefined, _isEscaped: boolean): string {
  const langClass = lang ? ` language-${lang}` : '';
  const highlighted = highlightCode(code, lang || '');
  return `<pre><code class="hljs${langClass}">${highlighted}</code></pre>`;
};

marked.setOptions({
  // Match the WeChat-tested behavior used by Mars-Editor: a single source
  // newline is a soft wrap, not a visual <br>. Paragraphs still require a
  // blank line, while explicit separators remain available through `---`.
  breaks: false,
  gfm: true,
  renderer: renderer,
} as any);

export function parseMarkdownFile(filePath: string): ParsedArticle {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseMarkdown(content, path.dirname(filePath));
}

export function parseMarkdown(content: string, baseDir: string = process.cwd()): ParsedArticle {
  const { data, content: markdownContent } = matter(content);
  const meta: ArticleMeta = {
    title: data.title || extractFirstHeading(markdownContent),
    author: data.author,
    digest: data.digest || data.summary,
    cover: data.cover,
    theme: data.theme,
  };

  const cleanedContent = collapseBlankLines(normalizeInlineEmphasis(markdownContent));
  const htmlContent = marked.parse(cleanedContent) as string;
  const images = extractImages(htmlContent, baseDir);

  return {
    meta,
    content: htmlContent,
    images,
    firstImage: images.length > 0 ? images[0] : undefined,
  };
}

function normalizeInlineEmphasis(markdown: string): string {
  if (!markdown.includes('**')) return markdown;
  return markdown
    // Notion bold fragments may include trailing whitespace. Markdown requires the
    // closing delimiter to touch the final non-space character.
    .replace(/\*\*([^*\n]*?\S)[\t ]+\*\*/g, '**$1** ')
    // CommonMark does not close emphasis when it is immediately followed by CJK or
    // an alphanumeric character. Preserve the intended label/value separation.
    .replace(/\*\*([^*\n]+)\*\*(?=[^\s\p{P}\p{S}])/gu, '**$1** ');
}

function collapseBlankLines(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let consecutiveBlank = 0;

  for (const line of lines) {
    const isBlank = line.trim() === '';

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      consecutiveBlank = 0;
      continue;
    }

    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    if (isBlank) {
      consecutiveBlank++;
      if (consecutiveBlank <= 1) {
        result.push(line);
      }
    } else {
      consecutiveBlank = 0;
      result.push(line);
    }
  }

  return result.join('\n');
}

function extractFirstHeading(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

function extractImages(html: string, baseDir: string): ImageRef[] {
  const $ = cheerio.load(html);
  const images: ImageRef[] = [];
  const seen = new Set<string>();

  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (!src || seen.has(src)) return;
    seen.add(src);

    const imageRef: ImageRef = {
      originalUrl: src,
    };

    if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
      imageRef.localPath = path.resolve(baseDir, src);
    }

    images.push(imageRef);
  });

  return images;
}
