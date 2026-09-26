import { createHmac, scryptSync, randomBytes, timingSafeEqual } from 'crypto';

// 🔐 SESSÃO ADMIN SEM ESTADO
// - Senha: hash scrypt no formato "salt:hash" (hex) em ADMIN_PASSWORD_HASH. Gerar com `npm run hash-senha`.
// - Cookie: "<expiraEm>.<assinatura>", assinado com HMAC-SHA256(SESSION_SECRET). Nada guardado no servidor.
// - Sem segredo configurado, tudo falha fechado: nenhuma senha confere e nenhum cookie vale.

export const NOME_COOKIE = 'sessao';
export const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

const TAMANHO_HASH = 64;

function iguaisEmTempoConstante(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function gerarHashSenha(senha) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(senha, salt, TAMANHO_HASH).toString('hex');
  return `${salt}:${hash}`;
}

export function senhaConfere(senha, hashGuardado) {
  if (typeof senha !== 'string' || senha === '' || !hashGuardado) return false;
  const [salt, hash] = hashGuardado.split(':');
  if (!salt || !hash) return false;
  const calculado = scryptSync(senha, salt, TAMANHO_HASH).toString('hex');
  return iguaisEmTempoConstante(calculado, hash);
}

function assinar(valor, segredo) {
  return createHmac('sha256', segredo).update(valor).digest('hex');
}

export function criarToken(segredo, agora) {
  const expiraEm = String(agora + DURACAO_SESSAO_MS);
  return `${expiraEm}.${assinar(expiraEm, segredo)}`;
}

export function tokenValido(token, segredo, agora) {
  if (!token || !segredo) return false;
  const [expiraEm, assinatura] = token.split('.');
  if (!expiraEm || !assinatura) return false;
  if (!iguaisEmTempoConstante(assinatura, assinar(expiraEm, segredo))) return false;
  return Number(expiraEm) > agora;
}

export function lerCookie(cabecalho, nome) {
  if (!cabecalho) return undefined;
  for (const parte of cabecalho.split(';')) {
    const [chave, ...resto] = parte.trim().split('=');
    if (chave === nome) return resto.join('=');
  }
  return undefined;
}

export function cookieSessao(token) {
  const segundos = DURACAO_SESSAO_MS / 1000;
  return `${NOME_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${segundos}`;
}

export function cookieExpirado() {
  return `${NOME_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function bearerConfere(cabecalho, segredo) {
  if (!segredo || !cabecalho) return false;
  return iguaisEmTempoConstante(cabecalho, `Bearer ${segredo}`);
}
