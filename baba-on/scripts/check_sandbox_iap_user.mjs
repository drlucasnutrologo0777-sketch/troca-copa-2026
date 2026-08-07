/**
 * Login sandbox/Firebase: verifica conta + prepara taxa IAP US$ 1,99.
 * node scripts/check_sandbox_iap_user.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT = 'baba-on-3634a';
const EMAIL = 'drlucasnutrologo0777@gmail.com';
const PASS = 'Teste@123';
const FEE = 1.99;

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

const apiKey = loadApiKey();
const report = { email: EMAIL, at: new Date().toISOString(), checks: [] };
const ok = (s, d) => {
  report.checks.push({ s, ok: true, d });
  console.log('OK  ', s, d || '');
};
const fail = (s, d) => {
  report.checks.push({ s, ok: false, d });
  console.log('FAIL', s, d || '');
};

try {
  const auth = await json(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASS, returnSecureToken: true }),
    },
  );
  ok('login', `uid=${auth.localId}`);

  const user = await getDoc(auth.idToken, `users/${auth.localId}`);
  const role = field(user?.fields, 'role');
  const name = field(user?.fields, 'fullName') || field(user?.fields, 'name');
  ok('users_doc', `role=${role || 'MISSING'} name=${name || '—'}`);

  const cg = await getDoc(auth.idToken, `caregivers/${auth.localId}`);
  const fam = await getDoc(auth.idToken, `families/${auth.localId}`);
  const cgPend = field(cg?.fields, 'platformFeePending');
  const cgDiarias = field(cg?.fields, 'platformFeePendingDiarias');
  const cgOffer = field(cg?.fields, 'platformFeePendingOfferId');
  const cgName = field(cg?.fields, 'fullName');
  const cgApproved = field(cg?.fields, 'approved');

  report.role = role;
  report.uid = auth.localId;
  report.caregiver = cg
    ? { exists: true, pending: cgPend, diarias: cgDiarias, offerId: cgOffer, name: cgName, approved: cgApproved }
    : { exists: false };
  report.family = fam ? { exists: true, name: field(fam.fields, 'fullName') } : { exists: false };

  if (role === 'caregiver' || cg) {
    ok('perfil_baba', `pendente=${cgPend} diarias=${cgDiarias} approved=${cgApproved}`);
    // Garante taxa US$ 1,99 para sandbox IAP (mesmo padrão da conta demo)
    if (!cgPend || cgPend < FEE - 0.001) {
      await patchDoc(auth.idToken, `caregivers/${auth.localId}`, {
        platformFeePending: fv('double', FEE),
        platformFeePendingDiarias: fv('int', 1),
        platformFeeCurrency: fv('string', 'USD'),
        platformFeePendingOfferId: fv('string', cgOffer || 'sandbox_iap_drlucas'),
        platformFeeUpdatedAt: fv('ts'),
        updatedAt: fv('ts'),
      });
      ok('seed_taxa_iap', 'US$ 1.99 pendente gravada');
    } else {
      ok('taxa_ja_pendente', `US$ ${cgPend}`);
    }
    const cg2 = await getDoc(auth.idToken, `caregivers/${auth.localId}`);
    const pend2 = field(cg2?.fields, 'platformFeePending');
    if (pend2 >= FEE - 0.001) ok('taxa_pronta_review', `US$ ${pend2} — botão deve mostrar Pagar taxa via App Store`);
    else fail('taxa_pronta_review', `ainda ${pend2}`);
  } else if (role === 'family' || fam) {
    ok('perfil_familia', field(fam?.fields, 'fullName') || 'família');
    fail(
      'iap_taxa',
      'Conta é FAMÍLIA — taxa IAP é da babá. Use baba.demo@babaon.test.local ou cadastro babá para testar bo_taxa_manutencao',
    );
  } else {
    fail('role', 'Sem role family/caregiver no users/ — pode falhar painéis');
  }

  // Checklist estático do código (não depende de iOS)
  const cob = readFileSync(join(__dir, '../web_app/ic24-cobranca.js'), 'utf8');
  const idx = readFileSync(join(__dir, '../web_app/index.html'), 'utf8');
  const iapDart = readFileSync(join(__dir, '../lib/services/bo_iap_service.dart'), 'utf8');
  const screen = readFileSync(join(__dir, '../lib/screens/web_app_screen.dart'), 'utf8');

  if (cob.includes("bo_taxa_manutencao") && cob.includes('ic24PurchasePlatformFee'))
    ok('js_iap_product', 'bo_taxa_manutencao + bridge');
  else fail('js_iap_product', 'produto/bridge ausente');

  if (idx.includes('id="taxa-pagar-btn"') && idx.includes('Pagar taxa via App Store'))
    ok('ui_botao_taxa', 'botão presente');
  else fail('ui_botao_taxa', 'botão ausente');

  if (idx.includes('Nunca disabled — App Review') && idx.includes('btn.disabled=false'))
    ok('ui_botao_nunca_morto', 'renderTaxa não desabilita botão');
  else fail('ui_botao_nunca_morto', 'risco 2.1(b) botão morto');

  if (idx.includes('id="fam-menu-propostas"') && idx.includes('id="baba-menu-propostas"'))
    ok('ui_propostas_ambos', 'família + babá');
  else fail('ui_propostas_ambos', 'faltando menu');

  // Design: mesmo menu-topic do resto; babá dentro de menu-grid
  const famBlock = idx.slice(idx.indexOf('id="mae-painel"'), idx.indexOf('id="mae-proximos"'));
  if (famBlock.includes('class="menu-topic"') && famBlock.includes('Propostas recebidas') && !famBlock.includes('menu-grid'))
    ok('design_fam_lista', 'Propostas = menu-topic full-width (igual demais itens família)');
  else fail('design_fam_lista', 'estrutura diferente do painel família');

  const babaStart = idx.indexOf('id="baba-painel"');
  const babaGrid = idx.slice(babaStart, idx.indexOf('id="baba-curriculo"'));
  if (
    babaGrid.includes('class="menu-grid"') &&
    babaGrid.includes('baba-menu-propostas') &&
    babaGrid.includes('Taxa do app')
  )
    ok('design_baba_grid', 'Propostas no menu-grid 2 colunas + Taxa do app intacta');
  else fail('design_baba_grid', 'menu babá quebrado');

  // Itens clássicos ainda presentes
  for (const item of [
    'Babás próximos',
    'Plantão urgente',
    'Cartão de ponto',
    'Diário da criança',
    'Currículo Lates',
    'Faturamento',
    'Taxa do app',
  ]) {
    if (idx.includes(item)) ok('design_item_' + item.slice(0, 12), item);
    else fail('design_item_' + item.slice(0, 12), 'sumiu: ' + item);
  }

  if (iapDart.includes('buyConsumable') && iapDart.includes('bo_taxa_manutencao') === false) {
    // product id is in config
  }
  if (screen.includes("handlerName: 'ic24PurchasePlatformFee'")) ok('flutter_bridge', 'ic24PurchasePlatformFee');
  else fail('flutter_bridge', 'handler ausente');

  if (iapDart.includes('buyConsumable')) ok('flutter_storekit', 'buyConsumable');
  else fail('flutter_storekit', 'sem buyConsumable');

  report.iap_sandbox_instrucao = [
    'No iPhone: Settings → App Store → Sandbox Account → ' + EMAIL,
    'Abra Babá ON (TestFlight) → login ' + EMAIL,
    'Área da babá → Taxa do app → confirmar US$ 1,99 pendente',
    'Toque Pagar taxa via App Store → concluir compra sandbox bo_taxa_manutencao',
  ];
} catch (e) {
  fail('fatal', e.message);
}

writeFileSync(join(__dir, '_sandbox_iap_check.json'), JSON.stringify(report, null, 2));
console.log('\n===== RESUMO =====');
report.checks.forEach((c) => console.log(`${c.ok ? '✅' : '❌'} ${c.s}: ${c.d || ''}`));
const failed = report.checks.filter((c) => !c.ok);
console.log(`\nOK ${report.checks.filter((c) => c.ok).length} | FAIL ${failed.length}`);
if (failed.length) process.exit(1);
