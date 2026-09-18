import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:4310';
const outDir = 'scripts/screenshots-v2';
mkdirSync(outDir, { recursive: true });

function randPhone() { return '+375' + Math.floor(100000000 + Math.random() * 899999999); }
const rndInn = () => {
  const d7 = () => String(Math.floor(1000000 + Math.random() * 8999999));
  const l = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const d3 = () => String(Math.floor(100 + Math.random() * 899));
  return `${d7()}${l()}${d3()}${l()}${l()}${Math.floor(Math.random()*10)}`;
};

async function registerAndVerify(page, incomeByn) {
  const phone = randPhone();
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.fill('input[formcontrolname="phone"]', phone);
  await page.waitForTimeout(200);
  await page.click('button:has-text("Получить код по SMS")');
  await page.waitForSelector('text=Демо-режим', { timeout: 15000 });
  const hint = await page.textContent('.soz-dev-hint');
  const code = hint.match(/(\d{6})/)?.[1];
  await page.fill('input[formcontrolname="code"]', code);
  await page.fill('input[formcontrolname="password"]', 'Password123');
  await page.click('button:has-text("Создать аккаунт")');
  await page.waitForURL('**/kyc', { timeout: 15000 });

  await page.fill('input[formcontrolname="lastName"]', 'Кузнецов');
  await page.fill('input[formcontrolname="firstName"]', 'Олег');
  await page.fill('input[formcontrolname="birthDate"]', '1988-04-10');
  await page.fill('input[formcontrolname="passportSeries"]', 'HB');
  await page.fill('input[formcontrolname="passportNumber"]', '1231231');
  await page.fill('input[formcontrolname="passportIssuedBy"]', 'Витебский РОВД');
  await page.fill('input[formcontrolname="passportIssuedDate"]', '2017-05-05');
  await page.fill('input[formcontrolname="inn"]', rndInn());
  await page.fill('input[formcontrolname="registrationAddress"]', 'г. Витебск, ул. Ленина, 5');
  await page.fill('input[formcontrolname="declaredMonthlyIncomeByn"]', String(incomeByn));
  await page.click('button:has-text("Отправить на проверку")');
  await page.waitForSelector('text=Идентификация через МСИ', { timeout: 10000 });
  await page.click('button:has-text("Пройти идентификацию через МСИ")');
  await page.waitForSelector('button:has-text("Перейти в личный кабинет")', { timeout: 10000 });
  await page.click('button:has-text("Перейти в личный кабинет")');
  return phone;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  console.log('=== Register borrower, apply for loan ===');
  await registerAndVerify(page, 3000);
  await page.waitForURL('**/borrower', { timeout: 10000 });

  let applicationId = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    await page.goto(`${BASE}/borrower/apply`, { waitUntil: 'networkidle' });
    await page.fill('input[formcontrolname="purpose"]', 'Покупка техники');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Подать заявку и пройти скоринг")');
    await page.waitForURL('**/borrower/applications/*', { timeout: 15000 });
    const url = page.url();
    applicationId = url.split('/').pop();
    const statusText = await page.textContent('.soz-status');
    console.log(`attempt ${attempt}: status badge = ${statusText}`);
    if (statusText && statusText.includes('Сбор')) break;
    // application rejected -> need a fresh borrower to retry (one active application per user)
    if (attempt < 6) {
      await registerAndVerify(page, 3000);
      await page.waitForURL('**/borrower', { timeout: 10000 });
    }
  }
  console.log('Application id:', applicationId);

  console.log('=== Register lender, fund it fully ===');
  const lenderPage = await browser.newContext().then((c) => c.newPage());
  lenderPage.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push('LENDER: ' + msg.text()); });
  await registerAndVerify(lenderPage, 4000);
  // this account defaults to BORROWER role; add LENDER role via dashboard CTA
  await lenderPage.waitForURL('**/borrower', { timeout: 10000 });
  await lenderPage.click('button:has-text("Стать инвестором")');
  await lenderPage.waitForURL('**/lender', { timeout: 10000 });
  await lenderPage.fill('input[formcontrolname="amountByn"]', '5000');
  await lenderPage.click('button:has-text("Пополнить (мок)")');
  await lenderPage.waitForTimeout(800);

  await lenderPage.goto(`${BASE}/lender/marketplace`, { waitUntil: 'networkidle' });
  await lenderPage.waitForTimeout(500);
  const fundButtons = await lenderPage.locator('button:has-text("Профинансировать целиком")').count();
  console.log('Listings available to fund:', fundButtons);
  if (fundButtons > 0) {
    await lenderPage.locator('button:has-text("Профинансировать целиком")').first().click();
    await lenderPage.waitForTimeout(1500);
  }

  await lenderPage.goto(`${BASE}/lender`, { waitUntil: 'networkidle' });
  await lenderPage.waitForTimeout(800);
  await lenderPage.screenshot({ path: `${outDir}/11-lender-earnings-chart.png`, fullPage: true });
  console.log('screenshot: 11-lender-earnings-chart');

  console.log('=== Borrower: pay first installment, check chart + print ===');
  await page.goto(`${BASE}/borrower`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const loanCard = page.locator('mat-card.soz-clickable-card').first();
  if (await loanCard.count()) {
    await loanCard.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${outDir}/12-borrower-loan-chart.png`, fullPage: true });
    console.log('screenshot: 12-borrower-loan-chart');

    const payButton = page.locator('button:has-text("Оплатить")');
    if (await payButton.count()) {
      await payButton.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${outDir}/13-borrower-after-payment.png`, fullPage: true });
      console.log('screenshot: 13-borrower-after-payment');
    }
  } else {
    console.log('No loan card found on borrower dashboard (funding may not have completed)');
  }

  console.log('Console errors:', consoleErrors.length);
  for (const e of consoleErrors.slice(0, 20)) console.log(' -', e);

  await browser.close();
  console.log('DONE');
}

main().catch((e) => { console.error('FAILED', e); process.exit(1); });
