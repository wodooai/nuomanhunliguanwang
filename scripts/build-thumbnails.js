const fs=require('fs');
const path=require('path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const data=path.join(root,'data');
const uploads=path.join(data,'uploads');
const thumbs=path.join(data,'thumbs');
fs.mkdirSync(thumbs,{recursive:true});
const cases=JSON.parse(fs.readFileSync(path.join(data,'cases.json'),'utf8')).cases||[];
const covers=[...new Set(cases.map(c=>String(c.cover||c.images?.[0]||'').split('?')[0]).filter(x=>x.startsWith('/uploads/')))];
(async()=>{
 let built=0,missing=0,totalBytes=0;
 for(const cover of covers){
  const source=path.join(uploads,path.basename(cover));
  const target=path.join(thumbs,path.basename(cover).replace(/\.[^.]+$/,'.webp'));
  if(!fs.existsSync(source)){missing++;continue}
  if(!fs.existsSync(target)){await sharp(source).resize(640,640,{fit:'inside',withoutEnlargement:true}).webp({quality:72}).toFile(target);built++}
  totalBytes+=fs.statSync(target).size;
 }
 console.log(JSON.stringify({covers:covers.length,built,missing,thumbnailBytes:totalBytes}));
})().catch(error=>{console.error(error);process.exitCode=1});
