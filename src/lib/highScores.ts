export const boardSize = 10;

export type ScoreBoard = 'monthly' | 'allTime';

export const scoreBoards = ['monthly', 'allTime'] as const;

export const scoreBoardLabels: Record<ScoreBoard, string> = {
  monthly: 'Month',
  allTime: 'All',
};

export const scoreBoardNames: Record<ScoreBoard, string> = {
  monthly: 'This month',
  allTime: 'All time',
};

export type PlayCounts = Record<ScoreBoard, number>;

export const emptyPlayCounts = (): PlayCounts => ({
  monthly: 0,
  allTime: 0,
});

export type HighScore = {
  id: string;
  playerName: string;
  score: number;
  level: number;
  elapsedMs: number;
  cleared: boolean;
  createdAt: string;
};

export const monthStartedAt = (now = new Date()) => {
  const start = new Date(now);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
};

export const boardStartedAt = (board: ScoreBoard, now = new Date()) => {
  if (board === 'monthly') {
    return monthStartedAt(now);
  }

  return null;
};

export const rankHighScores = (rows: HighScore[]) =>
  rows
    .slice()
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.elapsedMs !== right.elapsedMs) {
        return left.elapsedMs - right.elapsedMs;
      }

      return left.createdAt.localeCompare(right.createdAt);
    })
    .slice(0, boardSize);

export const qualifiesForBoard = (score: number, rows: HighScore[]) => {
  if (rows.length < boardSize) {
    return true;
  }

  return score >= rows[boardSize - 1].score;
};

export const boardForNewScore = ({
  score,
  monthly,
  allTime,
}: {
  score: number;
  monthly: HighScore[];
  allTime: HighScore[];
}): ScoreBoard | null => {
  if (qualifiesForBoard(score, monthly)) {
    return 'monthly';
  }

  if (qualifiesForBoard(score, allTime)) {
    return 'allTime';
  }

  return null;
};

export type ScoreOffer = {
  board: ScoreBoard;
  rank: number;
};

export const rankForNewScore = (score: number, rows: HighScore[]) =>
  rows.filter(row => row.score > score).length + 1;

export const offerForNewScore = ({
  score,
  monthly,
  allTime,
}: {
  score: number;
  monthly: HighScore[];
  allTime: HighScore[];
}): ScoreOffer | null => {
  if (qualifiesForBoard(score, allTime)) {
    return { board: 'allTime', rank: rankForNewScore(score, allTime) };
  }

  if (qualifiesForBoard(score, monthly)) {
    return { board: 'monthly', rank: rankForNewScore(score, monthly) };
  }

  return null;
};

export const scoreOfferCopy = (offer: ScoreOffer) => {
  const band = offer.rank > 1 && offer.rank <= 5 ? 'five' : 'ten';

  return offer.board === 'allTime'
    ? `You made the ALL TIME top ${band}`
    : `You made the top ${band} for this month`;
};

export const scoreMovedCopy =
  'Oh so close... another player beat you into the top ten after your run finished.';
