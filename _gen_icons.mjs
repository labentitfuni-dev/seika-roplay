// R625: 墨ブラシストロークのアイコン生成（依存ゼロ）
// デザイン: 紙白の角丸に、太い墨のS字ストローク（先細り・かすれ）＋底の墨だまり（スプラッシュ）＋飛沫。
// 同一ジオメトリから icon.svg（テーパー多角形）と PNG（円スタンプラスタ）を生成。シードRNGで再現可能。
import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';

/* ── seeded RNG ── */
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20260612);

/* ── ストローク中心線（Catmull-Rom → サンプル列）512基準 ── */
const CTRL = [ [346, 58], [384, 152], [296, 252], [172, 334], [206, 430] ];
const WIDTHS = [4, 22, 42, 56, 64]; // 先端→根元（太め=画像の力強さ）
function catmull(p0, p1, p2, p3, t){
  const t2 = t * t, t3 = t2 * t;
  return [
    0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}
const SAMPLES = [];
for (let seg = 0; seg < CTRL.length - 1; seg++) {
  const p0 = CTRL[Math.max(0, seg - 1)], p1 = CTRL[seg], p2 = CTRL[seg + 1], p3 = CTRL[Math.min(CTRL.length - 1, seg + 2)];
  const w1 = WIDTHS[seg], w2 = WIDTHS[seg + 1];
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const [x, y] = catmull(p0, p1, p2, p3, t);
    SAMPLES.push({ x, y, w: w1 + (w2 - w1) * t });
  }
}
SAMPLES.push({ x: CTRL[CTRL.length - 1][0], y: CTRL[CTRL.length - 1][1], w: WIDTHS[WIDTHS.length - 1] });

/* 法線 */
function normalAt(i){
  const a = SAMPLES[Math.max(0, i - 1)], b = SAMPLES[Math.min(SAMPLES.length - 1, i + 1)];
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  return [-dy / d, dx / d];
}

/* ── スプラッシュ（根元の墨だまり）＋飛沫 — 生成は一度だけ（SVG/PNG共用） ── */
const END = SAMPLES[SAMPLES.length - 1];
const SPLASH = [];
for (let i = 0; i < 22; i++) { /* 大きな墨だまり本体 */
  const ang = rnd() * 6.283, dist = rnd() * rnd() * 85;
  SPLASH.push({ x: END.x + Math.cos(ang) * dist * 1.4, y: END.y + Math.sin(ang) * dist * 0.72, r: 8 + rnd() * 28, ry: 0.55 + rnd() * 0.45, rot: rnd() * 3.14 });
}
for (let i = 0; i < 12; i++) { /* 噴き出す小滴（とげとげの縁） */
  const ang = rnd() * 6.283, dist = 50 + rnd() * 90;
  SPLASH.push({ x: END.x + Math.cos(ang) * dist * 1.2, y: END.y + Math.sin(ang) * dist * 0.6, r: 3 + rnd() * 7, ry: 0.6 + rnd() * 0.4, rot: ang });
}
const FINGERS = []; /* 指状の噴き上げ — 墨だまりの左肩から上へ立つ細長い飛沫（参考画像の特徴。筆本体は右から入るので左側に出す） */
for (let i = 0; i < 8; i++) {
  const fx = END.x - 78 + i * 10 + (rnd() - 0.5) * 6;
  const fh = 24 + rnd() * 46;
  FINGERS.push({ x: fx, y0: END.y - 2 - rnd() * 10, y1: END.y - 2 - fh, w: 2.6 + rnd() * 3.0, tilt: -3 + (rnd() - 0.5) * 12 });
}
const SPATTER = [];
for (let i = 0; i < 84; i++) {
  /* 全体に散らすが下半分・スプラッシュ周辺を濃く */
  const nearSplash = rnd() < 0.45;
  const x = nearSplash ? END.x + (rnd() - 0.5) * 320 : 40 + rnd() * 432;
  const y = nearSplash ? END.y - rnd() * 200 : 40 + rnd() * 432;
  if (x < 30 || x > 482 || y < 30 || y > 482) continue;
  SPATTER.push({ x, y, r: 0.8 + rnd() * rnd() * 5.5 });
}

