import { describe, expect, it } from "vitest";
import { pickNextRound } from "@/domain/next-round";
import type { Round } from "@/domain/types";

const NOW = new Date("2026-10-26T00:00:00Z");

const round = (id: string, startsAt: string, createdAt = "2026-10-01T00:00:00Z"): Round => ({
  id,
  kind: "screen",
  startsAt,
  location: "장소",
  fee: 0,
  createdAt,
});

describe("pickNextRound", () => {
  it("빈 배열이면 null", () => {
    expect(pickNextRound([], NOW)).toBeNull();
  });

  it("현재 이후 중 가장 빠른 라운딩을 고른다", () => {
    const rounds = [
      round("late", "2026-11-20T00:00:00Z"),
      round("soon", "2026-10-28T00:00:00Z"),
      round("mid", "2026-11-05T00:00:00Z"),
    ];
    expect(pickNextRound(rounds, NOW)?.id).toBe("soon");
  });

  it("지난 라운딩만 있으면 null", () => {
    const rounds = [round("p1", "2026-10-01T00:00:00Z"), round("p2", "2026-10-25T23:59:59Z")];
    expect(pickNextRound(rounds, NOW)).toBeNull();
  });

  it("지난 라운딩은 무시하고 미래 라운딩을 고른다", () => {
    const rounds = [round("past", "2026-10-01T00:00:00Z"), round("future", "2026-12-01T00:00:00Z")];
    expect(pickNextRound(rounds, NOW)?.id).toBe("future");
  });

  it("시작 시각이 정확히 현재이면 제외한다", () => {
    const rounds = [round("now", "2026-10-26T00:00:00Z"), round("next", "2026-10-27T00:00:00Z")];
    expect(pickNextRound(rounds, NOW)?.id).toBe("next");
  });

  it("시작 시각이 같으면 먼저 등록된(createdAt 이 빠른) 것을 고른다", () => {
    const rounds = [
      round("b", "2026-11-01T00:00:00Z", "2026-10-10T00:00:00Z"),
      round("a", "2026-11-01T00:00:00Z", "2026-10-02T00:00:00Z"),
    ];
    expect(pickNextRound(rounds, NOW)?.id).toBe("a");
  });

  it("입력 배열을 변경하지 않는다", () => {
    const rounds = [round("b", "2026-11-05T00:00:00Z"), round("a", "2026-11-01T00:00:00Z")];
    pickNextRound(rounds, NOW);
    expect(rounds.map((r) => r.id)).toEqual(["b", "a"]);
  });
});
