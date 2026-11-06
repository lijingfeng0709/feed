"use strict";
/* ============================================================
   ★ 模块 D：17 技能
   ============================================================ */
const SK = [
  {id:"milking",n:"挤奶",ic:"🐄",cat:"收集"},{id:"gather",n:"采集",ic:"🌿",cat:"收集"},{id:"wood",n:"伐木",ic:"🪓",cat:"收集"},
  {id:"smith",n:"铁匠",ic:"🔨",cat:"匠造"},{id:"carp",n:"木匠",ic:"🪚",cat:"匠造"},{id:"tailor",n:"裁缝",ic:"🧵",cat:"匠造"},
  {id:"cook",n:"厨艺",ic:"🍳",cat:"厨艺"},{id:"brew",n:"冲泡",ic:"🫖",cat:"厨艺"},
  {id:"alch",n:"炼金",ic:"⚗️",cat:"炼制"},{id:"enh",n:"强化",ic:"✨",cat:"炼制"},
  {id:"acc",n:"攻击",ic:"🎯",cat:"战斗"},{id:"pow",n:"力量",ic:"💪",cat:"战斗"},{id:"def",n:"防御",ic:"🛡️",cat:"战斗"},
  {id:"hp",n:"生命",ic:"❤️",cat:"战斗"},{id:"rng",n:"远程",ic:"🏹",cat:"战斗"},{id:"eva",n:"闪避",ic:"💨",cat:"战斗"},{id:"mag",n:"魔法",ic:"🔮",cat:"战斗"}
];
const SKM = {}; SK.forEach((s) => { SKM[s.id] = s; });
const COMBAT_SK = ["acc","pow","def","hp","rng","eva","mag"];

/* ============================================================
   ★ 模块 E：动作列表
   ============================================================ */
