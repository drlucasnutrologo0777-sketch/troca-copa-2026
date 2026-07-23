/** Testes locais — cadastro babá (sem Firebase). */
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

function ic24DocsFaltandoMsg(docsMap) {
  return IC24_DOCS_OBRIGATORIOS.filter((k) => !ic24DocUploaded(k, docsMap))
    .map((k) => IC24_DOC_LABELS[k] || k)
    .join(', ');
}

function ic24AvaliarCadastroBaba(d, docsMap) {
  d = d || {};
  docsMap = docsMap || {};
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!d.street || !d.number || cep.length !== 8 || !d.city || !d.state) {
    return { complete: false, screen: 'baba-etapa1' };
  }
  if (!(d.bio || '').trim() || !d.photoUrl) {
    return { complete: false, screen: 'baba-etapa2' };
  }
  if (IC24_DOCS_OBRIGATORIOS.some((k) => !ic24DocUploaded(k, docsMap))) {
    return { complete: false, screen: 'baba-etapa3' };
  }
  return { complete: true, screen: 'baba-painel' };
}

let passed = 0;
let failed = 0;
function ok(name, cond) {
  if (cond) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

const base = {
  street: 'Rua A', number: '1', cep: '01310100', city: 'SP', state: 'SP',
  bio: 'Babá', photoUrl: 'https://example.com/foto.jpg',
};
const obr = {
  rg_frente: { fileUrl: 'x' }, rg_verso: { fileUrl: 'x' },
  comprovante: { fileUrl: 'x' }, antecedentes: { fileUrl: 'x' },
};

ok('4 obrigatorios abre painel', ic24AvaliarCadastroBaba(base, obr).complete);
ok('sem rg verso bloqueia', ic24AvaliarCadastroBaba(base, { ...obr, rg_verso: null }).screen === 'baba-etapa3');
ok('curso opcional nao bloqueia', ic24AvaliarCadastroBaba(base, obr).complete);
ok('msg so rg verso', ic24DocsFaltandoMsg({ rg_frente: { fileUrl: 'x' }, comprovante: { fileUrl: 'x' }, antecedentes: { fileUrl: 'x' } }) === 'RG verso');

function ic24FotoPerfilOk() {
  return !!(global._photoUploaded || global._pendingProfilePhoto || global._photoLocalOk);
}
global._photoLocalOk = true;
ok('foto local ok permite continuar', ic24FotoPerfilOk());
global._photoLocalOk = false;
global._pendingProfilePhoto = null;
global._photoUploaded = false;
ok('sem foto bloqueia', !ic24FotoPerfilOk());

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
