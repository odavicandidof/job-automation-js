# spec-front-end.md · Vagas Remotive (v1.0)

> Arquitetura de referência: `docs/arquitetura.excalidraw`. Contas e env vars: `docs/ferramentas.md`.

## 1. Visão geral
**Vagas Remotive** é uma página web pública que mostra vagas remotas capturadas da Remotive (sync diário) e o status de acompanhamento de cada uma.

É um **projeto de portfólio com dados sintéticos**: o status ("aplicada", "entrevista"...) demonstra o fluxo e não representa candidaturas reais. Recrutadores e qualquer pessoa podem abrir. A página precisa ser boa de ler, honesta sobre como funciona e mostrar cuidado técnico, incluindo segurança básica. Não pode parecer vibe-codada.

## 2. Quem usa
| Perfil | Pode | Não pode |
|---|---|---|
| **Visitante** (recrutador, público) | ver vagas e status, filtrar, abrir o link da vaga, ver "Como funciona" | alterar qualquer coisa, ver dado sensível |
| **Admin** (Davi) | tudo do visitante + mudar status | — |

Regra: **toda escrita exige sessão admin**. O visitante nunca consegue alterar a planilha, nem chamando a API na mão (curl, DevTools).

## 3. Stack do front
- **React + Vite** em JavaScript (o resto do repo é JS/ESM).
- O código fica em `web/`. A pasta `front end ` será renomeada, porque o espaço no fim do nome quebra caminhos em scripts. O build sai em `dist/`, que a Vercel serve como estático. A API continua em `api/` (Express).
- Sem biblioteca de UI pronta (MUI, Chakra...): CSS próprio com tokens. Isso faz parte do "não parecer vibe-codado" e mostra domínio de CSS.
- Sem gerenciador de estado global. `useState`/`useReducer` + um hook `useVagas()` resolvem.
- Testes: **Vitest + Testing Library** no front; o Jest continua no back.
- `filtrarPorSkill()` (`src/filters/jobFilter.js`) é função pura e fica **compartilhada** entre o back e o front.

## 4. Estrutura da página (desktop-first, largura útil ~1200px)
1. **Cabeçalho:** "Vagas Remotive", uma frase do que o projeto faz, links "Como funciona" e GitHub. À direita, "Entrar" discreto (vira "Sair" com sessão ativa).
2. **Linha de status do sistema:** `N vagas · X novas hoje · atualizado às 08:00`. É texto, não um card gigante.
3. **Barra de filtros:** busca por skill (texto), categoria (select), status (select), e "limpar filtros". Os filtros ficam refletidos na URL (`?skill=crm&status=nova`) pra que o link possa ser compartilhado.
4. **Tabela densa** (uma linha por vaga):
   `Título + empresa | Categoria | Local | Salário | Skills (até 3 chips + "+n") | Publicada ("há 2 dias") | Status | ↗ abrir`
   - Ordenação padrão: mais recente primeiro. É possível clicar no cabeçalho pra ordenar por data e por empresa.
   - "Carregar mais" a cada 50 linhas.
   - Status: o visitante vê um badge (só leitura); o admin vê um select na própria linha.
5. **Rodapé:** "Vagas via Remotive" com link (obrigatório pelo contrato da API), link pro repo, uma linha sobre a stack e o aviso "projeto de portfólio · status ilustrativos".
6. **"Como funciona"** (modal ou seção âncora): o diagrama da arquitetura exportado em SVG e 3 frases. É vitrine técnica pro recrutador.
7. **Login admin:** modal com um campo de senha. Sem cadastro e sem "esqueci a senha".

Em tela < 768px, a tabela vira lista de cards. Funciona, mas não é o foco.

## 5. Status da vaga
- Valores fechados, nesta ordem: `nova` (padrão) · `aplicada` · `entrevista` · `descartada`.
- Ganha uma coluna `status` na planilha. O sync grava `nova` em vaga nova e **nunca sobrescreve** um status já existente.
- A troca é otimista: a UI muda na hora e, se a API falhar, volta ao valor anterior e mostra o erro em linha.
- A API rejeita (400) qualquer valor fora da lista fechada.

## 6. Regras de design (minimalista/neutro)
- **Tokens em `:root`:** escala de cinzas + **1** cor de destaque (usada só em links, foco e ação primária). Status usa cor apenas como apoio, sempre junto com texto.
- **Tipografia:** uma família (Inter via Google Fonts ou system-ui), tabela em 14px, títulos com peso e não com tamanho exagerado. `font-variant-numeric: tabular-nums` nas datas e contagens.
- **Espaçamento:** escala 4/8/12/16/24/32. Nada de valor avulso.
- **Tema:** claro e escuro via `prefers-color-scheme`.
- **Anti-vibe-code (proibido):** gradiente roxo, emoji em título ou botão, hero gigante com frase motivacional, sombra pesada, card dentro de card, lorem ipsum, ícone decorativo sem função, animação gratuita, texto "Welcome to...".
- **Obrigatório:** estados reais de *carregando* (skeleton de linhas), *vazio* ("nenhuma vaga ainda, o sync roda 1x/dia às 08:00"), *nenhum resultado pro filtro* (com "limpar filtros") e *erro* (mensagem e "tentar de novo").
- **Acessibilidade:** navegação completa por teclado, foco visível, contraste AA, `<table>` semântica com `<th scope>`, labels nos filtros, modal com foco preso e fechamento no Esc.

