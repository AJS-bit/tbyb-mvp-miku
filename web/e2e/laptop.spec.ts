import { expect, test, type Page } from "@playwright/test";

// MacBook 일러스트 (components/Laptop.tsx — TETO 투시 보정판 11ec0a6 포팅): 히어로·비교팩 머리, 네 폭 × 두 테마.
// TETO DESIGN_V8 회귀: 키보드 그룹에 사다리꼴 clip-path 가 다시 붙어 바깥 키가 잘리지 않는지 실제 그려진 점으로 확인한다.
const WIDTHS = [320, 390, 768, 1280];
const SCHEMES = ["light", "dark"] as const;
const PAGES = [
  { path: "", name: "소개 히어로", root: "main section >> nth=0", lines: ["오늘은", "어디로", "갈까?", "어디까지", "해 볼까?"] },
  { path: "pack/", name: "비교팩 머리", root: "main .grid.grid-cols-2 >> nth=0", lines: ["어디로", "갈까?", "어디까지", "해 볼까?"] },
];

/** 각 줄의 처음·끝 키캡 중심이 화면에 실제로 그려졌는지 (elementFromPoint 가 그 키캡인지) */
async function edgeKeysPainted(page: Page, device: "air" | "pro", scope: string) {
  return page.evaluate(
    ({ device, scope }) => {
      const root = document.querySelector(scope)!;
      const svg = root.querySelector(`svg.laptop[data-device="${device}"]`)!;
      const caps = [...svg.querySelectorAll<SVGPathElement>(".device-keyboard path.keycap:not(.arrow-key)")];
      // 키캡은 줄 순서대로 그려진다 (ANSI: 기능키 14 · 숫자 14 · tab 14 · caps 13 · shift 12 · 맨 아랫줄 7, 화살표 제외).
      // 히어로는 기울여 놓아서 화면 좌표로 줄을 묶을 수 없다.
      const sizes = [14, 14, 14, 13, 12, 7];
      const rows: SVGPathElement[][] = [];
      let i = 0;
      for (const n of sizes) rows.push(caps.slice(i, (i += n)));
      if (i !== caps.length) return { rows: -1, misses: [`키캡 수 ${caps.length}`] };
      // 키 글자가 가운데를 덮으므로 잴 때만 글자를 숨긴다 (visibility:hidden 은 elementFromPoint 에 걸리지 않음)
      const legends = svg.querySelector<SVGGElement>(".key-legends")!;
      legends.style.visibility = "hidden";
      const misses: string[] = [];
      for (const row of rows) {
        for (const c of [row[0], row[row.length - 1]]) {
          const r = c.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (hit !== c) misses.push(`${Math.round(r.left)},${Math.round(r.top)} → ${hit?.tagName}.${hit?.getAttribute("class")}`);
        }
      }
      legends.style.visibility = "";
      return { rows: rows.length, misses };
    },
    { device, scope },
  );
}

for (const pg of PAGES) {
  for (const scheme of SCHEMES) {
    test(`${pg.name} 노트북 그림 — ${scheme}, 320·390·768·1280`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(pg.path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
        const root = page.locator(pg.root);
        await root.scrollIntoViewIfNeeded();

        const laptops = root.locator("svg.laptop");
        await expect(laptops).toHaveCount(2);
        await expect(root.locator('svg.laptop[data-device="air"]')).toBeVisible();
        await expect(root.locator('svg.laptop[data-device="pro"]')).toBeVisible();
        // 화면 문구는 웹 문구 그대로
        const screenText = (await laptops.allTextContents()).join(" ");
        for (const l of pg.lines) expect(screenText, `${width}px 화면 문구`).toContain(l);

        // 키보드는 .device-keyboard — 예전 .keyboard 사다리꼴 자르기가 없어야 한다
        expect(await root.locator(".keyboard").count()).toBe(0);
        const clips = await root.locator(".device-keyboard").evaluateAll((els) => els.map((e) => getComputedStyle(e).clipPath));
        expect(clips).toEqual(["none", "none"]);

        // Pro 스피커 구멍은 하이드레이션 뒤 브라우저에서 채운다 (양쪽 132×16)
        await expect
          .poll(() => root.locator(".speaker-perforations").evaluateAll((els) => els.map((e) => (e.getAttribute("d") ?? "").split("M").length - 1)))
          .toEqual([132 * 16, 132 * 16]);

        // 바깥 키까지 실제로 그려짐 (히어로는 Air 가 앞이라 Air 만, 비교팩은 둘 다)
        for (const device of pg.path ? (["air", "pro"] as const) : (["air"] as const)) {
          const r = await edgeKeysPainted(page, device, pg.root.split(" >> ")[0]);
          expect(r.rows, `${width}px ${device} 키 줄`).toBe(6);
          expect(r.misses, `${width}px ${device} 바깥 키`).toEqual([]);
        }

        // 가로 넘침 없음, 그림이 화면 밖으로 나가지 않음
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
        for (const box of await laptops.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
          expect(box.left, `${width}px 왼쪽`).toBeGreaterThanOrEqual(0);
          expect(box.right, `${width}px 오른쪽`).toBeLessThanOrEqual(width);
        }
      }
    });
  }
}
