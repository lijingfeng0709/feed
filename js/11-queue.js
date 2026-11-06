"use strict";
/* ============================================================
   ★ 模块 L：并行动作队列引擎
   ============================================================ */
const QMAX = () => 6+S.perks.q;
let lastWarn = 0;
function eqInp(a, q) {
  const inp = a.inp || {};
  if (!a.outEq || !q || !q.tier) return inp;
  const m = 1+tierIdx(q.tier)*2;
  const o = {};
  for (const k in inp) o[k] = Math.ceil(inp[k]*m);
  return o;
}
function tickQueue(dt) {
  for (let li = 0; li < LANE_MAX; li++) {
    const lane = S.lanes[li];
    if (!lane || !lane.open || !lane.items.length) continue;
    const q = lane.items[0];
    if (q.id === "combat") continue;
    const a = ACT.find((x)=>x.id===q.id);
    if (!a) { lane.items.shift(); lane.prog = 0; continue; }
    const over = Math.max(0, lv(a.sk)-a.lv);
    S.eff = Math.min(0.8, over*0.01+(S.teaMin>0?0.10:0));
    const inp = eqInp(a, q);
    let lack = null;
    if (a.inp) { for (const k in inp) { if (bagN(k) < inp[k]) { lack = k; break; } } }
    if (lack) {
      if (Date.now()-lastWarn > 3000) { log(`⚠️ [通道${li+1}] 缺少${IT[lack].n}（需要${inp[lack]}），[${a.n}]暂停等待`); lastWarn = Date.now(); }
      continue;
    }
    lane.prog += dt*globalSpd()*(1+houseBonus(a.sk));
    const need = a.t;
    while (lane.prog >= need && lane.items.length && lane.items[0] === q) {
      lane.prog -= need;
      doAction(a, q); q.n--;
      if (a.sk && Math.random() < S.eff) { doAction(a, q); q.n--; }
      if (q.n <= 0) { lane.items.shift(); lane.prog = 0; }
    }
  }
}
function doAction(a, q) {
  const inp = eqInp(a, q);
  for (const k in inp) take(k, inp[k]);
  if (a.out) { for (const k in a.out) addIt(k, a.out[k]); }
  if (a.gold) S.gold += a.gold;
  if (a.outEq) addEq(rollEq(a.outEq, q&&q.tier?q.tier:a.lv+10, q&&q.slot, 0));
  addXp(a.sk, a.xp);
}

