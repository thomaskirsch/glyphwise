// SPDX-License-Identifier: MPL-2.0
/**
 * Builds one practice round (about 10 tasks, 5–10 minutes).
 *
 *  - up to 2 new letters, each introduced (watch + trace) and asked again later
 *  - letters that are due for review (FSRS), then weak ones, then the rest
 *  - the task type grows with experience: recognise → trace → listen → write from memory
 *  - 1–2 words to read, made only of letters already introduced
 *  - letters that are easily confused with each other are used as wrong options
 */
import { accuracy, glyphProgress, glyphStatus, readableWords, type Progress } from "./progress";
import type { Glyph, Script } from "./script";

export type Word = Script["units"][number]["words"][number];

export type Task =
  | { kind: "intro"; glyph: string }
  | { kind: "recognize"; glyph: string; options: string[] } // see the letter → pick its name
  | { kind: "listen"; glyph: string; options: string[] } // hear/see the name → pick the letter
  | { kind: "trace"; glyph: string } // trace over a faint template
  | { kind: "write"; glyph: string } // write from memory, blank field
  | { kind: "read"; word: Word; options: string[] }; // read a word → pick its meaning

export type SessionOptions = { size?: number; maxNew?: number; now?: Date; rand?: () => number };

export const isGlyphTask = (t: Task): t is Extract<Task, { glyph: string }> => "glyph" in t;

export function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Wrong options: confusable letters first, then letters the learner knows, then the rest of the unit. */
export function distractors(script: Script, p: Progress, id: string, count: number, rand: () => number): string[] {
  const confusable = (script.confusable ?? []).filter((grp) => grp.includes(id)).flat();
  const seen = script.glyphs.filter((g) => glyphProgress(p, g.id).introduced).map((g) => g.id);
  const unit = script.glyphs.find((g) => g.id === id)!.unit;
  const sameUnit = script.glyphs.filter((g) => g.unit === unit).map((g) => g.id);
  const known = new Set(seen);
  const pick: string[] = [];
  const add = (ids: string[]) => {
    for (const x of shuffle(ids, rand)) if (x !== id && !pick.includes(x) && pick.length < count) pick.push(x);
  };
  add(confusable.filter((x) => known.has(x)));
  add(seen);
  add(sameUnit);
  return pick;
}

function optionsFor(script: Script, p: Progress, id: string, rand: () => number): string[] {
  return shuffle([id, ...distractors(script, p, id, 3, rand)], rand);
}

/** Which kind of task suits a letter, given how often it has been practised. */
function kindFor(attempts: number, acc: number, rand: () => number): "recognize" | "listen" | "trace" | "write" {
  const r = rand();
  if (attempts < 2) return r < 0.5 ? "recognize" : "trace";
  if (attempts < 5 || acc < 0.6) return r < 0.4 ? "listen" : r < 0.7 ? "trace" : "recognize";
  return r < 0.5 ? "write" : r < 0.8 ? "listen" : "recognize";
}

