<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Screens: home (overview), a practice round, and free practice of every character. -->
<script lang="ts">
  import Explore from "./components/Explore.svelte";
  import Home from "./components/Home.svelte";
  import Session from "./components/Session.svelte";
  import { checkVoice } from "./lib/prefs.svelte";
  import { applyShields, dayKey, finishRound, introduce, loadProgress, recordAnswer, saveProgress, type Progress } from "./lib/progress";
  import { initScheduler, newCard, review } from "./lib/scheduler";
  import { scripts } from "./lib/script";

  const script = scripts[0];

  type View = { name: "home" } | { name: "session"; round: number } | { name: "explore"; start: number };
  let view = $state<View>({ name: "home" });
  let progress = $state<Progress>(applyShields(loadProgress(script.id), dayKey(new Date())));
  let ready = $state(false);
  let rounds = 0;

  initScheduler().then(() => (ready = true));
  checkVoice(script.language);

  // Save after every change.
  $effect(() => saveProgress(script.id, $state.snapshot(progress) as Progress));

  /** plain copy of the reactive progress for the pure update functions */
  const snap = () => $state.snapshot(progress) as Progress;

  function go(v: View) {
    view = v;
    window.scrollTo(0, 0);
  }
</script>

{#if view.name === "home"}
  <Home {script} {progress} {ready} onpractice={() => go({ name: "session", round: ++rounds })} onexplore={(start) => go({ name: "explore", start })} />
{:else if view.name === "session"}
  {#key view.round}
    <Session
      {script}
      {progress}
      onintro={(id) => (progress = introduce(snap(), id, () => newCard()))}
      onresult={(id, ok) => (progress = recordAnswer(snap(), id, ok, (card, right) => review(card, right)))}
      onfinish={() => (progress = finishRound(snap(), dayKey(new Date())))}
      onexit={() => go({ name: "home" })}
      onagain={() => go({ name: "session", round: ++rounds })}
    />
  {/key}
{:else}
  <Explore {script} start={view.start} onback={() => go({ name: "home" })} />
{/if}
