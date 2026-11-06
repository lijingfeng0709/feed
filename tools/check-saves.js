/* ============================================================
   银河牧场 · 存档同源只读诊断脚本
   用法：打开游戏页面 → F12 → Console → 整段粘贴 → 回车
   作用：列出浏览器里每个账号每个存档槽的关键成绩，判断是否有
        多份「同一份进度被复制到多个账号」的情况。
   注意：纯只读，不修改任何数据，不联网。
   ============================================================ */
(function () {
  var rows = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (!/^mr_save_/.test(k)) continue;
    try {
      var d = JSON.parse(localStorage.getItem(k));
      var s = (d && d.S) ? d.S : d;
      if (!s || !s.skills) continue;
      rows.push({
        存档: k,
        名字: s.name || "-",
        当世最高层: s.lifeBest || 0,
        累计层: s.cumFloor || 0,
        累计级: s.cumLv || 0,
        转生: s.reb || 0,
        当前等级和: Object.keys(s.skills).reduce(function (a, x) { return a + ((s.skills[x] && s.skills[x].lv) || 1); }, 0),
        保存时间: new Date(s.lastTick || 0).toLocaleString()
      });
    } catch (e) { /* 损坏的存档跳过 */ }
  }
  rows.sort(function (a, b) { return b.当世最高层 - a.当世最高层 || b.累计层 - a.累计层; });
  console.log("=== 本机全部存档（按进度排序）===");
  console.table(rows);

  // 同源判定：当世最高层 / 累计层 / 累计级 / 转生 四项完全一致
  var groups = {};
  rows.forEach(function (r) {
    var key = [r.当世最高层, r.累计层, r.累计级, r.转生].join("|");
    (groups[key] = groups[key] || []).push(r.存档);
  });
  var dup = Object.keys(groups).filter(function (k) { return groups[k].length > 1 && +k.split("|")[0] + +k.split("|")[1] > 0; });
  if (dup.length) {
    dup.forEach(function (k) {
      console.warn("⚠️ 发现成绩完全相同的多份存档（很可能是同一份进度被复制）：", k.split("|"), groups[k]);
    });
    console.warn("这些账号转生后会在排行榜出现完全相同的累计成绩。请只保留一个账号，其余账号用游戏内「🗑️ 重置存档槽」重开。");
  } else {
    console.log("✅ 未发现成绩完全相同的多份存档。");
  }
  console.log("游客进度已继承给：", localStorage.getItem("mr_guest_migrated_to") || "（尚无）");
  console.log("当前登录账号：", (typeof CUR !== "undefined" && CUR) || "（未进入游戏）",
              "｜当前存档槽：", (typeof curSlot !== "undefined" && curSlot) || "-");
  return rows;
})();