/* ── icon.svg: テーパー多角形＋かすれ筋＋スプラッシュ＋飛沫 ── */
function svgOut(){
  const left = [], right = [];
  for (let i = 0; i < SAMPLES.length; i++) {
    const [nx, ny] = normalAt(i), s = SAMPLES[i];
    left.push((s.x + nx * s.w / 2).toFixed(1) + ' ' + (s.y + ny * s.w / 2).toFixed(1));
    right.push((s.x - nx * s.w / 2).toFixed(1) + ' ' + (s.y - ny * s.w / 2).toFixed(1));
  }
  const d = 'M' + left.join('L') + 'L' + right.reverse().join('L') + 'Z';
  /* かすれ筋: 中盤〜根元の内側に紙色の細線2本 */
  const streak = (off, from, to, w) => {
    const pts = [];
    for (let i = from; i < to; i++) { const [nx, ny] = normalAt(i), s = SAMPLES[i]; pts.push((s.x + nx * s.w * off).toFixed(1) + ' ' + (s.y + ny * s.w * off).toFixed(1)); }
    return `<polyline points="${pts.join(',')}" fill="none" stroke="#f7f6f2" stroke-width="${w}" stroke-linecap="round" opacity=".75"/>`;
  };
  const N = SAMPLES.length; /* 65 — 範囲は割合で指定 */
  const splash = SPLASH.map(s => `<ellipse cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" rx="${s.r.toFixed(1)}" ry="${(s.r * s.ry).toFixed(1)}" transform="rotate(${(s.rot * 57.3).toFixed(0)} ${s.x.toFixed(1)} ${s.y.toFixed(1)})" fill="#16171b"/>`).join('');
  const spat = SPATTER.map(s => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(2)}" fill="#16171b"/>`).join('');
  const fingers = FINGERS.map(f => `<line x1="${f.x.toFixed(1)}" y1="${f.y0.toFixed(1)}" x2="${(f.x + f.tilt).toFixed(1)}" y2="${f.y1.toFixed(1)}" stroke="#16171b" stroke-width="${f.w.toFixed(1)}" stroke-linecap="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="SEIKA ロープレ">
  <!-- R625: 墨ブラシストロークのアイコン — 紙白の角丸に太い墨のS字（先細り・かすれ筋）＋墨だまり＋飛沫。icon-*.png と同一ジオメトリ（_gen_icons.mjs生成） -->
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbfaf7"/><stop offset="1" stop-color="#edece7"/>
    </linearGradient>
    <clipPath id="rr"><rect width="512" height="512" rx="104"/></clipPath>
  </defs>
  <rect width="512" height="512" rx="104" fill="url(#paper)"/>
  <g clip-path="url(#rr)">
    <path d="${d}" fill="#16171b"/>
    ${streak(0.3, Math.round(N * 0.45), Math.round(N * 0.92), 2.6)}
    ${streak(-0.34, Math.round(N * 0.5), Math.round(N * 0.95), 2.0)}
    ${splash}
    ${fingers}
    ${spat}
  </g>
  <rect x="1" y="1" width="510" height="510" rx="103" fill="none" stroke="#000000" stroke-opacity=".08" stroke-width="2"/>
</svg>
`;
}

/* ── PNG: 円スタンプラスタ ── */
function crc32(buf){ let c, T = crc32.T; if (!T) { T = crc32.T = new Int32Array(256); for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); T[n] = c; } } c = -1; for (let i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data){ const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function pngEncode(w, h, rgba){ const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); } const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