## 7. Regras de comportamento
- O front **só fala com a nossa API**, nunca com a Remotive nem com o Sheets.
- Todo texto que vem da vaga é dado de terceiro: renderizar via JSX (que escapa por padrão). **`dangerouslySetInnerHTML` é proibido.**
- Links de vaga: `target="_blank" rel="noopener noreferrer"`, e só viram link se começarem com `https://`.
- Nenhum segredo no front: nada de `VITE_*` com chave, nada em `localStorage`. Se está no bundle, é público.
- A sessão admin vive **só** no cookie `HttpOnly`. O front descobre se é admin por `GET /api/me`, nunca guardando flag local.

## 8. Contrato com a API
| Rota | Acesso | Resposta |
|---|---|---|
| `GET /api/vagas` | público | `[{ id, titulo, empresa, categoria, tipo, local, salario, skills[], link, publicadaEm, status }]` + `atualizadoEm` |
| `GET /api/me` | público | `{ admin: boolean }` |
| `POST /api/login` | público, com limite de tentativas | 204 + cookie, ou 401 |
| `POST /api/logout` | admin | 204 |
| `PATCH /api/vagas/:id/status` | admin | `{ id, status }`, ou 400/401 |
| `GET /api/cron/sync` | Bearer `CRON_SECRET` | `{ adicionadas, ignoradas }` |

O `id` é um hash curto do `link` (o link cru não vai na URL).

## 9. Segurança: base mínima já nesta versão
(O endurecimento completo do back fica pra uma fase própria, mas isto aqui não é negociável desde o início.)
- **Login admin:** senha única cujo hash fica na env var `ADMIN_PASSWORD_HASH` (scrypt, nativo do Node, sem dependência). Sessão em cookie `HttpOnly; Secure; SameSite=Strict`, assinado com `SESSION_SECRET`, expira em 8h. Máximo de 5 tentativas de login a cada 15 min.
- **Rotas de escrita** retornam 401 sem sessão admin. O teste cobre isso.
- **Headers:** CSP restritiva (`default-src 'self'`; fontes só do Google Fonts), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `frame-ancestors 'none'`. Configurados em `vercel.json`.
- **Erros** da API nunca devolvem stack, nome de arquivo, ID de planilha ou e-mail da Service Account.
- **Repo:** `.env` no `.gitignore`, secret scanning e Dependabot ligados no GitHub. Nenhuma chave SSH, token ou JSON de SA commitado, nem no histórico.
- **O que é público de propósito:** as vagas (que já são públicas na Remotive), os status sintéticos e o código.

## 10. Critérios de aceite (cada frase vira teste)
1. Visitante sem sessão recebe 401 em `PATCH /api/vagas/:id/status` e `POST /api/logout`.
2. Status fora de `nova|aplicada|entrevista|descartada` recebe 400.
3. Nenhuma resposta da API contém `SHEETS_ID`, e-mail da SA ou stack trace.
4. Uma vaga com `<script>` no título aparece como texto, não executa.
5. O rodapé com atribuição à Remotive aparece em todos os estados (carregando, vazio, erro, com dados).
6. Filtros na URL reproduzem a mesma lista ao recarregar a página.
7. O sync não altera o status de uma vaga já marcada.
8. Link de vaga que não é `https://` não vira link clicável.
9. Visitante vê o status como texto; o select de status só aparece com sessão admin.
10. A 6ª tentativa de login em 15 min recebe 429.
11. Tudo é operável só com teclado.
12. O bundle do front (`dist/`) não contém nenhum valor das env vars do servidor.

## 11. Deploy
- URL: `vagas-remotive.vercel.app` (subdomínio grátis com HTTPS; sem compra de domínio). Se o nome estiver ocupado, usar a variante que a Vercel sugerir.
- Deploy automático a cada push na `main`, e deploy de preview em cada PR.

## Changelog
- **v0.1:** rascunho inicial a partir da arquitetura v1.
- **v1.0:** projeto sintético (status visível ao público), status `entrevista` adicionado, nome "Vagas Remotive", stack React + Vite, subdomínio `*.vercel.app`, contrato da API, login admin e critérios de segurança fechados.
