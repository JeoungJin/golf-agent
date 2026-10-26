"use client";

import { useState } from "react";

interface Props {
  onDelete: () => Promise<{ error: string } | undefined>;
}

export function DeleteNoticeButton({ onDelete }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!window.confirm("이 공지를 삭제할까요?")) return;
    setPending(true);
    setError(null);
    const result = await onDelete();
    // 성공하면 서버 액션이 홈으로 이동시키므로 여기에는 실패한 경우만 도달한다.
    if (result?.error) setError(result.error);
    setPending(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-sm font-medium text-red-600 disabled:opacity-50"
      >
        삭제
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
