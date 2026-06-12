// Replicate renderEval's parsing regexes exactly
function parse(text){
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const scoreM = text.match(/SCORE:[\s*]*([0-9０-９]+|-)/);
  const goodM  = text.match(/[*#\s]*GOOD[*\s]*:[*\s]*\n?([\s\S]*?)(?=[*#\s]*(?:IMPROVE|ADVICE)[*\s]*:|$)/);
  const impM   = text.match(/[*#\s]*IMPROVE[*\s]*:[*\s]*\n?([\s\S]*?)(?=[*#\s]*ADVICE[*\s]*:|$)/);
  const advM   = text.match(/[*#\s]*ADVICE[*\s]*:[*\s]*\n?([\s\S]*?)$/);
  const toItems = block => (block || '').trim().split('\n')
    .map(l => l.replace(/\*\*/g,'').replace(/^\s*[・\-*•]\s*/,'').trim()).filter(Boolean);
  return {
    score: scoreM?scoreM[1]:null,
    good: toItems(goodM?goodM[1]:''),
    imp: toItems(impM?impM[1]:''),
    adv: advM?advM[1].trim():''
  };
}

// Case 1: ideal format
const c1 = `SCORE: 75
GOOD:
・結論から述べている
・数字を使った
IMPROVE:
・具体例が不足
ADVICE:
もっと具体例を`;
console.log("C1", JSON.stringify(parse(c1),null,0));

// Case 2: markdown bold headers + dash bullets
const c2 = `**SCORE:** 80
**GOOD:**
- 良い導入
- 丁寧
**IMPROVE:**
- 短い
**ADVICE:**
練習を`;
console.log("C2", JSON.stringify(parse(c2),null,0));

// Case 3: GOOD value inline, then bullets — does the section after-the-fact get IMPROVE leaked?
const c3 = `SCORE: 60
GOOD: 全体的に良い
IMPROVE: 改善必要
ADVICE: がんばれ`;
console.log("C3", JSON.stringify(parse(c3),null,0));

// Case 4: The word IMPROVE appears inside a GOOD bullet text (edge)
const c4 = `SCORE: 70
GOOD:
・改善 (IMPROVE) の余地を自覚
IMPROVE:
・もっと
ADVICE:
ok`;
console.log("C4", JSON.stringify(parse(c4),null,0));

// Case 5: lookahead [*#\s]* before IMPROVE — note [*#\s]* can match ZERO chars. Does GOOD greedily stop at first 'IMPROVE' token mid-word? Check "IMPROVED"
const c5 = `SCORE: 70
GOOD:
・This is IMPROVED greatly
IMPROVE:
・x
ADVICE:
ok`;
console.log("C5", JSON.stringify(parse(c5),null,0));

// Case 6: ADVICE missing entirely
const c6 = `SCORE: 50
GOOD:
・ok
IMPROVE:
・bad`;
console.log("C6", JSON.stringify(parse(c6),null,0));
