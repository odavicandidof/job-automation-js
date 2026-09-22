import axios from 'axios';

const REMOTIVE_API = 'https://remotive.com/api/remote-jobs';

// 🧹 TRADUTOR: pega UMA vaga crua da Remotive e devolve no MEU formato limpo
function traduzirVaga(vagaCrua) {
  return {
    titulo: vagaCrua.title,
    empresa: vagaCrua.company_name,
    categoria: vagaCrua.category,
    tipo: vagaCrua.job_type,
    local: vagaCrua.candidate_required_location,
    salario: vagaCrua.salary || 'Não informado',
    skills: vagaCrua.tags,
    link: vagaCrua.url,
    publicadaEm: vagaCrua.publication_date.split('T')[0], // "2026-09-18T16:43:22" → "2026-09-18"
  };
}

// 🎯 A INTERFACE LIMPA: é isso que o resto do sistema vai usar
async function buscarVagas(termoBusca) {
  const response = await axios.get(REMOTIVE_API, {
    params: { search: termoBusca },
  });

  // traduz TODAS as vagas cruas pro meu formato
  return response.data.jobs.map(traduzirVaga);
}

export { buscarVagas };

