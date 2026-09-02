import {
  boardForNewScore,
  boardSize,
  boardStartedAt,
  type HighScore,
  monthStartedAt,
  offerForNewScore,
  qualifiesForBoard,
  rankForNewScore,
  scoreMovedCopy,
  scoreOfferCopy,
} from './highScores';

const row = (score: number, id = String(score)): HighScore => ({
  id,
  playerName: 'ADA',
  score,
  level: 3,
  elapsedMs: 12_000,
  cleared: false,
  createdAt: '2026-09-01T00:00:00.000Z',
});

const fullBoard = (lowest: number) =>
  Array.from({ length: boardSize }, (_, index) =>
    row(lowest + (boardSize - 1 - index), String(index)),
  );

describe('monthStartedAt', () => {
  it('starts the month at UTC midnight on the first', () => {
    expect(monthStartedAt(new Date('2026-09-15T15:30:00.000Z'))).toBe(
      '2026-09-01T00:00:00.000Z',
    );
  });

  it('stays in August until UTC September begins', () => {
    expect(monthStartedAt(new Date('2026-08-31T23:00:00.000Z'))).toBe(
      '2026-08-01T00:00:00.000Z',
    );
  });

  it('starts a new month on the first', () => {
    expect(monthStartedAt(new Date('2026-10-01T00:00:00.000Z'))).toBe(
      '2026-10-01T00:00:00.000Z',
    );
  });
});

describe('boardStartedAt', () => {
  it('has no start date for all time', () => {
    expect(boardStartedAt('allTime')).toBeNull();
  });

  it('uses UTC midnight on the first for monthly', () => {
    expect(
      boardStartedAt('monthly', new Date('2026-09-15T12:00:00.000Z')),
    ).toBe('2026-09-01T00:00:00.000Z');
  });
});

describe('qualifiesForBoard', () => {
  it('lets any score onto a board that is not full', () => {
    expect(qualifiesForBoard(0, [row(900)])).toBe(true);
  });

  it('lets a tied last place onto a full board', () => {
    const rows = Array.from({ length: boardSize }, (_, index) =>
      row(1000 - index, String(index)),
    );

    expect(qualifiesForBoard(1000 - (boardSize - 1), rows)).toBe(true);
    expect(qualifiesForBoard(1, rows)).toBe(false);
  });
});

describe('boardForNewScore', () => {
  it('prefers monthly when the score makes any board', () => {
    expect(
      boardForNewScore({
        score: 1,
        monthly: [],
        allTime: [],
      }),
    ).toBe('monthly');
  });

  it('falls through to all time', () => {
    expect(
      boardForNewScore({
        score: 50,
        monthly: fullBoard(80),
        allTime: [],
      }),
    ).toBe('allTime');
  });

  it('returns null when the score misses every board', () => {
    expect(
      boardForNewScore({
        score: 1,
        monthly: fullBoard(80),
        allTime: fullBoard(50),
      }),
    ).toBeNull();
  });

  it('drops a promised high score if another player takes 10th before the name is saved', () => {
    const playerScore = 100;
    const atGameOver = {
      monthly: fullBoard(100),
      allTime: fullBoard(100),
    };

    expect(boardForNewScore({ score: playerScore, ...atGameOver })).toBe(
      'monthly',
    );

    const afterSomeoneElseSaves = {
      monthly: fullBoard(101),
      allTime: fullBoard(101),
    };

    expect(
      boardForNewScore({ score: playerScore, ...afterSomeoneElseSaves }),
    ).toBeNull();
  });
});

describe('offerForNewScore', () => {
  it('prefers all time when the score makes both boards', () => {
    expect(
      offerForNewScore({
        score: 200,
        monthly: fullBoard(80),
        allTime: fullBoard(80),
      }),
    ).toEqual({ board: 'allTime', rank: 1 });
  });

  it('falls through to this month when all time is out of reach', () => {
    expect(
      offerForNewScore({
        score: 50,
        monthly: [],
        allTime: fullBoard(80),
      }),
    ).toEqual({ board: 'monthly', rank: 1 });
  });

  it('ranks below the scores already on the board', () => {
    expect(rankForNewScore(84, fullBoard(80))).toBe(6);
  });
});

describe('scoreOfferCopy', () => {
  it('names the monthly top ten', () => {
    expect(scoreOfferCopy({ board: 'monthly', rank: 8 })).toBe(
      'You made the top ten for this month',
    );
  });

  it('names a monthly top five', () => {
    expect(scoreOfferCopy({ board: 'monthly', rank: 4 })).toBe(
      'You made the top five for this month',
    );
  });

  it('names the all time top ten', () => {
    expect(scoreOfferCopy({ board: 'allTime', rank: 1 })).toBe(
      'You made the ALL TIME top ten',
    );
  });
});

describe('scoreMovedCopy', () => {
  it('keeps the near-miss informal', () => {
    expect(scoreMovedCopy).toBe(
      'Oh so close... another player beat you into the top ten after your run finished.',
    );
  });
});
