import { NextResponse, type NextRequest } from "next/server";
import { resolveAccess } from "@/domain/access-route";
import type { MemberRole, MemberStatus } from "@/domain/types";
import { stripMemberHeaders, writeMemberHeaders } from "@/lib/member-headers";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  let status: MemberStatus | undefined;
  let role: MemberRole | undefined;
  let nicknameSet: boolean | undefined;
  let memberHeader: { id: string; nickname: string; role: MemberRole; nicknameSet: boolean } | null = null;
  if (user) {
    const { data } = await supabase
      .from("members")
      .select("nickname, status, role, nickname_set")
      .eq("id", user.id)
      .maybeSingle();
    status = data?.status;
    role = data?.role;
    nicknameSet = data?.nickname_set;
    if (data) {
      memberHeader = {
        id: user.id,
        nickname: data.nickname,
        role: data.role,
        nicknameSet: data.nickname_set,
      };
    }
  }

  // 로그인했지만 members 행을 읽을 수 없으면 승인 대기로 간주한다 (열람 불가 쪽으로 안전하게).
  const decision = resolveAccess({
    session: Boolean(user),
    status: user ? (status ?? "pending") : undefined,
    role,
    nicknameSet,
    path,
  });

  if (decision.type === "redirect") {
    const redirectResponse = NextResponse.redirect(new URL(decision.to, request.url));
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
    return redirectResponse;
  }

  // 같은 요청의 서버 컴포넌트가 회원을 다시 조회하지 않도록 정보를 요청 헤더로 넘긴다.
  // 클라이언트가 보낸 같은 이름의 헤더는 먼저 지운다 (위조 방지).
  const requestHeaders = new Headers(request.headers);
  stripMemberHeaders(requestHeaders);
  if (memberHeader) writeMemberHeaders(requestHeaders, memberHeader);
  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.getAll().forEach((c) => finalResponse.cookies.set(c));
  return finalResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
