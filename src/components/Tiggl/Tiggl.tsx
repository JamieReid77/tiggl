'use client';

import {
  memo,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  listHighScoreBoards,
  recordPlay,
  submitHighScore,
} from '@/app/actions/highScores';
import {
  HighScoreEntry,
  type HighScoreRun,
  HighScores,
  ScoreCelebration,
} from '@/components/HighScores';
import { Wordmark } from '@/components/Wordmark';
import {
  badsOnLevel,
  badsPerLevel,
  boardHeight,
  boardWidth,
  formatHudScore,
  formatPlayTime,
  formatScore,
  leftoverSeconds,
  levelParSeconds,
  maxLevel,
  playCount,
  playTimeLabel,
  pointsPerCatch,
  scoreDigits,
  timeBonusForClear,
} from '@/lib/game';
import {
  emptyPlayCounts,
  type HighScore,
  offerForNewScore,
  type PlayCounts,
  qualifiesForBoard,
  type ScoreBoard,
  scoreMovedCopy,
  type ScoreOffer,
} from '@/lib/highScores';
import { anonymousName } from '@/lib/playerName';
import { siteDescription } from '@/lib/site';

const gap = 8;
const spring = 0.04;
const damping = 0.82;
const tableDamp = 0.86;
const collidePad = 0;
const scatterGap = 28;
const crashSlop = 3;
const restitution = 0.72;
const wallRest = 0.58;
const catchPadding = 1;
const caughtScale = 0.9;
const repelMin = 2.4;
const repelMax = 8.5;
const substeps = 4;
const tablePad = 48;
const tableChromeTop = 92;
const tableChromeBottom = 52;
const tableBandPad = 40;
const hitGraceMs = 400;
const holdMs = 1300;
const scatterMs = 2600;
const scatterPushMs = 720;
const levelPauseMs = 1800;
const resultSettleMs = 1200;
const replayGatherMs = 800;

const emptyScoreBoards = (): Record<ScoreBoard, HighScore[]> => ({
  monthly: [],
  allTime: [],
});

const listedBoardForRow = (
  id: string,
  boards: Record<ScoreBoard, HighScore[]>,
): ScoreBoard | null => {
  if (boards.monthly.some(row => row.id === id)) {
    return 'monthly';
  }

  if (boards.allTime.some(row => row.id === id)) {
    return 'allTime';
  }

  return null;
};

type Square = {
  size: number;
  right: number;
  bottom: number;
  opacity: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type ScatterImpulse = {
  vx: number;
  vy: number;
  delay: number;
  applied: number;
};

type Pointer = {
  x: number;
  y: number;
};

const overlaps = (a: Square, b: Square) =>
  Math.hypot(
    a.right + a.size / 2 - (b.right + b.size / 2),
    a.bottom + a.size / 2 - (b.bottom + b.size / 2),
  ) <
  a.size / 2 + b.size / 2 + gap;

const squareAt = (
  right: number,
  bottom: number,
  width: number,
  height: number,
): Square => {
  const reach = Math.hypot(width, height);
  const inward = Math.min(1, Math.hypot(right, bottom) / (reach * 0.9));
  const falloff = 1 - inward;

  return {
    size: Math.round(28 + falloff * 32),
    right,
    bottom,
    opacity: 0.08 + falloff * 0.16,
  };
};

const restOf = (square: Square) => ({
  x: boardWidth - square.right - square.size,
  y: boardHeight - square.bottom - square.size,
});

const boardPoint = (
  event: { clientX: number; clientY: number },
  overlay: HTMLElement,
): Pointer => {
  const rect = overlay.getBoundingClientRect();
  const width = rect.width || boardWidth;
  const height = rect.height || boardHeight;

  return {
    x: ((event.clientX - rect.left) / width) * boardWidth,
    y: ((event.clientY - rect.top) / height) * boardHeight,
  };
};

const squareTransform = (ox: number, oy: number, scale = 1) => {
  const moved = Math.abs(ox) >= 0.05 || Math.abs(oy) >= 0.05;
  const scaled = scale !== 1;

  if (moved && scaled) {
    return `translate(${ox}px, ${oy}px) scale(${scale})`;
  }

  if (moved) {
    return `translate(${ox}px, ${oy}px)`;
  }

  if (scaled) {
    return `scale(${scale})`;
  }

  return '';
};

const puckRadius = 7;

const segmentHits = (
  from: Pointer,
  to: Pointer,
  cx: number,
  cy: number,
  radius: number,
) => {
  const vx = to.x - from.x;
  const vy = to.y - from.y;
  const length = vx * vx + vy * vy || 1;
  const t = Math.max(
    0,
    Math.min(1, ((cx - from.x) * vx + (cy - from.y) * vy) / length),
  );

  return Math.hypot(from.x + t * vx - cx, from.y + t * vy - cy) < radius;
};

const circlesTouch = (
  a: Particle,
  sizeA: number,
  b: Particle,
  sizeB: number,
  slop = 0,
) =>
  Math.hypot(
    a.x + sizeA / 2 - (b.x + sizeB / 2),
    a.y + sizeA / 2 - (b.y + sizeB / 2),
  ) <
  sizeA / 2 + sizeB / 2 + slop;

const ballRadius = (size: number, pad = collidePad) => size / 2 + pad;

const tableBounds = () => ({
  minX: tablePad,
  minY: tableChromeTop + tableBandPad,
  maxX: boardWidth - tablePad,
  maxY: boardHeight - tableChromeBottom - tableBandPad,
});

const recenterOnTable = (squares: Square[], sim: Particle[]) => {
  const { minX, minY, maxX, maxY } = tableBounds();
  let minCx = Infinity;
  let maxCx = -Infinity;
  let minCy = Infinity;
  let maxCy = -Infinity;

  for (let i = 0; i < squares.length; i += 1) {
    const particle = sim[i];
    const size = squares[i].size;
    const cx = particle.x + size / 2;
    const cy = particle.y + size / 2;
    minCx = Math.min(minCx, cx);
    maxCx = Math.max(maxCx, cx);
    minCy = Math.min(minCy, cy);
    maxCy = Math.max(maxCy, cy);
  }

  const dx = (minX + maxX) / 2 - (minCx + maxCx) / 2;
  const dy = (minY + maxY) / 2 - (minCy + maxCy) / 2;

  for (const particle of sim) {
    particle.x += dx;
    particle.y += dy;
  }

  for (let i = 0; i < squares.length; i += 1) {
    bounceTable(sim[i], squares[i].size);
  }
};

const circlesClear = (
  ax: number,
  ay: number,
  as: number,
  bx: number,
  by: number,
  bs: number,
  pad: number,
) =>
  Math.hypot(ax + as / 2 - (bx + bs / 2), ay + as / 2 - (by + bs / 2)) >=
  as / 2 + bs / 2 + pad;

const packInBox = (
  squares: Square[],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  startPad: number,
) => {
  const placed: { x: number; y: number; size: number }[] = [];
  const spots = squares.map(() => ({ x: minX, y: minY }));
  const order = squares
    .map((_, index) => index)
    .sort((a, b) => squares[b].size - squares[a].size);

  for (const index of order) {
    const size = squares[index].size;
    const spanX = Math.max(1, maxX - size - minX);
    const spanY = Math.max(1, maxY - size - minY);
    let x = minX + Math.random() * spanX;
    let y = minY + Math.random() * spanY;
    let pad = startPad;

    for (let attempt = 0; attempt < 280; attempt += 1) {
      if (attempt === 120) {
        pad = Math.max(4, startPad - 8);
      } else if (attempt === 200) {
        pad = 2;
      }

      x = minX + Math.random() * spanX;
      y = minY + Math.random() * spanY;

      if (
        placed.every(other =>
          circlesClear(x, y, size, other.x, other.y, other.size, pad),
        )
      ) {
        break;
      }
    }

    placed.push({ x, y, size });
    spots[index] = { x, y };
  }

  return spots;
};

const pickSpreadTargets = (squares: Square[]) => {
  const { minX, minY, maxX, maxY } = tableBounds();
  return packInBox(squares, minX, minY, maxX, maxY, scatterGap);
};

const clusterOnTable = (squares: Square[], sim: Particle[]) => {
  const { minX, minY, maxX, maxY } = tableBounds();
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const halfW = Math.min(170, (maxX - minX) * 0.2);
  const halfH = Math.min(130, (maxY - minY) * 0.28);
  const starts = packInBox(
    squares,
    midX - halfW,
    midY - halfH,
    midX + halfW,
    midY + halfH,
    5,
  );

  for (let i = 0; i < squares.length; i += 1) {
    sim[i].x = starts[i].x;
    sim[i].y = starts[i].y;
    sim[i].vx = 0;
    sim[i].vy = 0;
  }

  const none = squares.map(() => false);
  for (let n = 0; n < 48; n += 1) {
    resolveCollisions(squares, sim, none, 4);
    for (let i = 0; i < squares.length; i += 1) {
      bounceTable(sim[i], squares[i].size);
      sim[i].vx = 0;
      sim[i].vy = 0;
    }
  }

  recenterOnTable(squares, sim);

  return pickSpreadTargets(squares);
};

const resolveCollisions = (
  squares: Square[],
  sim: Particle[],
  caught: boolean[],
  pad = collidePad,
  onCollide?: (speed: number) => void,
) => {
  for (let pass = 0; pass < 6; pass += 1) {
    for (let i = 0; i < squares.length; i += 1) {
      if (caught[i]) {
        continue;
      }

      for (let j = i + 1; j < squares.length; j += 1) {
        if (caught[j]) {
          continue;
        }

        const a = sim[i];
        const b = sim[j];
        const sa = squares[i].size;
        const sb = squares[j].size;
        const ra = ballRadius(sa, pad);
        const rb = ballRadius(sb, pad);
        const cax = a.x + sa / 2;
        const cay = a.y + sa / 2;
        const cbx = b.x + sb / 2;
        const cby = b.y + sb / 2;
        const dx = cbx - cax;
        const dy = cby - cay;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const minDist = ra + rb;

        if (dist >= minDist) {
          continue;
        }

        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        const massA = sa * sa;
        const massB = sb * sb;
        const invA = 1 / massA;
        const invB = 1 / massB;
        const invSum = invA + invB;

        a.x -= nx * overlap * (invA / invSum);
        a.y -= ny * overlap * (invA / invSum);
        b.x += nx * overlap * (invB / invSum);
        b.y += ny * overlap * (invB / invSum);

        const rvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rvn > 0) {
          const impulse = (-(1 + restitution) * rvn) / invSum;
          a.vx += impulse * invA * nx;
          a.vy += impulse * invA * ny;
          b.vx -= impulse * invB * nx;
          b.vy -= impulse * invB * ny;
        }

        if (pass === 0 && onCollide && rvn > 0.12) {
          onCollide(rvn);
        }
      }
    }
  }
};

