/* Validate the files actually loaded by index.html, plus scheduled identity stability. */
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),els=new Map();
const el=()=>({innerHTML:'',textContent:'',value:'',dataset:{},classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},addEventListener(){},open:false,scrollTop:0,focus(){},showModal(){this.open=true},close(){this.open=false}});
const ctx={window:{addEventListener(){},scrollTo(){}},document:{querySelector(s){if(!els.has(s))els.set(s,el());return els.get(s)},querySelectorAll(){return []},documentElement:el(),body:el(),addEventListener(){}},location:{hash:'#home'},localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},URL,Blob,console};vm.createContext(ctx);
const html=fs.readFileSync(root+'/index.html','utf8'),scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
let checks=0;for(const f of scripts){assert(!/^https?:/.test(f));assert(fs.existsSync(root+'/'+f),f);vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx,{filename:f});checks++;}
const run=s=>vm.runInContext(s,ctx),manifest=JSON.parse(fs.readFileSync(root+'/data/inventory.json'));
for(const [name,info]of Object.entries(manifest.categories)){assert.equal(run('window.'+name.toUpperCase()+'.length'),info.count);checks++;}
assert.equal(run('R.reduce((n,x)=>n+x.questions.length,0)'),manifest.readingQuestions);checks++;
const snapshot=JSON.parse(fs.readFileSync(__dirname+'/scheduled-identities.json'));for(const [id,x]of Object.entries(snapshot)){
 const item=run('window.'+x.category+'.find(x=>x.id==='+JSON.stringify(id)+')');assert(item,'Missing '+id);let identity=item.word||item.pattern||item.title;
 if(x.category==='VOCAB')identity=item.word+'|'+item.reading;if(x.category==='USAGE')identity=item.question;if(x.category==='READINGS')identity=[item.title,...item.questions.map(q=>q.q)];assert.deepEqual(JSON.parse(JSON.stringify(identity)),x.identity,'Reassigned '+id);checks++;
}
for(const r of run('R'))for(const q of r.questions){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert(q.options[q.answer]);assert(q.why);checks++;}
for(const x of run('ALL')){assert(run('MAP.has('+JSON.stringify(x.id)+')'));checks++;}
assert(!run("G.find(x=>x.id==='g14-002').note").includes('如何か'));checks++;
assert.equal(run('state.contentVersion'),'1.13.0');checks++;
assert(run('topics()').includes('28个深入专题'));checks++;
console.log('PASS',checks,'release checks using actual HTML script order; scheduled IDs, all reading questions and catalog totals verified.');
