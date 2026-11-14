// SPDX-License-Identifier: MPL-2.0
/** Types and loading for script packs in src/data/scripts/<id>/. */
import { parseStroke, type Stroke } from "./geometry";
import hebrewPrintMeta from "../data/scripts/hebrew-print/script.json";
import hebrewPrintGlyphs from "../data/scripts/hebrew-print/glyphs.json";

export type Localized = { de: string; en: string };

export type GlyphData = {
  char: string;
  name: { native: string; translit: string };
  sound: Localized;
  say: string;
  example: { text: string; translit: string; meaning: Localized };
  mnemonic: Localized;
  strokes: string[];
  verified: boolean;
};

export type ScriptMeta = {
  id: string;
  name: Localized & { native: string };
  language: string;
  direction: "rtl" | "ltr";
  license: string;
  status: string;
  frame: { viewBox: [number, number, number, number]; strokeWidth: number; guides: { y: number; kind: string }[] };
  units: { id: string; glyphs: string[]; words: { text: string; translit: string; meaning: Localized }[] }[];
};

/** `unit` is the index of the lesson unit the glyph belongs to. */
export type Glyph = GlyphData & { id: string; unit: number; parsed: Stroke[] };
export type Script = ScriptMeta & { glyphs: Glyph[] };

/** Glyphs come out in learning order: unit by unit, in the order listed there. */
export function buildScript(meta: ScriptMeta, glyphs: Record<string, GlyphData>): Script {
  const ordered = meta.units.flatMap((u, unit) =>
    u.glyphs.map((id) => ({ ...glyphs[id], id, unit, parsed: glyphs[id].strokes.map((s) => parseStroke(s)) })),
  );
  return { ...meta, glyphs: ordered };
}

export const scripts: Script[] = [
  // JSON imports are typed loosely (number[] instead of a tuple); tools/check-data.mjs validates the shape.
  buildScript(hebrewPrintMeta as unknown as ScriptMeta, hebrewPrintGlyphs as Record<string, GlyphData>),
];
