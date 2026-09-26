# Ferramentas e contas · Vagas Remotive

Conta dona de tudo: **a conta Google de dev do Davi** (a mesma do GitHub `odavicandidof`). Antes de criar qualquer coisa, confira no canto superior direito de cada painel se é essa conta que está logada (é fácil criar na conta pessoal por engano).

Diagrama da arquitetura: [arquitetura.svg](arquitetura.svg) pra ver; [arquitetura.excalidraw](arquitetura.excalidraw) pra editar (excalidraw.com → menu → Open).

| Ferramenta | Pra quê | O que sai dela |
|---|---|---|
| Google Cloud | Sheets API + service account `sheets-writer` (o "robô" que escreve na planilha) | nada no `.env`: autenticação sem chave |
| Google Sheets | Banco de dados (prod + teste) | `SHEETS_ID`, `SHEETS_ID_TEST` |
| Vercel | Hospeda o front (React/Vite) e a API, roda o cron | `vagas-remotive.vercel.app` + secrets |
| GitHub | Código, PRs, deploy automático na Vercel | `odavicandidof/job-automation-js` (mesma conta dev) |
| Remotive | Fonte das vagas (API pública, sem conta) | nada |

## Autenticação no Google: sem chave JSON
A organização do Google Cloud bloqueia a criação de chaves de service account (`iam.disableServiceAccountKeyCreation`), e o bloqueio fica ligado de propósito: chave JSON vazada é uma das causas mais comuns de invasão.

| Onde | Como o código prova que é o `sheets-writer` |
|---|---|
| Local | `gcloud` age como a service account (impersonation). A credencial fica em `~/.config/gcloud/`, fora do repo |
| Vercel | OIDC + Workload Identity Federation: a Vercel troca um token dela por um token do Google de 1h (configurado no PR de deploy) |

O código só usa a `google-auth-library`, que acha a credencial sozinha (Application Default Credentials) e pede o escopo `spreadsheets`. O token que o `gcloud` gera por padrão **não** tem esse escopo, e não serve pra testar a API na mão.

## 1. Google Cloud (console.cloud.google.com)
- [ ] Logado na conta dev
- [ ] Criar projeto `job-automation-js` **sem conta de faturamento** (Sheets API e service account são gratuitas)
- [ ] IAM → Contas de serviço → criar `sheets-writer`, **sem papel** no projeto (o acesso vem do compartilhamento da planilha)
- [ ] Instalar o gcloud e configurar a credencial local:
  ```bash
  brew install --cask google-cloud-sdk
  gcloud auth login
  gcloud config set project job-automation-js
  gcloud services enable sheets.googleapis.com iamcredentials.googleapis.com
  gcloud iam service-accounts add-iam-policy-binding sheets-writer@job-automation-js.iam.gserviceaccount.com \
    --member="user:$(gcloud config get-value account)" --role=roles/iam.serviceAccountTokenCreator
  gcloud auth application-default login \
    --impersonate-service-account=sheets-writer@job-automation-js.iam.gserviceaccount.com
  ```
  Ser Proprietário do projeto **não** inclui `serviceAccountTokenCreator`, por isso o binding explícito.

## 2. Google Sheets (sheets.google.com)
- [ ] Logado na conta dev
- [ ] Criar planilha `job-automation · vagas` com uma aba `Vagas`
- [ ] Criar planilha `job-automation · vagas TESTE` com a mesma aba `Vagas`, que só os testes usam (eles apagam o conteúdo a cada execução)
- [ ] Compartilhar **as duas** com `sheets-writer@job-automation-js.iam.gserviceaccount.com` como **Editor**
- [ ] Copiar o ID de cada uma (o trecho da URL entre `/d/` e `/edit`, 44 caracteres) → `SHEETS_ID` e `SHEETS_ID_TEST`
- Cabeçalho da linha 1: o código cria se não existir (`link | titulo | empresa | categoria | tipo | local | salario | skills | publicadaEm | capturadaEm | status`)

## 3. Vercel (vercel.com)
- [ ] Entrar com **Continue with GitHub** (conta `odavicandidof`). Assim o import do repo e os deploys por push já saem ligados
- [ ] Add New → Project → importar `job-automation-js` → nome do projeto **`vagas-remotive`** (vira `vagas-remotive.vercel.app`, grátis, com HTTPS; não precisa comprar domínio)
- [ ] Framework preset: Vite (os comandos de build são ajustados no `vercel.json` quando o código existir)
- [ ] Settings → Environment Variables (Production + Preview):
  - `SHEETS_ID`
  - `CRON_SECRET` = string aleatória (`openssl rand -hex 32`)
  - `SESSION_SECRET` = outra string aleatória (`openssl rand -hex 32`), que assina o cookie de admin
  - `ADMIN_PASSWORD_HASH` = hash scrypt da senha de admin, gerado com `npm run hash-senha` (a senha é digitada no terminal e só o hash é impresso; a senha em texto puro nunca vai pra lugar nenhum)
  - `SYNC_TERMO` (opcional) = termo de busca enviado à Remotive no sync diário. Vazio busca todas as vagas
  - Variáveis do Workload Identity Federation: definidas no PR de deploy
- [ ] Depois do primeiro deploy: Settings → Cron Jobs deve listar `/api/cron/sync`
- O plano Hobby é grátis e o cron roda 1x/dia, que é o necessário.

## 4. GitHub (`odavicandidof`)
- [ ] Settings do repo → Code security → ligar **Secret scanning** e **Push protection** (bloqueia push com chave vazada)
- [ ] Ligar **Dependabot alerts**
- [ ] Branch protection na `main`: exigir PR (nada de push direto)

## 5. Local (`.env`, nunca commitado)
```
NODE_ENV=development
PORT=3000
SHEETS_ID=...
SHEETS_ID_TEST=...
CRON_SECRET=...
SESSION_SECRET=...
ADMIN_PASSWORD_HASH=...
SYNC_TERMO=
```
Sem `< >` em volta dos valores. O Jest carrega o `.env` sozinho (`jest.setup.cjs`); fora dos testes, rodar com `node --env-file=.env ...`. Nada de `dotenv`.

API local: `npm run api` sobe em `http://localhost:3000`. O cookie de admin é `Secure`, mas os navegadores aceitam em `localhost` mesmo sem HTTPS.
