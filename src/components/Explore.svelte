<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Free practice: every character, animation on top, tracing field below, three levels. -->
<script lang="ts">
  import GlyphIntro from "./GlyphIntro.svelte";
  import TraceField from "./TraceField.svelte";
  import { lang, t } from "../lib/i18n";
  import type { Level } from "../lib/matcher";
  import { say, voice } from "../lib/prefs.svelte";
  import type { Script } from "../lib/script";

  let { script, start = 0, onback }: { script: Script; start?: number; onback: () => void } = $props();

  // svelte-ignore state_referenced_locally
  let index = $state(start);
  let level = $state<Level>(1);
  let replay = $state(0);
  let tabs: HTMLButtonElement[] = $state([]);
  const glyph = $derived(script.glyphs[index]);

  function select(i: number) {
    index = i;
    replay++;
    // keep the current letter visible in the (horizontally scrolling) letter bar
    tabs[i]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }

  $effect(() => {
    tabs[start]?.scrollIntoView({ block: "nearest", inline: "center" });
  });
</script>

<main>
  <!-- On phones these three parts fill exactly one screen height. -->
  <div class="screen">
    <header>
      <button class="icon" onclick={onback} aria-label={t.back} title={t.back}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
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

    <GlyphIntro {glyph} {script} bind:replay />

    <section class="card practice">
      <div class="levels" role="radiogroup" aria-label={t.level}>
        {#each [1, 2, 3] as const as l}
          <button role="radio" aria-checked={level === l} class:selected={level === l} onclick={() => (level = l)}>
            <span class="num">{l}</span>{t.levels[l]}
          </button>
        {/each}
      </div>
      {#key `${glyph.id}-${level}`}
        <TraceField {glyph} frame={script.frame} {level} onnext={() => select((index + 1) % script.glyphs.length)} />
      {/key}
    </section>
  </div>

  <section class="card details">
    <p>
      <span class="label">{t.example}</span>
      <button class="word" lang="he" onclick={() => say(glyph.example.text, script.language)}>{glyph.example.text}</button>
      {glyph.example.translit} – {glyph.example.meaning[lang]}
    </p>
    <p><span class="label">{t.mnemonic}</span> {glyph.mnemonic[lang]}</p>
    {#if voice.missing}
      <p class="note">{t.noVoice}</p>
    {/if}
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
    .screen > :global(.intro) {
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
    gap: 10px;
    flex-shrink: 0;
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
</style>
