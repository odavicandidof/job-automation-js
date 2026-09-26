import { jest } from '@jest/globals';
import { criarApp } from '../app.js';
import { gerarHashSenha } from '../auth/sessao.js';
import { gerarId } from '../repository/sheetsRepository.js';

// Testes da API com repositório em memória: cobrem o contrato HTTP e a segurança da spec (§8, §9, §10).
// O Sheets real já é coberto pelos learning tests; aqui o foco é quem pode fazer o quê.

const SENHA = 'senha-de-teste-longa';
const HASH = gerarHashSenha(SENHA);
const SESSION_SECRET = 'segredo-de-sessao-de-teste';
const CRON_SECRET = 'segredo-do-cron-de-teste';
const QUINZE_MIN = 15 * 60 * 1000;

function vaga(n, extra = {}) {
  const link = `https://remotive.com/remote-jobs/teste/dev-${n}`;
  return {
    id: gerarId(link), link, titulo: `Dev ${n}`, empresa: `Empresa ${n}`,
    categoria: 'Software Development', tipo: 'full_time', local: 'Worldwide',
    salario: 'Não informado', skills: ['react'], publicadaEm: `2026-09-2${n}`,
    capturadaEm: `2026-09-2${n}T08:00:00.000Z`, status: 'nova', ...extra,
  };
}

function criarRepoFake(vagas = []) {
  return {
    lerVagas: jest.fn(async () => vagas.map((v) => ({ ...v }))),
    adicionarVagas: jest.fn(async (novas) => ({ adicionadas: novas.length, ignoradas: 0 })),
    atualizarStatus: jest.fn(async (id, status) => {
      const alvo = vagas.find((v) => v.id === id);
      if (!alvo) return null;
      alvo.status = status;
      return { id, status };
    }),
  };
}

let servidor;
let base;
let relogio;

async function subir(opcoes = {}) {
  relogio = { agora: Date.parse('2026-09-26T12:00:00Z') };
  const app = criarApp({
    repo: criarRepoFake([vaga(1), vaga(2)]),
    buscarVagas: jest.fn(async () => []),
    adminPasswordHash: HASH,
    sessionSecret: SESSION_SECRET,
    cronSecret: CRON_SECRET,
    agora: () => relogio.agora,
    ...opcoes,
  });
  await new Promise((resolve) => { servidor = app.listen(0, resolve); });
  base = `http://127.0.0.1:${servidor.address().port}`;
}

afterEach(async () => {
  jest.restoreAllMocks();
  await new Promise((resolve) => servidor.close(resolve));
});

function pedir(caminho, { method = 'GET', corpo, cookie, headers = {} } = {}) {
  return fetch(`${base}${caminho}`, {
    method,
    headers: {
      ...(corpo !== undefined && { 'Content-Type': 'application/json' }),
      ...(cookie && { Cookie: cookie }),
      ...headers,
    },
    body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });
}

async function login(senha = SENHA) {
  const res = await pedir('/api/login', { method: 'POST', corpo: { senha } });
  const setCookie = res.headers.get('set-cookie');
  return { res, cookie: setCookie?.split(';')[0] };
}

describe('API - leitura pública', () => {
  beforeEach(() => subir());

  test('GET /api/vagas devolve só os campos do contrato, mais recente primeiro', async () => {
    const res = await pedir('/api/vagas');
    expect(res.status).toBe(200);
    const corpo = await res.json();

    expect(corpo.atualizadoEm).toBe('2026-09-22T08:00:00.000Z');
    expect(corpo.vagas.map((v) => v.titulo)).toEqual(['Dev 2', 'Dev 1']);
    expect(Object.keys(corpo.vagas[0]).sort()).toEqual([
      'categoria', 'empresa', 'id', 'link', 'local', 'publicadaEm',
      'salario', 'skills', 'status', 'tipo', 'titulo',
    ]);
  });

  test('GET /api/me sem sessão diz que não é admin', async () => {
    expect(await (await pedir('/api/me')).json()).toEqual({ admin: false });
  });

  test('rota desconhecida devolve 404 em JSON', async () => {
    const res = await pedir('/api/nao-existe');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ erro: 'Rota não encontrada' });
  });
});

describe('API - login e sessão admin', () => {
  beforeEach(() => subir());

  test('senha certa devolve 204 e cookie HttpOnly, Secure, SameSite=Strict de 8h', async () => {
    const { res } = await login();
    expect(res.status).toBe(204);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toMatch(/^sessao=/);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Max-Age=28800');
  });

  test('senha errada devolve 401 sem cookie', async () => {
    const { res } = await login('senha-errada');
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  test('com sessão, /api/me diz que é admin', async () => {
    const { cookie } = await login();
    expect(await (await pedir('/api/me', { cookie })).json()).toEqual({ admin: true });
  });

  test('sessão expira depois de 8h', async () => {
    const { cookie } = await login();
    relogio.agora += 8 * 60 * 60 * 1000;
    expect(await (await pedir('/api/me', { cookie })).json()).toEqual({ admin: false });
  });

  test('cookie adulterado não vale', async () => {
    const { cookie } = await login();
    const [nome, valor] = cookie.split('=');
    const [, assinatura] = valor.split('.');
    const forjado = `${nome}=${relogio.agora + 10 ** 9}.${assinatura}`;
    expect(await (await pedir('/api/me', { cookie: forjado })).json()).toEqual({ admin: false });
  });

  test('sem ADMIN_PASSWORD_HASH configurado, nenhuma senha entra', async () => {
    await new Promise((resolve) => servidor.close(resolve));
    await subir({ adminPasswordHash: undefined });
    expect((await login()).res.status).toBe(401);
  });

  test('logout com sessão devolve 204 e expira o cookie', async () => {
    const { cookie } = await login();
    const res = await pedir('/api/logout', { method: 'POST', cookie });
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  // critério 10
  test('a 6ª tentativa de login em 15 min recebe 429, mesmo com a senha certa', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await login('senha-errada')).res.status).toBe(401);
    }
    expect((await login()).res.status).toBe(429);
  });

  test('depois de 15 min o limite de login zera', async () => {
    for (let i = 0; i < 6; i += 1) await login('senha-errada');
    relogio.agora += QUINZE_MIN;
    expect((await login()).res.status).toBe(204);
  });

  test('o limite é por IP', async () => {
    const tentar = (ip) => pedir('/api/login', {
      method: 'POST', corpo: { senha: 'x' }, headers: { 'X-Forwarded-For': ip },
    });
    for (let i = 0; i < 6; i += 1) await tentar('203.0.113.1');
    expect((await tentar('203.0.113.1')).status).toBe(429);
    expect((await tentar('203.0.113.2')).status).toBe(401);
  });
});

