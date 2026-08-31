export const maxLevel = 10;
export const playCount = 99;
export const badsPerLevel = 9;
export const catchPointsBase = 10;
export const timeBonusBase = 5;

export const goodsOnLevel = (level: number) =>
  Math.max(0, playCount - badsPerLevel * level);

export const badsOnLevel = (level: number) => badsPerLevel * level;

export const levelParSeconds = (level: number) => 180 - (level - 1) * 15;

export const timeBonusPerSecond = (level: number) => timeBonusBase * level;

export const maxScore = Array.from({ length: maxLevel }, (_, index) => {
  const level = index + 1;
  return (
    goodsOnLevel(level) * catchPointsBase * level +
    levelParSeconds(level) * timeBonusPerSecond(level)
  );
}).reduce((total, value) => total + value, 0);

export const scoreDigits = String(maxScore).length;

export const formatPlayTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const playTimeLabel = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const minLabel = minutes === 1 ? '1 minute' : `${minutes} minutes`;
  const secLabel = seconds === 1 ? '1 second' : `${seconds} seconds`;

  return `${minLabel} ${secLabel}`;
};

export const pointsPerCatch = (level: number) => catchPointsBase * level;

export const leftoverSeconds = (level: number, elapsedMs: number) =>
  Math.max(
    0,
    levelParSeconds(level) - Math.floor(Math.max(0, elapsedMs) / 1000),
  );

export const timeBonusForClear = (level: number, elapsedMs: number) =>
  leftoverSeconds(level, elapsedMs) * timeBonusPerSecond(level);

export const formatScore = (value: number) => value.toLocaleString('en-GB');

export const formatHudScore = (value: number) =>
  String(Math.max(0, Math.floor(value))).padStart(scoreDigits, '0');
