import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function Header({ nickname, isManager = false }: { nickname: string; isManager?: boolean }) {
  const initial = Array.from(nickname)[0] ?? "회";

  return (
    <header className="flex items-center justify-between gap-3 py-4">
      <Link href="/" className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white"
        >
          {initial}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="flex items-baseline gap-1">
            <span className="truncate font-semibold">{nickname}</span>
            <span className="shrink-0 text-xs text-neutral-500">님</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-neutral-500">
            {isManager ? (
              <span className="rounded-full bg-green-100 px-1.5 py-px font-medium text-green-800">
                매니저
              </span>
            ) : (
              "환영합니다"
            )}
          </span>
        </span>
      </Link>
      <nav className="flex shrink-0 items-center gap-3">
        {isManager && (
          <Link
            href="/admin/members"
            className="rounded-full border border-green-700 px-3 py-1 text-xs font-medium text-green-700"
          >
            가입신청 목록
          </Link>
        )}
        <LogoutButton />
      </nav>
    </header>
  );
}
