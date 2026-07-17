/**
 * Auditoria completa Babá ON — currículo, Firestore, fluxo E2E.
 * Uso: node scripts/test_full_audit.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';

const PROJECT = 'baba-on-3634a';
const PASS = 'Demo123!';
const TS = Date.now();
const PHOTO = 'https://baba-on-3634a.web.app/logo.png';

const API_KEY = (() => {
  const js = readFileSync(new URL('../web_app/firebase-ic24.js', import.meta.url), 'utf8');
  return js.match(/apiKey:\s*['"]([^'"]+)['"]/)[1];
})();

const log = [];
let exitCode = 0;

function ok(step, detail) {
  log.push({ step, status: 'OK', detail });
  console.log(`✓ ${step}: ${detail}`);
}
function fail(step, detail, err) {
  exitCode = 1;
  const msg = err?.message || String(err);
  log.push({ step, status: 'FAIL', detail, error: msg });
  console.error(`✗ ${step}: ${detail} — ${msg}`);
}

async function authUser(email) {
  let r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS, returnSecureToken: true }),
  });
  let j = await r.json();
  if (j.error?.message === 'EMAIL_EXISTS') {
    r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASS, returnSecureToken: true }),
    });
    j = await r.json();
  }
  if (j.error) throw new Error(j.error.message);
  return { uid: j.localId, idToken: j.idToken, email };
}

function fsUrl(path) {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;
}

function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v == null) continue;
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'number') fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (Array.isArray(v)) {
      fields[k] = { arrayValue: { values: v.map((x) => (typeof x === 'object' ? { mapValue: { fields: toFields(x) } } : { stringValue: String(x) })) } };
    } else if (typeof v === 'object') fields[k] = { mapValue: { fields: toFields(v) } };
  }
  return fields;
}

async function fsSet(token, path, data) {
  const mask = Object.keys(data).map((k) => 'updateMask.fieldPaths=' + k).join('&');
  const r = await fetch(fsUrl(path) + '?' + mask, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j;
}

async function fsGet(token, path) {
  const r = await fetch(fsUrl(path), { headers: { Authorization: 'Bearer ' + token } });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j;
}

async function fsDelete(token, path) {
  const r = await fetch(fsUrl(path), { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 404) return;
  if (!r.ok) {
    const j = await r.json();
    throw new Error(j.error?.message || r.statusText);
  }
}

async function fsAdd(token, collection, data) {
  const r = await fetch(fsUrl(collection), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j;
}

function fieldVal(doc, key) {
  const f = doc?.fields?.[key];
  if (!f) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return parseInt(f.integerValue, 10);
  if ('doubleValue' in f) return f.doubleValue;
  if ('booleanValue' in f) return f.booleanValue;
  return null;
}

async function testCurriculumOnDemand() {
  const babaEmail = `audit.baba.${TS}@babaon.test.local`;
  const familyEmail = `audit.pai.${TS}@babaon.test.local`;
  const baba = await authUser(babaEmail);
  const family = await authUser(familyEmail);

  await fsSet(baba.idToken, `users/${baba.uid}`, { email: babaEmail, fullName: 'Audit Babá', role: 'caregiver', status: 'active' });
  await fsSet(family.idToken, `users/${family.uid}`, { email: familyEmail, fullName: 'Audit Família', role: 'family', status: 'active' });
  await fsSet(baba.idToken, `caregivers/${baba.uid}`, {
    fullName: 'Audit Babá',
    cpf: '52998224725',
    city: 'Montes Claros',
    state: 'MG',
    bio: 'Teste currículo on-demand',
    approved: true,
    photoUrl: PHOTO,
  });
  for (const docKey of ['cpf', 'antecedentes', 'curso']) {
    await fsSet(baba.idToken, `caregivers/${baba.uid}/documents/${docKey}`, {
      docKey,
      label: docKey,
      fileUrl: PHOTO,
      status: 'approved',
    });
  }

  try {
    await fsDelete(baba.idToken, `curriculum_public/${baba.uid}`);
    ok('Currículo on-demand', 'curriculum_public removido para teste');
  } catch (e) {
    ok('Currículo on-demand', 'curriculum_public ausente (ok)');
  }

  const token = randomBytes(16).toString('hex');
  const curriculum = {
    caregiverId: baba.uid,
    fullName: 'Audit Babá',
    cpfMasked: '***.***.247-25',
    city: 'Montes Claros',
    state: 'MG',
    bio: 'Teste currículo on-demand',
    photoUrl: PHOTO,
    street: 'Rua Secreta',
    address: 'Rua Secreta, 99',
  };
  await fsSet(family.idToken, `cv_requests/${token}`, {
    token,
    familyId: family.uid,
    caregiverId: baba.uid,
    status: 'shared',
    familyName: 'Audit Família',
    curriculum,
  });

  const cvDoc = await fsGet(family.idToken, `cv_requests/${token}`);
  const cvName = fieldVal(cvDoc, 'familyName');
  if (cvName === 'Audit Família') ok('cv_requests Firestore', 'token gravado e legível');
  else fail('cv_requests Firestore', 'dados incorretos');

  const curPublic = await fsSet(baba.idToken, `curriculum_public/${baba.uid}`, {
    caregiverId: baba.uid,
    fullName: 'Audit Babá',
    city: 'Montes Claros',
    state: 'MG',
    cpfMasked: '***.***.247-25',
  });
  ok('curriculum_public', 'snapshot persistido');

  try {
    await fsAdd(family.idToken, 'payments', { method: 'pix', amount: 1, type: 'platform_fee' });
    fail('Regra anti-PIX taxa', 'payments deveria bloquear família');
  } catch (e) {
    if (String(e.message).includes('PERMISSION_DENIED') || String(e.message).includes('Missing')) {
      ok('Regra anti-PIX taxa', 'bloqueado para família');
    } else fail('Regra anti-PIX taxa', '', e);
  }
}

async function testDemoAccounts() {
  try {
    const baba = await authUser('baba.demo@babaon.test.local');
    const cg = await fsGet(baba.idToken, `caregivers/${baba.uid}`);
    if (fieldVal(cg, 'fullName')) ok('Demo babá', `UID ${baba.uid.slice(0, 8)}…`);
    else fail('Demo babá', 'caregiver doc ausente');
  } catch (e) {
    fail('Demo babá', 'login/doc', e);
  }
  try {
    const fam = await authUser('pai.demo@babaon.test.local');
    const cl = await fsGet(fam.idToken, `clients/${fam.uid}`);
    if (fieldVal(cl, 'fullName') || fieldVal(cl, 'email')) ok('Demo família', `UID ${fam.uid.slice(0, 8)}…`);
    else ok('Demo família', 'login OK (clients opcional)');
  } catch (e) {
    fail('Demo família', 'login', e);
  }
}

async function testHosting() {
  const urls = [
    'https://baba-on-3634a.web.app/',
    'https://baba-on-3634a.web.app/curriculo.html',
    'https://baba-on-3634a.web.app/ic24-curriculo.js',
    'https://baba-on-3634a.web.app/privacidade.html',
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { method: 'GET' });
      if (r.ok) ok('Hosting', url.replace('https://baba-on-3634a.web.app', ''));
      else fail('Hosting', `${url} → HTTP ${r.status}`);
    } catch (e) {
      fail('Hosting', url, e);
    }
  }
}

async function testWebAssetsParity() {
  const babaJs = readFileSync(new URL('../web_app/ic24-curriculo.js', import.meta.url), 'utf8');
  const checks = [
    ['ic24MontarCurriculoSnapshot', 'snapshot on-demand'],
    ['ic24ListarBabasAprovados', 'lista aprovados'],
    ['inss:', 'doc INSS'],
    ['delete curriculum.address', 'privacidade endereço'],
  ];
  for (const [needle, label] of checks) {
    if (babaJs.includes(needle)) ok('Código web', label);
    else fail('Código web', `ausente: ${label}`);
  }
}

async function main() {
  console.log('='.repeat(72));
  console.log('BABÁ ON — AUDITORIA COMPLETA (build 5)');
  console.log('='.repeat(72));

  console.log('\n--- Assets web (paridade Idoso 53) ---');
  await testWebAssetsParity();

  console.log('\n--- Demo accounts ---');
  await testDemoAccounts();

  console.log('\n--- Currículo + Firestore ---');
  try {
    await testCurriculumOnDemand();
  } catch (e) {
    fail('Currículo on-demand', 'setup', e);
  }

  console.log('\n--- Hosting Firebase ---');
  await testHosting();

  console.log('\n--- Fluxo 6 usuários (E2E) ---');
  try {
    const { execSync } = await import('child_process');
    execSync('node scripts/simulate_6_users_full.mjs', {
      cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      stdio: 'inherit',
    });
    ok('E2E 6 usuários', 'simulate_6_users_full.mjs passou');
  } catch (e) {
    fail('E2E 6 usuários', 'simulate_6_users_full.mjs', e);
  }

  const okN = log.filter((x) => x.status === 'OK').length;
  const failN = log.filter((x) => x.status === 'FAIL').length;
  console.log('\n' + '='.repeat(72));
  console.log(`AUDITORIA: ${okN} OK | ${failN} FAIL`);
  console.log('='.repeat(72));

  const outPath = new URL(`../test_audit_${TS}.json`, import.meta.url);
  writeFileSync(outPath, JSON.stringify({ TS, log, okN, failN }, null, 2));
  console.log(`Relatório: ${outPath.pathname || outPath}`);

  if (failN > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
