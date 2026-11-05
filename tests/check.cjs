const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');const els=new Map();function el(){return {innerHTML:'',textContent:'',value:'',dataset:{},classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},addEventListener(){},open:false,scrollTop:0,focus(){},showModal(){this.open=true},close(){this.open=false}};}
const document={querySelector(s){if(!els.has(s))els.set(s,el());return els.get(s)},querySelectorAll(){return []},documentElement:el(),body:el(),addEventListener(){}};
const storage=new Map(),ctx={window:{addEventListener(){},scrollTo(){}},document,location:{hash:'#home'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},URL,Blob,console};vm.createContext(ctx);
for(const f of ['vocab','grammar','kanji','foundation','readings','blanks','orders','writing'])vm.runInContext(fs.readFileSync(path.join(root,'data',f+'.js'),'utf8'),ctx);
for(const f of ['data/expansion.js','data/expansion-v1.3.js','data/readings-v1.3.js','data/expansion-v1.4.js','data/readings-v1.4.js','data/readings-v1.5.js','data/grammar-v1.5.js','ruby.js','sync-core.js','data/home-quotes.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);let tests=0;function equal(code,expect){assert.equal(run(code),expect,code);tests++;}
for(const [w,type,form,expected]of [['買う','五段','可能形','買える'],['買う','五段','ない形','買わない'],['行く','五段','て形','行って'],['泳ぐ','五段','た形','泳いだ'],['読む','五段','て形','読んで'],['待つ','五段','意向形','待とう'],['帰る','五段','受身形','帰られる'],['話す','五段','使役被动形','話させられる'],['食べる','一段','可能形','食べられる'],['食べる','一段','使役被动形','食べさせられる'],['する','サ变','ない形','しない'],['勉強する','サ变','可能形','勉強できる'],['来る','カ变','命令形','来い'],['くる','カ变','ない形','こない'],['くる','カ变','ます形','きます']])equal(`conjugate('${w}','${type}')['${form}']`,expected);
for(const name of ['home','courses','kana','topics','reading','writing','conjugation','practice','review','notebook','stats','settings','about']){equal(`typeof ${name}()`,'string');}
for(const kind of ['vocab','grammar','kanji'])equal(`library('${kind}').includes('undefined')`,false);
equal('ALL.length',14394); // exact payload inventory, excluding kana
for(const [mode]of run('MODES'))for(const level of ['全部','N5','N4','N3','N2','N1']){const qs=run(`buildQuestions('${mode}','${level}',20)`);assert(qs.length>0,mode+' '+level);for(const q of qs){assert(q.answer);if(q.options){assert(q.options.includes(q.answer));assert.equal(new Set(q.options).size,q.options.length);assert(q.options.length>=2);}assert(run(`MAP.has(${JSON.stringify(q.id)})`));}tests++;}
equal("norm('　食べます。')",'食べます');equal("kanaNorm('ガッコウ')",'がっこう');
run("record(V[0].id,false)");equal('Object.keys(state.wrong).length',1);equal('state.days[today()].total',1);equal('state.reviews[V[0].id].interval',0);run('record(V[0].id,true)');equal('Object.keys(state.wrong).length',0);equal('state.reviews[V[0].id].interval',1);
run('record(KANA[0].id,true)');equal('Object.keys(validateSave(JSON.parse(JSON.stringify(state))).reviews).length',2);
equal("E('<img src=x onerror=alert(1)>').includes('<')",false);
assert.throws(()=>run('validateSave({schema:99})'));tests++;
run("state.reviews[V[1].id]={due:Date.now(),interval:-1,ease:2.5,seen:1,correct:0}");assert.throws(()=>run('validateSave(state)'));tests++;
const payloads=run('[V,G,K,F,R,B,O,W]');const ids=payloads.flat().map(x=>x.id);assert.equal(ids.length,new Set(ids).size);tests++;
for(const x of payloads[4])for(const q of x.questions){assert(q.answer>=0&&q.answer<q.options.length);assert(q.why);}tests++;
console.log('PASS',tests,'checks; data IDs, all modes/levels, conjugation, save validation, SRS and escaping.');
