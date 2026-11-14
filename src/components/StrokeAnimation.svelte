<!-- SPDX-License-Identifier: MPL-2.0 -->
<!--
  Shows how a character is written: stroke by stroke, with a start dot.
  Ported from the "alpha" project (schreibe()): Web Animations on
  stroke-dashoffset, always raced against a timeout so a background tab
  can never block the sequence.
-->
<script lang="ts">
  import type { Glyph, ScriptMeta } from "../lib/script";

  let {
    glyph,
    frame,
    replay = 0,
    tempo = 70,
    loop = false,
  }: { glyph: Glyph; frame: ScriptMeta["frame"]; replay?: number; tempo?: number; loop?: boolean } = $props();

  /** Pause between two loop passes, with the finished character visible. */
  const LOOP_PAUSE = 1800;

  let els: (SVGPathElement | SVGCircleElement | undefined)[] = $state([]);
  let start: { x: number; y: number } | null = $state(null);
  let current = $state(-1);
  let run = 0;

  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function play(g: Glyph) {
    const my = ++run;
    current = -1;
    for (const el of els) {
      if (!el) continue;
      el.getAnimations().forEach((a) => a.cancel());
      el.style.visibility = "hidden";
    }
    await wait(400);
    for (let i = 0; i < g.parsed.length; i++) {
      if (my !== run) return;
      const s = g.parsed[i];
      const el = els[i];
      if (!el) continue;
      current = i;
      start = s.kind === "dot" ? s.at : s.points[0];
      await wait(reduced ? 500 : 380);
      if (my !== run) return;
      el.style.visibility = "visible";
      if (s.kind === "path" && !reduced && el instanceof SVGPathElement) {
        const len = el.getTotalLength();
        const duration = (len / tempo) * 1000;
        const anim = el.animate([{ strokeDasharray: `${len}`, strokeDashoffset: len }, { strokeDasharray: `${len}`, strokeDashoffset: 0 }], {
          duration,
          easing: "ease-in-out",
          fill: "both",
        });
        await Promise.race([anim.finished.catch(() => {}), wait(duration + 600)]);
        anim.cancel();
      }
      start = null;
      await wait(reduced ? 300 : 220);
    }
    if (my !== run) return;
    current = -1;
    // `loop` is read now, so switching it off simply ends after the current pass.
    if (loop) {
      await wait(LOOP_PAUSE);
      if (my === run && loop) play(g);
    }
  }

  $effect(() => {
    void replay;
    const g = glyph;
    // wait one frame so the elements of a new glyph are bound
    requestAnimationFrame(() => play(g));
    return () => {
      run++;
    };
  });
</script>

<svg class="anim" viewBox={frame.viewBox.join(" ")} aria-label={glyph.name.translit} role="img">
  {#each frame.guides as g}
    <line class="guide" x1="0" x2={frame.viewBox[2]} y1={g.y} y2={g.y} />
  {/each}
  <g class="template" stroke-width={frame.strokeWidth}>
    {#each glyph.parsed as s}
      {#if s.kind === "dot"}
        <circle cx={s.at.x} cy={s.at.y} r={frame.strokeWidth / 2 + 0.5} />
      {:else}
        <path d={s.d} />
      {/if}
    {/each}
  </g>
  <g class="ink" stroke-width={frame.strokeWidth}>
    {#each glyph.parsed as s, i (glyph.id + i)}
      {#if s.kind === "dot"}
        <circle bind:this={els[i]} cx={s.at.x} cy={s.at.y} r={frame.strokeWidth / 2 + 0.5} style="visibility:hidden" />
      {:else}
        <path bind:this={els[i]} d={s.d} style="visibility:hidden" class:active={current === i} />
      {/if}
    {/each}
  </g>
  {#if start}
    <circle class="start" cx={start.x} cy={start.y} r="5" />
  {/if}
</svg>

<style>
  .anim {
    width: 100%;
    height: 100%;
    display: block;
  }
  .guide {
    stroke: var(--guide);
    stroke-width: 0.6;
  }
  .template :global(path),
  .ink :global(path) {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .template {
    stroke: var(--template);
    fill: var(--template);
  }
  .ink {
    stroke: var(--ink);
    fill: var(--ink);
  }
  .start {
    fill: var(--accent);
  }
</style>
