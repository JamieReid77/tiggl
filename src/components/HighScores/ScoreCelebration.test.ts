import { planFor, stampFor } from './ScoreCelebration';

describe('planFor', () => {
  it('makes all-time first the strongest wash', () => {
    const top = planFor('allTime', 1);
    const monthFirst = planFor('monthly', 1);
    const allTimeMid = planFor('allTime', 4);
    const monthMid = planFor('monthly', 4);

    expect(top.tone).toBe('gold');
    expect(top.strength).toBeGreaterThan(monthFirst.strength);
    expect(monthFirst.strength).toBeGreaterThan(allTimeMid.strength);
    expect(allTimeMid.strength).toBeGreaterThan(monthMid.strength);
  });

  it('keeps 6–10 quieter than a mid-board finish', () => {
    expect(planFor('monthly', 8).tone).toBe('brand');
    expect(planFor('allTime', 8).tone).toBe('gold');
    expect(planFor('monthly', 8).strength).toBeLessThan(
      planFor('monthly', 4).strength,
    );
  });

  it('stamps first, five, and ten', () => {
    expect(stampFor('monthly', 1)).toBe('1ST');
    expect(stampFor('allTime', 3)).toBe('TOP FIVE');
    expect(stampFor('monthly', 8)).toBe('TOP TEN');
  });
});
