/**
 * Simula: babá publica "trabalhar em outro lugar" → família vê no tópico mae-babas-destino.
 * 1) Testes locais de matching (país/estado/cidade/CEP)
 * 2) Opcional: Firebase REST (--live) cria anúncio + lê como família
 *
 * node tool/test_destino_familia_match.mjs
 * node tool/test_destino_familia_match.mjs --live
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const LIVE = process.argv.includes('--live');
const PROJECT = 'baba-on-3634a';

function ic24NormLocalText(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function ic24CepDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function ic24DestinoCombinaFamilia(anuncio, fam) {
  fam = fam || {};
  anuncio = anuncio || {};
  const fc = ic24NormLocalText(fam.city);
  const fs = ic24NormLocalText(fam.state);
  const fco = ic24NormLocalText(fam.country || 'Brasil');
  const ac = ic24NormLocalText(anuncio.city);
  const as = ic24NormLocalText(anuncio.state);
  const aco = ic24NormLocalText(anuncio.country);
  const fcep = ic24CepDigits(fam.cep || fam.postalCode);
  const acep = ic24CepDigits(anuncio.postalCode);
  if (fcep.length >= 8 && acep.length >= 8 && fcep === acep) return true;
  if (fcep.length >= 5 && acep.length >= 5 && fcep.slice(0, 5) === acep.slice(0, 5)) {
    if (!fc || !ac || fc === ac) return true;
  }
  if (fc && ac && fc === ac) {
    if (fs && as && fs !== as) return false;
    return true;
  }
  if (fs && as && fs === as && (!fc || !ac)) return true;
  if (fco && aco && fco === aco && !fc && !ac && !fs && !as) return true;
  return false;
}

function ic24AddDaysIso(isoDate, days) {
  const d = new Date(String(isoDate).slice(0, 10) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function simulateFamiliaLista(anuncios, famLoc, showAll) {
  const today = new Date().toISOString().slice(0, 10);
  return anuncios.filter((a) => {
    if (a.status !== 'open') return false;
    if (a.periodEnd && a.periodEnd < today) return false;
    if (!showAll && !ic24DestinoCombinaFamilia(a, famLoc)) return false;
    return true;
  });
}

const cases = [
  {
    name: 'mesma cidade e estado',
    fam: { country: 'Brasil', state: 'SP', city: 'São Paulo', cep: '01310-100' },
    anuncio: { country: 'Brasil', state: 'SP', city: 'São Paulo', postalCode: '01310-200' },
    expect: true,
  },
  {
    name: 'CEP igual (8 dígitos) mesmo com acento diferente na cidade',
    fam: { country: 'Brasil', state: 'MG', city: 'Belo Horizonte', cep: '30130-100' },
    anuncio: { country: 'Brasil', state: 'MG', city: 'Belo Horizonte', postalCode: '30130-100' },
    expect: true,
  },
  {
    name: 'cidade diferente e CEP diferente',
    fam: { country: 'Brasil', state: 'RJ', city: 'Rio de Janeiro', cep: '20040-020' },
    anuncio: { country: 'Brasil', state: 'SP', city: 'Campinas', postalCode: '13083-852' },
    expect: false,
  },
  {
    name: 'só estado igual (família sem cidade no cadastro)',
    fam: { country: 'Brasil', state: 'Paraná', city: '', cep: '' },
    anuncio: { country: 'Brasil', state: 'Parana', city: 'Curitiba', postalCode: '' },
    expect: true,
  },
  {
    name: 'cidade igual mas UF diferente não combina',
    fam: { country: 'Brasil', state: 'SP', city: 'Santos', cep: '' },
    anuncio: { country: 'Brasil', state: 'RJ', city: 'Santos', postalCode: '' },
    expect: false,
  },
];

let passed = 0;
let failed = 0;
const report = [];

for (const c of cases) {
  const got = ic24DestinoCombinaFamilia(c.anuncio, c.fam);
  const ok = got === c.expect;
  if (ok) {
    passed++;
    console.log('PASS match:', c.name);
  } else {
    failed++;
    console.error('FAIL match:', c.name, 'got', got, 'expected', c.expect);
  }
  report.push({ ...c, got, ok });
}

const hoje = new Date().toISOString().slice(0, 10);
const anuncioOk = {
  status: 'open',
  country: 'Brasil',
  state: 'SP',
  city: 'Guarulhos',
  postalCode: '07115-000',
  periodStart: ic24AddDaysIso(hoje, 20),
  periodEnd: ic24AddDaysIso(hoje, 50),
};
const famOk = { country: 'Brasil', state: 'SP', city: 'Guarulhos', cep: '07115-000' };
const lista = simulateFamiliaLista([anuncioOk], famOk, false);
if (lista.length === 1) {
  passed++;
  console.log('PASS simulação lista família: babá aparece no tópico');
} else {
  failed++;
  console.error('FAIL simulação lista família: esperava 1, got', lista.length);
}

const minStart = ic24AddDaysIso(hoje, 15);
if (ic24AddDaysIso(hoje, 14) < minStart && ic24AddDaysIso(hoje, 15) >= minStart) {
  passed++;
  console.log('PASS regra 15 dias: início mínimo', minStart);
} else {
  failed++;
  console.error('FAIL regra 15 dias');
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
  if (!r.ok) throw new Error((j.error?.message || j.error || t).slice(0, 400));
  return j;
}

async function runLive() {
  const API_KEY = loadApiKey();
  const ts = Date.now();
  const pass = 'DestTest9!';
  const babaEmail = `dest.baba.${ts}@babaon.test.local`;
  const famEmail = `dest.fam.${ts}@babaon.test.local`;

  const babaAuth = await json(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: babaEmail, password: pass, returnSecureToken: true }),
    },
  );
  const famAuth = await json(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: famEmail, password: pass, returnSecureToken: true }),
    },
  );

  const babaId = babaAuth.localId;
  const famId = famAuth.localId;
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

  function docFields(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'number') fields[k] = { doubleValue: v };
      else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
      else fields[k] = { stringValue: String(v) };
    }
    return { fields };
  }

  await json(`${base}/caregivers/${babaId}?key=${API_KEY}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${babaAuth.idToken}`,
    },
    body: JSON.stringify(
      docFields({
        fullName: 'Babá Destino Test',
        approved: true,
        activeFamilyId: '',
        country: 'Brasil',
        state: 'SP',
        city: 'São Paulo',
      }),
    ),
  });

  await json(`${base}/clients/${famId}?key=${API_KEY}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${famAuth.idToken}`,
    },
    body: JSON.stringify(
      docFields({
        fullName: 'Família Destino Test',
        country: 'Brasil',
        state: 'SP',
        city: 'Guarulhos',
        cep: '07115-000',
      }),
    ),
  });

  const anuncioId = `dest_${ts}`;
  const periodStart = ic24AddDaysIso(hoje, 18);
  const periodEnd = ic24AddDaysIso(hoje, 48);
  await json(`${base}/caregiver_destination_availability/${anuncioId}?key=${API_KEY}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${babaAuth.idToken}`,
    },
    body: JSON.stringify(
      docFields({
        caregiverId: babaId,
        caregiverName: 'Babá Destino Test',
        status: 'open',
        country: 'Brasil',
        state: 'SP',
        city: 'Guarulhos',
        postalCode: '07115-000',
        periodStart,
        periodEnd,
        targetDiarias: 10,
        dailyRate: 280,
      }),
    ),
  });

  const snap = await json(
    `${base}/caregiver_destination_availability/${anuncioId}?key=${API_KEY}`,
    { headers: { Authorization: `Bearer ${famAuth.idToken}` } },
  );
  const ad = {};
  for (const [k, v] of Object.entries(snap.fields || {})) {
    ad[k] = v.stringValue ?? v.doubleValue ?? v.booleanValue;
  }
  ad.status = ad.status || 'open';

  const famLoc = { country: 'Brasil', state: 'SP', city: 'Guarulhos', cep: '07115-000' };
  const visible = ic24DestinoCombinaFamilia(ad, famLoc);
  if (visible) {
    passed++;
    console.log('PASS Firebase live: anúncio compatível com cadastro família (Guarulhos + CEP)');
  } else {
    failed++;
    console.error('FAIL Firebase live: matching retornou false', ad);
  }

  return { babaEmail, famEmail, anuncioId, periodStart };
}

(async () => {
  if (LIVE) {
    try {
      const live = await runLive();
      report.push({ live: true, ...live });
    } catch (e) {
      failed++;
      console.error('FAIL Firebase live:', e.message);
      report.push({ live: false, error: e.message });
    }
  } else {
    console.log('(Dica: node tool/test_destino_familia_match.mjs --live para testar Firestore)');
  }

  const outPath = join(__dir, 'test_destino_familia_match_report.json');
  writeFileSync(outPath, JSON.stringify({ passed, failed, report, at: new Date().toISOString() }, null, 2));
  console.log(`\nResumo: ${passed} pass, ${failed} fail → ${outPath}`);
  process.exit(failed ? 1 : 0);
})();
