/** Mapa do fluxo cuidador — retoma etapa vs menu (sem Firebase). */
const IC24_DOCS_OBRIGATORIOS = ['rg', 'comprovante', 'antecedentes'];

function ic24AvaliarCadastroCuidador(d, docsMap) {
  d = d || {};
  docsMap = docsMap || {};
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!d.street || !d.number || cep.length !== 8 || !d.city || !d.state) {
    return { complete: false, screen: 'cuidador-etapa1', message: 'endereco' };
  }
  if (!(d.bio || '').trim()) {
    return { complete: false, screen: 'cuidador-etapa2', message: 'bio' };
  }
  if (!d.photoUrl) {
    return { complete: false, screen: 'cuidador-etapa2', message: 'foto' };
  }
  const missingDocs = IC24_DOCS_OBRIGATORIOS.filter((k) => !docsMap[k]?.fileUrl);
  if (missingDocs.length) {
    return { complete: false, screen: 'cuidador-etapa3', message: 'docs', missingDocs };
  }
  return { complete: true, screen: 'cuidador-painel', message: 'ok' };
}

const base = {
  street: 'Rua A',
  number: '1',
  cep: '01310100',
  city: 'SP',
  state: 'SP',
  bio: 'Cuidadora',
  photoUrl: 'https://example.com/foto.jpg',
};

let passed = 0;
let failed = 0;
function ok(name, cond) {
  if (cond) {
    passed++;
    console.log('PASS:', name);
  } else {
    failed++;
    console.error('FAIL:', name);
  }
}

ok('sem endereco retoma etapa1', ic24AvaliarCadastroCuidador({}, {}).screen === 'cuidador-etapa1');
ok('sem bio retoma etapa2', ic24AvaliarCadastroCuidador({ ...base, bio: '' }, {}).screen === 'cuidador-etapa2');
ok('sem foto retoma etapa2', ic24AvaliarCadastroCuidador({ ...base, photoUrl: '' }, {}).screen === 'cuidador-etapa2');
ok(
  'sem docs retoma etapa3 (nao menu)',
  ic24AvaliarCadastroCuidador(base, {}).screen === 'cuidador-etapa3'
);
ok(
  'docs ok abre menu',
  ic24AvaliarCadastroCuidador(base, {
    rg: { fileUrl: 'x' },
    comprovante: { fileUrl: 'x' },
    antecedentes: { fileUrl: 'x' },
  }).complete
);
ok(
  'cpf numero nao bloqueia menu se docs ok',
  ic24AvaliarCadastroCuidador(
    { ...base, cpf: '' },
    { rg: { fileUrl: 'x' }, comprovante: { fileUrl: 'x' }, antecedentes: { fileUrl: 'x' } }
  ).screen === 'cuidador-painel'
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
