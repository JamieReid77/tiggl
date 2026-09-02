'use server';

import { getSql, isDatabaseConfigured } from '@/lib/db';
import { maxLevel, maxScore } from '@/lib/game';
import {
  boardSize,
  boardStartedAt,
  emptyPlayCounts,
  type HighScore,
  type PlayCounts,
  type ScoreBoard,
  scoreBoards,
} from '@/lib/highScores';
import { useLiveScores } from '@/lib/highScores.live';
import {
  getLocalScores,
  recordLocalPlay,
  submitLocalScore,
} from '@/lib/highScores.local';
import {
  anonymousName,
  displayPlayerName,
  parsePlayerName,
} from '@/lib/playerName';

type HighScoreRow = {
  id: string;
  player_name: string;
  score: number;
  level: number;
  elapsed_ms: number;
  cleared: boolean;
  created_at: Date | string;
};

export type HighScoreListResult =
  { ok: true; rows: HighScore[] } | { ok: false; error: string };

export type HighScoreBoardsResult =
  | { ok: true; boards: Record<ScoreBoard, HighScore[]>; plays: PlayCounts }
  | { ok: false; error: string };

export type HighScoreSubmitResult =
  { ok: true; row: HighScore } | { ok: false; error: string };

const unavailable = 'High scores are unavailable right now.';

const localBoards = (): HighScoreBoardsResult => {
  const store = getLocalScores();
  return { ok: true, boards: store.boards, plays: store.plays };
};

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : value;

const toHighScore = (row: HighScoreRow): HighScore => ({
  id: row.id,
  playerName: displayPlayerName(row.player_name),
  score: row.score,
  level: row.level,
  elapsedMs: row.elapsed_ms,
  cleared: row.cleared,
  createdAt: toIso(row.created_at),
});

const fetchBoard = async (
  sql: NonNullable<ReturnType<typeof getSql>>,
  board: ScoreBoard,
): Promise<HighScoreListResult> => {
  const since = boardStartedAt(board);

  try {
    const rows = since
      ? await sql<HighScoreRow[]>`
          SELECT id, player_name, score, level, elapsed_ms, cleared, created_at
          FROM tiggl.tiggl_high_scores
          WHERE created_at >= ${since}
          ORDER BY score DESC, elapsed_ms ASC, created_at ASC
          LIMIT ${boardSize}
        `
      : await sql<HighScoreRow[]>`
          SELECT id, player_name, score, level, elapsed_ms, cleared, created_at
          FROM tiggl.tiggl_high_scores
          ORDER BY score DESC, elapsed_ms ASC, created_at ASC
          LIMIT ${boardSize}
        `;

    return { ok: true, rows: rows.map(toHighScore) };
  } catch {
    return { ok: false, error: unavailable };
  }
};

const toCount = (value: unknown) => {
  const count = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(count) ? count : 0;
};

const fetchPlayCounts = async (
  sql: NonNullable<ReturnType<typeof getSql>>,
): Promise<PlayCounts> => {
  const monthStart = boardStartedAt('monthly');

  try {
    const rows = await sql<{ monthly: unknown; all_time: unknown }[]>`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= ${monthStart}) AS monthly,
        COUNT(*) AS all_time
      FROM tiggl.tiggl_plays
    `;

    const row = rows[0];

    if (!row) {
      return emptyPlayCounts();
    }

    return {
      monthly: toCount(row.monthly),
      allTime: toCount(row.all_time),
    };
  } catch {
    return emptyPlayCounts();
  }
};

export const recordPlay = async () => {
  if (!useLiveScores()) {
    recordLocalPlay();
    return;
  }

  if (!isDatabaseConfigured()) {
    return;
  }

  const sql = getSql();

  if (!sql) {
    return;
  }

  try {
    await sql`INSERT INTO tiggl.tiggl_plays DEFAULT VALUES`;
  } catch {
    return;
  }
};

export const listHighScores = async (
  board: ScoreBoard = 'allTime',
): Promise<HighScoreListResult> => {
  if (!useLiveScores()) {
    return { ok: true, rows: getLocalScores().boards[board] };
  }

  if (!isDatabaseConfigured()) {
    return { ok: false, error: unavailable };
  }

  const sql = getSql();

  if (!sql) {
    return { ok: false, error: unavailable };
  }

  return fetchBoard(sql, board);
};

export const listHighScoreBoards = async (): Promise<HighScoreBoardsResult> => {
  if (!useLiveScores()) {
    return localBoards();
  }

  if (!isDatabaseConfigured()) {
    return { ok: false, error: unavailable };
  }

  const sql = getSql();

  if (!sql) {
    return { ok: false, error: unavailable };
  }

  const [results, plays] = await Promise.all([
    Promise.all(scoreBoards.map(board => fetchBoard(sql, board))),
    fetchPlayCounts(sql),
  ]);

  const boards = {} as Record<ScoreBoard, HighScore[]>;

  for (const [index, result] of results.entries()) {
    if (!result.ok) {
      return result;
    }

    boards[scoreBoards[index]] = result.rows;
  }

  return { ok: true, boards, plays };
};

const insertError = (message: string): HighScoreSubmitResult => {
  if (message.includes('Choose a different name')) {
    return { ok: false, error: 'Choose a different name' };
  }

  if (message.includes('Name must be')) {
    return { ok: false, error: 'Name must be 3 to 15 characters' };
  }

  if (message.includes('letters and numbers')) {
    return { ok: false, error: 'Use letters and numbers only' };
  }

  return { ok: false, error: unavailable };
};

export const submitHighScore = async ({
  name,
  score,
  level,
  elapsedMs,
  cleared,
}: {
  name: string;
  score: number;
  level: number;
  elapsedMs: number;
  cleared: boolean;
}): Promise<HighScoreSubmitResult> => {
  const parsed =
    name.trim() === ''
      ? { ok: true as const, name: anonymousName }
      : parsePlayerName(name);

  if (!parsed.ok) {
    return parsed;
  }

  if (
    !Number.isInteger(score) ||
    score < 0 ||
    score > maxScore ||
    !Number.isInteger(level) ||
    level < 1 ||
    level > maxLevel ||
    !Number.isInteger(elapsedMs) ||
    elapsedMs < 0 ||
    elapsedMs > 86_400_000
  ) {
    return { ok: false, error: 'That score could not be saved.' };
  }

  if (!useLiveScores()) {
    const row = submitLocalScore({
      id: crypto.randomUUID(),
      playerName: parsed.name,
      score,
      level,
      elapsedMs,
      cleared,
      createdAt: new Date().toISOString(),
    });

    return { ok: true, row };
  }

  if (!isDatabaseConfigured()) {
    return { ok: false, error: unavailable };
  }

  const sql = getSql();

  if (!sql) {
    return { ok: false, error: unavailable };
  }

  try {
    const rows = await sql<HighScoreRow[]>`
      INSERT INTO tiggl.tiggl_high_scores (
        player_name,
        score,
        level,
        elapsed_ms,
        cleared
      )
      VALUES (
        ${parsed.name},
        ${score},
        ${level},
        ${elapsedMs},
        ${cleared}
      )
      RETURNING id, player_name, score, level, elapsed_ms, cleared, created_at
    `;

    const row = rows[0];

    if (!row) {
      return { ok: false, error: unavailable };
    }

    return { ok: true, row: toHighScore(row) };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return insertError(message);
  }
};
