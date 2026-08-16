import * as fs from 'fs';
import * as path from 'path';
import { Theme } from '../types';

const themesDir = path.join(__dirname, '..', '..', 'themes');

const defaultThemes: Theme[] = [
  { id: 'default', name: '默认绿', css: getDefaultThemeCSS() },
  { id: 'elegant', name: '优雅红', css: getElegantThemeCSS() },
  { id: 'tech', name: '科技蓝', css: getTechThemeCSS() },
  { id: 'ft', name: '金融时报', css: getFTThemeCSS() },
  { id: 'nyt', name: '纽约时报', css: getNYTThemeCSS() },
  { id: 'github', name: 'GitHub', css: getGithubThemeCSS() },
  { id: 'claude', name: 'Claude', css: getClaudeThemeCSS() },
  { id: 'academic', name: '学术论文', css: getAcademicThemeCSS() },
  { id: 'glass', name: '激光玻璃', css: getGlassThemeCSS() },
  { id: 'gold', name: '轻奢金', css: getGoldThemeCSS() },
  { id: 'cyberpunk', name: '赛博朋克', css: getCyberpunkThemeCSS() },
];

export function getThemes(): Theme[] {
  const userThemes = loadUserThemes();
  return [...defaultThemes, ...userThemes];
}

export function getTheme(id: string): Theme {
  const themes = getThemes();
  const theme = themes.find(t => t.id === id);
  if (!theme) return themes[0];
  return theme;
}

function loadUserThemes(): Theme[] {
  if (!fs.existsSync(themesDir)) return [];
  try {
    const files = fs.readdirSync(themesDir).filter(f => f.endsWith('.css'));
    return files.map(file => {
      const id = path.basename(file, '.css');
      const css = fs.readFileSync(path.join(themesDir, file), 'utf-8');
      return { id, name: id, css };
    });
  } catch {
    return [];
  }
}

function baseCSS(): string {
  return `
    .wechat-article{font-size:16px;line-height:1.8;color:#333;word-wrap:break-word;word-break:break-word;-webkit-text-size-adjust:100%;}
    .wechat-article *{box-sizing:border-box;}
    .wechat-article p{margin:0 0 0.8em;text-align:justify;}
    .wechat-article p+p{margin-top:0;}
    .wechat-article img{max-width:100%!important;display:block;margin:1.2em auto;height:auto!important;border-radius:4px;}
    .wechat-article blockquote{margin:1.2em 0;padding:12px 16px;background:#f7f7f7;border-left:4px solid #ddd;color:#666;}
    .wechat-article blockquote p{margin:0;}
    .wechat-article blockquote p+p{margin-top:0.5em;}
    .wechat-article pre{margin:1.2em 0;padding:16px;border-radius:6px;overflow:hidden;font-size:14px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;}
    .wechat-article pre code{font-family:'Consolas','Monaco','Courier New',monospace;font-size:13px;line-height:1.6;background:transparent;padding:0;display:block;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;}
    .wechat-article pre code section{display:block;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;}
    .wechat-article :not(pre)>code{font-family:'Consolas','Monaco','Courier New',monospace;font-size:14px;padding:2px 6px;border-radius:3px;word-break:break-word;}
    .wechat-article ul,.wechat-article ol{margin:1em 0;padding-left:1.6em;}
    .wechat-article ul{list-style:disc outside;}
    .wechat-article ol{list-style:decimal outside;}
    .wechat-article li{margin:0.4em 0;line-height:1.8;}
    .wechat-article li>p{margin:0;display:inline;}
    .wechat-article li>ul,.wechat-article li>ol{margin:0.3em 0;}
    .wechat-article a{color:#576b95;text-decoration:none;word-break:break-all;}
    .wechat-article strong{font-weight:bold;}
    .wechat-article em{font-style:italic;}
    .wechat-article h1{font-size:22px;font-weight:bold;margin:1.5em 0 0.8em;line-height:1.4;}
    .wechat-article h2{font-size:19px;font-weight:bold;margin:1.3em 0 0.7em;line-height:1.4;}
    .wechat-article h3{font-size:17px;font-weight:bold;margin:1.2em 0 0.6em;line-height:1.4;}
    .wechat-article h4,.wechat-article h5,.wechat-article h6{font-size:16px;font-weight:bold;margin:1em 0 0.5em;line-height:1.4;}
    .wechat-article hr{border:none;height:2px;background:#07c160;margin:1.4em 0;}
    .wechat-article table{width:100%!important;border-collapse:collapse;margin:1.2em 0;font-size:14px;display:block;overflow-x:auto;}
    .wechat-article th,.wechat-article td{border:1px solid #ddd;padding:8px 12px;text-align:left;}
    .wechat-article th{background:#f7f7f7;font-weight:bold;}
    .wechat-article .hljs{display:block;overflow-x:auto;padding:0;background:transparent;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;}
  `;
}

