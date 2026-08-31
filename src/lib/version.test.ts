import { version } from './version';

describe('version', () => {
  it('is a semver string', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
