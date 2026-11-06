"use strict";
/* ============================================================
   ★ 模块 R：UI 渲染
   ============================================================ */
let TABS = [];
function buildTabs() {
  TABS = ["队列","角色","修行","背包","战斗","市场","锻造","房屋","任务","转生","牛铃商店","账号"];
  if (isAdmin()) TABS.push("管理员","数值配置");
  TABS.push("🏆 排行榜","帮助");
}
let tab = 0, zone = 0, qSel = "milk1", qNum = 10;
const RARE_COLOR_ARR = RARE_COLOR;
const POT_ITEMS = Object.keys(IT).filter((id)=>IT[id].heal||IT[id].mp||XPIT[id]||POTBUFF[id]);
const BATCH_TIERS = [15,30,60,85,95,120,160,200,249];
/* ★ 加速条（10×未解锁显示锁与购买按钮） */
function renderSpd() {
  $("spdwrap").innerHTML = `<span class="lb">⏩ ${IS_MOBILE?"加速":"游戏加速"}</span>`
    +SPEEDS.map((v)=>{
      const lk = (v === 10 && !S.spd10);
      return `<button class="spd ${S.speed===v?"on":""}"${lk?" style='opacity:.5'":""} onclick="setSpd(${v})">${v}×${lk?"🔒":""}</button>`;
    }).join("")
    +(!S.spd10?`<button class="spd" style="background:#a6f;border-color:#a6f;color:#141729" onclick="buySpd10()">🔓10×加速（${SPD10_COST}🔔）</button>`:"")
    +`<span class="info" style="margin-left:8px">当前 <b style="color:#ffd479">${S.speed}×</b>｜难度 <b style="color:#f80">${diff().toFixed(1)}×</b>${S.reb?`｜转生增强 <b style="color:#c5f">×${rebCf().toFixed(2)}</b>`:""}${isAdmin()?' <span class="adminTag">👑管理员</span>':''}｜`
    +(CLOUD_ON()&&CUR!=="guest"?'<span class="cloudOk">☁️ 云同步中</span>':'<span style="color:#889">☁️ 本地模式</span>')
    +`</span><span style="flex:1"></span>`
    +`<button class="spd" onclick="exportSave()">💾 导出</button>`
    +`<button class="spd" onclick="document.getElementById('saveFile').click()">📂 导入</button>`;
}
function renderTop() {
  const p = P();
  const left = isDead() ? Math.ceil(deadLeftMs()/1000) : 0;
  const deadTag = left > 0 ? `<span class="deadtag">💀 复活中 ${left}s</span>` : "";
  const endTag = S.endless ? `<span style="color:#c5f">🌌 无尽 <b>${S.floor}</b>层${S.autoNext===false?"⏸":""}</span><span class="timerTxt">⏱ ${Math.max(0,Math.ceil(floorLeftMs()/1000))}s</span>` : "";
  const atTag = S.autoTrash.mode ? `<span style="color:#8af">⚡ 自动${S.autoTrash.mode===1?"出售":"分解"}≤${RARE_NAMES[S.autoTrash.rare]}</span>` : "";
  const xpTag = S.xpMin > 0 ? `<span style="color:#6f6">📖 经验+${((S.xpMult||0)*100)|0}%（${Math.ceil(S.xpMin)}分）</span>` : "";
  const hitTag = S.buffHitMin > 0 ? `<span class="buffTxt">🧪 命中100%（${Math.ceil(S.buffHitMin)}分）</span>` : "";
  const cdTag = S.buffCdMin > 0 ? `<span class="buffTxt">💣 暴伤+10万%（${Math.ceil(S.buffCdMin)}分）</span>` : "";
  const invTag = S.buffInvMin > 0 ? `<span style="color:#5cf;font-weight:bold">🛉 无敌（${Math.ceil(S.buffInvMin)}分）</span>` : "";
  const who = CUR==="guest" ? "游客·"+S.name : (MY_PN[curSlot] || CUR);
  $("top").innerHTML = `<div>👤 <b>${who}</b><span style="color:#8af">（槽${curSlot}）</span>${isAdmin()?' <span class="adminTag">👑管理员</span>':""}</div>`
    +`<button class="act sm" style="background:#3a4166" onclick="logout()">退出</button>`
    +`<div>💰 <b>${Math.floor(S.gold)}</b></div><div>🔔 <b>${S.bell}</b></div><div>🪙 <b>${S.token}</b></div>`
    +`<div>总等级 <b>${totalLv()}</b></div><div>❤️ <b>${Math.max(0,S.hp|0)}/${p.maxHp}</b></div><div>💧 <b>${S.mp|0}/${p.maxMp}</b></div>`
    +deadTag+endTag+atTag+xpTag+hitTag+cdTag+invTag
    +`<div>🧿 <b>Lv${S.neidan.lv}</b></div><div>🕊️ <b>+${S.wing.stage*5}%</b></div>`
    +`<div>🎒 <b>${usedSlots()}</b>格</div><div>✨ <b>Lv${lv("enh")}</b></div><div>🌀 <b>${S.reb}</b>/7<span style="color:#889">（上限${effCap()}｜品质${RARE_NAMES[maxRare()]}）</span></div>`
    +`<div>🏆 <b>累计${((S.cumFloor||0)+(S.lifeBest||0)).toLocaleString()}层/${((S.cumLv||0)+totalLv()).toLocaleString()}级</b><span style="color:#889">（含当世·转生定格入榜）</span></div>`
    +`<div>🗺️ <b>${Object.keys(S.kills).length}/500</b></div><div style="color:#f80">👹 <b>${diff().toFixed(1)}×</b></div>`;
}
function forgeRow(e, ref) {
  const ef = enhFullCost(e); const r = enhRate(e); const maxed = e.plus >= ENH_MAX;
  const qMaxed = e.rare >= maxRare();
  const qc = (!qMaxed && QUAL[e.rare]) ? QUAL[e.rare] : null;
  const uc = upgCfg(e);
  const ur = tierRate(e);
  const ra = refAttr(ref);
  const ic = EQIC[e.slot] || "⚔️";
  const upBlock = uc && !canWearAt(e, uc.to);
  let h = `<div class="row"><span class="name r${e.rare}">${ic} ${eqName(e)}</span>`
    +`<span class="info">【${RARE_NAMES[e.rare]}·Lv${e.reqLv}档】${eqValStr(e)}</span></div>`;
  h += `<div class="row" style="background:#1c2036;margin-left:14px">`
    +`<span class="info">🔨 强化 ${e.plus}/${ENH_MAX}：${maxed?"已满":`${matStr(ef.mats)}＋${ef.gold}💰｜${(r*100).toFixed(0)}%｜失败不掉级`}</span>`
    +`<button class="act sm" ${maxed||!canAfford(ef.mats,ef.gold)?"disabled":""} onclick="doEnh(${ra});renderPanel()">强化</button>`
    +`<span class="info">🏆 升阶：${qMaxed?(e.rare>=11?"混沌已是最高":`已达转生解锁上限【${RARE_NAMES[maxRare()]}】`):`${matStr(qc.mats)}＋${qc.gold}💰｜${(qualRate(e.rare)*100).toFixed(0)}%`}</span>`
    +`<button class="act sm" style="background:#a6f" ${qMaxed||!canAfford(qc.mats,qc.gold)?"disabled":""} onclick="upQuality(${ra})">升阶</button>`
    +`</div>`;
  h += `<div class="row" style="background:#1c2036;margin-left:14px">`
    +`<span class="info">⬆️ 装备升级：${uc?(upBlock?`❌ 下一档 Lv${uc.to} 需 ${e.slot==="weapon"?"单项战斗":"战斗均"}Lv≥${uc.to}（当前 ${tierWearLv(e)}），先练战斗技能`:`Lv${e.reqLv}→Lv${uc.to}档｜<b style="color:#f80">${(ur*100).toFixed(0)}%</b>｜${matStr(uc.mats)}＋${uc.gold}💰`):`已达 Lv${EQ_MAX_LV} 满档`}</span>`
    +`<button class="act sm" style="background:#2a5" ${!uc||upBlock||!canAfford(uc.mats,uc.gold)?"disabled":""} onclick="upTier(${ra})">升级</button>`
    +`</div>`;
  const holes = e.holes||0;
  const pc = punchCost(e);
  h += `<div class="row" style="background:#241a33;margin-left:14px;flex-direction:column;align-items:stretch">`
    +`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="info">💎 宝石孔 ${holes}/${EQ_HOLES_MAX}：</span>`;
  for (let i = 0; i < EQ_HOLES_MAX; i++) {
    const g = (e.gems||[])[i];
    if (i < holes) {
      if (g) h += `<span class="gemCell">${GEM_T[g.t].ic}${GEM_T[g.t].n}Lv${g.l}（+${gemVal(g.t,g.l)}${g.t==="critDmg"?"%":""}） <button class="act sm" style="background:#e55;padding:0 4px" onclick="unsocketGem(${ra},${i})">✕</button></span>`;
      else {
        const owned = Object.keys(S.bag).filter((id)=>/^gem_/.test(id));
        h += `<span class="gemCell" style="border-style:dashed;color:#889">孔${i+1}空 <select onchange="if(this.value)socketGem(${ra},${i},this.value)"><option value="">选择宝石…</option>${owned.map((id)=>`<option value="${id}">${IT[id].ic}${IT[id].n}×${bagN(id)}</option>`).join("")}</select></span>`;
      }
    } else h += `<span class="gemCell" style="border-color:#333;color:#555">🔒未打孔</span>`;
  }
  if (holes < EQ_HOLES_MAX) h += `<button class="act sm" style="background:#a6f" onclick="punchEq(${ra})">🔨打孔（${matStr(pc.mats)}＋${pc.gold.toLocaleString()}💰）</button>`;
  h += `</div></div>`;
  return h;
}
function batchPreview(pred) {
  let cnt = 0, gold = 0, maxTier = 0, legend = 0;
  const mats = {};
  bagEquips().forEach(({e})=>{
    if (e.lock) return;
    if (e.rare >= 3) { legend++; return; }
    if (pred(e)) { cnt++; gold += sellPriceEq(e); if (e.reqLv > maxTier) maxTier = e.reqLv; const {mat,n} = salvageGain(e); mats[mat] = (mats[mat]||0)+n; }
  });
  return { cnt, gold, maxTier, legend, mats };
}
function matsSummary(mats) { return Object.entries(mats).map(([k,v])=>`${IT[k].ic}${IT[k].n}×${v}`).join("＋") || "无"; }
function eqCraftUI() {
  const a = ACT.find((x)=>x.id===qSel);
  if (!a || !a.outEq) return "";
  const skillLv = lv(a.sk);
  const avail = LV_TIERS.filter((t)=>t <= Math.min(skillLv, CRAFT_TIER_CAP));
  if (!avail.length) return `<span class="info" style="color:#f66">${SKM[a.sk].n} Lv${skillLv} 不足以制造装备</span>`;
  const defTier = avail.includes(a.lv) ? a.lv : avail[avail.length-1];
  const slots = a.slots || SLOTS.map((s)=>s.id);
  return `<span class="info">档位</span> `
    +`<select id="eqTier">`+LV_TIERS.map((t)=>{
        const lock = t > Math.min(skillLv, CRAFT_TIER_CAP);
        return `<option value="${t}" ${t===defTier?"selected":""} ${lock?"disabled":""}>Lv${t}${t>CRAFT_TIER_CAP?"（仅无尽掉落）":lock?`（需Lv${t}🔒）`:(tierIdx(t)>0?`（材料×${1+tierIdx(t)*2}）`:"")}</option>`;
      }).join("")+`</select> `
    +`<span class="info">槽位</span> `
    +`<select id="eqSlot">${slots.map((s)=>`<option value="${s}">${EQIC[s]} ${SLOTS.find((x)=>x.id===s).n}</option>`).join("")}</select>`;
}
function cfgRow(label, key, lo, hi) {
  return `<div class="cfgRow"><span class="cName">${label}</span>`
    +`<input class="cIn" type="number" value="${cfg(key)}" min="${lo}" max="${hi}" onchange="setCfgNum('${key}', this.value, ${lo}, ${hi});">`
    +`<span class="cDesc">当前 ${cfg(key)}｜允许 ${lo}~${hi}</span></div>`;
}
function bagSearchHTML() {
  const q = bagSearch.trim().toLowerCase();
  if (!q) return "";
  let rows = "";
  for (const k in S.slotMap) {
    const v = S.slotMap[k];
    if (typeof v === "string") {
      if (IT[v] && (IT[v].n.toLowerCase().includes(q) || v.toLowerCase().includes(q))) {
        rows += `<div class="row srchRow"><span class="name">${IT[v].ic} ${IT[v].n} ×${bagN(v)}</span><span class="info">基准价${IT[v].val}｜位于第${(+k.split("_")[0])+1}页</span><button class="act sm" onclick="gotoPage(${+k.split("_")[0]});selSlot='${k}';renderPanel()">跳转</button></div>`;
      }
    } else {
      if (v.n.toLowerCase().includes(q)) {
        rows += `<div class="row srchRow"><span class="name r${v.rare}">${EQIC[v.slot]||"⚔️"} ${eqName(v)}</span><span class="info">【${RARE_NAMES[v.rare]}·Lv${v.reqLv}档】${eqValStr(v)}｜位于第${(+k.split("_")[0])+1}页${v.lock?"｜🔒已锁定":""}</span><button class="act sm" onclick="gotoPage(${+k.split("_")[0]});selSlot='${k}';renderPanel()">跳转</button></div>`;
      }
    }
  }
  return `<div id="bagSearchRes">${rows || `<div class="hint">🔍 未找到「${bagSearch}」相关物品</div>`}</div>`;
}
function renderBagSearchRes() {
  const box = $("bagSearchRes"); if (!box) return;
  const tmp = document.createElement("div");
  tmp.innerHTML = bagSearchHTML();
  box.replaceWith(tmp.firstElementChild ? tmp.firstElementChild : tmp);
}

