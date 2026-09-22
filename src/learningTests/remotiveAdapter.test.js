import { buscarVagas } from '../adapters/remotiveAdapter.js';

describe('RemotiveAdapter - Learning Tests', () => {
  test('buscarVagas devolve vagas no formato limpo', async () => {
    const vagas = await buscarVagas('growth');

    console.log('\n📊 Total:', vagas.length);
    console.log('📄 Primeira vaga (formato MEU):\n');
    console.log(JSON.stringify(vagas[0], null, 2));

    expect(vagas[0]).toHaveProperty('titulo');
    expect(vagas[0]).toHaveProperty('empresa');
    expect(vagas[0]).toHaveProperty('link');
    expect(vagas[0]).not.toHaveProperty('company_name');
  });
});