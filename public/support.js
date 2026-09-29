const supportButton=document.createElement('button');
supportButton.id='support-launcher';
supportButton.type='button';
supportButton.textContent='联系官网客服';
supportButton.setAttribute('aria-label','打开官网客服留言');
supportButton.onclick=()=>openSupport();
document.body.appendChild(supportButton);

const supportPanel=document.createElement('aside');
supportPanel.id='support-panel';
supportPanel.setAttribute('role','dialog');
supportPanel.setAttribute('aria-label','官网客服');
supportPanel.hidden=true;
document.body.appendChild(supportPanel);

const supportHistory=()=>{try{return JSON.parse(localStorage.supportHistory||'[]')}catch{return []}};
function openSupport(){
  supportPanel.hidden=false;
  supportPanel.innerHTML=`<div class="support-heading"><div><strong>官网客服</strong><small>文字留言</small></div><button type="button" aria-label="关闭客服窗口" onclick="closeSupport()">×</button></div><div class="support-messages"><p class="support-intro">您好，请留下问题和联系方式。管理员查看后会联系您。</p>${supportHistory().map(m=>`<div class="support-bubble"><p>${esc(m.text)}</p><small>${new Date(m.createdAt).toLocaleString('zh-CN')}</small></div>`).join('')}</div><form class="support-form" onsubmit="sendSupport(event)"><input id="support-name" maxlength="40" placeholder="称呼（选填）" value="${esc(localStorage.supportName||'')}"><input id="support-phone" maxlength="30" placeholder="手机号或微信（选填）" value="${esc(localStorage.supportPhone||'')}"><textarea id="support-text" maxlength="1000" required placeholder="请输入文字留言"></textarea><button class="gold" type="submit">发送留言</button><p id="support-status" role="status"></p></form>`;
  supportPanel.querySelector('.support-messages').scrollTop=999999;
  supportPanel.querySelector('#support-text').focus();
}
function closeSupport(){supportPanel.hidden=true}
async function sendSupport(event){
  event.preventDefault();
  const name=supportPanel.querySelector('#support-name').value.trim(),phone=supportPanel.querySelector('#support-phone').value.trim(),text=supportPanel.querySelector('#support-text').value.trim(),button=supportPanel.querySelector('button[type="submit"]'),status=supportPanel.querySelector('#support-status');
  if(!text)return;
  button.disabled=true;status.textContent='发送中…';
  try{
    const response=await fetch('/api/support/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,phone,text})});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'发送失败');
    localStorage.supportName=name;localStorage.supportPhone=phone;
    localStorage.supportHistory=JSON.stringify([...supportHistory(),data.message].slice(-30));
    openSupport();
    supportPanel.querySelector('#support-status').textContent='已发送，管理员会查看您的留言。';
  }catch(error){status.textContent=error.message;button.disabled=false}
}
