# Guia completo — Site legal e App Store Connect (Idoso Care 24H)

Documento de referência para **não ser reprovado** na revisão da Apple App Store. Baseado no aplicativo real (web-app + Firebase + build iOS `com.idosocare24h.app`).

---

## 1. Publicar o site legal (obrigatório)

### Arquivos criados em `IdosoCare24H/web-app/`

| Arquivo | URL pública |
|---------|-------------|
| `legal.html` | https://idoso-care-24h.web.app/legal.html |
| `privacidade.html` | https://idoso-care-24h.web.app/privacidade.html |
| `termos.html` | https://idoso-care-24h.web.app/termos.html |
| `suporte.html` | https://idoso-care-24h.web.app/suporte.html |
| `exclusao-conta.html` | https://idoso-care-24h.web.app/exclusao-conta.html |
| `legal.css` | (estilo compartilhado) |

URLs curtas (após deploy): `/privacidade`, `/termos`, `/suporte`, `/exclusao-conta`, `/legal`

### Deploy

```bash
cd IdosoCare24H/firebase
firebase deploy --only hosting
```

Confirme no navegador que **privacidade.html abre sem redirecionar para o app**.

---

## 2. App Store Connect — campos obrigatórios

| Campo | Valor recomendado |
|-------|-------------------|
| **Política de Privacidade** | `https://idoso-care-24h.web.app/privacidade.html` |
| **URL de suporte** | `https://idoso-care-24h.web.app/suporte.html` |
| **URL de marketing** (opcional) | `https://idoso-care-24h.web.app/legal.html` |
| **E-mail de suporte** | drlucasnutrologo0777@gmail.com |
| **Categoria primária** | Medical **ou** Lifestyle |
| **Categoria secundária** | Lifestyle / Social Networking |
| **Copyright** | © 2026 Idoso Care 24H |
| **Classificação etária** | **17+** (conteúdo gerado por usuários, saúde, documentos) |
| **Export Compliance** | Não usa criptografia não isenta (`ITSAppUsesNonExemptEncryption = false`) |

---

## 3. App Privacy (Privacy Nutrition Label)

Marque no App Store Connect conforme a política publicada:

| Tipo de dado | Coletado | Vinculado ao usuário | Uso |
|--------------|----------|----------------------|-----|
| Nome | Sim | Sim | Funcionalidade do app |
| E-mail | Sim | Sim | Conta / suporte |
| Telefone | Sim | Sim | Contato / PIX |
| Endereço físico | Sim | Sim | Matching por região |
| CPF (identificador gov.) | Sim | Sim | Verificação cuidador |
| Fotos/vídeos | Sim | Sim | Documentos e perfil |
| Conteúdo do usuário | Sim | Sim | Chat, diário, denúncias |
| Dados de saúde | Sim | Sim | Cuidado do idoso (não clínico) |
| Informações financeiras | Sim | Sim | PIX, faturas, taxa US$ 1,99 (Apple IAP) |
| Identificadores | Sim | Sim | Firebase UID |
| Dados de uso / Analytics | Sim | Não* | Firebase Analytics |

\*Analytics agregado — marque conforme questionário atual da Apple.

**Rastreamento entre apps:** Não  
**Publicidade de terceiros:** Não

---

## 4. Diretrizes Apple — checklist anti-reprovação

### 5.1.1 Privacidade
- [x] Política de privacidade pública e acessível
- [x] Textos de permissão câmera/galeria claros (`Info.plist`)
- [x] Sem coleta de GPS contínua (removida)
- [x] Link in-app para Termos + Privacidade (tela inicial)
- [ ] **Implementar** `sendPasswordResetEmail` ou manter suporte por e-mail documentado
- [x] Página de exclusão de conta publicada

### 5.1.1(v) Exclusão de conta
- [x] URL `exclusao-conta.html` com processo por e-mail
- [ ] **Recomendado:** botão in-app “Excluir conta” no futuro

### 3.1.1 Pagamentos (IAP)
- Taxa plataforma **US$ 1,99** fixa por negócio fechado — exclusivamente Apple IAP produto `ic24_taxa_manutencao`
- **Diária família→cuidador:** PIX externo (não é IAP) — declarar nas notas ao revisor
- **Não mencionar Google Play IAP** (app iOS)
- Se IAP Apple estiver como demo no código, **ativar StoreKit real** ou remover chip IAP antes da submissão final

