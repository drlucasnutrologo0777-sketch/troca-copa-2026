/* Idoso Care 24H — cobrança PIX/cartão para cliente + taxa plataforma */

/** Taxa por diária — Apple IAP consumível ic24_taxa_manutencao (1 unidade = 1 diária) */
const IC24_FEE_PER_DIARIA_USD = 1.99;
const IC24_FEE_PER_DIARIA_BRL = 10.29;
const IC24_FEE_FIXED_USD = IC24_FEE_PER_DIARIA_USD;
const IC24_FEE_FIXED_BRL = IC24_FEE_PER_DIARIA_BRL;
const IC24_FEE_CURRENCY = 'USD';
const IC24_MAX_PENDING_FEES = 1;
const IC24_CANCEL_FEE_RATE = 0.07;
const IC24_CANCEL_FEE_EACH = 0.035;
const IC24_PIX_BENEFICIARIO = {
  name: 'Eder Lucas Santos Tiago',
  key: '+5511968362005',
  keyDisplay: '11968362005',
  city: 'SAO PAULO',
};

function ic24FmtTaxaUsd(amount) {
  return 'US$ ' + Number(amount || 0).toFixed(2);
}

function ic24FmtTaxaBrl(amount) {
  return 'R$ ' + Number(amount || 0).toFixed(2).replace('.', ',');
}

function ic24PixCopiaColaValor(amount, txid, pixKeyOverride, beneficiaryNameOverride) {
  const rawKey = (pixKeyOverride || IC24_PIX_BENEFICIARIO.key).replace(/\s/g, '');
  const key = rawKey.startsWith('+') ? rawKey : rawKey.replace(/\D/g, '');
  const nameSource = beneficiaryNameOverride || IC24_PIX_BENEFICIARIO.name;
  const name = nameSource
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .substring(0, 25)
    .toUpperCase();
  const city = IC24_PIX_BENEFICIARIO.city.substring(0, 15).toUpperCase();
  const accountInfo = ic24PixTlv('00', 'br.gov.bcb.pix') + ic24PixTlv('01', key.startsWith('+') ? key : '+55' + key.replace(/^\+/, ''));
  let payload =
    ic24PixTlv('00', '01') +
    ic24PixTlv('26', accountInfo) +
    ic24PixTlv('52', '0000') +
    ic24PixTlv('53', '986') +
    ic24PixTlv('54', Number(amount).toFixed(2)) +
    ic24PixTlv('58', 'BR') +
    ic24PixTlv('59', name) +
    ic24PixTlv('60', city) +
    ic24PixTlv('62', ic24PixTlv('05', (txid || 'IC24COB').substring(0, 25)));
  payload += '6304';
  return payload + ic24PixCrc16(payload);
}

function ic24PlatformFeePending(d) {
  return Number((d && d.platformFeePending) || 0);
}

function ic24CancellationFeePending(d) {
  return Number((d && d.cancellationFeePending) || 0);
}

function ic24PlatformFeePendingDiarias(d) {
  const n = Number((d && d.platformFeePendingDiarias) || 0);
  if (n > 0) return n;
  const pend = ic24PlatformFeePending(d);
  if (pend <= 0.001) return 0;
  return Math.max(1, Math.round(pend / IC24_FEE_FIXED_USD));
}

function ic24CalcPlatformFee(diariasCount) {
  const diarias = Math.max(1, Math.min(366, Math.floor(Number(diariasCount) || 1)));
  return {
    diarias,
    usd: Math.round(diarias * IC24_FEE_PER_DIARIA_USD * 100) / 100,
    brlReference: Math.round(diarias * IC24_FEE_PER_DIARIA_BRL * 100) / 100,
  };
}

function ic24HasPendingPlatformFee(d) {
  return ic24PlatformFeePending(d) >= IC24_FEE_FIXED_USD - 0.001;
}

function ic24OffersBlockedByFee(d) {
  return ic24HasPendingPlatformFee(d);
}

function ic24UserBlockedByDebts(d) {
  return ic24OffersBlockedByFee(d) || ic24CancellationFeePending(d) > 0;
}

function ic24HtmlAvisoMultaCancelamento() {
  return (
    '<p><strong>Cancelamento após fechar negócio:</strong> multa de <strong>7%</strong> do valor acordado, ' +
    'dividida entre as partes (<strong>3,5% cada</strong>). ' +
    '<strong>Não pagar impede novas ofertas e novos trabalhos no app.</strong></p>'
  );
}

