const PROJECT_REF = 'bppqtotktgchvitcmbmj';

export const defaultPoolerHost = 'aws-0-eu-west-2.pooler.supabase.com';
export const defaultPoolerPort = 6543;
export const defaultDatabaseName = 'postgres';
export const defaultRuntimeUser = `tiggl_runtime.${PROJECT_REF}`;

export type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

export const getDatabaseConfig = (): DatabaseConfig | null => {
  const host = process.env.DATABASE_HOST;
  const password = process.env.TIGGL_RUNTIME_PASSWORD;

  if (!host || !password) {
    return null;
  }

  const port = Number(process.env.DATABASE_PORT ?? defaultPoolerPort);

  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  return {
    host,
    port,
    database: process.env.DATABASE_NAME ?? defaultDatabaseName,
    user: process.env.DATABASE_USER ?? defaultRuntimeUser,
    password,
  };
};

export const isDatabaseConfigured = () => getDatabaseConfig() !== null;
