import { expect, test, type Page } from "@playwright/test";
import {
  approveUser,
  createTestUser,
  daysFromNow,
  resetDatabase,
  seedNotice,
  seedRound,
  signInAs,
} from "./helpers/session";

const WIDTHS = [360, 414];
const LONG = "A".repeat(100); // 공백 없는 긴 문자열: 줄바꿈 지점이 없어 넘침을 가장 잘 드러낸다

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(async () => {
  await resetDatabase();
});

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test("로그인·대기·거절 화면에 가로 스크롤이 없다", async ({ page, context }) => {
      await page.goto("/login");
      await expectNoHorizontalScroll(page);

      await createTestUser("매니저");
      const pending = await createTestUser("대기자");
      await signInAs(context, pending);
      await page.goto("/pending");
      await expectNoHorizontalScroll(page);
    });

    test("긴 제목·본문이 있어도 홈·공지·작성·가입 신청 화면에 가로 스크롤이 없다", async ({
      page,
      context,
    }) => {
      const manager = await createTestUser("매니저");
      await createTestUser("아주아주긴닉네임을가진가입신청자".repeat(2));
      await seedRound({ startsAt: daysFromNow(2), location: LONG, fee: 1234567 });
      const id = await seedNotice({ authorId: manager.id, title: LONG, body: LONG.repeat(30) });
      await signInAs(context, manager);

      for (const path of ["/", `/notices/${id}`, `/notices/${id}/edit`, "/notices/new", "/admin/members"]) {
        await page.goto(path);
        await expectNoHorizontalScroll(page);
      }
    });

    test("일반 멤버 홈에도 가로 스크롤이 없다", async ({ page, context }) => {
      await createTestUser("매니저");
      const member = await createTestUser("멤버");
      await approveUser(member);
      await signInAs(context, member);
      await page.goto("/");
      await expectNoHorizontalScroll(page);
    });
  });
}
