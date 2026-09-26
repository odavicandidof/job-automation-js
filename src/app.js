import express from 'express';
import { STATUS_VALIDOS } from './repository/sheetsRepository.js';
import { sincronizarVagas } from './services/sincronizarVagas.js';
import { criarLimiteTentativas } from './auth/limiteTentativas.js';
import {
  NOME_COOKIE, senhaConfere, criarToken, tokenValido, lerCookie,
  cookieSessao, cookieExpirado, bearerConfere,
} from './auth/sessao.js';

// 🏭 FÁBRICA DA API: dependências entram por parâmetro (prod passa o Sheets real, testes passam fakes)
// Contrato das rotas e regras de segurança: docs/spec-front-end.md §8 e §9.
export function criarApp({
  repo,
  buscarVagas,
  adminPasswordHash,
  sessionSecret,
  cronSecret,
  syncTermo,
  agora = () => Date.now(),
}) {
  const app = express();
  const limiteLogin = criarLimiteTentativas({ maximo: 5, janelaMs: 15 * 60 * 1000 });

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // na Vercel o IP real vem no X-Forwarded-For
  app.use(express.json({ limit: '1kb' }));

  const ehAdmin = (req) => tokenValido(lerCookie(req.headers.cookie, NOME_COOKIE), sessionSecret, agora());

  function exigirAdmin(req, res, next) {
    if (!ehAdmin(req)) return res.status(401).json({ erro: 'Não autorizado' });
    next();
  }

  // 📖 público: só os campos do contrato, mais recente primeiro
  app.get('/api/vagas', async (req, res) => {
    const vagas = await repo.lerVagas();
    const atualizadoEm = vagas.reduce((maior, v) => (v.capturadaEm > maior ? v.capturadaEm : maior), '') || null;
    res.json({
      atualizadoEm,
      vagas: vagas
        .map(({ id, titulo, empresa, categoria, tipo, local, salario, skills, link, publicadaEm, status }) => (
          { id, titulo, empresa, categoria, tipo, local, salario, skills, link, publicadaEm, status }
        ))
        .sort((a, b) => b.publicadaEm.localeCompare(a.publicadaEm)),
    });
  });

  app.get('/api/me', (req, res) => {
    res.json({ admin: ehAdmin(req) });
  });

  app.post('/api/login', (req, res) => {
    if (!limiteLogin.tentar(req.ip, agora())) {
      return res.status(429).json({ erro: 'Muitas tentativas, tente mais tarde' });
    }
    if (!senhaConfere(req.body?.senha, adminPasswordHash) || !sessionSecret) {
      return res.status(401).json({ erro: 'Senha incorreta' });
    }
    res.setHeader('Set-Cookie', cookieSessao(criarToken(sessionSecret, agora())));
    res.status(204).end();
  });

  app.post('/api/logout', exigirAdmin, (req, res) => {
    res.setHeader('Set-Cookie', cookieExpirado());
    res.status(204).end();
  });

  app.patch('/api/vagas/:id/status', exigirAdmin, async (req, res) => {
    const status = req.body?.status;
    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: `Status inválido (use ${STATUS_VALIDOS.join(', ')})` });
    }
    const resultado = await repo.atualizarStatus(req.params.id, status);
    if (!resultado) return res.status(404).json({ erro: 'Vaga não encontrada' });
    res.json(resultado);
  });

  // 🕗 chamado pelo Vercel Cron, que manda "Authorization: Bearer <CRON_SECRET>"
  app.get('/api/cron/sync', async (req, res) => {
    if (!bearerConfere(req.headers.authorization, cronSecret)) {
      return res.status(401).json({ erro: 'Não autorizado' });
    }
    res.json(await sincronizarVagas({ buscarVagas, repo, termo: syncTermo }));
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada' });
  });

  // 🧯 nenhum erro vaza stack, ID de planilha ou e-mail da service account: o detalhe fica só no log
  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    if (erro.type === 'entity.parse.failed' || erro.type === 'entity.too.large') {
      return res.status(400).json({ erro: 'Corpo da requisição inválido' });
    }
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno' });
  });

  return app;
}
