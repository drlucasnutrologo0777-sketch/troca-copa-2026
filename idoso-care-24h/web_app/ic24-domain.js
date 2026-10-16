/**
 * Idoso Care 24H — invariantes de domínio (espelhado em firebase-deploy/functions/ic24-domain.js).
 */
const IC24_JOB_OFFER_STATUSES = [
  'open',
  'negotiating',
  'awaiting_terms',
  'pending_family_approval',
  'matched',
  'cancelled',
  'completed',
];

const IC24_OFFER_TRANSITIONS = {
  family: {
    open: ['open', 'negotiating', 'cancelled'],
    negotiating: ['open', 'negotiating', 'cancelled', 'pending_family_approval', 'matched'],
    pending_family_approval: ['matched', 'negotiating', 'cancelled'],
    matched: ['matched', 'completed', 'cancelled'],
    cancelled: ['cancelled'],
    completed: ['completed'],
    awaiting_terms: ['negotiating', 'cancelled'],
  },
  caregiver: {
    open: ['open'],
    negotiating: ['negotiating', 'awaiting_terms', 'pending_family_approval'],
    awaiting_terms: ['awaiting_terms', 'negotiating', 'pending_family_approval'],
    pending_family_approval: ['pending_family_approval'],
    matched: ['matched'],
    cancelled: ['cancelled'],
    completed: ['completed'],
  },
  system: {
    open: ['open', 'cancelled'],
    negotiating: ['negotiating', 'cancelled'],
    matched: ['matched', 'cancelled'],
  },
};

function ic24CanTransitionOffer(fromStatus, toStatus, actorRole) {
  const from = String(fromStatus || 'open');
  const to = String(toStatus || from);
  if (from === to) return true;
  if (!IC24_JOB_OFFER_STATUSES.includes(to)) return false;
  const role = IC24_OFFER_TRANSITIONS[actorRole] ? actorRole : 'system';
  const allowed = (IC24_OFFER_TRANSITIONS[role] && IC24_OFFER_TRANSITIONS[role][from]) || [];
  return allowed.includes(to);
}

function ic24ValidatePontoFamilyConfirm(session, familyUid) {
  if (!session) return { ok: false, code: 'not_found', message: 'Registro não encontrado' };
  if (session.familyId !== familyUid) return { ok: false, code: 'forbidden', message: 'Sem permissão' };
  if (session.familyConfirmed === true) {
    return { ok: false, code: 'already_confirmed', message: 'Ponto já autenticado' };
  }
  const st = String(session.status || '');
  if (st && st !== 'awaiting_family' && st !== 'pending') {
    return { ok: false, code: 'invalid_status', message: 'Registro de ponto não está aguardando família' };
  }
  if (!session.caregiverId) {
    return { ok: false, code: 'no_caregiver', message: 'Ponto sem cuidador vinculado' };
  }
  return { ok: true };
}

const IC24_DOMAIN_COMPLIANCE_PATTERNS = [
  { re: /\b(app store|idoso care|taxa do app|fechar neg[oó]cio|cart[aã]o de ponto)\b/i, w: -2, label: 'referência à plataforma' },
  { re: /\b(whatsapp|wpp|zap|telegram)\b/i, w: 3, label: 'menção a app de mensagem externo' },
  { re: /\b(fora do app|fora do aplicativo|sem (o )?app|sem taxa|nao paga taxa|não paga taxa)\b/i, w: 4, label: 'sugestão de fechar fora da plataforma' },
  { re: /\b(pix|chave pix|cpf.*pix|pagamento direto|transferencia direta|transferência direta)\b/i, w: 2, label: 'pagamento direto' },
  { re: /\b(combinamos|fecha direto|fechar direto|pr[óo]ximo plant[aã]o direto)\b/i, w: 4, label: 'combinar plantão fora do fluxo' },
  { re: /(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}[-.\s]?\d{4}/, w: 2, label: 'possível telefone' },
  { re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, w: 1, label: 'e-mail no chat' },
];

function ic24DomainComplianceScore(text) {
  const t = String(text || '');
  const hits = [];
  let score = 0;
  for (const p of IC24_DOMAIN_COMPLIANCE_PATTERNS) {
    if (p.re.test(t)) {
      score += p.w;
      if (p.w > 0) hits.push(p.label);
    }
  }
  if (score < 0) score = 0;
  return { score, hits, alert: score >= 3 };
}

function ic24FilterDestinoOpen(doc, todayIso) {
  const today = String(todayIso || '').slice(0, 10);
  if (!doc || doc.status !== 'open') return false;
  const end = String(doc.periodEnd || '').slice(0, 10);
  return !end || end >= today;
}

function ic24DomainAssertOfferTransition(fromStatus, toStatus, actorRole) {
  if (!ic24CanTransitionOffer(fromStatus, toStatus, actorRole)) {
    throw new Error('Transição de oferta inválida: ' + fromStatus + ' → ' + toStatus + ' (' + actorRole + ')');
  }
}
