import mysql from "mysql2/promise";

// Singleton connection pool — reused across serverless invocations
// when the Node.js module cache is warm (same container).
declare global {
  // eslint-disable-next-line no-var
  var __db_pool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  return mysql.createPool({
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT ?? "3306", 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl:
      process.env.DB_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
    waitForConnections: true,
    connectionLimit: 5, // keep low for serverless
    queueLimit: 0,
    timezone: "+00:00",
  });
}

// Reuse pool across hot reloads in dev; create fresh in prod per cold start
const pool: mysql.Pool =
  process.env.NODE_ENV === "development"
    ? (global.__db_pool ??= createPool())
    : createPool();

if (process.env.NODE_ENV === "development") {
  global.__db_pool = pool;
}

export default pool;