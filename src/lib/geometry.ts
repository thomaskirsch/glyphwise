// SPDX-License-Identifier: MPL-2.0
/**
 * Geometry helpers for stroke data.
 *
 * Stroke format (see docs/stroke-format.md):
 *   - An SVG path string with ABSOLUTE commands only: M, L, H, V, Q, C, Z.
 *     The path is the centre line of the stroke, in writing direction.
 *   - "P x y" is a dot (e.g. a dagesh, the shin dot, a dakuten).
 * Arcs (A) are intentionally not supported so that the data can be sampled
 * without a browser (unit tests, data checks, importers).
 */

export type Point = { x: number; y: number };
export type Stroke = { kind: "path"; d: string; points: Point[] } | { kind: "dot"; d: string; at: Point };

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function isDot(d: string): boolean {
  return d.trim().startsWith("P");
}

/** Turn a stroke string into a polyline (or a dot). `step` = max segment length for curves. */
export function parseStroke(d: string, step = 2): Stroke {
  if (isDot(d)) {
    const [x, y] = d.trim().slice(1).trim().split(/[\s,]+/).map(Number);
    return { kind: "dot", d, at: { x, y } };
  }
  const tokens = d.match(/[MLHVQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const pts: Point[] = [];
  let i = 0;
  let cmd = "";
  let cur: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  const num = () => {
    const n = Number(tokens[i++]);
    if (Number.isNaN(n)) throw new Error(`Bad number in stroke "${d}"`);
    return n;
  };
  const push = (p: Point) => {
    const last = pts[pts.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) pts.push(p);
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) {
      cmd = tokens[i++];
      if (cmd !== cmd.toUpperCase()) throw new Error(`Relative commands are not allowed: "${cmd}" in "${d}"`);
    }
    switch (cmd) {
      case "M":
        cur = { x: num(), y: num() };
        start = cur;
        push(cur);
        cmd = "L"; // implicit lineto after moveto
        break;
      case "L":
        cur = { x: num(), y: num() };
        push(cur);
        break;
      case "H":
        cur = { x: num(), y: cur.y };
        push(cur);
        break;
      case "V":
        cur = { x: cur.x, y: num() };
        push(cur);
        break;
      case "Q": {
        const c = { x: num(), y: num() };
        const e = { x: num(), y: num() };
        const n = Math.max(2, Math.ceil((dist(cur, c) + dist(c, e)) / step));
        for (let k = 1; k <= n; k++) {
          const t = k / n, u = 1 - t;
          push({ x: u * u * cur.x + 2 * u * t * c.x + t * t * e.x, y: u * u * cur.y + 2 * u * t * c.y + t * t * e.y });
        }
        cur = e;
        break;
      }
      case "C": {
        const c1 = { x: num(), y: num() };
        const c2 = { x: num(), y: num() };
        const e = { x: num(), y: num() };
        const n = Math.max(2, Math.ceil((dist(cur, c1) + dist(c1, c2) + dist(c2, e)) / step));
        for (let k = 1; k <= n; k++) {
          const t = k / n, u = 1 - t;
          push({
            x: u * u * u * cur.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * e.x,
            y: u * u * u * cur.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * e.y,
          });
        }
        cur = e;
        break;
      }
      case "Z":
        cur = start;
        push(cur);
        break;
      default:
        throw new Error(`Unsupported command "${cmd}" in stroke "${d}"`);
    }
  }
  if (pts.length === 0) throw new Error(`Empty stroke "${d}"`);
  return { kind: "path", d, points: pts };
}

export function length(points: Point[]): number {
  let l = 0;
  for (let i = 1; i < points.length; i++) l += dist(points[i - 1], points[i]);
  return l;
}

/** Resample a polyline to exactly n points, evenly spaced along its length. */
export function resample(points: Point[], n = 32): Point[] {
  if (points.length === 0) return [];
  const total = length(points);
  if (points.length === 1 || total === 0) return Array.from({ length: n }, () => ({ ...points[0] }));
  const out: Point[] = [{ ...points[0] }];
  const stepLen = total / (n - 1);
  let acc = 0;
  let i = 1;
  let prev = points[0];
  while (out.length < n - 1 && i < points.length) {
    const seg = dist(prev, points[i]);
    if (acc + seg >= stepLen && seg > 0) {
      const t = (stepLen - acc) / seg;
      const p = { x: prev.x + t * (points[i].x - prev.x), y: prev.y + t * (points[i].y - prev.y) };
      out.push(p);
      prev = p;
      acc = 0;
    } else {
      acc += seg;
      prev = points[i];
      i++;
    }
  }
  while (out.length < n) out.push({ ...points[points.length - 1] });
  return out;
}

/** Discrete Fréchet distance between two polylines of any length. */
export function frechet(a: Point[], b: Point[]): number {
  const n = a.length, m = b.length;
  const ca = new Float64Array(n * m);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const d = dist(a[i], b[j]);
      let v: number;
      if (i === 0 && j === 0) v = d;
      else if (i === 0) v = Math.max(ca[j - 1], d);
      else if (j === 0) v = Math.max(ca[(i - 1) * m], d);
      else v = Math.max(Math.min(ca[(i - 1) * m + j], ca[(i - 1) * m + j - 1], ca[i * m + j - 1]), d);
      ca[i * m + j] = v;
    }
  }
  return ca[n * m - 1];
}

export type Box = { minX: number; minY: number; maxX: number; maxY: number };

export function bbox(points: Point[]): Box {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Map points from one bounding box onto another with a uniform scale
 * (keeps the aspect ratio) and centred. Used in free-writing mode.
 */
export function fitInto(points: Point[], from: Box, to: Box): Point[] {
  const fw = from.maxX - from.minX, fh = from.maxY - from.minY;
  const tw = to.maxX - to.minX, th = to.maxY - to.minY;
  const s = Math.max(fw, fh) > 0 ? Math.max(tw, th) / Math.max(fw, fh) : 1;
  const fcx = (from.minX + from.maxX) / 2, fcy = (from.minY + from.maxY) / 2;
  const tcx = (to.minX + to.maxX) / 2, tcy = (to.minY + to.maxY) / 2;
  return points.map((p) => ({ x: tcx + (p.x - fcx) * s, y: tcy + (p.y - fcy) * s }));
}

export { dist };
