import { defineConfig, devices } from "@playwright/test";

// E2E 는 basePath(/tbyb-mvp-miku)로 빌드한 out/ 을 GitHub Pages 와 같은 경로로 서빙해 검사한다.
// 먼저 `npm run e2e` (빌드 + 테스트) 를 쓰거나, 이미 빌드했다면 `npx playwright test`.
const PORT = 4321;
export const BASE_URL = `http://127.0.0.1:${PORT}/tbyb-mvp-miku/`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node e2e/serve.mjs",
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
