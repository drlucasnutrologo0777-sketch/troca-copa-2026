/* Babá ON — distância (igual Medico de Casa): GPS/lat-lng → CEP BrasilAPI → Nominatim.
   Mostra só km na busca — sem endereço do profissional. */

const ic24CepGeoCache = {};

function ic24HaversineKm(lat1, lon1, lat2, lon2) {
  const a1 = Number(lat1);
  const o1 = Number(lon1);
  const a2 = Number(lat2);
  const o2 = Number(lon2);
  if (![a1, o1, a2, o2].every((n) => Number.isFinite(n))) return null;
  const R = 6371;
  const dLat = ((a2 - a1) * Math.PI) / 180;
  const dLon = ((o2 - o1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function ic24GeocodeQuery(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?q=' +
      encodeURIComponent(q) +
      '&format=json&limit=1&countrycodes=br';
    const r = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'BabaON/1.0 (distancia)' },
    });
    if (!r.ok) return null;
    const arr = await r.json();
    const hit = arr && arr[0];
    if (!hit?.lat || !hit?.lon) return null;
    return { lat: Number(hit.lat), lng: Number(hit.lon) };
  } catch (_) {
    return null;
  }
}

async function ic24GeocodeViaCep(cep) {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const r = await fetch('https://viacep.com.br/ws/' + digits + '/json/');
    if (!r.ok) return null;
    const j = await r.json();
    if (j.erro) return null;
    const q = [j.logradouro, j.bairro, j.localidade, j.uf, 'Brasil'].filter(Boolean).join(', ');
    return ic24GeocodeQuery(q);
  } catch (_) {
    return null;
  }
}

async function ic24GeocodeCep(cep) {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  if (ic24CepGeoCache[digits]) return ic24CepGeoCache[digits];
  try {
    const r = await fetch('https://brasilapi.com.br/api/cep/v2/' + digits);
    let j = null;
    if (r.ok) j = await r.json();
    let lat = j?.location?.coordinates?.latitude;
    let lng = j?.location?.coordinates?.longitude;
    if (lat == null || lng == null) {
      const q = j
        ? [j.street, j.neighborhood, j.city, j.state, 'Brasil'].filter(Boolean).join(', ')
        : '';
      const fb = q ? await ic24GeocodeQuery(q) : null;
      if (fb) {
        lat = fb.lat;
        lng = fb.lng;
      } else {
        const via = await ic24GeocodeViaCep(digits);
        if (via) {
          lat = via.lat;
          lng = via.lng;
        }
      }
    }
    if (lat == null || lng == null) return null;
    ic24CepGeoCache[digits] = { lat: Number(lat), lng: Number(lng) };
    return ic24CepGeoCache[digits];
  } catch (_) {
    return ic24GeocodeViaCep(digits);
  }
}

async function ic24ResolverCoordenadas(ent) {
  ent = ent || {};
  if (ent.latitude != null && ent.longitude != null) {
    return { lat: Number(ent.latitude), lng: Number(ent.longitude) };
  }
  if (ent.lat != null && ent.lng != null) {
    return { lat: Number(ent.lat), lng: Number(ent.lng) };
  }
  if (ent.cep) {
    const fromCep = await ic24GeocodeCep(ent.cep);
    if (fromCep) return fromCep;
  }
  if (ent.address || ent.street) {
    const q =
      [ent.street, ent.neighborhood, ent.city, ent.state, 'Brasil'].filter(Boolean).join(', ') ||
      ent.address;
    return ic24GeocodeQuery(q);
  }
  return null;
}

function ic24BabaRaioKm(doc) {
  doc = doc || {};
  let ag = doc.agenda;
  if (!ag && Array.isArray(doc.agendas)) {
    ag = doc.agendas.find((a) => a && a.active !== false) || doc.agendas[0];
  }
  if (typeof doc.plantaoHoje === 'string') {
    try {
      doc.plantaoHoje = JSON.parse(doc.plantaoHoje);
    } catch (_) {
      /* ignore */
    }
  }
  const r = Number(ag?.raioKm ?? doc.raioKm ?? doc.plantaoHoje?.raioKm ?? 0);
  return r > 0 ? r : 0;
}

