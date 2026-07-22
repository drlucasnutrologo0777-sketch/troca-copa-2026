/* Idoso Care 24H — documentos (Storage), classificação e currículo público */

const IC24_DOC_META = {
  rg_frente: { type: 'RG_Frente', label: 'RG — Frente', weight: 5, tier: 'identity' },
  rg_verso: { type: 'RG_Verso', label: 'RG — Verso', weight: 5, tier: 'identity' },
  rg: { type: 'RG', label: 'RG — Registro Geral (legado)', weight: 10, tier: 'identity' },
  cpf: { type: 'CPF', label: 'CPF', weight: 10, tier: 'identity' },
  comprovante: { type: 'Comprovante', label: 'Comprovante de endereço', weight: 8, tier: 'identity' },
  antecedentes: { type: 'AntecedentesCriminais', label: 'Antecedentes criminais', weight: 30, tier: 'compliance', required: true },
  diploma: { type: 'Diploma', label: 'Diploma / Certificado de formação', weight: 18, tier: 'education' },
  curso: { type: 'CursoCuidador', label: 'Curso de Cuidador de Idosos', weight: 25, tier: 'education' },
  referencia: { type: 'Referencia', label: 'Comprovante de experiência', weight: 12, tier: 'experience' },
};

let ic24Storage = null;

function ic24InitStorage() {
  ic24InitFirebase();
  if (typeof firebase.storage !== 'function') {
    throw new Error('Firebase Storage não carregou. Verifique conexão e reabra o app.');
  }
  if (!ic24Storage) ic24Storage = firebase.storage();
  return ic24Storage;
}

function ic24MaskCpf(cpf) {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return '—';
  return '***.***.' + d.slice(6, 9) + '-' + d.slice(9);
}

function ic24ClassificarDocumentos(docsMap) {
  const uploaded = Object.keys(docsMap || {});
  let score = 0;
  const verified = [];
  const missingRequired = [];
  Object.entries(IC24_DOC_META).forEach(([key, meta]) => {
    if (uploaded.includes(key) && docsMap[key]?.url) {
      score += meta.weight;
      verified.push({ key, label: meta.label, type: meta.type, tier: meta.tier });
    } else if (meta.required) {
      missingRequired.push(meta.label);
    }
  });
  const specs = (window._cuidSpecs || []).length;
  if (specs >= 2) score += 8;
  if (specs >= 4) score += 7;
  let level = 'inicial';
  let label = 'Nível Inicial — documentação incompleta';
  let stars = '★★★☆☆ 4,0';
  const hasAntec = uploaded.includes('antecedentes');
  const hasCurso = uploaded.includes('curso') || uploaded.includes('diploma');
  if (score >= 85 && hasAntec && hasCurso) {
    level = 'senior';
    label = 'Nível Sênior — Especialista certificado';
    stars = '★★★★★ 4,9';
  } else if (score >= 65 && hasAntec) {
    level = 'pleno';
    label = 'Nível Pleno — Certificado pelo app';
    stars = '★★★★☆ 4,7';
  } else if (score >= 45) {
    level = 'junior';
    label = 'Nível Júnior — Em validação';
    stars = '★★★★☆ 4,5';
  }
  return { score, level, label, stars, verified, missingRequired, documentsCount: verified.length };
}

function ic24NormalizeUploadFile(file) {
  if (!file) throw new Error('Arquivo inválido');
  let type = file.type || '';
  if (!type || type === 'application/octet-stream') {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.heic') || name.endsWith('.heif')) type = 'image/jpeg';
    else if (name.endsWith('.png')) type = 'image/png';
    else if (name.endsWith('.webp')) type = 'image/webp';
    else type = 'image/jpeg';
  }
  if (/heic|heif/i.test(type)) type = 'image/jpeg';
  return { file, contentType: type };
}

