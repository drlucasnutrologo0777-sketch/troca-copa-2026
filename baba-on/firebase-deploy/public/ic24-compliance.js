/**
 * Babá ON — compliance / anti-circunvenção (deterrence por transparência).
 * Não bloqueia chat nem fechamento; registra e dispara e-mail via Cloud Function.
 */
const IC24_CIRCUMVENT_PATTERNS = [
  { re: /\b(whatsapp|wpp|zap|telegram)\b/i, w: 3, label: 'menção a app de mensagem externo' },
  { re: /\b(fora do app|fora do aplicativo|sem (o )?app|sem taxa|nao paga taxa|não paga taxa)\b/i, w: 4, label: 'sugestão de fechar fora da plataforma' },
  { re: /\b(pix|chave pix|cpf.*pix|pagamento direto|transferencia direta|transferência direta)\b/i, w: 2, label: 'pagamento direto' },
  { re: /\b(combinamos|fecha direto|fechar direto|pr[óo]ximo plant[aã]o direto)\b/i, w: 4, label: 'combinar plantão fora do fluxo' },
  { re: /(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}[-.\s]?\d{4}/, w: 2, label: 'possível telefone' },
  { re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, w: 1, label: 'e-mail no chat' },
];

const IC24_COMPLIANCE_SCORE_ALERT = 3;
const IC24_COMPLIANCE_ADMIN_BCC = 'drlucasnutrologo0777@gmail.com';

function ic24ComplianceScoreText(text) {
  const t = String(text || '');
  const hits = [];
  let score = 0;
  for (const p of IC24_CIRCUMVENT_PATTERNS) {
    if (p.re.test(t)) {
      score += p.w;
      hits.push(p.label);
    }
  }
  return { score, hits, alert: score >= IC24_COMPLIANCE_SCORE_ALERT };
}

async function ic24ComplianceResolveEmails(familyId, caregiverId) {
  ic24InitFirebase();
  const out = { familyEmail: null, caregiverEmail: null, familyName: '', caregiverName: '' };
  if (familyId) {
    const u = await ic24Db.collection('users').doc(familyId).get();
    const c = await ic24Db.collection('clients').doc(familyId).get();
    out.familyEmail = (u.data()?.email || c.data()?.email || '').trim().toLowerCase() || null;
    out.familyName = u.data()?.fullName || c.data()?.fullName || 'Família';
  }
  if (caregiverId) {
    const u = await ic24Db.collection('users').doc(caregiverId).get();
    const cg = await ic24Db.collection('caregivers').doc(caregiverId).get();
    out.caregiverEmail = (u.data()?.email || cg.data()?.email || '').trim().toLowerCase() || null;
    out.caregiverName = u.data()?.fullName || cg.data()?.fullName || 'Babá';
  }
  return out;
}

async function ic24ComplianceOfferSnapshot(offerId) {
  if (!offerId) return null;
  ic24InitFirebase();
  const snap = await ic24Db.collection('job_offers').doc(offerId).get();
  if (!snap.exists) return null;
  const o = snap.data();
  return {
    offerId,
    status: o.status,
    title: o.title,
    dailyRate: o.agreedDailyRate ?? o.dailyRate,
    jobDurationDays: o.jobDurationDays,
    matchedAt: o.matchedAt,
    matchedCaregiverId: o.matchedCaregiverId,
    familyId: o.familyId,
    platformFeeStatus: o.platformFeeStatus,
  };
}

function ic24ComplianceFormatTimeline(snap) {
  if (!snap) return 'Nenhuma oferta vinculada no registro do app.';
  const lines = [
    'Oferta ID: ' + snap.offerId,
    'Status no app: ' + (snap.status || '—'),
    'Título: ' + (snap.title || '—'),
    'Diária registrada: R$ ' + (snap.dailyRate != null ? Number(snap.dailyRate).toFixed(2) : '—'),
    'Duração (dias): ' + (snap.jobDurationDays ?? '—'),
    'Taxa plataforma (IAP): ' + (snap.platformFeeStatus || 'conforme fluxo após fechamento'),
  ];
  if (snap.matchedAt) lines.push('Negócio fechado no app em: ' + String(snap.matchedAt));
  return lines.join('\n');
}