const bounceTable = (
  particle: Particle,
  size: number,
  onWall?: (speed: number) => void,
) => {
  const { minX, minY, maxX, maxY } = tableBounds();

  if (particle.x < minX) {
    const speed = Math.abs(particle.vx);
    particle.x = minX;
    particle.vx = Math.abs(particle.vx) * wallRest;
    if (speed > 0.25) {
      onWall?.(speed);
    }
  } else if (particle.x + size > maxX) {
    const speed = Math.abs(particle.vx);
    particle.x = maxX - size;
    particle.vx = -Math.abs(particle.vx) * wallRest;
    if (speed > 0.25) {
      onWall?.(speed);
    }
  }

  if (particle.y < minY) {
    const speed = Math.abs(particle.vy);
    particle.y = minY;
    particle.vy = Math.abs(particle.vy) * wallRest;
    if (speed > 0.25) {
      onWall?.(speed);
    }
  } else if (particle.y + size > maxY) {
    const speed = Math.abs(particle.vy);
    particle.y = maxY - size;
    particle.vy = -Math.abs(particle.vy) * wallRest;
    if (speed > 0.25) {
      onWall?.(speed);
    }
  }
};

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioCtx: AudioContext | null = null;
let audioMaster: GainNode | null = null;
let collideLock = 0;
let scatterAirGain: GainNode | null = null;
let scatterAirFilter: BiquadFilterNode | null = null;
let scatterAirSource: AudioBufferSourceNode | null = null;
let scatterAirOn = false;

const audioGraph = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!audioCtx) {
    const Ctor =
      window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) {
      return null;
    }

    audioCtx = new Ctor();
    audioMaster = audioCtx.createGain();
    audioMaster.gain.value = 0.2;
    audioMaster.connect(audioCtx.destination);
  }

  if (!audioCtx || !audioMaster) {
    return null;
  }

  return { ctx: audioCtx, master: audioMaster };
};

const unlockAudio = () => {
  const graph = audioGraph();
  if (graph?.ctx.state === 'suspended') {
    void graph.ctx.resume();
  }
  startScatterAir();
};

const loopedAir = (ctx: AudioContext) => {
  const samples = Math.max(1, Math.floor(ctx.sampleRate * 0.9));
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < samples; i += 1) {
    last = (last + (Math.random() * 2 - 1) * 0.02) * 0.986;
    data[i] = last * 5;
  }
  return buffer;
};

const startScatterAir = () => {
  const graph = audioGraph();
  if (!graph || scatterAirSource) {
    return;
  }

  const { ctx, master } = graph;
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 180;
  highpass.Q.value = 0.5;
  scatterAirFilter = ctx.createBiquadFilter();
  scatterAirFilter.type = 'lowpass';
  scatterAirFilter.frequency.value = 1400;
  scatterAirFilter.Q.value = 0.5;
  scatterAirGain = ctx.createGain();
  scatterAirGain.gain.value = 0.0001;
  scatterAirSource = ctx.createBufferSource();
  scatterAirSource.buffer = loopedAir(ctx);
  scatterAirSource.loop = true;
  scatterAirSource.connect(highpass);
  highpass.connect(scatterAirFilter);
  scatterAirFilter.connect(scatterAirGain);
  scatterAirGain.connect(master);
  scatterAirSource.start();
};

const hushScatterAir = () => {
  scatterAirOn = false;
  if (scatterAirGain && audioCtx) {
    scatterAirGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.1);
  }
};

const tickScatterAir = (energy: number) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hushScatterAir();
    return;
  }

  startScatterAir();
  if (!scatterAirGain || !scatterAirFilter || !audioCtx) {
    return;
  }

  scatterAirOn = true;
  const now = audioCtx.currentTime;
  scatterAirGain.gain.setTargetAtTime(
    0.0001 + Math.min(0.2, energy * 0.024),
    now,
    0.07,
  );
  scatterAirFilter.frequency.setTargetAtTime(
    700 + Math.min(1400, energy * 90),
    now,
    0.08,
  );
};

const playScatterToss = () => {
  const graph = audioGraph();
  if (!graph || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  playNoise(graph.ctx, graph.master, 0.34, 0.15, 320, 1500, 0.04, 0.85);
};

const noiseBurst = (ctx: AudioContext, duration: number, decay: number) => {
  const samples = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const tau = Math.max(1, ctx.sampleRate * decay);
  for (let i = 0; i < samples; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / tau);
  }
  return buffer;
};

const playBump = (ctx: AudioContext, master: GainNode, strength: number) => {
  const now = ctx.currentTime;
  const clickDur = 0.014;
  const bodyDur = 0.05 + strength * 0.03;

  const click = ctx.createBufferSource();
  click.buffer = noiseBurst(ctx, clickDur, 0.0035);
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 1100;
  highpass.Q.value = 0.5;
  const clickAmp = ctx.createGain();
  clickAmp.gain.setValueAtTime(0.22 + strength * 0.18, now);
  clickAmp.gain.exponentialRampToValueAtTime(0.0001, now + clickDur);
  click.connect(highpass);
  highpass.connect(clickAmp);
  clickAmp.connect(master);
  click.start(now);

  const body = ctx.createBufferSource();
  body.buffer = noiseBurst(ctx, bodyDur, 0.011);
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 240 + strength * 160;
  lowpass.Q.value = 0.4;
  const bodyAmp = ctx.createGain();
  bodyAmp.gain.setValueAtTime(0.32 + strength * 0.28, now);
  bodyAmp.gain.exponentialRampToValueAtTime(0.0001, now + bodyDur);
  body.connect(lowpass);
  lowpass.connect(bodyAmp);
  bodyAmp.connect(master);
  body.start(now);
};

const playTone = (
  ctx: AudioContext,
  master: GainNode,
  {
    type,
    freq,
    freqEnd,
    duration,
    gain,
    attack = 0.006,
    delay = 0,
    onEnded,
  }: {
    type: OscillatorType;
    freq: number;
    freqEnd?: number;
    duration: number;
    gain: number;
    attack?: number;
    delay?: number;
    onEnded?: () => void;
  },
) => {
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, freqEnd),
      now + duration,
    );
  }
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(master);
  if (onEnded) {
    osc.onended = onEnded;
  }
  osc.start(now);
  osc.stop(now + duration + 0.03);
};

