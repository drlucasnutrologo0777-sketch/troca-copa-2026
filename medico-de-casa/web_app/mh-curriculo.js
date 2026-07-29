/* Medico de Casa — documentos médicos (Storage + Firestore doctors/) */

const IC24_DOC_META = {
  crm: { type: 'CRM', label: 'CRM — Conselho Regional de Medicina', weight: 35, tier: 'compliance', required: true },
  comprovante: { type: 'Comprovante', label: 'Comprovante de endereço', weight: 10, tier: 'identity', required: true },
  diploma: { type: 'DiplomaMedicina', label: 'Diploma de Medicina', weight: 30, tier: 'education', required: true },
  especialidade: { type: 'Especialidade', label: 'Comprovante de especialidade (RQE)', weight: 20, tier: 'education' },
  pos: { type: 'PosGraduacao', label: 'Diploma pós-graduação', weight: 15, tier: 'education' },
  outros: { type: 'OutrosCert', label: 'Outros certificados', weight: 5, tier: 'education' },
  rg: { type: 'RG', label: 'RG', weight: 5, tier: 'identity' },
  cpf: { type: 'CPF', label: 'CPF', weight: 5, tier: 'identity' },
};

const MH_STORAGE_PREFIX = 'doctors';

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
  const specs = (cg.specialties || window._medSpecs || []).length;
  if (specs >= 1) score += 10;
  if (specs >= 2) score += 8;
  if (specs >= 3) score += 7;
  if ((cg.crmNumber || cg.crm) && cg.crmUf) score += 15;
  let level = 'inicial';
  let label = 'Cadastro incompleto — envie documentos obrigatórios';
  let stars = '★★★☆☆ 4,0';
  const hasCrm = uploaded.includes('crm');
  const hasDiploma = uploaded.includes('diploma');
  const hasEndereco = uploaded.includes('comprovante');
  if (score >= 80 && hasCrm && hasDiploma && hasEndereco) {
    level = 'senior';
    label = 'Médico verificado — documentação completa';
    stars = '★★★★★ 4,9';
  } else if (score >= 55 && hasCrm && hasEndereco) {
    level = 'pleno';
    label = 'Em validação — CRM e endereço OK';
    stars = '★★★★☆ 4,7';
  } else if (score >= 35) {
    level = 'junior';
    label = 'Pendente — falta documentação obrigatória';
    stars = '★★★☆☆ 4,2';
  }
  return { score, level, label, stars, verified, missingRequired, documentsCount: verified.length };
}

function ic24NormalizeUploadFile(file) {
  if (!file) throw new Error('Arquivo inválido');
  let type = file.type || '';
  if (!type || type === 'application/octet-stream') {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.png')) type = 'image/png';
    else if (name.endsWith('.pdf')) type = 'application/pdf';
    else type = 'image/jpeg';
  }
  return { file, contentType: type };
}

