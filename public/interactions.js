// Keep navigation and editing positions without changing saved case data.
window.addEventListener('DOMContentLoaded', () => {
  let view = {type:'list'}, history = [], editorScroll = 0, editorCase = null;
  let restoring = false, scrollVersion = 0;
  let editorPosition = null;
  const drawList = render, drawDetail = detail, drawBoard = showBoard;
  const snapshot = () => ({...view, state:{...state}, x:scrollX, y:scrollY});
  function restorePosition(x, y) {
    const version = ++scrollVersion;
    const apply = () => { if(version===scrollVersion)window.scrollTo({left:x,top:y,behavior:'instant'}); };
    apply();
    requestAnimationFrame(apply);
    for(const img of app.querySelectorAll('img'))if(!img.complete)img.addEventListener('load',apply,{once:true});
  }
  for(const event of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(event,()=>scrollVersion++,{passive:true});
  function navigate(next, draw) {
    const same = view.type===next.type && view.id===next.id;
    const previous = snapshot();
    if(!same&&!restoring)history.push(previous);
    view=next;
    draw();
    restorePosition(same?previous.x:0,same?previous.y:0);
  }
  render = () => navigate({type:'list'}, drawList);
  detail = id => navigate({type:'detail',id},()=>{
    drawDetail(id);
    if(state.admin&&!state.presentation&&db.cases.some(c=>c.id===id)){
      const button=document.createElement('button');
      button.type='button';button.className='gold edit-current-case';
      button.textContent='编辑案例';
      button.onclick=()=>{
        if(!state.admin)return;
        if(editing?.id===id&&modal.querySelector('#save-case'))return;
        openEditor(id);
      };
      const top=app.querySelector('.top');
      const manage=top?.querySelector('[onclick="adminGate()"]');
      if(top)top.insertBefore(button,manage||null);
    }
  });
  showBoard = () => {
    navigate({type:'board'},drawBoard);
    app.querySelector('.board')?.insertAdjacentHTML('afterbegin','<button class="back" data-return-view>← 返回上一页</button>');
  };
  function back() {
    const previous=history.pop();
    if(!previous){render();return}
    Object.assign(state,previous.state);
    restoring=true;
    try {
      if(previous.type==='detail')detail(previous.id);
      else if(previous.type==='board')showBoard();
      else render();
    } finally {restoring=false}
    restorePosition(previous.x,previous.y);
  }
  app.addEventListener('click',event=>{
    if(event.target.closest('.case-detail > .back,[data-return-view]')){
      event.preventDefault();event.stopImmediatePropagation();back();
    }
  },true);

  function drawEditableImages() {
    if(!state.admin||!editing?.id||view.type!=='detail'||view.id!==editing.id)return;
    const gallery=app.querySelector('.case-detail .masonry');
    if(!gallery)return;
    gallery.innerHTML=editing.images.map((url,index)=>`<div class="editing-photo"><img src="${esc(url)}"><button type="button" class="delete-photo" onclick="removeImg(${index})" aria-label="删除第 ${index+1} 张图片">× 删除图片</button></div>`).join('');
  }
  const drawForm=drawEditor, openForm=openEditor, removeImage=removeImg;
  openEditor=id=>{
    if(!editorCase)editorPosition={x:scrollX,y:scrollY};
    editorScroll=0;editorCase=id||null;
    document.body.classList.toggle('case-editing',Boolean(id&&view.type==='detail'&&view.id===id));
    openForm(id);
  };
  drawEditor=()=>{
    const drawer=modal.querySelector('.drawer');
    if(drawer)editorScroll=drawer.scrollTop;
    drawForm();
    const next=modal.querySelector('.drawer');
    if(next)next.scrollTop=editorScroll;
    drawEditableImages();
  };
  removeImg=index=>{
    if(savingCase||!canEditCase(editing)||!modal.querySelector('#save-case'))return;
    const x=scrollX,y=scrollY;
    removeImage(index);
    restorePosition(x,y);
  };
  modal.addEventListener('scroll',event=>{
    if(event.target.matches('.drawer'))editorScroll=event.target.scrollTop;
  },true);
  new MutationObserver(()=>{
    if(!modal.childElementCount&&editorCase){
      const id=editorCase;editorCase=null;editorScroll=0;
      document.body.classList.remove('case-editing');
      if(view.type==='detail'&&view.id===id){
        detail(id);
        if(editorPosition)restorePosition(editorPosition.x,editorPosition.y);
      }
      editorPosition=null;
    }
  }).observe(modal,{childList:true});
});
