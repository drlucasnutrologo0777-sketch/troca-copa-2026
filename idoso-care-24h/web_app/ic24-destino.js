/* Idoso Care 24H — Serviços em outros lugares (país / estado / cidade). */

const IC24_DESTINO_COLLECTION = 'caregiver_destination_availability';
const IC24_DESTINO_MIN_DIAS_ANTECEDENCIA = 15;

function ic24DateOnlyIso(d) {
  if (!d && typeof ic24HojeIsoBr === 'function') return ic24HojeIsoBr();
  const x = d instanceof Date ? d : new Date();
  if (!d) {
    return x.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  }
  return x.toISOString().slice(0, 10);
}

function ic24AddDaysIso(isoDate, days) {
  const d = new Date(String(isoDate).slice(0, 10) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function ic24IsoAddDays(isoDate, days) {
  return ic24AddDaysIso(isoDate, days);
}

function ic24CepDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

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

/** UF → nome (Brasil) — chave normalizada 2 letras */
const IC24_BR_UF = {
  ac: 'Acre',
  al: 'Alagoas',
  ap: 'Amapá',
  am: 'Amazonas',
  ba: 'Bahia',
  ce: 'Ceará',
  df: 'Distrito Federal',
  es: 'Espírito Santo',
  go: 'Goiás',
  ma: 'Maranhão',
  mt: 'Mato Grosso',
  ms: 'Mato Grosso do Sul',
  mg: 'Minas Gerais',
  pa: 'Pará',
  pb: 'Paraíba',
  pr: 'Paraná',
  pe: 'Pernambuco',
  pi: 'Piauí',
  rj: 'Rio de Janeiro',
  rn: 'Rio Grande do Norte',
  rs: 'Rio Grande do Sul',
  ro: 'Rondônia',
  rr: 'Roraima',
  sc: 'Santa Catarina',
  sp: 'São Paulo',
  se: 'Sergipe',
  to: 'Tocantins',
};

function ic24DestinoIsBr(country) {
  const iso = ic24CountryIso2(country || 'Brasil');
  return iso === 'br' || ic24NormLocalText(country).includes('brasil');
}

function ic24DestinoStateNorm(state, country) {
  const s = ic24NormLocalText(state);
  if (!s) return '';
  if (ic24DestinoIsBr(country)) {
    if (s.length === 2 && IC24_BR_UF[s]) return s;
    for (const [uf, name] of Object.entries(IC24_BR_UF)) {
      if (s === uf || s === ic24NormLocalText(name)) return uf;
    }
  }
  return s.slice(0, 48);
}

function ic24DestinoLocNorm(country, state, city) {
  return {
    countryNorm: ic24NormLocalText(country || 'Brasil') || 'brasil',
    stateNorm: ic24DestinoStateNorm(state, country),
    cityNorm: ic24NormLocalText(city),
  };
}

function ic24DestinoStateQueryVariants(state, country) {
  const out = new Set();
  const raw = String(state || '').trim();
  if (raw) out.add(raw);
  const sn = ic24DestinoStateNorm(state, country);
  if (sn) {
    out.add(sn.toUpperCase());
    out.add(sn);
    const name = IC24_BR_UF[sn];
    if (name) {
      out.add(name);
      out.add(name.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    }
  }
  return [...out].filter(Boolean).slice(0, 8);
}

function ic24DestinoEstadosEquivalentes(stateA, countryA, stateB, countryB) {
  const na = ic24DestinoStateNorm(stateA, countryA);
  const nb = ic24DestinoStateNorm(stateB, countryB);
  if (na && nb && na === nb) return true;
  const a = ic24NormLocalText(stateA);
  const b = ic24NormLocalText(stateB);
  if (!a || !b) return false;
  return a === b;
}

function ic24FamiliaEnderecoUtilDestino(famLoc) {
  famLoc = famLoc || {};
  const cep = ic24CepDigits(famLoc.cep || famLoc.postalCode);
  if (cep.length >= 8) return true;
  if (String(famLoc.city || '').trim()) return true;
  if (String(famLoc.state || '').trim()) return true;
  return false;
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
      headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'IdosoCare24H/2.0 (servicos-outros-lugares)' },
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
  if (!uid) throw new Error('Faça login como cuidador');
  const cgSnap = await ic24Db.collection('caregivers').doc(uid).get();
  if (typeof ic24AssertMarketplaceUnblocked === 'function') {
    ic24AssertMarketplaceUnblocked(cgSnap.data() || {});
  }

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
  const minStart = ic24AddDaysIso(ic24DateOnlyIso(), IC24_DESTINO_MIN_DIAS_ANTECEDENCIA);
  if (periodStart < minStart) {
    throw new Error(
      'Data de início deve ser pelo menos ' +
        IC24_DESTINO_MIN_DIAS_ANTECEDENCIA +
        ' dias após hoje (' +
        minStart +
        ' ou depois)',
    );
  }

  const targetDiarias = Math.max(1, parseInt(payload.targetDiarias, 10) || 1);
  const dailyRate = Number(payload.dailyRate) || 0;
  const ratesByScale = payload.ratesByScale || null;
  if (dailyRate <= 0 && !(ratesByScale && Object.keys(ratesByScale).length)) {
    throw new Error('Informe o valor da diária (referência)');
  }

  const cg = cgSnap.data() || {};
  const geo = await ic24GeocodeDestinoEndereco({
    country,
    state,
    city,
    cep: payload.cep,
    streetNumber: payload.streetNumber,
  });

  const locNorm = ic24DestinoLocNorm(country, state, city);
  const ref = ic24Db.collection(IC24_DESTINO_COLLECTION).doc();
  const doc = {
    id: ref.id,
    caregiverId: uid,
    caregiverName: cg.fullName || 'Cuidador',
    status: 'open',
    country,
    state,
    city,
    countryNorm: locNorm.countryNorm,
    stateNorm: locNorm.stateNorm,
    cityNorm: locNorm.cityNorm,
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

/** Preenche stateNorm/cityNorm em anúncios abertos legados (máx. 8 por execução). */
async function ic24JanitorBackfillDestinoNorm(caregiverId) {
  if (!caregiverId || typeof IC24_DESTINO_COLLECTION === 'undefined') return 0;
  ic24InitFirebase();
  let snap;
  try {
    snap = await ic24Db.collection(IC24_DESTINO_COLLECTION).where('caregiverId', '==', caregiverId).limit(20).get();
  } catch (_) {
    return 0;
  }
  let n = 0;
  for (const doc of snap.docs) {
    if (n >= 8) break;
    const a = doc.data();
    if (a.status !== 'open') continue;
    if (a.stateNorm && a.cityNorm) continue;
    const norms = ic24DestinoLocNorm(a.country, a.state, a.city);
    if (!norms.stateNorm && !norms.cityNorm) continue;
    try {
      await doc.ref.update({
        ...norms,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      n++;
    } catch (_) {}
  }
  return n;
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

async function ic24FecharDestinoSeOfertaMatch(offer) {
  if (!offer?.destinationAvailabilityId) return;
  ic24InitFirebase();
  const destId = String(offer.destinationAvailabilityId);
  const ref = ic24Db.collection(IC24_DESTINO_COLLECTION).doc(destId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().status !== 'open') return;
  const offerId = offer.id || offer.offerId || null;
  const familyId = offer.familyId || ic24Auth.currentUser?.uid || null;
  await ref.update({
    status: 'matched',
    matchedOfferId: offerId,
    matchedFamilyId: familyId,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function ic24DestinoCombinaFamilia(anuncio, fam) {
  fam = fam || {};
  anuncio = anuncio || {};
  const fc = ic24NormLocalText(fam.city);
  const fs = ic24NormLocalText(fam.state);
  const fco = ic24NormLocalText(fam.country || 'Brasil');
  const ac = ic24NormLocalText(anuncio.city);
  const as = ic24NormLocalText(anuncio.state);
  const aco = ic24NormLocalText(anuncio.country);
  const fcep = ic24CepDigits(fam.cep || fam.postalCode);
  const acep = ic24CepDigits(anuncio.postalCode);
  if (fcep.length >= 8 && acep.length >= 8 && fcep === acep) return true;
  if (fcep.length >= 5 && acep.length >= 5 && fcep.slice(0, 5) === acep.slice(0, 5)) {
    if (!fc || !ac || fc === ac) return true;
  }
  if (fc && ac && fc === ac) {
    if (fs && as && !ic24DestinoEstadosEquivalentes(fam.state, fam.country, anuncio.state, anuncio.country)) return false;
    return true;
  }
  const anNorm = anuncio.stateNorm || ic24DestinoStateNorm(anuncio.state, anuncio.country);
  const famNorm = ic24DestinoStateNorm(fam.state, fam.country);
  if (famNorm && anNorm && famNorm === anNorm && (!fc || !ac)) return true;
  if (fs && as && ic24DestinoEstadosEquivalentes(fam.state, fam.country, anuncio.state, anuncio.country) && (!fc || !ac))
    return true;
  if (fco && aco && fco === aco && !fc && !ac && !fs && !as) return true;
  return false;
}

const IC24_DESTINO_LIST_LIMIT = 100;

async function ic24MergeDestinoQueryInto(map, queryPromise) {
  try {
    const snap = await queryPromise;
    snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('ic24MergeDestinoQueryInto', e);
  }
}

/** Busca anúncios abertos: prioriza estado/cidade da família, depois pool global. */
async function ic24CarregarPoolDestinosAbertos(famLoc, showAll) {
  ic24InitFirebase();
  const merged = new Map();
  const col = ic24Db.collection(IC24_DESTINO_COLLECTION);
  const ci = String(famLoc.city || '').trim();
  const stateNorm = ic24DestinoStateNorm(famLoc.state, famLoc.country);

  if (!showAll) {
    const stVariants = ic24DestinoStateQueryVariants(famLoc.state, famLoc.country);
    for (const st of stVariants) {
      await ic24MergeDestinoQueryInto(
        merged,
        col.where('status', '==', 'open').where('state', '==', st).orderBy('createdAt', 'desc').limit(IC24_DESTINO_LIST_LIMIT).get(),
      );
    }
    if (stateNorm) {
      await ic24MergeDestinoQueryInto(
        merged,
        col
          .where('status', '==', 'open')
          .where('stateNorm', '==', stateNorm)
          .orderBy('createdAt', 'desc')
          .limit(IC24_DESTINO_LIST_LIMIT)
          .get(),
      );
    }
    if (ci) {
      await ic24MergeDestinoQueryInto(
        merged,
        col.where('status', '==', 'open').where('city', '==', ci).orderBy('createdAt', 'desc').limit(IC24_DESTINO_LIST_LIMIT).get(),
      );
      const cn = ic24NormLocalText(ci);
      if (cn && cn !== ci.toLowerCase()) {
        await ic24MergeDestinoQueryInto(
          merged,
          col.where('status', '==', 'open').where('cityNorm', '==', cn).orderBy('createdAt', 'desc').limit(IC24_DESTINO_LIST_LIMIT).get(),
        );
      }
    }
  }
  if (showAll || merged.size < 12) {
    await ic24MergeDestinoQueryInto(
      merged,
      col.where('status', '==', 'open').orderBy('createdAt', 'desc').limit(IC24_DESTINO_LIST_LIMIT).get(),
    );
  }
  if (!merged.size) {
    await ic24MergeDestinoQueryInto(merged, col.where('status', '==', 'open').limit(IC24_DESTINO_LIST_LIMIT).get());
  }
  return [...merged.values()];
}

async function ic24ListarTrabalhosOutroLugarParaFamilia(opts) {
  ic24InitFirebase();
  const familyId = ic24Auth.currentUser?.uid;
  if (!familyId) return { list: [], familyLocation: {} };
  const clientSnap = await ic24Db.collection('clients').doc(familyId).get();
  const fam = clientSnap.data() || {};
  const userSnap = await ic24Db.collection('users').doc(familyId).get();
  const u = userSnap.data() || {};
  const famLoc = {
    city: fam.city || u.city || '',
    state: fam.state || u.state || '',
    country: fam.country || u.country || 'Brasil',
    cep: fam.cep || u.cep || '',
    postalCode: fam.postalCode || fam.cep || u.postalCode || u.cep || '',
  };

  const showAll = !!(opts && opts.showAll);
  const onlyMatch = !showAll;
  let list = await ic24CarregarPoolDestinosAbertos(famLoc, showAll);
  const today =
    typeof ic24HojeIsoBr === 'function' ? ic24HojeIsoBr() : new Date().toISOString().slice(0, 10);
  list = list.filter((a) => {
    if (typeof ic24IsDestinoAnuncioExpired === 'function' && ic24IsDestinoAnuncioExpired(a)) return false;
    return !a.periodEnd || a.periodEnd >= today;
  });

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
    let hideSandbox = false;
    if (typeof ic24IsSandboxMarketplaceEmail === 'function') {
      let em = cgCache['email:' + a.caregiverId];
      if (em === undefined) {
        const us = await ic24Db.collection('users').doc(a.caregiverId).get();
        em = us.data()?.email || '';
        cgCache['email:' + a.caregiverId] = em;
      }
      const famEm = u.email || '';
      if (ic24IsSandboxMarketplaceEmail(em) && !ic24IsSandboxMarketplaceEmail(famEm)) hideSandbox = true;
    }
    if (hideSandbox) continue;
    out.push({
      ...a,
      caregiverPhoto: cg.photoUrl || null,
      caregiverRating: cg.rating,
    });
  }

  let sorted = out;
  if (typeof ic24OrdenarPorDistanciaRaio === 'function') {
    const need = { data: today, hora: null };
    sorted = await ic24OrdenarPorDistanciaRaio(
      out,
      famLoc,
      (row) => ({
        latitude: row.latitude,
        longitude: row.longitude,
        lat: row.latitude,
        lng: row.longitude,
        cep: row.postalCode,
        city: row.city,
        state: row.state,
        country: row.country,
      }),
      () => 0,
      need,
    );
  } else {
    sorted = out.slice().sort((a, b) => {
      const da = String(a.periodStart || '');
      const db = String(b.periodStart || '');
      if (da !== db) return da.localeCompare(db);
      return Number(a.dailyRate || 999999) - Number(b.dailyRate || 999999);
    });
  }
  return { list: sorted, familyLocation: famLoc };
}
