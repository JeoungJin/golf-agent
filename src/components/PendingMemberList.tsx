"use client";

import { useState } from "react";

export interface PendingMember {
  id: string;
  nickname: string;
  createdAt: string;
}

interface Props {
  members: PendingMember[];
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
}

const formatApplied = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

export function PendingMemberList({ members, onApprove, onReject }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, action: Props["onApprove"]) {
    setBusyId(id);
    try {
      await action(id);
    } finally {
      setBusyId(null);
    }
  }

  if (members.length === 0) {
    return <p className="py-8 text-center text-neutral-500">대기 중인 신청이 없습니다</p>;
  }

  return (
    <ul className="divide-y divide-neutral-200">
      {members.map((m) => (
        <li key={m.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{m.nickname}</p>
            <p className="text-xs text-neutral-500">{formatApplied(m.createdAt)}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={busyId === m.id}
              onClick={() => run(m.id, onApprove)}
              className="rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              승인
            </button>
            <button
              type="button"
              disabled={busyId === m.id}
              onClick={() => run(m.id, onReject)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              거절
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
