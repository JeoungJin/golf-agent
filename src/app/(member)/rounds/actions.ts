"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateRound, type RoundValue } from "@/domain/round-validation";
import type { RoundKind, VoteChoice } from "@/domain/types";
import { GENERIC_ROUND_ERROR, roundErrorMessage } from "@/lib/round-errors";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string } | undefined;

/** 폼이 정규화해 보낸 값을 서버에서 다시 검증한다 (클라이언트 검증은 편의용). */
function recheck(value: RoundValue) {
  const startsAtLocal = new Date(new Date(value.startsAt).getTime() + 9 * 3600_000)
    .toISOString()
    .slice(0, 16);
  return validateRound(
    {
      kind: value.kind,
      startsAt: startsAtLocal,
      location: value.location,
      fee: String(value.fee),
      capacity: value.capacity === null ? "" : String(value.capacity),
    },
    new Date(),
  );
}

export async function createRound(value: RoundValue): Promise<ActionResult> {
  const parsed = recheck(value);
  if (!parsed.ok) return { error: Object.values(parsed.errors)[0] };

  const supabase = await createClient();
  // 권한(매니저만)과 최종 검증은 DB 함수가 강제한다.
  const { data, error } = await supabase.rpc("create_round", {
    p_kind: parsed.value.kind,
    p_starts_at: parsed.value.startsAt,
    p_location: parsed.value.location,
    p_fee: parsed.value.fee,
    p_capacity: parsed.value.capacity,
  });
  if (error || !data) return { error: error ? roundErrorMessage(error) : GENERIC_ROUND_ERROR };

  revalidatePath("/");
  revalidatePath("/rounds");
  redirect(`/rounds/${data}`);
}

export async function updateRound(roundId: string, value: RoundValue): Promise<ActionResult> {
  const parsed = recheck(value);
  if (!parsed.ok) return { error: Object.values(parsed.errors)[0] };

  const { error } = await (await createClient()).rpc("update_round", {
    p_id: roundId,
    p_kind: parsed.value.kind,
    p_starts_at: parsed.value.startsAt,
    p_location: parsed.value.location,
    p_fee: parsed.value.fee,
    p_capacity: parsed.value.capacity,
  });
  if (error) return { error: roundErrorMessage(error) };

  revalidateRoundViews(roundId);
  redirect(`/rounds/${roundId}`);
}

export async function setRoundCancelled(roundId: string, cancelled: boolean): Promise<ActionResult> {
  const { error } = await (await createClient()).rpc("set_round_cancelled", {
    p_id: roundId,
    p_cancelled: cancelled,
  });
  if (error) return { error: roundErrorMessage(error) };
  revalidateRoundViews(roundId);
}

export async function deleteRound(roundId: string, kind: RoundKind): Promise<ActionResult> {
  const { error } = await (await createClient()).rpc("delete_round", { p_id: roundId });
  if (error) return { error: roundErrorMessage(error) };
  revalidateRoundViews(roundId);
  redirect(`/rounds?kind=${kind}`);
}

function revalidateRoundViews(roundId: string) {
  revalidatePath("/");
  revalidatePath("/rounds");
  revalidatePath(`/rounds/${roundId}`);
}

/** 참석/불참 투표. 정원·마감·권한은 DB 함수가 최종 판단한다. */
export async function castVote(roundId: string, choice: VoteChoice): Promise<ActionResult> {
  const { error } = await (await createClient()).rpc("cast_vote", {
    p_round: roundId,
    p_choice: choice,
  });
  if (error) return { error: roundErrorMessage(error) };
  revalidateRoundViews(roundId);
}

export async function withdrawVote(roundId: string): Promise<ActionResult> {
  const { error } = await (await createClient()).rpc("withdraw_vote", { p_round: roundId });
  if (error) return { error: roundErrorMessage(error) };
  revalidateRoundViews(roundId);
}
