const dataUrl = new URL('../data/components.json', import.meta.url);

const STATUS = {
  match: '一致',
  mismatch: '不一致',
  unconfirmed: '待確認',
  pass: '通過',
  warn: '要注意',
};

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function alertStatus(status) {
  return status === 'mismatch' || status === 'unconfirmed' || status === 'warn';
}

function badge(status) {
  return `<span class="badge ${esc(status)}">${esc(STATUS[status] || status)}</span>`;
}

function byOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0);
}

function renderCards(designers) {
  $('card-list').innerHTML = designers.map((d) => {
    const outputs = (d.outputs || []).map((o) => `<li>${esc(o.type)}</li>`).join('');
    const defaults = (d.defaults || []).map((item) => (
      `<li><b>${esc(item.label)}</b>　${esc(item.value)}</li>`
    )).join('');
    const computed = (d.computed || []).length
      ? `<div class="computed"><p>用這組預設算出</p><ul>${d.computed.map((item) => `<li><b>${esc(item.label)}</b>　${esc(item.value)}</li>`).join('')}</ul></div>`
      : '';
    const sources = [
      ...(d.defaults || []),
      ...(d.computed || []),
    ].map((item) => `<li><b>${esc(item.label)}</b>：${esc(item.source)}</li>`).join('');
    return `<article class="card">
      <img src="${esc(d.thumbnail)}" alt="${esc(d.thumbnailAlt || d.name)}">
      <div class="card-body">
        <p class="version">目前版本 ${esc(d.version)}</p>
        <h3>${esc(d.name)}</h3>
        <p class="purpose">${esc(d.purpose)}</p>
        <ul class="outputs">${outputs}</ul>
        <ul class="defaults">${defaults}</ul>
        ${computed}
        <div class="actions">
          <a class="btn primary" href="${esc(d.links.open)}" target="_blank" rel="noopener noreferrer">開啟設計器</a>
          <a class="btn ghost" href="${esc(d.links.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <details>
          <summary>這張卡片的數字從哪裡來</summary>
          <p class="source">${esc(d.versionSource)}</p>
          <p class="source">倉庫版本 ${esc(d.commit)}</p>
          <ul>${sources}</ul>
        </details>
      </div>
    </article>`;
  }).join('');
}

function sideCell(side) {
  if (!side) return '';
  return `<b>${esc(side.part)}</b>　${esc(side.value)}<div class="source">${esc(side.source)}</div>`;
}

function pairHtml(pair) {
  const parts = String(pair).split('↔');
  if (parts.length !== 2) return esc(pair);
  return `${esc(parts[0].trim())}<br>↔ ${esc(parts[1].trim())}`;
}

function renderInterfaces(rows) {
  const head = `<table>
    <caption class="source">黃底列是不一致或待確認。判定不只有顏色，格子裡寫著文字。</caption>
    <colgroup><col class="c-pair"><col class="c-need"><col class="c-side"><col class="c-side"><col class="c-status"></colgroup>
    <thead><tr><th>接口</th><th>需要兩邊一致</th><th>一側</th><th>另一側</th><th>判定</th></tr></thead>
    <tbody>`;
  const body = rows.map((row) => {
    const tone = alertStatus(row.status) ? 'alert' : 'match';
    return `<tr class="${tone}">
      <td class="pair">${pairHtml(row.pair)}<div class="source">${esc(row.dimension)}</div></td>
      <td>${esc(row.mustMatch)}${row.note ? `<div class="note">${esc(row.note)}</div>` : ''}</td>
      <td>${sideCell(row.left)}</td>
      <td>${sideCell(row.right)}</td>
      <td>${badge(row.status)}</td>
    </tr>`;
  }).join('');
  $('joint-table').innerHTML = `${head}${body}</tbody></table>`;
  $('joint-cards').innerHTML = rows.map((row) => {
    const tone = alertStatus(row.status) ? 'alert' : 'match';
    return `<article class="joint-card ${tone}">
      ${badge(row.status)}
      <h3>${esc(row.pair)}</h3>
      <p><b>${esc(row.dimension)}</b>　${esc(row.mustMatch)}</p>
      <p>${sideCell(row.left)}</p>
      <p>${sideCell(row.right)}</p>
      ${row.note ? `<p>${esc(row.note)}</p>` : ''}
    </article>`;
  }).join('');
}

