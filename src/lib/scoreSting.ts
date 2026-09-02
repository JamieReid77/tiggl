import type { ScoreBoard } from '@/lib/highScores';

export const stingNotes = (board: ScoreBoard, rank: number) => {
  if (rank === 1 && board === 'allTime') {
    return [523, 659, 784, 1047];
  }

  if (rank === 1) {
    return [523, 659, 784];
  }

  if (rank <= 5) {
    return [659, 784];
  }

  return [784];
};

const AudioContextCtor = () =>
  globalThis.AudioContext ??
  (
    globalThis as typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    }
  ).webkitAudioContext;

export const playScoreSting = (board: ScoreBoard, rank: number) => {
  const Ctor = AudioContextCtor();

  if (!Ctor) {
    return;
  }

  const ctx = new Ctor();
  const notes = stingNotes(board, rank);
  const step = 0.09;
  const peak = rank === 1 ? 0.09 : 0.07;

  notes.forEach((freq, index) => {
    const start = ctx.currentTime + index * step;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.1);
  });

  window.setTimeout(
    () => {
      void ctx.close();
    },
    notes.length * step * 1000 + 160,
  );
};
