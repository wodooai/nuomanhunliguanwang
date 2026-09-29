const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const validEmail = email => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function createEmailRecovery(dataDir, secret) {
  const file = path.join(dataDir, 'email-challenges.json');
  const configured = Boolean(process.env.NUOMAN_SMTP_HOST && process.env.NUOMAN_SMTP_USER && process.env.NUOMAN_SMTP_PASSWORD && process.env.NUOMAN_SMTP_FROM);
  const testOutbox = process.env.NODE_ENV === 'test' ? process.env.NUOMAN_MAIL_TEST_OUTBOX : '';
  const ready = configured || Boolean(testOutbox);
  const transport = configured ? nodemailer.createTransport({
    host: process.env.NUOMAN_SMTP_HOST,
    port: Number(process.env.NUOMAN_SMTP_PORT || 465),
    secure: Number(process.env.NUOMAN_SMTP_PORT || 465) === 465,
    requireTLS: Number(process.env.NUOMAN_SMTP_PORT || 465) !== 465,
    auth: { user: process.env.NUOMAN_SMTP_USER, pass: process.env.NUOMAN_SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  }) : null;
  const read = () => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const write = db => fs.writeFileSync(file, JSON.stringify(db), { mode: 0o600 });
  const key = (purpose, email) => `${purpose}:${email}`;
  const digest = (purpose, email, code) => crypto.createHmac('sha256', secret).update(`${purpose}:${email}:${code}`).digest('hex');
  const prune = db => { for (const [name, value] of Object.entries(db)) if (value.expiresAt < Date.now()) delete db[name]; };

  async function issue(purpose, rawEmail) {
    const email = normalizeEmail(rawEmail);
    if (!validEmail(email)) return { error: '请输入有效的电子邮箱', status: 400 };
    if (!ready) return { error: '邮箱找回服务暂未开通，请联系官网客服', status: 503 };
    const db = read();
    prune(db);
    const name = key(purpose, email);
    if (db[name]?.sentAt > Date.now() - 60000) return { error: '发送太频繁，请 60 秒后再试', status: 429 };
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    try {
      if (testOutbox) fs.appendFileSync(testOutbox, JSON.stringify({ purpose, email, code }) + '\n');
      else await transport.sendMail({ from: process.env.NUOMAN_SMTP_FROM, to: email, subject: '诺漫婚礼邮箱验证码', text: `您的诺漫婚礼验证码为：${code}。10 分钟内有效，请勿转发给他人。` });
    } catch {
      return { error: '邮件发送失败，请稍后再试或联系官网客服', status: 503 };
    }
    db[name] = { hash: digest(purpose, email, code), expiresAt: Date.now() + 600000, sentAt: Date.now(), attempts: 0 };
    write(db);
    return { ok: true, message: '验证码已发送，10 分钟内有效' };
  }

  function consume(purpose, rawEmail, rawCode) {
    const email = normalizeEmail(rawEmail), code = String(rawCode || '').trim(), db = read(), name = key(purpose, email), entry = db[name];
    if (!entry || entry.expiresAt < Date.now() || entry.attempts >= 5 || !/^\d{6}$/.test(code)) return false;
    entry.attempts++;
    const expected = digest(purpose, email, code);
    const matches = crypto.timingSafeEqual(Buffer.from(entry.hash, 'hex'), Buffer.from(expected, 'hex'));
    if (matches) delete db[name];
    write(db);
    return matches;
  }

  return { ready, issue, consume, normalizeEmail, validEmail };
}

module.exports = { createEmailRecovery };
