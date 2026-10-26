import { Header } from "@/components/Header";
import { getCurrentMember } from "@/lib/members";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();

  return (
    <>
      <Header nickname={member?.nickname ?? "회원"} isManager={member?.role === "manager"} />
      {children}
    </>
  );
}
