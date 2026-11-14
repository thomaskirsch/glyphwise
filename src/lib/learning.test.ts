// SPDX-License-Identifier: MPL-2.0
import { beforeAll, describe, expect, it } from "vitest";
import {
  applyShields,
  emptyProgress,
  finishRound,
  glyphStatus,
  introduce,
  isMastered,
  readableWords,
  recordAnswer,
  streak,
  unlockedUnits,
  type CardState,
  type Progress,
} from "./progress";
import { initScheduler, isDue, newCard, review } from "./scheduler";
import { buildSession, isGlyphTask, repeatRound } from "./session";
import { scripts } from "./script";

const script = scripts[0];
const fakeCard = (): CardState => ({ dueAt: "2000-01-01T00:00:00.000Z" });
const fakeReview = () => fakeCard();

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Master a list of glyphs: introduce + 6 right answers each. */
function master(p: Progress, ids: string[]): Progress {
  for (const id of ids) {
    p = introduce(p, id, fakeCard);
    for (let i = 0; i < 6; i++) p = recordAnswer(p, id, true, fakeReview);
  }
  return p;
}

describe("mastery and units", () => {
  it("a letter counts as mastered after 6 attempts with at least 80 % right", () => {
    let p = introduce(emptyProgress(), "shin", fakeCard);
    for (let i = 0; i < 5; i++) p = recordAnswer(p, "shin", true, fakeReview);
    expect(isMastered(p.glyphs.shin)).toBe(false);
    p = recordAnswer(p, "shin", true, fakeReview);
    expect(isMastered(p.glyphs.shin)).toBe(true);
    p = recordAnswer(p, "shin", false, fakeReview);
    p = recordAnswer(p, "shin", false, fakeReview);
    expect(isMastered(p.glyphs.shin)).toBe(false); // 6 of 8 = 75 %
  });

  it("only the first unit is open at the start; the next opens when a unit is mastered", () => {
    const p0 = emptyProgress();
    expect(unlockedUnits(script, p0)).toBe(1);
    expect(glyphStatus(script, p0, "shin")).toBe("new");
    expect(glyphStatus(script, p0, "alef")).toBe("locked");
    const p1 = master(p0, script.units[0].glyphs);
    expect(unlockedUnits(script, p1)).toBe(2);
    expect(glyphStatus(script, p1, "alef")).toBe("new");
  });

  it("counts readable words only from introduced letters", () => {
    expect(readableWords(script, emptyProgress())).toHaveLength(0);
    let p = emptyProgress();
    for (const id of ["shin", "lamed", "vav", "mem-final"]) p = introduce(p, id, fakeCard);
    expect(readableWords(script, p).map((w) => w.translit)).toEqual(["shalom", "lo"]);
  });
});

describe("streak and shields", () => {
  it("counts consecutive days and keeps today open", () => {
    let p = emptyProgress();
    p = finishRound(p, "2026-11-10");
    p = finishRound(p, "2026-11-11");
    expect(streak(p, "2026-11-12")).toBe(2); // today not done yet – streak still alive
    p = finishRound(p, "2026-11-12");
    expect(streak(p, "2026-11-12")).toBe(3);
    expect(streak(p, "2026-11-14")).toBe(0); // a day was missed
  });

  it("earns a shield after 7 days and uses it for one missed day", () => {
    let p = emptyProgress();
    for (let d = 1; d <= 7; d++) p = finishRound(p, `2026-11-0${d}`);
    expect(p.shields).toBe(1);
    p = applyShields(p, "2026-11-09"); // the 8th was missed
    expect(p.shields).toBe(0);
    expect(streak(p, "2026-11-09")).toBe(7);
  });

  it("does not waste shields on a gap that is too long", () => {
    let p = emptyProgress();
    for (let d = 1; d <= 7; d++) p = finishRound(p, `2026-11-0${d}`);
    p = applyShields(p, "2026-11-12");
    expect(p.shields).toBe(1);
  });
});

