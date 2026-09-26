# job-automation-js

Automação de busca de vagas remotas no Remotive.

## Instalação

```bash
npm install
```

## Como rodar os testes

Os testes usam APIs reais (Remotive e uma planilha Google de teste). Antes, configure a credencial do Google e o `.env` seguindo [docs/ferramentas.md](docs/ferramentas.md).

```bash
npm test          # tudo, inclusive APIs reais
npm run test:api  # só a API, sem rede
```

## Como rodar a API

```bash
npm run hash-senha  # gera ADMIN_PASSWORD_HASH pro .env
npm run api         # http://localhost:3000/api/vagas
```

## Exemplo de saída

Quando a aplicação roda, ela busca vagas no Remotive e as transforma em um formato padronizado:

```json
{
  "titulo": "Content Reviewer - United States",
  "empresa": "TELUS Digital",
  "categoria": "All others",
  "tipo": "part_time",
  "local": "USA",
  "salario": "Não informado",
  "skills": ["android", "ios", "social media", "AI/ML"],
  "link": "https://remotive.com/remote-jobs/all-others/content-reviewer-united-states-2091144",
  "publicadaEm": "2026-09-21"
}
```

## Estrutura

- `api/index.js` — entrada da Vercel, monta a API com as dependências reais
- `src/app.js` — rotas Express (leitura pública, login admin, status, sync via cron)
- `src/auth/` — sessão por cookie assinado, hash scrypt da senha e limite de tentativas de login
- `src/services/sincronizarVagas.js` — busca na Remotive e grava só vagas novas
- `src/tests/` — testes da API com repositório em memória (401, 400, 429, vazamento de erro)
- `src/adapters/remotiveAdapter.js` — adapta dados da API Remotive para formato local
- `src/repository/sheetsRepository.js` — persiste vagas no Google Sheets (dedup por link, status por vaga)
- `src/filters/jobFilter.js` — filtra vagas por skill
- `src/learningTests/` — testes extremos de cada módulo

## Contrato da API Remotive

- Campo principal: `company_name` (não `company`)
- Salário é opcional (pode ser string vazia)
- Rate limit: máx 2 req/min, recomendado 4x/dia
- **Atribuição obrigatória:** mencionar Remotive como fonte

## Documentação

- [Arquitetura](docs/arquitetura.svg)
- [Spec do front-end](docs/spec-front-end.md)
- [Ferramentas, contas e autenticação](docs/ferramentas.md)

## Roadmap

- [x] Adapter para Remotive API
- [x] Persistência no Google Sheets (sheetsRepository)
- [x] Filtro de vagas por skill
- [x] API Express (leitura pública, status admin, sync via cron)
- [ ] Interface web (React + Vite)
- [ ] Deploy na Vercel
- [ ] Export para CSV