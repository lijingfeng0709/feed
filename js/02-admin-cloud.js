"use strict";
/* ============================================================
   ★ 管理员账号回档
   ============================================================ */
let RB = null;
async function queryBackup() {
  if (!CLOUD_ON()) { log("⚠️ 云端未连接"); return; }
  const name = ($("rbUser") || {}).value || "";
  const nm = String(name).trim();
  if (!nm) { log("⚠️ 请输入要回档的账号名"); return; }
  log("⏳ 正在查询账号「" + nm + "」的云端备份点…");
  const { data: sv } = await sb.from("saves").select("id").eq("name", nm).maybeSingle();
  if (!sv || !sv.id) {
    RB = null;
    log("❌ 云端未找到账号「" + nm + "」的存档（需该账号用新版本在线保存过一次；游客账号无法回档）");
    renderPanel();
    return;
  }
  const { data: bks, error } = await sb.from("save_backups").select("data,created_at").eq("name", nm).order("created_at", { ascending: false }).limit(20);
  if (error) { sbErr(error); RB = null; renderPanel(); return; }
  RB = { name: nm, uid: sv.id, list: bks || [] };
  log(`📂 账号「${RB.name}」找到 ${RB.list.length} 个备份点${RB.list.length ? "，⭐=最接近一天前" : "（暂无备份，无法回档）"}`);
  renderPanel();
}
async function doRollback(created_at) {
  if (!RB) return;
  const bk = RB.list.find((b) => b.created_at === created_at);
  if (!bk) return;
  const ageH = ((Date.now() - new Date(bk.created_at)) / 3600000).toFixed(1);
  if (!confirm(`⚠️ 确认将账号「${RB.name}」回档到\n\n${new Date(bk.created_at).toLocaleString()}（${ageH} 小时前）？\n\n该玩家云端存档（全部存档槽）将被覆盖，其所有在线设备会被强制下线；该玩家下次登录应选择「云存档」。`)) return;
  log("⏳ 正在执行回档…");
  const { error } = await sb.from("saves").upsert({ id: RB.uid, name: RB.name, data: bk.data, version: 1 });
  if (error) { sbErr(error); return; }
  try { await sb.from("logins").delete().eq("id", RB.uid); } catch (e) {}
  log(`⏪ 账号「${RB.name}」已回档到 ${new Date(bk.created_at).toLocaleString()}（${ageH}小时前），其在线设备已被强制下线`);
  renderPanel();
}

/* ============================================================
   ★ 管理员账号充值/发放
   ============================================================ */
