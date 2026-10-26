export type MemberRole = "manager" | "member";
export type MemberStatus = "pending" | "approved" | "rejected";
export type RoundKind = "screen" | "field";
export type RoundStatus = "scheduled" | "cancelled";
export type VoteStatus = "attending" | "waiting" | "declined";
export type VoteChoice = "attend" | "decline";

export interface Member {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Round {
  id: string;
  kind: RoundKind;
  startsAt: string;
  location: string;
  fee: number;
  /** null 이면 정원 제한 없음 */
  capacity: number | null;
  status: RoundStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  roundId: string;
  memberId: string;
  status: VoteStatus;
  requestedAt: string;
}

export interface RosterEntry {
  memberId: string;
  nickname: string;
  status: VoteStatus;
  requestedAt: string;
  /** 대기자에게만 1부터의 순번, 그 외 null */
  waitPosition: number | null;
}