function render(size){
  const S = size / 512;          /* 512基準→実サイズ */
  const ink = Float32Array ? new Float32Array(size * size) : null; /* 墨の被覆率 0..1 */
  const stamp = (cx, cy, r, a) => {
    cx *= S; cy *= S; r *= S;
    const x0 = Math.max(0, Math.floor(cx - r - 1)), x1 = Math.min(size - 1, Math.ceil(cx + r + 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1)), y1 = Math.min(size - 1, Math.ceil(cy + r + 1));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const cov = (1 - smooth(r - 1, r + 0.5, d)) * a;
      if (cov > 0) { const i = y * size + x; ink[i] = ink[i] + cov - ink[i] * cov; } /* over合成 */
    }
  };
  /* 本体: 中心線をサブステップ補間して高密度スタンプ（1.2px間隔 → 滑らかな縁） */
  const r2 = mulberry32(7);
  for (let i = 1; i < SAMPLES.length; i++) {
    const a0 = SAMPLES[i - 1], a1 = SAMPLES[i];
    const seg = Math.hypot(a1.x - a0.x, a1.y - a0.y);
    const steps = Math.max(1, Math.ceil(seg / 1.2));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      stamp(a0.x + (a1.x - a0.x) * t, a0.y + (a1.y - a0.y) * t, (a0.w + (a1.w - a0.w) * t) / 2, 0.96);
    }
  }
  /* かすれ筋: 紙色の連続筋をサブステップで上書き（ラン＆ギャップで自然な途切れ） */
  const scratch = (off, from, to, rw) => {
    let run = true, left = 4 + Math.floor(r2() * 8);
    for (let i = from; i < to - 1; i++) {
      const a0 = SAMPLES[i], a1 = SAMPLES[i + 1];
      const seg = Math.hypot(a1.x - a0.x, a1.y - a0.y);
      const steps = Math.max(1, Math.ceil(seg / 1.2));
      for (let k = 0; k < steps; k++) {
        if (--left <= 0) { run = !run; left = run ? 6 + Math.floor(r2() * 12) : 2 + Math.floor(r2() * 5); }
        if (!run) continue;
        const t = k / steps;
        const x = a0.x + (a1.x - a0.x) * t, y = a0.y + (a1.y - a0.y) * t, w = a0.w + (a1.w - a0.w) * t;
        const [nx, ny] = normalAt(i);
        const jo = off + (r2() - 0.5) * 0.07;            /* 縁の揺らぎ */
        stampPaper(x + nx * w * jo, y + ny * w * jo, rw * (0.55 + r2() * 0.9));
      }
    }
  };
  const paper = new Float32Array(size * size); /* 紙筋の被覆 */
  const stampPaper = (cx, cy, r) => {
    cx *= S; cy *= S; r *= S;
    const x0 = Math.max(0, Math.floor(cx - r - 1)), x1 = Math.min(size - 1, Math.ceil(cx + r + 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1)), y1 = Math.min(size - 1, Math.ceil(cy + r + 1));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const cov = (1 - smooth(r - 1, r + 0.5, d)) * 0.55; /* 淡め=うっすら掠れる */
      if (cov > 0) { const i = y * size + x; paper[i] = Math.max(paper[i], cov); }
    }
  };
  const N = SAMPLES.length;
  scratch(0.3,  Math.round(N * 0.45), Math.round(N * 0.92), 1.7);
  scratch(-0.34, Math.round(N * 0.5),  Math.round(N * 0.95), 1.5);
  scratch(0.1,  Math.round(N * 0.6),  Math.round(N * 0.9),  1.1);
  scratch(-0.15, Math.round(N * 0.55), Math.round(N * 0.85), 1.0);
  /* スプラッシュ＋指状の噴き上げ＋飛沫 */
  for (const s of SPLASH) stamp(s.x, s.y, s.r * (0.75 + s.ry * 0.25), 0.95);
  for (const f of FINGERS) { /* 細い縦線をスタンプで描く（上ほど細く） */
    const steps = Math.max(2, Math.ceil(Math.abs(f.y0 - f.y1) / 1.2));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      stamp(f.x + f.tilt * t, f.y0 + (f.y1 - f.y0) * t, (f.w / 2) * (1 - t * 0.55), 0.95);
    }
  }
  for (const s of SPATTER) stamp(s.x, s.y, Math.max(s.r, 1.0), 0.9);

  /* 合成: 紙グラデ → 墨 → 紙筋を墨の上に */
  const rgba = Buffer.alloc(size * size * 4);
  const rx = 104 * S;
  for (let y = 0; y < size; y++) {
    const t = y / size;
    const pr = Math.round(0xfb + (0xed - 0xfb) * t), pg = Math.round(0xfa + (0xec - 0xfa) * t), pb = Math.round(0xf7 + (0xe7 - 0xf7) * t);
    for (let x = 0; x < size; x++) {
      const qx = Math.max(Math.abs(x + 0.5 - size / 2) - (size / 2 - rx), 0);
      const qy = Math.max(Math.abs(y + 0.5 - size / 2) - (size / 2 - rx), 0);
      const alpha = 1 - smooth(-0.8, 0.8, Math.hypot(qx, qy) - rx);
      const i = y * size + x, o = i * 4;
      if (alpha <= 0) { rgba[o + 3] = 0; continue; }
      let k = ink[i] * (1 - paper[i] * 0.9);            /* 紙筋で墨を抜く */
      k = clamp(k, 0, 1);
      rgba[o]     = Math.round(pr + (0x16 - pr) * k);
      rgba[o + 1] = Math.round(pg + (0x17 - pg) * k);
      rgba[o + 2] = Math.round(pb + (0x1b - pb) * k);
      rgba[o + 3] = Math.round(255 * alpha);
    }
  }
  return pngEncode(size, size, rgba);
}

writeFileSync('icon.svg', svgOut());
console.log('icon.svg written');
for (const s of [512, 192, 180]) {
  const png = render(s);
  writeFileSync(`icon-${s}.png`, png);
  console.log(`icon-${s}.png: ${png.length} bytes`);
}
