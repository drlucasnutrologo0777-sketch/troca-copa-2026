/**
 * Panorama Firestore baba-on-3634a (Auth REST — leitura conforme rules)
 * node scripts/_auditoria_firestore_completa.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT = 'baba-on-3634a';
const apiKey = readFileSync(join(__dir, '../web_app/firebase-ic24.js'), 'utf8').match(
  /apiKey:\s*['"]([^'"]+)['"]/,
)[1];
const EMAIL = process.env.BO_PEEK_EMAIL || 'drlucasnutrologo0777@gmail.com';
const PASS = process.env.BO_PEEK_PASS || 'Teste@123';

const COLLECTIONS = [
  'users',
  'caregivers',
  'clients',
  'job_offers',
  'offer_responses',
  'family_notifications',
  'caregiver_notifications',
  'chats',
  'ponto_sessions',
  'invoices',
  'platform_fee_payments',
  'family_reports',
  'support_tickets',
  'caregiver_destination_availability',
  'compliance_events',
];

const DEMO_EMAIL_RE =
  /@babaon\.test\.local$|^(jp44|joana44)@gmail\.com$|^baba\.demo@|^pai\.demo@/i;
const DEMO_OFFER_IDS = new Set(['review_demo_iap_offer']);

async function signIn(email, pass) {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
    },
  );
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j;
}

function u(fields) {
  if (!fields) return null;
  const o = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue != null) o[k] = v.stringValue;
    else if (v.integerValue != null) o[k] = Number(v.integerValue);
    else if (v.doubleValue != null) o[k] = v.doubleValue;
    else if (v.booleanValue != null) o[k] = v.booleanValue;
    else if (v.nullValue != null) o[k] = null;
    else if (v.timestampValue != null) o[k] = v.timestampValue;
    else if (v.mapValue != null) o[k] = '[map]';
    else if (v.arrayValue != null) o[k] = '[array]';
  }
  return o;
}

async function listCollection(tok, collectionId, pageSize = 300) {
  const out = [];
  let pageToken = '';
  let denied = false;
  do {
    const q = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) q.set('pageToken', pageToken);
    const r = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collectionId}?${q}`,
      { headers: { Authorization: `Bearer ${tok}` } },
    );
    const j = await r.json();
    if (r.status === 403) {
      denied = true;
      break;
    }
    if (j.error) throw new Error(`${collectionId}: ${j.error.message}`);
    for (const doc of j.documents || []) {
      out.push({ id: doc.name.split('/').pop(), ...u(doc.fields) });
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return { docs: out, denied };
}

function countBy(arr, key) {
  const m = {};
  for (const x of arr) {
    const v = x[key] ?? '(vazio)';
    m[v] = (m[v] || 0) + 1;
  }
  return m;
}

function isDemoUser(doc) {
  const em = String(doc.email || '').toLowerCase();
  return DEMO_EMAIL_RE.test(em) || /^demo_/i.test(doc.id);
}

function isDemoOffer(o) {
  if (DEMO_OFFER_IDS.has(o.id)) return true;
  if (/^demo_/i.test(o.familyId || '') || /^demo_/i.test(o.matchedCaregiverId || '')) return true;
  return false;
}

const auth = await signIn(EMAIL, PASS);
const tok = auth.idToken;

const report = {
  project: PROJECT,
  scannedAt: new Date().toISOString(),
  loginEmail: EMAIL,
  loginUid: auth.localId,
  collections: {},
  negocios: {},
  visibilidade: {},
};

for (const col of COLLECTIONS) {
  try {
    const { docs, denied } = await listCollection(tok, col);
    report.collections[col] = {
      count: docs.length,
      listDenied: denied,
      note: denied ? 'Rules bloqueiam listagem — contagem parcial ou zero' : null,
    };
    if (col === 'users') {
      report.visibilidade.users_total = docs.length;
      report.visibilidade.users_by_role = countBy(docs, 'role');
      report.visibilidade.users_demo = docs.filter(isDemoUser).length;
    }
    if (col === 'caregivers') {
      report.visibilidade.caregivers_total = docs.length;
      report.visibilidade.caregivers_approved = docs.filter((d) => d.approved === true).length;
      report.visibilidade.caregivers_with_activeFamily = docs.filter((d) => d.activeFamilyId).length;
    }
    if (col === 'clients') {
      report.visibilidade.clients_total = docs.length;
    }
    if (col === 'job_offers') {
      report.negocios.job_offers_total = docs.length;
      report.negocios.job_offers_by_status = countBy(docs, 'status');
      const matched = docs.filter((d) => d.status === 'matched');
      report.negocios.matched_total = matched.length;
      report.negocios.matched_real = matched.filter((o) => !isDemoOffer(o)).map((o) => ({
        offerId: o.id,
        familyId: o.familyId,
        caregiverId: o.matchedCaregiverId,
        matchedAt: o.matchedAt,
        dailyRate: o.agreedDailyRate ?? o.dailyRate,
        jobDurationDays: o.jobDurationDays,
        totalContractAmount: o.totalContractAmount,
      }));
      report.negocios.matched_demo = matched.filter((o) => isDemoOffer(o)).map((o) => o.id);
      report.negocios.pending_family_approval = docs
        .filter((d) => d.status === 'pending_family_approval')
        .map((o) => ({ offerId: o.id, familyId: o.familyId, pendingResponseId: o.pendingResponseId }));
    }
    if (col === 'offer_responses') {
      report.negocios.offer_responses_total = docs.length;
      report.negocios.offer_responses_by_status = countBy(docs, 'status');
      report.negocios.pending_family = docs
        .filter((d) => d.status === 'pending_family')
        .map((r) => ({
          id: r.id,
          offerId: r.offerId,
          familyId: r.familyId,
          caregiverId: r.caregiverId,
          dailyRateUsed: r.dailyRateUsed,
          termsFinalizedAt: r.termsFinalizedAt,
        }));
      report.negocios.accepted = docs
        .filter((d) => d.status === 'accepted')
        .map((r) => ({
          id: r.id,
          offerId: r.offerId,
          familyId: r.familyId,
          caregiverId: r.caregiverId,
          familyDecisionAt: r.familyDecisionAt,
        }));
    }
    if (col === 'chats') {
      report.negocios.chats_total = docs.length;
      report.negocios.chats_unlocked = docs.filter((c) => c.chatUnlocked === true).length;
    }
    if (col === 'family_notifications') {
      report.negocios.family_notifications_pending = docs.filter((n) => n.status === 'pending').length;
    }
  } catch (e) {
    report.collections[col] = { error: String(e.message || e) };
  }
}

const outPath = join(__dir, '_auditoria_firestore_report.json');
writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
console.error('\nRelatório salvo:', outPath);
