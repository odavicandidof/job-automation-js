// 🧹 normaliza um texto pra comparação justa: minúsculo e sem espaços nas pontas
function normalizar(texto) {
  return texto.toLowerCase().trim();
}

// 🎯 FILTRO POR SKILL: devolve só as vagas que pedem a skill desejada
function filtrarPorSkill(vagas, skillDesejada) {
  const alvo = normalizar(skillDesejada);

  return vagas.filter((vaga) => {
    // vaga passa SE alguma das skills dela bate com o alvo
    return vaga.skills.some((skill) => normalizar(skill) === alvo);
  });
}

export { filtrarPorSkill };