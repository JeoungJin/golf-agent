import { describe, expect, it } from "vitest";
import { resolveAccess } from "@/domain/access-route";

const allow = { type: "allow" };
const to = (path: string) => ({ type: "redirect", to: path });

describe("resolveAccess", () => {
  describe("비로그인", () => {
    it("보호 경로는 /login으로 보낸다", () => {
      for (const path of ["/", "/notices/1", "/admin/members", "/pending"]) {
        expect(resolveAccess({ session: false, path })).toEqual(to("/login"));
      }
    });

    it("/login 과 /auth/* 는 허용한다", () => {
      expect(resolveAccess({ session: false, path: "/login" })).toEqual(allow);
      expect(resolveAccess({ session: false, path: "/auth/callback" })).toEqual(allow);
    });
  });

  describe("로그인 + pending", () => {
    const base = { session: true, status: "pending", role: "member" } as const;

    it("/pending 만 허용한다", () => {
      expect(resolveAccess({ ...base, path: "/pending" })).toEqual(allow);
    });

    it("그 외 경로는 /pending 으로 보낸다", () => {
      for (const path of ["/", "/login", "/rejected", "/notices/1"]) {
        expect(resolveAccess({ ...base, path })).toEqual(to("/pending"));
      }
    });

    it("/auth/* 는 허용한다 (OAuth 콜백)", () => {
      expect(resolveAccess({ ...base, path: "/auth/callback" })).toEqual(allow);
    });
  });

  describe("로그인 + rejected", () => {
    const base = { session: true, status: "rejected", role: "member" } as const;

    it("/rejected 만 허용하고 나머지는 /rejected 로 보낸다", () => {
      expect(resolveAccess({ ...base, path: "/rejected" })).toEqual(allow);
      expect(resolveAccess({ ...base, path: "/" })).toEqual(to("/rejected"));
      expect(resolveAccess({ ...base, path: "/pending" })).toEqual(to("/rejected"));
    });
  });

  describe("로그인 + approved", () => {
    const member = { session: true, status: "approved", role: "member" } as const;
    const manager = { session: true, status: "approved", role: "manager" } as const;

    it("일반 경로를 허용한다", () => {
      expect(resolveAccess({ ...member, path: "/" })).toEqual(allow);
      expect(resolveAccess({ ...member, path: "/notices/abc" })).toEqual(allow);
    });

    it("/login, /pending, /rejected 접근 시 홈으로 보낸다", () => {
      for (const path of ["/login", "/pending", "/rejected"]) {
        expect(resolveAccess({ ...member, path })).toEqual(to("/"));
      }
    });

    it("매니저 전용 경로는 멤버를 홈으로 보낸다", () => {
      for (const path of ["/notices/new", "/notices/abc/edit", "/admin/members", "/rounds/new", "/rounds/abc/edit"]) {
        expect(resolveAccess({ ...member, path })).toEqual(to("/"));
      }
    });

    it("라운딩 목록과 상세는 멤버도 볼 수 있다", () => {
      for (const path of ["/rounds", "/rounds/abc"]) {
        expect(resolveAccess({ ...member, path })).toEqual(allow);
      }
    });

    it("매니저는 매니저 전용 경로를 허용한다", () => {
      for (const path of ["/notices/new", "/notices/abc/edit", "/admin/members", "/rounds/new", "/rounds/abc/edit"]) {
        expect(resolveAccess({ ...manager, path })).toEqual(allow);
      }
    });

    it("공지 상세는 매니저 전용이 아니다", () => {
      expect(resolveAccess({ ...member, path: "/notices/abc" })).toEqual(allow);
    });
  });
  describe("이름 미설정 회원", () => {
    it("승인 대기·승인 회원은 /profile 외 모든 경로에서 /profile 로 보낸다", () => {
      for (const status of ["pending", "approved"] as const) {
        for (const path of ["/", "/pending", "/notices", "/rounds", "/admin/members", "/login"]) {
          expect(
            resolveAccess({ session: true, status, role: "member", nicknameSet: false, path }),
          ).toEqual(to("/profile"));
        }
      }
    });

    it("/profile 과 /auth/* 는 허용한다", () => {
      for (const status of ["pending", "approved"] as const) {
        const base = { session: true, status, role: "member", nicknameSet: false } as const;
        expect(resolveAccess({ ...base, path: "/profile" })).toEqual(allow);
        expect(resolveAccess({ ...base, path: "/auth/callback" })).toEqual(allow);
      }
    });

    it("거절된 회원은 이름 미설정이어도 기존 규칙(/rejected)을 따른다", () => {
      const base = { session: true, status: "rejected", role: "member", nicknameSet: false } as const;
      expect(resolveAccess({ ...base, path: "/profile" })).toEqual(to("/rejected"));
      expect(resolveAccess({ ...base, path: "/rejected" })).toEqual(allow);
    });

    it("비로그인은 영향받지 않는다", () => {
      expect(resolveAccess({ session: false, path: "/profile" })).toEqual(to("/login"));
    });
  });

  describe("이름 설정 완료 회원의 /profile", () => {
    it("승인 대기 회원은 /profile 과 /pending 만 허용한다", () => {
      const base = { session: true, status: "pending", role: "member", nicknameSet: true } as const;
      expect(resolveAccess({ ...base, path: "/profile" })).toEqual(allow);
      expect(resolveAccess({ ...base, path: "/pending" })).toEqual(allow);
      expect(resolveAccess({ ...base, path: "/notices" })).toEqual(to("/pending"));
    });

    it("승인된 회원은 /profile 을 허용한다", () => {
      const base = { session: true, status: "approved", role: "member", nicknameSet: true } as const;
      expect(resolveAccess({ ...base, path: "/profile" })).toEqual(allow);
    });

    it("거절된 회원은 /profile 을 쓸 수 없다", () => {
      const base = { session: true, status: "rejected", role: "member", nicknameSet: true } as const;
      expect(resolveAccess({ ...base, path: "/profile" })).toEqual(to("/rejected"));
    });
  });
});
