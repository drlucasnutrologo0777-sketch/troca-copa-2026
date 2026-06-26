/* Idoso Care 24H — cobrança PIX/cartão para cliente + taxa plataforma */

const IC24_FEE_LIMIT = 50;
const IC24_FEE_RATE = 0.07;
const IC24_PIX_BENEFICIARIO = {
  name: 'Eder Lucas Santos Tiago',
  key: '+5511968362005',
  keyDisplay: '11968362005',
  city: 'SAO PAULO',
};

function ic24PixCopiaColaValor(amount, txid, pixKeyOverride) {
  const rawKey = (pixKeyOverride || IC24_PIX_BENEFICIARIO.key).replace(/\s/g, '');
  const key = rawKey.startsWith('+') ? rawKey : rawKey.replace(/\D/g, '');
  const keyDisplay = pixKeyOverride || IC24_PIX_BENEFICIARIO.keyDisplay;
  const name = IC24_PIX_BENEFICIARIO.name
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

function ic24OffersBlockedByFee(d) {
  return ic24PlatformFeePending(d) >= IC24_FEE_LIMIT;
}

async function ic24AcumularTaxaPlataforma(caregiverId, valorServico) {
  if (!caregiverId || !valorServico) return;
  ic24InitFirebase();
  const ref = ic24Db.collection('caregivers').doc(caregiverId);
  const snap = await ref.get();
  const cur = snap.exists ? snap.data() : {};
  const add = Math.round(Number(valorServico) * IC24_FEE_RATE * 100) / 100;
  const pending = Math.round((ic24PlatformFeePending(cur) + add) * 100) / 100;
  await ref.set(
    {
      platformFeePending: pending,
      platformFeeUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return pending;
}

async function ic24GerarCobrancaCliente({ valor, descricao, metodo, linkCartao, familyId, pixKey, pixTitular }) {
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
  if (metodo === 'boleto' && !cardLink) throw new Error('Cole o link de cartão para incluir no boleto');
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

async function ic24PagarTaxaPlataforma(metodo) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login');
  const snap = await ic24Db.collection('caregivers').doc(uid).get();
  const pending = ic24PlatformFeePending(snap.data());
  if (pending <= 0) throw new Error('Nenhuma taxa pendente');
  const ref = ic24Db.collection('platform_fee_payments').doc();
  const txid = 'TAXA' + ref.id.slice(0, 6).toUpperCase();
  const pay = {
    id: ref.id,
    caregiverId: uid,
    amount: pending,
    method: metodo || 'pix',
    status: ['google_play_iap', 'apple_iap'].includes(metodo) ? 'confirmed_demo' : 'pending',
    txid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (metodo === 'pix') {
    pay.pixCopiaCola = ic24PixCopiaColaValor(pending, txid);
  }
  if (metodo === 'google_play_iap') {
    pay.googlePlayProductId = 'ic24_taxa_manutencao';
    pay.note = 'Google Play Billing — produto consumível';
  }
  if (metodo === 'apple_iap') {
    pay.appleProductId = 'ic24_taxa_manutencao';
    pay.note = 'Apple StoreKit — produto consumível';
  }
  await ref.set(pay);
  if (['google_play_iap', 'apple_iap'].includes(metodo)) {
    await ic24Db.collection('caregivers').doc(uid).set(
      {
        platformFeePending: 0,
        platformFeeLastPaidAt: firebase.firestore.FieldValue.serverTimestamp(),
        platformFeeLastMethod: metodo,
      },
      { merge: true },
    );
  }
  return pay;
}

async function ic24ConfirmarTaxaIap(metodo) {
  return ic24PagarTaxaPlataforma(metodo);
}

async function ic24ConfirmarTaxaPixPaga() {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login');
  await ic24Db.collection('caregivers').doc(uid).set(
    {
      platformFeePending: 0,
      platformFeeLastPaidAt: firebase.firestore.FieldValue.serverTimestamp(),
      platformFeeLastMethod: 'pix',
    },
    { merge: true },
  );
}

function ic24BaixarCurriculoCadastro(d, cls, docsMap) {
  const nome = d.fullName || 'Cuidador';
  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Currículo ' +
    nome +
    '</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:24px auto;padding:20px;color:#222}h1{color:#2E8B57}section{margin:16px 0;padding:12px;border:1px solid #e0e0e0;border-radius:8px}small{color:#666}</style></head><body>' +
    '<h1>Currículo Lates — Idoso Care 24H</h1>' +
    '<section><h2>Dados pessoais</h2><p><b>Nome:</b> ' +
    (d.fullName || '—') +
    '</p><p><b>CPF:</b> ' +
    (d.cpf || '—') +
    '</p><p><b>E-mail:</b> ' +
    (d.email || '—') +
    '</p><p><b>Endereço:</b> ' +
    (d.address || d.city || '—') +
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
