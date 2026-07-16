import dotenv from 'dotenv';
dotenv.config();

function parseConnectionUri(uri: string) {
  const url = new URL(uri);
  const sslParam = url.searchParams.get('sslmode');
  const hostname = url.hostname;
  // Enable SSL for remote hosts (Supabase, etc.) unless sslmode=disable
  const ssl = sslParam !== 'disable' && hostname !== 'localhost' && !hostname.startsWith('127.');
  return {
    host: hostname,
    port: parseInt(url.port || '5432', 10),
    database: url.pathname.replace(/^\//, ''),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl,
  };
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: process.env.DATABASE_URL
    ? parseConnectionUri(process.env.DATABASE_URL)
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'seum',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: process.env.DB_SSL === 'true',
      },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'seum-access-secret-dev',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'seum-refresh-secret-dev',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || 'http://localhost:3000',
  },

  auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10),
};
