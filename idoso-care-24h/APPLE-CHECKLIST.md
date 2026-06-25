# Checklist Apple — Idoso Care 24H

## Já corrigido no código (build 21)

| Item | Status |
|------|--------|
| Ícone 1024×1024 e todos os tamanhos iOS/Android | OK |
| `ITSAppUsesNonExemptEncryption` = false (Export Compliance) | OK |
| Textos de privacidade câmera/galeria (português claro) | OK |
| `NSPhotoLibraryAddUsageDescription` | OK |
| Localização removida (não usada no app — evita reprovação 5.1.1) | OK |
| Firebase iOS `GoogleService-Info.plist` | OK |
| Bundle ID `com.idosocare24h.app` | OK |

## Você preenche no App Store Connect (obrigatório para aprovação)

| Campo | O que colocar |
|-------|----------------|
| Política de privacidade | URL pública (Google Sites ou página no Firebase Hosting) |
| URL de suporte | E-mail ou site: drlucasnutrologo0777@gmail.com |
| Categoria | Medical ou Lifestyle |
| Classificação etária | Preencher questionário |
| Capturas de tela | Mín. 2 (iPhone 6.7") |
| Notas para revisor | "App conecta famílias a cuidadores de idosos. Login e-mail/senha. Cadastro com documentos. Sem pagamento in-app na v1." |

## TestFlight (não exige tudo acima)

Para **TestFlight interno**, basta o build subir — política e screenshots podem ficar para a revisão da loja.

## Codemagic — iniciar build

https://codemagic.io/apps

Repo: https://github.com/drlucasnutrologo0777-sketch/idoso-care-24h

Workflow: **Idoso Care 24H — iOS TestFlight**
