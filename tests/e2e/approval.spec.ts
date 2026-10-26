import { expect, test } from "@playwright/test";
import { createTestUser, resetDatabase, signInAs } from "./helpers/session";

test.beforeEach(async () => {
  await resetDatabase();
});

test("승인 전에는 승인 대기 화면만 보이고, 매니저가 승인하면 홈에 접근한다", async ({
  browser,
}) => {
  const manager = await createTestUser("매니저"); // 첫 가입자
  const applicant = await createTestUser("신청자");

  const applicantCtx = await browser.newContext();
  await signInAs(applicantCtx, applicant);
  const applicantPage = await applicantCtx.newPage();

  await applicantPage.goto("/");
  await expect(applicantPage).toHaveURL(/\/pending$/);
  await expect(applicantPage.getByText("승인 대기")).toBeVisible();
  await applicantPage.goto("/notices/new");
  await expect(applicantPage).toHaveURL(/\/pending$/);

  const managerCtx = await browser.newContext();
  await signInAs(managerCtx, manager);
  const managerPage = await managerCtx.newPage();
  await managerPage.goto("/admin/members");
  const row = managerPage.getByRole("listitem").filter({ hasText: "신청자" });
  await row.getByRole("button", { name: "승인" }).click();
  await expect(managerPage.getByText("대기 중인 신청이 없습니다")).toBeVisible();

  await applicantPage.goto("/");
  await expect(applicantPage).toHaveURL(/\/$/);
  await expect(applicantPage.getByText("신청자")).toBeVisible();

  await applicantCtx.close();
  await managerCtx.close();
});

test("거절된 계정은 거절 안내 화면만 볼 수 있다", async ({ browser }) => {
  const manager = await createTestUser("매니저");
  const applicant = await createTestUser("거절대상");

  const managerCtx = await browser.newContext();
  await signInAs(managerCtx, manager);
  const managerPage = await managerCtx.newPage();
  await managerPage.goto("/admin/members");
  const row = managerPage.getByRole("listitem").filter({ hasText: "거절대상" });
  await row.getByRole("button", { name: "거절" }).click();
  await expect(managerPage.getByText("대기 중인 신청이 없습니다")).toBeVisible();

  const applicantCtx = await browser.newContext();
  await signInAs(applicantCtx, applicant);
  const applicantPage = await applicantCtx.newPage();
  await applicantPage.goto("/");
  await expect(applicantPage).toHaveURL(/\/rejected$/);

  await applicantCtx.close();
  await managerCtx.close();
});

test("일반 멤버는 가입 신청 관리 화면에 접근할 수 없고 링크도 보이지 않는다", async ({
  browser,
}) => {
  const manager = await createTestUser("매니저");
  const member = await createTestUser("일반멤버");

  const managerCtx = await browser.newContext();
  await signInAs(managerCtx, manager);
  const managerPage = await managerCtx.newPage();
  await managerPage.goto("/admin/members");
  await managerPage.getByRole("button", { name: "승인" }).click();
  await expect(managerPage.getByText("대기 중인 신청이 없습니다")).toBeVisible();
  await managerPage.goto("/");
  await expect(managerPage.getByRole("link", { name: "가입 신청" })).toBeVisible();

  const memberCtx = await browser.newContext();
  await signInAs(memberCtx, member);
  const memberPage = await memberCtx.newPage();
  await memberPage.goto("/");
  await expect(memberPage.getByRole("link", { name: "가입 신청" })).toHaveCount(0);
  await memberPage.goto("/admin/members");
  await expect(memberPage).toHaveURL(/\/$/);

  await managerCtx.close();
  await memberCtx.close();
});
