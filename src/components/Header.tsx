import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { MainTabs } from "./MainTabs";

/** 항상 화면 상단에 고정되는 헤더: 본인 이름(+로그아웃)과 공지사항/스크린/필드 메뉴. */
export function Header({ nickname, isManager = false }: { nickname: string; isManager?: boolean }) {
  const initial = Array.from(nickname)[0] ?? "회";

  return (
    <header className="sticky top-0 z-10 -mx-4 space-y-3 border-b border-neutral-200 bg-background px-4 pb-3 pt-3 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white"
          >
            {initial}
          </span>
          <Link href="/profile" title="내 정보 수정" className="flex min-w-0 items-baseline gap-1">
            <span className="truncate font-semibold">{nickname}</span>
            <span className="shrink-0 text-xs text-neutral-500">님</span>
          </Link>
          {isManager && (
            <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-px text-xs font-medium text-green-800">
              매니저
            </span>
          )}
          <LogoutButton />
        </div>
        {isManager && (
          <Link
            href="/admin/members"
            className="shrink-0 rounded-full border border-green-700 px-3 py-1 text-xs font-medium text-green-700"
          >
            가입신청 목록
          </Link>
        )}
      </div>
      <MainTabs />
    </header>
  );
}
