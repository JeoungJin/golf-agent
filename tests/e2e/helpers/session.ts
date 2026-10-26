/**
 * E2E 전용 세션 헬퍼. 카카오 실로그인은 자동화할 수 없으므로
 * 서비스 롤로 사용자를 만들고 비밀번호 로그인으로 얻은 세션을 쿠키로 주입한다.
 * 서비스 롤 키는 테스트 코드에서만 사용한다 (Constitution V).
 */
import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const admin = () =>
  createClient(url, serviceKey, { auth: { persistSession: false } });

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export async function createTestUser(nickname = "테스트회원"): Promise<TestUser> {
  const email = `e2e-${crypto.randomUUID()}@test.local`;
  const password = "e2e-password-1234";
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: nickname },
  });
  if (error || !data.user) throw error ?? new Error("사용자 생성 실패");
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(user: TestUser) {
  await admin().auth.admin.deleteUser(user.id);
}

/** 모든 테스트 데이터 초기화. notices 가 members 를 참조하므로 데이터부터 지우고 사용자를 지운다. */
export async function resetDatabase() {
  const db = admin();
  const NIL = "00000000-0000-0000-0000-000000000000";
  const { error: noticeError } = await db.from("notices").delete().neq("id", NIL);
  if (noticeError) throw noticeError;
  const { error: roundError } = await db.from("rounds").delete().neq("id", NIL);
  if (roundError) throw roundError;

  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    const { error } = await db.auth.admin.deleteUser(u.id);
    if (error) throw error;
  }
}

/** 사용자로 로그인한 Supabase 세션을 @supabase/ssr 쿠키 형식으로 주입한다. */
export async function signInAs(context: BrowserContext, user: TestUser) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error || !data.session) throw error ?? new Error("로그인 실패");

  const projectRef = new URL(url).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const value =
    "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");

  // 쿠키 하나가 4KB를 넘지 않도록 청크로 분할 (@supabase/ssr 규칙: name.0, name.1 ...)
  const CHUNK = 3180;
  const chunks = value.match(new RegExp(`.{1,${CHUNK}}`, "g")) ?? [value];
  const cookies =
    chunks.length === 1
      ? [{ name: cookieName, value }]
      : chunks.map((c, i) => ({ name: `${cookieName}.${i}`, value: c }));

  await context.addCookies(
    cookies.map((c) => ({ ...c, domain: "localhost", path: "/" })),
  );
}

export async function seedRound(input: {
  kind?: "screen" | "field";
  startsAt: Date;
  location?: string;
  fee?: number;
}) {
  const { error } = await admin()
    .from("rounds")
    .insert({
      kind: input.kind ?? "screen",
      starts_at: input.startsAt.toISOString(),
      location: input.location ?? "테스트 스크린골프장",
      fee: input.fee ?? 25000,
    });
  if (error) throw error;
}

export async function seedNotice(input: { authorId: string; title: string; body: string }) {
  const { data, error } = await admin()
    .from("notices")
    .insert({ author_id: input.authorId, title: input.title, body: input.body })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);

/** 가입 승인 흐름을 거치지 않고 서비스 롤로 직접 승인한다 (승인 UI 가 대상이 아닌 테스트용). */
export async function approveUser(user: TestUser) {
  const { error } = await admin().from("members").update({ status: "approved" }).eq("id", user.id);
  if (error) throw error;
}
