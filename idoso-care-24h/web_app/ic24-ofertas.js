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

async function ic24ResponderOferta(offerId, { action, proposedDailyRate, message }) {
  ic24InitFirebase();
  const caregiverId = ic24Auth.currentUser?.uid;
  if (!caregiverId) throw new Error('Faça login como cuidador');
  const offerSnap = await ic24Db.collection('job_offers').doc(offerId).get();
  if (!offerSnap.exists) throw new Error('Oferta não encontrada');
  const offer = offerSnap.data();
  const ref = ic24Db.collection('offer_responses').doc();
  await ref.set({
    id: ref.id,
    offerId,
    familyId: offer.familyId,
    caregiverId,
    action: action || 'accept',
    proposedDailyRate: proposedDailyRate || null,
    message: message || '',
    status:
      action === 'accept'
        ? 'accepted'
        : action === 'reject'
          ? 'rejected'
          : 'counter_pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  if (action === 'accept') {
    await ic24Db.collection('job_offers').doc(offerId).update({
      status: 'matched',
      matchedCaregiverId: caregiverId,
      matchedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await ic24VincularFamiliaAtiva(caregiverId, offer.familyId);
    if (typeof ic24AcumularTaxaPlataforma === 'function') {
      await ic24AcumularTaxaPlataforma(caregiverId, offer.dailyRate || offer.agreedDailyRate || 0);
    }
  } else if (action === 'reject') {
    /* oferta permanece aberta para outros cuidadores */
  } else {
    await ic24Db.collection('job_offers').doc(offerId).update({
      status: 'negotiating',
      lastCounterBy: caregiverId,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
  return { id: ref.id };
}

async function ic24ListarRespostasOferta(offerId) {
  ic24InitFirebase();
  const snap = await ic24Db.collection('offer_responses').where('offerId', '==', offerId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function ic24FamiliaAceitarContraProposta(responseId, accept) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  const snap = await ic24Db.collection('offer_responses').doc(responseId).get();
  if (!snap.exists) throw new Error('Proposta não encontrada');
  const r = snap.data();
  if (r.familyId !== familyId) throw new Error('Sem permissão');
  await ic24Db.collection('offer_responses').doc(responseId).update({
    status: accept ? 'accepted' : 'rejected',
    familyDecisionAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  if (accept) {
    await ic24Db.collection('job_offers').doc(r.offerId).update({
      status: 'matched',
      matchedCaregiverId: r.caregiverId,
      agreedDailyRate: r.proposedDailyRate,
      matchedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await ic24VincularFamiliaAtiva(r.caregiverId, familyId);
    const offerSnap = await ic24Db.collection('job_offers').doc(r.offerId).get();
    const rate = r.proposedDailyRate || (offerSnap.exists ? offerSnap.data().dailyRate : 0);
    if (typeof ic24AcumularTaxaPlataforma === 'function') {
      await ic24AcumularTaxaPlataforma(r.caregiverId, rate || 0);
    }
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

async function ic24CriarAvaliacao({ caregiverId, nota, texto }) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) throw new Error('Faça login');
  const ref = ic24Db.collection('reviews').doc();
  await ref.set({
    familyId,
    caregiverId,
    rating: nota,
    text: texto || '',
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
    () => ic24Db.collection('payments').where('familyId', '==', familyId).orderBy('createdAt', 'desc').limit(20),
    () => ic24Db.collection('payments').where('familyId', '==', familyId).limit(20),
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
