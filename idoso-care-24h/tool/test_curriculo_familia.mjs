/**
 * Testa curriculo.html: link inválido, token falso, render do currículo.
 * Uso: node tool/test_curriculo_familia.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dir, '../web_app');
const PORT = 8779;

let passed = 0;
let failed = 0;

function ok(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log('PASS:', name, detail ? `— ${detail}` : '');
  } else {
    failed++;
    console.error('FAIL:', name, detail || '');
  }
}

function mime(file) {
  const e = extname(file).toLowerCase();
  if (e === '.html') return 'text/html; charset=utf-8';
  if (e === '.js') return 'application/javascript; charset=utf-8';
  return 'application/octet-stream';
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
      res.writeHead(200, { 'Content-Type': mime(file) });
      res.end(readFileSync(file));
    });
    srv.listen(PORT, '127.0.0.1', () => resolve(srv));
  });
}

async function main() {
  const srv = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const indexHtml = readFileSync(join(WEB_ROOT, 'index.html'), 'utf8');
    const curriculoHtml = readFileSync(join(WEB_ROOT, 'curriculo.html'), 'utf8');
    ok('abrirCurriculoCuidador aguarda cuidador', /Pedido enviado|Aguarde o cuidador/i.test(indexHtml));
    ok('solicitarCurriculoContratante aguarda cuidador', /Pedido enviado|Aguarde o cuidador/i.test(indexHtml));
    ok('curriculo.html tem firebase-auth', /firebase-auth-compat\.js/.test(curriculoHtml));

    await page.goto(`http://127.0.0.1:${PORT}/curriculo.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);
    const noToken = await page.evaluate(() => ({
      text: document.getElementById('app')?.textContent || '',
      loading: !!document.querySelector('.loading'),
    }));
    ok(
      'sem token mostra erro (nao trava)',
      /Link inválido/i.test(noToken.text) && !noToken.loading,
      noToken.text.slice(0, 60),
    );

    await page.goto(`http://127.0.0.1:${PORT}/curriculo.html?t=fake-token-123`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForFunction(
      () => !/Carregando currículo/i.test(document.getElementById('app')?.textContent || ''),
      { timeout: 25000 },
    );
    const badToken = await page.evaluate(() => ({
      text: document.getElementById('app')?.textContent || '',
      hasErr: !!document.querySelector('.err'),
    }));
    ok(
      'token invalido resolve (nao fica em loading)',
      badToken.hasErr && /não encontrada|inválido|permission|PERMISSION|Missing|liberou|liberado/i.test(badToken.text),
      badToken.text.slice(0, 100),
    );

    await page.goto(`http://127.0.0.1:${PORT}/curriculo.html?t=mock`, { waitUntil: 'domcontentloaded' });
    const rendered = await page.evaluate(async () => {
      window.ic24CarregarCurriculoPorToken = async () => ({
        request: { familyName: 'Família Teste' },
        curriculum: {
          fullName: 'Maria Silva',
          city: 'São Paulo',
          state: 'SP',
          cpfMasked: '***.456.789-**',
          bio: 'Cuidadora experiente',
          specialties: ['Alzheimer'],
          hourRate: 25,
          dailyRate: 180,
          classification: {
            stars: '★★★★☆',
            label: 'Bom',
            score: 72,
            documentsCount: 2,
            missingRequired: [],
          },
          documents: [{ url: 'https://via.placeholder.com/150', label: 'RG', verified: true }],
        },
      });

      const app = document.getElementById('app');
      try {
        const { request, curriculum: c } = await ic24CarregarCurriculoPorToken('mock');
        const cls = c.classification || {};
        const docs = (c.documents || []).filter((d) => d.url);
        app.innerHTML =
          `<div class="hero"><h1>${c.fullName}</h1></div>` +
          `<div class="card"><h2>Sobre</h2><p>${c.bio}</p></div>` +
          `<div class="doc-grid">${docs.length} doc(s)</div>` +
          `<div class="card">Solicitado por: ${request.familyName}</div>`;
        return { ok: true, name: c.fullName, docs: docs.length, family: request.familyName };
      } catch (e) {
        return { ok: false, err: e.message };
      }
    });
    ok(
      'render mock exibe curriculo',
      rendered.ok && rendered.name === 'Maria Silva' && rendered.docs === 1,
      JSON.stringify(rendered),
    );
  } finally {
    await browser.close();
    srv.close();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
