import { anonymousName, parsePlayerName } from './playerName';

describe('parsePlayerName', () => {
  it('accepts arcade-length names', () => {
    expect(parsePlayerName(anonymousName)).toEqual({
      ok: true,
      name: anonymousName,
    });
    expect(parsePlayerName('jamie')).toEqual({ ok: true, name: 'JAMIE' });
    expect(parsePlayerName('abcdefghijklmno')).toEqual({
      ok: true,
      name: 'ABCDEFGHIJKLMNO',
    });
    expect(parsePlayerName('  ada  12 ')).toEqual({
      ok: true,
      name: 'ADA 12',
    });
  });

  it('rejects names that are too short or too long', () => {
    expect(parsePlayerName('jo').ok).toBe(false);
    expect(parsePlayerName('abcdefghijklmnop').ok).toBe(false);
  });

  it('rejects punctuation', () => {
    expect(parsePlayerName('JAMIE!').ok).toBe(false);
  });

  it('rejects rude names including spaced and leet variants', () => {
    expect(parsePlayerName('fuck').ok).toBe(false);
    expect(parsePlayerName('f u c k').ok).toBe(false);
    expect(parsePlayerName('sh1t').ok).toBe(false);
    expect(parsePlayerName('a$$').ok).toBe(false);
  });
});