const ACT = [
  {id:"milk1",sk:"milking",n:"挤牛奶",lv:1,xp:70,t:3,out:{milk:1}},
  {id:"milk2",sk:"milking",n:"挤星绒牛",lv:20,xp:200,t:4,out:{starMilk:1}},
  {id:"g1",sk:"gather",n:"采草药",lv:1,xp:65,t:3,out:{herb:1}},
  {id:"g2",sk:"gather",n:"采亚麻",lv:12,xp:130,t:3.5,out:{flax:1}},
  {id:"g3",sk:"gather",n:"采矿石",lv:25,xp:260,t:4,out:{ore:1}},
  {id:"w1",sk:"wood",n:"砍原木",lv:1,xp:60,t:3,out:{log:1}},
  {id:"w2",sk:"wood",n:"砍橡木",lv:15,xp:180,t:4,out:{oak:1}},
  {id:"s1",sk:"smith",n:"锻铁锭",lv:1,xp:90,t:3,inp:{ore:2},out:{ingot:1}},
  {id:"s2",sk:"smith",n:"锻造铁装（武器/手套/首饰）",lv:15,xp:260,t:5,inp:{ingot:3},outEq:"iron",slots:["weapon","gloves","ring"]},
  {id:"s3",sk:"smith",n:"锻造钢装（武器/手套/首饰）",lv:40,xp:600,t:7,inp:{ingot:5},outEq:"steel",slots:["weapon","gloves","ring"]},
  {id:"c1",sk:"carp",n:"制木板",lv:1,xp:85,t:3,inp:{log:2},out:{plank:1}},
  {id:"c2",sk:"carp",n:"制猎风弓（远程武器）",lv:20,xp:300,t:5,inp:{plank:3},outEq:"bow",slots:["weapon"]},
  {id:"c3",sk:"carp",n:"制星辰杖（魔法武器）",lv:45,xp:650,t:7,inp:{plank:4,oak:1},outEq:"staff",slots:["weapon"]},
  {id:"t1",sk:"tailor",n:"纺布",lv:1,xp:85,t:3,inp:{flax:2},out:{cloth:1}},
  {id:"t2",sk:"tailor",n:"缝皮革装（头盔/护甲/鞋子）",lv:18,xp:280,t:5,inp:{cloth:3},outEq:"leather",slots:["helmet","armor","boots"]},
  {id:"t3",sk:"tailor",n:"缝星光装（头盔/护甲/鞋子）",lv:42,xp:620,t:7,inp:{cloth:4},outEq:"robe",slots:["helmet","armor","boots"]},
  {id:"k1",sk:"cook",n:"烤面包",lv:1,xp:95,t:3,inp:{milk:1,herb:1},out:{bread:1}},
  {id:"k2",sk:"cook",n:"做蛋糕",lv:15,xp:220,t:4,inp:{milk:2,bread:1},out:{cake:1}},
  {id:"k3",sk:"cook",n:"太空蛋糕",lv:50,xp:700,t:6,inp:{starMilk:2,cake:1},out:{spaceCake:1}},
  {id:"b1",sk:"brew",n:"泡茶",lv:1,xp:90,t:3,inp:{herb:1},out:{tea:1}},
  {id:"b2",sk:"brew",n:"煮咖啡",lv:20,xp:240,t:4,inp:{herb:2,milk:1},out:{coffee:1}},
  {id:"b3",sk:"brew",n:"效率茶",lv:40,xp:520,t:6,inp:{tea:2,starMilk:1},out:{effTea:1}},
  {id:"b4",sk:"brew",n:"酿经验咖啡Ⅰ(+20%)",lv:30,xp:400,t:8,inp:{coffee:2,sage:1},out:{xpC1:2}},
  {id:"b5",sk:"brew",n:"酿经验咖啡Ⅱ(+50%)",lv:50,xp:700,t:10,inp:{coffee:3,effTea:1},out:{xpC2:2}},
  {id:"b6",sk:"brew",n:"酿经验咖啡Ⅲ(+100%)",lv:70,xp:1200,t:14,inp:{coffee:4,sage:2},out:{xpC3:1}},
  {id:"b7",sk:"brew",n:"酿经验咖啡Ⅳ(+200%)",lv:90,xp:2000,t:18,inp:{coffee:5,sage:4,starMilk:5},out:{xpC4:1}},
  {id:"b8",sk:"brew",n:"酿百发神水(命中100%/20分)",lv:85,xp:3000,t:30,inp:{coffee:10,sage:10,soul:2},out:{hitPot:1}},
  {id:"b9",sk:"brew",n:"酿弑神狂暴水(暴伤+10万%/20分)",lv:95,xp:4500,t:40,inp:{starMilk:20,sage:10,shenShi:2},out:{critPot:1}},
  {id:"a1",sk:"alch",n:"点金",lv:1,xp:100,t:4,inp:{herb:2},gold:15},
  {id:"a2",sk:"alch",n:"材料转化",lv:25,xp:300,t:5,inp:{ore:3},out:{ingot:2}},
  {id:"a3",sk:"alch",n:"贤者之石",lv:60,xp:900,t:10,inp:{ingot:3,starMilk:2},out:{sage:1}},
  {id:"a4",sk:"alch",n:"炼仙骨",lv:75,xp:1500,t:20,inp:{sage:3,starMilk:10},out:{xianGu:1}},
  {id:"a5",sk:"alch",n:"凝仙玉",lv:80,xp:1800,t:22,inp:{sage:2,effTea:5},out:{xianYu:1}},
  {id:"a6",sk:"alch",n:"炼灵魂",lv:90,xp:2500,t:28,inp:{sage:5,spaceCake:10},out:{soul:1}},
  {id:"a7",sk:"alch",n:"凝神石",lv:100,xp:3500,t:35,inp:{soul:2,sage:5},out:{shenShi:1}}
];

/* ============================================================
   ★ 模块 F：装备定义
   ============================================================ */
const EQFAM = {
  iron:{n:"铁",base:8}, steel:{n:"钢",base:26}, bow:{n:"猎风",base:20,dt:"ranged"},
  staff:{n:"星辰",base:22,dt:"magic"}, leather:{n:"皮革",base:14}, robe:{n:"星光",base:30}
};
const SLOTS = [
  {id:"weapon",n:"武器",ic:"⚔️"},{id:"helmet",n:"头盔",ic:"⛑️"},
  {id:"armor",n:"护甲",ic:"🛡️"},{id:"boots",n:"鞋子",ic:"🥾"},
  {id:"gloves",n:"手套",ic:"🧤"},{id:"ring",n:"首饰",ic:"💍"}
];
const EQIC = {weapon:"⚔️",helmet:"⛑️",armor:"🛡️",boots:"🥾",gloves:"🧤",ring:"💍"};

