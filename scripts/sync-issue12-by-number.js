const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const source = 'G:\\婚庆布置 素材 2024 小预算\\第12期【无吊顶小预算图片案例】90套';
const dbPath = path.join(root, 'data', 'cases.json'), uploads = path.join(root, 'data', 'uploads');
const ext = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const basic = { '白':'白色','黑':'黑色','红':'红色','橙':'橙色','金':'金色','绿':'绿色','蓝':'蓝色','紫':'紫色','粉':'粉色' };
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const old = db.cases.filter(c => c.id?.startsWith('issue12-'));
const byNumber = new Map(old.map(c => [(c.sourceFolder?.match(/^(\d+)_/) || [])[1], c]).filter(x => x[0]));
const folders = fs.readdirSync(source, {withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort((a,b)=>a.localeCompare(b,'zh-Hans-CN',{numeric:true}));
const kept=[];
for (const folder of folders) {
  const number=(folder.match(/^(\d+)_/)||[])[1];
  const item=byNumber.get(number);
  if(!item) throw new Error(`找不到编号 ${number} 对应的旧案例`);
  const title=folder.replace(/^\d+[_-]\s*/,'').trim(), parts=title.split('_').map(x=>x.trim()).filter(Boolean), color=parts[1]||'';
  const tags=[...new Set([...parts,...[...color].map(c=>basic[c]).filter(Boolean)])];
  const files=fs.readdirSync(path.join(source,folder),{withFileTypes:true}).filter(e=>e.isFile()&&ext.has(path.extname(e.name).toLowerCase())).map(e=>e.name).sort((a,b)=>a.localeCompare(b,'zh-Hans-CN',{numeric:true}));
  const images=files.map((file,i)=>{const suffix=path.extname(file).toLowerCase(), dest=`issue12-${number}-${String(i+1).padStart(2,'0')}${suffix}`;fs.copyFileSync(path.join(source,folder,file),path.join(uploads,dest));return `/uploads/${dest}`;});
  Object.assign(item,{title,category:'套餐婚礼',tags,description:`第12期婚礼布置案例：${parts.join('，')}。`,sourceFolder:folder,images,cover:images[0]||'',updatedAt:Date.now()});
  kept.push(item);
}
const ids=new Set(kept.map(c=>c.id)); db.cases=db.cases.filter(c=>!c.id?.startsWith('issue12-')||ids.has(c.id));
db.tags=[...new Set(db.cases.flatMap(c=>c.tags||[]))];
fs.writeFileSync(dbPath,JSON.stringify(db,null,2)+'\n','utf8');
console.log(JSON.stringify({sourceFolders:folders.length,kept:kept.length,removed:old.length-kept.length,totalCases:db.cases.length,totalImages:kept.reduce((n,c)=>n+c.images.length,0)},null,2));
