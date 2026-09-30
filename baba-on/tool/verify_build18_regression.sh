#!/usr/bin/env bash
# Build 18 — paridade 16/17 + destino + minhas ofertas.
set -euo pipefail
bash tool/verify_web_build.sh
bash tool/verify_build_number.sh
grep -q 'bo_taxa_manutencao' web_app/ic24-cobranca.js
grep -q 'ic24CriarChatNegocioFechado' web_app/firebase-ic24.js
grep -q 'chatUnlocked: true' web_app/firebase-ic24.js
grep -q 'ic24ListarBabasProximos' web_app/ic24-ofertas.js
grep -q 'ic24LiberarBabaPosServicoConcluido' web_app/ic24-ofertas.js
grep -q 'autoApproved' web_app/ic24-curriculo.js
grep -q 'ic24-compliance.js' web_app/index.html
grep -q 'ic24-destino.js' web_app/index.html
grep -q 'caregiver_destination_availability' web_app/ic24-destino.js
grep -q 'ic24ExcluirTrabalhoOutroLugar' web_app/ic24-destino.js
grep -q 'caregiver_destination_availability' firebase-deploy/firestore.rules
grep -q 'compliance_events' firebase-deploy/firestore.rules
grep -q 'deleteMyAccount' firebase-deploy/functions/index.js
echo "OK build 18 pronto Codemagic"
