"use strict";
/* ============================================================
   ★ 模块 A：Supabase 云存档 + 全局配置 + 单点登录 + 回档备份
   ============================================================ */
const SB_URL = "https://scveickilldhyskrndkg.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdmVpY2tpbGxkaHlza3JuZGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjEyMzQsImV4cCI6MjEwNzUzNzIzNH0.pjqsxqEE5vUcLa_2tkU2V26akUAaQnpwNpITVohvR5w";
const sb = (window.supabase && window.supabase.createClient) ? window.supabase.createClient(SB_URL, SB_KEY) : null;
const CLOUD_ON = () => !!sb;
const sbEmail = (u) => u.toLowerCase() + "@ranch.local";
const FLOOR_LIMIT = 600;
const ENDLESS_GOLD_CAP = 1000000;
const GOLD_PER_BELL = 100000000;
const SLOT_MAX = 3;
let curSlot = 1;
let SLOTDOC = null;
const GEM_DROP_CAP = 25;
let MY_PN = { 1:null, 2:null, 3:null };
const PN_RE = /^[\u4e00-\u9fa5A-Za-z0-9_]{2,10}$/;

/* ★ 槽位数据解包——兼容 {S} / {S,uid} / 双层封装 / 裸S 各种历史格式 */
function unwrapSlot(v) {
  let x = v, depth = 0;
  while (x && typeof x === "object" && x.S && typeof x.S === "object" && depth < 4) { x = x.S; depth++; }
  return (x && typeof x === "object") ? x : null;
}

let SID = null;
async function cloudSetSid() {
  if (!CLOUD_ON()) return;
  const id = await cloudUid();
  if (!id) return;
  SID = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try { await sb.from("logins").upsert({ id: id, sid: SID, updated_at: new Date().toISOString() }); } catch (e) {}
}
async function cloudCheckSid() {
  if (!CLOUD_ON() || !SID || !LOGGED_IN || CUR === "guest") return;
  try {
    const id = await cloudUid();
    if (!id) return;
    const { data, error } = await sb.from("logins").select("sid").eq("id", id).maybeSingle();
    if (error || !data) return;
    if (data.sid !== SID) {
      SID = null;
      alert("⚠️ 您的账号已在其他设备登录，本设备已强制下线！");
      logout();
    } else {
      try { await sb.from("logins").update({ updated_at: new Date().toISOString() }).eq("id", id); } catch (e) {}
    }
  } catch (e) {}
}
setInterval(cloudCheckSid, 30000);

function sbErr(e) {
  const msg = (e && (e.message || e.msg)) || String(e);
  log("☁️ 云同步失败：" + msg);
  if (typeof authMsg === "function") authMsg("❌ 云端错误：" + msg, false);
}

async function cloudSignUp(u, p) {
  if (!CLOUD_ON()) { authMsg("❌ Supabase 库未加载（CDN 被墙或断网），请检查网络", false); return false; }
  const { data, error } = await sb.auth.signUp({ email: sbEmail(u), password: p });
  if (error) { sbErr(error); return false; }
  if (data && !data.session && data.user && data.user.identities && data.user.identities.length === 0) {
    authMsg("❌ 该邮箱已被注册（云端已有同名账号），请直接登录", false); return false;
  }
  if (data && !data.session) {
    authMsg("❌ 云端要求邮箱验证：请到 Supabase → Authentication → Email 关闭 Confirm email", false); return false;
  }
  return true;
}

let LOGIN_UID = null;   // 本次登录成功时绑定的 uid；云读写必须与之匹配，防止串档
async function cloudSignIn(u, p) {
  if (!CLOUD_ON()) return false;
  // 先彻底清掉上一个账号的会话：logout() 里的 signOut 未 await 会与新 signIn 并发，
  // 残留的旧 JWT 会让 cloudUid() 指向上一个账号，把它的云端存档串给新账号
  LOGIN_UID = null;
  try { await sb.auth.signOut(); } catch (e) {}
  const { error } = await sb.auth.signInWithPassword({ email: sbEmail(u), password: p });
  if (error) { sbErr(error); return false; }
  LOGIN_UID = await cloudUid();
  if (!LOGIN_UID) {
    try { const s = await sb.auth.getSession(); LOGIN_UID = (s && s.data && s.data.session && s.data.session.user) ? s.data.session.user.id : null; } catch (e) {}
  }
  if (!LOGIN_UID) sbErr(new Error("已登录但未取得用户身份，本次会话禁用云同步（防止串档）"));
  try { await cloudSetSid(); } catch (e) {}
  return true;
}

