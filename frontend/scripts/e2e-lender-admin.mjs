import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:4310';
const outDir = 'scripts/screenshots';
mkdirSync(outDir, { recursive: true });

const phone = '+375' + Math.floor(100000000 + Math.random() * 899999999);
const consoleErrors = [];

async function shot(page, name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log('screenshot:', name);
}

const rndInn = () => {
  const d7 = () => String(Math.floor(1000000 + Math.random() * 8999999));
  const l = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const d3 = () => String(Math.floor(100 + Math.random() * 899));
  return `${d7()}${l()}${d3()}${l()}${l()}${Math.floor(Math.random() * 10)}`;
};

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

  console.log('=== Lender registration ===');
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await page.fill('input[formcontrolname="phone"]', phone);
  await page.click('button:has-text("Получить код по SMS")');
  await page.waitForSelector('text=Демо-режим');
  const code = (await page.textContent('.soz-dev-hint')).match(/(\d{6})/)?.[1];
  await page.fill('input[formcontrolname="code"]', code);
  await page.click('button:has-text("Далее")');
  await page.waitForSelector('mat-radio-button:has-text("Займодавец")');
  await page.fill('input[formcontrolname="password"]', 'Password123');
  await page.click('mat-radio-button:has-text("Займодавец")');
  await page.click('button:has-text("Зарегистрироваться")');
  await page.waitForURL('**/lender/kyc', { timeout: 15000 });

  await page.fill('input[formcontrolname="lastName"]', 'Сидоров');
  await page.fill('input[formcontrolname="firstName"]', 'Сидор');
  await page.fill('input[formcontrolname="birthDate"]', '1980-01-01');
  await page.fill('input[formcontrolname="passportSeries"]', 'HB');
  await page.fill('input[formcontrolname="passportNumber"]', '7654321');
  await page.fill('input[formcontrolname="passportIssuedBy"]', 'Гомельский РОВД');
  await page.fill('input[formcontrolname="passportIssuedDate"]', '2016-02-01');
  await page.fill('input[formcontrolname="inn"]', rndInn());
  await page.fill('input[formcontrolname="registrationAddress"]', 'г. Гомель, ул. Тестовая, д.2');
  await page.fill('input[formcontrolname="declaredMonthlyIncomeByn"]', '3000');
  await page.click('button:has-text("Отправить на проверку")');
  await page.waitForURL('**/lender', { timeout: 15000 });
  await shot(page, '20-lender-dashboard-empty');

  console.log('=== Top up wallet ===');
  await page.fill('input[formcontrolname="amountByn"]', '2000');
  await page.click('button:has-text("Пополнить (мок)")');
  await page.waitForTimeout(800);
  await shot(page, '21-lender-wallet-topped-up');

  console.log('=== Marketplace ===');
  await page.click('a:has-text("Маркетплейс заявок")');
  await page.waitForSelector('text=Маркетплейс заявок');
  await page.waitForTimeout(800);
  await shot(page, '22-marketplace');

  const hasListing = await page.locator('mat-card').count();
  console.log('Marketplace cards found:', hasListing);

  if (hasListing > 0) {
    const investButton = page.locator('button:has-text("Профинансировать")').first();
    if (await investButton.count()) {
      await investButton.click();
      await page.waitForTimeout(1000);
      await shot(page, '23-after-invest');
    }
  }

  console.log('=== Lender portfolio ===');
  await page.goto(`${BASE}/lender`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await shot(page, '24-lender-portfolio');

  console.log('=== Admin login ===');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[formcontrolname="phone"]', '+375290000000');
  await page.fill('input[formcontrolname="password"]', 'AdminPassword123');
  await page.click('button:has-text("Войти")');
  await page.waitForURL('**/admin', { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot(page, '25-admin-dashboard');

  await page.click('div.mdc-tab:has-text("Дела взыскания")');
  await page.waitForTimeout(500);
  await shot(page, '26-admin-collections');

  await page.click('div.mdc-tab:has-text("Лог SMS")');
  await page.waitForTimeout(500);
  await shot(page, '27-admin-sms-log');

  console.log('Console errors collected:', consoleErrors.length);
  for (const e of consoleErrors) console.log(' -', e);

  await browser.close();
  console.log('DONE');
}

main().catch((e) => {
  console.error('E2E SCRIPT FAILED:', e);
  process.exit(1);
});
