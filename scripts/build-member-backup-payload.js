const fs = require('node:fs');
const { memberBackupFields } = require('../member-backup');

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error('需要输入源文件和目标文件路径');
const members = JSON.parse(fs.readFileSync(source, 'utf8')).members;
if (!Array.isArray(members)) throw new Error('会员数据格式错误');
const payload = { create_records: members.map(memberBackupFields) };
fs.writeFileSync(destination, JSON.stringify(payload), { mode: 0o600 });
console.log(`已准备 ${payload.create_records.length} 条会员备份记录`);