describe("practice round", () => {
  it("starts with two new letters, introduced before they are asked", () => {
    const tasks = buildSession(script, emptyProgress(), { rand: rng(1) });
    expect(tasks.filter((t) => t.kind === "intro").map((t) => isGlyphTask(t) && t.glyph)).toEqual(["shin", "lamed"]);
    for (const [i, t] of tasks.entries()) {
      if (t.kind === "intro" || !isGlyphTask(t)) continue;
      const intro = tasks.findIndex((x) => x.kind === "intro" && isGlyphTask(x) && x.glyph === t.glyph);
      if (intro >= 0) expect(intro).toBeLessThan(i);
    }
  });

  it("never offers locked letters as answers and always includes the right one", () => {
    let p = master(emptyProgress(), ["shin", "lamed"]);
    for (let seed = 1; seed < 30; seed++) {
      for (const t of buildSession(script, p, { rand: rng(seed) })) {
        if (t.kind !== "recognize" && t.kind !== "listen") continue;
        expect(t.options).toContain(t.glyph);
        expect(new Set(t.options).size).toBe(t.options.length);
        for (const o of t.options) expect(script.glyphs.find((g) => g.id === o)!.unit).toBe(0);
      }
    }
  });

  it("has about 10 tasks once some letters are known, and reads words", () => {
    const p = master(emptyProgress(), script.units[0].glyphs);
    const tasks = buildSession(script, p, { rand: rng(3) });
    expect(tasks.length).toBeGreaterThanOrEqual(9);
    expect(tasks.length).toBeLessThanOrEqual(10);
    expect(tasks.some((t) => t.kind === "read")).toBe(true);
  });

  it("does not put the same letter twice in a row", () => {
    const p = master(emptyProgress(), script.units[0].glyphs);
    for (let seed = 1; seed < 30; seed++) {
      const tasks = buildSession(script, p, { rand: rng(seed) });
      for (let i = 1; i < tasks.length; i++) {
        const a = tasks[i - 1], b = tasks[i];
        if (isGlyphTask(a) && isGlyphTask(b) && a.kind !== "intro") expect(a.glyph === b.glyph && b.kind !== "intro", `seed ${seed} at ${i}`).toBe(false);
      }
    }
  });

  it("never has the same kind of review task three times in a row", () => {
    const p = master(emptyProgress(), script.units[0].glyphs);
    for (let seed = 1; seed < 50; seed++) {
      const kinds = buildSession(script, p, { rand: rng(seed) }).map((t) => t.kind).filter((k) => k !== "read");
      for (let i = 2; i < kinds.length; i++) expect(kinds[i] === kinds[i - 1] && kinds[i] === kinds[i - 2], `seed ${seed}: ${kinds}`).toBe(false);
    }
  });

  it("repeats wrong answers once at the end", () => {
    const tasks = buildSession(script, emptyProgress(), { rand: rng(1) });
    const right = tasks.map((_, i) => i !== 2);
    expect(repeatRound(tasks, right)).toEqual(tasks[2].kind === "intro" ? [] : [tasks[2]]);
  });
});

describe("FSRS scheduler", () => {
  beforeAll(initScheduler);

  it("schedules a right answer days ahead and a wrong one soon", () => {
    const now = new Date("2026-11-14T10:00:00Z");
    const good = review(newCard(now), true, now);
    const bad = review(newCard(now), false, now);
    expect(new Date(good.dueAt).getTime()).toBeGreaterThan(new Date(bad.dueAt).getTime());
    expect(isDue(good, now)).toBe(false);
    // survives a JSON round trip (how it is stored)
    const again = review(JSON.parse(JSON.stringify(good)), true, new Date(good.dueAt));
    expect(new Date(again.dueAt).getTime()).toBeGreaterThan(new Date(good.dueAt).getTime());
  });
});
