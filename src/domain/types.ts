export type MemberRole = "manager" | "member";
export type MemberStatus = "pending" | "approved" | "rejected";
export type RoundKind = "screen" | "field";

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
  createdAt: string;
}
