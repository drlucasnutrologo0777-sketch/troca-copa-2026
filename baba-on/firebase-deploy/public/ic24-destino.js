/* Babá ON — Trabalhar em outro lugar (país / estado / cidade). Tópico à parte da agenda local. */

const IC24_DESTINO_COLLECTION = 'caregiver_destination_availability';

function ic24NormLocalText(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function ic24CountryIso2(country) {
  const c = ic24NormLocalText(country);
  if (!c) return '';
  if (c === 'br' || c === 'bra' || c.includes('brasil') || c.includes('brazil')) return 'br';
  if (c === 'us' || c === 'usa' || c.includes('estados unidos') || c.includes('united states')) return 'us';
  if (c.length === 2) return c;
  return '';
}

async function ic24GeocodeQueryDestino(query, countryIso2) {
  const q = String(query || '').trim();
  if (!q) return null;
  try {
    let url =
      'https://nominatim.openstreetmap.org/search?q=' +
      encodeURIComponent(q) +
      '&format=json&limit=1';
    const iso = String(countryIso2 || '').trim().toLowerCase();
    if (iso) url += '&countrycodes=' + iso;
    const r = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'BabaON/1.0 (destino-trabalho)' },
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

/** Geocode opcional — CEP/número não obrigatórios. */
async function ic24GeocodeDestinoEndereco({ country, state, city, cep, streetNumber }) {
  const iso = ic24CountryIso2(country);
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length === 8 && iso === 'br' && typeof ic24GeocodeCep === 'function') {
    const br = await ic24GeocodeCep(digits);
    if (br) return { ...br, postalCode: digits };
  }
  const parts = [];
  if (streetNumber) parts.push(String(streetNumber).trim());
  if (cep) parts.push(String(cep).trim());
  parts.push(city, state, country);
  const q = parts.filter(Boolean).join(', ');
  return ic24GeocodeQueryDestino(q, iso);
}

function ic24ResumoDestinoAnuncio(d) {
  d = d || {};
  const loc = [d.city, d.state, d.country].filter(Boolean).join(' — ');
  const per =
    d.periodStart && d.periodEnd ? d.periodStart + ' → ' + d.periodEnd : 'Período não informado';
  const dias = d.targetDiarias ? d.targetDiarias + ' diária(s)' : '';
  return loc + ' · ' + per + (dias ? ' · ' + dias : '');
}

async function ic24PublicarTrabalhoOutroLugar(payload) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) throw new Error('Faça login como babá');

  const country = String(payload.country || '').trim();
  const state = String(payload.state || '').trim();
  const city = String(payload.city || '').trim();
  if (!country) throw new Error('Informe o país');
  if (!state) throw new Error('Informe o estado');
  if (!city) throw new Error('Informe a cidade');

  const periodStart = String(payload.periodStart || '').trim();
  const periodEnd = String(payload.periodEnd || '').trim();
  if (!periodStart || !periodEnd) throw new Error('Informe data início e fim do período');
  if (periodEnd < periodStart) throw new Error('Data fim deve ser após a data início');

  const targetDiarias = Math.max(1, parseInt(payload.targetDiarias, 10) || 1);
  const dailyRate = Number(payload.dailyRate) || 0;
  const ratesByScale = payload.ratesByScale || null;
  if (dailyRate <= 0 && !(ratesByScale && Object.keys(ratesByScale).length)) {
    throw new Error('Informe o valor da diária (referência)');
  }

  const cgSnap = await ic24Db.collection('caregivers').doc(uid).get();
  const cg = cgSnap.data() || {};
  const geo = await ic24GeocodeDestinoEndereco({
    country,
    state,
    city,
    cep: payload.cep,
    streetNumber: payload.streetNumber,
  });

  const ref = ic24Db.collection(IC24_DESTINO_COLLECTION).doc();
  const doc = {
    id: ref.id,
    caregiverId: uid,
    caregiverName: cg.fullName || 'Babá',
    status: 'open',
    country,
    state,
    city,
    postalCode: String(payload.cep || '').trim(),
    streetNumber: String(payload.streetNumber || '').trim(),
    periodStart,
    periodEnd,
    targetDiarias,
    dailyRate: dailyRate > 0 ? dailyRate : ic24RateForScale(ratesByScale, '12', 0),
    ratesByScale: ratesByScale || null,
    notes: String(payload.notes || '').trim(),
    latitude: geo?.lat ?? null,
    longitude: geo?.lng ?? null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(doc);
  return doc;
}

