'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, normalize } = require('../src/detection');
const { parseExport } = require('../src/importer');
const { createRng } = require('../src/prng');
const T = require('../src/telemetry');
function sample(cause, version = 1) {
  const rng = createRng(40);
  const c = T.makeClient(rng);
  const s = T.makeServer(rng, { createdAt: Date.UTC(2026,8,24,16) });
  s.phase = cause === 'shader' ? 'warmup' : 'play';
  return T.spikeReport(rng,c,s,{cause,version,build:'beta-test',now:Date.UTC(2026,8,24,16,1)});
}
for (const [cause, expected] of [['overlay','overlay'],['hidden','background'],['shader','shader'],['world','world'],['network','network']]) {
  test(`signature ${cause}`, () => assert.equal(classify(sample(cause)).cause,expected));
}
test('incohérence temporelle prioritaire, sans utiliser les fps seuls', () => {
  const e=sample('overlay');e.report.frameMs=30;e.report.fps=999;
  assert.equal(classify(e).cause,'inconsistent');
  const f=sample('network');f.report.fps=999;
  assert.notEqual(classify(f).cause,'inconsistent');
});
test('champ manquant ne devient pas zéro',()=>assert.equal(classify({report:{id:'P-0123abcd-1'},server:{}}).cause,'unknown'));
test('RTT v1 et v2 normalisés',()=>{
  for(const v of [1,2]) { const n=normalize({...sample('network',v),ts:'2026-09-24T16:01:00.000Z',event:'perf_spike'});assert.ok(n.rtt_ms>100); }
});
test('date Paris UTC, doublon exact et conflit séparés',()=>{
  const e=sample('overlay');const t=T.exportSpike(e);
  const conflict=structuredClone(e);conflict.report.frameMs+=1;
  const p=parseExport(t+'\n'+t+'\n'+T.exportSpike(conflict));
  assert.equal(p.records[0].ts,'2026-09-24T16:01:00.000Z');
  assert.equal(p.records.length,2);assert.equal(p.audit.filter(x=>x.kind==='duplicate').length,1);
  assert.equal(p.audit.filter(x=>x.kind==='id_conflict').length,1);
});
test('JSON tronqué quarantiné, rapport suivant préservé',()=>{
 const e=sample('hidden'); const p=parseExport('Performance spike x · 9/24/2026, 6:00:00 PM\nframe\n{"report":\n'+T.exportSpike(e));
 assert.equal(p.records.length,1);assert.equal(p.audit.filter(x=>x.kind==='parse_error').length,1);
});
test('heure hiver utilise le bon décalage',()=>{
 const e=sample('shader');e.at=Date.UTC(2026,11,15,17);assert.equal(parseExport(T.exportSpike(e)).records[0].ts,'2026-12-15T17:00:00.000Z');
});
test('durée simulation corrigée pour éviter les faux positifs farming',()=>{
 const obj={event:'game_completed',ts:'2026-09-24T16:01:00.000Z',simulation_speed:10,server:{id:'x',createdAt:Date.UTC(2026,8,24,16),map:'vault',score:[3,0]}};
 assert.equal(normalize(obj).duration_s,600);assert.equal(normalize(obj).short_win,false);
 obj.server.createdAt=Date.UTC(2026,8,24,16,0,54);assert.equal(normalize(obj).short_win,true);
});
test('types optionnels malformés ne font pas tomber la collecte',()=>{
 const e={event:'perf_spike',report:{id:'P-0123abcd-1',activities:{},browser:42},server:{}};
 assert.equal(normalize(e).cause,'unknown');assert.equal(normalize(e).browser,'unknown');
});