function getDefaultThemeCSS(): string {
  return baseCSS() + `
    .wechat-article{color:#333;}
    .wechat-article h1{font-size:22px;padding-bottom:10px;border-bottom:2px solid #07c160;}
    .wechat-article h2{padding-left:10px;border-left:4px solid #07c160;}
    .wechat-article blockquote{border-left-color:#07c160;background:#f6ffed;}
    .wechat-article pre{background:#282c34;}
    .wechat-article pre code{color:#abb2bf;}
    .wechat-article a{color:#07c160;}
    .wechat-article strong{color:#07c160;}
    .wechat-article hr{background:linear-gradient(90deg,transparent,#07c160,transparent);}
    .wechat-article :not(pre)>code{background:#fff7e6;color:#e96900;}
    .wechat-article th{background:#f6ffed;}
  `;
}

function getElegantThemeCSS(): string {
  return baseCSS() + `
    .wechat-article{color:#3f3f3f;font-family:Baskerville,'Times New Roman','PingFang SC',serif;letter-spacing:0.3px;line-height:2;}
    .wechat-article h1{font-size:22px;font-weight:600;margin:1.8em 0 1em;text-align:center;color:#2c3e50;}
    .wechat-article h2{font-size:18px;font-weight:600;margin:1.5em 0 0.8em;color:#2c3e50;padding-left:10px;border-left:4px solid #c0392b;}
    .wechat-article h3{font-size:16px;font-weight:600;color:#34495e;}
    .wechat-article p{text-indent:0;margin:0.9em 0;}
    .wechat-article img{border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.08);}
    .wechat-article blockquote{background:linear-gradient(135deg,#fdfbfb 0%,#ebedee 100%);border-left-color:#c0392b;border-radius:0 6px 6px 0;color:#555;font-style:italic;}
    .wechat-article pre{background:#1e1e1e;border-radius:8px;padding:18px;}
    .wechat-article pre code{color:#d4d4d4;}
    .wechat-article :not(pre)>code{background:#fff5f5;color:#c0392b;}
    .wechat-article a{color:#c0392b;border-bottom:1px solid #c0392b;}
    .wechat-article strong{font-weight:600;color:#c0392b;}
    .wechat-article hr{background:linear-gradient(90deg,transparent,#c0392b,transparent);}
  `;
}

function getTechThemeCSS(): string {
  return baseCSS() + `
    .wechat-article{color:#2c3e50;}
    .wechat-article h1{font-size:23px;font-weight:700;margin:1.5em 0 0.9em;color:#4f46e5;padding-bottom:8px;border-bottom:3px solid #4f46e5;}
    .wechat-article h2{font-size:18px;font-weight:600;margin:1.3em 0 0.7em;color:#4f46e5;padding-left:10px;border-left:5px solid #4f46e5;}
    .wechat-article h3{font-size:16px;font-weight:600;color:#7c3aed;}
    .wechat-article hr{background:linear-gradient(90deg,transparent,#4f46e5,#7c3aed,transparent);}
    .wechat-article blockquote{background:#f5f3ff;border-left-color:#4f46e5;border-radius:0 6px 6px 0;color:#4a5568;}
    .wechat-article pre{background:#1e1b4b;border-radius:8px;padding:18px;border:1px solid #4f46e530;}
    .wechat-article pre code{color:#c4b5fd;}
    .wechat-article :not(pre)>code{background:#ede9fe;color:#6d28d9;}
    .wechat-article ul li::marker{color:#4f46e5;}
    .wechat-article ol li::marker{color:#4f46e5;font-weight:bold;}
    .wechat-article a{color:#4f46e5;border-bottom:1px solid #4f46e540;}
    .wechat-article strong{font-weight:700;color:#4f46e5;}
    .wechat-article th{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-color:#4f46e5;}
    .wechat-article td{border-color:#e2e8f0;}
    .wechat-article tr:nth-child(even) td{background:#f8faff;}
  `;
}

