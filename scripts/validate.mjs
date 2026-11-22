import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'docs');
const errors = [];

function fail(message) {
  errors.push(message);
}

const dataPath = join(docs, 'data', 'components.json');
let data;
try {
  data = JSON.parse(await readFile(dataPath, 'utf8'));
} catch (error) {
  console.error('components.json 讀不到或不是合法 JSON：' + error.message);
  process.exit(1);
}

if (!data.site || typeof data.site.title !== 'string' || !data.site.title.trim()) fail('site.title 要是非空字串');
if (!data.site || typeof data.site.version !== 'string' || !data.site.version.trim()) fail('site.version 要是非空字串');
if (!Array.isArray(data.designers) || data.designers.length === 0) fail('designers 要是非空陣列');

const ids = new Set();
const orders = new Set();
const nodeOrders = new Set();
const interfaceIds = new Set();
const urls = new Set();
const STATUSES = new Set(['match', 'mismatch', 'unconfirmed']);
const CHECKS = new Set(['pass', 'warn', 'unconfirmed']);

function needString(obj, key, where) {
  if (!obj || typeof obj[key] !== 'string' || !obj[key].trim()) fail(`${where} 的 ${key} 要是非空字串`);
}

function needHttps(value, where) {
  let url;
  try { url = new URL(value); } catch { fail(`${where} 不是網址：${value}`); return; }
  if (url.protocol !== 'https:') fail(`${where} 要用 https：${value}`);
  urls.add(url.href);
}

for (const designer of data.designers || []) {
  const where = `設計器 ${designer?.id || '(沒有 id)'}`;
  needString(designer, 'id', where);
  needString(designer, 'name', where);
  needString(designer, 'purpose', where);
  needString(designer, 'version', where);
  needString(designer, 'versionSource', where);
  needString(designer, 'commit', where);
  needString(designer, 'thumbnail', where);
  needString(designer, 'thumbnailAlt', where);
  if (designer?.id) {
    if (ids.has(designer.id)) fail(`設計器 id 重複：${designer.id}`);
    ids.add(designer.id);
  }
  if (typeof designer?.order !== 'number') fail(`${where} 的 order 要是數字`);
  if (!Array.isArray(designer?.outputs) || designer.outputs.length === 0) fail(`${where} 的 outputs 至少要有一項`);
  for (const output of designer?.outputs || []) needString(output, 'type', `${where} 的輸出`);
  if (!Array.isArray(designer?.defaults) || designer.defaults.length === 0) fail(`${where} 的 defaults 至少要有一項`);
  for (const item of designer?.defaults || []) {
    needString(item, 'label', `${where} 的預設`);
    needString(item, 'value', `${where} 的預設`);
    needString(item, 'source', `${where} 的預設`);
  }
  for (const item of designer?.computed || []) {
    needString(item, 'label', `${where} 的計算值`);
    needString(item, 'value', `${where} 的計算值`);
    needString(item, 'source', `${where} 的計算值`);
  }
  if (!designer?.links) fail(`${where} 缺少 links`);
  needHttps(designer?.links?.open, `${where} 的開啟網址`);
  needHttps(designer?.links?.github, `${where} 的 GitHub 網址`);
  const thumb = designer?.thumbnail || '';
  if (thumb.startsWith('/') || thumb.includes('..') || /^[a-z]+:/i.test(thumb)) {
    fail(`${where} 的縮圖要用 docs/ 裡的相對路徑：${thumb}`);
  } else if (thumb) {
    const file = join(docs, thumb);
    try {
      const info = await stat(file);
      if (info.size < 8000) fail(`${where} 的縮圖太小，不像實際畫面：${thumb}`);
      const header = await readFile(file);
      const png = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
      const svg = header.subarray(0, 80).toString('utf8').includes('<svg');
      if (!png && !svg) fail(`${where} 的縮圖不是 PNG 或 SVG：${thumb}`);
    } catch {
      fail(`${where} 的縮圖檔不存在：${thumb}`);
    }
  }
  if (!Array.isArray(designer?.assemblyNodes)) fail(`${where} 的 assemblyNodes 要是陣列`);
  if (!Array.isArray(designer?.interfaces)) fail(`${where} 的 interfaces 要是陣列`);
  if (!Array.isArray(designer?.checks)) fail(`${where} 的 checks 要是陣列`);
  for (const node of designer?.assemblyNodes || []) {
    needString(node, 'id', `${where} 的組裝節點`);
    needString(node, 'label', `${where} 的組裝節點`);
    needString(node, 'detail', `${where} 的組裝節點`);
    if (typeof node.order !== 'number') fail(`${where} 的組裝節點 ${node?.id} 缺少 order`);
    if (nodeOrders.has(node.order)) fail(`組裝順序重複：${node.order}`);
    nodeOrders.add(node.order);
    if (node.status && !STATUSES.has(node.status)) fail(`${where} 的組裝節點狀態不認得：${node.status}`);
  }
  for (const row of designer?.interfaces || []) {
    const at = `${where} 的接口 ${row?.id || ''}`;
    needString(row, 'id', at);
    needString(row, 'pair', at);
    needString(row, 'dimension', at);
    needString(row, 'mustMatch', at);
    if (!STATUSES.has(row?.status)) fail(`${at} 的 status 要是 match、mismatch 或 unconfirmed`);
    if (row?.id) {
      if (interfaceIds.has(row.id)) fail(`接口 id 重複：${row.id}`);
      interfaceIds.add(row.id);
    }
    for (const side of ['left', 'right']) {
      needString(row?.[side], 'part', `${at} 的 ${side}`);
      needString(row?.[side], 'value', `${at} 的 ${side}`);
      needString(row?.[side], 'source', `${at} 的 ${side}`);
    }
    if ((row?.status === 'mismatch' || row?.status === 'unconfirmed') && !(row.note && row.note.trim())) {
      fail(`${at} 標成不一致或待確認時，要寫 note`);
    }
  }
  for (const check of designer?.checks || []) {
    const at = `${where} 的檢核 ${check?.id || ''}`;
    needString(check, 'id', at);
    needString(check, 'title', at);
    needString(check, 'detail', at);
    needString(check, 'source', at);
    if (!CHECKS.has(check?.status)) fail(`${at} 的 status 要是 pass、warn 或 unconfirmed`);
  }
  if (designer?.commit && !/^[0-9a-f]{40}$/.test(designer.commit)) fail(`${where} 的 commit 要是 40 碼 SHA`);
}

