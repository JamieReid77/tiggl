'use client';

import { useId } from 'react';

import { boardHeight, formatPlayTime, formatScore } from '@/lib/game';
import {
  boardSize,
  emptyPlayCounts,
  type HighScore,
  type PlayCounts,
  type ScoreBoard,
  scoreBoardNames,
} from '@/lib/highScores';

const playCountPeriod: Record<ScoreBoard, string> = {
  monthly: 'this month',
  allTime: 'all time',
};

const formatPlayCount = (value: number) =>
  String(Math.max(0, Math.floor(value))).padStart(8, '0');

const periodLink =
  'cursor-pointer text-[11px] text-zinc-400 underline decoration-zinc-500 underline-offset-4 transition-colors hover:text-white hover:decoration-brand focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 motion-reduce:transition-none';

export type HighScoreRun = {
  score: number;
  level: number;
  elapsedMs: number;
  won: boolean;
};

export type HighScoresProps = {
  rows: HighScore[];
  board?: ScoreBoard;
  highlightId?: string | null;
  listError?: string | null;
  loading?: boolean;
  onBoardChange?: (board: ScoreBoard) => void;
  plays?: PlayCounts;
  fluid?: boolean;
};

const rankTone = (rank: number, filled: boolean) => {
  if (!filled) {
    return 'text-zinc-500';
  }

  if (rank === 1) {
    return 'font-semibold text-[#f0c75e] [text-shadow:0_0_12px_rgb(240_199_94_/_0.4)]';
  }

  if (rank <= 5) {
    return 'text-brand';
  }

  return 'text-zinc-300';
};

const rankMetaTone = (rank: number, highlight: boolean) => {
  if (highlight) {
    return 'text-zinc-950/55';
  }

  if (rank === 1) {
    return 'text-[#f0c75e]/70';
  }

  if (rank <= 5) {
    return 'text-brand/70';
  }

  return 'text-zinc-400';
};

const RankRow = ({
  rank,
  row,
  highlight,
  animate,
}: {
  rank: number;
  row: HighScore | undefined;
  highlight: boolean;
  animate: boolean;
}) => (
  <li
    className={`${rank === 1 ? 'border-t' : ''} border-b border-zinc-800/70 px-4 py-2.5 ${
      animate ? 'tiggl-score-row' : ''
    } ${highlight ? 'tiggl-score-punch' : rankTone(rank, Boolean(row))}`}
    style={animate ? { animationDelay: `${(rank - 1) * 18}ms` } : undefined}
  >
    <div className="grid w-full grid-cols-[1.65rem_minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-1 font-mono text-[11px] leading-tight tabular-nums">
      <span>{String(rank).padStart(2, '0')}</span>
      <span className="truncate text-left">{row?.playerName ?? ''}</span>
      <span className="text-right tracking-normal">
        {row ? formatScore(row.score) : ''}
      </span>
      <span
        className={`col-start-2 col-span-2 text-left text-[10px] tracking-normal ${
          row ? rankMetaTone(rank, highlight) : 'invisible'
        }`}
        aria-hidden={!row}
      >
        Lv {row?.level ?? 0}
        <span className="mx-1.5 opacity-40" aria-hidden>
          ·
        </span>
        {formatPlayTime(row?.elapsedMs ?? 0)}
      </span>
    </div>
  </li>
);

export const HighScores = ({
  rows,
  board = 'monthly',
  highlightId,
  listError,
  loading = false,
  onBoardChange,
  plays = emptyPlayCounts(),
  fluid = false,
}: HighScoresProps) => {
  const titleId = useId();
  const periodId = useId();
  const slots = Array.from({ length: boardSize }, (_, index) => rows[index]);
  const otherBoard: ScoreBoard = board === 'monthly' ? 'allTime' : 'monthly';
  const animateRows = !loading;

  return (
    <aside
      className={`flex flex-col border border-zinc-800 bg-zinc-950 text-zinc-50 shadow-[0_10px_28px_rgb(0_0_0_/_0.4)] ${
        fluid ? 'h-full min-h-0 w-full min-w-0' : 'w-56 shrink-0'
      }`}
      style={fluid ? undefined : { height: boardHeight }}
      aria-labelledby={titleId}
      aria-busy={loading}
    >
      <header className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="text-center">
          <h2
            id={titleId}
            className="font-display text-[1.65rem] leading-none font-semibold tracking-tight text-white"
          >
            High scores
          </h2>
          <span
            className="mx-auto mt-2.5 block h-px w-8 bg-brand"
            aria-hidden
          />
          <p
            id={periodId}
            className="mt-2.5 font-display text-sm leading-none text-zinc-400"
          >
            {scoreBoardNames[board]}
          </p>
        </div>
      </header>
      <div aria-labelledby={periodId} className="min-h-0 shrink-0">
        <ol
          key={`${board}-${loading ? 'loading' : 'ready'}`}
          className={`flex flex-col ${loading ? 'invisible' : ''}`}
        >
          {slots.map((row, index) => (
            <RankRow
              key={`${board}-${index}`}
              rank={index + 1}
              row={row}
              highlight={Boolean(row && row.id === highlightId)}
              animate={animateRows}
            />
          ))}
        </ol>
        {listError ? (
          <p
            className="px-4 py-3 text-center text-sm text-red-400"
            role="alert"
          >
            {listError}
          </p>
        ) : null}
      </div>
      <div
        className="flex flex-1 items-center justify-center px-5 py-10"
        aria-label={`${plays[board].toLocaleString('en-GB')} plays ${playCountPeriod[board]}`}
      >
        <div className="text-center">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">
            Plays
          </p>
          <p className="mt-1 font-mono text-sm tabular-nums text-white">
            {formatPlayCount(plays[board])}
          </p>
          <button
            type="button"
            onClick={() => onBoardChange?.(otherBoard)}
            className={`mt-3 ${periodLink}`}
          >
            Switch to {scoreBoardNames[otherBoard].toLowerCase()}
          </button>
        </div>
      </div>
    </aside>
  );
};
