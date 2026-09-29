// 飞书只保存不可逆的密码摘要与盐值，绝不上传明文密码或 API 密钥。
const API = 'https://open.feishu.cn/open-apis';
const columns = {
  id: '用户ID', name: '姓名', phone: '账号（手机号）', email: '邮箱',
  emailVerified: '邮箱已验证', role: '用户属性', hash: '密码摘要',
  salt: '密码盐值', algorithm: '密码算法', createdAt: '注册时间', adminNote: '管理员备注'
};
const memberBackupFields = m => ({
  [columns.id]: m.id,
  [columns.name]: m.name || '',
  [columns.phone]: m.phone || '',
  [columns.email]: m.email || '',
  [columns.emailVerified]: m.emailVerified ? '是' : '否',
  [columns.role]: m.role === 'partner' ? '内部' : '外部',
  [columns.hash]: m.passwordHash || '',
  [columns.salt]: m.salt || '',
  [columns.algorithm]: 'node:scrypt:default:N16384:r8:p1:dkLen32:hex',
  [columns.createdAt]: m.createdAt ? new Date(m.createdAt).toISOString() : '',
  [columns.adminNote]: m.adminNote || ''
});

function createMemberBackup(readMembers) {
  const appId = process.env.NUOMAN_FEISHU_APP_ID;
  const appSecret = process.env.NUOMAN_FEISHU_APP_SECRET;
  const baseToken = process.env.NUOMAN_FEISHU_BASE_TOKEN;
  const tableId = process.env.NUOMAN_FEISHU_TABLE_ID;
  const enabled = Boolean(appId && appSecret && baseToken && tableId);
  let token = '', tokenExpires = 0, inFlight = null;
  const endpoint = `${API}/base/v3/bases/${encodeURIComponent(baseToken || '')}/tables/${encodeURIComponent(tableId || '')}/records`;
  async function json(url, options = {}) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok || data.code !== 0) throw new Error(`飞书接口失败（HTTP ${response.status}，代码 ${data.code ?? 'unknown'}）`);
    return data;
  }
  async function accessToken() {
    if (token && tokenExpires > Date.now() + 60000) return token;
    const data = await json(`${API}/auth/v3/tenant_access_token/internal`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    token = data.tenant_access_token;
    tokenExpires = Date.now() + Math.min(Number(data.expire || 3600), 3600) * 1000;
    return token;
  }
  async function records(method, suffix = '', payload) {
    const auth = await accessToken();
    return json(endpoint + suffix, {
      method, headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      ...(payload ? { body: JSON.stringify(payload) } : {})
    });
  }
  async function sync() {
    if (!enabled) return { enabled: false };
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const existing = new Map();
      let offset = 0;
      do {
        const suffix = `?limit=200&offset=${offset}`;
        const data = await records('GET', suffix);
        const page = data.data || {};
        for (let index = 0; index < (page.record_id_list || []).length; index++) {
          const row = Object.fromEntries((page.fields || []).map((field, position) => [field, page.data?.[index]?.[position] ?? '']));
          const id = row[columns.id];
          if (id) existing.set(String(id), { record_id: page.record_id_list[index], fields: row });
        }
        offset += (page.record_id_list || []).length;
        if (!page.has_more) break;
        if (!(page.record_id_list || []).length) throw new Error('飞书分页结果异常');
      } while (true);
      let created = 0, updated = 0;
      for (const member of readMembers().members) {
        const desired = memberBackupFields(member), record = existing.get(member.id);
        if (!record) {
          await records('POST', '/batch_create', { create_records: [desired] });
          created++;
        } else if (Object.entries(desired).some(([name, value]) => String(record.fields?.[name] ?? '') !== String(value))) {
          await records('POST', '/batch_update', { update_records: { [record.record_id]: desired } });
          updated++;
        }
      }
      return { enabled: true, created, updated };
    })().finally(() => { inFlight = null; });
    return inFlight;
  }
  return { enabled, sync, columns };
}

module.exports = { createMemberBackup, memberBackupFields, columns };
