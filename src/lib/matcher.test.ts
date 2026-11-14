// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import { frechet, parseStroke, resample, type Point } from "./geometry";
import { compareStroke, judgeCharacter, judgeStroke, TOLERANCE } from "./matcher";
import { scripts } from "./script";

/** Deterministic pseudo-random numbers so tests never flake. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Simulate a hand: reference points with a little wobble. */
function wobble(points: Point[], amount: number, seed = 1): Point[] {
  const r = rng(seed);
  return resample(points, 40).map((p) => ({ x: p.x + (r() - 0.5) * 2 * amount, y: p.y + (r() - 0.5) * 2 * amount }));
}

const hebrew = scripts[0];
const glyph = (id: string) => hebrew.glyphs.find((g) => g.id === id)!;
const pts = (id: string, i: number) => {
  const s = glyph(id).parsed[i];
  if (s.kind !== "path") throw new Error("expected a path");
  return s.points;
};

describe("geometry", () => {
  it("parses lines and curves into polylines", () => {
    const s = parseStroke("M0 0 L10 0 Q20 0 20 10");
    expect(s.kind).toBe("path");
    if (s.kind === "path") {
      expect(s.points[0]).toEqual({ x: 0, y: 0 });
      expect(s.points.at(-1)).toEqual({ x: 20, y: 10 });
    }
  });

  it("rejects relative commands and arcs", () => {
    expect(() => parseStroke("m0 0 l10 0")).toThrow();
    expect(() => parseStroke("M0 0 A5 5 0 0 1 10 0")).toThrow();
  });

  it("resamples to the requested number of evenly spaced points", () => {
    const r = resample([{ x: 0, y: 0 }, { x: 31, y: 0 }], 32);
    expect(r).toHaveLength(32);
    expect(r[1].x).toBeCloseTo(1);
    expect(r[31].x).toBeCloseTo(31);
  });

  it("Fréchet distance is 0 for identical lines and grows with offset", () => {
    const a = resample([{ x: 0, y: 0 }, { x: 50, y: 0 }], 20);
    const b = a.map((p) => ({ x: p.x, y: p.y + 5 }));
    expect(frechet(a, a)).toBe(0);
    expect(frechet(a, b)).toBeCloseTo(5);
  });
});

describe("tracing (levels 1 and 2)", () => {
  it("accepts every reference stroke drawn with a slightly shaky hand", () => {
    for (const g of hebrew.glyphs) {
      g.parsed.forEach((s, i) => {
        if (s.kind !== "path") return;
        for (const level of [1, 2] as const) {
          const v = judgeStroke(wobble(s.points, 3, i + 7), g.parsed, i, level);
          expect(v.ok, `${g.id} stroke ${i} level ${level}`).toBe(true);
        }
      });
    }
  });

  it("detects a stroke drawn backwards", () => {
    const backwards = [...pts("vav", 0)].reverse();
    const v = judgeStroke(backwards, glyph("vav").parsed, 0, 1);
    expect(v).toEqual({ ok: false, reason: "direction" });
  });

  it("detects a stroke drawn in the wrong order", () => {
    // bet: the floor (stroke 2) drawn before the roof and wall (stroke 1)
    const v = judgeStroke(wobble(pts("bet", 1), 2), glyph("bet").parsed, 0, 1);
    expect(v).toEqual({ ok: false, reason: "order", matched: 1 });
  });

  it("rejects a scribble in the wrong place", () => {
    const scribble = [{ x: 10, y: 120 }, { x: 30, y: 125 }, { x: 15, y: 110 }, { x: 35, y: 118 }];
    expect(judgeStroke(scribble, glyph("lamed").parsed, 0, 1).ok).toBe(false);
  });

  it("rejects a tap where a line is expected", () => {
    const v = compareStroke([{ x: 56, y: 60 }], glyph("vav").parsed[0], TOLERANCE[1]);
    expect(v).toEqual({ ok: false, reason: "length" });
  });

  it("is stricter on level 2 than on level 1", () => {
    const shifted = pts("vav", 0).map((p) => ({ x: p.x + 19, y: p.y }));
    expect(judgeStroke(shifted, glyph("vav").parsed, 0, 1).ok).toBe(true);
    expect(judgeStroke(shifted, glyph("vav").parsed, 0, 2).ok).toBe(false);
  });
});

describe("free writing (level 3)", () => {
  const shrinkAndMove = (p: Point) => ({ x: p.x * 0.6 + 30, y: p.y * 0.6 + 10 });

  it("accepts a smaller, shifted but correct character", () => {
    const g = glyph("shin");
    const drawn = g.parsed.map((s, i) => (s.kind === "path" ? wobble(s.points, 1.5, i).map(shrinkAndMove) : []));
    expect(judgeCharacter(drawn, g.parsed).ok).toBe(true);
  });

  it("reports a wrong stroke count", () => {
    const g = glyph("mem");
    expect(judgeCharacter([pts("mem", 0)], g.parsed)).toMatchObject({ ok: false, reason: "count" });
  });

  it("reports swapped strokes as wrong order", () => {
    const g = glyph("bet");
    const v = judgeCharacter([pts("bet", 1), pts("bet", 0)], g.parsed);
    expect(v.ok).toBe(false);
    expect(v.strokes[0]).toMatchObject({ ok: false, reason: "order" });
  });
});
