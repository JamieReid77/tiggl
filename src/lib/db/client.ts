import postgres, { type Sql } from 'postgres';

import { getDatabaseConfig } from './env';

import 'server-only';

const globalForDb = globalThis as typeof globalThis & {
  tigglSql?: Sql;
};

export const getSql = (): Sql | null => {
  if (globalForDb.tigglSql) {
    return globalForDb.tigglSql;
  }

  const config = getDatabaseConfig();

  if (!config) {
    return null;
  }

  const sql = postgres({
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.user,
    password: config.password,
    ssl: 'require',
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    connection: {
      statement_timeout: 5000,
    },
  });

  globalForDb.tigglSql = sql;
  return sql;
};
