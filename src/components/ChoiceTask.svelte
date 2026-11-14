<!-- SPDX-License-Identifier: MPL-2.0 -->
<!--
  Multiple choice. A wrong pick is never shown in red: it just fades out and
  can't be picked again (as in the earlier "alpha" project). The task is
  solved when the right option is picked; only the first try counts.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { t } from "../lib/i18n";

  type Option = { id: string; label: string; sub?: string; he?: boolean };

  let {
    prompt,
    options,
    correct,
    onanswer,
    onnext,
  }: {
    prompt: Snippet;
    options: Option[];
    correct: string;
    /** called once, when the right option is found */
    onanswer: (firstTry: boolean) => void;
    onnext: () => void;
  } = $props();

  let wrong = $state<string[]>([]);
  let solved = $state(false);
  let praise = $state("");

  function pick(o: Option) {
    if (solved || wrong.includes(o.id)) return;
    if (o.id === correct) {
      solved = true;
      praise = t.right[Math.floor(Math.random() * t.right.length)];
      onanswer(wrong.length === 0);
    } else {
      wrong = [...wrong, o.id];
    }
  }
</script>

<div class="task">
  <div class="prompt card">{@render prompt()}</div>

  <div class="options">
    {#each options as o (o.id)}
      <button
        class="option"
        class:he={o.he}
        class:out={wrong.includes(o.id)}
        class:hit={solved && o.id === correct}
        lang={o.he ? "he" : undefined}
        onclick={() => pick(o)}
        aria-disabled={solved || wrong.includes(o.id)}
      >
        <span class="main">{o.label}</span>
        {#if o.sub}<span class="sub" lang="he">{o.sub}</span>{/if}
      </button>
    {/each}
  </div>

  <div class="foot">
    <p class="msg" class:ok={solved} aria-live="polite">
      {#if solved}{praise}{:else if wrong.length}{t.tryAgain}{/if}
    </p>
    {#if solved}
      <button class="primary" onclick={onnext}>{t.next}</button>
    {/if}
  </div>
</div>

<style>
  .task {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .prompt {
    min-height: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
  }
  .options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .option {
    min-height: 64px;
    justify-content: center;
    flex-direction: column;
    gap: 2px;
    font-size: 1.05rem;
    transition: opacity 0.2s;
  }
  .option.he .main {
    font-family: var(--font-he);
    font-size: 2.1rem;
    line-height: 1.1;
  }
  .sub {
    font-family: var(--font-he);
    color: var(--muted);
    font-size: 0.9rem;
  }
  .option.out {
    opacity: 0.35;
    border-style: dashed;
    cursor: default;
  }
  .option.hit {
    border-color: var(--good);
    box-shadow: 0 0 0 2px var(--good);
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 48px;
  }
  .msg {
    margin: 0;
    color: var(--muted);
  }
  .msg.ok {
    color: var(--good);
    font-weight: 600;
  }
</style>
