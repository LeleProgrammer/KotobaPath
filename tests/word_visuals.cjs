const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {run, ctx, events} = require('./runtime.cjs')();

const visuals = ctx.window.WORD_VISUALS;
const words = ctx.window.VOCAB;
const assetDir = path.join(__dirname, '../assets/word-pictures');
const sentences = new Set();
const clean = text => text.normalize('NFKC').replace(/\[[^\]]*\]|\s|[。．.!！?？「」]/g, '');
assert.equal(Object.keys(visuals).length, words.length);
assert.equal(fs.readdirSync(assetDir).length, words.length);

for (const word of words) {
 const visual = visuals[word.id];
 assert(visual?.sense.trim(), word.id);
 assert(['illustration', 'diagram'].includes(visual.kind), word.id);
 const image = fs.readFileSync(path.join(assetDir, word.id + '.svg'), 'utf8');
 assert.match(image, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"[^>]*viewBox="0 0 256 200"/);
 assert.match(image, /<g[^>]*>.+<\/g>/);
 assert.doesNotMatch(image, /<image|<script|href=|\.webp/);
 assert(visual.examples === undefined || [1,2].includes(visual.examples.length), word.id);
 for (const {ja, zh, source} of visual.examples || []) {
  const key = clean(ja);
  assert(ja.trim() && zh.trim(), word.id);
  assert(!sentences.has(key), word.id + ' duplicate supplementary sentence');
  assert(!word.examples.some(([base]) => clean(base) === key), word.id + ' duplicate existing sentence');
  sentences.add(key);
  assert(['tatoeba', 'kotobapath', 'eggrolls', 'eggrolls-adapted'].includes(source[0]), word.id);
  if (source[0] === 'tatoeba') {
   assert(Number(source[1]) > 0 && source[2] && Number(source[3]) > 0 && source[4], word.id);
  }
  const segments = ctx.window.RUBY_DATA[ja];
  assert(segments, word.id + ' missing example reading data');
  assert.equal(segments.map(part => Array.isArray(part) ? part[0] : part).join(''), ja);
 }
}
assert.equal(sentences.size, 2899);
run("only='all'; var illustratedWord = V.find(word => WORD_VISUALS.get(word.id).examples);");
assert.equal(run('filtered(V).length'), words.length);
for(const kind of ['illustration','diagram']){
 run(`only='${kind}'`);
 assert.equal(run('filtered(V).length'), Object.values(visuals).filter(x=>x.kind===kind).length);
}
run("only='all'");
assert.match(run("library('vocab')"), /class="word-picture-thumb"/);
run("$('#detail').scrollTop=400; modal(illustratedWord);");
assert.equal(run("$('#detail').scrollTop"), 0);
assert.match(run("$('#modal-body').innerHTML"), /配图义项|词义示意/);
assert.match(run("$('#modal-body').innerHTML"), /补充例句/);
run("$('#detail').scrollTop=400; modal(V.find(word=>!WORD_VISUALS.get(word.id).examples));");
assert.equal(run("$('#detail').scrollTop"), 0);
assert.doesNotMatch(run("$('#modal-body').innerHTML"), /补充例句/);
run("bookView='全部';state.wordbook[illustratedWord.id]=true;");
assert.match(run('wordbook()'), /class="word-picture-thumb"/);

const quotes = ctx.window.HOME_QUOTES;
assert.equal(quotes.length, 36);
assert.equal(new Set(quotes.map(([ja])=>ja)).size, quotes.length);
const first = run('homeQuoteIndex');
run('render();');
assert.equal(run('homeQuoteIndex'), first);
ctx.location.hash = '#vocab';
events['window:hashchange']();
ctx.location.hash = '#home';
events['window:hashchange']();
assert.notEqual(run('homeQuoteIndex'), first);
assert.match(run("$('#main').innerHTML"), /ひとこと/);
assert(run("$('#main').innerHTML.includes(E(HOME_QUOTES[homeQuoteIndex][1]))"));

console.log('PASS', words.length, 'offline SVGs,', sentences.size, 'retained examples, modal position and home quote rotation');