const playNoise = (
  ctx: AudioContext,
  master: GainNode,
  duration: number,
  gain: number,
  freq: number,
  freqEnd: number,
  attack = 0.02,
  q = 1.4,
) => {
  const now = ctx.currentTime;
  const buffer = ctx.createBuffer(
    1,
    Math.max(1, Math.floor(ctx.sampleRate * duration)),
    ctx.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, now);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(120, freqEnd),
    now + duration,
  );
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter);
  filter.connect(amp);
  amp.connect(master);
  src.start(now);
};

const playHit = () => {
  const graph = audioGraph();
  if (!graph || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  playBump(graph.ctx, graph.master, 0.72);
};

const playCollide = (speed: number) => {
  if (speed < 0.18) {
    return;
  }

  const now = performance.now();
  if (now - collideLock < 55) {
    return;
  }

  collideLock = now;
  playHit();
};

const playCatch = (count: number) => {
  const graph = audioGraph();
  if (!graph || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const hits = Math.min(4, Math.max(1, count));
  const { ctx, master } = graph;

  for (let i = 0; i < hits; i += 1) {
    const freq = 460 + Math.random() * 720;
    const lift = 1.04 + Math.random() * 0.12;
    const delay = i * 0.028;
    playTone(ctx, master, {
      type: 'sine',
      freq,
      freqEnd: freq * lift,
      duration: 0.14 + Math.random() * 0.08,
      gain: 0.1 + Math.random() * 0.05,
      delay,
    });
    playTone(ctx, master, {
      type: 'sine',
      freq: freq * (1.85 + Math.random() * 0.35),
      duration: 0.08 + Math.random() * 0.05,
      gain: 0.035 + Math.random() * 0.025,
      delay,
      attack: 0.004,
    });
    playTone(ctx, master, {
      type: 'triangle',
      freq: freq * (2.6 + Math.random() * 0.8),
      duration: 0.05 + Math.random() * 0.04,
      gain: 0.02 + Math.random() * 0.02,
      delay,
      attack: 0.002,
    });
  }
};

const playCrash = () => {
  const graph = audioGraph();
  if (!graph || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const { ctx, master } = graph;
  playNoise(ctx, master, 0.22, 0.18, 280, 90);
  playTone(ctx, master, {
    type: 'sawtooth',
    freq: 168,
    freqEnd: 52,
    duration: 0.32,
    gain: 0.1,
  });
  playTone(ctx, master, {
    type: 'sine',
    freq: 92,
    freqEnd: 40,
    duration: 0.38,
    gain: 0.14,
  });
};

const createSquares = (width: number, height: number) => {
  const squares: Square[] = [];
  const reach = Math.hypot(width, height);

  const tryPlace = (right: number, bottom: number) => {
    const next = squareAt(right, bottom, width, height);
    const visible =
      next.right < width &&
      next.bottom < height &&
      next.right + next.size > 0 &&
      next.bottom + next.size > 0;

    if (!visible || squares.some(square => overlaps(square, next))) {
      return;
    }

    squares.push(next);
  };

  tryPlace(-(10 + Math.random() * 10), -(8 + Math.random() * 10));
  tryPlace(92, 6);
  tryPlace(6, 92);

  let attempts = 0;
  while (squares.length < 40 && attempts < 1600) {
    attempts += 1;
    const angle = Math.random() * (Math.PI / 2);
    const radius = (0.08 + Math.random() * 0.98) * reach;
    tryPlace(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }

  return squares;
};

const squareOrder = (squares: Square[]) => {
  if (squares.length === 0) {
    return [];
  }

  const unused = new Set(squares.map((_, index) => index));
  let current = 0;
  let closest = Infinity;

  squares.forEach((square, index) => {
    const dist = square.right + square.bottom;
    if (dist < closest) {
      closest = dist;
      current = index;
    }
  });

  const order = [current];
  unused.delete(current);

  while (unused.size > 0) {
    const prev = squares[current];
    const px = prev.right + prev.size / 2;
    const py = prev.bottom + prev.size / 2;
    let next = current;
    let nextDist = Infinity;

    unused.forEach(index => {
      const square = squares[index];
      const dist = Math.hypot(
        square.right + square.size / 2 - px,
        square.bottom + square.size / 2 - py,
      );
      if (dist < nextDist) {
        nextDist = dist;
        next = index;
      }
    });

    order.push(next);
    unused.delete(next);
    current = next;
  }

  return order;
};

const activeGoods = (bad: boolean[], caught: boolean[]) => {
  const active = new Set<number>();

  for (let i = 0; i < bad.length; i += 1) {
    if (!bad[i] && !caught[i]) {
      active.add(i);
    }
  }

  return active;
};

const pickBadEggs = (total: number, badCount: number) => {
  const bad = Array.from({ length: total }, () => false);
  const indices = Array.from({ length: total }, (_, index) => index);

  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = indices[i];
    indices[i] = indices[j];
    indices[j] = swap;
  }

  for (let i = 0; i < Math.min(badCount, total); i += 1) {
    bad[indices[i]] = true;
  }

  return bad;
};

const paintHudScore = (node: HTMLSpanElement | null, value: number) => {
  if (node) {
    node.textContent = formatHudScore(value);
  }
};

const paintHudLeftover = (
  node: HTMLSpanElement | null,
  level: number,
  startedAt: number,
) => {
  if (!node) {
    return;
  }

  const elapsed = startedAt ? Date.now() - startedAt : 0;
  node.textContent = formatPlayTime(leftoverSeconds(level, elapsed) * 1000);
};

const HudScore = memo(
  ({ nodeRef }: { nodeRef: RefObject<HTMLSpanElement | null> }) => (
    <span
      ref={nodeRef}
      className="inline-block font-mono text-sm leading-none tabular-nums text-zinc-50 [text-shadow:0_1px_10px_rgb(0_0_0/0.85)]"
      style={{ width: `${scoreDigits}ch` }}
      aria-live="polite"
    >
      {formatHudScore(0)}
    </span>
  ),
);
HudScore.displayName = 'HudScore';

const HudLeftover = memo(
  ({ nodeRef }: { nodeRef: RefObject<HTMLSpanElement | null> }) => (
    <span className="flex items-center gap-x-1.5 font-sans text-[11px] font-normal leading-none text-zinc-400">
      <span
        ref={nodeRef}
        className="inline-block font-display text-sm font-semibold tabular-nums text-zinc-50 [text-shadow:0_1px_10px_rgb(0_0_0/0.85)]"
      >
        {formatPlayTime(levelParSeconds(1) * 1000)}
      </span>
      <span>left</span>
    </span>
  ),
);
HudLeftover.displayName = 'HudLeftover';

const playLink =
  'pointer-events-auto cursor-pointer text-[11px] text-zinc-400 underline decoration-zinc-500 underline-offset-4 [text-shadow:0_1px_10px_rgb(0_0_0/0.85)] transition-colors hover:text-white hover:decoration-brand focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 motion-reduce:transition-none';

const introShell =
  'pointer-events-none absolute inset-0 z-20 flex flex-col justify-start px-5 py-6 sm:px-10 sm:py-10 md:px-12 md:py-12';

const blockedShell =
  'relative z-20 flex flex-col justify-start px-5 py-8 sm:px-10 sm:py-10 md:px-12 md:py-12';

const introTitle =
  'font-display text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl';

const introCopy =
  'mt-4 max-w-2xl text-pretty text-base leading-relaxed text-zinc-300 sm:mt-8 sm:text-lg';

export const Tiggl = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<(HTMLSpanElement | null)[]>([]);
  const squaresRef = useRef<Square[]>([]);
  const simRef = useRef<Particle[]>([]);
  const pointerRef = useRef<Pointer | null>(null);
  const lastPointerRef = useRef<Pointer | null>(null);
  const puckPosRef = useRef<Pointer | null>(null);
  const frameRef = useRef(0);
  const runningRef = useRef(false);
  const startRef = useRef<() => void>(() => {});
  const stopRoundRef = useRef<(crash?: number[]) => void>(() => {});
  const nextLevelRef = useRef<() => void>(() => {});
  const caughtRef = useRef<boolean[]>([]);
  const scoreRef = useRef(0);
  const shownScoreRef = useRef(0);
  const scoreNodeRef = useRef<HTMLSpanElement | null>(null);
  const leftoverNodeRef = useRef<HTMLSpanElement | null>(null);
  const leftoverShownRef = useRef(-1);
  const playStartedAtRef = useRef(0);
  const levelStartedAtRef = useRef(0);
  const playingRef = useRef(false);
  const startedRef = useRef(false);
  const frozenRef = useRef(false);
  const levelRef = useRef(1);
  const badRef = useRef<boolean[]>([]);
  const orderRef = useRef<number[]>([]);
  const activeSetRef = useRef<Set<number>>(new Set());
  const repelStrengthRef = useRef<number[]>([]);
  const nudgedRef = useRef<boolean[]>([]);
  const catcherRef = useRef<HTMLSpanElement>(null);
  const hitsArmedRef = useRef(false);
  const spawnPointerRef = useRef<Pointer | null>(null);
  const graceTimerRef = useRef(0);
  const scatterUntilRef = useRef(0);
  const holdUntilRef = useRef(0);
  const scatterPushedRef = useRef(false);
  const scatterImpulseRef = useRef<ScatterImpulse[] | null>(null);
  const scatterTargetsRef = useRef<{ x: number; y: number }[] | null>(null);
  const gatherFromRef = useRef<{ x: number; y: number }[] | null>(null);
  const scatterLockedRef = useRef(false);
  const levelClearingRef = useRef(false);
  const levelPauseUntilRef = useRef(0);
  const stepRef = useRef<() => void>(() => {});
  const addScoreRef = useRef((_gained: number) => {});
  const awardTimeBonusRef = useRef(() => {});
  const idleSquaresRef = useRef<Square[]>([]);
  const [squares, setSquares] = useState<Square[]>([]);
  const [score, setScore] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [level, setLevel] = useState(1);
  const [caughtList, setCaughtList] = useState<boolean[]>([]);
  const [failedList, setFailedList] = useState<boolean[]>([]);
  const [activeList, setActiveList] = useState<boolean[]>([]);
  const [won, setWon] = useState(false);
  const [canPlay, setCanPlay] = useState<boolean | null>(null);
  const [scoreBoard, setScoreBoard] = useState<ScoreBoard>('monthly');
  const [scoreBoardsRows, setScoreBoardsRows] = useState<
    Record<ScoreBoard, HighScore[]>
  >({
    monthly: [],
    allTime: [],
  });
  const [scoreHighlightId, setScoreHighlightId] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [scoresError, setScoresError] = useState<string | null>(null);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [playCounts, setPlayCounts] = useState<PlayCounts>(emptyPlayCounts);
  const [pendingHighScore, setPendingHighScore] = useState(false);
  const [scoreOffer, setScoreOffer] = useState<ScoreOffer | null>(null);
  const celebration = scoreOffer;
  const madeTen = Boolean(
    celebration ??
    (frozen
      ? offerForNewScore({
          score,
          monthly: scoreBoardsRows.monthly,
          allTime: scoreBoardsRows.allTime,
        })
      : null),
  );
  const [boardMoved, setBoardMoved] = useState(false);
  const playRecordedRef = useRef(false);
  const pendingScoreRef = useRef<HighScoreRun | null>(null);
  const pendingCaptureRef = useRef<HighScoreRun | null>(null);
  const pendingOfferRef = useRef<ScoreOffer | null>(null);
  const scoreCommitRef = useRef(false);
  const offerTimerRef = useRef(0);

  const clearOfferReveal = () => {
    window.clearTimeout(offerTimerRef.current);
    offerTimerRef.current = 0;
  };

  const resetNameEntry = () => {
    clearOfferReveal();
    setScoreHighlightId(null);
    setNameError(null);
    setSavingName(false);
    setBoardMoved(false);
    setScoreOffer(null);
    pendingOfferRef.current = null;
  };

  const showListedBoards = (
    listed: Extract<
      Awaited<ReturnType<typeof listHighScoreBoards>>,
      { ok: true }
    >,
    rowId?: string,
  ) => {
    setScoreBoardsRows(listed.boards);
    setPlayCounts(listed.plays);
    setScoresError(null);

    if (!rowId) {
      return true;
    }

    const board = listedBoardForRow(rowId, listed.boards);

    if (board) {
      setScoreBoard(board);
      setScoreHighlightId(rowId);
      setBoardMoved(false);
      return true;
    }

    setScoreHighlightId(null);
    if (frozenRef.current) {
      setBoardMoved(true);
    }
    return false;
  };

  const stillOnBoard = (
    score: number,
    boards: Record<ScoreBoard, HighScore[]>,
  ) => {
    const offer = pendingOfferRef.current;
    return offer ? qualifiesForBoard(score, boards[offer.board]) : false;
  };

  const dropPendingScore = () => {
    clearOfferReveal();
    pendingScoreRef.current = null;
    pendingCaptureRef.current = null;
    pendingOfferRef.current = null;
    setPendingHighScore(false);
    setScoreOffer(null);
  };

  const settlePendingScore = async () => {
    const pending = pendingScoreRef.current;

    if (!pending || scoreCommitRef.current) {
      return;
    }

    scoreCommitRef.current = true;
    pendingScoreRef.current = null;
    setPendingHighScore(false);

    const preview = await listHighScoreBoards();

    if (preview.ok) {
      showListedBoards(preview);

      if (!stillOnBoard(pending.score, preview.boards)) {
        dropPendingScore();
        if (frozenRef.current) {
          setBoardMoved(true);
        }
        return;
      }
    }

    const result = await submitHighScore({
      name: anonymousName,
      score: pending.score,
      level: pending.level,
      elapsedMs: pending.elapsedMs,
      cleared: pending.won,
    });

    if (!result.ok) {
      return;
    }

    const listed = await listHighScoreBoards();

    if (listed.ok) {
      showListedBoards(listed, result.row.id);
    }
  };

  useLayoutEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setCanPlay(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setScoresLoading(true);

    void listHighScoreBoards().then(result => {
      if (cancelled) {
        return;
      }

      setScoresLoading(false);

      if (result.ok) {
        setScoreBoardsRows(result.boards);
        setPlayCounts(result.plays);
        setScoresError(null);
        return;
      }

      setScoreBoardsRows(emptyScoreBoards());
      setPlayCounts(emptyPlayCounts());
      setScoresError(result.error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!frozen) {
      playRecordedRef.current = false;
      clearOfferReveal();
      void settlePendingScore();
      return;
    }

    let cancelled = false;
    setScoresLoading(true);
    scoreCommitRef.current = false;
    const revealAt =
      Date.now() +
      (window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : resultSettleMs);

    const revealResult = (offer: ScoreOffer | null) => {
      if (cancelled || !frozenRef.current) {
        return;
      }

      if (offer && pendingOfferRef.current === offer) {
        setScoreOffer(offer);
      }
    };

    const load = async () => {
      setBoardMoved(false);

      if (!playRecordedRef.current && playStartedAtRef.current) {
        playRecordedRef.current = true;
        await recordPlay();
      }

      const result = await listHighScoreBoards();

      if (cancelled) {
        return;
      }

      setScoresLoading(false);

      if (!result.ok) {
        setScoreBoardsRows(emptyScoreBoards());
        setPlayCounts(emptyPlayCounts());
        setScoresError(result.error);
        dropPendingScore();
        revealResult(null);
        return;
      }

      setScoresError(null);
      setScoreBoardsRows(result.boards);
      setPlayCounts(result.plays);

      const offer = offerForNewScore({
        score: scoreRef.current,
        monthly: result.boards.monthly,
        allTime: result.boards.allTime,
      });

      if (offer) {
        pendingOfferRef.current = offer;
        setScoreBoard(offer.board);
        pendingScoreRef.current = pendingCaptureRef.current ?? {
          score: scoreRef.current,
          level: levelRef.current,
          elapsedMs,
          won,
        };
        setPendingHighScore(true);
      } else {
        dropPendingScore();
      }

      offerTimerRef.current = window.setTimeout(
        () => {
          revealResult(offer);
        },
        Math.max(0, revealAt - Date.now()),
      );
    };

    void load();

    return () => {
      cancelled = true;
      clearOfferReveal();
    };
  }, [frozen]);

  useEffect(() => {
    if (!playing) {
      leftoverShownRef.current = -1;
      return;
    }

    const tick = () => {
      const left = leftoverSeconds(
        levelRef.current,
        levelStartedAtRef.current ? Date.now() - levelStartedAtRef.current : 0,
      );
      if (left === leftoverShownRef.current) {
        return;
      }

      leftoverShownRef.current = left;
      paintHudLeftover(
        leftoverNodeRef.current,
        levelRef.current,
        levelStartedAtRef.current,
      );
    };

    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [playing]);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }

    const next = createSquares(boardWidth, boardHeight);
    squaresRef.current = next;
    idleSquaresRef.current = next;
    simRef.current = [];
    caughtRef.current = next.map(() => false);
    orderRef.current = squareOrder(next);
    repelStrengthRef.current = next.map(() => 0);
    nudgedRef.current = next.map(() => false);
    scoreRef.current = 0;
    setSquares(next);
    setCaughtList(next.map(() => false));
    setFailedList(next.map(() => false));
    setActiveList(next.map(() => false));
  }, []);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }

    const layout = squaresRef.current;
    const sim = simRef.current;

    for (let i = 0; i < layout.length; i += 1) {
      const node = nodesRef.current[i];
      if (!node) {
        continue;
      }

      const particle = sim[i];
      if (!particle) {
        node.style.transform = '';
        continue;
      }

      const rest = restOf(layout[i]);
      node.style.transform = squareTransform(
        particle.x - rest.x,
        particle.y - rest.y,
        caughtRef.current[i] ? caughtScale : 1,
      );
    }
  }, [squares]);

  useEffect(() => {
    const header = overlayRef.current?.parentElement;
    if (!header) {
      return;
    }

    header.classList.toggle('catch-playing', playing || frozen);
    header.style.cursor = playing ? 'none' : '';

    return () => {
      header.classList.remove('catch-playing');
      header.style.cursor = '';
    };
  }, [playing, frozen]);

  const pointFromEvent = (event: { clientX: number; clientY: number }) => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return null;
    }

    return boardPoint(event, overlay);
  };

  const showCatcher = (point: Pointer) => {
    pointerRef.current = point;
    puckPosRef.current = point;
    const catcher = catcherRef.current;
    if (catcher) {
      catcher.classList.add('is-on');
      catcher.style.transform = `translate(${point.x}px, ${point.y}px)`;
    }
  };

  const armHits = () => {
    if (hitsArmedRef.current) {
      return;
    }

    hitsArmedRef.current = true;
    lastPointerRef.current = pointerRef.current;
    spawnPointerRef.current = null;
    window.clearTimeout(graceTimerRef.current);
  };

  const beginCatcher = (event?: { clientX: number; clientY: number }) => {
    const point = event ? pointFromEvent(event) : pointerRef.current;
    hitsArmedRef.current = false;
    lastPointerRef.current = null;
    window.clearTimeout(graceTimerRef.current);
    graceTimerRef.current = window.setTimeout(armHits, hitGraceMs);

    if (point) {
      spawnPointerRef.current = point;
      showCatcher(point);
    }
  };

  const tossOntoTable = (resetClock = true, fromVisual = false) => {
    const previous = fromVisual
      ? squaresRef.current.map((square, index) => {
          const particle = simRef.current[index];
          const x = particle ? particle.x : restOf(square).x;
          const y = particle ? particle.y : restOf(square).y;

          return {
            x: x + square.size / 2,
            y: y + square.size / 2,
          };
        })
      : null;

    const layout = Array.from({ length: playCount }, () => ({
      size: 14 + Math.round(Math.random() * 34),
      right: 8 + Math.random() * 48,
      bottom: 8 + Math.random() * 48,
      opacity: 0.08 + Math.random() * 0.16,
    }));

    simRef.current = layout.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
    scatterTargetsRef.current = clusterOnTable(layout, simRef.current);

    const origins = previous ? previous.map(() => ({ x: 0, y: 0 })) : null;

    for (let i = 0; i < layout.length; i += 1) {
      const particle = simRef.current[i];
      layout[i].right = boardWidth - particle.x - layout[i].size;
      layout[i].bottom = boardHeight - particle.y - layout[i].size;
      const rest = restOf(layout[i]);
      if (previous?.[i] && origins) {
        particle.x = previous[i].x - layout[i].size / 2;
        particle.y = previous[i].y - layout[i].size / 2;
        origins[i] = { x: particle.x, y: particle.y };
      } else {
        particle.x = rest.x;
        particle.y = rest.y;
      }
      particle.vx = 0;
      particle.vy = 0;
    }

    gatherFromRef.current = origins;

    squaresRef.current = layout;
    orderRef.current = squareOrder(layout);
    scatterUntilRef.current = Date.now() + holdMs + scatterMs;
    holdUntilRef.current = Date.now() + holdMs;
    scatterPushedRef.current = false;
    scatterImpulseRef.current = null;
    scatterLockedRef.current = false;
    levelClearingRef.current = false;
    levelPauseUntilRef.current = 0;
    levelStartedAtRef.current = 0;
    leftoverShownRef.current = -1;
    paintHudLeftover(leftoverNodeRef.current, levelRef.current, 0);
    if (resetClock) {
      playStartedAtRef.current = 0;
    }
    setSquares(layout);
  };

  const armLevel = () => {
    const layout = squaresRef.current;
    const bad = pickBadEggs(layout.length, badsPerLevel * levelRef.current);
    badRef.current = bad;
    caughtRef.current = layout.map(() => false);
    repelStrengthRef.current = layout.map(() => 0);
    nudgedRef.current = layout.map(() => false);
    activeSetRef.current = activeGoods(bad, caughtRef.current);
    setCaughtList(layout.map(() => false));
    setFailedList(layout.map(() => false));
    setActiveList(layout.map(() => false));
  };

  const restoreIdle = () => {
    const idle = idleSquaresRef.current;
    if (idle.length === 0) {
      return;
    }

    squaresRef.current = idle;
    orderRef.current = squareOrder(idle);
    setSquares(idle);
  };

  const startRound = (event?: { clientX: number; clientY: number }) => {
    if (!canPlay || startedRef.current) {
      return;
    }

    startedRef.current = true;
    frozenRef.current = false;
    playingRef.current = true;
    unlockAudio();
    levelRef.current = 1;
    setLevel(1);
    tossOntoTable(true);
    beginCatcher(event);
    armLevel();
    setPlaying(true);
    setFrozen(false);
    setWon(false);
    setHasPlayed(true);
    setElapsedMs(0);
    scoreRef.current = 0;
    shownScoreRef.current = 0;
    paintHudScore(scoreNodeRef.current, 0);
    setScore(0);
    resetNameEntry();
    startRef.current();
  };

  const replayRound = (event?: { clientX: number; clientY: number }) => {
    if (!canPlay || playingRef.current || !startedRef.current) {
      return;
    }

    frozenRef.current = false;
    playingRef.current = true;
    setPlaying(true);
    setFrozen(false);
    setWon(false);
    setActiveList(current => current.map(() => false));
    setFailedList(current => current.map(() => false));
    setCaughtList(current => current.map(() => false));
    levelRef.current = 1;
    setLevel(1);
    setElapsedMs(0);
    scoreRef.current = 0;
    shownScoreRef.current = 0;
    paintHudScore(scoreNodeRef.current, 0);
    setScore(0);
    resetNameEntry();
    unlockAudio();
    tossOntoTable(
      true,
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    beginCatcher(event);
    armLevel();
    startRef.current();
  };

  const stopRound = (crash: number[] = []) => {
    if (!playingRef.current) {
      return;
    }

    playingRef.current = false;
    frozenRef.current = true;
    hitsArmedRef.current = false;
    window.clearTimeout(graceTimerRef.current);
    const started = playStartedAtRef.current;
    const elapsed = started ? Date.now() - started : 0;
    pendingCaptureRef.current = {
      score: scoreRef.current,
      level: levelRef.current,
      elapsedMs: elapsed,
      won: crash.length !== 2 && levelRef.current >= maxLevel,
    };
    setElapsedMs(elapsed);
    setScore(scoreRef.current);
    shownScoreRef.current = scoreRef.current;
    paintHudScore(scoreNodeRef.current, scoreRef.current);
    setPlaying(false);
    setFrozen(true);
    catcherRef.current?.classList.remove('is-on');
    pointerRef.current = null;
    lastPointerRef.current = null;
    runningRef.current = false;
    levelClearingRef.current = false;
    levelPauseUntilRef.current = 0;
    hushScatterAir();

    for (const particle of simRef.current) {
      particle.vx = 0;
      particle.vy = 0;
    }

    setActiveList(
      squaresRef.current.map((_, index) => activeSetRef.current.has(index)),
    );

    if (crash.length === 2) {
      playCrash();
      setWon(false);
      setFailedList(current => {
        const next = current.slice();
        next[crash[0]] = true;
        next[crash[1]] = true;
        return next;
      });
    } else {
      setWon(levelRef.current >= maxLevel);
    }
  };

  const nextLevel = () => {
    if (!playingRef.current || frozenRef.current) {
      return;
    }

    if (levelRef.current >= maxLevel) {
      stopRound();
      return;
    }

    levelRef.current += 1;
    setLevel(levelRef.current);
    tossOntoTable(false);
    beginCatcher();
    armLevel();
  };

  const exitGame = () => {
    playingRef.current = false;
    frozenRef.current = false;
    startedRef.current = false;
    hitsArmedRef.current = false;
    window.clearTimeout(graceTimerRef.current);
    scatterUntilRef.current = 0;
    holdUntilRef.current = 0;
    scatterPushedRef.current = false;
    scatterImpulseRef.current = null;
    scatterTargetsRef.current = null;
    gatherFromRef.current = null;
    scatterLockedRef.current = false;
    levelClearingRef.current = false;
    levelPauseUntilRef.current = 0;
    playStartedAtRef.current = 0;
    levelStartedAtRef.current = 0;
    hushScatterAir();
    pointerRef.current = null;
    lastPointerRef.current = null;
    puckPosRef.current = null;
    catcherRef.current?.classList.remove('is-on');

    const idle = idleSquaresRef.current;

    caughtRef.current = idle.map(() => false);
    scoreRef.current = 0;
    shownScoreRef.current = 0;
    paintHudScore(scoreNodeRef.current, 0);
    nudgedRef.current = idle.map(() => false);
    levelRef.current = 1;
    restoreIdle();

    simRef.current = idle.map(square => {
      const rest = restOf(square);
      return { x: rest.x, y: rest.y, vx: 0, vy: 0 };
    });

    for (const node of nodesRef.current) {
      if (node) {
        node.style.transform = '';
      }
    }

    setScore(0);
    setCaughtList(idle.map(() => false));
    setFailedList(idle.map(() => false));
    setActiveList(idle.map(() => false));
    setElapsedMs(0);
    setLevel(1);
    setPlaying(false);
    setFrozen(false);
    setWon(false);
    setHasPlayed(false);
    runningRef.current = false;
    resetNameEntry();
    startRef.current();
  };

  stopRoundRef.current = stopRound;
  nextLevelRef.current = nextLevel;
  addScoreRef.current = gained => {
    playCatch(gained);
    scoreRef.current += gained * pointsPerCatch(levelRef.current);
    setScore(scoreRef.current);
    setCaughtList(caughtRef.current.slice());
    startRef.current();
  };
  awardTimeBonusRef.current = () => {
    const started = levelStartedAtRef.current;
    if (!started) {
      return;
    }

    const bonus = timeBonusForClear(levelRef.current, Date.now() - started);
    levelStartedAtRef.current = 0;
    if (bonus <= 0) {
      return;
    }

    scoreRef.current += bonus;
    setScore(scoreRef.current);
    startRef.current();
  };

  useEffect(() => {
    const overlay = overlayRef.current;
    const header = overlay?.parentElement;
    if (!overlay || !header) {
      return;
    }

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const hits = (
      index: number,
      layout: Square[],
      sim: Particle[],
      pointer: Pointer,
      previousPointer: Pointer | null,
    ) => {
      const square = layout[index];
      const particle = sim[index];
      const cx = particle.x + square.size / 2;
      const cy = particle.y + square.size / 2;
      const radius = square.size / 2 + puckRadius + catchPadding;

      return (
        Math.hypot(cx - pointer.x, cy - pointer.y) < radius ||
        (previousPointer
          ? segmentHits(previousPointer, pointer, cx, cy, radius)
          : false)
      );
    };

    const step = () => {
      if (
        playingRef.current &&
        !frozenRef.current &&
        levelClearingRef.current &&
        Date.now() >= levelPauseUntilRef.current
      ) {
        levelClearingRef.current = false;
        nextLevelRef.current();
      }

      const layout = squaresRef.current;
      const caught = caughtRef.current;
      const sim = simRef.current;
      const now = Date.now();
      const holding = playingRef.current && now < holdUntilRef.current;
      const scattering =
        playingRef.current && !holding && now < scatterUntilRef.current;
      const intro = holding || scattering;
      const clearing = levelClearingRef.current;
      const targets = scatterTargetsRef.current;

      if (scattering && targets) {
        const { minX, minY, maxX, maxY } = tableBounds();
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        let impulses = scatterImpulseRef.current;

        if (!impulses) {
          scatterPushedRef.current = true;
          impulses = [];

          for (let i = 0; i < layout.length; i += 1) {
            const target = targets[i];
            const particle = sim[i];
            const square = layout[i];
            if (!particle) {
              impulses.push({ vx: 0, vy: 0, delay: 0, applied: 0 });
              continue;
            }

            const cx = particle.x + square.size / 2;
            const cy = particle.y + square.size / 2;
            const fromMidX = cx - midX;
            const fromMidY = cy - midY;
            const fromMid = Math.hypot(fromMidX, fromMidY) || 1;
            const toX = (target?.x ?? cx) - particle.x;
            const toY = (target?.y ?? cy) - particle.y;
            const toLen = Math.hypot(toX, toY) || 1;
            const speed = 10.5 + Math.min(12, toLen * 0.04) + Math.random() * 4;
            const along = 0.72 + Math.random() * 0.2;
            const out = 1 - along;
            const spin = (Math.random() - 0.5) * 2.2;

            impulses.push({
              vx:
                (toX / toLen) * speed * along +
                (fromMidX / fromMid) * speed * out -
                (fromMidY / fromMid) * spin,
              vy:
                (toY / toLen) * speed * along +
                (fromMidY / fromMid) * speed * out +
                (fromMidX / fromMid) * spin,
              delay: Math.random() * 160,
              applied: 0,
            });
          }

          scatterImpulseRef.current = impulses;
          playScatterToss();
        }

        const elapsed = now - holdUntilRef.current;

        for (let i = 0; i < layout.length; i += 1) {
          const impulse = impulses[i];
          const particle = sim[i];
          if (!impulse || !particle) {
            continue;
          }

          const localT = Math.min(
            1,
            Math.max(0, (elapsed - impulse.delay) / scatterPushMs),
          );
          const ease = localT * localT * (3 - 2 * localT);
          const delta = ease - impulse.applied;
          impulse.applied = ease;
          particle.vx += impulse.vx * delta;
          particle.vy += impulse.vy * delta;
        }
      }

      const pointer =
        playingRef.current && hitsArmedRef.current && !intro && !clearing
          ? pointerRef.current
          : null;
      const previousPointer = lastPointerRef.current;
      lastPointerRef.current = pointer;
      const active = activeSetRef.current;
      let moving = false;

      if (sim.length !== layout.length) {
        sim.length = 0;
        for (const square of layout) {
          const rest = restOf(square);
          sim.push({ x: rest.x, y: rest.y, vx: 0, vy: 0 });
        }
      }

      const strengths = repelStrengthRef.current;
      if (strengths.length !== layout.length) {
        strengths.length = 0;
        for (let i = 0; i < layout.length; i += 1) {
          strengths.push(0);
        }
      }

      if (holding) {
        const origins = gatherFromRef.current;
        const gatherT = origins
          ? Math.min(
              1,
              Math.max(
                0,
                (now - (holdUntilRef.current - holdMs)) / replayGatherMs,
              ),
            )
          : 1;
        const gather = gatherT * gatherT * (3 - 2 * gatherT);

        for (let i = 0; i < sim.length; i += 1) {
          const particle = sim[i];
          const origin = origins?.[i];
          if (origin) {
            const rest = restOf(layout[i]);
            particle.x = origin.x + (rest.x - origin.x) * gather;
            particle.y = origin.y + (rest.y - origin.y) * gather;
          }
          particle.vx = 0;
          particle.vy = 0;
        }

        if (origins && gatherT >= 1) {
          gatherFromRef.current = null;
        }
      }

      if (!reduceMotion && !holding) {
        const stepForce = 1 / substeps;
        const scatterT = scattering
          ? Math.min(1, Math.max(0, now - holdUntilRef.current) / scatterMs)
          : 1;
        const brake = Math.max(0, (scatterT - 0.58) / 0.42);
        const liveDamp = playingRef.current
          ? scattering
            ? 0.978 + (tableDamp - 0.978) * brake * brake
            : holding
              ? 0.84
              : tableDamp
          : damping;
        const stepDamp = liveDamp ** stepForce;

        for (let sub = 0; sub < substeps; sub += 1) {
          for (let i = 0; i < layout.length; i += 1) {
            if (caught[i]) {
              continue;
            }

            const square = layout[i];
            const particle = sim[i];
            const rest = restOf(square);

            if (!playingRef.current && !frozenRef.current) {
              particle.vx += (rest.x - particle.x) * spring * stepForce;
              particle.vy += (rest.y - particle.y) * spring * stepForce;
            }

            if (
              pointer &&
              badRef.current[i] &&
              hits(i, layout, sim, pointer, previousPointer)
            ) {
              if (strengths[i] === 0) {
                strengths[i] = repelMin + Math.random() * (repelMax - repelMin);
              }
              nudgedRef.current[i] = true;

              const dx = particle.x + square.size / 2 - pointer.x;
              const dy = particle.y + square.size / 2 - pointer.y;
              const dist = Math.hypot(dx, dy) || 0.0001;
              const force = strengths[i] * stepForce;
              particle.vx += (dx / dist) * force;
              particle.vy += (dy / dist) * force;
            } else {
              strengths[i] = 0;
            }

            particle.vx *= stepDamp;
            particle.vy *= stepDamp;
            particle.x += particle.vx * stepForce;
            particle.y += particle.vy * stepForce;

            if (playingRef.current) {
              bounceTable(
                particle,
                square.size,
                holding || scattering ? undefined : playCollide,
              );
            }
          }

          if (playingRef.current && !intro) {
            for (let i = 0; i < layout.length; i += 1) {
              for (let j = i + 1; j < layout.length; j += 1) {
                if (caught[i] && caught[j]) {
                  continue;
                }

                if (
                  circlesTouch(
                    sim[i],
                    layout[i].size,
                    sim[j],
                    layout[j].size,
                    crashSlop,
                  ) &&
                  (nudgedRef.current[i] || nudgedRef.current[j])
                ) {
                  for (let index = 0; index < layout.length; index += 1) {
                    const square = layout[index];
                    const particle = sim[index];
                    const rest = restOf(square);
                    const node = nodesRef.current[index];
                    if (node && !reduceMotion) {
                      node.style.transform = squareTransform(
                        particle.x - rest.x,
                        particle.y - rest.y,
                        caught[index] ? caughtScale : 1,
                      );
                    }
                  }
                  stopRoundRef.current([i, j]);
                  return;
                }
              }
            }
          }

          resolveCollisions(
            layout,
            sim,
            caught,
            playingRef.current
              ? holding || scattering
                ? 4
                : collidePad
              : collidePad,
            playingRef.current && !holding && !scattering
              ? playCollide
              : undefined,
          );

          if (playingRef.current) {
            for (let i = 0; i < layout.length; i += 1) {
              if (!caught[i]) {
                bounceTable(
                  sim[i],
                  layout[i].size,
                  holding || scattering ? undefined : playCollide,
                );
              }
            }
          }
        }
      }

      if (scattering) {
        let energy = 0;
        let count = 0;
        for (const particle of sim) {
          energy += Math.hypot(particle.vx, particle.vy);
          count += 1;
        }
        tickScatterAir(count ? energy / count : 0);
      } else if (scatterAirOn) {
        hushScatterAir();
      }

      if (
        playingRef.current &&
        !intro &&
        !frozenRef.current &&
        !scatterLockedRef.current
      ) {
        scatterLockedRef.current = true;
        if (!playStartedAtRef.current) {
          playStartedAtRef.current = Date.now();
        }
        if (!levelStartedAtRef.current) {
          levelStartedAtRef.current = Date.now();
        }
      }

      if (pointer) {
        let obstacleHit = false;

        for (let i = 0; i < layout.length; i += 1) {
          if (caught[i] || !badRef.current[i]) {
            continue;
          }

          if (hits(i, layout, sim, pointer, previousPointer)) {
            obstacleHit = true;
            break;
          }
        }

        if (!obstacleHit) {
          let gained = 0;

          for (const index of active) {
            if (
              !caught[index] &&
              hits(index, layout, sim, pointer, previousPointer)
            ) {
              caught[index] = true;
              gained += 1;
              const node = nodesRef.current[index];
              if (node) {
                const rest = restOf(layout[index]);
                const particle = sim[index];
                node.style.transform = squareTransform(
                  particle.x - rest.x,
                  particle.y - rest.y,
                  caughtScale,
                );
              }
            }
          }

          if (gained > 0) {
            addScoreRef.current(gained);
            activeSetRef.current = activeGoods(badRef.current, caught);

            if (activeSetRef.current.size === 0 && !levelClearingRef.current) {
              awardTimeBonusRef.current();
              if (levelRef.current >= maxLevel) {
                stopRoundRef.current();
                return;
              }

              levelClearingRef.current = true;
              levelPauseUntilRef.current = Date.now() + levelPauseMs;
            }
          }
        }
      }

      for (let i = 0; i < layout.length; i += 1) {
        const square = layout[i];
        const particle = sim[i];
        const rest = restOf(square);
        const ox = reduceMotion ? 0 : particle.x - rest.x;
        const oy = reduceMotion ? 0 : particle.y - rest.y;
        const node = nodesRef.current[i];

        if (caught[i] && playingRef.current) {
          continue;
        }

        if (node && !reduceMotion) {
          node.style.transform = squareTransform(ox, oy);
        }

        if (
          Math.abs(ox) > 0.25 ||
          Math.abs(oy) > 0.25 ||
          Math.abs(particle.vx) > 0.04 ||
          Math.abs(particle.vy) > 0.04
        ) {
          moving = true;
        }
      }

      const targetScore = scoreRef.current;
      let shownScore = shownScoreRef.current;
      if (shownScore !== targetScore) {
        if (reduceMotion) {
          shownScore = targetScore;
        } else if (shownScore < targetScore) {
          shownScore = Math.min(
            targetScore,
            shownScore +
              Math.max(1, Math.ceil((targetScore - shownScore) / 18)),
          );
        } else {
          shownScore = targetScore;
        }
        shownScoreRef.current = shownScore;
        paintHudScore(scoreNodeRef.current, shownScore);
      }

      if (
        moving ||
        shownScore !== targetScore ||
        (playingRef.current &&
          (pointer || intro || clearing || levelClearingRef.current))
      ) {
        frameRef.current = requestAnimationFrame(() => stepRef.current());
      } else {
        runningRef.current = false;
      }
    };

    stepRef.current = step;

    const start = () => {
      if (runningRef.current) {
        return;
      }
      runningRef.current = true;
      frameRef.current = requestAnimationFrame(() => stepRef.current());
    };

    startRef.current = start;

    const onMove = (event: PointerEvent) => {
      const point = boardPoint(event, overlay);

      if (!playingRef.current) {
        pointerRef.current = point;
        return;
      }

      pointerRef.current = point;
      puckPosRef.current = point;
      const catcher = catcherRef.current;
      if (catcher) {
        catcher.classList.add('is-on');
        catcher.style.transform = `translate(${point.x}px, ${point.y}px)`;
      }

      const spawn = spawnPointerRef.current;
      if (
        !hitsArmedRef.current &&
        spawn &&
        Math.hypot(point.x - spawn.x, point.y - spawn.y) > 16
      ) {
        armHits();
      }

      start();
    };

    const onLeave = () => {
      pointerRef.current = null;
      lastPointerRef.current = null;
      catcherRef.current?.classList.remove('is-on');
      if (playingRef.current) {
        start();
      }
    };

    header.addEventListener('pointermove', onMove);
    header.addEventListener('pointerleave', onLeave);

    return () => {
      startRef.current = () => {};
      cancelAnimationFrame(frameRef.current);
      runningRef.current = false;
      header.removeEventListener('pointermove', onMove);
      header.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const saveHighScore = async (name: string) => {
    const pending = pendingScoreRef.current;

    if (!pending || scoreCommitRef.current) {
      return;
    }

    scoreCommitRef.current = true;
    setSavingName(true);
    setNameError(null);

    const preview = await listHighScoreBoards();

    if (preview.ok) {
      showListedBoards(preview);

      if (!stillOnBoard(pending.score, preview.boards)) {
        dropPendingScore();
        setSavingName(false);
        if (frozenRef.current) {
          setBoardMoved(true);
        }
        return;
      }
    }

    const result = await submitHighScore({
      name,
      score: pending.score,
      level: pending.level,
      elapsedMs: pending.elapsedMs,
      cleared: pending.won,
    });

    setSavingName(false);

    if (!result.ok) {
      scoreCommitRef.current = false;
      setNameError(result.error);
      return;
    }

    pendingScoreRef.current = null;
    pendingCaptureRef.current = null;
    setPendingHighScore(false);

    const listed = await listHighScoreBoards();

    if (listed.ok) {
      showListedBoards(listed, result.row.id);
    } else {
      setScoreBoardsRows({
        monthly: [result.row],
        allTime: [result.row],
      });
      setPlayCounts(emptyPlayCounts());
      setScoresError(listed.error);
    }
  };

  const resultLabel = won
    ? `Clear! ${formatScore(score)} points, ten levels, ${playTimeLabel(elapsedMs)}`
    : `TIG! You're caught! ${formatScore(score)} points, level ${level}, ${playTimeLabel(elapsedMs)}`;

  const blocked = canPlay === false;

  return (
    <div
      className={
        blocked
          ? 'grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]'
          : 'flex items-stretch gap-4'
      }
    >
      <div
        className={blocked ? 'flex min-w-0 flex-col' : 'flex flex-col gap-3'}
      >
        <div
          className={`relative overflow-hidden border border-zinc-800 bg-zinc-950 text-zinc-50 shadow-[0_10px_28px_rgb(0_0_0_/_0.4)]${playing || frozen ? ' catch-playing' : ''}${
            blocked ? ' h-auto w-full lg:h-full' : ' shrink-0'
          }`}
          style={
            blocked ? undefined : { width: boardWidth, height: boardHeight }
          }
        >
          <div
            ref={overlayRef}
            className={`hero-squares pointer-events-none absolute inset-0 z-0 overflow-hidden${playing || frozen ? ' is-playing' : ''}${frozen ? ' is-results' : ''}`}
          >
            {squares.map((square, index) => (
              <span
                key={index}
                ref={node => {
                  nodesRef.current[index] = node;
                }}
                className={`hero-square absolute${
                  failedList[index]
                    ? ' is-crash'
                    : frozen && activeList[index]
                      ? ' is-active'
                      : caughtList[index]
                        ? ' is-caught'
                        : ''
                }${
                  frozen && !failedList[index] && !activeList[index]
                    ? ' is-dim'
                    : ''
                }`}
                aria-hidden
                style={{
                  width: square.size,
                  height: square.size,
                  right: square.right,
                  bottom: square.bottom,
                  ...(caughtList[index] ||
                  failedList[index] ||
                  (frozen && activeList[index])
                    ? {}
                    : {
                        boxShadow: `0 0 0 1px rgb(255 255 255 / ${0.22 + square.opacity})`,
                      }),
                }}
              />
            ))}
          </div>
          <span ref={catcherRef} className="hero-catcher" aria-hidden />
          {celebration ? (
            <ScoreCelebration
              key={`${celebration.board}-${celebration.rank}`}
              board={celebration.board}
              rank={celebration.rank}
              active
            />
          ) : null}
          {canPlay && (playing || frozen) ? (
            <div className="pointer-events-none absolute top-8 left-12 z-30">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2 font-display text-sm leading-none text-zinc-50 [text-shadow:0_1px_10px_rgb(0_0_0/0.85)]">
                <Wordmark boxed />
                <span
                  className="text-[11px] leading-none text-zinc-500"
                  aria-hidden
                >
                  ·
                </span>
                <span className="tabular-nums" aria-live="polite">
                  Level {level}
                </span>
                <span
                  className="text-[11px] leading-none text-zinc-500"
                  aria-hidden
                >
                  ·
                </span>
                <HudScore nodeRef={scoreNodeRef} />
                {playing ? (
                  <>
                    <span
                      className="text-[11px] leading-none text-zinc-500"
                      aria-hidden
                    >
                      ·
                    </span>
                    <HudLeftover nodeRef={leftoverNodeRef} />
                    <span
                      className="text-[11px] leading-none text-zinc-500"
                      aria-hidden
                    >
                      ·
                    </span>
                    <span className="font-sans text-[11px] leading-none font-normal text-zinc-400">
                      {`Avoid ${badsOnLevel(level)} bad egg${badsOnLevel(level) === 1 ? '' : 's'} without crashing.`}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          ) : null}
          {canPlay === true && !playing && !frozen && !hasPlayed ? (
            <div className={introShell}>
              <div className="max-w-2xl">
                <Wordmark as="h1" className={introTitle} />
                <p className={introCopy}>{siteDescription}</p>
                <button
                  type="button"
                  onClick={startRound}
                  className="pointer-events-auto mt-10 bg-brand px-14 py-4 text-base font-semibold text-white transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 motion-reduce:transition-none"
                >
                  Play Tiggl
                </button>
              </div>
            </div>
          ) : null}
          {canPlay === false && !playing && !frozen ? (
            <div className={blockedShell}>
              <div className="max-w-2xl">
                <Wordmark as="h1" className={introTitle} />
                <p className={introCopy}>
                  This version needs a mouse or trackpad. Open it on a computer
                  to play.
                </p>
              </div>
            </div>
          ) : null}
          {canPlay && (playing || frozen) ? (
            <div className="pointer-events-none absolute inset-x-12 bottom-8 z-30 flex items-center gap-8">
              {canPlay && (playing || frozen) ? (
                <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
                  {frozen ? (
                    <p
                      className={`flex h-11 items-center gap-3 px-4 ${
                        madeTen
                          ? 'bg-[#f0c75e] text-zinc-950'
                          : 'bg-brand text-white'
                      }`}
                      aria-label={resultLabel}
                    >
                      <span className="text-[11px] font-semibold tracking-widest uppercase">
                        {won ? 'Clear' : 'TIG!'}
                      </span>
                      <span className="text-[11px] font-semibold">
                        {won ? 'Ten levels.' : "You're caught!"}
                      </span>
                      <span
                        className={`text-[11px] leading-none ${
                          madeTen ? 'text-zinc-950/40' : 'text-white/50'
                        }`}
                        aria-hidden
                      >
                        ·
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-display text-lg leading-none font-semibold tabular-nums">
                          {formatScore(score)}
                        </span>
                        <span className="text-[11px] font-semibold tracking-widest uppercase">
                          pts
                        </span>
                      </span>
                      <span
                        className={`text-[11px] leading-none ${
                          madeTen ? 'text-zinc-950/40' : 'text-white/50'
                        }`}
                        aria-hidden
                      >
                        ·
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold tracking-widest uppercase">
                          Level
                        </span>
                        <span className="font-display text-lg leading-none font-semibold tabular-nums">
                          {level}
                        </span>
                      </span>
                      <span
                        className={`text-[11px] leading-none ${
                          madeTen ? 'text-zinc-950/40' : 'text-white/50'
                        }`}
                        aria-hidden
                      >
                        ·
                      </span>
                      <span className="font-display text-lg leading-none font-semibold tabular-nums">
                        {formatPlayTime(elapsedMs)}
                      </span>
                    </p>
                  ) : null}
                  <div className="flex items-center gap-4">
                    {frozen ? (
                      <button
                        type="button"
                        onClick={replayRound}
                        className={playLink}
                      >
                        Replay
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={exitGame}
                      className={playLink}
                    >
                      Exit
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="ml-auto flex items-center">
                {frozen && pendingHighScore && scoreOffer ? (
                  <HighScoreEntry
                    offer={scoreOffer}
                    saving={savingName}
                    nameError={nameError}
                    onSave={saveHighScore}
                    onSkip={() => {
                      void settlePendingScore();
                    }}
                  />
                ) : null}
                {frozen && boardMoved && !pendingHighScore ? (
                  <p className="whitespace-nowrap text-[11px] leading-none text-zinc-400">
                    {scoreMovedCopy}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <HighScores
        board={scoreBoard}
        rows={scoreBoardsRows[scoreBoard]}
        highlightId={scoreHighlightId}
        listError={scoresError}
        loading={scoresLoading}
        plays={playCounts}
        onBoardChange={setScoreBoard}
        fluid={blocked}
      />
    </div>
  );
};
