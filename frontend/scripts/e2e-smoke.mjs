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

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

  console.log('Using phone:', phone);

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Сервис онлайн-заимствования');
  await shot(page, '01-home');

  await page.click('a:has-text("Начать")');
  await page.waitForSelector('text=Регистрация');
  await shot(page, '02-register-page');

  await page.fill('input[formcontrolname="phone"]', phone);
  await page.click('button:has-text("Получить код по SMS")');
  await page.waitForSelector('text=Демо-режим', { timeout: 10000 });
  const hint = await page.textContent('.soz-dev-hint');
  const code = hint.match(/(\d{6})/)?.[1];
  console.log('OTP code:', code);
  await shot(page, '03-otp-step');

  await page.fill('input[formcontrolname="code"]', code);
  await page.click('button:has-text("Далее")');
  await page.waitForSelector('mat-radio-button:has-text("Заёмщик")');

  await page.fill('input[formcontrolname="password"]', 'Password123');
  await page.click('mat-radio-button:has-text("Заёмщик")');
  await shot(page, '04-finish-step');

  await page.click('button:has-text("Зарегистрироваться")');
  await page.waitForURL('**/borrower/kyc', { timeout: 15000 });
  await page.waitForSelector('text=Анкета для идентификации');
  await shot(page, '05-kyc-page');

  const rndInn = () => {
    const d7 = () => String(Math.floor(1000000 + Math.random() * 8999999));
    const l = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const d3 = () => String(Math.floor(100 + Math.random() * 899));
    return `${d7()}${l()}${d3()}${l()}${l()}${Math.floor(Math.random() * 10)}`;
  };

  await page.fill('input[formcontrolname="lastName"]', 'Иванов');
  await page.fill('input[formcontrolname="firstName"]', 'Иван');
  await page.fill('input[formcontrolname="patronymic"]', 'Иванович');
  await page.fill('input[formcontrolname="birthDate"]', '1990-05-15');
  await page.fill('input[formcontrolname="passportSeries"]', 'MP');
  await page.fill('input[formcontrolname="passportNumber"]', '1234567');
  await page.fill('input[formcontrolname="passportIssuedBy"]', 'Минский РОВД');
  await page.fill('input[formcontrolname="passportIssuedDate"]', '2015-01-10');
  await page.fill('input[formcontrolname="inn"]', rndInn());
  await page.fill('input[formcontrolname="registrationAddress"]', 'г. Минск, ул. Примерная, д. 1');
  await page.fill('input[formcontrolname="declaredMonthlyIncomeByn"]', '2500');
  await page.fill('input[formcontrolname="employer"]', 'ООО Ромашка');
  await shot(page, '06-kyc-filled');

  await page.click('button:has-text("Отправить на проверку")');
  await page.waitForURL('**/borrower', { timeout: 15000 });
  await page.waitForSelector('text=Кабинет заёмщика');
  await shot(page, '07-borrower-dashboard');

  await page.click('a:has-text("Подать заявку на заём")');
  await page.waitForSelector('text=Подать заявку на заём');
  await page.waitForTimeout(1000);
  await shot(page, '08-apply-page');

  await page.fill('input[formcontrolname="purpose"]', 'Ремонт квартиры');
  await page.waitForTimeout(600);
  await shot(page, '09-apply-with-preview');

  await page.click('button:has-text("Подать заявку и пройти скоринг")');
  await page.waitForURL('**/borrower/applications/*', { timeout: 15000 });
  await page.waitForSelector('.soz-status');
  await page.waitForTimeout(500);
  await shot(page, '10-application-result');

  const bodyText = await page.textContent('body');
  console.log('Application page contains "Одобрено":', bodyText.includes('Одобрено') || bodyText.includes('Собрано'));
  console.log('Application page contains "Отклонено":', bodyText.includes('Отклонено'));

  console.log('Console errors collected:', consoleErrors.length);
  for (const e of consoleErrors) console.log(' -', e);

  await browser.close();
  console.log('DONE');
}

main().catch((e) => {
  console.error('E2E SCRIPT FAILED:', e);
  process.exit(1);
});
