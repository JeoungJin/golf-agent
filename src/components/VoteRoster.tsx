import type { VoteStatus } from "@/domain/types";

export interface RosterEntry {
  memberId: string;
  nickname: string;
  status: VoteStatus;
}

const GROUPS: { status: VoteStatus; label: string }[] = [
  { status: "attending", label: "참석" },
  { status: "waiting", label: "대기" },
  { status: "declined", label: "불참" },
];

/** 참석/대기/불참별 투표자 이름. 대기는 신청 순서대로 들어온 목록을 그대로 보여 준다. */
export function VoteRoster({ entries, myId }: { entries: RosterEntry[]; myId: string | null }) {
  return (
    <section aria-label="투표 현황" className="space-y-3">
      {GROUPS.map(({ status, label }) => {
        const names = entries.filter((e) => e.status === status);
        return (
          <div key={status}>
            <h2 className="text-sm font-semibold text-neutral-700">
              {label} {names.length}명
            </h2>
            {names.length === 0 ? (
              <p className="text-sm text-neutral-400">없음</p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {names.map((e, i) => (
                  <li
                    key={e.memberId}
                    className={`rounded-full px-2.5 py-1 text-sm ${
                      e.memberId === myId
                        ? "bg-green-700 text-white"
                        : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                    }`}
                  >
                    {status === "waiting" && `${i + 1}. `}
                    {e.nickname}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
