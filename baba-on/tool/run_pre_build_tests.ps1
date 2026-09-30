# Pré-build Babá ON — regressão local (Windows, sem bash/flutter).
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$fail = 0

function Assert-Match($name, $path, $pattern) {
  if (-not (Test-Path $path)) { Write-Host "FAIL $name — arquivo ausente: $path"; $script:fail++; return }
  $c = Get-Content $path -Raw -Encoding UTF8
  if ($c -notmatch $pattern) { Write-Host "FAIL $name — padrão não encontrado em $path"; $script:fail++; return }
  Write-Host "PASS $name"
}

Assert-Match 'paridade mae-ofertas' 'web_app/index.html' 'Fechar negócio'
Assert-Match 'destino JS' 'web_app/ic24-destino.js' 'IC24_DESTINO_MIN_DIAS_ANTECEDENCIA'
Assert-Match 'fechar destino match' 'web_app/ic24-destino.js' 'ic24FecharDestinoSeOfertaMatch'
Assert-Match 'bundle 20' 'lib/services/web_app_bundle.dart' 'baba_v30_build20'
Assert-Match 'Podfile 16' 'ios/Podfile' "platform :ios, '16.0'"
Assert-Match 'rules destino' 'firebase-deploy/firestore.rules' 'caregiver_destination_availability'
Assert-Match 'IAP' 'web_app/ic24-cobranca.js' 'bo_taxa_manutencao'
Assert-Match 'iPad Entrar' 'lib/screens/web_app_screen.dart' 'EagerGestureRecognizer'

Write-Host "`nNode: destino match..."
node tool/test_destino_familia_match.mjs
if ($LASTEXITCODE -ne 0) { $fail++ }

Write-Host "`nNode: audit Firestore..."
node tool/audit_firestore_destino.mjs
if ($LASTEXITCODE -ne 0) { $fail++ }

if ($fail -gt 0) { Write-Host "`nFALHOU: $fail bloco(s)"; exit 1 }
Write-Host "`nOK pre-build tests passaram"
exit 0
