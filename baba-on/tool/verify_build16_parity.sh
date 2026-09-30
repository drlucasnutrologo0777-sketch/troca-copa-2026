#!/usr/bin/env bash
# Garante que telas/fluxos do build 16 (TestFlight) continuam no bundle atual.
set -eu
cd "$(dirname "$0")/.."
grep -q 'class="menu-topic"' web_app/index.html
grep -q 'id="mae-proximos"' web_app/index.html
grep -q 'id="mae-ofertas"' web_app/index.html
grep -q 'Fechar negócio' web_app/index.html
grep -q 'id="mae-urgente"' web_app/index.html
grep -q 'Ofertas abertas' web_app/index.html
grep -q 'rg_frente' web_app/index.html
grep -q 'bo_taxa_manutencao' web_app/ic24-cobranca.js
grep -q 'ic24ListarBabasProximos' web_app/ic24-ofertas.js
grep -q 'EagerGestureRecognizer' lib/screens/web_app_screen.dart
grep -q 'btnWelcomeEntrar' web_app/index.html
echo "OK paridade build 16 (design + fluxos core)"
