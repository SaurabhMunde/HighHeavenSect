/**
 * Closes at = open instant + nQuestions * perQuestionSec (entire window budget).
 * Same logic as the quiz player hard stop.
 */
export function computeClosesAtIso(
  opensAtIso: string | null,
  timeLimitSeconds: number,
  questionCount: number,
): string | null {
  if (!opensAtIso || questionCount < 1) return null;
  const open = new Date(opensAtIso).getTime();
  const end = open + questionCount * timeLimitSeconds * 1000;
  return new Date(end).toISOString();
}

export function isExpired(iso: string | null) {
  if (!iso) return false;
  return Date.now() > new Date(iso).getTime();
}

export function isNotYetOpen(iso: string | null) {
  if (!iso) return false;
  return Date.now() < new Date(iso).getTime();
}
