# Stroke data format

Every script lives in its own folder: `src/data/scripts/<script-id>/`

| File | Content |
|---|---|
| `script.json` | name, language (BCP 47, e.g. `he-IL`), writing direction, drawing frame, units (lessons) |
| `glyphs.json` | one entry per character |
| `CREDITS.md` | where everything comes from |

## Drawing frame

`frame.viewBox` is `[0, 0, 100, 132]` for Hebrew: a character is about 100
units wide; `guides` are the helper lines (top line y = 35, baseline y = 95).
Ascenders (ל) go up to about y = 12, descenders (ך ן ף ץ ק) down to about y = 125.

## A glyph

```json
"vav": {
  "char": "ו",
  "name": { "native": "וָו", "translit": "Vav" },
  "sound": { "de": "w – oder Vokal o / u", "en": "v – or the vowel o / u" },
  "say": "וָו",
  "example": { "text": "וָו", "translit": "vav", "meaning": { "de": "Haken", "en": "hook" } },
  "mnemonic": { "de": "…", "en": "…" },
  "strokes": ["M40 36 L56 36 L56 95"],
  "verified": false
}
```

- `strokes` – in writing order. Each stroke is the **centre line** of the
  stroke as an SVG path, drawn **in writing direction**.
  - Allowed commands: absolute `M L H V Q C Z` only (no lowercase, no arcs).
    This keeps the data usable without a browser (tests, importers).
  - `"P x y"` is a dot (dagesh, the shin dot, dakuten …).
- `say` – text for the speech engine; use vowel points so it is pronounced correctly.
- `verified` – `true` only after a native speaker or teacher confirmed the strokes.

## Checking

`npm run check:data` validates every pack. `npm test` checks that every
stroke is accepted when traced with a slightly shaky hand.
