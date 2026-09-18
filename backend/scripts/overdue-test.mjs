import pg from 'pg';
const BASE = 'http://localhost:3000';

async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    console.error(`FAIL ${method} ${path} -> ${res.status}`, JSON.stringify(data));
    throw new Error(`${method} ${path} failed`);
  }
  return data;
}

function randPhone() { return '+375' + Math.floor(100000000 + Math.random() * 899999999); }
function randInn() {
  const d7 = () => String(Math.floor(1000000 + Math.random() * 8999999));
  const l = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const d3 = () => String(Math.floor(100 + Math.random() * 899));
  return `${d7()}${l()}${d3()}${l()}${l()}${Math.floor(Math.random()*10)}`;
}

async function registerUser(role, incomeByn) {
  const phone = randPhone();
  const otp = await call('POST', '/auth/otp/request', { phone, purpose: 'REGISTRATION' });
  const auth = await call('POST', '/auth/register/confirm', { phone, code: otp.devCode, password: 'Password123', role });
  const token = auth.accessToken;
  await call('POST', '/profiles/me', {
    lastName: 'Петров', firstName: 'Пётр', patronymic: 'Петрович', birthDate: '1985-03-20',
    passportSeries: 'MP', passportNumber: '7654321', passportIssuedBy: 'Гомельский РОВД',
    passportIssuedDate: '2016-02-01', inn: randInn(), registrationAddress: 'г. Гомель, ул. Тестовая, д.2',
    declaredMonthlyIncomeByn: incomeByn, employer: 'ЧУП Тест', eripAccountRef: `ERIP-${phone}`,
  }, token);
  return { phone, token };
}

async function main() {
  let borrower, application;
  for (let i = 1; i <= 8; i++) {
    borrower = await registerUser('BORROWER', 2500);
    application = await call('POST', '/loan-applications', { requestedAmountByn: 800, requestedTermMonths: 4, purpose: 'Просрочка тест' }, borrower.token);
    if (application.status === 'PUBLISHED_FOR_FUNDING') break;
  }
  if (application.status !== 'PUBLISHED_FOR_FUNDING') throw new Error('could not get approved application');
  console.log('Application approved:', application.approvedAmountByn, application.annualRatePercent, '%');

  const lender = await registerUser('LENDER', 3000);
  await call('POST', '/wallet/topup', { amountByn: 2000 }, lender.token);
  await call('POST', '/marketplace/commitments', { applicationId: application.id, amountByn: application.approvedAmountByn }, lender.token);

  const myApp = await call('GET', `/loan-applications/${application.id}`, undefined, borrower.token);
  const loanId = myApp.loanId;
  console.log('Loan issued:', loanId);

  const client = new pg.Client({ host: 'localhost', port: 5433, user: 'soz', password: 'soz_local_password', database: 'soz' });
  await client.connect();

  const overdueDate1 = new Date(); overdueDate1.setDate(overdueDate1.getDate() - 35);
  const overdueDate2 = new Date(); overdueDate2.setDate(overdueDate2.getDate() - 8);
  await client.query(
    `UPDATE payment_schedule_items SET "dueDate" = $1 WHERE "loanId" = $2 AND "installmentNo" = 1`,
    [overdueDate1.toISOString().slice(0, 10), loanId],
  );
  await client.query(
    `UPDATE payment_schedule_items SET "dueDate" = $1 WHERE "loanId" = $2 AND "installmentNo" = 2`,
    [overdueDate2.toISOString().slice(0, 10), loanId],
  );
  console.log('Backdated installment #1 to', overdueDate1.toISOString().slice(0,10), '(35 days overdue -> PRE_CLAIM expected)');
  console.log('Backdated installment #2 to', overdueDate2.toISOString().slice(0,10), '(8 days overdue)');
  await client.end();

  console.log('=== Running daily cron cycle ===');
  const cron = await call('POST', '/dev/cron/run-daily');
  console.log('Cron result:', JSON.stringify(cron, null, 2));

  const schedule = await call('GET', `/loans/${loanId}/schedule`, undefined, borrower.token);
  console.log('Schedule after cron:');
  for (const item of schedule) {
    console.log(`  #${item.installmentNo} due=${item.dueDate} status=${item.status} daysOverdue=${item.daysOverdue} penaltyDue=${item.penaltyDueByn}`);
  }

  const loan = await call('GET', `/loans/${loanId}`, undefined, borrower.token);
  console.log('Loan status:', loan.status, 'accruedPenalty:', loan.accruedPenaltyByn);

  const defaultCase = await call('GET', `/collections/loans/${loanId}/case`, undefined, borrower.token);
  console.log('Default case:', JSON.stringify(defaultCase, null, 2));

  console.log('DONE');
}

main().catch((e) => { console.error('TEST FAILED', e); process.exit(1); });
