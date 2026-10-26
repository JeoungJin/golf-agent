import type { Round } from "./types";

/**
 * 현재 시각 이후에 시작하는 라운딩 중 가장 가까운 1건을 고른다.
 * 시작 시각이 정확히 현재이면 이미 시작한 것으로 보아 제외하고,
 * 시작 시각이 같으면 먼저 등록된(createdAt 이 빠른) 라운딩을 고른다.
 */
export function pickNextRound(rounds: readonly Round[], now: Date): Round | null {
  const nowMs = now.getTime();
  const upcoming = rounds
    .filter((r) => new Date(r.startsAt).getTime() > nowMs)
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  return upcoming[0] ?? null;
}