/* 右键菜单 */
function openEqMenu(key, ev) {
  const v = S.slotMap[key];
  if (!v || typeof v !== "object") return;
  ev.preventDefault(); ev.stopPropagation();
  const e = v; const ra = e.uid;
  const ef = enhFullCost(e);
  const qMaxed = e.rare >= maxRare();
  const qc = (!qMaxed && QUAL[e.rare]) ? QUAL[e.rare] : null;
  const uc = upgCfg(e);
  const pc = punchCost(e);
  const okWear = canWear(e);
  let h = `<div style="padding:4px 6px;color:#ffd479;font-size:12px;font-weight:bold" class="r${e.rare}">${EQIC[e.slot]} ${eqName(e)}</div>`
    +`<div style="padding:0 6px 4px;color:#889;font-size:10px">【${RARE_NAMES[e.rare]}·Lv${e.reqLv}档】${eqValStr(e)}</div>`
    +`<button onclick="hideEqMenu();doEnh(${ra});renderPanel()" ${e.plus>=ENH_MAX||!canAfford(ef.mats,ef.gold)?"disabled":""}>🔨 强化（${e.plus>=ENH_MAX?"已满":(enhRate(e)*100).toFixed(0)+"%｜"+ef.gold+"💰"}）</button>`
    +`<button onclick="hideEqMenu();upQuality(${ra})" ${qMaxed||!qc||!canAfford(qc.mats,qc.gold)?"disabled":""}>🏆 升阶（${qMaxed?(e.rare>=11?"最高":"转生解锁上限"):(qualRate(e.rare)*100).toFixed(0)+"%｜"+qc.gold+"💰"}）</button>`
    +`<button onclick="hideEqMenu();upTier(${ra})" ${!uc||!canWearAt(e,uc.to)||!canAfford(uc.mats,uc.gold)?"disabled":""}>⬆️ 升级档位（${uc?(canWearAt(e,uc.to)?"→Lv"+uc.to+"｜"+(tierRate(e)*100).toFixed(0)+"%":"需"+(e.slot==="weapon"?"单项":"均")+"Lv"+uc.to+"🔒"):"已满档"}）</button>`
    +`<button onclick="hideEqMenu();punchEq(${ra})" ${(e.holes||0)>=EQ_HOLES_MAX||!canAfford(pc.mats,pc.gold)?"disabled":""}>🔨 打孔（${(e.holes||0)>=EQ_HOLES_MAX?"已满4孔":pc.gold.toLocaleString()+"💰"}）</button>`
    +(okWear?`<button onclick="hideEqMenu();equipIt(${ra})">⚔️ 穿戴</button>`:`<button disabled>⚔️ 穿戴（${wearNeedTxt(e)}）</button>`)
    +`<div class="sep"></div>`
    +`<button onclick="hideEqMenu();selSlot='${key}';renderPanel()" style="color:#5c5;border-color:#5c5">🎯 自动锻造设置（在下方详情行）</button>`
    +`<button onclick="hideEqMenu();toggleEqLock(${ra})" style="${e.lock?"color:#e55;border-color:#e55":"color:#8af;border-color:#8af"}">${e.lock?"🔓 解锁（恢复可出售/分解）":"🔒 锁定（防止出售/分解）"}</button>`;
  const menu = $("eqMenu");
  menu.innerHTML = h;
  menu.style.display = "block";
  menu.style.left = "0px"; menu.style.top = "0px";
  const r = menu.getBoundingClientRect();
  let x = ev.clientX+4, y = ev.clientY+4;
  if (x + r.width > window.innerWidth-8) x = window.innerWidth-8-r.width;
  if (y + r.height > window.innerHeight-8) y = window.innerHeight-8-r.height;
  menu.style.left = Math.max(4,x)+"px"; menu.style.top = Math.max(4,y)+"px";
}
function hideEqMenu() { const m = $("eqMenu"); if (m) m.style.display = "none"; }
document.addEventListener("click", () => { hideEqMenu(); });
document.addEventListener("contextmenu", (ev) => {
  const m = $("eqMenu");
  if (m && !m.contains(ev.target) && m.style.display === "block" && !(ev.target.closest && ev.target.closest(".cell"))) hideEqMenu();
});