for (const designer of data.designers || []) {
  for (const row of designer.interfaces || []) {
    for (const side of [row.left, row.right]) {
      if (side?.designerId && !ids.has(side.designerId)) {
        fail(`接口 ${row.id} 指到不存在的設計器 ${side.designerId}`);
      }
    }
  }
}

const html = await readFile(join(docs, 'index.html'), 'utf8');
const css = await readFile(join(docs, 'css', 'site.css'), 'utf8');
const js = await readFile(join(docs, 'js', 'site.js'), 'utf8');
if (!html.includes('js/site.js') || !html.includes('css/site.css') || !js.includes('components.json')) {
  fail('頁面沒有接到樣式、腳本或資料檔');
}
if (!js.includes("new URL('../data/components.json'")) fail('腳本沒有用相對路徑讀 components.json');
for (const [name, text] of [['index.html', html], ['css/site.css', css], ['js/site.js', js]]) {
  const attrs = text.match(/(?:href|src)\s*=\s*["']([^"']+)["']/g) || [];
  for (const attr of attrs) {
    const value = attr.split('=')[1].replace(/["']/g, '').trim();
    if (value.startsWith('/') && !value.startsWith('//')) fail(`${name} 有從網站根目錄開始的路徑：${value}`);
    if (value.startsWith('http:') || value.startsWith('https:')) fail(`${name} 不該把版面資源指到別的網站：${value}`);
  }
}
if (html.includes('葉片壓模設計器') || html.includes('風力齒輪設計室') || html.includes('底座支架設計器')) {
  fail('設計器名稱要放在 components.json，不要寫死在 index.html');
}

async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal });
    if (response.status < 200 || response.status >= 400) fail(`連結沒有成功回應（${response.status}）：${url}`);
  } catch (error) {
    fail(`連結連不上：${url}（${error.message}）`);
  } finally {
    clearTimeout(timer);
  }
}

await Promise.all([...urls].map(checkUrl));

if (errors.length) {
  console.error(`檢查沒過，共 ${errors.length} 項：`);
  for (const error of errors) console.error(' - ' + error);
  process.exit(1);
}
console.log(`通過。${data.designers.length} 個設計器，${interfaceIds.size} 列接口，${nodeOrders.size} 個組裝節點，${urls.size} 個連結都有回應。`);
