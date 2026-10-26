import { describe, expect, it } from "vitest";
import { canVote, summarizeVotes, voteBlockReason } from "@/domain/vote-summary";
import type { Vote } from "@/domain/types";

const NOW = new Date("2026-11-01T00:00:00Z");
const vote = (memberId: string, status: Vote["status"], requestedAt: string): Vote => ({
  roundId: "r1",
  memberId,
  status,
  requestedAt,
});

describe("canVote / voteBlockReason", () => {
  it("미래의 진행 중 라운딩만 투표할 수 있다", () => {
    const round = { startsAt: "2026-11-02T00:00:00Z", status: "scheduled" as const };
    expect(canVote(round, NOW)).toBe(true);
    expect(voteBlockReason(round, NOW)).toBeNull();
  });

  it("정확히 티오프 시각이면 마감이다", () => {
    const round = { startsAt: NOW.toISOString(), status: "scheduled" as const };
    expect(canVote(round, NOW)).toBe(false);
    expect(voteBlockReason(round, NOW)).toBe("closed");
  });

  it("이미 시작한 라운딩은 마감이다", () => {
    const round = { startsAt: "2026-10-31T00:00:00Z", status: "scheduled" as const };
    expect(voteBlockReason(round, NOW)).toBe("closed");
  });

  it("취소된 라운딩은 시간과 관계없이 취소 사유가 우선한다", () => {
    expect(
      voteBlockReason({ startsAt: "2026-11-02T00:00:00Z", status: "cancelled" }, NOW),
    ).toBe("cancelled");
    expect(
      voteBlockReason({ startsAt: "2026-10-31T00:00:00Z", status: "cancelled" }, NOW),
    ).toBe("cancelled");
    expect(canVote({ startsAt: "2026-11-02T00:00:00Z", status: "cancelled" }, NOW)).toBe(false);
  });
});

describe("summarizeVotes", () => {
  it("투표가 없으면 모두 0이고 내 상태는 없다", () => {
    expect(summarizeVotes([], "me", 8)).toEqual({
      attending: 0,
      waiting: 0,
      declined: 0,
      overCapacity: false,
      mine: { status: null, waitPosition: null },
    });
  });

  it("참석·대기·불참 수를 센다", () => {
    const votes = [
      vote("a", "attending", "2026-10-01T00:00:00Z"),
      vote("b", "attending", "2026-10-01T00:01:00Z"),
      vote("c", "waiting", "2026-10-01T00:02:00Z"),
      vote("d", "declined", "2026-10-01T00:03:00Z"),
      vote("e", "declined", "2026-10-01T00:04:00Z"),
    ];
    expect(summarizeVotes(votes, null, 2)).toMatchObject({ attending: 2, waiting: 1, declined: 2 });
  });

  it("내 상태를 돌려주고 참석/불참이면 대기 순번은 없다", () => {
    const votes = [vote("me", "attending", "2026-10-01T00:00:00Z")];
    expect(summarizeVotes(votes, "me", null).mine).toEqual({ status: "attending", waitPosition: null });
    expect(summarizeVotes([vote("me", "declined", "2026-10-01T00:00:00Z")], "me", 2).mine).toEqual({
      status: "declined",
      waitPosition: null,
    });
  });

  it("내 대기 순번은 신청 시각 순으로 1부터 센다", () => {
    const votes = [
      vote("x", "waiting", "2026-10-01T00:03:00Z"),
      vote("me", "waiting", "2026-10-01T00:05:00Z"),
      vote("y", "waiting", "2026-10-01T00:01:00Z"),
      vote("z", "attending", "2026-10-01T00:00:00Z"),
    ];
    expect(summarizeVotes(votes, "me", 1).mine).toEqual({ status: "waiting", waitPosition: 3 });
  });

  it("신청 시각이 같으면 회원 id 순으로 순번을 정한다", () => {
    const same = "2026-10-01T00:00:00Z";
    const votes = [vote("b", "waiting", same), vote("a", "waiting", same)];
    expect(summarizeVotes(votes, "a", 1).mine.waitPosition).toBe(1);
    expect(summarizeVotes(votes, "b", 1).mine.waitPosition).toBe(2);
  });

  it("내 투표가 없거나 로그인 정보가 없으면 내 상태는 없다", () => {
    const votes = [vote("a", "attending", "2026-10-01T00:00:00Z")];
    expect(summarizeVotes(votes, "me", 2).mine.status).toBeNull();
    expect(summarizeVotes(votes, null, 2).mine.status).toBeNull();
  });

  it("참석 인원이 정원을 넘으면 정원 초과이고, 같거나 정원이 없으면 아니다", () => {
    const three = ["a", "b", "c"].map((id) => vote(id, "attending", "2026-10-01T00:00:00Z"));
    expect(summarizeVotes(three, null, 2).overCapacity).toBe(true);
    expect(summarizeVotes(three, null, 3).overCapacity).toBe(false);
    expect(summarizeVotes(three, null, null).overCapacity).toBe(false);
  });
});
