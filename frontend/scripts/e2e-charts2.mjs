import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const API = 'http://localhost:3000';
const BASE = 'http://localhost:4310';
const outDir = 'scripts/screenshots-v2';
mkdirSync(outDir, { recursive: true });

async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function randPhone() { return '+375' + Math.floor(100000000 + Math.random() * 899999999); }
const rndInn = () => {
  const d7 = () => String(Math.floor(1000000 + Math.random() * 8999999));
  const l = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const d3 = () => String(Math.floor(100 + Math.random() * 899));
  return `${d7()}${l()}${d3()}${l()}${l()}${Math.floor(Math.random()*10)}`;
};

async function registerFull(role, incomeByn) {
  const phone = randPhone();
  const otp = await call('POST', '/auth/otp/request', { phone, purpose: 'REGISTRATION' });
  const auth = await call('POST', '/auth/register/confirm', { phone, code: otp.devCode, password: 'Password123' });
  let token = auth.accessToken;
  await call('POST', '/profiles/me', {
    lastName: 'Тест', firstName: 'Юзер', birthDate: '1990-01-01',
    passportSeries: 'MP', passportNumber: String(1000000 + Math.floor(Math.random()*8999999)),
    passportIssuedBy: 'Минский РОВД', passportIssuedDate: '2015-01-10',
    inn: rndInn(), registrationAddress: 'г. Минск', declaredMonthlyIncomeByn: incomeByn,
  }, token);
  const msi = await call('POST', '/profiles/me/msi/verify', undefined, token);
  if (msi.msiStatus !== 'VERIFIED') throw new Error('MSI failed, retry with different seed');
  if (role === 'LENDER') {
    const upd = await call('POST', `/auth/roles/LENDER`, {}, token);
    token = upd.accessToken;
    return { phone, token, refreshToken: upd.refreshToken, user: upd.user };
  }
  return { phone, token, refreshToken: auth.refreshToken, user: auth.user };
}

async function setAuthInBrowser(page, session) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate((s) => {
    localStorage.setItem('soz.auth', JSON.stringify({ accessToken: s.token, refreshToken: s.refreshToken, user: s.user }));
  }, session);
}

async function main() {
  console.log('=== Setting up borrower via API ===');
  let borrower, application;
  for (let i = 0; i < 8; i++) {
    borrower = await registerFull('BORROWER', 3000);
    application = await call('POST', '/loan-applications', { requestedAmountByn: 500, requestedTermMonths: 3, purpose: 'Ноутбук для работы' }, borrower.token);
    if (application.status === 'PUBLISHED_FOR_FUNDING') break;
  }
  console.log('Application:', application.status, application.approvedAmountByn);
  if (application.status !== 'PUBLISHED_FOR_FUNDING') throw new Error('Could not get approved application');

  console.log('=== Setting up lender via API, fund fully ===');
  const lender = await registerFull('LENDER', 4000);
  await call('POST', '/wallet/topup', { amountByn: 2000 }, lender.token);
  await call('POST', '/marketplace/commitments', { applicationId: application.id, amountByn: application.approvedAmountByn }, lender.token);

  const appAfter = await call('GET', `/loan-applications/${application.id}`, undefined, borrower.token);
  const loanId = appAfter.loanId;
  console.log('Loan issued:', loanId);

  console.log('=== Pay first installment via API ===');
  const schedule = await call('GET', `/loans/${loanId}/schedule`, undefined, borrower.token);
  const first = schedule[0];
  const payment = await call('POST', '/payments/initiate', { loanId, amountByn: first.totalDueByn }, borrower.token);
  await call('POST', `/payments/${payment.id}/confirm`, undefined, borrower.token);
  console.log('Payment confirmed for', first.totalDueByn, 'BYN');

  const browser = await chromium.launch();

  console.log('=== Borrower: view loan detail chart + print ===');
  const borrowerPage = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await setAuthInBrowser(borrowerPage, borrower);
  await borrowerPage.goto(`${BASE}/borrower/loans/${loanId}`, { waitUntil: 'networkidle' });
  await borrowerPage.waitForTimeout(800);
  await borrowerPage.screenshot({ path: `${outDir}/12-borrower-loan-with-chart.png`, fullPage: true });
  console.log('screenshot: 12-borrower-loan-with-chart');

  await borrowerPage.emulateMedia({ media: 'print' });
  await borrowerPage.waitForTimeout(300);
  await borrowerPage.screenshot({ path: `${outDir}/13-borrower-loan-print-view.png`, fullPage: true });
  console.log('screenshot: 13-borrower-loan-print-view (emulated print media)');
  await borrowerPage.emulateMedia({ media: 'screen' });

  console.log('=== Lender: view earnings chart with real data ===');
  const lenderPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await setAuthInBrowser(lenderPage, lender);
  await lenderPage.goto(`${BASE}/lender`, { waitUntil: 'networkidle' });
  await lenderPage.waitForTimeout(800);
  await lenderPage.screenshot({ path: `${outDir}/14-lender-earnings-populated.png`, fullPage: true });
  console.log('screenshot: 14-lender-earnings-populated');

  // hover the chart to check tooltip
  const chartSvg = lenderPage.locator('soz-earnings-chart svg');
  if (await chartSvg.count()) {
    const box = await chartSvg.boundingBox();
    if (box) {
      await lenderPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await lenderPage.waitForTimeout(300);
      await lenderPage.screenshot({ path: `${outDir}/15-lender-earnings-tooltip.png`, fullPage: true });
      console.log('screenshot: 15-lender-earnings-tooltip');
    }
  }

  await browser.close();
  console.log('DONE');
}

main().catch((e) => { console.error('FAILED', e); process.exit(1); });
