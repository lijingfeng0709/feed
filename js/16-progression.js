"use strict";
/* ============================================================
   ★ 模块 O：房屋 & 任务 & 转生 & 牛铃商店 & 内丹 & 翅膀
   ============================================================ */
function houseCost(sk) { return Math.floor(500*Math.pow(1.6, S.houses[sk]||0)); }
function upHouse(sk) {
  const c = houseCost(sk);
  if (S.gold < c) return;
  S.gold -= c; S.houses[sk] = (S.houses[sk]||0)+1;
  log(`🏠 ${SKM[sk].n}房屋升到 ${S.houses[sk]} 级`);
}
const TASKPOOL = ["milk","herb","flax","ore","log","bread","tea","cake","ingot","plank","cloth"];
function genTask() {
  const id = TASKPOOL[Math.random()*TASKPOOL.length|0];
  const qty = 20+Math.random()*40|0;
  return { id, qty, gold:Math.floor(IT[id].val*qty*1.6*(1+S.badge*0.15)), token:1+Math.random()*3|0, box:Math.random() < 0.25 };
}
function refreshTasks(free) {
  if (!free) { if (S.gold < 100) return; S.gold -= 100; }
  S.tasks = [genTask(), genTask(), genTask()];
  log("📋 任务板已刷新");
}
function doTask(i) {
  const t = S.tasks[i]; if (!t) return;
  if (!take(t.id, t.qty)) { log("材料不足"); return; }
  S.gold += t.gold; S.token += t.token;
  if (t.box) addIt("box", 1);
  log(`📋 任务完成 +${t.gold}💰`);
  S.tasks[i] = genTask();
}
function upBadge() {
  const c = Math.floor(200*Math.pow(1.6, S.badge));
  if (S.badge >= 9 || S.gold < c) return;
  S.gold -= c; S.badge++;
  log(`🎖️ 任务徽章 +${S.badge}`);
}
function buyBell(id, cost, qty) {
  qty = Math.max(1, qty|0);
  if (S.bell < cost*qty) { log(`🔔 牛铃不足（需要 ${cost*qty}，现有 ${S.bell}）`); return; }
  for (let i = 0; i < qty; i++) { if (!addIt(id, 1)) { log(`🎒 背包已满（已购入 ${i} 个）`); qty = i; break; } }
  if (qty <= 0) return;
  S.bell -= cost*qty;
  log(`🛒 花费 ${cost*qty}🔔 购买 ${IT[id].ic}${IT[id].n}×${qty}`);
  renderPanel();
}
function goldToBell(qty) {
  qty = Math.max(1, Math.floor(qty|0));
  const cost = GOLD_PER_BELL * qty;
  if (S.gold < cost) { log(`🔁 金币不足：兑换 ${qty}🔔 需 ${cost.toLocaleString()}💰，现有 ${Math.floor(S.gold).toLocaleString()}💰`); return; }
  S.gold -= cost; S.bell += qty;
  log(`🔁 金币兑换成功：${cost.toLocaleString()}💰 → ${qty}🔔（当前牛铃 ${S.bell}）`);
  renderTop(); renderPanel();
}
function redeemGold(id, qty) {
  const g = GOLD_REDEEM[id]; if (!g) return;
  const have = bagN(id);
  if (have < 1) { log(`⚠️ 背包中没有${IT[id].ic}${IT[id].n}`); return; }
  const want = Math.max(1, Math.floor(+qty || 1));
  qty = Math.min(want, have);
  if (!take(id, qty)) return;
  S.gold += g*qty;
  log(`💰 兑换 ${IT[id].ic}${IT[id].n}×${qty} → ${(g*qty).toLocaleString()} 金币${want > have ? "（持有量不足，已按全部兑换）" : ""}！`);
  renderTop(); renderPanel();
}

/* 内丹 */
const ND_PILL_XP = { yaoDan:1, diLingDan:10, tianYuanDan:100 };
const ND_MAX_LV = 100;
function ndXpNeed(n) { return Math.floor(50*Math.pow(1.05,n)); }
function usePill(id, n) {
  if (!ND_PILL_XP[id]) return;
  n = Math.max(1, Math.min(n|0, bagN(id)));
  if (n < 1) { log(`背包中没有${IT[id].n}`); return; }
  const nd = S.neidan;
  if (nd.lv >= ND_MAX_LV) { log(`🧿 内丹已达 Lv${ND_MAX_LV} 满级（全属性+50%）`); return; }
  take(id, n);
  nd.xp += n*ND_PILL_XP[id];
  let ups = 0;
  while (nd.lv < ND_MAX_LV && nd.xp >= ndXpNeed(nd.lv)) { nd.xp -= ndXpNeed(nd.lv); nd.lv++; ups++; }
  if (ups) log(`🧿 内丹升到 Lv${nd.lv}（全属性 +${(nd.lv*0.5).toFixed(1)}%）${ups>1?`（连升${ups}级！）`:""}`);
  else log(`🧿 服用 ${IT[id].ic}${IT[id].n}×${n}（+${n*ND_PILL_XP[id]} 经验，当前 ${nd.xp|0}/${ndXpNeed(nd.lv)}）`);
  saveGame(); renderTop(); renderPanel();
}

