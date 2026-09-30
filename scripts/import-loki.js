'use strict';
const fs=require('node:fs');const {parseExport}=require('../src/importer');const {createHash}=require('node:crypto');
async function main(){
 const raw=fs.readFileSync('data/admin-export-2026-09-20_26.log','utf8');
 const hash=createHash('sha256').update(raw).digest('hex');
 const url=process.env.LOKI_URL??'http://localhost:13100';
 const {records}=parseExport(raw);
 for(let i=0;i<90;i++) {try {if((await fetch(url+'/ready')).ok)break;}catch{}if(i===89)throw Error('Loki non prêt');await new Promise(r=>setTimeout(r,1000));}
 // Un marqueur distant permet de restaurer Loki après perte du volume sans perdre l'import.
 const q=new URL(url+'/loki/api/v1/query');q.searchParams.set('query',`sum(count_over_time({job="history-import"} |= "${hash}" [24h]))`);
 const check=await fetch(q);if(!check.ok)throw Error(await check.text());
 const checked=await check.json();if(checked.data.result.some(x=>Number(x.value[1])>0)){console.log('Import déjà présent dans Loki');return;}
 const existingUrl=new URL(url+'/loki/api/v1/query_range');
 for(const [k,v] of Object.entries({query:'{job="game",source="historical"}',start:records[0].ts,end:new Date(Date.parse(records.at(-1).ts)+1000).toISOString(),limit:'10000'})) existingUrl.searchParams.set(k,v);
 const existingResponse=await fetch(existingUrl);if(!existingResponse.ok)throw Error(await existingResponse.text());
 const existing=await existingResponse.json();
 const known=new Set(existing.data.result.flatMap(stream=>stream.values.map(v=>JSON.parse(v[1]).hash)));
 if(known.size>=10000)throw Error('Corpus supérieur à la limite de reprise : pagination nécessaire');
 const pending=records.filter(r=>!known.has(r.hash));
 let count=0;
 for(let i=0;i<pending.length;i+=200){
  const streams=new Map();
  for(const r of pending.slice(i,i+200)){
   const event=r.event;if(!streams.has(event))streams.set(event,[]);
   // Départage nanoseconde stable des événements au même instant, sans changer le temps métier.
   streams.get(event).push([(BigInt(Date.parse(r.ts))*1000000n+BigInt(r.source_index)).toString(),JSON.stringify(r)]);
  }
  const body={streams:[...streams].map(([event,values])=>({stream:{job:'game',source:'historical',event},values:values.sort((a,b)=>a[0].localeCompare(b[0]))}))};
  const res=await fetch(url+'/loki/api/v1/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!res.ok)throw Error(await res.text());count+=pending.slice(i,i+200).length;
 }
 const res=await fetch(url+'/loki/api/v1/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({streams:[{stream:{job:'history-import'},values:[[(BigInt(Date.now())*1000000n).toString(),hash]]}]})});
 if(!res.ok)throw Error(await res.text());console.log(JSON.stringify({imported:count,already_present:known.size,sha256:hash}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
