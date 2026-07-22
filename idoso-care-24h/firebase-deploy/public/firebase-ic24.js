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

function ic24InitFirebase(opts) {
  const requireAuth = !opts || opts.requireAuth !== false;
  if (!window.firebase) throw new Error('Firebase SDK não carregou. Verifique conexão e reabra o app.');
  if (!firebase.apps.length) firebase.initializeApp(IC24_FB);
  if (typeof firebase.firestore !== 'function') {
    throw new Error('Firebase Firestore não carregou');
  }
  ic24Db = firebase.firestore();
  if (requireAuth) {
    if (typeof firebase.auth !== 'function') {
      throw new Error('Firebase Auth não carregou. Feche e abra o app de novo.');
    }
    try {
      ic24Auth = firebase.auth();
    } catch (_) {
      throw new Error('Firebase Auth não carregou. Feche e abra o app de novo.');
    }
  } else {
    ic24Auth = null;
  }
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

function ic24StripUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) out[k] = v;
  }
  return out;
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
    ic24Auth.currentUser.displayName ||
    ic24Auth.currentUser.email;
  const addr = ic24EnderecoMap('cad');
  const bio = document.getElementById('cuid-bio')?.value?.trim() || '';
  const specialties = window._cuidSpecs || [];
  const cpf = document.getElementById('cuid-cpf')?.value?.trim() || '';
  const payload = ic24StripUndefined({
    fullName: nome,
    email: ic24Auth.currentUser.email,
    ...addr,
    bio,
    specialties,
    cpf: cpf || null,
    approved: false,
    rating: 4.5,
    kycStatus: 'incomplete',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  if (!cpf) delete payload.cpf;
  await ic24Db.collection('caregivers').doc(uid).set(payload, { merge: true });
}

async function ic24SalvarPainelCuidador(partial) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como cuidador');
  await ic24Db.collection('caregivers').doc(uid).set(
    ic24StripUndefined({
      ...partial,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }),
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

async function ic24CriarChatNegocioFechado(familyId, caregiverId, offerId) {
  ic24InitFirebase();
  if (!familyId || !caregiverId) throw new Error('Participantes inválidos');
  const chatId = 'chat_' + familyId + '_' + caregiverId;
  await ic24Db.collection('chats').doc(chatId).set(
    {
      participants: [familyId, caregiverId],
      familyId,
      caregiverId,
      offerId: offerId || null,
      chatUnlocked: true,
      unlockedReason: 'negocio_fechado',
      unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastMessage: 'Negócio fechado — conversa liberada',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await ic24Db.collection('matches').doc('match_' + (offerId || chatId)).set(
    {
      familyId,
      caregiverId,
      offerId: offerId || null,
      chatId,
      chatUnlocked: true,
      status: 'matched',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return chatId;
}

async function ic24BuscarChatAtivoUsuario() {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) return null;
  const byFamily = await ic24Db
    .collection('chats')
    .where('familyId', '==', uid)
    .where('chatUnlocked', '==', true)
    .limit(1)
    .get();
  if (!byFamily.empty) return { id: byFamily.docs[0].id, ...byFamily.docs[0].data() };
  const byCaregiver = await ic24Db
    .collection('chats')
    .where('caregiverId', '==', uid)
    .where('chatUnlocked', '==', true)
    .limit(1)
    .get();
  if (!byCaregiver.empty) return { id: byCaregiver.docs[0].id, ...byCaregiver.docs[0].data() };
  return null;
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
  const unlocked = await ic24MatchChatUnlocked(chatId);
  if (!unlocked) throw new Error('Chat bloqueado — feche o negócio antes de conversar');
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

const IC24_DOCS_OBRIGATORIOS = ['rg_frente', 'rg_verso', 'comprovante', 'antecedentes'];

const IC24_DOCS_OPCIONAIS = ['curso', 'diploma', 'referencia'];

const IC24_DOC_LABELS = {
  rg_frente: 'RG frente',
  rg_verso: 'RG verso',
  comprovante: 'comprovante de endereço',
  antecedentes: 'antecedentes criminais',
};

function ic24DocUploaded(docKey, docsMap) {
  docsMap = docsMap || {};
  if (docsMap[docKey]?.fileUrl) return true;
  if (docKey === 'rg_frente' && docsMap.rg?.fileUrl) return true;
  return false;
}

function ic24DocsFaltando(docsMap) {
  return IC24_DOCS_OBRIGATORIOS.filter((k) => !ic24DocUploaded(k, docsMap || {}));
}

function ic24DocsFaltandoMsg(docsMap) {
  return ic24DocsFaltando(docsMap)
    .map((k) => IC24_DOC_LABELS[k] || k)
    .join(', ');
}

function ic24DocsCadastroCompletos(docsMap) {
  return IC24_DOCS_OBRIGATORIOS.every((k) => ic24DocUploaded(k, docsMap));
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
    return { complete: false, screen: 'cuidador-etapa1', message: 'Continue seu cadastro — complete o endereço (etapa 1)' };
  }
  if (!(d.bio || '').trim()) {
    return { complete: false, screen: 'cuidador-etapa2', message: 'Continue seu cadastro — conte sobre você (etapa 2)' };
  }
  if (!d.photoUrl) {
    return { complete: false, screen: 'cuidador-etapa2', message: 'Continue seu cadastro — envie sua foto de perfil (etapa 2)' };
  }
  const missingDocs = IC24_DOCS_OBRIGATORIOS.filter((k) => !ic24DocUploaded(k, docsMap));
  if (missingDocs.length) {
    return {
      complete: false,
      screen: 'cuidador-etapa3',
      message: 'Continue seu cadastro — envie todos os documentos (etapa 3)',
      missingDocs,
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

let ic24Functions = null;

function ic24InitFunctions() {
  ic24InitFirebase();
  if (!window.firebase.functions) {
    throw new Error('Firebase Functions não carregou');
  }
  if (!ic24Functions) {
    ic24Functions = firebase.app().functions('southamerica-east1');
  }
  return ic24Functions;
}

async function ic24SairConta() {
  ic24InitFirebase();
  if (ic24Auth.currentUser) await ic24Auth.signOut();
  window._ic24User = null;
}

async function ic24ExcluirConta(senha) {
  ic24InitFirebase();
  const user = ic24Auth.currentUser;
  if (!user || !user.email) throw new Error('Faça login para excluir a conta');
  if (!senha || String(senha).length < 6) throw new Error('Digite sua senha atual para confirmar');
  const cred = firebase.auth.EmailAuthProvider.credential(user.email, senha);
  await user.reauthenticateWithCredential(cred);
  ic24InitFunctions();
  const fn = ic24Functions.httpsCallable('deleteMyAccount');
  const res = await fn({});
  await ic24Auth.signOut();
  window._ic24User = null;
  return res.data || { ok: true };
}

async function ic24RecuperarSenha(email) {
  ic24InitFirebase();
  const addr = (email || '').trim();
  if (!addr) throw new Error('Informe seu e-mail');
  await ic24Auth.sendPasswordResetEmail(addr);
}
