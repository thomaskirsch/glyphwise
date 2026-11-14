<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Compact introduction of one character: looping stroke animation, name, sound, buttons. -->
<script lang="ts">
  import StrokeAnimation from "./StrokeAnimation.svelte";
  import { lang, t } from "../lib/i18n";
  import { prefs, say, toggleLoop } from "../lib/prefs.svelte";
  import type { Glyph, Script } from "../lib/script";

  let { glyph, script, replay = $bindable(0) }: { glyph: Glyph; script: Script; replay?: number } = $props();

  function loop() {
    toggleLoop();
    if (prefs.loop) replay++;
  }
</script>

<section class="card intro">
  <button class="anim-box" onclick={() => replay++} aria-label={t.watch}>
    <StrokeAnimation {glyph} frame={script.frame} {replay} loop={prefs.loop} />
  </button>
  <div>
    <div class="name-row">
      <span class="big" lang="he">{glyph.char}</span>
      <h2>{glyph.name.translit} <span lang="he" class="native">{glyph.name.native}</span></h2>
    </div>
    <p class="sound"><span class="label">{t.sound}</span> {glyph.sound[lang]}</p>
    <div class="row">
      <button class="icon" onclick={() => replay++} aria-label={t.watch} title={t.watch}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14l11-7z" /></svg>
      </button>
      <button class="icon toggle" class:on={prefs.loop} onclick={loop} aria-pressed={prefs.loop} aria-label={t.loop} title={t.loop}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" /></svg>
      </button>
      <button class="icon" onclick={() => say(glyph.say, script.language)} aria-label={t.listen} title={t.listen}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 8a5 5 0 0 1 0 8M18.5 5.5a8.5 8.5 0 0 1 0 13" /></svg>
      </button>
    </div>
  </div>
</section>

<style>
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
  h2 {
    margin: 0;
    font-size: 1.05rem;
  }
  .sound {
    margin: 4px 0 0;
    font-size: 0.95rem;
  }
</style>
