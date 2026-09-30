'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {createMetrics}=require('../src/metrics');const {createApp}=require('../src/app');
test('RED capture JSON invalide et borne les routes inconnues',async()=>{
 const m=createMetrics();const srv=createApp({log:()=>{},fleet:null,metrics:m}).listen(0);
 const base=`http://127.0.0.1:${srv.address().port}`;
 try {
  await fetch(base+'/user/secret-1');await fetch(base+'/user/secret-2');
  await fetch(base+'/api/reports',{method:'POST',headers:{'content-type':'application/json'},body:'{'});
  const txt=await(await fetch(base+'/metrics')).text();
  assert.match(txt,/route="unmatched",status="404"} 2/);
  assert.doesNotMatch(txt,/secret-1|secret-2/);
  assert.match(txt,/status="400"} 1/);
 }finally{srv.close();m.registry.clear();}
});
test('build non reconnu ramené à other',async()=>{
 const m=createMetrics();for(let i=0;i<50;i++)m.observe({event:'perf_spike',cause:'unknown',build:'arbitrary-'+i,frame_ms:1});
 const txt=await m.registry.metrics();assert.match(txt,/cause="unknown",build="other",origin="fleet"} 50/);assert.doesNotMatch(txt,/arbitrary-/);m.registry.clear();
});
test('durée absente ne produit pas une observation zéro',async()=>{
 const {normalize}=require('../src/detection');const m=createMetrics();
 m.observe(normalize({event:'perf_spike',report:{id:'P-0123abcd-1'},server:{}}));
 const txt=await m.registry.metrics();assert.doesNotMatch(txt,/game_frame_seconds_count\{cause="unknown"/);m.registry.clear();
});
