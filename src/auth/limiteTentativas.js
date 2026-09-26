// 🚦 LIMITE DE TENTATIVAS POR IP (janela fixa)
// Guardado em memória: numa função serverless cada instância tem o próprio contador.
// Suficiente pra base mínima da spec; um store compartilhado fica pra fase de endurecimento.

export function criarLimiteTentativas({ maximo, janelaMs }) {
  const registros = new Map(); // ip → { inicio, tentativas }

  // registra a tentativa e diz se ela está dentro do limite
  function tentar(ip, agora) {
    for (const [chave, registro] of registros) {
      if (agora - registro.inicio >= janelaMs) registros.delete(chave);
    }

    const registro = registros.get(ip) ?? { inicio: agora, tentativas: 0 };
    registro.tentativas += 1;
    registros.set(ip, registro);
    return registro.tentativas <= maximo;
  }

  return { tentar };
}
