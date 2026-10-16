/* Idoso Care 24H — alertas em tempo real para match (oferta/plantão/resposta perto). */

const IC24_MATCH_NOTIFY = {
  unsub: [],
  role: null,
  uid: null,
  ready: false,
  defaultRadiusKm: 80,
  seenOfferTs: {},
  seenResponseTs: {},
  seenCgAvailTs: {},
  seenFamNotifTs: {},
};

function ic24MatchNotifyEnsureAudio() {
  if (IC24_MATCH_NOTIFY._audioOk) return true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    if (!IC24_MATCH_NOTIFY._ctx) IC24_MATCH_NOTIFY._ctx = new Ctx();
    if (IC24_MATCH_NOTIFY._ctx.state === 'suspended') IC24_MATCH_NOTIFY._ctx.resume();
    IC24_MATCH_NOTIFY._audioOk = true;
    return true;
  } catch (_) {
    return false;
  }
}

function ic24MatchNotifyPlaySound(urgent) {
  if (!ic24MatchNotifyEnsureAudio()) return;
  try {
    const ctx = IC24_MATCH_NOTIFY._ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.connect(g);
    g.connect(ctx.destination);
    const f1 = urgent ? 988 : 740;
    const f2 = urgent ? 1318 : 880;
    o.frequency.setValueAtTime(f1, ctx.currentTime);
    o.frequency.setValueAtTime(f2, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (urgent ? 0.55 : 0.4));
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.6);
    if (urgent) {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.frequency.value = 1174;
      g2.gain.setValueAtTime(0.001, ctx.currentTime + 0.18);
      g2.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.22);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o2.start(ctx.currentTime + 0.18);
      o2.stop(ctx.currentTime + 0.55);
    }
  } catch (_) {
    /* WebView pode bloquear até gesto do usuário */
  }
}

function ic24MatchNotifyEscape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function ic24MatchNotifyShow(payload) {
  const bar = document.getElementById('ic24-match-notify-bar');
  if (!bar) return;
  const urgent = payload.urgent === true;
  bar.classList.remove('hidden');
  bar.classList.add('match-notify-visible');
  if (urgent) bar.classList.add('match-notify-urgent');
  else bar.classList.remove('match-notify-urgent');
  bar.setAttribute('data-kind', payload.kind || 'info');
  const dist =
    payload.distKm != null && Number.isFinite(payload.distKm)
      ? ' · ~' + Number(payload.distKm).toFixed(1).replace('.0', '') + ' km'
      : '';
  bar.innerHTML =
    '<div class="match-notify-inner">' +
    '<p class="match-notify-title">' +
    ic24MatchNotifyEscape(payload.title || 'Nova oportunidade') +
    '</p>' +
    '<p class="match-notify-text">' +
    ic24MatchNotifyEscape((payload.body || '') + dist) +
    '</p>' +
    '<div class="match-notify-actions">' +
    (payload.actionLabel && payload.onClick
      ? '<button type="button" class="btn btn-p match-notify-cta">' + ic24MatchNotifyEscape(payload.actionLabel) + '</button>'
      : '') +
    '<button type="button" class="btn btn-o match-notify-dismiss">Depois</button>' +
    '</div></div>';
  const cta = bar.querySelector('.match-notify-cta');
  if (cta && typeof payload.onClick === 'function') {
    cta.onclick = () => {
      payload.onClick();
      bar.classList.add('hidden');
      bar.classList.remove('match-notify-visible');
    };
  }
  const dismiss = bar.querySelector('.match-notify-dismiss');
  if (dismiss) {
    dismiss.onclick = () => {
      bar.classList.add('hidden');
      bar.classList.remove('match-notify-visible');
    };
  }
  if (payload.menuId) {
    const menu = document.getElementById(payload.menuId);
    if (menu) {
      menu.classList.add('menu-alerta');
      window._ic24MatchMenuPulse = payload.menuId;
    }
  }
  if (payload.playSound !== false) ic24MatchNotifyPlaySound(urgent);
  try {
    if (navigator.vibrate) navigator.vibrate(urgent ? [100, 50, 100, 50, 180] : [70, 40, 90]);
  } catch (_) {
    /* ignore */
  }
  if (typeof toast === 'function' && payload.toast) toast(payload.toast);
  document.body.classList.add('match-notify-body-flash');
  setTimeout(() => document.body.classList.remove('match-notify-body-flash'), 1200);
}

