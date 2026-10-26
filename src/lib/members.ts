import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { MemberRole } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export interface CurrentMember {
  id: string;
  nickname: string;
  role: MemberRole;
}

/** 현재 로그인한 회원 정보. 같은 요청 안에서는 한 번만 조회한다. */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const supabase: SupabaseClient = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("members")
    .select("id, nickname, role")
    .eq("id", user.id)
    .maybeSingle();
  return data ? { id: data.id, nickname: data.nickname, role: data.role } : null;
});
