import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const apiKey = readFileSync(join(__dir, '../web_app/firebase-ic24.js'), 'utf8').match(
  /apiKey:\s*['"]([^'"]+)['"]/,
)[1];
const EMAIL = 'drlucasnutrologo0777@gmail.com';
const PASS = 'Teste@123';

const authRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS, returnSecureToken: true }),
  },
);
const auth = await authRes.json();
if (auth.error) {
  console.error('LOGIN_FAIL', auth.error);
  process.exit(1);
}
const uid = auth.localId;
async function get(path) {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/baba-on-3634a/databases/(default)/documents/${path}`,
    { headers: { Authorization: 'Bearer ' + auth.idToken } },
  );
  return r.json();
}
const u = await get(`users/${uid}`);
const c = await get(`caregivers/${uid}`);
console.log(
  JSON.stringify(
    {
      login: 'OK',
      uid,
      role: u.fields?.role?.stringValue,
      pend: c.fields?.platformFeePending?.doubleValue,
      diarias: Number(c.fields?.platformFeePendingDiarias?.integerValue || 0),
      approved: c.fields?.approved?.booleanValue,
      name: c.fields?.fullName?.stringValue,
    },
    null,
    2,
  ),
);

const idx = readFileSync(join(__dir, '../web_app/index.html'), 'utf8');
const mae = idx.slice(idx.indexOf('id="mae-painel"'), idx.indexOf('id="mae-ofertas"'));
const baba = idx.slice(idx.indexOf('id="baba-painel"'), idx.indexOf('id="baba-curriculo"'));
const checks = {
  fam_propostas_menu_topic: /fam-menu-propostas[\s\S]*?class="menu-topic"|class="menu-topic"[^>]*fam-menu-propostas/.test(
    mae,
  ) || mae.includes('fam-menu-propostas'),
  fam_has_icon_arr: mae.includes('menu-ic') && mae.includes('menu-arr') && mae.includes('Propostas recebidas'),
  baba_propostas_in_grid: baba.includes('menu-grid') && baba.includes('baba-menu-propostas'),
  baba_taxa_intacta: baba.includes('Taxa do app') && baba.includes("show('baba-taxa')"),
  baba_itens: ['Currículo Lates', 'Faturamento', 'Cartão de ponto', 'Diário da criança', 'Oferecer plantão hoje'].every(
    (t) => baba.includes(t),
  ),
  fam_itens: ['Babás próximos', 'Plantão urgente', 'Cartão de ponto', 'Diário da criança'].every((t) =>
    mae.includes(t),
  ),
};
console.log('design', checks);
const bad = Object.entries(checks).filter(([, v]) => !v);
if (bad.length) {
  console.error('DESIGN_FAIL', bad.map(([k]) => k));
  process.exit(1);
}
console.log('DESIGN_OK');