function ic24MatchNotifyOfferVisibleToCaregiver(offer, uid) {
  if (!uid || !offer) return false;
  const alvo = offer.targetCaregiverId || null;
  if (offer.directedToCaregiver || alvo) return alvo === uid;
  return true;
}

async function ic24MatchNotifyDistanciaFamiliaCuidador(famEnt, cgEnt, urgent) {
  if (typeof ic24ResolverCoordenadas !== 'function' || typeof ic24HaversineKm !== 'function') {
    return { ok: true, distKm: null };
  }
  const [a, b] = await Promise.all([ic24ResolverCoordenadas(famEnt || {}), ic24ResolverCoordenadas(cgEnt || {})]);
  if (!a || !b) return { ok: urgent === true, distKm: null };
  const distKm = ic24HaversineKm(a.lat, a.lng, b.lat, b.lng);
  let maxR = IC24_MATCH_NOTIFY.defaultRadiusKm;
  if (typeof ic24CuidadorRaioKm === 'function') {
    const r = Number(ic24CuidadorRaioKm(cgEnt));
    if (r > 0) maxR = r;
  }
  const ok = urgent === true || distKm == null || distKm <= maxR;
  return { ok, distKm: distKm != null ? Math.round(distKm * 10) / 10 : null, maxR };
}

async function ic24MatchNotifyFamEntFromOffer(offer) {
  let famEnt = {
    cep: offer.cep,
    city: offer.city,
    state: offer.state,
    latitude: offer.latitude ?? offer.lat,
    longitude: offer.longitude ?? offer.lng,
    lat: offer.lat ?? offer.latitude,
    lng: offer.lng ?? offer.longitude,
    address: offer.address,
  };
  if ((!famEnt.cep && !famEnt.latitude) && offer.familyId && typeof ic24OrigemFamiliaParaDistancia === 'function') {
    famEnt = await ic24OrigemFamiliaParaDistancia(offer.familyId);
  }
  return famEnt;
}

async function ic24MatchNotifyOnOfferForCaregiver(change, uid, cgEnt) {
  if (!change || !uid) return;
  const offer = { id: change.doc.id, ...change.doc.data() };
  if (offer.status !== 'open') return;
  if (typeof ic24IsJobOfferExpired === 'function' && ic24IsJobOfferExpired(offer)) return;
  if (!ic24MatchNotifyOfferVisibleToCaregiver(offer, uid)) return;
  const ts =
    offer.updatedAt?.toMillis?.() ||
    offer.createdAt?.toMillis?.() ||
    (offer.createdAt?.seconds ? offer.createdAt.seconds * 1000 : Date.now());
  const prev = IC24_MATCH_NOTIFY.seenOfferTs[offer.id];
  if (change.type === 'added' && !IC24_MATCH_NOTIFY.ready) {
    IC24_MATCH_NOTIFY.seenOfferTs[offer.id] = ts;
    return;
  }
  if (prev && ts <= prev && change.type !== 'added') return;
  IC24_MATCH_NOTIFY.seenOfferTs[offer.id] = ts;

  const famEnt = await ic24MatchNotifyFamEntFromOffer(offer);
  const { ok, distKm } = await ic24MatchNotifyDistanciaFamiliaCuidador(famEnt, cgEnt, offer.urgent);
  if (!ok) return;

  const directed = !!(offer.directedToCaregiver || offer.targetCaregiverId);
  const titulo = offer.urgent
    ? 'Plantão urgente perto de você'
    : directed
      ? 'Proposta direta da família'
      : 'Nova oferta de serviço perto';
  const body =
    (offer.familyName || 'Família') +
    (offer.dailyRate ? ' · R$ ' + Number(offer.dailyRate).toFixed(2) + '/dia' : '') +
    (offer.careNeeds || offer.elderlyType ? ' · ' + (offer.careNeeds || offer.elderlyType) : '');

  ic24MatchNotifyShow({
    kind: 'offer_cuidador',
    urgent: !!offer.urgent,
    title: titulo,
    body,
    distKm,
    toast: offer.urgent ? 'Plantão urgente — responda agora' : 'Nova oferta perto — toque para ver',
    actionLabel: directed ? 'Ver proposta' : 'Aceitar / contra-proposta',
    menuId: directed ? 'cuidador-menu-propostas' : 'cuidador-menu-ofertas-live',
    onClick: () => {
      if (typeof selecionarOfertaCuidador === 'function') selecionarOfertaCuidador(offer.id);
      if (typeof show === 'function') show(directed ? 'cuidador-propostas' : 'cuidador-ofertas');
      if (typeof renderOfertas === 'function') renderOfertas();
      if (typeof carregarPropostasRecebidas === 'function') carregarPropostasRecebidas();
    },
  });
}

