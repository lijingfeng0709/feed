"use strict";
/* ============================================================
   ★ 模块 N：NPC市场 + 玩家交易市场 + 排行榜
   ============================================================ */
const MK = {};
const MK_SPREAD = 0.8;
let mkQty = 1;
function mkSeed() {
  for (const id in IT) {
    if (id === "token") continue;
    if (/^gem_/.test(id)) continue;
    if (BELL_SHOP[id]) continue;
    if (ENDLESS_ONLY[id]) continue;
    MK[id] = { mid:IT[id].val*(0.95+Math.random()*0.1), p0:IT[id].val };
    mkRefresh(id);
  }
}
function mkRefresh(id) {
  const m = MK[id];
  m.sell = []; m.buy = [];
  if (POT_MK[id]) {
    if (Math.random() < 0.3) m.sell.push({ p:POT_MK[id], q:1 });
    m.buy.push({ p:Math.floor(POT_MK[id]*MK_SPREAD), q:1+(Math.random()*2|0) });
    return;
  }
  if (RARE_MATS[id] || id === "punch") {
    const bp = Math.max(2, Math.floor(m.mid*(4+Math.random()*2)));
    m.sell.push({ p:bp, q:1+Math.random()*2|0 });
    m.buy.push({ p:Math.max(1, Math.floor(bp*MK_SPREAD)), q:1+Math.random()*2|0 });
    return;
  }
  const bp = Math.max(1, Math.floor(m.mid));
  for (let i = 0; i < 5; i++) {
    const sp = Math.max(1, Math.floor(bp*(1+i*0.05)));
    m.sell.push({ p:sp, q:3+Math.random()*15|0 });
    m.buy.push({ p:Math.max(1, Math.floor(sp*MK_SPREAD)), q:3+Math.random()*15|0 });
  }
}
function mkDrift() {
  for (const id in MK) {
    const m = MK[id];
    if (POT_MK[id]) { mkRefresh(id); continue; }
    m.mid = Math.max(m.p0*0.6, Math.min(m.p0*1.8, m.mid*(1+(Math.random()-0.5)*0.06)));
    mkRefresh(id);
  }
}
const mkAvail = (id) => MK[id].sell.reduce((a,o)=>a+o.q,0);
function mkBuy(id, n) {
  n = Math.max(1, n|0);
  const m = MK[id];
  const avail = mkAvail(id);
  if (n > avail) { alert(`❌ 市场库存不足！\n\n「${IT[id].n}」当前仅有 ${avail} 个卖单，无法购买 ${n} 个。`); return; }
  let got = 0, cost = 0;
  while (n > 0 && m.sell.length) { const o = m.sell[0]; const t = Math.min(n,o.q); cost += o.p*t; got += t; o.q -= t; n -= t; if (!o.q) m.sell.shift(); }
  if (!got) { alert("市场暂无卖单"); return; }
  if (S.gold < cost) { alert(`❌ 金币不足！\n\n需要 ${cost.toLocaleString()}💰，当前仅有 ${Math.floor(S.gold).toLocaleString()}💰。`); m.sell.unshift({p:Math.floor(cost/got), q:got}); return; }
  S.gold -= cost;
  for (let i = 0; i < got; i++) { if (!addIt(id,1)) { got = i; break; } }
  log(`🛒 买入 ${IT[id].n}×${got}，花 ${cost}💰`);
  renderPanel();
}
function mkSell(id, n) {
  n = Math.max(1, n|0);
  const have = bagN(id);
  if (have <= 0) { alert(`❌ 背包中没有「${IT[id].n}」。`); return; }
  if (n > have) {
    alert(`❌ 背包中仅有 ${have} 个「${IT[id].n}」。\n\n卖出数量已按背包持有量截断为 ${have} 个。`);
    n = have;
  }
  const m = MK[id];
  let rev = 0, got = 0, left = n, lastP = 0, fallback = 0;
  while (left > 0) {
    if (m.buy.length) {
      const o = m.buy[0]; const t = Math.min(left, o.q);
      const gross = o.p*t; const tax = o.p > 49 ? Math.floor(gross*0.02) : 0;
      rev += gross - tax; got += t; o.q -= t; left -= t; lastP = o.p;
      if (!o.q) m.buy.shift();
    } else {
      const p = Math.max(1, Math.floor(lastP || m.mid*MK_SPREAD));
      const t = left;
      const gross = p*t; const tax = p > 49 ? Math.floor(gross*0.02) : 0;
      rev += gross - tax; got += t; fallback += t; left = 0;
    }
  }
  take(id, got); S.gold += rev;
  log(`💰 卖出 ${IT[id].n}×${got}，得 ${rev}💰（已扣税）${fallback ? `｜其中 ${fallback} 个订单不足，按兜底价成交` : ""}`);
  renderPanel();
}

