"use strict";
/* ============================================================
   ★ 模块 P：存档 / 读档自动净化 / 离线 / 导出导入
   ============================================================ */
function saveGame() {
  if (!LOGGED_IN || !S) return;
  S.lastTick = Date.now();
  localStorage.setItem(saveKeyOf(CUR, curSlot), JSON.stringify({S, uid}));
  if (CUR !== "guest" && CLOUD_ON()) {
    if (!saveGame._t) saveGame._t = 0;
    const now = Date.now();
    if (now-saveGame._t > 60000) { saveGame._t = now; cloudSave(); }
  }
}
function sanitizeSave() {
  let bad = [];
  for (const id in S.bag) { if (!IT[id]) { bad.push(id); delete S.bag[id]; } }
  for (const k in S.slotMap) {
    const v = S.slotMap[k];
    if (v === null || v === undefined) { delete S.slotMap[k]; bad.push("空格:"+k); continue; }
    if (typeof v === "string" && (!IT[v] || !S.bag[v])) { delete S.slotMap[k]; bad.push("映射:"+k); continue; }
    if (typeof v === "object" && (!v.slot || !v.n || !SLOTS.find((s)=>s.id===v.slot))) { delete S.slotMap[k]; bad.push("装备:"+k); continue; }
  }
  for (const id in S.bag) { if (!slotOf(id)) { const k = findFreeSlot(); if (k) S.slotMap[k] = id; } }
  if (Array.isArray(S.tasks)) {
    S.tasks = S.tasks.map((t)=>(t && IT[t.id]) ? t : genTask());
  }
  if (bad.length) {
    console.warn("🔧 sanitizeSave 清理了坏数据：", bad);
    setTimeout(()=>log(`🔧 存档自动净化：清理了 ${bad.length} 条异常数据（${bad.slice(0,3).join("、")}${bad.length>3?"等":""}）`), 500);
  }
}
function loadGame() {
  let r = localStorage.getItem(saveKeyOf(CUR, curSlot));
  if (!r && curSlot === 1) r = localStorage.getItem(saveKeyOf(CUR));
  if (!r) return false;
  try {
    const d = JSON.parse(r);
    let sd = unwrapSlot(d.S != null ? d.S : d);
    if (!sd || typeof sd !== "object" || !sd.skills || typeof sd.skills !== "object" || !sd.bag) {
      console.warn("存档结构校验失败（疑似封装异常或损坏），按无档处理");
      return false;
    }
    S = sd;
    uid = d.uid || 1;
    if (!S.kills) S.kills = {};
    if (!S.perks) S.perks = {q:0,off:0,mk:0};
    if (!S.speed) S.speed = 1;
    if (S.spd10 == null) S.spd10 = 0;
    if (S.autoTrash == null) S.autoTrash = {mode:0,rare:1};
    if (S.autoNext == null) S.autoNext = true;
    if (!S.floorKills) S.floorKills = {};
    if (S.cumFloor == null) S.cumFloor = 0;
    if (S.cumLv == null) S.cumLv = 0;
    if (S.xpMin == null) S.xpMin = 0;
    if (S.xpMult == null) S.xpMult = 0;
    if (S.buffHit == null) S.buffHit = 0;
    if (S.buffHitMin == null) S.buffHitMin = 0;
    if (S.buffCd == null) S.buffCd = 0;
    if (S.buffCdMin == null) S.buffCdMin = 0;
    if (S.buffInv == null) S.buffInv = 0;
    if (S.buffInvMin == null) S.buffInvMin = 0;
    if (!S.neidan) S.neidan = {lv:0,xp:0};
    if (!S.wing) S.wing = {stage:0};
    if (!Array.isArray(S.pots)) S.pots = [null,null,null,null,null];
    while (S.pots.length < 5) S.pots.push(null);
    if (S.deadUntil == null || isNaN(S.deadUntil)) S.deadUntil = 0;
    if (S.dead) { S.deadUntil = Date.now()+S.dead*1000; delete S.dead; }
    if (S.endless == null) S.endless = false;
    if (!S.floor) S.floor = 1;
    if (!S.bestFloor) S.bestFloor = 0;
    if (S.lifeBest == null) S.lifeBest = S.endless ? (S.floor||1) : 0;
    if (!S.floorStart || isNaN(S.floorStart)) S.floorStart = Date.now();
    if (!S.lanes || !Array.isArray(S.lanes)) { S.lanes = defLanes(); S.lanes[0].items = Array.isArray(S.queue)?S.queue:[]; }
    delete S.queue;
    if (!S.eq) S.eq = {};
    if (!("boots" in S.eq)) S.eq.boots = null;
    if (!("gloves" in S.eq)) S.eq.gloves = null;
    if (!S.bag) S.bag = {};
    if (!S.slotMap) S.slotMap = {};
    if (!S.name) S.name = "访客";
    if (!S.style) S.style = "melee";
    if (S.gold == null) S.gold = 0;
    if (S.bell == null) S.bell = 0;
    if (S.token == null) S.token = 0;
    if (S.reb == null) S.reb = 0;
    if (S.sp == null) S.sp = 0;
    if (S.badge == null) S.badge = 0;
    if (!S.houses) S.houses = {};
    if (!S.tasks || !Array.isArray(S.tasks)) S.tasks = [];
    if (S.autoHp == null) S.autoHp = 30;
    if (S.autoMp == null) S.autoMp = 20;
    for (const sk in S.skills) { if (!S.skills[sk] || S.skills[sk].lv == null) S.skills[sk] = { lv:1, xp:0 }; }
    SK.forEach((s)=>{ if (!S.skills[s.id]) S.skills[s.id] = { lv:1, xp:0 }; });
    if (S.monI == null) S.monI = 0;
    if (S.monLv == null) S.monLv = 1;
    S.monI = Math.min(99, Math.max(0, S.monI|0));
    S.monLv = Math.min(5, Math.max(1, S.monLv|0));
    if (S.hp == null) S.hp = 60;
    if (S.mp == null) S.mp = 25;
    if (S.monHp == null || S.monHp <= 0) S.monHp = curMon().hp;
    sanitizeSave();
    migrateBag();
    if (Array.isArray(S.equips)) { S.equips.forEach((e)=>{ if (e && typeof e === "object") addEq(e, true); }); delete S.equips; }
    delete S.diff; delete S.monAtkCf; delete S.forgeCf; delete S.cfg;
    migrateEquips(); checkLanes();
    return true;
  } catch (e) { console.error("读档失败", e); return false; }
}
function exportSave() {
  if (!LOGGED_IN || !S) { alert("请先进入游戏再导出存档"); return; }
  saveGame();
  const payload = { app:"galaxy-ranch-save", v:1, time:new Date().toISOString(),
    user:(CUR==="guest"?null:CUR), slot:curSlot, save:localStorage.getItem(saveKeyOf(CUR, curSlot)),
    accounts:localStorage.getItem(ACC_KEY)||"{}" };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "银河牧场存档_"+(CUR==="guest"?"游客":CUR)+"_槽"+curSlot+"_"+new Date().toISOString().slice(0,10)+".json";
  a.click(); URL.revokeObjectURL(a.href);
  log("💾 存档已导出为 json 文件");
}
(function bindSaveImport() {
  const fi = document.getElementById("saveFile");
  if (!fi) return;
  fi.addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (d.app !== "galaxy-ranch-save" || typeof d.save !== "string") throw new Error("bad");
        const target = d.user || "guest";
        const slot = Math.min(SLOT_MAX, Math.max(1, +(d.slot||1)));
        if (!confirm(`⚠️ 即将把存档写入【账号 ${target} · 存档槽 ${slot}】并覆盖原有进度。\n\n`
          + `当前登录账号：${CUR || "未登录"}\n导出时间：${d.time || "未知"}\n\n`
          + `存档内含终身累计成绩（累计层数 / 累计等级 / 转生次数）。\n`
          + `跨账号复制同一份存档，会让多个账号在排行榜出现完全相同的成绩。\n确定继续吗？`)) return;
        if (d.accounts) {
          try {
            const cur = JSON.parse(localStorage.getItem(ACC_KEY)||"{}");
            const inc = JSON.parse(d.accounts);
            Object.assign(cur, inc);
            localStorage.setItem(ACC_KEY, JSON.stringify(cur));
          } catch (_) {}
        }
        localStorage.setItem(saveKeyOf(target, slot), d.save);
        localStorage.setItem("mr_slot_" + target, String(slot));
        localStorage.setItem(SES_KEY, target);
        alert("✅ 存档导入成功（存档槽" + slot + "）！页面即将刷新…");
        location.reload();
      } catch (err) { alert("❌ 导入失败：请选择本游戏导出的存档文件"); }
    };
    r.readAsText(f); fi.value = "";
  });
})();
function offCap() { return (10+S.perks.off)*3600; }

