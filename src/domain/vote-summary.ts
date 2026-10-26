import type { Round, Vote, VoteStatus } from "./types";

export type VoteBlockReason = "closed" | "cancelled";

/** 투표할 수 없는 이유. 취소가 우선이며, 티오프 시각 이후는 마감이다. 투표 가능하면 null. */
export function voteBlockReason(
  round: Pick<Round, "startsAt" | "status">,
  now: Date,
): VoteBlockReason | null {
  if (round.status === "cancelled") return "cancelled";
  if (now.getTime() >= new Date(round.startsAt).getTime()) return "closed";
  return null;
}

export function canVote(round: Pick<Round, "startsAt" | "status">, now: Date): boolean {
  return voteBlockReason(round, now) === null;
}

export interface VoteSummary {
  attending: number;
  waiting: number;
  declined: number;
  /** 정원이 있고 참석 인원이 정원을 넘은 경우 (매니저가 정원을 줄인 뒤 등) */
  overCapacity: boolean;
  mine: { status: VoteStatus | null; waitPosition: number | null };
}

const byRequest = (a: Vote, b: Vote) =>
  new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime() ||
  a.memberId.localeCompare(b.memberId);

/** 한 라운딩의 투표들을 집계한다. 대기 순번은 신청 시각(같으면 회원 id) 순의 1부터다. */
export function summarizeVotes(
  votes: readonly Vote[],
  myId: string | null,
  capacity: number | null,
): VoteSummary {
  const count = (status: VoteStatus) => votes.filter((v) => v.status === status).length;
  const attending = count("attending");

  const mine = myId === null ? undefined : votes.find((v) => v.memberId === myId);
  const waitPosition =
    mine?.status === "waiting"
      ? votes.filter((v) => v.status === "waiting").sort(byRequest).findIndex((v) => v === mine) + 1
      : null;

  return {
    attending,
    waiting: count("waiting"),
    declined: count("declined"),
    overCapacity: capacity !== null && attending > capacity,
    mine: { status: mine?.status ?? null, waitPosition },
  };
}
