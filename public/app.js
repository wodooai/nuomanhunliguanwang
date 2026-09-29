const $=s=>document.querySelector(s), app=$('#app'), modal=$('#modal');
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('site-intro');setTimeout(()=>document.documentElement.classList.remove('site-intro'),1800)}
let db={categories:[],tags:[],cases:[]}, state={category:'全部案例',tag:'',query:'',page:1,admin:false,presentation:false,filterGroup:'婚礼类型',navigationOpen:false}, editing=null;
const esc=s=>String(s||'').replace(/[&<>'"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[x]));
const adminToken=()=>sessionStorage.adminToken||'';
const isPartner=()=>window.partnerMember?.role==='partner';
const canEditCase=c=>state.admin||(isPartner()&&c?.ownerMemberId===window.partnerMember.id);
const api=(url,opts={})=>fetch(url,{headers:{'Content-Type':'application/json',...(adminToken()?{Authorization:`Bearer ${adminToken()}`}:{})},...opts}).then(r=>r.json());
const favs=()=>JSON.parse(localStorage.favs||'[]'), pics=()=>JSON.parse(localStorage.picFavs||'[]');
const tagGroups={
  '色系':new Set(['白色','香槟','蓝色','粉色','红色','绿色','紫色','橙色','奶茶裸色','雾霾蓝','黑色','金色','墨绿','白绿','粉紫','红金','黑金色','白黑','黑粉','黑橙','黑白','黑红','紫白','粉黑','红粉','红黑','绿白','白橙','黑蓝','蓝黑','橙白','橙黑','黑紫','紫黑','白蓝','橙金','金黑','白粉','金绿']),
  '类型':new Set(['室内','户外','室内宴会厅','户外草坪'])
};
function rankedTags(){let usage=new Map(db.tags.map((tag,index)=>[tag,{count:0,index}]));db.cases.forEach(c=>(c.tags||[]).forEach(tag=>{let item=usage.get(tag);if(item)item.count++}));let groups={'色系':[],'类型':[],'风格':[]};db.tags.forEach(tag=>groups[tagGroups['色系'].has(tag)?'色系':tagGroups['类型'].has(tag)?'类型':'风格'].push(tag));return Object.entries(groups).map(([name,tags])=>[name,tags.sort((a,b)=>usage.get(b).count-usage.get(a).count||usage.get(a).index-usage.get(b).index)]).filter(([,tags])=>tags.length)}
function tagButton(tag){return `<button class="chip ${state.tag===tag?'active':''}" onclick="state.tag=state.tag==='${esc(tag)}'?'':'${esc(tag)}';resetPage()">${esc(tag)}</button>`}
function filterSections(){return [['婚礼类型',db.categories.length?db.categories:['全部案例']],...rankedTags()]}
function categoryButton(category){return `<button class="chip ${state.category===category?'active':''}" onclick="state.category='${esc(category)}';resetPage()">${esc(category)}</button>`}
function filterOptions(name,options){return options.map(name==='婚礼类型'?categoryButton:tagButton).join('')}
function tagFilters(){let sections=filterSections(),active=sections.find(([name])=>name===state.filterGroup)||sections[0];return `<section class="filter-navigation ${state.navigationOpen?'open':''}" onmouseenter="openNavigation()" onmouseleave="closeNavigation()"><button class="navigation-trigger" type="button" aria-expanded="${state.navigationOpen}" onclick="toggleNavigation()">导航 <span aria-hidden="true">${state.navigationOpen?'−':'+'}</span></button>${state.navigationOpen?`<div class="navigation-menu"><nav class="filter-sidebar" aria-label="筛选分类">${sections.map(([name])=>`<button class="filter-tab ${active?.[0]===name?'active':''}" onclick="selectFilterGroup('${esc(name)}')">${esc(name)}<span aria-hidden="true">›</span></button>`).join('')}</nav><section class="filter-panel" aria-live="polite"><div class="filter-panel-heading"><strong>${esc(active?.[0]||'筛选')}</strong><button class="filter-clear" onclick="clearFilters()">清除筛选</button></div><div class="filter-option-list">${active?filterOptions(active[0],active[1]):''}</div></section></div>`:''}</section>`}
function openNavigation(){if(!state.navigationOpen){state.navigationOpen=true;render()}}
function closeNavigation(){if(state.navigationOpen){state.navigationOpen=false;render()}}
function toggleNavigation(){state.navigationOpen=!state.navigationOpen;render()}
function selectFilterGroup(name){state.filterGroup=name;state.navigationOpen=true;render()}
function clearFilters(){state.category='全部案例';state.tag='';resetPage()}
function filterSearch(){return `<label class="case-search"><span class="case-search-icon" aria-hidden="true">⌕</span><input id="case-search-input" type="search" autocomplete="off" enterkeyhint="search" placeholder="按案例名称搜索" aria-label="按案例名称关键字搜索" value="${esc(state.query)}" oninput="updateQuery(this.value)"><button type="button" class="case-search-clear ${state.query?'':'hide'}" aria-label="清空搜索" onclick="state.query='';resetPage()">×</button></label>`}
function toggleFav(id,image){let a=image?pics():favs();a=a.includes(id)?a.filter(x=>x!==id):[...a,id];localStorage[image?'picFavs':'favs']=JSON.stringify(a);render()}
function header(){return `<header class="top"><div class="brand brand-home" role="button" tabindex="0" title="回到案例库首页" onclick="render()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();render()}">诺漫婚礼策划<small>WEDDING ATELIER</small></div><div class="grow"></div><div class="top-actions"><button class="ghost" onclick="showBoard()">♡ 灵感板</button>${!state.presentation?`<button class="ghost" onclick="presentation()">展示模式</button>${state.admin?'<button class="ghost" onclick="openVisitStats()">浏览数据</button><button class="ghost" onclick="openMemberAdmin()">用户与合伙人</button><button class="ghost" onclick="openSupportAdmin()">客服留言</button>':''}${isPartner()?'<button class="gold" onclick="openPartnerCases()">我的案例</button>':''}<button class="gold" onclick="adminGate()">${state.admin?'管理案例':'管理'}</button>`:`<button class="ghost" onclick="presentation()">退出展示</button>`}</div></header>`}
const PER_PAGE=15;function resetPage(){state.page=1;render()}function startCarousel(){clearInterval(window.featuredTimer);let track=document.querySelector('.featured-track');if(!track||track.children.length<2)return;let index=0;window.featuredTimer=setInterval(()=>{index=(index+1)%track.children.length;track.children[index].scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'})},4500)}function carousel(){let pinned=db.cases.filter(c=>c.pinnedAt).sort((a,b)=>b.pinnedAt-a.pinnedAt).slice(0,5);if(!pinned.length)return '';setTimeout(startCarousel,0);return `<section class="featured"><div class="eyebrow">FEATURED WEDDINGS</div><div class="featured-track">${pinned.map(c=>`<button class="featured-card" onclick="detail('${c.id}')" style="background-image:linear-gradient(90deg,#0008,#0001),url('${c.preview||c.cover||''}')"><span>置顶案例</span><strong>${esc(c.title)}</strong></button>`).join('')}</div></section>`}function pages(total){let count=Math.ceil(total/PER_PAGE);return count<2?'':`<nav class="pagination"><button class="ghost" ${state.page===1?'disabled':''} onclick="state.page--;render()">上一页</button><span>第 ${state.page} / ${count} 页 · 共 ${total} 场</span><button class="ghost" ${state.page===count?'disabled':''} onclick="state.page++;render()">下一页</button><form class="page-jump" onsubmit="event.preventDefault();jumpPage(this,${count})"><label>跳至 <input name="page" type="number" min="1" max="${count}" step="1" value="${state.page}" required aria-label="跳转页码"> 页</label><button class="ghost" type="submit">跳转</button></form></nav>`}
function card(c){let cover=c.preview||c.cover||'';return `<article class="card" onclick="detail('${c.id}')">${cover?`<img src="${cover}" alt="${esc(c.title)}" loading="lazy" decoding="async">`:''}<button class="heart" onclick="event.stopPropagation();toggleFav('${c.id}')">${favs().includes(c.id)?'♥':'♡'}</button><div class="cardinfo"><div class="cardtitle">${esc(c.title)}</div><div class="cardmeta">${esc(c.date||'未标注日期')}　·　${esc(c.category||'婚礼案例')}</div></div></article>`}
function footer(){return `<footer class="site-footer"><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">蜀ICP备2026052810号-1</a></footer>`}
function detail(id){let c=db.cases.find(x=>x.id===id);if(!c)return;app.innerHTML=header()+`<main class="case-detail"><button class="back" onclick="render()">← 返回案例库</button><h1>${esc(c.title)}</h1><div class="cardmeta">${esc(c.date||'')}　 ${esc(c.category||'')}　 ${c.tags?.map(esc).join(' · ')||''}</div><p class="description">${esc(c.description||'')}</p>${canEditCase(c)?`<button class="gold" onclick="openEditor('${c.id}')">编辑案例</button> <button class="ghost" onclick="deleteCase('${c.id}')">删除</button>`:''}<section class="masonry" style="margin-top:25px">${(c.images||[]).map((x,i)=>`<div style="position:relative"><img src="${x}" onclick="viewer('${c.id}',${i})" oncontextmenu="event.preventDefault()" draggable="false">${state.admin?`<button class="admin-photo-like ghost" onclick="event.stopPropagation();adminLikeImage('${c.id}',${i},this)">设为封面</button>`:''}<button class="heart" onclick="event.stopPropagation();toggleFav('${c.id}:${i}',true)">${pics().includes(c.id+':'+i)?'♥':'♡'}</button></div>`).join('')}</section></main>`+footer()}
function viewer(id,index){let c=db.cases.find(x=>x.id===id), update=()=>modal.innerHTML=`<div class="viewer"><button class="close" onclick="modal.innerHTML=''">×</button><button class="nav prev" onclick="move(-1)">‹</button><img class="mainimg" src="${c.images[index]}" oncontextmenu="event.preventDefault()" draggable="false"><button class="nav next" onclick="move(1)">›</button><div class="thumbs">${c.images.map((x,i)=>`<img class="${i===index?'on':''}" src="${x}" onclick="viewer('${id}',${i})" oncontextmenu="event.preventDefault()" draggable="false">`).join('')}</div></div>`;window.move=n=>{index=(index+n+c.images.length)%c.images.length;update()};update()}
function adminGate(){if(state.admin)return openEditor();modal.innerHTML=`<div class="login-layer"><section class="login-box"><button class="close" onclick="modal.innerHTML=''">×</button><div class="eyebrow">NOMAN WEDDING</div><h2>进入管理模式</h2><p>请输入管理员账号和密码后管理案例资料。</p><input id="admin-username" placeholder="管理员账号" autocomplete="username"><input id="admin-password" type="password" placeholder="管理密码" autocomplete="current-password" autofocus onkeydown="if(event.key==='Enter')checkAdmin()"><button class="gold" onclick="checkAdmin()">进入管理</button><div class="login-error" id="login-error"></div></section></div>`;setTimeout(()=>$('#admin-username')?.focus(),0)}
async function checkAdmin(){let r=await api('/api/login',{method:'POST',body:JSON.stringify({username:$('#admin-username').value.trim(),password:$('#admin-password').value})});if(r.ok){sessionStorage.adminToken=r.token;state.admin=true;modal.innerHTML='';render()}else $('#login-error').textContent=r.error||'账号或密码不正确，请重新输入。'}
async function openVisitStats(){
  modal.innerHTML='<div class="login-layer"><section class="login-box visit-stats"><button class="close" onclick="modal.innerHTML=\'\'">×</button><div class="eyebrow">SITE ANALYTICS</div><h2>浏览数据</h2><p>数据加载中…</p></section></div>';
  const box=modal.querySelector('.visit-stats');
  try{
    const stats=await api('/api/admin/visit-stats');
    if(stats.error)throw new Error(stats.error);
    const rows=(stats.days||[]).map(item=>`<tr><td>${esc(item.date)}</td><td>${Number(item.views||0).toLocaleString('zh-CN')}</td></tr>`).join('')||'<tr><td colspan="2">暂无浏览记录</td></tr>';
    box.innerHTML=`<button class="close" onclick="modal.innerHTML=''">×</button><div class="eyebrow">SITE ANALYTICS</div><h2>浏览数据</h2><p>按网站首页请求次数（PV）统计；所有数据均从此功能上线后开始累计。</p><div class="visit-summary"><div><small>今日浏览量</small><strong>${Number(stats.today||0).toLocaleString('zh-CN')}</strong></div><div><small>历史总浏览量</small><strong>${Number(stats.total||0).toLocaleString('zh-CN')}</strong></div></div><div class="visit-table-wrap"><table class="visit-table"><thead><tr><th>日期</th><th>浏览量</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }catch(e){box.innerHTML=`<button class="close" onclick="modal.innerHTML=''">×</button><h2>浏览数据</h2><p class="login-error">${esc(e.message||'读取浏览数据失败，请重试')}</p>`}
}
async function presentation(){state.presentation=!state.presentation;state.admin=false;sessionStorage.removeItem('adminToken');db=await fetch('/api/data').then(r=>r.json());render()}
function openEditor(id){if(!state.admin&&!isPartner())return;if(id&&!canEditCase(db.cases.find(x=>x.id===id)))return alert('只能编辑自己发布的案例');editing=id?structuredClone(db.cases.find(x=>x.id===id)):{title:'',category:db.categories[1]||'套餐婚礼',tags:[],date:new Date().toISOString().slice(0,10),description:'',images:[],cover:'',pinnedAt:0};editing.pinned=Boolean(editing.pinnedAt);drawEditor()}
function drawEditor(){let c=editing;modal.innerHTML=`<aside class="drawer"><button class="close" onclick="modal.innerHTML=''">×</button><h2>${c.id?'编辑案例':'新增案例'}</h2><div class="form"><label>案例名称 *</label><input id="title" value="${esc(c.title)}"><label class="pin-control"><input id="pinned" type="checkbox" ${c.pinned?'checked':''}> 置顶展示（最新置顶优先，最多轮播 5 场）</label><div class="row"><div><label>一级分类</label><select id="category">${db.categories.filter(x=>x!=='全部案例').map(x=>`<option ${x===c.category?'selected':''}>${esc(x)}</option>`).join('')}</select></div><div><label>婚礼日期</label><input id="date" type="date" value="${esc(c.date)}"></div></div><label>标签（多选）</label><div class="filterrow">${db.tags.map(x=>`<button type="button" class="chip ${c.tags.includes(x)?'active':''}" onclick="tagEdit('${esc(x)}')">${esc(x)}</button>`).join('')}</div><label>案例介绍</label><textarea id="description">${esc(c.description)}</textarea><label>案例图片（可一次选择多张，也可拖放）</label><div class="upload" id="drop">拖入婚礼照片，或点击选择<input id="files" type="file" accept="image/*" multiple hidden></div><div class="previews">${c.images.map((x,i)=>`<div class="preview" draggable="true" ondragstart="drag=${i}" ondragover="event.preventDefault()" ondrop="reorder(${i})"><img src="${x}"><button onclick="removeImg(${i})">×</button><small>${x===c.cover?'封面':''}</small></div>`).join('')}</div><p class="cardmeta">拖动缩略图调整顺序；点击缩略图可在下方设为封面。</p><label>封面图</label><select id="cover">${c.images.map((x,i)=>`<option value="${x}" ${x===c.cover?'selected':''}>第 ${i+1} 张图片</option>`).join('')}</select><label>分类与标签管理</label><div class="row"><button class="ghost" onclick="manageMeta('categories')">管理分类</button><button class="ghost" onclick="manageMeta('tags')">管理标签</button></div><br><button id="save-case" class="gold" onclick="saveCase()">保存案例</button><p id="save-status" role="status" aria-live="polite"></p></div></aside>`;let file=$('#files'),drop=$('#drop');drop.onclick=()=>file.click();file.onchange=()=>upload([...file.files]);drop.ondragover=e=>e.preventDefault();drop.ondrop=e=>{e.preventDefault();upload([...e.dataTransfer.files])}}
function jumpPage(form,count){let page=Number(form.elements.page.value);if(!Number.isInteger(page)||page<1||page>count)return;state.page=page;render()}
function captureEditor(){if(!$('#title'))return;editing.title=$('#title').value.trim();editing.pinned=$('#pinned')?.checked||false;editing.category=$('#category').value;editing.date=$('#date').value;editing.description=$('#description').value;editing.cover=$('#cover').value;if($('#price'))editing.price=$('#price').value.trim()}
let drag=0;function reorder(to){captureEditor();let [x]=editing.images.splice(drag,1);editing.images.splice(to,0,x);drawEditor()}function removeImg(i){captureEditor();editing.images.splice(i,1);if(editing.cover&&!editing.images.includes(editing.cover))editing.cover=editing.images[0]||'';drawEditor()}function tagEdit(t){captureEditor();editing.tags=editing.tags.includes(t)?editing.tags.filter(x=>x!==t):[...editing.tags,t];drawEditor()}
let uploading=false;
async function upload(files){if(uploading)return;let selected=files.filter(x=>x.type.startsWith('image/'));if(editing.images.length+selected.length>12)return alert('每个案例最多 12 张图片，请先移除多余图片');if(!selected.length)return;uploading=true;const drop=$('#drop'),status=document.createElement('p');status.setAttribute('role','status');drop.appendChild(status);try{for(let [i,f] of selected.entries()){status.textContent=`正在识别和上传第 ${i+1}/${selected.length} 张图片…`;let r=await fetch('/api/upload',{method:'POST',headers:{'Content-Type':f.type,Authorization:`Bearer ${state.admin?adminToken():localStorage.memberToken||''}`},body:f});let d=await r.json();if(d.error){alert(d.error);break}editing.images.push(d.url)}captureEditor();if(!editing.cover)editing.cover=editing.images[0]||'';drawEditor()}finally{uploading=false}}
let savingCase=false;
async function saveCase(){
  if(savingCase)return;
  if(uploading)return alert('请等待图片识别和上传完成');
  captureEditor();
  if(!editing.title)return alert('请填写案例名称');
  if(editing.images.length>12)return alert('每个案例最多 12 张图片');
  savingCase=true;
  const current=editing,button=$('#save-case'),status=$('#save-status');
  if(button){button.disabled=true;button.textContent='保存中…'}
  if(status)status.textContent='';
  try{
    const r=await (state.admin?api('/api/save',{method:'POST',body:JSON.stringify({case:current})}):memberApi('/api/save',{method:'POST',body:JSON.stringify({case:current})}));
    if(r.error)throw new Error(r.error);
    Object.assign(current,{id:r.case.id,pinnedAt:r.case.pinnedAt});
    const index=db.cases.findIndex(c=>c.id===r.case.id);
    if(index<0)db.cases.unshift(r.case);else db.cases[index]=r.case;
    if(editing===current&&modal.contains(button)){
      detail(current.id);
      modal.innerHTML='';
    }
  }catch(e){if(status)status.textContent=e.message||'保存失败，请重试'}
  finally{savingCase=false;if(button){button.disabled=false;button.textContent='保存案例'}}
}
async function deleteCase(id){if(!confirm('确定删除该案例吗？已上传的图片会保留在本地文件夹中。'))return;try{let r=await (state.admin?api('/api/delete',{method:'POST',body:JSON.stringify({id})}):memberApi('/api/delete',{method:'POST',body:JSON.stringify({id})}));if(r.error)return alert(r.error);db=await api('/api/data');render()}catch(e){alert(e.message||'删除失败')}}
async function manageMeta(key){let label=key==='categories'?'分类（以英文逗号隔开，需保留“全部案例”）':'标签（以英文逗号隔开）',v=prompt(label,db[key].join(','));if(v===null)return;db[key]=v.split(',').map(x=>x.trim()).filter(Boolean);await api('/api/meta',{method:'POST',body:JSON.stringify({[key]:db[key]})});drawEditor()}
function showBoard(){let cases=db.cases.filter(c=>favs().includes(c.id)),imageList=[];db.cases.forEach(c=>(c.images||[]).forEach((x,i)=>{if(pics().includes(c.id+':'+i))imageList.push({x,c})}));app.innerHTML=header()+`<main class="board"><div class="eyebrow">YOUR WEDDING MOODBOARD</div><h1>我的灵感板</h1><p class="description">收藏你心动的婚礼案例与细节图片，和策划师一起创造专属婚礼。</p><h3>收藏案例</h3><section class="grid" style="padding:10px 0">${cases.map(card).join('')||'<div class="empty">还没有收藏案例</div>'}</section><h3>收藏细节</h3><section class="masonry">${imageList.map(i=>`<img src="${i.x}" title="${esc(i.c.title)}">`).join('')||'<p class="description">在案例详情中，点击图片右上角的 ♡ 收藏细节。</p>'}</section></main>`+footer()}
window.onkeydown=e=>{
  if((e.code==='Backquote'||e.key==='·'||e.key==='`')&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.shiftKey&&!e.repeat&&!e.isComposing&&!e.defaultPrevented){
    const typing=e.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
    const back=app.querySelector('.case-detail > button.back');
    if(back&&!typing&&!modal.childElementCount){e.preventDefault();back.click();return}
  }
  if(e.key==='Escape')modal.innerHTML='';
  if(e.key==='ArrowLeft'&&modal.querySelector('.viewer'))move(-1);
  if(e.key==='ArrowRight'&&modal.querySelector('.viewer'))move(1);
};
function filteredCases(){let keyword=state.query.trim().normalize('NFKC').toLocaleLowerCase('zh-CN');return db.cases.filter(c=>(state.category==='全部案例'||c.category===state.category)&&(!state.tag||c.tags?.includes(state.tag))&&(!keyword||String(c.title||'').normalize('NFKC').toLocaleLowerCase('zh-CN').includes(keyword)))}
function caseResults(){let list=filteredCases(),count=Math.ceil(list.length/PER_PAGE);if(state.page>Math.max(count,1))state.page=Math.max(count,1);let pageList=list.slice((state.page-1)*PER_PAGE,state.page*PER_PAGE),emptyTitle=state.query.trim()?`没有找到名称中包含“${esc(state.query.trim())}”的案例`:'没有符合当前筛选条件的案例';return `<main class="grid">${pageList.length?pageList.map(card).join(''):`<div class="empty">${emptyTitle}<br><br>${state.admin?'<button class="gold" onclick="openEditor()">添加案例</button>':'请尝试其他名称或筛选条件'}</div>`}</main>${pages(list.length)}`}
function updateQuery(value){state.query=value;state.page=1;let results=$('#case-results');if(results)results.innerHTML=caseResults();let clear=$('.case-search-clear');if(clear)clear.classList.toggle('hide',!state.query)}
function render(){app.innerHTML=header()+`<section class="hero"><div class="eyebrow">CURATED WEDDING STORIES</div><h1>把每一场心动，留成一页风景</h1><p>探索我们的婚礼灵感与真实现场，找到属于你的那一场。</p></section><section class="filters">${filterSearch()}${carousel()}${tagFilters()}</section><div id="case-results">${caseResults()}</div>`+footer()}
api('/api/data').then(x=>{db=x;render()});

// 管理员点赞：最新点赞的照片排在第一张，同时更新套餐封面。
let likingImage=false;
async function adminLikeImage(id,index,button){
  if(!state.admin||button.disabled||likingImage)return;
  const c=db.cases.find(item=>item.id===id);
  if(!c||!c.images?.[index])return;
  likingImage=true;
  button.disabled=true;
  button.textContent='保存中…';
  const images=[...c.images], [selected]=images.splice(index,1);
  images.unshift(selected);
  try{
    const r=await api('/api/save',{method:'POST',body:JSON.stringify({case:{...c,images,cover:selected,pinned:Boolean(c.pinnedAt)}})});
    if(r.error)throw new Error(r.error);
    db.cases[db.cases.findIndex(item=>item.id===id)]=r.case;
    detail(id);
  }catch(e){button.disabled=false;button.textContent='设为封面';alert(e.message||'点赞保存失败，请重试')}
  finally{likingImage=false}
}
