import { config } from './src/config';

export default {
  databaseUrl: process.env.DATABASE_URL || {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  },
  migrationsTable: 'pgmigrations',
  dir: 'migrations',
  direction: 'up',
};
