/* Idoso Care 24H — distância (CEP/GPS/endereço cadastro). Só km na busca — sem endereço do cuidador. */

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
      headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'IdosoCare24H/2.0 (distancia)' },
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

function ic24CuidadorRaioKm(doc) {
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

function ic24BabaRaioKm(doc) {
  return ic24CuidadorRaioKm(doc);
}

function ic24FmtDistanciaKm(km, withinRadius) {
  if (km == null || !Number.isFinite(km)) return '';
  const txt = km.toFixed(1).replace('.0', '') + ' km';
  if (withinRadius === false) return txt + ' (fora do raio)';
  return txt;
}

function ic24RotuloNivelCuidador(c) {
  const level = String((c && c.classification && c.classification.level) || '').toLowerCase();
  const label = String((c && c.classification && c.classification.label) || '').toLowerCase();
  if (level === 'senior' || label.includes('sênior') || label.includes('senior')) return 'Cuidador Sênior';
  if (level === 'pleno' || label.includes('pleno')) return 'Cuidador certificado';
  if (level === 'junior' || label.includes('júnior') || label.includes('junior')) return 'Cuidador';
  return 'Cuidador';
}

function ic24RotuloNivelBaba(c) {
  return ic24RotuloNivelCuidador(c);
}

function ic24StatusDisponivelCuidador(c) {
  if (c && (c.availableToday || (c.plantaoHoje && c.plantaoHoje.ativo))) return 'Disponível hoje';
  return 'Agenda';
}

function ic24StatusDisponivelBaba(c) {
  return ic24StatusDisponivelCuidador(c);
}

async function ic24OrdenarPorDistanciaRaio(items, originEnt, getTargetEnt, getRaioKm, need) {
  const origin = await ic24ResolverCoordenadas(originEnt);
  if (!origin) {
    const bare = (items || []).map((i) => ({
      ...i,
      distanceKm: null,
      withinRadius: true,
      distanceSort: 99999,
      nivelLabel: ic24RotuloNivelCuidador(i),
      disponivelLabel: ic24StatusDisponivelCuidador(i),
      priceSort: typeof ic24PrecoDiariaNumerico === 'function' ? ic24PrecoDiariaNumerico(i) : 999999,
      scheduleScore: typeof ic24ScoreDataHora === 'function' ? ic24ScoreDataHora(i, need) : 9,
      scheduleLabel: typeof ic24LabelDataHora === 'function' ? ic24LabelDataHora(i, need) : '',
    }));
    bare.sort((a, b) => ic24CompareBuscaCuidador(a, b));
    return bare;
  }
  const enriched = await Promise.all(
    (items || []).map(async (item) => {
      const targetRaw = typeof getTargetEnt === 'function' ? getTargetEnt(item) : item;
      const target = await ic24ResolverCoordenadas(targetRaw);
      let dist = null;
      if (target) dist = ic24HaversineKm(origin.lat, origin.lng, target.lat, target.lng);
      const raio = typeof getRaioKm === 'function' ? Number(getRaioKm(item)) || 0 : 0;
      const withinRadius = dist == null || raio <= 0 || dist <= raio;
      const distanceKm = dist != null ? Math.round(dist * 10) / 10 : null;
      return {
        ...item,
        distanceKm,
        distanceSort: distanceKm != null ? distanceKm : 99999,
        withinRadius,
        nivelLabel: ic24RotuloNivelCuidador(item),
        disponivelLabel: ic24StatusDisponivelCuidador(item),
        distanceLabel: dist != null ? ic24FmtDistanciaKm(dist, withinRadius) : null,
        priceSort: typeof ic24PrecoDiariaNumerico === 'function' ? ic24PrecoDiariaNumerico(item) : 999999,
        scheduleScore: typeof ic24ScoreDataHora === 'function' ? ic24ScoreDataHora(item, need) : 9,
        scheduleLabel: typeof ic24LabelDataHora === 'function' ? ic24LabelDataHora(item, need) : '',
      };
    }),
  );
  enriched.sort((a, b) => ic24CompareBuscaCuidador(a, b));
  return enriched;
}

function ic24CompareBuscaCuidador(a, b) {
  const da = a.distanceSort ?? a.distanceKm ?? 99999;
  const db = b.distanceSort ?? b.distanceKm ?? 99999;
  if (da !== db) return da - db;
  const sa = a.scheduleScore ?? 9;
  const sb = b.scheduleScore ?? 9;
  if (sa !== sb) return sa - sb;
  const pa = a.priceSort || 999999;
  const pb = b.priceSort || 999999;
  if (pa !== pb) return pa - pb;
  if (a.withinRadius !== b.withinRadius) return a.withinRadius ? -1 : 1;
  return String(a.fullName || '').localeCompare(String(b.fullName || ''), 'pt-BR');
}

function ic24CompareBuscaBaba(a, b) {
  return ic24CompareBuscaCuidador(a, b);
}

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
