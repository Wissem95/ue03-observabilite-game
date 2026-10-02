-- Q01_volumetrie
SELECT event, count(*) AS n, min(ts) AS debut_utc,max(ts) AS fin_utc FROM events GROUP BY event;
-- Q02_qualite_import
SELECT kind,count(*) AS n FROM audit GROUP BY kind;
-- Q03_classes
SELECT cause,count(*) AS n,count(DISTINCT client_id) AS clients,count(DISTINCT server_id) AS parties,min(ts) AS debut_utc,max(ts) AS fin_utc FROM events WHERE event='perf_spike' GROUP BY cause ORDER BY n DESC;
-- Q04_build
SELECT build,count(*) AS rapports,sum(cause='overlay') AS overlay,sum(cause='inconsistent') AS incoherents,round(avg(CASE WHEN cause NOT IN ('inconsistent','background','shader') THEN frame_ms END),1) AS moyenne_filtre_ms,min(ts) AS debut_utc,max(ts) AS fin_utc FROM events WHERE event='perf_spike' GROUP BY build;
-- Q05_cohortes
SELECT build,width>=2560 AS haute_definition,bloom,count(*) AS rapports,sum(cause='overlay') AS overlay FROM events WHERE event='perf_spike' AND cause<>'inconsistent' GROUP BY build,haute_definition,bloom;
-- Q06_overlay_population
SELECT browser,width,bloom,count(*) AS n,count(DISTINCT client_id) AS clients FROM events WHERE cause='overlay' GROUP BY browser,width,bloom ORDER BY n DESC;
-- Q07_tick_horaire
SELECT substr(local_time,1,13) AS heure_paris,count(*) AS n,round(avg(tick_gap_ms),1) AS tick_gap_moyen FROM events WHERE tick_gap_ms>=150 GROUP BY heure_paris;
-- Q08_farming
SELECT substr(local_time,1,10) AS jour,count(*) AS parties,sum(short_win) AS victoires_courtes,sum(quarantined) AS quarantaines,round(min(duration_s),2) AS min_s,round(max(duration_s),2) AS max_s FROM events WHERE event='game_completed' GROUP BY jour;
-- Q09_farming_intervalles
SELECT ts,server_id,round(duration_s,2) AS secondes,quarantined,round((julianday(ts)-julianday(lag(ts) OVER(ORDER BY ts)))*86400,1) AS intervalle_s FROM events WHERE short_win=1 ORDER BY ts;
-- Q10_incoherences
SELECT client_id,count(*) AS n,min(ts) AS debut_utc,max(ts) AS fin_utc,min(frame_ms) AS frame_min,max(frame_ms) AS frame_max,min(total_ms) AS total_min,max(total_ms) AS total_max FROM events WHERE cause='inconsistent' GROUP BY client_id;
-- Q11_trous
WITH t AS (SELECT ts,lag(ts) OVER(ORDER BY ts) AS precedent FROM events) SELECT precedent,ts,round((julianday(ts)-julianday(precedent))*86400,1) AS secondes FROM t WHERE (julianday(ts)-julianday(precedent))*86400>1800 ORDER BY secondes DESC;
-- Q12_schemas
SELECT version,count(*) AS n,sum(rtt_ms IS NULL) AS rtt_absent,sum(json_extract(raw,'$.report.graphics.gpuRenderMs') IS NULL) AS gpu_absent FROM events WHERE event='perf_spike' GROUP BY version;
-- Q13_temps_incoherents
SELECT event,sum(duration_s<0) AS avant_creation,sum(duration_s>86400) AS plus_un_jour,sum(json_extract(raw,'$.server.players')+json_extract(raw,'$.server.bots')>json_extract(raw,'$.server.capacity')) AS capacite_depassee FROM events GROUP BY event;
-- Q14_clients_sequences
WITH s AS (SELECT client_id,cast(substr(report_id,12) AS INTEGER) AS seq FROM events WHERE event='perf_spike'), d AS(SELECT DISTINCT client_id,seq FROM s), g AS(SELECT client_id,seq-lag(seq) OVER(PARTITION BY client_id ORDER BY seq)-1 AS manque FROM d) SELECT client_id,sum(manque) AS numeros_non_observes FROM g WHERE manque>0 GROUP BY client_id ORDER BY numeros_non_observes DESC;
-- Q15_parties_sans_fin
SELECT count(DISTINCT p.server_id) AS parties_sans_fin FROM events p WHERE p.event='perf_spike' AND NOT EXISTS(SELECT 1 FROM events g WHERE g.event='game_completed' AND g.server_id=p.server_id);
-- Q16_avant_apres_cohorte
SELECT CASE WHEN ts<'2026-09-24T16:00:00.000Z' THEN 'avant_jeudi_18h_Paris' ELSE 'apres' END AS periode,count(*) AS rapports,sum(cause='overlay') AS overlay,count(DISTINCT client_id) AS clients FROM events WHERE event='perf_spike' AND width>=2560 AND bloom=1 AND cause<>'inconsistent' GROUP BY periode;
-- Q17_premiers_overlay
SELECT ts,local_time,build,client_id,frame_ms,overlay_ms,rtt_ms,tick_gap_ms FROM events WHERE cause='overlay' ORDER BY ts LIMIT 10;
-- Q18_farming_signature
SELECT map,json_extract(raw,'$.server.score') AS score,count(*) AS n,round(min(duration_s),1) AS min_s,round(max(duration_s),1) AS max_s,sum(quarantined) AS quarantaines,min(ts) AS debut,max(ts) AS fin FROM events WHERE event='game_completed' GROUP BY map,score,short_win ORDER BY n DESC;
-- Q19_temoin_tick
SELECT cause,tick_gap_ms>=150 AS tick_degrade,count(*) AS n,round(avg(rtt_ms),1) AS rtt_moyen,round(avg(frame_ms),1) AS frame_moyen FROM events WHERE event='perf_spike' GROUP BY cause,tick_degrade;
-- Q20_fps_pas_inverse
SELECT cause,count(*) AS n,sum(abs(json_extract(raw,'$.report.fps')-1000.0/frame_ms)>5) AS fps_non_inverses FROM events WHERE event='perf_spike' GROUP BY cause;
-- Q21_resume_anomalies
SELECT count(*) AS rapports,sum(total_ms>frame_ms+10) AS travail_sup_frame,sum(json_extract(raw,'$.report.fps')>144) AS fps_sup_144,sum(json_extract(raw,'$.report.graphics.gpuTimerSupported')=0 AND json_extract(raw,'$.report.graphics.gpuRenderMs') IS NOT NULL) AS gpu_contradictoire FROM events WHERE event='perf_spike';
-- Q22_jours
SELECT substr(local_time,1,10) AS jour,event,count(*) AS n FROM events GROUP BY jour,event;
-- Q23_deploiement_cohorte
SELECT build,count(*) AS rapports,sum(cause='overlay') AS overlay,count(DISTINCT CASE WHEN cause='overlay' THEN client_id END) AS clients_overlay,min(ts) AS premier_rapport FROM events WHERE event='perf_spike' AND cause<>'inconsistent' AND width>=2560 AND bloom=1 GROUP BY build;
-- Q24_controle_hors_cohorte
SELECT CASE WHEN ts<'2026-09-24T16:00:00.000Z' THEN 'avant' ELSE 'apres' END AS periode,count(*) AS rapports,sum(cause='overlay') AS overlay FROM events WHERE event='perf_spike' AND cause<>'inconsistent' AND NOT(width>=2560 AND bloom=1) GROUP BY periode;
-- Q25_farming_clients
SELECT count(*) AS rapports,count(DISTINCT p.client_id) AS clients FROM events p JOIN events g ON p.server_id=g.server_id AND g.short_win=1 WHERE p.event='perf_spike';
-- Q26_ordre_source
WITH t AS(SELECT ts,lag(ts) OVER(ORDER BY source_index) AS precedent FROM events) SELECT sum(ts>precedent) AS remontees,sum(ts<precedent) AS descentes,sum(ts=precedent) AS egalites FROM t;
-- Q27_parts_sans_fin_par_cause
SELECT p.cause,count(DISTINCT p.server_id) AS parties FROM events p WHERE p.event='perf_spike' AND NOT EXISTS(SELECT 1 FROM events g WHERE g.event='game_completed' AND g.server_id=p.server_id) GROUP BY p.cause;
-- Q28_apres_fin
SELECT count(*) AS rapports_apres_fin FROM events p JOIN events g ON g.event='game_completed' AND p.server_id=g.server_id WHERE p.event='perf_spike' AND p.ts>g.ts;
-- Q29_phase_build
SELECT build,cause,count(*) AS n FROM events WHERE event='perf_spike' AND phase<>'play' GROUP BY build,cause;
-- Q30_seuils
SELECT cause,min(overlay_ms) AS overlay_min,max(overlay_ms) AS overlay_max,min(frame_ms) AS frame_min,max(frame_ms) AS frame_max,round(avg(frame_ms),1) AS moyenne,round(avg(overlay_ms),1) AS overlay_moyen FROM events WHERE event='perf_spike' GROUP BY cause;
-- Q31_overlay_cohorte_detail
SELECT count(*) AS n,count(DISTINCT client_id) AS clients,count(DISTINCT server_id) AS parties,min(ts) AS debut,max(ts) AS fin,round(avg(frame_ms),1) AS frame_moyen,round(avg(overlay_ms),1) AS overlay_moyen FROM events WHERE cause='overlay' AND width>=2560 AND bloom=1 AND ts>='2026-09-24T16:00:00.000Z';
-- Q32_tick_detail
SELECT server_id,event,count(*) AS n,min(local_time) AS debut,max(local_time) AS fin,min(tick_gap_ms) AS gap_min,max(tick_gap_ms) AS gap_max FROM events WHERE tick_gap_ms>=150 GROUP BY server_id,event;
-- Q33_farming_detail
SELECT substr(local_time,1,10) AS jour,count(*) AS n,min(local_time) AS debut,max(local_time) AS fin,round(min(duration_s),2) AS min_s,round(max(duration_s),2) AS max_s FROM events WHERE short_win=1 GROUP BY jour;
-- Q34_farming_attribution
SELECT p.client_id,count(*) AS rapports,count(DISTINCT p.server_id) AS parties FROM events p JOIN events g ON p.server_id=g.server_id AND g.short_win=1 WHERE p.event='perf_spike' GROUP BY p.client_id;
