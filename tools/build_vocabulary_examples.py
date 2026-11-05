"""Compile original bilingual vocabulary sentences onto existing IDs."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import unicodedata

ROOT = Path(__file__).resolve().parents[1]


def lemma(text):
    return re.sub(r'\[[^]]*\]', '', text)


def canonical(text):
    return re.sub(r'[\s。．.!！?？、，,「」『』]', '', unicodedata.normalize('NFKC', lemma(text)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--batch', choices=['18', '19', '110'], default='110')
    batch = parser.parse_args().batch
    source = ROOT / f'data/authoring/vocabulary-examples-v{batch}.tsv'
    output = ROOT / f'data/expansion-v1.{batch[1:]}-examples.js'
    script = r"""
const fs=require('node:fs'),vm=require('node:vm'),context=vm.createContext({window:{}});
for(const [,file] of fs.readFileSync('index.html','utf8').matchAll(/<script src="(data\/[^?"\s]+)/g)){
 const batch=Number(process.argv[1].slice(1));
 const previous=file.match(/^data\/expansion-v1\.(\d+)-examples\.js$/);
 if(!(previous && Number(previous[1])<batch)&&!/^(data\/vocab\.js|data\/expansion(?:-v1\.[34])?\.js)$/.test(file))continue;
 for(const dep of ['grammar','kanji','foundation','readings','blanks','orders','writing']) context.window[dep.toUpperCase()]??=[];
 vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
console.log(JSON.stringify(context.window.VOCAB));
"""
    words = json.loads(subprocess.check_output(['node', '-e', script, batch], cwd=ROOT))
    by_id = {word["id"]: word for word in words}
    by_word = {}
    seen = set()
    for word in words:
        by_word.setdefault(lemma(word['word']), []).append(word)
        seen.update(canonical(ja) for ja, _ in word['examples'])
    added = {}
    for number, line in enumerate(source.read_text(encoding='utf-8').splitlines(), 1):
        if not line or line.startswith('#'):
            continue
        label, ja, zh = (part.strip() for part in line.split('\t'))
        if batch != '18':
            matches = [by_id[label]] if label in by_id else []
        else:
            term, reading, gloss = (label.split('|') + ['', ''])[:3]
            matches = [w for w in by_word.get(term, []) if (not reading or reading == w['reading'])
                       and (not gloss or gloss in w['meaning'])]
        if len(matches) != 1:
            raise ValueError(f'{source.name}:{number}: ambiguous or missing word {label!r}')
        key = canonical(ja)
        if not key or not zh or key in seen:
            raise ValueError(f'{source.name}:{number}: empty or duplicate sentence for {label!r}')
        seen.add(key)
        added.setdefault(matches[0]['id'], []).append([ja, zh])
    output.write_text('''/* Original bilingual examples. Source: data/authoring/%s. */
(() => {
 const examples = %s;
 for (const word of window.VOCAB) {
  if (Object.prototype.hasOwnProperty.call(examples, word.id)) {
   word.examples.push(...examples[word.id]);
  }
 }
})();
''' % (source.name, json.dumps(added, ensure_ascii=False, separators=(',', ':'))), encoding='utf-8')
    print(sum(map(len, added.values())), 'new examples on', len(added), 'entries')


if __name__ == '__main__':
    main()
