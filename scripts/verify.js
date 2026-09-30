'use strict';
const fs=require('node:fs');const assert=require('node:assert/strict');
async function get(base,path,params={}){const u=new URL(path,base);for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);const r=await fetch(u);assert.ok(r.ok,`${u}: ${r.status} ${await(!r.ok?r.text():Promise.resolve(''))}`);return r.json();}
async function main(){
 const results={checked_at:new Date().toISOString()};
 results.health=await get('http://localhost:18080','/healthz');
 results.targets=await get('http://localhost:19090','/api/v1/targets');
 assert.ok(results.targets.data.activeTargets.every(t=>t.health==='up'));
 const promQuery=q=>get('http://localhost:19090','/api/v1/query',{query:q});
 results.requests=await promQuery('sum(game_http_requests_total)');assert.ok(Number(results.requests.data.result[0]?.value[1])>0);
 results.rules=await get('http://localhost:19090','/api/v1/rules');assert.ok(results.rules.data.groups.every(g=>g.rules.every(r=>r.health==='ok')));
 results.historical=await get('http://localhost:13100','/loki/api/v1/query',{query:'sum by(event)(count_over_time({job="game",source="historical"}[8d]))',time:'2026-09-27T00:00:00Z'});
 const counts=Object.fromEntries(results.historical.data.result.map(r=>[r.metric.event,Number(r.value[1])]));
 assert.deepEqual(counts,{game_completed:779,perf_spike:2110});
 results.live=await get('http://localhost:13100','/loki/api/v1/query',{query:'sum(count_over_time({job="game",source="live"}[5m]))'});assert.ok(Number(results.live.data.result[0]?.value[1])>0);
 results.grafana=await get('http://localhost:13000','/api/search');assert.equal(results.grafana.filter(x=>x.type==='dash-db').length,3);
 results.panels=[];
 for(const f of fs.readdirSync('observability/grafana/dashboards')){
  const d=JSON.parse(fs.readFileSync('observability/grafana/dashboards/'+f));
  for(const p of d.panels){
   const expr=p.targets[0].expr.replaceAll('$__range','8d');
   const hist=d.uid!=='ue3-health';
   const range={query:expr,start:hist?'2026-09-19T22:00:00Z':new Date(Date.now()-900000).toISOString(),end:hist?'2026-09-26T22:10:00Z':new Date().toISOString(),step:hist?'1800':'15',limit:'30'};
   const base=p.datasource.uid==='prometheus'?'http://localhost:19090':'http://localhost:13100';
   const prefix=p.datasource.uid==='prometheus'?'/api/v1/':'/loki/api/v1/';
   const result=await get(base,prefix+(p.type==='stat'?'query':'query_range'),p.type==='stat'?{query:expr,time:range.end}:range);
   assert.ok(result.data.result.length>0,`Panneau sans données : ${p.title}`);
   assert.equal(result.status,'success');results.panels.push({dashboard:d.uid,title:p.title,series:result.data.result.length});
  }
 }
 fs.mkdirSync('evidence',{recursive:true});fs.writeFileSync('evidence/runtime-verification.json',JSON.stringify(results,null,2));console.log(JSON.stringify({counts,panels:results.panels,live:results.live.data.result},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
