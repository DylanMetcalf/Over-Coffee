// Builds docs/brand/brand-sheet.html — the identity system and its applications.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markSvg, wordmarkSvg, BRAND } from '../../web/js/render/mark.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fontCss = fs.readFileSync(path.join(root, 'web/css/fonts.css'), 'utf8').replace(/url\(\.\.\/assets/g, 'url(../../web/assets');
const wm = (h, o = {}) => wordmarkSvg({ height: h, ink: '#0a0b10', ...o });
const wmDark = (h) => wordmarkSvg({ height: h, ink: '#fff', accent: BRAND.redOnDark });

const criteria = ['Memorable', 'Ownable', 'Small size', 'App icon', 'Mono', 'Masthead', 'Premium', 'Fits “Over Coffee”'];
const scores = [
  ['A · Ring “C.” (v2 logo)', [3, 2, 4, 4, 4, 2, 3, 2]],
  ['B · Page over cup', [2, 3, 1, 2, 2, 2, 2, 5]],
  ['C · Sun over page', [3, 1, 3, 4, 4, 1, 2, 2]],
  ['D · O + C rings', [3, 2, 2, 3, 3, 2, 2, 3]],
  ['E · Cup as speech bubble', [3, 2, 3, 3, 3, 1, 1, 5]],
  ['G · Page-shaped C', [3, 4, 3, 4, 4, 2, 3, 3]],
  ['H · Serif OC with rules', [2, 3, 1, 2, 3, 4, 3, 2]],
  ['I · Rising page (arch + sun)', [2, 2, 3, 3, 4, 1, 2, 2]],
  ['★ Italic c. + over/coffee wordmark', [5, 5, 4, 5, 4, 5, 5, 5]],
];
const heat = (n) => `<td class="s s${n}">${n}</td>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Over Coffee — identity</title>
<style>${fontCss}
:root{--ink:#0a0b10;--mute:#6b7080;--line:#e6e8ee;--red:#ff2d55;--bg:#f4f5f8}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 Geist,system-ui,sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:56px 32px 96px}
h1,h2,h3{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-.035em;margin:0}
h2{font-size:34px;line-height:1.05;margin:72px 0 8px}h3{font-size:18px;margin:0 0 6px}
.kick{font:600 11.5px/1 'Geist Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
p{margin:0 0 12px;color:#333844;max-width:62ch}.lede{font-size:18px;color:var(--ink)}
.hero{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;margin-top:20px}
.card{background:#fff;border-radius:24px;padding:32px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:14px;min-height:240px}
.card.dark{background:var(--ink);color:#fff}.card.dark .cap{color:#9aa0ae}.card.sun{background:linear-gradient(135deg,#ff7a1a,#ff2d55)}
.cap{font:500 11.5px/1.3 'Geist Mono',monospace;color:var(--mute);letter-spacing:.04em;text-transform:uppercase;text-align:center}
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.g4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.row{display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center}
img.shot{width:100%;border-radius:14px;border:1px solid var(--line);display:block}
.exp img{width:100%;border-radius:16px;margin-top:14px;display:block}
table{border-collapse:separate;border-spacing:3px;width:100%;font-size:13px;margin-top:14px;background:#fff;border-radius:18px;padding:12px}
th{font:600 11px 'Geist Mono',monospace;color:var(--mute);text-transform:uppercase;letter-spacing:.04em;padding:6px;text-align:center}
th:first-child,td:first-child{text-align:left;padding-left:8px}
td.s{text-align:center;border-radius:6px;font-weight:600;padding:7px 4px}
.s1{background:#ffe0e3}.s2{background:#ffeedd}.s3{background:#fff6cf}.s4{background:#dff5e8}.s5{background:#b9ecd0}
tr.win td:first-child{font-weight:700}
.phone{width:230px;border-radius:38px;background:#0a0b10;padding:12px}.screen{border-radius:28px;background:linear-gradient(160deg,#3b4a6b,#c9a47a 70%,#f3c9a0);padding:26px 16px 18px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px 8px;justify-items:center;min-height:300px;align-content:start}
.ic{display:flex;flex-direction:column;align-items:center;gap:4px;font:500 9px system-ui;color:#fff}.ic i{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.28);display:block}
.tab{display:flex;align-items:center;gap:8px;background:#fff;border-radius:12px 12px 0 0;padding:8px 14px;font:500 12px system-ui;border:1px solid var(--line);border-bottom:0}
.tabbar{background:#dfe2ea;padding:8px 8px 0;border-radius:14px 14px 0 0;width:100%}
.splash{width:100%;aspect-ratio:9/16;max-width:230px;border-radius:30px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;box-shadow:0 0 0 8px #0a0b10}
.rule li{margin-bottom:6px}
.clear{position:relative;padding:34px;outline:1.5px dashed #c9cdd8;border-radius:6px;display:inline-block}
.dont{opacity:.9}.dont svg{filter:none}
@media(max-width:800px){.hero,.g2,.g3,.g4{grid-template-columns:1fr}}
</style></head><body><div class="wrap">

<div class="kick">Brand identity · Over Coffee</div>
<h1 style="font-size:64px;line-height:.95;margin:14px 0 14px">The identity, <i style="font-family:'Instrument Serif';font-weight:400;color:var(--red)">refined.</i></h1>
<p class="lede">Over Coffee is a daily moment: you sit down, get informed about what you care about, and get on with your day. The identity says exactly that — a conversational italic “over”, a heavy “coffee”, and a full stop that means <b>the edition ends</b>.</p>

<div class="hero">
  <div class="card">${wm(120)}<div class="cap">Primary logo · wordmark</div></div>
  <div class="card dark">${wmDark(70)}<div class="cap">On espresso black</div></div>
</div>

<h2>The idea</h2>
<div class="g3">
 <div class="card" style="align-items:flex-start"><div class="kick">over</div><h3 style="font-family:'Instrument Serif';font-style:italic;font-weight:400;font-size:44px;color:var(--red);margin:0">over</h3><p>Italic serif. The human voice, the conversation, the friend across the table. Warm and a little unexpected.</p></div>
 <div class="card" style="align-items:flex-start"><div class="kick">coffee</div><h3 style="font-size:44px;margin:0">coffee</h3><p>Heavy grotesque. The ritual: dependable, bold, there every morning. Tightly set so it holds up as a masthead.</p></div>
 <div class="card" style="align-items:flex-start"><div class="kick">the full stop</div><h3 style="font-size:44px;margin:0;color:var(--red)">.</h3><p>The product promise in one mark. A finite paper that ends. It is also the sunrise and the coffee ring seen from above.</p></div>
</div>

<h2>The system</h2>
<p>Every piece comes from one source file (<code>web/js/render/mark.js</code>). Letterforms are outlined, so the logo never depends on a web font.</p>
<div class="g4" style="margin-top:14px">
  <div class="card">${markSvg({ size: 140 })}<div class="cap">App icon · warm paper</div></div>
  <div class="card">${markSvg({ size: 140, monogram: true })}<div class="cap">OC monogram</div></div>
  <div class="card dark">${markSvg({ size: 140, tone: 'dark' })}<div class="cap">Dark · ink</div></div>
  <div class="card">${markSvg({ size: 140, tone: 'light' })}<div class="cap">Light · on white</div></div>
</div>
<div class="g4" style="margin-top:16px">
  <div class="card"><div style="color:#0a0b10">${markSvg({ size: 110, tone: 'mono' })}</div><div class="cap">Monochrome symbol</div></div>
  <div class="card"><div style="color:#0a0b10">${wm(40, { accent: "#0a0b10" })}</div><div class="cap">Monochrome wordmark</div></div>
  <div class="card"><div class="row">${[64, 40, 28, 20, 16].map((s) => markSvg({ size: s })).join('')}</div><div class="cap">Small sizes (hairlines thicken ≤ 28 px)</div></div>
  <div class="card"><div class="row" style="gap:10px"><span style="display:flex;align-items:center;gap:10px">${markSvg({ size: 52 })}${wm(34)}</span></div><div class="cap">Lockup · symbol + wordmark</div></div>
</div>

<h2>Newspaper masthead</h2>
<p>In print the wordmark stands alone at the top of the front page — no box, no tile — so the paper reads like a publication, not an app.</p>
<div class="g2" style="margin-top:14px">
  <div class="card" style="align-items:flex-start;padding:36px 40px"><div style="display:flex;justify-content:space-between;width:100%;align-items:center">${wm(64)}<span class="cap" style="text-align:right">Friday 2 October 2026<br>5-minute edition</span></div><div style="height:2px;background:var(--ink);width:100%;margin:6px 0 0"></div><div class="cap" style="align-self:flex-start">Business</div></div>
  <div class="card" style="background:#fffaf4;align-items:flex-start;padding:36px 40px"><div style="display:flex;justify-content:space-between;width:100%;align-items:center">${wm(64)}<span class="cap">Fri, 2 Oct</span></div><div style="font:800 56px/.95 'Bricolage Grotesque';letter-spacing:-.045em">Morning.<br><i style="font:italic 400 1.08em 'Instrument Serif';background:linear-gradient(100deg,#ff7a1a,#ff2d55 50%,#6b4eff);-webkit-background-clip:text;color:transparent">Here’s the tea.</i></div><div class="cap" style="align-self:flex-start">Social</div></div>
</div>

<h2>In context</h2>
<div class="g3" style="margin-top:14px">
  <div class="card"><div class="phone"><div class="screen">
    <div class="ic"><i></i>Mail</div><div class="ic"><i></i>Maps</div><div class="ic"><i></i>Notes</div><div class="ic"><i></i>Photos</div>
    <div class="ic"><i></i>Clock</div><div class="ic">${markSvg({ size: 44, rx: 12 })}Over Coffee</div><div class="ic"><i></i>Music</div><div class="ic"><i></i>Wallet</div>
  </div></div><div class="cap">Phone home screen</div></div>
  <div class="card" style="padding:20px;justify-content:flex-start"><div class="tabbar"><div class="tab">${markSvg({ size: 16 })}Over Coffee — Friday 2 October</div></div><div class="row" style="margin-top:30px">${markSvg({ size: 32 })}${markSvg({ size: 24 })}${markSvg({ size: 16 })}</div><div class="cap">Browser favicon · 32 / 24 / 16 px</div></div>
  <div class="card"><div class="splash">${markSvg({ size: 84, animate: true })}${wm(30)}</div><div class="cap">Splash · the dot lands last</div></div>
</div>
<div class="g3" style="margin-top:16px">
  <div class="card"><div class="row">${markSvg({ size: 110 })}${markSvg({ size: 64 })}${markSvg({ size: 36 })}</div><div class="cap">Social profile icon</div></div>
  <div class="card"><div style="text-align:center">${markSvg({ size: 56, cls: 'oc-mark--loop' })}<div style="font:500 14px Geist;color:var(--mute);margin-top:12px">Setting your edition…</div></div><div class="cap">Loading state</div></div>
  <div class="card"><div style="display:flex;gap:12px;align-items:center;background:#f1f2f6;border-radius:18px;padding:14px 16px;width:100%">${markSvg({ size: 40, rx: 10 })}<div><div style="font:600 14px Geist">Your bread bill might be next 🍞</div><div style="font:400 13px Geist;color:#555">A dry September cut the wheat harvest forecast by 7%.</div></div></div><div class="cap">Push notification</div></div>
</div>
<div style="margin-top:16px"><img class="shot" src="img/web-header.png" alt=""><div class="cap" style="margin-top:8px">Website header</div></div>
<div class="g4" style="margin-top:16px">
  <div><img class="shot" src="img/mobile-business.png" alt=""><div class="cap" style="margin-top:8px">Mobile · Business</div></div>
  <div><img class="shot" src="img/mobile-social.png" alt=""><div class="cap" style="margin-top:8px">Mobile · Social</div></div>
  <div><img class="shot" src="img/pdf-1.png" alt=""><div class="cap" style="margin-top:8px">PDF front page</div></div>
  <div><img class="shot" src="img/email.png" alt=""><div class="cap" style="margin-top:8px">Email header</div></div>
</div>

<h2>How we got here</h2>
<p>Eight directions were drawn and compared before choosing. The ring-“C.” from the previous version was kept in the running and honestly judged: clean and friendly, but it looks like many other apps and says nothing about reading or mornings. Concepts that depicted coffee or a page literally (B, E) were memorable but read as café or stationery branding, and failed at 16 px.</p>
<div class="exp"><img src="img/explore-1.png" alt="Round 1: eight directions"><img src="img/explore-2.png" alt="Round 2: page-shaped C and wordmarks"><img src="img/explore-3.png" alt="Round 3: editorial italic c and the outlined wordmark"></div>
<table><thead><tr><th>Concept (1 weak – 5 strong)</th>${criteria.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${scores.map(([n, v], i) => `<tr class="${i === scores.length - 1 ? 'win' : ''}"><td>${n}</td>${v.map(heat).join('')}</tr>`).join('')}</tbody></table>
<p style="margin-top:14px"><b>Why the winner.</b> The type-led identity is the only direction that carries all three ideas — conversation, ritual, a finished edition — without drawing a cup or a page. It feels editorial rather than SaaS, has a recognisable silhouette (an italic serif beside a heavy grotesque) and a mark small enough to be an icon. The page-shaped C was the strongest symbol-only idea (ownable) but read as a camera or wallet and fought the wordmark. It is parked, not discarded.</p>
<p><b>What would make it better.</b> The letterforms are set from open-licence fonts (Instrument Serif, Bricolage Grotesque). Before launch, a type designer should customise the “c” and “ff” joins to make the wordmark fully proprietary, and the identity should be tested with real users on real devices.</p>

<h2>Rules</h2>
<div class="g2">
<div class="card" style="align-items:flex-start"><h3>Use it like this</h3><ul class="rule"><li>Keep clear space equal to the height of the “o” on every side.</li><li>Minimum wordmark height 16 px digital, 6 mm print. Below that, use the symbol alone.</li><li>The dot is always the accent red (a warmer red-orange on dark). The app icon is a quiet warm-paper tile with an ink letter; no gradients.</li><li>Wordmark on white or espresso black only. Never on photography without a scrim.</li></ul></div>
<div class="card" style="align-items:flex-start"><h3>Never</h3><ul class="rule"><li>Re-set the wordmark in another font or change the italic/bold pairing.</li><li>Drop the full stop, or add a second one.</li><li>Put the symbol in a circle, add a coffee cup, steam or a drop shadow.</li><li>Recolour “over” and “coffee” the same colour except in the monochrome version.</li></ul></div>
</div>
<div class="kick" style="margin-top:40px">Source: scripts/logo/build-logo.py · build-assets.mjs · brand-sheet.mjs</div>
</div></body></html>`;
fs.mkdirSync(path.join(root, 'docs/brand'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/brand/brand-sheet.html'), html);
console.log('brand sheet written');
