<!-- SPDX-License-Identifier: MPL-2.0 -->
<!--
  The field where the learner writes. Levels:
    1 – full template, start dot and arrow for the current stroke
    2 – faint template only
    3 – blank; the whole character is judged at the end
  Levels 1 and 2 judge each stroke as soon as the pen/finger lifts.
  Accepted strokes snap to the clean reference line.
-->
<script lang="ts">
  import type { Point } from "../lib/geometry";
  import { judgeCharacter, judgeStroke, type Level } from "../lib/matcher";
  import type { Glyph, ScriptMeta } from "../lib/script";
  import { t } from "../lib/i18n";

  let {
    glyph,
    frame,
    level,
    onfinish,
    onnext,
  }: {
    glyph: Glyph;
    frame: ScriptMeta["frame"];
    level: Level;
    onfinish?: (firstTry: boolean) => void;
    /** shows a "Next" button that is always reachable below the field */
    onnext?: () => void;
  } = $props();

  type Msg = { kind: "ok" | "hint" | "done"; text: string } | null;

  let svg: SVGSVGElement | undefined = $state();
  let accepted = $state<number[]>([]); // indices of accepted / shown strokes
  let freeStrokes = $state<Point[][]>([]); // level 3: what the learner drew
  let drawing = $state<Point[] | null>(null);
  let fails = $state(0); // failed attempts on the current stroke
  let anyFail = $state(false);
  let message: Msg = $state(null);
  let finished = $state(false);
  let flash = $state(false); // brief red-free "try again" pulse on the field
  let failedFree = $state(false);

  let pointerId: number | null = null;
  let lastPen = 0;

  const next = $derived(accepted.length);
  const total = $derived(glyph.parsed.length);
  const guideStroke = $derived(level === 1 && !finished ? glyph.parsed[next] : undefined);

  // The parent re-creates this component ({#key}) when the character or level changes.
  function reset() {
    accepted = [];
    freeStrokes = [];
    drawing = null;
    fails = 0;
    anyFail = false;
    message = null;
    finished = false;
    failedFree = false;
  }

  function toLocal(e: PointerEvent): Point {
    const m = svg!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  }

  function down(e: PointerEvent) {
    if (finished || pointerId !== null) return;
    if (e.pointerType === "pen") lastPen = Date.now();
    // Palm rejection: while a pen is in use, ignore touches.
    if (e.pointerType === "touch" && Date.now() - lastPen < 2000) return;
    pointerId = e.pointerId;
    svg!.setPointerCapture(e.pointerId);
    drawing = [toLocal(e)];
    if (message?.kind !== "done") message = null;
    e.preventDefault();
  }

  function move(e: PointerEvent) {
    if (e.pointerId !== pointerId || !drawing) return;
    if (e.pointerType === "pen") lastPen = Date.now();
    const events = e.getCoalescedEvents?.() ?? [e];
    const pts = drawing;
    for (const ev of events.length ? events : [e]) {
      const p = toLocal(ev);
      const last = pts[pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) > 0.4) pts.push(p);
    }
    drawing = pts;
  }

  function up(e: PointerEvent) {
    if (e.pointerId !== pointerId || !drawing) return;
    pointerId = null;
    const stroke = drawing;
    drawing = null;
    if (level === 3) {
      freeStrokes = [...freeStrokes, stroke];
      if (freeStrokes.length >= total) check();
      return;
    }
    const v = judgeStroke(stroke, glyph.parsed, next, level);
    if (v.ok) {
      accepted = [...accepted, next];
      fails = 0;
      message = { kind: "ok", text: t.good[Math.floor(Math.random() * t.good.length)] };
    } else {
      fails++;
      anyFail = true;
      pulse();
      if (fails >= 3) {
        // Don't let the learner get stuck: show the stroke and move on.
        accepted = [...accepted, next];
        fails = 0;
        message = { kind: "hint", text: t.shown };
      } else {
        message = { kind: "hint", text: t.reason[v.reason] };
      }
    }
    if (accepted.length === total) finish(t.done);
  }

  function check() {
    const v = judgeCharacter(freeStrokes, glyph.parsed, 3);
    if (v.ok) {
      accepted = glyph.parsed.map((_, i) => i);
      finish(t.doneFree);
    } else {
      anyFail = true;
      failedFree = true;
      pulse();
      message = { kind: "hint", text: t.reason[v.reason ?? "shape"] };
    }
  }

  function finish(text: string) {
    finished = true;
    message = { kind: "done", text };
    onfinish?.(!anyFail);
  }

  function pulse() {
    flash = true;
    setTimeout(() => (flash = false), 350);
  }

  function undo() {
    freeStrokes = freeStrokes.slice(0, -1);
    failedFree = false;
    message = null;
  }

  function tryAgain() {
    freeStrokes = [];
    failedFree = false;
    message = null;
  }

  const poly = (pts: Point[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  /** A small arrow showing the direction at the start of the current stroke. */
  const arrow = $derived.by(() => {
    const s = guideStroke;
    if (!s || s.kind !== "path") return null;
    const a = s.points[0];
    let b = s.points[s.points.length - 1];
    for (const p of s.points) {
      if (Math.hypot(p.x - a.x, p.y - a.y) >= 12) {
        b = p;
        break;
      }
    }
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const tip = { x: a.x + ux * 14, y: a.y + uy * 14 };
    const side = 4;
    return {
      line: `M${a.x + ux * 6} ${a.y + uy * 6} L${tip.x} ${tip.y}`,
      head: `M${tip.x - ux * side - uy * side} ${tip.y - uy * side + ux * side} L${tip.x} ${tip.y} L${tip.x - ux * side + uy * side} ${tip.y - uy * side - ux * side}`,
    };
  });
</script>

<div class="trace">
<div class="field" class:flash>
  <svg
    bind:this={svg}
    viewBox={frame.viewBox.join(" ")}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
    role="application"
    aria-label={t.traceHint[level]}
  >
    {#each frame.guides as g}
      <line class="guide" x1="0" x2={frame.viewBox[2]} y1={g.y} y2={g.y} />
    {/each}

    {#if level < 3 || failedFree}
      <g class="template" class:faint={level === 2 || failedFree} stroke-width={frame.strokeWidth + 4}>
        {#each glyph.parsed as s}
          {#if s.kind === "dot"}
            <circle cx={s.at.x} cy={s.at.y} r={frame.strokeWidth / 2 + 2} />
          {:else}
            <path d={s.d} />
          {/if}
        {/each}
      </g>
    {/if}

    <g class="ink" stroke-width={frame.strokeWidth}>
      {#each accepted as i (i)}
        {@const s = glyph.parsed[i]}
        {#if s.kind === "dot"}
          <circle cx={s.at.x} cy={s.at.y} r={frame.strokeWidth / 2 + 0.5} />
        {:else}
          <path d={s.d} />
        {/if}
      {/each}
      {#if level === 3 && !finished}
        {#each freeStrokes as s}
          <polyline points={poly(s)} class="free" />
        {/each}
      {/if}
      {#if drawing}
        <polyline points={poly(drawing)} class="wet" />
      {/if}
    </g>

    <!-- Start point and arrow sit on top of everything, so finished strokes never hide them. -->
    {#if guideStroke}
      <g class="markers">
        {#if guideStroke.kind === "dot"}
          <circle class="start" cx={guideStroke.at.x} cy={guideStroke.at.y} r="5" />
        {:else}
          {#if arrow}
            <path class="arrow halo" d={arrow.line} />
            <path class="arrow halo" d={arrow.head} />
            <path class="arrow" d={arrow.line} />
            <path class="arrow" d={arrow.head} />
          {/if}
          <circle class="start" cx={guideStroke.points[0].x} cy={guideStroke.points[0].y} r="5" />
        {/if}
      </g>
    {/if}
  </svg>
</div>

<p class="msg {message?.kind ?? 'idle'}" aria-live="polite">
  {#if message}
    {message.text}
  {:else if level < 3 && next > 0}
    {t.strokeOf(Math.min(next + 1, total), total)}
  {:else}
    {t.traceHint[level]}
  {/if}
</p>
<div class="actions">
  {#if level === 3 && !finished}
    <button onclick={undo} disabled={!freeStrokes.length}>{t.undo}</button>
    {#if failedFree}
      <button onclick={tryAgain}>{t.again}</button>
    {:else}
      <button onclick={check} disabled={!freeStrokes.length}>{t.check}</button>
    {/if}
  {/if}
  {#if finished}
    <button onclick={reset}>{t.again}</button>
  {/if}
  {#if onnext}
    <button class="primary next" class:pulse={finished} onclick={onnext}>{t.next}</button>
  {/if}
</div>
</div>

<style>
  /* Fills whatever height the parent leaves (phones), or sizes itself (wide screens). */
  .trace {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field {
    flex: 1;
    min-height: 0;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 14px;
    transition: box-shadow 0.2s;
  }
  .field.flash {
    box-shadow: 0 0 0 3px var(--hint-ring);
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    cursor: crosshair;
  }
  .guide {
    stroke: var(--guide);
    stroke-width: 0.6;
  }
  path,
  polyline {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .template {
    stroke: var(--template);
    fill: var(--template);
  }
  .template.faint {
    opacity: 0.45;
  }
  .ink {
    stroke: var(--ink);
    fill: var(--ink);
  }
  .ink polyline.wet,
  .ink polyline.free {
    stroke: var(--wet);
  }
  .markers {
    pointer-events: none;
  }
  .start {
    fill: var(--accent);
    stroke: var(--surface);
    stroke-width: 1.2;
  }
  .arrow {
    stroke: var(--accent);
    stroke-width: 2;
  }
  /* thin outline in the background colour keeps the arrow readable on top of ink */
  .arrow.halo {
    stroke: var(--surface);
    stroke-width: 4.4;
  }
  /* Wide screens: the page is not height-limited, so give the field its natural size. */
  @media (min-width: 840px) {
    .field {
      flex: none;
      aspect-ratio: 100 / 132;
      max-height: 70vh;
      margin: 0 auto;
      width: 100%;
    }
  }
  .msg {
    margin: 0;
    color: var(--muted);
    min-height: 1.45em;
    flex-shrink: 0;
    font-size: 0.95rem;
  }
  .msg.ok {
    color: var(--good);
  }
  .msg.hint {
    color: var(--text);
  }
  .msg.done {
    color: var(--good);
    font-weight: 600;
  }
  .actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  .next {
    margin-inline-start: auto;
  }
  .next.pulse {
    box-shadow: 0 0 0 3px var(--hint-ring);
  }
</style>
