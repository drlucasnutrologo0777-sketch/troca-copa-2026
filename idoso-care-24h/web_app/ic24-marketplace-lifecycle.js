/* Idoso Care 24H — vigência, mural limpo e auto-destruição cooperativa (ofertas + plantões + sandbox). */

const IC24_OPEN_OFFER_MAX_DAYS = 30;

const IC24_NEGOTIATION_STALE_DAYS = 14;

const IC24_JANITOR_THROTTLE_MS = 4 * 60 * 1000;

const IC24_SANDBOX_DESTINO_PURGE_DAYS = 3;

const IC24_JANITOR = {

  lastAt: { family: 0, caregiver: 0, any: 0 },

  uid: null,

  familySandboxCache: { at: 0, ids: new Set() },

};

function ic24HojeIsoBr() {

  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

}

function ic24TsToIso(ts) {

  if (!ts) return null;

  if (typeof ts === 'string') return ts.slice(0, 10);

  if (ts.toDate) return ts.toDate().toISOString().slice(0, 10);

  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString().slice(0, 10);

  return null;

}

function ic24IsoAddDaysFromIso(isoDate, days) {

  const d = new Date(String(isoDate).slice(0, 10) + 'T12:00:00Z');

  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);

}

function ic24IsJobOfferExpired(o) {

  o = o || {};

  const hoje = ic24HojeIsoBr();

  const svc = String(o.serviceDate || '').slice(0, 10);

  if (svc && svc < hoje) return true;

  const urg = o.urgent === true || o.scheduleType === 'urgente_hoje';

  if (urg) {

    const criada = ic24TsToIso(o.createdAt);

    if (criada && criada < hoje) return true;

  }

  if (!svc) {

    const criada = ic24TsToIso(o.createdAt);

    if (criada) {

      const lim = ic24IsoAddDaysFromIso(criada, IC24_OPEN_OFFER_MAX_DAYS);

      if (lim < hoje) return true;

    }

  }

  return false;

}

/** Proposta parada em negociação / aguardando família por muito tempo. */

function ic24IsOfferNegotiationStale(o) {

  o = o || {};

  if (!['awaiting_terms', 'pending_family_approval', 'negotiating'].includes(o.status)) return false;

  const base = ic24TsToIso(o.updatedAt) || ic24TsToIso(o.createdAt);

  if (!base) return false;

  const lim = ic24IsoAddDaysFromIso(base, IC24_NEGOTIATION_STALE_DAYS);

  return lim < ic24HojeIsoBr();

}

function ic24ShouldAutoCancelOffer(o) {

  return ic24IsJobOfferExpired(o) || ic24IsOfferNegotiationStale(o);

}

function ic24FiltrarOfertasVisiveis(list) {

  return (list || []).filter((o) => o.status === 'open' && !ic24IsJobOfferExpired(o));

}

function ic24SortKeyOfertaParaBaba(o) {

  const svc = String(o.serviceDate || '9999-12-31').slice(0, 10);

  const dist = o.distanceSort ?? o.distanceKm ?? 99999;

  const rate = Number(o.dailyRate) || 999999;

  return { svc, dist, rate };

}

function ic24SortOfertasParaBaba(list) {

  return (list || []).slice().sort((a, b) => {

    const ka = ic24SortKeyOfertaParaBaba(a);

    const kb = ic24SortKeyOfertaParaBaba(b);

    if (ka.svc !== kb.svc) return ka.svc.localeCompare(kb.svc);

    if (ka.dist !== kb.dist) return ka.dist - kb.dist;

    if (ka.rate !== kb.rate) return ka.rate - kb.rate;

    const ta = ic24TsToIso(a.createdAt) || '';

    const tb = ic24TsToIso(b.createdAt) || '';

    return tb.localeCompare(ta);

  });

}

