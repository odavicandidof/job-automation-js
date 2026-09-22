import fs from 'fs/promises';
import path from 'path';

const JOBS_FILE = path.join(process.cwd(), 'jobs.json');

// 💾 SALVAR: escreve as vagas em JSON
export async function salvarVagas(vagas) {
  if (!Array.isArray(vagas)) {
    throw new Error('salvarVagas: argumento deve ser um array');
  }
  await fs.writeFile(JOBS_FILE, JSON.stringify(vagas, null, 2), 'utf-8');
}

// 📖 LER: lê as vagas do JSON (captura seletiva: ENOENT é esperado)
export async function lerVagas() {
  try {
    const dados = await fs.readFile(JOBS_FILE, 'utf-8');
    return JSON.parse(dados);
  } catch (erro) {
    if (erro.code === 'ENOENT') return []; // arquivo não existe = OK, retorna vazio
    throw erro; // qualquer outro erro: deixa estourar
  }
}

// 🗑️ LIMPAR: apaga o arquivo de vagas
export async function limparVagas() {
  try {
    await fs.unlink(JOBS_FILE);
  } catch (erro) {
    if (erro.code === 'ENOENT') return; // arquivo não existe = OK
    throw erro;
  }
}