async function ic24MatchNotifyOnResponseForFamily(change, uid) {
  const r = { id: change.doc.id, ...change.doc.data() };
  if (r.familyId !== uid || r.status !== 'pending_family') return;
  const ts = r.termsFinalizedAt?.toMillis?.() || r.createdAt?.toMillis?.() || Date.now();
  if (change.type === 'added' && !IC24_MATCH_NOTIFY.ready) {
    IC24_MATCH_NOTIFY.seenResponseTs[r.id] = ts;
    return;
  }
  if (IC24_MATCH_NOTIFY.seenResponseTs[r.id] && ts <= IC24_MATCH_NOTIFY.seenResponseTs[r.id]) return;
  IC24_MATCH_NOTIFY.seenResponseTs[r.id] = ts;

  ic24MatchNotifyShow({
    kind: 'response_familia',
    urgent: true,
    title: 'Cuidador respondeu sua oferta',
    body: 'Aceite ou contra-proposta aguardando — feche o negócio para liberar chat.',
    toast: 'Resposta do cuidador — fechar negócio',
    actionLabel: 'Ver em Minhas ofertas',
    menuId: 'fam-menu-ofertas',
    onClick: () => {
      if (typeof show === 'function') show('familia-ofertas');
      if (typeof carregarOfertasFamilia === 'function') carregarOfertasFamilia();
    },
  });
}

async function ic24MatchNotifyOnCaregiverAvail(change, familyId, famEnt) {
  const cg = { id: change.doc.id, ...change.doc.data() };
  if (cg.approved !== true || cg.activeFamilyId) return;
  const avail = cg.availableToday === true || (cg.plantaoHoje && cg.plantaoHoje.ativo === true);
  if (!avail) return;
  const ts = cg.updatedAt?.toMillis?.() || Date.now();
  const key = cg.id;
  if (change.type === 'added' && !IC24_MATCH_NOTIFY.ready) {
    IC24_MATCH_NOTIFY.seenCgAvailTs[key] = ts;
    return;
  }
  if (IC24_MATCH_NOTIFY.seenCgAvailTs[key] && ts <= IC24_MATCH_NOTIFY.seenCgAvailTs[key] && change.type !== 'modified') {
    return;
  }
  IC24_MATCH_NOTIFY.seenCgAvailTs[key] = ts;

  const { ok, distKm } = await ic24MatchNotifyDistanciaFamiliaCuidador(famEnt, cg, true);
  if (!ok) return;

  ic24MatchNotifyShow({
    kind: 'cuidador_proximo',
    urgent: false,
    title: 'Cuidador disponível hoje perto',
    body: (cg.fullName || 'Cuidador') + ' — plantão hoje na sua região',
    distKm,
    toast: 'Cuidador disponível perto de você',
    actionLabel: 'Ver cuidadores próximos',
    menuId: 'fam-menu-proximos',
    onClick: () => {
      if (typeof show === 'function') show('familia-proximos');
      if (typeof carregarProximosFamilia === 'function') carregarProximosFamilia();
    },
  });
}