async function ic24AcumularTaxaPlataforma(caregiverId, diariasCount, offerId) {
  if (!caregiverId) return 0;
  ic24InitFirebase();
  const ref = ic24Db.collection('caregivers').doc(caregiverId);
  const snap = await ref.get();
  const cur = snap.exists ? snap.data() : {};
  if (ic24HasPendingPlatformFee(cur)) {
    return ic24PlatformFeePending(cur);
  }
  const fee = ic24CalcPlatformFee(diariasCount);
  await ref.set(
    {
      platformFeePending: fee.usd,
      platformFeePendingDiarias: fee.diarias,
      platformFeeCurrency: IC24_FEE_CURRENCY,
      platformFeePendingOfferId: offerId || null,
      platformFeeUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  if (offerId) {
    await ic24Db.collection('job_offers').doc(offerId).set(
      {
        platformFeeStatus: 'pending',
        platformFeeAmount: fee.usd,
        platformFeePendingDiarias: fee.diarias,
        platformFeeAmountBrlReference: fee.brlReference,
        platformFeeCurrency: IC24_FEE_CURRENCY,
      },
      { merge: true },
    );
  }
  return fee.usd;
}

const IC24_DIAS_SEMANA = {
  dom: 'domingo',
  seg: 'segunda-feira',
  ter: 'terça-feira',
  qua: 'quarta-feira',
  qui: 'quinta-feira',
  sex: 'sexta-feira',
  sab: 'sábado',
};

function ic24CalcularPropostaPagamento(dailyRate, freq, weekDay, jobDurationDays) {
  const rate = Number(dailyRate) || 0;
  if (!rate || rate <= 0) throw new Error('Informe um valor diário válido');
  const days = Math.max(1, Number(jobDurationDays) || 30);
  let base;
  if (freq === 'diaria') {
    base = {
      paymentSchedule: 'diaria',
      diariasCount: 1,
      perCycleAmount: rate,
      totalAmount: rate,
      description: '1 diária — pagamento ao fim do plantão',
      scheduleLabel: 'Diária (ao fim de cada plantão)',
      totalCycles: days,
    };
  } else if (freq === 'semanal') {
    const dia = IC24_DIAS_SEMANA[weekDay] || weekDay || 'dia escolhido';
    const amt = Math.round(rate * 7 * 100) / 100;
    base = {
      paymentSchedule: 'semanal',
      paymentWeekDay: weekDay || 'seg',
      diariasCount: 7,
      perCycleAmount: amt,
      totalAmount: amt,
      description: '7 diárias — pagamento semanal (' + dia + ')',
      scheduleLabel: 'Semanal — ' + dia,
      totalCycles: Math.ceil(days / 7),
    };
  } else if (freq === 'quinzenal') {
    const amt = Math.round(rate * 14 * 100) / 100;
    base = {
      paymentSchedule: 'quinzenal',
      diariasCount: 14,
      perCycleAmount: amt,
      totalAmount: amt,
      description: '14 diárias — pagamento quinzenal',
      scheduleLabel: 'Quinzenal',
      totalCycles: Math.ceil(days / 14),
    };
  } else {
    throw new Error('Selecione a forma de recebimento');
  }
  base.jobDurationDays = days;
  base.totalContractAmount = Math.round(base.perCycleAmount * base.totalCycles * 100) / 100;
  return base;
}

async function ic24ObterOfertaAtivaCuidador(caregiverId) {
  ic24InitFirebase();
  const cgId = caregiverId || ic24Auth.currentUser?.uid;
  if (!cgId) return null;
  const snap = await ic24Db
    .collection('job_offers')
    .where('matchedCaregiverId', '==', cgId)
    .where('status', '==', 'matched')
    .limit(5)
    .get();
  if (snap.empty) return null;
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const ta = a.matchedAt?.toMillis?.() || a.matchedAt?.seconds * 1000 || 0;
    const tb = b.matchedAt?.toMillis?.() || b.matchedAt?.seconds * 1000 || 0;
    return tb - ta;
  });
  return list[0];
}

