import Link from "next/link";
import {
  formatCapacity,
  formatFee,
  formatRoundDateTime,
  roundKindLabel,
  roundStatusLabel,
} from "@/domain/format";
import type { Round } from "@/domain/types";

export function RoundListItem({ round, attending }: { round: Round; attending: number }) {
  const statusLabel = roundStatusLabel(round.status);

  return (
    <Link
      href={`/rounds/${round.id}`}
      className={`block space-y-1 px-4 py-3 ${statusLabel ? "opacity-60" : ""}`}
    >
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
      <p className="font-bold">{formatRoundDateTime(round.startsAt)}</p>
      <p className="break-words">{round.location}</p>
      <p className="flex flex-wrap gap-x-3 text-sm text-neutral-600">
        <span>{formatFee(round.fee)}</span>
        <span>참석 {formatCapacity(attending, round.capacity)}</span>
      </p>
    </Link>
  );
}
