// 🔄 SYNC: busca na Remotive e grava só o que é novo.
// Uma chamada por execução (a Remotive pede no máximo 2 req/min).
// Status de vaga existente nunca é tocado: adicionarVagas só faz append de link inédito.

export async function sincronizarVagas({ buscarVagas, repo, termo }) {
  const vagas = await buscarVagas(termo);
  return repo.adicionarVagas(vagas);
}