function renderAssembly(nodes) {
  const cols = 4;
  const boxW = 210;
  const boxH = 128;
  const gapX = 36;
  const gapY = 54;
  const pad = 16;
  const rows = Math.ceil(nodes.length / cols);
  const width = pad * 2 + cols * boxW + (cols - 1) * gapX;
  const height = pad * 2 + rows * boxH + (rows - 1) * gapY;
  const parts = [];
  nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = pad + col * (boxW + gapX);
    const y = pad + row * (boxH + gapY);
    const amber = alertStatus(node.status);
    const fill = amber ? '#fff1c2' : '#e7f4ee';
    const stroke = amber ? '#c4841d' : '#0e5c4a';
    const dash = node.status === 'unconfirmed' ? 'stroke-dasharray="7 4"' : '';
    parts.push(`<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="2.5" ${dash}/>`);
    parts.push(`<text x="${x + 16}" y="${y + 28}" class="svg-index">${index + 1}</text>`);
    parts.push(`<text x="${x + 16}" y="${y + 56}" class="svg-label">${esc(node.label)}</text>`);
    parts.push(`<text x="${x + 16}" y="${y + 86}" class="svg-detail">${esc(node.detail)}</text>`);
    if ((index + 1) % cols === 0) return;
    const x1 = x + boxW + 4;
    const x2 = x + boxW + gapX - 8;
    const cy = y + boxH / 2;
    parts.push(`<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="#0e5c4a" stroke-width="2.5"/>`);
    parts.push(`<polygon points="${x2 + 6},${cy} ${x2 - 4},${cy - 6} ${x2 - 4},${cy + 6}" fill="#0e5c4a"/>`);
  });
  if (rows > 1) {
    const x = pad + boxW / 2;
    const y1 = pad + boxH + 8;
    const y2 = pad + boxH + gapY - 16;
    parts.push(`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#0e5c4a" stroke-width="2.5"/>`);
    parts.push(`<polygon points="${x},${y2 + 8} ${x - 6},${y2 - 2} ${x + 6},${y2 - 2}" fill="#0e5c4a"/>`);
    parts.push(`<text x="${x + 14}" y="${(y1 + y2) / 2 + 5}" class="svg-detail">接著，從左到右</text>`);
  }
  const label = nodes.map((node) => node.label).join('，接著');
  $('flow').innerHTML = `<svg class="flow" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">${parts.join('')}</svg>`;
  $('flow-list').innerHTML = nodes.map((node, index) => (
    `<li class="${esc(node.status || 'match')}"><strong>${index + 1}. ${esc(node.label)}</strong><span>${esc(node.detail || '')}</span></li>`
  )).join('');
}

function renderChecks(checks) {
  $('check-list').innerHTML = checks.map((item) => (
    `<article class="check ${esc(item.status)}">
      ${badge(item.status)}
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.detail)}</p>
      <p class="source">${esc(item.source)}</p>
    </article>`
  )).join('');
}

function show(id) {
  $(id).hidden = false;
}

async function main() {
  const status = $('status');
  let data;
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(String(response.status));
    data = await response.json();
  } catch (error) {
    status.textContent = '執行長，資料檔讀不到。請用網站伺服器打開這個資料夾，不要直接用檔案總管點 index.html。';
    return;
  }
  const designers = [...(data.designers || [])].sort(byOrder);
  document.title = `${data.site?.title || '風力發電教具總站'} v${data.site?.version || ''}`.trim();
  $('site-title').textContent = data.site?.title || '風力發電教具總站';
  $('eyebrow').textContent = `v${data.site?.version || ''}　給執行長`;
  status.hidden = true;
  renderCards(designers);
  show('designers');
  const interfaces = designers.flatMap((d) => d.interfaces || []);
  if (interfaces.length) {
    renderInterfaces(interfaces);
    show('interfaces');
  }
  const nodes = designers.flatMap((d) => d.assemblyNodes || []).sort(byOrder);
  if (nodes.length) {
    renderAssembly(nodes);
    show('assembly');
  }
  const checks = designers.flatMap((d) => d.checks || []);
  if (checks.length) {
    renderChecks(checks);
    show('checks');
  }
  const count = designers.length;
  $('colophon-text').textContent = `執行長，現在收了 ${count} 個設計器。要再加一個，請看倉庫 README 的「如何新增一個設計器」：改 docs/data/components.json 的一筆就會多一張卡片，接口表和組裝圖也跟著重畫。總站不複製各設計器的程式。本版不要開 GitHub Pages；之後若要開，用 main 分支的 /docs。`;
}

main();
