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

export type Glyph = GlyphData & { id: string; parsed: Stroke[] };
export type Script = ScriptMeta & { glyphs: Glyph[] };

export function buildScript(meta: ScriptMeta, glyphs: Record<string, GlyphData>): Script {
  return {
    ...meta,
    glyphs: Object.entries(glyphs).map(([id, g]) => ({ ...g, id, parsed: g.strokes.map((s) => parseStroke(s)) })),
  };
}

export const scripts: Script[] = [
  // JSON imports are typed loosely (number[] instead of a tuple); tools/check-data.mjs validates the shape.
  buildScript(hebrewPrintMeta as unknown as ScriptMeta, hebrewPrintGlyphs as Record<string, GlyphData>),
];
