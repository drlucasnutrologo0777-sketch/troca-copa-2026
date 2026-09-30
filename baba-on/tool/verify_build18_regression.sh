#!/usr/bin/env bash
# Legado build 18 — use verify_build19_regression.sh
set -euo pipefail
bash tool/verify_build19_regression.sh
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
grep -q 'IC24_DESTINO_MIN_DIAS_ANTECEDENCIA' web_app/ic24-destino.js
grep -q 'ic24CepDigits' web_app/ic24-destino.js
grep -q 'Ofertas — babás de outros lugares' web_app/index.html
grep -q 'caregiver_destination_availability' firebase-deploy/firestore.rules
grep -q 'compliance_events' firebase-deploy/firestore.rules
grep -q 'deleteMyAccount' firebase-deploy/functions/index.js
echo "OK build 18 pronto Codemagic"
