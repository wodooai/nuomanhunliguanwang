// 为套餐案例补充可后填的价格字段；保留原有管理与保存流程。
const originalDrawEditor = drawEditor;
drawEditor = function () {
  originalDrawEditor();
  const description = document.querySelector('#description');
  if (description) description.insertAdjacentHTML('beforebegin', `<label>套餐价格</label><input id="price" placeholder="例如：¥ 5,200 起" value="${esc(editing.price || '')}">`);
};
const originalSaveCase = saveCase;
saveCase = async function () {
  editing.price = document.querySelector('#price')?.value.trim() || '';
  return originalSaveCase();
};
const originalCard = card;
card = function (c) {
  const html = originalCard(c);
  return c.price ? html.replace('</div></article>', `<div class="cardmeta">套餐价 ${esc(c.price)}</div></div></article>`) : html;
};
