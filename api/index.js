import { criarApp } from '../src/app.js';
import { criarSheetsRepository } from '../src/repository/sheetsRepository.js';
import { buscarVagas } from '../src/adapters/remotiveAdapter.js';

// 🚪 ENTRADA DA VERCEL: monta a API com as dependências reais a partir das env vars
export default criarApp({
  repo: criarSheetsRepository(process.env.SHEETS_ID),
  buscarVagas,
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
  sessionSecret: process.env.SESSION_SECRET,
  cronSecret: process.env.CRON_SECRET,
  syncTermo: process.env.SYNC_TERMO || undefined,
});
