/**
 * Limpeza completa (Admin SDK) — perfis teste + ofertas + destinos.
 * Requer credencial Google (service account ou ADC):
 *   gcloud auth application-default login
 *   ou GOOGLE_APPLICATION_CREDENTIALS=...\serviceAccount.json
 *
 * node tool/purge_test_admin.mjs --dry-run
 * node tool/purge_test_admin.mjs --execute
 */
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const admin = require('../baba-on/firebase-deploy/functions/node_modules/firebase-admin');

const __dir = dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');

const CONFIGS = [
  {
    name: 'Idoso Care 24H',
    projectId: 'idoso-care-24h',
    keepEmails: new Set(['cuidador.demo@ic24test.local', 'familia.demo@ic24test.local']),
    isTest(email, keep) {
      const e = String(email || '').toLowerCase().trim();
      if (!e || keep.has(e)) return false;
      if (e.endsWith('@ic24test.local') || e.endsWith('@example.com')) return true;
      if (/sim62|sim10|sim6\.|e2efull|e2e\.|dest\.|familia8\.|cuidador8\.|debug\.|foto\.test|check-fam|familia\.dr/i.test(e))
        return true;
      return false;
    },
  },
  {
    name: 'Babá ON',
    projectId: 'baba-on-3634a',
    keepEmails: new Set(['baba.demo@babaon.test.local', 'pai.demo@babaon.test.local']),
    isTest(email, keep) {
      const e = String(email || '').toLowerCase().trim();
      if (!e || keep.has(e)) return false;
      if (e.endsWith('@babaon.test.local') || e.endsWith('@ic24test.local') || e.endsWith('@example.com')) return true;
      if (/sim62|sim10|e2efull|e2e\.|dest\./i.test(e)) return true;
      if (/^(jp44|joana44)@gmail\.com$/i.test(e)) return true;
      return false;
    },
  },
];

async function deleteQueryBatch(db, query, limit = 300) {
  const snap = await query.limit(limit).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (EXECUTE) await batch.commit();
  return snap.size;
}

async function purgeProject(cfg) {
  const app = admin.apps.find((a) => a.name === cfg.projectId) || admin.initializeApp({ projectId: cfg.projectId }, cfg.projectId);
  const db = admin.firestore(app);
  const auth = admin.auth(app);
  const report = {
    project: cfg.projectId,
    authDeleted: 0,
    offersCancelled: 0,
    offersReopenedPublic: 0,
    destDeleted: 0,
    userDocs: 0,
    errors: [],
  };
  const FieldValue = admin.firestore.FieldValue;

  let nextPageToken;
  const testUids = new Set();
  do {
    const res = await auth.listUsers(1000, nextPageToken);
    for (const u of res.users) {
      if (!cfg.isTest(u.email, cfg.keepEmails)) continue;
      testUids.add(u.uid);
      if (EXECUTE) {
        try {
          await auth.deleteUser(u.uid);
          report.authDeleted++;
        } catch (e) {
          report.errors.push(`auth ${u.email}: ${e.message}`);
        }
      } else {
        report.authDeleted++;
      }
    }
    nextPageToken = res.pageToken;
  } while (nextPageToken);

  const usersSnap = await db.collection('users').get();
  for (const doc of usersSnap.docs) {
    const email = (doc.data().email || '').toLowerCase();
    if (!cfg.isTest(email, cfg.keepEmails)) continue;
    testUids.add(doc.id);
    if (EXECUTE) {
      try {
        await db.recursiveDelete(db.doc(`users/${doc.id}`));
        report.userDocs++;
      } catch (e) {
        report.errors.push(`users/${doc.id}: ${e.message}`);
      }
    } else report.userDocs++;
  }

  for (const uid of testUids) {
    for (const col of ['caregivers', 'clients', 'curriculum_public']) {
      const ref = db.doc(`${col}/${uid}`);
      if (EXECUTE) {
        try {
          const s = await ref.get();
          if (s.exists) {
            await db.recursiveDelete(ref);
          }
        } catch (e) {
          report.errors.push(`${col}/${uid}: ${e.message}`);
        }
      }
    }
  }

  const offers = await db.collection('job_offers').get();
  for (const doc of offers.docs) {
    const o = doc.data();
    const active = ['open', 'negotiating', 'pending_family_approval'].includes(o.status);
    if (!active) continue;

    const targetTest = o.targetCaregiverId && testUids.has(o.targetCaregiverId);
    const familyTest = o.familyId && testUids.has(o.familyId);
    const cgTest =
      (o.matchedCaregiverId && testUids.has(o.matchedCaregiverId)) ||
      (o.pendingCaregiverId && testUids.has(o.pendingCaregiverId));

    if (targetTest && !familyTest && o.status === 'open') {
      const title =
        o.careNeeds || o.elderlyType
          ? 'Plantão — ' + String(o.careNeeds || o.elderlyType).slice(0, 80)
          : 'Plantão — busca babá';
      if (EXECUTE) {
        await doc.ref.update({
          targetCaregiverId: FieldValue.delete(),
          directedToCaregiver: FieldValue.delete(),
          title,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      report.offersReopenedPublic++;
      continue;
    }

    if (!familyTest && !cgTest && !targetTest) continue;
    if (EXECUTE) {
      await doc.ref.set({ status: 'cancelled', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    report.offersCancelled++;
  }

  const destSnap = await db.collection('caregiver_destination_availability').get();
  for (const doc of destSnap.docs) {
    const d = doc.data();
    if (!testUids.has(d.caregiverId)) continue;
    if (EXECUTE) await doc.ref.delete();
    report.destDeleted++;
  }

  return report;
}

const results = [];
for (const cfg of CONFIGS) {
  console.log(`\n=== ${cfg.name} (${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}) ===`);
  try {
    const r = await purgeProject(cfg);
    results.push(r);
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    console.error('Falha:', e.message);
    results.push({ project: cfg.projectId, error: e.message });
  }
}

const out = join(__dir, 'purge_test_admin_report.json');
writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), execute: EXECUTE, results }, null, 2));
console.log('\nRelatório:', out);
if (!EXECUTE) console.log('Rode com --execute após configurar credencial Admin (gcloud auth application-default login).');
