"use strict";
/* ★ 排行榜（方案C：每存档槽独立上榜；服务端每小时整点全量重算 + 转生立即刷新当前槽） */
let lbTab = 0, lbList = [], lbSelf = null, lbLast = 0, lbMyId = null, lbBusy = false;
async function lbFetch(silent) {
  if (!pmCanUse() || lbBusy) return;
  lbBusy = true;
  try {
    lbLast = Date.now();
    const col = lbTab === 0 ? "cum_floor" : "cum_lv";
    const { data, error } = await sb.from("leaderboard")
      .select("user_id,slot,name,cum_floor,cum_lv,reb,updated_at")
      .order(col, { ascending: false }).order("updated_at", { ascending: true }).limit(100);
    if (error) { sbErr(error); pmSqlHint(error); return; }
    lbList = data || [];
    if (!lbMyId) lbMyId = await cloudUid();
    if (lbMyId) {
      const r = await sb.from("leaderboard")
        .select("user_id,slot,name,cum_floor,cum_lv,reb,updated_at")
        .eq("user_id", lbMyId).eq("slot", curSlot).maybeSingle();
      if (r && r.error) sbErr(r.error);
      lbSelf = (r && r.data) || null;
    }
    if (!silent) renderPanel();
  } finally { lbBusy = false; }
}
function lbUI() {
  if (!pmCanUse()) return `<div class="hint" style="color:#ffd479;margin-top:10px">🏆 排行榜：需注册账号并登录云端后可见（游客无云端数据）</div>`;
  let h = `<div class="hint" style="color:#ffd479;margin-top:10px">🏆 荣誉排行榜｜数据由服务端从云存档自动提取（<b>无法伪造</b>）｜两项均为<b style="color:#f80">转生累计值</b>：每次转生时，当世无尽最高层数与总等级定格计入终身累计｜⏱ <b>服务端每小时整点全局重算</b>，转生后立即刷新当前槽（当世实时成绩见顶栏🏆）｜📌 <b>每个存档槽独立上榜</b>，显示该槽的玩家名字（未设置者显示“访客+数字”）</div>`;
  h += `<div class="row">`
    +`<button class="act sm" style="background:${lbTab===0?"#2a5":"#555"}" onclick="lbTab=0;lbFetch()">🌌 累计无尽层数</button>`
    +`<button class="act sm" style="background:${lbTab===1?"#2a5":"#555"}" onclick="lbTab=1;lbFetch()">⭐ 累计总等级</button>`
    +`<button class="act sm" onclick="lbFetch()">↻ 刷新</button>`
    +(lbSelf?`<span class="info">我的（槽${curSlot}）：${lbTab===0?`🌌${(lbSelf.cum_floor||0).toLocaleString()}层`:`⭐${(lbSelf.cum_lv||0).toLocaleString()}级`}（${lbSelf.reb||0}转）</span>`:"")
    +`</div>`;
  if (!lbList.length) {
    h += `<div class="hint" style="text-align:center;padding:20px 0">虚位以待——成为第一个上榜的人！<br>（登录后挂机一段时间，存档同步到云端即自动上榜）</div>`;
  } else {
    h += `<table><tr><th>名次</th><th>槽</th><th>玩家</th><th>${lbTab===0?"累计无尽层数":"累计总等级"}</th><th>转生</th><th>更新时间</th></tr>`;
    lbList.forEach((o, i) => {
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
    const inTop = lbList.some((o)=>lbMyId && o.user_id === lbMyId && o.slot === curSlot);
    if (lbSelf && !inTop) {
      h += `<div class="row lbMine" style="margin-top:6px"><span>…</span><span>#${curSlot} ✦</span><span>${lbSelf.name || "我"}（${lbSelf.reb||0}转）</span><b style="color:#ffd479">${((lbTab===0?lbSelf.cum_floor:lbSelf.cum_lv)||0).toLocaleString()}</b><span class="info">未进前100，继续加油！</span></div>`;
    }
  }
  h += `<div class="hint">📌 规则说明：榜单按「转生时累加的终身成绩」排序——转生会让当期进度归零，但你在每一世打出的最高层数与总等级都会永久累加入榜；<b>每个存档槽独立占一行</b>（#1/#2/#3，当前登录槽标 ✦），服务端每小时整点全量重算，转生时立即重算当前槽，清档/删槽不抹除已累计成绩；同分按成绩达成时间先后排序。玩家名字在「账号」页设置/修改（每槽独立，每天限改1次）。</div>`;
  return h;
}
