import {
  listHighScoreBoards,
  listHighScores,
  recordPlay,
  submitHighScore,
} from './highScores';

const jamie: {
  id: string;
  player_name: string;
  score: number;
  level: number;
  elapsed_ms: number;
  cleared: boolean;
  created_at: string;
} = {
  id: '0cbcb96d-f519-448d-98c9-2547a41a3b1f',
  player_name: 'JAMIE',
  score: 1250,
  level: 4,
  elapsed_ms: 65_000,
  cleared: false,
  created_at: '2026-09-01T00:00:05.791Z',
};

const sql = jest.fn();
const isDatabaseConfigured = jest.fn(() => true);
const useLiveScores = jest.fn(() => true);

jest.mock('@/lib/db', () => ({
  getSql: () => sql,
  isDatabaseConfigured: () => isDatabaseConfigured(),
}));

jest.mock('@/lib/highScores.live', () => ({
  useLiveScores: () => useLiveScores(),
}));

describe('high score actions', () => {
  beforeEach(() => {
    sql.mockReset();
    isDatabaseConfigured.mockReturnValue(true);
    useLiveScores.mockReturnValue(true);
  });

  it('lists the all-time board', async () => {
    sql.mockResolvedValueOnce([jamie]);

    const result = await listHighScores('allTime');

    expect(result).toEqual({
      ok: true,
      rows: [
        {
          id: jamie.id,
          playerName: 'JAMIE',
          score: 1250,
          level: 4,
          elapsedMs: 65_000,
          cleared: false,
          createdAt: jamie.created_at,
        },
      ],
    });
  });

  it('returns unavailable when the database is not configured', async () => {
    isDatabaseConfigured.mockReturnValue(false);

    await expect(listHighScoreBoards()).resolves.toEqual({
      ok: false,
      error: 'High scores are unavailable right now.',
    });
    expect(sql).not.toHaveBeenCalled();
  });

  it('lists boards with play counts', async () => {
    sql
      .mockResolvedValueOnce([jamie])
      .mockResolvedValueOnce([jamie])
      .mockResolvedValueOnce([{ monthly: '12', all_time: '48' }]);

    const listed = {
      id: jamie.id,
      playerName: 'JAMIE',
      score: 1250,
      level: 4,
      elapsedMs: 65_000,
      cleared: false,
      createdAt: jamie.created_at,
    };

    await expect(listHighScoreBoards()).resolves.toEqual({
      ok: true,
      boards: {
        monthly: [listed],
        allTime: [listed],
      },
      plays: { monthly: 12, allTime: 48 },
    });
  });

  it('records a finished round', async () => {
    sql.mockResolvedValueOnce([]);

    await recordPlay();

    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('inserts a score as tiggl_runtime SQL', async () => {
    sql.mockResolvedValueOnce([jamie]);

    const result = await submitHighScore({
      name: 'jamie',
      score: 1250,
      level: 4,
      elapsedMs: 65_000,
      cleared: false,
    });

    expect(result.ok).toBe(true);
    expect(sql).toHaveBeenCalled();
  });

  it('maps the normalize trigger message', async () => {
    sql.mockRejectedValueOnce(new Error('Choose a different name'));

    await expect(
      submitHighScore({
        name: 'ADA',
        score: 10,
        level: 1,
        elapsedMs: 1000,
        cleared: false,
      }),
    ).resolves.toEqual({
      ok: false,
      error: 'Choose a different name',
    });
  });

  it('keeps local scores off the live database', async () => {
    useLiveScores.mockReturnValue(false);

    await recordPlay();
    const listed = await listHighScoreBoards();
    const saved = await submitHighScore({
      name: 'ADA',
      score: 10,
      level: 1,
      elapsedMs: 1000,
      cleared: false,
    });

    expect(sql).not.toHaveBeenCalled();
    expect(listed.ok).toBe(true);
    expect(saved.ok).toBe(true);
  });
});