export function buildSession(script: Script, p: Progress, opts: SessionOptions = {}): Task[] {
  const { size = 10, maxNew = 2, now = new Date(), rand = Math.random } = opts;
  const status = (g: Glyph) => glyphStatus(script, p, g.id);

  // Don't pile up new letters while many are still shaky.
  const shaky = script.glyphs.filter((g) => status(g) === "learning").length;
  const newGlyphs = script.glyphs.filter((g) => status(g) === "new").slice(0, shaky >= 6 ? 0 : maxNew);

  const introduced = script.glyphs.filter((g) => glyphProgress(p, g.id).introduced);
  const due = introduced
    .filter((g) => {
      const c = glyphProgress(p, g.id).card;
      return c && new Date(c.dueAt) <= now;
    })
    .sort((a, b) => glyphProgress(p, a.id).card!.dueAt.localeCompare(glyphProgress(p, b.id).card!.dueAt));
  const weak = introduced.filter((g) => status(g) === "learning").sort((a, b) => accuracy(glyphProgress(p, a.id)) - accuracy(glyphProgress(p, b.id)));
  const rest = shuffle(introduced, rand);
  const pool: Glyph[] = [];
  for (const g of [...due, ...weak, ...rest]) if (!pool.includes(g)) pool.push(g);

  const words = readableWords(script, p);
  const readCount = words.length >= 2 ? 2 : words.length;

  // Task slots: intros + follow-ups for new letters, reading at the end, reviews fill the rest.
  const followUps: Task[] = newGlyphs.flatMap((g) => [
    { kind: "recognize", glyph: g.id, options: optionsFor(script, introduceVirtually(p, newGlyphs), g.id, rand) } as Task,
    { kind: "trace", glyph: g.id } as Task,
  ]);
  const reviewSlots = Math.max(0, size - newGlyphs.length - followUps.length - readCount);
  const reviews: Task[] = [];
  for (let i = 0; i < reviewSlots && pool.length; i++) {
    const g = pool[i % pool.length];
    const gp = glyphProgress(p, g.id);
    // Variety: never the same kind of task more than twice in a row.
    let kind = kindFor(gp.attempts, accuracy(gp), rand);
    const [a, b] = reviews.slice(-2).map((r) => r.kind);
    for (let tries = 0; tries < 6 && a === kind && b === kind; tries++) kind = kindFor(gp.attempts, accuracy(gp), rand);
    if (a === kind && b === kind) kind = kind === "write" ? "listen" : "recognize";
    reviews.push(kind === "recognize" || kind === "listen" ? { kind, glyph: g.id, options: optionsFor(script, p, g.id, rand) } : { kind, glyph: g.id });
  }

  // Order: first intro, a couple of reviews, second intro, then the rest mixed, reading last.
  const tasks: Task[] = [];
  const queue = [...reviews];
  newGlyphs.forEach((g, i) => {
    tasks.push({ kind: "intro", glyph: g.id });
    tasks.push(...queue.splice(0, i === 0 ? 2 : 1));
  });
  const middle = shuffle([...queue, ...followUps], rand);
  tasks.push(...middle);
  for (const w of shuffle(words, rand).slice(0, readCount)) tasks.push({ kind: "read", word: w, options: meaningOptions(script, w, rand) });
  return spreadOut(tasks);
}

/** Treat this round's new letters as known when picking wrong options for their follow-up questions. */
function introduceVirtually(p: Progress, glyphs: Glyph[]): Progress {
  const g = { ...p.glyphs };
  for (const x of glyphs) g[x.id] = { ...(g[x.id] ?? { attempts: 0, recent: [], card: null }), introduced: true };
  return { ...p, glyphs: g };
}

/** Meaning options for a word (language-independent: indices into all words). */
function meaningOptions(script: Script, word: Word, rand: () => number): string[] {
  const all = script.units.flatMap((u) => u.words);
  const others = shuffle(all.filter((w) => w.text !== word.text && w.meaning.en !== word.meaning.en), rand).slice(0, 3);
  return shuffle([word.text, ...others.map((w) => w.text)], rand);
}

/** Avoid the same letter twice in a row (an intro is always followed by something else first). */
function spreadOut(tasks: Task[]): Task[] {
  const out = [...tasks];
  const id = (t: Task) => (isGlyphTask(t) ? t.glyph : `w:${t.word.text}`);
  for (let i = 1; i < out.length; i++) {
    if (id(out[i]) !== id(out[i - 1]) || out[i].kind === "intro") continue;
    const j = out.findIndex((t, k) => k > i && id(t) !== id(out[i - 1]) && t.kind !== "intro" && t.kind !== "read");
    if (j > 0) [out[i], out[j]] = [out[j], out[i]];
  }
  // a follow-up must never come before its own intro
  for (let i = 0; i < out.length; i++) {
    const t = out[i];
    if (t.kind === "intro") continue;
    const intro = out.findIndex((x) => x.kind === "intro" && isGlyphTask(t) && x.glyph === t.glyph);
    if (intro > i) {
      out.splice(i, 1);
      out.splice(intro, 0, t);
      i--;
    }
  }
  return out;
}

/** Tasks answered wrongly at the first try come back once at the end (not graded again). */
export function repeatRound(tasks: Task[], firstTry: boolean[]): Task[] {
  return tasks.filter((t, i) => !firstTry[i] && t.kind !== "intro");
}
