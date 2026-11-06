"use strict";
/* ============================================================
   ★ 模块 B：本地账号系统 + 管理员识别（哈希版）
   ============================================================ */
const ACC_KEY = "mr_accounts";
const SES_KEY = "mr_session";
const REM_KEY = "mr_remember";
const GUEST_MIG_KEY = "mr_guest_migrated_to";   // 游客进度只能被一个注册账号继承，防止一份进度复制成多个上榜账号
let CUR = null;
let LOGGED_IN = false;
let aMode = "login";

/* ★★★ 管理员识别（SHA-256 哈希）：全文件唯一需要配置的地方 ★★★
   使用方法：
   1) 打开游戏页面 → 按 F12 → Console 输入：genAdminHash("你的管理账号名") → 回车
   2) 复制输出的64位哈希，替换下面 ADMIN_HASH 引号里的 64 个 0，保存刷新
   3) 保持全 0 = 没有任何管理员（安全默认态） */
let IS_ADMIN = false;
const ADMIN_HASH = "a5b800e724c0530b8a59acd63b4aee763ef16b3776360f3ae353a28185deb143";
async function hashStr(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function genAdminHash(name) {
  const h = await hashStr(String(name).trim().toLowerCase());
  console.log("%c✅ 复制下面这一整行，替换源码中 ADMIN_HASH 引号里的 64 个 0：", "color:#ffd479;font-weight:bold");
  console.log(h);
  return h;
}
const isAdmin = () => IS_ADMIN;

function hashPw(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return "h" + h.toString(36) + s.length; }
function accs() { try { return JSON.parse(localStorage.getItem(ACC_KEY) || "{}"); } catch (e) { return {}; } }
function saveAccs(a) { localStorage.setItem(ACC_KEY, JSON.stringify(a)); }
function saveKeyOf(u, s) {
  const base = u === "guest" ? "mr_save_guest" : "mr_save_" + u;
  return s ? base + "_s" + s : base;
}

function saveRemember(u, p) { try { localStorage.setItem(REM_KEY, btoa(encodeURIComponent(JSON.stringify({ u, p })))); } catch (e) {} }
function getRemember() { try { const r = localStorage.getItem(REM_KEY); return r ? JSON.parse(decodeURIComponent(atob(r))) : null; } catch (e) { return null; } }
function clearRemember() { localStorage.removeItem(REM_KEY); }

function showAuth() {
  $("auth").classList.remove("hide");
  $("app").style.visibility = "hidden";
  $("aCloud").innerHTML = CLOUD_ON() ? '<span class="cloudOk">☁️ 云存档已连接</span>' : '<span class="cloudNo">☁️ 云存档未连接（检查网络）</span>';
}
function hideAuth() { $("auth").classList.add("hide"); $("app").style.visibility = "visible"; }
function authUI() {
  $("aTabLogin").className = aMode === "login" ? "on" : "";
  $("aTabReg").className = aMode === "reg" ? "on" : "";
  $("aGo").textContent = aMode === "login" ? "登录" : "注册并进入";
  $("aPname").style.display = aMode === "reg" ? "block" : "none";
  $("aMigRow").style.display = (aMode === "reg" && localStorage.getItem("mr_save_guest") && !localStorage.getItem(GUEST_MIG_KEY)) ? "flex" : "none";
  $("aMsg").textContent = ""; $("aMsg").className = "msg";
}
function authMsg(t, ok) { const e = $("aMsg"); e.textContent = t; e.className = "msg " + (ok ? "ok" : "err"); }

async function authGo() {
  const u = $("aUser").value.trim();
  const p = $("aPass").value;
  const A = accs();
  if (aMode === "login") {
    if (!u) { authMsg("❌ 请输入用户名"); return; }
    authMsg("⏳ 正在登录并同步云端存档…", true);
    let ok = false, errMsg = "";
    try {
      ok = await cloudSignIn(u, p);
    } catch (e) {
      console.error("登录异常", e);
      errMsg = (e && e.message) || String(e);
      log("⚠️ 登录过程出现异常：" + errMsg);
    }
    if (!ok) {
      const localAcc = A[u];
      if (localAcc && localAcc.ph !== undefined && localAcc.ph === hashPw(p)) {
        // 云端登录失败时旧会话可能仍在：必须清掉，否则 cloudUid() 仍指向上一个账号，
        // showSlotPicker 会把它的云端存档灌进本账号，造成跨账号串档
        try { await cloudSignOut(); } catch (e) {}
        ok = true;
        log("ℹ️ 云端登录未成功，已用本地账号记录进入（离线模式，云同步暂不可用）");
      } else if (localAcc && localAcc.ph !== undefined) {
        authMsg("❌ 密码错误" + (errMsg ? "（云端提示：" + errMsg + "）" : ""), false);
        return;
      } else {
        authMsg("❌ 登录失败" + (errMsg ? "：" + errMsg : "：账号不存在或云端不可用"), false);
        return;
      }
    }
    doLogin(u);
    if ($("aRemember").checked) saveRemember(u, p); else clearRemember();
    authMsg("✅ 登录成功，请选择存档槽", true);
    setTimeout(showSlotPicker, 300);
  } else {
    const pn = $("aPname").value.trim();
    if (u.length < 2) { authMsg("❌ 用户名至少2个字符"); return; }
    if (!PN_RE.test(pn)) { authMsg("❌ 玩家名字需2~10位中文/字母/数字/下划线（排行榜显示，全服唯一）"); return; }
    if (p.length < 6) { authMsg("❌ 密码至少6位（云端账号要求）"); return; }
    if (A[u]) { authMsg("❌ 该用户名已被注册"); return; }
    authMsg("⏳ 正在检查名字可用性…", true);
    try {
      const { data: free, error: fe } = await sb.rpc("check_pname_free", { p_pname: pn });
      if (fe) throw fe;
      if (free === false) { authMsg("❌ 玩家名字「" + pn + "」已被占用，请换一个"); return; }
    } catch (e) {
      authMsg("⚠️ 名字检查未完成（继续注册，占用时稍后可在账号页改名）：" + ((e && e.message) || e), false);
    }
    authMsg("⏳ 正在注册云端账号…", true);
    let ok = false;
    try {
      ok = await cloudSignUp(u, p);
    } catch (e) {
      console.error("注册异常", e);
      authMsg("❌ 注册过程出现异常：" + ((e && e.message) || e), false);
      return;
    }
    if (!ok) {
      const cur = $("aMsg").textContent || "";
      if (!cur || cur.indexOf("⏳") === 0) authMsg("❌ 云端注册失败，请检查网络后重试", false);
      return;
    }
    try { await cloudSignIn(u, p); } catch (e) {}
    try {
      const { error: pnErr } = await sb.rpc("claim_pname", { p_pname: pn, p_slot: 1, p_is_rename: false });
      if (pnErr) throw pnErr;
      MY_PN[1] = pn;
      log(`🪪 玩家名字「${pn}」注册成功（排行榜与玩家市场显示此名字）`);
    } catch (e) {
      log("⚠️ 玩家名字占用失败：" + (e.message || e) + "——账号已创建，可稍后在「账号」页设置名字");
    }
    const guestRaw = localStorage.getItem("mr_save_guest");
    if ($("aMigRow").style.display !== "none" && $("aMig").checked && guestRaw) {
      const owner = localStorage.getItem(GUEST_MIG_KEY);
      if (owner && owner !== u) {
        log("⚠️ 游客进度已由账号「" + owner + "」继承，本次不再重复继承（避免同一进度复制到多个账号刷榜）");
      } else if (!localStorage.getItem(saveKeyOf(u, 1))) {
        localStorage.setItem(saveKeyOf(u, 1), guestRaw);
        localStorage.setItem(GUEST_MIG_KEY, u);
        log("✅ 游客进度已继承到账号「" + u + "」存档槽1（同一份游客进度仅可继承一次）");
      }
    }
    A[u] = { ph: hashPw(p), created: Date.now() };
    saveAccs(A);
    doLogin(u);
    if ($("aRemember").checked) saveRemember(u, p); else clearRemember();
    authMsg("✅ 注册成功，请选择存档槽", true);
    setTimeout(showSlotPicker, 300);
  }
}

function authGuest() { doLogin("guest"); showSlotPicker(); }
function doLogin(u) {
  if (typeof lbReset === "function") lbReset();   // 换账号时清空榜单缓存，避免串到上一个账号
  SLOTDOC = null;                                 // 清空上一个账号的云端存档快照，防止 chooseSlot 把它写进新账号
  if (u === "guest") LOGIN_UID = null;            // 游客入口不经过 cloudSignIn，主动解绑云端身份
  CUR = u; LOGGED_IN = true;
  IS_ADMIN = false;
  curSlot = +(localStorage.getItem("mr_slot_" + u) || 1);
  localStorage.setItem(SES_KEY, u);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    hashStr(String(u).trim().toLowerCase()).then((h) => {
      if (h === ADMIN_HASH) {
        IS_ADMIN = true;
        log("👑 已识别为管理员账号：管理员与数值配置页已解锁，全局配置可发布");
        if (S) { renderSpd(); render(); }
      }
    }).catch(() => {});
  }
}
function logout() {
  saveGame(); cloudSignOut();
  if (typeof lbReset === "function") lbReset();
  if (pmSub) { try { sb.removeChannel(pmSub); } catch (e) {} pmSub = null; }
  CUR = null; LOGGED_IN = false; SLOTDOC = null; IS_ADMIN = false;
  MY_PN = { 1:null, 2:null, 3:null };
  localStorage.removeItem(SES_KEY);
  clearRemember();
  $("aUser").value = ""; $("aPass").value = ""; $("aPname").value = "";
  showAuth(); authUI();
}
function initAuth() {
  showAuth(); authUI();
  const rem = getRemember();
  if (rem) {
    $("aUser").value = rem.u;
    $("aPass").value = rem.p;
    $("aRemember").checked = true;
    authMsg("✅ 已填入记住的账号密码，点击「登录」即可进入", true);
  }
}
function enterGame() {
  const had = loadGame();
  if (!had) {
    newGameState(); giveStarterGear(); refreshTasks(true);
    log(`欢迎，${CUR === "guest" ? "游客" : CUR}！存档槽 ${curSlot} 已创建，赠送新手装备一套。`);
  } else { log(`欢迎回来，${CUR === "guest" ? "游客" : CUR}！（存档槽 ${curSlot}）`); }
  log(IS_MOBILE ? "📱 已识别为手机端，使用手机布局" : "🖥️ 已识别为电脑端，使用桌面布局");
  if (!Object.keys(MK).length) mkSeed();
  offline(); hideAuth(); renderSpd(); render();
  fetchGlobalCfg().then(() => { if (LOGGED_IN) { S.monHp = curMon().hp; renderSpd(); render(); } });
  claimMarket();
  fetchMyPnames();
}

