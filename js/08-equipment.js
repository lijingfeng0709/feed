"use strict";
/* ============================================================
   ★ 模块 J：装备系统
   ============================================================ */
const RARE_NAMES = ["普通","精良","闪耀","传奇","仙器","神器","鸿蒙","太初","无极","造化","天道","混沌"];
const PREFIX = ["","精良的","闪耀的","传奇的","仙器的","神器的","鸿蒙的","太初的","无极的","造化的","天道的","混沌的"];
const RARE_MULT = [1,1.5,2.2,3,5,10,20,40,80,160,320,640];
const RARE_STRIP = /^精良的|^闪耀的|^传奇的|^仙器的|^神器的|^鸿蒙的|^太初的|^无极的|^造化的|^天道的|^混沌的|^新手/;
const RARE_COLOR = ["#888","#6f6","#5af","#c5f","#fa0","#f44","#ffd700","#ffa54a","#00e5ff","#d500f9","#ffffff","#ff4dd2"];
const ENH_MAX = 20;
const ENH_DROP_CAP = 15;
const QUAL = [
  {mats:{ore:8,log:5},gold:150,rate:0.85},
  {mats:{ore:15,cloth:5},gold:300,rate:0.70},
  {mats:{ingot:10,effTea:1},gold:1000,rate:0.45},
  {mats:{sage:2,xianGu:5},gold:20000,rate:0.30},
  {mats:{xianGu:3,soul:2,sage:5},gold:100000,rate:0.20},
  {mats:{longJin:3,xingSui:5},gold:500000,rate:0.15},
  {mats:{longJin:6,fengYu:3},gold:2000000,rate:0.12},
  {mats:{daoZe:3,fengYu:6},gold:8000000,rate:0.10},
  {mats:{daoZe:6,hunDunJing:1},gold:30000000,rate:0.08},
  {mats:{daoZe:12,hunDunJing:3},gold:100000000,rate:0.06},
  {mats:{daoZe:20,hunDunJing:8},gold:500000000,rate:0.05},
  null
];
const LV_TIERS = [1,15,30,60,85,95,120,140,160,180,200,220,240,249,275,300,325,350,375,400,425,450,475,500];
const EQ_MAX_LV = 500;
const CRAFT_TIER_CAP = 249;
const UPGRADE = [
  {to:15,mats:{ore:20,log:10},gold:500},
  {to:30,mats:{ingot:15,cloth:10},gold:2000},
  {to:60,mats:{ingot:30,plank:20,cloth:20},gold:8000},
  {to:85,mats:{ingot:50,oak:20,starMilk:20},gold:30000},
  {to:95,mats:{sage:1,ingot:80,spaceCake:3},gold:100000},
  {to:120,mats:{sage:5,spaceCake:10,oak:40},gold:500000},
  {to:140,mats:{sage:8,ingot:120,starMilk:40},gold:1200000},
  {to:160,mats:{sage:12,xianGu:8,starMilk:60},gold:2500000},
  {to:180,mats:{sage:16,xianGu:15,xianYu:6},gold:5000000},
  {to:200,mats:{sage:20,xianGu:25,xianYu:12},gold:9000000},
  {to:220,mats:{sage:25,xianYu:20,soul:8},gold:15000000},
  {to:240,mats:{sage:30,soul:15,shenShi:6},gold:25000000},
  {to:249,mats:{sage:40,soul:25,shenShi:10},gold:40000000},
  {to:275,mats:{xingSui:5,sage:10},gold:60000000},
  {to:300,mats:{xingSui:8,longJin:1},gold:100000000},
  {to:325,mats:{xingSui:12,longJin:2},gold:160000000},
  {to:350,mats:{yunTie:5,longJin:3},gold:250000000},
  {to:375,mats:{yunTie:8,daoZe:1},gold:400000000},
  {to:400,mats:{yunTie:12,daoZe:2},gold:600000000},
  {to:425,mats:{daoZe:4,hunDunJing:1},gold:900000000},
  {to:450,mats:{daoZe:6,hunDunJing:1},gold:1300000000},
  {to:475,mats:{daoZe:8,hunDunJing:2},gold:1800000000},
  {to:500,mats:{daoZe:10,hunDunJing:4},gold:2500000000},
  null
];
const tierIdx = (req) => Math.max(0, LV_TIERS.indexOf(req));
const tierFactor = (req) => 1+req*0.15;
const forgeBonus = () => Math.min(0.10, lv("enh")*0.002);
const forgeCf = () => cfg("forgeCf");

