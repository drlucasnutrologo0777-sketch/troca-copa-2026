#!/usr/bin/env bash
# Garante que telas/fluxos do build 16 (TestFlight) continuam no bundle atual.
set -euo pipefail
cd "$(dirname "$0")/.."

# Design / navegação (mesmas classes menu-topic, topbar, screens)
grep -q 'class="menu-topic"' web_app/index.html
grep -q 'class="topbar"' web_app/index.html
grep -q 'id="mae-painel"' web_app/index.html
grep -q 'id="baba-painel"' web_app/index.html

# Família — fluxo 16
grep -q 'id="mae-proximos"' web_app/index.html
grep -q 'id="mae-ofertas"' web_app/index.html
grep -q 'Fechar negócio' web_app/index.html
grep -q 'id="mae-urgente"' web_app/index.html
grep -q 'validarEnderecoFam' web_app/index.html

# Babá — fluxo 16
grep -q 'Ofertas abertas' web_app/index.html
grep -q 'Plantão hoje' web_app/index.html
grep -q 'rg_frente' web_app/index.html
grep -q 'ic24PreviewFotoPerfil' web_app/ic24-curriculo.js

# IAP / pagamento / chat
grep -q 'bo_taxa_manutencao' web_app/ic24-cobranca.js
grep -q 'ic24CriarChatNegocioFechado' web_app/firebase-ic24.js
grep -q 'chatUnlocked: true' web_app/firebase-ic24.js
grep -q 'ic24ListarBabasProximos' web_app/ic24-ofertas.js
grep -q 'ic24LiberarBabaPosServicoConcluido' web_app/ic24-ofertas.js

# iPad Entrar (fix build 16)
grep -q 'EagerGestureRecognizer' lib/screens/web_app_screen.dart
grep -q 'allowingReadAccessTo' lib/screens/web_app_screen.dart
grep -q 'btnWelcomeEntrar' web_app/index.html
grep -q 'ic24BootNav' web_app/index.html

echo "OK paridade build 16 (design + fluxos core)"
