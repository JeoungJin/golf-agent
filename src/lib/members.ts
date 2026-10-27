import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { cache } from "react";
import { readMemberHeaders } from "@/lib/member-headers";
import type { MemberRole } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export interface CurrentMember {
  id: string;
  nickname: string;
  role: MemberRole;
  nicknameSet: boolean;
}

/** 현재 로그인한 회원 정보. 같은 요청 안에서는 한 번만 조회하며, 미들웨어가 넘긴 값을 우선 쓴다. */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  // 미들웨어가 이미 조회한 정보가 있으면 DB 를 다시 부르지 않는다.
  const fromMiddleware = readMemberHeaders(await headers());
  if (fromMiddleware) return fromMiddleware;

  const supabase: SupabaseClient = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("members")
    .select("id, nickname, role, nickname_set")
    .eq("id", user.id)
    .maybeSingle();
  return data ? { id: data.id, nickname: data.nickname, role: data.role, nicknameSet: data.nickname_set } : null;
});
