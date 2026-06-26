/* PIX estático — R$ 0,50 — Eder Lucas Santos Tiago */
const IC24_PIX = {
  name: 'Eder Lucas Santos Tiago',
  key: '+5511968362005',
  keyDisplay: '11968362005',
  city: 'SAO PAULO',
  amount: 0.5,
  txid: 'IC24CHAT',
};

function ic24PixTlv(id, value) {
  const len = String(value.length).padStart(2, '0');
  return id + len + value;
}

function ic24PixCrc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function ic24PixCopiaCola() {
  const name = IC24_PIX.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .substring(0, 25)
    .toUpperCase();
  const city = IC24_PIX.city.substring(0, 15).toUpperCase();
  const key = IC24_PIX.key;
  const accountInfo = ic24PixTlv('00', 'br.gov.bcb.pix') + ic24PixTlv('01', key);
  let payload =
    ic24PixTlv('00', '01') +
    ic24PixTlv('26', accountInfo) +
    ic24PixTlv('52', '0000') +
    ic24PixTlv('53', '986') +
    ic24PixTlv('54', IC24_PIX.amount.toFixed(2)) +
    ic24PixTlv('58', 'BR') +
    ic24PixTlv('59', name) +
    ic24PixTlv('60', city) +
    ic24PixTlv('62', ic24PixTlv('05', IC24_PIX.txid));
  payload += '6304';
  return payload + ic24PixCrc16(payload);
}

function ic24RenderPixQr(canvasId) {
  const code = ic24PixCopiaCola();
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.QRCode) return code;
  QRCode.toCanvas(canvas, code, { width: 220, margin: 2 }, () => {});
  return code;
}

async function ic24CopyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
}

function ic24FillPixScreen() {
  const code = ic24RenderPixQr('pixQrCanvas');
  const nameEl = document.getElementById('pixName');
  const keyEl = document.getElementById('pixKey');
  const amtEl = document.getElementById('pixAmount');
  if (nameEl) nameEl.textContent = IC24_PIX.name;
  if (keyEl) keyEl.textContent = IC24_PIX.keyDisplay;
  if (amtEl) amtEl.textContent = 'R$ 0,50';
  window._ic24PixCode = code;
}
