const fs=require('fs'),assert=require('assert'),crypto=require('crypto'),runtime=require('./runtime.cjs');
const r=runtime(),run=r.run;let n=0;function check(code,expected){assert.deepEqual(JSON.parse(JSON.stringify(run(code))),expected,code);n++;}
check('R.length',250);check('new Set(R.map(x=>x.title)).size',250);check('RQ.length',889);check('G.length',565);check('U.length',168);check('state.profile.ruby',true);
for(const lv of ['N5','N4','N3','N2','N1'])check(`R.filter(x=>x.level==='${lv}').length`,50);
for(const [id,x]of Object.entries(JSON.parse(fs.readFileSync(__dirname+'/before-v15.json')))){const now=run('MAP.get('+JSON.stringify(id)+')');assert(now,id);if(x.category==='VOCAB')continue;assert.equal(crypto.createHash('sha256').update(JSON.stringify(now)).digest('hex'),x.hash,'Existing entry changed '+id);n++;}
for(const [id,x]of Object.entries(JSON.parse(fs.readFileSync(__dirname+'/v15-identities.json')))){
 const item=run('MAP.get('+JSON.stringify(id)+')');assert(item);const identity=item.pattern||item.question||[item.title,...item.questions.map(q=>[q.q,q.options[q.answer]])];assert.deepEqual(JSON.parse(JSON.stringify(identity)),x.identity,'v1.5 ID reused '+id);n++;
}
const reads=run("R.filter(x=>x.id.startsWith('r15-'))");assert.equal(new Set(reads.map(x=>x.text)).size,175);n++;
for(const x of reads){assert(x.translation&&x.text.length>90);assert.equal(x.questions.length,4);for(const q of x.questions){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert(q.options[q.answer]);assert(q.why);n++;}}
for(const x of run("G.filter(x=>x.id.startsWith('g15-'))")){assert(x.connect&&x.note&&x.example&&x.translation&&x.examples.length);const q=run('U.find(x=>x.grammar==='+JSON.stringify(x.id)+')');assert(q&&q.options[q.answer]);n++;}
check('ALL.length===new Set(ALL.map(x=>x.id)).size',true);
run("state=SYNC.upgrade(blankState());state.wordbook[V[0].id]=true;SYNC.stamp(state,'wordbook',V[0].id);state.stars[V[1].id]=true;state.notes[V[0].id]='自分のノート';var words=validateSave(JSON.parse(JSON.stringify(state)))");check('words.wordbook[V[0].id]',true);check('words.notes[V[0].id]','自分のノート');
run("var a=validateSave(state),b=validateSave(state);delete b.wordbook[V[0].id];b.sync.changed.wordbook[V[0].id]+=10;var merged=SYNC.merge(a,b)");check('!!merged.wordbook[V[0].id]',false);check('merged.stars[V[1].id]',true);
run("var old=JSON.parse(JSON.stringify(state));delete old.wordbook;delete old.contentVersion;var migrated=validateSave(old)");check('migrated.contentVersion','1.8.0');check('migrated.stars[V[1].id]',true);
run("state=SYNC.upgrade(blankState());var totalBefore=Object.values(state.days).reduce((a,x)=>a+x.total,0);scheduleIds([V[0].id,V[1].id]);");check('Object.keys(state.reviews).length',2);check('state.reviews[V[0].id].seen',0);check('Object.keys(state.days).length',0);
run("state.reviews[V[0].id].interval=7;state.reviews[V[0].id].seen=3;state.reviews[V[0].id].correct=2;scheduleIds([V[0].id])");check('state.reviews[V[0].id].interval',7);check('state.reviews[V[0].id].seen',3);
run("startQuiz('reading','N5',1,[V[0].id]);quiz.questions=[fromItem(V[0],'reading')];quiz.given='誤答';record(V[0].id,false);var savedWrong=JSON.parse(JSON.stringify(state));var restored=validateSave(savedWrong);state=restored;var retryQ=buildQuestions('wrong','全部',1,[V[0].id])[0]");check('retryQ.type','input');check('retryQ.answer',run('V[0].reading'));check('state.wrong[V[0].id].given','誤答');
run("var imported=SYNC.merge(SYNC.upgrade(blankState()),state);var twice=SYNC.merge(imported,state)");check('twice.days[today()].total',1);check('twice.wrong[V[0].id].question.type','input');
run("var bad=JSON.parse(JSON.stringify(state));bad.wrong[V[0].id].question.type='script'");assert.throws(()=>run('validateSave(bad)'));n++;
run("record(V[0].id,true)");check('!!state.wrong[V[0].id]',false);check('state.history.filter(x=>x.id===V[0].id&&!x.ok).length',1);
check("JP('食べる','たべる').includes('<rt>た</rt>')",true);check("JP('食べる','たべる').includes('</ruby>べる')",true);check("JP('図書館','としょかん').includes('<rt>としょかん</rt>')",true);
check("JP('<img onerror=1>','x').includes('<img')",false);run('state.profile.ruby=false');check("JP('食べる','たべる')",'食べる');run('state.profile.ruby=true');
for(const x of reads){const segments=r.ctx.window.RUBY_DATA[x.text];assert(segments,x.id+' missing ruby');assert.equal(segments.map(x=>Array.isArray(x)?x[0]:x).join(''),x.text);n++;}
run("bookView='全部';state.wordbook[V[0].id]=true;search=V[0].reading");check('bookItems().some(x=>x.id===V[0].id)',true);check("wordbook().includes('选词闪卡自测')",true);run("search='';reviewView='历史错题'");check('reviewItems().includes(V[0].id)',true);
run("var rq=RQ.find(x=>x.article.startsWith('r15-'));modal(rq)");check("$('#modal-body').innerHTML.includes(E(rq.why))",true);
for(const x of r.ctx.window.VOCAB.filter(x=>/[一-龯々]/.test(x.word))){assert(run('JP('+JSON.stringify(x.word)+','+JSON.stringify(x.reading)+')').includes('<ruby'),x.word+' no ruby');n++;}
for(const [text,parts] of Object.entries(r.ctx.window.RUBY_DATA)){assert.equal(parts.map(x=>Array.isArray(x)?x[0]:x).join(''),text,'ruby changed base text');for(const p of parts)if(Array.isArray(p))assert(/^[ぁ-ゖー]+$/.test(p[1]),'non-hiragana rt');n++;}
assert(run("JP(R.find(x=>x.title==='標本の貸出条件').text)").includes('<rt>らいしつ</rt>'));n++;
assert(run("JP(R.find(x=>x.title==='標本の貸出条件').text)").includes('<rt>ついたち</rt>'));n++;
assert(!run("JP('日本[にほん] 一[いち]')").includes('[にほん]'));n++;
run("state.wordbook['future-word-99']=true;var futureWords=validateSave(JSON.parse(JSON.stringify(state)))");check("futureWords.wordbook['future-word-99']",true);
run("var rubyOff=JSON.parse(JSON.stringify(state));rubyOff.profile.ruby=false");check('validateSave(rubyOff).profile.ruby',false);
run("state.history=[{id:V[0].id,time:100,ok:true},{id:V[1].id,time:200,ok:true}];reviewSort='recent';search='';filterLevel='全部';reviewKind='全部'");check("reviewItems('全部计划')[0]",run('V[1].id'));
console.log('PASS',n,'v1.5 content, original-entry preservation, wordbook merge, exact wrong question, SRS and furigana checks');
