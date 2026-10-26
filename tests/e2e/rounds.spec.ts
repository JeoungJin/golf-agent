import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import {
  admin,
  createApprovedMember,
  createTestUser,
  daysFromNow,
  resetDatabase,
  signInAs,
} from "./helpers/session";

/** datetime-local 입력값(KST) 형식으로 변환한다. */
const kstInput = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 16);

test.beforeEach(async () => {
  await resetDatabase();
});

test.describe("라운딩 등록 (US1)", () => {
  test("매니저가 라운딩을 등록하면 상세 주소로 이동하고 저장된다", async ({ page, context }) => {
    const manager = await createTestUser("매니저");
    await signInAs(context, manager);

    await page.goto("/rounds/new");
    await page.getByLabel("필드").check();
    await page.getByLabel("티오프 일시").fill(kstInput(daysFromNow(5)));
    await page.getByLabel("장소").fill("레이크사이드 CC");
    await page.getByLabel("비용(원)").fill("180000");
    await page.getByLabel("정원(선택)").fill("8");
    await page.getByRole("button", { name: "등록" }).click();

    await expect(page).toHaveURL(/\/rounds\/[0-9a-f-]{36}$/);
    const { data } = await admin().from("rounds").select("kind, location, fee, capacity, status");
    expect(data).toEqual([
      { kind: "field", location: "레이크사이드 CC", fee: 180000, capacity: 8, status: "scheduled" },
    ]);
  });

  test("정원을 비우고 비용 0원으로도 등록된다", async ({ page, context }) => {
    const manager = await createTestUser("매니저");
    await signInAs(context, manager);

    await page.goto("/rounds/new");
    await page.getByLabel("스크린").check();
    await page.getByLabel("티오프 일시").fill(kstInput(daysFromNow(2)));
    await page.getByLabel("장소").fill("강남 스크린 A룸");
    await page.getByLabel("비용(원)").fill("0");
    await page.getByRole("button", { name: "등록" }).click();

    await expect(page).toHaveURL(/\/rounds\/[0-9a-f-]{36}$/);
    const { data } = await admin().from("rounds").select("fee, capacity");
    expect(data).toEqual([{ fee: 0, capacity: null }]);
  });

  test("빈 값이나 과거 일시는 오류가 표시되고 저장되지 않는다", async ({ page, context }) => {
    const manager = await createTestUser("매니저");
    await signInAs(context, manager);

    await page.goto("/rounds/new");
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText("종류를 선택해 주세요")).toBeVisible();
    await expect(page.getByText("티오프 일시를 입력해 주세요")).toBeVisible();
    await expect(page.getByText("장소를 입력해 주세요")).toBeVisible();

    await page.getByLabel("스크린").check();
    await page.getByLabel("티오프 일시").fill(kstInput(daysFromNow(-1)));
    await page.getByLabel("장소").fill("어딘가");
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText("티오프 일시는 현재 이후여야 합니다")).toBeVisible();

    await expect(page).toHaveURL(/\/rounds\/new$/);
    const { data } = await admin().from("rounds").select("id");
    expect(data).toHaveLength(0);
  });

  test("멤버는 등록 화면에 접근할 수 없고 직접 요청도 거부된다", async ({ browser }) => {
    await createTestUser("매니저");
    const member = await createApprovedMember("멤버");

    const ctx = await browser.newContext();
    await signInAs(ctx, member);
    const page = await ctx.newPage();

    await page.goto("/rounds/new");
    await expect(page).toHaveURL(/\/$/);

    // 화면을 우회해 RPC 를 직접 호출해도 거부된다 (DB 가 최종 권위)
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    await client.auth.signInWithPassword({ email: member.email, password: member.password });
    const { error } = await client.rpc("create_round", {
      p_kind: "screen",
      p_starts_at: daysFromNow(3).toISOString(),
      p_location: "우회 시도",
      p_fee: 0,
      p_capacity: null,
    });
    expect(error?.code).toBe("42501");
    const { data } = await admin().from("rounds").select("id");
    expect(data).toHaveLength(0);

    await ctx.close();
  });
});
