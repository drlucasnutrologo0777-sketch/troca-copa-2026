/**
 * Stress E2E JP ↔ Joana:
 *  A) 7 diárias ALTERNADAS SEPARADAS (7 ofertas de 1 dia)
 *  B) 7 diárias AGRUPADAS (1 oferta × 7 dias)
 *  C) 7 diárias JUNTAS semanal (1 oferta × 7, pagamento semanal)
 *  D) 10 diárias SEGUIDAS (1 oferta × 10)
 * Em cada match: proposta, aceite, notif, chat, ponto, diário, PIX, taxa IAP.
 *
 * node scripts/e2e_stress_diarias.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT = 'baba-on-3634a';
const JP = { email: 'jp44@gmail.com', pass: 'teste@123' };
const JOANA = { email: 'joana44@gmail.com', pass: 'teste@123' };
const FEE = 1.99;
const DAILY = 280;

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
  if (!r.ok) throw new Error((j.error?.message || t).slice(0, 500));
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
function field(fields, key) {
  const f = fields?.[key];
  if (!f) return null;
  if (f.stringValue != null) return f.stringValue;
  if (f.booleanValue != null) return f.booleanValue;
  if (f.doubleValue != null) return Number(f.doubleValue);
  if (f.integerValue != null) return Number(f.integerValue);
  return null;
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
    throw new Error((j.error?.message || JSON.stringify(j)).slice(0, 300));
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
  return patchDoc(token, path, fields);
}
async function postDoc(token, collection, fields, docId) {
  const id = docId || `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await json(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}?documentId=${encodeURIComponent(id)}`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      },
    );
  } catch (e) {
    if (!/already exists|ALREADY_EXISTS/i.test(e.message)) throw e;
    await setDoc(token, `${collection}/${id}`, fields);
  }
  return id;
}
function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function feeUsd(diarias) {
  return Math.round(diarias * FEE * 100) / 100;
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
ok('login', `JP=${jp.localId.slice(0, 8)} Joana=${joana.localId.slice(0, 8)}`);

await setDoc(joana.idToken, `caregivers/${joana.localId}`, {
  fullName: fv('string', 'Joana Maria'),
  email: fv('string', JOANA.email),
  approved: fv('bool', true),
  availableToday: fv('bool', true),
  city: fv('string', 'Rio de Janeiro'),
  state: fv('string', 'RJ'),
  neighborhood: fv('string', 'Copacabana'),
  dailyRate: fv('double', DAILY),
  pixKey: fv('string', JOANA.email),
  pixTitular: fv('string', 'Joana Maria'),
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
  platformFeePending: fv('double', 0),
  platformFeePendingDiarias: fv('int', 0),
  activeFamilyId: fv('null', null),
  updatedAt: fv('ts'),
});

async function clearFee() {
  await setDoc(joana.idToken, `caregivers/${joana.localId}`, {
    platformFeePending: fv('double', 0),
    platformFeePendingDiarias: fv('int', 0),
    platformFeePendingOfferId: fv('null', null),
    activeFamilyId: fv('null', null),
    availableToday: fv('bool', true),
    updatedAt: fv('ts'),
  });
}

async function runPlantao({
  tag,
  diarias,
  scheduleType,
  paymentSchedule,
  scheduleLabel,
  dates, // array YYYY-MM-DD for ponto/diario
  title,
}) {
  const prefix = tag;
  try {
    await clearFee();

    const offerId = await postDoc(jp.idToken, 'job_offers', {
      familyId: fv('string', jp.localId),
      familyName: fv('string', 'João Paulo'),
      targetCaregiverId: fv('string', joana.localId),
      directedToCaregiver: fv('bool', true),
      status: fv('string', 'open'),
      title: fv('string', title),
      elderlyType: fv('string', 'Sofia'),
      dailyRate: fv('double', DAILY),
      jobDurationDays: fv('int', diarias),
      urgent: fv('bool', false),
      scheduleType: fv('string', scheduleType),
      message: fv('string', `${tag} — ${diarias} diária(s)`),
      createdAt: fv('ts'),
    });
    await patchDoc(jp.idToken, `job_offers/${offerId}`, { id: fv('string', offerId) });

    await postDoc(jp.idToken, 'caregiver_notifications', {
      caregiverId: fv('string', joana.localId),
      familyId: fv('string', jp.localId),
      offerId: fv('string', offerId),
      message: fv('string', `João Paulo: proposta ${title}`),
      read: fv('bool', false),
      createdAt: fv('ts'),
    });

    const responseId = await postDoc(joana.idToken, 'offer_responses', {
      offerId: fv('string', offerId),
      familyId: fv('string', jp.localId),
      caregiverId: fv('string', joana.localId),
      action: fv('string', 'accept'),
      dailyRateUsed: fv('double', DAILY),
      status: fv('string', 'pending_family'),
      paymentSchedule: fv('string', paymentSchedule),
      scheduleLabel: fv('string', scheduleLabel),
      jobDurationDays: fv('int', diarias),
      diariasCount: fv('int', diarias),
      perCycleAmount: fv('double', paymentSchedule === 'semanal' ? DAILY * 7 : DAILY),
      paymentCyclesTotal: fv('int', paymentSchedule === 'semanal' ? Math.ceil(diarias / 7) : diarias),
      totalContractAmount: fv('double', DAILY * diarias),
      message: fv('string', `Aceito ${tag}`),
      createdAt: fv('ts'),
    });
    await patchDoc(joana.idToken, `job_offers/${offerId}`, {
      status: fv('string', 'pending_family_approval'),
      pendingResponseId: fv('string', responseId),
    });
    const notifId = await postDoc(joana.idToken, 'family_notifications', {
      familyId: fv('string', jp.localId),
      offerId: fv('string', offerId),
      responseId: fv('string', responseId),
      caregiverId: fv('string', joana.localId),
      caregiverName: fv('string', 'Joana Maria'),
      status: fv('string', 'pending'),
      message: fv('string', `Joana aceitou: ${title} (${diarias} diárias)`),
      read: fv('bool', false),
      createdAt: fv('ts'),
    });

    await patchDoc(jp.idToken, `offer_responses/${responseId}`, { status: fv('string', 'accepted') });
    await patchDoc(jp.idToken, `job_offers/${offerId}`, {
      status: fv('string', 'matched'),
      matchedCaregiverId: fv('string', joana.localId),
      agreedDailyRate: fv('double', DAILY),
      jobDurationDays: fv('int', diarias),
      scheduleLabel: fv('string', scheduleLabel),
      billingReady: fv('bool', false),
    });
    await patchDoc(jp.idToken, `family_notifications/${notifId}`, {
      status: fv('string', 'accepted'),
      read: fv('bool', true),
    });

    const expectedFee = feeUsd(diarias);
    try {
      await patchDoc(jp.idToken, `caregivers/${joana.localId}`, {
        activeFamilyId: fv('string', jp.localId),
        availableToday: fv('bool', false),
        plantaoHoje: { mapValue: { fields: { ativo: fv('bool', false) } } },
        platformFeePending: fv('double', expectedFee),
        platformFeePendingDiarias: fv('int', diarias),
        platformFeeCurrency: fv('string', 'USD'),
        platformFeePendingOfferId: fv('string', offerId),
        platformFeeUpdatedAt: fv('ts'),
        updatedAt: fv('ts'),
      });
    } catch {
      await setDoc(joana.idToken, `caregivers/${joana.localId}`, {
        activeFamilyId: fv('string', jp.localId),
        availableToday: fv('bool', false),
        platformFeePending: fv('double', expectedFee),
        platformFeePendingDiarias: fv('int', diarias),
        platformFeeCurrency: fv('string', 'USD'),
        platformFeePendingOfferId: fv('string', offerId),
        updatedAt: fv('ts'),
      });
    }

    const chatId = `chat_${tag}_${Date.now()}`;
    await postDoc(
      jp.idToken,
      'chats',
      {
        participants: fv('arr', [jp.localId, joana.localId]),
        familyId: fv('string', jp.localId),
        caregiverId: fv('string', joana.localId),
        offerId: fv('string', offerId),
        chatUnlocked: fv('bool', true),
        unlockedReason: fv('string', 'negocio_fechado'),
        lastMessage: fv('string', `Chat ${tag}`),
        updatedAt: fv('ts'),
      },
      chatId,
    );
    await postDoc(jp.idToken, `chats/${chatId}/messages`, {
      senderId: fv('string', jp.localId),
      text: fv('string', `Pai: combinado ${title}`),
      createdAt: fv('ts'),
    });
    await postDoc(joana.idToken, `chats/${chatId}/messages`, {
      senderId: fv('string', joana.localId),
      text: fv('string', `Babá: ok ${diarias} diária(s)`),
      createdAt: fv('ts'),
    });

    let pontoOk = 0;
    let diarioOk = 0;
    const runStamp = Date.now();
    for (const date of dates) {
      // ID único por execução — reusar doc faz PATCH completo e rules só permitem log/status
      const pontoId = `ps_${joana.localId.slice(0, 8)}_${date}_${tag}_${runStamp}`.replace(
        /[^a-zA-Z0-9_]/g,
        '_',
      );
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
                offerId: fv('string', offerId),
                date: fv('string', date),
                familyConfirmed: fv('bool', false),
                status: fv('string', 'awaiting_family'),
                observacoes: fv('string', `Ponto ${date} — Sofia`),
                log: {
                  arrayValue: {
                    values: [
                      {
                        mapValue: {
                          fields: { tipo: fv('string', 'Entrada'), hora: fv('string', '07:00') },
                        },
                      },
                      {
                        mapValue: {
                          fields: { tipo: fv('string', 'Saída final'), hora: fv('string', '19:00') },
                        },
                      },
                    ],
                  },
                },
                updatedAt: fv('ts'),
              },
            }),
          },
        );
        await patchDoc(jp.idToken, `ponto_sessions/${pontoId}`, {
          familyConfirmed: fv('bool', true),
          familyConfirmedAt: fv('ts'),
          status: fv('string', 'confirmed'),
        });
        pontoOk++;
      } catch (e) {
        fail(`${prefix}_ponto_${date}`, e.message);
      }

      try {
        const diarioId = await postDoc(joana.idToken, 'care_logs', {
          caregiverId: fv('string', joana.localId),
          familyId: fv('string', jp.localId),
          offerId: fv('string', offerId),
          date: fv('string', date),
          texto: fv('string', `Diário Sofia ${date}: alimentação, sono, brincadeiras.`),
          assinadoBaba: fv('bool', true),
          assinadoFamilia: fv('bool', false),
          createdAt: fv('ts'),
        });
        await patchDoc(jp.idToken, `care_logs/${diarioId}`, {
          assinadoFamilia: fv('bool', true),
          assinadoFamiliaEm: fv('ts'),
        });
        diarioOk++;
      } catch (e) {
        fail(`${prefix}_diario_${date}`, e.message);
      }
    }

    await patchDoc(jp.idToken, `job_offers/${offerId}`, { billingReady: fv('bool', true) });

    const cycles = paymentSchedule === 'semanal' ? Math.ceil(diarias / 7) : diarias;
    const amountPerInvoice = paymentSchedule === 'semanal' ? DAILY * Math.min(7, diarias) : DAILY;
    let faturas = 0;
    for (let c = 0; c < cycles; c++) {
      try {
        await postDoc(joana.idToken, 'invoices', {
          caregiverId: fv('string', joana.localId),
          familyId: fv('string', jp.localId),
          offerId: fv('string', offerId),
          paymentCycle: fv('int', c + 1),
          amount: fv('double', amountPerInvoice),
          description: fv('string', `${title} — ciclo ${c + 1}/${cycles}`),
          method: fv('string', 'pix'),
          status: fv('string', 'pending'),
          pixKey: fv('string', JOANA.email),
          pixTitular: fv('string', 'Joana Maria'),
          createdAt: fv('ts'),
        });
        faturas++;
      } catch (e) {
        fail(`${prefix}_pix_${c + 1}`, e.message);
      }
    }

    const cg = await getDoc(joana.idToken, `caregivers/${joana.localId}`);
    const fee = field(cg?.fields, 'platformFeePending');
    const feeD = field(cg?.fields, 'platformFeePendingDiarias');
    const chat = await getDoc(jp.idToken, `chats/${chatId}`);
    const chatJoana = await getDoc(joana.idToken, `chats/${chatId}`);

    const checks = [];
    const chatOk =
      field(chat?.fields, 'chatUnlocked') === true &&
      field(chatJoana?.fields, 'chatUnlocked') === true;
    if (chatOk) checks.push('chat');
    else {
      fail(
        `${prefix}_chat`,
        `nao liberado jp=${!!chat} joana=${!!chatJoana} unlock=${field(chat?.fields, 'chatUnlocked')}`,
      );
    }
    if (pontoOk === dates.length) checks.push(`ponto ${pontoOk}/${dates.length}`);
    else fail(`${prefix}_ponto_count`, `${pontoOk}/${dates.length}`);
    if (diarioOk === dates.length) checks.push(`diario ${diarioOk}/${dates.length}`);
    else fail(`${prefix}_diario_count`, `${diarioOk}/${dates.length}`);
    if (faturas === cycles) checks.push(`pix ${faturas}`);
    else fail(`${prefix}_pix_count`, `${faturas}/${cycles}`);
    if (Math.abs((fee || 0) - expectedFee) < 0.02 && feeD === diarias) {
      checks.push(`taxa US$${fee}`);
    } else {
      fail(`${prefix}_taxa`, `pend=${fee} diarias=${feeD} esperado=${expectedFee}/${diarias}`);
    }

    if (checks.length >= 5) ok(prefix, checks.join(' · '));
    return { offerId, chatId, diarias, fee: expectedFee };
  } catch (e) {
    fail(prefix, e.message);
    return null;
  }
}

const today = new Date().toISOString().slice(0, 10);
// 7 dias alternados: +0,+2,+4,+6,+8,+10,+12
const alt7 = [0, 2, 4, 6, 8, 10, 12].map((n) => addDays(today, n));
// 10 dias seguidos
const seq10 = Array.from({ length: 10 }, (_, i) => addDays(today, i));
// 7 dias seguidos (agrupadas/juntas)
const seq7 = Array.from({ length: 7 }, (_, i) => addDays(today, i));

console.log('\n=== A) 7 DIÁRIAS ALTERNADAS SEPARADAS ===');
for (let i = 0; i < alt7.length; i++) {
  const date = alt7[i];
  await runPlantao({
    tag: `A_sep_${i + 1}`,
    diarias: 1,
    scheduleType: 'diaria',
    paymentSchedule: 'diaria',
    scheduleLabel: 'Diária',
    dates: [date],
    title: `Plantão Sofia alternado ${i + 1}/7 (${date})`,
  });
}

console.log('\n=== B) 7 DIÁRIAS AGRUPADAS (1 oferta × 7 dias seguidos) ===');
await runPlantao({
  tag: 'B_agrup7',
  diarias: 7,
  scheduleType: 'diaria',
  paymentSchedule: 'diaria',
  scheduleLabel: 'Diária × 7',
  dates: seq7,
  title: 'Plantão Sofia 7 diárias agrupadas',
});

console.log('\n=== C) 7 DIÁRIAS JUNTAS SEMANAL ===');
await runPlantao({
  tag: 'C_junta_sem',
  diarias: 7,
  scheduleType: 'semanal',
  paymentSchedule: 'semanal',
  scheduleLabel: 'Semanal (7 dias)',
  dates: seq7,
  title: 'Plantão Sofia 7 diárias juntas (semanal)',
});

console.log('\n=== D) 10 DIÁRIAS SEGUIDAS ===');
await runPlantao({
  tag: 'D_seq10',
  diarias: 10,
  scheduleType: 'diaria',
  paymentSchedule: 'diaria',
  scheduleLabel: 'Diária × 10',
  dates: seq10,
  title: 'Plantão Sofia 10 diárias seguidas',
});

const report = {
  at: new Date().toISOString(),
  results,
  summary: {
    ok: results.filter((r) => r.ok).length,
    fail: results.filter((r) => !r.ok).length,
  },
};
writeFileSync(join(__dir, '_e2e_stress_diarias_report.json'), JSON.stringify(report, null, 2));

console.log('\n===== RESUMO STRESS =====');
results.forEach((r) => console.log(`${r.ok ? '✅' : '❌'} ${r.s}: ${r.d || ''}`));
const failed = results.filter((r) => !r.ok);
console.log(`\nTotal: ${results.length} | OK ${report.summary.ok} | FAIL ${report.summary.fail}`);
if (failed.length) {
  console.log('Falhas:', failed.map((f) => f.s).join(', '));
  process.exit(1);
}
console.log('\nTUDO OK: 7 sep + 7 agrupadas + 7 semanal + 10 seguidas');
