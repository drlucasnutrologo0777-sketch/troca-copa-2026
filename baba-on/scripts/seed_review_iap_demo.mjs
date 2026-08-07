/**
 * Garante taxa IAP pendente na conta demo da babá (revisão Apple).
 * Uso: node scripts/seed_review_iap_demo.mjs
 *
 * Regras Firestore: só a família pode acumular taxa (isFamilyMatchLinkUpdate),
 * com campos exatamente: activeFamilyId, platformFeePending, platformFeePendingDiarias,
 * platformFeeCurrency, platformFeePendingOfferId, platformFeeUpdatedAt, updatedAt.
 */
import { readFileSync } from 'fs';

const PROJECT = 'baba-on-3634a';
const PASS = 'Demo123!';
const BABA_EMAIL = 'baba.demo@babaon.test.local';
const FAMILY_EMAIL = 'pai.demo@babaon.test.local';
const OFFER_ID = 'review_demo_iap_offer';
const FEE = 1.99;

function loadApiKey() {
  const js = readFileSync(new URL('../web_app/firebase-ic24.js', import.meta.url), 'utf8');
  return js.match(/apiKey:\s*['"]([^'"]+)['"]/)[1];
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
  if (!r.ok) throw new Error((j.error?.message || t).slice(0, 500));
  return j;
}

async function signIn(email, apiKey) {
  return json(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASS, returnSecureToken: true }),
    },
  );
}

async function signUp(email, apiKey) {
  return json(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS, returnSecureToken: true }),
  });
}

async function ensureAuth(email, apiKey, label) {
  try {
    const a = await signIn(email, apiKey);
    console.log('Login', label, a.localId);
    return a;
  } catch (e) {
    if (!/INVALID_LOGIN|EMAIL_NOT_FOUND|USER_NOT_FOUND/i.test(e.message)) {
      // tenta criar mesmo assim se credenciais inválidas (conta apagada)
    }
    console.log('Criando', label, '…');
    try {
      const a = await signUp(email, apiKey);
      console.log('Signup', label, a.localId);
      return a;
    } catch (e2) {
      if (/EMAIL_EXISTS/i.test(e2.message)) {
        throw new Error(
          `${label}: email existe mas senha Demo123! não funciona — reset no Console Firebase`,
        );
      }
      throw e2;
    }
  }
}

function fv(type, value) {
  if (type === 'double') return { doubleValue: value };
  if (type === 'int') return { integerValue: String(value) };
  if (type === 'bool') return { booleanValue: value };
  if (type === 'ts') return { timestampValue: new Date().toISOString() };
  return { stringValue: String(value) };
}

async function getDoc(token, path) {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
    { headers: { Authorization: 'Bearer ' + token } },
  );
  if (r.status === 404) return null;
  const t = await r.text();
  const j = JSON.parse(t);
  if (!r.ok) throw new Error((j.error?.message || t).slice(0, 500));
  return j;
}

function fieldVal(fields, key) {
  const f = fields?.[key];
  if (!f) return null;
  if (f.doubleValue != null) return Number(f.doubleValue);
  if (f.integerValue != null) return Number(f.integerValue);
  if (f.stringValue != null) return f.stringValue;
  return null;
}

async function patchDoc(token, path, fields) {
  const mask = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&');
  return json(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}?${mask}`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  );
}

const apiKey = loadApiKey();

const cg = await ensureAuth(BABA_EMAIL, apiKey, 'babá demo');
const caregiverUid = cg.localId;
const fam = await ensureAuth(FAMILY_EMAIL, apiKey, 'família demo');

await patchDoc(cg.idToken, `users/${caregiverUid}`, {
  email: fv('string', BABA_EMAIL),
  role: fv('string', 'caregiver'),
  fullName: fv('string', 'Babá Demo Review'),
  updatedAt: fv('ts'),
});
await patchDoc(fam.idToken, `users/${fam.localId}`, {
  email: fv('string', FAMILY_EMAIL),
  role: fv('string', 'family'),
  fullName: fv('string', 'Pai Demo Família'),
  updatedAt: fv('ts'),
});
await patchDoc(cg.idToken, `caregivers/${caregiverUid}`, {
  fullName: fv('string', 'Babá Demo Review'),
  email: fv('string', BABA_EMAIL),
  approved: fv('bool', true),
  availableToday: fv('bool', true),
  city: fv('string', 'São Paulo'),
  state: fv('string', 'SP'),
  dailyRate: fv('double', 280),
  updatedAt: fv('ts'),
});
await patchDoc(fam.idToken, `clients/${fam.localId}`, {
  fullName: fv('string', 'Pai Demo Família'),
  email: fv('string', FAMILY_EMAIL),
  role: fv('string', 'family'),
  updatedAt: fv('ts'),
});

const existing = await getDoc(cg.idToken, `caregivers/${caregiverUid}`);
const pendingNow = fieldVal(existing?.fields, 'platformFeePending') || 0;
console.log('Taxa atual:', pendingNow);

try {
  await patchDoc(fam.idToken, `job_offers/${OFFER_ID}`, {
    id: fv('string', OFFER_ID),
    familyId: fv('string', fam.localId),
    familyName: fv('string', 'Pai Demo Família'),
    matchedCaregiverId: fv('string', caregiverUid),
    status: fv('string', 'matched'),
    title: fv('string', 'Plantão demo revisão Apple'),
    platformFeeStatus: fv('string', 'pending'),
    platformFeeAmount: fv('double', FEE),
    platformFeePendingDiarias: fv('int', 1),
    platformFeeCurrency: fv('string', 'USD'),
    agreedDailyRate: fv('double', 280),
    jobDurationDays: fv('int', 1),
  });
} catch (e) {
  console.warn('oferta demo (ok se já existir com outro dono):', e.message.slice(0, 100));
}

if (pendingNow < FEE - 0.001) {
  console.log('Acumulando taxa pendente US$ 1,99 (babá self)…');
  await patchDoc(cg.idToken, `caregivers/${caregiverUid}`, {
    activeFamilyId: fv('string', fam.localId),
    platformFeePending: fv('double', FEE),
    platformFeePendingDiarias: fv('int', 1),
    platformFeeCurrency: fv('string', 'USD'),
    platformFeePendingOfferId: fv('string', OFFER_ID),
    platformFeeUpdatedAt: fv('ts'),
    updatedAt: fv('ts'),
  });
} else {
  console.log('Taxa já OK — mantendo US$', pendingNow);
}

const PHOTO = 'https://baba-on-3634a.web.app/logo.png';
for (const docKey of ['rg_frente', 'rg_verso', 'comprovante', 'antecedentes']) {
  try {
    await patchDoc(cg.idToken, `caregivers/${caregiverUid}/documents/${docKey}`, {
      docKey: fv('string', docKey),
      label: fv('string', docKey),
      fileUrl: fv('string', PHOTO),
      status: fv('string', 'approved'),
    });
  } catch (e) {
    console.warn('doc', docKey, e.message);
  }
}

const after = await getDoc(cg.idToken, `caregivers/${caregiverUid}`);
console.log('OK — taxa pendente US$', fieldVal(after?.fields, 'platformFeePending'));
console.log('UID babá:', caregiverUid);
console.log('Login review: baba.demo@babaon.test.local / Demo123!');

