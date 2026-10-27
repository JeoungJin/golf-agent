"use client";

import Link from "next/link";
import { useState } from "react";

type ActionResult = { error: string } | undefined | void;

interface Props {
  editHref: string;
  cancelled: boolean;
  /** 현재 참석 인원. 삭제 확인 문구에 쓴다. */
  attending: number;
  onToggleCancel: () => Promise<ActionResult>;
  onDelete: () => Promise<ActionResult>;
}

/** 매니저 전용: 수정 / 취소(해제) / 삭제. */
export function RoundManageButtons({ editHref, cancelled, attending, onToggleCancel, onDelete }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<ActionResult>, confirmText?: string) {
    if (pending) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (result && result.error) setError(result.error);
    } catch {
      setError("처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  const deleteText =
    attending > 0
      ? `참석 ${attending}명의 투표 기록도 함께 삭제됩니다. 삭제 대신 '취소'를 권장합니다. 그래도 삭제할까요?`
      : "이 라운딩을 삭제할까요?";

  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href={editHref} className="text-sm font-medium text-green-700">
          수정
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(onToggleCancel, cancelled ? undefined : "이 라운딩을 취소할까요? 취소하면 투표할 수 없습니다.")
          }
          className="text-sm font-medium text-neutral-700 disabled:opacity-50"
        >
          {cancelled ? "취소 해제" : "취소"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(onDelete, deleteText)}
          className="text-sm font-medium text-red-600 disabled:opacity-50"
        >
          삭제
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
