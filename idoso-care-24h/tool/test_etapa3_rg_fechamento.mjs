/**
 * Playwright — etapa 3: RG frente/verso + finalizarCuidador abre painel (stub Firebase).
 * Custo: zero. Não substitui iPhone WebView, mas prova o fluxo JS de fechamento.
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dir, '../web_app');
const PORT = 8781;

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
      const ext = extname(file);
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

async function main() {
  const indexHtml = readFileSync(join(WEB_ROOT, 'index.html'), 'utf8');
  ok('RG sem capture=environment', !indexHtml.includes('capture="environment"'));
  ok('tem rg_frente e rg_verso', indexHtml.includes('data-doc="rg_frente"') && indexHtml.includes('data-doc="rg_verso"'));

  const srv = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => typeof finalizarCuidador === 'function', { timeout: 15000 });

    const bloqueio = await page.evaluate(async () => {
      show('cuidador-etapa3');
      window._cuidDocs = {
        comprovante: { fileUrl: 'https://x/c.jpg' },
        antecedentes: { fileUrl: 'https://x/a.jpg' },
      };
      window._photoUploaded = true;
      window._pendingProfilePhoto = null;
      ic24InitFirebase = () => {};
      ic24Auth = { currentUser: { uid: 'uid-test' } };
      syncDocumentosUI = async () => {
        document.querySelectorAll('#etapa3-documentos .doc[data-doc]').forEach((el) => {
          const k = el.getAttribute('data-doc');
          const ok = ic24DocUploaded(k, window._cuidDocs);
          el.classList.toggle('done', ok);
        });
        atualizarProgressoEtapa3(window._cuidDocs);
      };
      await syncDocumentosUI();
      const antes = document.querySelector('.screen.on')?.id;
      await finalizarCuidador();
      await new Promise((r) => setTimeout(r, 50));
      const depois = document.querySelector('.screen.on')?.id;
      const toastEl = document.getElementById('toast');
      const toastTxt = toastEl?.textContent || '';
      return { antes, depois, toastTxt, prog3: document.getElementById('prog-etapa3')?.classList.contains('done') };
    });
    ok('sem RG nao abre painel', bloqueio.depois === 'cuidador-etapa3', bloqueio.depois);
    ok('toast cita RG', /RG/i.test(bloqueio.toastTxt), bloqueio.toastTxt);
    ok('toast nao culpa comprovante se ja ok', !/comprovante/i.test(bloqueio.toastTxt) || /RG/i.test(bloqueio.toastTxt), bloqueio.toastTxt);
    ok('barra etapa3 nao verde sem 4 docs', bloqueio.prog3 === false);

    const fecha = await page.evaluate(async () => {
      show('cuidador-etapa3');
      window._cuidPainel = {
        street: 'Rua A', number: '1', cep: '01310100', city: 'SP', state: 'SP',
        bio: 'Cuidadora', photoUrl: 'https://x/foto.jpg', fullName: 'Teste',
      };
      window._cuidDocs = {
        rg_frente: { fileUrl: 'https://x/rf.jpg' },
        rg_verso: { fileUrl: 'https://x/rv.jpg' },
        comprovante: { fileUrl: 'https://x/c.jpg' },
        antecedentes: { fileUrl: 'https://x/a.jpg' },
      };
      window._photoUploaded = true;
      ic24Auth = { currentUser: { uid: 'uid-test' } };
      ic24FotoPerfilOk = () => true;
      ic24SalvarCuidador = async () => {};
      ic24DocsObrigatoriosFirebase = async () => true;
      ic24RecomputeCurriculo = async () => {};
      carregarPainelCuidador = async () => {
        window._cuidPainel = {
          street: 'Rua A', number: '1', cep: '01310100', city: 'SP', state: 'SP',
          bio: 'Cuidadora', photoUrl: 'https://x/foto.jpg', fullName: 'Teste',
        };
        window._cuidDocs = {
          rg_frente: { fileUrl: 'https://x/rf.jpg' },
          rg_verso: { fileUrl: 'https://x/rv.jpg' },
          comprovante: { fileUrl: 'https://x/c.jpg' },
          antecedentes: { fileUrl: 'https://x/a.jpg' },
        };
      };
      syncDocumentosUI = async () => {
        document.querySelectorAll('#etapa3-documentos .doc[data-doc]').forEach((el) => {
          const k = el.getAttribute('data-doc');
          el.classList.toggle('done', ic24DocUploaded(k, window._cuidDocs));
        });
        atualizarProgressoEtapa3(window._cuidDocs);
      };
      await syncDocumentosUI();
      await finalizarCuidador();
      await new Promise((r) => setTimeout(r, 80));
      return {
        screen: document.querySelector('.screen.on')?.id,
        prog3: document.getElementById('prog-etapa3')?.classList.contains('done'),
        toast: document.getElementById('toast')?.textContent || '',
      };
    });
    ok('com 4 docs finalizar abre painel', fecha.screen === 'cuidador-painel', fecha.screen);
    ok('barra etapa3 verde com 4 docs', fecha.prog3 === true);
    ok('toast cadastro concluido', /conclu/i.test(fecha.toast), fecha.toast);

    const legado = await page.evaluate(() => {
      const docs = { rg: { fileUrl: 'https://x/legado.jpg' }, comprovante: { fileUrl: 'x' }, antecedentes: { fileUrl: 'x' } };
      return {
        frente: ic24DocUploaded('rg_frente', docs),
        verso: ic24DocUploaded('rg_verso', docs),
        completo: ic24DocsCadastroCompletos(docs),
        msg: ic24DocsFaltandoMsg(docs),
      };
    });
    ok('legado rg so libera frente', legado.frente && !legado.verso);
    ok('legado rg ainda bloqueia cadastro', !legado.completo);
    ok('legado msg pede rg verso', legado.msg === 'RG verso', legado.msg);
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
