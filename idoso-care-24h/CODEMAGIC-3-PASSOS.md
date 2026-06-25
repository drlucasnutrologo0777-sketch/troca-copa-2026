# Idoso Care 24H — só 3 passos no Codemagic

## Link do GitHub (depois do push)
https://github.com/drlucasnutrologo0777-sketch/idoso-care-24h

---

## PASSO 1 — App Store Connect (1 vez)

1. Abra https://appstoreconnect.apple.com
2. **Apps** → **+** → **Novo app**
3. Preencha:
   - Nome: **IDOSO CARE 24 H**
   - Bundle ID: **com.idosocare24h.app** (crie no Apple Developer se não existir)
   - SKU: **idoso-care-24h**
4. Salve.

Se o Bundle ID não existir: https://developer.apple.com/account/resources/identifiers/list → **+** → App IDs → `com.idosocare24h.app`

---

## PASSO 2 — Codemagic (1 vez)

1. Abra https://codemagic.io/apps
2. **Add application** → **GitHub** → repo **`idoso-care-24h`**
3. Configuração:
   - **Flutter project path:** `.` (ponto)
   - **Configuration file:** `codemagic.yaml`
4. **Save**

Não precisa colar variáveis — já estão no `codemagic.yaml` (mesma chave Apple do Troca Copa).

---

## PASSO 3 — Rodar o build

1. No Codemagic, clique em **idoso-care-24h**
2. **Start new build**
3. Workflow: **Idoso Care 24H — iOS TestFlight**
4. Aguarde ~25–40 min
5. Quando terminar, abra App Store Connect → seu app → **TestFlight**
6. Adicione seu e-mail como testador interno e instale pelo app TestFlight no iPhone

---

## Se der erro

| Erro | Solução |
|------|---------|
| Repo não encontrado | Crie o repo vazio no GitHub com nome `idoso-care-24h` e rode o push |
| Bundle ID inválido | Registre `com.idosocare24h.app` no Apple Developer |
| App não existe no Connect | Faça o Passo 1 antes do build |
| Signing failed | Confirme que o app foi criado no App Store Connect com esse Bundle ID |
