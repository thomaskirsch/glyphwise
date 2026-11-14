// SPDX-License-Identifier: MPL-2.0
/**
 * Judges hand-drawn strokes against reference strokes.
 *
 * Idea (similar to Hanzi Writer, MIT): resample both lines to the same number
 * of points, compare their shape with the discrete Fréchet distance and their
 * direction with the average cosine of corresponding segments.
 * All distances are in glyph units (a glyph is roughly 100 units tall).
 */
import { bbox, dist, fitInto, frechet, length, resample, type Point, type Stroke } from "./geometry";

export type Level = 1 | 2 | 3;

export type Tolerance = {
  /** max Fréchet distance between drawn and reference stroke */
  shape: number;
  /** drawn length / reference length must be within [minLen, maxLen] */
  minLen: number;
  maxLen: number;
  /** min average direction cosine (−1 … 1) */
  minDir: number;
  /** max distance of a tap/dot from a reference dot */
  dot: number;
};

/** Level 1: template + start point + arrow. Level 2: faint template. Level 3: blank field. */
export const TOLERANCE: Record<Level, Tolerance> = {
  1: { shape: 22, minLen: 0.35, maxLen: 2.0, minDir: 0.2, dot: 16 },
  2: { shape: 17, minLen: 0.45, maxLen: 1.7, minDir: 0.35, dot: 13 },
  // Level 3 compares after normalising the whole drawing, so a bit more room.
  3: { shape: 20, minLen: 0.45, maxLen: 1.8, minDir: 0.35, dot: 16 },
};

export type Reason = "shape" | "direction" | "order" | "length" | "count";
export type Verdict =
  | { ok: true; quality: number }
  | { ok: false; reason: Reason; matched?: number };

const N = 32;
const DIR_N = 9;
/** Below this length a drawn stroke counts as a tap. */
const TAP = 6;

function directionSimilarity(a: Point[], b: Point[]): number {
  let sum = 0, count = 0;
  for (let i = 1; i < a.length; i++) {
    const ax = a[i].x - a[i - 1].x, ay = a[i].y - a[i - 1].y;
    const bx = b[i].x - b[i - 1].x, by = b[i].y - b[i - 1].y;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (la < 1e-6 || lb < 1e-6) continue;
    sum += (ax * bx + ay * by) / (la * lb);
    count++;
  }
  return count ? sum / count : 1;
}

function centroid(points: Point[]): Point {
  const s = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / points.length, y: s.y / points.length };
}

/** Compare one drawn line with one reference stroke. */
export function compareStroke(drawn: Point[], ref: Stroke, tol: Tolerance): Verdict {
  if (drawn.length === 0) return { ok: false, reason: "shape" };
  const drawnLen = length(drawn);

  if (ref.kind === "dot") {
    if (drawnLen > tol.dot) return { ok: false, reason: "shape" };
    const d = dist(centroid(drawn), ref.at);
    return d <= tol.dot ? { ok: true, quality: 1 - d / tol.dot } : { ok: false, reason: "shape" };
  }

  if (drawnLen < TAP) return { ok: false, reason: "length" };
  // Lengths are measured on a coarse version, so jitter doesn't inflate them.
  const ca = resample(drawn, DIR_N), cb = resample(ref.points, DIR_N);
  const smoothLen = length(ca), refLen = length(cb);
  const ratio = smoothLen / refLen;
  // Very short reference strokes (e.g. the head of a vav) get an absolute minimum.
  if (ratio > tol.maxLen && smoothLen - refLen > 10) return { ok: false, reason: "length" };
  if (ratio < tol.minLen && refLen - smoothLen > 10) return { ok: false, reason: "length" };

  const a = resample(drawn, N);
  const b = resample(ref.points, N);
  const f = frechet(a, b);
  // Direction is compared on the coarse version too, so that a shaky hand
  // (many tiny zigzags) doesn't look like "wrong direction".
  const dir = directionSimilarity(ca, cb);
  if (f <= tol.shape && dir >= tol.minDir) return { ok: true, quality: Math.max(0, 1 - f / tol.shape) };

  const rev = [...b].reverse();
  if (frechet(a, rev) <= tol.shape && directionSimilarity(ca, [...cb].reverse()) >= tol.minDir) return { ok: false, reason: "direction" };
  return { ok: false, reason: "shape" };
}

/**
 * Judge the stroke the learner just drew while tracing (levels 1 and 2).
 * `expected` is the index of the stroke that should come next; `done`
 * lists the indices already accepted. If the drawing fits a different,
 * still missing stroke, the verdict is "order".
 */
export function judgeStroke(drawn: Point[], strokes: Stroke[], expected: number, level: Level): Verdict {
  const tol = TOLERANCE[level];
  const v = compareStroke(drawn, strokes[expected], tol);
  if (v.ok) return v;
  for (let j = expected + 1; j < strokes.length; j++) {
    if (compareStroke(drawn, strokes[j], tol).ok) return { ok: false, reason: "order", matched: j };
  }
  return v;
}

export type CharacterVerdict = { ok: boolean; strokes: Verdict[]; reason?: Reason };

/**
 * Judge a whole character written freely (level 3): the drawing is first
 * scaled and moved onto the reference, then every stroke is compared in order.
 */
export function judgeCharacter(drawn: Point[][], strokes: Stroke[], level: Level = 3): CharacterVerdict {
  const tol = TOLERANCE[level];
  const usable = drawn.filter((s) => s.length > 0);
  if (usable.length !== strokes.length) return { ok: false, strokes: [], reason: "count" };

  const refPoints = strokes.flatMap((s) => (s.kind === "dot" ? [s.at] : s.points));
  const from = bbox(usable.flat()), to = bbox(refPoints);
  const fitted = usable.map((s) => fitInto(s, from, to));

  const verdicts: Verdict[] = fitted.map((s, i) => {
    const v = compareStroke(s, strokes[i], tol);
    if (v.ok) return v;
    for (let j = 0; j < strokes.length; j++) {
      if (j !== i && compareStroke(s, strokes[j], tol).ok) return { ok: false, reason: "order", matched: j } as Verdict;
    }
    return v;
  });
  const firstFail = verdicts.find((v) => !v.ok);
  return { ok: !firstFail, strokes: verdicts, reason: firstFail && !firstFail.ok ? firstFail.reason : undefined };
}
