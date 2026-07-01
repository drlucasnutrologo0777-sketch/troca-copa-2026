/* Idoso Care 24H — ofertas, painel família/contratante, cruzamento cuidador */

async function ic24QuerySnap(primaryFn, fallbackFn) {
  try {
    return await primaryFn().get();
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes('index') && fallbackFn) return await fallbackFn().get();
    throw e;
  }
}

function ic24SortByCreated(list) {
  return list.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
    const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
    return tb - ta;
  });
}

async function ic24ResolverFamilyIdDoCuidador(caregiverId) {
  ic24InitFirebase();
  const cgId = caregiverId || ic24Auth.currentUser?.uid;
  if (!cgId) return null;
  const cgSnap = await ic24Db.collection('caregivers').doc(cgId).get();
  if (cgSnap.exists && cgSnap.data().activeFamilyId) return cgSnap.data().activeFamilyId;
  const m = await ic24Db
    .collection('job_offers')
    .where('matchedCaregiverId', '==', cgId)
    .where('status', '==', 'matched')
    .limit(1)
    .get();
  if (!m.empty) return m.docs[0].data().familyId;
  return null;
}

async function ic24VincularFamiliaAtiva(caregiverId, familyId) {
  if (!caregiverId || !familyId) return;
  ic24InitFirebase();
  await ic24Db.collection('caregivers').doc(caregiverId).set(
    { activeFamilyId: familyId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );
}

async function ic24ListarCuidadoresProximos() {
  ic24InitFirebase();
  const snap = await ic24Db.collection('caregivers').where('availableToday', '==', true).limit(30).get();
  if (snap.empty) {
    const snap2 = await ic24Db.collection('caregivers').limit(20).get();
    return snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function ic24CriarOferta(familiaPayload) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) throw new Error('Faça login como família');
  const userSnap = await ic24Db.collection('users').doc(familyId).get();
  const u = userSnap.data() || {};
  if (Number(u.cancellationFeePending || 0) > 0) {
    throw new Error('Multa de cancelamento pendente — quite para publicar novas ofertas');
  }
  const ref = ic24Db.collection('job_offers').doc();
  const data = {
    id: ref.id,
    familyId,
    familyName: userSnap.data()?.fullName || 'Família',
    status: 'open',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...familiaPayload,
  };
  await ref.set(data);
  return data;
}

async function ic24ListarOfertasAbertas(opts = {}) {
  ic24InitFirebase();
  let q = ic24Db.collection('job_offers').where('status', '==', 'open');
  if (opts.urgent === true) q = q.where('urgent', '==', true);
  const fb = () => {
    let q2 = ic24Db.collection('job_offers').where('status', '==', 'open');
    if (opts.urgent === true) q2 = q2.where('urgent', '==', true);
    return q2.limit(30);
  };
  const snap = await ic24QuerySnap(() => q.orderBy('createdAt', 'desc').limit(30), fb);
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (opts.urgent === false) list = list.filter((o) => !o.urgent);
  return ic24SortByCreated(list);
}

async function ic24ListarOfertasFamilia() {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) return [];
  const snap = await ic24QuerySnap(
    () => ic24Db.collection('job_offers').where('familyId', '==', familyId).orderBy('createdAt', 'desc').limit(20),
    () => ic24Db.collection('job_offers').where('familyId', '==', familyId).limit(20),
  );
  return ic24SortByCreated(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

function ic24TextoNotificacaoFamilia(caregiverName, r) {
  const nome = caregiverName || 'O cuidador';
  const dias = r.jobDurationDays || 30;
  let texto;
  if (r.paymentSchedule === 'semanal') {
    texto = nome + ' aceitou sua proposta para receber a cada sete dias';
  } else if (r.paymentSchedule === 'quinzenal') {
    texto = nome + ' aceitou sua proposta para receber a cada quinze dias';
  } else {
    texto = nome + ' aceitou sua proposta de ' + dias + ' dias para receber a diária ao fim do dia';
  }
  if (r.action === 'counter' && r.proposedDailyRate) {
    texto += ' — contra-proposta: R$ ' + Number(r.proposedDailyRate).toFixed(2) + '/dia';
  } else if (r.dailyRateUsed) {
    texto += ' — R$ ' + Number(r.dailyRateUsed).toFixed(2) + '/dia';
  }
  return texto;
}

async function ic24NotificarFamiliaProposta(familyId, offerId, responseId, message, caregiverId, caregiverName) {
  ic24InitFirebase();
  await ic24Db.collection('family_notifications').add({
    familyId,
    offerId,
    responseId,
    caregiverId: caregiverId || null,
    caregiverName: caregiverName || 'O cuidador',
    message,
    read: false,
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

/** Preferências de recebimento salvas no cadastro/plantão (não na proposta). */
async function ic24ObterPreferenciasRecebimento(caregiverId) {
  ic24InitFirebase();
  const id = caregiverId || ic24Auth.currentUser?.uid;
  if (!id) throw new Error('Cuidador não identificado');
  const cgSnap = await ic24Db.collection('caregivers').doc(id).get();
  const cg = cgSnap.exists ? cgSnap.data() : {};
  const prefs = cg.paymentPreferences || {};
  return {
    paymentSchedule: prefs.paymentSchedule || 'diaria',
    paymentWeekDay: prefs.paymentWeekDay || 'seg',
    jobDurationDays: Number(prefs.jobDurationDays) || 15,
    configured: prefs.configured === true,
  };
}

/** Passo 1 + finalização automática com preferências já cadastradas. */
async function ic24AceitarOfertaComTermos(offerId, payload) {
  const r1 = await ic24Passo1Oferta(offerId, payload);
  if (!r1.nextStep) return r1;
  const terms = await ic24ObterPreferenciasRecebimento();
  return ic24FinalizarFormaRecebimento(r1.id, terms);
}

/** Família envia proposta direta a um cuidador. */
async function ic24FamiliaProporCuidador(caregiverId, { dailyRate, message, durationDays, elderlyType, careNeeds }) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) throw new Error('Faça login como família');
  if (!caregiverId) throw new Error('Cuidador não informado');
  if (!dailyRate || dailyRate <= 0) throw new Error('Informe o valor da diária');
  const userSnap = await ic24Db.collection('users').doc(familyId).get();
  const cgSnap = await ic24Db.collection('caregivers').doc(caregiverId).get();
  if (!cgSnap.exists) throw new Error('Cuidador não encontrado');
  const ref = ic24Db.collection('job_offers').doc();
  const data = {
    id: ref.id,
    familyId,
    familyName: userSnap.data()?.fullName || 'Família',
    targetCaregiverId: caregiverId,
    directedToCaregiver: true,
    title: 'Proposta para ' + (cgSnap.data().fullName || 'cuidador'),
    dailyRate,
    careNeeds: careNeeds || '',
    elderlyType: elderlyType || '',
    jobDurationDays: durationDays || 15,
    message: message || '',
    status: 'open',
    scheduleType: 'diaria',
    urgent: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(data);
  try {
    await ic24Db.collection('caregiver_notifications').add({
      caregiverId,
      familyId,
      offerId: ref.id,
      message: (userSnap.data()?.fullName || 'Família') + ' enviou proposta de R$ ' + Number(dailyRate).toFixed(2) + '/dia',
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (_e) {
    /* coleção opcional */
  }
  return data;
}

async function ic24CarregarPerfilCuidadorPublico(caregiverId) {
  ic24InitFirebase();
  const snap = await ic24Db.collection('caregivers').doc(caregiverId).get();
  if (!snap.exists) throw new Error('Cuidador não encontrado');
  const d = snap.data();
  return {
    id: caregiverId,
    fullName: d.fullName || 'Cuidador',
    city: d.city || '',
    state: d.state || '',
    bio: d.bio || '',
    dailyRate: d.dailyRate,
    hourRate: d.hourRate,
    photoUrl: d.photoUrl || null,
    classification: d.classification || {},
    rating: d.rating,
    reviewCount: d.reviewCount,
    specialties: d.specialties || [],
    availableToday: d.availableToday,
    paymentPreferences: d.paymentPreferences || {},
  };
}

async function ic24FamiliaTemNegocioFechado(familyId, caregiverId) {
  ic24InitFirebase();
  if (!familyId || !caregiverId) return false;
  const snap = await ic24Db
    .collection('job_offers')
    .where('familyId', '==', familyId)
    .where('matchedCaregiverId', '==', caregiverId)
    .where('status', '==', 'matched')
    .limit(1)
    .get();
  return !snap.empty;
}

async function ic24BuscarAvaliacaoPendente(familyId) {
  ic24InitFirebase();
  const snap = await ic24Db
    .collection('job_offers')
    .where('familyId', '==', familyId)
    .where('status', '==', 'matched')
    .where('ratingRequired', '==', true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const o = snap.docs[0].data();
  return { offerId: snap.docs[0].id, caregiverId: o.matchedCaregiverId, familyId };
}

async function ic24Passo1Oferta(offerId, payload) {
  const { action, proposedDailyRate, message } = payload || {};
  ic24InitFirebase();
  const caregiverId = ic24Auth.currentUser?.uid;
  if (!caregiverId) throw new Error('Faça login como cuidador');
  const cgSnap = await ic24Db.collection('caregivers').doc(caregiverId).get();
  if (typeof ic24UserBlockedByDebts === 'function' && ic24UserBlockedByDebts(cgSnap.data() || {})) {
    const pend =
      typeof ic24CancellationFeePending === 'function' ? ic24CancellationFeePending(cgSnap.data()) : 0;
    if (pend > 0) throw new Error('Multa de cancelamento pendente — quite para aceitar ofertas');
    throw new Error('Taxa ou multa pendente — regularize em Taxa do app');
  }
  const offerSnap = await ic24Db.collection('job_offers').doc(offerId).get();
  if (!offerSnap.exists) throw new Error('Oferta não encontrada');
  const offer = offerSnap.data();
  if (offer.status !== 'open' && offer.status !== 'negotiating') {
    throw new Error('Esta oferta não está mais disponível');
  }
  if (action === 'reject') {
    const ref = ic24Db.collection('offer_responses').doc();
    await ref.set({
      id: ref.id,
      offerId,
      familyId: offer.familyId,
      caregiverId,
      action: 'reject',
      message: message || 'Não disponível',
      status: 'rejected',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return { id: ref.id, nextStep: null };
  }
  if (action === 'counter' && (!proposedDailyRate || proposedDailyRate <= 0)) {
    throw new Error('Informe o valor da contra-proposta');
  }
  const ref = ic24Db.collection('offer_responses').doc();
  await ref.set({
    id: ref.id,
    offerId,
    familyId: offer.familyId,
    caregiverId,
    action: action === 'counter' ? 'counter' : 'accept',
    proposedDailyRate: action === 'counter' ? proposedDailyRate : null,
    dailyRateUsed: action === 'counter' ? proposedDailyRate : offer.dailyRate,
    message: message || '',
    status: 'awaiting_terms',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await ic24Db.collection('job_offers').doc(offerId).update({
    status: 'awaiting_terms',
    pendingCaregiverId: caregiverId,
    pendingResponseId: ref.id,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return { id: ref.id, nextStep: 'payment_terms' };
}

/** Passo 2: cuidador escolhe como quer receber e envia ao contratante. */
async function ic24FinalizarFormaRecebimento(responseId, terms) {
  ic24InitFirebase();
  const caregiverId = ic24Auth.currentUser?.uid;
  const snap = await ic24Db.collection('offer_responses').doc(responseId).get();
  if (!snap.exists) throw new Error('Proposta não encontrada');
  const r = snap.data();
  if (r.caregiverId !== caregiverId) throw new Error('Sem permissão');
  if (r.status !== 'awaiting_terms') throw new Error('Esta proposta já foi enviada');
  const offerSnap = await ic24Db.collection('job_offers').doc(r.offerId).get();
  if (!offerSnap.exists) throw new Error('Oferta não encontrada');
  const offer = offerSnap.data();
  const rate = r.proposedDailyRate || r.dailyRateUsed || offer.dailyRate;
  const calc =
    typeof ic24CalcularPropostaPagamento === 'function'
      ? ic24CalcularPropostaPagamento(rate, terms.paymentSchedule, terms.paymentWeekDay, terms.jobDurationDays)
      : terms;
  const patch = {
    paymentSchedule: calc.paymentSchedule,
    paymentWeekDay: calc.paymentWeekDay || null,
    scheduleLabel: calc.scheduleLabel,
    diariasCount: calc.diariasCount,
    dailyRateUsed: rate,
    jobDurationDays: calc.jobDurationDays,
    perCycleAmount: calc.perCycleAmount,
    paymentCyclesTotal: calc.totalCycles,
    totalContractAmount: calc.totalContractAmount,
    status: 'pending_family',
    termsFinalizedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await ic24Db.collection('offer_responses').doc(responseId).update(patch);
  let caregiverName = 'O cuidador';
  const cgSnap = await ic24Db.collection('caregivers').doc(caregiverId).get();
  if (cgSnap.exists && cgSnap.data().fullName) caregiverName = cgSnap.data().fullName;
  else {
    const uSnap = await ic24Db.collection('users').doc(caregiverId).get();
    if (uSnap.exists && uSnap.data().fullName) caregiverName = uSnap.data().fullName;
  }
  const notifMsg = ic24TextoNotificacaoFamilia(caregiverName, { ...r, ...patch });
  await ic24NotificarFamiliaProposta(r.familyId, r.offerId, responseId, notifMsg, caregiverId, caregiverName);
  await ic24Db.collection('job_offers').doc(r.offerId).update({
    status: 'pending_family_approval',
    pendingResponseId: responseId,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return { responseId, message: notifMsg };
}

async function ic24ListarNotificacoesFamilia() {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) return [];
  const snap = await ic24QuerySnap(
    () =>
      ic24Db
        .collection('family_notifications')
        .where('familyId', '==', familyId)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(15),
    () =>
      ic24Db.collection('family_notifications').where('familyId', '==', familyId).where('status', '==', 'pending').limit(15),
  );
  return ic24SortByCreated(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

/** Compat: recusa direta. */
async function ic24ResponderOferta(offerId, payload) {
  if (payload.action === 'reject') return ic24Passo1Oferta(offerId, payload);
  throw new Error('Use passo 1 e passo 2 para aceitar ou contra-propor');
}

async function ic24ListarRespostasOferta(offerId) {
  ic24InitFirebase();
  const snap = await ic24Db.collection('offer_responses').where('offerId', '==', offerId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function ic24FamiliaAceitarContraProposta(responseId, accept, notificationId) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  const snap = await ic24Db.collection('offer_responses').doc(responseId).get();
  if (!snap.exists) throw new Error('Proposta não encontrada');
  const r = snap.data();
  if (r.familyId !== familyId) throw new Error('Sem permissão');
  if (r.status !== 'pending_family') throw new Error('Esta proposta não aguarda sua resposta');
  await ic24Db.collection('offer_responses').doc(responseId).update({
    status: accept ? 'accepted' : 'rejected',
    familyDecisionAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  if (notificationId) {
    await ic24Db.collection('family_notifications').doc(notificationId).update({
      status: accept ? 'accepted' : 'rejected',
      read: true,
      resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
  if (accept) {
    const offerSnap = await ic24Db.collection('job_offers').doc(r.offerId).get();
    const offer = offerSnap.exists ? offerSnap.data() : {};
    const rate = r.proposedDailyRate || r.dailyRateUsed || offer.dailyRate;
    await ic24Db.collection('job_offers').doc(r.offerId).update({
      status: 'matched',
      matchedCaregiverId: r.caregiverId,
      agreedDailyRate: rate,
      matchedAt: firebase.firestore.FieldValue.serverTimestamp(),
      paymentSchedule: r.paymentSchedule || null,
      paymentWeekDay: r.paymentWeekDay || null,
      scheduleLabel: r.scheduleLabel || null,
      diariasCount: r.diariasCount || null,
      jobDurationDays: r.jobDurationDays || null,
      perCycleAmount: r.perCycleAmount || null,
      paymentCyclesTotal: r.paymentCyclesTotal || null,
      totalContractAmount: r.totalContractAmount || null,
      paymentCycleCurrent: 0,
      billingReady: false,
      firstPaymentRequiresPontoSign: true,
      pendingCaregiverId: null,
      pendingResponseId: null,
    });
    await ic24VincularFamiliaAtiva(r.caregiverId, familyId);
    if (typeof ic24AcumularTaxaPlataforma === 'function') {
      const diarias = Math.max(1, Number(r.jobDurationDays) || 1);
      await ic24AcumularTaxaPlataforma(r.caregiverId, diarias, r.offerId);
    }
    if (typeof ic24CriarChatNegocioFechado === 'function') {
      await ic24CriarChatNegocioFechado(familyId, r.caregiverId, r.offerId);
    }
    await ic24Db.collection('job_offers').doc(r.offerId).update({
      cancelFeeRate: typeof IC24_CANCEL_FEE_RATE !== 'undefined' ? IC24_CANCEL_FEE_RATE : 0.07,
      cancelFeeAcknowledgedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await ic24Db.collection('job_offers').doc(r.offerId).update({
      status: 'open',
      pendingCaregiverId: null,
      pendingResponseId: null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function ic24ListarPontoPendenteFamilia() {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) return [];
  const snap = await ic24Db
    .collection('ponto_sessions')
    .where('familyId', '==', familyId)
    .where('familyConfirmed', '==', false)
    .limit(10)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function ic24ConfirmarPontoFamilia(sessionId) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  const ref = ic24Db.collection('ponto_sessions').doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Registro não encontrado');
  if (snap.data().familyId !== familyId) throw new Error('Sem permissão');
  await ref.update({
    familyConfirmed: true,
    familyConfirmedAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: 'confirmed',
  });
  const data = snap.data();
  if (data.caregiverId) {
    const offerSnap = await ic24Db
      .collection('job_offers')
      .where('matchedCaregiverId', '==', data.caregiverId)
      .where('familyId', '==', familyId)
      .where('status', '==', 'matched')
      .limit(1)
      .get();
    if (!offerSnap.empty) {
      await offerSnap.docs[0].ref.update({
        billingReady: true,
        lastPontoConfirmedAt: firebase.firestore.FieldValue.serverTimestamp(),
        ratingRequired: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
  return data.caregiverId || null;
}

async function ic24SyncPontoFromCaregiver(caregiverId, familyId, log, observacoes) {
  ic24InitFirebase();
  if (!log || !log.length) return;
  const hasSaida = log.some((e) => e.tipo === 'Saída final' || e.tipo === 'saida');
  if (!hasSaida) return;
  let famId = familyId;
  if (!famId) famId = await ic24ResolverFamilyIdDoCuidador(caregiverId);
  if (!famId) throw new Error('Vincule um plantão (aceite uma oferta) antes de registrar ponto/diário');
  const ref = ic24Db.collection('ponto_sessions').doc('ps_' + caregiverId + '_' + new Date().toISOString().slice(0, 10));
  await ref.set(
    {
      caregiverId,
      familyId: famId || null,
      log,
      observacoes: observacoes || '',
      familyConfirmed: false,
      status: 'awaiting_family',
      date: new Date().toISOString().slice(0, 10),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function ic24ListarDiariosFamilia() {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) return [];
  const snap = await ic24QuerySnap(
    () => ic24Db.collection('care_logs').where('familyId', '==', familyId).orderBy('date', 'desc').limit(15),
    () => ic24Db.collection('care_logs').where('familyId', '==', familyId).limit(15),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

async function ic24AssinarDiarioFamilia(logId) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  const ref = ic24Db.collection('care_logs').doc(logId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Diário não encontrado');
  if (snap.data().familyId !== familyId) throw new Error('Sem permissão');
  await ref.update({
    familySigned: true,
    familySignedAt: firebase.firestore.FieldValue.serverTimestamp(),
    familySignerId: familyId,
  });
}

async function ic24SalvarDiarioComFamilia({ texto, caregiverId, familyId, idosoNome }) {
  ic24InitFirebase();
  const cgId = caregiverId || ic24Auth.currentUser?.uid;
  let famId = familyId;
  if (!famId) famId = await ic24ResolverFamilyIdDoCuidador(cgId);
  if (!famId) throw new Error('Aceite uma oferta de plantão para vincular o diário à família');
  const ref = ic24Db.collection('care_logs').doc();
  await ref.set({
    id: ref.id,
    caregiverId: cgId,
    familyId: famId || null,
    elderlyName: idosoNome || 'Idoso',
    text: texto,
    date: new Date().toISOString().slice(0, 10),
    familySigned: false,
    caregiverSigned: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function ic24CriarRelatorioFamilia({ type, caregiverId, texto, gravidade }) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) throw new Error('Faça login');
  const ref = ic24Db.collection('family_reports').doc();
  await ref.set({
    id: ref.id,
    familyId,
    caregiverId: caregiverId || '',
    type: type || 'irregularidade',
    text: texto,
    severity: gravidade || 'media',
    status: 'received',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function ic24CriarAvaliacao({ caregiverId, nota, texto, offerId }) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) throw new Error('Faça login');
  if (!nota || nota < 1 || nota > 5) throw new Error('Informe nota de 1 a 5');
  const ref = ic24Db.collection('reviews').doc();
  await ref.set({
    familyId,
    caregiverId,
    rating: nota,
    text: texto || '',
    offerId: offerId || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  const cgRef = ic24Db.collection('caregivers').doc(caregiverId);
  const cgSnap = await cgRef.get();
  if (cgSnap.exists) {
    const old = cgSnap.data();
    const count = (old.reviewCount || 0) + 1;
    const rating = ((old.rating || 0) * (count - 1) + nota) / count;
    await cgRef.update({ reviewCount: count, rating: Math.round(rating * 10) / 10 });
  }
  if (offerId) {
    await ic24Db.collection('job_offers').doc(offerId).update({
      ratingRequired: false,
      ratedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function ic24SolicitarCartaRecomendacao(caregiverId, mensagem) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  return ic24CriarRelatorioFamilia({
    type: 'carta_recomendacao',
    caregiverId,
    texto: mensagem || 'Solicito carta de recomendação formal.',
    gravidade: 'baixa',
  });
}

async function ic24ListarPagamentosFamilia() {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) return [];
  const snap = await ic24QuerySnap(
    () => ic24Db.collection('invoices').where('familyId', '==', familyId).orderBy('createdAt', 'desc').limit(20),
    () => ic24Db.collection('invoices').where('familyId', '==', familyId).limit(20),
  );
  return ic24SortByCreated(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

async function ic24ListarCuidadosAnteriores() {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) return [];
  const snap = await ic24Db
    .collection('job_offers')
    .where('familyId', '==', familyId)
    .where('status', '==', 'matched')
    .limit(20)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function ic24EnviarFaleConosco(assunto, mensagem) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  await ic24Db.collection('support_tickets').add({
    userId: uid,
    subject: assunto,
    message: mensagem,
    status: 'open',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function ic24FmtOferta(o) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const sched = { diaria: 'Diária', semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal', urgente_hoje: 'Urgente hoje' };
  return (
    '<div class="list-item' +
    (o.urgent ? '" style="border-color:var(--p)"' : '"') +
    '><b>' +
    esc(o.title || 'Plantão') +
    (o.urgent ? ' 🔴' : '') +
    '</b><small>' +
    esc(sched[o.scheduleType] || o.scheduleType) +
    ' · ' +
    esc(o.careNeeds || o.elderlyType || '') +
    ' · R$ ' +
    esc(o.dailyRate || '—') +
    '/dia</small>' +
    (o.familyName ? '<small style="display:block;margin-top:4px">Família: ' + esc(o.familyName) + '</small>' : '') +
    '</div>'
  );
}
