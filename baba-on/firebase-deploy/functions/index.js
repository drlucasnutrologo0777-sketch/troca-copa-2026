const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();
const ADMIN_BCC = 'drlucasnutrologo0777@gmail.com';

function formatTimeline(snap) {
  if (!snap) return 'Sem oferta vinculada.';
  return [
    `Oferta: ${snap.offerId || '—'}`,
    `Status: ${snap.status || '—'}`,
    `Diária: R$ ${snap.dailyRate != null ? Number(snap.dailyRate).toFixed(2) : '—'}`,
    `Dias: ${snap.jobDurationDays ?? '—'}`,
    `Taxa plataforma: ${snap.platformFeeStatus || 'fluxo IAP após fechamento'}`,
  ].join('\n');
}

function buildBody(event, parties) {
  const header =
    event.type === 'suspeita_circunvencao_chat'
      ? 'Alerta de compliance — possível combinação fora do app'
      : 'Confirmação — negócio fechado no aplicativo';
  let body =
    `Olá,\n\nRegistro automático Babá ON (compliance).\n\n${header}\n\n` +
    `Família: ${parties.familyName || '—'}\nBabá: ${parties.caregiverName || '—'}\n\n` +
    `--- Dados no Firebase ---\n${formatTimeline(event.offerSnapshot)}\n`;
  if (event.signals && event.signals.length) {
    body += `\nIndícios: ${event.signals.join('; ')}.\n`;
  }
  if (event.messageExcerpt) {
    body += `\nTrecho chat: "${String(event.messageExcerpt).slice(0, 200)}"\n`;
  }
  body +=
    '\nPlantões fora do app não usam verificação documental, ponto, diário nem taxa IAP. ' +
    'Para inibir fraudes, mantenha proposta → aceite → fechar negócio no app.\n\n' +
    `ID registro: ${event.id}\n— Babá ON`;
  return body;
}

async function resolveParties(familyId, caregiverId) {
  const out = { familyName: 'Família', caregiverName: 'Babá' };
  if (familyId) {
    const u = await db.collection('users').doc(familyId).get();
    if (u.exists) {
      out.familyName = u.data().fullName || out.familyName;
      out.familyEmail = u.data().email;
    }
  }
  if (caregiverId) {
    const u = await db.collection('users').doc(caregiverId).get();
    if (u.exists) {
      out.caregiverName = u.data().fullName || out.caregiverName;
      out.caregiverEmail = u.data().email;
    }
  }
  return out;
}

async function sendComplianceEmails(eventId, event) {
  const parties = await resolveParties(event.familyId, event.caregiverId);
  const recipients = (event.notifyEmails || [])
    .filter(Boolean)
    .map((e) => String(e).trim().toLowerCase());
  if (!recipients.length && parties.familyEmail) recipients.push(parties.familyEmail);
  if (parties.caregiverEmail && !recipients.includes(parties.caregiverEmail)) {
    recipients.push(parties.caregiverEmail);
  }
  const unique = [...new Set(recipients)];
  if (!unique.length) {
    await db.collection('compliance_events').doc(eventId).update({
      status: 'no_email',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  const subject =
    event.emailSubject || 'Babá ON — registro de transação na plataforma';
  const text = buildBody(Object.assign({ id: eventId }, event), parties);

  const cfg = functions.config().smtp || {};
  let sentVia = 'mail_queue';

  if (cfg.host && cfg.user && cfg.pass) {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: Number(cfg.port || 587),
      secure: cfg.secure === 'true',
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await transporter.sendMail({
      from: cfg.from || 'Babá ON <noreply@baba-on.app>',
      to: unique.join(','),
      bcc: ADMIN_BCC,
      subject,
      text,
    });
    sentVia = 'smtp';
  } else {
    await db.collection('mail').add({
      to: unique,
      message: { subject, text },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'compliance_events',
      eventId,
    });
  }

  await db.collection('compliance_events').doc(eventId).update({
    status: 'emailed',
    sentVia,
    emailedTo: unique,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

exports.boOnComplianceEvent = functions
  .region('southamerica-east1')
  .firestore.document('compliance_events/{eventId}')
  .onCreate(async (snap) => {
    const event = snap.data();
    if (event.status && event.status !== 'pending_email') return null;
    try {
      await sendComplianceEmails(snap.id, event);
    } catch (e) {
      await snap.ref.update({
        status: 'error',
        error: String(e.message || e).slice(0, 500),
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return null;
  });

exports.deleteMyAccount = functions
  .region('southamerica-east1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    const uid = context.auth.uid;
    const batch = db.batch();
    batch.delete(db.collection('users').doc(uid));
    batch.delete(db.collection('caregivers').doc(uid));
    batch.delete(db.collection('clients').doc(uid));
    await batch.commit();
    await admin.auth().deleteUser(uid);
    return { ok: true, uid };
  });

exports.boProcessComplianceEvent = functions
  .region('southamerica-east1')
  .https.onCall(async (data) => {
    const eventId = data && data.eventId;
    if (!eventId) throw new functions.https.HttpsError('invalid-argument', 'eventId');
    const snap = await db.collection('compliance_events').doc(eventId).get();
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'event');
    await sendComplianceEmails(eventId, snap.data());
    return { ok: true };
  });
