import { salvarVagas, lerVagas, limparVagas } from '../repository/jobRepository.js';

describe('JobRepository - Learning Tests (Casos Extremos)', () => {
  beforeEach(async () => {
    await limparVagas();
  });

  // ✅ CASOS NORMAIS
  test('salva um array de vagas válidas', async () => {
    const vagas = [
      { titulo: 'Dev', empresa: 'Acme' },
      { titulo: 'QA', empresa: 'Beta' },
    ];
    await salvarVagas(vagas);
    const lidas = await lerVagas();
    expect(lidas).toEqual(vagas);
  });

  test('lê vagas salvas corretamente', async () => {
    const vagas = [{ titulo: 'Dev React', empresa: 'TechCorp' }];
    await salvarVagas(vagas);
    const lidas = await lerVagas();
    expect(lidas[0].titulo).toBe('Dev React');
  });

  test('limpa o arquivo com sucesso', async () => {
    await salvarVagas([{ titulo: 'Dev' }]);
    await limparVagas();
    const lidas = await lerVagas();
    expect(lidas).toEqual([]);
  });

  test('lê array vazio quando arquivo não existe', async () => {
    const lidas = await lerVagas();
    expect(lidas).toEqual([]);
  });

  // ⚠️ CASOS EXTREMOS
  test('lança erro ao salvar argumento que não é array', async () => {
    await expect(salvarVagas({ titulo: 'Dev' })).rejects.toThrow('deve ser um array');
  });

  test('lança erro ao salvar string', async () => {
    await expect(salvarVagas('não sou array')).rejects.toThrow();
  });

  test('lança erro ao salvar null', async () => {
    await expect(salvarVagas(null)).rejects.toThrow();
  });

  test('salva array vazio sem erro', async () => {
    await salvarVagas([]);
    const lidas = await lerVagas();
    expect(lidas).toEqual([]);
  });

  test('salva vagas com campos undefined', async () => {
    const vagas = [
      { titulo: 'Dev', empresa: undefined },
      { titulo: 'QA', empresa: 'Beta' },
    ];
    await salvarVagas(vagas);
    const lidas = await lerVagas();
    expect(lidas[0].empresa).toBeUndefined();
  });

  test('salva vagas com skills vazio', async () => {
    const vagas = [{ titulo: 'Dev', skills: [] }];
    await salvarVagas(vagas);
    const lidas = await lerVagas();
    expect(lidas[0].skills).toEqual([]);
  });

  test('limpa arquivo inexistente sem erro', async () => {
    await expect(limparVagas()).resolves.not.toThrow();
  });

  test('salva com acentuação e caracteres especiais', async () => {
    const vagas = [{ titulo: 'Dev Sênior', empresa: 'Ação & Reação Ltda.' }];
    await salvarVagas(vagas);
    const lidas = await lerVagas();
    expect(lidas[0].empresa).toBe('Ação & Reação Ltda.');
  });

  test('sobrescreve arquivo anterior', async () => {
    await salvarVagas([{ titulo: 'Primeira' }]);
    await salvarVagas([{ titulo: 'Segunda' }]);
    const lidas = await lerVagas();
    expect(lidas.length).toBe(1);
    expect(lidas[0].titulo).toBe('Segunda');
  });

  test('salva 1000 registros', async () => {
    const muitas = Array.from({ length: 1000 }, (_, i) => ({
      titulo: `Dev ${i}`,
      empresa: `Empresa ${i}`,
    }));
    await salvarVagas(muitas);
    const lidas = await lerVagas();
    expect(lidas.length).toBe(1000);
  });
});