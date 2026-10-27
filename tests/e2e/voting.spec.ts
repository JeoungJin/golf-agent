import { expect, test, type Browser } from "@playwright/test";
import {
  createApprovedMember,
  createTestUser,
  daysFromNow,
  resetDatabase,
  seedRound,
  signInAs,
  type TestUser,
} from "./helpers/session";

test.beforeEach(async () => {
  await resetDatabase();
});

async function openAs(browser: Browser, user: TestUser, path: string) {
  const context = await browser.newContext();
  await signInAs(context, user);
  const page = await context.newPage();
  await page.goto(path);
  return { context, page };
}

test("정원 2: 참석 2명 확정, 세 번째는 대기, 참석자가 불참하면 대기자가 승격된다", async ({
  browser,
}) => {
  await createTestUser("매니저");
  const [a, b, c] = [
    await createApprovedMember("멤버A"),
    await createApprovedMember("멤버B"),
    await createApprovedMember("멤버C"),
  ];
  const roundId = await seedRound({ startsAt: daysFromNow(3), location: "투표 장소", capacity: 2 });
  const path = `/rounds/${roundId}`;

  const pageA = await openAs(browser, a, path);
  await expect(pageA.page.getByText("아직 투표하지 않았습니다")).toBeVisible();
  await pageA.page.getByRole("button", { name: "참석", exact: true }).click();
  await expect(pageA.page.getByText("참석 확정")).toBeVisible();
  await expect(pageA.page.getByRole("region", { name: "투표 현황" }).getByText("멤버A")).toBeVisible();

  const pageB = await openAs(browser, b, path);
  await pageB.page.getByRole("button", { name: "참석", exact: true }).click();
  await expect(pageB.page.getByText("참석 확정")).toBeVisible();

  const pageC = await openAs(browser, c, path);
  await pageC.page.getByRole("button", { name: "참석", exact: true }).click();
  await expect(pageC.page.getByText("대기 1번")).toBeVisible();
  await expect(pageC.page.getByText(/참석 2\/2명/)).toBeVisible();
  await expect(pageC.page.getByText(/대기 1명/)).toBeVisible();

  // A 가 불참으로 바꾸면 C 가 자동으로 참석이 된다
  await pageA.page.getByRole("button", { name: "불참", exact: true }).click();
  await expect(pageA.page.getByRole("status")).toHaveText("불참");
  await pageC.page.reload();
  await expect(pageC.page.getByText("참석 확정")).toBeVisible();
  await expect(pageC.page.getByText(/참석 2\/2명/)).toBeVisible();

  await pageA.context.close();
  await pageB.context.close();
  await pageC.context.close();
});

test("투표를 철회하면 미투표로 돌아가고, 투표 상태는 새로고침 후에도 유지된다", async ({ browser }) => {
  await createTestUser("매니저");
  const member = await createApprovedMember("멤버");
  const roundId = await seedRound({ startsAt: daysFromNow(2), location: "철회 장소" });

  const { context, page } = await openAs(browser, member, `/rounds/${roundId}`);
  await page.getByRole("button", { name: "불참", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("불참");

  await page.reload();
  await expect(page.getByRole("status")).toHaveText("불참");

  await page.getByRole("button", { name: "투표 철회" }).click();
  await expect(page.getByText("아직 투표하지 않았습니다")).toBeVisible();
  await expect(page.getByRole("button", { name: "투표 철회" })).toHaveCount(0);

  await context.close();
});

test("불참했다가 다시 참석하면 정원이 찬 경우 대기열 맨 뒤에 선다", async ({ browser }) => {
  await createTestUser("매니저");
  const [a, b, c] = [
    await createApprovedMember("멤버A"),
    await createApprovedMember("멤버B"),
    await createApprovedMember("멤버C"),
  ];
  const roundId = await seedRound({ startsAt: daysFromNow(3), location: "재신청 장소", capacity: 1 });
  const path = `/rounds/${roundId}`;
  const vote = async (user: TestUser, name: string) => {
    const { context, page } = await openAs(browser, user, path);
    await page.getByRole("button", { name, exact: true }).click();
    return { context, page };
  };

  const pageA = await vote(a, "참석");
  await expect(pageA.page.getByText("참석 확정")).toBeVisible();
  const pageB = await vote(b, "참석");
  await expect(pageB.page.getByText("대기 1번")).toBeVisible();
  await pageA.page.getByRole("button", { name: "불참", exact: true }).click(); // B 승격
  await expect(pageA.page.getByRole("status")).toHaveText("불참");
  const pageC = await vote(c, "참석");
  await expect(pageC.page.getByText("대기 1번")).toBeVisible();
  await pageA.page.getByRole("button", { name: "참석", exact: true }).click();
  await expect(pageA.page.getByText("대기 2번")).toBeVisible();

  for (const p of [pageA, pageB, pageC]) await p.context.close();
});

test("이미 시작한 라운딩은 마감 안내만 보이고 투표 수단이 없다", async ({ browser }) => {
  await createTestUser("매니저");
  const member = await createApprovedMember("멤버");
  const roundId = await seedRound({ startsAt: daysFromNow(-1), location: "지난 장소" });

  const { context, page } = await openAs(browser, member, `/rounds/${roundId}`);
  await expect(page.getByText("투표가 마감되었습니다")).toBeVisible();
  await expect(page.getByRole("button", { name: "참석", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "불참", exact: true })).toHaveCount(0);

  await context.close();
});

test("취소된 라운딩은 취소 안내만 보이고 투표 수단이 없다", async ({ browser }) => {
  await createTestUser("매니저");
  const member = await createApprovedMember("멤버");
  const roundId = await seedRound({
    startsAt: daysFromNow(3),
    location: "취소 장소",
    status: "cancelled",
  });

  const { context, page } = await openAs(browser, member, `/rounds/${roundId}`);
  await expect(page.getByText("취소된 라운딩입니다")).toBeVisible();
  await expect(page.getByRole("button", { name: "참석", exact: true })).toHaveCount(0);

  await context.close();
});

test("매니저도 회원으로서 투표할 수 있다", async ({ browser }) => {
  const manager = await createTestUser("매니저");
  const roundId = await seedRound({ startsAt: daysFromNow(2), location: "매니저 투표" });

  const { context, page } = await openAs(browser, manager, `/rounds/${roundId}`);
  await page.getByRole("button", { name: "참석", exact: true }).click();
  await expect(page.getByText("참석 확정")).toBeVisible();

  await context.close();
});
