export const nameMinLength = 3;
export const nameMaxLength = 15;
export const anonymousName = '';
export const legacyAnonymousName = 'ANON';

export const displayPlayerName = (name: string) =>
  name === legacyAnonymousName ? anonymousName : name;

const blockedNames = new Set([
  'ANAL',
  'ANUS',
  'ARSE',
  'ASS',
  'ASSHOLE',
  'BALLS',
  'BASTARD',
  'BITCH',
  'BOLLOCKS',
  'BONER',
  'BOOB',
  'BOOBS',
  'COCK',
  'COON',
  'CUM',
  'CUNT',
  'DICK',
  'DYKE',
  'FAG',
  'FAGGOT',
  'FCUK',
  'FCK',
  'FUK',
  'FUCK',
  'HITLER',
  'HOMO',
  'JIZZ',
  'KYS',
  'MILF',
  'NAZI',
  'NIGGA',
  'NIGGER',
  'PAEDO',
  'PEDO',
  'PENIS',
  'PISS',
  'PORN',
  'PRICK',
  'PUSSY',
  'RAPE',
  'RAPIST',
  'RETARD',
  'SHIT',
  'SLUT',
  'SPASTIC',
  'TITS',
  'TWAT',
  'VAGINA',
  'WANK',
  'WANKER',
  'WHORE',
]);

export type PlayerNameResult =
  { ok: true; name: string } | { ok: false; error: string };

const foldLeet = (value: string) =>
  value
    .replaceAll('@', 'A')
    .replaceAll('$', 'S')
    .replaceAll('0', 'O')
    .replaceAll('1', 'I')
    .replaceAll('3', 'E')
    .replaceAll('4', 'A')
    .replaceAll('5', 'S')
    .replaceAll('7', 'T');

const compactName = (value: string) =>
  foldLeet(value.replace(/[^A-Z0-9]/g, ''));

const isBlocked = (value: string) => {
  const compact = compactName(value);

  if (blockedNames.has(compact)) {
    return true;
  }

  const words = value.split(' ').map(compactName).filter(Boolean);

  if (words.some(word => blockedNames.has(word))) {
    return true;
  }

  return [...blockedNames].some(
    word => word.length >= 4 && compact.includes(word),
  );
};

export const parsePlayerName = (raw: string): PlayerNameResult => {
  const name = raw.trim().replace(/\s+/g, ' ').toUpperCase();

  if (name.length === 0) {
    return { ok: false, error: 'Enter a name' };
  }

  if (name.length < nameMinLength || name.length > nameMaxLength) {
    return {
      ok: false,
      error: `Name must be ${nameMinLength} to ${nameMaxLength} characters`,
    };
  }

  if (!/^[A-Z0-9]+(?: [A-Z0-9]+)*$/.test(name)) {
    return { ok: false, error: 'Use letters and numbers only' };
  }

  if (isBlocked(name)) {
    return { ok: false, error: 'Choose a different name' };
  }

  return { ok: true, name };
};
