/**
 * Reproduz os 3 cenários que travavam cadastro mãe/pai no iPhone.
 * node tool/test_cadastro_familia_e2e.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT = 'baba-on-3634a';
const PASS = 'TesteFam11!';
const TS = Date.now();

const js = readFileSync(join(__dir, '../web_app/firebase-ic24.js'), 'utf8');
const API_KEY = js.match(/apiKey:\s*['"]([^'"]+)['"]/)[1];

let passed = 0;
let failed = 0;
function ok(name, detail = '') {
  passed++;
  console.log('PASS:', name, detail ? `— ${detail}` : '');
}
function fail(name, err) {
  failed++;
  console.error('FAIL:', name, '—', err?.message || String(err));
}

async function json(url, opts = {}) {
  const r = await fetch(url, opts);
  const t = await r.text();
  let j;
  try {
    j = JSON.parse(t);
  } catch {
    j = { raw: t };
  }
  if (!r.ok) {
    const e = new Error((j.error?.message || j.error || t).slice(0, 400));
    e.code = j.error?.message?.includes('EMAIL_EXISTS') ? 'auth/email-already-in-use' : j.error?.errors?.[0]?.reason;
    throw e;
  }
  return j;
}

async function signUp(email, password) {
  return json(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
}

async function signIn(email, password) {
  return json(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
}

function fv(type, value) {
  if (type === 'ts') return { timestampValue: new Date().toISOString() };
  return { stringValue: String(value) };
}

async function setDoc(token, path, fields) {
  return json(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
}

async function getDoc(token, path) {
  return json(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, {
    headers: { Authorization: 'Bearer ' + token },
  });
}

function parseFields(doc) {
  const o = {};
  for (const [k, v] of Object.entries(doc.fields || {})) {
    o[k] = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ?? null;
  }
  return o;
}

function ic24AvaliarCadastroFamilia(d) {
  d = d || {};
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!(d.fullName || '').trim() || !d.street || !d.number || cep.length !== 8 || !d.city) {
    return { complete: false, screen: 'cadastro-familia' };
  }
  return { complete: true, screen: 'mae-painel' };
}

console.log('=== Teste cadastro família Babá ON — cenários iPhone ===\n');

// Cenário A: cidade vazia (CEP não buscou) → cadastro incompleto
{
  const d = { fullName: 'Pai Teste', street: 'Rua X', number: '10', cep: '01310100', city: '' };
  const rota = ic24AvaliarCadastroFamilia(d);
  if (!rota.complete && rota.screen === 'cadastro-familia') {
    ok('Cenário A — sem cidade bloqueia painel', 'cadastro-familia');
  } else {
    fail('Cenário A — sem cidade bloqueia painel', new Error(JSON.stringify(rota)));
  }
}

// Cenário B: conta criada mas clients vazio → retomada deve completar
{
  const email = `retoma-fam-${TS}@babaon.test.local`;
  try {
    const auth = await signUp(email, PASS);
    const uid = auth.localId;
    const token = auth.idToken;
    await setDoc(token, `users/${uid}`, {
      email: fv('string', email),
      fullName: fv('string', 'Mãe Retoma'),
      role: fv('string', 'family'),
      status: fv('string', 'active'),
    });
    const antes = ic24AvaliarCadastroFamilia({});
    if (antes.complete) throw new Error('deveria estar incompleto antes do clients');

    await setDoc(token, `clients/${uid}`, {
      fullName: fv('string', 'Mãe Retoma'),
      email: fv('string', email),
      street: fv('string', 'Av Paulista'),
      number: fv('string', '1000'),
      cep: fv('string', '01310100'),
      city: fv('string', 'São Paulo'),
      state: fv('string', 'SP'),
    });
    const client = parseFields(await getDoc(token, `clients/${uid}`));
    const depois = ic24AvaliarCadastroFamilia(client);
    if (depois.complete && depois.screen === 'mae-painel') {
      ok('Cenário B — retomada após clients salvo', email);
    } else {
      fail('Cenário B — retomada', new Error(JSON.stringify(depois)));
    }

    // simula segundo clique "Concluir" com e-mail já existente
    try {
      await signUp(email, PASS);
      fail('Cenário B2 — email duplicado', new Error('signUp deveria falhar'));
    } catch (e) {
      const auth2 = await signIn(email, PASS);
      const c2 = parseFields(await getDoc(auth2.idToken, `clients/${uid}`));
      if (ic24AvaliarCadastroFamilia(c2).complete) {
        ok('Cenário B2 — login + cadastro existente abre painel');
      } else {
        fail('Cenário B2 — login pós duplicado', new Error('incompleto'));
      }
    }
  } catch (e) {
    fail('Cenário B — retomada', e);
  }
}

// Cenário C: fluxo completo novo usuário
{
  const email = `novo-fam-${TS}@babaon.test.local`;
  try {
    const auth = await signUp(email, PASS);
    await setDoc(auth.idToken, `users/${auth.localId}`, {
      email: fv('string', email),
      fullName: fv('string', 'Pai Novo'),
      role: fv('string', 'family'),
      status: fv('string', 'active'),
    });
    await setDoc(auth.idToken, `clients/${auth.localId}`, {
      fullName: fv('string', 'Pai Novo'),
      email: fv('string', email),
      phone: fv('string', '11999998888'),
      street: fv('string', 'Rua Teste'),
      number: fv('string', '42'),
      cep: fv('string', '39402000'),
      city: fv('string', 'Montes Claros'),
      state: fv('string', 'MG'),
    });
    const client = parseFields(await getDoc(auth.idToken, `clients/${auth.localId}`));
    const rota = ic24AvaliarCadastroFamilia(client);
    if (rota.complete) ok('Cenário C — cadastro completo end-to-end', email);
    else fail('Cenário C — cadastro completo', new Error(JSON.stringify(rota)));
  } catch (e) {
    fail('Cenário C — cadastro completo', e);
  }
}

console.log(`\n=== ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed ? 1 : 0);
