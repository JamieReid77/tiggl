import {
  defaultDatabaseName,
  defaultPoolerHost,
  defaultPoolerPort,
  defaultRuntimeUser,
  getDatabaseConfig,
  isDatabaseConfigured,
} from './env';

const envKeys = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_NAME',
  'DATABASE_USER',
  'TIGGL_RUNTIME_PASSWORD',
] as const;

describe('getDatabaseConfig', () => {
  let snapshot: Record<(typeof envKeys)[number], string | undefined>;

  beforeEach(() => {
    snapshot = {
      DATABASE_HOST: process.env.DATABASE_HOST,
      DATABASE_PORT: process.env.DATABASE_PORT,
      DATABASE_NAME: process.env.DATABASE_NAME,
      DATABASE_USER: process.env.DATABASE_USER,
      TIGGL_RUNTIME_PASSWORD: process.env.TIGGL_RUNTIME_PASSWORD,
    };
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = snapshot[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('is missing until host and password are set', () => {
    delete process.env.DATABASE_HOST;
    delete process.env.TIGGL_RUNTIME_PASSWORD;

    expect(isDatabaseConfigured()).toBe(false);
    expect(getDatabaseConfig()).toBeNull();
  });

  it('uses pooler defaults for user, database, and port', () => {
    process.env.DATABASE_HOST = defaultPoolerHost;
    process.env.TIGGL_RUNTIME_PASSWORD = 'test-password';
    delete process.env.DATABASE_PORT;
    delete process.env.DATABASE_NAME;
    delete process.env.DATABASE_USER;

    expect(getDatabaseConfig()).toEqual({
      host: defaultPoolerHost,
      port: defaultPoolerPort,
      database: defaultDatabaseName,
      user: defaultRuntimeUser,
      password: 'test-password',
    });
  });
});
