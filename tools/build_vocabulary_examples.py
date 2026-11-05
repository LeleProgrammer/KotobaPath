"""Compile original bilingual vocabulary sentences onto existing IDs."""
import json
from pathlib import Path
import re
import subprocess
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/authoring/vocabulary-examples-v18.tsv'
OUTPUT = ROOT / 'data/expansion-v1.8-examples.js'


def lemma(text):
    return re.sub(r'\[[^]]*\]', '', text)


def canonical(text):
    return re.sub(r'[\s。．.!！?？、，,「」『』]', '', unicodedata.normalize('NFKC', lemma(text)))


def main():
    script = r"""
const fs=require('node:fs'),vm=require('node:vm'),context=vm.createContext({window:{}});
for(const [,file] of fs.readFileSync('index.html','utf8').matchAll(/<script src="(data\/[^?"\s]+)/g)){
 if(!/^(data\/vocab\.js|data\/expansion(?:-v1\.[34])?\.js)$/.test(file))continue;
 for(const dep of ['grammar','kanji','foundation','readings','blanks','orders','writing']) context.window[dep.toUpperCase()]??=[];
 vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
console.log(JSON.stringify(context.window.VOCAB));
"""
    words = json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT))
    by_word = {}
    seen = set()
    for word in words:
        by_word.setdefault(lemma(word['word']), []).append(word)
        seen.update(canonical(ja) for ja, _ in word['examples'])
    added = {}
    for number, line in enumerate(SOURCE.read_text(encoding='utf-8').splitlines(), 1):
        if not line or line.startswith('#'):
            continue
        label, ja, zh = (part.strip() for part in line.split('\t'))
        term, reading, gloss = (label.split('|') + ['', ''])[:3]
        matches = [w for w in by_word.get(term, []) if (not reading or reading == w['reading'])
                   and (not gloss or gloss in w['meaning'])]
        if len(matches) != 1:
            raise ValueError(f'{SOURCE.name}:{number}: ambiguous or missing word {label!r}')
        key = canonical(ja)
        if not key or not zh or key in seen:
            raise ValueError(f'{SOURCE.name}:{number}: empty or duplicate sentence for {label!r}')
        seen.add(key)
        added.setdefault(matches[0]['id'], []).append([ja, zh])
    OUTPUT.write_text('''/* Original bilingual examples. Source: data/authoring/vocabulary-examples-v18.tsv. */
(() => {
 const examples = %s;
 for (const word of window.VOCAB) {
  if (Object.prototype.hasOwnProperty.call(examples, word.id)) {
   word.examples.push(...examples[word.id]);
  }
 }
})();
''' % json.dumps(added, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(sum(map(len, added.values())), 'new examples on', len(added), 'entries')


if __name__ == '__main__':
    main()
