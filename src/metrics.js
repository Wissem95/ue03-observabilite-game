'use strict';
const prom=require('prom-client');
const BUILDS=['beta-20260919-2','beta-20260922-1','beta-20260924-3','beta-20260926-5','beta-20260926-6'];
const MAPS=['research','harbor','foundry','canopy','vault'];
function createMetrics(fleet=null) {
 const registry=new prom.Registry();
 prom.collectDefaultMetrics({register:registry,prefix:'game_process_'});
 const labels=['method','route','status'];
 const requests=new prom.Counter({name:'game_http_requests_total',help:'Requêtes HTTP terminées',labelNames:labels,registers:[registry]});
 const duration=new prom.Histogram({name:'game_http_duration_seconds',help:'Durée HTTP côté serveur',labelNames:['method','route'],buckets:[0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5],registers:[registry]});
 const reports=new prom.Counter({name:'game_reports_total',help:'Rapports observés, hors historique',labelNames:['cause','build','origin'],registers:[registry]});
 const frames=new prom.Histogram({name:'game_frame_seconds',help:'Durée image des rapports, échantillon biaisé vers les saccades',labelNames:['cause','build'],buckets:[0.016,0.05,0.1,0.2,0.5,1,2,5,10],registers:[registry]});
 const games=new prom.Counter({name:'game_completed_total',help:'Parties terminées',labelNames:['map'],registers:[registry]});
 const integrity=new prom.Counter({name:'game_integrity_signals_total',help:'Signaux à examiner, pas des verdicts',labelNames:['kind','origin'],registers:[registry]});
 new prom.Gauge({name:'game_active',help:'Parties actuellement simulées',registers:[registry],collect(){this.set(fleet?fleet.liveGames().length:0);}});
 const activeBuild=process.env.BUILD??'beta-20260926-6';
 for(const c of ['inconsistent','background','shader','overlay','server_tick','network','world','render_other','unknown']) {
  reports.labels(c,BUILDS.includes(activeBuild)?activeBuild:'other','fleet').inc(0);
  reports.labels(c,BUILDS.includes(activeBuild)?activeBuild:'other','ingest').inc(0);
 }
 for(const kind of ['inconsistent','short_win'])for(const origin of ['fleet','ingest'])integrity.labels(kind,origin).inc(0);
 function observe(e) {
  const origin=e.source==='ingest'?'ingest':'fleet';
  const build=BUILDS.includes(e.build)?e.build:'other';
  if(e.event==='perf_spike') {reports.inc({cause:e.cause,build,origin});if(typeof e.frame_ms==='number'&&Number.isFinite(e.frame_ms)&&e.frame_ms>=0&&e.cause!=='inconsistent')frames.observe({cause:e.cause,build},e.frame_ms/1000);}
  if(e.event==='game_completed')games.inc({map:MAPS.includes(e.map)?e.map:'other'});
  // Le normaliseur applique le facteur de vitesse de la simulation avant le seuil.
  if(['inconsistent','short_win'].includes(e.integrity))integrity.inc({kind:e.integrity,origin});
 }
 return {registry,requests,duration,observe};
}
module.exports={createMetrics};
