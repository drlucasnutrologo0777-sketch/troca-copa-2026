/**
 * Corrige conta demo Idoso Care: aprovado + curriculum_public + taxa IAP.
 * Uso: node scripts/fix_demo_completo.mjs
 */
import { readFileSync } from 'fs';

const PROJECT = 'idoso-care-24h';
const PASS = 'Demo123!';
const CAREGIVER_EMAIL = 'cuidador.demo@ic24test.local';
const FAMILY_EMAIL = 'familia.demo@ic24test.local';
const OFFER_ID = 'review_demo_iap_offer';

const IC24_DOC_META = {
  rg: { label: 'RG — Registro Geral', weight: 10, required: false },
  cpf: { label: 'CPF', weight: 10, required: true },
  antecedentes: { label: 'Antecedentes criminais', weight: 30, required: true },
  curso: { label: 'Curso de Cuidador de Idosos', weight: 25, required: true },
};

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
  return json(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS, returnSecureToken: true }),
  });
}

function parseFields(doc) {
  if (!doc?.fields) return null;
  const out = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('doubleValue' in v) out[k] = v.doubleValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else out[k] = v;
  }
  return out;
}

async function getDoc(token, path) {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
    { headers: { Authorization: 'Bearer ' + token } },
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await r.text());
  return parseFields(await r.json());
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

function classify(docsMap) {
  const uploaded = Object.keys(docsMap);
  let score = 0;
  const verified = [];
  const missingRequired = [];
  for (const [key, meta] of Object.entries(IC24_DOC_META)) {
    if (uploaded.includes(key) && docsMap[key]?.fileUrl) {
      score += meta.weight;
      verified.push({ key, label: meta.label });
    } else if (meta.required) missingRequired.push(meta.label);
  }
  let level = 'junior';
  let label = 'Nível Júnior — Em validação';
  if (score >= 65) {
    level = 'pleno';
    label = 'Nível Pleno — Certificado pelo app';
  }
  return { score, level, label, verified, missingRequired, documentsCount: verified.length };
}

const apiKey = loadApiKey();
console.log('Login…');
const cgAuth = await signIn(CAREGIVER_EMAIL, apiKey);
const famAuth = await signIn(FAMILY_EMAIL, apiKey);
const uid = cgAuth.localId;

console.log('1/3 Taxa IAP pendente US$ 1,99…');
await setDoc(famAuth.idToken, `job_offers/${OFFER_ID}`, {
  id: fv('string', OFFER_ID),
  familyId: fv('string', famAuth.localId),
  familyName: fv('string', 'Carlos Demo Família'),
  matchedCaregiverId: fv('string', uid),
  status: fv('string', 'matched'),
  title: fv('string', 'Plantão demo — Família Silva'),
  platformFeeStatus: fv('string', 'pending'),
  platformFeeAmount: fv('double', 1.99),
  platformFeePendingDiarias: fv('int', 1),
  platformFeeCurrency: fv('string', 'USD'),
  agreedDailyRate: fv('double', 280),
  jobDurationDays: fv('int', 1),
});
await patchDoc(famAuth.idToken, `caregivers/${uid}`, {
  platformFeePending: fv('double', 1.99),
  platformFeePendingDiarias: fv('int', 1),
  platformFeeCurrency: fv('string', 'USD'),
  platformFeePendingOfferId: fv('string', OFFER_ID),
  activeFamilyId: fv('string', famAuth.localId),
});

console.log('2/3 Publicar curriculum_public (token cuidador)…');
const cg = await getDoc(cgAuth.idToken, `caregivers/${uid}`);
const docsR = await fetch(
  `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/caregivers/${uid}/documents`,
  { headers: { Authorization: 'Bearer ' + cgAuth.idToken } },
);
const docsJ = docsR.ok ? await docsR.json() : { documents: [] };
const docsMap = {};
for (const d of docsJ.documents || []) {
  const id = d.name.split('/').pop();
  docsMap[id] = parseFields(d);
}
const classification = classify(
  Object.fromEntries(Object.entries(docsMap).map(([k, v]) => [k, { fileUrl: v.fileUrl }])),
);
await setDoc(cgAuth.idToken, `curriculum_public/${uid}`, {
  caregiverId: fv('string', uid),
  fullName: fv('string', cg?.fullName || 'Ana Demo Cuidadora'),
  cpfMasked: fv('string', '***.***.***-**'),
  bio: fv('string', cg?.bio || 'Cuidadora demo para revisão Apple.'),
  city: fv('string', cg?.city || 'Montes Claros'),
  state: fv('string', cg?.state || 'MG'),
  photoUrl: fv('string', cg?.photoUrl || ''),
  classification: {
    mapValue: {
      fields: {
        level: fv('string', classification.level),
        label: fv('string', classification.label),
        score: fv('double', classification.score),
        documentsCount: fv('int', classification.documentsCount),
      },
    },
  },
  kycStatus: fv('string', 'approved'),
  rating: fv('double', 4.7),
  reviewCount: fv('int', 12),
});
await patchDoc(cgAuth.idToken, `caregivers/${uid}`, {
  classification: {
    mapValue: {
      fields: {
        level: fv('string', classification.level),
        label: fv('string', classification.label),
        score: fv('double', classification.score),
      },
    },
  },
  documentsCount: fv('int', classification.documentsCount),
  curriculumUpdatedAt: fv('string', new Date().toISOString()),
});

console.log('3/3 Verificação…');
const cv = await getDoc(famAuth.idToken, `curriculum_public/${uid}`);
const cg2 = await getDoc(cgAuth.idToken, `caregivers/${uid}`);
console.log('OK');
console.log('  approved:', cg2?.approved);
console.log('  taxa_pendente:', cg2?.platformFeePending);
console.log('  curriculum_public:', cv?.fullName, '—', cv?.classification?.level || classification.level);