async function ic24PrefillCobrancaDoPlantao() {
  ic24InitFirebase();
  const caregiverId = ic24Auth.currentUser?.uid;
  if (!caregiverId) return { canGenerate: false, reason: 'Faça login como cuidador' };
  const offer = await ic24ObterOfertaAtivaCuidador(caregiverId);
  if (!offer) return { canGenerate: false, reason: 'Nenhum plantão fechado no momento' };
  const cycle = (offer.paymentCycleCurrent || 0) + 1;
  const totalCycles = offer.paymentCyclesTotal || 1;
  if (cycle > totalCycles) {
    return { canGenerate: false, reason: 'Todos os ciclos de pagamento deste plantão já foram cobrados' };
  }
  if (!offer.billingReady && cycle === 1) {
    return {
      canGenerate: false,
      reason: 'Aguardando o contratante autenticar a primeira diária (cartão de ponto)',
      offer,
    };
  }
  const rate = Number(offer.agreedDailyRate || offer.dailyRate) || 0;
  const calc = ic24CalcularPropostaPagamento(
    rate,
    offer.paymentSchedule || 'diaria',
    offer.paymentWeekDay,
    offer.jobDurationDays,
  );
  const amount = offer.perCycleAmount || calc.perCycleAmount;
  const title = offer.title || 'Plantão';
  const desc =
    title +
    ' — ciclo ' +
    cycle +
    '/' +
    totalCycles +
    ' (' +
    (offer.scheduleLabel || calc.scheduleLabel) +
    ')';
  return {
    canGenerate: true,
    offerId: offer.id,
    familyId: offer.familyId,
    cycle,
    totalCycles,
    amount,
    description: desc,
    scheduleLabel: offer.scheduleLabel || calc.scheduleLabel,
    offer,
  };
}

