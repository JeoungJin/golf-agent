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

test("가장 가까운 미래 라운딩 1건과 최신 공지가 함께 보인다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  await seedRound({ startsAt: daysFromNow(-3), location: "지난 장소" });
  await seedRound({ startsAt: daysFromNow(10), location: "먼 장소" });
  await seedRound({ startsAt: daysFromNow(2), location: "가까운 장소", fee: 30000, kind: "field" });
  await seedNotice({ authorId: manager.id, title: "오래된 공지", body: "예전 내용" });
  await seedNotice({ authorId: manager.id, title: "최신 공지", body: "이번 주 토요일 정모입니다" });

  await signInAs(context, manager);
  await page.goto("/");

  await expect(page.getByText("가까운 장소")).toBeVisible();
  await expect(page.getByText("30,000원")).toBeVisible();
  await expect(page.getByText("먼 장소")).toHaveCount(0);
  await expect(page.getByText("지난 장소")).toHaveCount(0);
  await expect(page.getByText("최신 공지")).toBeVisible();
  await expect(page.getByText("오래된 공지")).toHaveCount(0);
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

test("데이터가 없으면 각각 빈 상태 안내가 보인다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  await signInAs(context, manager);
  await page.goto("/");

  await expect(page.getByText("예정된 라운딩이 없습니다")).toBeVisible();
  await expect(page.getByText("등록된 공지가 없습니다")).toBeVisible();
});

test("지난 라운딩만 있으면 빈 상태 안내가 보인다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  await seedRound({ startsAt: daysFromNow(-1), location: "어제 장소" });
  await signInAs(context, manager);
  await page.goto("/");

  await expect(page.getByText("예정된 라운딩이 없습니다")).toBeVisible();
  await expect(page.getByText("어제 장소")).toHaveCount(0);
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
  await expect(page.getByText("다음 라운딩")).toBeVisible();

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(360);
});