function rollSpecials(e) {
  const nSp = Math.min(4, e.rare + 1);
  const pool = ["crit","critDmg","aspd","ls"].sort(()=>Math.random()-0.5).slice(0, nSp);
  const t = Math.min(1, 0.15 + e.rare*0.1 + e.reqLv*0.002);
  for (const k of pool) {
    if (k === "crit") e.crit = Math.round(cfg("critMin") + (cfg("critMax")-cfg("critMin"))*t*Math.random());
    if (k === "critDmg") e.critDmg = Math.round(cfg("critDmgMin") + (cfg("critDmgMax")-cfg("critDmgMin"))*t*Math.random());
    if (k === "aspd") e.aspd = Math.round(cfg("aspdMin") + (cfg("aspdMax")-cfg("aspdMin"))*t*Math.random());
    if (k === "ls") e.ls = Math.round(cfg("lsMin") + (cfg("lsMax")-cfg("lsMin"))*t*Math.random());
  }
}
function rollEq(fam, reqLv, slotId, rb) {
  rb = rb || 0;
  const slot = slotId ? (SLOTS.find((s)=>s.id===slotId)||SLOTS[0]) : SLOTS[Math.random()*6|0];
  const f = EQFAM[fam];
  const p3 = rb > 60 ? Math.min(0.08,(rb-60)*0.0004) : 0;
  const p2 = Math.min(0.45, 0.08+rb*0.0035);
  const p1 = Math.min(0.65, 0.25+rb*0.003);
  let rare = 0; const r = Math.random();
  if (r < p3) rare = 3; else if (r < p3+p2) rare = 2; else if (r < p3+p2+p1) rare = 1;
  const mult = RARE_MULT[rare];
  const base = f.base*(1+reqLv*0.15)*mult;
  const e = { uid:uid++, fam, reqLv, rare, plus:0, slot:slot.id, n:PREFIX[rare]+f.n+slot.n, dt:f.dt||"thrust", holes:0, gems:[], lock:false };
  if (slot.id === "weapon") { e.atk = Math.floor(base*(0.8+Math.random()*0.4)); e.dmgT = f.dt || ["thrust","slash","blunt"][Math.random()*3|0]; }
  if (slot.id === "helmet") e.hp = Math.floor(base*2.5);
  if (slot.id === "armor") e.def = Math.floor(base*0.6)+1;
  if (slot.id === "boots") e.hp = Math.floor(base*1.5);
  if (slot.id === "gloves") e.aspd = Math.min(cfg("aspdMax"), 25+Math.floor(base*1.2));
  if (slot.id === "ring") e.eva = Math.floor(base*0.5)+2;
  rollSpecials(e);
  return e;
}
function eqVal(e) {
  const m = 1+e.plus*0.15;
  const o = {};
  ["atk","hp","def","eva"].forEach((k)=>{ if (e[k]) o[k] = Math.floor(e[k]*m); });
  if (e.crit) o.crit = Math.min(cfg("critMax"), Math.floor(e.crit*m));
  if (e.critDmg) o.critDmg = Math.min(cfg("critDmgMax"), Math.floor(e.critDmg*m));
  if (e.aspd) o.aspd = Math.min(cfg("aspdMax"), Math.floor(e.aspd*m));
  if (e.ls) o.ls = Math.min(cfg("lsMax"), Math.floor(e.ls*m));
  if (Array.isArray(e.gems)) for (const g of e.gems) {
    if (g) o[g.t] = (o[g.t]||0) + gemVal(g.t, g.l);
  }
  return o;
}
const ST_LABEL = {atk:"⚔攻",hp:"❤血",def:"🛡防",eva:"💨闪",crit:"暴击",critDmg:"暴伤",aspd:"攻速",ls:"吸血"};
function eqValStr(e) {
  const v = eqVal(e);
  return Object.entries(v).map(([k,x])=>{
    if (k==="critDmg") return `${ST_LABEL[k]}${x}%`;
    if (k==="crit"||k==="aspd"||k==="ls") return `${ST_LABEL[k]}+${x}%`;
    return `${ST_LABEL[k]}+${x}`;
  }).join(" ");
}
const gemCount = (e) => (Array.isArray(e.gems) ? e.gems.filter(Boolean).length : 0);
const eqName = (e) => `${e.lock?"🔒":""}${e.n} +${e.plus}${gemCount(e)?` 💎${gemCount(e)}/${e.holes||0}`:""}`;
function combatLvAvg() { return (lv("acc")+lv("pow")+lv("def")+lv("hp")+lv("rng")+lv("eva")+lv("mag"))/7|0; }
function canWear(e) {
  if (e.slot === "weapon") return maxCombatLv() >= e.reqLv;
  return combatLvAvg() >= Math.min(effCap(), e.reqLv);
}
function canWearAt(e, reqLv) {
  if (e.slot === "weapon") return maxCombatLv() >= reqLv;
  return combatLvAvg() >= Math.min(effCap(), reqLv);
}
function tierWearLv(e) { return e.slot === "weapon" ? maxCombatLv() : Math.min(effCap(), combatLvAvg()); }
function wearNeedTxt(e) {
  return e.slot === "weapon" ? `需单项战斗Lv${e.reqLv}` : `需战斗均Lv${Math.min(effCap(), e.reqLv)}`;
}
function giveStarterGear() {
  const mk = (slot,atk,hp,def,eva,dmgT)=>({uid:uid++,fam:"iron",reqLv:1,rare:0,plus:0,slot,n:"新手"+SLOTS.find((s)=>s.id===slot).n,dmgT:dmgT||"thrust",atk,hp,def,eva,holes:0,gems:[],lock:false});
  S.eq.weapon = mk("weapon",6,0,0,0,"thrust");
  S.eq.helmet = mk("helmet",0,20,1,0);
  S.eq.armor = mk("armor",0,10,3,0);
  S.eq.boots = mk("boots",0,8,0,0);
  S.eq.gloves = mk("gloves",0,0,0,0); S.eq.gloves.aspd = 25;
  S.eq.ring = mk("ring",0,0,0,3);
  log("🎁 初始赠送：新手六件套（含🥾鞋子、🧤手套），已自动穿上！");
}
function migrateEquips() {
  const fix = (e) => {
    if (!e) return;
    if (e.holes == null) e.holes = 0;
    if (!Array.isArray(e.gems)) e.gems = [];
    if (e.lock == null) e.lock = false;
    e.ench = 0; e.affix = null;
  };
  bagEquips().forEach(({e})=>fix(e));
  Object.values(S.eq).forEach((e)=>{ fix(e); if (e && e.auto && e.auto.on) e.auto.on = false; });
}
const SALVAGE = { iron:"ore", steel:"ingot", bow:"plank", staff:"oak", leather:"cloth", robe:"cloth" };
function salvageGain(e) {
  const mat = SALVAGE[e.fam] || "ore";
  const n = Math.max(3, 3+tierIdx(e.reqLv)*4+e.rare*3+Math.floor(e.plus/2));
  return { mat, n };
}
function sellPriceEq(e) {
  const base = EQFAM[e.fam].base*(1+e.reqLv*0.15)*RARE_MULT[e.rare];
  return Math.floor(base*(1.5+e.plus*0.3));
}
const RARE_UP_MATS = [null,null,null,{sage:2,xianGu:5},{xianGu:3,soul:2,sage:5},{soul:3,shenShi:2},
  {longJin:1,xingSui:3},{longJin:2,fengYu:2},{daoZe:2,fengYu:3},{daoZe:4,hunDunJing:1},{daoZe:6,hunDunJing:2},{daoZe:8,hunDunJing:4}];
