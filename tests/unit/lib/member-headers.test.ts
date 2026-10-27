import { describe, expect, it } from "vitest";
import {
  MEMBER_HEADERS,
  readMemberHeaders,
  stripMemberHeaders,
  writeMemberHeaders,
} from "@/lib/member-headers";

const member = { id: "u1", nickname: "홍길동", role: "manager", nicknameSet: true } as const;

describe("member-headers", () => {
  it("쓴 값을 그대로 읽는다 (한글 이름 포함)", () => {
    const h = new Headers();
    writeMemberHeaders(h, member);
    expect(readMemberHeaders(h)).toEqual(member);
  });

  it("nicknameSet false 도 구별해서 읽는다", () => {
    const h = new Headers();
    writeMemberHeaders(h, { ...member, nicknameSet: false });
    expect(readMemberHeaders(h)?.nicknameSet).toBe(false);
  });

  it("헤더가 없으면 null 이다", () => {
    expect(readMemberHeaders(new Headers())).toBeNull();
  });

  it("값이 일부만 있거나 역할이 올바르지 않으면 null 이다", () => {
    const h = new Headers();
    writeMemberHeaders(h, member);
    h.set(MEMBER_HEADERS.role, "admin");
    expect(readMemberHeaders(h)).toBeNull();
    h.delete(MEMBER_HEADERS.id);
    expect(readMemberHeaders(h)).toBeNull();
  });

  it("stripMemberHeaders 는 클라이언트가 보낸 값을 모두 지운다 (위조 방지)", () => {
    const h = new Headers();
    writeMemberHeaders(h, { ...member, role: "manager" });
    stripMemberHeaders(h);
    expect(readMemberHeaders(h)).toBeNull();
    for (const name of Object.values(MEMBER_HEADERS)) expect(h.has(name)).toBe(false);
  });
});