async function ic24EnriquecerOfertasDistanciaFamilia(list, originEnt) {

  if (!list.length || typeof ic24ResolverCoordenadas !== 'function' || typeof ic24HaversineKm !== 'function') {

    return list;

  }

  const origin = await ic24ResolverCoordenadas(originEnt || {});

  if (!origin) {

    return list.map((o) => ({ ...o, distanceKm: null, distanceSort: 99999 }));

  }

  const out = [];

  for (const o of list) {

    const fam = await ic24OrigemFamiliaParaDistancia(o.familyId);

    const target = await ic24ResolverCoordenadas(fam);

    let dist = null;

    if (target) dist = ic24HaversineKm(origin.lat, origin.lng, target.lat, target.lng);

    out.push({

      ...o,

      distanceKm: dist != null ? Math.round(dist * 10) / 10 : null,

      distanceSort: dist != null ? dist : 99999,

    });

  }

  return out;

}

async function ic24JanitorMarkOfferCancelled(offerId, reason) {

  ic24InitFirebase();

  await ic24Db.collection('job_offers').doc(offerId).set(

    {

      status: 'cancelled',

      cancelReason: reason || 'auto_expired',

      janitorAt: firebase.firestore.FieldValue.serverTimestamp(),

      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),

    },

    { merge: true },

  );

}

/** Família: cancela no Firestore ofertas próprias vencidas ou negociação morta. */

async function ic24EncerrarOfertasVencidasFamilia(familyId) {

  if (!familyId) return 0;

  ic24InitFirebase();

  let snap;

  try {

    snap = await ic24Db.collection('job_offers').where('familyId', '==', familyId).limit(40).get();

  } catch (_) {

    return 0;

  }

  let n = 0;

  for (const doc of snap.docs) {

    const o = { id: doc.id, ...doc.data() };

    if (o.status !== 'open' && o.status !== 'negotiating' && o.status !== 'pending_family_approval') continue;

    if (o.status === 'open' && !ic24ShouldAutoCancelOffer(o)) continue;

    if (o.status !== 'open' && !ic24IsOfferNegotiationStale(o)) continue;

    try {

      await ic24JanitorMarkOfferCancelled(o.id, o.status === 'open' ? 'auto_expired' : 'auto_stale_negotiation');

      n++;

    } catch (_) {

      /* sem permissão ou rede */

    }

  }

  return n;

}

function ic24IsDestinoAnuncioExpired(a) {

  a = a || {};

  const hoje = ic24HojeIsoBr();

  const fim = String(a.periodEnd || '').slice(0, 10);

  if (fim && fim < hoje) return true;

  return false;

}

function ic24IsoPublicacaoPlantao(p) {

  if (!p) return null;

  const raw = p.publicadoEm || p.createdAt || p.updatedAt;

  if (typeof raw === 'string') return raw.slice(0, 10);

  return ic24TsToIso(raw);

}

/** Plantão “hoje” publicado em dia anterior — não deve aparecer no mural. */

function ic24IsPlantaoDoDiaExpirado(p) {

  if (!p || p.ativo !== true) return false;

  const pub = ic24IsoPublicacaoPlantao(p);

  if (!pub) return false;

  return pub < ic24HojeIsoBr();

}

function ic24CaregiverPlantaoVisivel(c) {

  c = c || {};

  if (c.activeFamilyId) return false;

  if (!c.availableToday && !(c.plantaoHoje && c.plantaoHoje.ativo)) {

    const anyPlantao = (c.plantoes || []).some((p) => p && p.ativo);

    if (!anyPlantao) return true;

  }

  if (ic24IsPlantaoDoDiaExpirado(c.plantaoHoje)) return false;

  if ((c.plantoes || []).some((p) => p && p.ativo && ic24IsPlantaoDoDiaExpirado(p))) return false;

  return true;

}

async function ic24JanitorDesativarPlantoesVencidos(caregiverId) {

  if (!caregiverId) return false;

  ic24InitFirebase();

  const ref = ic24Db.collection('caregivers').doc(caregiverId);

  const snap = await ref.get();

  if (!snap.exists) return false;

  const d = snap.data() || {};

  let changed = false;

  let plantaoHoje = d.plantaoHoje && typeof d.plantaoHoje === 'object' ? { ...d.plantaoHoje } : { ativo: false };

  let plantoes = Array.isArray(d.plantoes) ? d.plantoes.map((p) => ({ ...p })) : [];

  if (ic24IsPlantaoDoDiaExpirado(plantaoHoje)) {

    plantaoHoje.ativo = false;

    changed = true;

  }

  plantoes = plantoes.map((p) => {

    if (p && p.ativo && ic24IsPlantaoDoDiaExpirado(p)) {

      changed = true;

      return { ...p, ativo: false };

    }

    return p;

  });

  const stillActive =

    plantaoHoje.ativo === true || plantoes.some((p) => p && p.ativo) || d.availableToday === true;

  const patch = {};

  if (changed) {

    patch.plantaoHoje = plantaoHoje;

    patch.plantoes = plantoes;

    patch.availableToday = stillActive && !ic24IsPlantaoDoDiaExpirado(plantaoHoje);

    if (!patch.availableToday) patch.availableToday = plantoes.some((p) => p && p.ativo);

    patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    patch.plantaoJanitorAt = firebase.firestore.FieldValue.serverTimestamp();

  }

  if (Object.keys(patch).length) {

    await ref.set(patch, { merge: true });

  }

  return changed;

}

