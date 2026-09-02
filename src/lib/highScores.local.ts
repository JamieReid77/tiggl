import {
  boardStartedAt,
  type HighScore,
  type PlayCounts,
  rankHighScores,
  type ScoreBoard,
  scoreBoards,
} from './highScores';
import { examplePlayCounts, exampleScoreBoards } from './highScores.examples';

type LocalScores = {
  boards: Record<ScoreBoard, HighScore[]>;
  plays: PlayCounts;
};

const globalForLocal = globalThis as typeof globalThis & {
  tigglLocalScores?: LocalScores;
};

export const resetLocalScores = () => {
  globalForLocal.tigglLocalScores = {
    boards: exampleScoreBoards(),
    plays: examplePlayCounts(),
  };
};

export const getLocalScores = (): LocalScores => {
  if (!globalForLocal.tigglLocalScores) {
    resetLocalScores();
  }

  return globalForLocal.tigglLocalScores as LocalScores;
};

export const recordLocalPlay = () => {
  const store = getLocalScores();
  store.plays.monthly += 1;
  store.plays.allTime += 1;
};

export const submitLocalScore = (row: HighScore) => {
  const store = getLocalScores();

  for (const board of scoreBoards) {
    const since = boardStartedAt(board);

    if (since && row.createdAt < since) {
      continue;
    }

    store.boards[board] = rankHighScores([...store.boards[board], row]);
  }

  return row;
};