/* 翅膀 */
const WING_NAMES = ["凡羽","灵羽","玄羽","天羽","金羽","圣羽","神羽","鸿蒙之翼","太初之翼","无极之翼","天道之翼","混沌之翼"];
const WING_FEATHER = [10,30,80,200,500,1200,3000,7000,15000,35000,80000];
const wingGold = (st) => Math.floor(50000*Math.pow(2.2, st));
function upWing() {
  const w = S.wing;
  if (w.stage >= 12) { log("🕊️ 已达混沌之翼（最高阶）"); return; }
  const need = WING_FEATHER[w.stage], gold = wingGold(w.stage);
  if (bagN("yuLing") < need || S.gold < gold) {
    log(`🕊️ 升阶材料不足：需 🕊️羽翎×${need}（现有${bagN("yuLing")}）＋${gold.toLocaleString()}💰（现有${Math.floor(S.gold).toLocaleString()}）`);
    return;
  }
  take("yuLing", need); S.gold -= gold;
  w.stage++;
  log(`🕊️ 翅膀升阶成功 →【${WING_NAMES[w.stage-1]}】全属性 +${w.stage*5}%！`);
  saveGame(); renderTop(); renderPanel();
}

function canRebirth() { return SK.some((s)=>lv(s.id) >= 100); }
let rebirthArm = 0;
function askRebirth() {
  if (!canRebirth() || S.reb >= 7) return;
  if (Date.now() - rebirthArm < 5000) {
    rebirthArm = 0;
    rebirth();
    renderPanel();
    return;
  }
  rebirthArm = Date.now();
  log("🌀 5秒内再次点击红色「确认转生」按钮执行！注意：怪物击杀解锁会全部重置，且转生后怪物属性增强！");
  renderPanel();
  setTimeout(() => {
    if (rebirthArm && Date.now() - rebirthArm >= 4900) { rebirthArm = 0; renderPanel(); }
  }, 5200);
}
async function rebirth() {
  if (!canRebirth() || S.reb >= 7) return;
  const keepOpen = S.lanes.map((l)=>l.open);
  const keepTrash = Object.assign({}, S.autoTrash);
  const keepAutoNext = S.autoNext;
  const keepPots = JSON.parse(JSON.stringify(S.pots));
  const keepNd = S.neidan, keepWing = S.wing;
  const keepName = S.name;
  const keepSpd10 = S.spd10 || 0;
  const addFloor = (S.lifeBest||0);
  const addLv = totalLv();
  const prevCumFloor = (S.cumFloor||0);
  const prevCumLv = (S.cumLv||0);
  S.sp = 20+S.reb*20;
  S.reb++;
  S.cumFloor = prevCumFloor + addFloor;
  S.cumLv = prevCumLv + addLv;
  S.name = keepName;
  S.skills = defSkills();
  for (const k in S.slotMap) { if (typeof S.slotMap[k] === "object") delete S.slotMap[k]; }
  S.eq = {weapon:null,helmet:null,armor:null,boots:null,gloves:null,ring:null};
  S.lanes = defLanes();
  S.lanes.forEach((l,i)=>{ l.open = keepOpen[i]||0; });
  S.autoTrash = keepTrash;
  S.autoNext = keepAutoNext;
  S.pots = keepPots;
  S.neidan = keepNd;
  S.wing = keepWing;
  S.houses = {};
  S.hp = 60;
  S.deadUntil = 0;
  S.endless = false;
  S.floor = 1;
  S.floorKills = {};
  S.lifeBest = 0;
  S.monI = 0;
  S.monLv = 1;
  S.kills = {};
  S.spd10 = keepSpd10;
  S.monHp = mon(0,1).hp;
  giveStarterGear();
  const cf = rebCf();
  log(`🌀 第 ${S.reb} 次转生完成！保留 ${S.sp} 技能点｜怪物属性增强至 ×${cf.toFixed(2)}｜技能等级上限 → ${effCap()}（每转+60）｜品质解锁 → ${RARE_NAMES[maxRare()]}（每转+1档）｜🧿内丹 Lv${S.neidan.lv} 与 🕊️${S.wing.stage?WING_NAMES[S.wing.stage-1]:"未觉醒翅膀"} 完整保留`);
  log(`🏆 转生累计：🌌终身 ${S.cumFloor.toLocaleString()} 层（本次+${addFloor}）｜⭐终身 ${S.cumLv.toLocaleString()} 级（本次+${addLv}）——已同步排行榜`);
  saveGame();
  try { await cloudSave(); } catch (e) {}
  tryLbRefresh(true);
}

