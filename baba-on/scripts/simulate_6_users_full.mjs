/**
 * 6 usuários aleatórios — cadastro → negócio → PIX → taxa IAP (Firestore real).
 * Uso: node scripts/simulate_6_users_full.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { randomInt } from 'crypto';

const PROJECT = 'baba-on-3634a';
const PASS = 'Demo123!';
const FEE_USD = 1.99;
const TS = Date.now();
const PHOTO = 'https://baba-on-3634a.web.app/logo.png';

const API_KEY = (() => {
  const js = readFileSync(new URL('../web_app/firebase-ic24.js', import.meta.url), 'utf8');
  return js.match(/apiKey:\s*['"]([^'"]+)['"]/)[1];
})();

const BABA_NAMES = ['Ana Silva', 'Carla Mendes', 'Fernanda Costa'];
const FAMILY_NAMES = ['Juliana Rocha', 'Ricardo Alves', 'Camila Dias'];
const NEEDS = ['Bebê 6 meses', 'Criança 2 anos', 'Recém-nascido 40 dias'];

const pairs = BABA_NAMES.map((bName, i) => ({
  babaEmail: `sim.baba.${TS}.${i}@babaon.test.local`,
  familyEmail: `sim.pai.${TS}.${i}@babaon.test.local`,
  babaName: bName,
  familyName: FAMILY_NAMES[i],
  need: NEEDS[i],
  dailyRate: 200 + randomInt(20, 80),
  dias: 1 + randomInt(0, 2),
}));

const log = [];
let exitCode = 0;

function ok(user, step, detail) {
  log.push({ user, step, status: 'OK', detail });
  console.log(`✓ [${user}] ${step}: ${detail}`);
}
function fail(user, step, detail, err) {
  exitCode = 1;
  const msg = err?.message || String(err);
  log.push({ user, step, status: 'FAIL', detail, error: msg });
  console.error(`✗ [${user}] ${step}: ${detail} — ${msg}`);
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
      fields[k] = {
        arrayValue: {
          values: v.map((x) =>
            typeof x === 'object' ? { mapValue: { fields: toFields(x) } } : { stringValue: String(x) },
          ),
        },
      };
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

function docId(doc) {
  return doc.name.split('/').pop();
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function runPair(p, idx) {
  const tag = `Par ${idx + 1}`;
  let baba, family, offerId;

  try {
    baba = await authUser(p.babaEmail);
    await fsSet(baba.idToken, `users/${baba.uid}`, {
      email: p.babaEmail,
      fullName: p.babaName,
      role: 'caregiver',
      status: 'active',
    });
    await fsSet(baba.idToken, `caregivers/${baba.uid}`, {
      fullName: p.babaName,
      email: p.babaEmail,
      city: 'Montes Claros',
      state: 'MG',
      street: `Rua Sim ${idx + 1}`,
      number: String(10 + idx),
      neighborhood: 'Centro',
      cep: '39400-000',
      address: `Rua Sim ${idx + 1}, nº ${10 + idx}, Centro, Montes Claros - MG`,
      bio: `Babá ${p.babaName} — teste E2E`,
      specialties: ['bebês', 'rotina'],
      photoUrl: PHOTO,
      approved: true,
      availableToday: true,
      pixKey: '+5511968362005',
      pixTitular: p.babaName,
      cpf: `5299822472${idx}`,
      kycStatus: 'approved',
    });
    ok(tag, 'Cadastro babá', `${p.babaEmail} (${p.babaName})`);
  } catch (e) {
    fail(tag, 'Cadastro babá', p.babaEmail, e);
    return;
  }

  try {
    family = await authUser(p.familyEmail);
    await fsSet(family.idToken, `users/${family.uid}`, {
      email: p.familyEmail,
      fullName: p.familyName,
      role: 'family',
      status: 'active',
    });
    await fsSet(family.idToken, `clients/${family.uid}`, {
      fullName: p.familyName,
      email: p.familyEmail,
      city: 'Montes Claros',
      state: 'MG',
    });
    ok(tag, 'Cadastro família', `${p.familyEmail} (${p.familyName})`);
  } catch (e) {
    fail(tag, 'Cadastro família', p.familyEmail, e);
    return;
  }

  try {
    for (const docKey of ['cpf', 'antecedentes', 'curso']) {
      await fsSet(baba.idToken, `caregivers/${baba.uid}/documents/${docKey}`, {
        docKey,
        label: docKey,
        fileUrl: PHOTO,
        status: 'approved',
      });
    }
    await fsSet(baba.idToken, `curriculum_public/${baba.uid}`, {
      caregiverId: baba.uid,
      fullName: p.babaName,
      city: 'Montes Claros',
      state: 'MG',
      photoUrl: PHOTO,
      bio: `Babá ${p.babaName}`,
    });
    ok(tag, 'Documentos + currículo', 'cpf, antecedentes, curso');
  } catch (e) {
    fail(tag, 'Documentos', '', e);
  }

  try {
    const offer = await fsAdd(family.idToken, 'job_offers', {
      familyId: family.uid,
      familyName: p.familyName,
      title: `Plantão ${p.need}`,
      elderlyType: p.need,
      careNeeds: 'Cuidado infantil',
      dailyRate: p.dailyRate,
      status: 'open',
      jobDurationDays: p.dias,
    });
    offerId = docId(offer);
    const resp = await fsAdd(baba.idToken, 'offer_responses', {
      offerId,
      familyId: family.uid,
      caregiverId: baba.uid,
      action: 'counter',
      proposedDailyRate: p.dailyRate,
      status: 'awaiting_terms',
      jobDurationDays: p.dias,
    });
    const responseId = docId(resp);
    await fsSet(family.idToken, `offer_responses/${responseId}`, { status: 'accepted' });
    const feeTotal = p.dias * FEE_USD;
    await fsSet(family.idToken, `job_offers/${offerId}`, {
      status: 'matched',
      matchedCaregiverId: baba.uid,
      agreedDailyRate: p.dailyRate,
      jobDurationDays: p.dias,
      platformFeeStatus: 'pending',
      platformFeeAmount: feeTotal,
      platformFeePendingDiarias: p.dias,
    });
    await fsSet(family.idToken, `caregivers/${baba.uid}`, {
      platformFeePending: feeTotal,
      platformFeePendingDiarias: p.dias,
      platformFeeCurrency: 'USD',
      platformFeePendingOfferId: offerId,
      activeFamilyId: family.uid,
    });
    ok(tag, 'Fechamento negócio', `${p.dias} diária(s) · R$ ${p.dailyRate}/dia · taxa US$ ${feeTotal}`);
  } catch (e) {
    fail(tag, 'Fechamento negócio', '', e);
    return;
  }

  const start = addDays(new Date().toISOString().slice(0, 10), -p.dias);
  let pixOk = 0;
  for (let d = 0; d < p.dias; d++) {
    try {
      const date = addDays(start, d);
      const pontoId = `ps_${baba.uid.slice(0, 8)}_${date}_${idx}`;
      await fsSet(baba.idToken, `ponto_sessions/${pontoId}`, {
        caregiverId: baba.uid,
        familyId: family.uid,
        offerId,
        status: 'awaiting_family',
        date,
      });
      await fsSet(family.idToken, `ponto_sessions/${pontoId}`, {
        familyConfirmed: true,
        status: 'confirmed',
      });
      const inv = await fsAdd(baba.idToken, 'invoices', {
        caregiverId: baba.uid,
        familyId: family.uid,
        offerId,
        amount: p.dailyRate,
        method: 'pix',
        status: 'pending',
        paymentCycle: d + 1,
      });
      await fsSet(family.idToken, `invoices/${docId(inv)}`, { status: 'paid' });
      pixOk++;
    } catch (e) {
      fail(tag, `PIX dia ${d + 1}`, '', e);
    }
  }
  if (pixOk === p.dias) ok(tag, 'PIX diárias', `${pixOk}× R$ ${p.dailyRate} confirmadas`);

  try {
    for (let u = 1; u <= p.dias; u++) {
      await fsAdd(baba.idToken, 'platform_fee_payments', {
        caregiverId: baba.uid,
        offerId,
        amount: FEE_USD,
        currency: 'USD',
        method: 'apple_iap',
        status: 'confirmed',
        appleProductId: 'bo_taxa_manutencao',
        appleTransactionId: `sim_${TS}_${idx}_${u}`,
      });
    }
    await fsSet(baba.idToken, `caregivers/${baba.uid}`, {
      platformFeePending: 0,
      platformFeePendingDiarias: 0,
    });
    await fsSet(baba.idToken, `job_offers/${offerId}`, { platformFeeStatus: 'paid' });
    ok(tag, 'Taxa IAP', `${p.dias}× US$ ${FEE_USD} (simulado StoreKit)`);
  } catch (e) {
    fail(tag, 'Taxa IAP', '', e);
  }

  try {
    await fsAdd(family.idToken, 'payments', { method: 'pix', amount: 1 });
    fail(tag, 'Anti-PIX taxa', 'payments deveria bloquear');
  } catch (e) {
    if (String(e.message).includes('PERMISSION_DENIED') || String(e.message).includes('Missing')) {
      ok(tag, 'Anti-PIX taxa plataforma', 'bloqueado (correto)');
    } else {
      fail(tag, 'Anti-PIX taxa', '', e);
    }
  }
}

async function main() {
  console.log('='.repeat(72));
  console.log('BABÁ ON — 6 USUÁRIOS (3 pares) · cadastro → fechamento → PIX → IAP');
  console.log(`Projeto: ${PROJECT} · senha: ${PASS}`);
  console.log('='.repeat(72));

  for (let i = 0; i < pairs.length; i++) {
    console.log(`\n--- ${pairs[i].babaName} + ${pairs[i].familyName} ---`);
    await runPair(pairs[i], i);
  }

  const okN = log.filter((x) => x.status === 'OK').length;
  const failN = log.filter((x) => x.status === 'FAIL').length;
  console.log('\n' + '='.repeat(72));
  console.log(`RESUMO: ${okN} OK | ${failN} FAIL | ${pairs.length * 2} usuários | ${pairs.length} negócios`);
  console.log('='.repeat(72));

  const outPath = new URL(`../test_sim6_${TS}.json`, import.meta.url);
  writeFileSync(outPath, JSON.stringify({ TS, pairs, log, okN, failN }, null, 2));
  console.log(`Relatório: ${outPath.pathname || outPath}`);

  if (failN > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
