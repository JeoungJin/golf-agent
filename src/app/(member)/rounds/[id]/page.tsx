import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatFee,
  formatRoundDateTime,
  roundKindLabel,
  roundStatusLabel,
} from "@/domain/format";
import { RefreshRetry } from "@/components/ErrorRetry";
import { VotePanel } from "@/components/VotePanel";
import { formatCapacity } from "@/domain/format";
import { summarizeVotes, voteBlockReason } from "@/domain/vote-summary";
import { getCurrentMember } from "@/lib/members";
import { fetchRound, fetchVotes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { castVote, withdrawVote } from "../actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RoundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 형식이 틀린 id 는 DB 오류 대신 404 로 처리한다.
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [round, votes, member] = await Promise.all([
    fetchRound(supabase, id),
    fetchVotes(supabase, [id]),
    getCurrentMember(),
  ]);
  if (!round) notFound();

  const summary = summarizeVotes(votes ?? [], member?.id ?? null, round.capacity);
  const blockReason = voteBlockReason(round, new Date());

  const statusLabel = roundStatusLabel(round.status);

  return (
    <main className="space-y-3 py-2">
      <Link href="/rounds" className="text-sm text-neutral-500">
        ← 라운딩
      </Link>
      <p className="flex items-center gap-2">
        <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">
          {roundKindLabel(round.kind)}
        </span>
        {statusLabel && (
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-700">
            {statusLabel}
          </span>
        )}
      </p>
      <h1 className="break-words text-xl font-bold">{round.location}</h1>
      <dl className="space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-neutral-500">일시</dt>
          <dd>{formatRoundDateTime(round.startsAt)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-neutral-500">비용</dt>
          <dd>{formatFee(round.fee)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-neutral-500">정원</dt>
          <dd>{round.capacity === null ? "제한 없음" : `${round.capacity}명`}</dd>
        </div>
      </dl>

      {votes === null ? (
        <RefreshRetry />
      ) : (
        <>
          <p className="text-sm text-neutral-700">
            참석 {formatCapacity(summary.attending, round.capacity)} · 대기 {summary.waiting}명 · 불참{" "}
            {summary.declined}명
          </p>
          {summary.overCapacity && (
            <p className="text-xs text-neutral-500">
              정원이 줄어 참석 인원이 정원보다 많습니다. 기존 참석은 유지됩니다.
            </p>
          )}
          <VotePanel
            status={summary.mine.status}
            waitPosition={summary.mine.waitPosition}
            blockReason={blockReason}
            onVote={castVote.bind(null, id)}
            onWithdraw={withdrawVote.bind(null, id)}
          />
        </>
      )}
    </main>
  );
}
