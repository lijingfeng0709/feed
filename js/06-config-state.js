"use strict";
/* ============================================================
   ★ 模块 H：游戏状态 + 全局数值配置
   ============================================================ */
const PAGE_SIZE = 100, MAX_PAGES = 1000, SPEEDS = [1,3,5,10], DIFF_MIN = 0.3, DIFF_MAX = 5;
/* ★ 10×加速解锁价：账号级购买，一次解锁 3 个存档槽通用（转生/清档/删槽均不失效） */
const SPD10_COST = 500;
const SPD10_KEY = "mr_spd10_";
function spd10Key(u) { return SPD10_KEY + (u || CUR || "guest"); }
function spd10Unlocked() {
  try { return localStorage.getItem(spd10Key(CUR)) === "1"; } catch (e) { return false; }
}
function setSpd10Account() {
  if (!CUR) return;
  try { localStorage.setItem(spd10Key(CUR), "1"); } catch (e) {}
}
/* 旧版本把解锁存在单个存档槽：登录/读档时扫描本地 3 槽 + 云端快照，自动升级为账号级 */
function migrateSpd10Account() {
  if (!CUR) return;
  try { if (localStorage.getItem(spd10Key(CUR)) === "1") return; } catch (e) { return; }
  try {
    for (let n = 1; n <= SLOT_MAX; n++) {
      const raw = localStorage.getItem(saveKeyOf(CUR, n)) || (n === 1 ? localStorage.getItem(saveKeyOf(CUR)) : null);
      if (!raw) continue;
      const d = JSON.parse(raw);
      const s = unwrapSlot(d && d.S != null ? d.S : d);
      if (s && s.spd10) { setSpd10Account(); return; }
    }
    if (SLOTDOC && SLOTDOC.slots) {
      for (const n in SLOTDOC.slots) {
        const s = unwrapSlot(SLOTDOC.slots[n]);
        if (s && s.spd10) { setSpd10Account(); return; }
      }
    }
  } catch (e) {}
}
/* 把解锁镜像写回每个已存在的本地存档槽，兼容旧版读取与导出文件 */
function syncSpd10ToSlots() {
  try {
    for (let n = 1; n <= SLOT_MAX; n++) {
      const key = saveKeyOf(CUR, n);
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const d = JSON.parse(raw);
      const s = unwrapSlot(d && d.S != null ? d.S : d);
      if (!s || typeof s !== "object") continue;
      s.spd10 = 1;                       // unwrapSlot 返回原对象引用，保留原有封装结构
      localStorage.setItem(key, JSON.stringify(d));
    }
    if (S) S.spd10 = 1;
  } catch (e) {}
}
let uid = 1;

const CFG_DEFAULT = {
  critDmgMin: 200,   critDmgMax: 10000,
  critMin: 2,        critMax: 50,
  aspdMin: 10,       aspdMax: 200,
  lsMin: 1,          lsMax: 20,
  evCapPct: 100,
  hitFloor: 5,
  skillCap: 120,
  diff: 1,
  monAtkCf: 1,
  forgeCf: 1,
  dropCf: 1,
  xpCf: 1,
  rebMonCf: 0.5,
  gemAtk: 10,
  gemDef: 2,
  gemHp: 60,
  gemCritDmg: 120
};
let CFG = Object.assign({}, CFG_DEFAULT);
let CFG_DIRTY = false;
function cfg(k) { return (CFG[k] != null) ? CFG[k] : CFG_DEFAULT[k]; }
function loadCfg() {
  try {
    const saved = JSON.parse(localStorage.getItem(GCFG_KEY) || "null");
    if (saved) { for (const k in CFG_DEFAULT) if (saved[k] != null) CFG[k] = saved[k]; }
  } catch (e) {}
}
function cacheCfg() { try { localStorage.setItem(GCFG_KEY, JSON.stringify(CFG)); } catch (e) {} }
async function fetchGlobalCfg() {
  if (!CLOUD_ON() || !LOGGED_IN || CUR === "guest") return;
  const id = await cloudUid();
  if (!id) return;
  const { data, error } = await sb.from("game_config").select("data").eq("id", 1).maybeSingle();
  if (error || !data || !data.data) return;
  const d = data.data;
  let changed = false;
  for (const k in CFG_DEFAULT) {
    if (d[k] != null && d[k] !== CFG[k]) { CFG[k] = d[k]; changed = true; }
  }
  if (changed) {
    cacheCfg();
    log("🌍 全局数值配置已更新（管理员发布）");
    if (S) S.monHp = curMon().hp;
    renderSpd(); render();
  } else { cacheCfg(); }
}
async function publishGlobalCfg() {
  cacheCfg();
  if (!isAdmin()) { log("⚠️ 只有管理员能发布全局配置"); return; }
  if (!CLOUD_ON()) { log("⚠️ 云端未连接，配置仅保存在本机缓存"); return; }
  const id = await cloudUid();
  if (!id) { log("⚠️ 云端未登录，无法发布"); return; }
  const { error } = await sb.from("game_config").upsert({ id: 1, data: CFG, updated_at: new Date().toISOString() });
  if (error) sbErr(error);
  else {
    CFG_DIRTY = false;
    log("🌍 全局数值配置已发布！所有玩家将在1分钟内同步生效");
  }
}
function setCfgNum(k, v, lo, hi) {
  v = +v;
  if (isNaN(v)) return;
  const c = Math.min(hi != null ? hi : Infinity, Math.max(lo != null ? lo : 0, Math.round(v*10)/10));
  CFG[k] = c;
  CFG_DIRTY = true;
  log(`⚙️ ${k} → ${c}（点「发布全局配置」对全体玩家生效）`);
}
function resetCfg() {
  CFG = Object.assign({}, CFG_DEFAULT);
  cacheCfg(); CFG_DIRTY = true;
  if (S) S.monHp = curMon().hp;
  log("⚙️ 全局配置已恢复默认（待发布）"); renderPanel(); renderSpd();
}

