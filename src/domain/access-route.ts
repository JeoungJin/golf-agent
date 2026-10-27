import type { MemberRole, MemberStatus } from "./types";

export type AccessDecision =
  | { type: "allow" }
  | { type: "redirect"; to: string };

export interface AccessInput {
  session: boolean;
  status?: MemberStatus;
  role?: MemberRole;
  /** 이름(닉네임) 설정 여부. false 이면 이름 입력 화면으로 보낸다. */
  nicknameSet?: boolean;
  path: string;
}

const ALLOW: AccessDecision = { type: "allow" };
const redirect = (to: string): AccessDecision => ({ type: "redirect", to });

const STATUS_PAGES = ["/login", "/pending", "/rejected"];

function isManagerOnly(path: string): boolean {
  return (
    path === "/notices/new" ||
    /^\/notices\/[^/]+\/edit$/.test(path) ||
    path === "/rounds/new" ||
    /^\/rounds\/[^/]+\/edit$/.test(path) ||
    path === "/admin" ||
    path.startsWith("/admin/")
  );
}

/** 세션·가입 상태·역할·요청 경로로 접근 허용 여부 또는 이동할 경로를 결정한다. */
export function resolveAccess({ session, status, role, nicknameSet, path }: AccessInput): AccessDecision {
  const isAuthPath = path === "/auth" || path.startsWith("/auth/");

  if (!session) {
    return path === "/login" || isAuthPath ? ALLOW : redirect("/login");
  }

  // OAuth 콜백은 로그인 직후 세션 교환을 위해 항상 통과시킨다.
  if (isAuthPath) return ALLOW;

  if (status === "rejected") return path === "/rejected" ? ALLOW : redirect("/rejected");

  // 이름이 없는 회원(승인 대기 포함)은 이름을 입력하기 전에는 다른 화면에 갈 수 없다.
  if (nicknameSet === false) return path === "/profile" ? ALLOW : redirect("/profile");

  if (status === "pending") return path === "/pending" || path === "/profile" ? ALLOW : redirect("/pending");

  if (STATUS_PAGES.includes(path)) return redirect("/");
  if (isManagerOnly(path) && role !== "manager") return redirect("/");
  return ALLOW;
}
