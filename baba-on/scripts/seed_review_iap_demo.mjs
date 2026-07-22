/**
 * Garante taxa IAP pendente na conta demo da babá (revisão Apple).
 * Uso: node scripts/seed_review_iap_demo.mjs
 */
import { readFileSync } from 'fs';

const PROJECT = 'baba-on-3634a';
const PASS = 'Demo123!';
const BABA_EMAIL = 'baba.demo@babaon.test.local';
const FAMILY_EMAIL = 'pai.demo@babaon.test.local';
const OFFER_ID = 'review_demo_iap_offer';

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

async function patchDoc(token, path, fields) {
  const mask = Object.keys(fields).join('&updateMask.fieldPaths=');
  return json(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}?updateMask.fieldPaths=${mask}`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  );
}

async function setDoc(token, path, fields) {
  return json(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
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

console.log('Criando/atualizando oferta demo…');
await setDoc(fam.idToken, `job_offers/${OFFER_ID}`, {
  id: fv('string', OFFER_ID),
  familyId: fv('string', fam.localId),
  familyName: fv('string', 'Pai Demo Família'),
  matchedCaregiverId: fv('string', caregiverUid),
  status: fv('string', 'matched'),
  title: fv('string', 'Plantão demo revisão Apple'),
  platformFeeStatus: fv('string', 'pending'),
  platformFeeAmount: fv('double', 1.99),
  platformFeePendingDiarias: fv('int', 1),
  platformFeeCurrency: fv('string', 'USD'),
  agreedDailyRate: fv('double', 280),
  jobDurationDays: fv('int', 1),
});

console.log('Acumulando taxa pendente US$ 1,99 na babá…');
await patchDoc(fam.idToken, `caregivers/${caregiverUid}`, {
  platformFeePending: fv('double', 1.99),
  platformFeePendingDiarias: fv('int', 1),
  platformFeeCurrency: fv('string', 'USD'),
  platformFeePendingOfferId: fv('string', OFFER_ID),
  activeFamilyId: fv('string', fam.localId),
  approved: fv('bool', true),
  photoUrl: fv('string', 'https://baba-on-3634a.web.app/logo.png'),
  bio: fv('string', 'Babá demo para revisão Apple — cadastro completo'),
  street: fv('string', 'Rua Demo'),
  number: fv('string', '100'),
  cep: fv('string', '39400000'),
  city: fv('string', 'Montes Claros'),
  state: fv('string', 'MG'),
});

const PHOTO = 'https://baba-on-3634a.web.app/logo.png';
for (const docKey of ['rg_frente', 'rg_verso', 'comprovante', 'antecedentes']) {
  await setDoc(cg.idToken, `caregivers/${caregiverUid}/documents/${docKey}`, {
    docKey: fv('string', docKey),
    label: fv('string', docKey),
    fileUrl: fv('string', PHOTO),
    status: fv('string', 'approved'),
  });
}

await setDoc(cg.idToken, `curriculum_public/${caregiverUid}`, {
  caregiverId: fv('string', caregiverUid),
  fullName: fv('string', 'Ana Demo Babá'),
  city: fv('string', 'Montes Claros'),
  state: fv('string', 'MG'),
  photoUrl: fv('string', PHOTO),
  bio: fv('string', 'Babá demo — revisão App Store'),
});

console.log('OK — babá demo com taxa pendente US$ 1,99 (1 diária) + docs RG.');
console.log('UID babá:', caregiverUid);
