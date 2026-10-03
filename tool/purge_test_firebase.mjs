/**
 * Remove perfis/simulações de teste — Idoso Care + Babá ON.
 * Mantém contas demo Apple (review).
 *
 * node tool/purge_test_firebase.mjs --dry-run
 * node tool/purge_test_firebase.mjs --execute
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');
const DRY = !EXECUTE;

const PASSWORDS = ['Demo123!', 'SimTest62!', 'DestTest9!', 'Teste@123'];

const APPS = [
  {
    name: 'Idoso Care 24H',
    project: 'idoso-care-24h',
    apiKeyPath: join(__dir, '../idoso-care-24h/web_app/firebase-ic24.js'),
    listLogin: { email: 'familia.demo@ic24test.local', password: 'Demo123!' },
    deleteFn: 'https://southamerica-east1-idoso-care-24h.cloudfunctions.net/deleteMyAccount',
    keepEmails: new Set([
      'cuidador.demo@ic24test.local',
      'familia.demo@ic24test.local',
    ]),
    isTestEmail(email) {
      const e = String(email || '').toLowerCase().trim();
      if (!e || this.keepEmails.has(e)) return false;
      if (e.endsWith('@ic24test.local')) return true;
      if (e.endsWith('@example.com')) return true;
      if (/@babaon\.test\.local$/i.test(e)) return true;
      if (/sim62|sim10|e2efull|e2e\.dest|dest\.(cg|fam|baba)|dbg\.cg|\.teste\./i.test(e)) return true;
      return false;
    },
  },
  {
    name: 'Babá ON',
    project: 'baba-on-3634a',
    apiKeyPath: join(__dir, '../baba-on/web_app/firebase-ic24.js'),
    listLogin: { email: 'baba.demo@babaon.test.local', password: 'Demo123!' },
    deleteFn: 'https://southamerica-east1-baba-on-3634a.cloudfunctions.net/deleteMyAccount',
    keepEmails: new Set(['baba.demo@babaon.test.local', 'pai.demo@babaon.test.local']),
    isTestEmail(email) {
      const e = String(email || '').toLowerCase().trim();
      if (!e || this.keepEmails.has(e)) return false;
      if (e.endsWith('@babaon.test.local')) return true;
      if (e.endsWith('@ic24test.local')) return true;
      if (e.endsWith('@example.com')) return true;
      if (/sim62|sim10|e2efull|e2e\.|dest\.(baba|fam|cg)|dbg\./i.test(e)) return true;
      if (/^(jp44|joana44)@gmail\.com$/i.test(e)) return true;
      return false;
    },
  },
];

function loadApiKey(path) {
  return readFileSync(path, 'utf8').match(/apiKey:\s*['"]([^'"]+)['"]/)[1];
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
  if (!r.ok) {
    const msg = j.error?.message || j.error?.status || t;
    throw new Error(String(msg).slice(0, 500));
  }
  return j;
}

async function signIn(apiKey, email, password) {
  return json(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
}

function parseFields(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('doubleValue' in v) out[k] = v.doubleValue;
    else if ('timestampValue' in v) out[k] = v.timestampValue;
  }
  return out;
}

async function listCollection(project, token, collectionId) {
  const out = [];
  let pageToken = '';
  for (;;) {
    const url =
      `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${collectionId}?pageSize=300` +
      (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const page = await json(url, { headers: { Authorization: 'Bearer ' + token } });
    for (const doc of page.documents || []) {
      out.push({ id: doc.name.split('/').pop(), ...parseFields(doc.fields || {}) });
    }
    pageToken = page.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

async function deleteDoc(project, token, path) {
  await json(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${path}`,
    { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } },
  );
}

async function patchDoc(project, token, path, fieldsObj) {
  const fields = {};
  for (const [k, v] of Object.entries(fieldsObj)) {
    if (typeof v === 'number') fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else fields[k] = { stringValue: String(v) };
  }
  const mask = Object.keys(fieldsObj)
    .map((k) => `updateMask.fieldPaths=${k}`)
    .join('&');
  await json(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${path}?${mask}&key=` +
      encodeURIComponent(''),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ fields }),
    },
  );
}

async function patchDocSimple(project, token, path, fieldsObj) {
  const fields = {};
  for (const [k, v] of Object.entries(fieldsObj)) {
    if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else fields[k] = { stringValue: String(v) };
  }
  const qs = Object.keys(fieldsObj)
    .map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k))
    .join('&');
  await json(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${path}?${qs}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ fields }),
    },
  );
}

async function deleteAccount(deleteFn, idToken) {
  await json(deleteFn, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: {} }),
  });
}

async function authDeleteFallback(apiKey, idToken) {
  await json(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
}

async function signInAny(apiKey, email) {
  for (const password of PASSWORDS) {
    try {
      const j = await signIn(apiKey, email, password);
      return { ...j, passwordUsed: password };
    } catch (_) {
      /* try next */
    }
  }
  return null;
}

