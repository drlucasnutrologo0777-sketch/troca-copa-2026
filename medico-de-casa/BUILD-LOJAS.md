# Publicar Medico de Casa — App Store

App Flutter em `medico-de-casa/` com **Codemagic** para gerar **IPA** (iOS TestFlight).

## Identidade

| Campo | Valor |
|-------|--------|
| Nome na loja | Medico de Casa |
| Bundle ID | `com.medicodecasa.app` |
| Apple ID (ASC) | `6796102702` |
| SKU | ex. `medicodecasa001` |
| IAP | `ic24_taxa_manutencao` (US$ 4,99 consumível) |
| Versão atual | `1.0.0+7` |
| Web | https://medico-de-casa.web.app |

## Hub — novo build (build 7)

1. **Git push** na `main` com `1.0.0+7` (obrigatório antes do Codemagic)
2. [Codemagic — apps](https://codemagic.io/apps) → repo `troca-copa-2026`
3. Workflow: **Medico de Casa — iOS TestFlight**
4. **Start new build** (não Rebuild)
5. Upload TestFlight é automático no workflow (`Upload TestFlight`)
6. [TestFlight iOS](https://appstoreconnect.apple.com/apps/6796102702/testflight/ios) → compliance → Internal Testing → Notify

Atalho Windows: `BUILD-7-CLIQUE.bat`  
Links completos: `BUILD-LINK.txt`

Assinatura em `ios/codemagic_signing/` (AuthKey + `ios_distribution_private_key.pem`).

## App Store Connect

1. App com Bundle ID `com.medicodecasa.app`
2. Após upload, abrir **TestFlight** e selecionar build **7**
3. Beta público: https://testflight.apple.com/join/tnMrHP5Z

## Atualizar versão (próximo build)

**Leia primeiro:** `ios/ASC_LAST_UPLOADED_BUILD.txt` = último build que a Apple já aceitou.  
Novo build **obrigatoriamente maior** (ex.: Apple tem `2` → use `3`, `4`, … `7`).

1. `pubspec.yaml`: `version: 1.0.0+N`
2. `ios/Flutter/Version.xcconfig`: name/number iguais
3. `ios/MH_IOS_BUILD.txt`: só o build number
4. `lib/services/web_app_bundle.dart`: `bundleStamp` novo (força refresh do web no app)
5. `codemagic.yaml` (pasta do app **e** `troca_copa_app/codemagic.yaml`): `MH_BUILD_NAME` / `MH_BUILD_NUMBER`
6. Comentário em `web_app/index.html`: `<!-- Medico de Casa iOS build 1.0.0+N -->`
7. **Git push na main** → só depois **Start new build** no Codemagic
8. Após upload OK: `ios/ASC_LAST_UPLOADED_BUILD.txt` = N enviado

## Links

- Hub Codemagic: https://codemagic.io/apps
- TestFlight: https://appstoreconnect.apple.com/apps/6796102702/testflight/ios
- App web: https://medico-de-casa.web.app
- Suporte: https://medico-de-casa.web.app/suporte.html
