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

function fv(type, value) {
  if (type === 'double') return { doubleValue: value };
  if (type === 'int') return { integerValue: String(value) };
  if (type === 'bool') return { booleanValue: value };
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

console.log('Login babá demo…');
const cg = await signIn(BABA_EMAIL, apiKey);
const caregiverUid = cg.localId;

console.log('Login família demo…');
const fam = await signIn(FAMILY_EMAIL, apiKey);

const existing = await getDoc(cg.idToken, `caregivers/${caregiverUid}`);
const pendingNow = fieldVal(existing?.fields, 'platformFeePending') || 0;
console.log('Taxa atual:', pendingNow);

if (pendingNow < FEE - 0.001) {
  console.log('Criando/atualizando oferta demo…');
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

  console.log('Acumulando taxa pendente US$ 1,99…');
  await patchDoc(fam.idToken, `caregivers/${caregiverUid}`, {
    activeFamilyId: fv('string', fam.localId),
    platformFeePending: fv('double', FEE),
    platformFeePendingDiarias: fv('int', 1),
    platformFeeCurrency: fv('string', 'USD'),
    platformFeePendingOfferId: fv('string', OFFER_ID),
    platformFeeUpdatedAt: fv('string', new Date().toISOString()),
    updatedAt: fv('string', new Date().toISOString()),
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

