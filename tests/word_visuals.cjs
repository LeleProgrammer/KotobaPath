const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {run, ctx} = require('./runtime.cjs')();

const visuals = Object.entries(ctx.window.WORD_VISUALS);
const words = new Map(ctx.window.VOCAB.map(word => [word.id, word]));
const assetDir = path.join(__dirname, '../assets/word-pictures');
const hashes = new Set();
const sentences = new Set();
const clean = text => text.normalize('NFKC').replace(/\[[^\]]*\]|\s|[。．.!！?？「」]/g, '');
assert.equal(visuals.length, 2000);
assert.equal(fs.readdirSync(assetDir).length, 2000);

for (const [id, visual] of visuals) {
 const word = words.get(id);
 assert(word, id);
 assert(visual.sense.trim(), id);
 assert(Number.isInteger(visual.image), id);
 const image = fs.readFileSync(path.join(assetDir, visual.image + '.webp'));
 assert.equal(image.toString('ascii', 0, 4), 'RIFF');
 assert.equal(image.toString('ascii', 8, 12), 'WEBP');
 const hash = crypto.createHash('sha256').update(image).digest('hex');
 assert(!hashes.has(hash), id + ' duplicate illustration');
 hashes.add(hash);
 assert(visual.examples.length >= 1 && visual.examples.length <= 2, id);
 for (const {ja, zh, source} of visual.examples) {
  const key = clean(ja);
  assert(ja.trim() && zh.trim(), id);
  assert(!sentences.has(key), id + ' duplicate new sentence');
  assert(!word.examples.some(([base]) => clean(base) === key), id + ' duplicate existing sentence');
  sentences.add(key);
  assert(['tatoeba', 'kotobapath', 'eggrolls', 'eggrolls-adapted'].includes(source[0]), id);
  if (source[0] === 'tatoeba') {
   assert(Number(source[1]) > 0 && source[2] && Number(source[3]) > 0 && source[4], id);
  }
  const segments = ctx.window.RUBY_DATA[ja];
  assert(segments, id + ' missing example reading data');
  assert.equal(segments.map(part => Array.isArray(part) ? part[0] : part).join(''), ja);
 }
}

run("only='illustrated'; var illustratedWord = filtered(V)[0];");
assert.equal(run('filtered(V).length'), 2000);
assert.match(run("library('vocab')"), /class="word-picture-thumb"/);
assert.match(run("library('vocab')"), /找到 2,000 项/);
run('modal(illustratedWord)');
assert.match(run("$('#modal-body').innerHTML"), /配图义项/);
assert.match(run("$('#modal-body').innerHTML"), /补充例句/);
run("bookView='全部';state.wordbook[illustratedWord.id]=true;");
assert.match(run('wordbook()'), /class="word-picture-thumb"/);
assert.equal(run("wordImage(V.find(word=>!WORD_VISUALS.has(word.id)))"), '');
console.log('PASS', visuals.length, 'offline illustrations and', sentences.size, 'bilingual examples');
