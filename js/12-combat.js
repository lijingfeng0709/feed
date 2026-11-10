"use strict";
/* ============================================================
   ★ 模块 M：战斗引擎
   ============================================================ */
let atkCd = 0, monCd = 0, lastFloorLog = 0;
function tickPots(dt) {
  const p = P();
  for (const slot of S.pots) {
    if (!slot || !slot.id) continue;
    const it = IT[slot.id]; if (!it) continue;
    let ok = false;
    if (slot.cond === "cd") { slot.t = (slot.t == null ? slot.val : slot.t)-dt; if (slot.t > 0) continue; slot.t = slot.val; ok = true; }
    else if (slot.cond === "mp") ok = S.mp < p.maxMp*(slot.val||30)/100;
    else ok = S.hp < p.maxHp*(slot.val||30)/100;
    if (!ok) continue;
    if (!bagN(slot.id)) continue;
    if (!take(slot.id, 1)) continue;
    let used = false;
    if (it.heal) { S.hp = Math.min(p.maxHp, S.hp+it.heal); used = true; }
    if (it.mp) { S.mp = Math.min(p.maxMp, S.mp+it.mp); used = true; }
    if (XPIT[slot.id]) { S.xpMult = XPIT[slot.id].m; S.xpMin = XPIT[slot.id].mm; used = true; }
    if (POTBUFF[slot.id]) {
      const b = POTBUFF[slot.id];
      if (b.k === "hit") { S.buffHit = b.v; S.buffHitMin = b.mm; }
      else if (b.k === "inv") { S.buffInv = b.v; S.buffInvMin = b.mm; }
      else { S.buffCd = b.v; S.buffCdMin = b.mm; }
      used = true;
    }
    if (used) log(`🧪 消耗品格子自动使用 ${it.n}`);
  }
}
function tickCombat(dt) {
  const cl = combatLane(); if (!cl) return;
  const q = cl.items[0];
  const m = curMon();
  const p = P();
  S.hp = Math.min(S.hp, p.maxHp); S.mp = Math.min(S.mp, p.maxMp);
  tickPots(dt);
  if (S.deadUntil > 0) { if (isDead()) return; reviveNow(); log(`✨ 复活完成！血量法力已回满，继续战斗。`); }
  if (S.hp < p.maxHp*S.autoHp/100 && bagN("bread")) { take("bread",1); S.hp = Math.min(p.maxHp,S.hp+IT.bread.heal); return; }
  if (S.hp < p.maxHp*S.autoHp/100 && bagN("cake")) { take("cake",1); S.hp = Math.min(p.maxHp,S.hp+IT.cake.heal); return; }
  if (S.mp < p.maxMp*S.autoMp/100 && bagN("coffee")) { take("coffee",1); S.mp = Math.min(p.maxMp,S.mp+IT.coffee.mp); return; }
  else if (S.mp < p.maxMp*S.autoMp/100 && bagN("tea")) { take("tea",1); S.mp = Math.min(p.maxMp,S.mp+IT.tea.mp); return; }
  if (S.hp <= 0) {
    S.deadUntil = Date.now()+RESPAWN_TIME*1000; S.hp = 0; S.mp = 0;
    if (S.endless) {
      const old = S.floor; S.floor = Math.max(1, S.floor-5);
      S.floorStart = Date.now();
      log(`💀 你在无尽模式被 ${m.n} 击倒！${RESPAWN_TIME}秒后复活，层数 ${old}→${S.floor}（-5）`);
    } else { log(`💀 你被 ${m.n} 击倒了！${RESPAWN_TIME}秒后复活…`); }
    S.monHp = curMon().hp; return;
  }
  if (S.endless) {
    if (!S.floorStart) S.floorStart = Date.now();
    if (Date.now() - S.floorStart > FLOOR_LIMIT*1000) {
      const old = S.floor;
      S.floor = Math.max(1, S.floor-5);
      S.floorStart = Date.now();
      S.monHp = endlessMon(S.floor).hp;
      atkCd = 0; monCd = 1.0;
      log(`⏰ 限时失败！${FLOOR_LIMIT/60}分钟内未能击败第 ${old} 层，自动降至第 ${S.floor} 层`);
      return;
    }
  }
  atkCd -= dt; monCd -= dt;
  const atkInt = Math.max(0.1, 1.5/(1+p.aspd/100));
  const cdm = p.critDmg + (S.buffCdMin > 0 ? S.buffCd : 0);
  let guard = 0;
  while (atkCd <= 0 && S.monHp > 0 && guard++ < 40) {
    atkCd += atkInt;
    const st = S.style;
    if (st === "magic" && S.mp < 2) continue;
    if (st === "magic") S.mp -= 2;
    const myAcc = st==="melee"?p.acc:st==="ranged"?p.rng:p.mag;
    const mEv = st==="melee"?(S.eq.weapon&&S.eq.weapon.dmgT==="slash"?m.evS:S.eq.weapon&&S.eq.weapon.dmgT==="blunt"?m.evB:m.evT):st==="ranged"?m.evR:m.evM;
    const hitOk = (S.buffHitMin > 0) || (Math.random() < hitRate(myAcc, mEv));
    if (hitOk) {
      let dmg = Math.max(1, Math.floor(p.pow*(0.8+Math.random()*0.4)));
      if (Math.random()*100 < p.crit) {
        dmg = Math.max(1, Math.floor(dmg*cdm/100));
        if (dmg > m.hp*0.5) log(`💥 暴击！造成 ${dmg} 伤害（暴伤 ${cdm}%${S.buffCdMin>0?"（神水加成中）":""}）`);
      }
      S.monHp -= dmg;
      if (p.ls > 0) S.hp = Math.min(p.maxHp, S.hp + Math.max(1, Math.floor(p.maxHp*p.ls/100)));
      if (S.monHp <= 0) { killMon(m, q, cl); break; }
    }
  }
  if (monCd <= 0 && S.monHp > 0 && !isDead()) {
    monCd = 1.8;
    if (S.buffInvMin > 0) return;
    if (Math.random() < hitRate(m.atk, p.eva)) {
      S.hp -= Math.max(1, Math.floor(m.atk*(1-dmgReduce(p.def, m.atk))*(0.8+Math.random()*0.4)));
      if (S.hp <= 0) S.hp = 0;
    }
  }
}
function dropRareMat(f) {
  const drops = [[60,"xianGu",0.08],[100,"xianYu",0.05],[200,"soul",0.03],[300,"shenShi",0.02]];
  for (const [min,id,ch] of drops) {
    if (f >= min && Math.random() < ch) { if (addIt(id,1)) log(`✨ 无尽第${f}层掉落稀有材料 ${IT[id].ic}${IT[id].n}×1！`); }
  }
  if (f >= 500 && Math.random() < 0.05) { if (addIt("punch",1)) log(`🔨 无尽第${f}层掉落打孔锥×1！`); }
  if (f >= 1000 && Math.random() < 0.04) {
    const t = ["atk","def","hp","critDmg"][Math.random()*4|0];
    const l = Math.min(GEM_DROP_CAP, 1+Math.floor((f-1000)/50));
    const id = `gem_${t}_${l}`;
    if (addIt(id,1)) log(`💎 无尽第${f}层掉落 ${IT[id].n}（+${gemVal(t,l)}${t==="critDmg"?"%":""}${l>=GEM_DROP_CAP?"｜掉落已封顶，更高只能合成":""}）！`);
  }
  const NM = [[1500,"xingSui",0.05],[1800,"yunTie",0.04],[2100,"longJin",0.03],[2500,"fengYu",0.025],[2900,"daoZe",0.02],[3300,"hunDunJing",0.015]];
  for (const [min,id,ch] of NM) {
    if (f >= min && Math.random() < ch) { if (addIt(id,1)) log(`✨ 无尽第${f}层掉落 ${IT[id].ic}${IT[id].n}×1！（高级锻造材料）`); }
  }
  if (f >= 1500 && Math.random() < 0.04) {
    const g = f >= 3000 ? 4 : f >= 2500 ? 3 : f >= 2000 ? 2 : 1;
    const id = "xingHui"+g;
    if (addIt(id,1)) log(`💠 无尽第${f}层掉落 ${IT[id].ic}${IT[id].n}×1！（可兑换 ${GOLD_REDEEM[id].toLocaleString()}💰）`);
  }
  if (Math.random() < 0.05) { if (addIt("yaoDan",1)) log(`🧿 无尽第${f}层掉落妖丹×1！（内丹材料 +1经验）`); }
  if (f >= 1000 && Math.random() < 0.03) { if (addIt("diLingDan",1)) log(`💊 无尽第${f}层掉落地灵丹×1！（内丹材料 +10经验）`); }
  if (f >= 2500 && Math.random() < 0.02) { if (addIt("tianYuanDan",1)) log(`🏮 无尽第${f}层掉落天元丹×1！（内丹材料 +100经验）`); }
  if (f >= 300 && Math.random() < 0.10) { if (addIt("yuLing",1)) log(`🕊️ 无尽第${f}层掉落羽翎×1！（翅膀升阶材料）`); }
}
function dropZoneGem(i) {
  const z = Math.min(9, (i/10)|0);
  if (z < 5) return;
  if (Math.random() >= 0.05) return;
  const t = ["atk","def","hp","critDmg"][Math.random()*4|0];
  const l = Math.min(11, zoneGemLv(z) + (Math.random()*3|0));
  const id = `gem_${t}_${l}`;
  if (addIt(id,1)) log(`💎 ${ELE[z]}怪物掉落 ${IT[id].n}（+${gemVal(t,l)}${t==="critDmg"?"%":""}）！`);
}
function rollHighRare(i) {
  const r = Math.random();
  const p5 = i >= 88 ? (i-88)*0.0012 : 0;
  const p4 = i >= 68 ? (i-68)*0.0015 : 0;
  const p3 = i >= 50 ? Math.min(0.25,(i-50)*0.005) : 0;
  if (r < p5) return 5;
  if (r < p5+p4) return 4;
  if (r < p5+p4+p3) return 3;
  return 0;
}
function dropEq(m) {
  const fam = ["iron","steel","bow","staff","leather","robe"][Math.random()*6|0];
  const e = rollEq(fam, m.eqLv, null, m.rb);
  let rr = rollHighRare(m.i < 10000 ? m.i : 99);
  if (S.endless && S.floor >= 1500 && Math.random() < 0.02) {
    const fq = Math.min(11, 6 + Math.floor((S.floor-1500)/400));
    const q = Math.min(fq, maxRare());
    if (q > rr) rr = q;
  }
  rr = Math.min(rr, maxRare());
  if (rr > e.rare) { e.rare = rr; refreshEqName(e); rollSpecials(e); }
  const hp = m.hp;
  if (S.endless) e.plus = Math.min(ENH_MAX, Math.floor(hp/8000*Math.random()));
  else e.plus = Math.min(ENH_DROP_CAP, Math.floor(hp/2500*Math.random()));
  addEq(e);
  if (e.rare >= 3) log(`🌟 掉落 ${RARE_NAMES[e.rare]}品质 ${eqName(e)}（+${e.plus}）！`);
}
function killMon(m, q, lane) {
  S.gold += m.gold; q.n--;
  const st = S.style;
  if (st === "melee") { addXp("acc", m.xp*0.5); addXp("pow", m.xp*0.5); }
  if (st === "ranged") { addXp("rng", m.xp); addXp("acc", m.xp*0.15); }
  if (st === "magic") { addXp("mag", m.xp); addXp("acc", m.xp*0.12); }
  ["def","hp","eva"].forEach((k)=>addXp(k, m.xp*0.25));
  if (Math.random() < m.drop) dropEq(m);
  if (!S.endless && Math.random() < 0.05) {
    const n = m.i >= 90 ? 3 : 1;
    if (addIt("yaoDan", n)) log(`🧿 ${m.n} 掉落妖丹×${n}（内丹材料 +${n}经验）`);
  }
  if (S.endless) {
    dropRareMat(S.floor);
    S.floorKills[S.floor] = (S.floorKills[S.floor]||0)+1;
    if (S.floor > (S.lifeBest||0)) S.lifeBest = S.floor;
    S.floorStart = Date.now();
    if (S.autoNext !== false) {
      S.floor++;
      if (S.floor > S.bestFloor) { S.bestFloor = S.floor; if (S.bestFloor%100 === 0) log(`🌌 无尽模式：突破第 ${S.bestFloor} 层大关！`); }
    } else {
      if (Date.now()-lastFloorLog > 3000) { log(`🌌 第 ${S.floor} 层通关（累计 ${S.floorKills[S.floor]} 次），停留本层`); lastFloorLog = Date.now(); }
    }
    S.monHp = endlessMon(S.floor).hp;
    if (q.n <= 0) lane.items.shift();
    return;
  }
  dropZoneGem(m.i);
  S.kills[m.i+"-"+m.lv] = (S.kills[m.i+"-"+m.lv]||0)+1;
  S.monHp = mon(S.monI, S.monLv).hp;
  if (q.n <= 0) lane.items.shift();
}

