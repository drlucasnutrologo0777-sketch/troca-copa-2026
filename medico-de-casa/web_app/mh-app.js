/* Medico de Casa — funções app (cadastro, visita, anamnese) */
window._medSpecs = window._medSpecs || [];

function toggleEspecialidadeMed(cb) {
  const v = cb.value;
  const chip = cb.closest('.chip');
  if (cb.checked) {
    if (window._medSpecs.length >= 3) {
      cb.checked = false;
      toast('Máximo 3 especialidades');
      return;
    }
    if (!window._medSpecs.includes(v)) window._medSpecs.push(v);
    chip?.classList.add('on');
  } else {
    window._medSpecs = window._medSpecs.filter((x) => x !== v);
    chip?.classList.remove('on');
  }
  const el = document.getElementById('med-spec-count');
  if (el) el.textContent = window._medSpecs.length + ' de 3: ' + (window._medSpecs.join(', ') || '—');
}

const MH_REQUIRED = MH_REQUIRED_DOCS;

async function finalizarMedicoHome() {
  try {
    const missing = await ic24MissingRequiredDocs();
    if (missing.length) {
      toast('Obrigatório: ' + missing.join(', '));
      if (typeof syncDocumentosUI === 'function') await syncDocumentosUI();
      return;
    }
  } catch (e) {
    toast(e.message || 'Erro ao verificar documentos');
    return;
  }
  await finalizarCuidador();
}

async function publicarPedidoVisita() {
  const specialty = document.getElementById('visita-especialidade')?.value?.trim();
  const qp = document.getElementById('visita-qp')?.value?.trim();
  const urgencia = typeof chipVal === 'function' ? chipVal('visita-urgencia') : 'urgente';
  if (!specialty) {
    toast('Escolha a especialidade');
    return;
  }
  if (!qp || qp.length < 5) {
    toast('Descreva a queixa principal');
    return;
  }
  if (urgencia === 'emergencia') {
    toast('Emergência: ligue 192 (SAMU). Você ainda pode registrar o pedido.');
  }
  const durationMin = chipVal('visita-duracao') || '30';
  const triage = {
    specialty,
    chiefComplaint: qp,
    durationMin: Number(durationMin),
    hda: document.getElementById('visita-hda')?.value?.trim() || '',
    patientName: document.getElementById('visita-paciente')?.value?.trim() || '',
    urgency: urgencia,
    vitals: {
      pa: document.getElementById('visita-pa')?.value?.trim() || null,
      fc: parseFloat(document.getElementById('visita-fc')?.value) || null,
      fr: parseFloat(document.getElementById('visita-fr')?.value) || null,
      temp: parseFloat(document.getElementById('visita-temp')?.value) || null,
      spo2: parseFloat(document.getElementById('visita-spo2')?.value) || null,
      glucose: parseFloat(document.getElementById('visita-glic')?.value) || null,
      pain: parseFloat(document.getElementById('visita-dor')?.value) || null,
    },
    medications: document.getElementById('visita-meds')?.value?.trim() || '',
    allergies: document.getElementById('visita-alergias')?.value?.trim() || '',
    preferredAt: document.getElementById('visita-quando')?.value || null,
  };
  const rate = parseFloat(document.getElementById('visita-valor')?.value) || 0;
  try {
    await ic24CriarOferta({
      title: 'Visita — ' + specialty + ' — ' + qp.slice(0, 40),
      type: 'visit_request',
      specialty,
      triage,
      chiefComplaint: qp,
      patientName: triage.patientName,
      elderlyType: triage.patientName,
      careNeeds: [qp, triage.hda, triage.medications].filter(Boolean).join(' · '),
      dailyRate: rate,
      consultationRate: rate,
      visitDurationMin: Number(durationMin),
      escala: String(durationMin),
      scheduleType: urgencia === 'urgente' ? 'urgente_hoje' : 'agendada',
      urgent: urgencia === 'urgente' || urgencia === 'emergencia',
      urgency: urgencia,
    });
    toast('Pedido de visita publicado — médicos verão em Ofertas');
    if (typeof carregarOfertasFamilia === 'function') await carregarOfertasFamilia();
    show('familia-ofertas');
  } catch (e) {
    toast(e.message || 'Erro ao publicar');
  }
}

function salvarAnamnese() {
  return salvarDiario();
}

function marcarAnamneseAssinada() {
  const box = document.getElementById('anamnese-assinatura');
  if (!box) return;
  box.classList.add('signed');
  box.innerHTML =
    '<p style="color:var(--p);font-weight:600">✓ Registro assinado (CRM)</p><small style="color:var(--m)">' +
    new Date().toLocaleDateString('pt-BR') +
    '</small>';
}

async function mhListarAnamnesesFamilia() {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) return [];
  const snap = await ic24Db
    .collection('anamneses')
    .where('familyId', '==', familyId)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get()
    .catch(async () => {
      const s2 = await ic24Db.collection('anamneses').where('familyId', '==', familyId).limit(20).get();
      return s2;
    });
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function carregarAnamneseFamilia() {
  const box = document.getElementById('fam-anamnese-list');
  if (!box) return;
  box.innerHTML = '<p class="hint">Carregando…</p>';
  try {
    const rows = await mhListarAnamnesesFamilia();
    if (!rows.length) {
      box.innerHTML = '<p class="hint">Nenhuma anamnese ainda — após a visita o médico registra aqui.</p>';
      return;
    }
    box.innerHTML = rows
      .map(
        (a) =>
          '<div class="list-item"><b>' +
          escapeHtml(a.visitDate || '') +
          ' · ' +
          escapeHtml(a.patientName || 'Paciente') +
          '</b><p style="font-size:14px;margin:8px 0;white-space:pre-wrap">' +
          escapeHtml((a.text || '').slice(0, 500)) +
          '</p><small>' +
          (a.signed ? '✓ Assinado' : 'Rascunho') +
          '</small></div>',
      )
      .join('');
  } catch (e) {
    box.innerHTML = '<p class="hint">' + escapeHtml(e.message || 'Erro') + '</p>';
  }
}

const _origShow = typeof show === 'function' ? show : null;
if (_origShow) {
  show = function (id) {
    _origShow(id);
    if (id === 'familia-anamnese') carregarAnamneseFamilia();
  };
}

// Validação cadastro médico etapa 2
const _irEtapa3 = typeof irCuidadorEtapa3 === 'function' ? irCuidadorEtapa3 : null;
if (_irEtapa3) {
  irCuidadorEtapa3 = async function () {
    const specs = window._medSpecs || [];
    const crm = document.getElementById('med-crm-num')?.value?.trim();
    const uf = document.getElementById('med-crm-uf')?.value?.trim();
    if (!specs.length) {
      toast('Escolha ao menos 1 especialidade (máx. 3)');
      return;
    }
    if (!crm || !uf) {
      toast('Informe CRM e UF');
      return;
    }
    window._cuidSpecs = specs;
    return _irEtapa3();
  };
}

const _assinarDiarioOrig = typeof assinarDiario === 'function' ? assinarDiario : null;
if (_assinarDiarioOrig) {
  assinarDiario = async function () {
    await _assinarDiarioOrig();
    marcarAnamneseAssinada();
  };
}

async function publicarOfertaUrgente() {
  return publicarPedidoVisita();
}
