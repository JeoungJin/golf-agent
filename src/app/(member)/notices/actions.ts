"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateNotice, type NoticeInput } from "@/domain/notice-validation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string } | undefined;

const SAVE_ERROR = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export async function createNotice(input: NoticeInput): Promise<ActionResult> {
  // 클라이언트 검증은 편의용이다. 서버에서 다시 검증한다.
  const parsed = validateNotice(input);
  if (!parsed.ok) return { error: Object.values(parsed.errors)[0] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: SAVE_ERROR };

  // 권한(매니저만)은 RLS 가 강제한다.
  const { data, error } = await supabase
    .from("notices")
    .insert({ ...parsed.value, author_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: SAVE_ERROR };

  revalidatePath("/");
  redirect(`/notices/${data.id}`);
}

export async function updateNotice(id: string, input: NoticeInput): Promise<ActionResult> {
  const parsed = validateNotice(input);
  if (!parsed.ok) return { error: Object.values(parsed.errors)[0] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notices")
    .update(parsed.value)
    .eq("id", id)
    .select("id");
  // RLS 로 걸러진 경우에도 error 없이 0건이 돌아오므로 건수를 확인한다.
  if (error || !data || data.length === 0) return { error: SAVE_ERROR };

  revalidatePath("/");
  redirect(`/notices/${id}`);
}

export async function deleteNotice(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notices").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) {
    return { error: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/");
  redirect("/");
}
