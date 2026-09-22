import axios from 'axios';

describe('Remotive API - Learning Tests', () => {
  test('Buscar vagas e entender a estrutura', async () => {
    console.log('\n📍 Chamando Remotive API...');

    const response = await axios.get(
      'https://remotive.com/api/remote-jobs?search=growth'
    );

    console.log('✅ Status:', response.status);
    console.log('📊 Total de vagas:', response.data.jobs.length);

    // Olha a PRIMEIRA vaga inteira, pra mapear os campos
    console.log('\n📄 Estrutura da 1ª vaga:\n');
    console.log(JSON.stringify(response.data.jobs[0], null, 2));

    expect(response.status).toBe(200);
    expect(response.data.jobs.length).toBeGreaterThan(0);
  });
});

