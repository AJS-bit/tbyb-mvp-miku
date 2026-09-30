// 고운바탕 Bold(SIL OFL 1.1)를 앱에 필요한 글자만 남겨 줄인다.
// 원본 TTF 는 약 8MB 라 웹 미리보기 첫 방문에 무겁다. KS X 1001 한글 2,350자 + 앱 소스·공통 규칙에 쓰인 한글 전부
// + 영문·숫자·문장부호를 남기므로, 문구를 바꿔도 흔한 한글은 그대로 나온다.
// 사용: node scripts/subset-font.mjs   (app/ 에서)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(APP, 'node_modules/@expo-google-fonts/gowun-batang/700Bold/GowunBatang_700Bold.ttf');
const OUT = join(APP, 'assets/fonts/GowunBatang-Bold-subset.ttf');

// KS X 1001 완성형 한글 2,350자 (EUC-KR 0xB0A1–0xC8FE)
const dec = new TextDecoder('euc-kr');
let ksx = '';
for (let hi = 0xb0; hi <= 0xc8; hi++) for (let lo = 0xa1; lo <= 0xfe; lo++) ksx += dec.decode(new Uint8Array([hi, lo]));
ksx = ksx.replace(/[^가-힣]/g, '');

// 앱 소스·공통 규칙에 실제로 쓰인 한글 (KS X 1001 밖의 글자도 빠지지 않게)
const used = new Set();
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|mjs)$/.test(f)) for (const ch of readFileSync(p, 'utf8')) if (/[가-힣ㄱ-ㆎ]/.test(ch)) used.add(ch);
  }
};
walk(join(APP, 'src'));
for (const ch of readFileSync(join(APP, '../shared/domain.ts'), 'utf8')) if (/[가-힣]/.test(ch)) used.add(ch);

let ascii = '';
for (let c = 0x20; c < 0x7f; c++) ascii += String.fromCharCode(c);
const punct = '·…—–‘’“”「」『』〈〉《》・※○●◯△▲▽▼□■☆★♡♥→←↑↓↗↘∼~₩%°℃';
const text = [...new Set(ksx + [...used].join('') + ascii + punct)].join('');

const input = readFileSync(SRC);
const out = await subsetFont(input, text, { targetFormat: 'truetype' });
writeFileSync(OUT, out);
console.log(`subset: ${[...text].length} chars, ${(input.length / 1e6).toFixed(1)}MB → ${(out.length / 1e6).toFixed(2)}MB → ${OUT}`);
