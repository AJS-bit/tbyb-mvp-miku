import {test,expect} from '@playwright/test';

// The "play your day." scene is rotated and skewed, so its outer bounding boxes cannot show clipping.
// Measure in local (untransformed) layout coordinates, then hit-test every painted character.
const measure=()=>{
  const card=document.querySelector('.today-card'),scene=card.querySelector('.tiny-scene'),screen=scene.querySelector('.tiny-screen'),span=screen.querySelector('span'),mug=scene.querySelector(':scope>i'),heading=card.querySelector('.today-copy h2');
  const display=span.style.display;span.style.display='inline-block';const textWidth=span.offsetWidth;span.style.display=display;
  const local={
    spanScroll:[span.scrollWidth,span.clientWidth],
    textBottomInScreen:span.offsetTop+span.scrollHeight,screenInnerHeight:screen.clientHeight,
    textRight:screen.offsetLeft+screen.clientLeft+span.offsetLeft+textWidth,textBottom:screen.offsetTop+screen.clientTop+span.offsetTop+span.scrollHeight,
    mugLeft:mug.offsetLeft,mugTop:mug.offsetTop,
    skew:Math.tan(7*Math.PI/180)*screen.offsetHeight/2,
  };
  const misses=[];
  const walker=document.createTreeWalker(span,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode()))for(let i=0;i<node.length;i++){
    if(!node.data[i].trim())continue;
    const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
    const box=range.getBoundingClientRect(),hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
    if(hit!==span)misses.push(`${node.data[i]} covered by ${hit?.className||hit?.tagName}`);
  }
  return {local,misses,text:span.innerText,card:[card.scrollWidth,card.clientWidth,card.scrollHeight,card.clientHeight],
    headingRight:Math.max(...(()=>{const r=document.createRange();r.selectNodeContents(heading);return [...r.getClientRects()].map(x=>x.right);})()),
    // painted left edge of the laptop including its stand (the stand reaches 7px past the screen)
    sceneLeft:screen.getBoundingClientRect().left-7};
};

// Count pixels (beyond antialiasing noise) that change when the card stops clipping its content.
async function clippedPixels(page){
  const card=page.locator('.today-card'),vw=page.viewportSize().width;
  // Document coordinates, re-measured for each shot, so a scroll in between cannot shift the comparison.
  const shot=async()=>{const r=await card.evaluate(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y+scrollY,w:b.width,h:b.height};});
    const x=Math.max(0,r.x-24);return page.screenshot({fullPage:true,animations:'disabled',clip:{x,y:Math.max(0,r.y-24),width:Math.min(vw,r.x+r.w+24)-x,height:r.h+48}});};
  await page.mouse.move(0,0);// no hover lift on the button between the two shots
  const hidden=await shot();
  await card.evaluate(el=>{el.style.overflow='visible';});const visible=await shot();await card.evaluate(el=>{el.style.overflow='';});
  return page.evaluate(async([a,b])=>{
    const load=async src=>{const img=new Image();img.src='data:image/png;base64,'+src;await img.decode();const c=new OffscreenCanvas(img.width,img.height),x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,img.width,img.height).data;};
    const [p,q]=await Promise.all([load(a),load(b)]);let n=0;
    for(let i=0;i<p.length;i+=4)if(Math.max(Math.abs(p[i]-q[i]),Math.abs(p[i+1]-q[i+1]),Math.abs(p[i+2]-q[i+2]))>24)n++;
    return n;
  },[hidden.toString('base64'),visible.toString('base64')]);
}

test('today card: "play your day." fits its screen, nothing overlaps or overflows, at every width',async({page})=>{
  await page.goto('/app/');await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});await page.goto('/app/#home');
    await expect(page.locator('.today-card .tiny-screen')).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    const m=await page.evaluate(measure);
    expect(m.text.replace(/\s+/g,' ').trim(),`${width}`).toBe('play your day.');
    expect(m.local.spanScroll[0],`${width}: text wider than the screen`).toBeLessThanOrEqual(m.local.spanScroll[1]);
    expect(m.local.textBottomInScreen,`${width}: text runs into the stand`).toBeLessThanOrEqual(m.local.screenInnerHeight);
    expect(m.local.textRight+m.local.skew<=m.local.mugLeft||m.local.textBottom<=m.local.mugTop,`${width}: mug covers the text ${JSON.stringify(m.local)}`).toBe(true);
    expect(m.misses,`${width}: every character is painted`).toEqual([]);
    // TETO's scene is a rotated box holding a counter-rotated mug, so the card's scrollWidth counts the invisible
    // bounding box of a bounding box (~15px). Check what is actually painted instead: the card rendered with
    // overflow:hidden and with overflow:visible must look the same, i.e. the card clips nothing.
    expect(await clippedPixels(page),`${width}: the card clips part of the drawing`).toBe(0);
    expect(m.card[2],`${width}: card overflows vertically`).toBeLessThanOrEqual(m.card[3]);
    expect(m.headingRight,`${width}: heading runs under the scene`).toBeLessThanOrEqual(m.sceneLeft);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}`).toBe(true);
  }
});

test('numerals use lining sans figures; placeholders and the theme control stay compact',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/app/');await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();
  await page.goto('/app/#home');
  for(const selector of ['.count-badge','.compact-progress i']){
    const font=await page.locator(selector).first().evaluate(el=>getComputedStyle(el).fontFamily);
    expect(font,selector).not.toMatch(/Georgia/);
  }
  const face=page.locator('.v2-top .theme-face');
  expect(Number.parseFloat(await face.evaluate(el=>getComputedStyle(el).fontSize))).toBeLessThanOrEqual(13);
  const select=page.locator('.v2-top [data-theme-picker]');
  expect(Number.parseFloat(await select.evaluate(el=>getComputedStyle(el).fontSize)),'native control keeps 16px (no iOS zoom)').toBeGreaterThanOrEqual(16);
  const box=await select.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeLessThanOrEqual(110);
  await page.goto('/app/#decision');
  const placeholder=await page.locator('#decision-form textarea[name="reason"]').evaluate(el=>{const s=getComputedStyle(el,'::placeholder');return [s.fontSize,s.fontWeight];});
  expect(Number.parseFloat(placeholder[0])).toBeLessThanOrEqual(14);expect(Number(placeholder[1])).toBeLessThanOrEqual(400);
  await page.goto('/app/#compare');
  const step=await page.locator('.reward-steps i').first().evaluate(el=>{const r=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);const t=range.getBoundingClientRect();return Math.abs((t.top+t.bottom)/2-(r.top+r.bottom)/2);});
  expect(step,'reward step digit is vertically centred').toBeLessThanOrEqual(1.5);
});
