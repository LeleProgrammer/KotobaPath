"""Build authored v1.5 content, retaining explicit release ID ranges. Python3.8+."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def dump(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
readings=[];grammar=[];usage=[]
for lv in ['N5','N4','N3','N2','N1']:
 rows=(ROOT/'data/authoring'/f'{lv}.txt').read_text().strip().split('\n\n');assert len(rows)==35
 for j,block in enumerate(rows):
  lines=block.splitlines(); qstart=next(i for i,l in enumerate(lines) if '|' in l);rid,title=lines[0].split('] ',1);rid=rid[1:];assert rid.startswith('r15-');text='\n\n'.join(lines[1:qstart-1]);translation=lines[qstart-1]
  qs=[]
  for i,line in enumerate(lines[qstart:]):
   q,ans,*rest=line.split('|');options=[ans,*rest[:3]];assert len(rest)==4 and len(set(options))==4
   shift=(j+i)%4;options=options[shift:]+options[:shift]
   qs.append({'q':q,'options':options,'answer':options.index(ans),'why':rest[3]})
  assert len(qs)==4
  genre='多文本整合' if text.count('【')>=2 else '论说与观点' if lv in ['N2','N1'] else '日常叙事' if lv in ['N5','N4'] else '说明与思考'
  if '【Ａ' not in text and lv=='N5' and j in [12,20,30]:genre='便条与公告'
  readings.append({'id':rid,'level':lv,'title':title,'text':text,'translation':translation,'genre':genre,'questions':qs,'source':'KotobaPath'})
for j,line in enumerate((ROOT/'data/authoring/grammar.txt').read_text().splitlines()):
 gid,lv,pat,meaning,connect,ex,tr,note,ex2,tr2,q,ans,d1,d2,d3,why=line.split('|');assert gid.startswith('g15-')
 grammar.append({'id':gid,'level':lv,'pattern':pat,'meaning':meaning,'connect':connect,'example':ex,'translation':tr,'note':note,'examples':[[ex2,tr2]],'source':'KotobaPath'})
 opts=[ans,d1,d2,d3];shift=j%4;opts=opts[shift:]+opts[:shift]
 usage.append({'id':gid.replace('g15-','u15-'),'level':lv,'grammar':gid,'title':pat,'question':q,'options':opts,'answer':opts.index(ans),'why':why})
header='/* Original teaching content CC BY 4.0; loader GPL-3.0-or-later. */\n'
(ROOT/'data/readings-v1.5.js').write_text(header+'window.READINGS.push(...'+dump(readings)+');\n')
(ROOT/'data/grammar-v1.5.js').write_text(header+'window.GRAMMAR.push(...'+dump(grammar)+');\nwindow.USAGE.push(...'+dump(usage)+');\n')
print('Authored',len(readings),'readings',sum(len(r['questions']) for r in readings),'questions',len(grammar),'grammar lessons',len(usage),'usage questions')
