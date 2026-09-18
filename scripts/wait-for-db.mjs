import net from 'node:net';

const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT || 5433);
const maxAttempts = 60;
const delayMs = 1000;

function tryConnect() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(`Ожидание PostgreSQL на ${host}:${port}...`);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await tryConnect()) {
      console.log('PostgreSQL готов.');
      process.exit(0);
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(delayMs);
  }
  console.error(`PostgreSQL не ответил за ${maxAttempts} секунд. Проверьте: docker compose logs postgres`);
  process.exit(1);
}

main();
