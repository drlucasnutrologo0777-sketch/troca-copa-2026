/**
 * Testa etapa 2 → 3 do cadastro cuidador (foto obrigatória + preview local).
 * Uso: node tool/test_cadastro_etapa_foto.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dir, '../web_app');
const PORT = 8778;

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
  if (e === '.json') return 'application/json';
  if (e === '.png') return 'image/png';
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
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof ic24PreviewFotoPerfil === 'function');

    const helpers = await page.evaluate(() => ({
      hasPreview: typeof ic24PreviewFotoPerfil === 'function',
      hasOk: typeof ic24FotoPerfilOk === 'function',
      hasEtapa3: typeof irCuidadorEtapa3 === 'function',
    }));
    ok('helpers carregados', helpers.hasPreview && helpers.hasOk && helpers.hasEtapa3);

    const blocked = await page.evaluate(() => {
      window._photoUploaded = false;
      window._pendingProfilePhoto = null;
      window._photoLocalOk = false;
      document.getElementById('cuid-bio').value = 'Bio teste Alzheimer';
      show('cuidador-etapa2');
      irCuidadorEtapa3();
      return {
        screen: document.querySelector('.screen.on')?.id,
        toast: document.getElementById('toast')?.textContent || '',
        ok: ic24FotoPerfilOk(),
      };
    });
    ok('sem foto bloqueia etapa 3', blocked.screen === 'cuidador-etapa2' && !blocked.ok, blocked.toast);

    const afterPhoto = await page.evaluate(async () => {
      const jpegB64 =
        '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJgAD//Z';
      const bin = atob(jpegB64);
      const arr = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
      const file = new File([arr], 'perfil.jpg', { type: 'image/jpeg' });

      window._photoUploaded = false;
      window._pendingProfilePhoto = null;
      window._photoLocalOk = false;
      document.getElementById('cuid-bio').value = 'Bio teste Alzheimer';
      show('cuidador-etapa2');

      ic24PreviewFotoPerfil(file, 'etapa2-foto-preview', 'etapa2-foto-txt', 'etapa2-foto-box');
      const previewVisible = document.getElementById('etapa2-foto-preview')?.style.display !== 'none';
      const fotoOk = ic24FotoPerfilOk();

      ic24Auth = { currentUser: { uid: 'test-uid', email: 't@test.com' } };
      ic24InitFirebase = () => {};
      ic24SalvarCuidador = async () => {};
      ic24UploadFotoPerfil = async () => 'https://example.com/foto.jpg';
      syncDocumentosUI = async () => {};
      irCuidadorEtapa3();
      await new Promise((r) => setTimeout(r, 1200));
      return {
        previewVisible,
        fotoOk: ic24FotoPerfilOk(),
        photoUploaded: !!window._photoUploaded,
        screen: document.querySelector('.screen.on')?.id,
      };
    });
    ok('foto selecionada marca ok', afterPhoto.fotoOk || afterPhoto.photoUploaded);
    ok('preview aparece', afterPhoto.previewVisible);
    ok('com foto avança etapa 3', afterPhoto.screen === 'cuidador-etapa3', afterPhoto.screen);

    const heic = await page.evaluate(() => {
      const file = new File([new Uint8Array([1, 2, 3])], 'iphone.HEIC', { type: 'application/octet-stream' });
      window._photoUploaded = false;
      window._pendingProfilePhoto = null;
      window._photoLocalOk = false;
      ic24PreviewFotoPerfil(file, 'etapa2-foto-preview', 'etapa2-foto-txt', 'etapa2-foto-box');
      return {
        ok: ic24FotoPerfilOk(),
        pendingName: window._pendingProfilePhoto?.name || '',
      };
    });
    ok('HEIC iPhone aceito localmente', heic.ok && heic.pendingName.toLowerCase().includes('heic'));

    const fileInput = await page.evaluate(async () => {
      const jpegB64 =
        '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJgAD//Z';
      const bin = atob(jpegB64);
      const arr = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
      const file = new File([arr], 'via-input.jpg', { type: 'image/jpeg' });

      window._photoUploaded = false;
      window._pendingProfilePhoto = null;
      window._photoLocalOk = false;
      document.getElementById('cuid-bio').value = 'Bio via input';
      show('cuidador-etapa2');

      const input = document.getElementById('etapa2-foto-inp');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));

      ic24Auth = { currentUser: { uid: 'test-uid', email: 't@test.com' } };
      ic24InitFirebase = () => {};
      ic24SalvarCuidador = async () => {};
      ic24UploadFotoPerfil = async () => 'https://example.com/foto.jpg';
      syncDocumentosUI = async () => {};
      irCuidadorEtapa3();
      await new Promise((r) => setTimeout(r, 1200));
      return {
        fotoOk: ic24FotoPerfilOk(),
        preview: document.getElementById('etapa2-foto-preview')?.style.display !== 'none',
        screen: document.querySelector('.screen.on')?.id,
      };
    });
    ok('input file onchange funciona', fileInput.fotoOk && fileInput.preview);
    ok('input file libera etapa 3', fileInput.screen === 'cuidador-etapa3', fileInput.screen);

    const curriculoHtml = readFileSync(join(WEB_ROOT, 'curriculo.html'), 'utf8');
    ok('curriculo.html tem firebase-auth', /firebase-auth-compat\.js/.test(curriculoHtml));
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
