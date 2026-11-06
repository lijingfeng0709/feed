"use strict";
/* ★ 排行榜（方案C：每存档槽独立上榜；服务端整点全量重算 + 转生立即刷新当前槽）
   ★ 防串台：每次请求绑定当前账号/榜/槽，过期响应丢弃；UI 按当前榜本地重排 */
let lbTab = 0, lbList = [], lbSelf = null, lbLast = 0, lbMyId = null,
    lbSeq = 0, lbSlot = 0, lbLoadedTab = -1;

function lbReset() {
  lbSeq++;                       // 让所有在途响应失效
  lbList = []; lbSelf = null; lbMyId = null; lbLast = 0; lbSlot = 0; lbLoadedTab = -1;
}

async function lbFetch(silent) {
  if (!pmCanUse()) { lbReset(); return; }
  const seq = ++lbSeq;           // 允许并发，但只认最后一次请求的结果
  const wantTab = lbTab, wantSlot = curSlot;
  lbLast = Date.now();
  try {
    const uid = await cloudUid();   // 每次重取，绝不跨登录缓存旧账号
    if (seq !== lbSeq) return;
    if (!uid) { lbList = []; lbSelf = null; lbMyId = null; lbSlot = 0; return; }
    if (uid !== lbMyId) { lbMyId = uid; lbSelf = null; lbList = []; }
    const col = wantTab === 0 ? "cum_floor" : "cum_lv";
    const { data, error } = await sb.from("leaderboard")
      .select("user_id,slot,name,cum_floor,cum_lv,reb,updated_at")
      .order(col, { ascending: false }).order("updated_at", { ascending: true }).limit(100);
    if (seq !== lbSeq) return;
    if (error) { sbErr(error); pmSqlHint(error); return; }
    lbList = data || [];
    lbLoadedTab = wantTab;
    const r = await sb.from("leaderboard")
      .select("user_id,slot,name,cum_floor,cum_lv,reb,updated_at")
      .eq("user_id", uid).eq("slot", wantSlot).maybeSingle();
    if (seq !== lbSeq) return;
    if (r && r.error) sbErr(r.error);
    lbSelf = (r && r.data && r.data.user_id === uid) ? r.data : null;
    lbSlot = wantSlot;
    if (!silent) renderPanel();
  } catch (e) {
    if (seq === lbSeq) { try { sbErr(e); } catch (_) {} }
  }
}

function lbRows() {
  // 按当前榜本地重排：异步结果未返回时，表头、数值、排序也永不串
  const col = lbTab === 0 ? "cum_floor" : "cum_lv";
  return lbList.slice().sort((a, b) =>
    ((b[col] || 0) - (a[col] || 0)) ||
    ((+new Date(a.updated_at || 0)) - (+new Date(b.updated_at || 0))) ||
    ((a.slot || 0) - (b.slot || 0))
  ).slice(0, 100);
}

function lbUI() {
  if (!pmCanUse()) return `<div class="hint" style="color:#ffd479;margin-top:10px">🏆 排行榜：需注册账号并登录云端后可见（游客无云端数据）</div>`;
  // 只有「确实是当前账号 + 当前槽」的数据才能标成「我的」，否则一律显示同步中
  const selfValid = !!(lbSelf && lbMyId && lbSelf.user_id === lbMyId && lbSlot === curSlot);
  const rows = lbRows();
  let h = `<div class="hint" style="color:#ffd479;margin-top:10px">🏆 荣誉排行榜｜数据由服务端从云存档自动提取（<b>无法伪造</b>）｜两项均为<b style="color:#f80">转生累计值</b>：每次转生时，当世无尽最高层数与总等级定格计入终身累计｜⏱ <b>服务端每小时整点全局重算</b>，转生后立即刷新当前槽（当世实时成绩见顶栏🏆）｜📌 <b>每个存档槽独立上榜</b>，显示该槽的玩家名字（未设置者显示“访客+数字”）</div>`;
  h += `<div class="row">`
    +`<button class="act sm" style="background:${lbTab===0?"#2a5":"#555"}" onclick="lbTab=0;lbFetch()">🌌 累计无尽层数</button>`
    +`<button class="act sm" style="background:${lbTab===1?"#2a5":"#555"}" onclick="lbTab=1;lbFetch()">⭐ 累计总等级</button>`
    +`<button class="act sm" onclick="lbFetch()">↻ 刷新</button>`
    +(selfValid
      ? `<span class="info">我的（槽${curSlot}）：${lbTab===0?`🌌${(lbSelf.cum_floor||0).toLocaleString()}层`:`⭐${(lbSelf.cum_lv||0).toLocaleString()}级`}（${lbSelf.reb||0}转）</span>`
      : `<span class="info">我的（槽${curSlot}）：同步中…</span>`)
    +`</div>`;
  if (!rows.length) {
    h += `<div class="hint" style="text-align:center;padding:20px 0">虚位以待——成为第一个上榜的人！<br>（登录后挂机一段时间，存档同步到云端即自动上榜）</div>`;
  } else {
    h += `<table><tr><th>名次</th><th>槽</th><th>玩家</th><th>${lbTab===0?"累计无尽层数":"累计总等级"}</th><th>转生</th><th>更新时间</th></tr>`;
    rows.forEach((o, i) => {
      const mine = (lbMyId && o.user_id === lbMyId);
      const cur = mine && o.slot === curSlot;
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i+1)+".";
      h += `<tr class="${mine?"lbMine":"lbRow"}"><td>${medal}</td>`
        +`<td class="info">#${o.slot||1}${cur?" ✦":""}</td>`
        +`<td><b style="${mine?"color:#ffd479":""}">${o.name || "无名侠"}</b>（${o.reb || 0}转）</td>`
        +`<td><b style="color:#ffd479">${((lbTab===0?o.cum_floor:o.cum_lv)||0).toLocaleString()}</b></td>`
        +`<td class="info">${o.reb || 0}/7</td>`
        +`<td class="info">${new Date(o.updated_at).toLocaleString()}</td></tr>`;
    });
    h += `</table>`;
    const inTop = rows.some((o)=>lbMyId && o.user_id === lbMyId && o.slot === curSlot);
    if (selfValid && !inTop) {
      h += `<div class="row lbMine" style="margin-top:6px"><span>…</span><span>#${curSlot} ✦</span><span>${lbSelf.name || "我"}（${lbSelf.reb||0}转）</span><b style="color:#ffd479">${((lbTab===0?lbSelf.cum_floor:lbSelf.cum_lv)||0).toLocaleString()}</b><span class="info">未进前100，继续加油！</span></div>`;
    }
  }
  h += `<div class="hint">📌 规则说明：榜单按「转生时累加的终身成绩」排序——转生会让当期进度归零，但你在每一世打出的最高层数与总等级都会永久累加入榜；<b>每个存档槽独立占一行</b>（#1/#2/#3，当前登录槽标 ✦），服务端每小时整点全量重算，转生时立即重算当前槽，清档/删槽不抹除已累计成绩；同分按成绩达成时间先后排序。切换账号/存档槽/榜单会重新拉取，避免数据串台。玩家名字在「账号」页设置/修改（每槽独立，每天限改1次）。</div>`;
  return h;
}
