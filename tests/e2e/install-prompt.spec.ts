import { expect, test, type Page } from "@playwright/test";
import { createTestUser, resetDatabase, signInAs } from "./helpers/session";

test.beforeEach(async () => {
  await resetDatabase();
});

// 헤드리스 Chromium은 설치 가능 이벤트를 보내지 않으므로, 하이드레이션 이후 리스너가 붙을 때까지 합성 이벤트를 반복 전송한다.
async function emitInstallEvent(page: Page) {
  await page.addInitScript(() => {
    const timer = setInterval(() => {
      const event = Object.assign(new Event("beforeinstallprompt"), {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });
      window.dispatchEvent(event);
    }, 100);
    setTimeout(() => clearInterval(timer), 5000);
  });
}

test("첫 접속 시 설치 안내 팝업이 표시된다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  await signInAs(context, manager);
  await emitInstallEvent(page);
  await page.goto("/");

  await expect(page.getByRole("button", { name: "추가하기" })).toBeVisible();
});

test("닫은 뒤 새로고침해도 다시 표시되지 않는다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  await signInAs(context, manager);
  await emitInstallEvent(page);
  await page.goto("/");

  await page.getByRole("button", { name: "닫기" }).click();
  await expect(page.getByRole("button", { name: "추가하기" })).toHaveCount(0);

  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.getByRole("button", { name: "추가하기" })).toHaveCount(0);
});

test("홈 화면 앱(standalone)으로 실행 중이면 표시되지 않는다", async ({ page, context }) => {
  const manager = await createTestUser("매니저");
  await signInAs(context, manager);
  await emitInstallEvent(page);
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query.includes("display-mode: standalone")
        ? ({ ...original(query), matches: true, media: query } as MediaQueryList)
        : original(query);
  });
  await page.goto("/");
  await page.waitForTimeout(1500);

  await expect(page.getByRole("button", { name: "추가하기" })).toHaveCount(0);
});

test("웹 앱 매니페스트가 설치 가능한 형태로 제공된다", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.lang).toBe("ko");
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
});
