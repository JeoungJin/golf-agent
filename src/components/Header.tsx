import { LogoutButton } from "./LogoutButton";

export function Header({ nickname }: { nickname: string }) {
  return (
    <header className="flex items-center justify-between py-4">
      <span className="font-semibold">{nickname}</span>
      <LogoutButton />
    </header>
  );
}
