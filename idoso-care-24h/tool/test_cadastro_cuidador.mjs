/** Testes locais — cadastro cuidador (sem Firebase). */
const IC24_DOCS_OBRIGATORIOS = ['rg_frente', 'rg_verso', 'comprovante', 'antecedentes'];
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
  return ic24DocsFaltando(docsMap).map((k) => IC24_DOC_LABELS[k] || k).join(', ');
}

function ic24AvaliarCadastroCuidador(d, docsMap) {
  d = d || {};
  docsMap = docsMap || {};
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!d.street || !d.number || cep.length !== 8 || !d.city || !d.state) {
    return { complete: false, screen: 'cuidador-etapa1' };
  }
  if (!(d.bio || '').trim()) {
    return { complete: false, screen: 'cuidador-etapa2' };
  }
  if (!d.photoUrl) {
    return { complete: false, screen: 'cuidador-etapa2' };
  }
  const missingDocs = IC24_DOCS_OBRIGATORIOS.filter((k) => !ic24DocUploaded(k, docsMap));
  if (missingDocs.length) {
    return { complete: false, screen: 'cuidador-etapa3', missingDocs };
  }
  return { complete: true, screen: 'cuidador-painel' };
}

let passed = 0;
let failed = 0;
function ok(name, cond) {
  if (cond) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

const base = {
  street: 'Rua A', number: '1', cep: '01310100', city: 'SP', state: 'SP',
  bio: 'Cuidadora', photoUrl: 'https://example.com/foto.jpg',
};

const obrigatorios = {
  rg_frente: { fileUrl: 'x' },
  rg_verso: { fileUrl: 'x' },
  comprovante: { fileUrl: 'x' },
  antecedentes: { fileUrl: 'x' },
};

ok('4 obrigatorios sem curso/diploma/experiencia -> painel', ic24AvaliarCadastroCuidador(base, obrigatorios).complete === true);
ok('sem rg verso -> etapa3', ic24AvaliarCadastroCuidador(base, { ...obrigatorios, rg_verso: null }).screen === 'cuidador-etapa3');
ok('mensagem so lista faltantes', ic24DocsFaltandoMsg({ rg_frente: { fileUrl: 'x' }, comprovante: { fileUrl: 'x' }, antecedentes: { fileUrl: 'x' } }) === 'RG verso');
ok('legado rg conta so frente', ic24DocUploaded('rg_frente', { rg: { fileUrl: 'x' } }) && !ic24DocUploaded('rg_verso', { rg: { fileUrl: 'x' } }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
