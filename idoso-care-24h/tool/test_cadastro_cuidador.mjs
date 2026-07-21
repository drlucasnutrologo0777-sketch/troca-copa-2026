/** Testes locais — cadastro cuidador (sem Firebase). */
const IC24_DOCS_OBRIGATORIOS = ['rg', 'comprovante', 'antecedentes'];

function ic24AvaliarCadastroCuidador(d, docsMap) {
  d = d || {};
  docsMap = docsMap || {};
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!d.street || !d.number || cep.length !== 8 || !d.city || !d.state) {
    return { complete: false, screen: 'cuidador-etapa1', message: 'Complete seu endereço para continuar o cadastro' };
  }
  if (!(d.bio || '').trim()) {
    return { complete: false, screen: 'cuidador-etapa2', message: 'Conte sobre você e suas especialidades' };
  }
  if (!d.photoUrl) {
    return { complete: false, screen: 'cuidador-etapa2', message: 'Envie sua foto de perfil' };
  }
  const missingDocs = IC24_DOCS_OBRIGATORIOS.filter((k) => !docsMap[k]?.fileUrl);
  if (missingDocs.length) {
    return {
      complete: false,
      screen: 'cuidador-etapa3',
      message: 'Envie os documentos pendentes (fotos)',
      missingDocs,
    };
  }
  return { complete: true, screen: 'cuidador-painel', message: '' };
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

ok('sem endereco -> etapa1', ic24AvaliarCadastroCuidador({}, {}).screen === 'cuidador-etapa1');
ok(
  'endereco ok sem bio -> etapa2',
  ic24AvaliarCadastroCuidador(
    { street: 'Rua A', number: '1', cep: '01310100', city: 'SP', state: 'SP' },
    {}
  ).screen === 'cuidador-etapa2'
);
ok(
  'bio ok sem foto -> etapa2',
  ic24AvaliarCadastroCuidador(
    {
      street: 'Rua A',
      number: '1',
      cep: '01310100',
      city: 'SP',
      state: 'SP',
      bio: 'Cuidadora experiente',
    },
    {}
  ).screen === 'cuidador-etapa2'
);

const base = {
  street: 'Rua A',
  number: '1',
  cep: '01310100',
  city: 'SP',
  state: 'SP',
  bio: 'Cuidadora',
  photoUrl: 'https://example.com/foto.jpg',
};
const rDocs = ic24AvaliarCadastroCuidador(base, {});
ok('foto ok sem docs -> etapa3', rDocs.screen === 'cuidador-etapa3' && rDocs.missingDocs?.length === 3);

const soObrigatorios = {
  rg: { fileUrl: 'x' },
  comprovante: { fileUrl: 'x' },
  antecedentes: { fileUrl: 'x' },
};
ok(
  '3 docs obrigatorios -> painel',
  ic24AvaliarCadastroCuidador(base, soObrigatorios).complete === true &&
    ic24AvaliarCadastroCuidador(base, soObrigatorios).screen === 'cuidador-painel'
);
ok(
  'sem curso/diploma/cpf -> painel ok',
  ic24AvaliarCadastroCuidador(base, soObrigatorios).complete === true
);

ok('HEIC ext -> image/jpeg', ic24NormalizeUploadFile({ name: 'foto.HEIC', type: 'application/octet-stream' }).contentType === 'image/jpeg');
ok('HEIC mime -> image/jpeg', ic24NormalizeUploadFile({ name: 'foto.jpg', type: 'image/heic' }).contentType === 'image/jpeg');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
