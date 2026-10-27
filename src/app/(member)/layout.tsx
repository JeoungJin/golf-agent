import { Header } from "@/components/Header";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getCurrentMember } from "@/lib/members";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();

  return (
    <>
      <Header nickname={member?.nickname ?? "회원"} isManager={member?.role === "manager"} />
      <div className="pt-3">
        <InstallPrompt />
      </div>
      {children}
    </>
  );
}