let AD_ACC = null;
async function adQueryAcc() {
  if (!CLOUD_ON()) { log("⚠️ 云端未连接"); return; }
  const nm = (($("adAcc") || {}).value || "").trim();
  if (!nm) { log("⚠️ 请输入账号名"); return; }
  const { data, error } = await sb.from("saves").select("id,data").eq("name", nm).maybeSingle();
  if (error) { sbErr(error); return; }
  if (!data || !data.data) {
    AD_ACC = null;
    const info = $("adAccInfo"); if (info) info.innerHTML = '<span style="color:#f66">❌ 云端未找到该账号</span>';
    log(`❌ 云端未找到账号「${nm}」的存档`);
    renderPanel();
    return;
  }
  AD_ACC = { name: nm, id: data.id, data: data.data };
  let doc = data.data;
  if (!doc.slots && doc.S) doc = { slots: { 1: unwrapSlot(doc.S) } };
  let g = 0, b = 0;
  const slots = doc.slots || {};
  for (const k in slots) { const s2 = slots[k] ? unwrapSlot(slots[k]) : null; if (s2) { g = Math.max(g, s2.gold||0); b = Math.max(b, s2.bell||0); } }
  const info = $("adAccInfo");
  if (info) info.innerHTML = `✅ <b style="color:#6f6">${nm}</b>｜💰最高${Math.floor(g).toLocaleString()}｜🔔最高${b}`;
  log(`✅ 已查询到账号「${nm}」（充值作用于其当前在线的存档槽，或槽1）`);
  renderPanel();
}
async function adCharge(kind) {
  if (!CLOUD_ON()) { log("⚠️ 云端未连接"); return; }
  if (!AD_ACC) { log("⚠️ 请先查询账号"); return; }
  const amt = Math.floor(+(( $(kind==="gold"?"adGold":"adBell") || {}).value) || 0);
  if (amt <= 0) { log("⚠️ 请输入有效的充值数量"); return; }
  let doc = AD_ACC.data;
  if (!doc.slots) doc = { slots: doc.S ? { 1: unwrapSlot(doc.S) } : {} };
  if (!doc.slots[1]) doc.slots[1] = { gold:0, bell:0, skills:{}, lanes:[], bag:{}, slotMap:{}, eq:{}, kills:{}, tasks:[], houses:{}, perks:{q:0,off:0,mk:0}, neidan:{lv:0,xp:0}, wing:{stage:0}, pots:[null,null,null,null,null], lastTick:Date.now() };
  const s1 = unwrapSlot(doc.slots[1]) || doc.slots[1];
  s1[kind] = Math.max(0, (s1[kind]||0)) + amt;
  doc.slots[1] = s1;
  log("⏳ 正在写入云端…");
  const { error } = await sb.from("saves").upsert({ id: AD_ACC.id, name: AD_ACC.name, data: doc, version: 1 });
  if (error) { sbErr(error); return; }
  try { await sb.from("logins").delete().eq("id", AD_ACC.id); } catch (e) {}
  log(`💰 已为「${AD_ACC.name}」存档槽1充值 ${kind==="gold"?"金币":"牛铃"} +${amt.toLocaleString()}（对方已被强制下线，重新登录选「云存档」生效）`);
  adQueryAcc();
}
async function adGrantEq() {
  if (!CLOUD_ON()) { log("⚠️ 云端未连接"); return; }
  if (!AD_ACC) { log("⚠️ 请先查询账号"); return; }
  const fam = $("adGFam").value, slot = $("adGSlot").value;
  const tier = +$("adGTier").value, rare = +$("adGRare").value;
  const plus = Math.min(ENH_MAX, Math.max(0, +$("adGPlus").value|0));
  const holes = Math.min(EQ_HOLES_MAX, Math.max(0, +$("adGHoles").value|0));
  const gemT = $("adGGem").value;
  let doc = AD_ACC.data;
  if (!doc.slots) doc = { slots: doc.S ? { 1: unwrapSlot(doc.S) } : {} };
  if (!doc.slots[1]) { log("❌ 对方存档槽1为空，无法发放"); return; }
  const d = unwrapSlot(doc.slots[1]) || doc.slots[1];
  doc.slots[1] = d;
  if (!d.slotMap) d.slotMap = {};
  if (!d.bag) d.bag = {};
  if (d.uid == null) d.uid = 1;
  const e = rollEq(fam, tier, slot, 0);
  e.rare = rare; e.n = PREFIX[rare]+e.n.replace(RARE_STRIP,"");
  e.plus = plus; e.lock = false;
  if (holes > 0) { e.holes = holes; e.gems = Array.from({length:holes}, ()=>gemT?{t:gemT,l:GEM_MAX}:null); }
  rollSpecials(e);
  e.uid = d.uid++;
  let placed = false;
  outer: for (let p = 0; p < MAX_PAGES; p++) for (let c = 0; c < PAGE_SIZE; c++) {
    const k = p+"_"+c;
    if (!d.slotMap[k]) { d.slotMap[k] = e; placed = true; break outer; }
  }
  if (!placed) { log("❌ 对方背包已满，无法发放"); return; }
  log("⏳ 正在发放装备到云端…");
  const { error } = await sb.from("saves").upsert({ id: AD_ACC.id, name: AD_ACC.name, data: doc, version: 1 });
  if (error) { sbErr(error); return; }
  try { await sb.from("logins").delete().eq("id", AD_ACC.id); } catch (e2) {}
  log(`🎁 已向「${AD_ACC.name}」存档槽1发放：${eqName(e)}【${RARE_NAMES[rare]}·Lv${tier}档】（对方重新登录选「云存档」生效）`);
}