function ic24MatchNotifyOnFamNotification(change, uid) {
  const n = { id: change.doc.id, ...change.doc.data() };
  if (n.familyId !== uid || n.status !== 'pending') return;
  const ts = n.createdAt?.toMillis?.() || Date.now();
  if (change.type === 'added' && !IC24_MATCH_NOTIFY.ready) {
    IC24_MATCH_NOTIFY.seenFamNotifTs[n.id] = ts;
    return;
  }
  if (IC24_MATCH_NOTIFY.seenFamNotifTs[n.id]) return;
  IC24_MATCH_NOTIFY.seenFamNotifTs[n.id] = ts;

  ic24MatchNotifyShow({
    kind: 'notif_familia',
    urgent: true,
    title: 'Nova proposta na Minhas ofertas',
    body: String(n.message || 'Cuidador respondeu').slice(0, 140),
    toast: 'Proposta do cuidador — confira',
    actionLabel: 'Abrir Minhas ofertas',
    menuId: 'fam-menu-ofertas',
    onClick: () => {
      if (typeof show === 'function') show('familia-ofertas');
      if (typeof carregarOfertasFamilia === 'function') carregarOfertasFamilia();
    },
  });
}

function ic24MatchNotifyStop() {
  IC24_MATCH_NOTIFY.unsub.forEach((fn) => {
    try {
      fn();
    } catch (_) {
      /* ignore */
    }
  });
  IC24_MATCH_NOTIFY.unsub = [];
  IC24_MATCH_NOTIFY.role = null;
  IC24_MATCH_NOTIFY.uid = null;
  IC24_MATCH_NOTIFY.ready = false;
  const bar = document.getElementById('ic24-match-notify-bar');
  if (bar) {
    bar.classList.add('hidden');
    bar.innerHTML = '';
  }
}

