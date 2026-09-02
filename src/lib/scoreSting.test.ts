import { stingNotes } from './scoreSting';

describe('stingNotes', () => {
  it('gives all-time first the longest run', () => {
    expect(stingNotes('allTime', 1)).toHaveLength(4);
    expect(stingNotes('monthly', 1)).toHaveLength(3);
    expect(stingNotes('allTime', 4).length).toBeGreaterThan(
      stingNotes('monthly', 8).length,
    );
  });
});
