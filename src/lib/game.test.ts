import {
  badsOnLevel,
  boardHeight,
  boardWidth,
  formatHudScore,
  formatPlayTime,
  goodsOnLevel,
  leftoverSeconds,
  maxLevel,
  playCount,
  pointsPerCatch,
  scoreDigits,
  timeBonusForClear,
} from './game';

describe('scoring', () => {
  it('keeps goods and bads totalling the play count', () => {
    for (let level = 1; level <= maxLevel; level += 1) {
      expect(goodsOnLevel(level) + badsOnLevel(level)).toBe(playCount);
    }
  });

  it('awards more points per catch on later levels', () => {
    expect(pointsPerCatch(1)).toBe(10);
    expect(pointsPerCatch(10)).toBe(100);
  });

  it('pays a time bonus from leftover par seconds', () => {
    expect(leftoverSeconds(1, 0)).toBe(180);
    expect(timeBonusForClear(1, 0)).toBe(900);
    expect(timeBonusForClear(1, 180_000)).toBe(0);
  });

  it('pads the HUD score to the maximum width', () => {
    expect(formatHudScore(0)).toHaveLength(scoreDigits);
    expect(formatPlayTime(65_000)).toBe('1:05');
  });

  it('uses a fixed playfield size', () => {
    expect(boardWidth).toBe(1280);
    expect(boardHeight).toBe(800);
  });
});
