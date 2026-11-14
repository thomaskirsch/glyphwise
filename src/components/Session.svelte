<!-- SPDX-License-Identifier: MPL-2.0 -->
<!--
  One practice round: plays the tasks from session.ts one after another,
  reports first-try results, repeats wrong ones once and ends with a summary.
-->
<script lang="ts">
  import { untrack } from "svelte";
  import ChoiceTask from "./ChoiceTask.svelte";
  import GlyphIntro from "./GlyphIntro.svelte";
  import TraceField from "./TraceField.svelte";
  import { lang, t } from "../lib/i18n";
  import { say, voice } from "../lib/prefs.svelte";
  import type { Progress } from "../lib/progress";
  import type { Script } from "../lib/script";
  import { buildSession, isGlyphTask, repeatRound, type Task } from "../lib/session";

  let {
    script,
    progress,
    onintro,
    onresult,
    onfinish,
    onexit,
    onagain,
  }: {
    script: Script;
    progress: Progress;
    onintro: (glyph: string) => void;
    onresult: (glyph: string, firstTry: boolean) => void;
    /** the round counts as done (for the daily goal / streak) */
    onfinish: () => void;
    onexit: () => void;
    onagain: () => void;
  } = $props();

  const tasks: Task[] = untrack(() => buildSession(script, $state.snapshot(progress) as Progress));
  let phase = $state<"main" | "repeat" | "summary">("main");
  let queue = $state<Task[]>(tasks);
  let i = $state(0);
  let firstTry = $state<boolean[]>([]);
  let answered = $state(false);
  let replay = $state(0);

  const task = $derived(queue[i]);
  const glyphOf = (id: string) => script.glyphs.find((g) => g.id === id)!;
  const wordOf = (text: string) => script.units.flatMap((u) => u.words).find((w) => w.text === text)!;

  function grade(ok: boolean) {
    if (answered) return;
    answered = true;
    if (phase !== "main") return;
    firstTry[i] = ok;
    if (isGlyphTask(task) && task.kind !== "intro") onresult(task.glyph, ok);
  }

  function next() {
    if (!answered) grade(false); // moved on without solving it
    answered = false;
    if (i + 1 < queue.length) {
      i++;
      return;
    }
    if (phase === "main") {
      onfinish();
      const again = repeatRound(queue, firstTry);
      if (again.length) {
        phase = "repeat";
        queue = again;
        i = 0;
        return;
      }
    }
    phase = "summary";
  }

  // Side effects when a task appears: new letters count as introduced, listening tasks speak.
  $effect(() => {
    const current = task;
    if (phase === "summary" || !current) return;
    untrack(() => {
      if (current.kind === "intro") onintro(current.glyph);
      if (current.kind === "listen") say(glyphOf(current.glyph).say, script.language);
    });
  });

  const graded = tasks.map((x, k) => ({ x, k })).filter(({ x }) => x.kind !== "intro");
  const rightFirst = $derived(graded.filter(({ k }) => firstTry[k]).length);
  const learnedNow = tasks.filter((x) => x.kind === "intro").map((x) => (isGlyphTask(x) ? glyphOf(x.glyph) : null)).filter((g) => g !== null);
</script>

