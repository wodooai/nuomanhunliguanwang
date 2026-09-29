const assert = require('node:assert/strict');
const { createMemberBackup, memberBackupFields } = require('../member-backup');

process.env.NUOMAN_FEISHU_APP_ID = 'test-app';
process.env.NUOMAN_FEISHU_APP_SECRET = 'test-secret';
process.env.NUOMAN_FEISHU_BASE_TOKEN = 'test-base';
process.env.NUOMAN_FEISHU_TABLE_ID = 'tblTest';
const member = { id: 'user-1', name: '测试用户', phone: '13800000000', email: 'a@example.com', emailVerified: false, role: 'member', passwordHash: 'sample-hash', salt: 'sample-salt', createdAt: 1760000000000 };
const rows = [];
const calls = [];
global.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), method: options.method || 'GET' });
  let result;
  if (String(url).includes('tenant_access_token')) result = { code: 0, tenant_access_token: 'test-token', expire: 3600 };
  else if ((options.method || 'GET') === 'GET') {
    const fields = Object.keys(memberBackupFields(member));
    result = { code: 0, data: { fields, record_id_list: rows.map(x => x.id), data: rows.map(x => fields.map(name => x.fields[name])), has_more: false } };
  } else if (String(url).endsWith('/batch_create')) {
    const value = JSON.parse(options.body).create_records[0];
    rows.push({ id: 'rec1', fields: value });
    result = { code: 0, data: { record_id_list: ['rec1'] } };
  } else if (String(url).endsWith('/batch_update')) {
    rows[0].fields = Object.values(JSON.parse(options.body).update_records)[0];
    result = { code: 0, data: {} };
  } else throw new Error('unexpected URL');
  return { ok: true, status: 200, json: async () => result };
};

(async () => {
  const backup = createMemberBackup(() => ({ members: [member] }));
  assert.equal((await backup.sync()).created, 1);
  assert.equal((await backup.sync()).created, 0);
  assert.equal(rows[0].fields['密码摘要'], 'sample-hash');
  assert.equal(rows[0].fields['用户属性'], '外部');
  assert.equal(rows[0].fields['管理员备注'], '');
  assert(!Object.keys(rows[0].fields).includes('password'));
  member.role = 'partner';
  member.adminNote = '客户称呼：小甲';
  assert.equal((await backup.sync()).updated, 1);
  assert.equal(rows[0].fields['用户属性'], '内部');
  assert.equal(rows[0].fields['管理员备注'], '客户称呼：小甲');
  assert(calls.some(call => call.url.endsWith('/batch_create')));
  assert(calls.some(call => call.url.endsWith('/batch_update')));
  console.log('PASS: backup creates, de-duplicates, updates role, and stores digest instead of plaintext');
})().catch(error => { console.error(error); process.exitCode = 1; });
