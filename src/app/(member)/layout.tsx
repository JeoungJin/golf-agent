import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: member } = user
    ? await supabase.from("members").select("nickname, role").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <>
      <Header nickname={member?.nickname ?? "회원"} isManager={member?.role === "manager"} />
      {children}
    </>
  );
}