async function cloudSignOut() { if (!CLOUD_ON()) return; try { await sb.auth.signOut(); } catch (e) {} SID = null; LOGIN_UID = null; }

async function cloudUid() {
  if (!CLOUD_ON()) return null;
  const { data } = await sb.auth.getSession();
  return (data && data.session && data.session.user) ? data.session.user.id : null;
}

async function fetchMyPnames() {
  if (!pmCanUse()) return;
  try {
    const id = await cloudUid();
    if (!id) return;
    const { data, error } = await sb.from("pname_registry").select("pname,slot").eq("user_id", id);
    if (error) { pmSqlHint(error); return; }
    MY_PN = { 1:null, 2:null, 3:null };
    (data || []).forEach((r) => { const sl = Math.min(SLOT_MAX, Math.max(1, r.slot|0)); MY_PN[sl] = r.pname; });
    if (S && MY_PN[curSlot] && S.name !== MY_PN[curSlot]) {
      S.name = MY_PN[curSlot];
      saveGame(); renderTop();
    }
  } catch (e) {}
}
async function doRename() {
  if (!pmCanUse()) { log("⚠️ 游客无法设置玩家名字（需注册账号）"); return; }
  const el = $("pnNew"); if (!el) return;
  const pn = el.value.trim();
  if (!PN_RE.test(pn)) { log("⚠️ 名字需2~10位中文/字母/数字/下划线"); return; }
  log("⏳ 正在修改存档槽" + curSlot + "的玩家名字…");
  try {
    const { data, error } = await sb.rpc("claim_pname", { p_pname: pn, p_slot: curSlot, p_is_rename: true });
    if (error) throw error;
    MY_PN[curSlot] = pn;
    S.name = pn;
    saveGame(); renderTop(); renderPanel();
    log(`🪪 名字修改成功：存档槽${curSlot} →「${pn}」（排行榜与玩家市场将显示新名字）`);
  } catch (e) {
    log("❌ 修改失败：" + (e.message || e));
    pmSqlHint(e);
  }
}
/* ★ 榜单刷新：服务端 pg_cron 每小时整点全量重算（权威）；此处仅作客户端兜底，
   每账号每槽每小时最多一次；force=true 立即刷新当前槽（转生用） */
const LB_REFRESH_MS = 3600*1000;
function tryLbRefresh(force) {
  if (!CLOUD_ON() || CUR === "guest" || !LOGIN_UID) return;
  const key = "mr_lb_t_" + CUR + "_" + curSlot;
  const last = +(localStorage.getItem(key) || 0);
  if (!force && Date.now() - last < LB_REFRESH_MS) return;
  localStorage.setItem(key, String(Date.now()));
  try {
    // sb.rpc() 返回惰性 thenable，必须调用 .then() 才会真正发出请求
    sb.rpc("refresh_leaderboard", { p_slot: curSlot }).then(
      () => {},
      (e) => { log("⚠️ 榜单刷新失败（服务端整点任务仍会兜底）：" + ((e && e.message) || e)); }
    );
  } catch (e) {}
}