/** Prévia local — NÃO faz upload (iOS HEIC + falha Firebase apagava a foto). */
function ic24PreviewFotoPerfil(file, previewId, txtId, boxId) {
  if (!file) return;
  window._pendingProfilePhoto = file;
  window._photoLocalOk = true;
  const img = document.getElementById(previewId);
  const txt = document.getElementById(txtId);
  const box = boxId ? document.getElementById(boxId) : null;
  const show = (url) => {
    if (img) {
      img.src = url;
      img.style.display = 'block';
    }
    if (txt) txt.style.display = 'none';
    if (box) box.classList.add('has');
  };
  try {
    show(URL.createObjectURL(file));
  } catch (_) {
    const r = new FileReader();
    r.onload = () => show(r.result);
    r.onerror = () => toast('Prévia indisponível — foto será enviada ao continuar');
    r.readAsDataURL(file);
  }
  toast('Foto selecionada');
}

function ic24FotoPerfilOk() {
  return !!(
    window._photoUploaded ||
    window._pendingProfilePhoto ||
    window._photoLocalOk ||
    (window._cuidPainel && window._cuidPainel.photoUrl)
  );
}

async function ic24UploadFotoPerfil(file) {
  if (!file) throw new Error('Selecione uma foto');
  const { file: f, contentType } = ic24NormalizeUploadFile(file);
  ic24InitStorage();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como cuidador');
  let ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  if (/heic|heif/i.test(ext) || /heic|heif/i.test(contentType)) ext = 'jpg';
  const path = 'caregivers/' + uid + '/profile/photo_' + Date.now() + '.' + ext;
  const ref = ic24Storage.ref().child(path);
  const snap = await ref.put(f, { contentType });
  const url = await snap.ref.getDownloadURL();
  await ic24Db.collection('caregivers').doc(uid).set(
    { photoUrl: url, photoPath: path, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );
  if (typeof ic24RecomputeCurriculo === 'function') await ic24RecomputeCurriculo(uid);
  return url;
}

async function ic24UploadDocumento(docKey, file) {
  if (!file) throw new Error('Selecione uma foto');
  const meta = IC24_DOC_META[docKey];
  if (!meta) throw new Error('Tipo de documento inválido');
  const { file: f, contentType } = ic24NormalizeUploadFile(file);
  ic24InitStorage();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como cuidador');
  const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = 'caregivers/' + uid + '/documents/' + docKey + '_' + Date.now() + '.' + ext;
  const ref = ic24Storage.ref().child(path);
  const snap = await ref.put(f, { contentType });
  const url = await snap.ref.getDownloadURL();
  const docData = {
    documentType: meta.type,
    docKey,
    label: meta.label,
    fileUrl: url,
    storagePath: path,
    status: 'pending_review',
    uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await ic24Db.collection('caregivers').doc(uid).collection('documents').doc(docKey).set(docData, { merge: true });
  await ic24RecomputeCurriculo(uid);
  return { url, docKey, label: meta.label };
}

async function ic24ListDocumentos(uid) {
  ic24InitFirebase();
  const snap = await ic24Db.collection('caregivers').doc(uid).collection('documents').get();
  const map = {};
  snap.docs.forEach((d) => {
    map[d.id] = { id: d.id, ...d.data() };
  });
  return map;
}

async function ic24MontarCurriculoSnapshot(uid, opts = {}) {
  ic24InitFirebase();
  let docsMap = {};
  try {
    docsMap = await ic24ListDocumentos(uid);
  } catch (_) {
    /* família pode não ter permissão em documentos ainda não aprovados */
  }
  const cgSnap = await ic24Db.collection('caregivers').doc(uid).get();
  if (!cgSnap.exists) throw new Error('Cuidador não encontrado');
  const cg = cgSnap.data() || {};
  let fullName = String(cg.fullName || '').trim();
  if (!fullName) {
    const userSnap = await ic24Db.collection('users').doc(uid).get();
    fullName = String(userSnap.data()?.fullName || ic24Auth.currentUser?.displayName || '').trim();
  }
  if (!fullName && !String(cg.cpf || '').replace(/\D/g, '')) {
    throw new Error('Complete seu nome no cadastro antes de gerar o currículo');
  }
  const classification = ic24ClassificarDocumentos(
    Object.fromEntries(Object.entries(docsMap).map(([k, v]) => [k, { url: v.fileUrl }])),
  );
  const documentsPublic = Object.entries(docsMap).map(([key, d]) => ({
    key,
    type: d.documentType,
    label: d.label || IC24_DOC_META[key]?.label || key,
    url: d.fileUrl,
    status: d.status || 'pending_review',
    verified: d.status === 'approved' || classification.verified.some((v) => v.key === key),
  }));
  const curriculum = {
    caregiverId: uid,
    fullName: fullName || cg.fullName || '',
    cpfMasked: ic24MaskCpf(cg.cpf),
    bio: cg.bio || '',
    specialties: cg.specialties || [],
    hourRate: cg.hourRate || null,
    dailyRate: cg.dailyRate || null,
    city: cg.city || '',
    state: cg.state || '',
    photoUrl: cg.photoUrl || null,
    classification,
    documents: documentsPublic,
    certificatesVerified: classification.verified.map((v) => v.key),
    rating: cg.rating || 4.5,
    reviewCount: cg.reviewCount || 0,
    kycStatus: classification.missingRequired.length === 0 ? 'pending_review' : 'incomplete',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (opts.persist) {
    await ic24Db.collection('caregivers').doc(uid).set(
      {
        classification,
        documentsCount: classification.documentsCount,
        certificatesVerified: curriculum.certificatesVerified,
        kycStatus: curriculum.kycStatus,
        curriculumUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await ic24Db.collection('curriculum_public').doc(uid).set(curriculum, { merge: true });
  }
  return curriculum;
}

async function ic24RecomputeCurriculo(uid) {
  return ic24MontarCurriculoSnapshot(uid, { persist: true });
}

function ic24Token() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function ic24SolicitarCurriculo(caregiverId) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) throw new Error('Faça login como família/contratante');
  if (!caregiverId) throw new Error('Selecione um cuidador');
  const userSnap = await ic24Db.collection('users').doc(familyId).get();
  if ((userSnap.data()?.role || '') !== 'family') throw new Error('Apenas contratantes podem solicitar currículo');
  const token = ic24Token();
  await ic24Db.collection('cv_requests').doc(token).set({
    token,
    familyId,
    caregiverId,
    status: 'pending',
    familyName: userSnap.data()?.fullName || 'Contratante',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 3600 * 1000)),
  });
  const link = 'curriculo.html?t=' + encodeURIComponent(token);
  return { token, link, caregiverId, status: 'pending' };
}

async function ic24EnviarCurriculoSolicitacao(token) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como cuidador');
  const ref = ic24Db.collection('cv_requests').doc(token);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Solicitação não encontrada');
  const req = snap.data();
  if (req.caregiverId !== uid) throw new Error('Esta solicitação não é para você');
  if (req.status === 'shared') throw new Error('Currículo já enviado');
  const curriculum = await ic24MontarCurriculoSnapshot(uid);
  await ref.update({
    status: 'shared',
    curriculum,
    sharedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return { token, link: 'curriculo.html?t=' + encodeURIComponent(token) };
}

function ic24ListenSolicitacoesCurriculoCuidador(uid, cb) {
  ic24InitFirebase();
  return ic24Db
    .collection('cv_requests')
    .where('caregiverId', '==', uid)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .onSnapshot(
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => cb([]),
    );
}

async function ic24CarregarCurriculoPorToken(token) {
  ic24InitFirebase({ requireAuth: false });
  const reqSnap = await ic24Db.collection('cv_requests').doc(token).get();
  if (!reqSnap.exists) throw new Error('Solicitação não encontrada ou link inválido');
  const req = reqSnap.data();
  if (req.expiresAt && req.expiresAt.toDate() < new Date()) throw new Error('Link expirado — solicite novamente');
  if (req.status !== 'shared') throw new Error('O cuidador ainda não liberou este currículo');
  let curriculum = req.curriculum;
  if (!curriculum) {
    const curSnap = await ic24Db.collection('curriculum_public').doc(req.caregiverId).get();
    if (!curSnap.exists) throw new Error('Currículo não encontrado');
    curriculum = curSnap.data();
  }
  delete curriculum.email;
  delete curriculum.phone;
  delete curriculum.address;
  return { request: req, curriculum };
}

async function ic24ListarCuidadoresAprovados() {
  ic24InitFirebase();
  const snap = await ic24Db.collection('caregivers').where('approved', '==', true).limit(20).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
