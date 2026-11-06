"use strict";
/* ============================================================
   ★ 模块 I：工具函数 & 背包
   ============================================================ */
const $ = (i) => document.getElementById(i);
const lv = (id) => S.skills[id].lv;
const totalLv = () => SK.reduce((a,s)=>a+lv(s.id),0);
const effCap = () => cfg("skillCap") + (S ? (S.reb||0) : 0) * 60;
function maxRare() { return Math.min(11, 4 + (S ? (S.reb||0) : 0)); }
function maxCombatLv() { let m = 0; for (const k of COMBAT_SK) m = Math.max(m, lv(k)); return m; }
function log(m) {
  const e = $("log"); if (!e) return;
  e.innerHTML = `<div>[${new Date().toLocaleTimeString()}] ${m}</div>` + e.innerHTML;
  if (e.children.length > 80) e.lastChild.remove();
}
const bagN = (id) => S.bag[id] || 0;
function slotOf(id) { for (const k in S.slotMap) if (S.slotMap[k] === id) return k; return null; }
function findFreeSlot() { for (let p = 0; p < MAX_PAGES; p++) for (let c = 0; c < PAGE_SIZE; c++) { const k = p+"_"+c; if (!S.slotMap[k]) return k; } return null; }
function usedSlots() { return Object.keys(S.slotMap).length; }
function migrateBag() { if (!S.slotMap) S.slotMap = {}; for (const id in S.bag) { if (!slotOf(id)) { const k = findFreeSlot(); if (k) S.slotMap[k] = id; } } }
function addIt(id, n) {
  S.bag[id] = (S.bag[id]||0)+n;
  if (!slotOf(id)) {
    const k = findFreeSlot();
    if (!k) { S.bag[id] -= n; if (S.bag[id] <= 0) delete S.bag[id]; log(`🎒 背包已满，${IT[id].n} 无法拾取！`); return false; }
    S.slotMap[k] = id;
  }
  return true;
}
function take(id, n) {
  if (bagN(id) < n) return false;
  S.bag[id] -= n;
  if (S.bag[id] <= 0) {
    delete S.bag[id];
    for (const k in S.slotMap) { if (S.slotMap[k] === id) delete S.slotMap[k]; }
    if (selSlot && !S.slotMap[selSlot]) selSlot = null;
  }
  return true;
}
function bagEquips() { const r = []; for (const k in S.slotMap) { const v = S.slotMap[k]; if (v && typeof v === "object") r.push({key:k,e:v}); } return r; }
function lackOf(mats, gold) {
  const lack = [];
  if (gold != null && S.gold < gold) lack.push(`💰金币（还需 ${(gold-S.gold).toLocaleString()}）`);
  for (const k in (mats||{})) { const need = mats[k]-bagN(k); if (need > 0) lack.push(`${IT[k].ic}${IT[k].n}（还需 ${need} 个，现有 ${bagN(k)}）`); }
  return lack.length ? lack.join("、") : null;
}
function addEq(e, skipAuto) {
  const at = S.autoTrash;
  if (!skipAuto && at && at.mode && e.rare <= at.rare && !e.lock) {
    if (at.mode === 1) { const g = sellPriceEq(e); S.gold += g; log(`⚡ 自动出售 ${e.n}（${RARE_NAMES[e.rare]}）+${g}💰`); return true; }
    else {
      if (e.rare >= 3) {
        const mats = salvageRareMats(e);
        let ok = true;
        for (const k in mats) { if (!addIt(k, mats[k])) ok = false; }
        if (ok) { log(`⚡ 自动分解 ${e.n}（${RARE_NAMES[e.rare]}）→ ${matsSummary(mats)}`); return true; }
        log(`🎒 背包满，无法自动分解 ${e.n}，改为正常入库`);
      } else {
        const { mat, n } = salvageGain(e);
        if (addIt(mat, n)) {
          const bonus = Math.floor(sellPriceEq(e)*0.15); S.gold += bonus;
          log(`⚡ 自动分解 ${e.n}（${RARE_NAMES[e.rare]}）→ ${IT[mat].ic}${IT[mat].n}×${n}${bonus>0?` +${bonus}💰`:""}`);
          return true;
        } log(`🎒 背包满，无法自动分解 ${e.n}，改为正常入库`);
      }
    }
  }
  const k = findFreeSlot();
  if (!k) { log(`🎒 背包已满，${e.n} 无法拾取！`); return false; }
  S.slotMap[k] = e; return true;
}
function findEqKey(uidNum) { for (const k in S.slotMap) { const v = S.slotMap[k]; if (v && typeof v === "object" && v.uid === uidNum) return k; } return null; }
function getEq(ref) {
  if (typeof ref === "string" && ref.slice(0,2) === "w:") return S.eq[ref.slice(2)] || null;
  const k = findEqKey(ref); return k ? S.slotMap[k] : null;
}
function refAttr(ref) { return typeof ref === "string" ? `'${ref}'` : `${ref}`; }
function compactBag() {
  const items = [];
  for (const k in S.slotMap) {
    const v = S.slotMap[k];
    if (v == null) continue;
    if (typeof v === "string") { if (S.bag[v]) items.push(v); } else items.push(v);
  }
  items.sort((a,b)=>{ const ka=slotKeyOf(a), kb=slotKeyOf(b); const [pa,ca]=ka.split("_").map(Number); const [pb,cb]=kb.split("_").map(Number); return pa-pb||ca-cb; });
  S.slotMap = {};
  let idx = 0;
  items.forEach((v)=>{ S.slotMap[Math.floor(idx/PAGE_SIZE)+"_"+(idx%PAGE_SIZE)] = v; idx++; });
  selSlot = null; log("🎒 背包已整理"); renderPanel();
}
function slotKeyOf(v) { for (const k in S.slotMap) if (S.slotMap[k] === v) return k; return "999999_0"; }
function spBonus() { return S.sp*0.005; }
function houseBonus(sk) { return (S.houses[sk]||0)*0.02; }
function globalSpd() { return 1+spBonus(); }

let XP_GAIN = null;
function addXp(id, amt) {
  const s = S.skills[id];
  const cap = effCap();
  if (s.lv >= cap) return;
  const xb = S.xpMin > 0 ? 1+(S.xpMult||0) : 1;
  const real = amt*(1+spBonus()+houseBonus(id))*xb;
  if (XP_GAIN) XP_GAIN[id] = (XP_GAIN[id]||0)+real;
  s.xp += real;
  while (s.xp >= xpNeed(s.lv) && s.lv < cap) { s.xp -= xpNeed(s.lv); s.lv++; checkLanes(); log(`⭐ [${SKM[id].n}] 升到 ${s.lv} 级！`); if (s.lv >= 100) log(`🔥 ${SKM[id].n} 已达100级，可执行转生！`); }
}
function canAfford(mats, gold) { if (S.gold < gold) return false; for (const k in mats) if (bagN(k) < mats[k]) return false; return true; }
function payCost(mats, gold) { S.gold -= gold; for (const k in mats) take(k, mats[k]); }

