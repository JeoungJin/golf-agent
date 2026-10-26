import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function Header({ nickname, isManager = false }: { nickname: string; isManager?: boolean }) {
  return (
    <header className="flex items-center justify-between py-4">
      <Link href="/" className="font-semibold">
        {nickname}
      </Link>
      <nav className="flex items-center gap-4">
        {isManager && (
          <Link href="/admin/members" className="text-sm font-medium text-green-700">
            가입 신청
          </Link>
        )}
        <LogoutButton />
      </nav>
    </header>
  );
}