function ic24MatchNotifyStart(role) {
  ic24InitFirebase();
  const uid = ic24Auth.currentUser?.uid;
  if (!uid) return;
  if (IC24_MATCH_NOTIFY.uid === uid && IC24_MATCH_NOTIFY.role === role && IC24_MATCH_NOTIFY.unsub.length) return;
  ic24MatchNotifyStop();
  IC24_MATCH_NOTIFY.role = role;
  IC24_MATCH_NOTIFY.uid = uid;

  document.addEventListener(
    'click',
    () => ic24MatchNotifyEnsureAudio(),
    { once: true, capture: true },
  );

  if (role === 'caregiver') {
    let q = ic24Db.collection('job_offers').where('status', '==', 'open');
    const attach = (snap) => {
      const cgEnt = window._cuidPainel || {};
      snap.docChanges().forEach((ch) => ic24MatchNotifyOnOfferForCaregiver(ch, uid, cgEnt));
      if (!IC24_MATCH_NOTIFY.ready) {
        setTimeout(() => {
          IC24_MATCH_NOTIFY.ready = true;
        }, 800);
      }
    };
    const unsub = q
      .orderBy('createdAt', 'desc')
      .limit(35)
      .onSnapshot(
        attach,
        () => {
          IC24_MATCH_NOTIFY.unsub.push(
            ic24Db.collection('job_offers').where('status', '==', 'open').limit(35).onSnapshot(attach),
          );
        },
      );
    IC24_MATCH_NOTIFY.unsub.push(unsub);

    IC24_MATCH_NOTIFY.unsub.push(
      ic24Db
        .collection('caregiver_notifications')
        .where('caregiverId', '==', uid)
        .limit(12)
        .onSnapshot((snap) => {
          snap.docChanges().forEach((ch) => {
            if (ch.type !== 'added' || !IC24_MATCH_NOTIFY.ready) return;
            const n = ch.doc.data();
            const fechado = n.type === 'negocio_fechado';
            const cv = n.type === 'cv_request';
            if (!n.offerId && !fechado && !cv && n.type !== 'proposta') return;
            ic24MatchNotifyShow({
              kind: fechado ? 'negocio_fechado' : cv ? 'cv_request' : 'notif_cuidador',
              urgent: fechado || cv,
              title: fechado ? 'Negócio fechado' : cv ? 'Pedido de currículo' : 'Nova mensagem no app',
              body: String(n.message || 'Proposta ou negócio').slice(0, 120),
              toast: fechado ? 'Chat liberado — abra agora' : undefined,
              menuId: fechado ? undefined : cv ? 'cuidador-menu-curriculo' : 'cuidador-menu-propostas',
              actionLabel: fechado ? 'Abrir chat' : cv ? 'Enviar currículo' : 'Ver',
              onClick: () => {
                if (fechado && typeof abrirChatNegocio === 'function') {
                  abrirChatNegocio();
                  return;
                }
                if (cv && typeof show === 'function') show('cuidador-curriculo');
                if (typeof carregarPropostasRecebidas === 'function') carregarPropostasRecebidas();
                if (!fechado && !cv && typeof show === 'function') show('cuidador-propostas');
              },
            });
          });
        }),
    );
  }

  if (role === 'family') {
    ic24OrigemFamiliaParaDistancia(uid).then((famEnt) => {
      IC24_MATCH_NOTIFY.unsub.push(
        ic24Db
          .collection('offer_responses')
          .where('familyId', '==', uid)
          .where('status', '==', 'pending_family')
          .limit(15)
          .onSnapshot(
            (snap) => {
              snap.docChanges().forEach((ch) => ic24MatchNotifyOnResponseForFamily(ch, uid));
              if (!IC24_MATCH_NOTIFY.ready) setTimeout(() => { IC24_MATCH_NOTIFY.ready = true; }, 800);
            },
            () => {
              IC24_MATCH_NOTIFY.unsub.push(
                ic24Db
                  .collection('offer_responses')
                  .where('familyId', '==', uid)
                  .limit(25)
                  .onSnapshot((snap) => {
                    snap.docChanges().forEach((ch) => ic24MatchNotifyOnResponseForFamily(ch, uid));
                  }),
              );
            },
          ),
      );

      IC24_MATCH_NOTIFY.unsub.push(
        ic24Db
          .collection('family_notifications')
          .where('familyId', '==', uid)
          .where('status', '==', 'pending')
          .limit(12)
          .onSnapshot(
            (snap) => {
              snap.docChanges().forEach((ch) => ic24MatchNotifyOnFamNotification(ch, uid));
            },
            () => {
              IC24_MATCH_NOTIFY.unsub.push(
                ic24Db
                  .collection('family_notifications')
                  .where('familyId', '==', uid)
                  .limit(15)
                  .onSnapshot((snap) => {
                    snap.docChanges().forEach((ch) => ic24MatchNotifyOnFamNotification(ch, uid));
                  }),
              );
            },
          ),
      );

      IC24_MATCH_NOTIFY.unsub.push(
        ic24Db
          .collection('caregivers')
          .where('approved', '==', true)
          .where('availableToday', '==', true)
          .limit(60)
          .onSnapshot(
            (snap) => {
              snap.docChanges().forEach((ch) => ic24MatchNotifyOnCaregiverAvail(ch, uid, famEnt));
              if (!IC24_MATCH_NOTIFY.ready) setTimeout(() => { IC24_MATCH_NOTIFY.ready = true; }, 800);
            },
            () => {
              /* índice composto ausente — polling leve */
              let lastPoll = 0;
              const poll = async () => {
                if (IC24_MATCH_NOTIFY.role !== 'family' || IC24_MATCH_NOTIFY.uid !== uid) return;
                const now = Date.now();
                if (now - lastPoll < 45000) return;
                lastPoll = now;
                try {
                  const s = await ic24Db.collection('caregivers').where('approved', '==', true).limit(80).get();
                  s.docs.forEach((doc) => {
                    ic24MatchNotifyOnCaregiverAvail({ type: 'modified', doc }, uid, famEnt);
                  });
                } catch (_) {
                  /* ignore */
                }
              };
              const iv = setInterval(poll, 50000);
              IC24_MATCH_NOTIFY.unsub.push(() => clearInterval(iv));
              poll();
            },
          ),
      );
    });
  }
}
