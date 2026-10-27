import { redirect } from "next/navigation";

/** 홈은 따로 두지 않고 공지사항으로 보낸다(상단 메뉴: 공지사항/스크린/필드). */
export const dynamic = "force-dynamic";

export default function HomePage() {
  redirect("/notices");
}