async function cloudSave() {
  if (!CLOUD_ON() || CUR === "guest" || !LOGIN_UID) return;
  const id = await cloudUid();
  // 会话与登录账号不一致时绝不上传，否则会把当前账号的进度写进上一个账号的 saves 行
  if (!id || id !== LOGIN_UID) {
    log("⚠️ 云端身份与当前账号不一致，已跳过本次同步（防止串档）");
    return;
  }
  const raw = localStorage.getItem(saveKeyOf(CUR, curSlot));
  if (!raw) return;
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch (e) { return; }
  const bareS = unwrapSlot(parsed && parsed.S ? parsed.S : parsed);
  if (!bareS || !bareS.skills) return;
  let doc = { slots: {} };
  let cloudReadOK = false;
  try {
    const { data, error } = await sb.from("saves").select("data").eq("id", id).maybeSingle();
    if (!error) {
      cloudReadOK = true;   // 空档（data=null）也算读取成功
      if (data && data.data) {
        if (data.data.slots) doc.slots = data.data.slots;
        else if (data.data.S) doc.slots = { 1: unwrapSlot(data.data.S) };
      }
    }
  } catch (e) {}
  // 读失败时若继续 upsert，会把云端另外两个槽的存档一起抹掉
  if (!cloudReadOK) {
    log("⚠️ 云端存档读取失败，已跳过本次同步以避免覆盖其他存档槽");
    return;
  }
  doc.slots[curSlot] = bareS;
  const { error } = await sb.from("saves").upsert({ id, name: CUR, data: doc, version: 1 });
  if (error) sbErr(error);
  else {
    log("☁️ 存档已同步到云端（槽" + curSlot + "）");
    tryLbRefresh();
  }
  maybeBackup(id);
}
async function maybeBackup(id) {
  try {
    const key = "mr_bk_" + CUR;
    const last = +(localStorage.getItem(key) || 0);
    const now = Date.now();
    if (last !== 0 && now - last < 6*3600*1000) return;
    localStorage.setItem(key, String(now));
    const { data } = await sb.from("saves").select("data").eq("id", id).maybeSingle();
    if (!data || !data.data) return;
    const { error } = await sb.from("save_backups").insert({ id: id, name: CUR, data: data.data });
    if (!error) log("🗂️ 已创建云端存档快照（用于管理员回档）");
    try { await sb.from("save_backups").delete().lt("created_at", new Date(now - 3*86400*1000).toISOString()); } catch (e) {}
  } catch (e) {}
}

async function cloudFetch() {
  if (!CLOUD_ON() || !LOGIN_UID) return null;
  const id = await cloudUid();
  // 会话与登录账号不一致时绝不读取，否则会把上一个账号的存档灌进新账号
  if (!id || id !== LOGIN_UID) {
    log("⚠️ 云端身份与当前账号不一致，已跳过云存档读取（防止串档）");
    return null;
  }
  const { data, error } = await sb.from("saves").select("data,updated_at").eq("id", id).maybeSingle();
  if (error) { sbErr(error); return null; }
  if (!data || !data.data) return null;
  return data;
}

