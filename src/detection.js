'use strict';
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
// Les signatures sont des hypothèses explicables, pas une attribution de culpabilité.
function classify({ report: r = {}, server: s = {} }) {
  const d=r.work?.details ?? {}, g=r.graphics ?? {}, n=r.network ?? {};
  const frame=r.frameMs, total=r.work?.totalMs, rtt=r.version===2?n.rttMs:r.rttMs;
  const signatures=[];
  if (finite(frame) && finite(total) && (frame < 0 || total < 0 || total > frame + 10)) signatures.push('inconsistent');
  if (Array.isArray(r.activities) && r.activities.some(a=>a?.name==='visibilityHidden') && n.browserDelayMs>500) signatures.push('background');
  if (g.firstCapture && g.newPrograms>=20) signatures.push('shader');
  if (d.renderOverlay>=200) signatures.push('overlay');
  if (s.tickGapMaxMs>=150 && rtt>=150) signatures.push('server_tick');
  if (r.reason==='network' && rtt>=150) signatures.push('network');
  if (d.worldDynamics>=50) signatures.push('world');
  if (!signatures.length && finite(frame) && finite(total)) signatures.push('render_other');
  return {cause:signatures[0] ?? 'unknown',signatures};
}
function normalize(obj) {
  const r=obj.report ?? {},s=obj.server ?? {},g=r.graphics ?? {};
  const c=obj.event==='perf_spike'?classify(obj):{cause:'none',signatures:[]};
  const ms=Date.parse(obj.ts);
  const duration=finite(s.createdAt)&&Number.isFinite(ms)?(ms-s.createdAt)/1000*(obj.simulation_speed??1):null;
  const shortWin=obj.event==='game_completed' && duration>0 && duration<90 && s.map==='vault' && s.score?.[0]===3 && s.score?.[1]===0;
  return {...obj,...c,report_id:r.id??'',client_id:typeof r.id==='string'?(r.id.match(/^P-([0-9a-f]{8})-/)?.[1]??''):'',
    server_id:s.id??'',build:r.build??'unknown',map:s.map??'unknown',phase:r.phase??s.phase??'unknown',
    version:r.version??null,frame_ms:finite(r.frameMs)?r.frameMs:null,total_ms:finite(r.work?.totalMs)?r.work.totalMs:null,
    rtt_ms:finite(r.version===2?r.network?.rttMs:r.rttMs)?(r.version===2?r.network.rttMs:r.rttMs):null,
    overlay_ms:r.work?.details?.renderOverlay??null,world_ms:r.work?.details?.worldDynamics??null,
    browser:typeof r.browser==='string'?r.browser.split(' · ')[0]:'unknown',width:g.width??null,bloom:g.bloom??null,
    tick_gap_ms:s.tickGapMaxMs??null,duration_s:duration,short_win:Boolean(shortWin),quarantined:Boolean(s.quarantined),
    integrity:c.cause==='inconsistent'?'inconsistent':shortWin?'short_win':'none'};
}
module.exports={classify,normalize};
