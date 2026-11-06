const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),assert=require('assert');
const root=path.resolve(__dirname,'..'),ctx={window:{}};vm.createContext(ctx);
const names=['vocab','grammar','kanji','foundation','readings','blanks','orders','writing'];for(const n of names)vm.runInContext(fs.readFileSync(path.join(root,'data',n+'.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data/expansion.js'),'utf8'),ctx);
for(const f of ['expansion-v1.3','readings-v1.3','expansion-v1.4','readings-v1.4','readings-v1.5','grammar-v1.5','expansion-v1.8-examples','expansion-v1.9-examples','expansion-v1.10-examples','expansion-v1.11-examples','expansion-v1.12-examples','expansion-v1.13-examples'])vm.runInContext(fs.readFileSync(path.join(root,'data',f+'.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data/word-visuals.js'),'utf8'),ctx);
const manifest={version:'1.13.0',categories:{},readingQuestions:0,kanjiChinese:0},allIds=new Set();
for(const name of [...names,'topics','usage']){
 const a=ctx.window[name.toUpperCase()];manifest.categories[name]={count:a.length,levels:{}};
 for(const x of a){assert(!allIds.has(x.id),'Duplicate ID: '+x.id);allIds.add(x.id);manifest.categories[name].levels[x.level]=(manifest.categories[name].levels[x.level]||0)+1;}
}
manifest.readingQuestions=ctx.window.READINGS.reduce((n,x)=>n+x.questions.length,0);manifest.kanjiChinese=ctx.window.KANJI.filter(x=>x.meaningZh).length;
const visuals=ctx.window.WORD_VISUALS;
manifest.wordVisuals={count:0,levels:{}};
manifest.vocabularyExamples={count:0,words:0,atLeastTwo:0,missingForTwo:0};
for(const word of ctx.window.VOCAB){
 manifest.vocabularyExamples.count+=word.examples.length;
 if(word.examples.length)manifest.vocabularyExamples.words++;
 if(word.examples.length>=2)manifest.vocabularyExamples.atLeastTwo++;
 manifest.vocabularyExamples.missingForTwo+=Math.max(0,2-word.examples.length);
 const visual=visuals[word.id];
 if(!visual)continue;
 manifest.wordVisuals.count++;
 manifest.wordVisuals.levels[word.level]=(manifest.wordVisuals.levels[word.level]||0)+1;
}
assert.equal(manifest.wordVisuals.count,Object.keys(visuals).length,'Illustrations must link to existing vocabulary');
manifest.files={};for(const file of fs.readdirSync(path.join(root,'data')).filter(x=>/\.(js|json)$/.test(x)&&!['inventory.json'].includes(x))){manifest.files[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data',file))).digest('hex');}
fs.writeFileSync(path.join(root,'data/inventory.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest.categories));console.log('Reading questions',manifest.readingQuestions,'Chinese kanji meanings',manifest.kanjiChinese);
