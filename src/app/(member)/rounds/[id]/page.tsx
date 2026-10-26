import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatFee,
  formatRoundDateTime,
  roundKindLabel,
  roundStatusLabel,
} from "@/domain/format";
import { fetchRound } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RoundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 형식이 틀린 id 는 DB 오류 대신 404 로 처리한다.
  if (!UUID.test(id)) notFound();

  const round = await fetchRound(await createClient(), id);
  if (!round) notFound();

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
    </main>
  );
}
