// SPDX-License-Identifier: MPL-2.0
/** Dev-only stroke preview: see preview.html. */
import "@fontsource/noto-sans-hebrew/400.css";
import { length, resample, type Stroke } from "./lib/geometry";
import { scripts } from "./lib/script";

const COLORS = ["#d33", "#26c", "#2a2", "#c80", "#a3c", "#088"];
const NS = "http://www.w3.org/2000/svg";
const el = (name: string, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

await document.fonts.load('100px "Noto Sans Hebrew"', "אבג");

const script = scripts[0];
const [, , W, H] = script.frame.viewBox;
const top = script.frame.guides.find((g) => g.kind === "top")!.y;
const base = script.frame.guides.find((g) => g.kind === "baseline")!.y;

// Scale the font so that the height of ה matches the distance top line → baseline.
const ctx = document.createElement("canvas").getContext("2d")!;
ctx.direction = "ltr";
ctx.textAlign = "left";
ctx.font = '100px "Noto Sans Hebrew"';
const m = ctx.measureText("ה");
const fontSize = (100 * (base - top)) / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
ctx.font = `${fontSize}px "Noto Sans Hebrew"`;

/**
 * How well do our strokes follow the font?
 *  inside – % of stroke centre-line points that lie on the font's ink (±1.5 units)
 *  cover  – % of the font's ink that is within 6 units of one of our strokes
 */
const S = 4; // canvas pixels per unit
const fits: Record<string, { inside: number; cover: number }> = {};
(window as unknown as { __fit: typeof fits }).__fit = fits;

function fit(char: string, x: number, strokes: Stroke[]) {
  const cv = document.createElement("canvas");
  cv.width = W * S;
  cv.height = H * S;
  const c = cv.getContext("2d", { willReadFrequently: true })!;
  c.direction = "ltr";
  c.font = `${fontSize * S}px "Noto Sans Hebrew"`;
  c.fillText(char, x * S, (base - m.actualBoundingBoxDescent * (fontSize / 100)) * S);
  const data = c.getImageData(0, 0, cv.width, cv.height).data;
  const ink = (ux: number, uy: number) => {
    const px = Math.round(ux * S), py = Math.round(uy * S);
    if (px < 0 || py < 0 || px >= cv.width || py >= cv.height) return false;
    return data[(py * cv.width + px) * 4 + 3] > 100;
  };
  const near = (ux: number, uy: number, r: number) => {
    for (let dx = -r; dx <= r; dx += 0.5) for (let dy = -r; dy <= r; dy += 0.5) if (ink(ux + dx, uy + dy)) return true;
    return false;
  };
  const pts = strokes.flatMap((s) => (s.kind === "dot" ? [s.at] : resample(s.points, Math.max(8, Math.round(length(s.points))))));
  const inside = pts.filter((p) => near(p.x, p.y, 1.5)).length / pts.length;
  let total = 0, covered = 0;
  for (let uy = 0; uy < H; uy += 1) {
    for (let ux = 0; ux < W; ux += 1) {
      if (!ink(ux, uy)) continue;
      total++;
      if (pts.some((p) => Math.hypot(p.x - ux, p.y - uy) <= 6)) covered++;
    }
  }
  return { inside: Math.round(inside * 100), cover: total ? Math.round((covered / total) * 100) : 0 };
}

// The fit numbers are an authoring aid; reviewers don't need them.
const showFit = ["localhost", "127.0.0.1"].includes(location.hostname);
const root = document.getElementById("grid")!;
let grid: HTMLElement = root;
let unit = -1;
for (const [index, g] of script.glyphs.entries()) {
  if (g.unit !== unit) {
    unit = g.unit;
    const h = document.createElement("h2");
    h.textContent = `Einheit / Unit ${unit + 1}`;
    grid = document.createElement("div");
    grid.className = "grid";
    root.append(h, grid);
  }
  const fig = document.createElement("figure");
  if (!g.verified) fig.classList.add("unverified");
  const svg = el("svg", { viewBox: script.frame.viewBox.join(" ") });
  for (const guide of script.frame.guides) svg.append(el("line", { x1: 0, x2: W, y1: guide.y, y2: guide.y, class: "guide" }));

  // Centre the font glyph horizontally on its ink (not on its advance width).
  const gm = ctx.measureText(g.char);
  const inkCentre = (gm.actualBoundingBoxRight - gm.actualBoundingBoxLeft) / 2;
  const x = W / 2 - inkCentre;
  const text = el("text", { x, y: base - m.actualBoundingBoxDescent * (fontSize / 100), class: "font", "font-size": fontSize, direction: "ltr" });
  text.textContent = g.char;
  svg.append(text);

  g.parsed.forEach((s, i) => {
    const c = COLORS[i % COLORS.length];
    if (s.kind === "dot") {
      svg.append(el("circle", { cx: s.at.x, cy: s.at.y, r: 3, fill: c }));
      return;
    }
    svg.append(el("path", { d: s.d, class: "stroke", stroke: c }));
    const a = s.points[0];
    const z = s.points[s.points.length - 1];
    const y = s.points[Math.max(0, s.points.length - 3)];
    svg.append(el("circle", { cx: a.x, cy: a.y, r: 2.6, fill: c }));
    const ang = Math.atan2(z.y - y.y, z.x - y.x);
    const p = (d: number, off: number) => `${z.x - Math.cos(ang + off) * d} ${z.y - Math.sin(ang + off) * d}`;
    svg.append(el("path", { d: `M${p(5, 0.5)} L${z.x} ${z.y} L${p(5, -0.5)}`, class: "stroke", stroke: c }));
    const n = el("text", { x: a.x + 3, y: a.y - 3, fill: c, class: "num" });
    n.textContent = String(i + 1);
    svg.append(n);
  });

  const f = fit(g.char, x, g.parsed);
  fits[g.id] = f;
  const cap = document.createElement("figcaption");
  const strokes = g.parsed.length;
  cap.innerHTML = `<span class="no">#${index + 1}</span><span class="he" lang="he">${g.char}</span> ${g.name.translit} · ${strokes} ${strokes === 1 ? "Strich" : "Striche"}`;
  if (showFit) cap.insertAdjacentHTML("beforeend", `<span class="fit">in ${f.inside}% · cover ${f.cover}%</span>`);
  fig.append(svg, cap);
  grid.append(fig);
}
