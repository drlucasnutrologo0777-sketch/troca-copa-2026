/* Babá ON — Firebase Auth + Firestore (web protótipo) */
const IC24_FB = {
  apiKey: 'AIzaSyAXE24i5_5R9vNSSDMJIcifEGqYAdGZnPs',
  authDomain: 'baba-on-3634a.firebaseapp.com',
  projectId: 'baba-on-3634a',
  storageBucket: 'baba-on-3634a.firebasestorage.app',
  messagingSenderId: '89617020452',
  appId: '1:89617020452:web:e066bb439ae26f57578ab1',
};

let ic24Auth = null;
let ic24Db = null;

function ic24InitFirebase() {
  if (!window.firebase) throw new Error('Firebase SDK não carregou');
  if (!firebase.apps.length) firebase.initializeApp(IC24_FB);
  if (typeof firebase.firestore !== 'function') {
    throw new Error('Firestore não carregou — atualize o app');
  }
  ic24Db = firebase.firestore();
  // Auth é opcional em páginas públicas (curriculo.html?t=…)
  if (typeof firebase.auth === 'function') {
    ic24Auth = firebase.auth();
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
    case 'permission-denied':
      return 'Permissão negada — saia e entre de novo, ou atualize o app';
    default:
      return (err && err.message) || 'Erro de autenticação';
  }
}

