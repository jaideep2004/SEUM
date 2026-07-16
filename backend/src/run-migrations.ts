import { config } from './config';

async function run() {
  const { default: migrate } = await import('node-pg-migrate');
  const { default: pg } = await import('pg');

  const dbConfig = process.env.DATABASE_URL || {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  };

  const pool = new pg.Pool(
    typeof dbConfig === 'string' ? { connectionString: dbConfig } : dbConfig
  );

  try {
    const result = await migrate({
      db: pool,
      dir: 'migrations',
      migrationsTable: 'pgmigrations',
      direction: 'up',
      count: Infinity,
      logger: {
        info: (msg: string) => console.log(`[migrate] ${msg}`),
        warn: (msg: string) => console.warn(`[migrate] ${msg}`),
        error: (msg: string) => console.error(`[migrate] ${msg}`),
      },
    });

    console.log(`Ran ${result.length} migration(s)`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
