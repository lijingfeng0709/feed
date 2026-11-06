"use strict";
/* ============================================================
   ★ 自动锻造（仅对背包中的装备生效）
   ============================================================ */
function ensureAuto(e) { if (!e.auto) e.auto = { plus:e.plus, rare:Math.min(e.rare,maxRare()), tier:e.reqLv, on:false }; return e.auto; }
function setAF(ref, k, v) {
  const e = getEq(ref); if (!e) return;
  const t = ensureAuto(e);
  v = +v; if (isNaN(v)) return;
  if (k === "plus") t.plus = Math.min(ENH_MAX, Math.max(0, v|0));
  if (k === "rare") t.rare = Math.min(maxRare(), Math.max(0, v|0));
  if (k === "tier") t.tier = Math.min(EQ_MAX_LV, Math.max(1, v|0));
  saveGame(); renderPanel();
}
function toggleAF(ref) {
  const e = getEq(ref); if (!e) return;
  const t = ensureAuto(e);
  t.on = !t.on;
  if (t.on) log(`🎯 自动锻造启动：${eqName(e)} → 目标【强化+${t.plus}｜${RARE_NAMES[t.rare]}｜Lv${t.tier}档】，每秒尝试，材料不足自动停止`);
  else log(`⏸ 自动锻造已暂停：${eqName(e)}`);
  saveGame(); renderPanel();
}
function autoForgeTick() {
  if (!S || !LOGGED_IN) return;
  const tryEq = (e, ref) => {
    const t = e.auto;
    if (!t || !t.on) return;
    const stop = (msg) => { t.on = false; log(`🎯 自动锻造停止：${eqName(e)} —— ${msg}`); renderPanel(); };
    if (e.plus < t.plus) {
      const ef = enhFullCost(e);
      if (!canAfford(ef.mats, ef.gold)) return stop(`强化材料不足（需 ${matStr(ef.mats)}＋${ef.gold.toLocaleString()}💰）`);
      payCost(ef.mats, ef.gold);
      addXp("enh", 50+e.plus*20);
      if (Math.random() < enhRate(e)) { e.plus++; log(`🎯 自动强化成功 → ${eqName(e)}`); }
      else log(`🎯 自动强化失败（不掉级）`);
      return;
    }
    if (e.rare < t.rare && e.rare < maxRare()) {
      const c = QUAL[e.rare];
      if (!c) return stop("已达最高品质，无法再升阶");
      if (!canAfford(c.mats, c.gold)) return stop(`升阶材料不足（需 ${matStr(c.mats)}＋${c.gold.toLocaleString()}💰）`);
      payCost(c.mats, c.gold);
      addXp("enh", 80+e.rare*60);
      if (Math.random() < qualRate(e.rare)) {
        const oldR = e.rare; e.rare++;
        const ratio = RARE_MULT[e.rare]/RARE_MULT[oldR];
        ["atk","hp","def","eva"].forEach((k)=>{ if (e[k]) e[k] = Math.floor(e[k]*ratio); });
        e.n = PREFIX[e.rare]+e.n.replace(RARE_STRIP,"");
        rollSpecials(e);
        log(`🎯 自动升阶成功 → 【${RARE_NAMES[e.rare]}】${eqName(e)}`);
      } else log(`🎯 自动升阶失败`);
      return;
    }
    if (e.reqLv < t.tier) {
      const c = upgCfg(e);
      if (!c) return stop(`已达最高档次 Lv${EQ_MAX_LV}`);
      if (!canWearAt(e, c.to)) return stop(`下一档 Lv${c.to} 超过穿戴要求（需 ${e.slot==="weapon"?"单项战斗":"战斗均"}Lv≥${c.to}，当前 ${tierWearLv(e)}）`);
      if (c.to > t.tier) {
        /* 下一档超过目标档：视为完成 */
      } else {
        if (!canAfford(c.mats, c.gold)) return stop(`升级材料不足（需 ${matStr(c.mats)}＋${c.gold.toLocaleString()}💰）`);
        payCost(c.mats, c.gold);
        addXp("enh", 100+tierIdx(e.reqLv)*80);
        if (Math.random() < tierRate(e)) {
          const ratio = tierFactor(c.to)/tierFactor(e.reqLv);
          ["atk","hp","def","eva"].forEach((k)=>{ if (e[k]) e[k] = Math.floor(e[k]*ratio); });
          if (e.aspd) e.aspd = Math.min(cfg("aspdMax"), Math.floor(e.aspd*ratio));
          if (e.crit) e.crit = Math.min(cfg("critMax"), Math.floor(e.crit*ratio));
          if (e.critDmg) e.critDmg = Math.min(cfg("critDmgMax"), Math.floor(e.critDmg*ratio));
          if (e.ls) e.ls = Math.min(cfg("lsMax"), Math.floor(e.ls*ratio));
          e.reqLv = c.to;
          log(`🎯 自动升级成功 → ${eqName(e)}（Lv${e.reqLv}档）`);
        } else log(`🎯 自动升级失败（成功率 ${(tierRate(e)*100).toFixed(0)}%）`);
        return;
      }
    }
    t.on = false;
    log(`✅ 自动锻造完成：${eqName(e)}【强化+${e.plus}｜${RARE_NAMES[e.rare]}｜Lv${e.reqLv}档】`);
    renderPanel();
  };
  bagEquips().forEach(({e})=>tryEq(e, e.uid));
}
function autoForgeUI(e, ref) {
  const t = ensureAuto(e);
  const ra = refAttr(ref);
  return `<div class="row" style="background:#152a1e;border-left:3px solid #5c5;flex-direction:column;align-items:stretch">`
    +`<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">`
    +`<span class="name" style="color:#5c5">🎯 自动锻造</span>`
    +`<span class="info">强化+</span><input type="number" min="0" max="${ENH_MAX}" value="${t.plus}" style="width:48px" onchange="setAF(${ra},'plus',this.value)">`
    +`<span class="info">🏆品质</span><select onchange="setAF(${ra},'rare',+this.value)" style="max-width:80px">${RARE_NAMES.slice(0, maxRare()+1).map((n,i)=>`<option value="${i}" ${t.rare===i?"selected":""}>${n}</option>`).join("")}</select>`
    +`<span class="info">⬆档位</span><select onchange="setAF(${ra},'tier',+this.value)" style="max-width:90px">${LV_TIERS.map((v2)=>`<option value="${v2}" ${t.tier===v2?"selected":""}>Lv${v2}</option>`).join("")}</select>`
    +`<button class="act sm" style="background:${t.on?"#e55":"#2a5"}" onclick="toggleAF(${ra})">${t.on?"■ 停止":"▶ 开始"}</button>`
    +`</div>`
    +(t.on?`<div class="info" style="color:#5c5;margin-top:3px">自动锻造中…每秒尝试一次（强化→升阶→升档），达标或材料不足自动停止</div>`:"")
    +`</div>`;
}

