#!/usr/bin/env bash
# Garante que build 17 mantém comportamentos críticos do 16 (IAP, chat, fechamento).
set -eu
bash tool/verify_web_build.sh
bash tool/verify_build_number.sh
grep -q 'bo_taxa_manutencao' web_app/ic24-cobranca.js
grep -q 'ic24CriarChatNegocioFechado' web_app/firebase-ic24.js
grep -q 'chatUnlocked: true' web_app/firebase-ic24.js
grep -q 'ic24MatchChatUnlocked' web_app/firebase-ic24.js
grep -q 'ic24FamiliaAceitarContraProposta' web_app/ic24-ofertas.js
grep -q 'ic24VincularFamiliaAtiva' web_app/ic24-ofertas.js
grep -q 'ic24ListarBabasProximos' web_app/ic24-ofertas.js
grep -q 'approved.*true' web_app/ic24-ofertas.js
grep -q 'IC24_IDADE_MINIMA' web_app/firebase-ic24.js
grep -q 'ic24LiberarBabaPosServicoConcluido' web_app/ic24-ofertas.js
grep -q 'autoApproved' web_app/ic24-curriculo.js
grep -q 'ic24-compliance.js' web_app/index.html
grep -q 'compliance_events' firebase-deploy/firestore.rules
grep -q 'ic24SincronizarNotificacoesFamiliaPendentes' web_app/ic24-ofertas.js
grep -q 'deleteMyAccount' firebase-deploy/functions/index.js
echo "OK build 17 paridade 16 + compliance + sync notifs"
