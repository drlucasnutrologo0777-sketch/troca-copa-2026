/* Idoso Care 24H — documentos (Storage), classificação e currículo público */

const IC24_DOC_META = {
  rg: { type: 'RG', label: 'RG — Registro Geral', weight: 10, tier: 'identity' },
  cpf: { type: 'CPF', label: 'CPF', weight: 10, tier: 'identity', required: true },
  comprovante: { type: 'Comprovante', label: 'Comprovante de endereço', weight: 8, tier: 'identity' },
  ctps: { type: 'CarteiraTrabalho', label: 'Carteira de Trabalho', weight: 12, tier: 'work' },
  antecedentes: { type: 'AntecedentesCriminais', label: 'Antecedentes criminais', weight: 30, tier: 'compliance', required: true },
  diploma: { type: 'Diploma', label: 'Diploma de enfermagem (técnico, auxiliar ou superior)', weight: 20, tier: 'education' },
  curso: { type: 'CursoCuidador', label: 'Curso de Cuidador de Idosos', weight: 25, tier: 'education' },
  inss: { type: 'INSS', label: 'INSS / PIS', weight: 5, tier: 'work' },
  titulo: { type: 'TituloEleitor', label: 'Título de eleitor', weight: 3, tier: 'identity' },
  reservista: { type: 'Reservista', label: 'Certificado de reservista', weight: 3, tier: 'identity' },
  referencia: { type: 'Referencia', label: 'Comprovante de experiência', weight: 12, tier: 'experience' },
};

let ic24Storage = null;

function ic24InitStorage() {
  ic24InitFirebase();
  if (!ic24Storage) ic24Storage = firebase.storage();
  return ic24Storage;
}

function ic24MaskCpf(cpf) {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return '—';
  return '***.***.' + d.slice(6, 9) + '-' + d.slice(9);
}

function ic24ExperienciaCursoOk(cg) {
  return String(cg?.cursoExperienciaTexto || '').trim().length >= 20;
}

function ic24HasCursoOuExperiencia(docsMap, cg) {
  const uploaded = Object.keys(docsMap || {});
  return (uploaded.includes('curso') && docsMap.curso?.url) || ic24ExperienciaCursoOk(cg);
}

function ic24ClassificarDocumentos(docsMap, cg) {
  cg = cg || {};
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
  if (ic24ExperienciaCursoOk(cg) && !uploaded.includes('curso')) {
    score += 15;
    verified.push({ key: 'experiencia', label: 'Experiência como cuidador (descrita)', type: 'Experiencia', tier: 'experience' });
  }
  if (!ic24HasCursoOuExperiencia(docsMap, cg)) {
    missingRequired.push('Curso de cuidador ou descrição de experiência');
  }
  const specs = (window._cuidSpecs || []).length;
  if (specs >= 2) score += 8;
  if (specs >= 4) score += 7;
  let level = 'inicial';
  let label = 'Nível Inicial — documentação incompleta';
  let stars = '★★★☆☆ 4,0';
  const hasAntec = uploaded.includes('antecedentes');
  const hasCurso =
    uploaded.includes('curso') ||
    uploaded.includes('diploma') ||
    ic24ExperienciaCursoOk(cg);
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

async function ic24UploadFotoPerfil(file) {
  if (!file) throw new Error('Selecione uma foto');
  ic24InitStorage();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como cuidador');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = 'caregivers/' + uid + '/profile/photo_' + Date.now() + '.' + ext;
  const ref = ic24Storage.ref().child(path);
  const snap = await ref.put(file, { contentType: file.type || 'image/jpeg' });
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
  ic24InitStorage();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como cuidador');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = 'caregivers/' + uid + '/documents/' + docKey + '_' + Date.now() + '.' + ext;
  const ref = ic24Storage.ref().child(path);
  const snap = await ref.put(file, { contentType: file.type || 'image/jpeg' });
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

async function ic24RecomputeCurriculo(uid) {
  ic24InitFirebase();
  const docsMap = await ic24ListDocumentos(uid);
  const cgSnap = await ic24Db.collection('caregivers').doc(uid).get();
  const cg = cgSnap.exists ? cgSnap.data() : {};
  const classification = ic24ClassificarDocumentos(
    Object.fromEntries(Object.entries(docsMap).map(([k, v]) => [k, { url: v.fileUrl }])),
    cg,
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
    fullName: cg.fullName || '',
    email: cg.email || '',
    cpfMasked: ic24MaskCpf(cg.cpf),
    bio: cg.bio || '',
    specialties: cg.specialties || [],
    hourRate: cg.hourRate || null,
    dailyRate: cg.dailyRate || null,
    city: cg.city || '',
    state: cg.state || '',
    address: cg.address || '',
    photoUrl: cg.photoUrl || null,
    cursoExperienciaTexto: cg.cursoExperienciaTexto || '',
    classification,
    documents: documentsPublic,
    certificatesVerified: classification.verified.map((v) => v.key),
    rating: cg.rating || 4.5,
    reviewCount: cg.reviewCount || 0,
    kycStatus: classification.missingRequired.length === 0 ? 'pending_review' : 'incomplete',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
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
  return curriculum;
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
  const userSnap = await ic24Db.collection('users').doc(familyId).get();
  if ((userSnap.data()?.role || '') !== 'family') throw new Error('Apenas contratantes podem solicitar currículo');
  const token = ic24Token();
  const curSnap = await ic24Db.collection('curriculum_public').doc(caregiverId).get();
  if (!curSnap.exists) throw new Error('Currículo ainda não disponível — cuidador precisa enviar documentos');
  await ic24Db.collection('cv_requests').doc(token).set({
    token,
    familyId,
    caregiverId,
    status: 'shared',
    familyName: userSnap.data()?.fullName || 'Contratante',
    curriculum: curSnap.data(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    sharedAt: firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 3600 * 1000)),
  });
  const link = 'curriculo.html?t=' + encodeURIComponent(token);
  return { token, link, caregiverId };
}

async function ic24CarregarCurriculoPorToken(token) {
  ic24InitFirebase();
  const reqSnap = await ic24Db.collection('cv_requests').doc(token).get();
  if (!reqSnap.exists) throw new Error('Solicitação não encontrada ou link inválido');
  const req = reqSnap.data();
  if (req.expiresAt && req.expiresAt.toDate() < new Date()) throw new Error('Link expirado — solicite novamente');
  let curriculum = req.curriculum;
  if (!curriculum) {
    const curSnap = await ic24Db.collection('curriculum_public').doc(req.caregiverId).get();
    if (!curSnap.exists) throw new Error('Currículo não encontrado');
    curriculum = curSnap.data();
  }
  return { request: req, curriculum };
}

async function ic24ListarCuidadoresAprovados() {
  ic24InitFirebase();
  const snap = await ic24Db.collection('caregivers').where('approved', '==', true).limit(20).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
