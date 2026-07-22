/**
 * Valida estrutura HTML + lógica JS do fluxo cadastro/currículo (sem Firebase real).
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { createServer } from 'http';
import { existsSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dir, '../web_app');
const PORT = 8780;

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
      const ext = file.slice(file.lastIndexOf('.'));
      const mime =
        ext === '.html'
          ? 'text/html; charset=utf-8'
          : ext === '.js'
            ? 'application/javascript; charset=utf-8'
            : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(readFileSync(file));
    });
    srv.listen(PORT, '127.0.0.1', () => resolve(srv));
  });
}

// --- lógica espelhada de firebase-ic24.js ---
const IC24_DOCS_OBRIGATORIOS = ['rg_frente', 'rg_verso', 'comprovante', 'antecedentes'];
function ic24DocUploaded(docKey, docsMap) {
  if (docsMap[docKey]?.fileUrl) return true;
  if (docKey === 'rg_frente' && docsMap.rg?.fileUrl) return true;
  return false;
}
function ic24AvaliarCadastroCuidador(d, docsMap) {
  const cep = String(d.cep || '').replace(/\D/g, '');
  if (!d.street || !d.number || cep.length !== 8 || !d.city || !d.state) {
    return { complete: false, screen: 'cuidador-etapa1' };
  }
  if (!(d.bio || '').trim() || !d.photoUrl) {
    return { complete: false, screen: 'cuidador-etapa2' };
  }
  const missing = IC24_DOCS_OBRIGATORIOS.filter((k) => !ic24DocUploaded(k, docsMap));
  if (missing.length) return { complete: false, screen: 'cuidador-etapa3', missing };
  return { complete: true, screen: 'cuidador-painel' };
}

async function main() {
  const indexHtml = readFileSync(join(WEB_ROOT, 'index.html'), 'utf8');
  const firebaseJs = readFileSync(join(WEB_ROOT, 'firebase-ic24.js'), 'utf8');
  const curriculoJs = readFileSync(join(WEB_ROOT, 'ic24-curriculo.js'), 'utf8');

  ok('etapa3 tem rg_frente e rg_verso', indexHtml.includes('data-doc="rg_frente"') && indexHtml.includes('data-doc="rg_verso"'));
  ok('etapa3 tem curso diploma referencia', ['curso', 'diploma', 'referencia'].every((k) => indexHtml.includes(`data-doc="${k}"`)));
  ok('curso marcado opcional na etapa3', /data-doc="curso"[\s\S]{0,200}Opcional/i.test(indexHtml));
  ok('menu curriculo sempre visivel', /onclick="show\('cuidador-curriculo'\)"/.test(indexHtml) && !/menu-curriculo-cuidador" style="display:none"/.test(indexHtml));
  ok('curriculo tela sem input file', !/id="cuidador-curriculo"[\s\S]*?<\/section>/.test(indexHtml) || !indexHtml.match(/id="cuidador-curriculo"[\s\S]*?<\/section>/)[0].includes('type="file"'));
  ok('familia nao abre link direto ao pedir', indexHtml.includes('Aguarde o cuidador') || indexHtml.includes('Pedido enviado'));
  ok('ic24 solicitar cria pending', curriculoJs.includes("status: 'pending'"));
  ok('ic24 enviar curriculo existe', curriculoJs.includes('ic24EnviarCurriculoSolicitacao'));
  ok('4 docs obrigatorios no firebase', firebaseJs.includes("'rg_frente'") && firebaseJs.includes("'rg_verso'") && !firebaseJs.includes("'curso'") || firebaseJs.includes("IC24_DOCS_OPCIONAIS = ['curso'"));

  const base = { street: 'Rua A', number: '1', cep: '01310100', city: 'SP', state: 'SP', bio: 'x', photoUrl: 'y' };
  ok('opcionais nao bloqueiam painel', ic24AvaliarCadastroCuidador(base, {
    rg_frente: { fileUrl: 'a' }, rg_verso: { fileUrl: 'b' }, comprovante: { fileUrl: 'c' }, antecedentes: { fileUrl: 'd' },
  }).complete);
  ok('sem rg verso bloqueia', ic24AvaliarCadastroCuidador(base, {
    rg_frente: { fileUrl: 'a' }, comprovante: { fileUrl: 'c' }, antecedentes: { fileUrl: 'd' },
  }).screen === 'cuidador-etapa3');

  const srv = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => typeof IC24_DOCS_OBRIGATORIOS !== 'undefined', { timeout: 15000 });

    const etapa3 = await page.evaluate(() => {
      show('cuidador-etapa3');
      const docs = [...document.querySelectorAll('#etapa3-documentos .doc[data-doc]')].map((el) => ({
        key: el.getAttribute('data-doc'),
        label: el.querySelector('small')?.textContent || '',
      }));
      return { count: docs.length, keys: docs.map((d) => d.key), opcionais: docs.filter((d) => /Opcional/i.test(d.label)).map((d) => d.key) };
    });
    ok('etapa3 renderiza 7 itens', etapa3.count === 7, etapa3.keys.join(','));
    ok('3 opcionais na tela', etapa3.opcionais.sort().join(',') === 'curso,diploma,referencia');

    const docsOk = await page.evaluate(() => {
      window._cuidDocs = {
        rg_frente: { fileUrl: 'x' }, rg_verso: { fileUrl: 'x' }, comprovante: { fileUrl: 'x' }, antecedentes: { fileUrl: 'x' },
      };
      document.querySelectorAll('#etapa3-documentos .doc').forEach((el) => {
        const k = el.getAttribute('data-doc');
        if (['rg_frente', 'rg_verso', 'comprovante', 'antecedentes'].includes(k)) el.classList.add('done');
      });
      const obrOk = ic24DocsObrigatoriosOk();
      const semOpcionais = !document.querySelector('#etapa3-documentos .doc[data-doc="curso"]').classList.contains('done');
      return { obrOk, semOpcionais };
    });
    ok('ic24DocsObrigatoriosOk sem opcionais', docsOk.obrOk && docsOk.semOpcionais);

    const painelBlock = await page.evaluate(() => {
      window._cuidPainel = { street: 'Rua', number: '1', cep: '01310100', city: 'SP', state: 'SP', bio: 'bio', photoUrl: 'p' };
      window._cuidDocs = { rg_frente: { fileUrl: 'x' }, comprovante: { fileUrl: 'x' }, antecedentes: { fileUrl: 'x' } };
      show('cuidador-painel');
      return document.querySelector('.screen.on')?.id;
    });
    ok('painel bloqueado sem rg verso', painelBlock === 'cuidador-etapa3', painelBlock);

    const curriculoUi = await page.evaluate(() => {
      window._cuidPainel = { fullName: 'Ana', city: 'BH', state: 'MG', bio: 'Cuidadora', specialties: ['Alzheimer'] };
      window._cuidDocs = { rg_frente: { fileUrl: 'x' }, curso: { fileUrl: 'y', label: 'Curso' } };
      window._cvSolicitacoes = [{ token: 'tok1', status: 'pending', familyName: 'Família Teste' }];
      renderCurriculo(window._cuidPainel, ic24Classificacao(window._cuidPainel), window._cuidDocs);
      renderCurriculoDocsLista(window._cuidDocs);
      renderSolicitacoesCurriculoCuidador(window._cvSolicitacoes);
      show('cuidador-curriculo');
      return {
        screen: document.querySelector('.screen.on')?.id,
        compact: document.getElementById('cuid-curriculo-dados')?.textContent?.includes('Ana'),
        docs: document.getElementById('cuid-cv-docs-list')?.textContent?.includes('Curso') || document.getElementById('cuid-cv-docs-list')?.textContent?.includes('RG'),
        sendBtn: document.getElementById('cuid-cv-solicitacoes')?.textContent?.includes('Enviar currículo compacto'),
        noUpload: !document.querySelector('#cuidador-curriculo input[type=file]'),
      };
    });
    ok('tela curriculo abre', curriculoUi.screen === 'cuidador-curriculo');
    ok('curriculo mostra resumo compacto', curriculoUi.compact);
    ok('curriculo lista docs do cadastro', curriculoUi.docs);
    ok('curriculo botao enviar familiar', curriculoUi.sendBtn);
    ok('curriculo sem input file', curriculoUi.noUpload);
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
