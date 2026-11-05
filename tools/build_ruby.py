"""Optional maintainer build: pip install Janome==0.5.0; website has no Python/package runtime dependency."""
import json,re
from pathlib import Path
from janome.tokenizer import Tokenizer
root=Path(__file__).resolve().parents[1]
src=json.loads((root/'data/authoring/ruby-input.json').read_text());tokenizer=Tokenizer();data={}
def hira(s):return ''.join(chr(ord(c)-96) if 'ァ'<=c<='ヶ' else c for c in s)
# Context-free vocabulary readings are supplied explicitly by the word cards.
# Sentence readings use morphological analysis; unknown tokens stay unannotated.
fix={'試着':'しちゃく','択':'たく','今日':'きょう','明日':'あした','昨日':'きのう','今年':'ことし','去年':'きょねん','大人':'おとな','一人':'ひとり','二人':'ふたり','一昨日':'おととい','今朝':'けさ','木曜日':'もくようび','金曜日':'きんようび','生き物':'いきもの','何人':'なんにん','何冊':'なんさつ','何枚':'なんまい','何色':'なにいろ','何番':'なんばん','何時':'なんじ','何分':'なんぷん','何日':'なんにち','何回':'なんかい','何年':'なんねん','何匹':'なんびき','何個':'なんこ'}
unknown={}
phrases={'疑問詞':'ぎもんし','助数詞':'じょすうし','連体節':'れんたいせつ','主語':'しゅご','文語':'ぶんご','連用':'れんよう','縮約':'しゅくやく','いかん':'いかん','来室':'らいしつ','来庁':'らいちょう','再来庁':'さいらいちょう','引継ぎ':'ひきつぎ','見積り':'みつもり','貸出':'かしだし','不採用':'ふさいよう','再検討':'さいけんとう','再配達':'さいはいたつ','白黒':'しろくろ','一律':'いちりつ','一方':'いっぽう','一部':'いちぶ','一度':'いちど','十分':'じゅうぶん','試着':'しちゃく','二択':'にたく','未知':'みち','実測':'じっそく','未確認':'みかくにん','全頁':'ぜんページ'}
# Counter combinations are grouped before analysis to avoid e.g. 三 + 日 = さんにち.
numchars='一二三四五六七八九十'
rx=re.compile('|'.join(map(re.escape,sorted([x for x in phrases if x!='十分'],key=len,reverse=True)))+'|(?:['+numchars+']+|[0-9０-９]+)(?:人|日|時|分|冊|本|匹|枚|回|個|箱)')
ones=['','いち','に','さん','よん','ご','ろく','なな','はち','きゅう']
def integer(t):
 if t.isdigit():return int(t)
 if '十' in t:
  a,b=t.split('十');return (numchars.index(a)+1 if a else 1)*10+(numchars.index(b)+1 if b else 0)
 return numchars.index(t)+1

def number_reading(surface,before,after):
 t,u=surface[:-1],surface[-1]
 try:n=integer(t)
 except (ValueError,IndexError):return None
 if not 1<=n<=99:return None
 stem=('' if n//10==0 else (ones[n//10] if n>=20 else '')+'じゅう')+ones[n%10]
 k=n%10
 if u=='日':
  special={1:'いちにち',2:'ふつか',3:'みっか',4:'よっか',5:'いつか',6:'むいか',7:'なのか',8:'ようか',9:'ここのか',10:'とおか',14:'じゅうよっか',20:'はつか',24:'にじゅうよっか'}
  return 'ついたち' if n==1 and before.endswith('月') else special.get(n,stem+'にち')
 if u=='人':return {1:'ひとり',2:'ふたり'}.get(n,(stem[:-2]+'よ' if k==4 else stem)+'にん')
 if u=='時':return (('' if n<20 else ones[n//10])+'じゅう' if n>=10 else '')+{4:'よじ',7:'しちじ',9:'くじ'}.get(k,ones[k]+'じ') if k else stem+'じ'
 if u=='分':
  if n==10 and re.match('(に|な|だ|で|と|すぎ|かどうか)',after):return 'じゅうぶん'
  suffix={1:'いっぷん',2:'にふん',3:'さんぷん',4:'よんぷん',5:'ごふん',6:'ろっぷん',7:'ななふん',8:'はっぷん',9:'きゅうふん',0:'じゅっぷん'}[k]
  return (('' if n==10 else ones[n//10]) if k==0 else (('' if n<20 else ones[n//10])+'じゅう' if n>=10 else ''))+suffix
 if u in ['本','匹','冊','回','個']:
  suffixes={'本':{1:'いっぽん',3:'さんぼん',6:'ろっぽん',8:'はっぽん',0:'じゅっぽん'},'匹':{1:'いっぴき',3:'さんびき',6:'ろっぴき',8:'はっぴき',0:'じゅっぴき'},'冊':{1:'いっさつ',8:'はっさつ',0:'じゅっさつ'},'回':{1:'いっかい',6:'ろっかい',8:'はっかい',0:'じゅっかい'},'個':{1:'いっこ',6:'ろっこ',8:'はっこ',0:'じゅっこ'}}
  if k in suffixes[u]:return (('' if n==10 else ones[n//10]) if k==0 else (('' if n<20 else ones[n//10])+'じゅう' if n>=10 else ''))+suffixes[u][k]
  return stem+{'本':'ほん','匹':'ひき','冊':'さつ','回':'かい','個':'こ'}[u]
 if u=='枚':return stem+'まい'
 if u=='箱':return {1:'ひとはこ',2:'ふたはこ'}.get(n,stem+'はこ')
 return None
for i,text in enumerate(src['texts']):
 segments=[]
 def append_plain(s):
  if segments and isinstance(segments[-1],str):segments[-1]+=s
  elif s:segments.append(s)
 def tokenize_piece(piece):
  pos=0
  for t in tokenizer.tokenize(piece):
   surface=t.surface;start=piece.find(surface,pos);assert start>=pos
   if start>pos:append_plain(piece[pos:start])
   pos=start+len(surface);r=fix.get(surface,hira(t.reading))
   if re.search('[一-龯々]',surface) and r!='*' and re.fullmatch('[ぁ-ゖー]+',r):segments.append([surface,r])
   else:
    if re.search('[一-龯々]',surface):unknown[surface]=unknown.get(surface,0)+1
    append_plain(surface)
  if pos<len(piece):append_plain(piece[pos:])
 pos=0
 for m in rx.finditer(text):
  tokenize_piece(text[pos:m.start()]);surface=m.group();reading=phrases.get(surface) if surface!='十分' else None
  if reading is None:reading=number_reading(surface,text[:m.start()],text[m.end():])
  if reading:segments.append([surface,hira(reading)])
  else:tokenize_piece(surface)
  pos=m.end()
 tokenize_piece(text[pos:])
 assert ''.join(x[0] if isinstance(x,list) else x for x in segments)==text
 data[text]=segments
(root/'data/ruby-data.js').write_text('/* Janome/IPADIC-generated reading segments; see licenses/RUBY-NOTICE.md. */\nwindow.RUBY_DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
(root/'data/ruby-audit.json').write_text(json.dumps({'strings':len(data),'unknownTokens':unknown,'method':'Janome 0.5.0/IPADIC + contextual fixes; vocabulary uses original card readings'},ensure_ascii=False,indent=2)+'\n')
print('Ruby strings',len(data),'unknown types',len(unknown),flush=True)
