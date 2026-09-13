// E2E Fase 1: bootstrap → login → org/user/role → numbering → audit → refresh/logout.
const BASE = 'http://localhost:3102';
const SFX = Date.now().toString(36);
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`ok   ${name}`); }
  else { fail++; console.log(`FAIL ${name} ${extra}`); }
};
const J = (r) => r.json();

const boot = await (await fetch(`${BASE}/auth/bootstrap`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    tenantCode: `E2E_${SFX}`.slice(0, 12), tenantName: 'E2E Corp',
    orgCode: 'HQ', orgName: 'Head Office',
    adminEmail: `boss-${SFX}@e2e.id`, adminPassword: 'Rahasia123', adminName: 'Boss E2E',
  }),
})).json();
check('bootstrap → token pair', !!(boot.accessToken && boot.refreshToken), JSON.stringify(boot).slice(0, 160));
const A = { Authorization: `Bearer ${boot.accessToken}`, 'content-type': 'application/json' };

const boot2 = await fetch(`${BASE}/auth/bootstrap`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
    tenantCode: 'E2E_XX', tenantName: 'XX', orgCode: 'XX', orgName: 'XX',
    adminEmail: 'xx@e2e.id', adminPassword: 'Rahasia123', adminName: 'XX',
}) });
check('bootstrap kedua → 403', boot2.status === 403, `status=${boot2.status}`);
const badBody = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'bukan-email' }) });
check('body invalid → 400', badBody.status === 400, `status=${badBody.status}`);

const me = await (await fetch(`${BASE}/auth/me`, { headers: A })).json();
check('me → admin', me.user?.email === `boss-${SFX}@e2e.id`, JSON.stringify(me).slice(0, 120));

const org = await (await fetch(`${BASE}/org/organizations`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ orgCode: 'BR1', legalName: 'Cabang Satu' }),
})).json();
check('buat organisasi', !!org.id, JSON.stringify(org).slice(0, 160));

const usr = await (await fetch(`${BASE}/users`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ email: `staff-${SFX}@e2e.id`, password: 'Rahasia123', fullName: 'Staff' }),
})).json();
check('buat user', !!usr.id, JSON.stringify(usr).slice(0, 160));

const role = await (await fetch(`${BASE}/rbac/roles`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ roleCode: 'STAFF', roleName: 'Staff' }),
})).json();
check('buat role', !!role.id, JSON.stringify(role).slice(0, 120));

const setp = await (await fetch(`${BASE}/rbac/roles/STAFF/permissions`, {
  method: 'POST', headers: A, body: JSON.stringify({ permissionCodes: ['org.read'] }),
})).json();
check('set permission role', setp.count === 1, JSON.stringify(setp));

const asg = await (await fetch(`${BASE}/users/${usr.id}/roles`, {
  method: 'POST', headers: A, body: JSON.stringify({ roleCode: 'STAFF' }),
})).json();
check('assign role ke user', asg.ok === true, JSON.stringify(asg));

const staffLogin = await (await fetch(`${BASE}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: `staff-${SFX}@e2e.id`, password: 'Rahasia123' }),
})).json();
const staffPayload = JSON.parse(Buffer.from(staffLogin.accessToken.split('.')[1], 'base64'));
check('staff login + klaim org.read', (staffPayload.permissions || []).includes('org.read'), JSON.stringify(staffPayload.permissions));

const S = { Authorization: `Bearer ${staffLogin.accessToken}` };
const forbidden = await fetch(`${BASE}/users`, { headers: S });
check('staff tanpa users.read → 403', forbidden.status === 403, `status=${forbidden.status}`);
const allowed = await fetch(`${BASE}/org/organizations`, { headers: S });
check('staff dengan org.read → 200', allowed.status === 200, `status=${allowed.status}`);

const seqDef = await (await fetch(`${BASE}/system/number-sequences`, {
  method: 'POST', headers: A,
  body: JSON.stringify({ documentType: 'SO', formatPattern: 'SO/{YYYY}/{MM}/{SEQ:5}' }),
})).json();
check('definisi sequence', !!seqDef.id, JSON.stringify(seqDef).slice(0, 120));
const n1 = await (await fetch(`${BASE}/system/number-sequences/next`, {
  method: 'POST', headers: A, body: JSON.stringify({ documentType: 'SO' }),
})).json();
const n2 = await (await fetch(`${BASE}/system/number-sequences/next`, {
  method: 'POST', headers: A, body: JSON.stringify({ documentType: 'SO' }),
})).json();
check('next increment + format', n2.seq === n1.seq + 1 && /^SO\/\d{4}\/\d{2}\/\d{5}$/.test(n1.formatted), JSON.stringify([n1, n2]));

const audit = await (await fetch(`${BASE}/system/audit-logs?limit=5`, { headers: A })).json();
check('audit-logs terbaca', Array.isArray(audit) && audit.length > 0, `n=${audit.length}`);

const perms = await (await fetch(`${BASE}/rbac/permissions`, { headers: A })).json();
check('katalog permissions ≥ 21', Array.isArray(perms) && perms.length >= 21, `n=${perms?.length}`);

const anon = await fetch(`${BASE}/users`);
check('tanpa token → 401', anon.status === 401, `status=${anon.status}`);

const bad = await fetch(`${BASE}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: `staff-${SFX}@e2e.id`, password: 'salah' }),
});
check('password salah → 401', bad.status === 401, `status=${bad.status}`);

const ref = await (await fetch(`${BASE}/auth/refresh`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ refreshToken: boot.refreshToken }),
})).json();
check('refresh rotation', !!(ref.accessToken && ref.refreshToken), JSON.stringify(ref).slice(0, 80));
const refOld = await fetch(`${BASE}/auth/refresh`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ refreshToken: boot.refreshToken }),
});
check('refresh lama mati', refOld.status === 401, `status=${refOld.status}`);

console.log(`\nPASS=${pass} FAIL=${fail}`);
process.exit(fail ? 1 : 0);
