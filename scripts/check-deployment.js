// 在 ECS 的 /opt/nuomanhunli 目录运行；不新增案例或会员。首页检查会累计一次 PV。
const fs=require('fs'),path=require('path');
const sharp=require('sharp');
const root=process.cwd();
process.loadEnvFile(path.join(root,'.codex','.env'));
(async()=>{
 const base='http://127.0.0.1:4188';
 if(!(await fetch(base)).ok)throw Error('Homepage unavailable');
 const login=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:process.env.ADMIN_USERNAME||'admin',password:process.env.NUOMANHUNLI_API_KEY})});
 if(!login.ok)throw Error('Configured admin login failed');
 const {token}=await login.json();
 const response=await fetch(base+'/api/data',{headers:{authorization:'Bearer '+token}});if(!response.ok)throw Error('Cases unavailable');
 const db=await response.json();
 const images=[...new Set(db.cases.flatMap(c=>[c.cover,...c.images]).filter(x=>x&&x.startsWith('/uploads/')))];
 for(const image of images)if(!fs.existsSync(path.join(root,'data',image.split('?')[0])))throw Error('Referenced image missing');
 const publicResponse=await fetch(base+'/api/data'),publicDb=await publicResponse.json();
 if(!publicResponse.ok||publicDb.cases.some(c=>'images' in c||'description' in c))throw Error('Public case catalog exposes protected detail fields');
 const protectedDetail=await fetch(base+'/api/cases/'+encodeURIComponent(db.cases[0].id)+'/detail');
 if(protectedDetail.status!==403)throw Error('Anonymous case detail should be denied');
 const wrong=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'admin',password:'520123'})});
 if(wrong.status!==401)throw Error('Default password should be rejected');
 if((await fetch(base+'/api/member/subscribe',{method:'POST'})).status!==404)throw Error('Removed paid membership route still exists');
 if((await fetch(base+'/api/member/cases/'+encodeURIComponent(db.cases[0].id)+'/download')).status!==404)throw Error('Removed download route still exists');
 if(publicDb.cases.some(c=>c.cover?.startsWith('/uploads/')))throw Error('Public catalog exposes full-size image URLs');
 if((await fetch(base+'/api/admin/support/messages')).status!==401)throw Error('Support inbox is not admin-only');
 const flaggedText=await fetch(base+'/api/save',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({case:{title:'联系电话 13800000003',images:[]}})});
 if(flaggedText.status!==400)throw Error('Promotional text was not rejected');
 const image=await sharp(Buffer.from('<svg width="900" height="180"><rect width="100%" height="100%" fill="white"/><text x="30" y="125" font-size="95" font-family="Arial" fill="black">13800000003</text></svg>')).png().toBuffer();
 const flaggedImage=await fetch(base+'/api/upload',{method:'POST',headers:{'content-type':'image/png',authorization:'Bearer '+token},body:image});
 if(flaggedImage.status!==400)throw Error('Promotional image OCR was not rejected');
 const asset=images[0];if(asset){if(!(await fetch(base+asset)).ok)throw Error('Signed image failed');if((await fetch(base+asset.split('?')[0])).status!==403)throw Error('Unsigned image should be denied');}
 console.log(JSON.stringify({result:'PASS',cases:db.cases.length,referencedImages:images.length,checks:['homepage','all image files present','admin login','default password rejected','no paid/download routes','thumbnail catalog','admin-only inbox','text and image OCR rejection','signed image access']}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
