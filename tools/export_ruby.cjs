const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.resolve(__dirname,'..'),c={window:{}};vm.createContext(c);
const html=fs.readFileSync(root+'/index.html','utf8');for(const [,url]of html.matchAll(/<script\s+src="([^"]+)"/g)){const f=url.split('?')[0];if(!f.startsWith('data/')||f.includes('ruby-data'))continue;vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),c);}
const texts=new Set(),add=s=>{if(typeof s==='string'&&/[一-龯々]/.test(s))texts.add(s);};
for(const x of c.window.VOCAB){add(x.word);for(const [jp]of x.examples)add(jp);}
for(const x of c.window.GRAMMAR){add(x.pattern);add(x.example);for(const [jp]of x.examples||[])add(jp);}
for(const x of c.window.READINGS){add(x.title);add(x.text);for(const q of x.questions){add(q.q);q.options.forEach(add);}}
for(const x of c.window.TOPICS){add(x.title);for(const [jp]of x.examples||[])add(jp);}
for(const x of c.window.USAGE){add(x.question);x.options.forEach(add);}
for(const x of c.window.WRITING){add(x.title);add(x.sample);}
fs.writeFileSync(root+'/data/authoring/ruby-input.json',JSON.stringify({texts:[...texts],vocab:c.window.VOCAB.map(x=>[x.word,x.reading])}));console.log(texts.size,'Japanese strings');
