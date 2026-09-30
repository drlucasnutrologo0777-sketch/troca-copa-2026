/**
 * Audita Firestore — destino + ofertas vinculadas (schema e consistência).
 * node tool/audit_firestore_destino.mjs
 *
 * Credenciais: BO_PEEK_EMAIL / BO_PEEK_PASS ou conta demo @babaon.test.local
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT = 'baba-on-3634a';

const REQUIRED_DEST = [
  'caregiverId',
  'status',
  'country',
  'state',
  'city',
  'periodStart',
  'periodEnd',
  'targetDiarias',
  'dailyRate',
];

function loadApiKey() {
  return readFileSync(join(__dir, '../web_app/firebase-ic24.js'), 'utf8').match(
    /apiKey:\s*['"]([^'"]+)['"]/,
  )[1];
}

function parseFields(fields) {
  if (!fields) return {};
  const o = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue != null) o[k] = v.stringValue;
    else if (v.integerValue != null) o[k] = Number(v.integerValue);
    else if (v.doubleValue != null) o[k] = v.doubleValue;
    else if (v.booleanValue != null) o[k] = v.booleanValue;
    else if (v.timestampValue != null) o[k] = v.timestampValue;
  }
  return o;
}

async function signIn(email, password) {
  const API_KEY = loadApiKey();
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j;
}

async function listCol(token, collectionId, pageSize = 200) {
  const out = [];
  let pageToken = '';
  do {
    const q = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) q.set('pageToken', pageToken);
    const r = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collectionId}?${q}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const j = await r.json();
    if (r.status === 403) return { docs: out, denied: true };
    if (j.error) throw new Error(`${collectionId}: ${j.error.message}`);
    for (const doc of j.documents || []) {
      out.push({ id: doc.name.split('/').pop(), ...parseFields(doc.fields) });
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return { docs: out, denied: false };
}

function validateDestDoc(d) {
  const missing = REQUIRED_DEST.filter((k) => {
    const v = d[k];
    return v === undefined || v === null || v === '';
  });
  const badStatus = d.status && !['open', 'cancelled', 'matched'].includes(d.status);
  const badDates = d.periodStart && d.periodEnd && d.periodEnd < d.periodStart;
  return { missing, badStatus, badDates };
}

const report = { errors: [], warnings: [], stats: {}, at: new Date().toISOString() };

try {
  const email = process.env.BO_PEEK_EMAIL || 'drlucasnutrologo0777@gmail.com';
  const pass = process.env.BO_PEEK_PASS || 'Teste@123';
  const auth = await signIn(email, pass);
  const tok = auth.idToken;

  const dest = await listCol(tok, 'caregiver_destination_availability');
  if (dest.denied) {
    report.errors.push('Sem permissão de leitura em caregiver_destination_availability (rules não deployadas?)');
  } else {
    report.stats.destination_total = dest.docs.length;
    report.stats.destination_by_status = {};
    for (const d of dest.docs) {
      report.stats.destination_by_status[d.status] =
        (report.stats.destination_by_status[d.status] || 0) + 1;
      const v = validateDestDoc(d);
      if (v.missing.length) {
        report.errors.push(`destino ${d.id}: campos faltando ${v.missing.join(', ')}`);
      }
      if (v.badStatus) report.errors.push(`destino ${d.id}: status inválido ${d.status}`);
      if (v.badDates) report.errors.push(`destino ${d.id}: periodEnd < periodStart`);
      if (d.status === 'matched' && !d.matchedOfferId) {
        report.warnings.push(`destino ${d.id}: matched sem matchedOfferId (legado OK)`);
      }
    }
  }

  const offers = await listCol(tok, 'job_offers');
  if (!offers.denied) {
    const linked = offers.docs.filter(
      (o) => o.sourceType === 'destination' || o.destinationAvailabilityId,
    );
    report.stats.offers_destination_linked = linked.length;
    for (const o of linked) {
      if (!o.destinationAvailabilityId) {
        report.errors.push(`offer ${o.id}: sourceType destination sem destinationAvailabilityId`);
      }
      if (o.workDestination && typeof o.workDestination === 'object') {
        /* REST flatten — skip deep */
      }
    }
  }

  console.log('Firestore destino audit');
  console.log('Stats:', JSON.stringify(report.stats, null, 2));
  if (report.warnings.length) console.warn('Warnings:', report.warnings.length);
  if (report.errors.length) {
    console.error('ERRORS:', report.errors.slice(0, 20));
    if (report.errors.length > 20) console.error(`... +${report.errors.length - 20} more`);
  } else {
    console.log('OK: nenhum erro de schema/consistência detectado na amostra');
  }
} catch (e) {
  report.errors.push(String(e.message || e));
  console.error('Audit falhou:', e.message);
}

const outPath = join(__dir, 'audit_firestore_destino_report.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log('Relatório:', outPath);
process.exit(report.errors.length ? 1 : 0);
