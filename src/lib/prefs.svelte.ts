// SPDX-License-Identifier: MPL-2.0
/** App-wide reactive preferences and voice state (shared by all screens). */
import { loadSetting, saveSetting } from "./settings";
import { hasVoice, speak } from "./speech";

export const prefs = $state({
  /** stroke animation repeats until switched off; remembered */
  loop: loadSetting("loopAnimation", true),
});

export function toggleLoop(): void {
  prefs.loop = !prefs.loop;
  saveSetting("loopAnimation", prefs.loop);
}

export const voice = $state({ missing: false });

export function checkVoice(lang: string): void {
  hasVoice(lang).then((ok) => (voice.missing = !ok));
}

/** Speak if a voice exists; otherwise remember that it is missing (the UI shows a hint). */
export function say(text: string, lang: string): void {
  if (!speak(text, lang)) voice.missing = true;
}