const rebSalvMult = () => 1+(S.reb||0)*0.2;
function salvageRareMats(e) {
  const base = RARE_UP_MATS[e.rare];
  if (!base) return null;
  const o = {};
  for (const k in base) o[k] = Math.max(1, Math.round(base[k]/3*rebSalvMult()));
  return o;
}
function extCost(e, gold) {
  if (e.rare === 4) return { mats:{xianYu:2}, gold:gold*4 };
  if (e.rare === 5) return { mats:{shenShi:2}, gold:gold*8 };
  if (e.rare >= 6 && e.rare <= 8) return { mats:{daoZe:1}, gold:gold*16 };
  if (e.rare >= 9) return { mats:{hunDunJing:1}, gold:gold*24 };
  return { mats:{}, gold };
}
function enhCost(e) { return Math.floor(80*(1+e.reqLv*0.1)*Math.pow(1.7,e.plus)); }
function enhFullCost(e) { const c = enhCost(e); const ex = extCost(e,c); return { mats:ex.mats, gold:ex.gold }; }
function enhRate(e) { return Math.min(0.95, Math.max(0.03,(0.92-e.plus*0.032+forgeBonus()+(S.teaMin>0?0.05:0))*forgeCf())); }
function doEnh(ref) {
  const e = getEq(ref); if (!e || e.plus >= ENH_MAX) return;
  const ef = enhFullCost(e);
  const lack = lackOf(ef.mats, ef.gold);
  if (lack) { alert(`❌ 强化失败——材料不足！\n\n缺少：${lack}`); return; }
  payCost(ef.mats, ef.gold);
  addXp("enh", 50+e.plus*20);
  if (Math.random() < enhRate(e)) { e.plus++; log(`✨ ${eqName(e)} 强化成功！`); }
  else { log(`💔 ${e.n} 强化失败（等级保持 +${e.plus}，不掉级），材料已消耗`); }
}
function qualRate(r) { return Math.min(0.95,(QUAL[r].rate+forgeBonus())*forgeCf()); }
function upQuality(ref) {
  const e = getEq(ref); if (!e) return;
  if (e.rare >= maxRare()) {
    log(e.rare >= 11 ? "已达混沌品质（全游戏最高）" : `已达当前转生解锁的品质上限【${RARE_NAMES[maxRare()]}】（再转生解锁更高品质）`);
    return;
  }
  const c = QUAL[e.rare];
  if (!c) { log("已达最高品质，无法再升阶"); return; }
  const lack = lackOf(c.mats, c.gold);
  if (lack) { alert(`❌ 升阶失败——材料不足！\n\n缺少：${lack}\n\n（新材料仅无尽模式掉落或🔔牛铃商店购买）`); return; }
  payCost(c.mats, c.gold);
  addXp("enh", 80+e.rare*60);
  if (Math.random() < qualRate(e.rare)) {
    const oldR = e.rare; e.rare++;
    const ratio = RARE_MULT[e.rare]/RARE_MULT[oldR];
    ["atk","hp","def","eva"].forEach((k)=>{ if (e[k]) e[k] = Math.floor(e[k]*ratio); });
    e.n = PREFIX[e.rare]+e.n.replace(RARE_STRIP,"");
    rollSpecials(e);
    log(`🏆 ${e.n}→ 升阶为【${RARE_NAMES[e.rare]}】品质！（基础属性×${ratio.toFixed(2)}）`);
  } else { log(`💔 升阶失败，材料已消耗（装备无损，可再试）`); }
  renderPanel();
}
function upgCfg(e) { return UPGRADE[tierIdx(e.reqLv)]; }
function tierRate(e) { return Math.min(0.95, Math.max(0.05, (0.95 - tierIdx(e.reqLv)*0.035 + forgeBonus()) * forgeCf())); }
function upTier(ref) {
  const e = getEq(ref); if (!e) return;
  const c = upgCfg(e);
  if (!c) { log(`已达最高档次 Lv${EQ_MAX_LV}，无法再升级`); return; }
  if (!canWearAt(e, c.to)) {
    log(`❌ 无法升级：下一档 Lv${c.to} 超过穿戴要求（需 ${e.slot==="weapon"?"单项战斗":"战斗均"}Lv≥${c.to}，当前 ${tierWearLv(e)}）——先把战斗技能练上去`);
    return;
  }
  const lack = lackOf(c.mats, c.gold);
  if (lack) { alert(`❌ 装备升级失败——材料不足！\n\n缺少：${lack}\n\n（Lv250+档的升级材料仅无尽模式掉落或🔔牛铃商店购买）`); return; }
  payCost(c.mats, c.gold);
  addXp("enh", 100+tierIdx(e.reqLv)*80);
  const r = tierRate(e);
  if (Math.random() < r) {
    const ratio = tierFactor(c.to)/tierFactor(e.reqLv);
    ["atk","hp","def","eva"].forEach((k)=>{ if (e[k]) e[k] = Math.floor(e[k]*ratio); });
    if (e.aspd) e.aspd = Math.min(cfg("aspdMax"), Math.floor(e.aspd*ratio));
    if (e.crit) e.crit = Math.min(cfg("critMax"), Math.floor(e.crit*ratio));
    if (e.critDmg) e.critDmg = Math.min(cfg("critDmgMax"), Math.floor(e.critDmg*ratio));
    if (e.ls) e.ls = Math.min(cfg("lsMax"), Math.floor(e.ls*ratio));
    e.reqLv = c.to;
    log(`⬆️ 装备升级成功！${eqName(e)} 现为 Lv${e.reqLv} 档（基础属性×${ratio.toFixed(2)}）`);
  } else { log(`💔 装备升级失败，材料已消耗（装备无损｜成功率 ${(r*100).toFixed(0)}%）`); }
  renderPanel();
}
function punchCost(e) { return { mats:{punch:1}, gold: 100000*(e.holes+1)*(e.holes+1) }; }
function punchEq(ref) {
  const e = getEq(ref); if (!e) return;
  if ((e.holes||0) >= EQ_HOLES_MAX) { log("该装备已达4孔上限"); return; }
  const c = punchCost(e);
  const lack = lackOf(c.mats, c.gold);
  if (lack) { alert(`❌ 打孔失败——材料不足！\n\n缺少：${lack}\n\n（需要 🔨打孔锥×1 ＋ ${c.gold.toLocaleString()}💰）`); return; }
  payCost(c.mats, c.gold);
  e.holes = (e.holes||0)+1;
  while ((e.gems||[]).length < e.holes) e.gems.push(null);
  log(`🔨 打孔成功！${eqName(e)} 现有 ${e.holes} 个宝石孔`);
  renderPanel();
}
function socketGem(ref, idx, gemId) {
  const e = getEq(ref); if (!e) return;
  if (!gemId) return;
  const m = gemId.match(/^gem_(\w+)_(\d+)$/); if (!m) return;
  if (idx >= (e.holes||0)) { log("该孔位尚未打孔"); return; }
  if (!Array.isArray(e.gems)) e.gems = [];
  if (e.gems[idx]) { log("该孔位已有宝石，请先卸下"); return; }
  if (!take(gemId, 1)) return;
  e.gems[idx] = { t:m[1], l:+m[2] };
  log(`💎 镶嵌成功：${eqName(e)} 孔${idx+1} ← ${IT[gemId].n}（+${gemVal(m[1], +m[2])}${m[1]==="critDmg"?"%":""}）`);
  renderPanel();
}
function unsocketGem(ref, idx) {
  const e = getEq(ref); if (!e) return;
  if (!Array.isArray(e.gems) || !e.gems[idx]) return;
  const g = e.gems[idx];
  const id = `gem_${g.t}_${g.l}`;
  if (addIt(id, 1)) { e.gems[idx] = null; log(`💎 已卸下 ${IT[id].n}`); }
  else log("🎒 背包已满，无法卸下宝石");
  renderPanel();
}
function toggleEqLock(eqUid) {
  const k = findEqKey(eqUid); if (!k) return;
  const e = S.slotMap[k];
  e.lock = !e.lock;
  log(e.lock ? `🔒 已锁定 ${eqName(e)}（无法出售/分解/自动处理/合成消耗）` : `🔓 已解锁 ${eqName(e)}`);
  renderPanel();
}
function combineEquip(key, n) {
  n = Math.max(1, n|0);
  let done = 0;
  for (let i = 0; i < n; i++) {
    const list = bagEquips().filter(({e})=> !e.lock && (e.fam+"|"+e.reqLv+"|"+e.rare) === key && tierIdx(e.reqLv) < LV_TIERS.length-1).slice(0,4);
    if (list.length < 4) break;
    const keep = list[0].e;
    const ti = tierIdx(keep.reqLv);
    const next = LV_TIERS[ti+1];
    const ratio = tierFactor(next)/tierFactor(keep.reqLv);
    ["atk","hp","def","eva"].forEach((k2)=>{ if (keep[k2]) keep[k2] = Math.floor(keep[k2]*ratio); });
    if (keep.aspd) keep.aspd = Math.min(cfg("aspdMax"), Math.floor(keep.aspd*ratio));
    if (keep.crit) keep.crit = Math.min(cfg("critMax"), Math.floor(keep.crit*ratio));
    if (keep.critDmg) keep.critDmg = Math.min(cfg("critDmgMax"), Math.floor(keep.critDmg*ratio));
    if (keep.ls) keep.ls = Math.min(cfg("lsMax"), Math.floor(keep.ls*ratio));
    keep.reqLv = next;
    keep.holes = 0; keep.gems = [];
    list.slice(1).forEach(({key:k3})=>{ delete S.slotMap[k3]; if (selSlot===k3) selSlot = null; });
    done++;
  }
  if (done) {
    const [fam,req,rare] = key.split("|");
    log(`🔮 装备合成 ×${done}：${RARE_NAMES[+rare]}·Lv${req}档 → Lv${LV_TIERS[tierIdx(+req)+1]}档（品质/强化保留）`);
  } else log("装备合成失败：数量不足（4件起，锁定装备不参与）");
  renderPanel();
}
function combineGem(gemId, n) {
  const m = gemId.match(/^gem_(\w+)_(\d+)$/); if (!m) return;
  const t = m[1], l = +m[2];
  if (l >= GEM_MAX) { log("已是Lv30最高级宝石，无法再合成"); return; }
  n = Math.max(1, Math.min(n|0, Math.floor(bagN(gemId)/4)));
  let done = 0;
  for (let i = 0; i < n; i++) {
    if (bagN(gemId) < 4) break;
    take(gemId, 4);
    addIt(`gem_${t}_${l+1}`, 1);
    done++;
  }
  if (done) log(`🔮 宝石合成 ×${done}：${IT[gemId].n}×${done*4} → ${IT[`gem_${t}_${l+1}`].n}×${done}（+${gemVal(t,l+1)}${t==="critDmg"?"%":""}）`);
  else log("宝石合成失败：数量不足（4颗起）");
  renderPanel();
}
function combineMat(id, n) {
  const up = MAT_NEXT[id]; if (!up) { log("该材料已是最高阶，无法再合成"); return; }
  n = Math.max(1, Math.min(n|0, Math.floor(bagN(id)/4)));
  if (n < 1) { log(`材料合成失败：${IT[id].n}数量不足（4个起）`); return; }
  take(id, n*4);
  if (!addIt(up, n)) { addIt(id, n*4); return; }
  log(`🧪 材料合成 ×${n}：${IT[id].ic}${IT[id].n}×${n*4} → ${IT[up].ic}${IT[up].n}×${n}`);
  renderPanel();
}
function splitMat(id, n) {
  const dn = MAT_PREV[id]; if (!dn) { log("该材料已是最低阶，无法再分解"); return; }
  n = Math.max(1, Math.min(n|0, bagN(id)));
  if (n < 1) { log(`材料分解失败：背包中没有${IT[id].n}`); return; }
  take(id, n);
  if (!addIt(dn, n*4)) { addIt(id, n); return; }
  log(`🧪 材料分解 ×${n}：${IT[id].ic}${IT[id].n}×${n} → ${IT[dn].ic}${IT[dn].n}×${n*4}`);
  renderPanel();
}