async function ic24UploadFotoPerfil(file) {
  if (!file) throw new Error('Selecione uma foto');
  const { file: f, contentType } = ic24NormalizeUploadFile(file);
  ic24InitStorage();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como médico');
  const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = MH_STORAGE_PREFIX + '/' + uid + '/profile/photo_' + Date.now() + '.' + ext;
  const ref = ic24Storage.ref().child(path);
  const snap = await ref.put(f, { contentType });
  const url = await snap.ref.getDownloadURL();
  await ic24Db.collection(mhDoctorCol()).doc(uid).set(
    { photoUrl: url, photoPath: path, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );
  if (typeof ic24RecomputeCurriculo === 'function') await ic24RecomputeCurriculo(uid);
  return url;
}

async function ic24UploadDocumento(docKey, file) {
  if (!file) throw new Error('Selecione um arquivo');
  const meta = IC24_DOC_META[docKey];
  if (!meta) throw new Error('Tipo de documento inválido');
  const { file: f, contentType } = ic24NormalizeUploadFile(file);
  ic24InitStorage();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como médico');
  const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = MH_STORAGE_PREFIX + '/' + uid + '/documents/' + docKey + '_' + Date.now() + '.' + ext;
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
    required: !!meta.required,
    uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await ic24Db.collection(mhDoctorCol()).doc(uid).collection('documents').doc(docKey).set(docData, { merge: true });
  await ic24RecomputeCurriculo(uid);
  return { url, docKey, label: meta.label };
}

async function ic24ListDocumentos(uid) {
  ic24InitFirebase();
  const snap = await ic24Db.collection(mhDoctorCol()).doc(uid).collection('documents').get();
  const map = {};
  snap.docs.forEach((d) => {
    map[d.id] = { id: d.id, ...d.data() };
  });
  return map;
}

async function ic24RecomputeCurriculo(uid) {
  ic24InitFirebase();
  const docsMap = await ic24ListDocumentos(uid);
  const cgSnap = await ic24Db.collection(mhDoctorCol()).doc(uid).get();
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
    doctorId: uid,
    caregiverId: uid,
    fullName: cg.fullName || '',
    email: cg.email || '',
    cpfMasked: ic24MaskCpf(cg.cpf),
    bio: cg.bio || '',
    specialties: cg.specialties || [],
    crm: cg.crm || (cg.crmNumber && cg.crmUf ? cg.crmNumber + '/' + cg.crmUf : null),
    consultationRate: cg.consultationRate || cg.dailyRate || null,
    dailyRate: cg.dailyRate || cg.consultationRate || null,
    city: cg.city || '',
    state: cg.state || '',
    photoUrl: cg.photoUrl || null,
    classification,
    documents: documentsPublic,
    certificatesVerified: classification.verified.map((v) => v.key),
    rating: cg.rating || 4.5,
    reviewCount: cg.reviewCount || 0,
    kycStatus: classification.missingRequired?.length ? 'incomplete' : 'pending_review',
    app: 'medico_de_casa',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await ic24Db.collection(mhDoctorCol()).doc(uid).set(
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

async function ic24SolicitarCurriculo(doctorId) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) throw new Error('Faça login como paciente/familiar');
  const userSnap = await ic24Db.collection('users').doc(familyId).get();
  const role = userSnap.data()?.role || '';
  if (role !== 'patient' && role !== 'family') throw new Error('Apenas pacientes podem solicitar currículo');
  const token = ic24Token();
  const curSnap = await ic24Db.collection('curriculum_public').doc(doctorId).get();
  if (!curSnap.exists) {
    if (typeof ic24RecomputeCurriculo === 'function') await ic24RecomputeCurriculo(doctorId);
    const cur2 = await ic24Db.collection('curriculum_public').doc(doctorId).get();
    if (!cur2.exists) throw new Error('Currículo ainda não disponível — médico precisa enviar documentos');
  }
  const curriculum = (await ic24Db.collection('curriculum_public').doc(doctorId).get()).data();
  await ic24Db.collection('cv_requests').doc(token).set({
    token,
    familyId,
    doctorId,
    caregiverId: doctorId,
    status: 'shared',
    familyName: userSnap.data()?.fullName || 'Paciente',
    curriculum,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    sharedAt: firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 3600 * 1000)),
  });
  return { token, link: 'curriculo.html?t=' + encodeURIComponent(token), doctorId, caregiverId: doctorId };
}

async function ic24CarregarCurriculoPorToken(token) {
  ic24InitFirebase();
  const reqSnap = await ic24Db.collection('cv_requests').doc(token).get();
  if (!reqSnap.exists) throw new Error('Solicitação não encontrada ou link inválido');
  const req = reqSnap.data();
  if (req.expiresAt && req.expiresAt.toDate() < new Date()) throw new Error('Link expirado — solicite novamente');
  let curriculum = req.curriculum;
  const docId = req.doctorId || req.caregiverId;
  if (!curriculum && docId) {
    const curSnap = await ic24Db.collection('curriculum_public').doc(docId).get();
    if (!curSnap.exists) throw new Error('Currículo não encontrado');
    curriculum = curSnap.data();
  }
  return { request: req, curriculum };
}
