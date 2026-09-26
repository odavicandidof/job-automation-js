import { createInterface } from 'readline';
import { gerarHashSenha } from '../src/auth/sessao.js';

// 🔑 gera o valor de ADMIN_PASSWORD_HASH: `npm run hash-senha`
// A senha é lida do stdin (não vai pro histórico do shell) e só o hash é impresso.
const rl = createInterface({ input: process.stdin, output: process.stderr });
rl.question('Senha de admin: ', (senha) => {
  rl.close();
  if (senha.length < 12) {
    console.error('Use pelo menos 12 caracteres.');
    process.exit(1);
  }
  console.log(gerarHashSenha(senha));
});
