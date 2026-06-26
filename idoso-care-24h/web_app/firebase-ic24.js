/* Idoso Care 24H — Firebase Auth + Firestore (web protótipo) */
const IC24_FB = {
  apiKey: 'AIzaSyANP5NdTT-ZcDm1K5GTzPpfPqVs_PqtDpI',
  authDomain: 'idoso-care-24h.firebaseapp.com',
  projectId: 'idoso-care-24h',
  storageBucket: 'idoso-care-24h.firebasestorage.app',
  messagingSenderId: '361055634294',
  appId: '1:361055634294:web:5c887f315c327bf00ef057',
  measurementId: 'G-948BD8M7XC',
};

let ic24Auth = null;
let ic24Db = null;

function ic24InitFirebase() {
  if (!window.firebase) throw new Error('Firebase SDK não carregou');
  if (!firebase.apps.length) firebase.initializeApp(IC24_FB);
  ic24Auth = firebase.auth();
  ic24Db = firebase.firestore();
  return { auth: ic24Auth, db: ic24Db };
}

function ic24AuthError(err) {
  const code = err && err.code ? err.code : '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'E-mail já cadastrado — use Entrar';
    case 'auth/invalid-email':
      return 'E-mail inválido';
    case 'auth/weak-password':
      return 'Senha fraca — mínimo 6 caracteres';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha inválidos';
    default:
      return (err && err.message) || 'Erro de autenticação';
  }
}

