# Glyphwise

**Learn to read and write non-Latin scripts – stroke by stroke.**

Glyphwise shows how a character is written (animated, stroke by stroke) and
lets you trace it with your finger or a stylus underneath – first over a
template, then over a faint one, finally freely. Each stroke is checked for
shape, direction and order.

It is made for adults: calm, no ads, no account, no tracking.

> **Status: early prototype.** Hebrew print script, all 27 letter forms
> (22 letters + 5 final forms) in 6 lesson units.
> The Hebrew stroke order follows common teaching conventions but has **not
> yet been reviewed by native speakers** – help is very welcome
> (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## Planned

- Hebrew: cursive and vowel points (nikud), reading the unit words
- Japanese hiragana & katakana (stroke data from KanjiVG), later kanji
- Korean Hangul, Arabic, Chinese …
- Spaced repetition (FSRS), recognition and listening exercises, reading real words early
- Android app (Capacitor), iOS app, installable web app (PWA)

## Try it

**https://thomaskirsch.github.io/glyphwise/** – runs in any modern browser,
on a phone too. Built automatically from `main`.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5180 – also reachable from a phone in the same Wi-Fi
npm test           # unit tests for the stroke matcher
npm run check:data # validates all script packs
```

## How it works

| Part | Where |
|---|---|
| Stroke data per script | `src/data/scripts/<script>/` – format: [docs/stroke-format.md](docs/stroke-format.md) |
| Stroke judging (Fréchet distance + direction) | `src/lib/matcher.ts` |
| Animation | `src/components/StrokeAnimation.svelte` |
| Tracing field | `src/components/TraceField.svelte` |
| Speech | `src/lib/speech.ts` – uses the device's own voices, nothing is bundled |

## License

- **Code:** [Mozilla Public License 2.0](LICENSE) – free to use, change and share,
  also commercially; changed files must stay open under the same license.
- **Content** (stroke data, texts, memory aids): [CC BY-SA 4.0](LICENSE-content).
- Third-party material and its licenses: [CREDITS.md](CREDITS.md).
