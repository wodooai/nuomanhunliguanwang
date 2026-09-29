const { spawn } = require('child_process');
const sharp = require('sharp');

function scanText(value, fromImage = false) {
  const text = String(value || '').normalize('NFKC').replace(/[\u200b-\u200f\ufeff]/g, '');
  const compact = text.replace(/[\s·_—-]/g, '');
  if (/(?:^|\D)1[3-9]\d{9}(?:\D|$)/.test(compact) || /(?:0\d{2,3}|400|800)[- ]?\d{7,8}/.test(text)) return '电话号码';
  if (/微信|微\s*信|wechat|weixin|(?:^|\W)(?:wx|vx)\s*[:：号]/i.test(text) || /二维码|扫码|公众号|添加好友|联系(?:方式|电话|微信)/.test(text)) return '联系方式';
  if (/地址|门店|导航|到店|路\d+号|街\d+号|大道\d+号|写字楼|商业广场|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i.test(text)) return '地址或其他联系方式';
  const withoutPlatform = text.replace(/诺漫婚礼/g, '');
  if (/(?:店名|品牌|出品|承办|策划|摄影|摄像)\s*[:：]\s*[^\s，。]{2,20}/.test(withoutPlatform)) return '商家名称';
  if (/[\u4e00-\u9fa5A-Za-z0-9]{2,16}(?:婚庆公司|婚礼策划公司|婚礼工作室|摄影工作室|影楼|文化传媒)/.test(withoutPlatform)) return '商家名称';
  if (fromImage && text.split(/[\r\n]+/).some(line => /^[\u4e00-\u9fa5A-Za-z0-9]{2,10}(?:婚庆|婚礼|摄影)$/.test(line.trim()) && !line.includes('诺漫婚礼'))) return '商家名称';
  return '';
}

function recognize(buffer) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.TESSERACT_PATH || 'tesseract', ['stdin', 'stdout', '-l', 'chi_sim+eng', '--psm', '11'], { windowsHide: true });
    let output = '', settled = false;
    const done = (error, result) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(result); };
    const timer = setTimeout(() => { child.kill(); done(new Error('图片文字识别超时，请稍后重试')); }, 30000);
    child.on('error', () => done(new Error('图片文字识别服务不可用，请稍后重试')));
    child.stdout.on('data', chunk => { output += chunk.toString(); if (output.length > 100000) { child.kill(); done(new Error('图片中文字过多，请更换图片')) } });
    child.on('close', code => done(code === 0 ? null : new Error('图片文字识别失败，请稍后重试'), output));
    child.stdin.on('error', () => {});
    child.stdin.end(buffer);
  });
}

async function scanImage(buffer) {
  const input = await sharp(buffer).rotate().resize({ width: 1800, withoutEnlargement: true }).png().toBuffer();
  return scanText(await recognize(input), true);
}

module.exports = { scanText, scanImage };
