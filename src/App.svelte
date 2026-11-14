<!-- SPDX-License-Identifier: MPL-2.0 -->
<script lang="ts">
  import StrokeAnimation from "./components/StrokeAnimation.svelte";
  import TraceField from "./components/TraceField.svelte";
  import { lang, t } from "./lib/i18n";
  import type { Level } from "./lib/matcher";
  import { scripts } from "./lib/script";
  import { loadSetting, saveSetting } from "./lib/settings";
  import { hasVoice, speak } from "./lib/speech";

  const script = scripts[0];
  let index = $state(0);
  let level = $state<Level>(1);
  let replay = $state(0);
  let voiceMissing = $state(false);
  // Animation repeats by default; the choice is remembered for all characters.
  let loop = $state(loadSetting("loopAnimation", true));
  const glyph = $derived(script.glyphs[index]);

  hasVoice(script.language).then((ok) => (voiceMissing = !ok));

  function toggleLoop() {
    loop = !loop;
    saveSetting("loopAnimation", loop);
    if (loop) replay++;
  }

  function say(text: string) {
    if (!speak(text, script.language)) voiceMissing = true;
  }

  let tabs: HTMLButtonElement[] = $state([]);

  function select(i: number) {
    index = i;
    replay++;
    // keep the current letter visible in the (horizontally scrolling) letter bar
    tabs[i]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }

  function nextGlyph() {
    select((index + 1) % script.glyphs.length);
  }
</script>

