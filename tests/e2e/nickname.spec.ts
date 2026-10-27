import { expect, test } from "@playwright/test";
import { approveUser, createTestUser, resetDatabase, signInAs } from "./helpers/session";

test.beforeEach(async () => {
  await resetDatabase();
});

test("닉네임 없는 가입자는 이름을 입력하기 전에는 다른 화면에 갈 수 없다", async ({ page, context }) => {
  await createTestUser("매니저");
  const user = await createTestUser(""); // 카카오 닉네임 없음 → 기본값 '회원', 이름 미설정
  await signInAs(context, user);

  await page.goto("/pending");
  await expect(page).toHaveURL(/\/profile$/);
  await page.goto("/notices");
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText("사용할 이름을 입력해 주세요")).toBeVisible();

  await page.getByLabel("이름").fill("   ");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("이름을 입력해 주세요", { exact: true })).toBeVisible();

  await page.getByLabel("이름").fill("홍길동");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(/\/pending$/);
});

test("승인된 회원은 헤더의 이름으로 수정하고 가입 신청 목록과 헤더에 반영된다", async ({ page, context, browser }) => {
  const manager = await createTestUser("매니저");
  const user = await createTestUser("");
  await approveUser(user);
  const pending = await createTestUser("");

  // 대기자가 이름을 입력
  const pendingCtx = await browser.newContext();
  await signInAs(pendingCtx, pending);
  const pendingPage = await pendingCtx.newPage();
  await pendingPage.goto("/");
  await pendingPage.getByLabel("이름").fill("신청자김");
  await pendingPage.getByRole("button", { name: "저장" }).click();
  await expect(pendingPage).toHaveURL(/\/pending$/);
  await pendingCtx.close();

  // 매니저는 가입 신청 목록에서 입력한 이름을 본다
  await signInAs(context, manager);
  await page.goto("/admin/members");
  await expect(page.getByText("신청자김")).toBeVisible();

  // 승인된 회원은 헤더 이름을 눌러 수정
  const userCtx = await browser.newContext();
  await signInAs(userCtx, user);
  const userPage = await userCtx.newPage();
  await userPage.goto("/profile");
  await userPage.getByLabel("이름").fill("박수정");
  await userPage.getByRole("button", { name: "저장" }).click();
  await expect(userPage.getByRole("link", { name: /박수정/ })).toBeVisible();
  await userPage.getByRole("link", { name: /박수정/ }).click();
  await expect(userPage).toHaveURL(/\/profile$/);
  await expect(userPage.getByLabel("이름")).toHaveValue("박수정");
  await userCtx.close();
});

test("360px 폭의 이름 입력 화면에 가로 스크롤이 없다", async ({ page, context }) => {
  await createTestUser("매니저");
  const user = await createTestUser("");
  await signInAs(context, user);
  await page.goto("/profile");
  await page.getByLabel("이름").fill("가".repeat(20));
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
