import { expect, type Page } from "@playwright/test";

// 화면에 실제로 그려진 글자마다 글자색·바탕색 대비를 계산한다 (토큰 짝 목록 scripts/contrast.mjs 가 놓친 조합까지 잡기 위해).
//  - 바탕: 글자 요소에서 위로 올라가며 background-color 를 겹쳐 불투명해질 때까지 합성 (canvas 로 합성 → 브라우저와 같은 sRGB)
//  - 글자: 투명도가 있으면 그 바탕 위에 합성. 입력칸의 값·placeholder 도 본다.
//  - 기준: 4.5:1, 큰 글자(24px↑ 또는 18.66px↑ 굵게)는 3:1
//  - 빼는 것: 보이지 않는 글자(sr-only 등), SVG 안 글자(그림 속 글자), 비활성 컨트롤 안 글자(WCAG 1.4.3 예외),
//    조상에 투명도가 걸린 글자(비활성 표시용 opacity), 배경 이미지/그라디언트 위 글자
export interface ReadabilityIssue {
  text: string;
  ratio: number;
  need: number;
  fg: string;
  bg: string;
  el: string;
}

export async function auditReadability(page: Page): Promise<{ checked: number; issues: ReadabilityIssue[] }> {
  return page.evaluate(() => {
    // 페이드업·색 전환이 끝난 상태로 잰다
    document.getAnimations().forEach((a) => {
      try {
        a.finish();
      } catch {
        /* 무한 반복(animate-pulse)은 끝낼 수 없다 */
      }
    });

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const alphaOf = (css: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return ctx.getImageData(0, 0, 1, 1).data[3] / 255;
    };
    /** 아래에서 위로 겹친 색을 합성한 불투명 sRGB */
    const composite = (layers: string[]) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1, 1);
      for (const c of layers) {
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, 1, 1);
      }
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]] as const;
    };
    const lum = ([r, g, b]: readonly number[]) => {
      const f = (c: number) => {
        const x = c / 255;
        return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: readonly number[], b: readonly number[]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const hex = (c: readonly number[]) => "#" + c.map((x) => x.toString(16).padStart(2, "0")).join("");

    /** 바탕 레이어(아래→위). 그라디언트·이미지를 만나면 null */
    function backgroundLayers(el: Element): string[] | null {
      const layers: string[] = [];
      for (let n: Element | null = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
        const a = alphaOf(cs.backgroundColor);
        if (a > 0) {
          layers.unshift(cs.backgroundColor);
          if (a >= 0.999) return layers;
        }
      }
      // 끝까지 불투명한 바탕이 없으면 캔버스 색 (color-scheme 에 따름)
      layers.unshift(getComputedStyle(document.documentElement).colorScheme.includes("dark") ? "#121212" : "#ffffff");
      return layers;
    }

    function faded(el: Element): boolean {
      for (let n: Element | null = el; n; n = n.parentElement) if (parseFloat(getComputedStyle(n).opacity) < 0.99) return true;
      return false;
    }

    function disabled(el: Element): boolean {
      if (el.closest("button:disabled, fieldset:disabled, [aria-disabled='true'], input:disabled, textarea:disabled, select:disabled")) return true;
      const label = el.closest("label");
      return !!label?.querySelector("input:disabled");
    }

    function describe(el: Element): string {
      const id = el.id ? `#${el.id}` : "";
      const cls = typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 4).join(".") : "";
      return `${el.tagName.toLowerCase()}${id}${cls}`;
    }

    const issues: {
      text: string;
      ratio: number;
      need: number;
      fg: string;
      bg: string;
      el: string;
    }[] = [];
    let checked = 0;

    function check(el: Element, text: string, color: string) {
      const cs = getComputedStyle(el);
      const layers = backgroundLayers(el);
      if (!layers) return;
      const bg = composite(layers);
      const fg = composite([...layers, color]);
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
      const r = ratio(fg, bg);
      checked++;
      if (r < need - 0.005) issues.push({ text: text.slice(0, 40), ratio: Math.round(r * 100) / 100, need, fg: hex(fg), bg: hex(bg), el: describe(el) });
    }

    const visible = (el: Element) => {
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) return false; // sr-only
      const cs = getComputedStyle(el);
      return cs.clip === "auto" || cs.clip === "";
    };

    // 1) 글자 노드를 직접 가진 요소
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement;
      if (!el || seen.has(el) || !t.textContent?.trim()) continue;
      seen.add(el);
      if (el.closest("svg, script, style, noscript, option, template")) continue;
      if (!visible(el) || faded(el) || disabled(el)) continue;
      // sr-only 조상 안이면 건너뜀
      let hidden = false;
      for (let n: Element | null = el; n && !hidden; n = n.parentElement) {
        const r = n.getBoundingClientRect();
        if (r.width <= 1 && r.height <= 1) hidden = true;
      }
      if (hidden) continue;
      check(el, t.textContent.trim(), getComputedStyle(el).color);
    }

    // 2) 입력칸의 값과 placeholder
    for (const el of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input:not([type=radio]):not([type=checkbox]):not([type=hidden]), textarea",
    )) {
      if (!visible(el) || faded(el) || el.disabled) continue;
      if (el.value) check(el, el.value, getComputedStyle(el).color);
      else if (el.placeholder) check(el, `(placeholder) ${el.placeholder}`, getComputedStyle(el, "::placeholder").color);
    }

    return { checked, issues };
  });
}

/** 지금 화면에 읽기 어려운 글자가 없어야 한다 */
export async function expectReadable(page: Page, where: string) {
  const { checked, issues } = await auditReadability(page);
  expect(checked, `${where}: 검사한 글자가 없음`).toBeGreaterThan(5);
  expect(issues, `${where}: 대비 부족 글자 ${issues.length}개`).toEqual([]);
}