function getFTThemeCSS(): string {
  return baseCSS() + `
    .wechat-article{color:#262a33;font-family:'Miller Daily','Times New Roman',Georgia,'Songti SC',serif;line-height:1.75;font-size:17px;}
    .wechat-article h1{font-family:'Financier Display','Times New Roman',serif;font-size:28px;font-weight:700;color:#990f3d;margin:1.2em 0 0.5em;line-height:1.2;letter-spacing:-0.5px;border-bottom:3px solid #990f3d;padding-bottom:10px;}
    .wechat-article h2{font-family:'Financier Display','Times New Roman',serif;font-size:22px;font-weight:700;color:#990f3d;margin:1.3em 0 0.5em;border-bottom:1px solid #e8dcc8;padding-bottom:6px;}
    .wechat-article h3{font-size:18px;font-weight:700;color:#262a33;text-transform:uppercase;letter-spacing:1px;}
    .wechat-article p{margin:0.9em 0;text-align:justify;}
    .wechat-article blockquote{background:#fdf6ec;border-left:4px solid #990f3d;color:#5a4a3a;font-family:'Times New Roman',serif;font-style:italic;border-radius:0;}
    .wechat-article pre{background:#262a33;border-radius:0;padding:16px;border-left:4px solid #990f3d;}
    .wechat-article pre code{color:#f5e6c8;}
    .wechat-article :not(pre)>code{background:#f3e8d2;color:#990f3d;font-family:Georgia,serif;}
    .wechat-article a{color:#990f3d;border-bottom:1px solid #990f3d;}
    .wechat-article strong{color:#990f3d;font-weight:700;}
    .wechat-article ul{list-style:square outside;}
    .wechat-article ul li::marker{color:#990f3d;}
    .wechat-article hr{border:none;background:#990f3d;height:2px;}
    .wechat-article th{background:#990f3d;color:#fff;}
  `;
}

function getNYTThemeCSS(): string {
  return baseCSS() + `
    .wechat-article{color:#121212;font-family:'Cheltenham','Georgia','Times New Roman',serif;line-height:1.8;font-size:17px;}
    .wechat-article h1{font-family:'Cheltenham',Georgia,serif;font-size:30px;font-weight:700;color:#121212;margin:0.8em 0 0.4em;line-height:1.15;font-style:italic;border-bottom:none;text-align:left;}
    .wechat-article h2{font-family:'Cheltenham',Georgia,serif;font-size:22px;font-weight:700;color:#121212;margin:1.4em 0 0.5em;border-bottom:1px solid #e2e2e2;padding-bottom:6px;}
    .wechat-article h3{font-size:17px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px;}
    .wechat-article p{margin:0.8em 0;text-align:justify;}
    .wechat-article blockquote{background:transparent;border-left:4px solid #121212;color:#333;font-size:18px;line-height:1.6;padding:4px 16px;font-style:italic;margin:1.5em 0;}
    .wechat-article pre{background:#121212;color:#e6e6e6;border-radius:3px;padding:18px;font-family:'Courier New',monospace;}
    .wechat-article pre code{color:#e6e6e6;}
    .wechat-article :not(pre)>code{background:#f0f0f0;color:#121212;font-family:'Courier New',monospace;}
    .wechat-article a{color:#326891;border-bottom:1px solid #326891;}
    .wechat-article strong{color:#121212;font-weight:700;}
    .wechat-article ul{list-style:disc outside;}
    .wechat-article hr{border:none;background:linear-gradient(90deg,transparent,#121212,transparent);height:1px;}
    .wechat-article th{background:#121212;color:#fff;}
    .wechat-article td{border-color:#ccc;}
  `;
}

