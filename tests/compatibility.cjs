const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
function runtime(seed){
 const els=new Map(),element=()=>({innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},addEventListener(){},open:false,scrollTop:0,focus(){},showModal(){this.open=true},close(){this.open=false}});
 const storage=new Map();if(seed)storage.set('kotobapath.save.v1',JSON.stringify(seed));
 const ctx={window:{addEventListener(){},scrollTo(){}},document:{querySelector(s){if(!els.has(s))els.set(s,element());return els.get(s)},querySelectorAll(){return []},documentElement:element(),body:element(),addEventListener(){}},location:{hash:'#home'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},console,URL,Blob};vm.createContext(ctx);
 for(const f of ['vocab','grammar','kanji','foundation','readings','blanks','orders','writing'])vm.runInContext(fs.readFileSync(path.join(root,'data',f+'.js'),'utf8'),ctx);
 for(const f of ['data/expansion.js','data/expansion-v1.3.js','data/readings-v1.3.js','data/expansion-v1.4.js','data/readings-v1.4.js','data/readings-v1.5.js','data/grammar-v1.5.js','ruby.js','sync-core.js','data/home-quotes.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 return {run:s=>vm.runInContext(s,ctx),storage,ctx};
}
const r=runtime(),run=r.run;let count=0;
assert.equal(run('state.contentVersion'),'1.11.0');count++;
function check(s,e){assert.deepEqual(JSON.parse(JSON.stringify(run(s))),e,s);count++;}
const legacy=run("({schema:1,profile:{level:'N2',daily:30,font:22,light:true,ruby:false},learned:{g000:true},stars:{f0:true},completed:{r0:true},notes:{g000:'旧版语法笔记 <b>原样保留</b>'},drafts:{w0:'私は学生です。'},reviews:{g000:{due:1,interval:3,ease:2.5,seen:4,correct:3}},wrong:{g000:{count:1,last:1730000000000}},history:[{id:'g000',time:1730000000000,ok:false,mode:'grammar'}],days:{'2025-01-01':{total:12,correct:7}}})");
const loaded=runtime(legacy);assert.equal(loaded.run("state.notes.g000"),legacy.notes.g000);assert.equal(loaded.run('state.profile.font'),22);assert.equal(loaded.run('state.reviews.g000.interval'),3);assert.deepEqual(JSON.parse(loaded.storage.get('kotobapath.backup.before.1.2.0')),legacy);assert.equal(JSON.parse(loaded.storage.get('kotobapath.save.v1')).appVersion,'1.2.0');count+=5;
const ids=JSON.parse(fs.readFileSync(path.join(__dirname,'baseline-ids.json')));for(const [name,list]of Object.entries(ids)){assert(run(JSON.stringify(list)+'.every(id=>MAP.has(id))'),name);count++;}
run('var legacyFixture='+JSON.stringify(legacy));check('validateSave(legacyFixture).days',{'2025-01-01':{total:12,correct:7}});
check('validateSave(JSON.parse(JSON.stringify(validateSave(legacyFixture)))).notes',legacy.notes);
run("var a=validateSave(legacyFixture),b=validateSave(legacyFixture);a.notes.g000='本机修订';b.notes.g000='另一设备修订';var merged=SYNC.merge(a,b)");check("merged.notes.g000",'本机修订');check('merged.sync.conflicts.length',1);check('merged.sync.conflicts[0].value','另一设备修订');check('SYNC.merge(merged,b).sync.conflicts.length',1);check('merged.days',{'2025-01-01':{total:12,correct:7}});
run("var empty=SYNC.upgrade(blankState());var imported=SYNC.merge(empty,validateSave(legacyFixture))");check('imported.profile.level','N2');
run("a=SYNC.upgrade(blankState());b=SYNC.upgrade(blankState());SYNC.addAttempt(a,'g000',true,1000,'grammar','2026-11-04');SYNC.addAttempt(b,'g001',false,1001,'grammar','2026-11-04');merged=SYNC.merge(a,b)");check("merged.days['2026-11-04']",{total:2,correct:1});check("SYNC.merge(merged,b).days['2026-11-04']",{total:2,correct:1});check('SYNC.merge(b,a).history.length',2);
run("a=SYNC.upgrade(blankState());b=SYNC.upgrade(blankState());a.stars.g000=true;SYNC.stamp(a,'stars','g000');b=JSON.parse(JSON.stringify(a));delete b.stars.g000;b.sync.changed.stars.g000+=10;merged=SYNC.merge(a,b)");check("!!merged.stars.g000",false);
run("a=validateSave(legacyFixture);b=JSON.parse(JSON.stringify(a));delete b.wrong.g000;SYNC.stamp(b,'wrong','g000');merged=SYNC.merge(a,b)");check('Object.keys(merged.wrong).length',0);
run("var future=validateSave(legacyFixture);future.notes['future-g99']='未来条目';future.learned['future-g99']=true;var kept=validateSave(JSON.parse(JSON.stringify(future)))");check("kept.notes['future-g99']",'未来条目');check("kept.learned['future-g99']",true);
check("fromItem(RQ[0],'reading-text').id",run('RQ[0].id'));check("fromItem(R[0],'legacy-review').id",run('R[0].id'));
assert.throws(()=>run("var bad=JSON.parse(JSON.stringify(legacyFixture));bad.notes=JSON.parse('{\"__proto__\":\"bad\"}');validateSave(bad)"));count++;
for(const x of run('T')){const q=run('U').find(u=>u.topic===x.id);assert(q&&q.options[q.answer]);count++;}
for(const x of run('U')){assert(x.options.length===4);assert.equal(new Set(x.options).size,4);assert(x.answer>=0&&x.answer<4);count++;}
const long=run("R.filter(x=>x.id.startsWith('r12-')&&x.level==='N1').map(x=>x.text.replace(/\\s/g,'').length)");assert(long.slice(0,3).every(n=>n>=750));count++;
const baselineHashes=JSON.parse(fs.readFileSync(path.join(__dirname,'baseline-hashes.json')));
for(const [n,h]of Object.entries(baselineHashes)){if(n==='vocab')continue;assert.equal(require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'data',n+'.js'))).digest('hex'),h,n+' base data changed');count++;}
const identities=JSON.parse(fs.readFileSync(path.join(__dirname,'expansion-identities.json'))),expanded=JSON.parse(fs.readFileSync(path.join(root,'data/expansion-source.json')));
for(const [id,x]of Object.entries(identities)){const now=expanded[x.category].find(a=>a.id===id);assert(now,'Missing stable ID '+id);const identity=x.category==='usage'?now.question:now.word||now.pattern||now.title||now.sentence||(now.tokens||[]).join('');assert.equal(identity,x.identity,'ID reused or reassigned: '+id);count++;}
assert.equal(run('ALL.length'),run('new Set(ALL.map(x=>x.id)).size'));count++;
const phrases=run("V.filter(x=>x.source==='KotobaPath')");for(const x of phrases){assert.equal(run('V.filter(v=>v.word==='+JSON.stringify(x.word)+'&&v.reading==='+JSON.stringify(x.reading)+').length'),1);count++;}
for(const version of ['1.2.0','1.3.0','1.4.0','1.4.1','1.5.0','1.5.1','1.6.0','1.7.0','1.8.0','1.9.0','1.10.0']){
 const fixture=JSON.parse(JSON.stringify(legacy));fixture.appVersion='1.2.0';fixture.contentVersion=version;
 fixture.learned['v-ext11-001']=true;fixture.notes['g-ext11-004']='定时拓展语法笔记';fixture.stars['t14-0']=true;fixture.completed['r14-8']=true;
 fixture.reviews['rq:r14-8:0']={due:1,interval:3,ease:2.5,seen:4,correct:3};
 const next=runtime(fixture);assert.equal(next.run('state.contentVersion'),'1.11.0');assert.equal(JSON.parse(next.storage.get('kotobapath.save.v1')).contentVersion,'1.11.0');
 assert.equal(next.run("state.notes['g-ext11-004']"),'定时拓展语法笔记');assert(next.run("state.completed['r14-8']"));assert.equal(next.run("state.reviews['rq:r14-8:0'].interval"),3);count+=5;
}
run("modal(V.find(x=>x.id==='v-ext11-001'))");assert(!run("$('#modal-body').innerHTML").includes('基础词条：egg rolls'));count++;
run("modal(V.find(x=>x.id.startsWith('v14-')))");assert(!run("$('#modal-body').innerHTML").includes('基础词条：egg rolls'));count++;
assert(run('topics()').includes('28个深入专题'));count++;
console.log('PASS',count,'compatibility/content checks. New N1 passage lengths:',long.join(', '));
