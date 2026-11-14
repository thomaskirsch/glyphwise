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

## How learning works

- **Practice rounds** of about 10 tasks (5 minutes): up to two new characters
  are introduced (animation + tracing), then asked again; earlier ones come
  back when they are due (spaced repetition with FSRS).
- **Task types** grow with experience: name the character → trace over a
  faint template → hear the name and pick the character → write it from
  memory → read real words made only of letters you already know.
- Wrong answers are never marked red; they come back once at the end of the round.
- A character is **mastered** after 6 attempts with at least 80 % right at the
  first try. The next unit opens when all characters of a unit are mastered.
- Daily goal = one round. Streak with up to two shields for missed days.
  No leaderboards, no account; progress stays on the device.

## Planned

- Hebrew: cursive and vowel points (nikud)
- Japanese hiragana & katakana (stroke data from KanjiVG), later kanji
- Korean Hangul, Arabic, Chinese …
- Export/import of progress, settings
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
| Progress, mastery, streak | `src/lib/progress.ts` |
| Building a practice round | `src/lib/session.ts` |
| Spaced repetition (FSRS) | `src/lib/scheduler.ts` |
| Animation | `src/components/StrokeAnimation.svelte` |
| Tracing field | `src/components/TraceField.svelte` |
| Speech | `src/lib/speech.ts` – uses the device's own voices, nothing is bundled |

## License

- **Code:** [Mozilla Public License 2.0](LICENSE) – free to use, change and share,
  also commercially; changed files must stay open under the same license.
- **Content** (stroke data, texts, memory aids): [CC BY-SA 4.0](LICENSE-content).
- Third-party material and its licenses: [CREDITS.md](CREDITS.md).
