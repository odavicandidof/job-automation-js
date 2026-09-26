# job-automation-js

Automação de busca de vagas remotas no Remotive.

## Instalação

```bash
npm install
```

## Como rodar os testes

Os testes usam APIs reais (Remotive e uma planilha Google de teste). Antes, configure a credencial do Google e o `.env` seguindo [docs/ferramentas.md](docs/ferramentas.md).

```bash
npm test
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
- [ ] API Express (leitura pública, status admin, sync via cron)
- [ ] Interface web (React + Vite)
- [ ] Deploy na Vercel
- [ ] Export para CSV