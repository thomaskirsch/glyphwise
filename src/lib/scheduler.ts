// SPDX-License-Identifier: MPL-2.0
/**
 * Spaced repetition with FSRS (ts-fsrs, MIT). Cards are stored as JSON;
 * dates are turned back into Date objects before every review.
 */
import { DefaultScheduler, Rating } from "ts-fsrs";
import type { CardState } from "./progress";

type Scheduler = Awaited<ReturnType<typeof DefaultScheduler>>;
let scheduler: Scheduler | null = null;

/** Must be awaited once before newCard/review are used. */
export async function initScheduler(): Promise<void> {
  scheduler ??= await DefaultScheduler({ enableFuzz: true, desiredRetention: 0.9 });
}

const DATE_FIELDS = ["dueAt", "lastReviewAt"];

function revive(card: CardState): never {
  const c: Record<string, unknown> = { ...card };
  for (const f of DATE_FIELDS) if (typeof c[f] === "string") c[f] = new Date(c[f] as string);
  return c as never;
}

function store(card: object): CardState {
  return JSON.parse(JSON.stringify(card)) as CardState;
}

export function newCard(now = new Date()): CardState {
  if (!scheduler) throw new Error("initScheduler() first");
  return store(scheduler.newCard({ now }));
}

/** Right at the first try → Good, otherwise → Again. */
export function review(card: CardState | null, right: boolean, now = new Date()): CardState {
  if (!scheduler) throw new Error("initScheduler() first");
  // the library's card types differ slightly between newCard() and review(); the runtime shape is the same
  const current = (card ? revive(card) : scheduler.newCard({ now })) as never;
  return store(scheduler.review({ card: current, grade: right ? Rating.Good : Rating.Again, now }).card);
}

export function isDue(card: CardState | null, now = new Date()): boolean {
  return !!card && new Date(card.dueAt).getTime() <= now.getTime();
}