describe('API - escrita exige admin', () => {
  beforeEach(() => subir());

  // critério 1
  test('PATCH de status sem sessão recebe 401', async () => {
    const res = await pedir(`/api/vagas/${vaga(1).id}/status`, { method: 'PATCH', corpo: { status: 'aplicada' } });
    expect(res.status).toBe(401);
  });

  test('POST /api/logout sem sessão recebe 401', async () => {
    expect((await pedir('/api/logout', { method: 'POST' })).status).toBe(401);
  });

  test('sem sessão, o 401 vem antes da validação do status', async () => {
    const res = await pedir(`/api/vagas/${vaga(1).id}/status`, { method: 'PATCH', corpo: { status: 'hackeada' } });
    expect(res.status).toBe(401);
  });

  test('admin muda o status e recebe { id, status }', async () => {
    const { cookie } = await login();
    const id = vaga(1).id;
    const res = await pedir(`/api/vagas/${id}/status`, { method: 'PATCH', corpo: { status: 'entrevista' }, cookie });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id, status: 'entrevista' });
  });

  // critério 2
  test.each(['hackeada', '', 'NOVA', 42, null, undefined])('status %p recebe 400', async (status) => {
    const { cookie } = await login();
    const res = await pedir(`/api/vagas/${vaga(1).id}/status`, { method: 'PATCH', corpo: { status }, cookie });
    expect(res.status).toBe(400);
  });

  test('JSON malformado recebe 400', async () => {
    const { cookie } = await login();
    const res = await pedir(`/api/vagas/${vaga(1).id}/status`, { method: 'PATCH', corpo: '{status:', cookie });
    expect(res.status).toBe(400);
  });

  test('id inexistente recebe 404', async () => {
    const { cookie } = await login();
    const res = await pedir('/api/vagas/000000000000/status', { method: 'PATCH', corpo: { status: 'aplicada' }, cookie });
    expect(res.status).toBe(404);
  });
});

describe('API - sync via cron', () => {
  test('sem Bearer correto recebe 401 e não chama a Remotive', async () => {
    const buscarVagas = jest.fn(async () => []);
    await subir({ buscarVagas });
    expect((await pedir('/api/cron/sync')).status).toBe(401);
    expect((await pedir('/api/cron/sync', { headers: { Authorization: 'Bearer errado' } })).status).toBe(401);
    expect(buscarVagas).not.toHaveBeenCalled();
  });

  test('sem CRON_SECRET configurado, nenhum token entra', async () => {
    await subir({ cronSecret: undefined });
    const res = await pedir('/api/cron/sync', { headers: { Authorization: 'Bearer ' } });
    expect(res.status).toBe(401);
  });

  test('com Bearer correto busca uma vez e devolve { adicionadas, ignoradas }', async () => {
    const buscarVagas = jest.fn(async () => [vaga(3)]);
    const repo = criarRepoFake();
    await subir({ buscarVagas, repo, syncTermo: 'growth' });

    const res = await pedir('/api/cron/sync', { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ adicionadas: 1, ignoradas: 0 });
    expect(buscarVagas).toHaveBeenCalledTimes(1);
    expect(buscarVagas).toHaveBeenCalledWith('growth');
    expect(repo.adicionarVagas).toHaveBeenCalledWith([vaga(3)]);
  });
});

// critério 3
describe('API - erros não vazam detalhes', () => {
  const SHEETS_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdefg';
  const EMAIL_SA = 'sheets-writer@job-automation-js.iam.gserviceaccount.com';

  test('falha do repositório vira 500 genérico, sem ID, e-mail ou stack', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const repo = criarRepoFake();
    repo.lerVagas.mockRejectedValue(
      new Error(`Permission denied for ${EMAIL_SA} on spreadsheet ${SHEETS_ID}`),
    );
    await subir({ repo });

    const res = await pedir('/api/vagas');
    const texto = await res.text();
    expect(res.status).toBe(500);
    expect(JSON.parse(texto)).toEqual({ erro: 'Erro interno' });
    expect(texto).not.toContain(SHEETS_ID);
    expect(texto).not.toContain(EMAIL_SA);
    expect(texto).not.toMatch(/at .+\.js/);
  });

  test('não expõe o header X-Powered-By', async () => {
    await subir();
    expect((await pedir('/api/vagas')).headers.get('x-powered-by')).toBeNull();
  });
});
