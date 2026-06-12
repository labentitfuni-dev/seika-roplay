import fs from "fs";
const html = fs.readFileSync("C:/Users/user/seika-roplay/index.html","utf8");
// Only look at the HTML body portion (before <script>) for id= attributes to find duplicate element IDs
const bodyStart = html.indexOf("<body>");
const scriptStart = html.indexOf("<script>");
const body = html.slice(bodyStart, scriptStart);
const re = /\bid="([^"]+)"/g;
let m; const ids = {};
while ((m = re.exec(body))) ids[m[1]] = (ids[m[1]]||0)+1;
const dups = Object.entries(ids).filter(([k,v])=>v>1);
console.log("Duplicate element IDs in markup:", JSON.stringify(dups));
console.log("Total unique IDs:", Object.keys(ids).length);

// Cross-check: every getElementById('X') in script has a matching id in markup OR is created dynamically
const script = html.slice(scriptStart);
const gre = /getElementById\(['"]([^'"]+)['"]\)/g;
const used = new Set();
while ((m = gre.exec(script))) used.add(m[1]);
const markupIds = new Set(Object.keys(ids));
// IDs referenced but not in static markup (could be dynamically injected — list for manual check)
const missing = [...used].filter(id => !markupIds.has(id));
console.log("getElementById targets NOT in static markup:", JSON.stringify(missing));
