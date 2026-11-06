"use strict";
/* 面板渲染 */
function renderPanel() {
  const scr = IS_MOBILE ? $("panel").scrollTop : 0;
  buildTabs();
  if (tab >= TABS.length) tab = TABS.length-1;
  const T_ADMIN = TABS.indexOf("管理员"), T_CFG = TABS.indexOf("数值配置"), T_LB = TABS.indexOf("🏆 排行榜"), T_HELP = TABS.indexOf("帮助");
  $("tabs").innerHTML = TABS.map((t,i)=>`<button class="${i===tab?"active":""}" onclick="tab=${i};renderPanel();pmInitUid();pmFetch();pmFetchMine();lbFetch();fetchMyPnames()">${t}</button>`).join("");
  const el = $("panel");
  let h = "";
  if (tab === 0) {
    checkLanes();
    const tl = totalLv();
    h += `<div class="hint">⚡ 并行通道 <b style="color:#ffd479">${laneCount()}/${LANE_MAX}</b> 条｜解锁（总等级，转生不重置）：`
      +[1,2,3,4].map((i)=>` 通道${i+1}→Lv${LANE_LV[i]}${S.lanes[i].open?"✅":"🔒"}`).join("")+`</div>`;
    h += `<div class="row"><select onchange="qSel=this.value;renderPanel()" style="min-width:200px;flex:1">`
      +ACT.map((a)=>`<option value="${a.id}" ${a.id===qSel?"selected":""}>[${SKM[a.sk].n}·需Lv${a.lv}] ${a.n}（${a.t}s，${a.xp}xp）${lv(a.sk)<a.lv?"🔒":""}</option>`).join("")
      +`</select> <input type="number" value="${qNum}" min="1" onchange="qNum=Math.max(1,+this.value|0)">次 `
      +eqCraftUI()
      +` <span class="info">通道</span><select id="qLane">`
      +S.lanes.map((l,i)=>l.open?`<option value="${i}">通道${i+1}</option>`:"").join("")
      +`</select> <button class="act" onclick="addQ()">加入队列</button>`
      +` <button class="act" style="background:#49f" onclick="addQCombat()">⚔️ 战斗×N</button></div>`;
    S.lanes.forEach((lane, li) => {
      if (!lane.open) {
        h += `<div class="row" style="opacity:.55"><span class="name">🔒 通道 ${li+1}</span><span class="info">总等级 ${tl}/${LANE_LV[li]} 解锁</span></div>`;
        return;
      }
      const head = lane.items[0];
      const ha = head ? ACT.find((x)=>x.id===head.id) : null;
      const headTxt = lane.items.length ? (head.id==="combat"?"⚔️ 战斗进行中":`${ha?ha.n:"?"} 进度 ${Math.min(100,lane.prog/(ha?ha.t:1)*100|0)}%`) : "空闲";
      h += `<div class="row laneHead"><span class="name">▶ 通道 ${li+1}</span><span class="info">${headTxt}｜共 ${lane.items.length} 项</span></div>`;
      lane.items.forEach((q, i) => {
        const a = ACT.find((x)=>x.id===q.id);
        const cur = a ? a.id : "combat";
        const eqInfo = a && a.outEq ? `｜造 ${EQIC[q.slot||"weapon"]} Lv${q.tier||a.lv+10}档` : "";
        h += `<div class="row" style="margin-left:14px;background:#1c2036">`
          +`<span class="name">${i+1}.</span>`
          +`<select onchange="changeQ(${li},${i},this.value)" style="min-width:180px;flex:1">`
          +`<option value="combat" ${cur==="combat"?"selected":""}>⚔️ 战斗${S.endless?"（无尽）":""}</option>`
          +ACT.map((x)=>`<option value="${x.id}" ${cur===x.id?"selected":""}>[${SKM[x.sk].n}] ${x.n}</option>`).join("")
          +`</select><span class="info">剩 ${q.n}${eqInfo}${i===0&&a?`｜效率 ${(S.eff*100)|0}%`:""}</span>`
          +`<button class="act sm" onclick="moveQ(${li},${i},-1)" ${i===0?"disabled":""}>↑</button>`
          +`<button class="act sm" onclick="moveQ(${li},${i},1)" ${i===lane.items.length-1?"disabled":""}>↓</button>`
          +`<button class="act sm" style="background:#e55" onclick="S.lanes[${li}].items.splice(${i},1);renderPanel()">✕</button></div>`;
      });
    });
    if (!S.lanes.some((l)=>l.open&&l.items.length)) h += `<div class="info">所有通道均为空，从上方添加任务开始吧。</div>`;
    h += `<div class="hint">📌 每通道容量 ${QMAX()} 格｜战斗同一时间只能一场｜制造档位封顶Lv249（250+仅无尽掉落）</div>`;
    h += `<div class="row"><span class="name">条件触发</span><span class="info">HP&lt;</span> <input type="number" value="${S.autoHp}" onchange="S.autoHp=Math.min(90,Math.max(5,+this.value));saveGame()">% 自动吃食物｜MP&lt; <input type="number" value="${S.autoMp}" onchange="S.autoMp=Math.min(90,Math.max(5,+this.value));saveGame()">% 自动喝饮料</div>`;
  }
  else if (tab === 1) {
    h += `<div class="hint">17种技能。总等级 ${totalLv()}｜当前上限 <b style="color:#fa0">${effCap()}</b>（基础${cfg("skillCap")}＋转生${S.reb}×60）${S.xpMin>0?`｜📖 经验buff +${((S.xpMult||0)*100)|0}%（剩 ${Math.ceil(S.xpMin)} 分钟）`:""}。</div><table><tr><th>技能</th><th>等级</th><th>经验</th><th>进度</th></tr>`;
    SK.forEach((s)=>{ const x = S.skills[s.id]; const maxed = x.lv >= effCap();
      h += `<tr><td>${s.ic} ${s.n}<span class="info">（${s.cat}）</span></td><td><b>${x.lv}</b>${maxed?' <span style="color:#fa0;font-size:10px">MAX</span>':""}</td><td class="info">${maxed?"—":`${x.xp|0}/${xpNeed(x.lv)}`}</td><td><div class="bar" style="width:120px"><div class="xp" style="width:${maxed?100:x.xp/xpNeed(x.lv)*100}%"></div></div></td></tr>`; });
    h += `</table>`;
    h += `<div class="hint">单项战斗技能最高：<b style="color:#ffd479">Lv${maxCombatLv()}</b>（决定武器穿戴上限，当前可穿 Lv≤${maxCombatLv()} 武器）</div>`;
  }
  else if (tab === 2) {
    const nd = S.neidan, w = S.wing;
    const ndMax = nd.lv >= ND_MAX_LV;
    h += `<div class="hint">🧿 <b style="color:#c5f">内丹 · 万法增幅</b> —— 每级全属性 <b style="color:#fa0">+0.5%</b>（乘算面板，Lv100=+50%）｜<b style="color:#5c5">转生完整保留</b>｜🧿妖丹(怪5%/无尽5%)+1经验｜💊地灵丹(无尽1000层+3%)=10｜🏮天元丹(无尽2500层+2%/🔔50)=100｜丹药可在锻造页4合1/1拆4，可在🤝玩家市场交易</div>`;
    h += `<div class="row"><span class="name" style="color:#c5f">🧿 内丹 Lv.${nd.lv}${ndMax?' <span style="color:#fa0">MAX</span>':""}</span><span class="info">当前全属性加成 <b style="color:#fa0">+${(nd.lv*0.5).toFixed(1)}%</b>｜经验 ${ndMax?"—":(nd.xp|0)+"/"+ndXpNeed(nd.lv)}</span></div>`;
    if (!ndMax) h += `<div class="bar"><div class="xp" style="width:${Math.min(100,nd.xp/ndXpNeed(nd.lv)*100)}%"></div></div>`;
    h += `<div class="row"><span class="name">服用数量</span><input type="number" min="1" value="${ndQty}" onchange="ndQty=Math.max(1,+this.value|0)">`
      +`<button class="act sm" style="background:#5a5" ${(!ndMax&&bagN("yaoDan"))?"":"disabled"} onclick="usePill('yaoDan',ndQty)">🧿妖丹×${ndQty}（+${ndQty}经验）</button>`
      +`<button class="act sm" style="background:#5a5" ${(!ndMax&&bagN("diLingDan"))?"":"disabled"} onclick="usePill('diLingDan',ndQty)">💊地灵丹×${ndQty}（+${ndQty*10}经验）</button>`
      +`<button class="act sm" style="background:#5a5" ${(!ndMax&&bagN("tianYuanDan"))?"":"disabled"} onclick="usePill('tianYuanDan',ndQty)">🏮天元丹×${ndQty}（+${ndQty*100}经验）</button>`
      +`<span class="info">持有：🧿${bagN("yaoDan")}｜💊${bagN("diLingDan")}｜🏮${bagN("tianYuanDan")}${ndMax?"（已满级）":""}</span></div>`;
    h += `<div class="hint" style="margin-top:12px">🕊️ <b style="color:#8df">翅膀 · 战斗底座</b> —— 每阶全属性 <b style="color:#fa0">+5%</b>（乘算面板，12阶混沌之翼=+60%）｜<b style="color:#5c5">转生完整保留</b>｜🕊️羽翎（无尽300层+通关10%/🔔2/🤝玩家市场）＋金币，升阶100%成功</div>`;
    h += `<div class="row"><span class="name" style="color:#8df">${w.stage?"🕊️ "+WING_NAMES[w.stage-1]:"🕊️ 翅膀未觉醒"}</span><span class="info">当前全属性加成 <b style="color:#fa0">+${w.stage*5}%</b>${w.stage>=12?"｜已达最高阶":""}</span></div>`;
    if (w.stage < 12) {
      const need = WING_FEATHER[w.stage], gold = wingGold(w.stage);
      h += `<div class="row"><span class="info">升阶 →【${WING_NAMES[w.stage]}】：需 🕊️羽翎×${need}（现有${bagN("yuLing")}）＋${gold.toLocaleString()}💰（现有${Math.floor(S.gold).toLocaleString()}）</span>`
        +`<button class="act sm" style="background:#8df" ${(bagN("yuLing")>=need&&S.gold>=gold)?"":"disabled"} onclick="upWing()">⬆️ 升阶</button></div>`;
    }
    h += `<div class="hint">12阶一览：${WING_NAMES.map((n,i)=>`${n}+${(i+1)*5}%`).join(" → ")}｜当前修行总乘算：<b style="color:#fa0">×${((1+nd.lv*0.005)*(1+w.stage*0.05)).toFixed(2)}</b>（内丹×翅膀）</div>`;
  }
  else if (tab === 3) {
    const AT = S.autoTrash;
    h += `<div class="row" style="background:#1a2440;border:1px solid #4a9eff44">`
      +`<span class="name" style="color:#8af">⚡ 自动处理（掉落即执行，🔒锁定装备免疫）</span>`
      +`<select onchange="setAutoTrash('mode',+this.value)"><option value="0" ${AT.mode===0?"selected":""}>关闭</option><option value="1" ${AT.mode===1?"selected":""}>💰 自动出售</option><option value="2" ${AT.mode===2?"selected":""}>⚒️ 自动分解</option></select>`
      +`<span class="info">品质阈值：</span>`
      +`<select onchange="setAutoTrash('rare',+this.value)">${RARE_NAMES.map((n,i)=>`<option value="${i}" ${AT.rare===i?"selected":""}>${n}及以下</option>`).join("")}</select></div>`;
    h += `<div class="row"><span class="name">🔍 搜索背包</span><input id="bagSearchIn" style="flex:1" placeholder="输入物品或装备名称（支持模糊匹配）…" value="${bagSearch}" oninput="bagSearch=this.value;renderBagSearchRes()"><button class="act sm" style="background:#e55" onclick="bagSearch='';renderPanel()">清空</button></div>`;
    h += bagSearchHTML();
    h += `<div class="pagenav"><button class="act sm" onclick="gotoPage(bagPage-1)">◀ 上一页</button><span>第 <input type="number" min="1" max="${MAX_PAGES}" value="${bagPage+1}" onchange="gotoPage((+this.value|0)-1)"> / ${MAX_PAGES} 页</span><button class="act sm" onclick="gotoPage(bagPage+1)">下一页 ▶</button><span class="info">已用 ${usedSlots()} 格</span><button class="act sm" onclick="gotoFirstUsed()">跳首件</button><button class="act sm" onclick="gotoFreeSlot()">跳空格</button><button class="act sm" style="background:#a6f" onclick="compactBag()">🧹 整理</button></div>`;
    h += `<div class="hint">💡 <b style="color:#8af">装备格右键</b>（手机长按）= 锻造/穿戴/锁定/自动锻造快捷菜单｜<b style="color:#5c5">🎯自动锻造仅限背包装备</b>｜🌈神器+品质格子带极光呼吸</div>`;
    h += `<div class="baggrid">`;
    for (let c = 0; c < PAGE_SIZE; c++) {
      const k = bagPage+"_"+c; const v = S.slotMap[k];
      if (v == null) h += `<div class="cell" onclick="selSlot='${k}';renderPanel()"></div>`;
      else if (typeof v === "object") {
        const e = v; const rc = RARE_COLOR_ARR[e.rare] || "#888";
        const hiCls = e.rare >= 5 ? " hiRare" : "";
        h += `<div class="cell${hiCls} ${selSlot===k?"sel":""} ${e.lock?"locked":""}" onclick="selSlot='${k}';renderPanel()" oncontextmenu="openEqMenu('${k}',event)" title="${e.n} +${e.plus}【${RARE_NAMES[e.rare]}】${e.lock?"（已锁定）":""}" style="border-color:${rc}77"><span class="idx">${c+1}</span><span class="ic">${EQIC[e.slot]||"⚔️"}</span><span class="cnt" style="color:${rc}">${e.lock?"🔒":""}${e.auto&&e.auto.on?"🎯":""}+${e.plus}${gemCount(e)?"💎"+gemCount(e):""}</span></div>`;
      } else {
        const it = IT[v];
        if (!it) { h += `<div class="cell" onclick="delete S.slotMap['${k}'];renderPanel()" title="异常数据（点击清除）"><span class="idx">${c+1}</span><span class="ic">⚠️</span><span class="cnt" style="color:#f66">点我清</span></div>`; continue; }
        h += `<div class="cell ${selSlot===k?"sel":""}" onclick="selSlot='${k}';renderPanel()" title="${it.n}×${bagN(v)}"><span class="idx">${c+1}</span><span class="ic">${it.ic}</span><span class="cnt">${bagN(v)}</span></div>`;
      }
    }
    h += `</div>`;
    const selV = selSlot ? S.slotMap[selSlot] : null;
    if (selV && typeof selV === "object") {
      const e = selV; const ok = canWear(e); const ra = e.uid;
      h += `<div class="row"><span class="name r${e.rare}">${eqName(e)}</span><span class="info">【${RARE_NAMES[e.rare]}·Lv${e.reqLv}】${eqValStr(e)}｜宝石 ${(e.gems||[]).filter(Boolean).map((g)=>`${GEM_T[g.t].ic}Lv${g.l}`).join(" ")||"无"}/${e.holes||0}孔${e.lock?"｜<b style='color:#e55'>🔒已锁定</b>":""}</span>`
        +`<button class="act sm" ${ok?"":"disabled"} onclick="equipIt(${ra})">${ok?"穿戴":wearNeedTxt(e)}</button>`
        +`<button class="act sm" style="background:${e.lock?"#e55":"#8af"}" onclick="toggleEqLock(${ra})">${e.lock?"🔓解锁":"🔒锁定"}</button>`
        +`<button class="act sm" style="background:#da5" ${e.lock?"disabled":""} onclick="sellEq(${ra})">💰出售 ${sellPriceEq(e)}</button>`
        +`<button class="act sm" style="background:#7a6" ${e.lock?"disabled":""} onclick="salvageEq(${ra})">⚒️分解${e.rare>=3?"（升阶材料）":""}</button></div>`;
      h += autoForgeUI(e, e.uid);
    } else if (selV && IT[selV]) {
      const it = IT[selV]; const n = bagN(selV);
      h += `<div class="row"><span class="name">${it.ic} ${it.n} ×${n}</span><span class="info">${it.tp==="gem"?`宝石（镶嵌/合成请到锻造页）｜`:it.tp==="emat"?"无尽锻造材料（仅无尽掉落/牛铃商店）｜":it.tp==="gold"?"金币兑换物（仅无尽掉落，已从牛铃商店下架）｜":it.tp==="nd"?"内丹材料（修行页服用/锻造页互转）｜":it.tp==="wing"?"翅膀升阶材料（修行页）｜":""}基准价${it.val}</span>`
        +(it.heal?`<button class="act sm" onclick="eatItem('${selV}')">吃(+${it.heal}HP)</button>`:"")
        +(it.mp?`<button class="act sm" onclick="drinkItem('${selV}')">喝(+${it.mp}MP)</button>`:"")
        +(it.tp==="tea"?`<button class="act sm" onclick="if(take('${selV}',1)){S.teaMin=10;log('🫖 效率茶生效');renderPanel();}">喝(效率+10%)</button>`:"")
        +(it.tp==="xp"?`<button class="act sm" style="background:#5a5" onclick="useXpItem('${selV}')">喝(经验+${(XPIT[selV].m*100)|0}%/${XPIT[selV].mm}分)</button>`:"")
        +(POTBUFF[selV]?`<button class="act sm" style="background:#a6f" onclick="usePotItem('${selV}')">喝(${POTBUFF[selV].k==="hit"?"命中100%":POTBUFF[selV].k==="inv"?"无敌20分":"暴伤+10万%"}/${POTBUFF[selV].mm}分)</button>`:"")
        +(GOLD_REDEEM[selV]?`<span class="info">兑换数量</span><input type="number" min="1" max="${n}" value="${Math.min(xhQty,n)}" onchange="xhQty=Math.max(1,Math.min(${n},+this.value|0))" style="width:70px">`
          +`<button class="act sm" style="background:#da5" onclick="redeemGold('${selV}',xhQty)">💰兑换 ×${Math.min(xhQty,n)}（${(GOLD_REDEEM[selV]*Math.min(xhQty,n)/10000).toLocaleString()}万💰）</button>`
          +`<button class="act sm" style="background:#a85" onclick="redeemGold('${selV}',${n})">全部兑换 ×${n}</button>`:"")
        +`<button class="act sm" onclick="if(take('${selV}',1)){renderPanel();}">丢弃×1</button>`
        +`<button class="act sm" style="background:#e55" onclick="if(take('${selV}',${n})){renderPanel();}">清空</button></div>`;
    } else {
      h += `<div class="hint">点击格子选中物品/装备；<b style="color:#8af">装备格右键</b>打开快捷菜单。边框色：灰/绿/蓝/紫/橙/红/金/橙金/青/紫金/白/粉 = 普通→混沌；🎯=自动锻造中。💠星辉砂选中后可输入数量批量兑换金币（牛铃商店页也可批量兑换）。</div>`;
    }
    h += `<div class="hint" style="margin-top:10px">已穿戴（6槽位，手动锻造请到锻造页）：</div><div class="grid3">`;
    SLOTS.forEach((sl)=>{
      const e = S.eq[sl.id];
      h += `<div class="card"><b>${sl.ic} ${sl.n}</b><br>`+(e?`<span class="r${e.rare}">${eqName(e)}</span><br><span class="info">【${RARE_NAMES[e.rare]}·Lv${e.reqLv}】${eqValStr(e)}</span><br><button class="act sm" style="background:#e55" onclick="unequip('${sl.id}')">卸下</button>`:'<span class="info">空</span>')+`</div>`;
    });
    h += `</div>`;
    h += `<div class="hint" style="margin-top:8px">⚡ 批量操作（🔒锁定装备自动排除，传奇及以上分解返还升阶材料）：</div>`;
    h += `<div class="row" style="background:#1c2036">`;
    [0,1,2].forEach((r)=>{
      const pv = batchPreview((e)=>e.rare===r);
      h += `<button class="act sm" style="background:${["#666","#585","#58a"][r]}" ${pv.cnt?"":"disabled"} onclick="batchSellRare(${r})">💰出售${RARE_NAMES[r]} ${pv.cnt?`×${pv.cnt}`:"(无)"}</button>`;
      h += `<button class="act sm" style="background:${["#554","#464","#455"][r]}" ${pv.cnt?"":"disabled"} onclick="batchSalvageRare(${r})">⚒️分解${RARE_NAMES[r]} ${pv.cnt?`×${pv.cnt}`:"(无)"}</button>`;
    });
    h += `</div>`;
    h += `<div class="row" style="background:#1c2036">`;
    [3,4].forEach((r)=>{
      const cnt = bagEquips().filter((x)=>x.e.rare===r && !x.e.lock).length;
      h += `<button class="act sm" style="background:${["#545","#753"][r-3]}" ${cnt?"":"disabled"} onclick="batchSalvageHigh(${r})">⚒️分解${RARE_NAMES[r]} ${cnt?`×${cnt}`:"(无)"}</button>`;
    });
    h += `</div>`;
    h += `<div class="row" style="background:#1c2036">`;
    [5,6,7].forEach((r)=>{
      const cnt = bagEquips().filter((x)=>x.e.rare===r && !x.e.lock).length;
      h += `<button class="act sm" style="background:#733" ${cnt?"":"disabled"} onclick="batchSalvageHigh(${r})">⚒️分解${RARE_NAMES[r]} ${cnt?`×${cnt}`:"(无)"}</button>`;
    });
    h += `</div>`;
    h += `<div class="row" style="background:#1c2036">`;
    [8,9,10,11].forEach((r)=>{
      const cnt = bagEquips().filter((x)=>x.e.rare===r && !x.e.lock).length;
      h += `<button class="act sm" style="background:#733" ${cnt?"":"disabled"} onclick="batchSalvageHigh(${r})">⚒️分解${RARE_NAMES[r]} ${cnt?`×${cnt}`:"(无)"}</button>`;
    });
    h += `</div>`;
    h += `<div class="row" style="background:#1c2036">`;
    BATCH_TIERS.forEach((t)=>{
      const pv = batchPreview((e)=>e.reqLv <= t);
      h += `<button class="act sm" style="background:#a63" ${pv.cnt?"":"disabled"} onclick="batchSellTier(${t})">💰Lv≤${t} ${pv.cnt?`×${pv.cnt}`:"(无)"}</button>`;
      h += `<button class="act sm" style="background:#664" ${pv.cnt?"":"disabled"} onclick="batchSalvageTier(${t})">⚒️Lv≤${t} ${pv.cnt?`×${pv.cnt}`:"(无)"}</button>`;
    });
    h += `</div>`;
  }
  else if (tab === 4) {
    const m = curMon(); const p = P(); const D = diff();
    const cdm = p.critDmg + (S.buffCdMin > 0 ? S.buffCd : 0);
    const g = gemTotals();
    const dr = dmgReduce(p.def, m.atk);
    h += `<div class="row"><span class="name">战斗流派</span> `
      +["melee","ranged","magic"].map((s)=>`<button class="act sm" style="background:${S.style===s?"#2a5":"#555"}" onclick="S.style='${s}';renderPanel()"> ${ {melee:"⚔️近战",ranged:"🏹远程",magic:"🔮魔法"}[s] }</button>`).join("")
      +` <span class="info">命中 <b class="buffTxt">${S.buffHitMin>0?"100%（神水）":(hitRate(S.style==="melee"?p.acc:S.style==="ranged"?p.rng:p.mag, S.style==="melee"?m.evT:S.style==="ranged"?m.evR:m.evM)*100).toFixed(1)+"%"}</b></span>`
      +` <span style="color:#f80">👹 难度 ${D.toFixed(1)}×${S.reb?`｜转生增强 ×${rebCf().toFixed(2)}`:""}</span></div>`;
    h += `<div class="row endless"><span class="name" style="color:#c5f">🌌 无尽模式</span> `
      +(S.endless
        ?`<span style="color:#c5f;font-size:16px;font-weight:bold">当前第 ${S.floor} 层</span><span class="info">当世最高 <b style="color:#ffd479">${S.lifeBest||0}</b> 层｜历史纪录 <b style="color:#ffd479">${S.bestFloor}</b> 层</span>
<span class="timerTxt">⏱ ${Math.max(0,Math.ceil(floorLeftMs()/1000))}s / ${FLOOR_LIMIT/60}min</span><button class="act sm" style="background:#a4a" onclick="toggleEndless(false)">⏸ 退出无尽</button>`
        :`<button class="act sm" style="background:#a4a" onclick="toggleEndless(true)">▶ 进入无尽模式</button><span class="info">300层+羽翎｜1500层+新档装备/新品质/星辉砂/星髓｜每300层一档装备、每400层一档品质</span>`)
      +`</div>`;
    if (S.endless) {
      h += `<div class="bar timerbar"><div style="width:${Math.max(0,Math.min(100,floorLeftMs()/(FLOOR_LIMIT*1000)*100))}%"></div></div>`;
      h += `<div class="row endless" style="background:#241a3a">`
        +`<span class="info">⏩ 跳转楼层</span><input type="number" id="efloor" min="1" max="${Math.max(1,S.bestFloor)}" value="${S.floor}" style="width:70px">`
        +`<button class="act sm" style="background:#a4a" onclick="pickEndlessFloor(+$('efloor').value)">跳转</button>`
        +`<button class="act sm" style="background:${S.autoNext!==false?"#2a5":"#555"}" onclick="setAutoNext(true)">▶ 自动下一层</button>`
        +`<button class="act sm" style="background:${S.autoNext===false?"#d73":"#555"}" onclick="setAutoNext(false)">⏸ 停留本层</button>`
        +`<span class="info">本层通关 <b style="color:#ffd479">${S.floorKills[S.floor]||0}</b> 次</span></div>`;
      const drop = endlessMon(S.floor);
      const seg = Math.floor((S.floor-1)/100);
      const gemL = S.floor >= 1000 ? Math.min(GEM_DROP_CAP, 1+Math.floor((S.floor-1000)/50)) : 0;
      const fq = S.floor >= 1500 ? Math.min(11, 6 + Math.floor((S.floor-1500)/400)) : 0;
      const qTxt = fq ? `｜<b class="r${Math.min(fq,maxRare())}">${RARE_NAMES[Math.min(fq,maxRare())]}</b>2%` : "";
      const nmat = S.floor>=3300?"星髓/陨铁/龙筋/凤羽/道则/混沌晶":S.floor>=2900?"星髓/陨铁/龙筋/凤羽/道则":S.floor>=2500?"星髓/陨铁/龙筋/凤羽/天元丹":S.floor>=2100?"星髓/陨铁/龙筋":S.floor>=1800?"星髓/陨铁":S.floor>=1500?"星髓":S.floor>=1000?"地灵丹":"";
      const sand = S.floor>=1500?`｜💠星辉砂·${["","微","耀","炽","极"][S.floor>=3000?4:S.floor>=2500?3:S.floor>=2000?2:1]} 4%`:"";
      const goldCapped = drop.gold >= ENDLESS_GOLD_CAP;
      h += `<div class="row endless" style="opacity:.85"><span class="info">第 ${seg+1} 大关第 ${(S.floor-1)%100+1} 层｜掉率 <b style="color:#ffd479">${(drop.drop*100).toFixed(0)}%</b>｜档位 <b style="color:#ffd479">Lv${drop.eqLv}</b>｜💰<b style="color:${goldCapped?"#f80":"#ffd479"}">${drop.gold.toLocaleString()}${goldCapped?"（已封顶）":""}</b>/只${S.reb?`｜转生增强 ×${rebCf().toFixed(2)}`:""}｜🧿妖丹5%${S.floor>=300?"｜🕊️羽翎10%":""}${S.floor>=1000?"｜💊地灵丹3%":""}${S.floor>=2500?"｜🏮天元丹2%":""}${gemL?`｜💎宝石≤Lv${gemL} 4%`:S.floor>=1000?"｜💎宝石(封顶Lv25)":""}${qTxt}${nmat?`｜${nmat}`:""}${sand}</span></div>`;
    } else {
      h += `<div class="zonebar">`+ELE.map((e,z)=>`<button class="${z===zone?"on":""} ${z>=5?"hz":""}" onclick="zone=${z};renderPanel()">${z+1}.${e}</button>`).join("")+`</div>`;
      const zgem = zone >= 5 ? `｜💎宝石Lv${zoneGemLv(zone)}~${Math.min(11,zoneGemLv(zone)+2)}（5%）` : "";
      h += `<div class="hint" style="color:#f80">🔥 掉落：炼气Lv1档 → 真仙Lv249档（封顶不变）｜掉率递减：炼气38% → 真仙8%｜掉落强化封顶+15｜品质封顶<b>${RARE_NAMES[maxRare()]}</b>（转生解锁更高）｜🧿妖丹5%${zone===9?"（真仙×3）":""}${zgem}${S.reb?`｜<b>转生增强 ×${rebCf().toFixed(2)} 生效中</b>`:""}</div>`;
      for (let c = 0; c < 10; c++) {
        const i = zone*10+c;
        const b = mon(i,1); const m5 = mon(i,5); const cls = maxCleared(i);
        const gemInfo = zone >= 5 ? `｜💎Lv${zoneGemLv(zone)}~${Math.min(11,zoneGemLv(zone)+2)}（5%）` : "";
        h += `<div class="row"><span class="name">${b.ic} ${b.n} ${cls===5?"🏅":""}</span>`
          +`<span class="info">HP ${b.hp}~${m5.hp}｜攻 ${b.atk}~${m5.atk}｜掉率 <b style="color:#f80">${(b.drop*100).toFixed(1)}%</b>｜掉 <b style="color:#f80">Lv${b.eqLv}~${mon(Math.min(99,i+9),1).eqLv}档</b>${gemInfo}</span>`
          +`<span>${[1,2,3,4,5].map((l)=>{ const un = unlocked(i,l); const on = S.monI===i&&S.monLv===l; return `<button class="lvbtn ${on?"on":un?"":"lock"}" ${un?`onclick="pickMon(${i},${l})"`:"disabled"}> ${on?"▶":un?l:"🔒"}</button>`; }).join("")}</span></div>`;
      }
    }
    if (isDead()) {
      const left = deadLeftMs();
      h += `<div class="row" style="background:#1a2440;border:1px solid #4a9eff66"><span class="deadtag">💀 已被 ${m.n} 击倒，复活倒计时</span><span style="color:#8af;font-size:18px;font-weight:bold">${Math.ceil(left/1000)}s</span></div>`
        +`<div class="bar deadbar"><div style="width:${Math.max(0,(1-left/(RESPAWN_TIME*1000))*100)}%"></div></div>`;
    }
    if (S.buffInvMin > 0) h += `<div class="row" style="background:#152a35;border:1px solid #5cf"><span style="color:#5cf;font-weight:bold">🛉 无敌药水生效中！免疫所有怪物伤害</span><span style="color:#5cf;font-size:16px;font-weight:bold">剩 ${Math.ceil(S.buffInvMin)} 分钟</span></div>`;
    h += `<div class="hint">👾 目标：${m.ic} <b>${m.n}</b>｜HP ${Math.max(0,S.monHp|0)}/${m.hp}｜攻 ${m.atk}｜奖励 ${m.xp}xp+${m.gold}💰</div>`
      +`<div class="bar"><div style="width:${Math.max(0,S.monHp/m.hp*100)}%"></div></div>`
      +`<div class="hint">我的血量 ${Math.max(0,S.hp|0)}/${p.maxHp}｜法力 ${S.mp|0}/${p.maxMp}｜加速 ${S.speed}×</div>`
      +`<div class="bar"><div class="xp" style="width:${Math.min(100,S.hp/p.maxHp*100)}%"></div></div>`;
    h += `<div class="row" style="background:#1a2440;flex-direction:column;align-items:stretch"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><span class="info">🎯 我的属性：</span>`
      +`<span style="color:#ffd479;font-weight:bold">⚔近战命中 ${p.acc.toLocaleString()}</span>`
      +`<span style="color:#ffd479;font-weight:bold">💪近战伤害 ${p.pow.toLocaleString()}</span>`
      +`<span style="color:#ffd479;font-weight:bold">🏹远程命中 ${p.rng.toLocaleString()}</span>`
      +`<span style="color:#ffd479;font-weight:bold">🔮魔法命中 ${p.mag.toLocaleString()}</span>`
      +`<span style="color:#8af;font-weight:bold">🛡防御 ${p.def.toLocaleString()}</span>`
      +`<span style="color:#6af;font-weight:bold">❤血量上限 ${p.maxHp.toLocaleString()}</span></div>`
      +`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:4px"><span class="critTxt">💥暴击率 ${p.crit}%</span>`
      +`<span class="critTxt">🔥暴伤 ${cdm.toLocaleString()}%</span>`
      +`<span style="color:#6af">⚡攻速 +${p.aspd}%</span>`
      +`<span style="color:#5c5">🩸吸血 ${p.ls}%</span>`
      +`<span style="color:#8af;font-weight:bold">🛡当前减伤 ${(dr*100).toFixed(1)}%（vs该怪）</span>`
      +`<span class="info">🧿内丹×${p.ndMul.toFixed(2)}｜🕊️翅膀×${p.wgMul.toFixed(2)}</span>`
      +`<span class="${S.buffHitMin>0?"buffTxt":"info"}">🧪命中 ${S.buffHitMin>0?"100%（神水）":"正常"}</span></div></div>`
      +`<div class="hint">💎 宝石加成合计：⚔攻击+${g.atk}｜🛡防御+${g.def}｜❤血量+${g.hp}｜💥暴伤+${g.critDmg}%（已计入上方属性）｜装备提供：⚔攻击+${p.atkB}｜🛡防御+${p.defB}｜❤血量+${p.hpB}｜减伤公式：40%基础＋防御/(防御+怪攻)×45%，封顶85%</div>`;
    if (potSel != null && (potSel < 0 || potSel >= 5)) potSel = null;
    h += `<div class="hint" style="margin:6px 0 2px">🧪 消耗品（战斗中满足条件自动使用，点击格子设置）</div><div class="potGrid">`;
    S.pots.forEach((p2, i) => {
      const it = p2 && p2.id ? IT[p2.id] : null;
      const condTxt = it ? ({hp:"HP<",mp:"MP<",cd:"⏱"})[p2.cond]+(p2.cond==="cd"?(p2.val|0)+"s":(p2.val|0)+"%") : "";
      h += `<div class="potCell ${potSel===i?"sel":""} ${it?"":"empty"}" onclick="potSel=${potSel===i?"null":i};renderPanel()"><span class="ic">${it?it.ic:"⚙️"}</span><span class="cnt">${it?bagN(p2.id):"空"}</span><span class="cond">${condTxt||"点击设置"}</span></div>`;
    });
    h += `</div>`;
    if (potSel != null) {
      const cur = S.pots[potSel] || {id:"",cond:"hp",val:30};
      h += `<div class="row potRow"><span class="name">设置格${potSel+1}</span>`
        +`<select onchange="setPot(${potSel},'id',this.value)"><option value="">（空）</option>`+POT_ITEMS.map((id)=>`<option value="${id}" ${cur.id===id?"selected":""}>${IT[id].ic}${IT[id].n}</option>`).join("")+`</select>`
        +`<select onchange="setPot(${potSel},'cond',this.value)"><option value="hp" ${cur.cond==="hp"?"selected":""}>HP低于</option><option value="mp" ${cur.cond==="mp"?"selected":""}>MP低于</option><option value="cd" ${cur.cond==="cd"?"selected":""}>每N秒</option></select>`
        +`<input type="number" value="${cur.val|0}" min="1" onchange="setPot(${potSel},'val',+this.value)" style="width:55px">${cur.cond==="cd"?"秒":"%"}`
        +`<span class="info">${cur.id?`库存 ${bagN(cur.id)}`:"未放置物品"}</span>`
        +`<button class="act sm" style="background:#e55" onclick="S.pots[${potSel}]=null;saveGame();renderPanel()">清空</button>`
        +`<button class="act sm" style="background:#2a5" onclick="potSel=null;saveGame();renderPanel()">完成</button></div>`;
    }
  }
  else if (tab === 5) {
    h += `<div class="hint">拍卖行（NPC）｜<b style="color:#6f6">卖出价 = 买入价 × 80%</b>｜>49金收2%税｜💎宝石/✨无尽材料/💠星辉砂/🧿丹药/🕊️羽翎<b style="color:#f80">不出售</b>（仅掉落/🔔牛铃商店/🤝玩家市场｜💠星辉砂仅掉落+玩家市场）｜<b style="color:#8af">卖出数量上限 = 背包持有量</b></div>`;
    h += `<div class="row"><span class="name">📦 交易数量</span><input type="number" min="1" value="${mkQty}" onchange="mkQty=Math.max(1,+this.value|0)"> <span class="info">买入受市场库存限制；卖出受背包持有量限制（订单不足按兜底价成交）</span></div>`;
    h += `<table><tr><th>物品</th><th>基准价</th><th>市场库存</th><th>买入</th><th>卖出</th><th>背包</th></tr>`;
    for (const id in MK) {
      if (id === "token") continue;
      const m = MK[id];
      const rareTag = RARE_MATS[id] ? `<span class="r4" style="font-size:10px">稀</span>` : "";
      const potTag = POT_MK[id] ? `<span class="r5" style="font-size:10px">神</span>` : "";
      h += `<tr><td>${IT[id].ic} ${IT[id].n}${rareTag}${potTag}</td>`
        +`<td class="info">${Math.floor(m.mid)}💰</td>`
        +`<td class="info">${mkAvail(id)}</td>`
        +`<td>${m.sell[0]?`${m.sell[0].p}💰 <button class="act sm" onclick="mkBuy('${id}',mkQty)">×${mkQty}</button>`:"—"}</td>`
        +`<td>${m.buy[0]?`${m.buy[0].p}💰 <button class="act sm" onclick="mkSell('${id}',mkQty)">×${mkQty}</button>`:`<button class="act sm" onclick="mkSell('${id}',mkQty)">×${mkQty}（兜底价）</button>`}</td>`
        +`<td>${bagN(id)||0}</td></tr>`;
    }
    h += `</table>`;
    h += pmUI();
  }
  else if (tab === 6) {
    h += `<div class="hint">🔮 锻造坊｜强化技能 Lv${lv("enh")} +${(forgeBonus()*100).toFixed(0)}%｜<b style="color:#f80">全局锻造系数 ×${forgeCf().toFixed(1)}</b>｜强化+${ENH_MAX}｜品质上限<b style="color:#fa0">${RARE_NAMES[maxRare()]}</b>（转生解锁）｜背包装备可直接<b style="color:#8af">右键锻造</b>｜<b style="color:#5c5">🎯自动锻造仅限背包装备</b></div>`;
    h += `<div class="hint" style="margin-top:8px">—— 已穿戴装备（仅手动操作，🎯自动锻造请放背包中设置） ——</div>`;
    SLOTS.forEach((sl)=>{ const e = S.eq[sl.id]; if (e) h += forgeRow(e, "w:"+sl.id); });
    h += `<div class="hint" style="margin-top:14px;color:#a6f">━━━━━ 🔮 合成系统（批量，无弹窗；🔒锁定装备不参与）━━━━━</div>`;
    const groups = {};
    bagEquips().forEach(({e})=>{
      if (e.lock) return;
      const ti = tierIdx(e.reqLv);
      if (ti >= LV_TIERS.length-1) return;
      const k = e.fam+"|"+e.reqLv+"|"+e.rare;
      if (!groups[k]) groups[k] = [];
      groups[k].push(e);
    });
    const gList = Object.entries(groups).filter(([k,v])=>v.length>=4);
    h += `<div class="row" style="background:#241a33"><span class="name" style="color:#a6f">🗡️ 装备合成</span><span class="info">4件同品质+档次 → 1件下一档（可合成至Lv500）</span>`
      +`<select id="cmbEq" onchange="updCmbEqN()">${gList.length?gList.map(([k,v])=>{
        const [fam,req,rare] = k.split("|");
        return `<option value="${k}" data-n="${Math.floor(v.length/4)}">${RARE_NAMES[+rare]}·Lv${req}档 ×${v.length}（→Lv${LV_TIERS[tierIdx(+req)+1]}）</option>`;
      }).join(""):`<option value="">（没有可合成的装备组合）</option>`}</select>`
      +`<span class="info">数量</span><input type="number" id="cmbEqN" min="1" value="${gList.length?Math.floor(gList[0][1].length/4):1}" style="width:60px">`
      +`<button class="act sm" style="background:#a6f" ${gList.length?"":"disabled"} onclick="combineEquip($('cmbEq').value, +($('cmbEqN').value||1))">合成</button></div>`;
    const gems = Object.keys(S.bag).filter((id)=>/^gem_/.test(id) && bagN(id) >= 4 && +id.split("_")[2] < GEM_MAX);
    const gemsAll = Object.keys(S.bag).filter((id)=>/^gem_/.test(id)).sort((a,b)=>+a.split("_")[2]-+b.split("_")[2]);
    h += `<div class="row" style="background:#241a33"><span class="name" style="color:#a6f">💎 宝石合成</span><span class="info">4颗同类同级 → 1颗下一级（上限Lv${GEM_MAX}；<b style="color:#f80">Lv26+只能合成，无尽掉落封顶Lv25</b>）</span>`
      +`<select id="cmbGem" onchange="updCmbGemN()">${gems.length?gems.map((id)=>{
        const m = id.match(/^gem_(\w+)_(\d+)$/);
        return `<option value="${id}" data-n="${Math.floor(bagN(id)/4)}">${IT[id].ic}${IT[id].n}×${bagN(id)}（→Lv${+m[2]+1} +${gemVal(m[1],+m[2]+1)}${m[1]==="critDmg"?"%":""}）</option>`;
      }).join(""):`<option value="">（没有≥4颗的同种宝石）</option>`}</select>`
      +`<span class="info">数量</span><input type="number" id="cmbGemN" min="1" value="${gems.length?Math.floor(bagN(gems[0])/4):1}" style="width:60px">`
      +`<button class="act sm" style="background:#a6f" ${gems.length?"":"disabled"} onclick="combineGem($('cmbGem').value, +($('cmbGemN').value||1))">合成</button>`
      +(gemsAll.length?`<div style="width:100%;margin-top:3px" class="info">持有：${gemsAll.map((id)=>`${IT[id].ic}${id.split("_")[2]}×${bagN(id)}`).join("、")}</div>`:"<div style='width:100%;margin-top:3px' class='info'>尚未持有宝石（炼虚+或无尽1000层+掉落，上限Lv25）</div>")
      +`</div>`;
    const mUp = Object.keys(MAT_NEXT).filter((id)=>bagN(id) >= 4);
    h += `<div class="row" style="background:#241a33"><span class="name" style="color:#a6f">🧪 材料合成</span><span class="info">4个低阶 → 1个高阶（星髓链/仙骨链/星辉砂链/丹药链）</span>`
      +`<select id="cmbMat">${mUp.length?mUp.map((id)=>`<option value="${id}" data-n="${Math.floor(bagN(id)/4)}">${IT[id].ic}${IT[id].n}×${bagN(id)}（→${IT[MAT_NEXT[id]].ic}${IT[MAT_NEXT[id]].n}）</option>`).join(""):`<option value="">（没有≥4个的可合成材料）</option>`}</select>`
      +`<span class="info">数量</span><input type="number" id="cmbMatN" min="1" value="${mUp.length?Math.floor(bagN(mUp[0])/4):1}" style="width:60px">`
      +`<button class="act sm" style="background:#a6f" ${mUp.length?"":"disabled"} onclick="combineMat($('cmbMat').value, +($('cmbMatN').value||1))">合成</button></div>`;
    const mDn = Object.keys(MAT_PREV).filter((id)=>bagN(id) >= 1);
    h += `<div class="row" style="background:#241a33"><span class="name" style="color:#a6f">🧪 材料分解</span><span class="info">1个高阶 → 4个低阶</span>`
      +`<select id="splMat">${mDn.length?mDn.map((id)=>`<option value="${id}">${IT[id].ic}${IT[id].n}×${bagN(id)}（→${IT[MAT_PREV[id]].ic}${IT[MAT_PREV[id]].n}×4）</option>`).join(""):`<option value="">（没有可分解的高阶材料）</option>`}</select>`
      +`<span class="info">数量</span><input type="number" id="splMatN" min="1" value="1" style="width:60px">`
      +`<button class="act sm" style="background:#a6f" ${mDn.length?"":"disabled"} onclick="splitMat($('splMat').value, +($('splMatN').value||1))">分解</button></div>`;
    h += `<div class="hint">🔨 打孔锥持有：${bagN("punch")} 个（无尽500层+掉落）｜打孔费用：10万/40万/90万/160万💰</div>`;
    h += `<div class="hint" style="color:#5cf">✨ 无尽新材料持有：星髓${bagN("xingSui")}｜陨铁${bagN("yunTie")}｜龙筋${bagN("longJin")}｜凤羽${bagN("fengYu")}｜道则${bagN("daoZe")}｜混沌晶${bagN("hunDunJing")}｜🧿妖丹${bagN("yaoDan")}｜💊地灵丹${bagN("diLingDan")}｜🏮天元丹${bagN("tianYuanDan")}｜🕊️羽翎${bagN("yuLing")}</div>`;
  }
  else if (tab === 7) {
    SK.filter((s)=>s.cat!=="战斗").forEach((s)=>{
      const hvl = S.houses[s.id]||0; const c = houseCost(s.id);
      h += `<div class="row"><span class="name">${s.ic} ${s.n}房屋 Lv.${hvl}</span><span class="info">费用${c}💰</span><button class="act sm" ${S.gold<c?"disabled":""} onclick="upHouse('${s.id}');renderPanel()">建造</button></div>`;
    });
  }
  else if (tab === 8) {
    h += `<div class="row"><span class="name">🎖️ 任务徽章 +${S.badge}/9</span> <button class="act sm" onclick="upBadge();renderPanel()">升级</button> <button class="act sm" onclick="refreshTasks(false);renderPanel()">刷新任务板</button></div>`;
    S.tasks.forEach((t,i)=>{
      const it = IT[t.id]; if (!it) return;
      h += `<div class="row"><span class="name">${it.ic} 上交 ${it.n}×${t.qty}</span><span class="info">奖 ${t.gold}💰 +${t.token}🪙${t.box?" +🎁":""}｜库存${bagN(t.id)}/${t.qty}</span><button class="act sm" onclick="doTask(${i});renderPanel()">完成</button></div>`;
    });
    if (!S.tasks.length) refreshTasks(true);
  }
  else if (tab === 9) {
    const armed = Date.now() - rebirthArm < 5000;
    h += `<div class="row"><span class="name">当前：${S.reb}转｜${S.sp}技能点</span><span class="info">${canRebirth()?"✅ 可转生":"❌ 需任一技能100级"}｜技能上限 <b style="color:#fa0">${effCap()}</b>（每转+60）｜品质解锁 <b style="color:#fa0">${RARE_NAMES[maxRare()]}</b>（每转+1档）｜<b style="color:#c5f">怪物属性 ×${rebCf().toFixed(2)}</b>→转后×${Math.pow(1+cfg("rebMonCf"), S.reb+1).toFixed(2)}</span></div>`;
    h += `<div class="row"><span class="name" style="color:#ffd479">🏆 转生时将定格计入榜单：本次 +${S.lifeBest||0}层 / +${totalLv()}级 → 终身累计 🌌${((S.cumFloor||0)+(S.lifeBest||0)).toLocaleString()}层 / ⭐${((S.cumLv||0)+totalLv()).toLocaleString()}级</span></div>`;
    h += `<div class="row"><span class="name" style="color:#5c5">🧿 内丹 Lv.${S.neidan.lv}（+${(S.neidan.lv*0.5).toFixed(1)}%）与 🕊️ ${S.wing.stage?WING_NAMES[S.wing.stage-1]:"未觉醒"}（+${S.wing.stage*5}%）将完整保留${S.spd10?'｜⏩ 10×加速解锁保留':""}</span></div>`;
    h += `<div class="row" style="justify-content:center;padding:12px;flex-direction:column;gap:8px">`
      +`<button class="act rebBtn" style="background:${armed?"#e55":"#2a5"}" ${canRebirth()&&S.reb<7?"":"disabled"} onclick="askRebirth()">${armed?"⚠️ 确认转生（5秒内再点一次）":"🌀 转生"}</button>`
      +`<span class="info">${armed?'<b style="color:#f80">再次点击红色按钮执行转生</b>':"点击后需5秒内二次确认，防误触（手机通用）"}</span></div>`;
    h += `<div class="hint">⚠️ 转生会：重置技能/装备/房屋/怪物解锁；怪物属性增强；<b style="color:#fa0">但获得：等级上限+60、解锁下一品质、技能点，且🧿内丹、🕊️翅膀、⏩10×加速解锁完整保留，当期层数/等级永久累计进排行榜</b>。7转后：上限${cfg("skillCap")+420}、品质全解锁（混沌）。</div>`;
  }
  else if (tab === 10) {
    h += `<div class="hint">🔔 牛铃商店｜当前牛铃：<b style="color:#ffd479">${S.bell}</b>｜✨无尽材料/🧿丹药/🕊️羽翎<b>常年大量供应</b>｜💠星辉砂已下架（仅无尽1500层+掉落，页内可输入数量批量兑换金币）</div>`;
    h += `<div class="row" style="background:#2a1535;border:1px solid #c5f5;flex-direction:column;align-items:stretch">`
      +`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">`
      +`<span class="name" style="color:#c5f">🔁 金币兑换牛铃（1亿💰 = 1🔔）</span>`
      +`<span class="info">数量</span><input type="number" min="1" value="${gbQty}" onchange="gbQty=Math.max(1,Math.floor(+this.value|0))" style="width:70px">🔔`
      +`<button class="act sm" style="background:#c5f" onclick="goldToBell(gbQty)">🔁 兑换（花 ${(GOLD_PER_BELL*gbQty).toLocaleString()}💰）</button>`
      +`<button class="act sm" style="background:#49f" onclick="gbQty=Math.floor(S.gold/${GOLD_PER_BELL});renderPanel()">按持有金币算满</button>`
      +`<span class="info">当前金币 ${Math.floor(S.gold).toLocaleString()}💰（可兑 ${Math.floor(S.gold/GOLD_PER_BELL)}🔔）</span>`
      +`</div>`
      +`<div class="info" style="margin-top:3px">无尽挂机刷金币 → 兑换牛铃 → 买无尽材料/神水，形成完整循环</div></div>`;
    h += `<div class="row" style="background:#2a2413;border:1px solid #ffd47955;flex-direction:column;align-items:stretch">`
      +`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">`
      +`<span class="name">⏩ 10× 加速解锁</span>`
      +`<span class="info">${S.spd10?'<b style="color:#6f6">✅ 已解锁（本存档槽永久有效，转生保留）</b>':`未解锁｜价格 <b style="color:#fa0">${SPD10_COST}🔔</b>｜解锁后10×加速永久可用`}</span>`
      +`<button class="act sm" style="background:#a6f" ${S.spd10?"disabled":""} onclick="buySpd10()">${S.spd10?"已解锁":"🔓 解锁10×加速"}</button>`
      +`</div>`
      +`<div class="info" style="margin-top:3px">1×/3×/5×免费｜解锁保存在当前存档槽${curSlot}（随云存档同步）｜离线收益不受加速影响（按真实时间结算）</div></div>`;
    h += `<div class="row"><span class="name">📦 材料购买数量</span><input type="number" min="1" value="${bellQty}" onchange="bellQty=Math.max(1,+this.value|0)"> <span class="info">对下方全部材料/丹药/羽翎生效</span></div>`;
    h += `<div class="row" style="background:#2a2413"><span class="name">💣 弑神狂暴水（暴伤+10万% / 20分钟）</span><span class="info">100🔔</span><button class="act sm" style="background:#a6f" onclick="buyBell('critPot',100,1)">购买</button></div>`;
    h += `<div class="row" style="background:#2a2413"><span class="name">🛉 无敌药水（免疫怪物伤害 / 20分钟｜<b style="color:#f80">唯一获取途径</b>）</span><span class="info">100🔔</span><button class="act sm" style="background:#5cf" onclick="buyBell('invPot',100,1)">购买</button></div>`;
    h += `<div class="hint" style="color:#5cf;margin-top:6px">━━━━━ 🧿 内丹丹药 ━━━━━</div>`;
    h += `<div class="row" style="background:#152035"><span class="name">🧿 妖丹（内丹+1经验/颗）</span><span class="info">2🔔｜持有${bagN("yaoDan")}</span><button class="act sm" style="background:#49f" onclick="buyBell('yaoDan',2,bellQty)">×${bellQty} 购买</button></div>`;
    h += `<div class="row" style="background:#152035"><span class="name">💊 地灵丹（内丹+10经验/颗）</span><span class="info">10🔔｜持有${bagN("diLingDan")}</span><button class="act sm" style="background:#49f" onclick="buyBell('diLingDan',10,bellQty)">×${bellQty} 购买</button></div>`;
    h += `<div class="row" style="background:#152035"><span class="name">🏮 天元丹（内丹+100经验/颗）</span><span class="info">50🔔｜持有${bagN("tianYuanDan")}</span><button class="act sm" style="background:#49f" onclick="buyBell('tianYuanDan',50,bellQty)">×${bellQty} 购买</button></div>`;
    h += `<div class="row" style="background:#152035"><span class="name">🕊️ 羽翎（翅膀升阶材料）</span><span class="info">2🔔｜持有${bagN("yuLing")}</span><button class="act sm" style="background:#49f" onclick="buyBell('yuLing',2,bellQty)">×${bellQty} 购买</button></div>`;
    h += `<div class="hint" style="color:#5cf;margin-top:6px">━━━━━ ✨ 无尽锻造材料（大量供应）━━━━━</div>`;
    h += `<div class="row" style="background:#152035"><span class="name">✨ 星髓（Lv275~325档升级）</span><span class="info">5🔔/个｜持有${bagN("xingSui")}</span><button class="act sm" style="background:#49f" onclick="buyBell('xingSui',5,bellQty)">×${bellQty} 购买</button></div>`;
    h += `<div class="row" style="background:#152035"><span class="name">🌠 陨铁（Lv350~400档升级）</span><span class="info">8🔔/个｜持有${bagN("yunTie")}</span><button class="act sm" style="background:#49f" onclick="buyBell('yunTie',8,bellQty)">×${bellQty} 购买</button></div>`;
    h += `<div class="row" style="background:#152035"><span class="name">🐲 龙筋（神器→太初升阶）</span><span class="info">15🔔/个｜持有${bagN("longJin")}</span><button class="act sm" style="background:#49f" onclick="buyBell('longJin',15,bellQty)">×${bellQty} 购买</button></div>`;
    h += `<div class="row" style="background:#152035"><span class="name">🪶 凤羽（鸿蒙→无极升阶）</span><span class="info">25🔔/个｜持有${bagN("fengYu")}</span><button class="act sm" style="background:#49f" onclick="buyBell('fengYu',25,bellQty)">×${bellQty} 购买</button></div>`;
    h += `<div class="row" style="background:#152035"><span class="name">📜 道则碎片（无极→天道升阶/Lv425+档）</span><span class="info">40🔔/个｜持有${bagN("daoZe")}</span><button class="act sm" style="background:#49f" onclick="buyBell('daoZe',40,bellQty)">×${bellQty} 购买</button></div>`;
    h += `<div class="row" style="background:#152035"><span class="name">🔮 混沌晶（天道→混沌升阶/Lv500档）</span><span class="info">70🔔/个｜持有${bagN("hunDunJing")}</span><button class="act sm" style="background:#49f" onclick="buyBell('hunDunJing',70,bellQty)">×${bellQty} 购买</button></div>`;
    h += `<div class="hint" style="color:#da5;margin-top:6px">━━━━━ 💠 星辉砂（v1.21.9起商店不再出售，可批量兑换金币）━━━━━</div>`;
    h += `<div class="row" style="background:#2a2013"><span class="name">💠 兑换数量</span><input type="number" min="1" value="${xhQty}" onchange="xhQty=Math.max(1,+this.value|0)" style="width:70px">`
      +`<span class="info">个｜对下方四种星辉砂生效｜数量超出持有量时自动按全部兑换｜仅无尽1500层+掉落（4%）获取｜🤝玩家市场可交易</span></div>`;
    ["xingHui1","xingHui2","xingHui3","xingHui4"].forEach((sid)=>{
      const have = bagN(sid);
      h += `<div class="row" style="background:#2a2013"><span class="name">${IT[sid].ic} ${IT[sid].n}</span>`
        +`<span class="info">持有 ${have} 个｜单价 ${(GOLD_REDEEM[sid]/10000).toLocaleString()}万💰</span>`
        +`<button class="act sm" style="background:#da5" ${have?"":"disabled"} onclick="redeemGold('${sid}',xhQty)">💰兑换 ×${Math.min(xhQty,have)}</button>`
        +`<button class="act sm" style="background:#a85" ${have?"":"disabled"} onclick="redeemGold('${sid}',${have})">全部兑换 ×${have}</button></div>`;
    });
    h += `<div class="hint" style="margin-top:6px">━━━━━ 🛒 其他 ━━━━━</div>`;
    h += `<div class="row"><span class="name">📦 队列位+1（每条并行通道各+1）</span><span class="info">10🔔</span><button class="act sm" onclick="buyPerk('q',10)">购买</button></div>`
      +`<div class="row"><span class="name">🌙 离线上限+2小时</span><span class="info">20🔔</span><button class="act sm" onclick="buyPerk('off',20)">购买</button></div>`;
  }
  else if (tab === 11) {
    const A = accs();
    h += `<div class="row pnRow" style="flex-direction:column;align-items:stretch">`
      +`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">`
      +`<span class="name">🪪 玩家名字</span>`
      +`<span class="info">槽1：<b style="color:#ffd479">${MY_PN[1]||"未设置"}</b>｜槽2：<b style="color:#ffd479">${MY_PN[2]||"未设置"}</b>｜槽3：<b style="color:#ffd479">${MY_PN[3]||"未设置"}</b></span>`
      +`</div>`
      +`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px">`
      +`<span class="info">✏️ 修改<b>当前槽${curSlot}</b>的名字：</span><input id="pnNew" placeholder="新名字（2~10字符，全服唯一）" maxlength="10" style="min-width:150px">`
      +`<button class="act sm" style="background:#a6f" ${CUR==="guest"?"disabled":""} onclick="doRename()">确认修改</button>`
      +`</div>`
      +`<div class="info" style="margin-top:3px">排行榜与玩家市场显示玩家名字｜每个存档槽独立命名（互不相同的名字）｜<b style="color:#f80">每天每槽限改1次</b>（服务端强制）｜游客不可设置${CUR==="guest"?"（当前为游客模式）":""}</div></div>`;
    h += `<div class="hint">当前账号：<b style="color:#ffd479">${CUR==="guest"?"游客":CUR}</b>（存档槽 <b style="color:#8af">${curSlot}</b>/3）${isAdmin()?' <span class="adminTag">👑管理员</span>':""}｜云端：<b class="${CLOUD_ON()?"cloudOk":"cloudNo"}">${CLOUD_ON()?"已连接":"未连接"}</b>｜<b style="color:#8af">单点登录：同账号他处登录时本机自动下线</b>｜🤝玩家市场/🏆排行榜需注册账号</div>`
      +`<div class="row"><span class="name">📂 重新选择存档槽（含🗑️删除存档）</span><button class="act sm" style="background:#8af" onclick="saveGame();showSlotPicker()">打开存档选择页</button></div>`
      +`<div class="row"><span class="name">☁️ 立即同步云端（当前槽）</span><button class="act sm" ${CUR==="guest"||!CLOUD_ON()?"disabled":""} onclick="cloudSave()">上传</button></div>`
      +`<div class="row"><span class="name">🤝 立即领取市场收益</span><button class="act sm" style="background:#5cf" ${CUR==="guest"||!CLOUD_ON()?"disabled":""} onclick="claimMarket()">领取</button></div>`
      +`<div class="row"><span class="name">🔧 手动净化存档</span><button class="act sm" style="background:#a6f" onclick="sanitizeSave();migrateBag();saveGame();renderPanel()">立即执行</button></div>`
      +`<div class="row"><span class="name">🚪 退出并切换账号</span><button class="act sm" onclick="logout()">退出登录</button></div>`
      +`<div class="row"><span class="name">💾 导出存档（当前槽）</span><button class="act sm" onclick="exportSave()">导出</button></div>`
      +`<div class="row"><span class="name">📂 导入存档</span><button class="act sm" style="background:#a6f" onclick="document.getElementById('saveFile').click()">导入</button></div>`;
    Object.keys(A).forEach((u)=>{
      h += `<div class="row"><span class="name">${u}${(u===CUR&&isAdmin())?' <span class="adminTag">👑</span>':""}</span><span class="info">${new Date(A[u].created).toLocaleDateString()}${u===CUR?"｜✅ 当前":""}</span>`
        +(u===CUR?"":`<button class="act sm" onclick="switchAcc('${u}')">切换</button>`)
        +`<button class="act sm" style="background:#e55" onclick="delAcc('${u}')">删除</button></div>`;
    });
  }
  else if (tab === T_ADMIN && isAdmin()) {
    h += `<div class="hint">👑 管理员面板（仅管理员可见）｜当前存档槽 ${curSlot}</div>`
      +`<div class="row"><span class="name">💰 金币</span><input type="number" value="${S.gold|0}" onchange="S.gold=Math.max(0,+this.value);saveGame()"> <span class="name">🔔 牛铃</span><input type="number" value="${S.bell}" onchange="S.bell=Math.max(0,+this.value);saveGame()"> <span class="name">⏩ 加速</span><select onchange="setSpd(+this.value)">`+SPEEDS.map((v)=>`<option value="${v}" ${S.speed===v?"selected":""}>${v}×</option>`).join("")+`</select></div>`;
    h += `<div class="row"><span class="name">🧿 内丹等级</span><input type="number" min="0" max="${ND_MAX_LV}" value="${S.neidan.lv}" onchange="S.neidan.lv=Math.min(${ND_MAX_LV},Math.max(0,+this.value|0));S.neidan.xp=0;saveGame();renderTop();renderPanel()"> <span class="name">🕊️ 翅膀阶数</span><input type="number" min="0" max="12" value="${S.wing.stage}" onchange="S.wing.stage=Math.min(12,Math.max(0,+this.value|0));saveGame();renderTop();renderPanel()"> <span class="info">当前：内丹+${(S.neidan.lv*0.5).toFixed(1)}%｜翅膀+${S.wing.stage*5}%</span></div>`;
    h += `<div class="row"><span class="name">🏆 累计成绩</span><span class="info">🌌累计无尽层数</span><input type="number" min="0" value="${S.cumFloor||0}" onchange="S.cumFloor=Math.max(0,+this.value|0);saveGame();renderTop();renderPanel()"> <span class="info">⭐累计总等级</span><input type="number" min="0" value="${S.cumLv||0}" onchange="S.cumLv=Math.max(0,+this.value|0);saveGame();renderTop();renderPanel()"> <span class="info">当世最高层</span><input type="number" min="0" value="${S.lifeBest||0}" onchange="S.lifeBest=Math.max(0,+this.value|0);saveGame();renderTop();renderPanel()"> <span class="info">排行榜数据（转生时定格累加）</span></div>`;
    h += `<div class="hint" style="color:#5cf;margin-top:8px">━━━━━ 💰 账号充值 / 装备发放（写入云端槽1，对方强制下线重登生效）━━━━━</div>`
      +`<div class="row" style="background:#152035;border:1px solid #5cf"><span class="name" style="color:#5cf">👤 目标账号</span>`
      +`<input id="adAcc" placeholder="账号名" style="min-width:120px" onchange="adQueryAcc()">`
      +`<button class="act sm" style="background:#49f" onclick="adQueryAcc()">查询</button>`
      +`<span class="info" id="adAccInfo">（输入账号名后点查询）</span></div>`;
    if (AD_ACC) {
      h += `<div class="row" style="background:#1c2036;margin-left:14px">`
        +`<span class="name">💰 金币充值</span><input type="number" id="adGold" value="1000000" min="1" style="width:110px"><button class="act sm" style="background:#da5" onclick="adCharge('gold')">充值</button>`
        +`<span class="name">🔔 牛铃充值</span><input type="number" id="adBell" value="100" min="1" style="width:70px"><button class="act sm" style="background:#a6f" onclick="adCharge('bell')">充值</button></div>`;
      h += `<div class="row" style="background:#1c2036;margin-left:14px;flex-direction:column;align-items:stretch">`
        +`<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">`
        +`<span class="name">🎁 装备发放（槽1）</span>`
        +`<select id="adGFam">${Object.keys(EQFAM).map((f)=>`<option value="${f}">${EQFAM[f].n}</option>`).join("")}</select>`
        +`<select id="adGSlot">${SLOTS.map((s)=>`<option value="${s.id}">${s.ic}${s.n}</option>`).join("")}</select>`
        +`<select id="adGTier">${LV_TIERS.map((t)=>`<option value="${t}" ${t===249?"selected":""}>Lv${t}档</option>`).join("")}</select>`
        +`<select id="adGRare">${RARE_NAMES.map((n,i)=>`<option value="${i}" ${i===5?"selected":""}>${n}</option>`).join("")}</select>`
        +`<span class="info">强化+</span><input type="number" id="adGPlus" value="20" min="0" max="${ENH_MAX}" style="width:50px">`
        +`<span class="info">孔数</span><input type="number" id="adGHoles" value="4" min="0" max="4" style="width:44px">`
        +`<select id="adGGem"><option value="">宝石：无</option>${Object.keys(GEM_T).map((t)=>`<option value="${t}">镶满${GEM_T[t].n}Lv${GEM_MAX}</option>`).join("")}</select>`
        +`<button class="act sm" style="background:#2a5" onclick="adGrantEq()">发放</button>`
        +`</div>`
        +`<div class="info" style="margin-top:3px">品质为固定值（不受目标账号转生解锁限制），发放后直接进入对方存档槽1的背包</div></div>`;
    }
    h += `<div class="hint" style="color:#f88;margin-top:8px">━━━━━ ⏪ 账号回档（恢复到约一天前，含全部存档槽）━━━━━</div>`
      +`<div class="row" style="background:#2a1515;border:1px solid #e55"><span class="name" style="color:#f88">⏪ 指定账号回档</span>`
      +`<input id="rbUser" placeholder="账号名" value="${RB?RB.name:''}" style="min-width:120px">`
      +`<button class="act sm" style="background:#e55" onclick="queryBackup()">查询回档点</button>`
      +`<span class="info">云端每6小时自动快照（保留3天）｜⭐=最接近24小时前｜回档后对方强制下线</span></div>`;
    if (RB) {
      if (!RB.list.length) {
        h += `<div class="hint">账号「${RB.name}」暂无云端备份（需该账号更新后至少在线保存过一次）</div>`;
      } else {
        let best = null, bestDiff = Infinity;
        RB.list.forEach((b)=>{ const d = Math.abs((Date.now()-new Date(b.created_at))/3600000 - 24); if (d < bestDiff) { bestDiff = d; best = b.created_at; } });
        h += `<div class="hint">账号「${RB.name}」共 ${RB.list.length} 个备份点：</div>`;
        RB.list.forEach((b)=>{
          const ageH = ((Date.now()-new Date(b.created_at))/3600000).toFixed(1);
          const rec = b.created_at === best;
          h += `<div class="row" style="background:#1c2036"><span class="name">${rec?"⭐推荐 ":""}${new Date(b.created_at).toLocaleString()}</span><span class="info">${ageH} 小时前</span><button class="act sm" style="background:#e55" onclick="doRollback('${b.created_at}')">回档到此</button></div>`;
        });
      }
    }
    h += `<div class="row" style="background:#2a1535;border:1px solid #c5f5"><span class="name" style="color:#c5f">🌌 无尽模式</span><span class="info">当前层</span><input type="number" min="1" value="${S.floor}" onchange="S.floor=Math.max(1,+this.value|0);S.monHp=endlessMon(S.floor).hp;S.floorStart=Date.now();saveGame()"><button class="act sm" style="background:${S.autoNext!==false?"#2a5":"#555"}" onclick="setAutoNext(${S.autoNext===false})">通关后${S.autoNext!==false?"自动下一层":"停留本层"}</button><button class="act sm" style="background:#a4a" onclick="toggleEndless(${!S.endless})">${S.endless?"退出无尽":"进入无尽"}</button><button class="act sm" style="background:#49f" onclick="S.floorStart=Date.now();log('⏱ 计时已重置');renderPanel();">重置计时</button></div>`
      +`<div class="row" style="background:#1a2440;border:1px solid #4a9eff44"><span class="name" style="color:#8af">⚡ 并行通道</span><button class="act sm" style="background:#2a5" onclick="S.lanes.forEach(l=>l.open=1);saveGame();renderPanel();">解锁全部</button><button class="act sm" style="background:#e55" onclick="S.lanes.forEach((l,i)=>l.open=i===0?1:0);saveGame();renderPanel();">重置通道</button></div>`
      +`<div class="row" style="background:#1a2440;border:1px solid #4a9eff44"><span class="name" style="color:#8af">💀 死亡复活</span><span class="info">${isDead()?`复活中 ${Math.ceil(deadLeftMs()/1000)}s`:"未死亡"}</span>`+(isDead()?`<button class="act sm" style="background:#49f" onclick="reviveNow();log('⚡ 立即复活');renderPanel();">立即复活</button>`:"")+`</div>`
      +`<div class="row" style="background:#2a2413;border:1px solid #ffd47944"><span class="name" style="color:#fa0">🧪 神水buff</span><button class="act sm" style="background:#a6f" onclick="S.buffHit=100;S.buffHitMin=20;log('🧪 命中+20分');renderPanel();">命中+20分</button><button class="act sm" style="background:#a6f" onclick="S.buffCd=100000;S.buffCdMin=20;log('💣 暴伤+20分');renderPanel();">暴伤+20分</button><button class="act sm" style="background:#5cf" onclick="S.buffInv=1;S.buffInvMin=20;log('🛉 无敌+20分');renderPanel();">无敌+20分</button><button class="act sm" style="background:#e55" onclick="S.buffHit=0;S.buffHitMin=0;S.buffCd=0;S.buffCdMin=0;S.buffInv=0;S.buffInvMin=0;log('🧪 已清除');renderPanel();">清除</button></div>`
      +`<div class="row" style="background:#1a2440;border:1px solid #4a9eff44"><span class="name" style="color:#8af">🌍 全局配置</span><button class="act sm" style="background:#a6f" onclick="tab=${T_CFG};renderPanel()">前往数值配置</button><button class="act sm" style="background:#2a5" onclick="fetchGlobalCfg()">↻ 拉取云端</button></div>`
      +`<div class="hint">技能等级（当前上限 ${effCap()}）：</div><div class="grid">`;
    SK.forEach((s)=>{ h += `<div class="row"><span class="name">${s.ic} ${s.n}</span><input type="number" value="${lv(s.id)}" min="1" max="${effCap()}" onchange="setSkill('${s.id}',+this.value)"></div>`; });
    h += `</div>`;
    h += `<div class="hint">物品：</div><div class="row"><select id="adIt">${Object.keys(IT).map((id)=>`<option value="${id}">${IT[id].ic}${IT[id].n}</option>`).join("")}</select><input type="number" id="adN" value="100"><button class="act sm" onclick="const i=$('adIt').value;if(addIt(i,+$('adN').value)){renderPanel();}">增加</button></div>`
      +`<div class="row"><span class="name">👾 跳转怪物</span><input type="number" value="${S.monI}" min="0" max="99" id="adI"><input type="number" value="${S.monLv}" min="1" max="5" id="adL"><button class="act sm" onclick="pickMon(Math.min(99,Math.max(0,+$('adI').value|0)),Math.min(5,Math.max(1,+$('adL').value|0)))">跳转</button> <span class="name">🎁 装备</span><button class="act sm" onclick="addEq(rollEq(['iron','steel','bow','staff','leather','robe'][Math.random()*6|0],60));renderPanel()">随机</button><button class="act sm" onclick="const e=rollEq('steel',${EQ_MAX_LV});e.rare=11;e.plus=20;e.holes=4;e.gems=[{t:'atk',l:${GEM_MAX}},{t:'atk',l:${GEM_MAX}},{t:'critDmg',l:${GEM_MAX}},{t:'critDmg',l:${GEM_MAX}}];e.n='混沌的'+e.n.replace(RARE_STRIP,'');rollSpecials(e);addEq(e);renderPanel()">满配混沌</button></div>`
      +`<div class="row"><span class="name">🔓 解锁全部怪物</span><button class="act sm" onclick="for(let i=0;i<100;i++)for(let l=1;l<=5;l++)S.kills[i+'-'+l]=1;renderPanel()">解锁</button> <span class="name">🗑️ 清档（重置当前槽${curSlot}）</span><button class="act sm" style="background:#e55" onclick="resetSlot()">重置</button></div>`;
  }
  else if (tab === T_CFG && isAdmin()) {
    h += `<div class="hint">🌍 <b>全局数值配置（管理员专属）</b>——修改后点「发布全局配置」，所有玩家约1分钟内同步生效。基础技能上限之上，每转生自动+60（玩家侧固定规则，不在此配置）。</div>`;
    h += `<div class="cfgSec"><h4>👹 全局怪物系数</h4>`
      + cfgRow("怪物难度系数", "diff", DIFF_MIN, DIFF_MAX)
      + cfgRow("怪物攻击力系数", "monAtkCf", 0.1, 10)
      + cfgRow("锻造概率系数", "forgeCf", 0.1, 5)
      + cfgRow("掉率系数", "dropCf", 0, 5)
      + cfgRow("转生怪物增强系数", "rebMonCf", 0, 3)
      + `<div class="cfgHint">转生怪物增强：每次转生全部怪物属性在前一次基础上 ×(1+本系数)叠乘。0.5=每转+50%；0=关闭。</div>`
      + `</div>`;
    h += `<div class="cfgSec"><h4>💎 宝石1级基础属性（每级+20%复利，上限Lv30；掉落上限Lv25，Lv26+只能合成）</h4>`
      + cfgRow("攻击宝石1级 +", "gemAtk", 1, 1000)
      + cfgRow("防御宝石1级 +", "gemDef", 1, 200)
      + cfgRow("活力宝石1级 +血", "gemHp", 10, 10000)
      + cfgRow("爆伤宝石1级 +%", "gemCritDmg", 10, 10000)
      + `<div class="cfgHint">宝石数值公式：1级 = 基础值，之后<b>每级在上一级基础上 ×1.2（+20%复利）</b>。当前配置下满级Lv30：⚔攻击+${gemVal("atk",30)}｜🛡防御+${gemVal("def",30)}｜❤血量+${gemVal("hp",30)}｜💥暴伤+${gemVal("critDmg",30)}%。</div>`
      + `</div>`;
    h += `<div class="cfgSec"><h4>⬆️ 升级速度</h4>`
      + cfgRow("升级经验系数", "xpCf", 0.1, 10)
      + `</div>`;
    h += `<div class="cfgSec"><h4>⚔️ 装备特殊属性随机范围（单件）</h4>`
      + cfgRow("暴伤下限 %", "critDmgMin", 50, 10000)
      + cfgRow("暴伤上限 %", "critDmgMax", 100, 100000)
      + cfgRow("暴击率下限 %", "critMin", 1, 45)
      + cfgRow("暴击率上限 %", "critMax", 5, 50)
      + cfgRow("攻速下限 %", "aspdMin", 5, 150)
      + cfgRow("攻速上限 %", "aspdMax", 20, 500)
      + cfgRow("吸血下限 %", "lsMin", 1, 15)
      + cfgRow("吸血上限 %", "lsMax", 5, 50)
      + `</div>`;
    h += `<div class="cfgSec"><h4>🎯 命中与闪避</h4>`
      + cfgRow("命中率保底 %", "hitFloor", 1, 50)
      + cfgRow("怪物有效闪避上限 %", "evCapPct", 30, 100)
      + `</div>`;
    h += `<div class="cfgSec"><h4>⭐ 基础技能等级上限（转生另+60/转）</h4>`
      + cfgRow("基础技能等级上限", "skillCap", 100, 500)
      + `</div>`;
    h += `<div class="row" style="margin-top:10px">`
      + `<button class="act" style="background:#2a5" onclick="publishGlobalCfg()">🌍 发布全局配置（全体生效）</button>`
      + `<button class="act" style="background:#a63" onclick="resetCfg()">↺ 恢复默认（待发布）</button>`
      + `<button class="act" style="background:#49f" onclick="fetchGlobalCfg()">↻ 拉取云端当前配置</button>`
      + `<span class="info">${CFG_DIRTY?'<b style="color:#f80">有未发布的修改</b>':"与云端一致"}</span></div>`;
  }
  else if (tab === T_LB) {
    if (Date.now() - lbLast > 60000) lbFetch(true);
    h += lbUI();
  }
  else if (tab === T_HELP || tab === TABS.length-1) {
    h += helpHTML();
  }
  el.innerHTML = h;
  if (IS_MOBILE) el.scrollTop = scr;
}
function render() { renderTop(); renderPanel(); }

