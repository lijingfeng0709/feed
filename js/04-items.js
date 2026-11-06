"use strict";
/* ============================================================
   ★ 模块 C：物品注册
   ============================================================ */
const IT = {};
const defIt = (id, n, ic, tp, val, heal, mp) => { IT[id] = { id, n, ic, tp, val, heal: heal || 0, mp: mp || 0 }; };
defIt("milk","牛奶","🥛","mat",5); defIt("starMilk","星绒奶","🍶","mat",15);
defIt("herb","草药","🌿","mat",6); defIt("flax","亚麻","🧵","mat",8);
defIt("ore","矿石","🪨","mat",10); defIt("log","原木","🪵","mat",6);
defIt("oak","橡木","🌲","mat",18); defIt("ingot","铁锭","🔩","mat",30);
defIt("plank","木板","🟫","mat",22); defIt("cloth","布卷","🧶","mat",26);
defIt("bread","面包","🍞","food",18,30); defIt("cake","蛋糕","🍰","food",55,80);
defIt("spaceCake","太空蛋糕","🧁","food",200,260);
defIt("tea","茶","🍵","drink",22,0,40); defIt("coffee","咖啡","☕","drink",65,0,120);
defIt("effTea","效率茶","🫖","tea",260);
defIt("sage","贤者之石","💎","spec",1500); defIt("box","紫盒子","🎁","spec",300);
defIt("token","代币","🪙","spec",0);
defIt("xianGu","仙骨","🦴","rare",2500); defIt("xianYu","仙玉","🟩","rare",4000);
defIt("soul","灵魂","🫧","rare",6000); defIt("shenShi","神石","🪩","rare",9000);
defIt("xpC1","经验咖啡Ⅰ","🥤","xp",600); defIt("xpC2","经验咖啡Ⅱ","🧋","xp",1800);
defIt("xpC3","经验咖啡Ⅲ","🍺","xp",4500); defIt("xpC4","经验咖啡Ⅳ","🍾","xp",11000);
defIt("hitPot","百发神水","🧪","pot",1000000);
defIt("critPot","弑神狂暴水","💣","pot",1000000);
defIt("invPot","无敌药水","🛉","pot",10000000);
defIt("punch","打孔锥","🔨","spec",50000);
defIt("xingSui","星髓","✨","emat",50000);
defIt("yunTie","陨铁","🌠","emat",80000);
defIt("longJin","龙筋","🐲","emat",150000);
defIt("fengYu","凤羽","🪶","emat",200000);
defIt("daoZe","道则碎片","📜","emat",400000);
defIt("hunDunJing","混沌晶","🔮","emat",1000000);
defIt("xingHui1","星辉砂·微","💠","gold",10000000);
defIt("xingHui2","星辉砂·耀","🔷","gold",20000000);
defIt("xingHui3","星辉砂·炽","🔶","gold",40000000);
defIt("xingHui4","星辉砂·极","🌟","gold",80000000);
defIt("yaoDan","妖丹","🧿","nd",200);
defIt("diLingDan","地灵丹","💊","nd",2000);
defIt("tianYuanDan","天元丹","🏮","nd",20000);
defIt("yuLing","羽翎","🕊️","wing",300);
const GOLD_REDEEM = { xingHui1:10000000, xingHui2:20000000, xingHui3:40000000, xingHui4:80000000 };
const ENDLESS_ONLY = { xingSui:1, yunTie:1, longJin:1, fengYu:1, daoZe:1, hunDunJing:1, xingHui1:1, xingHui2:1, xingHui3:1, xingHui4:1, yaoDan:1, diLingDan:1, tianYuanDan:1, yuLing:1 };
const GEM_T = {
  atk:     { n:"攻击宝石", ic:"⚔", ck:"gemAtk" },
  def:     { n:"防御宝石", ic:"🛡", ck:"gemDef" },
  hp:      { n:"活力宝石", ic:"❤", ck:"gemHp" },
  critDmg: { n:"爆伤宝石", ic:"💥", ck:"gemCritDmg" }
};
for (const t in GEM_T) for (let l = 1; l <= 30; l++) defIt(`gem_${t}_${l}`, `${GEM_T[t].n}Lv${l}`, GEM_T[t].ic, "gem", 400*l*l);
const gemVal = (t, l) => Math.floor(cfg(GEM_T[t].ck) * Math.pow(1.2, l-1));
const GEM_MAX = 30, EQ_HOLES_MAX = 4;
const XPIT = { xpC1:{m:0.2,mm:15}, xpC2:{m:0.5,mm:15}, xpC3:{m:1.0,mm:20}, xpC4:{m:2.0,mm:20} };
const POTBUFF = {
  hitPot:  { k:"hit",     v:100,    mm:20 },
  critPot: { k:"critDmg", v:100000, mm:20 },
  invPot:  { k:"inv",     v:1,      mm:20 }
};
const BELL_SHOP = { critPot:100, invPot:100 };
/* ★ v1.21.9：本表现在仅作为玩家市场🔔计价的基准价参照——星辉砂已从牛铃商店下架，此处保留其市场定价参照（挂单区间=参照价±50%） */
const BELL_MAT = {
  xingSui:5, yunTie:8, longJin:15, fengYu:25, daoZe:40, hunDunJing:70,
  xingHui1:100, xingHui2:200, xingHui3:400, xingHui4:800,
  yaoDan:2, diLingDan:10, tianYuanDan:50, yuLing:2
};
const POT_MK = { hitPot:1000000 };
const matStr = (m) => Object.entries(m).map(([k,v]) => `${IT[k].ic}${IT[k].n}×${v}`).join("＋");
const RARE_MATS = { xianGu:1, xianYu:1, soul:1, shenShi:1 };
const MAT_CHAINS = [
  ["xingSui","yunTie","longJin","fengYu","daoZe","hunDunJing"],
  ["xianGu","xianYu","soul","shenShi"],
  ["xingHui1","xingHui2","xingHui3","xingHui4"],
  ["yaoDan","diLingDan","tianYuanDan"]
];
const MAT_NEXT = {}, MAT_PREV = {};
MAT_CHAINS.forEach((ch) => { for (let i = 0; i < ch.length; i++) { if (i < ch.length-1) MAT_NEXT[ch[i]] = ch[i+1]; if (i > 0) MAT_PREV[ch[i]] = ch[i-1]; } });
const PM_TRADEABLE = /^(milk|starMilk|herb|flax|ore|log|oak|ingot|plank|cloth|bread|cake|spaceCake|tea|coffee|effTea|sage|xianGu|xianYu|soul|shenShi|yaoDan|diLingDan|tianYuanDan|yuLing|xingSui|yunTie|longJin|fengYu|daoZe|hunDunJing|xingHui[1-4]|gem_(atk|def|hp|critDmg)_\d+)$/;

