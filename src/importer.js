'use strict';
const { DateTime }=require('luxon');
const { createHash }=require('node:crypto');
const {normalize}=require('./detection');
function canonical(v) {
 if(Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
 if(v&&typeof v==='object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 return JSON.stringify(v);
}
function parseExport(text) {
 const heads=[...text.matchAll(/^(Performance spike|Game completed) ([^\n]*?) · ([^\n\r]+)\r?$/gm)];
 const records=[],audit=[],seen=new Map(),ids=new Map();
 if(text.slice(0,heads[0]?.index??text.length).trim())audit.push({kind:'unparsed_prefix',index:0});
 for(let i=0;i<heads.length;i++) {
  const h=heads[i],block=text.slice(h.index+h[0].length,heads[i+1]?.index??text.length);
  const line=text.slice(0,h.index).split('\n').length;
  try {
   const dt=DateTime.fromFormat(h[3],'M/d/yyyy, h:mm:ss a',{zone:'Europe/Paris',locale:'en-US'});
   if(!dt.isValid || dt.getPossibleOffsets().length!==1)throw new Error('date invalide ou ambiguë');
   const offset=block.indexOf('{');if(offset<0)throw new Error('JSON absent');
   const payload=JSON.parse(block.slice(offset).trim());
   const event=h[1]==='Performance spike'?'perf_spike':'game_completed';
   const obj=event==='perf_spike'?payload:{server:payload};
   if(!obj.server || typeof obj.server.id!=='string' || (event==='perf_spike' && typeof obj.report?.id!=='string'))throw new Error('structure invalide');
   const hash=createHash('sha256').update(canonical({event,payload})).digest('hex');
   const ts=dt.toUTC().toISO();
   if(seen.has(hash)) {audit.push({kind:'duplicate',index:i,line,original:seen.get(hash),hash,ts});continue;}
   seen.set(hash,i);
   const id=event+':'+(obj.report?.id??obj.server.id);
   if(ids.has(id))audit.push({kind:'id_conflict',index:i,line,original:ids.get(id),id});
   ids.set(id,i);
   if(h[2]!==obj.server.id)audit.push({kind:'header_id_mismatch',index:i,line});
   records.push(normalize({...obj,event,ts,source:'historical',hash,line,source_index:i,local_time:dt.toISO()}));
  }catch(e){audit.push({kind:'parse_error',index:i,line,error:e.message,raw:block});}
 }
 records.sort((a,b)=>a.ts.localeCompare(b.ts)||a.source_index-b.source_index);
 return {records,audit,blocks:heads.length};
}
module.exports={parseExport};
