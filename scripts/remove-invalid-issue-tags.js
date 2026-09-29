const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'cases.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const invalid = new Set(['无吊顶婚礼', '无吊顶', '小预算']);
for (const item of db.cases) item.tags = (item.tags || []).filter(tag => !invalid.has(tag));
db.tags = (db.tags || []).filter(tag => !invalid.has(tag));
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ cases: db.cases.length, tags: db.tags.length, invalidRemaining: db.cases.flatMap(c => c.tags || []).filter(t => invalid.has(t)).length }));
