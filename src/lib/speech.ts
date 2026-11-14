// SPDX-License-Identifier: MPL-2.0
/**
 * Text-to-speech with the device's own voices (nothing is bundled).
 * The voice is picked explicitly by language – otherwise e.g. a German
 * default voice tries to read Hebrew. In the native app this will be
 * replaced by the Capacitor text-to-speech plugin with the same interface.
 */
const synth = globalThis.speechSynthesis as SpeechSynthesis | undefined;

function voiceFor(lang: string): SpeechSynthesisVoice | undefined {
  const prefix = lang.slice(0, 2).toLowerCase();
  const voices = synth?.getVoices() ?? [];
  const matching = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(prefix));
  // Prefer offline voices, then the exact region.
  return (
    matching.find((v) => v.localService && v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase()) ??
    matching.find((v) => v.localService) ??
    matching[0]
  );
}

/** Resolves once the voice list is known (it loads asynchronously in most browsers). */
export function hasVoice(lang: string): Promise<boolean> {
  if (!synth) return Promise.resolve(false);
  if (synth.getVoices().length) return Promise.resolve(!!voiceFor(lang));
  return new Promise((resolve) => {
    const done = () => resolve(!!voiceFor(lang));
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

/** Exactly one utterance at a time: a new one cancels the previous. */
export function speak(text: string, lang: string): boolean {
  const voice = voiceFor(lang);
  if (!synth || !voice) return false;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.8;
  synth.speak(u);
  return true;
}
