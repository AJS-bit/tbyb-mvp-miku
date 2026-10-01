import {test,expect} from '@playwright/test';

test('projected keyboard edges remain painted with the page styles applied',async({page})=>{
  await page.setViewportSize({width:1440,height:1100});
  await page.goto('/');
  for(const type of ['air','pro']){
    const device=await page.locator(`.pair-card .${type}.laptop`).evaluate(el=>el.outerHTML);
    await page.evaluate(html=>{
      document.querySelector('#illustration-check')?.remove();
      const root=document.createElement('div');root.id='illustration-check';
      root.style.cssText='position:fixed;inset:0;z-index:9999;background:white;padding:20px';
      root.innerHTML=html;root.firstElementChild.style.cssText='position:static;width:1080px;transform:none;filter:none';
      document.body.append(root);
    },device);
    const clipped=await page.locator('#illustration-check svg').evaluate(svg=>{
      const misses=[];
      // Hit-test the painted boundary, including CSS clipping. Reading path
      // coordinates or isPointInFill alone misses a clipping ancestor.
      for(const [index,path] of [...svg.querySelectorAll('.keycap,.keyboard-well')].entries()){
        const box=path.getBBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
        for(let step=0;step<32;step++){
          const edge=path.getPointAtLength(path.getTotalLength()*step/32);
          const point=new DOMPoint(edge.x*.99+cx*.01,edge.y*.99+cy*.01);
          if(!path.isPointInFill(point))continue;
          const screen=point.matrixTransform(path.getScreenCTM());
          const hit=document.elementFromPoint(screen.x,screen.y);
          if(!hit?.closest('.device-keyboard,.keyboard'))misses.push({index,step,hit:hit?.getAttribute('class')});
        }
      }
      return misses;
    });
    expect(clipped,`${type}: painted keyboard points must not be cut off`).toEqual([]);
  }
});