<main>
  <!-- On phones these three parts fill exactly one screen height. -->
  <div class="screen">
    <header>
      <div class="brand">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="logo"><path d="M5 18c3-1 4-6 6-10s4-4 6-2-1 6-4 8" /></svg>
        <h1>Glyphwise</h1>
      </div>
      <nav class="glyphs" dir={script.direction} aria-label={script.name[lang]}>
        {#each script.glyphs as g, i}
          <button
            class="glyph-tab"
            class:selected={i === index}
            class:unit-start={i > 0 && g.unit !== script.glyphs[i - 1].unit}
            lang="he"
            onclick={() => select(i)}
            aria-pressed={i === index}
            bind:this={tabs[i]}>{g.char}</button
          >
        {/each}
      </nav>
    </header>

    <section class="card intro">
      <button class="anim-box" onclick={() => replay++} aria-label={t.watch}>
        <StrokeAnimation {glyph} frame={script.frame} {replay} {loop} />
      </button>
      <div class="info">
        <div class="name-row">
          <span class="big" lang="he">{glyph.char}</span>
          <h2>{glyph.name.translit} <span lang="he" class="native">{glyph.name.native}</span></h2>
        </div>
        <p class="sound"><span class="label">{t.sound}</span> {glyph.sound[lang]}</p>
        <div class="row">
          <button class="icon" onclick={() => replay++} aria-label={t.watch} title={t.watch}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14l11-7z" /></svg>
          </button>
          <button class="icon toggle" class:on={loop} onclick={toggleLoop} aria-pressed={loop} aria-label={t.loop} title={t.loop}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" /></svg>
          </button>
          <button class="icon" onclick={() => say(glyph.say)} aria-label={t.listen} title={t.listen}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 8a5 5 0 0 1 0 8M18.5 5.5a8.5 8.5 0 0 1 0 13" /></svg>
          </button>
        </div>
      </div>
    </section>

    <section class="card practice">
      <div class="levels" role="radiogroup" aria-label={t.level}>
        {#each [1, 2, 3] as const as l}
          <button role="radio" aria-checked={level === l} class:selected={level === l} onclick={() => (level = l)}>
            <span class="num">{l}</span>{t.levels[l]}
          </button>
        {/each}
      </div>
      {#key `${glyph.id}-${level}`}
        <TraceField {glyph} frame={script.frame} {level} onnext={nextGlyph} />
      {/key}
    </section>
  </div>

  <section class="card details">
    <p>
      <span class="label">{t.example}</span>
      <button class="word" lang="he" onclick={() => say(glyph.example.text)}>{glyph.example.text}</button>
      {glyph.example.translit} – {glyph.example.meaning[lang]}
    </p>
    <p><span class="label">{t.mnemonic}</span> {glyph.mnemonic[lang]}</p>
    {#if voiceMissing}
      <p class="note">{t.noVoice}</p>
    {/if}
    <p class="note">{script.name[lang]} · {t.tagline}</p>
    {#if !glyph.verified}
      <p class="badge" title={t.unverifiedHint}>{t.unverified}</p>
    {/if}
  </section>
</main>

<style>
  main {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 12px 24px;
  }

  /* ---------- phones: one screen = header + intro + practice ---------- */
  .screen {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 8px;
    padding-bottom: 8px;
  }
  .practice {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .details {
    margin-top: 4px;
  }

  /* ---------- wide screens: two columns ---------- */
  @media (min-width: 840px) {
    main {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto auto 1fr;
      grid-template-areas: "header header" "intro practice" "details practice";
      gap: 14px;
      padding: 16px 16px 32px;
      align-items: start;
    }
    .screen {
      display: contents;
    }
    header {
      grid-area: header;
    }
    .intro {
      grid-area: intro;
    }
    .practice {
      grid-area: practice;
    }
    .details {
      grid-area: details;
      margin-top: 0;
    }
  }

  header {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .brand {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-shrink: 0;
  }
  .logo {
    width: 26px;
    height: 26px;
    fill: none;
    stroke: var(--accent);
    stroke-width: 2.4;
    stroke-linecap: round;
  }
  h1 {
    font-size: 1.05rem;
    margin: 0;
  }
  .glyphs {
    flex: 1;
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .glyph-tab {
    font-family: var(--font-he);
    font-size: 1.35rem;
    min-width: 44px;
    height: 44px;
    padding: 0;
    justify-content: center;
    flex-shrink: 0;
  }
  /* a little extra space marks where a new lesson unit begins */
  .glyph-tab.unit-start {
    margin-inline-start: 10px;
  }
  .glyph-tab.selected,
  .levels button.selected,
  .toggle.on {
    background: var(--ink);
    color: var(--surface);
    border-color: var(--ink);
  }

  .card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 10px;
  }
  @media (min-width: 840px) {
    .card {
      padding: 16px;
    }
  }

  .intro {
    display: grid;
    grid-template-columns: 84px 1fr;
    gap: 12px;
    align-items: center;
    flex-shrink: 0;
  }
  @media (min-width: 840px) {
    .intro {
      grid-template-columns: 180px 1fr;
    }
  }
  .anim-box {
    display: block;
    padding: 0;
    min-height: 0;
    background: var(--surface);
    border-radius: 12px;
    border: 1px solid var(--line);
    aspect-ratio: 100 / 132;
    width: 100%;
  }
  .name-row {
    display: flex;
    gap: 8px;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .big {
    font-family: var(--font-he);
    font-size: 2rem;
    line-height: 1;
  }
  h2 {
    margin: 0;
    font-size: 1.05rem;
  }
  .native {
    font-family: var(--font-he);
    font-weight: 400;
  }
  .sound {
    margin: 4px 0 0;
    font-size: 0.95rem;
  }
  .row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  .icon {
    width: 44px;
    padding: 0;
    justify-content: center;
  }

  .levels {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    flex-shrink: 0;
  }
  .levels button {
    justify-content: center;
    padding: 6px 8px;
  }
  .num {
    font-weight: 700;
    margin-inline-end: 4px;
  }

  .details p {
    margin: 6px 0;
  }
  .word {
    font-family: var(--font-he);
    font-size: 1.15rem;
    min-height: 36px;
    padding: 2px 10px;
    margin-inline-end: 6px;
  }
  .label {
    display: inline-block;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin-inline-end: 6px;
  }
  .note {
    font-size: 0.9rem;
    color: var(--muted);
  }
  .badge {
    display: inline-block;
    font-size: 0.8rem;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--badge);
    color: var(--badge-text);
  }
</style>
