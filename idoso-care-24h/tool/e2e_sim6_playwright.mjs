/**
 * E2E — 6 pessoas (3 cuidadores + 3 famílias) contra Firebase idoso-care-24h.
 * Uso: node tool/e2e_sim6_playwright.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dir, '../web_app');
const PASS = 'SimTest62!';
const TS = Date.now();
const PORT = 8777;
const DOCS = ['rg_frente', 'rg_verso', 'comprovante', 'antecedentes'];
const CPFS = ['52998224725', '11144477735', '28625587887'];

const results = [];
let passed = 0;
let failed = 0;

function ok(name, detail = '') {
  passed++;
  results.push({ status: 'PASS', name, detail });
  console.log('PASS:', name, detail ? `— ${detail}` : '');
}

function fail(name, err) {
  failed++;
  const msg = err?.message || String(err);
  results.push({ status: 'FAIL', name, error: msg });
  console.error('FAIL:', name, '—', msg);
}

function mime(p) {
  const e = extname(p).toLowerCase();
  if (e === '.png') return 'image/png';
  if (e === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function startServer() {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      let p = req.url.split('?')[0];
      if (p === '/') p = '/index.html';
      const file = join(WEB_ROOT, p.replace(/^\//, '').replace(/\.\./g, ''));
      if (!file.startsWith(WEB_ROOT) || !existsSync(file)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const ext = extname(file);
      const mimeType =
        ext === '.html'
          ? 'text/html; charset=utf-8'
          : ext === '.js'
            ? 'application/javascript; charset=utf-8'
            : ext === '.css'
              ? 'text/css'
              : ext === '.json'
                ? 'application/json'
                : mime(file);
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(readFileSync(file));
    });
    srv.listen(PORT, '127.0.0.1', () => resolve(srv));
  });
}

async function runInApp(page, fn, args = {}) {
  return page.evaluate(fn, args);
}

async function caregiverFlow(page, i, cpf) {
  const email = `sim62-cg${i}-${TS}@ic24test.local`;
  const nome = `Cuidador Sim62 ${i}`;

  const r = await runInApp(
    page,
    async ({ email, nome, pass, cpf, docs, i }) => {
      const ensure = (id, val) => {
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement('input');
          el.id = id;
          document.body.appendChild(el);
        }
        el.value = val;
      };
      const jpegB64 =
        '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJgAD//Z';
      const bin = atob(jpegB64);
      const arr = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
      const mkFile = (name) => new File([arr], name, { type: 'image/jpeg' });

      ensure('acc-nome', nome);
      ensure('cad-cep', '39400000');
      ensure('cad-rua', `Rua Cuidador ${i}`);
      ensure('cad-num', String(100 + i));
      ensure('cad-comp', 'Apto 1');
      ensure('cad-bairro', 'Centro');
      ensure('cad-cidade', 'Montes Claros');
      ensure('cad-uf', 'MG');
      ensure('cuid-bio', `Bio cuidador ${i} — Alzheimer, Parkinson`);
      window._cuidSpecs = ['Alzheimer', 'Parkinson'];

      await ic24CriarConta({ nome, email, senha: pass, senha2: pass, role: 'caregiver' });
      await ic24SalvarCuidador();
      const photoUrl = await ic24UploadFotoPerfil(mkFile('foto.jpg'));
      await ic24SalvarCuidador();
      await ic24SalvarPainelCuidador({ cpf });

      for (const key of docs) {
        await ic24UploadDocumento(key, mkFile(`${key}.jpg`));
      }

      const pack = await ic24CarregarDadosCuidador(firebase.auth().currentUser.uid);
      const ev = ic24AvaliarCadastroCuidador(pack.data, pack.docsMap);
      if (!ev.complete) throw new Error(`cadastro incompleto: ${ev.screen} — ${ev.message}`);

      const prefs = {
        configured: true,
        paymentSchedule: 'diaria',
        paymentWeekDay: 'seg',
        jobDurationDays: 15,
      };
      await ic24SalvarPainelCuidador({
        availableToday: true,
        plantaoHoje: {
          ativo: true,
          escala: '12',
          inicio: '07:00',
          dailyRate: 250 + i * 10,
          ratesByScale: { '12': 250 + i * 10, '24': 400 + i * 10 },
          paymentPreferences: prefs,
          publicadoEm: new Date().toISOString(),
        },
        plantoes: [
          {
            id: 'plantao_' + Date.now(),
            ativo: true,
            escala: '12',
            dailyRate: 250 + i * 10,
            paymentPreferences: prefs,
            publicadoEm: new Date().toISOString(),
          },
        ],
        paymentPreferences: prefs,
        pixKey: '1199999' + String(1000 + i),
        pixTitular: nome,
        displayDailyRate: 250 + i * 10,
      });

      const snap = await firebase.firestore().collection('caregivers').doc(firebase.auth().currentUser.uid).get();
      const cg = snap.data() || {};
      if (!cg.photoUrl) throw new Error('photoUrl ausente');
      if (!cg.availableToday) throw new Error('availableToday false');
      if (!cg.plantaoHoje?.ativo) throw new Error('plantaoHoje inativo');

      const pub = await firebase.firestore().collection('curriculum_public').doc(firebase.auth().currentUser.uid).get();
      if (!pub.exists) throw new Error('curriculum_public ausente');

      return {
        email,
        uid: firebase.auth().currentUser.uid,
        photoUrl,
        classification: cg.classification?.level || pub.data()?.classification?.level,
      };
    },
    { email, nome, pass: PASS, cpf, docs: DOCS, i },
  );

  ok(`Cuidador ${i} — cadastro+foto+docs+plantão`, `${r.email} uid=${r.uid.slice(0, 8)}… class=${r.classification || 'ok'}`);
  return r;
}

async function familyFlow(page, i) {
  const email = `sim62-fam${i}-${TS}@ic24test.local`;
  const nome = `Família Sim62 ${i}`;

  const r = await runInApp(
    page,
    async ({ email, nome, pass, i }) => {
      const ensure = (id, val) => {
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement('input');
          el.id = id;
          document.body.appendChild(el);
        }
        el.value = val;
      };

      ensure('fam-nome', nome);
      ensure('fam-tel', '3899999' + String(1000 + i));
      ensure('fam-cep', '39402000');
      ensure('fam-rua', `Av Família ${i}`);
      ensure('fam-num', String(200 + i));
      ensure('fam-comp', '');
      ensure('fam-bairro', 'Melhoramentos');
      ensure('fam-cidade', 'Montes Claros');
      ensure('fam-uf', 'MG');
      ensure('fam-idoso', `Idoso ${i}`);
      ensure('fam-necessidades', 'Alzheimer, medicação');

      await ic24CriarConta({ nome, email, senha: pass, senha2: pass, role: 'family' });
      await ic24SalvarFamilia();

      const data = await ic24CarregarDadosFamilia(firebase.auth().currentUser.uid);
      const ev = ic24AvaliarCadastroFamilia(data);
      if (!ev.complete) throw new Error(`família incompleta: ${ev.screen}`);

      const offer = await ic24CriarOferta({
        title: `Oferta urgente família ${i}`,
        dailyRate: 280 + i * 5,
        careNeeds: 'Alzheimer',
        elderlyType: 'Idoso',
        jobDurationDays: 15,
        urgent: i === 1,
        scheduleType: 'diaria',
      });

      const listed = await ic24ListarOfertasFamilia();
      if (!listed.some((o) => o.id === offer.id)) throw new Error('oferta não listada');

      return { email, uid: firebase.auth().currentUser.uid, offerId: offer.id, dailyRate: offer.dailyRate };
    },
    { email, nome, pass: PASS, i },
  );

  ok(`Família ${i} — cadastro+oferta`, `${r.email} offer=${r.offerId.slice(0, 8)}…`);
  return r;
}

async function integrationFlow(page, caregiver, family) {
  const r = await runInApp(
    page,
    async ({ cgEmail, famEmail, pass, offerId, cgUid, famUid }) => {
      // Cuidador aceita oferta
      await ic24Entrar(cgEmail, pass);
      const accept = await ic24AceitarOfertaComTermos(offerId, { action: 'accept', message: 'Aceito a oferta' });
      if (!accept.responseId && !accept.id) throw new Error('aceite sem responseId');
      const responseId = accept.responseId || accept.id;

      // Família aprova
      await ic24Entrar(famEmail, pass);
      const notifs = await ic24ListarNotificacoesFamilia();
      const n = notifs.find((x) => x.offerId === offerId) || notifs[0];
      if (!n) throw new Error('notificação família ausente');
      await ic24FamiliaAceitarContraProposta(responseId, true, n.id);

      const offerSnap = await firebase.firestore().collection('job_offers').doc(offerId).get();
      const offer = offerSnap.data() || {};
      if (offer.status !== 'matched') throw new Error('oferta não matched: ' + offer.status);
      if (offer.matchedCaregiverId !== cgUid) throw new Error('cuidador match errado');

      // Cuidador gera cobrança PIX
      await ic24Entrar(cgEmail, pass);
      const inv = await ic24GerarCobrancaCliente({
        valor: offer.dailyRate || 280,
        descricao: 'Diária teste Sim62',
        metodo: 'pix',
        familyId: famUid,
        pixKey: '11988887777',
        pixTitular: 'Cuidador Sim62',
        offerId,
        paymentCycle: 1,
      });
      if (!inv.pixCopiaCola) throw new Error('PIX copia-cola ausente');

      // Família confirma pagamento
      await ic24Entrar(famEmail, pass);
      const paid = await ic24ConfirmarPagamentoFamilia(inv.id);
      if (paid.status !== 'paid') throw new Error('invoice não paid');

      const invSnap = await firebase.firestore().collection('invoices').doc(inv.id).get();
      if (invSnap.data()?.status !== 'paid') throw new Error('invoice Firestore não paid');

      // Taxa plataforma acumulada
      if (typeof ic24AcumularTaxaPlataforma === 'function') {
        await ic24Entrar(cgEmail, pass);
        await ic24AcumularTaxaPlataforma(cgUid, 1, offerId);
        const cgSnap = await firebase.firestore().collection('caregivers').doc(cgUid).get();
        const fee = Number(cgSnap.data()?.platformFeePending || 0);
        if (fee <= 0) throw new Error('taxa plataforma não acumulada');
      }

      return { responseId, invoiceId: inv.id, matched: true };
    },
    {
      cgEmail: caregiver.email,
      famEmail: family.email,
      pass: PASS,
      offerId: family.offerId,
      cgUid: caregiver.uid,
      famUid: family.uid,
    },
  );

  ok('Integração cg1↔fam1 — match+cobrança+pagamento+taxa', `invoice=${r.invoiceId.slice(0, 8)}…`);
  return r;
}

async function listNearby(page, famEmail) {
  await runInApp(
    page,
    async ({ famEmail, pass, cgUid }) => {
      await ic24Entrar(famEmail, pass);
      const list = await ic24ListarCuidadoresProximos();
      if (!list.some((c) => c.id === cgUid || c.availableToday)) {
        throw new Error('cuidador disponível não listado');
      }
    },
    { famEmail, pass: PASS, cgUid: null },
  );
}

async function main() {
  console.log('=== E2E Sim6 — Idoso Care build 62 — Firebase real ===');
  console.log('Timestamp:', TS);

  const srv = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('CONSOLE:', m.text());
  });

  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForFunction(() => typeof ic24CriarConta === 'function' && typeof firebase !== 'undefined', null, {
      timeout: 120000,
    });
    ok('App web carregou', 'Firebase + ic24CriarConta OK');

    const caregivers = [];
    for (let i = 1; i <= 3; i++) {
      try {
        caregivers.push(await caregiverFlow(page, i, CPFS[i - 1]));
      } catch (e) {
        fail(`Cuidador ${i}`, e);
      }
    }

    const families = [];
    for (let i = 1; i <= 3; i++) {
      try {
        families.push(await familyFlow(page, i));
      } catch (e) {
        fail(`Família ${i}`, e);
      }
    }

    if (caregivers[0] && families[0]) {
      try {
        await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => typeof ic24AceitarOfertaComTermos === 'function');
        await integrationFlow(page, caregivers[0], families[0]);
      } catch (e) {
        fail('Integração cg1↔fam1', e);
      }
    }

    if (caregivers[1] && families[1]) {
      try {
        await runInApp(
          page,
          async ({ famEmail, pass, cgUid }) => {
            await ic24Entrar(famEmail, pass);
            const list = await ic24ListarCuidadoresProximos();
            if (!list.length) throw new Error('nenhum cuidador listado');
            const hit = list.find((c) => c.id === cgUid);
            if (!hit) throw new Error('cuidador 2 não aparece na busca');
          },
          { famEmail: families[1].email, pass: PASS, cgUid: caregivers[1].uid },
        );
        ok('Família 2 — listou cuidador 2 disponível');
      } catch (e) {
        fail('Família 2 — busca cuidadores', e);
      }
    }

    if (caregivers[2] && families[2]) {
      try {
        await runInApp(
          page,
          async ({ famEmail, cgUid, pass }) => {
            await ic24Entrar(famEmail, pass);
            const prop = await ic24FamiliaProporCuidador(cgUid, {
              dailyRate: 295,
              message: 'Proposta direta Sim62',
              durationDays: 10,
              elderlyType: 'Idoso',
              careNeeds: 'Parkinson',
            });
            if (!prop.id) throw new Error('proposta direta falhou');
          },
          { famEmail: families[2].email, cgUid: caregivers[2].uid, pass: PASS },
        );
        ok('Família 3 — proposta direta ao cuidador 3');
      } catch (e) {
        fail('Família 3 — proposta direta', e);
      }
    }
  } finally {
    await browser.close();
    srv.close();
  }

  const report = {
    timestamp: TS,
    passed,
    failed,
    total: passed + failed,
    success: failed === 0,
    build: '2.0.1+62',
    results,
    testAccounts: {
      password: PASS,
      caregivers: caregivers.map((c) => c?.email).filter(Boolean),
      families: families.map((f) => f?.email).filter(Boolean),
    },
  };

  writeFileSync(join(__dir, 'e2e_sim6_report.json'), JSON.stringify(report, null, 2));
  console.log('\n=== RESUMO ===');
  console.log(`${passed} passed, ${failed} failed`);
  console.log('Relatório:', join(__dir, 'e2e_sim6_report.json'));

  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