async function ic24JanitorEncerrarDestinosVencidos(caregiverId) {

  if (!caregiverId || typeof IC24_DESTINO_COLLECTION === 'undefined') return 0;

  ic24InitFirebase();

  let snap;

  try {

    snap = await ic24Db.collection(IC24_DESTINO_COLLECTION).where('caregiverId', '==', caregiverId).limit(25).get();

  } catch (_) {

    return 0;

  }

  let n = 0;

  for (const doc of snap.docs) {

    const a = { id: doc.id, ...doc.data() };

    if (a.status !== 'open') continue;

    if (!ic24IsDestinoAnuncioExpired(a)) continue;

    try {

      await ic24Db.collection(IC24_DESTINO_COLLECTION).doc(a.id).update({

        status: 'cancelled',

        cancelReason: 'auto_period_ended',

        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),

      });

      n++;

    } catch (_) {

      /* ignore */

    }

  }

  return n;

}

async function ic24JanitorPurgeSandboxResiduos(uid, email, role) {

  if (!uid || typeof ic24IsSandboxMarketplaceEmail !== 'function') return { offers: 0, destinos: 0, plantao: false };

  if (!ic24IsSandboxMarketplaceEmail(email)) return { offers: 0, destinos: 0, plantao: false };

  ic24InitFirebase();

  const out = { offers: 0, destinos: 0, plantao: false };

  if (role === 'family' || role === 'any') {

    try {

      const snap = await ic24Db.collection('job_offers').where('familyId', '==', uid).limit(50).get();

      for (const doc of snap.docs) {

        const o = doc.data();

        if (!['open', 'negotiating', 'pending_family_approval', 'awaiting_terms'].includes(o.status)) continue;

        try {

          await ic24JanitorMarkOfferCancelled(doc.id, 'auto_sandbox_purge');

          out.offers++;

        } catch (_) {

          /* ignore */

        }

      }

    } catch (_) {

      /* ignore */

    }

  }

  if (role === 'caregiver' || role === 'any') {

    out.plantao = await ic24JanitorDesativarPlantoesVencidos(uid);

    if (typeof IC24_DESTINO_COLLECTION !== 'undefined') {

      try {

        const snap = await ic24Db.collection(IC24_DESTINO_COLLECTION).where('caregiverId', '==', uid).limit(40).get();

        const hoje = ic24HojeIsoBr();

        for (const doc of snap.docs) {

          const a = doc.data();

          const fim = String(a.periodEnd || '').slice(0, 10);

          const stale =

            a.status === 'cancelled' ||

            (fim && fim < ic24IsoAddDaysFromIso(hoje, -IC24_SANDBOX_DESTINO_PURGE_DAYS));

          if (!stale && a.status === 'open' && ic24IsDestinoAnuncioExpired(a)) {

            try {

              await ic24Db.collection(IC24_DESTINO_COLLECTION).doc(doc.id).update({

                status: 'cancelled',

                cancelReason: 'auto_sandbox_expired',

                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),

              });

              out.destinos++;

            } catch (_) {

              /* ignore */

            }

            continue;

          }

          if (a.status !== 'matched' && (a.status === 'cancelled' || ic24IsDestinoAnuncioExpired(a))) {

            try {

              await ic24Db.collection(IC24_DESTINO_COLLECTION).doc(doc.id).delete();

              out.destinos++;

            } catch (_) {

              /* ignore */

            }

          }

        }

      } catch (_) {

        /* ignore */

      }

    }

  }

  return out;

}