function slotData(n) {
  let local = null;
  let lraw = localStorage.getItem(saveKeyOf(CUR, n));
  if (!lraw && n === 1) lraw = localStorage.getItem(saveKeyOf(CUR));
  if (lraw) {
    try {
      const d = JSON.parse(lraw);
      local = unwrapSlot(d.S != null ? d.S : d);
      if (local && !local.skills) local = null;
    } catch (e) { local = null; }
  }
  let cloud = null;
  if (SLOTDOC) {
    let cv = null;
    if (SLOTDOC.slots) cv = SLOTDOC.slots[n];
    else if (n === 1 && SLOTDOC.S) cv = SLOTDOC.S;
    if (cv) { cloud = unwrapSlot(cv); if (cloud && !cloud.skills) cloud = null; }
  }
  return { local, cloud, hasLocal: !!lraw };
}
function slotUse(n) {
  const d = slotData(n);
  if (d.local && d.cloud) return (d.cloud.lastTick || 0) >= (d.local.lastTick || 0) ? d.cloud : d.local;
  return d.cloud || d.local;
}
async function showSlotPicker() {
  try {
    SLOTDOC = null;
    if (CLOUD_ON() && CUR !== "guest") {
      const res = await cloudFetch();
      if (res && res.data) SLOTDOC = res.data;
    }
    let h = "";
    for (let n = 1; n <= SLOT_MAX; n++) {
      const d = slotData(n);
      const use = slotUse(n);
      let info = '<span style="color:#889">—— 空存档槽 ——</span>';
      if (d.hasLocal && !d.local) info = '<span style="color:#f66">⚠️ 本地数据损坏（可删除重开）</span>';
      else if (use) {
        const tl = use.skills ? Object.values(use.skills).reduce((a,s)=>a+(s.lv||1),0) : 0;
        const src = (d.local && d.cloud) ? ((d.cloud.lastTick||0) >= (d.local.lastTick||0) ? "☁️云端" : "💾本地") : (d.cloud ? "☁️云端" : "💾本地");
        const t = new Date(use.lastTick || 0).toLocaleString();
        info = `👤 <b>${use.name || "-"}</b>｜总等级 <b style="color:#ffd479">${tl}</b>｜💰${Math.floor(use.gold||0).toLocaleString()}｜🌀${use.reb||0}转｜🌌最高${use.bestFloor||0}层<br><span class="info">${src}保存于 ${t}</span>`;
      }
      h += `<div class="row" style="background:#1c2036;flex-direction:column;align-items:stretch">`
        +`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="name" style="color:#8af">存档槽 ${n}</span></div>`
        +`<div class="info" style="margin:2px 0">${info}</div>`
        +`<div style="display:flex;gap:6px">`
        +`<button class="act sm" style="background:#2a5;flex:1" onclick="chooseSlot(${n})">${use?"▶ 进入":"➕ 新存档"}</button>`
        +`<button class="act sm" style="background:#e55" ${(use || d.hasLocal)?"":"disabled"} onclick="deleteSlot(${n})">🗑️ 删除存档</button>`
        +`</div></div>`;
    }
    $("slotBody").innerHTML = h;
    hideAuth();
    $("slotPick").style.display = "flex";
  } catch (e) {
    console.error("存档选择页异常", e);
    try { log("⚠️ 存档选择页异常，已自动进入存档槽1：" + (e.message || e)); } catch (e2) {}
    try { $("slotPick").style.display = "none"; } catch (e2) {}
    curSlot = 1;
    if (CUR) localStorage.setItem("mr_slot_" + CUR, "1");
    enterGame();
  }
}
function chooseSlot(n) {
  const d = slotData(n);
  const use = slotUse(n);
  if (use && use === d.cloud && (!d.local || (use.lastTick||0) > (d.local.lastTick||0))) {
    localStorage.setItem(saveKeyOf(CUR, n), JSON.stringify({ S: use, uid: (SLOTDOC && SLOTDOC.uid) || 1 }));
  }
  curSlot = n;
  localStorage.setItem("mr_slot_" + CUR, String(n));
  $("slotPick").style.display = "none";
  enterGame();
  fetchMyPnames();
  if (typeof lbFetch === "function") lbFetch(true);   // 切槽后立即按新槽重拉榜单
}
async function deleteSlot(n) {
  const d = slotData(n);
  if (!d.hasLocal && !d.cloud) return;
  const nm = (slotUse(n) || {}).name || ("存档槽" + n);
  if (!confirm(`⚠️ 确认删除【存档槽 ${n}】「${nm}」？\n\n本地与云端该槽存档都将被删除，此操作不可恢复！\n（建议先在游戏内「💾导出」备份）`)) return;
  localStorage.removeItem(saveKeyOf(CUR, n));
  if (n === 1) localStorage.removeItem(saveKeyOf(CUR));
  if (CLOUD_ON() && CUR !== "guest" && SLOTDOC) {
    if (!SLOTDOC.slots) SLOTDOC = { slots: { 1: SLOTDOC.S ? unwrapSlot(SLOTDOC.S) : null } };
    SLOTDOC.slots[n] = null;
    const id = await cloudUid();
    if (id) {
      const { error } = await sb.from("saves").upsert({ id, name: CUR, data: SLOTDOC, version: 1 });
      if (error) sbErr(error); else log(`🗑️ 云端存档槽 ${n} 已删除`);
    }
  }
  log(`🗑️ 本地存档槽 ${n} 已删除`);
  showSlotPicker();
}
function resetSlot() {
  if (!confirm(`确认清空当前存档槽（槽${curSlot}）并重新开始？\n\n云端该槽也会被覆盖为新档，不可恢复！\n⚠️ 注意：排行榜的累计成绩保留在云端榜单中，不会随清档消失。`)) return;
  localStorage.removeItem(saveKeyOf(CUR, curSlot));
  if (curSlot === 1) localStorage.removeItem(saveKeyOf(CUR));
  newGameState(); giveStarterGear(); refreshTasks(true); saveGame(); render();
  log(`🗑️ 存档槽 ${curSlot} 已重置，重新开始`);
}

