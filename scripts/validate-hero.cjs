const dependency = name => require(process.env.MOTION_TEST_MODULES ? require('node:path').join(process.env.MOTION_TEST_MODULES,name) : name);
const {chromium}=dependency('playwright');
const {PNG}=dependency('pngjs');
const pixelmatch=dependency('pixelmatch').default;
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=process.env.MOTION_REPORT_DIR; if(!out) throw new Error('Set MOTION_REPORT_DIR to an external evidence directory'); fs.mkdirSync(out,{recursive:true});
const sizes=[[1440,900],[1280,720],[1280,800],[1024,768],[768,1024],[390,844],[360,780]];
function difference(a,b){const aa=PNG.sync.read(a),bb=PNG.sync.read(b);assert.equal(aa.width,bb.width);assert.equal(aa.height,bb.height);let pixels=0;for(let i=0;i<aa.data.length;i+=4)if(aa.data[i]!==bb.data[i]||aa.data[i+1]!==bb.data[i+1]||aa.data[i+2]!==bb.data[i+2]||aa.data[i+3]!==bb.data[i+3])pixels++;return {raw:pixels,meaningful:pixelmatch(aa.data,bb.data,null,aa.width,aa.height,{threshold:0.1,includeAA:false})};}
// M06: with the pin active the workflow track is 700svh and its frames are validated by
// validate-workflow.cjs; everything above and below the track must still match the baseline.
function rows(buffer,y0,y1){const png=PNG.sync.read(buffer),out=new PNG({width:png.width,height:Math.max(0,y1-y0)});png.data.copy(out.data,0,y0*png.width*4,y1*png.width*4);return PNG.sync.write(out);}
function pinnedDifference(a,b,ta,tb,boxesA,boxesB){assert.equal(ta.y,tb.y,'content above the workflow track moved');
// Above the track: the same strict raster comparison as before.
const above=difference(rows(a,0,ta.y),rows(b,0,tb.y));
// Below the track: Chromium composites content painted after a sticky layer (grayscale instead of LCD
// text antialiasing), so raster equality is not meaningful there. Every box must match exactly instead,
// shifted by the 100svh the pinned track adds; the raster delta is recorded, not asserted.
const shift=tb.h-ta.h;assert.equal(boxesA.length,boxesB.length,'elements after the workflow');boxesA.forEach((r,i)=>assert.deepEqual(r.some(v=>v)?[r[0],Math.round((r[1]+shift)*100)/100,r[2],r[3]]:r,boxesB[i],'box after the workflow #'+i));
const ha=PNG.sync.read(a).height,hb=PNG.sync.read(b).height,below=difference(rows(a,ta.y+ta.h,ha),rows(b,tb.y+tb.h,hb));
return {raw:above.raw,meaningful:above.meaningful,pinnedTrack:tb.h,boxesAfterTrack:boxesB.length,belowRasterOnly:below};}
// M15–M17: below 1024 px the three workflow scenes hold their start states until each plays once
// (validate-scenes.cjs checks their final frames). Above them the raster must match exactly. Below
// them Chromium paints text after the scenes' composited start states with grayscale instead of LCD
// antialiasing (as after the desktop sticky layer), so every box must match exactly instead and the
// raster delta is recorded, not asserted.
function scenesDifference(a,b,s,boxesA,boxesB){const ha=PNG.sync.read(a).height,hb=PNG.sync.read(b).height;assert.equal(ha,hb,'page height');
const above=difference(rows(a,0,s.y),rows(b,0,s.y)),below=difference(rows(a,s.y+s.h,ha),rows(b,s.y+s.h,hb)),scenes=difference(rows(a,s.y,s.y+s.h),rows(b,s.y,s.y+s.h));
assert.equal(boxesA.length,boxesB.length,'elements after the workflow');boxesA.forEach((r,i)=>assert.deepEqual(r,boxesB[i],'box after the workflow #'+i));
return {raw:above.raw,meaningful:above.meaningful,boxesAfterScenes:boxesB.length,belowRasterOnly:below,scenesRasterOnly:scenes};}
async function instrument(page){await page.addInitScript(()=>{
 window.evidence={lcp:0,cls:0,shifts:[],longTasks:[],calls:[],firstBoxes:null};
 new PerformanceObserver(list=>{for(const e of list.getEntries()){window.evidence.lcp=e.startTime;window.evidence.lcpElement=e.element?.className;}}).observe({type:'largest-contentful-paint',buffered:true});
 new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput){window.evidence.cls+=e.value;window.evidence.shifts.push({value:e.value,sources:e.sources.map(s=>({node:s.node?.className||s.node?.parentElement?.className,previous:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))});}}).observe({type:'layout-shift',buffered:true});
 new PerformanceObserver(list=>{for(const e of list.getEntries())window.evidence.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
 const original=Element.prototype.animate;
 Element.prototype.animate=function(keys,options){
 if(!window.evidence.firstBoxes) window.evidence.firstBoxes=[...document.querySelectorAll('.mk-hero-kicker,.mk-hero-title,.mk-hero-deck,.mk-hero-cta,.mk-hero-note,.hero-win,.hero-win .ov-tile,.hero-win .ov-table-head,.hero-win .ov-row,.hero-phone,.hero-phone .ph-head,.hero-phone .ph-panel,.hero-phone .ph-btns,.hero-toast,.hero-where')].map(el=>({selector:el.className,top:el.getBoundingClientRect().top,display:getComputedStyle(el).display}));
 window.evidence.calls.push({selector:this.className,keys,options});return original.call(this,keys,options);
 };
 });}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.MOTION_TEST_BROWSER,headless:true});const report={browser:browser.version(),matrix:[],performance:[]};
 if(!process.argv.includes('--performance-only'))for(const [width,height] of sizes){
 const shots={},tracks={},afters={};
 for(const mode of ['baseline','normal','no-js','reduce','main-blocked','all-blocked']){
 const context=await browser.newContext({viewport:{width,height},javaScriptEnabled:mode!=='no-js',reducedMotion:mode==='reduce'?'reduce':'no-preference'});const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 if(!['baseline','no-js'].includes(mode))await instrument(page);
 if(mode==='main-blocked')await page.route('**/motion.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:'throw new Error("intentional test failure")'}));
 if(mode==='all-blocked')await page.route('**/*.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:''}));
 await page.goto('http://127.0.0.1:'+(mode==='baseline'?8770:8771));await page.waitForTimeout(2300);
 // M18–M20: secondary blocks below the viewport wait in held start states until they reveal once
 // (validate-sections.cjs validates them), and the full-page capture would make them all reach the
 // line. The static composition is compared with every secondary block final, released through the
 // page's own path (keyboard focus inside a section makes its pending reveals final).
 if(mode==='normal')await page.evaluate(()=>document.querySelectorAll('.mk-problem,.mk-results,.mk-audience,.mk-growth,.mk-testimonials,.mk-pricing,.mk-cta').forEach(s=>s.dispatchEvent(new FocusEvent('focusin',{bubbles:true}))));
 const result=await page.evaluate(()=>({classes:document.documentElement.className,overflow:document.documentElement.scrollWidth>innerWidth,titleOpacity:getComputedStyle(document.querySelector('.mk-hero-title')).opacity,transforms:[...document.querySelectorAll('.hero-win,.hero-phone')].map(e=>getComputedStyle(e).transform),animations:document.getAnimations().map(a=>({target:a.effect.target.className,state:a.playState})),evidence:window.evidence,track:(t=>({y:Math.round(t.getBoundingClientRect().top+scrollY),h:t.offsetHeight}))(document.querySelector('[data-flow-track]')),scenes:(s=>s.offsetHeight?{y:Math.round(s.getBoundingClientRect().top+scrollY),h:s.offsetHeight}:null)(document.querySelector('.flow-scenes')),after:[...document.querySelectorAll('.mk-flow~section,.mk-flow~section *,.mk-footer,.mk-footer *')].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y+scrollY,r.width,r.height].map(v=>Math.round(v*100)/100)})}));
 assert.equal(result.overflow,false);assert.equal(result.titleOpacity,'1');if(mode==='main-blocked'){assert.equal(result.classes,'');assert.ok(errors.every(e=>e.includes('intentional test failure')));}else assert.deepEqual(errors,[]);
 const shot=await page.screenshot({fullPage:true});shots[mode]=shot;tracks[mode]=result.track;afters[mode]=result.after;
 let diff=null;if(mode!=='baseline'){diff=result.track.h!==tracks.baseline.h?pinnedDifference(shots.baseline,shot,tracks.baseline,result.track,afters.baseline,result.after):mode==='normal'&&result.scenes?scenesDifference(shots.baseline,shot,result.scenes,afters.baseline,result.after):difference(shots.baseline,shot);if(diff.meaningful>1){fs.writeFileSync(path.join(out,'debug-baseline.png'),shots.baseline);fs.writeFileSync(path.join(out,'debug-candidate.png'),shot);console.log(JSON.stringify(result));}assert.ok(diff.meaningful<=1,`${width}x${height} ${mode}: ${JSON.stringify(diff)} different pixels (tolerance: 1 raster pixel)`);}
 if([1440,1280,390].includes(width)&&(width!==1280||height===720)){
 await page.screenshot({path:path.join(out,`hero-${width}x${height}-${mode}.png`)});
 if(mode==='normal')fs.writeFileSync(path.join(out,`page-${width}x${height}-final.png`),shot);
 }
 report.matrix.push({width,height,mode,differentPixels:diff,...result,errors});await context.close();
 }
 console.log('matrix passed '+width+'x'+height);
 }
 // Paired cold loads: same browser, new contexts; 4x CPU, 150ms RTT, 1.6Mbps down.
 if(!process.argv.includes('--matrix-only'))for(let run=0;run<5;run++)for(const mode of ['baseline','motion']){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const page=await context.newPage();await instrument(page);
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.enable');if(!process.argv.includes('--cpu-only'))await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
 await page.goto('http://127.0.0.1:'+(mode==='baseline'?8770:8771));await page.waitForTimeout(2600);const perf=await page.evaluate(()=>window.evidence);const heroStarted=perf.calls.some(c=>c.options.duration>1);const titleReveal=perf.calls.some(c=>String(c.selector).includes('mk-hero-title')&&c.keys[0].clipPath);/* M20's clip belongs to the below-the-fold CTA title */const titleFallback=perf.calls.some(c=>c.selector==='mk-hero-title'&&c.keys[0].opacity===1&&c.keys[0].translate==='0 16px');if(mode==='motion'&&heroStarted)assert.ok(titleFallback&&!titleReveal,'mobile LCP trial must use only the frozen title fallback');report.performance.push({run,mode,lcp:perf.lcp,lcpElement:perf.lcpElement,heroStarted,titleReveal,titleFallback,cls:perf.cls,shifts:perf.shifts,longTasks:perf.longTasks});await context.close();
 console.log(`performance ${run} ${mode} LCP=${perf.lcp}`);
 }
 const median=values=>values.sort((a,b)=>a-b)[2];if(report.performance.length){report.lcpBaselineMedian=median(report.performance.filter(e=>e.mode==='baseline').map(e=>e.lcp));report.lcpMotionMedian=median(report.performance.filter(e=>e.mode==='motion').map(e=>e.lcp));report.lcpDelta=report.lcpMotionMedian-report.lcpBaselineMedian;}
 const suffix=process.argv.includes('--performance-only')?(process.argv.includes('--cpu-only')?'lcp-mobile-cpu':'lcp-mobile-network'):'hero-validation';fs.writeFileSync(path.join(out,suffix+'.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({baseline:report.lcpBaselineMedian,motion:report.lcpMotionMedian,delta:report.lcpDelta}));
})().catch(e=>{console.error(e);process.exit(1)});
