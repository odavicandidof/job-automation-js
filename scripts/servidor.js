import app from '../api/index.js';

// 🖥️ servidor local: `npm run api` (lê o .env via --env-file)
const porta = Number(process.env.PORT) || 3000;
app.listen(porta, () => {
  console.log(`API em http://localhost:${porta}/api/vagas`);
});
