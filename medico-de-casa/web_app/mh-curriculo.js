/* Medico de Casa — documentos médicos (Storage + Firestore doctors/) */

const IC24_DOC_META = {
  crm: { type: 'CRM', label: 'CRM — Conselho Regional de Medicina', weight: 35, tier: 'compliance', required: true },
  comprovante: { type: 'Comprovante', label: 'Comprovante de endereço', weight: 10, tier: 'identity', required: true },
  diploma: { type: 'DiplomaMedicina', label: 'Diploma de Medicina', weight: 30, tier: 'education', required: true },
  rg: { type: 'RG', label: 'RG — documento de identidade', weight: 10, tier: 'identity', required: true },
  especialidade: { type: 'Especialidade', label: 'Comprovante de especialidade (RQE)', weight: 20, tier: 'education' },
  pos: { type: 'PosGraduacao', label: 'Diploma pós-graduação', weight: 15, tier: 'education' },
  outros: { type: 'OutrosCert', label: 'Outros certificados', weight: 5, tier: 'education' },
  cpf: { type: 'CPF', label: 'CPF', weight: 5, tier: 'identity' },
};

/** Obrigatórios no cadastro — especialidade e pós são opcionais. */
const MH_REQUIRED_DOCS = ['crm', 'comprovante', 'diploma', 'rg'];

const MH_STORAGE_PREFIX = 'doctors';

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
  const hasRg = uploaded.includes('rg');
  if (score >= 80 && hasCrm && hasDiploma && hasEndereco && hasRg) {
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
    if (name.endsWith('.heic') || name.endsWith('.heif')) type = 'image/jpeg';
    else if (name.endsWith('.png')) type = 'image/png';
    else if (name.endsWith('.webp')) type = 'image/webp';
    else if (name.endsWith('.pdf')) type = 'application/pdf';
    else type = 'image/jpeg';
  }
  if (/heic|heif/i.test(type)) type = 'image/jpeg';
  return { file, contentType: type };
}

/** iPhone envia HEIC — converte para JPEG real antes do Firebase Storage. */
async function ic24ConvertToJpegBlob(file) {
  const { file: f, contentType } = ic24NormalizeUploadFile(file);
  const name = (f.name || '').toLowerCase();
  const isHeic = /heic|heif/i.test(f.type || '') || /heic|heif/i.test(name);
  const isOctet = !f.type || f.type === 'application/octet-stream';
  if (!isHeic && !isOctet && (contentType === 'image/png' || contentType === 'image/jpeg' || contentType === 'image/webp')) {
    return f;
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const max = 1600;
      let w = img.naturalWidth || max;
      let h = img.naturalHeight || max;
      if (w > max || h > max) {
        const scale = max / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error('Não foi possível processar a foto — tente outra imagem'));
            return;
          }
          resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.9,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Foto ilegível — tire outra ou escolha JPG/PNG da galeria'));
    };
    img.src = url;
  });
}

/** Prévia local — mantém arquivo se upload falhar (iOS). Converte HEIC antes da prévia. */
async function ic24PreviewFotoPerfil(file, previewId, txtId, boxId) {
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
  let previewFile = file;
  const name = (file.name || '').toLowerCase();
  const isHeic = /heic|heif/i.test(file.type || '') || /heic|heif/i.test(name);
  if (isHeic || !file.type || file.type === 'application/octet-stream') {
    try {
      previewFile = await ic24ConvertToJpegBlob(file);
      window._pendingProfilePhoto = previewFile;
    } catch (_) {
      /* mantém original — upload tenta converter depois */
    }
  }
  try {
    show(URL.createObjectURL(previewFile));
  } catch (_) {
    const r = new FileReader();
    r.onload = () => show(r.result);
    r.onerror = () => toast('Prévia indisponível — foto será enviada ao continuar');
    r.readAsDataURL(previewFile);
  }
}

function ic24FotoPerfilOk() {
  return !!(
    window._photoUploaded ||
    window._pendingProfilePhoto ||
    window._photoLocalOk ||
    window._cuidPainel?.photoUrl
  );
}

