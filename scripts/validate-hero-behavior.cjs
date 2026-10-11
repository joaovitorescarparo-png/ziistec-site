const {chromium}=require(process.env.MOTION_TEST_MODULES ? require('node:path').join(process.env.MOTION_TEST_MODULES,'playwright') : 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.MOTION_REPORT_DIR; if(!out) throw new Error('Set MOTION_REPORT_DIR to an external evidence directory'); fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.MOTION_TEST_BROWSER,headless:true});const results=[];
 for(const [width,height] of [[1440,900],[1280,720],[390,844]]){
 const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();
 await page.goto('http://127.0.0.1:8771');
 for(const [index,wait] of [60,300,500,1200].entries()){await page.waitForTimeout(wait);await page.screenshot({path:path.join(out,`hero-${width}x${height}-entrance-${index+1}.png`)});}
 await context.close();results.push({test:'entrance-captures',width,height});
 }
 for(const [width,height] of [[1440,900],[1280,720],[1280,800],[1024,768],[768,1024],[390,844],[360,780]]){
 const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.calls=[];window.boxes=null;const original=Element.prototype.animate;Element.prototype.animate=function(keys,options){
 if(!window.boxes){window.boxes=[...document.querySelectorAll('.mk-hero-kicker,.mk-hero-title,.mk-hero-deck,.mk-hero-cta,.mk-hero-note,.hero-win,.hero-win .ov-tile,.hero-win .ov-table-head,.hero-win .ov-row,.hero-phone,.hero-phone .ph-head,.hero-phone .ph-panel,.hero-phone .ph-btns,.hero-toast,.hero-where')].map(e=>({cls:e.className,top:e.getBoundingClientRect().top,visible:e.getClientRects().length>0}));}
 window.calls.push({cls:this.className,keys,options});return original.call(this,keys,options);};});
 await page.goto('http://127.0.0.1:8771');await page.waitForTimeout(2100);
 const fold=await page.evaluate(()=>({boxes:window.boxes,calls:window.calls.filter(c=>c.options.duration>1&&!c.options.pseudoElement)}));
 const expected=fold.boxes.filter(b=>b.visible&&b.top<height);
 assert.equal(fold.calls.length,expected.length,`${width}: fold count`);
 for(const box of fold.boxes.filter(b=>b.top>=height||!b.visible))assert.equal(fold.calls.some(c=>c.cls===box.cls),false,`${width} should skip ${box.cls}`);
 const phone=fold.calls.find(c=>c.cls==='hero-phone');if(phone)assert.equal(phone.keys[0].translate,`0 ${width<640?32:width<1024?40:64}px`);
 const title=fold.calls.find(c=>c.cls==='mk-hero-title');assert.equal(title.options.delay,60);assert.equal(title.options.duration,width<1024?544:640);assert.equal(title.options.easing,'cubic-bezier(0.16,1,0.3,1)');
 if(width<640){assert.equal(title.keys[0].opacity,1);assert.equal(title.keys[0].translate,'0 16px');assert.equal(title.keys[0].clipPath,undefined);}else assert.equal(title.keys[0].clipPath,'inset(0 0 100% 0)');
 const ctaDelays=fold.calls.filter(c=>c.cls.includes('mk-hero-cta')).map(c=>c.options.delay);assert.deepEqual(ctaDelays,[310,380]);
 const win=fold.calls.find(c=>c.cls==='hero-win');if(win)assert.equal(win.keys[0].scale,width<640?undefined:0.98);
 const geometry=await page.evaluate(()=>{const e=document.querySelector('.mk-hero-stage'),r=e.getBoundingClientRect();return {stageTop:r.top+scrollY,stageHeight:r.height};});
 const opacity=[];
 for(const exit of [0.6,0.8,1,0.8,0.6]){
 await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),geometry.stageTop+geometry.stageHeight*exit);
 const goal=width<640?1:(1-exit)/0.4;await page.waitForFunction(goal=>Math.abs(Number(getComputedStyle(document.querySelector('.hero-toast')).opacity)-goal)<0.005,goal,{timeout:3000});
 const o=await page.evaluate(()=>Number(getComputedStyle(document.querySelector('.hero-toast')).opacity));opacity.push(o);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getAnimations().length===0&&!document.documentElement.classList.contains('motion'));assert.equal(await page.evaluate(()=>window.ziisMotion.isPinEligible()),false);
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect.getTiming().duration>1).length),0);
 results.push({test:'fold-timings-M05-live-reduce',width,height,fold,opacity,errors});assert.deepEqual(errors,[]);await context.close();console.log('behavior passed '+width+'x'+height);
 }
 // Preference changes DURING the entrance, and navigation must never replay it.
 const context=await browser.newContext({viewport:{width:1280,height:720}});const page=await context.newPage();await page.goto('http://127.0.0.1:8771');await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.getAnimations().some(a=>a.effect.getTiming().duration>1)));
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>document.getAnimations().length),0);assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.mk-hero-title')).opacity),'1');results.push({test:'reduce-during-entrance',passed:true});
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:8771/#como-funciona');await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect.getTiming().duration>1).length),0);results.push({test:'anchor-no-entrance',passed:true});
 await page.goto('http://127.0.0.1:8771/privacidade.html');assert.equal(await page.locator('script[src*="motion"]').count(),0);await page.goBack();await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect.getTiming().duration>1).length),0);results.push({test:'back-navigation-no-replay',passed:true});
 await page.goto('http://127.0.0.1:8771');await page.waitForTimeout(2100);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>document.getAnimations().length),0);results.push({test:'resize-to-mobile-clears-M05',passed:true});
 // R2 positive and negative device profiles; workflow remains static in all of them.
 for(const [width,height] of [[1440,900],[1024,600],[1440,599],[1023,900]]){await page.setViewportSize({width,height});const eligible=await page.evaluate(()=>window.ziisMotion.isPinEligible());assert.equal(eligible,width>=1024&&height>=600);results.push({test:'R2-fine-pointer',width,height,eligible});}
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(100);
 const track=await page.evaluate(()=>{
 window.scrollAudit={longTasks:[],cls:0};
 new PerformanceObserver(list=>{for(const e of list.getEntries())window.scrollAudit.longTasks.push(e.duration);}).observe({type:'longtask'});
 new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.scrollAudit.cls+=e.value;}).observe({type:'layout-shift'});
 const r=document.querySelector('[data-flow-track]').getBoundingClientRect();return {start:r.top+scrollY,length:r.height};
 });
 for(let i=0;i<24;i++){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),track.start+i*(track.length-900)/23);await page.waitForTimeout(32);}
 const scrollAudit=await page.evaluate(()=>window.scrollAudit);assert.equal(scrollAudit.cls,0);assert.equal(scrollAudit.longTasks.length,0);results.push({test:'static-workflow-scroll-performance',...scrollAudit});
 await context.close();const touch=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true,isMobile:true});const tp=await touch.newPage();await tp.goto('http://127.0.0.1:8771');assert.equal(await tp.evaluate(()=>window.ziisMotion.isPinEligible()),false);results.push({test:'R2-coarse-touch',eligible:false});await touch.close();
 fs.writeFileSync(path.join(out,'hero-behavior.json'),JSON.stringify(results,null,2));await browser.close();console.log('behavior validations '+results.length);
})().catch(e=>{console.error(e);process.exit(1)});
