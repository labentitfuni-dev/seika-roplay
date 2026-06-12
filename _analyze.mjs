import fs from "fs";
const html = fs.readFileSync("C:/Users/user/seika-roplay/index.html","utf8");
const start = html.indexOf("const QUESTIONS = [");
const end = html.indexOf("];", start);
const block = html.slice(start, end);
const re = /\{\s*q:\s*"((?:[^"\\]|\\.)*)"\s*,\s*lv:\s*"([^"]+)"\s*\}/g;
let m, items = [];
while ((m = re.exec(block))) items.push({ q: m[1], lv: m[2] });
console.log("TOTAL parsed:", items.length);
const byLv = {};
for (const it of items) byLv[it.lv] = (byLv[it.lv]||0)+1;
console.log("By level:", JSON.stringify(byLv));
const seen = new Map();
const dups = [];
items.forEach((it,i) => {
  if (seen.has(it.q)) dups.push({ q: it.q, first: seen.get(it.q), dupIdx: i });
  else seen.set(it.q, i);
});
console.log("EXACT DUPLICATE count:", dups.length);
dups.forEach(d => console.log("  DUP:", JSON.stringify(d.q), "first@"+d.first, "again@"+d.dupIdx));
const valid = new Set(["S級","A級","B級","C級","D級"]);
const bad = items.filter(it => !valid.has(it.lv));
console.log("Invalid-level items:", bad.length, JSON.stringify(bad.slice(0,10)));
// Check for any non-string / encoding anomalies: replacement char, lone surrogates
let enc = 0;
items.forEach((it,i) => { if (/�/.test(it.q)) { enc++; console.log("  REPLCHAR@"+i, JSON.stringify(it.q)); } });
console.log("Replacement-char items:", enc);
// Levels referenced by badge CSS: s,a,b,c,d,time. Confirm every lv maps to existing badge class
const badgeClasses = new Set(["s","a","b","c","d"]);
const lvSet = new Set(items.map(it=>it.lv.replace("級","").toLowerCase()));
console.log("lv->badge classes used:", [...lvSet], "all covered:", [...lvSet].every(x=>badgeClasses.has(x)));
