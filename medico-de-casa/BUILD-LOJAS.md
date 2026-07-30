# Publicar Medico de Casa — App Store

App Flutter em `medico_home_app/` com **Codemagic** para gerar **IPA** (iOS TestFlight).

## Identidade

| Campo | Valor |
|-------|--------|
| Nome na loja | Medico de Casa |
| Bundle ID | `com.medicodecasa.app` |
| SKU | ex. `medicodecasa001` |
| IAP | `ic24_taxa_manutencao` (US$ 4,99 consumível) |
| Versão | `1.0.0+1` |
| Web | https://medico-de-casa.web.app |

## Codemagic (igual Babá ON / Idoso Care)

1. [codemagic.io/apps](https://codemagic.io/apps) → conectar repo Git
2. **Root:** `MedicoHome/medico_home_app`
3. Workflow: **Medico de Casa — iOS TestFlight**
4. **Start new build** (não Rebuild)

Assinatura em `ios/codemagic_signing/` (AuthKey + `ios_distribution_private_key.pem`).

## App Store Connect

1. Criar app com Bundle ID `com.medicodecasa.app`
2. Após upload, abrir **TestFlight**

## Atualizar versão (próximo build)

**Leia primeiro:** `ios/ASC_LAST_UPLOADED_BUILD.txt` = último build que a Apple já aceitou.  
Novo build **obrigatoriamente maior** (ex.: Apple tem `2` → use `3`, `4`, …).

1. `pubspec.yaml`: `version: 1.0.0+N`
2. `ios/Flutter/Version.xcconfig`: name/number iguais
3. `ios/MH_IOS_BUILD.txt`: só o build number
4. `codemagic.yaml` (pasta do app **e** `troca_copa_app/codemagic.yaml`): `MH_BUILD_NAME` / `MH_BUILD_NUMBER`
5. Comentário em `web_app/index.html`: `<!-- Medico de Casa iOS build 1.0.0+N -->`
6. **Git push na main** → só depois **Start new build** no Codemagic
7. Após upload OK: `ios/ASC_LAST_UPLOADED_BUILD.txt` = N enviado

## Links

- App web: https://medico-de-casa.web.app
- Suporte: https://medico-de-casa.web.app/suporte.html
- Codemagic: https://codemagic.io/apps
- App Store Connect: https://appstoreconnect.apple.com
