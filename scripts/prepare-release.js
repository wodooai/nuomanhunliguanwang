const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const [origin, showcaseId, adminId] = process.argv.slice(2);
if (origin && (new URL(origin).protocol !== 'https:' || new URL(origin).origin !== origin)) throw new Error('请使用不带末尾斜线的 HTTPS 网站域名');
for (const id of [showcaseId, adminId]) if (id && !/^wx[0-9a-f]{16}$/.test(id)) throw new Error('AppID 格式不正确');
const output = path.join(root, 'releases', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(output, {recursive:true});
const website = path.join(output, 'website');
fs.mkdirSync(website);
for (const name of ['server.js', 'package.json', 'public', 'Dockerfile', '.dockerignore', 'DEPLOYMENT.md']) fs.cpSync(path.join(root, name), path.join(website, name), {recursive:true});
fs.mkdirSync(path.join(website, 'data'));
fs.copyFileSync(path.join(root, 'data', 'cases.json'), path.join(website, 'data', 'cases.json'));
fs.cpSync(path.join(root, 'data', 'uploads'), path.join(website, 'data', 'uploads'), {recursive:true});
for (const [name, id] of [['miniprogram-showcase', showcaseId], ['miniprogram-admin', adminId]]) {
 const target = path.join(output, name);
 fs.cpSync(path.join(root, name), target, {recursive:true, filter:source=>path.basename(source)!=='project.private.config.json'});
 if(origin) fs.writeFileSync(path.join(target, 'app.js'), `App({globalData:{apiBase:${JSON.stringify(origin)}}});\n`);
 const configPath = path.join(target, 'project.config.json');
 const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
 if(id) config.appid=id;
 config.compileType='miniprogram';
 config.setting={...config.setting,urlCheck:true};
 fs.writeFileSync(configPath, JSON.stringify(config,null,2));
}
fs.writeFileSync(path.join(output, '发布状态.txt'), `尚未部署或上传微信。\n网站地址：${origin||'待提供'}\n客户展示端 AppID：${showcaseId||'待确认（根目录已有 AppID，需确认归属）'}\n管理端 AppID：${adminId||'使用现有配置，需确认归属'}\n不包含会员资料、历史备份、登录签名密钥或环境变量文件。\n网站数据目录必须持久保存；现有会员资料如需迁移，应单独安全迁移。\n`);
console.log(output);
