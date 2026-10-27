import { expect, test } from "@playwright/test";
import {
  approveUser,
  createTestUser,
  resetDatabase,
  seedNotice,
  signInAs,
} from "./helpers/session";

test.beforeEach(async () => {
  await resetDatabase();
});

test("매니저가 공지를 등록하면 멤버 홈에 최신 공지로 표시된다", async ({ browser }) => {
  const manager = await createTestUser("매니저");
  const member = await createTestUser("멤버");
  await approveUser(member);

  const managerCtx = await browser.newContext();
  await signInAs(managerCtx, manager);
  const managerPage = await managerCtx.newPage();
  await managerPage.goto("/");
  await managerPage.getByRole("link", { name: "공지 작성" }).click();
  await managerPage.getByLabel("제목").fill("11월 정모 안내");
  await managerPage.getByLabel("내용").fill("11월 둘째 주 토요일 필드 라운딩입니다.");
  await managerPage.getByRole("button", { name: "등록" }).click();
  await expect(managerPage.getByRole("heading", { name: "11월 정모 안내" })).toBeVisible();

  const memberCtx = await browser.newContext();
  await signInAs(memberCtx, member);
  const memberPage = await memberCtx.newPage();
  await memberPage.goto("/");
  await expect(memberPage.getByText("11월 정모 안내")).toBeVisible();

  await managerCtx.close();
  await memberCtx.close();
});

test("매니저가 공지를 수정하면 홈에 반영된다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  const id = await seedNotice({ authorId: manager.id, title: "수정 전", body: "수정 전 내용" });
  await signInAs(context, manager);

  await page.goto(`/notices/${id}`);
  await page.getByRole("link", { name: "수정" }).click();
  await page.getByLabel("제목").fill("수정 후");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("heading", { name: "수정 후" })).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("수정 후")).toBeVisible();
  // 본문("수정 전 내용")과 구분하기 위해 정확히 일치하는 제목만 확인한다
  await expect(page.getByText("수정 전", { exact: true })).toHaveCount(0);
});

test("매니저가 공지를 삭제하면 홈에서 사라진다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  const id = await seedNotice({ authorId: manager.id, title: "삭제할 공지", body: "내용" });
  await signInAs(context, manager);

  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`/notices/${id}`);
  await page.getByRole("button", { name: "삭제" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("등록된 공지가 없습니다")).toBeVisible();
});

test("빈 값으로 등록하면 오류가 표시되고 저장되지 않는다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  await signInAs(context, manager);

  await page.goto("/notices/new");
  await page.getByRole("button", { name: "등록" }).click();

  await expect(page.getByText("제목을 입력해 주세요")).toBeVisible();
  await expect(page.getByText("내용을 입력해 주세요")).toBeVisible();
  await expect(page).toHaveURL(/\/notices\/new$/);
});

test("멤버에게는 작성·수정·삭제 수단이 없고 직접 접근은 홈으로 돌려보낸다", async ({
  browser,
}) => {
  const manager = await createTestUser("매니저");
  const member = await createTestUser("멤버");
  await approveUser(member);
  const id = await seedNotice({ authorId: manager.id, title: "공지", body: "내용" });

  const ctx = await browser.newContext();
  await signInAs(ctx, member);
  const page = await ctx.newPage();

  await page.goto("/");
  await expect(page.getByRole("link", { name: "공지 작성" })).toHaveCount(0);

  await page.goto(`/notices/${id}`);
  await expect(page.getByRole("heading", { name: "공지" })).toBeVisible();
  await expect(page.getByRole("link", { name: "수정" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "삭제" })).toHaveCount(0);

  await page.goto("/notices/new");
  await expect(page).toHaveURL(/\/$/);
  await page.goto(`/notices/${id}/edit`);
  await expect(page).toHaveURL(/\/$/);

  await ctx.close();
});

test("공지사항 메뉴에서 전체 공지를 최신순으로 보고 상세로 이동한다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  const oldId = await seedNotice({ authorId: manager.id, title: "오래된 공지", body: "예전 내용" });
  await seedNotice({ authorId: manager.id, title: "최신 공지", body: "새 내용" });
  await signInAs(context, manager);

  await page.goto("/rounds?kind=screen");
  await page.getByRole("navigation", { name: "메인 메뉴" }).getByRole("link", { name: "공지사항" }).click();
  await expect(page).toHaveURL(/\/notices$/);

  const titles = await page.getByRole("listitem").allInnerTexts();
  expect(titles[0]).toContain("최신 공지");
  expect(titles[1]).toContain("오래된 공지");

  await page.getByRole("link", { name: /오래된 공지/ }).click();
  await expect(page).toHaveURL(new RegExp(`/notices/${oldId}$`));
});

test("공지가 없으면 목록에 빈 상태 안내가 보인다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  await signInAs(context, manager);

  await page.goto("/notices");
  await expect(page.getByText("등록된 공지가 없습니다")).toBeVisible();
});
