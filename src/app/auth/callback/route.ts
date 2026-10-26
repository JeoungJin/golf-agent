import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const providerError = searchParams.get("error");
  const code = searchParams.get("code");

  if (providerError) {
    const reason = providerError === "access_denied" ? "access_denied" : "auth";
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // 가입 상태별 이동(홈/승인 대기/거절)은 미들웨어가 access-route 규칙으로 처리한다.
    if (!error) return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