async function cleanupUserData(app, apiKey, auth) {
  const uid = auth.localId;
  const tok = auth.idToken;
  const stats = { destDeleted: 0, offersCancelled: 0, destCancelled: 0, errors: [] };

  let allOffers = [];
  let allDest = [];
  try {
    allOffers = await listCollection(app.project, tok, 'job_offers');
  } catch (e) {
    stats.errors.push('list job_offers: ' + e.message);
  }
  try {
    allDest = await listCollection(app.project, tok, 'caregiver_destination_availability');
  } catch (e) {
    stats.errors.push('list dest: ' + e.message);
  }

  for (const o of allOffers.filter((x) => x.familyId === uid)) {
    if (o.status === 'open' || o.status === 'negotiating' || o.status === 'pending_family_approval') {
      try {
        if (EXECUTE) await patchDocSimple(app.project, tok, `job_offers/${o.id}`, { status: 'cancelled' });
        stats.offersCancelled++;
      } catch (e) {
        stats.errors.push(`offer ${o.id}: ${e.message}`);
      }
    }
  }

  for (const d of allDest.filter((x) => x.caregiverId === uid)) {
    try {
      if (d.status === 'open' && EXECUTE) {
        await patchDocSimple(app.project, tok, `caregiver_destination_availability/${d.id}`, {
          status: 'cancelled',
        });
        stats.destCancelled++;
      }
      if (EXECUTE) {
        await deleteDoc(app.project, tok, `caregiver_destination_availability/${d.id}`);
        stats.destDeleted++;
      } else {
        stats.destDeleted++;
      }
    } catch (e) {
      stats.errors.push(`dest ${d.id}: ${e.message}`);
    }
  }

  return stats;
}

async function purgeApp(app) {
  const apiKey = loadApiKey(app.apiKeyPath);
  const report = {
    app: app.name,
    project: app.project,
    dryRun: DRY,
    purged: [],
    skipped: [],
    errors: [],
    orphanOffersCancelled: 0,
  };

  let listTok;
  try {
    const li = await signIn(apiKey, app.listLogin.email, app.listLogin.password);
    listTok = li.idToken;
  } catch (e) {
    report.errors.push('list login failed: ' + e.message);
    return report;
  }

  const users = await listCollection(app.project, listTok, 'users');
  const targets = users.filter((u) => app.isTestEmail(u.email));
  report.targets = targets.map((u) => ({ uid: u.id, email: u.email, role: u.role }));

  const purgeUids = new Set(targets.map((t) => t.id));

  for (const u of targets) {
    const email = u.email;
    if (!EXECUTE) {
      report.purged.push({ email, uid: u.id, mode: 'dry-run' });
      continue;
    }
    const auth = await signInAny(apiKey, email);
    if (!auth) {
      report.skipped.push({ email, reason: 'login_failed_all_passwords' });
      continue;
    }
    try {
      const clean = await cleanupUserData(app, apiKey, auth);
      try {
        await deleteAccount(app.deleteFn, auth.idToken);
        report.purged.push({ email, uid: u.id, mode: 'deleteMyAccount', clean });
      } catch (e1) {
        try {
          await authDeleteFallback(apiKey, auth.idToken);
          report.purged.push({ email, uid: u.id, mode: 'auth_only', clean, warn: e1.message });
        } catch (e2) {
          report.errors.push({ email, delete: e1.message, authDelete: e2.message, clean });
        }
      }
    } catch (e) {
      report.errors.push({ email, error: e.message });
    }
  }

  if (EXECUTE && purgeUids.size) {
    try {
      const offers = await listCollection(app.project, listTok, 'job_offers');
      for (const o of offers) {
        const fid = o.familyId;
        const cg = o.matchedCaregiverId || o.pendingCaregiverId;
        const testFamily = fid && purgeUids.has(fid);
        const testCg = cg && purgeUids.has(cg);
        const testTarget = o.targetCaregiverId && purgeUids.has(o.targetCaregiverId);
        if (testTarget && !testFamily) continue;
        if (!testFamily && !testCg) continue;
        if (o.status !== 'open' && o.status !== 'negotiating' && o.status !== 'pending_family_approval') continue;
        try {
          const ownerAuth = testFamily
            ? await signInAny(apiKey, targets.find((t) => t.id === fid)?.email || '')
            : null;
          if (ownerAuth) {
            await patchDocSimple(app.project, ownerAuth.idToken, `job_offers/${o.id}`, { status: 'cancelled' });
            report.orphanOffersCancelled++;
          }
        } catch (_) {
          /* best effort */
        }
      }
    } catch (e) {
      report.errors.push('orphan offers pass: ' + e.message);
    }
  }

  return report;
}

const results = [];
for (const app of APPS) {
  console.log(`\n=== ${app.name} (${DRY ? 'DRY-RUN' : 'EXECUTE'}) ===`);
  const r = await purgeApp(app);
  results.push(r);
  console.log(
    `Alvos: ${r.targets?.length || 0} | Removidos: ${r.purged.length} | Pulados: ${r.skipped.length} | Erros: ${r.errors.length}`,
  );
  if (r.purged.length) console.log('Removidos:', r.purged.map((x) => x.email).join(', '));
  if (r.skipped.length) console.log('Pulados:', JSON.stringify(r.skipped));
  if (r.errors.length) console.log('Erros:', JSON.stringify(r.errors, null, 2));
}

const outPath = join(__dir, 'purge_test_firebase_report.json');
writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), dryRun: DRY, results }, null, 2));
console.log('\nRelatório:', outPath);

if (DRY) {
  console.log('\nNenhuma alteração feita. Rode: node tool/purge_test_firebase.mjs --execute');
}
