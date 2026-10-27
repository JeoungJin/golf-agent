import { expect, test } from "@playwright/test";
import {
  createTestUser,
  daysFromNow,
  resetDatabase,
  seedNotice,
  seedRound,
  signInAs,
} from "./helpers/session";

test.beforeEach(async () => {
  await resetDatabase();
});

test("홈은 공지사항으로 이동하고 상단에 공지사항/스크린/필드 메뉴가 항상 보인다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  await seedNotice({ authorId: manager.id, title: "오래된 공지", body: "예전 내용" });
  await seedNotice({ authorId: manager.id, title: "최신 공지", body: "이번 주 토요일 정모입니다" });
  await signInAs(context, manager);
  await page.goto("/");

  await expect(page).toHaveURL(/\/notices$/);
  const menu = page.getByRole("navigation", { name: "메인 메뉴" });
  await expect(menu.getByRole("link", { name: "공지사항" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("최신 공지")).toBeVisible();
  await expect(page.getByText("오래된 공지")).toBeVisible();

  await menu.getByRole("link", { name: "필드" }).click();
  await expect(page).toHaveURL(/\/rounds\?kind=field$/);
  await expect(menu.getByRole("link", { name: "필드" })).toHaveAttribute("aria-current", "page");
});

test("지난 라운딩은 '종료' 표시로 예정 라운딩과 구분된다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  await seedRound({ startsAt: daysFromNow(-3), location: "지난 장소" });
  await seedRound({ startsAt: daysFromNow(2), location: "가까운 장소" });
  await signInAs(context, manager);
  await page.goto("/rounds?kind=screen");

  await expect(page.getByRole("region", { name: "예정 라운딩" }).getByText("가까운 장소")).toBeVisible();
  const past = page.getByRole("region", { name: "지난 라운딩 (종료)" });
  await expect(past.getByText("지난 장소")).toBeVisible();
  await expect(past.getByText("종료")).toBeVisible();
});

test("공지를 누르면 전문을 볼 수 있다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  const id = await seedNotice({
    authorId: manager.id,
    title: "상세 공지",
    body: "첫 줄\n둘째 줄 전체 내용",
  });
  await signInAs(context, manager);

  await page.goto("/");
  await page.getByRole("link", { name: /상세 공지/ }).click();
  await expect(page).toHaveURL(new RegExp(`/notices/${id}$`));
  await expect(page.getByText("둘째 줄 전체 내용")).toBeVisible();
});

test("존재하지 않는 공지는 404 를 보여 준다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  await signInAs(context, manager);

  const response = await page.goto("/notices/00000000-0000-0000-0000-000000000000");
  expect(response?.status()).toBe(404);
});

test("360px 폭에서 가로 스크롤이 없다", async ({ page, context }) => {
  const manager = await createTestUser("아주아주아주긴닉네임을가진매니저회원");
  await seedRound({
    startsAt: daysFromNow(2),
    location: "아주 아주 긴 이름을 가진 컨트리클럽 서코스 동코스 특별 라운딩 장소",
  });
  await seedNotice({
    authorId: manager.id,
    title: "매우 긴 제목의 공지사항입니다 매우 긴 제목의 공지사항입니다 매우 긴 제목",
    body: "가".repeat(300),
  });
  await signInAs(context, manager);
  await page.goto("/");
  await expect(page.getByText("매우 긴 제목")).toBeVisible();

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(360);
});
