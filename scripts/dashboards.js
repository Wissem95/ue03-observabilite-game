'use strict';
const fs=require('node:fs');
function panel(id,title,expr,ds='prometheus',type='timeseries',unit='none',description='') {
 const pos=id-1;
 if(type==='logs') expr += ' | line_format "event={{.event}} cause={{.cause}} client={{.client_id}} partie={{.server_id}} build={{.build}} frame={{.frame_ms}}ms overlay={{.overlay_ms}}ms duree={{.duration_s}}s"';
 return {id,title,description:description||title,type,gridPos:{x:(pos%2)*12,y:Math.floor(pos/2)*9,w:12,h:9},datasource:{type:ds,uid:ds},
 targets:[{refId:'A',expr,maxLines:30,queryType:type==='stat'?'instant':'range',instant:type==='stat',legendFormat:ds==='loki'?'{{cause}} {{build}}':'{{route}} {{status}}',datasource:{type:ds,uid:ds}}],
 fieldConfig:{defaults:{unit,decimals:unit==='none'?0:2,color:{mode:'palette-classic'},custom:{lineWidth:2,fillOpacity:8}},overrides:[]},
 options:type==='logs'?{showTime:true,showLabels:false,wrapLogMessage:true,sortOrder:'Descending'}:type==='stat'?{reduceOptions:{calcs:['lastNotNull'],values:false},colorMode:'value',graphMode:'area'}:{legend:{displayMode:'list',placement:'bottom'},tooltip:{mode:'multi'}}};
}
function write(uid,title,panels,historical=false){fs.writeFileSync(`observability/grafana/dashboards/${uid}.json`,JSON.stringify({uid,title,tags:['UE03','observabilite'],timezone:'Europe/Paris',schemaVersion:41,version:1,editable:false,refresh:historical?'':'10s',time:historical?{from:'2026-09-19T22:00:00.000Z',to:'2026-09-26T22:10:00.000Z'}:{from:'now-15m',to:'now'},panels},null,2)+'\n');}
write('ue3-health','1 · Santé du service',[
 panel(1,'Le service répond-il au scraping ?', 'up{job="game"}','prometheus','stat'),
 panel(2,'Combien de requêtes reçoit-on par seconde ?', 'game:http_rps:rate5m','prometheus','stat','reqps'),
 panel(3,'Quel est le p95 de latence de l’API ?', 'histogram_quantile(0.95,sum by(le,route)(rate(game_http_duration_seconds_bucket[5m])))','prometheus','timeseries','s'),
 panel(4,'Quelles réponses HTTP renvoie l’API ?', 'sum by(status)(rate(game_http_requests_total[5m]))'),
 panel(5,'Combien de parties sont actives ?', 'game_active'),
 panel(6,'Quels événements récents expliquent un incident ?', '{job="game",source="live"} | json | event != "http_request"','loki','logs')
]);
const h='{job="game",source="historical",event="perf_spike"}';
write('ue3-performance','2 · Performance côté joueur',[
 panel(1,'Combien de rapports uniques contient l’export ?',`sum(count_over_time(${h}[$__range]))`,'loki','stat'),
 panel(2,'Combien présentent la signature overlay ?',`sum(count_over_time(${h} | json cause="cause" | cause="overlay" [$__range]))`,'loki','stat'),
 panel(3,'Quelles signatures apparaissent et quand ?',`sum by(cause)(count_over_time(${h} | json cause="cause" [1h]))`,'loki'),
 panel(4,'Quels builds concentrent les pics overlay ?',`sum by(build)(count_over_time(${h} | json cause="cause", build="build" | cause="overlay" [1h]))`,'loki'),
 panel(5,'Quels clients et configurations sont concernés ?',`${h} | json | cause="overlay"`,'loki','logs'),
 panel(6,'Quels rapports sont incohérents ?',`${h} | json | cause="inconsistent"`,'loki','logs')
],true);
write('ue3-integrity','3 · Activité et intégrité',[
 panel(1,'Combien de parties terminées sont observées ?', 'sum(count_over_time({job="game",source="historical",event="game_completed"}[$__range]))','loki','stat'),
 panel(2,'Combien de victoires vault 3-0 durent moins de 90 s ?', 'sum(count_over_time({job="game",source="historical",event="game_completed"} | json short_win="short_win" | short_win="true" [$__range]))','loki','stat'),
 panel(3,'Quand surviennent les victoires courtes ?', 'sum(count_over_time({job="game",source="historical",event="game_completed"} | json short_win="short_win" | short_win="true" [30m]))','loki'),
 panel(4,'Quand le tick serveur dépasse-t-il 150 ms ?', 'sum(count_over_time({job="game",source="historical"} | json tick_gap_ms="tick_gap_ms" | tick_gap_ms >= 150 | __error__="" [30m]))','loki'),
 panel(5,'Quelles parties faut-il examiner ?', '{job="game",source="historical",event="game_completed"} | json | short_win="true"','loki','logs'),
 panel(6,'Quelles observations soutiennent le diagnostic serveur ?', `${h} | json | cause="server_tick"`,'loki','logs')
],true);
