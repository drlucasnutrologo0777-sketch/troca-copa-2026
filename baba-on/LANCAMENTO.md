# Babá ON — Lançamento build 8

## Links rápidos

| O quê | URL |
|-------|-----|
| **Codemagic (build TestFlight)** | https://codemagic.io/apps |
| Repositório | https://github.com/drlucasnutrologo0777-sketch/troca-copa-2026 |
| App web (Firebase) | https://baba-on-3634a.web.app |
| App Store Connect | https://appstoreconnect.apple.com/apps |
| Privacidade | https://baba-on-3634a.web.app/privacidade.html |
| Termos | https://baba-on-3634a.web.app/termos.html |
| Suporte | https://baba-on-3634a.web.app/suporte.html |
| Exclusão de conta | https://baba-on-3634a.web.app/exclusao-conta.html |

## Versão deste pacote

- **Marketing:** 1.0.0  
- **Build iOS:** 8 (`pubspec.yaml` → `1.0.0+8`)  
- **Bundle ID:** `com.babaon.app`  
- **IAP consumível:** `bo_taxa_manutencao` (US$ 1,99 / diária)

## Antes de gerar o build (ordem)

1. `node baba-on/scripts/seed_review_iap_demo.mjs` — taxa US$ 1,99 na conta demo  
2. `baba-on/firebase-deploy/DEPLOY-CLIQUE.bat` — hosting + Firestore rules  
3. **App Store Connect:** app **grátis** + IAP `bo_taxa_manutencao` **marcado na versão 1.0 build 8**  
4. **Git push `main`** → Codemagic dispara workflow **「Babá ON — iOS TestFlight」**

Atalho Windows: `baba-on/BUILD-8-CLIQUE.bat`

## Codemagic — workflow correto

No projeto **troca-copa-2026**, escolha:

**Babá ON — iOS TestFlight** (não Troca Copa, não Idoso Care)

O workflow valida:
- `rg_frente` / cadastro etapa 3  
- `curriculo-viewer` (currículo sem sair do app)  
- `bo_taxa_manutencao` no bundle web  
- build number alinhado (`pubspec` = `Version.xcconfig` = `BO_IOS_BUILD.txt` = **8**)

## Conta demo Apple Review

- Babá: `baba.demo@babaon.test.local` / `Demo123!`  
- Família: `pai.demo@babaon.test.local` / `Demo123!`  
- Fluxo IAP: Menu → **Taxa do app** → US$ 1,99 pendente → **Pagar via App Store**

Texto para colar no App Review: `IAP-REVIEW-NOTAS.txt`

## O que mudou no build 8

- Cadastro babá alinhado ao Idoso Care (RG frente/verso + 4 docs obrigatórios)  
- Currículo abre em **iframe** (não trava / não some do app)  
- Botão de taxa desabilitado sem pendência  
- Guards anti-DUPLICATE TestFlight (build > 6)  
- Bundle web stamp `baba_v8_launch_ready`

## Evitar reprovação Apple

| Guideline | Ação |
|-----------|------|
| 2.1(b) IAP | Enviar IAP **junto** com o build 8 |
| 2.3.2 | **Sem** imagem promocional no produto IAP |
| 3.1 | Taxa plataforma **só** Apple IAP — PIX só entre família e babá |
| Preço app | App **grátis** na loja |

Checklist completo: `SUBMISSAO-APP-STORE.txt`

## Testes executados (backend)

- `node tool/test_cadastro_baba.mjs` → 4/4  
- `node scripts/simulate_8_users_cadastro.mjs` → 40/40 Firebase  

**Ainda validar no iPhone (TestFlight build 8):** upload real de foto RG, IAP Sandbox, currículo iframe.