/** Alias do Medico de Casa — mesmo helper. */
function ic24DoctorRaioKm(doc) {
  return ic24BabaRaioKm(doc);
}

function ic24FmtDistanciaKm(km, withinRadius) {
  if (km == null || !Number.isFinite(km)) return '';
  const txt = km.toFixed(1).replace('.0', '') + ' km';
  if (withinRadius === false) return txt + ' (fora do raio)';
  return txt;
}

/** Sênior → Babá Premium (lista dos pais). */
function ic24RotuloNivelBaba(c) {
  const level = String((c && c.classification && c.classification.level) || '').toLowerCase();
  const label = String((c && c.classification && c.classification.label) || '').toLowerCase();
  if (level === 'senior' || label.includes('sênior') || label.includes('senior')) return 'Babá Premium';
  if (level === 'pleno' || label.includes('pleno')) return 'Babá Certificada';
  if (level === 'junior' || label.includes('júnior') || label.includes('junior')) return 'Babá';
  return 'Babá';
}

function ic24StatusDisponivelBaba(c) {
  if (c && (c.availableToday || (c.plantaoHoje && c.plantaoHoje.ativo))) return 'Disponível';
  return 'Agenda';
}

/** Dentro do raio primeiro (asc dist), depois fora do raio (asc dist). */
async function ic24OrdenarPorDistanciaRaio(items, originEnt, getTargetEnt, getRaioKm) {
  const origin = await ic24ResolverCoordenadas(originEnt);
  if (!origin) {
    return (items || []).map((i) => ({ ...i, distanceKm: null, withinRadius: true }));
  }
  const enriched = await Promise.all(
    (items || []).map(async (item) => {
      const targetRaw = typeof getTargetEnt === 'function' ? getTargetEnt(item) : item;
      const target = await ic24ResolverCoordenadas(targetRaw);
      let dist = null;
      if (target) dist = ic24HaversineKm(origin.lat, origin.lng, target.lat, target.lng);
      const raio = typeof getRaioKm === 'function' ? Number(getRaioKm(item)) || 0 : 0;
      const withinRadius = dist == null || raio <= 0 || dist <= raio;
      return {
        ...item,
        distanceKm: dist != null ? Math.round(dist * 10) / 10 : null,
        withinRadius,
        nivelLabel: ic24RotuloNivelBaba(item),
        disponivelLabel: ic24StatusDisponivelBaba(item),
        distanceLabel: dist != null ? ic24FmtDistanciaKm(dist, withinRadius) : null,
      };
    }),
  );
  enriched.sort((a, b) => {
    if (a.withinRadius !== b.withinRadius) return a.withinRadius ? -1 : 1;
    const da = a.distanceKm ?? 99999;
    const db = b.distanceKm ?? 99999;
    return da - db;
  });
  return enriched;
}

/**
 * GPS preciso (quando o usuário autoriza). Salva lat/lng sem expor endereço na busca.
 * collection: 'clients' | 'caregivers'
 */
async function ic24CapturarGpsESalvar(collection) {
  if (!navigator.geolocation) throw new Error('GPS indisponível neste dispositivo');
  ic24InitFirebase();
  const uid = ic24Auth?.currentUser?.uid;
  if (!uid) throw new Error('Faça login');
  const pos = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60000,
    });
  });
  const latitude = pos.coords.latitude;
  const longitude = pos.coords.longitude;
  const accuracyM = Math.round(pos.coords.accuracy || 0);
  const patch = {
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    locationAccuracyM: accuracyM,
    locationSource: 'gps',
    locationUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await ic24Db.collection(collection).doc(uid).set(patch, { merge: true });
  await ic24Db.collection('users').doc(uid).set(
    {
      latitude,
      longitude,
      locationSource: 'gps',
      locationUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { latitude, longitude, accuracyM };
}
