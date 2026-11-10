"use strict";
/* ============================================================
   ★ 模块 J-0：修仙风格装备命名数据库
   四层结构：品质前缀 + 装备系列 + 专属名称 + 档位信息
   规则：随机部件在生成时基于 uid 一次性固定并存档，
         品质/档位等确定性信息由纯函数组装，永不重新随机。
   随机使用独立 xorshift32，不消耗 Math.random()，
         因此掉落率、强化成功率、暴击等数值分布完全不受影响。
   ============================================================ */

/* 六大系列：只改显示名，不动 EQFAM.base / dt 等任何数值 */
const FAM_THEME = {
  iron: "玄铁", steel: "精钢", bow: "追风",
  staff: "星陨", leather: "灵革", robe: "星辉"
};

/* 12 档品质前缀（普通留空，沿用「品质·」格式） */
const Q_PREFIX = [
  "", "精良·", "闪耀·", "传奇·", "仙器·", "神器·",
  "鸿蒙·", "太初·", "无极·", "造化·", "天道·", "混沌·"
];

/* 四档名称池（按 reqLv 数值分档，与 LV_TIERS 对齐：1~95 / 120~249 / 275~400 / 425~500） */
const NAME_BAND = ["凡阶", "灵阶", "仙阶", "神阶"];
function nameBand(reqLv) {
  const v = +reqLv || 1;
  if (v < 100) return 0;
  if (v < 250) return 1;
  if (v < 425) return 2;
  return 3;
}
const nameBandName = (reqLv) => NAME_BAND[nameBand(reqLv)];

/* 专属名称核心词：6 部位 × 4 档位 × 6 词，越高档越有气势 */
const NAME_CORE = {
  weapon: [
    ["破军", "斩月", "裂石", "青锋", "断浪", "饮血"],
    ["穿云", "断岳", "惊雷", "逐日", "碎星", "寒霜"],
    ["九霄凌云", "天罡", "紫霄", "镇魂", "焚天", "寂灭"],
    ["太初开天", "万古不灭", "诸天镇世", "弑神诛仙", "灭世", "开天"]
  ],
  helmet: [
    ["守山", "玄岩", "铁壁", "凝霜", "镇岳", "苍云"],
    ["灵犀", "星目", "御风", "凝神", "逐月", "玄光"],
    ["九曜凌霄", "天罡", "紫霄", "玄穹", "归墟", "凌虚"],
    ["太初鸿蒙", "诸天镇世", "万古不灭", "无极", "天命", "开天"]
  ],
  armor: [
    ["守山", "玄岩", "铁壁", "磐石", "苍鳞", "厚土"],
    ["灵纹", "星纹", "御风", "凝霜", "逐月", "玄光"],
    ["天罡战", "九曜不灭", "紫霄", "凌霄", "玄武", "归墟"],
    ["太初鸿蒙", "诸天镇世", "万古不灭", "开天", "无极", "不灭"]
  ],
  boots: [
    ["踏云", "逐风", "履霜", "轻身", "穿林", "疾行"],
    ["凌波", "追月", "御风", "星驰", "飞燕", "流光"],
    ["九霄踏天", "紫霄凌虚", "缩地", "无影", "凌霄", "流云"],
    ["太初破界", "诸天逍遥", "万古不灭", "鸿蒙", "无极", "开天"]
  ],
  gloves: [
    ["擒龙", "裂石", "铁腕", "搏虎", "碎岩", "握霜"],
    ["灵爪", "星缚", "擒风", "御风", "逐月", "玄劲"],
    ["九曜裂天", "天罡", "紫霄", "镇魂", "焚天", "凌霄"],
    ["太初鸿蒙", "诸天镇世", "万古不灭", "弑神", "开天", "无极"]
  ],
  ring: [
    ["镇魂", "凝灵", "聚气", "守心", "玄纹", "纳福"],
    ["灵犀", "星曜", "通幽", "凝神", "逐月", "御风"],
    ["九霄镇世", "天罡", "紫霄", "九曜", "凌霄", "归墟"],
    ["太初鸿蒙", "诸天镇世", "万古不灭", "不灭", "无极", "开天"]
  ]
};

/* 六部位专属名称素材，同系列不同部位不重复 */
const SLOT_WORD = {
  weapon: ["剑", "刀", "枪", "弓", "杖"],
  helmet: ["盔", "冠", "兜", "冕"],
  armor: ["甲", "铠", "袍", "衣", "战甲"],
  boots: ["靴", "履", "战靴", "云履"],
  gloves: ["手套", "护手", "拳套"],
  ring: ["戒", "环", "佩", "坠"]
};

/* 随机前后缀与极稀有特殊称号 */
const NAME_PREFIX = ["嗜血", "破甲", "疾风", "雷霆", "幽冥", "九霄", "镇岳", "焚天", "无相", "寂灭", "疾影", "不灭"];
/* 后缀按部位适配：之刃/之怒偏武器，之翼偏鞋与手套，之魂/之心偏防具与首饰 */
const NAME_SUFFIX = {
  weapon: ["之刃", "之怒", "之魂", "之神", "之誓"],
  helmet: ["之魂", "之心", "之灵", "之誓"],
  armor: ["之心", "之魂", "之灵", "之誓"],
  boots: ["之翼", "之灵", "之誓"],
  gloves: ["之翼", "之刃", "之怒", "之誓"],
  ring: ["之魂", "之心", "之灵", "之神"]
};
const NAME_TITLE = ["弑神", "灭世", "开天", "镇世", "无双", "天命"];

