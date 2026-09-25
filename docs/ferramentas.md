# Ferramentas e contas · Vagas Remotive

Conta dona de tudo: **a conta Google de dev do Davi** (a mesma do GitHub `odavicandidof`). Antes de criar qualquer coisa, confira no canto superior direito de cada painel se é essa conta que está logada (é fácil criar na conta pessoal por engano).

Diagrama da arquitetura: [arquitetura.svg](arquitetura.svg) pra ver; [arquitetura.excalidraw](arquitetura.excalidraw) pra editar (excalidraw.com → menu → Open).

| Ferramenta | Pra quê | O que sai dela |
|---|---|---|
| Google Cloud | Sheets API + Service Account (o "robô" que escreve na planilha) | `GOOGLE_SERVICE_ACCOUNT_JSON` |
| Google Sheets | Banco de dados (prod + teste) | `SHEETS_ID`, `SHEETS_ID_TEST` |
| Vercel | Hospeda o front (React/Vite) e a API, roda o cron | `vagas-remotive.vercel.app` + secrets |
| GitHub | Código, PRs, deploy automático na Vercel | `odavicandidof/job-automation-js` (mesma conta dev) |
| Remotive | Fonte das vagas (API pública, sem conta) | nada |

## 1. Google Cloud (console.cloud.google.com)
- [ ] Logado na conta dev
- [ ] Criar projeto `job-automation-js`
- [ ] APIs e serviços → Biblioteca → ativar **Google Sheets API**
- [ ] IAM → Contas de serviço → criar `sheets-writer` (sem papel no projeto; o acesso vem do compartilhamento da planilha)
- [ ] Na conta de serviço → Chaves → Adicionar chave → JSON → baixar
- [ ] Anotar o e-mail da SA (`sheets-writer@<projeto>.iam.gserviceaccount.com`)

> O JSON baixado é uma **senha**. Ele não vai pro git, não é colado em chat e não fica na pasta Downloads: vai direto pro `.env` local e pro painel da Vercel.

## 2. Google Sheets (sheets.google.com)
- [ ] Logado na conta dev
- [ ] Criar planilha `job-automation · vagas` e renomear a aba pra `vagas`
- [ ] Criar planilha `job-automation · vagas TESTE` (com a mesma aba `vagas`), que só os testes usam
- [ ] Compartilhar **as duas** com o e-mail da SA como **Editor**
- [ ] Copiar o ID de cada uma (o trecho da URL entre `/d/` e `/edit`) → `SHEETS_ID` e `SHEETS_ID_TEST`
- Cabeçalho da linha 1: o código cria se não existir (`link | titulo | empresa | categoria | tipo | local | salario | skills | publicadaEm | capturadaEm | status`)

## 3. Vercel (vercel.com)
- [ ] Entrar com **Continue with GitHub** (conta `odavicandidof`). Assim o import do repo e os deploys por push já saem ligados
- [ ] Add New → Project → importar `job-automation-js` → nome do projeto **`vagas-remotive`** (vira `vagas-remotive.vercel.app`, grátis, com HTTPS; não precisa comprar domínio)
- [ ] Framework preset: Vite (os comandos de build a gente ajusta no `vercel.json` quando o código existir)
- [ ] Settings → Environment Variables (Production + Preview):
  - `GOOGLE_SERVICE_ACCOUNT_JSON` = conteúdo inteiro do JSON da SA
  - `SHEETS_ID`
  - `CRON_SECRET` = string aleatória (`openssl rand -hex 32`)
  - `SESSION_SECRET` = outra string aleatória (`openssl rand -hex 32`), que assina o cookie de admin
  - `ADMIN_PASSWORD_HASH` = hash da sua senha de admin (o comando pra gerar entra junto com o código do login; a senha em texto puro nunca vai pra lugar nenhum)
- [ ] Depois do primeiro deploy: Settings → Cron Jobs deve listar `/api/cron/sync`
- O plano Hobby é grátis e o cron roda 1x/dia, que é o que precisamos.

## 4. GitHub (`odavicandidof`)
- [ ] Settings do repo → Code security → ligar **Secret scanning** e **Push protection** (bloqueia push com chave vazada)
- [ ] Ligar **Dependabot alerts**
- [ ] Branch protection na `main`: exigir PR (nada de push direto)

## 5. Local (`.env`, nunca commitado)
```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
SHEETS_ID=...
SHEETS_ID_TEST=...
CRON_SECRET=...
SESSION_SECRET=...
ADMIN_PASSWORD_HASH=...
```
Rodar com `node --env-file=.env ...` (Node ≥ 20.6, sem `dotenv`).
- [ ] Apagar do `.env` atual a linha `ANGELLIST_API_KEY` (integração morta)
