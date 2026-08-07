/**
 * Teste unitário da ordenação: distância → data/hora → preço
 * node scripts/test_ordem_proximos.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '../web_app');
const disp = readFileSync(join(root, 'ic24-disponibilidade.js'), 'utf8');
const geo = readFileSync(join(root, 'bo-geo.js'), 'utf8');

const ctx = { console, Math, Number, String, Array, Object, Date, Promise, JSON };
vm.createContext(ctx);
vm.runInContext(disp + '\n' + geo, ctx);

const {
  ic24PrecoDiariaNumerico,
  ic24ScoreDataHora,
  ic24HaversineKm,
} = ctx;

const hoje = new Date().toISOString().slice(0, 10);
const need = { data: hoje, hora: '07:00' };

const farCheap = {
  fullName: 'Longe Barata',
  latitude: -23.6,
  longitude: -46.7,
  dailyRate: 100,
  availableToday: true,
  plantaoHoje: { ativo: true, inicio: '07:00', escala: '12', ratesByScale: { '12': 100 } },
};
const nearExpensive = {
  fullName: 'Perto Cara',
  latitude: -23.55,
  longitude: -46.63,
  dailyRate: 400,
  availableToday: true,
  plantaoHoje: { ativo: true, inicio: '07:00', escala: '12', ratesByScale: { '12': 400 } },
};
const nearCheap = {
  fullName: 'Perto Barata',
  latitude: -23.55,
  longitude: -46.63,
  dailyRate: 180,
  availableToday: true,
  plantaoHoje: { ativo: true, inicio: '07:00', escala: '12', ratesByScale: { '12': 180 } },
};
const nearNight = {
  fullName: 'Perto Noite',
  latitude: -23.55,
  longitude: -46.63,
  dailyRate: 150,
  availableToday: true,
  plantaoHoje: { ativo: true, inicio: '19:00', escala: '12', ratesByScale: { '12': 150 } },
};

const origin = { lat: -23.55, lng: -46.63 };
function enrich(c) {
  const dist = ic24HaversineKm(origin.lat, origin.lng, c.latitude, c.longitude);
  return {
    ...c,
    distanceKm: Math.round(dist * 10) / 10,
    withinRadius: true,
    priceSort: ic24PrecoDiariaNumerico(c),
    scheduleScore: ic24ScoreDataHora(c, need),
  };
}

const list = [farCheap, nearExpensive, nearCheap, nearNight].map(enrich);
list.sort((a, b) => {
  if (a.withinRadius !== b.withinRadius) return a.withinRadius ? -1 : 1;
  if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
  if (a.scheduleScore !== b.scheduleScore) return a.scheduleScore - b.scheduleScore;
  return a.priceSort - b.priceSort;
});

console.log(
  list.map((c) => ({
    nome: c.fullName,
    km: c.distanceKm,
    score: c.scheduleScore,
    preco: c.priceSort,
  })),
);

const names = list.map((c) => c.fullName);
// Mesma distância: manhã (score 0) antes de noite (score 1); entre manhãs, menor preço
if (names[0] !== 'Perto Barata') {
  console.error('FAIL: #1 deveria ser Perto Barata (perto + manhã + barata), got', names[0]);
  process.exit(1);
}
if (names[1] !== 'Perto Cara') {
  console.error('FAIL: #2 Perto Cara (mesmo turno, mais cara), got', names[1]);
  process.exit(1);
}
if (names[2] !== 'Perto Noite') {
  console.error('FAIL: #3 Perto Noite (mesmo km, turno pior p/ 07:00), got', names[2]);
  process.exit(1);
}
if (names[3] !== 'Longe Barata') {
  console.error('FAIL: #4 Longe Barata (distância manda), got', names[3]);
  process.exit(1);
}
console.log('OK ordem distância → data/hora → preço');