/* 显现门槛：品质越高，越容易带前缀 / 后缀 / 称号；数值固定不随机 */
const PRE_RATE = [0, 0, 0.10, 0.16, 0.22, 0.30, 0.36, 0.42, 0.48, 0.55, 0.62, 0.70];
const SUF_RATE = [0, 0, 0.08, 0.12, 0.16, 0.20, 0.24, 0.28, 0.32, 0.36, 0.40, 0.45];
const TITLE_RATE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.18, 0.32, 0.60];

/* 独立 PRNG：基于装备 uid，绝不触碰 Math.random() */
function nameRng(seed) {
  let s = (Math.imul((seed | 0) ^ 0x9e3779b9, 2654435761) ^ 0x5bf03635) >>> 0;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
const namePick = (arr, rnd) => arr[Math.min(arr.length - 1, Math.floor(rnd() * arr.length))];

function nameRollPart(e, rnd) {
  const pool = SLOT_WORD[e.slot] || SLOT_WORD.weapon;
  let w;
  if (e.slot === "weapon") {
    if (e.fam === "bow") w = "弓";
    else if (e.fam === "staff") w = "杖";
    else if (e.fam === "iron" || e.fam === "steel" || e.fam === "leather" || e.fam === "robe") w = namePick(["剑", "刀", "枪"], rnd);
    else w = namePick(pool, rnd);
  } else w = namePick(pool, rnd);
  /* 神阶或极稀有：给单字部位加尊称，如 神杖 / 灵戒 / 玄冠 */
  const plain = ["剑", "刀", "枪", "弓", "杖", "盔", "冠", "兜", "冕", "甲", "铠", "袍", "衣", "靴", "履", "戒", "环", "佩", "坠"];
  if ((nameBand(e.reqLv) >= 3 || (e.rare || 0) >= 9) && plain.indexOf(w) >= 0) {
    w = namePick(["神", "灵", "圣", "玄"], rnd) + w;
  }
  return w;
}

/* 生成时调用一次：所有随机结果写入 nameParts，之后永不重 roll */
function makeNameParts(e) {
  const rnd = nameRng(e.uid == null ? 1 : e.uid);
  const band = nameBand(e.reqLv);
  const cores = NAME_CORE[e.slot] || NAME_CORE.weapon;
  return {
    v: 1,
    fam: FAM_THEME[e.fam] || "玄铁",
    core: namePick(cores[band], rnd),
    part: nameRollPart(e, rnd),
    pre: namePick(NAME_PREFIX, rnd),
    suf: namePick(NAME_SUFFIX[e.slot] || NAME_SUFFIX.weapon, rnd),
    title: namePick(NAME_TITLE, rnd),
    rPre: rnd(), rSuf: rnd(), rTitle: rnd(),
    band: band
  };
}

/* 纯函数组装：不含随机，任意时刻调用结果一致 */
function eqCoreName(e) {
  const p = e.nameParts;
  if (!p) return e.n || "装备";
  const r = e.rare || 0;
  const showPre = Array.from(p.core).length < 4 && p.rPre < (PRE_RATE[r] || 0);
  return (showPre ? p.pre : "") + p.core + p.part;
}
function eqShortName(e) {
  const p = e.nameParts;
  if (!p) return e.n || "装备";
  let s = p.fam + p.core + p.part;
  if (Array.from(s).length > 9) s = p.core + p.part;
  return s;
}
function eqFullName(e) {
  const p = e.nameParts;
  if (!p) return e.n || "装备";
  const r = e.rare || 0;
  const showPre = Array.from(p.core).length < 4 && p.rPre < (PRE_RATE[r] || 0);
  const showTitle = p.rTitle < (TITLE_RATE[r] || 0);
  const showSuf = !showTitle && p.rSuf < (SUF_RATE[r] || 0);
  return (Q_PREFIX[r] || "") + p.fam + (showPre ? p.pre : "")
    + p.core + p.part + (showTitle ? "·" + p.title : "") + (showSuf ? p.suf : "");
}
function eqFullTitle(e) {
  const rare = (typeof RARE_NAMES !== "undefined" && RARE_NAMES[e.rare]) ? RARE_NAMES[e.rare] : "";
  return eqFullName(e) + " ｜ " + rare + " · " + nameBandName(e.reqLv) + " · Lv" + e.reqLv + "档";
}

/* 品质 / 档位变化或旧存档迁移时调用：只重算缓存名，绝不重新随机 */
function refreshEqName(e) {
  if (!e) return;
  if (!e.nameParts || e.nameParts.v !== 1) e.nameParts = makeNameParts(e);
  e.n = eqFullName(e);
  return e.n;
}