async function ic24CriarConta({ nome, email, senha, senha2, role }) {
  if (!nome || !email) throw new Error('Preencha nome e e-mail');
  if (senha.length < 6) throw new Error('Senha com mínimo 6 caracteres');
  if (senha !== senha2) throw new Error('As senhas não coincidem');
  ic24InitFirebase();
  const emailNorm = email.trim().toLowerCase();
  const cred = await ic24Auth.createUserWithEmailAndPassword(emailNorm, senha);
  const uid = cred.user.uid;
  const papel = role || 'family';
  await ic24Db.collection('users').doc(uid).set({
    email: emailNorm,
    fullName: nome.trim(),
    role: papel,
    status: 'active',
    verified: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  // Trava: Auth e-mail e users.email nascem iguais; papel único na criação.
  return { uid, role: papel, fullName: nome.trim() };
}

/**
 * Segurança de identidade:
 * - users.email SEMPRE = Auth.email (nunca outro e-mail no mesmo UID)
 * - nome do perfil vem do doc do papel (caregiver/clients), não de lixo antigo
 * - impede confusão João Paulo / Joana no mesmo login
 */
async function ic24ReconciliarPerfilSeguranca() {
  ic24InitFirebase();
  const user = ic24Auth.currentUser;
  if (!user) return null;
  const uid = user.uid;
  const authEmail = String(user.email || '')
    .trim()
    .toLowerCase();
  const userRef = ic24Db.collection('users').doc(uid);
  const snap = await userRef.get();
  let data = snap.exists ? snap.data() || {} : {};
  const patch = {};
  const storedEmail = String(data.email || '')
    .trim()
    .toLowerCase();
  if (authEmail && storedEmail !== authEmail) {
    patch.email = authEmail;
  }
  let role = data.role || 'family';
  const cgSnap = await ic24Db.collection('caregivers').doc(uid).get();
  const clSnap = await ic24Db.collection('clients').doc(uid).get();
  const cg = cgSnap.exists ? cgSnap.data() || {} : null;
  const cl = clSnap.exists ? clSnap.data() || {} : null;

  // Se tem perfil de babá completo, papel oficial é caregiver.
  if (cg && (cg.fullName || cg.cpf || cg.cep)) {
    if (role !== 'caregiver') patch.role = 'caregiver';
    role = 'caregiver';
    const nomeCg = String(cg.fullName || '').trim();
    if (nomeCg && nomeCg !== String(data.fullName || '').trim()) {
      patch.fullName = nomeCg;
    }
    if (cg.email && String(cg.email).trim().toLowerCase() !== authEmail) {
      await ic24Db
        .collection('caregivers')
        .doc(uid)
        .set({ email: authEmail }, { merge: true });
    }
  } else if (cl && (cl.fullName || cl.cep)) {
    if (role !== 'family') patch.role = 'family';
    role = 'family';
    const nomeCl = String(cl.fullName || '').trim();
    if (nomeCl && nomeCl !== String(data.fullName || '').trim()) {
      patch.fullName = nomeCl;
    }
    if (cl.email && String(cl.email).trim().toLowerCase() !== authEmail) {
      await ic24Db
        .collection('clients')
        .doc(uid)
        .set({ email: authEmail }, { merge: true });
    }
  }

  if (!data.fullName && patch.fullName == null) {
    patch.fullName = authEmail;
  }
  if (Object.keys(patch).length) {
    patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    patch.identityReconciledAt = firebase.firestore.FieldValue.serverTimestamp();
    await userRef.set(patch, { merge: true });
    data = { ...data, ...patch };
  }
  return {
    uid,
    role: data.role || role || 'family',
    fullName: data.fullName || authEmail,
    email: authEmail,
  };
}

/** Pai e babá não podem ser o mesmo UID. */
function ic24AssertParticipantesDistintos(familyId, caregiverId, acao) {
  if (!familyId || !caregiverId) {
    throw new Error('Participantes inválidos');
  }
  if (familyId === caregiverId) {
    throw new Error(
      'Segurança: o contratante e a babá precisam ser contas diferentes (e-mails diferentes). ' +
        (acao || 'Esta ação') +
        ' não pode usar o mesmo login.',
    );
  }
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

async function ic24SalvarBaba() {
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
  await ic24Db.collection('users').doc(uid).set(
    {
      email: String(ic24Auth.currentUser.email || '')
        .trim()
        .toLowerCase(),
      fullName: nome,
      role: 'caregiver',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function ic24SalvarPainelBaba(partial) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como babá');
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
      email: String(ic24Auth.currentUser.email || '')
        .trim()
        .toLowerCase(),
      phone: tel,
      ...addr,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await ic24Db.collection('users').doc(uid).set(
    {
      email: String(ic24Auth.currentUser.email || '')
        .trim()
        .toLowerCase(),
      fullName: nome,
      role: 'family',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  const crianca = document.getElementById('fam-crianca').value.trim();
  const necessidades = document.getElementById('fam-necessidades').value.trim();
  if (crianca || necessidades) {
    try {
      await ic24Db.collection('patients').add({
        name: crianca || 'Criança',
        careNeeds: necessidades,
        clientRef: ic24Db.collection('clients').doc(uid),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (_) {
      /* criança é opcional — não bloqueia cadastro do responsável */
    }
  }
}

const IC24_DEMO_CAREGIVER = 'demo_caregiver_maria';

async function ic24CriarChatNegocioFechado(familyId, caregiverId, offerId) {
  ic24InitFirebase();
  ic24AssertParticipantesDistintos(familyId, caregiverId, 'Fechar negócio');
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
  const pickUnlocked = (snap) => {
    const hit = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .find((c) => c.chatUnlocked === true);
    return hit || null;
  };
  // array-contains não exige índice composto (a query antiga familyId+chatUnlocked quebrava sem índice)
  try {
    const byPart = await ic24Db.collection('chats').where('participants', 'array-contains', uid).limit(15).get();
    const unlocked = pickUnlocked(byPart);
    if (unlocked) return unlocked;
  } catch (_e) {
    /* fallback abaixo */
  }
  try {
    const byFamily = await ic24Db.collection('chats').where('familyId', '==', uid).limit(10).get();
    const unlocked = pickUnlocked(byFamily);
    if (unlocked) return unlocked;
  } catch (_e2) {
    /* continua */
  }
  try {
    const byCaregiver = await ic24Db.collection('chats').where('caregiverId', '==', uid).limit(10).get();
    const unlocked = pickUnlocked(byCaregiver);
    if (unlocked) return unlocked;
  } catch (_e3) {
    /* sem chat */
  }
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

async function ic24CarregarDadosBaba(uid) {
  ic24InitFirebase();
  const snap = await ic24Db.collection('caregivers').doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  let docsMap = {};
  if (typeof ic24ListDocumentos === 'function') {
    docsMap = await ic24ListDocumentos(uid);
  }
  return { data, docsMap, exists: snap.exists };
}

function ic24AvaliarCadastroBaba(d, docsMap) {
  d = d || {};
  docsMap = docsMap || {};
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!d.street || !d.number || cep.length !== 8 || !d.city || !d.state) {
    return { complete: false, screen: 'baba-etapa1', message: 'Complete seu endereço para continuar o cadastro' };
  }
  if (!(d.bio || '').trim()) {
    return { complete: false, screen: 'baba-etapa2', message: 'Conte sobre você e suas especialidades' };
  }
  if (!d.photoUrl) {
    return { complete: false, screen: 'baba-etapa2', message: 'Envie sua foto de perfil (etapa 2)' };
  }
  const missingDocs = IC24_DOCS_OBRIGATORIOS.filter((k) => !ic24DocUploaded(k, docsMap));
  if (missingDocs.length) {
    return {
      complete: false,
      screen: 'baba-etapa3',
      message: 'Continue seu cadastro — envie os documentos (etapa 3)',
      missingDocs,
    };
  }
  return { complete: true, screen: 'baba-painel', message: '' };
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
    return { complete: false, screen: 'cadastro-familia', message: 'Complete seu cadastro de mãe/pai' };
  }
  return { complete: true, screen: 'mae-painel', message: '' };
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
  window._ic24IgnorarAuthRedirect = true;
  try {
    if (ic24Auth.currentUser) await ic24Auth.signOut();
  } finally {
    window._ic24User = null;
    window._babaPainel = {};
    window._babaDocs = {};
    window._cuidDocs = {};
    window._cuidadorSelecionado = null;
    window._activeFamilyId = null;
    window._pendingProfilePhoto = null;
    try {
      const emailEl = document.getElementById('email');
      const senhaEl = document.getElementById('senha');
      if (emailEl) emailEl.value = '';
      if (senhaEl) senhaEl.value = '';
    } catch (_) {
      /* DOM pode não existir */
    }
    setTimeout(() => {
      window._ic24IgnorarAuthRedirect = false;
    }, 800);
  }
}

/**
 * Login seguro: nunca reaproveita sessão anterior.
 * 1) encerra sessão atual
 * 2) autentica exatamente o e-mail digitado
 * 3) confere Auth.email === e-mail do formulário
 */
async function ic24Entrar(email, senha) {
  ic24InitFirebase();
  const emailNorm = String(email || '')
    .trim()
    .toLowerCase();
  if (!emailNorm || !senha) throw new Error('Preencha e-mail e senha');

  window._ic24IgnorarAuthRedirect = true;
  try {
    if (ic24Auth.currentUser) {
      await ic24Auth.signOut();
    }
    const cred = await ic24Auth.signInWithEmailAndPassword(emailNorm, senha);
    const authEmail = String(cred.user.email || '')
      .trim()
      .toLowerCase();
    if (authEmail !== emailNorm) {
      await ic24Auth.signOut();
      throw new Error(
        'Segurança: a sessão não corresponde ao e-mail digitado. Tente novamente.',
      );
    }
    const perfil = await ic24ReconciliarPerfilSeguranca();
    if (perfil) {
      if (perfil.email && perfil.email !== emailNorm) {
        await ic24Auth.signOut();
        throw new Error(
          'Segurança: perfil com e-mail divergente. Conta bloqueada até correção.',
        );
      }
      return perfil;
    }
    const snap = await ic24Db.collection('users').doc(cred.user.uid).get();
    const data = snap.data() || {};
    return {
      uid: cred.user.uid,
      role: data.role || 'family',
      fullName: data.fullName || emailNorm,
      email: authEmail,
    };
  } finally {
    setTimeout(() => {
      window._ic24IgnorarAuthRedirect = false;
    }, 500);
  }
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
  const addr = (email || '').trim().toLowerCase();
  if (!addr) throw new Error('Informe seu e-mail');
  if (addr.endsWith('.test.local') || addr.includes('@babaon.test.local')) {
    throw new Error(
      'Contas demo não recebem e-mail. Senha demo: Demo123! — use e-mail real (Gmail/iCloud) para recuperação.',
    );
  }
  try {
    await ic24Auth.sendPasswordResetEmail(addr, {
      url: 'https://baba-on-3634a.web.app/index.html',
      handleCodeInApp: false,
    });
  } catch (err) {
    const apiKey = IC24_FB.apiKey;
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email: addr,
          continueUrl: 'https://baba-on-3634a.web.app/index.html',
        }),
      },
    );
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || 'Não foi possível enviar o e-mail');
  }
}