async function ic24ComplianceCreateEvent(payload) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) return null;
  const ref = ic24Db.collection('compliance_events').doc();
  const doc = Object.assign(
    {
      id: ref.id,
      createdBy: uid,
      status: 'pending_email',
      appVersionNote: 'build17',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    payload,
  );
  await ref.set(doc);
  try {
    const fn = ic24InitFunctions();
    await fn.httpsCallable('boProcessComplianceEvent')({ eventId: ref.id });
  } catch (_) {
    /* Function ainda não deployada — evento fica na fila Firestore */
  }
  return ref.id;
}

/** Após mensagem no chat — suspeita de combinar fora do app. */
async function ic24ComplianceScanChatMessage(chatId, text) {
  const { score, hits, alert } = ic24ComplianceScoreText(text);
  if (!alert) return;
  ic24InitFirebase();
  const chatSnap = await ic24Db.collection('chats').doc(chatId).get();
  if (!chatSnap.exists) return;
  const chat = chatSnap.data();
  const offerSnap = await ic24ComplianceOfferSnapshot(chat.offerId);
  const emails = await ic24ComplianceResolveEmails(chat.familyId, chat.caregiverId);
  const excerpt = String(text).trim().slice(0, 280);
  await ic24ComplianceCreateEvent({
    type: 'suspeita_circunvencao_chat',
    severity: score >= 5 ? 'alta' : 'media',
    score,
    signals: hits,
    chatId,
    offerId: chat.offerId || null,
    familyId: chat.familyId,
    caregiverId: chat.caregiverId,
    messageExcerpt: excerpt,
    offerSnapshot: offerSnap,
    notifyEmails: [emails.familyEmail, emails.caregiverEmail, IC24_COMPLIANCE_ADMIN_BCC].filter(Boolean),
    emailSubject: 'Babá ON — registro de transação e uso da plataforma',
  });
}

/** Negócio fechado corretamente no app — e-mail descritivo (baseline anti-fraude). */
async function ic24ComplianceNegocioFechadoNoApp(familyId, caregiverId, offerId) {
  const offerSnap = await ic24ComplianceOfferSnapshot(offerId);
  const emails = await ic24ComplianceResolveEmails(familyId, caregiverId);
  await ic24ComplianceCreateEvent({
    type: 'negocio_fechado_oficial',
    severity: 'info',
    score: 0,
    signals: [],
    offerId,
    familyId,
    caregiverId,
    offerSnapshot: offerSnap,
    notifyEmails: [emails.familyEmail, emails.caregiverEmail, IC24_COMPLIANCE_ADMIN_BCC].filter(Boolean),
    emailSubject: 'Babá ON — confirmação do negócio fechado no aplicativo',
  });
}

function ic24ComplianceEmailBody(event, parties) {
  const tipo =
    event.type === 'suspeita_circunvencao_chat'
      ? 'Alerta de compliance (possível combinação fora do app)'
      : 'Confirmação de negócio fechado pela plataforma';
  const timeline = ic24ComplianceFormatTimeline(event.offerSnapshot);
  const signals =
    event.signals && event.signals.length
      ? '\nIndícios automáticos: ' + event.signals.join('; ') + '.'
      : '';
  const excerpt = event.messageExcerpt
    ? '\nTrecho analisado (chat): "' + event.messageExcerpt.replace(/"/g, "'") + '"'
    : '';
  return (
    'Olá,\n\n' +
    'Este é um registro automático do Babá ON (compliance / prevenção a fraudes).\n\n' +
    'Tipo: ' +
    tipo +
    '\n' +
    'Família: ' +
    (parties.familyName || '—') +
    '\n' +
    'Babá: ' +
    (parties.caregiverName || '—') +
    '\n\n' +
    '--- Como a transação consta no sistema ---\n' +
    timeline +
    signals +
    excerpt +
    '\n\n' +
    'Negócios feitos **fora do app** não passam por verificação de documentos, cartão de ponto, ' +
    'diário da criança nem taxa de manutenção (Apple IAP). A plataforma não se responsabiliza por acordos externos.\n\n' +
    'Para plantões futuros, use sempre: Proposta → aceite → fechar negócio no app → ponto e diário.\n\n' +
    'Dúvidas: drlucasnutrologo0777@gmail.com\n' +
    '— Babá ON · Registro ID ' +
    (event.id || '—')
  );
}