<main class="screen">
  <header>
    <button class="icon" onclick={onexit} aria-label={t.quit} title={t.quit}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    {#if phase === "summary"}
      <span class="title">{t.summaryTitle}</span>
    {:else}
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax={queue.length} aria-valuenow={i}>
        <div class="fill" class:repeat={phase === "repeat"} style:width="{(i / queue.length) * 100}%"></div>
      </div>
      <span class="count">{phase === "repeat" ? t.repeatTitle : t.taskOf(i + 1, queue.length)}</span>
    {/if}
  </header>

  {#if phase === "summary"}
    <section class="card summary">
      <svg class="check" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" /><path d="M14 25l7 7 13-15" /></svg>
      <h2>{t.summaryTitle}</h2>
      {#if graded.length}<p>{t.firstTry(rightFirst, graded.length)}</p>{/if}
      {#if learnedNow.length}
        <p><span class="label">{t.learnedNew}</span> <span class="he new">{learnedNow.map((g) => g.char).join("  ")}</span></p>
      {/if}
      <p class="note">{t.effort}</p>
      <div class="row center">
        <button onclick={onagain}>{t.practiceMore}</button>
        <button class="primary" onclick={onexit}>{t.toOverview}</button>
      </div>
    </section>
  {:else}
    {#key `${phase}-${i}`}
      <div class="content">
        {#if task.kind === "intro"}
          {@const g = glyphOf(task.glyph)}
          <p class="kicker">{t.newLetter}</p>
          <GlyphIntro glyph={g} {script} bind:replay />
          <p class="mnemonic"><span class="label">{t.mnemonic}</span> {g.mnemonic[lang]}</p>
          <div class="trace">
            <TraceField glyph={g} frame={script.frame} level={1} onfinish={grade} onnext={next} />
          </div>
        {:else if task.kind === "trace" || task.kind === "write"}
          {@const g = glyphOf(task.glyph)}
          <div class="ask card">
            <span>{task.kind === "trace" ? t.askTrace : t.askWrite}:</span>
            <strong>{g.name.translit}</strong>
            <span class="muted">({g.sound[lang]})</span>
            <button class="icon small" onclick={() => say(g.say, script.language)} aria-label={t.listen}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 8a5 5 0 0 1 0 8" /></svg>
            </button>
          </div>
          <div class="trace">
            <TraceField glyph={g} frame={script.frame} level={task.kind === "trace" ? 2 : 3} onfinish={grade} onnext={next} />
          </div>
        {:else if task.kind === "recognize"}
          {@const g = glyphOf(task.glyph)}
          <ChoiceTask
            correct={g.id}
            options={task.options.map((id) => ({ id, label: glyphOf(id).name.translit }))}
            onanswer={(ok) => {
              grade(ok);
              say(g.say, script.language);
            }}
            onnext={next}
          >
            {#snippet prompt()}
              <span class="kicker">{t.askName}</span>
              <span class="he prompt-glyph" lang="he">{g.char}</span>
            {/snippet}
          </ChoiceTask>
        {:else if task.kind === "listen"}
          {@const g = glyphOf(task.glyph)}
          <ChoiceTask correct={g.id} options={task.options.map((id) => ({ id, label: glyphOf(id).char, he: true }))} onanswer={grade} onnext={next}>
            {#snippet prompt()}
              <span class="kicker">{t.askGlyph}</span>
              <button class="listen" onclick={() => say(g.say, script.language)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 8a5 5 0 0 1 0 8M18.5 5.5a8.5 8.5 0 0 1 0 13" /></svg>
                <span class="prompt-name">{g.name.translit}</span>
              </button>
              <span class="muted">{g.sound[lang]}</span>
            {/snippet}
          </ChoiceTask>
        {:else if task.kind === "read"}
          {@const w = task.word}
          <ChoiceTask
            correct={w.text}
            options={task.options.map((text) => ({ id: text, label: wordOf(text).meaning[lang] }))}
            onanswer={(ok) => {
              grade(ok);
              say(w.text, script.language);
            }}
            onnext={next}
          >
            {#snippet prompt()}
              <span class="kicker">{t.askRead}</span>
              <button class="listen he prompt-word" lang="he" onclick={() => say(w.text, script.language)}>{w.text}</button>
              {#if answered}<span class="muted">{w.translit}</span>{/if}
            {/snippet}
          </ChoiceTask>
        {/if}
        {#if voice.missing && (task.kind === "listen" || task.kind === "read")}
          <p class="note">{t.noVoice}</p>
        {/if}
      </div>
    {/key}
  {/if}
</main>

<style>
  .screen {
    max-width: 640px;
    margin: 0 auto;
    padding: 8px 12px;
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .bar {
    flex: 1;
    height: 8px;
    border-radius: 99px;
    background: var(--line);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s;
  }
  .fill.repeat {
    background: var(--wet);
  }
  .count,
  .title {
    font-size: 0.9rem;
    color: var(--muted);
    white-space: nowrap;
  }
  .title {
    font-weight: 600;
    color: var(--text);
  }
  .content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }
  .kicker {
    margin: 0;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .mnemonic {
    margin: 0;
    font-size: 0.92rem;
  }
  .trace {
    flex: 1;
    min-height: 240px;
    display: flex;
    flex-direction: column;
  }
  .ask {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    flex-shrink: 0;
  }
  .muted {
    color: var(--muted);
  }
  button.small {
    width: 36px;
    min-height: 36px;
    margin-inline-start: auto;
  }
  .prompt-glyph {
    font-size: 5.5rem;
    line-height: 1.1;
  }
  .listen {
    font-size: 1.4rem;
    padding: 10px 18px;
  }
  .listen svg {
    width: 26px;
    height: 26px;
  }
  .prompt-name {
    font-weight: 600;
  }
  .prompt-word {
    font-size: 2.6rem;
    padding: 4px 18px;
  }
  .summary {
    margin-top: 10vh;
    text-align: center;
    padding: 24px 16px;
  }
  .summary h2 {
    margin: 8px 0;
  }
  .check {
    width: 64px;
    height: 64px;
    fill: none;
    stroke: var(--good);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .new {
    font-size: 1.8rem;
  }
  .row.center {
    justify-content: center;
    margin-top: 16px;
  }
</style>
