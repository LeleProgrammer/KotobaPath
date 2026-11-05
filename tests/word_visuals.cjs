const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {run, ctx, events} = require('./runtime.cjs')();

const {VOCAB: words, WORD_VISUALS: visuals, RUBY_DATA: ruby} = ctx.window;
const base = require('./v16-lexical-identity.json');
const lexical = words.slice(0, base.count).map(({examples, ...identity})=>identity);
assert.equal(crypto.createHash('sha256').update(JSON.stringify(lexical)).digest('hex'), base.sha256);
const inventory = require('../data/inventory.json');
const assetDir = path.join(__dirname, '../assets/word-pictures');
const pictures = new Set();
const sentences = new Set();
const clean = text => text.normalize('NFKC').replace(/\[[^\]]*\]|\s|[。．.!！?？、，,「」『』]/g, '');
let withExamples = 0;
let exampleCount = 0;

for (const word of words) {
 const visual = visuals[word.id];
 if (visual) {
  assert(visual.sense.trim(), word.id);
  assert.deepEqual(Object.keys(visual), ['sense']);
  const image = fs.readFileSync(path.join(assetDir, word.id + '.svg'), 'utf8');
  assert.match(image, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"[^>]*viewBox="0 0 256 200"/);
  const drawing = image.match(/<g[^>]*>(.+)<\/g>/)?.[1];
  assert(drawing && !pictures.has(drawing), word.id + ' missing or duplicate artwork');
  pictures.add(drawing);
  assert.doesNotMatch(image, /<image|<script|href=|\.webp/);
  assert(word.examples.length, word.id + ' illustrated word lacks an example');
 }
 if (word.examples.length) withExamples++;
 assert(word.examples.length <= 2, word.id);
 for (const [ja, zh] of word.examples) {
  const key = clean(ja);
  assert(key && zh.trim(), word.id);
  assert(!sentences.has(key), word.id + ' duplicate vocabulary example');
  sentences.add(key);
  if (/[一-龯々]/.test(ja)) {
   assert(ruby[ja], word.id + ' missing reading data');
   assert.equal(ruby[ja].map(part => Array.isArray(part) ? part[0] : part).join(''), ja);
  }
  exampleCount++;
 }
}
assert.equal(pictures.size, inventory.wordVisuals.count);
assert.equal(pictures.size, fs.readdirSync(assetDir).length);
assert.equal(pictures.size, Object.keys(visuals).length);
assert.deepEqual({count: exampleCount, words: withExamples}, inventory.vocabularyExamples);
assert(pictures.size > 0 && pictures.size < words.length);
assert(withExamples > 0 && withExamples < words.length);

run("only='illustrated'; var illustratedWord = filtered(V)[0];");
assert.equal(run('filtered(V).length'), pictures.size);
assert.match(run("library('vocab')"), /class="word-picture-thumb"/);
run("only='examples'");
assert.equal(run('filtered(V).length'), withExamples);
run("$('#detail').scrollTop=400; modal(illustratedWord);");
assert.equal(run("$('#detail').scrollTop"), 0);
assert.match(run("$('#modal-body').innerHTML"), /配图义项/);
assert.match(run("$('#modal-body').innerHTML"), /原创例句/);
run("$('#detail').scrollTop=400; modal(V.find(word=>!WORD_VISUALS.has(word.id)&&!word.examples.length));");
assert.equal(run("$('#detail').scrollTop"), 0);
assert.doesNotMatch(run("$('#modal-body').innerHTML"), /class="word-picture"/);
assert.match(run("$('#modal-body').innerHTML"), /暂未收录原创例句/);
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

console.log('PASS', pictures.size, 'unique offline SVGs and', exampleCount, 'original bilingual examples');