async function ic24GerarCobrancaCicloPlantao({ pixKey, pixTitular, linkCartao, metodo }) {
  const pre = await ic24PrefillCobrancaDoPlantao();
  if (!pre.canGenerate) throw new Error(pre.reason || 'Cobrança não disponível');
  const inv = await ic24GerarCobrancaCliente({
    valor: pre.amount,
    descricao: pre.description,
    metodo: metodo || 'boleto',
    linkCartao,
    familyId: pre.familyId,
    pixKey,
    pixTitular,
    offerId: pre.offerId,
    paymentCycle: pre.cycle,
  });
  await ic24Db.collection('job_offers').doc(pre.offerId).update({
    billingReady: false,
    lastInvoiceId: inv.id,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return inv;
}

async function ic24NotificarCuidadorPagamento(caregiverId, invoice) {
  if (!caregiverId || !invoice) return;
  ic24InitFirebase();
  await ic24Db.collection('caregiver_notifications').add({
    caregiverId,
    type: 'payment_received',
    invoiceId: invoice.id,
    offerId: invoice.offerId || null,
    amount: invoice.amount,
    message:
      'Pagamento recebido: R$ ' +
      Number(invoice.amount || 0).toFixed(2) +
      (invoice.description ? ' — ' + invoice.description : ''),
    read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function ic24ConfirmarPagamentoFamilia(invoiceId) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) throw new Error('Faça login como família');
  const ref = ic24Db.collection('invoices').doc(invoiceId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Cobrança não encontrada');
  const inv = snap.data();
  if (inv.familyId !== familyId) throw new Error('Sem permissão');
  if (inv.status === 'paid') throw new Error('Pagamento já confirmado');
  await ref.update({
    status: 'paid',
    paidAt: firebase.firestore.FieldValue.serverTimestamp(),
    paidConfirmedBy: familyId,
  });
  const paid = { id: invoiceId, ...inv, status: 'paid' };
  if (inv.caregiverId) await ic24NotificarCuidadorPagamento(inv.caregiverId, paid);
  if (inv.offerId) {
    const offerRef = ic24Db.collection('job_offers').doc(inv.offerId);
    const offerSnap = await offerRef.get();
    if (offerSnap.exists) {
      const o = offerSnap.data();
      const cur = Number(o.paymentCycleCurrent || 0);
      const next = Math.max(cur, Number(inv.paymentCycle || cur + 1));
      const patch = {
        paymentCycleCurrent: next,
        billingReady: next < (o.paymentCyclesTotal || 1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      await offerRef.update(patch);
    }
  }
  return paid;
}

async function ic24ListarNotificacoesCuidador(limit) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await ic24QuerySnap(
    () =>
      ic24Db
        .collection('caregiver_notifications')
        .where('caregiverId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(limit || 10),
    () => ic24Db.collection('caregiver_notifications').where('caregiverId', '==', uid).limit(limit || 10),
  );
  return ic24SortByCreated(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

async function ic24GerarCobrancaCliente({ valor, descricao, metodo, linkCartao, familyId, pixKey, pixTitular, offerId, paymentCycle }) {
  ic24InitFirebase();
  const caregiverId = ic24Auth.currentUser?.uid;
  if (!caregiverId) throw new Error('Faça login como cuidador');
  const amount = parseFloat(valor);
  if (!amount || amount <= 0) throw new Error('Informe um valor válido');
  const cgSnap = await ic24Db.collection('caregivers').doc(caregiverId).get();
  const cg = cgSnap.data() || {};
  const chavePix = (pixKey || cg.pixKey || '').trim();
  const titular = (pixTitular || cg.pixTitular || cg.fullName || '').trim();
  if ((metodo === 'pix' || metodo === 'boleto') && !chavePix) {
    throw new Error('Cadastre sua chave PIX antes de gerar cobrança');
  }
  const ref = ic24Db.collection('invoices').doc();
  const txid = 'INV' + ref.id.slice(0, 8).toUpperCase();
  const cardLink = (linkCartao || '').trim() || null;
  const data = {
    id: ref.id,
    caregiverId,
    familyId: familyId || window._activeFamilyId || null,
    offerId: offerId || null,
    paymentCycle: paymentCycle || null,
    amount,
    description: descricao || 'Serviço de cuidador',
    method: metodo || 'pix',
    status: 'pending',
    txid,
    pixTitular: titular,
    pixKey: chavePix,
    cardLink,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (metodo === 'pix' || metodo === 'boleto' || !cardLink) {
    data.pixCopiaCola = ic24PixCopiaColaValor(amount, txid, chavePix);
    data.pixBeneficiary = titular || IC24_PIX_BENEFICIARIO.name;
  }
  if (metodo === 'cartao' && !cardLink) throw new Error('Cole o link de pagamento com cartão');
  data.boletoHtml = ic24MontarBoletoHtml(data);
  await ref.set(data);
  if (chavePix && chavePix !== cg.pixKey) {
    await ic24Db.collection('caregivers').doc(caregiverId).set({ pixKey: chavePix, pixTitular: titular }, { merge: true });
  }
  return { id: ref.id, ...data };
}

function ic24MontarBoletoHtml(inv) {
  const v = Number(inv.amount || 0).toFixed(2);
  return (
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Boleto/Cobrança IC24</title>' +
    '<style>body{font-family:Arial,sans-serif;max-width:640px;margin:24px auto;padding:24px}' +
    'h1{color:#2E8B57}table{width:100%;border-collapse:collapse;margin:16px 0}' +
    'td,th{border:1px solid #ddd;padding:10px;text-align:left}code{font-size:11px;word-break:break-all}</style></head><body>' +
    '<h1>Cobrança Idoso Care 24H</h1>' +
    '<table><tr><th>Descrição</th><td>' +
    (inv.description || '') +
    '</td></tr><tr><th>Valor</th><td>R$ ' +
    v +
    '</td></tr><tr><th>Vencimento</th><td>' +
    new Date().toLocaleDateString('pt-BR') +
    '</td></tr></table>' +
    (inv.pixKey
      ? '<h2>PIX</h2><p><b>Titular:</b> ' +
        (inv.pixTitular || '') +
        '<br/><b>Chave:</b> ' +
        inv.pixKey +
        '</p><p><code>' +
        (inv.pixCopiaCola || '') +
        '</code></p>'
      : '') +
    (inv.cardLink
      ? '<h2>Cartão</h2><p><a href="' +
        inv.cardLink +
        '">' +
        inv.cardLink +
        '</a></p>'
      : '') +
    '<p><small>ID: ' +
    (inv.id || inv.txid || '') +
    '</small></p></body></html>'
  );
}

function ic24BaixarBoleto(inv) {
  const html = inv.boletoHtml || ic24MontarBoletoHtml(inv);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'boleto-ic24-' + (inv.id || 'cob').slice(0, 8) + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function ic24ListarCobrancasCuidador() {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await ic24QuerySnap(
    () => ic24Db.collection('invoices').where('caregiverId', '==', uid).orderBy('createdAt', 'desc').limit(15),
    () => ic24Db.collection('invoices').where('caregiverId', '==', uid).limit(15),
  );
  return ic24SortByCreated(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

async function ic24ResumoFinanceiroCuidador() {
  const invs = await ic24ListarCobrancasCuidador();
  const paid = invs.filter((i) => i.status === 'paid');
  const total = paid.reduce((s, i) => s + Number(i.amount || 0), 0);
  const pendente = invs.filter((i) => i.status === 'pending').reduce((s, i) => s + Number(i.amount || 0), 0);
  const now = new Date();
  const mes = paid
    .filter((i) => {
      const d = i.paidAt?.toDate?.() || i.createdAt?.toDate?.();
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  return {
    total,
    mes,
    pendente,
    plantoes: paid.length,
    movimentos: invs.slice(0, 10).map((i) => ({
      data: (i.createdAt?.toDate?.() || new Date()).toLocaleDateString('pt-BR'),
      desc: i.description || 'Cobrança',
      valor: i.amount,
    })),
  };
}

async function ic24ListarTrabalhosCuidador(caregiverId) {
  ic24InitFirebase();
  const cgId = caregiverId || ic24Auth.currentUser?.uid;
  if (!cgId) return [];
  const snap = await ic24Db
    .collection('job_offers')
    .where('matchedCaregiverId', '==', cgId)
    .where('status', '==', 'matched')
    .limit(30)
    .get();
  const list = snap.docs.map((d) => {
    const o = d.data();
    const when = o.matchedAt?.toDate?.() || null;
    const fee =
      o.platformFeeStatus === 'paid'
        ? 'Taxa paga'
        : o.platformFeeStatus === 'pending'
          ? 'Taxa pendente'
          : 'Concluído';
    return {
      data: when ? when.toLocaleDateString('pt-BR') : '—',
      tipo: o.title || 'Plantão',
      local: o.city || 'Montes Claros',
      valor: Number(o.agreedDailyRate || o.dailyRate) || 0,
      status: fee,
      offerId: d.id,
    };
  });
  list.sort((a, b) => (a.data < b.data ? 1 : -1));
  return list;
}

async function ic24PurchaseTaxaViaStoreKit() {
  const bridge = window.flutter_inappwebview;
  if (!bridge || typeof bridge.callHandler !== 'function') {
    throw new Error(
      'Pagamento da taxa disponível apenas no app iOS (TestFlight ou App Store). Abra pelo iPhone ou iPad, não pelo navegador.',
    );
  }
  const uid = ic24Auth?.currentUser?.uid || null;
  const raw = await bridge.callHandler('ic24PurchasePlatformFee', uid);
  const r = Array.isArray(raw) ? raw[0] : raw;
  if (!r || !r.ok) {
    throw new Error((r && r.error) || 'Compra cancelada ou não concluída na App Store');
  }
  return r;
}

async function ic24RegistrarPagamentoTaxa(uid, iap, offerId) {
  const cgSnap = await ic24Db.collection('caregivers').doc(uid).get();
  const cg = cgSnap.exists ? cgSnap.data() : {};
  const pendingBefore = ic24PlatformFeePending(cg);
  const diariasBefore = ic24PlatformFeePendingDiarias(cg);
  const pendingAfter = Math.max(0, Math.round((pendingBefore - IC24_FEE_FIXED_USD) * 100) / 100);
  const diariasAfter = Math.max(0, diariasBefore - 1);
  const fullyPaid = pendingAfter <= 0.001 || diariasAfter <= 0;

  const ref = ic24Db.collection('platform_fee_payments').doc();
  const txid = 'TAXA' + ref.id.slice(0, 6).toUpperCase();
  const pay = {
    id: ref.id,
    caregiverId: uid,
    offerId: offerId || null,
    amount: IC24_FEE_FIXED_USD,
    amountBrlReference: IC24_FEE_FIXED_BRL,
    diariasUnits: 1,
    currency: IC24_FEE_CURRENCY,
    method: 'apple_iap',
    status: 'confirmed',
    txid,
    appleProductId: (iap && iap.productId) || 'ic24_taxa_manutencao',
    appleTransactionId: (iap && iap.transactionId) || null,
    appleReceipt: (iap && iap.serverVerificationData) || null,
    note: fullyPaid ? 'Apple StoreKit — taxa quitada' : 'Apple StoreKit — 1 diária paga',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(pay);

  const cgPatch = fullyPaid
    ? {
        platformFeePending: 0,
        platformFeePendingDiarias: 0,
        platformFeePendingOfferId: null,
        platformFeeLastPaidAt: firebase.firestore.FieldValue.serverTimestamp(),
        platformFeeLastMethod: 'apple_iap',
      }
    : {
        platformFeePending: pendingAfter,
        platformFeePendingDiarias: diariasAfter,
        platformFeeLastPartialPaidAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
  await ic24Db.collection('caregivers').doc(uid).set(cgPatch, { merge: true });

  if (offerId) {
    if (fullyPaid) {
      await ic24Db.collection('job_offers').doc(offerId).set(
        {
          platformFeeStatus: 'paid',
          platformFeePaidAt: firebase.firestore.FieldValue.serverTimestamp(),
          platformFeeAmount: 0,
          platformFeePendingDiarias: 0,
        },
        { merge: true },
      );
    } else {
      await ic24Db.collection('job_offers').doc(offerId).set(
        {
          platformFeeAmount: pendingAfter,
          platformFeePendingDiarias: diariasAfter,
        },
        { merge: true },
      );
    }
  }
  return pay;
}

async function ic24PagarTaxaPlataforma(metodo) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login');
  if (metodo !== 'apple_iap') {
    throw new Error('A taxa da plataforma só pode ser paga via App Store (IAP)');
  }
  const snap = await ic24Db.collection('caregivers').doc(uid).get();
  const cg = snap.data() || {};
  const pending = ic24PlatformFeePending(cg);
  const offerId = cg.platformFeePendingOfferId || null;
  if (pending <= 0) throw new Error('Nenhuma taxa pendente');

  const units = ic24PlatformFeePendingDiarias(cg);
  if (units > 1 && typeof confirm === 'function') {
    const ok = confirm(
      'Taxa pendente: ' +
        units +
        ' diária(s) × US$ 1,99 = ' +
        ic24FmtTaxaUsd(pending) +
        '.\n\nSerão ' +
        units +
        ' compras na App Store (US$ 1,99 cada). Continuar?',
    );
    if (!ok) throw new Error('Pagamento cancelado');
  }

  let lastPay = null;
  for (let i = 0; i < units; i++) {
    const iap = await ic24PurchaseTaxaViaStoreKit();
    lastPay = await ic24RegistrarPagamentoTaxa(uid, iap, offerId);
    const snap2 = await ic24Db.collection('caregivers').doc(uid).get();
    if (ic24PlatformFeePending(snap2.data()) <= 0.001) break;
  }
  return lastPay;
}

async function ic24ListarTaxasPlataformaCuidador() {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await ic24QuerySnap(
    () =>
      ic24Db
        .collection('platform_fee_payments')
        .where('caregiverId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(20),
    () => ic24Db.collection('platform_fee_payments').where('caregiverId', '==', uid).limit(20),
  );
  return ic24SortByCreated(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

async function ic24ConfirmarTaxaIap(metodo) {
  return ic24PagarTaxaPlataforma(metodo || 'apple_iap');
}

function ic24BaixarCurriculoCadastro(d, cls, docsMap) {
  const nome = d.fullName || 'Cuidador';
  const cpfMask =
    typeof ic24MaskCpf === 'function'
      ? ic24MaskCpf(d.cpf)
      : String(d.cpf || '')
          .replace(/\D/g, '')
          .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.$3-**');
  const regiao = [d.city, d.state].filter(Boolean).join(' — ') || '—';
  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Currículo ' +
    nome +
    '</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:24px auto;padding:20px;color:#222}h1{color:#2E8B57}section{margin:16px 0;padding:12px;border:1px solid #e0e0e0;border-radius:8px}small{color:#666}</style></head><body>' +
    '<h1>Currículo Lates — Idoso Care 24H</h1>' +
    '<p><small>Sem telefone, e-mail ou endereço — dados de contato protegidos pela plataforma.</small></p>' +
    '<section><h2>Dados públicos</h2><p><b>Nome:</b> ' +
    (d.fullName || '—') +
    '</p><p><b>CPF:</b> ' +
    cpfMask +
    '</p><p><b>Região:</b> ' +
    regiao +
    '</p></section>' +
    '<section><h2>Perfil</h2><p>' +
    (d.bio || '—') +
    '</p><p><b>Especialidades:</b> ' +
    ((d.specialties || []).join(', ') || '—') +
    '</p><p><b>Valores:</b> R$ ' +
    (d.hourRate || '—') +
    '/h · R$ ' +
    (d.dailyRate || '—') +
    '/dia</p></section>' +
    '<section><h2>Classificação</h2><p><b>' +
    (cls.label || '—') +
    '</b></p><p>' +
    (cls.stars || '') +
    ' · Score ' +
    (cls.score || 0) +
    '/100</p></section>' +
    '<section><h2>Documentos verificados</h2><ul>' +
    Object.keys(docsMap || {})
      .map((k) => '<li>' + k + '</li>')
      .join('') +
    '</ul></section>' +
    '<p><small>Gerado em ' +
    new Date().toLocaleString('pt-BR') +
    ' — Idoso Care 24H</small></p></body></html>';
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'curriculo-' + nome.replace(/\s+/g, '-').toLowerCase() + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
}
