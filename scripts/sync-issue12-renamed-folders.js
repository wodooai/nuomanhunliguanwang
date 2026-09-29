const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const source = 'G:\\婚庆布置 素材 2024 小预算\\第12期【无吊顶小预算图片案例】90套';
const dbPath = path.join(root, 'data', 'cases.json');
const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const basicColors = { '白': '白色', '黑': '黑色', '红': '红色', '橙': '橙色', '金': '金色', '绿': '绿色', '蓝': '蓝色', '紫': '紫色', '粉': '粉色' };
const invalid = new Set(['无吊顶婚礼', '无吊顶', '小预算']);

const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceFiles = name => fs.readdirSync(path.join(source, name), { withFileTypes: true })
  .filter(e => e.isFile() && imageExt.has(path.extname(e.name).toLowerCase()))
  .map(e => path.join(source, name, e.name)).sort();
const hashSet = files => files.map(hashFile).sort().join('|');
const titleFrom = name => name.replace(/^\d+[_-]\s*/, '').trim();

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const issueCases = db.cases.filter(c => c.id && c.id.startsWith('issue12-'));
const byImages = new Map();
for (const item of issueCases) {
  const files = (item.images || []).map(url => path.join(root, 'data', url.replace(/^\//, ''))).filter(fs.existsSync);
  byImages.set(hashSet(files), item);
}

const folders = fs.readdirSync(source, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }));
const kept = [], missing = [], used = new Set();
for (const folder of folders) {
  const matched = byImages.get(hashSet(sourceFiles(folder)));
  if (!matched || used.has(matched.id)) { missing.push(folder); continue; }
  used.add(matched.id);
  const title = titleFrom(folder);
  const parts = title.split('_').map(x => x.trim()).filter(Boolean);
  const colorPart = parts[1] || '';
  const colorTags = [...new Set([...colorPart].map(c => basicColors[c]).filter(Boolean))];
  matched.title = title;
  matched.category = '套餐婚礼';
  matched.tags = [...new Set([...parts, ...colorTags].filter(x => x && !invalid.has(x)))];
  matched.description = `第12期婚礼布置案例：${parts.join('，')}。`;
  matched.sourceFolder = folder;
  matched.updatedAt = Date.now();
  kept.push(matched);
}

if (missing.length) throw new Error(`以下新版文件夹无法与图片匹配：\n${missing.join('\n')}`);
const keptIds = new Set(kept.map(c => c.id));
db.cases = db.cases.filter(c => !c.id?.startsWith('issue12-') || keptIds.has(c.id));
const usedTags = new Set(db.cases.flatMap(c => c.tags || []).filter(t => !invalid.has(t)));
db.cases.forEach(c => { c.tags = (c.tags || []).filter(t => !invalid.has(t)); });
db.tags = [...new Set([...db.tags.filter(t => !invalid.has(t)), ...usedTags])];
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ sourceFolders: folders.length, matchedAndKept: kept.length, removedDuplicateOrObsolete: issueCases.length - kept.length, totalCases: db.cases.length, missing: missing.length }, null, 2));
