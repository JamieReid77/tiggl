import {
  boardSize,
  boardStartedAt,
  type HighScore,
  type PlayCounts,
  type ScoreBoard,
} from './highScores';

const at = (now: Date, daysAgo: number, hour = 12) => {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(hour, 14, 3, 0);
  return date.toISOString();
};

const byRank = (left: HighScore, right: HighScore) => {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (left.elapsedMs !== right.elapsedMs) {
    return left.elapsedMs - right.elapsedMs;
  }

  return left.createdAt.localeCompare(right.createdAt);
};

export const exampleHighScores = (now = new Date()): HighScore[] => {
  const rows: HighScore[] = [
    {
      id: 'example-ada',
      playerName: 'ADA',
      score: 24850,
      level: 10,
      elapsedMs: 721_000,
      cleared: true,
      createdAt: at(now, 51, 18),
    },
    {
      id: 'example-max',
      playerName: 'MAX',
      score: 22100,
      level: 10,
      elapsedMs: 820_000,
      cleared: true,
      createdAt: at(now, 90, 21),
    },
    {
      id: 'example-nova',
      playerName: 'NOVA',
      score: 19800,
      level: 9,
      elapsedMs: 680_000,
      cleared: false,
      createdAt: at(now, 102, 14),
    },
    {
      id: 'example-loop',
      playerName: 'LOOP',
      score: 16500,
      level: 8,
      elapsedMs: 545_000,
      cleared: false,
      createdAt: at(now, 136, 11),
    },
    {
      id: 'example-fox',
      playerName: 'FOX',
      score: 15100,
      level: 8,
      elapsedMs: 530_000,
      cleared: false,
      createdAt: at(now, 156, 19),
    },
    {
      id: 'example-quinn',
      playerName: 'QUINN',
      score: 14200,
      level: 8,
      elapsedMs: 530_000,
      cleared: false,
      createdAt: at(now, 183, 8),
    },
    {
      id: 'example-vex',
      playerName: 'VEX',
      score: 12000,
      level: 7,
      elapsedMs: 450_000,
      cleared: false,
      createdAt: at(now, 199, 16),
    },
    {
      id: 'example-pixel',
      playerName: 'PIXEL',
      score: 9100,
      level: 7,
      elapsedMs: 252_000,
      cleared: false,
      createdAt: at(now, 0, 10),
    },
    {
      id: 'example-nico',
      playerName: 'NICO',
      score: 8800,
      level: 6,
      elapsedMs: 340_000,
      cleared: false,
      createdAt: at(now, 40, 13),
    },
    {
      id: 'example-rio',
      playerName: 'RIO',
      score: 7800,
      level: 6,
      elapsedMs: 220_000,
      cleared: false,
      createdAt: at(now, 0, 12),
    },
    {
      id: 'example-ora',
      playerName: 'ORA',
      score: 7200,
      level: 6,
      elapsedMs: 310_000,
      cleared: false,
      createdAt: at(now, 45, 9),
    },
    {
      id: 'example-kai',
      playerName: 'KAI',
      score: 6400,
      level: 5,
      elapsedMs: 178_000,
      cleared: false,
      createdAt: at(now, 0, 15),
    },
    {
      id: 'example-tam',
      playerName: 'TAM',
      score: 5500,
      level: 5,
      elapsedMs: 265_000,
      cleared: false,
      createdAt: at(now, 50, 17),
    },
    {
      id: 'example-dot',
      playerName: 'DOT',
      score: 5100,
      level: 5,
      elapsedMs: 200_000,
      cleared: false,
      createdAt: at(now, 0, 16),
    },
    {
      id: 'example-hex',
      playerName: 'HEX',
      score: 4200,
      level: 4,
      elapsedMs: 130_000,
      cleared: false,
      createdAt: at(now, 0, 17),
    },
    {
      id: 'example-wyn',
      playerName: 'WYN',
      score: 4000,
      level: 4,
      elapsedMs: 198_000,
      cleared: false,
      createdAt: at(now, 72, 20),
    },
    {
      id: 'example-remy',
      playerName: 'REMY',
      score: 3100,
      level: 3,
      elapsedMs: 105_000,
      cleared: false,
      createdAt: at(now, 0, 18),
    },
    {
      id: 'example-ash',
      playerName: 'ASH',
      score: 2500,
      level: 3,
      elapsedMs: 142_000,
      cleared: false,
      createdAt: at(now, 115, 12),
    },
    {
      id: 'example-blue',
      playerName: 'BLUE',
      score: 1800,
      level: 2,
      elapsedMs: 62_000,
      cleared: false,
      createdAt: at(now, 0, 19),
    },
    {
      id: 'example-zed',
      playerName: 'ZED',
      score: 900,
      level: 2,
      elapsedMs: 48_000,
      cleared: false,
      createdAt: at(now, 0, 19),
    },
  ];

  return rows.slice().sort(byRank);
};

export const examplePlayCounts = (): PlayCounts => ({
  monthly: 12,
  allTime: 47,
});

export const exampleScoreBoards = (
  now = new Date(),
): Record<ScoreBoard, HighScore[]> => {
  const ranked = exampleHighScores(now);
  const allTime = ranked.slice(0, boardSize);
  const monthStart = boardStartedAt('monthly', now);

  return {
    monthly: monthStart
      ? ranked.filter(row => row.createdAt >= monthStart).slice(0, boardSize)
      : allTime,
    allTime,
  };
};