function getGithubThemeCSS(): string {
  return baseCSS() + `
    .wechat-article{color:#24292f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.6;font-size:16px;}
    .wechat-article h1{font-size:2em;font-weight:600;border-bottom:1px solid #d0d7de;padding-bottom:0.3em;margin:1.2em 0 0.6em;}
    .wechat-article h2{font-size:1.5em;font-weight:600;border-bottom:1px solid #d0d7de;padding-bottom:0.3em;margin:1.2em 0 0.6em;}
    .wechat-article h3{font-size:1.25em;font-weight:600;}
    .wechat-article p{margin:1em 0;}
    .wechat-article blockquote{color:#57606a;border-left:0.25em solid #d0d7de;padding:0 1em;background:#f6f8fa;border-radius:0 6px 6px 0;}
    .wechat-article blockquote p{margin:0.8em 0;}
    .wechat-article pre{background:#f6f8fa;color:#24292f;border-radius:6px;padding:16px;font-size:85%;border:1px solid #d0d7de;}
    .wechat-article pre code{color:#24292f;}
    .wechat-article :not(pre)>code{background:rgba(175,184,193,0.2);color:#cf222e;border-radius:6px;padding:0.2em 0.4em;font-size:85%;}
    .wechat-article a{color:#0969da;text-decoration:underline;}
    .wechat-article strong{font-weight:600;color:#24292f;}
    .wechat-article ul,.wechat-article ol{padding-left:2em;}
    .wechat-article li{margin:0.25em 0;}
    .wechat-article img{background:#fff;}
    .wechat-article hr{height:0.25em;padding:0;margin:24px 0;background-color:#d0d7de;border:0;}
    .wechat-article table{display:table;border:1px solid #d0d7de;border-radius:6px;overflow:hidden;}
    .wechat-article th,.wechat-article td{padding:6px 13px;border:1px solid #d0d7de;}
    .wechat-article th{background:#f6f8fa;font-weight:600;}
    .wechat-article tr:nth-child(even) td{background:#f6f8fa60;}
  `;
}

function getClaudeThemeCSS(): string {
  return baseCSS() + `
    .wechat-article{color:#3d3929;font-family:ui-sans-serif,-apple-system,'PingFang SC',sans-serif;line-height:1.75;font-size:16px;}
    .wechat-article h1{font-size:24px;font-weight:600;color:#c96442;margin:1.2em 0 0.6em;line-height:1.3;border:none;padding-bottom:0;}
    .wechat-article h2{font-size:20px;font-weight:600;color:#c96442;margin:1.3em 0 0.5em;border:none;padding-left:0;}
    .wechat-article h3{font-size:17px;font-weight:600;color:#5c4f3d;}
    .wechat-article p{margin:0.9em 0;}
    .wechat-article blockquote{background:#f5f0e8;border-left:3px solid #c96442;color:#5c4f3d;border-radius:0 8px 8px 0;padding:12px 16px;}
    .wechat-article pre{background:#fef9f3;color:#3d3929;border-radius:10px;padding:16px;border:1px solid #e8dfd0;}
    .wechat-article pre code{color:#3d3929;}
    .wechat-article :not(pre)>code{background:#ede7db;color:#c96442;border-radius:6px;font-size:0.9em;}
    .wechat-article a{color:#c96442;text-decoration:underline;text-underline-offset:2px;}
    .wechat-article strong{color:#c96442;font-weight:600;}
    .wechat-article ul li::marker{color:#c96442;}
    .wechat-article ol li::marker{color:#c96442;font-weight:600;}
    .wechat-article hr{border:none;height:1px;background:repeating-linear-gradient(90deg,#c9b99a 0,#c9b99a 6px,transparent 6px,transparent 12px);}
    .wechat-article th{background:#c96442;color:#fff;border:none;}
    .wechat-article td{border-color:#e8dfd0;}
  `;
}

function getAcademicThemeCSS(): string {
  return baseCSS() + `
    .wechat-article{color:#1a1a1a;font-family:'Times New Roman','SimSun',Georgia,serif;line-height:1.9;font-size:16px;text-align:justify;}
    .wechat-article h1{font-size:22px;font-weight:bold;text-align:center;margin:1.5em 0 0.8em;border:none;padding-bottom:0;}
    .wechat-article h2{font-size:18px;font-weight:bold;margin:1.5em 0 0.7em;text-align:left;border-bottom:1px solid #333;padding-bottom:4px;}
    .wechat-article h3{font-size:16px;font-weight:bold;margin:1.2em 0 0.5em;}
    .wechat-article p{text-indent:2em;margin:0.6em 0;line-height:2;}
    .wechat-article blockquote{font-size:14px;color:#555;border-left:3px solid #999;background:#f9f9f9;padding:8px 16px;margin:1em 2em;}
    .wechat-article blockquote p{text-indent:0;margin:0.4em 0;}
    .wechat-article pre{background:#fafafa;color:#333;border:1px solid #ddd;border-radius:0;padding:14px;font-family:'Courier New',monospace;font-size:13px;}
    .wechat-article pre code{color:#333;}
    .wechat-article :not(pre)>code{background:#f0f0f0;color:#900;font-family:'Courier New',monospace;font-size:0.9em;}
    .wechat-article a{color:#0000EE;text-decoration:underline;}
    .wechat-article strong{font-weight:bold;color:#000;}
    .wechat-article em{font-style:italic;}
    .wechat-article ul,.wechat-article ol{padding-left:2em;}
    .wechat-article li{margin:0.3em 0;}
    .wechat-article li>p{text-indent:0;display:block;margin:0;}
    .wechat-article hr{border:none;background:#666;height:1px;}
    .wechat-article table{border-collapse:collapse;border:2px solid #333;display:table;}
    .wechat-article th,.wechat-article td{border:1px solid #999;padding:8px 12px;}
    .wechat-article th{background:#eee;font-weight:bold;}
    .wechat-article img{border:1px solid #ddd;padding:2px;}
  `;
}

