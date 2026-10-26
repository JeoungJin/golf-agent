import type { SupabaseClient } from "@supabase/supabase-js";
import { pickNextRound } from "@/domain/next-round";
import type { Notice, Round } from "@/domain/types";

interface RoundRow {
  id: string;
  kind: Round["kind"];
  starts_at: string;
  location: string;
  fee: number;
  capacity: number | null;
  status: Round["status"];
  created_at: string;
  updated_at: string;
}

interface NoticeRow {
  id: string;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

const ROUND_COLUMNS = "id, kind, starts_at, location, fee, capacity, status, created_at, updated_at";

const toRound = (r: RoundRow): Round => ({
  id: r.id,
  kind: r.kind,
  startsAt: r.starts_at,
  location: r.location,
  fee: r.fee,
  capacity: r.capacity,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toNotice = (n: NoticeRow): Notice => ({
  id: n.id,
  title: n.title,
  body: n.body,
  authorId: n.author_id,
  createdAt: n.created_at,
  updatedAt: n.updated_at,
});

export type HomeData =
  | { ok: true; round: Round | null; notice: Notice | null }
  | { ok: false };

/** 홈 대시보드 데이터: 가장 가까운 미래 라운딩 1건과 최신 공지 1건. */
export async function fetchHomeData(supabase: SupabaseClient, now = new Date()): Promise<HomeData> {
  const [rounds, notice] = await Promise.all([
    supabase
      .from("rounds")
      .select(ROUND_COLUMNS)
      .gt("starts_at", now.toISOString())
      .order("starts_at", { ascending: true })
      .limit(20),
    supabase
      .from("notices")
      .select("id, title, body, author_id, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (rounds.error || notice.error) return { ok: false };

  return {
    ok: true,
    round: pickNextRound((rounds.data as RoundRow[]).map(toRound), now),
    notice: notice.data ? toNotice(notice.data as NoticeRow) : null,
  };
}

export async function fetchNotice(supabase: SupabaseClient, id: string): Promise<Notice | null> {
  const { data, error } = await supabase
    .from("notices")
    .select("id, title, body, author_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return toNotice(data as NoticeRow);
}

/** 전체 공지 목록(최신순). 실패하면 null. */
export async function fetchNotices(supabase: SupabaseClient): Promise<Notice[] | null> {
  const { data, error } = await supabase
    .from("notices")
    .select("id, title, body, author_id, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return null;
  return (data as NoticeRow[]).map(toNotice);
}