async function ic24JanitorFamilySandboxSet(familyIds) {

  const ids = [...new Set((familyIds || []).filter(Boolean))];

  const set = new Set();

  if (!ids.length) return set;

  const now = Date.now();

  if (

    now - IC24_JANITOR.familySandboxCache.at < 120000 &&

    IC24_JANITOR.familySandboxCache.ids.size

  ) {

    ids.forEach((id) => {

      if (IC24_JANITOR.familySandboxCache.ids.has(id)) set.add(id);

    });

    if (set.size || ids.every((id) => IC24_JANITOR.familySandboxCache.ids.has('__checked__' + id))) {

      return set;

    }

  }

  ic24InitFirebase();

  for (let i = 0; i < ids.length; i += 10) {

    const chunk = ids.slice(i, i + 10);

    await Promise.all(

      chunk.map(async (fid) => {

        try {

          const u = await ic24Db.collection('users').doc(fid).get();

          if (!u.exists) {

            set.add(fid);

            return;

          }

          const em = u.data()?.email;

          if (typeof ic24IsSandboxMarketplaceEmail === 'function' && ic24IsSandboxMarketplaceEmail(em)) {

            set.add(fid);

          }

        } catch (_) {

          set.add(fid);

        }

      }),

    );

  }

  IC24_JANITOR.familySandboxCache = { at: now, ids: new Set([...set, ...ids.map((id) => '__checked__' + id)]) };

  return set;

}

/** Mural: só ofertas abertas, vigentes, família real (não sandbox / órfã). */

async function ic24FiltrarOfertasMuralLimpas(list, viewerEmail) {

  let out = ic24FiltrarOfertasVisiveis(list);

  const viewerSandbox =

    typeof ic24IsSandboxMarketplaceEmail === 'function' && ic24IsSandboxMarketplaceEmail(viewerEmail);

  if (!viewerSandbox && out.length) {

    const sandboxFam = await ic24JanitorFamilySandboxSet(out.map((o) => o.familyId));

    out = out.filter((o) => !sandboxFam.has(o.familyId));

  }

  return out;

}

function ic24JanitorShouldRun(role) {

  const now = Date.now();

  const key = role === 'family' ? 'family' : role === 'caregiver' ? 'caregiver' : 'any';

  if (IC24_JANITOR.uid !== ic24Auth?.currentUser?.uid) {

    IC24_JANITOR.lastAt = { family: 0, caregiver: 0, any: 0 };

    IC24_JANITOR.uid = ic24Auth?.currentUser?.uid || null;

  }

  if (now - IC24_JANITOR.lastAt[key] < IC24_JANITOR_THROTTLE_MS) return false;

  IC24_JANITOR.lastAt[key] = now;

  return true;

}

/**

 * Auto-destruição cooperativa: cada login/painel/mural executa limpeza do próprio usuário

 * (throttle ~4 min). Não substitui Cloud Functions, mas mantém mural e plantões coerentes.

 */

async function ic24RunMarketplaceJanitor(role) {

  ic24InitFirebase();

  const uid = ic24Auth.currentUser?.uid;

  if (!uid || !ic24JanitorShouldRun(role || 'any')) return { skipped: true };

  const userSnap = await ic24Db.collection('users').doc(uid).get();

  const email = userSnap.exists ? userSnap.data()?.email : '';

  const userRole = userSnap.exists ? userSnap.data()?.role : role;

  const summary = { offers: 0, destinos: 0, plantao: false, sandbox: null };

  if (userRole === 'family' || role === 'family') {

    summary.offers = await ic24EncerrarOfertasVencidasFamilia(uid);

  }

  if (userRole === 'caregiver' || role === 'caregiver') {

    summary.plantao = await ic24JanitorDesativarPlantoesVencidos(uid);

    summary.destinos = await ic24JanitorEncerrarDestinosVencidos(uid);

    if (typeof ic24JanitorBackfillDestinoNorm === 'function') {
      summary.destinosNorm = await ic24JanitorBackfillDestinoNorm(uid);
    }

  }

  summary.sandbox = await ic24JanitorPurgeSandboxResiduos(uid, email, userRole || role || 'any');

  return summary;

}

