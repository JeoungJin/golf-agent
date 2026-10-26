import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import {
  admin,
  createApprovedMember,
  createTestUser,
  daysFromNow,
  resetDatabase,
  seedRound,
  seedVote,
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

test.describe("라운딩 목록·상세 (US2)", () => {
  test("예정은 빠른 순, 지난 라운딩은 최근 순 최대 10건, 취소됨은 배지로 구분된다", async ({
    page,
    context,
  }) => {
    const manager = await createTestUser("매니저");
    const member = await createApprovedMember("멤버");
    await seedRound({ startsAt: daysFromNow(5), location: "늦은 장소", capacity: 8 });
    const soonId = await seedRound({ startsAt: daysFromNow(1), location: "빠른 장소", capacity: 8 });
    await seedRound({ startsAt: daysFromNow(3), location: "취소된 장소", status: "cancelled" });
    for (let i = 1; i <= 12; i++) {
      await seedRound({ startsAt: daysFromNow(-i), location: `지난 장소 ${i}` });
    }
    await seedVote({ roundId: soonId, memberId: manager.id, status: "attending" });
    await seedVote({ roundId: soonId, memberId: member.id, status: "attending" });
    await signInAs(context, manager);

    await page.goto("/rounds");

    const upcoming = page.getByRole("region", { name: "예정 라운딩" }).getByRole("listitem");
    await expect(upcoming).toHaveCount(3);
    await expect(upcoming.nth(0)).toContainText("빠른 장소");
    await expect(upcoming.nth(0)).toContainText("참석 2/8명");
    await expect(upcoming.nth(1)).toContainText("취소된 장소");
    await expect(upcoming.nth(1)).toContainText("취소됨");
    await expect(upcoming.nth(2)).toContainText("늦은 장소");

    const past = page.getByRole("region", { name: "지난 라운딩" }).getByRole("listitem");
    await expect(past).toHaveCount(10);
    await expect(past.nth(0)).toContainText("지난 장소 1");
    await expect(past.nth(9)).toContainText("지난 장소 10");
  });

  test("스크린/필드 탭으로 종류별 목록을 구분해 볼 수 있다", async ({ page, context }) => {
    const manager = await createTestUser("매니저");
    await seedRound({ kind: "screen", startsAt: daysFromNow(1), location: "스크린 장소 A" });
    await seedRound({ kind: "field", startsAt: daysFromNow(2), location: "필드 장소 B" });
    await seedRound({ kind: "screen", startsAt: daysFromNow(-1), location: "지난 스크린 C" });
    await seedRound({ kind: "field", startsAt: daysFromNow(-2), location: "지난 필드 D" });
    await signInAs(context, manager);

    await page.goto("/rounds");
    await expect(page.getByRole("listitem")).toHaveCount(4);

    await page.getByRole("link", { name: "필드", exact: true }).click();
    await expect(page).toHaveURL(/\/rounds\?kind=field$/);
    await expect(page.getByRole("heading", { name: "필드 라운딩" })).toBeVisible();
    await expect(page.getByText("필드 장소 B")).toBeVisible();
    await expect(page.getByText("지난 필드 D")).toBeVisible();
    await expect(page.getByText("스크린 장소 A")).toHaveCount(0);

    await page.getByRole("link", { name: "스크린", exact: true }).click();
    await expect(page).toHaveURL(/\/rounds\?kind=screen$/);
    await expect(page.getByText("스크린 장소 A")).toBeVisible();
    await expect(page.getByText("필드 장소 B")).toHaveCount(0);

    await page.getByRole("link", { name: "전체", exact: true }).click();
    await expect(page.getByRole("listitem")).toHaveCount(4);
  });

  test("해당 종류의 라운딩이 없으면 종류별 빈 상태 안내가 보인다", async ({ page, context }) => {
    const manager = await createTestUser("매니저");
    await seedRound({ kind: "screen", startsAt: daysFromNow(1), location: "스크린뿐" });
    await signInAs(context, manager);

    await page.goto("/rounds?kind=field");
    await expect(page.getByText("등록된 필드 라운딩이 없습니다")).toBeVisible();
  });

  test("라운딩이 없으면 빈 상태 안내가 보인다", async ({ page, context }) => {
    const manager = await createTestUser("매니저");
    await signInAs(context, manager);

    await page.goto("/rounds");
    await expect(page.getByText("등록된 라운딩이 없습니다")).toBeVisible();
  });

  test("목록에서 상세로 이동하면 라운딩 정보가 보인다", async ({ page, context }) => {
    const manager = await createTestUser("매니저");
    await seedRound({
      kind: "field",
      startsAt: daysFromNow(4),
      location: "레이크사이드 CC",
      fee: 180000,
      capacity: 12,
    });
    await signInAs(context, manager);

    await page.goto("/rounds");
    await page.getByRole("link", { name: /레이크사이드 CC/ }).click();

    await expect(page).toHaveURL(/\/rounds\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "레이크사이드 CC" })).toBeVisible();
    await expect(page.getByText("필드")).toBeVisible();
    await expect(page.getByText("180,000원")).toBeVisible();
    await expect(page.getByText("12명", { exact: true })).toBeVisible();
  });

  test("취소된 라운딩 상세에는 취소됨이 표시되고 존재하지 않는 id 는 404 이다", async ({
    page,
    context,
  }) => {
    const manager = await createTestUser("매니저");
    const id = await seedRound({ startsAt: daysFromNow(2), location: "취소 장소", status: "cancelled" });
    await signInAs(context, manager);

    await page.goto(`/rounds/${id}`);
    await expect(page.getByText("취소됨")).toBeVisible();

    const res = await page.goto("/rounds/00000000-0000-0000-0000-000000000000");
    expect(res?.status()).toBe(404);
  });

  test("매니저에게만 '라운딩 등록' 버튼이 보이고 홈에서 목록으로 이동할 수 있다", async ({
    browser,
  }) => {
    const manager = await createTestUser("매니저");
    const member = await createApprovedMember("멤버");

    const managerCtx = await browser.newContext();
    await signInAs(managerCtx, manager);
    const managerPage = await managerCtx.newPage();
    await managerPage.goto("/");
    await managerPage.getByRole("link", { name: "스크린 목록" }).click();
    await expect(managerPage).toHaveURL(/\/rounds\?kind=screen$/);
    await expect(managerPage.getByRole("link", { name: "라운딩 등록" })).toBeVisible();

    const memberCtx = await browser.newContext();
    await signInAs(memberCtx, member);
    const memberPage = await memberCtx.newPage();
    await memberPage.goto("/rounds");
    await expect(memberPage.getByRole("link", { name: "라운딩 등록" })).toHaveCount(0);

    await managerCtx.close();
    await memberCtx.close();
  });

  test("승인되지 않은 사용자는 라운딩 화면에 접근할 수 없다", async ({ browser }) => {
    await createTestUser("매니저");
    const pending = await createTestUser("대기자");

    const ctx = await browser.newContext();
    await signInAs(ctx, pending);
    const page = await ctx.newPage();
    await page.goto("/rounds");
    await expect(page).toHaveURL(/\/pending$/);

    await ctx.close();
  });

  test("360px 폭에서 긴 장소명이 있어도 목록·상세에 가로 스크롤이 없다", async ({ page, context }) => {
    const manager = await createTestUser("매니저");
    const id = await seedRound({
      startsAt: daysFromNow(2),
      location: "아주 아주 긴 이름을 가진 컨트리클럽 서코스 동코스 특별 라운딩 장소 " + "A".repeat(30),
      fee: 1234567,
      capacity: 12,
    });
    await signInAs(context, manager);

    for (const path of ["/rounds", `/rounds/${id}`]) {
      await page.goto(path);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(360);
    }
  });
});
