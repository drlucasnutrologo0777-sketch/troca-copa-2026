/* Medico de Casa — Firebase Auth + Firestore (projeto medico-de-casa) */
const MH_FB = {
  apiKey: 'AIzaSyC_qlKNl_FzY0Q8LSiLLLmxYHzafye0Ul4',
  authDomain: 'medico-de-casa.firebaseapp.com',
  projectId: 'medico-de-casa',
  storageBucket: 'medico-de-casa.firebasestorage.app',
  messagingSenderId: '1022133340311',
  appId: '1:1022133340311:web:02d1f7be36e7404329c1d2',
  measurementId: 'G-YCDMW0RPJH',
};

/** Coleção principal do médico (substitui caregivers) */
const MH_DOCTOR_COL = 'doctors';
const MH_REQUIRED_DOCS = ['crm', 'comprovante', 'diploma'];
const MH_OPTIONAL_DOCS = ['especialidade', 'pos', 'outros', 'rg', 'cpf'];

let ic24Auth = null;
let ic24Db = null;

function ic24InitFirebase() {
  if (!window.firebase) throw new Error('Firebase SDK não carregou');
  if (!firebase.apps.length) firebase.initializeApp(MH_FB);
  ic24Auth = firebase.auth();
  ic24Db = firebase.firestore();
  return { auth: ic24Auth, db: ic24Db };
}

function mhDoctorCol() {
  return MH_DOCTOR_COL;
}

function mhNormalizeRole(role) {
  if (role === 'caregiver') return 'doctor';
  if (role === 'family') return 'patient';
  return role || 'patient';
}

