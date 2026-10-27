"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateNickname } from "@/domain/nickname-validation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string } | undefined;

const SAVE_ERROR = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export async function updateNickname(value: string): Promise<ActionResult> {
  // 클라이언트 검증은 편의용이다. 서버에서 다시 검증하고, 본인 한정 최종 검증은 DB 함수가 한다.
  const parsed = validateNickname(value);
  if (!parsed.ok) return { error: parsed.error };

  const { data: status, error } = await (await createClient()).rpc("set_my_nickname", {
    p_nickname: parsed.value,
  });
  if (error) {
    if (error.message === "invalid_input") return { error: "이름을 1~20자로 입력해 주세요" };
    return { error: SAVE_ERROR };
  }

  revalidatePath("/", "layout");
  redirect(status === "pending" ? "/pending" : "/");
}
