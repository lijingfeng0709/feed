"use strict";
/* ============================================================
   ★ 模块 K：属性与命中
   ============================================================ */
function P() {
  const eq = S.eq;
  let atkB = 0, defB = 0, hpB = 0, evaB = 0, crit = 0, critDmg = 0, aspd = 0, ls = 0;
  for (const sl of SLOTS) {
    const e = eq[sl.id]; if (!e) continue;
    const v = eqVal(e);
    atkB += v.atk||0; defB += v.def||0; hpB += v.hp||0; evaB += v.eva||0;
    crit += v.crit||0; critDmg += v.critDmg||0; aspd += v.aspd||0; ls += v.ls||0;
  }
  const ndMul = 1 + (S.neidan ? S.neidan.lv : 0) * 0.005;
  const wgMul = 1 + (S.wing ? S.wing.stage : 0) * 0.05;
  const GM = ndMul * wgMul;
  const baseHp = 50 + Math.floor(Math.pow(lv("hp"), 1.6) * 6) + hpB;
  return { acc:Math.floor((10+lv("acc")*2+atkB)*GM), pow:Math.floor((5+lv("pow")*2+atkB)*GM), def:Math.floor((5+lv("def")*2+defB)*GM),
    maxHp:Math.floor(baseHp*GM),
    rng:Math.floor((10+lv("rng")*2+atkB)*GM),
    eva:Math.floor((10+defB)*(1+lv("eva")*0.01+evaB*0.005)*GM), mag:Math.floor((10+lv("mag")*2+atkB)*GM), maxMp:20+lv("mag")*5,
    crit:Math.min(100, 5+crit),
    critDmg:150+critDmg,
    eqCritDmg:critDmg,
    atkB, defB, hpB,
    aspd:aspd,
    ls:Math.min(100, ls),
    ndMul, wgMul };
}
function dmgReduce(def, atk) {
  const ratio = def/(atk+def);
  return Math.min(0.85, 0.40 + ratio*0.45);
}
function gemTotals() {
  const o = {atk:0,def:0,hp:0,critDmg:0};
  for (const sl of SLOTS) {
    const e = S.eq[sl.id]; if (!e) continue;
    (e.gems||[]).forEach((g)=>{ if (g) o[g.t] = (o[g.t]||0) + gemVal(g.t, g.l); });
  }
  return o;
}
const hitRate = (a,e) => {
  const raw = Math.pow(a,1.4)/(Math.pow(a,1.4)+Math.pow(e,1.4));
  const lo = Math.max(cfg("hitFloor")/100, 1 - cfg("evCapPct")/100);
  return Math.max(lo, Math.min(1, raw));
};

