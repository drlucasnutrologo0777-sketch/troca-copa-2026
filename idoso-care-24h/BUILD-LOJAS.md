# Publicar Idoso Care 24H — App Store e Play Store

App Flutter em `idoso_care_app/` com Codemagic para gerar **IPA** (iOS) e **AAB** (Android).

## Identidade do app

| Campo | Valor |
|-------|-------|
| Nome na loja | Idoso Care 24H |
| Bundle / Package | `com.idosocare24h.app` |
| Versão inicial | 1.0.0 (build 1) |
| Firebase | `idoso-care-24h` |

---

## Passo 1 — Firebase (obrigatório antes do build)

1. No [Firebase Console](https://console.firebase.google.com), projeto **idoso-care-24h**
2. Adicione app **Android** (`com.idosocare24h.app`) → baixe `google-services.json` → `android/app/`
3. Adicione app **iOS** (`com.idosocare24h.app`) → baixe `GoogleService-Info.plist` → `ios/Runner/`
4. Na pasta `idoso_care_app`, rode:

```bash
dart pub global activate flutterfire_cli
flutterfire configure --project=idoso-care-24h --platforms=android,ios
```

5. Em `lib/firebase_options.dart`, altere `configured` para `true` após o comando gerar as chaves reais.

6. Deploy das rules (na pasta `firebase/`):

```bash
firebase deploy --only firestore:rules,storage,functions
```

---

## Passo 2 — Codemagic

1. Crie conta em [codemagic.io](https://codemagic.io)
2. Conecte o repositório Git
3. **Root do app:** `IdosoCare24H/idoso_care_app` (ou monorepo com `codemagic.yaml` na raiz do app)
4. O arquivo `codemagic.yaml` já define dois workflows:
   - `idoso-care-ios` → IPA + upload TestFlight
   - `idoso-care-android` → AAB para Play Store

### iOS — arquivos em `ios/codemagic_signing/`

- `distribution.p12`
- `app_store.mobileprovision`
- `AuthKey_*.p8`
- Atualize `ExportOptions.plist` (teamID + UUID do profile)
- Substitua placeholders no `codemagic.yaml`

### Android — arquivo em `android/codemagic_signing/`

- `upload-keystore.jks`
- Senhas no `codemagic.yaml` (ou variáveis secretas no painel Codemagic)

---

## Passo 3 — App Store Connect (iPhone)

1. [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+** → Novo app
2. Nome: **Idoso Care 24H**
3. Bundle ID: `com.idosocare24h.app`
4. SKU: ex. `idoso-care-24h-001`
5. Categoria sugerida: **Medical** ou **Lifestyle**
6. Política de privacidade: URL pública (crie no Google Sites como no app Trocar Figurinhas)
7. Rode workflow **idoso-care-ios** no Codemagic
8. Após processar, abra **TestFlight** → adicione build → envie para revisão

**Notas para o revisor Apple (resumo):**
- Marketplace que conecta famílias a cuidadores de idosos
- Cadastro com e-mail; campos opcionais onde possível
- MVP sem pagamento in-app na v1 (apenas contato/chat)
- Conta admin interna para aprovar cuidadores

---

## Passo 4 — Google Play Console (Android)

1. [Play Console](https://play.google.com/console) → **Criar app**
2. Nome: **Idoso Care 24H**
3. Rode workflow **idoso-care-android** no Codemagic
4. Baixe o artefato **`app-release.aab`**
5. Play Console → **Produção** ou **Teste interno** → **Criar nova versão** → upload do AAB
6. Preencha: classificação de conteúdo, política de privacidade, capturas de tela (mín. 2), ícone 512×512

---

## Passo 5 — Ícone e screenshots

- Ícone: 1024×1024 (iOS), 512×512 (Play)
- Screenshots: iPhone 6.7" e Android phone
- Preview de UI: `../design-preview/index.html`

---

## Atualizar versão para próximo build

Em `pubspec.yaml`:

```yaml
version: 1.0.1+2   # nome+build
```

E nos scripts Codemagic (`--build-name` / `--build-number`) ou deixe o Codemagic ler do `pubspec.yaml`.

---

## Testar localmente

```bash
cd idoso_care_app
flutter pub get
flutter run
```

---

## Suporte

E-mail desenvolvedor: drlucasnutrologo0777@gmail.com
