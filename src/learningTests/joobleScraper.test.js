import puppeteer from 'puppeteer';

describe('Jooble Scraper - Learning Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    console.log('\n🌐 Abrindo Puppeteer...');
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    console.log('✅ Navegador pronto!\n');
  });

  afterAll(async () => {
    console.log('\n🛑 Fechando Puppeteer...');
    await browser.close();
  });

  test('Buscar vagas no Jooble', async () => {
    console.log('📍 Navegando...');
    await page.goto('https://jooble.org/', { waitUntil: 'networkidle2' });
    console.log('✅ Página carregada!');

    const vagas = await page.evaluate(() => {
      return document.body.innerText.substring(0, 500);
    });

    console.log('📄 Conteúdo:\n', vagas);
    expect(vagas.length).toBeGreaterThan(0);
  });
});