import Link from "next/link";
import { formatFee, formatRoundDateTime, roundKindLabel } from "@/domain/format";
import type { Round } from "@/domain/types";

export function NextRoundCard({ round }: { round: Round | null }) {
  return (
    <section className="rounded-2xl bg-green-50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-green-800">다음 라운딩</h2>
        <Link
          href="/rounds"
          className="rounded-full border border-green-700 px-3 py-1 text-xs font-medium text-green-800"
        >
          라운딩 목록
        </Link>
      </div>
      {round ? (
        <div className="mt-3 space-y-1">
          <p>
            <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">
              {roundKindLabel(round.kind)}
            </span>
          </p>
          <p className="text-lg font-bold">{formatRoundDateTime(round.startsAt)}</p>
          <p className="break-words">{round.location}</p>
          <p className="text-sm text-neutral-600">{formatFee(round.fee)}</p>
        </div>
      ) : (
        <p className="mt-3 text-neutral-500">예정된 라운딩이 없습니다</p>
      )}
    </section>
  );
}