function mhLegacyRole(role) {
  if (role === 'doctor') return 'caregiver';
  if (role === 'patient') return 'family';
  return role;
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
  const normalizedRole = mhNormalizeRole(role);
  const cred = await ic24Auth.createUserWithEmailAndPassword(email.trim(), senha);
  const uid = cred.user.uid;
  await ic24Db.collection('users').doc(uid).set({
    email: email.trim().toLowerCase(),
    fullName: nome.trim(),
    role: normalizedRole,
    legacyRole: mhLegacyRole(normalizedRole),
    status: 'active',
    verified: false,
    app: 'medico_de_casa',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return { uid, role: normalizedRole, fullName: nome.trim() };
}

async function ic24Entrar(email, senha) {
  ic24InitFirebase();
  const cred = await ic24Auth.signInWithEmailAndPassword(email.trim(), senha);
  const snap = await ic24Db.collection('users').doc(cred.user.uid).get();
  const data = snap.data() || {};
  const role = data.role || 'patient';
  return {
    uid: cred.user.uid,
    role: mhLegacyRole(role) === 'caregiver' ? 'caregiver' : role === 'doctor' ? 'caregiver' : 'family',
    normalizedRole: role,
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
    address: [p('rua'), p('num') ? 'nº ' + p('num') : '', p('comp'), p('bairro'), p('cidade') && p('uf') ? p('cidade') + ' - ' + p('uf') : '', p('cep') ? 'CEP ' + p('cep') : '']
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
    ic24Auth.currentUser.email;
  const addr = ic24EnderecoMap('cad');
  const bio = document.getElementById('cuid-bio')?.value?.trim() || '';
  const specialties = (window._medSpecs || window._cuidSpecs || []).slice(0, 3);
  const crmNum = document.getElementById('med-crm-num')?.value?.trim() || document.getElementById('crm-num')?.value?.trim() || '';
  const crmUf = (document.getElementById('med-crm-uf')?.value?.trim() || document.getElementById('crm-uf')?.value?.trim() || '').toUpperCase();
  const cpf = document.getElementById('cuid-cpf')?.value?.trim() || '';
  const payload = ic24StripUndefined({
    fullName: nome,
    email: ic24Auth.currentUser.email,
    ...addr,
    bio,
    specialties,
    crmNumber: crmNum || null,
    crmUf: crmUf || null,
    crm: crmNum && crmUf ? crmNum + '/' + crmUf : null,
    cpf: cpf || null,
    approved: false,
    rating: 4.5,
    kycStatus: 'incomplete',
    app: 'medico_de_casa',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  if (!cpf) delete payload.cpf;
  await ic24Db.collection(MH_DOCTOR_COL).doc(uid).set(payload, { merge: true });
  await ic24Db.collection('users').doc(uid).set({ role: 'doctor', legacyRole: 'caregiver' }, { merge: true });
}

async function ic24SalvarPainelCuidador(partial) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como médico');
  await ic24Db.collection(MH_DOCTOR_COL).doc(uid).set(
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
      app: 'medico_de_casa',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await ic24Db.collection('users').doc(uid).set({ role: 'patient', legacyRole: 'family' }, { merge: true });
  const paciente = (document.getElementById('fam-paciente') || document.getElementById('fam-idoso'))?.value?.trim() || '';
  const necessidades = (document.getElementById('fam-comorbidades') || document.getElementById('fam-necessidades'))?.value?.trim() || '';
  if (paciente || necessidades) {
    await ic24Db.collection('patients').add({
      name: paciente || 'Paciente',
      careNeeds: necessidades,
      comorbidities: necessidades,
      clientRef: ic24Db.collection('clients').doc(uid),
      app: 'medico_de_casa',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
}

let ic24Functions = null;
function ic24InitFunctions() {
  ic24InitFirebase();
  if (!ic24Functions && firebase.functions) ic24Functions = firebase.functions();
  return ic24Functions;
}

async function ic24ExcluirConta(senha) {
  ic24InitFirebase();
  const user = ic24Auth.currentUser;
  if (!user || !user.email) throw new Error('Faça login para excluir a conta');
  if (!senha || String(senha).length < 6) throw new Error('Digite sua senha atual para confirmar');
  const cred = firebase.auth.EmailAuthProvider.credential(user.email, senha);
  await user.reauthenticateWithCredential(cred);
  const uid = user.uid;
  try {
    ic24InitFunctions();
    if (ic24Functions) {
      const fn = ic24Functions.httpsCallable('deleteMyAccount');
      await fn({});
    }
  } catch (_) {
    await ic24Db.collection('users').doc(uid).delete().catch(() => {});
    await ic24Db.collection('doctors').doc(uid).delete().catch(() => {});
    await ic24Db.collection('clients').doc(uid).delete().catch(() => {});
  }
  await user.delete();
  window._ic24User = null;
  return { ok: true };
}

const IC24_DEMO_CAREGIVER = 'demo_doctor_home';

async function ic24CriarChatNegocioFechado(familyId, caregiverId, offerId) {
  ic24InitFirebase();
  const doctorId = caregiverId;
  if (!familyId || !doctorId) throw new Error('Participantes inválidos');
  const chatId = 'chat_' + familyId + '_' + doctorId;
  await ic24Db.collection('chats').doc(chatId).set(
    {
      participants: [familyId, doctorId],
      familyId,
      doctorId,
      caregiverId: doctorId,
      offerId: offerId || null,
      chatUnlocked: true,
      unlockedReason: 'negocio_fechado',
      unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastMessage: 'Consulta agendada — conversa liberada',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await ic24Db.collection('matches').doc('match_' + (offerId || chatId)).set(
    {
      familyId,
      doctorId,
      caregiverId: doctorId,
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
  for (const field of ['familyId', 'doctorId', 'caregiverId']) {
    const q = await ic24Db.collection('chats').where(field, '==', uid).where('chatUnlocked', '==', true).limit(1).get();
    if (!q.empty) return { id: q.docs[0].id, ...q.docs[0].data() };
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
      onMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

async function ic24SendChatMessage(chatId, text) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid || !text.trim()) return;
  if (!(await ic24MatchChatUnlocked(chatId))) throw new Error('Chat bloqueado — feche o negócio antes de conversar');
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

async function ic24CarregarDadosCuidador(uid) {
  ic24InitFirebase();
  const snap = await ic24Db.collection(MH_DOCTOR_COL).doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  let docsMap = {};
  if (typeof ic24ListDocumentos === 'function') docsMap = await ic24ListDocumentos(uid);
  return { data, docsMap, exists: snap.exists };
}

function ic24AvaliarCadastroCuidador(d, docsMap) {
  d = d || {};
  docsMap = docsMap || {};
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!d.street || !d.number || cep.length !== 8 || !d.city || !d.state) {
    return { complete: false, screen: 'cuidador-etapa1', message: 'Complete seu endereço' };
  }
  if (!(d.bio || '').trim()) {
    return { complete: false, screen: 'cuidador-etapa2', message: 'Conte sobre você' };
  }
  const specs = d.specialties || window._medSpecs || [];
  if (!specs.length) {
    return { complete: false, screen: 'cuidador-etapa2', message: 'Escolha ao menos 1 especialidade (máx. 3)' };
  }
  if (!(d.crmNumber || d.crm)) {
    return { complete: false, screen: 'cuidador-etapa2', message: 'Informe seu CRM' };
  }
  if (!d.photoUrl && !window._photoUploaded) {
    return { complete: false, screen: 'cuidador-etapa2', message: 'Envie sua foto de perfil' };
  }
  const docRota = ic24AvaliarDocumentacaoCuidador(d, docsMap);
  if (!docRota.complete) {
    return { ...docRota, profileComplete: true };
  }
  return { complete: true, screen: 'cuidador-painel', message: '' };
}

function ic24AvaliarDocumentacaoCuidador(d, docsMap) {
  docsMap = docsMap || {};
  const missingDocs = MH_REQUIRED_DOCS.filter((k) => !(docsMap[k]?.fileUrl || docsMap[k]?.url));
  if (missingDocs.length) {
    return {
      complete: false,
      screen: 'documentos',
      message: 'Envie CRM, comprovante de endereço e diploma de medicina',
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
    return { complete: false, screen: 'cadastro-familia', message: 'Complete seu cadastro' };
  }
  return { complete: true, screen: 'familia-painel', message: '' };
}

async function ic24SairConta() {
  ic24InitFirebase();
  if (ic24Auth.currentUser) await ic24Auth.signOut();
  window._ic24User = null;
}

async function ic24RecuperarSenha(email) {
  ic24InitFirebase();
  const addr = (email || '').trim();
  if (!addr) throw new Error('Informe seu e-mail');
  await ic24Auth.sendPasswordResetEmail(addr);
}

/** Anamnese → coleção anamneses */
async function mhSalvarAnamnese({ texto, doctorId, familyId, patientName }) {
  ic24InitFirebase();
  const docId = doctorId || ic24Auth.currentUser?.uid;
  let famId = familyId;
  if (!famId && typeof ic24ResolverFamilyIdDoCuidador === 'function') {
    famId = await ic24ResolverFamilyIdDoCuidador(docId);
  }
  const ref = ic24Db.collection('anamneses').doc();
  await ref.set({
    id: ref.id,
    doctorId: docId,
    caregiverId: docId,
    familyId: famId || null,
    patientName: patientName || 'Paciente',
    text: texto,
    visitDate: new Date().toISOString().slice(0, 10),
    signed: true,
    familyAcknowledged: false,
    app: 'medico_de_casa',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}
