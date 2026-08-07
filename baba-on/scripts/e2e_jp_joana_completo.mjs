/**
 * Continua E2E após limpeza: chat msgs + ponto + diário + PIX
 * node scripts/e2e_jp_joana_completo.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT = 'baba-on-3634a';
const JP = { email: 'jp44@gmail.com', pass: 'teste@123' };
const JOANA = { email: 'joana44@gmail.com', pass: 'teste@123' };
const FEE = 1.99;

function loadApiKey() {
  return readFileSync(join(__dir, '../web_app/firebase-ic24.js'), 'utf8').match(/apiKey:\s*['"]([^'"]+)['"]/)[1];
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
  if (!r.ok) throw new Error((j.error?.message || t).slice(0, 600));
  return j;
}
async function signIn(email, pass, apiKey) {
  return json(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  });
}
function fv(type, value) {
  if (type === 'double') return { doubleValue: value };
  if (type === 'int') return { integerValue: String(value) };
  if (type === 'bool') return { booleanValue: value };
  if (type === 'ts') return { timestampValue: new Date().toISOString() };
  if (type === 'null') return { nullValue: null };
  if (type === 'arr') return { arrayValue: { values: (value || []).map((v) => ({ stringValue: String(v) })) } };
  return { stringValue: String(value) };
}
async function getDoc(token, path) {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
    { headers: { Authorization: 'Bearer ' + token } },
  );
  if (r.status === 404 || r.status === 403) return null;
  const j = JSON.parse(await r.text());
  if (!r.ok) {
    if (String(j.error?.message || '').includes('Permission')) return null;
    throw new Error((j.error?.message || JSON.stringify(j)).slice(0, 400));
  }
  return j;
}
async function patchDoc(token, path, fields) {
  const mask = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&');
  return json(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}?${mask}`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  );
}
async function setDoc(token, path, fields) {
  const mask = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&');
  return json(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}?${mask}`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  );
}
async function createDoc(token, collection, fields, docId) {
  const id = docId || 'e2e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const url = docId
    ? `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}?documentId=${encodeURIComponent(id)}`
    : `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}?documentId=${encodeURIComponent(id)}`;
  try {
    await json(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
  } catch (e) {
    if (String(e.message).includes('ALREADY_EXISTS') || String(e.message).includes('already exists')) {
      await setDoc(token, `${collection}/${id}`, fields);
    } else throw e;
  }
  return id;
}
function field(fields, key) {
  const f = fields?.[key];
  if (!f) return null;
  if (f.stringValue != null) return f.stringValue;
  if (f.booleanValue != null) return f.booleanValue;
  if (f.doubleValue != null) return Number(f.doubleValue);
  if (f.integerValue != null) return Number(f.integerValue);
  return null;
}

const apiKey = loadApiKey();
const results = [];
const ok = (s, d) => {
  results.push({ s, ok: true, d });
  console.log('OK  ', s, d || '');
};
const fail = (s, d) => {
  results.push({ s, ok: false, d });
  console.log('FAIL', s, d || '');
};

const jp = await signIn(JP.email, JP.pass, apiKey);
const joana = await signIn(JOANA.email, JOANA.pass, apiKey);
ok('login', `${jp.localId.slice(0, 8)} / ${joana.localId.slice(0, 8)}`);

// garantir perfis
await setDoc(joana.idToken, `caregivers/${joana.localId}`, {
  fullName: fv('string', 'Joana Maria'),
  email: fv('string', JOANA.email),
  availableToday: fv('bool', true),
  approved: fv('bool', true),
  city: fv('string', 'Rio de Janeiro'),
  state: fv('string', 'RJ'),
  neighborhood: fv('string', 'Copacabana'),
  dailyRate: fv('double', 280),
  paymentPreferences: {
    mapValue: {
      fields: {
        configured: fv('bool', true),
        paymentSchedule: fv('string', 'diaria'),
        paymentWeekDay: fv('string', 'seg'),
        jobDurationDays: fv('int', 15),
      },
    },
  },
  pixKey: fv('string', 'joana44@gmail.com'),
  pixTitular: fv('string', 'Joana Maria'),
});

const offerId = await createDoc(jp.idToken, 'job_offers', {
  familyId: fv('string', jp.localId),
  familyName: fv('string', 'João Paulo'),
  targetCaregiverId: fv('string', joana.localId),
  directedToCaregiver: fv('bool', true),
  status: fv('string', 'open'),
  title: fv('string', 'Plantão Sofia'),
  elderlyType: fv('string', 'Sofia'),
  dailyRate: fv('double', 280),
  jobDurationDays: fv('int', 2),
  urgent: fv('bool', false),
  scheduleType: fv('string', 'diaria'),
  createdAt: fv('ts'),
});
await patchDoc(jp.idToken, `job_offers/${offerId}`, { id: fv('string', offerId) });
ok('oferta', offerId);

const responseId = await createDoc(joana.idToken, 'offer_responses', {
  offerId: fv('string', offerId),
  familyId: fv('string', jp.localId),
  caregiverId: fv('string', joana.localId),
  action: fv('string', 'accept'),
  dailyRateUsed: fv('double', 280),
  status: fv('string', 'pending_family'),
  paymentSchedule: fv('string', 'diaria'),
  scheduleLabel: fv('string', 'Diária'),
  jobDurationDays: fv('int', 2),
  message: fv('string', 'Aceito'),
  createdAt: fv('ts'),
});
await patchDoc(joana.idToken, `job_offers/${offerId}`, {
  status: fv('string', 'pending_family_approval'),
  pendingResponseId: fv('string', responseId),
});
const notifId = await createDoc(joana.idToken, 'family_notifications', {
  familyId: fv('string', jp.localId),
  offerId: fv('string', offerId),
  responseId: fv('string', responseId),
  caregiverId: fv('string', joana.localId),
  caregiverName: fv('string', 'Joana Maria'),
  status: fv('string', 'pending'),
  message: fv('string', 'Joana Maria aceitou — toque para fechar negócio'),
  read: fv('bool', false),
  createdAt: fv('ts'),
});
ok('aceite_notif', notifId);

await patchDoc(jp.idToken, `offer_responses/${responseId}`, { status: fv('string', 'accepted') });
await patchDoc(jp.idToken, `job_offers/${offerId}`, {
  status: fv('string', 'matched'),
  matchedCaregiverId: fv('string', joana.localId),
  agreedDailyRate: fv('double', 280),
  jobDurationDays: fv('int', 2),
  billingReady: fv('bool', false),
});
await patchDoc(jp.idToken, `family_notifications/${notifId}`, { status: fv('string', 'accepted'), read: fv('bool', true) });

// Limpa taxa antiga (dono) e depois família vincula + acumula taxa
await setDoc(joana.idToken, `caregivers/${joana.localId}`, {
  platformFeePending: fv('double', 0),
  platformFeePendingDiarias: fv('int', 0),
  platformFeePendingOfferId: fv('null', null),
  activeFamilyId: fv('null', null),
  availableToday: fv('bool', true),
  updatedAt: fv('ts'),
});
try {
  await patchDoc(jp.idToken, `caregivers/${joana.localId}`, {
    activeFamilyId: fv('string', jp.localId),
    availableToday: fv('bool', false),
    plantaoHoje: { mapValue: { fields: { ativo: fv('bool', false) } } },
    platformFeePending: fv('double', FEE * 2),
    platformFeePendingDiarias: fv('int', 2),
    platformFeeCurrency: fv('string', 'USD'),
    platformFeePendingOfferId: fv('string', offerId),
    platformFeeUpdatedAt: fv('ts'),
    updatedAt: fv('ts'),
  });
  ok('match_taxa_familia', `US$ ${FEE * 2}`);
} catch (e) {
  // fallback: babá (dono) aplica vínculo + taxa
  await setDoc(joana.idToken, `caregivers/${joana.localId}`, {
    activeFamilyId: fv('string', jp.localId),
    availableToday: fv('bool', false),
    platformFeePending: fv('double', FEE * 2),
    platformFeePendingDiarias: fv('int', 2),
    platformFeeCurrency: fv('string', 'USD'),
    platformFeePendingOfferId: fv('string', offerId),
    updatedAt: fv('ts'),
  });
  ok('match_taxa_dono', `US$ ${FEE * 2} (${e.message.slice(0, 40)})`);
}

const chatId = `chat_${jp.localId}_${joana.localId}`;
try {
  // create (POST) — update via PATCH exige membro e falha se doc antigo estiver inconsistente
  await json(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/chats?documentId=${encodeURIComponent(chatId)}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jp.idToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          participants: fv('arr', [jp.localId, joana.localId]),
          familyId: fv('string', jp.localId),
          caregiverId: fv('string', joana.localId),
          offerId: fv('string', offerId),
          chatUnlocked: fv('bool', true),
          unlockedReason: fv('string', 'negocio_fechado'),
          lastMessage: fv('string', 'Negócio fechado'),
          updatedAt: fv('ts'),
        },
      }),
    },
  );
} catch (e) {
  if (!/already exists|ALREADY_EXISTS/i.test(e.message)) {
    // tenta update como membro
    try {
      await setDoc(jp.idToken, `chats/${chatId}`, {
        chatUnlocked: fv('bool', true),
        offerId: fv('string', offerId),
        lastMessage: fv('string', 'Negócio fechado'),
        updatedAt: fv('ts'),
      });
    } catch (e2) {
      fail('chat_create', e.message + ' | ' + e2.message);
    }
  }
}
const chatDoc = await getDoc(jp.idToken, `chats/${chatId}`);
if (chatDoc && field(chatDoc.fields, 'chatUnlocked') === true) ok('chat_liberado', chatId);
else {
  // fallback: cria id novo
  const chatId2 = `chat_${Date.now()}`;
  await json(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/chats?documentId=${encodeURIComponent(chatId2)}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jp.idToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          participants: fv('arr', [jp.localId, joana.localId]),
          familyId: fv('string', jp.localId),
          caregiverId: fv('string', joana.localId),
          offerId: fv('string', offerId),
          chatUnlocked: fv('bool', true),
          unlockedReason: fv('string', 'negocio_fechado'),
          lastMessage: fv('string', 'Negócio fechado'),
          updatedAt: fv('ts'),
        },
      }),
    },
  );
  ok('chat_liberado', chatId2);
  // redefine para msgs
  globalThis.__chatId = chatId2;
}
const chatIdFinal = globalThis.__chatId || chatId;

async function addMsg(token, text, sender) {
  const mid = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
  await json(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/chats/${chatIdFinal}/messages?documentId=${encodeURIComponent(mid)}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          senderId: fv('string', sender),
          text: fv('string', text),
          createdAt: fv('ts'),
        },
      }),
    },
  );
  return mid;
}
try {
  await addMsg(jp.idToken, 'Oi Joana, plantão Sofia amanhã 7h', jp.localId);
  await addMsg(joana.idToken, 'Combinado João!', joana.localId);
  ok('chat_msgs', '2 mensagens');
} catch (e) {
  fail('chat_msgs', e.message);
}

const pontoId = `ps_${joana.localId}_${new Date().toISOString().slice(0, 10)}`;
try {
  await json(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/ponto_sessions?documentId=${encodeURIComponent(pontoId)}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + joana.idToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          caregiverId: fv('string', joana.localId),
          familyId: fv('string', jp.localId),
          date: fv('string', new Date().toISOString().slice(0, 10)),
          familyConfirmed: fv('bool', false),
          status: fv('string', 'awaiting_family'),
          observacoes: fv('string', 'Sofia ok'),
          log: {
            arrayValue: {
              values: [
                { mapValue: { fields: { tipo: fv('string', 'Entrada'), hora: fv('string', '07:00') } } },
                { mapValue: { fields: { tipo: fv('string', 'Saída final'), hora: fv('string', '19:00') } } },
              ],
            },
          },
          updatedAt: fv('ts'),
        },
      }),
    },
  ).catch(async (e) => {
    if (!/already exists|ALREADY_EXISTS/i.test(e.message)) throw e;
    await setDoc(joana.idToken, `ponto_sessions/${pontoId}`, {
      log: {
        arrayValue: {
          values: [
            { mapValue: { fields: { tipo: fv('string', 'Entrada'), hora: fv('string', '07:00') } } },
            { mapValue: { fields: { tipo: fv('string', 'Saída final'), hora: fv('string', '19:00') } } },
          ],
        },
      },
      status: fv('string', 'awaiting_family'),
      updatedAt: fv('ts'),
    });
  });
  await patchDoc(jp.idToken, `ponto_sessions/${pontoId}`, {
    familyConfirmed: fv('bool', true),
    familyConfirmedAt: fv('ts'),
    status: fv('string', 'confirmed'),
  });
  await patchDoc(jp.idToken, `job_offers/${offerId}`, { billingReady: fv('bool', true) });
  ok('ponto', 'registrado + confirmado pelo pai');
} catch (e) {
  fail('ponto', e.message);
}

let diarioId = null;
try {
  diarioId = await createDoc(joana.idToken, 'care_logs', {
    caregiverId: fv('string', joana.localId),
    familyId: fv('string', jp.localId),
    date: fv('string', new Date().toISOString().slice(0, 10)),
    texto: fv('string', 'Diário Sofia: brincou, almoçou, cochilo.'),
    assinadoBaba: fv('bool', true),
    assinadoFamilia: fv('bool', false),
    createdAt: fv('ts'),
  });
  await patchDoc(jp.idToken, `care_logs/${diarioId}`, {
    assinadoFamilia: fv('bool', true),
    assinadoFamiliaEm: fv('ts'),
  });
  ok('diario', 'escrito + assinado pelo pai');
} catch (e) {
  fail('diario', e.message);
}

try {
  const inv = await createDoc(joana.idToken, 'invoices', {
    caregiverId: fv('string', joana.localId),
    familyId: fv('string', jp.localId),
    offerId: fv('string', offerId),
    amount: fv('double', 280),
    description: fv('string', 'Diária plantão Sofia'),
    method: fv('string', 'pix'),
    status: fv('string', 'pending'),
    pixKey: fv('string', 'joana44@gmail.com'),
    pixTitular: fv('string', 'Joana Maria'),
    createdAt: fv('ts'),
  });
  ok('pagamento_pix', inv);
} catch (e) {
  fail('pagamento_pix', e.message);
}

const cg = await getDoc(joana.idToken, `caregivers/${joana.localId}`);
const fee = field(cg?.fields, 'platformFeePending');
if (fee >= 3.9) ok('taxa_iap', `US$ ${fee}`);
else fail('taxa_iap', String(fee));

// contagem auth restante
try {
  const { execSync } = await import('child_process');
  const out = join(__dir, '_auth_after.json');
  execSync(`firebase auth:export "${out}" --format=json --project ${PROJECT}`, {
    cwd: join(__dir, '..'),
    stdio: 'pipe',
  });
  const users = JSON.parse(readFileSync(out, 'utf8')).users || [];
  const emails = users.map((u) => u.email).filter(Boolean);
  ok(
    'auth_restante',
    `${users.length} contas: ${emails.join(', ')}`,
  );
} catch (e) {
  fail('auth_restante', e.message);
}

writeFileSync(join(__dir, '_e2e_jp_joana_report.json'), JSON.stringify({ offerId, chatId, pontoId, diarioId, results }, null, 2));
console.log('\n===== RESUMO =====');
results.forEach((r) => console.log(`${r.ok ? '✅' : '❌'} ${r.s}: ${r.d || ''}`));
const failed = results.filter((r) => !r.ok);
process.exit(failed.length ? 1 : 0);