async function ic24CriarConta({ nome, email, senha, senha2, role }) {
  if (!nome || !email) throw new Error('Preencha nome e e-mail');
  if (senha.length < 6) throw new Error('Senha com mínimo 6 caracteres');
  if (senha !== senha2) throw new Error('As senhas não coincidem');
  ic24InitFirebase();
  const cred = await ic24Auth.createUserWithEmailAndPassword(email.trim(), senha);
  const uid = cred.user.uid;
  await ic24Db.collection('users').doc(uid).set({
    email: email.trim().toLowerCase(),
    fullName: nome.trim(),
    role: role || 'family',
    status: 'active',
    verified: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return { uid, role: role || 'family', fullName: nome.trim() };
}

async function ic24Entrar(email, senha) {
  ic24InitFirebase();
  const cred = await ic24Auth.signInWithEmailAndPassword(email.trim(), senha);
  const snap = await ic24Db.collection('users').doc(cred.user.uid).get();
  const data = snap.data() || {};
  return {
    uid: cred.user.uid,
    role: data.role || 'family',
    fullName: data.fullName || email,
  };
}

function ic24EnderecoMap(prefix) {
  const p = (id) => document.getElementById(prefix + '-' + id)?.value?.trim() || '';
  return {
    cep: p('cep'),
    street: p('rua'),
    number: p('num'),
    complement: p('comp'),
    neighborhood: p('bairro'),
    city: p('cidade'),
    state: p('uf'),
    address: [
      p('rua'),
      p('num') ? 'nº ' + p('num') : '',
      p('comp'),
      p('bairro'),
      p('cidade') && p('uf') ? p('cidade') + ' - ' + p('uf') : '',
      p('cep') ? 'CEP ' + p('cep') : '',
    ]
      .filter(Boolean)
      .join(', '),
  };
}

async function ic24SalvarCuidador() {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login ou crie a conta primeiro');
  const userSnap = await ic24Db.collection('users').doc(uid).get();
  const userData = userSnap.data() || {};
  const nome =
    document.getElementById('acc-nome')?.value?.trim() ||
    userData.fullName ||
    ic24Auth.currentUser.email;
  const addr = ic24EnderecoMap('cad');
  const bio = document.getElementById('cuid-bio')?.value?.trim() || '';
  const specialties = window._cuidSpecs || [];
  const hourRaw = document.getElementById('cuid-hour')?.value?.trim() || '';
  const dailyRaw = document.getElementById('cuid-daily')?.value?.trim() || '';
  const hourRate = hourRaw ? parseFloat(hourRaw.replace(',', '.')) : null;
  const dailyRate = dailyRaw ? parseFloat(dailyRaw.replace(',', '.')) : null;
  const cpf = document.getElementById('cuid-cpf')?.value?.trim() || '';
  const cursoExperienciaTexto = document.getElementById('curso-exp-texto')?.value?.trim() || '';
  await ic24Db.collection('caregivers').doc(uid).set(
    {
      fullName: nome,
      email: ic24Auth.currentUser.email,
      ...addr,
      bio,
      specialties,
      hourRate,
      dailyRate,
      cpf: cpf || undefined,
      cursoExperienciaTexto: cursoExperienciaTexto || undefined,
      approved: false,
      rating: 4.5,
      kycStatus: 'incomplete',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function ic24SalvarPainelCuidador(partial) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como cuidador');
  await ic24Db.collection('caregivers').doc(uid).set(
    {
      ...partial,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function ic24SalvarFamilia() {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login ou crie a conta primeiro');
  const nome = document.getElementById('fam-nome').value.trim();
  const tel = document.getElementById('fam-tel').value.trim();
  const addr = ic24EnderecoMap('fam');
  await ic24Db.collection('clients').doc(uid).set(
    {
      fullName: nome,
      email: ic24Auth.currentUser.email,
      phone: tel,
      ...addr,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  const idoso = document.getElementById('fam-idoso').value.trim();
  const necessidades = document.getElementById('fam-necessidades').value.trim();
  if (idoso || necessidades) {
    await ic24Db.collection('patients').add({
      name: idoso || 'Idoso',
      careNeeds: necessidades,
      clientRef: ic24Db.collection('clients').doc(uid),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
}

const IC24_DEMO_CAREGIVER = 'demo_caregiver_maria';

async function ic24SolicitarMatch(caregiverId) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) throw new Error('Faça login como família');
  const cgId = caregiverId || IC24_DEMO_CAREGIVER;
  const matchId = 'm_' + familyId + '_' + cgId;
  const chatId = 'chat_' + matchId;
  await ic24Db.collection('matches').doc(matchId).set(
    {
      familyId,
      caregiverId: cgId,
      chatId,
      chatUnlocked: false,
      paymentStatus: 'pending',
      pixAmount: 0.5,
      pixBeneficiary: 'Eder Lucas Santos Tiago',
      pixKey: '11968362005',
      status: 'contact_requested',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await ic24Db.collection('chats').doc(chatId).set(
    {
      participants: [familyId, cgId],
      caregiverId: cgId,
      familyId,
      chatUnlocked: false,
      lastMessage: 'Match solicitado — aguardando PIX',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  window._ic24MatchId = matchId;
  window._ic24ChatId = chatId;
  return { matchId, chatId };
}

async function ic24ConfirmarPixPagamento() {
  ic24InitFirebase();
  const matchId = window._ic24MatchId;
  const chatId = window._ic24ChatId;
  if (!matchId || !chatId) throw new Error('Match não encontrado');
  const familyId = ic24Auth.currentUser?.uid;
  await ic24Db.collection('matches').doc(matchId).update({
    chatUnlocked: true,
    paymentStatus: 'confirmed',
    paidAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: 'chat_active',
  });
  await ic24Db.collection('chats').doc(chatId).update({
    chatUnlocked: true,
    lastMessage: 'Chat liberado após PIX',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await ic24Db.collection('payments').add({
    matchId,
    chatId,
    familyId,
    amount: 0.5,
    currency: 'BRL',
    method: 'pix',
    pixBeneficiary: 'Eder Lucas Santos Tiago',
    pixKey: '11968362005',
    status: 'confirmed',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return chatId;
}

function ic24ListenChat(chatId, onMessages) {
  ic24InitFirebase();
  return ic24Db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot((snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onMessages(msgs);
    });
}

async function ic24SendChatMessage(chatId, text) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid || !text.trim()) return;
  await ic24Db.collection('chats').doc(chatId).collection('messages').add({
    senderId: uid,
    text: text.trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await ic24Db.collection('chats').doc(chatId).update({
    lastMessage: text.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function ic24MatchChatUnlocked(chatId) {
  ic24InitFirebase();
  const snap = await ic24Db.collection('chats').doc(chatId).get();
  return snap.exists && snap.data().chatUnlocked === true;
}

const IC24_DOCS_OBRIGATORIOS = ['rg', 'cpf', 'comprovante', 'ctps', 'antecedentes'];

function ic24CadastroFaltaCursoOuExperiencia(d, docsMap) {
  if (typeof ic24HasCursoOuExperiencia === 'function') {
    return !ic24HasCursoOuExperiencia(
      Object.fromEntries(Object.entries(docsMap || {}).map(([k, v]) => [k, { url: v.fileUrl }])),
      d,
    );
  }
  const temCurso = docsMap?.curso?.fileUrl;
  const temExp = String(d?.cursoExperienciaTexto || '').trim().length >= 20;
  return !temCurso && !temExp;
}

async function ic24CarregarDadosCuidador(uid) {
  ic24InitFirebase();
  const snap = await ic24Db.collection('caregivers').doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  let docsMap = {};
  if (typeof ic24ListDocumentos === 'function') {
    docsMap = await ic24ListDocumentos(uid);
  }
  return { data, docsMap, exists: snap.exists };
}

function ic24AvaliarCadastroCuidador(d, docsMap) {
  d = d || {};
  docsMap = docsMap || {};
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!d.street || !d.number || cep.length !== 8 || !d.city || !d.state) {
    return { complete: false, screen: 'cuidador-etapa1', message: 'Complete seu endereço para continuar o cadastro' };
  }
  if (!(d.bio || '').trim()) {
    return { complete: false, screen: 'cuidador-etapa2', message: 'Conte sobre você e suas especialidades' };
  }
  if (d.hourRate == null && d.dailyRate == null) {
    return { complete: false, screen: 'cuidador-etapa3', message: 'Informe valor por hora ou por diária' };
  }
  if (String(d.cpf || '').replace(/\D/g, '').length !== 11) {
    return { complete: false, screen: 'cuidador-curriculo', message: 'Informe seu CPF no currículo' };
  }
  const missingDocs = IC24_DOCS_OBRIGATORIOS.filter((k) => !docsMap[k]?.fileUrl);
  if (missingDocs.length) {
    return {
      complete: false,
      screen: 'documentos',
      message: 'Envie os documentos pendentes (fotos)',
      missingDocs,
    };
  }
  if (ic24CadastroFaltaCursoOuExperiencia(d, docsMap)) {
    return {
      complete: false,
      screen: 'documentos',
      message: 'Anexe o curso de cuidador ou descreva seu tempo de experiência',
      missingDocs: ['curso_ou_experiencia'],
    };
  }
  return { complete: true, screen: 'cuidador-painel', message: '' };
}

async function ic24CarregarDadosFamilia(uid) {
  ic24InitFirebase();
  const snap = await ic24Db.collection('clients').doc(uid).get();
  return snap.exists ? snap.data() : {};
}

function ic24AvaliarCadastroFamilia(d) {
  d = d || {};
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!(d.fullName || '').trim() || !d.street || !d.number || cep.length !== 8 || !d.city) {
    return { complete: false, screen: 'cadastro-familia', message: 'Complete seu cadastro de família/contratante' };
  }
  return { complete: true, screen: 'familia-painel', message: '' };
}
