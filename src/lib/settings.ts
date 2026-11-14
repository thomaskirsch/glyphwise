// SPDX-License-Identifier: MPL-2.0
/**
 * Small per-device preferences. Storage can be unavailable (private mode,
 * blocked site data) – then the defaults simply apply for this session.
 */
const PREFIX = "glyphwise.";

export function loadSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function saveSetting<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* not persisted – fine */
  }
}
