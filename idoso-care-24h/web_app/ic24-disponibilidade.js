/* Idoso Care 24H — agenda/plantão com diária por escala (sem valor fixo no cadastro) */

const IC24_ESCALAS_AGENDA = ['4', '6', '8', '12', '24', '48'];
const IC24_ESCALAS_PLANTAO = ['12', '24'];

function ic24TaxaBrlRef(diarias) {
  const unit = typeof IC24_FEE_FIXED_BRL !== 'undefined' ? IC24_FEE_FIXED_BRL : 10.29;
  const n = Math.max(1, Math.floor(Number(diarias) || 1));
  return Math.round(unit * n * 100) / 100;
}

function ic24FmtTotalRefDiariaTaxa(daily, diariasCount) {
  const d = Number(daily) || 0;
  const n = Math.max(1, Math.floor(Number(diariasCount) || 1));
  const taxaUnit = typeof IC24_FEE_FIXED_BRL !== 'undefined' ? IC24_FEE_FIXED_BRL : 10.29;
  const taxa = ic24TaxaBrlRef(n);
  if (d <= 0) return null;
  const suffix =
    n > 1
      ? ' · taxa total ' +
        (typeof fmtMoeda === 'function' ? fmtMoeda(taxa) : 'R$ ' + taxa.toFixed(2)) +
        ' (' +
        n +
        '× ' +
        (typeof fmtMoeda === 'function' ? fmtMoeda(taxaUnit) : 'R$ ' + taxaUnit.toFixed(2)) +
        ')'
      : '';
  return {
    daily: d,
    taxa,
    taxaUnit,
    diarias: n,
    total: d + taxaUnit,
    label:
      'Diária ' +
      (typeof fmtMoeda === 'function' ? fmtMoeda(d) : 'R$ ' + d.toFixed(2)) +
      ' + taxa ' +
      (typeof fmtMoeda === 'function' ? fmtMoeda(taxaUnit) : 'R$ ' + taxaUnit.toFixed(2)) +
      '/dia' +
      suffix +
      ' (referência)',
  };
}

function ic24NewDispId() {
  return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function ic24ColetarRatesByScale(prefix, escalas) {
  const out = {};
  (escalas || []).forEach((h) => {
    const el = document.getElementById(prefix + '-rate-' + h);
    const v = parseFloat(el?.value);
    if (v > 0) out[String(h)] = v;
  });
  return out;
}

function ic24AplicarRatesByScale(prefix, ratesByScale, escalas) {
  (escalas || []).forEach((h) => {
    const el = document.getElementById(prefix + '-rate-' + h);
    if (!el) return;
    const v = ratesByScale && ratesByScale[String(h)];
    el.value = v > 0 ? String(v) : '';
  });
}

function ic24RateForScale(ratesByScale, escala, fallback) {
  if (!ratesByScale) return fallback || 0;
  const r = ratesByScale[String(escala)];
  if (r > 0) return r;
  const first = Object.values(ratesByScale).find((x) => Number(x) > 0);
  return first || fallback || 0;
}

function ic24ExibirRateCaregiver(c) {
  c = c || {};
  if (c.plantaoHoje?.ativo) {
    const e = c.plantaoHoje.escala || '12';
    const r = ic24RateForScale(c.plantaoHoje.ratesByScale, e, c.plantaoHoje.dailyRate);
    if (r > 0) return 'R$ ' + Number(r).toFixed(0) + '/dia · ' + e + 'h';
  }
  const list = c.plantoes || [];
  const ativo = list.find((p) => p.ativo);
  if (ativo) {
    const e = ativo.escala || '12';
    const r = ic24RateForScale(ativo.ratesByScale, e, ativo.dailyRate);
    if (r > 0) return 'R$ ' + Number(r).toFixed(0) + '/dia · ' + e + 'h';
  }
  const agendas = c.agendas || [];
  const ag = agendas.find((a) => a.active !== false) || c.agenda;
  if (ag) {
    const e = ag.escala || '8';
    const r = ic24RateForScale(ag.ratesByScale, e, ag.dailyRate);
    if (r > 0) return 'R$ ' + Number(r).toFixed(0) + '/dia · ' + e + 'h';
  }
  if (c.dailyRate > 0) return 'R$ ' + Number(c.dailyRate).toFixed(0) + '/dia';
  return '—';
}

function ic24MigrarAgendasLegacy(d) {
  if (!d) return [];
  if (Array.isArray(d.agendas) && d.agendas.length) return d.agendas;
  if (d.agenda && typeof d.agenda === 'object') {
    return [{ id: ic24NewDispId(), ...d.agenda, active: true, migrated: true }];
  }
  return [];
}

function ic24MigrarPlantoesLegacy(d) {
  if (!d) return [];
  if (Array.isArray(d.plantoes) && d.plantoes.length) return d.plantoes;
  if (d.plantaoHoje && typeof d.plantaoHoje === 'object' && d.plantaoHoje.ativo) {
    return [{ id: ic24NewDispId(), ...d.plantaoHoje, migrated: true }];
  }
  return [];
}

function ic24ResumoAgendaEntry(a) {
  if (!a) return '—';
  const dias = (a.dias || []).join(', ') || '—';
  const e = a.escala || '8';
  const r = ic24RateForScale(a.ratesByScale, e, a.dailyRate);
  const val = r > 0 ? 'R$ ' + Number(r).toFixed(0) + ' (' + e + 'h)' : 'sem valor';
  return dias + ' · ' + (a.periodo || 'semana') + ' · ' + val;
}

function ic24ResumoPlantaoEntry(p) {
  if (!p) return '—';
  const e = p.escala || '12';
  const r = ic24RateForScale(p.ratesByScale, e, p.dailyRate);
  const val = r > 0 ? 'R$ ' + Number(r).toFixed(0) + ' (' + e + 'h)' : 'sem valor';
  return (p.ativo ? 'Ativo' : 'Inativo') + ' · início ' + (p.inicio || '07:00') + ' · ' + val;
}
