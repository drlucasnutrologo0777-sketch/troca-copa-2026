/**
 * Cria/recupera sandbox: drlucasnutrologo0777@gmail.com / Teste@123
 * como babá com taxa IAP US$ 1,99 pendente + valida UI propostas/design.
 * node scripts/setup_sandbox_drlucas.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT = 'baba-on-3634a';
const EMAIL = 'drlucasnutrologo0777@gmail.com';
const PASS = 'Teste@123';
const FEE = 1.99;
const TRY_PASS = ['Teste@123', 'teste@123', 'Demo123!', 'demo123!', '123456', 'Teste123!', 'teste123'];

function loadApiKey() {
  return readFileSync(join(__dir, '../web_app/firebase-ic24.js'), 'utf8').match(
    /apiKey:\s*['"]([^'"]+)['"]/,
  )[1];
}
async function json(url, opts = {}) {
  const r = await fetch(url, opts);
  const t = await r.text();
  let j;
  try {
    j = JSON.parse(t);
  } catch {
    j = { raw: t };
  }
  if (!r.ok) throw new Error((j.error?.message || t).slice(0, 500));
  return j;
}
function fv(type, value) {
  if (type === 'double') return { doubleValue: value };
  if (type === 'int') return { integerValue: String(value) };
  if (type === 'bool') return { booleanValue: value };
  if (type === 'ts') return { timestampValue: new Date().toISOString() };
  if (type === 'null') return { nullValue: null };
  if (type === 'arr') return { arrayValue: { values: (value || []).map((v) => ({ stringValue: String(v) })) } };
  return { stringValue: String(value) };
}
function field(fields, key) {
  const f = fields?.[key];
  if (!f) return null;
  if (f.stringValue != null) return f.stringValue;
  if (f.booleanValue != null) return f.booleanValue;
  if (f.doubleValue != null) return Number(f.doubleValue);
  if (f.integerValue != null) return Number(f.integerValue);
  return null;
}
async function getDoc(token, path) {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
    { headers: { Authorization: 'Bearer ' + token } },
  );
  if (r.status === 404) return null;
  const j = JSON.parse(await r.text());
  if (!r.ok) throw new Error((j.error?.message || JSON.stringify(j)).slice(0, 400));
  return j;
}
async function patchDoc(token, path, fields) {
  const mask = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&');
  return json(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}?${mask}`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  );
}
async function signIn(email, pass, apiKey) {
  return json(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  });
}
async function signUp(email, pass, apiKey) {
  return json(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  });
}

const apiKey = loadApiKey();
const report = { email: EMAIL, at: new Date().toISOString(), steps: [] };
const log = (s, d) => {
  report.steps.push({ s, d });
  console.log(s, d || '');
};

let auth = null;
let usedPass = PASS;

// 1) tenta senhas conhecidas
for (const p of TRY_PASS) {
  try {
    auth = await signIn(EMAIL, p, apiKey);
    usedPass = p;
    log('LOGIN_OK', `senha=${p} uid=${auth.localId}`);
    break;
  } catch (e) {
    log('login_fail', `${p}: ${e.message.slice(0, 60)}`);
  }
}

// 2) cria se não existir
if (!auth) {
  try {
    auth = await signUp(EMAIL, PASS, apiKey);
    usedPass = PASS;
    log('SIGNUP_OK', `uid=${auth.localId}`);
  } catch (e) {
    log('SIGNUP_FAIL', e.message);
    // Se EMAIL_EXISTS, tenta reset via update não disponível sem admin
    writeFileSync(join(__dir, '_sandbox_drlucas_report.json'), JSON.stringify(report, null, 2));
    console.error('\nConta existe mas senha não bate — reset manual no Firebase Console ou use outra senha.');
    process.exit(1);
  }
}

const uid = auth.localId;
const token = auth.idToken;

// 3) perfil babá completo + taxa pendente (evita rejeição 2.1 botão sem taxa)
await patchDoc(token, `users/${uid}`, {
  email: fv('string', EMAIL),
  role: fv('string', 'caregiver'),
  fullName: fv('string', 'Eder Lucas (Sandbox IAP)'),
  displayName: fv('string', 'Eder Lucas'),
  updatedAt: fv('ts'),
  createdAt: fv('ts'),
});
log('users', 'role=caregiver');

await patchDoc(token, `caregivers/${uid}`, {
  fullName: fv('string', 'Eder Lucas (Sandbox IAP)'),
  email: fv('string', EMAIL),
  approved: fv('bool', true),
  availableToday: fv('bool', true),
  city: fv('string', 'São Paulo'),
  state: fv('string', 'SP'),
  neighborhood: fv('string', 'Pinheiros'),
  dailyRate: fv('double', 280),
  hourRate: fv('double', 45),
  pixKey: fv('string', EMAIL),
  pixTitular: fv('string', 'Eder Lucas'),
  platformFeePending: fv('double', FEE),
  platformFeePendingDiarias: fv('int', 1),
  platformFeeCurrency: fv('string', 'USD'),
  platformFeePendingOfferId: fv('string', 'sandbox_iap_drlucas'),
  platformFeeUpdatedAt: fv('ts'),
  paymentPreferences: {
    mapValue: {
      fields: {
        configured: fv('bool', true),
        paymentSchedule: fv('string', 'diaria'),
        paymentWeekDay: fv('string', 'seg'),
        jobDurationDays: fv('int', 15),
      },
    },
  },
  updatedAt: fv('ts'),
});
log('caregiver', 'taxa US$ 1.99 + approved');

const cg = await getDoc(token, `caregivers/${uid}`);
const pend = field(cg?.fields, 'platformFeePending');
const role = field((await getDoc(token, `users/${uid}`))?.fields, 'role');

const idx = readFileSync(join(__dir, '../web_app/index.html'), 'utf8');
const cob = readFileSync(join(__dir, '../web_app/ic24-cobranca.js'), 'utf8');
const screen = readFileSync(join(__dir, '../lib/screens/web_app_screen.dart'), 'utf8');

const checks = [];
const chk = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(pass ? 'OK  ' : 'FAIL', name, detail || '');
};

chk('login', !!auth, `uid=${uid} pass=${usedPass}`);
chk('role_caregiver', role === 'caregiver', role);
chk('taxa_pendente_1_99', Math.abs((pend || 0) - FEE) < 0.02, `US$ ${pend}`);
chk('botao_taxa_ui', idx.includes('id="taxa-pagar-btn"') && idx.includes('btn.disabled=false'), 'nunca disabled');
chk('produto_iap', cob.includes('bo_taxa_manutencao') && screen.includes('ic24PurchasePlatformFee'), 'bo_taxa_manutencao');
chk('propostas_familia', idx.includes('id="fam-menu-propostas"') && idx.includes('Propostas recebidas'), 'menu-topic');
chk('propostas_baba', idx.includes('id="baba-menu-propostas"') && idx.includes('menu-grid'), 'no grid');
chk(
  'design_itens_antigos',
  ['Babás próximos', 'Plantão urgente', 'Cartão de ponto', 'Diário da criança', 'Currículo Lates', 'Faturamento', 'Taxa do app', 'Oferecer plantão hoje'].every(
    (t) => idx.includes(t),
  ),
  'nenhum sumiu',
);

// Design: propostas não usa card/estilo alienígena — mesmo menu-topic
const famPropostas = idx.match(/id="fam-menu-propostas"[^>]*>[\s\S]*?<\/button>/)?.[0] || '';
chk(
  'design_fam_mesmo_padrao',
  famPropostas.includes('menu-topic') && famPropostas.includes('menu-ic') && famPropostas.includes('menu-arr'),
  'ícone+título+seta',
);
const babaPropostas = idx.match(/id="baba-menu-propostas"[^>]*>[\s\S]*?<\/button>/)?.[0] || '';
chk(
  'design_baba_mesmo_padrao',
  babaPropostas.includes('menu-topic') && babaPropostas.includes('📬'),
  'mesmo componente',
);

report.uid = uid;
report.password = usedPass;
report.pendingFee = pend;
report.checks = checks;
report.howToTestIapOnDevice = [
  'iPhone → Ajustes → App Store → Conta Sandbox → ' + EMAIL + ' (se conta Sandbox Apple; senha pode ser a do App Store Connect Sandbox, não a do Firebase)',
  'TestFlight Babá ON → login Firebase: ' + EMAIL + ' / ' + usedPass,
  'Área da babá → Taxa do app → deve mostrar US$ 1,99 (NÃO 0,00)',
  'Botão: "Pagar taxa via App Store (US$ 1.99)" → concluir compra sandbox bo_taxa_manutencao',
];

writeFileSync(join(__dir, '_sandbox_drlucas_report.json'), JSON.stringify(report, null, 2));
console.log('\n===== RESUMO =====');
const failed = checks.filter((c) => !c.pass);
console.log(`OK ${checks.filter((c) => c.pass).length} | FAIL ${failed.length}`);
if (failed.length) {
  failed.forEach((f) => console.log('FAIL', f.name, f.detail));
  process.exit(1);
}
console.log('\nPRONTO sandbox Firebase:', EMAIL, '/', usedPass, '· taxa US$', pend);
