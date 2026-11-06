"use strict";
/* ============================================================
   ★ 模块 Q：主循环
   ============================================================ */
let mkTimer = 0, saveT = 0, simAcc = 0, uiT = 0, afT = 0;
function simCore(sec) {
  if (S.teaMin > 0) S.teaMin = Math.max(0, S.teaMin-sec/60);
  if (S.xpMin > 0) S.xpMin = Math.max(0, S.xpMin-sec/60);
  if (S.buffHitMin > 0) S.buffHitMin = Math.max(0, S.buffHitMin-sec/60);
  if (S.buffCdMin > 0) S.buffCdMin = Math.max(0, S.buffCdMin-sec/60);
  if (S.buffInvMin > 0) S.buffInvMin = Math.max(0, S.buffInvMin-sec/60);
  tickQueue(sec); tickCombat(sec);
  mkTimer += sec;
  if (mkTimer > 60) { mkTimer = 0; mkDrift(); }
}
function loop() {
  if (!LOGGED_IN || !S) return;
  const now = Date.now();
  const real = Math.min((now-S.lastTick)/1000, 5);
  S.lastTick = now;
  saveT += real;
  if (saveT > 5) { saveT = 0; saveGame(); }
  afT += real;
  if (afT >= 1) { afT = 0; autoForgeTick(); }
  simAcc += real*(S.speed||1);
  let iter = 0;
  while (simAcc >= 1 && iter < 120) { simCore(1); simAcc -= 1; iter++; }
  if (iter >= 120) simAcc = 0;
  uiT++;
  if (!IS_MOBILE || uiT >= 3) {
    uiT = 0;
    const ae = document.activeElement;
    const busy = ae && (ae.tagName === "INPUT" || ae.tagName === "SELECT" || ae.tagName === "TEXTAREA");
    renderTop();
    if (!busy) renderPanel();
    pmAutoRefresh();
  }
}
setInterval(loop, 1000);
setInterval(() => { if (LOGGED_IN && CUR !== "guest") { fetchGlobalCfg(); claimMarket(); } }, 60000);
window.addEventListener("beforeunload", () => {
  if (LOGGED_IN && CUR !== "guest" && CLOUD_ON()) { try { cloudSave(); } catch (e) {} }
});

