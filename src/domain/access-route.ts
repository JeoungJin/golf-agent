import type { MemberRole, MemberStatus } from "./types";

export type AccessDecision =
  | { type: "allow" }
  | { type: "redirect"; to: string };

export interface AccessInput {
  session: boolean;
  status?: MemberStatus;
  role?: MemberRole;
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
export function resolveAccess({ session, status, role, path }: AccessInput): AccessDecision {
  const isAuthPath = path === "/auth" || path.startsWith("/auth/");

  if (!session) {
    return path === "/login" || isAuthPath ? ALLOW : redirect("/login");
  }

  // OAuth 콜백은 로그인 직후 세션 교환을 위해 항상 통과시킨다.
  if (isAuthPath) return ALLOW;

  if (status === "pending") return path === "/pending" ? ALLOW : redirect("/pending");
  if (status === "rejected") return path === "/rejected" ? ALLOW : redirect("/rejected");

  if (STATUS_PAGES.includes(path)) return redirect("/");
  if (isManagerOnly(path) && role !== "manager") return redirect("/");
  return ALLOW;
}
