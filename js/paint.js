// Procedural source painters: every one of these becomes raw material for the synth.
import { SRC_W, SRC_H } from './synth.js';

const COLORS = ['#b6ff00', '#ff2bd6', '#00f0ff', '#ffe600', '#ff5a1f', '#8a2bff', '#ffffff'];
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function makeCanvas(w = SRC_W, h = SRC_H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function bricks(g, w, h, base) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const bw = 96, bh = 40;
  for (let y = 0; y < h; y += bh) for (let x = -(y / bh % 2) * bw / 2; x < w; x += bw) {
    g.fillStyle = `rgba(${rnd(30, 60) | 0},${rnd(20, 40) | 0},${rnd(20, 40) | 0},${rnd(.4, .9)})`;
    g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
  }
}

function spray(g, x, y, r, color, n = 120) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) { const a = rnd(Math.PI * 2), d = Math.pow(Math.random(), 1.8) * r; g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.6, 1.6); }
}

function drips(g, x0, x1, y, color, count) {
  g.strokeStyle = color; g.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = rnd(x0, x1), len = Math.pow(Math.random(), 2) * 160 + 10, wd = rnd(2, 7);
    g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + len); g.stroke();
    g.beginPath(); g.arc(x, y + len, wd * .9, 0, Math.PI * 2); g.fillStyle = color; g.fill();
  }
}

// The TAG WALL: your query, sprayed as graffiti. Repainted on every keystroke.
export function paintTag(c, text, opts = {}) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  text = (text || 'GH0ST//SEEK').toUpperCase().slice(0, 40);
  if (!opts.keep) bricks(g, w, h, opts.bg || '#140c10');
  // background throw-ups
  for (let i = 0; i < 5; i++) spray(g, rnd(w), rnd(h), rnd(40, 140), pick(COLORS) + '55', 500);
  const fonts = ['Sedgwick', 'WetPaint', 'SprayPaint', 'Marker'];
  const font = opts.font || pick(fonts);
  let size = Math.min(h * .55, (w * 1.6) / Math.max(3, text.length));
  g.save();
  g.translate(w / 2, h / 2);
  g.rotate(rnd(-.18, .12));
  g.font = `${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const fill = pick(COLORS), outline = pick(COLORS.filter(x => x !== fill));
  // 3D extrusion
  for (let i = 14; i > 0; i--) { g.fillStyle = i % 2 ? '#000' : outline; g.fillText(text, i * 1.2, i * 1.4); }
  g.lineJoin = 'round';
  g.lineWidth = size * .16; g.strokeStyle = '#000'; g.strokeText(text, 0, 0);
  g.lineWidth = size * .07; g.strokeStyle = outline; g.strokeText(text, 0, 0);
  const grad = g.createLinearGradient(0, -size / 2, 0, size / 2);
  grad.addColorStop(0, fill); grad.addColorStop(.55, pick(COLORS)); grad.addColorStop(1, fill);
  g.fillStyle = grad; g.fillText(text, 0, 0);
  // highlights
  g.fillStyle = '#fff';
  for (let i = 0; i < 12; i++) g.fillRect(rnd(-size * text.length * .3, size * text.length * .3), rnd(-size * .4, -size * .2), rnd(4, 18), 3);
  const tw = Math.min(w, g.measureText(text).width);
  g.restore();
  drips(g, w / 2 - tw / 2, w / 2 + tw / 2, h / 2 + size * .3, fill, 10 + text.length);
  // crew tag + noise stickers
  g.font = `28px Marker`; g.fillStyle = pick(COLORS); g.textAlign = 'left';
  g.fillText(opts.sub || 'NO TRACKERS · NO COOKIES · NO MASTERS', 22, h - 26);
  for (let i = 0; i < 3; i++) spray(g, rnd(w), rnd(h), rnd(10, 30), '#fff', 80);
  return c;
}

// SERP SHOT: a fake "screenshot" of the results page, ready to be cut up.
export function paintSerp(c, q, items, images = []) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const dark = Math.random() < .5;
  g.fillStyle = dark ? '#0d0d0d' : '#f4f1ea'; g.fillRect(0, 0, w, h);
  g.fillStyle = dark ? '#1c1c1c' : '#ffffff'; g.fillRect(0, 0, w, 64);
  g.font = '34px Sedgwick'; g.fillStyle = '#ff2bd6'; g.fillText('GH0ST//SEEK', 18, 46);
  g.strokeStyle = '#b6ff00'; g.lineWidth = 3; g.strokeRect(280, 14, 560, 38);
  g.font = '20px Mono'; g.fillStyle = dark ? '#eee' : '#111'; g.fillText((q || '').slice(0, 44), 292, 40);
  let y = 100;
  const col = images.length ? w * .66 : w - 40;
  for (const it of items.slice(0, 9)) {
    g.font = '15px Mono'; g.fillStyle = dark ? '#7dff7d' : '#0b7a0b'; g.fillText((it.host || '').slice(0, 60), 24, y);
    g.font = '24px Marker'; g.fillStyle = dark ? '#8ab4ff' : '#1a0dab'; g.fillText(String(it.title).slice(0, 52), 24, y + 28);
    g.font = '14px Mono'; g.fillStyle = dark ? '#bbb' : '#444';
    wrap(g, it.snippet || '', 24, y + 50, col - 40, 18, 2);
    y += 100; if (y > h - 40) break;
  }
  let iy = 90;
  for (const im of images.slice(0, 4)) {
    try {
      const s = Math.min((w - col - 20) / im.naturalWidth, 110 / im.naturalHeight);
      g.drawImage(im, col, iy, im.naturalWidth * s, im.naturalHeight * s); iy += im.naturalHeight * s + 12;
    } catch { /* skip */ }
  }
  return c;
}

function wrap(g, text, x, y, maxW, lh, maxLines) {
  const words = String(text).split(/\s+/); let line = '', n = 0;
  for (const wd of words) {
    const t = line ? line + ' ' + wd : wd;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = wd; if (++n >= maxLines) return; }
    else line = t;
  }
  if (line) g.fillText(line, x, y);
}

// TEXT CARD: terminal-ish dump (used by the fingerprint mirror and the request log)
export function paintText(c, title, lines, color = '#b6ff00') {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.font = '44px SprayPaint'; g.fillStyle = '#ff2bd6'; g.fillText(title, 24, 60);
  g.font = '17px Mono'; g.fillStyle = color;
  let y = 100;
  for (const l of lines) { g.fillText(String(l).slice(0, 100), 24, y); y += 24; if (y > h - 10) break; }
  return c;
}

// NOISE / gradient fallback so the synth is never empty
export function paintNoise(c, hue = rnd(360)) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const gr = g.createLinearGradient(0, 0, w, h);
  for (let i = 0; i <= 6; i++) gr.addColorStop(i / 6, `hsl(${(hue + i * 60) % 360} 100% 55%)`);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { g.fillStyle = `hsla(${rnd(360)},100%,${rnd(30, 70)}%,.7)`; g.fillRect(rnd(w), rnd(h), rnd(10, 300), rnd(4, 60)); }
  g.font = `${h * .3}px Glitch`; g.fillStyle = '#000'; g.textAlign = 'center'; g.fillText('∅', w / 2, h * .62);
  return c;
}

export async function fontsReady() {
  try { await Promise.all(['Sedgwick', 'WetPaint', 'SprayPaint', 'Marker', 'Mono', 'Glitch'].map(f => document.fonts.load(`40px ${f}`))); } catch { /* ignore */ }
}
