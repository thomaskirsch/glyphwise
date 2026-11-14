// SPDX-License-Identifier: MPL-2.0
/** UI strings. Add a language by adding a key with the same shape. */
const de = {
  tagline: "Schriften lernen, Strich für Strich",
  unverified: "Strichfolge noch ungeprüft",
  unverifiedHint: "Die Strichreihenfolge folgt üblichen Lehrkonventionen und wurde noch nicht von Muttersprachlern geprüft.",
  watch: "Vormachen",
  loop: "Animation wiederholen",
  listen: "Anhören",
  noVoice: "Keine hebräische Stimme auf diesem Gerät. In den Einstellungen unter „Sprachausgabe“ kann man sie nachladen.",
  sound: "Laut",
  example: "Beispiel",
  mnemonic: "Merkhilfe",
  level: "Stufe",
  levels: { 1: "Vorlage", 2: "Blass", 3: "Frei" } as Record<number, string>,
  traceHint: { 1: "Fahre die Vorlage nach. Starte beim Punkt.", 2: "Zeichne über die blasse Vorlage.", 3: "Schreib das Zeichen frei." } as Record<number, string>,
  good: ["Gut.", "Sauber.", "Genau so."],
  reason: {
    shape: "Noch nicht ganz – schau dir die Form noch einmal an.",
    direction: "Die Richtung ist umgekehrt. Starte am Punkt.",
    order: "Richtiger Strich, aber noch nicht dran.",
    length: "Zieh den Strich ganz durch.",
    count: "Es fehlen noch Striche.",
  } as Record<string, string>,
  shown: "Ich zeige dir diesen Strich – weiter mit dem nächsten.",
  done: "Geschafft!",
  doneFree: "Richtig geschrieben!",
  again: "Nochmal",
  next: "Weiter",
  undo: "Strich zurück",
  check: "Prüfen",
  strokeOf: (n: number, total: number) => `Strich ${n} von ${total}`,
};

const en: typeof de = {
  tagline: "Learn scripts stroke by stroke",
  unverified: "Stroke order not yet reviewed",
  unverifiedHint: "Stroke order follows common teaching conventions and has not been reviewed by native speakers yet.",
  watch: "Show me",
  loop: "Repeat animation",
  listen: "Listen",
  noVoice: "No Hebrew voice on this device. You can install one in the system settings under “Text-to-speech”.",
  sound: "Sound",
  example: "Example",
  mnemonic: "Memory aid",
  level: "Level",
  levels: { 1: "Guided", 2: "Faint", 3: "Free" },
  traceHint: { 1: "Trace the template. Start at the dot.", 2: "Draw over the faint template.", 3: "Write the character freely." },
  good: ["Good.", "Neat.", "Exactly."],
  reason: {
    shape: "Not quite – have another look at the shape.",
    direction: "The direction is reversed. Start at the dot.",
    order: "Right stroke, but not yet.",
    length: "Draw the whole stroke.",
    count: "Some strokes are still missing.",
  },
  shown: "Here is this stroke – carry on with the next one.",
  done: "Done!",
  doneFree: "Written correctly!",
  again: "Again",
  next: "Next",
  undo: "Undo stroke",
  check: "Check",
  strokeOf: (n, total) => `Stroke ${n} of ${total}`,
};

export type Lang = "de" | "en";
export const lang: Lang = (globalThis.navigator?.language ?? "en").toLowerCase().startsWith("de") ? "de" : "en";
export const t = { de, en }[lang];