async function ic24ListarMeusTrabalhosOutroLugar() {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await ic24Db
    .collection(IC24_DESTINO_COLLECTION)
    .where('caregiverId', '==', uid)
    .limit(30)
    .get();
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => String(b.periodStart || '').localeCompare(String(a.periodStart || '')));
  return list;
}

async function ic24CancelarTrabalhoOutroLugar(id) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid || !id) throw new Error('Anúncio inválido');
  const ref = ic24Db.collection(IC24_DESTINO_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Anúncio não encontrado');
  if (snap.data().caregiverId !== uid) throw new Error('Sem permissão');
  if (snap.data().status !== 'open') throw new Error('Só é possível cancelar anúncios abertos');
  await ref.update({
    status: 'cancelled',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

/** Remove o anúncio da lista (Minhas ofertas). Negócio já fechado não pode excluir. */
async function ic24ExcluirTrabalhoOutroLugar(id) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid || !id) throw new Error('Anúncio inválido');
  const ref = ic24Db.collection(IC24_DESTINO_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;
  if (snap.data().caregiverId !== uid) throw new Error('Sem permissão');
  if (snap.data().status === 'matched') {
    throw new Error('Este anúncio já virou negócio fechado — não dá para excluir');
  }
  await ref.delete();
}

function ic24DestinoCombinaFamilia(anuncio, fam) {
  fam = fam || {};
  const fc = ic24NormLocalText(fam.city);
  const fs = ic24NormLocalText(fam.state);
  const fco = ic24NormLocalText(fam.country || 'Brasil');
  const ac = ic24NormLocalText(anuncio.city);
  const as = ic24NormLocalText(anuncio.state);
  const aco = ic24NormLocalText(anuncio.country);
  if (fc && ac && fc === ac) return true;
  if (fs && as && fs === as && (!fc || !ac)) return true;
  if (fco && aco && fco === aco && !fc && !ac) return true;
  return false;
}

/** Família: babás que anunciaram destino compatível com cidade/UF do cadastro. */
async function ic24ListarTrabalhosOutroLugarParaFamilia(opts) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) return [];
  const clientSnap = await ic24Db.collection('clients').doc(familyId).get();
  const fam = clientSnap.data() || {};
  const userSnap = await ic24Db.collection('users').doc(familyId).get();
  const u = userSnap.data() || {};
  const famLoc = {
    city: fam.city || u.city || '',
    state: fam.state || u.state || '',
    country: fam.country || u.country || 'Brasil',
  };

  const onlyMatch = !(opts && opts.showAll);
  let snap;
  try {
    snap = await ic24Db
      .collection(IC24_DESTINO_COLLECTION)
      .where('status', '==', 'open')
      .orderBy('createdAt', 'desc')
      .limit(40)
      .get();
  } catch (_e) {
    snap = await ic24Db.collection(IC24_DESTINO_COLLECTION).where('status', '==', 'open').limit(40).get();
  }
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const today = new Date().toISOString().slice(0, 10);
  list = list.filter((a) => !a.periodEnd || a.periodEnd >= today);

  const cgCache = {};
  const out = [];
  for (const a of list) {
    if (onlyMatch && !ic24DestinoCombinaFamilia(a, famLoc)) continue;
    let cg = cgCache[a.caregiverId];
    if (!cg) {
      const cs = await ic24Db.collection('caregivers').doc(a.caregiverId).get();
      cg = cs.exists ? cs.data() : null;
      cgCache[a.caregiverId] = cg;
    }
    if (!cg || cg.approved !== true || cg.activeFamilyId) continue;
    out.push({
      ...a,
      caregiverPhoto: cg.photoUrl || null,
      caregiverRating: cg.rating,
    });
  }
  return { list: out, familyLocation: famLoc };
}
