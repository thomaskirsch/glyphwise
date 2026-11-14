<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Start screen: today's practice, streak, and a grid of all characters by unit. -->
<script lang="ts">
  import { lang, t } from "../lib/i18n";
  import {
    accuracy,
    dayKey,
    glyphProgress,
    glyphStatus,
    practisedToday,
    readableWords,
    streak,
    type Progress,
  } from "../lib/progress";
  import { say } from "../lib/prefs.svelte";
  import type { Script } from "../lib/script";

  let {
    script,
    progress,
    ready,
    onpractice,
    onexplore,
  }: { script: Script; progress: Progress; ready: boolean; onpractice: () => void; onexplore: (index: number) => void } = $props();

  const today = dayKey(new Date());
  const done = $derived(practisedToday(progress, today));
  const days = $derived(streak(progress, today));
  const words = $derived(readableWords(script, progress));
  const statuses = $derived(Object.fromEntries(script.glyphs.map((g) => [g.id, glyphStatus(script, progress, g.id)])));
  const masteredCount = $derived(Object.values(statuses).filter((s) => s === "mastered").length);
  const unverified = $derived(script.glyphs.some((g) => !g.verified));
</script>

<main>
  <header>
    <svg viewBox="0 0 24 24" aria-hidden="true" class="logo"><path d="M5 18c3-1 4-6 6-10s4-4 6-2-1 6-4 8" /></svg>
    <h1>Glyphwise</h1>
    <span class="script">{script.name[lang]}</span>
  </header>

  <section class="card today">
    <div class="status">
      <span class="dot" class:on={done}>
        {#if done}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" /></svg>{/if}
      </span>
      <div>
        <strong>{done ? t.todayDone : t.todayOpen}</strong>
        {#if days > 0}<div class="muted">{t.streak(days)}</div>{/if}
        {#if progress.shields > 0}<div class="muted small">{t.shields(progress.shields)}</div>{/if}
      </div>
    </div>
    <button class="primary big-button" onclick={onpractice} disabled={!ready}>
      {done ? t.practiceMore : t.practice}
      <span class="sub">{t.practiceSub}</span>
    </button>
  </section>

  <section class="card progress">
    <p class="stats">
      <strong>{t.mastered(masteredCount, script.glyphs.length)}</strong>
      {#if words.length}· {t.readable(words.length)}{/if}
    </p>
    {#if words.length}
      <div class="words" dir={script.direction}>
        {#each words as w}
          <button class="chip" lang="he" title="{w.translit} – {w.meaning[lang]}" onclick={() => say(w.text, script.language)}>{w.text}</button>
        {/each}
      </div>
    {/if}

    {#each script.units as u, ui}
      <div class="unit">
        <span class="label">{t.unit(ui + 1)}</span>
        <div class="cells" dir={script.direction}>
          {#each script.glyphs.filter((g) => g.unit === ui) as g}
            {@const s = statuses[g.id]}
            {@const acc = accuracy(glyphProgress(progress, g.id))}
            <button
              class="cell {s}"
              lang="he"
              title="{g.name.translit} – {t.status[s]}"
              aria-label="{g.name.translit}, {t.status[s]}"
              onclick={() => onexplore(script.glyphs.indexOf(g))}
            >
              {g.char}
              {#if s === "learning"}<span class="meter" style:width="{Math.max(8, acc * 100)}%"></span>{/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
    <p class="note">{t.gridHint}</p>
    <button onclick={() => onexplore(0)}>{t.allLetters}</button>
  </section>

  <footer class="note">
    {#if unverified}<span class="badge" title={t.unverifiedHint}>{t.unverified}</span>{/if}
    <a href="https://github.com/thomaskirsch/glyphwise" target="_blank" rel="noopener">GitHub</a>
  </footer>
</main>

<style>
  main {
    max-width: 640px;
    margin: 0 auto;
    padding: 12px 12px 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h1 {
    font-size: 1.1rem;
    margin: 0;
  }
  .script {
    margin-inline-start: auto;
    color: var(--muted);
    font-size: 0.9rem;
  }
  .today {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }
  .status {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .dot {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid var(--line);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .dot.on {
    background: var(--good);
    border-color: var(--good);
  }
  .dot svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: #fff;
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .muted {
    color: var(--muted);
    font-size: 0.92rem;
  }
  .small {
    font-size: 0.82rem;
  }
  .big-button {
    justify-content: center;
    flex-direction: column;
    gap: 0;
    font-size: 1.2rem;
    font-weight: 600;
    min-height: 64px;
  }
  .big-button .sub {
    font-size: 0.8rem;
    font-weight: 400;
    opacity: 0.85;
  }
  .stats {
    margin: 0 0 8px;
  }
  .words {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }
  .chip {
    font-family: var(--font-he);
    font-size: 1.1rem;
    min-height: 36px;
    padding: 2px 10px;
    border-radius: 99px;
  }
  .unit {
    margin: 10px 0;
  }
  .cells {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }
  .cell {
    position: relative;
    width: 48px;
    height: 52px;
    padding: 0;
    justify-content: center;
    font-family: var(--font-he);
    font-size: 1.5rem;
    overflow: hidden;
  }
  .cell.locked {
    opacity: 0.35;
    border-style: dashed;
  }
  .cell.new {
    border-color: var(--accent);
  }
  .cell.mastered {
    background: var(--ink);
    color: var(--surface);
    border-color: var(--ink);
  }
  .meter {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 4px;
    background: var(--accent);
  }
  footer {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }
  footer a {
    color: var(--muted);
  }
</style>