async function ic24EnsureDoctorDoc() {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como médico');
  const userSnap = await ic24Db.collection('users').doc(uid).get();
  const userData = userSnap.data() || {};
  if (userData.role !== 'doctor' && userData.role !== 'caregiver') {
    await ic24Db.collection('users').doc(uid).set({ role: 'doctor', legacyRole: 'caregiver' }, { merge: true });
  }
  const docSnap = await ic24Db.collection(mhDoctorCol()).doc(uid).get();
  if (!docSnap.exists) {
    await ic24Db.collection(mhDoctorCol()).doc(uid).set(
      {
        fullName: userData.fullName || ic24Auth.currentUser.email || 'Médico',
        email: ic24Auth.currentUser.email || '',
        app: 'medico_de_casa',
        kycStatus: 'incomplete',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}

async function ic24UploadFotoPerfil(file) {
  if (!file) throw new Error('Selecione uma foto');
  ic24InitStorage();
  if (typeof firebase.storage !== 'function') {
    throw new Error('Firebase Storage não carregou — verifique conexão e reabra o app');
  }
  await ic24EnsureDoctorDoc();
  const jpegFile = await ic24ConvertToJpegBlob(file);
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como médico');
  const path = MH_STORAGE_PREFIX + '/' + uid + '/profile/photo_' + Date.now() + '.jpg';
  const ref = ic24Storage.ref().child(path);
  const snap = await ref.put(jpegFile, { contentType: 'image/jpeg' });
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
  ic24InitStorage();
  await ic24EnsureDoctorDoc();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como médico');
  let uploadFile;
  let contentType;
  if ((file.type || '').includes('pdf') || (file.name || '').toLowerCase().endsWith('.pdf')) {
    ({ file: uploadFile, contentType } = ic24NormalizeUploadFile(file));
  } else {
    uploadFile = await ic24ConvertToJpegBlob(file);
    contentType = 'image/jpeg';
  }
  const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg';
  const path = MH_STORAGE_PREFIX + '/' + uid + '/documents/' + docKey + '_' + Date.now() + '.' + ext;
  const ref = ic24Storage.ref().child(path);
  const snap = await ref.put(uploadFile, { contentType });
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

function ic24DocEnviado(docsMap, key) {
  const d = docsMap && docsMap[key];
  return !!(d && (d.fileUrl || d.url));
}

async function ic24MissingRequiredDocs(docsMap) {
  if (!docsMap) {
    ic24InitFirebase();
    const uid = ic24Auth.currentUser?.uid;
    if (!uid) throw new Error('Faça login como médico');
    docsMap = await ic24ListDocumentos(uid);
  }
  return MH_REQUIRED_DOCS.filter((k) => !ic24DocEnviado(docsMap, k)).map((k) => IC24_DOC_META[k]?.label || k);
}

function ic24DocsObrigatoriosOk(docsMap) {
  return MH_REQUIRED_DOCS.every((k) => ic24DocEnviado(docsMap, k));
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

function ic24SanitizeCurriculoPublico(c) {
  const out = { ...(c || {}) };
  delete out.email;
  delete out.phone;
  delete out.street;
  delete out.number;
  delete out.complement;
  delete out.neighborhood;
  delete out.cep;
  delete out.cpf;
  return out;
}

async function ic24MontarCurriculoSnapshot(doctorId) {
  const curriculum = await ic24RecomputeCurriculo(doctorId);
  return ic24SanitizeCurriculoPublico(curriculum);
}

async function ic24SolicitarCurriculo(doctorId) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) throw new Error('Faça login como paciente/familiar');
  if (!doctorId) throw new Error('Informe o ID do médico');
  const userSnap = await ic24Db.collection('users').doc(familyId).get();
  const role = userSnap.data()?.role || '';
  if (role !== 'patient' && role !== 'family') throw new Error('Apenas pacientes podem solicitar currículo');
  const token = ic24Token();
  await ic24Db.collection('cv_requests').doc(token).set({
    token,
    familyId,
    doctorId,
    caregiverId: doctorId,
    status: 'pending',
    familyName: userSnap.data()?.fullName || 'Paciente',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 3600 * 1000)),
  });
  return {
    token,
    link: 'curriculo.html?t=' + encodeURIComponent(token),
    doctorId,
    caregiverId: doctorId,
    status: 'pending',
  };
}

async function ic24EnviarCurriculoSolicitacao(token) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como médico');
  const ref = ic24Db.collection('cv_requests').doc(token);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Solicitação não encontrada');
  const req = snap.data();
  const docId = req.doctorId || req.caregiverId;
  if (docId !== uid) throw new Error('Esta solicitação não é para você');
  if (req.status === 'shared') throw new Error('Currículo já enviado');
  const curriculum = await ic24MontarCurriculoSnapshot(uid);
  if (!(curriculum.documents || []).some((d) => d.url)) {
    throw new Error('Envie seus documentos no currículo antes de liberar ao paciente');
  }
  await ref.update({
    status: 'shared',
    curriculum,
    sharedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return { token, link: 'curriculo.html?t=' + encodeURIComponent(token), status: 'shared' };
}

function ic24ListenSolicitacoesCurriculoDoctor(uid, cb) {
  ic24InitFirebase();
  return ic24Db
    .collection('cv_requests')
    .where('doctorId', '==', uid)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .onSnapshot(
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, token: d.id, ...d.data() }))),
      () => cb([]),
    );
}

async function ic24CarregarCurriculoPorToken(token) {
  ic24InitFirebase({ requireAuth: false });
  const reqSnap = await ic24Db.collection('cv_requests').doc(token).get();
  if (!reqSnap.exists) throw new Error('Solicitação não encontrada ou link inválido');
  const req = reqSnap.data();
  if (req.expiresAt && req.expiresAt.toDate() < new Date()) throw new Error('Link expirado — solicite novamente');
  if (req.status !== 'shared') throw new Error('O médico ainda não autorizou este currículo — aguarde a liberação');
  let curriculum = req.curriculum;
  const docId = req.doctorId || req.caregiverId;
  if (!curriculum && docId) {
    try {
      ic24InitFirebase();
      if (ic24Auth.currentUser) {
        const curSnap = await ic24Db.collection('curriculum_public').doc(docId).get();
        if (curSnap.exists) curriculum = curSnap.data();
      }
    } catch (_) {
      /* snapshot embutido é a fonte principal */
    }
  }
  if (!curriculum) throw new Error('Currículo não disponível — peça ao médico para autorizar novamente');
  curriculum = ic24SanitizeCurriculoPublico(curriculum);
  return { request: req, curriculum };
}
