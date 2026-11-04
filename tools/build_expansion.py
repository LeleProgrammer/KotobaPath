"""Rebuild JS from authored JSON. IDs are explicit; never renumber existing IDs."""
import json
from pathlib import Path
P=Path(__file__).resolve().parents[1]
exp=json.loads((P/'data/expansion-source.json').read_text(encoding='utf-8'))
mapping=[('vocab','VOCAB'),('grammar','GRAMMAR'),('topics','TOPICS'),('readings','READINGS'),('usage','USAGE'),('blanks','BLANKS'),('orders','ORDERS'),('writing','WRITING')]
seen=set();lines=[]
for name,target in mapping:
 for item in exp[name]:
  assert item['id'] not in seen, 'Duplicate ID: '+item['id']
  seen.add(item['id'])
 text=json.dumps(exp[name],ensure_ascii=False,separators=(',',':'))
 if name in ['topics','usage']:lines.append('window.'+target+' = '+text+';')
 else:lines.append('window.'+target+'.push(...'+text+');')
lines.append('(() => { const zh = '+json.dumps(exp['kanjiZh'],ensure_ascii=False)+'; for (const k of window.KANJI) { if (zh[k.char]) k.meaningZh = zh[k.char]; } })();')
(P/'data/expansion.js').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Rebuilt expansion.js with',len(seen),'explicit, stable IDs.')
