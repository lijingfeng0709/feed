"use strict";
/* ★ 玩家交易市场（v1.21.8：双币种 + 定价新规 + 改价） */
let pmOrders = [], pmMine = [], pmFilter = "", pmSub = null, pmLastFetch = 0, pmBusy = false;
function pmCanUse() { return CLOUD_ON() && LOGGED_IN && CUR !== "guest"; }
function pmSqlHint(e) {
  const m = String((e && (e.message || e)) || "");
  if (/could not find the function|market_place_order|market_buy_order|market_cancel_order|market_claim_payouts|market_update_price|refresh_leaderboard|claim_pname|pname_registry|schema cache/i.test(m)) {
    log("🛠️ 检测到服务端函数缺失或为旧版：请管理员在 Supabase → SQL Editor 执行最新配套 SQL（市场/名字/排行榜）");
  }
}
/* ★ 市场币种与定价区间工具
   系统基准价：金币=物品基准价；牛铃=牛铃商店价（无商店价的按1亿💰=1🔔折算）
   默认挂单价=基准价90%；允许区间=基准价±50% */
const PM_CUR = { gold:{n:"金币",ic:"💰"}, bell:{n:"牛铃",ic:"🔔"} };
function pmBasePrice(id, cur) {
  if (cur === "bell") return BELL_MAT[id] || Math.max(1, Math.ceil(IT[id].val / GOLD_PER_BELL));
  return IT[id].val;
}
function pmPriceRange(id, cur) {
  const b = pmBasePrice(id, cur);
  return { base:b, lo:Math.max(1, Math.floor(b*0.5)), hi:Math.ceil(b*1.5), def:Math.max(1, Math.floor(b*0.9)) };
}
function updPmDefPrice() {
  const it = $("pmItem"); if (!it || !it.value || !IT[it.value]) return;
  const cur = $("pmCur") ? $("pmCur").value : "gold";
  $("pmPrice").value = pmPriceRange(it.value, cur).def;
}
async function syncFromCloud() {
  try {
    const res = await cloudFetch();
    if (res && res.data) {
      let sd = null;
      if (res.data.slots) sd = unwrapSlot(res.data.slots[curSlot]);
      else if (curSlot === 1) sd = unwrapSlot(res.data.S);
      if (sd && sd.skills) {
        localStorage.setItem(saveKeyOf(CUR, curSlot), JSON.stringify({ S: sd, uid }));
        if (loadGame()) { render(); log("🔄 已从云端同步最新存档（玩家市场交易生效）"); }
      }
    }
  } catch (e) {
    log("⚠️ 交易后云同步暂未完成（不影响本次交易，稍后自动重试）：" + (e.message || e));
  }
}
async function pmFetch(silent) {
  if (!pmCanUse()) return;
  pmLastFetch = Date.now();
  let q = sb.from("market_orders").select("id,seller_id,seller_name,item_id,qty,unit_price,currency,created_at")
          .eq("status", "active").order("unit_price", { ascending: true })
          .order("created_at", { ascending: true }).limit(100);
  if (pmFilter) q = q.like("item_id", "%" + pmFilter + "%");
  const { data, error } = await q;
  if (error) { sbErr(error); return; }
  pmOrders = data || [];
  if (!silent) renderPanel();
}
async function pmFetchMine(silent) {
  if (!pmCanUse()) return;
  const id = await cloudUid();
  if (!id) return;
  const { data, error } = await sb.from("market_orders")
    .select("id,item_id,qty,unit_price,currency,created_at")
    .eq("seller_id", id).eq("status", "active").order("created_at", { ascending: false }).limit(20);
  if (error) { sbErr(error); return; }
  pmMine = data || [];
  if (!silent) renderPanel();
}
function pmAutoRefresh() {
  if (!pmCanUse() || tab !== 5) return;
  if (Date.now() - pmLastFetch > 30000) { pmFetch(true); pmFetchMine(true); }
}
function pmUI() {
  if (!pmCanUse()) return `<div class="hint" style="color:#5cf;margin-top:10px">🤝 玩家市场：需注册账号并登录云端后开放（游客不可交易）</div>`;
  let h = `<div class="hint" style="color:#5cf;margin-top:14px">━━━━━ 🤝 玩家市场（挂单制｜💰金币/🔔牛铃双币种｜成交收2%税｜每人最多20个挂单｜定价=系统基准价±50%）━━━━━</div>`;
  const sellables = Object.keys(S.bag).filter((id)=>PM_TRADEABLE.test(id));
  const defP = sellables.length ? pmPriceRange(sellables[0], "gold").def : 100;
  h += `<div class="row pmRow" style="flex-direction:column;align-items:stretch">`
    +`<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">`
    +`<span class="name pmTag">📤 挂单出售</span>`
    +`<select id="pmItem" onchange="updPmDefPrice()" style="max-width:170px">${sellables.length?sellables.map((id)=>`<option value="${id}">${IT[id].ic}${IT[id].n}×${bagN(id)}</option>`).join(""):`<option value="">（背包中没有可交易物品）</option>`}</select>`
    +`<span class="info">数量</span><input type="number" id="pmQty" min="1" value="10" style="width:55px">`
    +`<span class="info">币种</span><select id="pmCur" onchange="updPmDefPrice()"><option value="gold">💰金币</option><option value="bell">🔔牛铃</option></select>`
    +`<span class="info">单价</span><input type="number" id="pmPrice" min="1" value="${defP}" style="width:75px">/个`
    +`<button class="act sm" style="background:#5cf" ${sellables.length?"":"disabled"} onclick="pmPlace()">📤 挂单</button>`
    +`</div>`
    +`<span class="info" style="margin-top:3px">默认单价=系统基准价的90%（选物品/币种自动填充，可自行调整）｜价格区间：基准价±50%，超出弹窗「价格设置不合理」｜挂牌后材料立即转入托管，撤单/成交后返还（按当前存档槽${curSlot}结算）</span></div>`;
  h += `<div class="hint" style="color:#5c5;margin-top:8px">—— 📥 我的挂单（${pmMine.length}/20，可✏️改价）——</div>`;
  if (!pmMine.length) h += `<div class="hint">暂无挂单</div>`;
  else {
    h += `<table><tr><th>物品</th><th>剩余数量</th><th>单价</th><th>挂单时间</th><th>操作</th></tr>`;
    pmMine.forEach((o) => {
      const it = IT[o.item_id];
      const cu = (o.currency === "bell") ? "🔔" : "💰";
      h += `<tr class="pmMine"><td>${it?it.ic+it.n:o.item_id}</td><td>${o.qty}</td>`
        +`<td><b style="color:#ffd479">${o.unit_price.toLocaleString()}${cu}</b></td>`
        +`<td class="info">${new Date(o.created_at).toLocaleString()}</td>`
        +`<td><button class="act sm" style="background:#a6f" onclick="pmUpdatePrice(${o.id})">✏️改价</button> <button class="act sm" style="background:#e55" onclick="pmCancel(${o.id})">撤单返还</button></td></tr>`;
    });
    h += `</table>`;
  }
  h += `<div class="row"><span class="name pmTag">🔍 筛选</span>`
    +`<input style="flex:1;min-width:120px" placeholder="物品ID（如 yaoDan / gem_atk / xingHui）…" value="${pmFilter}" onchange="pmFilter=this.value;pmFetch()">`
    +`<button class="act sm" onclick="pmFetch();pmFetchMine()">↻ 刷新</button>`
    +`<button class="act sm" style="background:${pmSub?"#5c5":"#3a4166"}" onclick="pmRealtimeToggle()">${pmSub?"📡 实时:开":"📡 实时:关"}</button></div>`;
  if (!pmOrders.length) {
    h += `<div class="hint">暂无活跃挂单${pmFilter?"（试试清空筛选）":""}——成为第一个卖家？</div>`;
  } else {
    h += `<table><tr><th>物品</th><th>数量</th><th>单价</th><th>总价</th><th>卖家</th><th>买入</th></tr>`;
    pmOrders.forEach((o) => {
      const it = IT[o.item_id];
      const mine = (o.seller_id === PM_UID);
      const cu = (o.currency === "bell") ? "🔔" : "💰";
      h += `<tr class="${mine?"pmMine":"pmRow"}"><td>${it?it.ic+it.n:o.item_id}</td><td>${o.qty}</td>`
        +`<td><b style="color:${o.currency==="bell"?"#c5f":"#ffd479"}">${o.unit_price.toLocaleString()}${cu}</b></td>`
        +`<td>${(o.unit_price*o.qty).toLocaleString()}${cu}</td>`
        +`<td class="info">${mine?"<b style='color:#5c5'>我</b>":String(o.seller_name||"-").slice(0,12)}</td>`
        +`<td>${mine?"<span class='info'>自己的单</span>":`<input type="number" min="1" max="${o.qty}" value="${Math.min(o.qty,1)}" style="width:45px" id="bq_${o.id}">`
          +`<button class="act sm" style="background:#5cf" onclick="pmBuy(${o.id})">买入</button>`}</td></tr>`;
    });
    h += `</table>`;
  }
  h += `<div class="hint">卖出所得（按币种分账）自动存入待领取账本：上线时和每60秒自动领取入账（日志会提示）——离线期间卖出的钱也不会丢</div>`;
  return h;
}
let PM_UID = null;
async function pmInitUid() { if (pmCanUse() && !PM_UID) PM_UID = await cloudUid(); }
async function pmPlace() {
  if (pmBusy) return;
  const itemId = $("pmItem").value, qty = +$("pmQty").value, price = +$("pmPrice").value;
  const cur = $("pmCur") ? $("pmCur").value : "gold";
  if (!itemId) { log("⚠️ 请选择要挂单的物品"); return; }
  if (!qty || qty < 1) { log("⚠️ 数量必须≥1"); return; }
  if (!price || price < 1) { log("⚠️ 单价必须≥1"); return; }
  if (qty > bagN(itemId)) { log(`⚠️ 持有量不足：${IT[itemId].n}×${bagN(itemId)}`); return; }
  const rg = pmPriceRange(itemId, cur);
  if (price < rg.lo || price > rg.hi) {
    alert(`❌ 价格设置不合理！\n\n「${IT[itemId].n}」（${PM_CUR[cur].n}计价）\n系统基准价：${rg.base} ${PM_CUR[cur].ic}\n允许区间：${rg.lo} ~ ${rg.hi}（基准价的±50%）\n你设置的单价：${price}\n\n提示：默认价为系统基准价的90%（${rg.def} ${PM_CUR[cur].ic}）`);
    return;
  }
  if (!confirm(`确认挂单出售？\n\n${IT[itemId].ic}${IT[itemId].n}×${qty} @ ${price.toLocaleString()} ${PM_CUR[cur].ic}/个\n总价 ${(price*qty).toLocaleString()} ${PM_CUR[cur].ic}（成交后收2%税）\n\n材料将立即从背包转入市场托管。`)) return;
  pmBusy = true;
  try {
    const { error } = await sb.rpc("market_place_order", { p_item_id: itemId, p_qty: qty, p_unit_price: price, p_slot: curSlot, p_currency: cur });
    if (error) throw error;
    log(`📤 挂单成功：${IT[itemId].n}×${qty} @${price.toLocaleString()}${PM_CUR[cur].ic}/个`);
  } catch (e) {
    log("❌ 挂单失败：" + (e.message || e));
    pmSqlHint(e);
    pmBusy = false; renderPanel(); return;
  }
  await syncFromCloud();
  await pmFetch(true); await pmFetchMine(true);
  render();
  pmBusy = false;
}
async function pmBuy(orderId) {
  if (pmBusy) return;
  const qty = +($("bq_"+orderId) || {}).value || 1;
  if (!qty || qty < 1) { log("⚠️ 购买数量必须≥1"); return; }
  const o = pmOrders.find((x)=>x.id === orderId);
  if (!o) { log("⚠️ 挂单不存在，请刷新"); return; }
  const cu = (o.currency === "bell") ? "🔔" : "💰";
  if (!confirm(`确认买入？\n\n${IT[o.item_id]?IT[o.item_id].n:o.item_id}×${Math.min(qty,o.qty)} @ ${o.unit_price.toLocaleString()}${cu}/个\n共 ${(o.unit_price*Math.min(qty,o.qty)).toLocaleString()}${cu}（含2%税，由卖家承担）`)) return;
  pmBusy = true;
  try {
    const { data, error } = await sb.rpc("market_buy_order", { p_order_id: orderId, p_buy_qty: qty, p_slot: curSlot });
    if (error) throw error;
    const rcu = (data && data.currency === "bell") ? "🔔" : "💰";
    log(`🤝 买入成功：×${data.bought}，花费 ${(+data.cost).toLocaleString()}${rcu}`);
  } catch (e) {
    log("❌ 买入失败：" + (e.message || e));
    pmSqlHint(e);
    pmBusy = false; renderPanel(); return;
  }
  await syncFromCloud();
  await pmFetch(true); await pmFetchMine(true);
  render();
  pmBusy = false;
}
async function pmCancel(orderId) {
  if (pmBusy) return;
  if (!confirm(`确认撤单？挂单剩余数量将全部返还背包（返还到当前存档槽${curSlot}）。`)) return;
  pmBusy = true;
  try {
    const { error } = await sb.rpc("market_cancel_order", { p_order_id: orderId, p_slot: curSlot });
    if (error) throw error;
    log(`📥 撤单成功，材料已返还`);
  } catch (e) {
    log("❌ 撤单失败：" + (e.message || e));
    pmSqlHint(e);
    pmBusy = false; renderPanel(); return;
  }
  await syncFromCloud();
  await pmFetch(true); await pmFetchMine(true);
  render();
  pmBusy = false;
}
async function pmUpdatePrice(orderId) {
  if (pmBusy) return;
  const o = pmMine.find((x)=>x.id === orderId);
  if (!o) { log("⚠️ 找不到该挂单，请刷新"); return; }
  const cur = o.currency || "gold";
  const rg = pmPriceRange(o.item_id, cur);
  const inp = prompt(`✏️ 修改挂单价格\n\n${IT[o.item_id]?IT[o.item_id].n:o.item_id}（${PM_CUR[cur].n}计价）\n系统基准价：${rg.base}｜允许区间：${rg.lo} ~ ${rg.hi}\n当前单价：${o.unit_price.toLocaleString()} ${PM_CUR[cur].ic}\n\n请输入新单价（${rg.lo}~${rg.hi}，超出将弹窗拦截）：`, o.unit_price);
  if (inp === null) return;
  const np = Math.floor(+inp);
  if (!np || np < 1) { log("⚠️ 价格无效"); return; }
  if (np < rg.lo || np > rg.hi) {
    alert(`❌ 价格设置不合理！\n\n允许区间：${rg.lo} ~ ${rg.hi}（系统基准价 ${rg.base} 的±50%）\n你输入的：${np}`);
    return;
  }
  pmBusy = true;
  try {
    const { error } = await sb.rpc("market_update_price", { p_order_id: orderId, p_new_price: np });
    if (error) throw error;
    log(`✏️ 改价成功：${o.unit_price.toLocaleString()} → ${np.toLocaleString()} ${PM_CUR[cur].ic}/个（${IT[o.item_id]?IT[o.item_id].n:o.item_id}）`);
  } catch (e) {
    log("❌ 改价失败：" + (e.message || e));
    pmSqlHint(e);
    pmBusy = false; renderPanel(); return;
  }
  await pmFetch(true); await pmFetchMine(true);
  render();
  pmBusy = false;
}
async function claimMarket() {
  if (!pmCanUse() || !S) return;
  try {
    const { data, error } = await sb.rpc("market_claim_payouts_v2");
    if (error) { pmSqlHint(error); return; }
    const d = (data && typeof data === "object") ? data : { gold: +data || 0, bell: 0 };
    const g = +d.gold || 0, b = +d.bell || 0;
    if (g > 0 || b > 0) {
      S.gold += g; S.bell += b;
      log(`🤝 市场结算：收到卖出所得 ${g>0?g.toLocaleString()+"💰":""}${(g>0&&b>0)?" ＋ ":""}${b>0?b+"🔔":""}（已入账）`);
      saveGame(); renderTop();
    }
  } catch (e) {}
}
function pmRealtimeToggle() {
  if (!pmCanUse()) return;
  if (pmSub) {
    try { sb.removeChannel(pmSub); } catch (e) {}
    pmSub = null;
    log("📡 玩家市场实时订阅已关闭");
    renderPanel();
    return;
  }
  pmSub = sb.channel("market")
    .on("postgres_changes", { event: "*", schema: "public", table: "market_orders" },
      () => { pmFetch(true); pmFetchMine(true); })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") log("📡 玩家市场实时订阅已开启（新挂单自动刷新）");
      renderPanel();
    });
}

