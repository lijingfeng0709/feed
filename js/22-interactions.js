"use strict";
/* ============================================================
   ★ 模块 S：交互函数
   ============================================================ */
function setSpd(v) {
  if (!SPEEDS.includes(v)) return;
  if (v === 10 && !S.spd10) { buySpd10(); return; }
  S.speed = v; saveGame(); renderSpd(); log(`⏩ 游戏速度：${v}×`);
}
function buySpd10() {
  if (S.spd10) return;
  if (S.bell < SPD10_COST) {
    log(`🔒 10×加速解锁需 ${SPD10_COST}🔔（当前 ${S.bell}🔔）——牛铃获取：无尽挂机刷金币兑换（牛铃商店）/ 玩家市场🔔计价卖材料`);
    renderSpd();
    return;
  }
  if (!confirm(`确认花费 ${SPD10_COST}🔔 解锁 10× 加速？\n\n· 解锁保存在当前存档槽${curSlot}（随云存档同步）\n· 转生保留，永久有效`)) return;
  S.bell -= SPD10_COST; S.spd10 = 1;
  log(`🔓 10× 加速已解锁！已扣除 ${SPD10_COST}🔔，点击「10×」按钮启用`);
  saveGame(); renderTop(); renderSpd();
}
function setAutoTrash(k, v) { S.autoTrash[k] = v; saveGame(); renderPanel(); log(`⚡ 自动处理：${["关闭","💰自动出售","⚒️自动分解"][S.autoTrash.mode]}｜阈值：${RARE_NAMES[S.autoTrash.rare]}及以下（🔒锁定装备免疫）`); }
function setPot(i, k, v) { if (!S.pots[i]) S.pots[i] = {id:"",cond:"hp",val:30}; S.pots[i][k] = v; if (k === "cond") S.pots[i].t = null; saveGame(); renderPanel(); }
function updCmbEqN() { const s = $("cmbEq"); if (!s || !s.selectedOptions[0]) return; const n = $("cmbEqN"); if (n) n.value = Math.max(1, +s.selectedOptions[0].dataset.n || 1); }
function updCmbGemN() { const s = $("cmbGem"); if (!s || !s.selectedOptions[0]) return; const n = $("cmbGemN"); if (n) n.value = Math.max(1, +s.selectedOptions[0].dataset.n || 1); }
function pickEndlessFloor(f) {
  if (!S.endless) { log("⚠️ 请先进入无尽模式"); return; }
  f = Math.max(1, Math.min(Math.max(1,S.bestFloor), f|0));
  S.floor = f; S.monHp = endlessMon(S.floor).hp; atkCd = 0; monCd = 1.0;
  S.floorStart = Date.now();
  saveGame(); renderTop(); renderPanel();
  log(`🌌 跳转到无尽第 ${S.floor} 层（计时重置）`);
}
function setAutoNext(v) { S.autoNext = !!v; saveGame(); renderPanel(); log(v?"🌌 通关后自动下一层":"🌌 通关后停留本层"); }
function toggleEndless(on) {
  S.endless = on;
  S.floorStart = Date.now();
  if (on) { S.monHp = endlessMon(S.floor).hp; atkCd = 0; monCd = 1.0; log(`🌌 进入无尽模式：第 ${S.floor} 层起｜每层限时${FLOOR_LIMIT/60}分钟`); }
  else { S.monHp = mon(S.monI, S.monLv).hp; log(`⏸ 退出无尽模式`); }
  saveGame(); renderTop(); renderPanel();
}
function useXpItem(id) {
  if (!XPIT[id]) return;
  if (!take(id, 1)) return;
  S.xpMult = XPIT[id].m; S.xpMin = XPIT[id].mm;
  log(`📖 ${IT[id].n} 生效：经验 +${(XPIT[id].m*100)|0}%，持续 ${XPIT[id].mm} 分钟`);
  renderPanel();
}
function usePotItem(id) {
  const b = POTBUFF[id]; if (!b) return;
  if (!take(id, 1)) return;
  const txt = b.k === "hit" ? "攻击100%命中" : b.k === "inv" ? "无敌（免疫怪物伤害）" : "暴击伤害+100000%";
  if (b.k === "hit") { S.buffHit = b.v; S.buffHitMin = b.mm; }
  else if (b.k === "inv") { S.buffInv = b.v; S.buffInvMin = b.mm; }
  else { S.buffCd = b.v; S.buffCdMin = b.mm; }
  log(`🧪 ${IT[id].n} 生效：${txt}，持续 ${b.mm} 分钟`);
  renderPanel();
}
function gotoPage(p) { bagPage = Math.min(MAX_PAGES-1, Math.max(0, p)); selSlot = null; renderPanel(); }
function gotoFirstUsed() { const ks = Object.keys(S.slotMap); if (!ks.length) { log("背包是空的"); return; } gotoPage(+ks[0].split("_")[0]); }
function gotoFreeSlot() {
  for (let p = bagPage; p < MAX_PAGES; p++) for (let c = 0; c < PAGE_SIZE; c++) {
    if (!S.slotMap[p+"_"+c]) { gotoPage(p); selSlot = p+"_"+c; renderPanel(); return; }
  }
  log("背包全满了！");
}
function eatItem(id) { if (isDead()) { log("💀 死亡状态无法使用物品"); return; } if (take(id,1)) { S.hp = Math.min(P().maxHp, S.hp+IT[id].heal); log(`吃掉 ${IT[id].n}`); renderPanel(); } }
function drinkItem(id) { if (isDead()) { log("💀 死亡状态无法使用物品"); return; } if (take(id,1)) { S.mp = Math.min(P().maxMp, S.mp+IT[id].mp); log(`喝掉 ${IT[id].n}`); renderPanel(); } }
function equipIt(eqUid) {
  const k = findEqKey(eqUid); if (!k) return;
  const e = S.slotMap[k];
  if (!canWear(e)) { log(`穿戴条件不足：${wearNeedTxt(e)}`); return; }
  const old = S.eq[e.slot];
  delete S.slotMap[k];
  if (old) addEq(old, true);
  S.eq[e.slot] = e;
  S.hp = Math.min(S.hp, P().maxHp);
  if (selSlot === k) selSlot = null;
  log(`已装备 ${eqName(e)}${e.auto&&e.auto.on?"（该装备的自动锻造已随之停止——自动锻造仅支持背包装备）":""}`);
  if (e.auto) e.auto.on = false;
  renderPanel();
}
function unequip(slotid) {
  const e = S.eq[slotid]; if (!e) return;
  if (!addEq(e, true)) { log("🎒 背包已满，无法卸下！"); return; }
  S.eq[slotid] = null;
  log(`已卸下 ${eqName(e)}（放回背包后可重新设置🎯自动锻造）`);
  renderPanel();
}
function sellEq(eqUid) {
  const k = findEqKey(eqUid); if (!k) return;
  const e = S.slotMap[k];
  if (e.lock) { log(`🔒 ${eqName(e)} 已锁定，请先解锁再出售（右键装备 → 解锁）`); return; }
  const g = sellPriceEq(e);
  if (e.rare >= 2 && !confirm(`确认出售 ${eqName(e)}（${RARE_NAMES[e.rare]}）？\n将获得 ${g}💰`)) return;
  if (Array.isArray(e.gems)) e.gems.forEach((g2)=>{ if (g2) addIt(`gem_${g2.t}_${g2.l}`, 1); });
  delete S.slotMap[k];
  if (selSlot === k) selSlot = null;
  S.gold += g;
  log(`💰 出售 ${eqName(e)}，得 ${g}💰（宝石已返还背包）`); renderPanel();
}
function salvageEq(eqUid) {
  const k = findEqKey(eqUid); if (!k) return;
  const e = S.slotMap[k];
  if (e.lock) { log(`🔒 ${eqName(e)} 已锁定，请先解锁再分解（右键装备 → 解锁）`); return; }
  if (e.rare >= 3) {
    const mats = salvageRareMats(e); if (!mats) return;
    if (!confirm(`确认分解 ${eqName(e)}（${RARE_NAMES[e.rare]}）？\n将获得：${matsSummary(mats)}`)) return;
    if (Array.isArray(e.gems)) e.gems.forEach((g2)=>{ if (g2) addIt(`gem_${g2.t}_${g2.l}`, 1); });
    delete S.slotMap[k];
    if (selSlot === k) selSlot = null;
    let full = false;
    for (const mk in mats) { if (!addIt(mk, mats[mk])) { full = true; log(`🎒 ${IT[mk].n} 部分未能入包`); } }
    log(`⚒️ 分解 ${RARE_NAMES[e.rare]} ${e.n} → ${matsSummary(mats)}${full?"（背包部分已满）":""}`);
    renderPanel(); return;
  }
  const { mat, n } = salvageGain(e);
  if (e.rare >= 2 && !confirm(`确认分解 ${eqName(e)}（${RARE_NAMES[e.rare]}）？\n将获得 ${IT[mat].ic}${IT[mat].n}×${n} ＋少量金币`)) return;
  if (Array.isArray(e.gems)) e.gems.forEach((g2)=>{ if (g2) addIt(`gem_${g2.t}_${g2.l}`, 1); });
  delete S.slotMap[k];
  if (addIt(mat, n)) {
    const bonus = Math.floor(sellPriceEq(e)*0.15); S.gold += bonus;
    if (selSlot === k) selSlot = null;
    log(`⚒️ 分解 ${eqName(e)} → ${IT[mat].ic}${IT[mat].n}×${n}${bonus>0?` ＋${bonus}💰`:""}（宝石已返还）`);
  } else { S.slotMap[k] = e; log("🎒 背包已满，无法分解！"); }
  renderPanel();
}
function batchSellRare(r) {
  const pv = batchPreview((e)=>e.rare===r);
  if (!pv.cnt) { log("没有符合条件的装备"); return; }
  if (!confirm(`确认出售全部【${RARE_NAMES[r]}】装备？\n共 ${pv.cnt} 件，合计 ${pv.gold}💰（🔒锁定装备已排除）`)) return;
  let g = 0, n = 0;
  bagEquips().forEach(({key,e})=>{ if (!e.lock && e.rare===r && e.rare<3) { g += sellPriceEq(e); if (Array.isArray(e.gems)) e.gems.forEach((g2)=>{ if (g2) addIt(`gem_${g2.t}_${g2.l}`,1); }); delete S.slotMap[key]; if (selSlot===key) selSlot = null; n++; } });
  S.gold += g;
  log(`💰 批量出售 ${RARE_NAMES[r]}装备 ×${n}，共得 ${g}💰`); renderPanel();
}
function batchSellTier(t) {
  const pv = batchPreview((e)=>e.reqLv <= t);
  if (!pv.cnt) { log("没有符合条件的装备"); return; }
  if (!confirm(`确认出售全部 Lv≤${t} 档装备（传奇以下）？\n共 ${pv.cnt} 件，合计 ${pv.gold}💰（🔒锁定装备已排除）`)) return;
  let g = 0, n = 0;
  bagEquips().forEach(({key,e})=>{ if (!e.lock && e.rare<3 && e.reqLv <= t) { g += sellPriceEq(e); if (Array.isArray(e.gems)) e.gems.forEach((g2)=>{ if (g2) addIt(`gem_${g2.t}_${g2.l}`,1); }); delete S.slotMap[key]; if (selSlot===key) selSlot = null; n++; } });
  S.gold += g;
  log(`💰 批量出售 Lv≤${t} 装备 ×${n}，共得 ${g}💰`); renderPanel();
}
function batchSalvageRare(r) {
  const pv = batchPreview((e)=>e.rare===r);
  if (!pv.cnt) { log("没有符合条件的装备"); return; }
  if (!confirm(`确认分解全部【${RARE_NAMES[r]}】装备？\n共 ${pv.cnt} 件\n产出：${matsSummary(pv.mats)} ＋金币（🔒锁定装备已排除）`)) return;
  const mats = {}; let n = 0, g = 0;
  bagEquips().forEach(({key,e})=>{
    if (e.lock || e.rare!==r || e.rare>=3) return;
    const { mat, n: gain } = salvageGain(e);
    mats[mat] = (mats[mat]||0)+gain;
    g += Math.floor(sellPriceEq(e)*0.15);
    if (Array.isArray(e.gems)) e.gems.forEach((g2)=>{ if (g2) addIt(`gem_${g2.t}_${g2.l}`,1); });
    delete S.slotMap[key];
    if (selSlot===key) selSlot = null;
    n++;
  });
  let full = false;
  for (const k in mats) { if (!addIt(k, mats[k])) { full = true; log(`🎒 ${IT[k].n} 部分未能入包！`); } }
  S.gold += g;
  log(`⚒️ 批量分解 ${RARE_NAMES[r]}装备 ×${n} → ${matsSummary(mats)}${full?"（部分已满）":""}`);
  renderPanel();
}
function batchSalvageHigh(r) {
  const list = bagEquips().filter(({e})=>e.rare===r && !e.lock);
  if (!list.length) { log("没有符合条件的装备"); return; }
  let total = {};
  list.forEach(({e})=>{ const m = salvageRareMats(e); for (const k in m) total[k] = (total[k]||0)+m[k]; });
  if (!confirm(`确认分解全部【${RARE_NAMES[r]}】装备 ×${list.length}？\n合计产出：${matsSummary(total)}（🔒锁定装备已排除）`)) return;
  let full = false;
  list.forEach(({key,e})=>{
    const m = salvageRareMats(e);
    if (Array.isArray(e.gems)) e.gems.forEach((g2)=>{ if (g2) addIt(`gem_${g2.t}_${g2.l}`,1); });
    delete S.slotMap[key];
    if (selSlot===key) selSlot = null;
    for (const k in m) if (!addIt(k, m[k])) full = true;
  });
  log(`⚒️ 批量分解 ${RARE_NAMES[r]} ×${list.length} → ${matsSummary(total)}${full?"（部分已满）":""}`);
  renderPanel();
}
function batchSalvageTier(t) {
  const pv = batchPreview((e)=>e.reqLv <= t);
  if (!pv.cnt) { log("没有符合条件的装备"); return; }
  if (!confirm(`确认分解全部 Lv≤${t} 档装备（传奇以下）？\n共 ${pv.cnt} 件\n产出：${matsSummary(pv.mats)} ＋金币（🔒锁定装备已排除）`)) return;
  const mats = {}; let n = 0, g = 0;
  bagEquips().forEach(({key,e})=>{
    if (e.lock || e.rare>=3 || e.reqLv > t) return;
    const { mat, n: gain } = salvageGain(e);
    mats[mat] = (mats[mat]||0)+gain;
    g += Math.floor(sellPriceEq(e)*0.15);
    if (Array.isArray(e.gems)) e.gems.forEach((g2)=>{ if (g2) addIt(`gem_${g2.t}_${g2.l}`,1); });
    delete S.slotMap[key];
    if (selSlot===key) selSlot = null;
    n++;
  });
  let full = false;
  for (const k in mats) { if (!addIt(k, mats[k])) { full = true; log(`🎒 ${IT[k].n} 部分未能入包！`); } }
  S.gold += g;
  log(`⚒️ 批量分解 Lv≤${t} 装备 ×${n} → ${matsSummary(mats)}${full?"（部分已满）":""}`);
  renderPanel();
}
function addQ() {
  const laneEl = $("qLane");
  const li = laneEl ? +laneEl.value : 0;
  const lane = S.lanes[li];
  if (!lane || !lane.open) { log("该通道未解锁"); return; }
  if (lane.items.length >= QMAX()) { log(`通道${li+1}已满`); return; }
  const a = ACT.find((x)=>x.id===qSel);
  if (lv(a.sk) < a.lv) { log(`⚠️ ${SKM[a.sk].n}等级不足`); return; }
  const q = { id:qSel, n:qNum };
  if (a.outEq) {
    const tEl = $("eqTier"); const sEl = $("eqSlot");
    if (tEl) { q.tier = +tEl.value; if (q.tier > Math.min(lv(a.sk), CRAFT_TIER_CAP)) { log(`⚠️ 不足以制造 Lv${q.tier} 档（制造封顶Lv${CRAFT_TIER_CAP}）`); return; } }
    if (sEl) q.slot = sEl.value;
  }
  lane.items.push(q);
  const tag = a.outEq && q.tier ? `（${EQIC[q.slot]} Lv${q.tier}档）` : "";
  log(`➕ [通道${li+1}] ${a.n}${tag}×${qNum}`);
  renderPanel();
}
function addQCombat() {
  if (combatLane()) { log("⚠️ 已有通道正在战斗"); return; }
  const laneEl = $("qLane");
  const li = laneEl ? +laneEl.value : 0;
  const lane = S.lanes[li];
  if (!lane || !lane.open) { log("该通道未解锁"); return; }
  if (lane.items.length >= QMAX()) { log(`通道${li+1}已满`); return; }
  lane.items.push({ id:"combat", n:qNum });
  log(`⚔️ [通道${li+1}] 战斗×${qNum}${S.endless?"（无尽）":""}`);
  renderPanel();
}
function changeQ(li, i, id) {
  const lane = S.lanes[li];
  const q = lane.items[i]; if (!q) return;
  if (id === "combat") {
    const c = combatLane();
    if (c && c !== lane) { log("⚠️ 已有其他通道在战斗"); renderPanel(); return; }
    q.id = "combat"; delete q.tier; delete q.slot;
  } else {
    const a = ACT.find((x)=>x.id===id);
    if (lv(a.sk) < a.lv) { log(`⚠️ ${SKM[a.sk].n}等级不足`); renderPanel(); return; }
    q.id = id;
    if (a.outEq) {
      const avail = LV_TIERS.filter((t)=>t <= Math.min(lv(a.sk), CRAFT_TIER_CAP));
      q.tier = avail.length ? avail[avail.length-1] : a.lv;
      q.slot = (a.slots || SLOTS.map((s)=>s.id))[0];
    } else { delete q.tier; delete q.slot; }
  }
  renderPanel();
}
function moveQ(li, i, d) { const lane = S.lanes[li]; const q = lane.items.splice(i,1)[0]; lane.items.splice(i+d, 0, q); renderPanel(); }
function pickMon(i, l) { if (S.endless) toggleEndless(false); S.monI = i; S.monLv = l; S.monHp = mon(i,l).hp; renderPanel(); }
function setSkill(id, v) { S.skills[id].lv = Math.min(effCap(), Math.max(1, v|0)); S.skills[id].xp = 0; saveGame(); checkLanes(); }
function buyPerk(k, cost) { if (S.bell < cost) return; S.bell -= cost; S.perks[k]++; log("🛒 购买成功"); renderPanel(); }
async function switchAcc(u) {
  const A = accs();
  if (!A[u]) return;
  const pw = prompt(`输入 ${u} 的密码：`);
  if (pw === null) return;
  if (A[u].ph !== hashPw(pw)) { alert("密码错误"); return; }
  saveGame();
  const ok = await cloudSignIn(u, pw);
  doLogin(u);
  showSlotPicker();
}
function delAcc(u) {
  if (!confirm(`确认删除账号 ${u} 及其全部本地存档记录？`)) return;
  const A = accs();
  delete A[u]; saveAccs(A);
  for (let n = 1; n <= SLOT_MAX; n++) localStorage.removeItem(saveKeyOf(u, n));
  localStorage.removeItem(saveKeyOf(u));
  localStorage.removeItem("mr_slot_" + u);
  if (u === CUR) logout(); else renderPanel();
}

