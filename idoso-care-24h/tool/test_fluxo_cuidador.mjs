const IC24_DOCS_OBRIGATORIOS = ['rg_frente', 'rg_verso', 'comprovante', 'antecedentes'];

function ic24DocUploaded(docKey, docsMap) {
  docsMap = docsMap || {};
  if (docsMap[docKey]?.fileUrl) return true;
  if (docKey === 'rg_frente' && docsMap.rg?.fileUrl) return true;
  return false;
}

function ic24AvaliarCadastroCuidador(d, docsMap) {
  d = d || {};
  docsMap = docsMap || {};
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!d.street || !d.number || cep.length !== 8 || !d.city || !d.state) {
    return { complete: false, screen: 'cuidador-etapa1' };
  }
  if (!(d.bio || '').trim() || !d.photoUrl) {
    return { complete: false, screen: 'cuidador-etapa2' };
  }
  const missingDocs = IC24_DOCS_OBRIGATORIOS.filter((k) => !ic24DocUploaded(k, docsMap));
  if (missingDocs.length) {
    return { complete: false, screen: 'cuidador-etapa3', missingDocs };
  }
  return { complete: true, screen: 'cuidador-painel' };
}

const base = {
  street: 'Rua A', number: '1', cep: '01310100', city: 'SP', state: 'SP',
  bio: 'Cuidadora', photoUrl: 'https://example.com/foto.jpg',
};

const obr = {
  rg_frente: { fileUrl: 'x' }, rg_verso: { fileUrl: 'x' },
  comprovante: { fileUrl: 'x' }, antecedentes: { fileUrl: 'x' },
};

let passed = 0, failed = 0;
function ok(n, c) { if (c) { passed++; console.log('PASS:', n); } else { failed++; console.error('FAIL:', n); } }

ok('obrigatorios ok abre menu', ic24AvaliarCadastroCuidador(base, obr).complete);
ok('sem opcionais ainda abre menu', ic24AvaliarCadastroCuidador(base, obr).screen === 'cuidador-painel');
ok('falta antecedentes fica etapa3', ic24AvaliarCadastroCuidador(base, { rg_frente: { fileUrl: 'x' }, rg_verso: { fileUrl: 'x' }, comprovante: { fileUrl: 'x' } }).screen === 'cuidador-etapa3');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
