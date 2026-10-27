import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatFee,
  formatRoundDateTime,
  roundKindLabel,
  roundStatusLabel,
} from "@/domain/format";
import { RefreshRetry } from "@/components/ErrorRetry";
import { RoundManageButtons } from "@/components/RoundManageButtons";
import { VotePanel } from "@/components/VotePanel";
import { VoteRoster } from "@/components/VoteRoster";
import { formatCapacity } from "@/domain/format";
import { summarizeVotes, voteBlockReason } from "@/domain/vote-summary";
import { getCurrentMember } from "@/lib/members";
import { fetchRound, fetchVoteRoster, fetchVotes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  castVote,
  deleteRound,
  setRoundCancelled,
  withdrawVote,
} from "../actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 형식이 틀린 id 는 DB 오류 대신 404 로 처리한다.
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [round, votes, roster, member] = await Promise.all([
    fetchRound(supabase, id),
    fetchVotes(supabase, [id]),
    fetchVoteRoster(supabase, id),
    getCurrentMember(),
  ]);
  if (!round) notFound();

  const summary = summarizeVotes(
    votes ?? [],
    member?.id ?? null,
    round.capacity,
  );
  const blockReason = voteBlockReason(round, new Date());

  const statusLabel = roundStatusLabel(round.status);

  return (
    <main className="space-y-3 py-2">
      <Link
        href={`/rounds?kind=${round.kind}`}
        className="text-sm text-neutral-500"
      >
        ← {roundKindLabel(round.kind)} 목록
      </Link>
      {member?.role === "manager" && (
        <RoundManageButtons
          editHref={`/rounds/${id}/edit`}
          cancelled={round.status === "cancelled"}
          attending={summary.attending}
          onToggleCancel={setRoundCancelled.bind(
            null,
            id,
            round.status !== "cancelled",
          )}
          onDelete={deleteRound.bind(null, id, round.kind)}
        />
      )}
      <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950">
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
            <dd>
              {round.capacity === null ? "제한 없음" : `${round.capacity}명`}
            </dd>
          </div>
        </dl>
      </section>

      {votes === null ? (
        <RefreshRetry />
      ) : (
        <>
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-neutral-800 dark:bg-amber-950 dark:text-neutral-100">
            참석 {formatCapacity(summary.attending, round.capacity)} · 대기{" "}
            {summary.waiting}명 · 불참 {summary.declined}명
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
          {roster && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <VoteRoster entries={roster} myId={member?.id ?? null} />
            </div>
          )}
        </>
      )}
    </main>
  );
}