/* ============================================================
   ★ 模块 G：怪物定义
   ============================================================ */
const ELE = ["炼气","筑基","金丹","元婴","化神","炼虚","合体","大乘","渡劫","真仙"];
const CRE = [
  [["野猪","🐗"],["灰狼","🐺"],["毒蛇","🐍"],["山魈","👹"],["妖狐","🦊"],["黑熊","🐻"],["骷髅","💀"],["僵尸","🧟"],["鬼火","🔥"],["石鬼","🗿"]],
  [["赤炎炎炎蜥","🦎"],["铁甲犀","🦏"],["噬魂蝠","🦇"],["千年藤妖","🌿"],["幽泉水鬼","💧"],["沙海毒蝎","🦂"],["风刃鹰","🦅"],["地穴魔蛛","🕷️"],["血目枭","🦉"],["腐骨尸王","🧟"]],
  [["雷劫虎","🐯"],["玄冰蟒","🐍"],["烈焰鸦","🔥"],["噬金鼠","🐹"],["迷魂貂","🦦"],["九幽猫","🐈"],["断岳猿","🦍"],["缚魂傀儡","🎎"],["紫电貂","⚡"],["三首蛟","🐉"]],
  [["青冥龙","🦕"],["碧眼尸魔","🧟"],["万蛊母虫","🐛"],["幽冥犬","🐕"],["摄魂使者","👁️"],["血河老祖","🩸"],["白骨将军","☠️"],["阴风鬼将","👻"],["九头蛇君","🐍"],["幻蝶仙子","🦋"]],
  [["焚天麒麟","🔥"],["玄冥龟兽","🐢"],["金翅大鹏","🦅"],["吞天巨蟒","🐍"],["血魔鲨祖","🦈"],["灭世魔猿","🦍"],["幽冥火凤","🔥"],["紫金貔貅","🐅"],["混沌凶兽","🌀"],["天雷古兽","⚡"]],
  [["虚空影魔","🌑"],["噬星妖兽","⭐"],["蚀魂阴灵","👻"],["九幽冥龙","🐉"],["灭魂使者","☠️"],["裂空巨兽","🕳️"],["轮回魔蝶","🦋"],["湮灭毒蛾","🦋"],["太阴玉蟾","🐸"],["夺魄妖姬","🎭"]],
  [["合欢老魔","😈"],["炼狱魔君","👺"],["星辰巨兽","🌠"],["幽泉魔尊","🌊"],["万剑魔灵","⚔️"],["噬魂古兽","🦴"],["无相天魔","🎭"],["血月狼王","🐺"],["九婴古兽","🐍"],["焚岳魔猿","🌋"]],
  [["大乘魔僧","🧘"],["天罚雷灵","⚡"],["寂灭使者","🕯️"],["九转蛟王","🐉"],["幽冥殿主","👑"],["血海魔尊","🌊"],["碎星魔将","💫"],["万鬼之主","👻"],["湮海神兽","🐋"],["弑仙魔猿","🐵"]],
  [["渡劫魔龙","🐲"],["天劫雷兽","⚡"],["灭世黑凤","🦅"],["吞天蛤蟆","🐸"],["弑神剑灵","🗡️"],["九幽阎罗","👹"],["无量魔佛","😇"],["混沌古神","🌀"],["红莲业火","🔥"],["劫云魔主","☁️"]],
  [["真仙剑侍","⚔️"],["仙宫神将","🏛️"],["天蓬元帅","🐷"],["哮天神犬","🐕"],["雷部正神","⚡"],["太上长老","🧓"],["无极天尊","🌀"],["紫薇大帝","👑"],["斗战胜佛","🐒"],["道祖虚影","☯️"]]
];
const RESPAWN_TIME = 30;
function diff() { return cfg("diff"); }
function atkCf() { return cfg("monAtkCf"); }
function rebCf() { return Math.pow(1 + cfg("rebMonCf"), (S && S.reb) ? S.reb : 0); }
function mon(i, lv) {
  const L = lv - 1; const b = i; const D = diff(); const R = rebCf();
  const z = Math.min(9, (i/10)|0); const c = i%10;
  const eqT = Math.min(13, Math.floor(b/100*14));
  return { i, lv, n: ELE[z] + "·" + CRE[z][c][0], ic: CRE[z][c][1],
    hp: Math.floor(60*Math.pow(1.07,b)*Math.pow(1.7,L)*Math.pow(D,1.5)*R),
    atk: Math.floor(4*Math.pow(1.045,b)*Math.pow(1.4,L)*Math.pow(D,1.2)*atkCf()*R),
    evT: Math.floor(8*Math.pow(1.04,b)*Math.pow(D,0.6)*R), evS: Math.floor(10*Math.pow(1.04,b)*Math.pow(D,0.6)*R),
    evB: Math.floor(7*Math.pow(1.04,b)*Math.pow(D,0.6)*R), evR: Math.floor(9*Math.pow(1.04,b)*Math.pow(D,0.6)*R),
    evM: Math.floor(9*Math.pow(1.04,b)*Math.pow(D,0.6)*R),
    xp: Math.floor(30*Math.pow(1.07,b)*Math.pow(1.5,L)*Math.pow(D,1.3)*R),
    gold: Math.floor(8*Math.pow(1.06,b)*Math.pow(1.5,L)*Math.pow(D,1.1)*R),
    drop: Math.min(0.9, Math.max(0.05, (0.38 - i*0.003)))*(1+(D-1)*0.3)*cfg("dropCf"), rb: 0,
    eqLv: LV_TIERS[eqT] };
}
const zoneGemLv = (z) => Math.min(11, 1+(z-5)*2);
function endlessEqLv(f) {
  if (f < 1500) return LV_TIERS[Math.min(13, Math.floor(f/12))];
  return LV_TIERS[Math.min(LV_TIERS.length-1, 13 + Math.floor((f-1500)/300))];
}
function endlessMon(f) {
  const D = diff(); const R = rebCf();
  const mid = (f-1)%100;
  const z = Math.min(9, (mid/10)|0); const c = mid%10;
  const loop = Math.floor((f-1)/1000)+1;
  const rb = f+(D-1)*25;
  const seg = Math.floor((f-1)/100);
  const w = (f-1)%100;
  const hp = Math.floor(80*Math.pow(1.6,seg)*Math.pow(1.02,w)*Math.pow(D,1.5)*R);
  const atk = Math.floor(5*Math.pow(1.35,seg)*Math.pow(1.02,w)*Math.pow(D,1.2)*atkCf()*R);
  const evRaw = Math.pow(1.02,f)*Math.pow(D,0.6)*R;
  return { i:10000+f, lv:1, n:`∞${f}层 ${ELE[z]}·${CRE[z][c][0]}${loop>1?"×"+loop:""}`, ic:CRE[z][c][1],
    hp, atk,
    evT: Math.floor(Math.min(12000, 8*evRaw)),
    evS: Math.floor(Math.min(15000, 10*evRaw)),
    evB: Math.floor(Math.min(10500, 7*evRaw)),
    evR: Math.floor(Math.min(13500, 9*evRaw)),
    evM: Math.floor(Math.min(13500, 9*evRaw)),
    xp: Math.floor(35*Math.pow(1.35,seg)*Math.pow(1.06,w)*Math.pow(D,1.3)*R),
    gold: Math.min(ENDLESS_GOLD_CAP, Math.floor(12*Math.pow(1.3,seg)*Math.pow(1.05,w)*Math.pow(D,1.1)*R)),
    drop: Math.min(0.95,(0.28+0.003*f)*cfg("dropCf")), rb,
    eqLv: endlessEqLv(f) };
}
function xpNeed(lv) { return Math.floor((300*lv + 25*lv*lv) * cfg("xpCf")); }
function maxCleared(i) { for (let l = 5; l >= 1; l--) if (S.kills[i+"-"+l]) return l; return 0; }
function unlocked(i, l) {
  if (i === 0 && l === 1) return true;
  if (l === 1) return maxCleared(i-1) >= 1;
  return maxCleared(i) >= l-1 || maxCleared(i-1) >= l;
}

