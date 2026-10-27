import type { MemberRole } from "@/domain/types";

/**
 * 미들웨어가 한 번 조회한 회원 정보를 같은 요청의 서버 컴포넌트에 넘기는 요청 헤더.
 * 화면 표시용이다. 권한의 최종 강제는 계속 DB(RLS·RPC)가 한다.
 * 클라이언트가 같은 이름의 헤더를 보내도 미들웨어가 먼저 지우고 자신의 값만 쓴다.
 */
export const MEMBER_HEADERS = {
  id: "x-member-id",
  nickname: "x-member-nickname",
  role: "x-member-role",
  nicknameSet: "x-member-nickname-set",
} as const;

export interface MemberHeaderValue {
  id: string;
  nickname: string;
  role: MemberRole;
  nicknameSet: boolean;
}

export function stripMemberHeaders(headers: Headers) {
  for (const name of Object.values(MEMBER_HEADERS)) headers.delete(name);
}

export function writeMemberHeaders(headers: Headers, member: MemberHeaderValue) {
  headers.set(MEMBER_HEADERS.id, member.id);
  // 헤더 값은 ASCII 만 허용되므로 닉네임은 인코딩한다.
  headers.set(MEMBER_HEADERS.nickname, encodeURIComponent(member.nickname));
  headers.set(MEMBER_HEADERS.role, member.role);
  headers.set(MEMBER_HEADERS.nicknameSet, member.nicknameSet ? "1" : "0");
}

export function readMemberHeaders(headers: Headers): MemberHeaderValue | null {
  const id = headers.get(MEMBER_HEADERS.id);
  const nickname = headers.get(MEMBER_HEADERS.nickname);
  const role = headers.get(MEMBER_HEADERS.role);
  const nicknameSet = headers.get(MEMBER_HEADERS.nicknameSet);
  if (!id || nickname === null || (role !== "manager" && role !== "member") || nicknameSet === null) {
    return null;
  }
  try {
    return { id, nickname: decodeURIComponent(nickname), role, nicknameSet: nicknameSet === "1" };
  } catch {
    return null;
  }
}
