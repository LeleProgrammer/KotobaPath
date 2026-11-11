/* Additive save compatibility and manual synchronization. GPL-3.0-or-later. */
'use strict';
window.KOTOBA_SYNC = (() => {
 const VERSION='1.2.0',CONTENT_VERSION='1.15.0',FIELDS=['wordbook','learned','stars','completed','notes','drafts','reviews','wrong'];
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const validId=id=>typeof id==='string'&&id.length>0&&id.length<=180&&!['__proto__','prototype','constructor'].includes(id)&&!/[\u0000-\u001f]/.test(id);
 const clone=x=>JSON.parse(JSON.stringify(x));
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const eventId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
 function emptySync(){return {changed:{},daily:{},conflicts:[]};}
 function normalizeSync(s,days){
  if(s===undefined)return {changed:{},daily:Object.fromEntries(Object.entries(days).map(([d,x])=>[d,{baseTotal:x.total,baseCorrect:x.correct,events:{}}])),conflicts:[]};
  if(!object(s)||!object(s.changed)||!object(s.daily)||!Array.isArray(s.conflicts))throw Error('同步元数据结构异常');
  const out=emptySync();
  for(const [f,map]of Object.entries(s.changed)){
   if(!FIELDS.includes(f)&&f!=='profile')continue;
   if(!object(map))throw Error('修改时间结构异常');out.changed[f]={};
   for(const [id,t]of Object.entries(map)){if(!validId(id)||!Number.isFinite(t)||t<0||t>Date.now()+864e5)throw Error('修改时间异常');out.changed[f][id]=t;}
  }
  for(const [d,x]of Object.entries(s.daily)){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!object(x)||!object(x.events)||!Number.isSafeInteger(x.baseTotal)||!Number.isSafeInteger(x.baseCorrect)||x.baseTotal<0||x.baseCorrect<0||x.baseCorrect>x.baseTotal)throw Error('同步统计异常');
   const events={};for(const [id,ok]of Object.entries(x.events)){if(!validId(id)||typeof ok!=='boolean')throw Error('作答事件异常');events[id]=ok;}
   out.daily[d]={baseTotal:x.baseTotal,baseCorrect:x.baseCorrect,events};
  }
  // Missing daily ledger entries are legacy totals, never silently erased.
  for(const [d,x]of Object.entries(days))if(!out.daily[d])out.daily[d]={baseTotal:x.total,baseCorrect:x.correct,events:{}};
  if(s.conflicts.length>5000)throw Error('冲突副本数量过多，请先归档');
  for(const x of s.conflicts){if(!object(x)||!['notes','drafts'].includes(x.field)||!validId(x.id)||typeof x.value!=='string'||x.value.length>100000)throw Error('冲突副本异常');out.conflicts.push({field:x.field,id:x.id,value:x.value});}
  return out;
 }
 function tally(sync){const days={};for(const [d,x]of Object.entries(sync.daily)){const es=Object.values(x.events);days[d]={total:x.baseTotal+es.length,correct:x.baseCorrect+es.filter(Boolean).length};}return days;}
 function upgrade(s){const n=clone(s);if(!n.wordbook)n.wordbook={};n.sync=normalizeSync(n.sync,n.days);n.appVersion=VERSION;n.contentVersion=CONTENT_VERSION;n.days=tally(n.sync);return n;}
 function stamp(s,field,id){if(!s.sync)s.sync=normalizeSync(undefined,s.days);const map=s.sync.changed[field]||(s.sync.changed[field]={});map[id]=Math.max(Date.now(),(map[id]||0)+1);}
 function addAttempt(s,id,ok,time,mode,date){const uid=eventId();const day=s.sync.daily[date]||(s.sync.daily[date]={baseTotal:0,baseCorrect:0,events:{}});day.events[uid]=ok;s.days=tally(s.sync);s.history.push({id,ok,time,mode,uid});s.history=s.history.slice(-5000);return uid;}
 function lastTime(s,field,id){const t=s.sync.changed[field]?.[id];if(t)return t;if(field==='reviews'||field==='wrong'){return Math.max(s.wrong[id]?.last||0,...s.history.filter(x=>x.id===id).map(x=>x.time));}return 0;}
 function merge(local,imported,preference='local'){
  const a=upgrade(local),b=upgrade(imported),out=clone(a),conflicts=[...a.sync.conflicts,...b.sync.conflicts];
  for(const field of FIELDS){
   out[field]={};const rev={};const ids=new Set([...Object.keys(a[field]),...Object.keys(b[field]),...Object.keys(a.sync.changed[field]||{}),...Object.keys(b.sync.changed[field]||{})]);
   for(const id of ids){
    const av=a[field][id],bv=b[field][id],at=lastTime(a,field,id),bt=lastTime(b,field,id);let src;
    if(at!==bt)src=at>bt?a:b;
    else if(!own(a[field],id))src=b;
    else if(!own(b[field],id))src=a;
    else if(['wordbook','learned','stars','completed'].includes(field))src=av?a:b;
    else if(field==='reviews'&&av.seen!==bv.seen)src=av.seen>bv.seen?a:b;
    else if(['notes','drafts'].includes(field)&&!av)src=b;
    else if(['notes','drafts'].includes(field)&&!bv)src=a;
    else src=preference==='imported'?b:a;
    if(own(src[field],id))out[field][id]=clone(src[field][id]);
    if(Math.max(at,bt))rev[id]=Math.max(at,bt);
    if(['notes','drafts'].includes(field)&&typeof av==='string'&&typeof bv==='string'&&av!==bv){const other=src===a?bv:av;if(other)conflicts.push({field,id,value:other});}
   }
   out.sync.changed[field]=rev;
  }
  // Preferences without timestamps follow the user's conflict policy.
  const pristine=FIELDS.every(f=>Object.keys(a[f]).length===0)&&a.history.length===0&&Object.keys(a.days).length===0;
  out.profile={...a.profile};out.sync.changed.profile={};
  for(const id of Object.keys(a.profile)){const at=a.sync.changed.profile?.[id]||0,bt=b.sync.changed.profile?.[id]||0;const src=at===bt?(pristine||preference==='imported'?b:a):at>bt?a:b;out.profile[id]=src.profile[id];if(Math.max(at,bt))out.sync.changed.profile[id]=Math.max(at,bt);}
  out.sync.daily={};
  for(const d of new Set([...Object.keys(a.sync.daily),...Object.keys(b.sync.daily)])){
   const x=a.sync.daily[d]||{baseTotal:0,baseCorrect:0,events:{}},y=b.sync.daily[d]||{baseTotal:0,baseCorrect:0,events:{}};
   const baseTotal=Math.max(x.baseTotal,y.baseTotal),baseCorrect=Math.min(baseTotal,Math.max(x.baseCorrect,y.baseCorrect));
   const events={...x.events};for(const [id,ok]of Object.entries(y.events)){if(own(events,id)&&events[id]!==ok)throw Error('同一作答事件出现不同结果，未合并');events[id]=ok;}
   out.sync.daily[d]={baseTotal,baseCorrect,events};
  }
  const seen=new Set();out.history=[...a.history,...b.history].filter(x=>{const k=x.uid||JSON.stringify([x.id,x.time,x.ok,x.mode]);if(seen.has(k))return false;seen.add(k);return true;}).sort((x,y)=>x.time-y.time).slice(-5000);
  const unique=new Map();for(const x of conflicts)unique.set(JSON.stringify([x.field,x.id,x.value]),x);
  if(unique.size>5000)throw Error('合并后冲突副本过多，请先导出归档');out.sync.conflicts=[...unique.values()];out.days=tally(out.sync);return out;
 }
 return {VERSION,CONTENT_VERSION,validId,upgrade,normalizeSync,merge,stamp,addAttempt,tally};
})();
