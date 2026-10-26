"use client";

import { useRouter } from "next/navigation";

export function ErrorRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl bg-red-50 p-4 text-center">
      <p className="text-sm text-red-700">정보를 불러오지 못했습니다.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
      >
        다시 시도
      </button>
    </div>
  );
}

/** 서버 컴포넌트에서 쓰는 버전: 현재 화면을 다시 불러온다. */
export function RefreshRetry() {
  const router = useRouter();
  return <ErrorRetry onRetry={() => router.refresh()} />;
}
