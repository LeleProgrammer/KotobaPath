const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),ctx={window:{}};vm.createContext(ctx);
const base=['vocab','grammar','kanji','foundation','readings','blanks','orders','writing','expansion','expansion-v1.3','readings-v1.3'];
for(const f of base)vm.runInContext(fs.readFileSync(root+'/data/'+f+'.js','utf8'),ctx);
const arrays=()=>Object.fromEntries(Object.entries(ctx.window).filter(([,v])=>Array.isArray(v))),before=JSON.parse(JSON.stringify(arrays()));
for(const f of ['expansion-v1.4','readings-v1.4'])vm.runInContext(fs.readFileSync(root+'/data/'+f+'.js','utf8'),ctx);
for(const [key,a]of Object.entries(before))assert.deepEqual(JSON.parse(JSON.stringify(ctx.window[key].slice(0,a.length))),a,key+' old data changed');
const all=Object.values(arrays()).flat();assert.equal(new Set(all.map(x=>x.id)).size,all.length);
const additions={};for(const [key,a]of Object.entries(before))additions[key]=ctx.window[key].length-a.length;
const reads=ctx.window.READINGS.filter(x=>x.id.startsWith('r14-'));
assert.equal(reads.length,10);for(const level of ['N5','N4','N3','N2','N1'])assert.equal(reads.filter(x=>x.level===level).length,2);
for(const r of reads){assert(r.translation);for(const q of r.questions){assert(q.options[q.answer]);assert.equal(q.options.length,new Set(q.options).size);assert(q.why.length>10);}}
const lens=reads.filter(x=>x.level==='N1').map(x=>[...x.text.replace(/\s/g,'')].length);assert(lens.every(x=>x>=650));
const unique=new Set(before.VOCAB.map(x=>x.word+'|'+x.reading));for(const x of ctx.window.VOCAB.slice(before.VOCAB.length)){assert(!unique.has(x.word+'|'+x.reading));unique.add(x.word+'|'+x.reading);}
const patterns=new Set(before.GRAMMAR.map(x=>x.pattern));for(const x of ctx.window.GRAMMAR.slice(before.GRAMMAR.length)){assert(!patterns.has(x.pattern));patterns.add(x.pattern);assert(x.note&&x.translation&&x.connect);}
const report={version:'1.4.0',additions,metadata:ctx.window.KOTO_EXPANSION_14,readingQuestions:reads.reduce((n,r)=>n+r.questions.length,0),n1Lengths:lens,oldEntriesPreserved:Object.values(before).flat().length};
fs.writeFileSync(root+'/data/expansion14-audit.json',JSON.stringify(report,null,2));console.log(report);