function fmtDur(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec/3600), m = Math.floor(sec%3600/60), s = sec%60;
  return (h ? h+"h " : "") + ((h||m) ? m+"m " : "") + s + "s";
}
function fmtNum(n) {
  n = Math.floor(n);
  if (n >= 100000) return (n/1000).toFixed(0)+"K";
  if (n >= 10000) return (n/1000).toFixed(1).replace(/\.0$/,"")+"K";
  return n.toLocaleString();
}
function offline() {
  if (!S) return;
  const realEl = Math.max(0, (Date.now()-S.lastTick)/1000);
  const el = Math.min(realEl, offCap());
  if (el < 60) return;
  const goldBefore = S.gold;
  const bagBefore = Object.assign({}, S.bag);
  const eqBefore = bagEquips().length;
  const lvBefore = {}; SK.forEach((s)=>{ lvBefore[s.id] = S.skills[s.id].lv; });
  XP_GAIN = {};
  let left = el, it = 0;
  while (left > 0 && it < 30000) { const dt = Math.min(2,left); simCore(dt); left -= dt; it++; }
  XP_GAIN = null;
  const gain = {}, used = {};
  for (const k in S.bag) { const d = S.bag[k]-(bagBefore[k]||0); if (d > 0) gain[k] = d; }
  for (const k in bagBefore) { const d = (S.bag[k]||0)-bagBefore[k]; if (d < 0) used[k] = -d; }
  const rep = {
    gold: S.gold-goldBefore,
    equips: Math.max(0, bagEquips().length-eqBefore),
    gain, used,
    xp: Object.assign({}, XP_GAIN),
    lvUps: []
  };
  SK.forEach((s)=>{ if (S.skills[s.id].lv > lvBefore[s.id]) rep.lvUps.push({ic:SKM[s.id].ic, n:SKM[s.id].n, lv:S.skills[s.id].lv}); });
  showOfflineModal(realEl, el, rep);
  log(`🌙 离线 ${fmtDur(realEl)}，结算 ${fmtDur(el)}（收益见弹窗）`);
}
function showOfflineModal(realEl, simEl, rep) {
  const card = (ic, txt) => `<div class="offIt"><span class="ic">${ic}</span><span class="ct">${txt}</span></div>`;
  let g = "";
  if (rep.gold > 0) g += card("💰", "+"+fmtNum(rep.gold));
  for (const k in rep.gain) g += card(IT[k]?IT[k].ic:"❓", fmtNum(rep.gain[k]));
  if (rep.equips > 0) g += card("🗡️", "装备×"+rep.equips);
  const x = Object.entries(rep.xp).sort((a,b)=>b[1]-a[1])
    .map(([k,v]) => card(SKM[k]?SKM[k].ic:"❓", fmtNum(v))).join("");
  let u = "";
  for (const k in rep.used) u += card(IT[k]?IT[k].ic:"❓", fmtNum(rep.used[k]));
  $("offBody").innerHTML =
    `<div class="offLine">离线时间 <b>${fmtDur(realEl)}</b></div>` +
    `<div class="offLine">进展时间 <b>${fmtDur(simEl)}</b>${rep.lvUps.length ? '<span class="lvTag">升级</span>' : ""}</div>` +
    (g ? `<div class="offSec">获得物品</div><div class="offGrid">${g}</div>` : "") +
    (x ? `<div class="offSec">获得经验</div><div class="offGrid">${x}</div>` : "") +
    (u ? `<div class="offSec">消耗物品</div><div class="offGrid">${u}</div>` : "") +
    (rep.lvUps.length ? `<div class="offSec">技能升级</div><div class="offLine" style="color:#6f6">${rep.lvUps.map((l)=>`${l.ic}${l.n}→Lv${l.lv}`).join("　")}</div>` : "");
  $("offModal").style.display = "flex";
}
function closeOff() { $("offModal").style.display = "none"; }

