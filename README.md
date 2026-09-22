# Job Automation JS

Automação de busca de vagas com Remotive API + padrão Adapter.

## Objetivo

Integrar dados de oportunidades de emprego de uma API pública, transformar em formato limpo e filtrar por critérios (skill, tipo, localização).

## Por Que Remotive?

Jooble tem Cloudflare com verificação de humano. Remotive oferece API pública, sem autenticação, resposta JSON limpa. Pivot baseado em pragmatismo.

## Arquitetura

- **Adapter Pattern** (Clean Code, Ch8): `RemotiveAdapter` encapsula a API pública, expõe interface limpa
- **Filters**: `jobFilter.js` com critérios opcionais (skill, tipo, local)
- **Learning Tests**: Testes que exploram e documentam a API; usam dados fabricados para confiabilidade

## Estrutura

