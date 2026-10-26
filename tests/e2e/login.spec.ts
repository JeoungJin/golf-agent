import { expect, test } from "@playwright/test";
import { createTestUser, resetDatabase, signInAs } from "./helpers/session";

test.beforeEach(async () => {
  await resetDatabase();
});

test("비로그인으로 홈에 접근하면 로그인 화면으로 이동한다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "카카오로 로그인" })).toBeVisible();
});

test("로그인하면 홈이 보이고 닉네임이 표시된다", async ({ page, context }) => {
  const user = await createTestUser("홍길동"); // 첫 가입자 = 매니저(승인됨)
  await signInAs(context, user);

  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("홍길동")).toBeVisible();
});

test("재방문해도 로그인 상태가 유지된다", async ({ page, context }) => {
  const user = await createTestUser("홍길동");
  await signInAs(context, user);

  await page.goto("/");
  await page.reload();
  await expect(page.getByText("홍길동")).toBeVisible();
});

test("로그아웃하면 로그인 화면으로 돌아가고 보호 화면에 접근할 수 없다", async ({
  page,
  context,
}) => {
  const user = await createTestUser("홍길동");
  await signInAs(context, user);

  await page.goto("/");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("카카오 인증 실패 시 오류 안내가 표시된다", async ({ page }) => {
  await page.goto("/login?error=auth");
  await expect(page.getByRole("alert")).toContainText("로그인에 실패했습니다");
  await expect(page.getByRole("button", { name: "카카오로 로그인" })).toBeEnabled();
});
