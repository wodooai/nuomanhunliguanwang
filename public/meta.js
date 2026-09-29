// 网页内分类 / 标签管理器，避免依赖浏览器系统弹窗。
function manageMeta(key) {
  captureEditor();
  const isCategory = key === 'categories';
  const title = isCategory ? '管理案例分类' : '管理案例标签';
  const hint = isCategory ? '新建分类后，点击分类名称即可选中并回到案例编辑。' : '点击标签可为当前案例多选或取消；新建标签会自动选中。';
  const items = db[key] || [];
  modal.innerHTML = `<div class="meta-layer"><section class="meta-box"><button class="close" onclick="closeMeta()">×</button><div class="eyebrow">NOMAN WEDDING</div><h2>${title}</h2><p>${hint}</p><div class="meta-add"><input id="new-meta" placeholder="输入${isCategory ? '分类' : '标签'}名称" onkeydown="if(event.key==='Enter')addMeta('${key}')"><button class="gold" onclick="addMeta('${key}')">新建</button></div><div class="meta-list">${items.map(item => { const selected = isCategory ? editing.category === item : editing.tags.includes(item); return `<div class="meta-item ${selected ? 'selected' : ''}"><button class="meta-select" onclick="selectMeta('${key}','${encodeURIComponent(item)}')">${esc(item)}${selected ? '　✓' : ''}</button>${item === '全部案例' ? '<span class="meta-locked">默认</span>' : `<button class="meta-delete" title="删除" onclick="removeMeta('${key}','${encodeURIComponent(item)}')">×</button>`}</div>`; }).join('')}</div><button class="ghost" onclick="closeMeta()">返回案例编辑</button></section></div>`;
}
function closeMeta() { drawEditor(); }
async function addMeta(key) {
  const input = document.querySelector('#new-meta');
  const name = input.value.trim();
  if (!name) return input.focus();
  if ((db[key] || []).includes(name)) { input.value = ''; return input.focus(); }
  db[key] = [...(db[key] || []), name];
  if (key === 'categories') editing.category = name;
  if (key === 'tags') editing.tags = [...editing.tags, name];
  await api('/api/meta', { method: 'POST', body: JSON.stringify({ [key]: db[key] }) });
  manageMeta(key);
}
async function removeMeta(key, encoded) {
  const name = decodeURIComponent(encoded);
  if (name === '全部案例') return;
  db[key] = db[key].filter(item => item !== name);
  if (key === 'categories' && editing.category === name) editing.category = db.categories.find(item => item !== '全部案例') || '';
  if (key === 'tags') editing.tags = editing.tags.filter(item => item !== name);
  await api('/api/meta', { method: 'POST', body: JSON.stringify({ [key]: db[key] }) });
  manageMeta(key);
}
function selectMeta(key, encoded) {
  const name = decodeURIComponent(encoded);
  if (key === 'categories') { editing.category = name; closeMeta(); }
  if (key === 'tags') { editing.tags = editing.tags.includes(name) ? editing.tags.filter(item => item !== name) : [...editing.tags, name]; manageMeta(key); }
}
