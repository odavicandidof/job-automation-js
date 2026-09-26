import { jest } from '@jest/globals';
import { criarSheetsRepository, gerarId } from '../repository/sheetsRepository.js';

// Learning tests contra a planilha TESTE real (SHEETS_ID_TEST no .env).
// Nada de mock: se o Google mudar o contrato, é aqui que a gente descobre.
jest.setTimeout(60_000);

if (!process.env.SHEETS_ID_TEST) {
  throw new Error('SHEETS_ID_TEST não definido no .env (veja docs/ferramentas.md)');
}

const repo = criarSheetsRepository(process.env.SHEETS_ID_TEST);

function vaga(n, extra = {}) {
  return {
    titulo: `Dev ${n}`,
    empresa: `Empresa ${n}`,
    categoria: 'Software Development',
    tipo: 'full_time',
    local: 'Worldwide',
    salario: 'Não informado',
    skills: ['react', 'node'],
    link: `https://remotive.com/remote-jobs/teste/dev-${n}`,
    publicadaEm: '2026-09-20',
    ...extra,
  };
}

describe('SheetsRepository - Learning Tests (planilha real)', () => {
  beforeEach(async () => {
    await repo.limparVagas();
  });

  // ✅ CASOS NORMAIS
  test('planilha vazia devolve array vazio', async () => {
    expect(await repo.lerVagas()).toEqual([]);
  });

  test('adiciona e lê de volta no formato limpo, com id e status nova', async () => {
    const resultado = await repo.adicionarVagas([vaga(1)]);
    expect(resultado).toEqual({ adicionadas: 1, ignoradas: 0 });

    const [lida] = await repo.lerVagas();
    expect(lida).toMatchObject({ ...vaga(1), id: gerarId(vaga(1).link), status: 'nova' });
    expect(new Date(lida.capturadaEm).toString()).not.toBe('Invalid Date');
  });

  test('cabeçalho criado na linha 1 não aparece como vaga', async () => {
    await repo.adicionarVagas([vaga(1)]);
    await repo.adicionarVagas([vaga(2)]);
    const lidas = await repo.lerVagas();
    expect(lidas.map((v) => v.link)).toEqual([vaga(1).link, vaga(2).link]);
  });

  test('atualiza o status de uma vaga pelo id', async () => {
    await repo.adicionarVagas([vaga(1), vaga(2)]);
    const id = gerarId(vaga(2).link);

    expect(await repo.atualizarStatus(id, 'entrevista')).toEqual({ id, status: 'entrevista' });

    const lidas = await repo.lerVagas();
    expect(lidas.find((v) => v.id === id).status).toBe('entrevista');
    expect(lidas.find((v) => v.id !== id).status).toBe('nova');
  });

  // ⚠️ CASOS EXTREMOS
  test('lança erro ao adicionar argumento que não é array (objeto, string, null)', async () => {
    await expect(repo.adicionarVagas(vaga(1))).rejects.toThrow('deve ser um array');
    await expect(repo.adicionarVagas('não sou array')).rejects.toThrow('deve ser um array');
    await expect(repo.adicionarVagas(null)).rejects.toThrow('deve ser um array');
  });

  test('array vazio não grava nada', async () => {
    expect(await repo.adicionarVagas([])).toEqual({ adicionadas: 0, ignoradas: 0 });
    expect(await repo.lerVagas()).toEqual([]);
  });

  test('nunca grava vaga sem link ou sem empresa (vazio, espaços, ausente, null)', async () => {
    const invalidas = [
      vaga(1, { link: '' }),
      vaga(2, { link: undefined }),
      vaga(3, { empresa: '   ' }),
      vaga(4, { empresa: null }),
      null,
      'não sou vaga',
    ];
    expect(await repo.adicionarVagas([...invalidas, vaga(5)])).toEqual({ adicionadas: 1, ignoradas: 6 });
    expect((await repo.lerVagas()).map((v) => v.empresa)).toEqual(['Empresa 5']);
  });

  test('mesmo link duas vezes no lote grava uma vez só', async () => {
    const resultado = await repo.adicionarVagas([vaga(1), vaga(1, { titulo: 'Duplicada' })]);
    expect(resultado).toEqual({ adicionadas: 1, ignoradas: 1 });
    expect((await repo.lerVagas())[0].titulo).toBe('Dev 1');
  });

  test('vaga já existente não é regravada e mantém o status marcado', async () => {
    await repo.adicionarVagas([vaga(1)]);
    await repo.atualizarStatus(gerarId(vaga(1).link), 'aplicada');

    const resultado = await repo.adicionarVagas([vaga(1, { titulo: 'Título novo' }), vaga(2)]);
    expect(resultado).toEqual({ adicionadas: 1, ignoradas: 1 });

    const primeira = (await repo.lerVagas()).find((v) => v.link === vaga(1).link);
    expect(primeira).toMatchObject({ titulo: 'Dev 1', status: 'aplicada' });
  });

  test('acentos, emoji e & sobrevivem à ida e volta', async () => {
    const especial = vaga(1, { titulo: 'Dev Sênior 🚀', empresa: 'Ação & Reação Ltda.', local: 'São Paulo' });
    await repo.adicionarVagas([especial]);
    expect((await repo.lerVagas())[0]).toMatchObject({
      titulo: 'Dev Sênior 🚀', empresa: 'Ação & Reação Ltda.', local: 'São Paulo',
    });
  });

  test('skill com vírgula fica inteira e quebra de linha dentro da skill vira espaço', async () => {
    await repo.adicionarVagas([vaga(1, { skills: ['C, C++', 'node\njs', '  ', 'AI/ML'] })]);
    expect((await repo.lerVagas())[0].skills).toEqual(['C, C++', 'node js', 'AI/ML']);
  });

  test('texto que parece fórmula é gravado como texto, nunca executado', async () => {
    const formula = '=HYPERLINK("https://evil.example","clique")';
    await repo.adicionarVagas([vaga(1, { titulo: formula, salario: '+5000' })]);
    expect((await repo.lerVagas())[0]).toMatchObject({ titulo: formula, salario: '+5000' });
  });

  test('campos ausentes viram texto vazio e skills que não é array vira lista vazia', async () => {
    await repo.adicionarVagas([{ link: 'https://remotive.com/x', empresa: 'Só o mínimo', skills: 'react' }]);
    expect((await repo.lerVagas())[0]).toMatchObject({
      titulo: '', categoria: '', salario: '', publicadaEm: '', skills: [], status: 'nova',
    });
  });

  test('grava 500 vagas de uma vez', async () => {
    const muitas = Array.from({ length: 500 }, (_, i) => vaga(i));
    expect(await repo.adicionarVagas(muitas)).toEqual({ adicionadas: 500, ignoradas: 0 });
    expect((await repo.lerVagas()).length).toBe(500);
  });

  test('status fora da lista fechada lança erro e id inexistente devolve null', async () => {
    await repo.adicionarVagas([vaga(1)]);
    await expect(repo.atualizarStatus(gerarId(vaga(1).link), 'contratado')).rejects.toThrow('status inválido');
    expect(await repo.atualizarStatus('naoexiste123', 'aplicada')).toBeNull();
  });
});

describe('SheetsRepository - contrato da fábrica', () => {
  test('lança erro sem id de planilha', () => {
    expect(() => criarSheetsRepository(undefined)).toThrow('planilhaId é obrigatório');
    expect(() => criarSheetsRepository('')).toThrow('planilhaId é obrigatório');
  });

  test('id é estável e curto (12 hex) para o mesmo link', () => {
    const link = 'https://remotive.com/remote-jobs/x';
    expect(gerarId(link)).toBe(gerarId(link));
    expect(gerarId(link)).toMatch(/^[0-9a-f]{12}$/);
    expect(gerarId(link)).not.toBe(gerarId(`${link}-2`));
  });
});
