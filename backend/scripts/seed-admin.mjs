/**
 * Создаёт (или повышает существующего) пользователя-администратора СОЗ.
 * Роль ADMIN нельзя получить через публичный API (POST /auth/roles/:role
 * разрешает только BORROWER/LENDER) — это осознанное ограничение
 * безопасности, поэтому назначение делается отдельным скриптом с прямым
 * доступом к БД.
 *
 * Запуск: node scripts/seed-admin.mjs [+375XXXXXXXXX] [password]
 * Бэкенд должен быть запущен (используется /auth/otp/request и
 * /auth/register/confirm) и слушать http://localhost:3000.
 */
import pg from 'pg';

const BASE = process.env.API_BASE ?? 'http://localhost:3000';
const phone = process.argv[2] ?? '+375290000000';
const password = process.argv[3] ?? 'AdminPassword123';

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const client = new pg.Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5433),
    user: process.env.DB_USERNAME ?? 'soz',
    password: process.env.DB_PASSWORD ?? 'soz_local_password',
    database: process.env.DB_DATABASE ?? 'soz',
  });
  await client.connect();

  const existing = await client.query('SELECT id, roles FROM users WHERE phone = $1', [phone]);

  if (existing.rowCount === 0) {
    const otp = await call('POST', '/auth/otp/request', { phone, purpose: 'REGISTRATION' });
    await call('POST', '/auth/register/confirm', { phone, code: otp.devCode, password, role: 'BORROWER' });
    console.log(`Создан пользователь ${phone}`);
  } else {
    console.log(`Пользователь ${phone} уже существует`);
  }

  await client.query(
    `UPDATE users SET roles = ARRAY(SELECT DISTINCT unnest(roles || ARRAY['ADMIN']::users_roles_enum[])) WHERE phone = $1`,
    [phone],
  );

  const result = await client.query('SELECT id, phone, roles FROM users WHERE phone = $1', [phone]);
  console.log('Готово:', result.rows[0]);
  console.log(`Логин: ${phone} / Пароль: ${password}`);

  await client.end();
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
