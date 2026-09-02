import { exampleScoreBoards } from './highScores.examples';

describe('exampleScoreBoards', () => {
  const boards = exampleScoreBoards(new Date('2026-09-01T20:00:00.000Z'));

  it('fills the all-time board', () => {
    expect(boards.allTime).toHaveLength(10);
    expect(boards.allTime[0].playerName).toBe('ADA');
    expect(boards.allTime[9].playerName).toBe('RIO');
  });

  it('keeps only this month on the monthly board', () => {
    expect(boards.monthly.map(row => row.playerName)).toEqual([
      'PIXEL',
      'RIO',
      'KAI',
      'DOT',
      'HEX',
      'REMY',
      'BLUE',
      'ZED',
    ]);
  });
});
