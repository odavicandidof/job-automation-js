// Carrega o .env nos testes sem depender de dotenv (util.parseEnv é nativo do Node).
// process.loadEnvFile não serve aqui: ele escreve no process.env real, e o Jest dá a cada
// arquivo de teste um process.env isolado. Variáveis já definidas no ambiente (ex.: CI) vencem.
const { readFileSync } = require('fs');
const { parseEnv } = require('util');

try {
  const variaveis = parseEnv(readFileSync('.env', 'utf8'));
  for (const [nome, valor] of Object.entries(variaveis)) {
    if (process.env[nome] === undefined) process.env[nome] = valor;
  }
} catch (erro) {
  if (erro.code !== 'ENOENT') throw erro;
}
