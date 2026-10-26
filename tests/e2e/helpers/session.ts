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

/** 모든 테스트 데이터 초기화 (members는 auth.users 삭제로 cascade). */
export async function resetDatabase() {
  const db = admin();
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) await db.auth.admin.deleteUser(u.id);
  await db.from("notices").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("rounds").delete().neq("id", "00000000-0000-0000-0000-000000000000");
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
