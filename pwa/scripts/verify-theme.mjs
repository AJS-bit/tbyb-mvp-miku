import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.TBYB_BASE_URL||'http://127.0.0.1:4317';
const output=process.env.TBYB_THEME_OUTPUT||'artifacts/theme';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
// Both themes (MIKU recolour, 2026-10-02): the same screens are checked in dark and in light.
const themes=(process.env.TBYB_THEMES||'dark,light').split(',');
let page;
const errors=[];
const checks=[];
async function capture(name,path,width=390){
  await page.setViewportSize({width,height:width>1000?1000:844});
  if(path)await page.goto(new URL(path,base).href,{waitUntil:'domcontentloaded'});
  await page.getByRole('combobox',{name:'화면 테마'}).waitFor();
  if(await page.evaluate(()=>document.documentElement.dataset.view==='app')){
    const tab=new URL(page.url()).hash||'#home';
    await expect(page.locator('.bottom-nav [aria-current="page"]')).toHaveAttribute('href',tab);
  }
  // Paint expanded details before measuring their lazily rendered descendants.
  await page.screenshot({path:`${output}/${name}.png`,fullPage:true});
  const contrast=await page.evaluate(()=>{
    const rgba=value=>{const parts=value.match(/[\d.]+/g)?.map(Number);return parts?.length>=3?[...parts.slice(0,3),parts[3]??1]:null;};
    const blend=(front,back)=>front.slice(0,3).map((value,i)=>value*front[3]+back[i]*(1-front[3]));
    const luminance=color=>color.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
    const failures=[];let checked=0,min=Infinity;
    for(const el of document.querySelectorAll('body *')){
      if(!Array.from(el.childNodes).some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()))continue;
      if(el.closest('script,style,option,[aria-hidden="true"],.laptop,.promo-card,:disabled,.theme-label'))continue;
      const style=getComputedStyle(el),rect=el.getBoundingClientRect();
      if(!rect.width||!rect.height||style.visibility==='hidden'||style.display==='none')continue;
      const chain=[];let parent=el,visible=true;
      while(parent){const s=getComputedStyle(parent);if(Number(s.opacity)===0)visible=false;chain.unshift(s);parent=parent.parentElement;}
      if(!visible)continue;
      let bg=[255,255,255];for(const s of chain){const c=rgba(s.backgroundColor);if(c)bg=blend(c,bg);}
      const fg=rgba(style.color);if(!fg)continue;
      const text=blend(fg,bg),a=luminance(text),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&parseInt(style.fontWeight)>=700);
      checked++;min=Math.min(min,ratio);
      if(ratio<(large?3:4.5))failures.push({element:el.tagName+'.'+el.className,text:el.textContent.trim().slice(0,75),color:style.color,background:bg,ratio:Number(ratio.toFixed(2)),required:large?3:4.5});
    }
    return {checked,minRatio:Number(min.toFixed(2)),failures};
  });
  checks.push({name,path,width,contrast,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
}
try{
  for(const theme of themes){
  const T=theme.toUpperCase();
  const context=await browser.newContext({colorScheme:theme,viewport:{width:390,height:844}});
  await context.addInitScript(value=>{try{localStorage.setItem('tbyb-miku-theme',value);}catch{}},theme);
  page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await capture('WEB_'+T,'/',1440);
  await capture('WELCOME_'+T,'/app/');
  await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();
  for(const route of ['home','compare','decision','return'])await capture(`APP_${route.toUpperCase()}_${T}`,`/app/#${route}`);
  await page.goto(new URL('/app/#compare',base).href);
  for(const label of ['영상 · 웹 서핑','두 대 다 써봤어요','같은 걸 해봤어요'])await page.locator('#reflection-form').getByText(label,{exact:true}).click();
  await capture('ANSWERS_SELECTED_'+T,null);
  await page.getByRole('button',{name:'다음',exact:true}).click();
  for(const label of ['차이를 못 느꼈어요','화면을 볼 때'])await page.locator('#reflection-form').getByText(label,{exact:true}).click();
  await capture('REFLECTION_STEP_2_'+T,null);
  await page.getByRole('button',{name:'다음',exact:true}).click();
  await page.locator('#reflection-form').getByText('둘 다 하던 일에 충분했어요',{exact:true}).click();
  await capture('REFLECTION_STEP_3_'+T,null);
  await page.getByRole('button',{name:'경험 저장하기'}).click();await capture('REFLECTION_SAVED_'+T,null);
  await page.locator('.advanced-record>summary').click();await capture('ADVANCED_RECORD_'+T,null);
  await page.getByRole('button',{name:'앱 더 보기'}).click();await capture('APP_MENU_'+T,null);
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await capture('STUDIO_'+T,'/app/studio/',1440);
  await capture('APP_DESKTOP_'+T,'/app/',1440);
  await context.close();
  }
  const result={base,themes,checks,errors};await writeFile(`${output}/CHECK.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  if(errors.length||checks.some(c=>c.overflow||c.contrast.failures.length))process.exitCode=1;
}finally{await browser.close();}
