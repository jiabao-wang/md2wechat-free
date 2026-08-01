import * as cheerio from 'cheerio';
import juice from 'juice';
import { RenderedArticle, ParsedArticle, ImageRef } from '../types';
import { getTheme } from './themes';

const hljsCss = `
.hljs{display:block;overflow-x:auto;padding:0;background:transparent;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;color:#abb2bf;}
.hljs-comment,.hljs-quote{color:#5c6370;font-style:italic;}
.hljs-doctag,.hljs-keyword,.hljs-formula{color:#c678dd;}
.hljs-section,.hljs-name,.hljs-selector-tag,.hljs-deletion,.hljs-subst{color:#e06c75;}
.hljs-literal{color:#56b6c2;}
.hljs-string,.hljs-regexp,.hljs-addition,.hljs-attribute,.hljs-meta-string{color:#98c379;}
.hljs-built_in,.hljs-class .hljs-title{color:#e6c07b;}
.hljs-attr,.hljs-variable,.hljs-template-variable,.hljs-type,.hljs-selector-class,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-number{color:#d19a66;}
.hljs-symbol,.hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-title{color:#61aeee;}
.hljs-emphasis{font-style:italic;}
.hljs-strong{font-weight:bold;}
.hljs-link{text-decoration:underline;}
`;

const BLOCKED_DOMAINS = [
  'mp.weixin.qq.com',
  'weixin.qq.com',
  'support.weixin.qq.com',
];

export function renderArticle(parsed: ParsedArticle, themeId?: string): RenderedArticle {
  const theme = getTheme(themeId || parsed.meta.theme || 'default');

  const wrappedContent = wrapContent(parsed.content);
  const fullHtml = buildFullDocument(wrappedContent, theme.css + hljsCss);
  const inlinedHtml = juice(fullHtml, { removeStyleTags: true, applyStyleTags: true, inlinePseudoElements: false });
  let articleContent = extractArticleContent(inlinedHtml);
  articleContent = postProcessHtml(articleContent);
  articleContent = sanitizeForWeChat(articleContent);

  const images: ImageRef[] = parsed.images.map(img => ({ ...img }));

  return {
    html: articleContent,
    meta: parsed.meta,
    images,
  };
}

export function replaceImageUrls(html: string, imageMap: Map<string, string>): string {
  const $ = cheerio.load(html);
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && imageMap.has(src)) {
      $(el).attr('src', imageMap.get(src)!);
    }
  });
  return $('body').html() || $.html();
}

export function generatePreviewHtml(articleHtml: string, themeCss: string, title?: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'WeChat Article'}</title>
  <style>
    *{box-sizing:border-box;}
    body{margin:0;padding:40px 20px;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
    .preview-container{max-width:677px;margin:0 auto;background:#fff;padding:30px;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.08);}
    .wechat-article pre{white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;}
    .wechat-article pre code section{display:block;}
    ${themeCss}
    ${hljsCss}
  </style>
</head>
<body>
  <div class="preview-container">
    <article class="wechat-article">${articleHtml}</article>
  </div>
</body>
</html>`;
}

function wrapContent(content: string): string {
  return `<section class="wechat-article">${content}</section>`;
}

function buildFullDocument(content: string, css: string): string {
  return `<!DOCTYPE html>
<html><head><style>${css}</style></head><body>${content}</body></html>`;
}

function extractArticleContent(inlinedHtml: string): string {
  const $ = cheerio.load(inlinedHtml);
  return $('.wechat-article').html() || $('body').html() || inlinedHtml;
}

const CODE_BREAK_STYLE = 'white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;';

function postProcessHtml(html: string): string {
  const $ = cheerio.load(`<div id="wc-post">${html}</div>`);

  $('pre').each((_, el) => {
    const $pre = $(el);
    let style = $pre.attr('style') || '';
    if (!/white-space/i.test(style)) {
      style += CODE_BREAK_STYLE + 'overflow:hidden;';
    } else {
      style = style.replace(/word-break\s*:\s*break-all/gi, 'word-break:break-word');
      if (!/overflow-wrap/i.test(style)) style += 'overflow-wrap:break-word;';
    }
    $pre.attr('style', style);
  });

  $('pre code section').each((_, el) => {
    const $sec = $(el);
    let style = $sec.attr('style') || '';
    if (!/display\s*:/i.test(style)) style += 'display:block;';
    style = style.replace(/word-break\s*:\s*break-all/gi, 'word-break:break-word');
    if (!/white-space/i.test(style)) style += CODE_BREAK_STYLE;
    if (!/overflow-wrap/i.test(style)) style += 'overflow-wrap:break-word;';
    $sec.attr('style', style);
  });

  $('li').each((_, el) => {
    const $li = $(el);
    const text = $li.text().trim();
    if (text === '' && $li.find('img, input').length === 0) {
      $li.remove();
      return;
    }
    $li.find('> p').each((_, pEl) => {
      const $p = $(pEl);
      const pContent = $p.html();
      if (pContent) {
        $p.replaceWith(pContent);
      } else {
        $p.remove();
      }
    });
  });

  $('ul, ol').each((_, el) => {
    const $list = $(el);
    if ($list.find('> li').length === 0 && $list.find('ul, ol').length === 0) {
      $list.remove();
    }
  });

  $('script, style, iframe, form, input, button').remove();
  $('*').each((_, el) => {
    const attribs = (el as any).attribs || {};
    for (const attr of Object.keys(attribs)) {
      if (attr.startsWith('on')) $(el).removeAttr(attr);
    }
  });

  return $('#wc-post').html() || html;
}

function sanitizeForWeChat(html: string): string {
  const $ = cheerio.load(`<div id="wc-sanitize">${html}</div>`);

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (isBlockedLink(href)) {
      $(el).replaceWith($(el).text());
    }
  });

  return $('#wc-sanitize').html() || html;
}

function isBlockedLink(href: string): boolean {
  if (!href) return false;
  const lowerHref = href.toLowerCase();
  if (lowerHref.startsWith('javascript:')) return true;
  for (const domain of BLOCKED_DOMAINS) {
    if (lowerHref.includes(domain)) return true;
  }
  return false;
}

export function prepareForWeChat(html: string): string {
  return sanitizeForWeChat(html);
}