### 1.4.1 Segurança física
- [x] Disclaimer: app **não é** serviço médico/emergência
- [x] Links Disque 100, 190, 192 no app e no site

### 1.2 Conteúdo gerado por usuário
- [x] Denúncia formal (`family_reports`)
- [x] Suporte (`support_tickets`)
- [x] Chat bloqueado até acordo
- [x] Termos proíbem assédio/fraude

### 2.3.8 Metadados
- Descrição deve refletir app real (marketplace cuidadores, não hospital)
- Screenshots devem ser do app real (pasta `AppStore-IdosoCare24H_*`)
- **Não usar** texto “sem pagamento in-app” — app tem taxa US$ 1,99 e IAP

### 4.2 Funcionalidade mínima
- Login e-mail/senha funcional
- Conta demo para revisor: `cuidador.demo@ic24test.local` / `Demo123!`

---

## 5. Notas para o revisor (copiar em “App Review Information”)

```
App: Idoso Care 24H — marketplace que conecta famílias a cuidadores de idosos no Brasil.

Login demo cuidador:
  E-mail: cuidador.demo@ic24test.local
  Senha: Demo123!

Fluxo principal:
  1) Cadastro cuidador ou família
  2) Cuidador publica disponibilidade / família busca próximos
  3) Proposta → forma de recebimento → família fecha negócio
  4) Chat liberado após acordo
  5) Cartão de ponto, diário, faturamento PIX externo

Pagamentos:
  - Diária: PIX direto família → cuidador (fora da App Store)
  - Taxa plataforma US$ 1,99: exclusivamente Apple IAP (ic24_taxa_manutencao)

Permissões:
  - Câmera/galeria: documentos e foto de perfil apenas
  - Sem localização GPS contínua

Privacidade: https://idoso-care-24h.web.app/privacidade.html
Suporte: https://idoso-care-24h.web.app/suporte.html
Exclusão de conta: https://idoso-care-24h.web.app/exclusao-conta.html
```

---

## 6. Descrição sugerida (até 4000 caracteres)

**Idoso Care 24H** conecta famílias a cuidadores profissionais de idosos com segurança e transparência.

**Para famílias:** encontre cuidadores disponíveis na sua região, publique plantões urgentes, receba propostas, feche o acordo e acompanhe cartão de ponto e diário de cuidados.

**Para cuidadores:** cadastre currículo e documentos, disponibilize agenda, receba ofertas, registre ponto e diário, fature via PIX e gerencie a taxa de manutenção da plataforma.

**Segurança:** chat liberado apenas após fechamento de negócio; canal de denúncias; currículo público sem telefone/endereço completo.

**Importante:** o Idoso Care 24H não presta serviços médicos nem de emergência. Em emergência, ligue 192 ou 190.

---

## 7. Palavras-chave sugeridas

cuidador de idosos, plantão, home care, cuidador 24h, idoso, família, diária, Montes Claros, cuidados

---

## 8. In-App Purchases (se submeter IAP)

| Product ID | Tipo | Nome |
|------------|------|------|
| `ic24_taxa_manutencao` | Consumível | Taxa de manutenção Idoso Care |

Descrição IAP: “Taxa de manutenção da plataforma Idoso Care 24H — US$ 1,99 por negócio fechado.”

---

## 9. Sincronizar cópias do app

Após editar `IdosoCare24H/web-app/`, copie para:

- `IdosoCare24H/idoso_care_app/web_app/`
- `TrocaCopa2026/troca_copa_app/idoso-care-24h/web_app/`

Incluir: `legal.html`, `privacidade.html`, `termos.html`, `suporte.html`, `exclusao-conta.html`, `legal.css`, `index.html` (rodapé legal).

---

## 10. Itens que ainda podem causar reprovação

| Risco | Ação |
|-------|------|
| Site legal offline | Fazer `firebase deploy --only hosting` |
| IAP demo sem StoreKit | Implementar IAP real ou remover opção Apple IAP |
| Sem reset de senha in-app | Implementar Firebase `sendPasswordResetEmail` |
| Notas desatualizadas (“sem pagamento v1”) | Atualizar APPLE-CHECKLIST.md e notas ao revisor |
| Firestore rules incompletas | Validar `family_notifications` / `caregiver_notifications` |

---

Última atualização: 27/06/2026
