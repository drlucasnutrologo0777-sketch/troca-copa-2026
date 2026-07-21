/**
 * E2E Sim6 — 3 cuidadores + 3 famílias — Firebase REST (idoso-care-24h).
 * node tool/e2e_sim6_firebase.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT = 'idoso-care-24h';
const BUCKET = 'idoso-care-24h.firebasestorage.app';
const PASS = 'SimTest62!';
const TS = Date.now();
const DOCS = ['rg', 'cpf', 'comprovante', 'ctps', 'antecedentes', 'curso'];
const CPFS = ['52998224725', '11144477735', '28625587887'];

const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJgAD//Z',
  'base64',
);

const results = [];
let passed = 0;
let failed = 0;
const caregivers = [];
const families = [];

function ok(name, detail = '') {
  passed++;
  results.push({ status: 'PASS', name, detail });
  console.log('PASS:', name, detail ? `— ${detail}` : '');
}
function fail(name, err) {
  failed++;
  const msg = err?.message || String(err);
  results.push({ status: 'FAIL', name, error: msg });
  console.error('FAIL:', name, '—', msg);
}

function loadApiKey() {
  const js = readFileSync(join(__dir, '../web_app/firebase-ic24.js'), 'utf8');
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
  if (!r.ok) throw new Error((j.error?.message || j.error || t).slice(0, 600));
  return j;
}

const API_KEY = loadApiKey();

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
  if (type === 'double') return { doubleValue: value };
  if (type === 'int') return { integerValue: String(value) };
  if (type === 'bool') return { booleanValue: value };
  if (type === 'ts') return { timestampValue: new Date().toISOString() };
  if (type === 'arr') return { arrayValue: { values: value.map((v) => ({ stringValue: String(v) })) } };
  if (type === 'map') return { mapValue: { fields: value } };
  if (type === 'ref') return { referenceValue: value };
  if (value === null) return { nullValue: null };
  return { stringValue: String(value) };
}

async function setDoc(token, path, fields) {
  return json(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
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

async function getDoc(token, path) {
  return json(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, {
    headers: { Authorization: 'Bearer ' + token },
  });
}

async function uploadStorage(token, storagePath, contentType = 'image/jpeg') {
  const enc = encodeURIComponent(storagePath);
  const up = await json(
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${enc}`,
    {
      method: 'POST',
      headers: { Authorization: 'Firebase ' + token, 'Content-Type': contentType },
      body: JPEG,
    },
  );
  const tokenDl = up.downloadTokens?.split(',')[0] || up.downloadTokens;
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${enc}?alt=media&token=${tokenDl}`;
  return { url, path: storagePath };
}

function parseFields(doc) {
  if (!doc?.fields) return {};
  const out = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('doubleValue' in v) out[k] = v.doubleValue;
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('mapValue' in v) {
      out[k] = {};
      for (const [k2, v2] of Object.entries(v.mapValue.fields || {})) {
        if ('stringValue' in v2) out[k][k2] = v2.stringValue;
        else if ('booleanValue' in v2) out[k][k2] = v2.booleanValue;
        else if ('doubleValue' in v2) out[k][k2] = v2.doubleValue;
      }
    }
  }
  return out;
}

function ic24AvaliarCadastroCuidador(d, docsMap) {
  d = d || {};
  docsMap = docsMap || {};
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!d.street || !d.number || cep.length !== 8 || !d.city || !d.state)
    return { complete: false, screen: 'cuidador-etapa1' };
  if (!(d.bio || '').trim()) return { complete: false, screen: 'cuidador-etapa2' };
  if (String(d.cpf || '').replace(/\D/g, '').length !== 11) return { complete: false, screen: 'cuidador-curriculo' };
  const missing = DOCS.filter((k) => !docsMap[k]?.fileUrl);
  if (missing.length) return { complete: false, screen: 'documentos', missingDocs: missing };
  return { complete: true, screen: 'cuidador-painel' };
}

async function createCaregiver(i) {
  const email = `sim62-cg${i}-${TS}@ic24test.local`;
  const nome = `Cuidador Sim62 ${i}`;
  const cpf = CPFS[i - 1];
  const auth = await signUp(email, PASS);
  const uid = auth.localId;
  const token = auth.idToken;

  await setDoc(token, `users/${uid}`, {
    email: fv('string', email),
    fullName: fv('string', nome),
    role: fv('string', 'caregiver'),
    status: fv('string', 'active'),
    verified: fv('bool', false),
    createdAt: fv('ts'),
    updatedAt: fv('ts'),
  });

  const photo = await uploadStorage(token, `caregivers/${uid}/profile/photo_${TS}.jpg`);

  const addr = {
    cep: '39400000',
    street: `Rua Cuidador ${i}`,
    number: String(100 + i),
    complement: 'Apto 1',
    neighborhood: 'Centro',
    city: 'Montes Claros',
    state: 'MG',
    address: `Rua Cuidador ${i}, nº ${100 + i}, Centro, Montes Claros - MG, CEP 39400000`,
  };

  await setDoc(token, `caregivers/${uid}`, {
    fullName: fv('string', nome),
    email: fv('string', email),
    cep: fv('string', addr.cep),
    street: fv('string', addr.street),
    number: fv('string', addr.number),
    complement: fv('string', addr.complement),
    neighborhood: fv('string', addr.neighborhood),
    city: fv('string', addr.city),
    state: fv('string', addr.state),
    address: fv('string', addr.address),
    bio: fv('string', `Bio cuidador ${i} Alzheimer Parkinson`),
    specialties: fv('arr', ['Alzheimer', 'Parkinson']),
    cpf: fv('string', cpf),
    photoUrl: fv('string', photo.url),
    photoPath: fv('string', photo.path),
    approved: fv('bool', false),
    rating: fv('double', 4.5),
    kycStatus: fv('string', 'incomplete'),
    pixKey: fv('string', '1199999' + String(1000 + i)),
    pixTitular: fv('string', nome),
    availableToday: fv('bool', true),
    displayDailyRate: fv('double', 250 + i * 10),
    paymentPreferences: fv('map', {
      configured: fv('bool', true),
      paymentSchedule: fv('string', 'diaria'),
      paymentWeekDay: fv('string', 'seg'),
      jobDurationDays: fv('int', 15),
    }),
    plantaoHoje: fv('map', {
      ativo: fv('bool', true),
      escala: fv('string', '12'),
      inicio: fv('string', '07:00'),
      dailyRate: fv('double', 250 + i * 10),
    }),
    updatedAt: fv('ts'),
  });

  const docsMap = {};
  for (const key of DOCS) {
    const up = await uploadStorage(token, `caregivers/${uid}/documents/${key}_${TS}.jpg`);
    await setDoc(token, `caregivers/${uid}/documents/${key}`, {
      documentType: fv('string', key.toUpperCase()),
      docKey: fv('string', key),
      label: fv('string', key),
      fileUrl: fv('string', up.url),
      storagePath: fv('string', up.path),
      status: fv('string', 'pending_review'),
      uploadedAt: fv('ts'),
    });
    docsMap[key] = { fileUrl: up.url };
  }

  await setDoc(token, `curriculum_public/${uid}`, {
    caregiverId: fv('string', uid),
    fullName: fv('string', nome),
    bio: fv('string', `Bio cuidador ${i}`),
    photoUrl: fv('string', photo.url),
    city: fv('string', 'Montes Claros'),
    state: fv('string', 'MG'),
    updatedAt: fv('ts'),
  });

  const cgDoc = parseFields(await getDoc(token, `caregivers/${uid}`));
  const ev = ic24AvaliarCadastroCuidador({ ...addr, bio: cgDoc.bio, cpf }, docsMap);
  if (!ev.complete) throw new Error(`cadastro incompleto: ${ev.screen}`);

  ok(`Cuidador ${i} — conta+foto+6 docs+plantão+currículo`, `${email}`);
  return { email, uid, token, cpf, nome };
}

async function createFamily(i) {
  const email = `sim62-fam${i}-${TS}@ic24test.local`;
  const nome = `Família Sim62 ${i}`;
  const auth = await signUp(email, PASS);
  const uid = auth.localId;
  const token = auth.idToken;

  await setDoc(token, `users/${uid}`, {
    email: fv('string', email),
    fullName: fv('string', nome),
    role: fv('string', 'family'),
    status: fv('string', 'active'),
    verified: fv('bool', false),
    createdAt: fv('ts'),
    updatedAt: fv('ts'),
  });

  await setDoc(token, `clients/${uid}`, {
    fullName: fv('string', nome),
    email: fv('string', email),
    phone: fv('string', '3899999' + String(1000 + i)),
    cep: fv('string', '39402000'),
    street: fv('string', `Av Família ${i}`),
    number: fv('string', String(200 + i)),
    neighborhood: fv('string', 'Melhoramentos'),
    city: fv('string', 'Montes Claros'),
    state: fv('string', 'MG'),
    address: fv('string', `Av Família ${i}, Montes Claros - MG`),
    updatedAt: fv('ts'),
  });

  await setDoc(token, `patients/${uid}_p1`, {
    name: fv('string', `Idoso ${i}`),
    careNeeds: fv('string', 'Alzheimer medicação'),
    clientRef: fv('ref', `projects/${PROJECT}/databases/(default)/documents/clients/${uid}`),
    createdAt: fv('ts'),
  });

  const offerId = `offer_sim62_${i}_${TS}`;
  const dailyRate = 280 + i * 5;
  await setDoc(token, `job_offers/${offerId}`, {
    id: fv('string', offerId),
    familyId: fv('string', uid),
    familyName: fv('string', nome),
    status: fv('string', 'open'),
    title: fv('string', `Oferta família ${i}`),
    dailyRate: fv('double', dailyRate),
    careNeeds: fv('string', 'Alzheimer'),
    elderlyType: fv('string', 'Idoso'),
    jobDurationDays: fv('int', 15),
    urgent: fv('bool', i === 1),
    scheduleType: fv('string', 'diaria'),
    createdAt: fv('ts'),
    updatedAt: fv('ts'),
  });

  const client = parseFields(await getDoc(token, `clients/${uid}`));
  if (!client.fullName) throw new Error('client doc vazio');

  ok(`Família ${i} — conta+cliente+paciente+oferta`, `${email} offer=${offerId.slice(0, 16)}…`);
  return { email, uid, token, offerId, dailyRate, nome };
}

async function integrationMatchPay(cg, fam) {
  const cgAuth = await signIn(cg.email, PASS);
  const cgToken = cgAuth.idToken;
  const responseId = `resp_sim62_${TS}`;

  await setDoc(cgToken, `offer_responses/${responseId}`, {
    id: fv('string', responseId),
    offerId: fv('string', fam.offerId),
    familyId: fv('string', fam.uid),
    caregiverId: fv('string', cg.uid),
    action: fv('string', 'accept'),
    dailyRateUsed: fv('double', fam.dailyRate),
    message: fv('string', 'Aceito'),
    status: fv('string', 'pending_family'),
    paymentSchedule: fv('string', 'diaria'),
    paymentWeekDay: fv('string', 'seg'),
    jobDurationDays: fv('int', 15),
    diariasCount: fv('int', 15),
    scheduleLabel: fv('string', 'Diária ao fim do dia'),
    perCycleAmount: fv('double', fam.dailyRate),
    paymentCyclesTotal: fv('int', 15),
    totalContractAmount: fv('double', fam.dailyRate * 15),
    createdAt: fv('ts'),
    termsFinalizedAt: fv('ts'),
  });

  const notifId = `notif_sim62_${TS}`;
  await setDoc(cgToken, `family_notifications/${notifId}`, {
    familyId: fv('string', fam.uid),
    offerId: fv('string', fam.offerId),
    responseId: fv('string', responseId),
    caregiverId: fv('string', cg.uid),
    caregiverName: fv('string', cg.nome),
    message: fv('string', `${cg.nome} aceitou sua proposta`),
    read: fv('bool', false),
    status: fv('string', 'pending'),
    createdAt: fv('ts'),
  });

  await patchDoc(cgToken, `job_offers/${fam.offerId}`, {
    status: fv('string', 'pending_family_approval'),
    pendingResponseId: fv('string', responseId),
    pendingCaregiverId: fv('string', cg.uid),
    updatedAt: fv('ts'),
  });

  const famAuth = await signIn(fam.email, PASS);
  const famToken = famAuth.idToken;

  await patchDoc(famToken, `offer_responses/${responseId}`, {
    status: fv('string', 'accepted'),
    familyDecisionAt: fv('ts'),
  });
  await patchDoc(famToken, `family_notifications/${notifId}`, {
    status: fv('string', 'accepted'),
    read: fv('bool', true),
    resolvedAt: fv('ts'),
  });
  await patchDoc(famToken, `job_offers/${fam.offerId}`, {
    status: fv('string', 'matched'),
    matchedCaregiverId: fv('string', cg.uid),
    agreedDailyRate: fv('double', fam.dailyRate),
    matchedAt: fv('ts'),
    paymentCycleCurrent: fv('int', 0),
    billingReady: fv('bool', false),
    platformFeeStatus: fv('string', 'pending'),
    platformFeeAmount: fv('double', 1.99),
    updatedAt: fv('ts'),
  });

  const invoiceId = `inv_sim62_${TS}`;
  await setDoc(cgToken, `invoices/${invoiceId}`, {
    id: fv('string', invoiceId),
    caregiverId: fv('string', cg.uid),
    familyId: fv('string', fam.uid),
    offerId: fv('string', fam.offerId),
    paymentCycle: fv('int', 1),
    amount: fv('double', fam.dailyRate),
    description: fv('string', 'Diária Sim62 E2E'),
    method: fv('string', 'pix'),
    status: fv('string', 'pending'),
    txid: fv('string', 'INV' + invoiceId.slice(0, 8).toUpperCase()),
    pixKey: fv('string', cg.uid.slice(0, 11)),
    pixTitular: fv('string', cg.nome),
    pixCopiaCola: fv('string', '00020126580014BR.GOV.BCB.PIX0136sim62@test'),
    createdAt: fv('ts'),
  });

  await patchDoc(famToken, `invoices/${invoiceId}`, {
    status: fv('string', 'paid'),
    paidAt: fv('ts'),
    paidConfirmedBy: fv('string', fam.uid),
  });

  await patchDoc(famToken, `job_offers/${fam.offerId}`, {
    paymentCycleCurrent: fv('int', 1),
    lastInvoiceId: fv('string', invoiceId),
    updatedAt: fv('ts'),
  });

  await patchDoc(cgToken, `caregivers/${cg.uid}`, {
    platformFeePending: fv('double', 1.99),
    platformFeePendingDiarias: fv('int', 1),
    platformFeeCurrency: fv('string', 'USD'),
    platformFeePendingOfferId: fv('string', fam.offerId),
    activeFamilyId: fv('string', fam.uid),
    platformFeeUpdatedAt: fv('ts'),
    updatedAt: fv('ts'),
  });

  const inv = parseFields(await getDoc(famToken, `invoices/${invoiceId}`));
  if (inv.status !== 'paid') throw new Error('invoice não paid');
  const offer = parseFields(await getDoc(famToken, `job_offers/${fam.offerId}`));
  if (offer.status !== 'matched') throw new Error('offer não matched');
  const cgData = parseFields(await getDoc(cgToken, `caregivers/${cg.uid}`));
  if (Number(cgData.platformFeePending) <= 0) throw new Error('taxa pendente ausente');

  ok('Integração cg1↔fam1 — match+invoice pago+taxa US$1.99', `invoice=${invoiceId.slice(0, 20)}…`);
}

async function main() {
  console.log('=== E2E Sim6 Firebase REST — build 2.0.1+62 ===\n');

  for (let i = 1; i <= 3; i++) {
    try {
      caregivers.push(await createCaregiver(i));
    } catch (e) {
      fail(`Cuidador ${i}`, e);
    }
  }

  for (let i = 1; i <= 3; i++) {
    try {
      families.push(await createFamily(i));
    } catch (e) {
      fail(`Família ${i}`, e);
    }
  }

  if (caregivers[0] && families[0]) {
    try {
      await integrationMatchPay(caregivers[0], families[0]);
    } catch (e) {
      fail('Integração cg1↔fam1', e);
    }
  }

  if (caregivers[1] && families[1]) {
    try {
      const famAuth = await signIn(families[1].email, PASS);
      const q = await json(
        `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
        {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + famAuth.idToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'caregivers' }],
              where: { fieldFilter: { field: { fieldPath: 'availableToday' }, op: 'EQUAL', value: { booleanValue: true } } },
              limit: 10,
            },
          }),
        },
      );
      const ids = q.filter((x) => x.document).map((x) => x.document.name.split('/').pop());
      if (!ids.includes(caregivers[1].uid)) throw new Error('cuidador 2 não listado como disponível');
      ok('Família 2 — query cuidadores availableToday', `found cg2=${caregivers[1].uid.slice(0, 8)}…`);
    } catch (e) {
      fail('Família 2 — busca cuidadores', e);
    }
  }

  if (caregivers[2] && families[2]) {
    try {
      const famAuth = await signIn(families[2].email, PASS);
      const propId = `prop_sim62_${TS}`;
      await setDoc(famAuth.idToken, `job_offers/${propId}`, {
        id: fv('string', propId),
        familyId: fv('string', families[2].uid),
        familyName: fv('string', families[2].nome),
        targetCaregiverId: fv('string', caregivers[2].uid),
        directedToCaregiver: fv('bool', true),
        title: fv('string', 'Proposta direta Sim62'),
        dailyRate: fv('double', 295),
        status: fv('string', 'open'),
        createdAt: fv('ts'),
        updatedAt: fv('ts'),
      });
      ok('Família 3 — proposta direta ao cuidador 3', propId.slice(0, 20));
    } catch (e) {
      fail('Família 3 — proposta direta', e);
    }
  }

  const report = {
    timestamp: TS,
    build: '2.0.1+62',
    passed,
    failed,
    success: failed === 0,
    results,
    accounts: { password: PASS, caregivers: caregivers.map((c) => c.email), families: families.map((f) => f.email) },
  };
  writeFileSync(join(__dir, 'e2e_sim6_report.json'), JSON.stringify(report, null, 2));
  console.log(`\n=== ${passed} PASS / ${failed} FAIL ===`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
