// SPDX-License-Identifier: MPL-2.0
/**
 * The learner's progress for one script: per glyph, plus practice days.
 * Pure functions (no storage, no clock) so everything can be unit-tested;
 * load/save live at the bottom.
 */
import type { Script } from "./script";

/** Opaque scheduler state (an FSRS card); see scheduler.ts. */
export type CardState = Record<string, unknown> & { dueAt: string };

export type GlyphProgress = {
  introduced: boolean;
  /** graded attempts (first try of a task) */
  attempts: number;
  /** last 10 first-try results, 1 = right */
  recent: number[];
  card: CardState | null;
};

export type Progress = {
  version: 1;
  glyphs: Record<string, GlyphProgress>;
  /** days with a finished practice round, "YYYY-MM-DD", ascending */
  days: string[];
  /** days that were covered by a streak shield */
  shielded: string[];
  shields: number;
};

export type GlyphStatus = "locked" | "new" | "learning" | "mastered";

export const MASTERY_ATTEMPTS = 6;
export const MASTERY_ACCURACY = 0.8;
export const MAX_SHIELDS = 2;

export function emptyProgress(): Progress {
  return { version: 1, glyphs: {}, days: [], shielded: [], shields: 0 };
}

export function glyphProgress(p: Progress, id: string): GlyphProgress {
  return p.glyphs[id] ?? { introduced: false, attempts: 0, recent: [], card: null };
}

export function accuracy(g: GlyphProgress): number {
  return g.recent.length ? g.recent.reduce((a, b) => a + b, 0) / g.recent.length : 0;
}

/** "Sitzt": at least 6 graded attempts and 80 % right at the first try (last 10). */
export function isMastered(g: GlyphProgress): boolean {
  return g.attempts >= MASTERY_ATTEMPTS && accuracy(g) >= MASTERY_ACCURACY;
}

/** Number of units the learner may work on: the first, plus one per fully mastered unit. */
export function unlockedUnits(script: Script, p: Progress): number {
  let n = 1;
  for (let u = 0; u < script.units.length - 1; u++) {
    const done = script.units[u].glyphs.every((id) => isMastered(glyphProgress(p, id)));
    if (!done) break;
    n++;
  }
  return n;
}

export function glyphStatus(script: Script, p: Progress, id: string): GlyphStatus {
  const g = script.glyphs.find((x) => x.id === id);
  if (!g || g.unit >= unlockedUnits(script, p)) return "locked";
  const gp = glyphProgress(p, id);
  if (!gp.introduced) return "new";
  return isMastered(gp) ? "mastered" : "learning";
}

const stripMarks = (s: string) => s.replace(/[֑-ׇ]/g, "");

/** Words made only of letters the learner has already been introduced to. */
export function readableWords(script: Script, p: Progress) {
  const known = new Set(script.glyphs.filter((g) => glyphProgress(p, g.id).introduced).map((g) => g.char));
  return script.units.flatMap((u) => u.words).filter((w) => [...stripMarks(w.text)].every((c) => known.has(c)));
}

/** Mark a glyph as introduced (seen, animated and traced once). */
export function introduce(p: Progress, id: string, newCard: () => CardState): Progress {
  const g = glyphProgress(p, id);
  if (g.introduced) return p;
  return { ...p, glyphs: { ...p.glyphs, [id]: { ...g, introduced: true, card: g.card ?? newCard() } } };
}

/** Record a graded answer. `review` turns the old card into the next one. */
export function recordAnswer(
  p: Progress,
  id: string,
  firstTry: boolean,
  review: (card: CardState | null, right: boolean) => CardState,
): Progress {
  const g = glyphProgress(p, id);
  const next: GlyphProgress = {
    ...g,
    introduced: true,
    attempts: g.attempts + 1,
    recent: [...g.recent, firstTry ? 1 : 0].slice(-10),
    card: review(g.card, firstTry),
  };
  return { ...p, glyphs: { ...p.glyphs, [id]: next } };
}

// ---------------------------------------------------------------- days & streak

export function dayKey(d: Date): string {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

/** Consecutive practice days up to today (today may still be open). */
export function streak(p: Progress, today: string): number {
  const active = new Set([...p.days, ...p.shielded]);
  let day = active.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (active.has(day)) {
    if (p.days.includes(day)) n++;
    day = addDays(day, -1);
  }
  return n;
}

/** Call when a practice round is finished. Earns a shield every 7 days of streak. */
export function finishRound(p: Progress, today: string): Progress {
  if (p.days.includes(today)) return p;
  const next = { ...p, days: [...p.days, today].sort() };
  const s = streak(next, today);
  if (s > 0 && s % 7 === 0 && next.shields < MAX_SHIELDS) next.shields++;
  return next;
}

/**
 * Call on app start: if the learner had a streak and missed a few days,
 * shields cover those days automatically (if there are enough of them).
 */
export function applyShields(p: Progress, today: string): Progress {
  const last = [...p.days, ...p.shielded].sort().at(-1);
  if (!last || p.shields === 0) return p;
  const missed: string[] = [];
  for (let d = addDays(last, 1); d < today; d = addDays(d, 1)) missed.push(d);
  if (missed.length === 0 || missed.length > p.shields) return p;
  return { ...p, shielded: [...p.shielded, ...missed].sort(), shields: p.shields - missed.length };
}

export function practisedToday(p: Progress, today: string): boolean {
  return p.days.includes(today);
}

// ---------------------------------------------------------------- storage

const key = (scriptId: string) => `glyphwise.progress.${scriptId}`;

export function loadProgress(scriptId: string): Progress {
  try {
    const raw = localStorage.getItem(key(scriptId));
    if (!raw) return emptyProgress();
    const p = JSON.parse(raw) as Progress;
    return p.version === 1 ? { ...emptyProgress(), ...p } : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(scriptId: string, p: Progress): void {
  try {
    localStorage.setItem(key(scriptId), JSON.stringify(p));
  } catch {
    /* storage unavailable – progress lasts for this visit only */
  }
}
