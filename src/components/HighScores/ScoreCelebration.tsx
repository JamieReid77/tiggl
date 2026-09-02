'use client';

import { type CSSProperties, useEffect, useState } from 'react';

import type { ScoreBoard } from '@/lib/highScores';
import { playScoreSting } from '@/lib/scoreSting';

export type ScoreCelebrationProps = {
  board: ScoreBoard;
  rank: number;
  active: boolean;
};

type Tone = 'gold' | 'mixed' | 'brand';

type Plan = {
  tone: Tone;
  strength: number;
};

export const planFor = (board: ScoreBoard, rank: number): Plan => {
  const allTime = board === 'allTime';

  if (rank === 1 && allTime) {
    return { tone: 'gold', strength: 1 };
  }

  if (rank === 1) {
    return { tone: 'gold', strength: 0.7 };
  }

  if (rank <= 5 && allTime) {
    return { tone: 'mixed', strength: 0.5 };
  }

  if (rank <= 5) {
    return { tone: 'brand', strength: 0.38 };
  }

  if (allTime) {
    return { tone: 'gold', strength: 0.24 };
  }

  return { tone: 'brand', strength: 0.16 };
};

export const stampFor = (_board: ScoreBoard, rank: number) => {
  if (rank === 1) {
    return '1ST';
  }

  if (rank <= 5) {
    return 'TOP FIVE';
  }

  return 'TOP TEN';
};

const washStyle = (strength: number): CSSProperties =>
  ({
    '--tiggl-wash': String(strength),
  }) as CSSProperties;

const prefersQuiet = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ScoreCelebration = ({
  board,
  rank,
  active,
}: ScoreCelebrationProps) => {
  const [stampOn, setStampOn] = useState(true);

  useEffect(() => {
    if (!active || prefersQuiet()) {
      return;
    }

    playScoreSting(board, rank);
  }, [active, board, rank]);

  useEffect(() => {
    setStampOn(true);
    const hide = window.setTimeout(() => setStampOn(false), 8000);
    return () => window.clearTimeout(hide);
  }, [board, rank]);

  if (!active) {
    return null;
  }

  const plan = planFor(board, rank);

  return (
    <div className="pointer-events-none absolute inset-0 z-[25]" aria-hidden>
      <div className="tiggl-score-flash absolute inset-0" />
      <div
        className="tiggl-score-wash absolute inset-0"
        data-tone={plan.tone}
        style={washStyle(plan.strength)}
      />
      {stampOn ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="tiggl-score-stamp-plate flex flex-col items-center px-12 py-7">
            <span className="font-display text-[7.5rem] leading-none font-semibold tracking-tight text-[#f0c75e] [text-shadow:0_0_40px_rgb(240_199_94_/_0.45)]">
              {stampFor(board, rank)}
            </span>
            {board === 'allTime' ? (
              <span className="mt-3 bg-[#f0c75e] px-2.5 py-1 text-[11px] font-semibold tracking-[0.28em] text-zinc-950 uppercase">
                All time
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
