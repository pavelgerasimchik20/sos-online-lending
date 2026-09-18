import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:4310';
const outDir = 'scripts/screenshots-v2';
mkdirSync(outDir, { recursive: true });

const consoleErrors = [];

async function shot(page, name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log('screenshot:', name);
}

function randPhone() { return '+375' + Math.floor(100000000 + Math.random() * 899999999); }

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

  console.log('=== Home page (marketing landing) ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=SOS — сервис онлайн-заимствования');
  await page.waitForTimeout(1200); // let counters animate
  await shot(page, '01-home-hero');

  console.log('=== Simplified single-page registration ===');
  await page.click('a:has-text("Начать за 30 секунд")');
  await page.waitForSelector('text=Быстрая регистрация');
  await page.waitForTimeout(600);
  const phone = randPhone();
  await page.fill('input[formcontrolname="phone"]', phone);
  await page.waitForTimeout(300);
  await shot(page, '02-register-phone');
  await page.click('button:has-text("Получить код по SMS")');
  await page.waitForSelector('text=Демо-режим', { timeout: 15000 });
  await page.waitForTimeout(400);
  const hint = await page.textContent('.soz-dev-hint');
  const code = hint.match(/(\d{6})/)?.[1];
  console.log('OTP code:', code);
  await page.fill('input[formcontrolname="code"]', code);
  await page.fill('input[formcontrolname="password"]', 'Password123');
  await shot(page, '03-register-finish');
  await page.click('button:has-text("Создать аккаунт")');
  await page.waitForURL('**/kyc', { timeout: 15000 });

  console.log('=== KYC + MSI steps ===');
  await page.waitForSelector('text=Анкета для идентификации');
  const rndInn = () => {
    const d7 = () => String(Math.floor(1000000 + Math.random() * 8999999));
    const l = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const d3 = () => String(Math.floor(100 + Math.random() * 899));
    return `${d7()}${l()}${d3()}${l()}${l()}${Math.floor(Math.random()*10)}`;
  };
  await page.fill('input[formcontrolname="lastName"]', 'Смирнов');
  await page.fill('input[formcontrolname="firstName"]', 'Алексей');
  await page.fill('input[formcontrolname="birthDate"]', '1992-06-20');
  await page.fill('input[formcontrolname="passportSeries"]', 'MP');
  await page.fill('input[formcontrolname="passportNumber"]', '9988776');
  await page.fill('input[formcontrolname="passportIssuedBy"]', 'Минский РОВД');
  await page.fill('input[formcontrolname="passportIssuedDate"]', '2018-03-01');
  await page.fill('input[formcontrolname="inn"]', rndInn());
  await page.fill('input[formcontrolname="registrationAddress"]', 'г. Минск, пр. Победителей, 1');
  await page.fill('input[formcontrolname="declaredMonthlyIncomeByn"]', '2800');
  await page.click('button:has-text("Отправить на проверку")');
  await page.waitForSelector('text=Идентификация через МСИ', { timeout: 10000 });
  await shot(page, '04-kyc-done-msi-appears');

  await page.click('button:has-text("Пройти идентификацию через МСИ")');
  await page.waitForTimeout(1200);
  await shot(page, '05-msi-result');

  const msiOk = await page.locator('button:has-text("Перейти в личный кабинет")').count();
  console.log('MSI verified (goToCabinet button present):', msiOk > 0);
  if (msiOk > 0) {
    await page.click('button:has-text("Перейти в личный кабинет")');
    await page.waitForURL('**/borrower', { timeout: 10000 });
  }

  await page.waitForTimeout(500);
  await shot(page, '06-borrower-dashboard');

  console.log('=== Apply for loan ===');
  const canApply = await page.locator('a:has-text("Подать заявку на заём")').count();
  console.log('Apply button visible (fully verified):', canApply > 0);
  if (canApply > 0) {
    await page.click('a:has-text("Подать заявку на заём")');
    await page.waitForSelector('text=Подать заявку на заём');
    await page.fill('input[formcontrolname="purpose"]', 'Ремонт квартиры');
    await page.waitForTimeout(600);
    await page.click('button:has-text("Подать заявку и пройти скоринг")');
    await page.waitForURL('**/borrower/applications/*', { timeout: 15000 });
    await page.waitForTimeout(500);
    await shot(page, '07-application-result');
  }

  console.log('=== Admin login (admin/admin) ===');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[formcontrolname="login"]', 'admin');
  await page.fill('input[formcontrolname="password"]', 'admin');
  await page.click('button:has-text("Войти")');
  await page.waitForURL('**/admin', { timeout: 15000 });
  await page.waitForTimeout(600);
  await shot(page, '08-admin-dashboard');

  console.log('=== Admin users tab ===');
  await page.click('div.mdc-tab:has-text("Пользователи")');
  await page.waitForTimeout(500);
  await shot(page, '09-admin-users-tab');

  await page.click('button:has-text("Добавить пользователя")');
  await page.waitForTimeout(300);
  await page.fill('.soz-create-user-form input[formcontrolname="login"]', 'testmanager');
  await page.fill('.soz-create-user-form input[formcontrolname="password"]', 'testpass1');
  await shot(page, '10-admin-create-user-form');

  console.log('Console errors collected:', consoleErrors.length);
  for (const e of consoleErrors.slice(0, 20)) console.log(' -', e);

  await browser.close();
  console.log('DONE');
}

main().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
