"use client";

import { useState } from "react";
import type { VoteChoice, VoteStatus } from "@/domain/types";
import type { VoteBlockReason } from "@/domain/vote-summary";

type ActionResult = void | { error?: string };

interface Props {
  status: VoteStatus | null;
  waitPosition: number | null;
  blockReason: VoteBlockReason | null;
  onVote: (choice: VoteChoice) => Promise<ActionResult>;
  onWithdraw: () => Promise<ActionResult>;
}

const FAIL_MESSAGE = "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

function statusText(status: VoteStatus | null, waitPosition: number | null): string {
  if (status === "attending") return "참석 확정";
  if (status === "waiting") return `대기 ${waitPosition}번`;
  if (status === "declined") return "불참";
  return "아직 투표하지 않았습니다";
}

export function VotePanel({ status, waitPosition, blockReason, onVote, onWithdraw }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<ActionResult>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (result && result.error) setError(result.error);
    } catch {
      setError(FAIL_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  const attendPressed = status === "attending" || status === "waiting";
  const buttonClass = (pressed: boolean) =>
    `flex-1 rounded-xl px-4 py-3 font-semibold disabled:opacity-60 ${
      pressed ? "bg-green-700 text-white" : "border border-neutral-300 bg-white text-neutral-800"
    }`;

  return (
    <section aria-label="내 투표" className="space-y-3 rounded-2xl bg-green-50 p-4">
      <p role="status" className="text-lg font-bold">{statusText(status, waitPosition)}</p>

      {blockReason === "cancelled" && <p className="text-sm text-neutral-600">취소된 라운딩입니다</p>}
      {blockReason === "closed" && <p className="text-sm text-neutral-600">투표가 마감되었습니다</p>}

      {blockReason === null && (
        <>
          <div className="flex gap-3">
            <button
              type="button"
              aria-pressed={attendPressed}
              disabled={busy}
              onClick={() => run(() => onVote("attend"))}
              className={buttonClass(attendPressed)}
            >
              참석
            </button>
            <button
              type="button"
              aria-pressed={status === "declined"}
              disabled={busy}
              onClick={() => run(() => onVote("decline"))}
              className={buttonClass(status === "declined")}
            >
              불참
            </button>
          </div>
          {status !== null && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(onWithdraw)}
              className="text-sm text-neutral-500 underline disabled:opacity-60"
            >
              투표 철회
            </button>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
