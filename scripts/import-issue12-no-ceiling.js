/*
 * Import one first-level source folder as one case.
 * Usage: node scripts/import-issue12-no-ceiling.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = 'G:\\婚庆布置 素材 2024 小预算\\第12期【无吊顶小预算图片案例】90套';
const DB = path.join(ROOT, 'data', 'cases.json');
const UPLOADS = path.join(ROOT, 'data', 'uploads');
const IMAGE = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ISSUE_TAGS = ['无吊顶', '小预算'];

function titleFromFolder(name) {
  return name
    .replace(/^\d+[_-]\s*/, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim();
}

function tagsFromFolder(name) {
  const withoutNumber = titleFromFolder(name);
  const parts = /^\d+[_-]/.test(name)
    ? withoutNumber.split('_').map(x => x.trim()).filter(Boolean)
    : [];
  return [...new Set([...ISSUE_TAGS, ...parts])];
}

function safePart(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'case';
}

if (!fs.existsSync(SOURCE)) throw new Error(`Source folder does not exist: ${SOURCE}`);
const db = JSON.parse(fs.readFileSync(DB, 'utf8'));
fs.mkdirSync(UPLOADS, { recursive: true });

const folders = fs.readdirSync(SOURCE, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }));

const existing = new Set(db.cases.map(item => item.sourceFolder).filter(Boolean));
let imported = 0, copied = 0, empty = 0;
for (let index = 0; index < folders.length; index += 1) {
  const sourceFolder = folders[index];
  if (existing.has(sourceFolder)) continue;
  const sourcePath = path.join(SOURCE, sourceFolder);
  const files = fs.readdirSync(sourcePath, { withFileTypes: true })
    .filter(entry => entry.isFile() && IMAGE.has(path.extname(entry.name).toLowerCase()))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }));
  const slug = safePart(String(index + 1));
  const images = files.map((file, imageIndex) => {
    const extension = path.extname(file).toLowerCase();
    const destinationName = `issue12-${slug}-${String(imageIndex + 1).padStart(2, '0')}${extension}`;
    fs.copyFileSync(path.join(sourcePath, file), path.join(UPLOADS, destinationName));
    copied += 1;
    return `/uploads/${destinationName}`;
  });
  if (!images.length) empty += 1;
  const title = titleFromFolder(sourceFolder);
  const tags = tagsFromFolder(sourceFolder);
  db.cases.unshift({
    id: `issue12-${String(index + 1).padStart(3, '0')}`,
    title,
    category: '套餐婚礼',
    tags,
    date: '',
    description: '第12期无吊顶小预算婚礼布置案例。',
    cover: images[0] || '',
    images,
    sourceFolder,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  for (const tag of tags) if (!db.tags.includes(tag)) db.tags.push(tag);
  imported += 1;
}

fs.writeFileSync(DB, JSON.stringify(db, null, 2) + '\n');
console.log(JSON.stringify({ folders: folders.length, imported, copied, empty, totalCases: db.cases.length }, null, 2));
