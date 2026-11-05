/* Offline furigana rendering. GPL-3.0-or-later. Data sources: licenses/RUBY-NOTICE.md. */
'use strict';
window.KOTOBA_RUBY=(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const hira=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
 const kanji=/[一-龯々〆ヶ]/, words=new Map();
 for(const x of window.VOCAB){if(!words.has(x.word))words.set(x.word,x.reading);}
 function parts(surface,reading){
  if(!kanji.test(surface)||!reading||reading==='*')return esc(surface);
  if(/^[〜～~]/.test(surface))return esc(surface[0])+parts(surface.slice(1),String(reading).replace(/^[〜～~]/,''));
  if(/[〜～~]$/.test(surface))return parts(surface.slice(0,-1),String(reading).replace(/[〜～~]$/,''))+esc(surface.slice(-1));
  reading=hira(String(reading).split(/[／/、;]/)[0].replace(/（[^）]*）/g,'').trim());
  if(!/^[ぁ-ゖー]+$/.test(reading))return esc(surface);
  const chunks=surface.match(/[一-龯々〆ヶ]+|[^一-龯々〆ヶ]+/g)||[surface];
  const pattern='^'+chunks.map(s=>kanji.test(s)?'(.+?)':hira(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$';
  const m=reading.match(new RegExp(pattern));
  const ruby=(s,r)=>`<ruby lang="ja">${esc(s)}<rp>（</rp><rt>${esc(r)}</rt><rp>）</rp></ruby>`;
  if(!m)return ruby(surface,reading);
  let i=1;return chunks.map(s=>kanji.test(s)?ruby(s,m[i++]):esc(s)).join('');
 }
 const cache=new Map();
 function render(text,reading){
  if(reading)return parts(text,reading);
  if(cache.has(text))return cache.get(text);
  const segments=window.RUBY_DATA?.[text];
  let result;
  if(segments){let trimNext=0;result=segments.map((p,i)=>{if(Array.isArray(p)){const next=segments[i+1];const inline=typeof next==='string'?next.match(/^\[([ぁ-ゖァ-ヶー]+)\]/):null;if(inline){trimNext=inline[0].length;return parts(p[0],inline[1]);}return parts(p[0],p[1]);}const shown=trimNext?p.slice(trimNext):p;trimNext=0;return esc(shown);}).join('');}
  else result=words.has(text)?parts(text,words.get(text)):esc(text);
  if(cache.size<10000)cache.set(text,result);return result;
 }
 return {render,parts};
})();
