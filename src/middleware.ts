import { NextResponse, type NextRequest } from "next/server";
import { resolveAccess } from "@/domain/access-route";
import type { MemberRole, MemberStatus } from "@/domain/types";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  let status: MemberStatus | undefined;
  let role: MemberRole | undefined;
  if (user) {
    const { data } = await supabase
      .from("members")
      .select("status, role")
      .eq("id", user.id)
      .maybeSingle();
    status = data?.status;
    role = data?.role;
  }

  // 로그인했지만 members 행을 읽을 수 없으면 승인 대기로 간주한다 (열람 불가 쪽으로 안전하게).
  const decision = resolveAccess({
    session: Boolean(user),
    status: user ? (status ?? "pending") : undefined,
    role,
    path,
  });

  if (decision.type === "redirect") {
    const redirectResponse = NextResponse.redirect(new URL(decision.to, request.url));
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
    return redirectResponse;
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