function getGlassThemeCSS(): string {
  return baseCSS() + `
    .wechat-article{color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;line-height:1.8;font-size:16px;}
    .wechat-article h1{font-size:24px;font-weight:700;margin:1.3em 0 0.6em;background:linear-gradient(135deg,#06b6d4 0%,#8b5cf6 50%,#ec4899 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.3;border:none;}
    .wechat-article h2{font-size:19px;font-weight:600;margin:1.3em 0 0.6em;padding:10px 16px;background:linear-gradient(135deg,rgba(6,182,212,0.08),rgba(139,92,246,0.08));border-left:4px solid #06b6d4;border-radius:0 8px 8px 0;backdrop-filter:blur(8px);color:#0891b2;}
    .wechat-article h3{font-size:17px;font-weight:600;color:#7c3aed;}
    .wechat-article p{margin:0.9em 0;}
    .wechat-article blockquote{background:linear-gradient(135deg,rgba(6,182,212,0.06),rgba(236,72,153,0.06));border-left:4px solid #ec4899;border-radius:0 12px 12px 0;padding:14px 18px;color:#475569;backdrop-filter:blur(8px);}
    .wechat-article pre{background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.95));border-radius:12px;padding:18px;border:1px solid rgba(139,92,246,0.3);backdrop-filter:blur(12px);box-shadow:0 4px 20px rgba(139,92,246,0.15);}
    .wechat-article pre code{color:#e2e8f0;}
    .wechat-article :not(pre)>code{background:linear-gradient(135deg,rgba(6,182,212,0.1),rgba(139,92,246,0.1));color:#0891b2;border-radius:8px;padding:3px 8px;}
    .wechat-article a{color:#0891b2;text-decoration:none;border-bottom:1px solid #06b6d440;}
    .wechat-article strong{font-weight:700;background:linear-gradient(135deg,#06b6d4,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
    .wechat-article ul li::marker{color:#8b5cf6;}
    .wechat-article ol li::marker{color:#06b6d4;font-weight:bold;}
    .wechat-article hr{height:2px;background:linear-gradient(90deg,transparent,#06b6d4,#8b5cf6,#ec4899,transparent);border:none;}
    .wechat-article th{background:linear-gradient(135deg,#06b6d4,#8b5cf6);color:#fff;border:none;font-weight:600;}
    .wechat-article td{border-color:rgba(139,92,246,0.2);}
    .wechat-article tr:nth-child(even) td{background:rgba(139,92,246,0.04);}
    .wechat-article img{border-radius:12px;box-shadow:0 8px 30px rgba(6,182,212,0.15);}
  `;
}

