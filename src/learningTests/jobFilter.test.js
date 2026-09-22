import { filtrarPorSkill } from '../filters/jobFilter.js';

describe('JobFilter - Learning Tests', () => {
  // dados de mentira, controlados por nós (não vem da internet)
  const vagasFalsas = [
    { titulo: 'Dev React',    skills: ['React', 'typescript '] },
    { titulo: 'Dev Python',   skills: ['python', 'django'] },
    { titulo: 'Fullstack',    skills: ['react', 'node', 'python'] },
  ];

  test('filtra vagas que pedem react (ignorando maiúscula e espaço)', () => {
    const resultado = filtrarPorSkill(vagasFalsas, 'react');

    console.log('\n📊 Vagas que pedem react:', resultado.length);
    resultado.forEach((v) => console.log('  -', v.titulo));

    // devem sobrar 2: "Dev React" (tinha "React") e "Fullstack" (tinha "react")
    expect(resultado.length).toBe(2);
  });

  test('não acha skill que ninguém pede', () => {
    const resultado = filtrarPorSkill(vagasFalsas, 'cobol');
    expect(resultado.length).toBe(0);
  });
});
