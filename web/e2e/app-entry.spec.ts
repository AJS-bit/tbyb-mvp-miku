import { expect, test } from "@playwright/test";

// 웹 → 체험 앱(TETO PWA) 입구: Next 라우트가 아니므로 basePath 를 붙인 일반 링크여야 한다.
// 실제 클릭 동선(웹 → /app/ 로드)은 배포 묶음(scripts/deploy-pages.sh DRY_RUN=1)에서 확인한다.
test("내 체험에서 체험 앱 링크가 /tbyb-mvp-miku/app/ 을 가리킨다", async ({ page }) => {
  await page.goto("my/");
  const link = page.getByTestId("app-entry");
  await expect(link).toBeVisible();
  await expect(link).toHaveText("체험 앱 열기");
  await expect(link).toHaveAttribute("href", "/tbyb-mvp-miku/app/");
});