function getGoldThemeCSS(): string {
  return baseCSS() + `
    .wechat-article{color:#2d2416;font-family:'Noto Serif SC','Songti SC','Times New Roman',serif;line-height:1.9;font-size:16px;background:linear-gradient(to bottom,#fffdf7,#faf6ed);}
    .wechat-article h1{font-size:24px;font-weight:700;color:#1a1408;margin:1.3em 0 0.6em;text-align:center;border-bottom:2px solid #c9a961;padding-bottom:12px;letter-spacing:2px;position:relative;}
    .wechat-article h1::after{content:'❖';display:block;text-align:center;color:#c9a961;margin-top:8px;font-size:14px;}
    .wechat-article h2{font-size:19px;font-weight:600;color:#8b6914;margin:1.4em 0 0.6em;border-left:4px solid #c9a961;padding-left:12px;background:linear-gradient(90deg,rgba(201,169,97,0.1),transparent);}
    .wechat-article h3{font-size:17px;font-weight:600;color:#a67c00;}
    .wechat-article p{margin:0.9em 0;}
    .wechat-article blockquote{background:linear-gradient(135deg,#fdf8ec,#f7efd8);border-left:4px solid #c9a961;color:#5c4a1f;border-radius:0 8px 8px 0;padding:14px 18px;border:1px solid #e8d9a8;border-left:4px solid #c9a961;}
    .wechat-article pre{background:#2d2416;color:#e8d9a8;border-radius:8px;padding:18px;border:1px solid #c9a961;box-shadow:inset 0 1px 3px rgba(0,0,0,0.3);}
    .wechat-article pre code{color:#f5e6c8;}
    .wechat-article :not(pre)>code{background:#f7efd8;color:#8b6914;border-radius:4px;padding:2px 7px;border:1px solid #e8d9a8;}
    .wechat-article a{color:#8b6914;text-decoration:none;border-bottom:1px solid #c9a961;}
    .wechat-article strong{font-weight:700;color:#8b6914;}
    .wechat-article ul li::marker{color:#c9a961;content:'◆ ';font-size:12px;}
    .wechat-article ol li::marker{color:#8b6914;font-weight:bold;}
    .wechat-article hr{border:none;height:1px;background:linear-gradient(90deg,transparent,#c9a961,transparent);margin:2em 0;}
    .wechat-article th{background:linear-gradient(135deg,#c9a961,#a67c00);color:#fff;border:none;font-weight:600;}
    .wechat-article td{border-color:#e8d9a8;}
    .wechat-article tr:nth-child(even) td{background:#fdf8ec;}
    .wechat-article img{border:2px solid #c9a961;padding:3px;border-radius:4px;}
  `;
}

function getCyberpunkThemeCSS(): string {
  return baseCSS() + `
    .wechat-article{color:#1a1a2e;font-family:'Courier New','Fira Code',monospace;line-height:1.8;font-size:15px;}
    .wechat-article p{color:#1a1a2e;margin:1em 0;}
    .wechat-article h1{font-size:24px;font-weight:900;color:#e94560;text-shadow:0 0 8px rgba(233,69,96,0.3);margin:1.3em 0 0.6em;letter-spacing:2px;border:none;border-bottom:3px solid #e94560;padding-bottom:8px;text-transform:uppercase;}
    .wechat-article h2{font-size:19px;font-weight:700;color:#0f3460;text-shadow:0 0 6px rgba(15,52,96,0.2);margin:1.3em 0 0.6em;letter-spacing:1px;border-left:4px solid #e94560;padding-left:10px;background:linear-gradient(90deg,rgba(233,69,96,0.06),transparent);}
    .wechat-article h3{font-size:17px;font-weight:700;color:#533483;text-shadow:0 0 4px rgba(83,52,131,0.2);}
    .wechat-article blockquote{background:rgba(233,69,96,0.05);border-left:4px solid #e94560;color:#533483;border-radius:0;position:relative;margin:1.2em 0;}
    .wechat-article pre{background:#0a0a23;color:#00ff41;border:1px solid #533483;border-radius:4px;padding:16px;box-shadow:inset 0 0 20px rgba(0,255,65,0.05);margin:1.2em 0;}
    .wechat-article pre code{color:#00ff41;}
    .wechat-article :not(pre)>code{background:#1a1a2e;color:#e94560;padding:2px 6px;border-radius:3px;}
    .wechat-article a{color:#e94560;text-decoration:underline;}
    .wechat-article strong{color:#e94560;font-weight:900;}
    .wechat-article em{color:#533483;font-style:italic;}
    .wechat-article ul li::marker{color:#e94560;content:'▸ ';}
    .wechat-article ol li::marker{color:#0f3460;font-weight:bold;}
    .wechat-article hr{border:none;height:2px;background:linear-gradient(90deg,transparent,#e94560,#533483,transparent);}
    .wechat-article table{border:1px solid #533483;display:table;}
    .wechat-article th{background:linear-gradient(135deg,#e94560,#533483);color:#fff;border:none;font-weight:700;}
    .wechat-article td{border:1px solid #53348350;color:#1a1a2e;}
    .wechat-article tr:nth-child(even) td{background:rgba(233,69,96,0.03);}
    .wechat-article img{border:2px solid #e94560;border-radius:4px;}
  `;
}
