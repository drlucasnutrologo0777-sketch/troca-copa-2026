/**
 * 4 babás + 4 famílias — cadastro completo (docs RG), currículo, negócio, taxa IAP simulada.
 * Honesto: usa Firestore REST (não testa picker de foto nem StoreKit real).
 * Uso: node scripts/simulate_8_users_cadastro.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { randomInt } from 'crypto';

const PROJECT = 'baba-on-3634a';
const PASS = 'Demo123!';
const FEE_USD = 1.99;
const TS = Date.now();
const PHOTO = 'https://baba-on-3634a.web.app/logo.png';

const DOCS_OBRIG = ['rg_frente', 'rg_verso', 'comprovante', 'antecedentes'];
const DOCS_OPC = ['curso', 'diploma', 'referencia'];

const API_KEY = (() => {
  const js = readFileSync(new URL('../web_app/firebase-ic24.js', import.meta.url), 'utf8');
  return js.match(/apiKey:\s*['"]([^'"]+)['"]/)[1];
})();

const BABA_NAMES = ['Ana Silva', 'Carla Mendes', 'Fernanda Costa', 'Beatriz Lima'];
const FAMILY_NAMES = ['Juliana Rocha', 'Ricardo Alves', 'Camila Dias', 'Marcos Souza'];
const NEEDS = ['Bebê 6 meses', 'Criança 2 anos', 'Recém-nascido 40 dias', 'Gêmeos 3 anos'];

const pairs = BABA_NAMES.map((bName, i) => ({
  babaEmail: `sim8.baba.${TS}.${i}@babaon.test.local`,
  familyEmail: `sim8.pai.${TS}.${i}@babaon.test.local`,
  babaName: bName,
  familyName: FAMILY_NAMES[i],
  childNeed: NEEDS[i],
  dailyRate: 200 + randomInt(20, 80),
  dias: 1 + randomInt(0, 2),
}));

const log = [];
let exitCode = 0;

function ok(tag, step, detail) {
  log.push({ tag, step, status: 'OK', detail });
  console.log(`✓ [${tag}] ${step}: ${detail}`);
}
function fail(tag, step, detail, err) {
  exitCode = 1;
  const msg = err?.message || String(err);
  log.push({ tag, step, status: 'FAIL', detail, error: msg });
  console.error(`✗ [${tag}] ${step}: ${detail} — ${msg}`);
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

async function fsGet(token, path) {
  const r = await fetch(fsUrl(path), { headers: { Authorization: 'Bearer ' + token } });
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

function fieldVal(doc, key) {
  const f = doc?.fields?.[key];
  if (!f) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return parseInt(f.integerValue, 10);
  if ('doubleValue' in f) return f.doubleValue;
  if ('booleanValue' in f) return f.booleanValue;
  return null;
}

function docId(doc) {
  return doc.name.split('/').pop();
}

function ic24DocUploaded(docKey, docsMap) {
  if (docsMap[docKey]?.fileUrl) return true;
  if (docKey === 'rg_frente' && docsMap.rg?.fileUrl) return true;
  return false;
}

function ic24AvaliarCadastroBaba(d, docsMap) {
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!d.street || !d.number || cep.length !== 8 || !d.city || !d.state) {
    return { complete: false, screen: 'baba-etapa1' };
  }
  if (!(d.bio || '').trim() || !d.photoUrl) {
    return { complete: false, screen: 'baba-etapa2' };
  }
  if (DOCS_OBRIG.some((k) => !ic24DocUploaded(k, docsMap))) {
    return { complete: false, screen: 'baba-etapa3' };
  }
  return { complete: true, screen: 'baba-painel' };
}

async function listDocs(token, uid) {
  const r = await fetch(fsUrl(`caregivers/${uid}/documents`), {
    headers: { Authorization: 'Bearer ' + token },
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  const map = {};
  for (const doc of j.documents || []) {
    const id = doc.name.split('/').pop();
    map[id] = { fileUrl: fieldVal(doc, 'fileUrl'), docKey: fieldVal(doc, 'docKey') };
  }
  return map;
}

async function runPair(p, idx) {
  const tag = `Par ${idx + 1} (${p.babaName})`;
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
      street: `Rua Teste ${idx + 1}`,
      number: String(100 + idx),
      neighborhood: 'Centro',
      cep: '39400000',
      bio: `Babá experiente — ${p.childNeed}`,
      specialties: ['bebês', 'rotina'],
      photoUrl: PHOTO,
      hourRate: 35,
      dailyRate: p.dailyRate,
      approved: false,
      kycStatus: 'pending_review',
    });
    ok(tag, 'Etapa 1+2 Firestore', `users + caregivers (${p.babaEmail})`);
  } catch (e) {
    fail(tag, 'Cadastro babá base', p.babaEmail, e);
    return;
  }

  try {
    for (const docKey of DOCS_OBRIG) {
      await fsSet(baba.idToken, `caregivers/${baba.uid}/documents/${docKey}`, {
        docKey,
        label: docKey,
        fileUrl: PHOTO,
        storagePath: `caregivers/${baba.uid}/documents/${docKey}_sim.jpg`,
        status: 'pending_review',
      });
    }
    if (idx % 2 === 0) {
      await fsSet(baba.idToken, `caregivers/${baba.uid}/documents/curso`, {
        docKey: 'curso',
        fileUrl: PHOTO,
        status: 'pending_review',
      });
    }
    const docsMap = await listDocs(baba.idToken, baba.uid);
    const cgDoc = await fsGet(baba.idToken, `caregivers/${baba.uid}`);
    const d = {
      street: fieldVal(cgDoc, 'street'),
      number: fieldVal(cgDoc, 'number'),
      cep: fieldVal(cgDoc, 'cep'),
      city: fieldVal(cgDoc, 'city'),
      state: fieldVal(cgDoc, 'state'),
      bio: fieldVal(cgDoc, 'bio'),
      photoUrl: fieldVal(cgDoc, 'photoUrl'),
    };
    const rota = ic24AvaliarCadastroBaba(d, docsMap);
    if (rota.complete && rota.screen === 'baba-painel') {
      ok(tag, 'Etapa 3 docs + rota painel', `${DOCS_OBRIG.length} obrigatórios → ${rota.screen}`);
    } else {
      fail(tag, 'Rota cadastro', `esperado baba-painel, got ${rota.screen}`, new Error(JSON.stringify(rota)));
    }
    const missing = DOCS_OBRIG.filter((k) => !ic24DocUploaded(k, docsMap));
    if (missing.length) fail(tag, 'Docs obrigatórios', `faltam: ${missing.join(', ')}`);
  } catch (e) {
    fail(tag, 'Upload documentos (Firestore)', '', e);
    return;
  }

  try {
    await fsSet(baba.idToken, `curriculum_public/${baba.uid}`, {
      caregiverId: baba.uid,
      fullName: p.babaName,
      city: 'Montes Claros',
      state: 'MG',
      photoUrl: PHOTO,
      bio: fieldVal((await fsGet(baba.idToken, `caregivers/${baba.uid}`)), 'bio'),
    });
    ok(tag, 'Currículo público', 'curriculum_public gravado');
  } catch (e) {
    fail(tag, 'Currículo público', '', e);
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
      street: 'Av Família',
      number: String(50 + idx),
      cep: '39400000',
    });
    ok(tag, 'Cadastro família', `${p.familyEmail} (${p.familyName})`);
  } catch (e) {
    fail(tag, 'Cadastro família', p.familyEmail, e);
    return;
  }

  try {
    const token = `${TS}_${idx}_${baba.uid.slice(0, 6)}`;
    const curSnap = await fsGet(family.idToken, `curriculum_public/${baba.uid}`);
    await fsSet(family.idToken, `cv_requests/${token}`, {
      token,
      familyId: family.uid,
      caregiverId: baba.uid,
      status: 'shared',
      familyName: p.familyName,
      curriculum: {
        caregiverId: baba.uid,
        fullName: fieldVal(curSnap, 'fullName'),
        city: fieldVal(curSnap, 'city'),
        state: fieldVal(curSnap, 'state'),
      },
    });
    const cvRead = await fsGet(family.idToken, `cv_requests/${token}`);
    if (fieldVal(cvRead, 'status') === 'shared') {
      ok(tag, 'Solicitar currículo', `cv_requests/${token} legível`);
    } else {
      fail(tag, 'Solicitar currículo', 'status incorreto');
    }
    const curUrl = `https://baba-on-3634a.web.app/curriculo.html?t=${encodeURIComponent(token)}`;
    const hr = await fetch(curUrl);
    if (hr.ok) ok(tag, 'Página currículo', `HTTP ${hr.status}`);
    else fail(tag, 'Página currículo', `HTTP ${hr.status}`);
  } catch (e) {
    fail(tag, 'Fluxo currículo', '', e);
  }

  try {
    const offer = await fsAdd(family.idToken, 'job_offers', {
      familyId: family.uid,
      familyName: p.familyName,
      title: `Plantão ${p.childNeed}`,
      elderlyType: p.childNeed,
      careNeeds: 'Cuidado infantil',
      dailyRate: p.dailyRate,
      status: 'open',
      jobDurationDays: p.dias,
    });
    offerId = docId(offer);
    const feeTotal = Math.round(p.dias * FEE_USD * 100) / 100;
    await fsSet(family.idToken, `job_offers/${offerId}`, {
      status: 'matched',
      matchedCaregiverId: baba.uid,
      agreedDailyRate: p.dailyRate,
      jobDurationDays: p.dias,
      platformFeeStatus: 'pending',
      platformFeeAmount: feeTotal,
      platformFeePendingDiarias: p.dias,
      platformFeeCurrency: 'USD',
    });
    await fsSet(baba.idToken, `caregivers/${baba.uid}`, {
      platformFeePending: feeTotal,
      platformFeePendingDiarias: p.dias,
      platformFeeCurrency: 'USD',
      platformFeePendingOfferId: offerId,
    });
    ok(tag, 'Negócio fechado + taxa pendente', `${p.dias} diária(s) · US$ ${feeTotal}`);
  } catch (e) {
    fail(tag, 'Fechamento negócio', '', e);
    return;
  }

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
        appleTransactionId: `sim8_${TS}_${idx}_${u}`,
      });
      const cg = await fsGet(baba.idToken, `caregivers/${baba.uid}`);
      const pend = fieldVal(cg, 'platformFeePending') || 0;
      const diarias = fieldVal(cg, 'platformFeePendingDiarias') || p.dias;
      const newPend = Math.max(0, Math.round((pend - FEE_USD) * 100) / 100);
      const newDiarias = Math.max(0, diarias - 1);
      await fsSet(baba.idToken, `caregivers/${baba.uid}`, {
        platformFeePending: newPend,
        platformFeePendingDiarias: newDiarias,
        ...(newPend <= 0.001 ? { platformFeePendingOfferId: null, platformFeeLastMethod: 'apple_iap' } : {}),
      });
    }
    const cgFinal = await fsGet(baba.idToken, `caregivers/${baba.uid}`);
    const pendFinal = fieldVal(cgFinal, 'platformFeePending') || 0;
    if (pendFinal <= 0.001) {
      await fsSet(baba.idToken, `job_offers/${offerId}`, { platformFeeStatus: 'paid' });
      ok(tag, 'Taxa IAP (Firestore)', `${p.dias}× US$ ${FEE_USD} registrada · pendente zerada`);
    } else {
      fail(tag, 'Taxa IAP', `pendente ainda ${pendFinal}`);
    }
  } catch (e) {
    fail(tag, 'Taxa IAP Firestore', '', e);
  }

  try {
    const inv = await fsAdd(baba.idToken, 'invoices', {
      caregiverId: baba.uid,
      familyId: family.uid,
      offerId,
      amount: p.dailyRate,
      method: 'pix',
      status: 'pending',
      description: `Diária ${p.childNeed}`,
    });
    await fsSet(family.idToken, `invoices/${docId(inv)}`, { status: 'paid' });
    ok(tag, 'PIX diária', `R$ ${p.dailyRate} invoice paga pela família`);
  } catch (e) {
    fail(tag, 'PIX diária', '', e);
  }

  try {
    await fsAdd(family.idToken, 'payments', { method: 'pix', amount: FEE_USD, type: 'platform_fee' });
    fail(tag, 'Regra anti-PIX taxa', 'deveria bloquear');
  } catch (e) {
    if (String(e.message).includes('PERMISSION_DENIED') || String(e.message).includes('Missing')) {
      ok(tag, 'Regra anti-PIX taxa', 'bloqueado (correto)');
    } else {
      fail(tag, 'Regra anti-PIX taxa', '', e);
    }
  }
}

async function main() {
  console.log('='.repeat(72));
  console.log('BABÁ ON — 8 USUÁRIOS (4 babás + 4 famílias) · cadastro docs RG · currículo · IAP · PIX');
  console.log(`Projeto: ${PROJECT} · TS: ${TS}`);
  console.log('='.repeat(72));

  for (let i = 0; i < pairs.length; i++) {
    console.log(`\n--- ${pairs[i].babaName} ↔ ${pairs[i].familyName} (${pairs[i].childNeed}) ---`);
    await runPair(pairs[i], i);
  }

  const okN = log.filter((x) => x.status === 'OK').length;
  const failN = log.filter((x) => x.status === 'FAIL').length;
  console.log('\n' + '='.repeat(72));
  console.log(`RESUMO: ${okN} OK | ${failN} FAIL | ${pairs.length * 2} contas | ${pairs.length} negócios`);
  console.log('='.repeat(72));
  console.log('\nLIMITAÇÕES (honestas):');
  console.log('  • Não testou picker de foto / WebView iOS — só Firestore com fileUrl simulado');
  console.log('  • Não testou StoreKit real — IAP simulado via platform_fee_payments + rules');
  console.log('  • Não testou UI congelada — só backend + hosting curriculo.html');

  const outPath = new URL(`../test_sim8_${TS}.json`, import.meta.url);
  writeFileSync(outPath, JSON.stringify({ TS, pairs, log, okN, failN }, null, 2));
  console.log(`\nRelatório: ${outPath.pathname || outPath}`);

  if (failN > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