const defSkills = () => { const o = {}; SK.forEach((s) => { o[s.id] = { lv:1, xp:0 }; }); return o; };
const LANE_MAX = 5;
const LANE_LV = [0,100,250,450,700];
function defLanes() { return Array.from({length:LANE_MAX},(_,i)=>({open:i===0?1:0,items:[],prog:0})); }
function laneCount() { return S.lanes.filter((l)=>l.open).length; }
function combatLane() { for (const l of S.lanes) { if (l.open && l.items.length && l.items[0].id === "combat") return l; } return null; }
function checkLanes() {
  const tl = totalLv();
  for (let i = 1; i < LANE_MAX; i++) {
    if (!S.lanes[i].open && tl >= LANE_LV[i]) {
      S.lanes[i].open = 1;
      log(`🔓 并行通道 ${i+1} 解锁！（总等级 ${tl}）`);
    }
  }
}
function newGameState() {
  S = { name:(MY_PN[curSlot] || "访客"+(1000+Math.random()*9000|0)), gold:100, bell:0, token:0,
    skills:defSkills(), lanes:defLanes(), eff:0,
    bag:{bread:5,tea:3}, slotMap:{},
    eq:{weapon:null,helmet:null,armor:null,boots:null,gloves:null,ring:null},
    style:"melee", monI:0, monLv:1, monHp:mon(0,1).hp, hp:60, mp:25,
    endless:false, floor:1, bestFloor:0, lifeBest:0, autoNext:true,floorKills:{}, floorStart:Date.now(),
    cumFloor:0, cumLv:0,
    autoHp:30, autoMp:20, teaMin:0, xpMin:0, xpMult:0,
    buffHit:0, buffHitMin:0, buffCd:0, buffCdMin:0, buffInv:0, buffInvMin:0,
    pots:[null,null,null,null,null], houses:{}, badge:0, tasks:[],
    reb:0, sp:0, kills:{}, perks:{q:0,off:0,mk:0}, spd10:(spd10Unlocked()?1:0),
    neidan:{lv:0,xp:0}, wing:{stage:0},
    speed:1, autoTrash:{mode:0,rare:1},
    deadUntil:0, lastTick:Date.now() };
  migrateBag();
}
let S = null, selSlot = null, bagPage = 0, potSel = null, bagSearch = "", bellQty = 1, ndQty = 1, gbQty = 1, xhQty = 1;
function deadLeftMs() { return S.deadUntil - Date.now(); }
function isDead() { return S.deadUntil > Date.now(); }
function reviveNow() { S.deadUntil = 0; const p = P(); S.hp = p.maxHp; S.mp = p.maxMp; S.monHp = curMon().hp; atkCd = 0; monCd = 1.0; }
function curMon() { return S.endless ? endlessMon(S.floor) : mon(S.monI, S.monLv); }
function floorLeftMs() { return FLOOR_LIMIT*1000 - (Date.now() - (S.floorStart||Date.now())); }

