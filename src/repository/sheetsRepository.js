import { createHash } from 'crypto';
import { GoogleAuth } from 'google-auth-library';

// 📜 CONTRATO DO GOOGLE SHEETS (API v4)
// - Auth: Application Default Credentials, sem chave JSON.
//   Local: `gcloud auth application-default login --impersonate-service-account=sheets-writer@...`
//   Vercel: OIDC + Workload Identity Federation.
//   Escopo obrigatório: spreadsheets (o token padrão do gcloud NÃO serve).
// - Planilha compartilhada com a service account como Editor.
// - Aba "Vagas", linha 1 = cabeçalho, uma vaga por linha, chave = link.
// - Cota: 60 leituras/min e 60 escritas/min por usuário → 429 é retentado com backoff.
// - Valores gravados como RAW: texto que começa com "=" vira texto, nunca fórmula.
// - A API corta células vazias no fim da linha → toda linha lida é completada até COLUNAS.length.

const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const ABA = 'Vagas';
const COLUNAS = [
  'link', 'titulo', 'empresa', 'categoria', 'tipo', 'local',
  'salario', 'skills', 'publicadaEm', 'capturadaEm', 'status',
];
const ULTIMA_COLUNA = String.fromCharCode('A'.charCodeAt(0) + COLUNAS.length - 1); // "K"
const COLUNA_STATUS = String.fromCharCode('A'.charCodeAt(0) + COLUNAS.indexOf('status'));

export const STATUS_VALIDOS = ['nova', 'aplicada', 'entrevista', 'descartada'];

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

// 🔑 ID público da vaga: hash curto do link (o link cru não vai pra URL da API)
export function gerarId(link) {
  return createHash('sha256').update(link).digest('hex').slice(0, 12);
}

// 🧹 skills viram uma por linha dentro da célula (legível na planilha e sem ambiguidade com vírgula)
function skillsParaCelula(skills) {
  if (!Array.isArray(skills)) return '';
  return skills.map((s) => String(s).replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean).join('\n');
}

function celulaParaSkills(celula) {
  return celula ? celula.split('\n') : [];
}

function texto(valor) {
  return valor === undefined || valor === null ? '' : String(valor);
}

function vagaParaLinha(vaga, capturadaEm) {
  return [
    vaga.link, texto(vaga.titulo), vaga.empresa, texto(vaga.categoria), texto(vaga.tipo),
    texto(vaga.local), texto(vaga.salario), skillsParaCelula(vaga.skills),
    texto(vaga.publicadaEm), capturadaEm, 'nova',
  ];
}

function linhaParaVaga(linha) {
  const c = Object.fromEntries(COLUNAS.map((nome, i) => [nome, linha[i] ?? '']));
  return {
    id: gerarId(c.link),
    link: c.link,
    titulo: c.titulo,
    empresa: c.empresa,
    categoria: c.categoria,
    tipo: c.tipo,
    local: c.local,
    salario: c.salario,
    skills: celulaParaSkills(c.skills),
    publicadaEm: c.publicadaEm,
    capturadaEm: c.capturadaEm,
    status: STATUS_VALIDOS.includes(c.status) ? c.status : 'nova',
  };
}

// regra inviolável: sem link ou sem empresa, a vaga nunca é gravada
function vagaValida(vaga) {
  return (
    vaga !== null && typeof vaga === 'object' &&
    typeof vaga.link === 'string' && vaga.link.trim() !== '' &&
    typeof vaga.empresa === 'string' && vaga.empresa.trim() !== ''
  );
}

// 🏭 FÁBRICA: um repositório por planilha (prod usa SHEETS_ID, testes usam SHEETS_ID_TEST)
export function criarSheetsRepository(planilhaId) {
  if (!planilhaId) {
    throw new Error('criarSheetsRepository: planilhaId é obrigatório');
  }

  async function chamar({ caminho = '', method = 'GET', params, data }) {
    const client = await auth.getClient();
    const resposta = await client.request({
      url: `${API}/${planilhaId}${caminho}`,
      method,
      params,
      data,
      retryConfig: {
        retry: 5,
        httpMethodsToRetry: ['GET', 'PUT', 'POST'],
        statusCodesToRetry: [[429, 429], [503, 503]],
      },
    });
    return resposta.data;
  }

  const intervalo = (range) => `/values/${encodeURIComponent(`${ABA}!${range}`)}`;

  async function lerLinhas() {
    const dados = await chamar({ caminho: intervalo(`A2:${ULTIMA_COLUNA}`) });
    return dados.values ?? [];
  }

  async function garantirCabecalho() {
    const dados = await chamar({ caminho: intervalo(`A1:${ULTIMA_COLUNA}1`) });
    const atual = dados.values?.[0] ?? [];
    if (atual.join('|') === COLUNAS.join('|')) return;
    await chamar({
      caminho: intervalo(`A1:${ULTIMA_COLUNA}1`),
      method: 'PUT',
      params: { valueInputOption: 'RAW' },
      data: { values: [COLUNAS] },
    });
  }

  // 📖 LER: todas as vagas no formato limpo (linhas sem link são ignoradas)
  async function lerVagas() {
    const linhas = await lerLinhas();
    return linhas.filter((linha) => linha[0]).map(linhaParaVaga);
  }

  // ➕ ADICIONAR: grava só vagas válidas com link inédito; nunca mexe em linha existente
  async function adicionarVagas(vagas) {
    if (!Array.isArray(vagas)) {
      throw new Error('adicionarVagas: argumento deve ser um array');
    }

    await garantirCabecalho();
    const vistos = new Set((await lerLinhas()).map((linha) => linha[0]).filter(Boolean));
    const capturadaEm = new Date().toISOString();
    const novas = [];

    for (const vaga of vagas) {
      if (!vagaValida(vaga) || vistos.has(vaga.link)) continue;
      vistos.add(vaga.link); // também deduplica dentro do mesmo lote
      novas.push(vagaParaLinha(vaga, capturadaEm));
    }

    if (novas.length > 0) {
      await chamar({
        caminho: `${intervalo('A1')}:append`,
        method: 'POST',
        params: { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' },
        data: { values: novas },
      });
    }

    return { adicionadas: novas.length, ignoradas: vagas.length - novas.length };
  }

  // ✏️ ATUALIZAR STATUS: muda só a célula de status da vaga com esse id
  async function atualizarStatus(id, status) {
    if (!STATUS_VALIDOS.includes(status)) {
      throw new Error(`atualizarStatus: status inválido (use ${STATUS_VALIDOS.join(', ')})`);
    }

    const linhas = await lerLinhas();
    const indice = linhas.findIndex((linha) => linha[0] && gerarId(linha[0]) === id);
    if (indice === -1) return null; // vaga não existe

    const numeroLinha = indice + 2; // +1 do cabeçalho, +1 porque a planilha começa em 1
    await chamar({
      caminho: intervalo(`${COLUNA_STATUS}${numeroLinha}`),
      method: 'PUT',
      params: { valueInputOption: 'RAW' },
      data: { values: [[status]] },
    });
    return { id, status };
  }

  // 🗑️ LIMPAR: apaga tudo da aba, cabeçalho incluso (usado pelos testes)
  async function limparVagas() {
    await chamar({ caminho: `${intervalo(`A:${ULTIMA_COLUNA}`)}:clear`, method: 'POST' });
  }

  return { lerVagas, adicionarVagas, atualizarStatus, limparVagas };
}
