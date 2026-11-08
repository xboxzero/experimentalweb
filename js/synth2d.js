// LITE ENGINE — the same synth built on plain Canvas 2D, for browsers where WebGL is off or missing
// (LibreWolf, Mullvad/Tor Browser, hardware acceleration disabled, old GPUs).
// Fewer pixels, same idea: cut, mix, loop, feed back, fake 3D.
import { PARAMS, SRC_LAYERS } from './synth.js';

const LW = 512, LH = 288;          // source layers
const PW = 320, PH = 180;          // loop frames
const LOOP_MAX = 48;
const OPS = ['source-over', 'lighter', 'multiply', 'difference', 'screen', 'luminosity', 'exclusion', 'color-dodge'];
const h1 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export class Synth2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d', { alpha: false });
    if (!this.g) throw new Error('Canvas 2D unavailable');
    this.lite = true;
    this.params = {};
    for (const p of PARAMS) this.params[p[1]] = p[6];
    this.scale = 0.5;
    this.time = 0; this.seed = Math.random() * 100; this.burstV = 0; this.audio = 0; this.hueAcc = 0; this.camT = 0;
    this.sources = new Array(SRC_LAYERS).fill(null);
    this.layers = Array.from({ length: SRC_LAYERS }, () => mk(LW, LH));
    this.loop = []; this.loopFrames = 0; this.loopLen = 24; this.recHead = -1; this.recTick = 0; this.recEvery = 2;
    this.loopPos = 0; this.loopMode = 'fwd'; this.loopDir = 1;
    this.frameHooks = [];
    this.tiny = mk(64, 36);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = Math.max(64, Math.round(innerWidth * this.scale)), h = Math.max(64, Math.round(innerHeight * this.scale));
    this.canvas.width = w; this.canvas.height = h; this.w = w; this.h = h;
    this.bufs = [mk(w, h), mk(w, h)]; this.cur = 0; this.tmp = mk(w, h);
    for (const b of this.bufs) { const x = b.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, w, h); }
    this.scanPat = null;
  }
  setScale(s) { this.scale = Math.min(s, 0.75); this.resize(); }

  _upload(i, el) {
    const iw = el.videoWidth || el.naturalWidth || el.width, ih = el.videoHeight || el.naturalHeight || el.height;
    if (!iw || !ih) return false;
    const x = this.layers[i].getContext('2d'), s = Math.max(LW / iw, LH / ih);
    x.fillStyle = '#000'; x.fillRect(0, 0, LW, LH);
    try { x.drawImage(el, (LW - iw * s) / 2, (LH - ih * s) / 2, iw * s, ih * s); } catch { return false; }
    return true;
  }
  setSource(i, el, o = {}) {
    if (this.sources[i] && this.sources[i].stop && this.sources[i].el !== el) this.sources[i].stop();
    this.sources[i] = { el, live: !!o.live, name: o.name || 'source', stop: o.stop || null, kind: o.kind || 'image' };
    return this._upload(i, el);
  }
  refresh(i) { const s = this.sources[i]; return s ? this._upload(i, s.el) : false; }
  grabSelf(i) {
    this.layers[i].getContext('2d').drawImage(this.canvas, 0, 0, LW, LH);
    if (this.sources[i] && this.sources[i].stop) this.sources[i].stop();
    this.sources[i] = { el: null, live: false, name: 'SELF ∞', kind: 'self' };
  }
  recordLoop(len) { this.loopLen = Math.max(4, Math.min(LOOP_MAX, len | 0)); this.recHead = 0; this.recTick = 0; this.loopFrames = 0; }
  clearLoop() { this.loopFrames = 0; this.recHead = -1; }
  get recording() { return this.recHead >= 0; }
  burst(v = 1) { this.burstV = Math.min(2, this.burstV + v); }
  reseed() { this.seed = Math.random() * 100; }
  afterFrame(fn) { this.frameHooks.push(fn); }

  _layer(n) { return this.layers[((Math.floor(n) % SRC_LAYERS) + SRC_LAYERS) % SRC_LAYERS]; }

  frame(dt) {
    const P = this.params, w = this.w, h = this.h, t = (this.time += dt);
    this.burstV *= Math.pow(0.04, dt);
    this.hueAcc = (this.hueAcc + P.hueSpeed * dt * 0.1) % 1;
    const A = this.audio * P.audioAmt, B = this.burstV;
    for (let i = 0; i < SRC_LAYERS; i++) { const s = this.sources[i]; if (s && s.live) this._upload(i, s.el); }

    if (this.loopFrames > 0) {
      const adv = P.loopSpeed * dt * 30 / this.recEvery;
      if (this.loopMode === 'rev') this.loopPos -= adv;
      else if (this.loopMode === 'pong') { this.loopPos += adv * this.loopDir; if (this.loopPos >= this.loopFrames - 1 || this.loopPos <= 0) this.loopDir *= -1; }
      else { this.loopPos += adv; if (this.loopMode === 'stut' && Math.random() < dt * 4) this.loopPos = Math.random() * this.loopFrames; }
      this.loopPos = ((this.loopPos % this.loopFrames) + this.loopFrames) % this.loopFrames;
    }

    const prev = this.bufs[this.cur], out = this.bufs[1 - this.cur], x = out.getContext('2d');
    x.save();
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'none';
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);

    // feedback: previous frame, zoomed + rotated + hue shifted
    const fb = Math.min(0.97, P.feedback + A * 0.08);
    x.save();
    x.translate(w / 2, h / 2); x.rotate(P.fbRot * (1 + A) * 3); const z = 1 + P.fbZoom * (1 + A * 2) * 3; x.scale(z, z); x.translate(-w / 2, -h / 2);
    if (P.fbHue > 0) x.filter = `hue-rotate(${(P.fbHue * 360 * 3).toFixed(1)}deg)`;
    x.drawImage(prev, 0, 0);
    x.restore();

    // CUT + MIX: draw each slice from source A, then source B with a blend op
    const S = Math.min(48, Math.max(1, Math.round(P.slices))), mode = Math.round(P.sliceMode);
    const step = P.shuffle > 0 ? Math.floor(t * P.shuffle) : 0, jit = P.jitter + B * 0.5;
    const alpha = 1 - fb * 0.85;
    const cells = [];
    if (mode === 0) for (let i = 0; i < S; i++) cells.push({ id: i, rect: [0, i * h / S, w, h / S + 1] });
    else if (mode === 1) for (let i = 0; i < S; i++) cells.push({ id: i, rect: [i * w / S, 0, w / S + 1, h] });
    else if (mode === 3) for (let i = S; i > 0; i--) cells.push({ id: i, ring: i / S });
    else if (mode === 4) for (let i = 0; i < S; i++) cells.push({ id: i, wedge: [i / S, (i + 1) / S] });
    else { const gy = Math.max(1, Math.round(S * h / w)); for (let j = 0; j < gy; j++) for (let i = 0; i < S; i++) cells.push({ id: i + j * 97, rect: [i * w / S, j * h / gy, w / S + 1, h / gy + 1], shard: mode === 5 }); }
    if (cells.length > 220) cells.length = 220;
    const R = Math.hypot(w, h) / 2;
    for (const c of cells) {
      const hc = h1(c.id + this.seed * 13.1 + step * 7.3), hc2 = h1(c.id * 1.7 + step * 3.1 + this.seed);
      let la = P.layerA, lb = P.layerB;
      if (hc2 < P.chaosSrc) la = Math.floor(h1(hc * 91.7 + step) * 8);
      if (h1(c.id + step + 3.3) < P.chaosSrc * 0.7) lb = Math.floor(h1(hc2 * 53.1 + step) * 8);
      const ox = (hc - 0.5) * jit * w, oy = mode === 1 ? (hc - 0.5) * jit * h : (mode >= 2 ? (hc2 - 0.5) * jit * h * 0.6 : 0);
      x.save();
      x.beginPath();
      if (c.rect) {
        if (c.shard) { const [rx, ry, rw, rh] = c.rect; x.moveTo(rx + rw * h1(c.id), ry); x.lineTo(rx + rw, ry + rh * h1(c.id + 1)); x.lineTo(rx + rw * h1(c.id + 2), ry + rh); x.lineTo(rx, ry + rh * h1(c.id + 3)); }
        else x.rect(...c.rect);
      } else if (c.ring) x.arc(w / 2, h / 2, c.ring * R, 0, Math.PI * 2);
      else { x.moveTo(w / 2, h / 2); x.arc(w / 2, h / 2, R, c.wedge[0] * Math.PI * 2, c.wedge[1] * Math.PI * 2); x.closePath(); }
      x.clip();
      x.globalAlpha = alpha;
      x.drawImage(this._layer(la), ox, oy, w, h);
      x.globalCompositeOperation = OPS[Math.round(P.blend)] || 'source-over';
      x.globalAlpha = alpha * (P.blend < 0.5 ? P.xfade : Math.min(1, P.xfade * 1.6));
      x.drawImage(this._layer(lb), -ox * 0.5 + Math.sin(t) * P.displace * w * 0.3, -oy * 0.5, w, h);
      if (this.loopFrames > 0 && P.loopMix > 0) {
        const fi = Math.floor(this.loopPos + hc * P.sliceTime * this.loopFrames) % this.loopFrames;
        x.globalCompositeOperation = 'source-over'; x.globalAlpha = P.loopMix * alpha;
        x.drawImage(this.loop[fi], ox, oy, w, h);
      }
      x.restore();
    }

    // liquid warp: re-draw the frame as wavy strips
    if (P.warp > 0.004 || B > 0.3) {
      const t2 = this.tmp.getContext('2d'); t2.drawImage(out, 0, 0);
      const n = 36, amp = (P.warp + B * 0.03) * w * (1 + A);
      for (let i = 0; i < n; i++) x.drawImage(this.tmp, 0, i * h / n, w, h / n + 1, Math.sin(i / n * P.warpFreq + t * 1.5) * amp, i * h / n, w, h / n + 1);
    }

    // glitch blocks
    const gN = Math.floor(P.glitch * 8 * (1 + B * 6));
    for (let i = 0; i < gN; i++) {
      const bx = Math.random() * w, by = Math.random() * h, bw = Math.random() * w * 0.4, bh = Math.random() * h * 0.08 + 2;
      x.globalCompositeOperation = Math.random() < .5 ? 'difference' : 'source-over'; x.globalAlpha = 1;
      x.drawImage(this._layer(Math.random() * 8), bx / w * LW, by / h * LH, bw / w * LW, bh / h * LH, bx + (Math.random() - .5) * 60, by, bw, bh);
    }
    x.restore();

    // kaleidoscope / mirror
    if (P.kaleido >= 2 || P.mirror >= 1) this._kaleido(out, P);
    // fake 3D worlds
    if (P.space >= 0.5) { this.camT += dt * P.camSpeed * (1 + A); this._space(out, P); }

    // loop recording
    if (this.recHead >= 0 && (this.recTick++ % this.recEvery === 0)) {
      if (!this.loop[this.recHead]) this.loop[this.recHead] = mk(PW, PH);
      this.loop[this.recHead].getContext('2d').drawImage(out, 0, 0, PW, PH);
      if (++this.recHead >= this.loopLen) { this.loopFrames = this.loopLen; this.recHead = -1; this.loopPos = 0; if (this.onLoopDone) this.onLoopDone(); }
    }

    // display: colour chain via CSS-style filters, pixelate, scanlines, grain
    const g = this.g;
    g.save();
    const hue = ((P.hue + this.hueAcc) % 1) * 360;
    const strobe = P.strobe > 0 && h1(Math.floor(t * 14) + this.seed) < P.strobe * 0.5;
    const inv = Math.min(1, P.invert + (strobe ? 1 : 0));
    g.filter = `hue-rotate(${hue.toFixed(1)}deg) saturate(${(P.sat * (1 + P.palette * 1.5)).toFixed(2)}) contrast(${(1 + P.posterize * 0.8 + P.palette * 0.3).toFixed(2)})${inv > 0.01 ? ` invert(${inv.toFixed(2)})` : ''}`;
    if (P.pixel > 0.02) {
      const tw = Math.max(8, Math.round(w * (1 - P.pixel) * 0.25)), th = Math.max(5, Math.round(tw * h / w));
      if (this.tiny.width !== tw) { this.tiny.width = tw; this.tiny.height = th; }
      this.tiny.getContext('2d').drawImage(out, 0, 0, tw, th);
      g.imageSmoothingEnabled = false; g.drawImage(this.tiny, 0, 0, w, h); g.imageSmoothingEnabled = true;
    } else g.drawImage(out, 0, 0);
    g.filter = 'none';
    const ca = (P.chroma + A * 0.004) * (1 + B * 5) * w;
    if (ca > 0.5) { g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.35; g.drawImage(out, ca, 0); g.drawImage(out, -ca, 0); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    if (P.scan > 0.02) {
      if (!this.scanPat) { const s = mk(2, 4), sx = s.getContext('2d'); sx.fillStyle = '#000'; sx.fillRect(0, 0, 2, 2); this.scanPat = g.createPattern(s, 'repeat'); }
      g.globalAlpha = P.scan * 0.45; g.fillStyle = this.scanPat; g.fillRect(0, 0, w, h);
    }
    if (P.grain > 0.02) { g.globalAlpha = P.grain; for (let i = 0; i < 160; i++) { g.fillStyle = Math.random() < .5 ? '#fff' : '#000'; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } }
    g.restore();
    this.cur = 1 - this.cur;
    for (const f of this.frameHooks.splice(0)) f(this.canvas);
  }

  _kaleido(out, P) {
    const w = this.w, h = this.h, t2 = this.tmp.getContext('2d'), x = out.getContext('2d');
    t2.drawImage(out, 0, 0);
    x.save();
    if (P.kaleido >= 2) {
      const n = Math.round(P.kaleido), seg = Math.PI * 2 / n, R = Math.hypot(w, h);
      x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
      x.translate(w / 2, h / 2); x.rotate(this.time * P.kaleRot);
      for (let i = 0; i < n; i++) {
        x.save(); x.rotate(i * seg); if (i % 2) x.scale(1, -1);
        x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R, -0.01, seg + 0.01); x.closePath(); x.clip();
        x.drawImage(this.tmp, -w / 2, -h / 2); x.restore();
      }
    } else {
      const m = Math.round(P.mirror);
      x.translate(w, 0); x.scale(-1, 1); x.drawImage(this.tmp, 0, 0, w / 2, h, 0, 0, w / 2, h);
      if (m >= 2) { x.setTransform(1, 0, 0, -1, 0, h); x.drawImage(out, 0, 0, w, h / 2, 0, 0, w, h / 2); }
    }
    x.restore();
  }

  _space(out, P) {
    const w = this.w, h = this.h, t2 = this.tmp.getContext('2d'), x = out.getContext('2d'), mode = Math.round(P.space), c = this.camT, tt = this.time;
    t2.drawImage(out, 0, 0);
    x.save();
    x.globalAlpha = 1; x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    if (mode === 1 || mode === 5) {           // TUNNEL / FRACTAL: nested zooming copies (droste)
      const n = mode === 5 ? 9 : 12;
      for (let i = n; i >= 0; i--) {
        const f = ((i + (c % 1)) / n), s = Math.pow(f, 2.2) * 2.4 / P.fov + 0.02;
        x.save(); x.translate(w / 2, h / 2); x.rotate(P.twist * f * 2 + (mode === 5 ? tt * 0.2 * (i % 2 ? 1 : -1) : 0)); x.scale(s, s);
        x.globalAlpha = Math.min(1, f * 2) * (1 - P.fog * (1 - f)); if (mode === 5 && i % 2) x.scale(-1, 1);
        x.drawImage(this.tmp, -w / 2, -h / 2); x.restore();
      }
    } else if (mode === 2) {                  // TERRAIN: mode-7 style perspective floor + sky
      x.drawImage(this.tmp, 0, 0, w, h * 0.5, 0, 0, w, h * 0.42);
      const rows = 70, hz = h * 0.42;
      for (let i = 0; i < rows; i++) {
        const f = (i + 1) / rows, y = hz + f * f * (h - hz), sw = w * (0.2 + f * 2.2 * P.fov);
        const srcY = ((c * 40 + (1 / f) * 20 * P.depth) % h + h) % h;
        x.globalAlpha = 1 - P.fog * (1 - f);
        x.drawImage(this.tmp, 0, srcY, w, 2, w / 2 - sw / 2 + Math.sin(c * 0.5) * 40 * (1 - f), y, sw, (h - hz) / rows * 2.2 * f + 1);
      }
    } else if (mode === 3) {                  // ORB: spinning sphere-ish slices
      x.drawImage(this.tmp, 0, 0); x.globalAlpha = 0.6; x.fillRect(0, 0, w, h); x.globalAlpha = 1;
      const r = Math.min(w, h) * 0.38 * (1 + this.audio * 0.2), cx = w / 2, cy = h / 2, n = 40;
      x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI, sw = Math.sin(a) * r * 2, y = cy - Math.cos(a) * r;
        x.drawImage(this.tmp, ((c * 60 + i * P.twist * 8) % (w / 2) + w / 2) % (w / 2), (i / n) * h, w / 2, h / n, cx - sw / 2, y, sw, r * 2 / n + 1);
      }
      const gr = x.createRadialGradient(cx - r * .4, cy - r * .4, r * .1, cx, cy, r); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(0,0,0,.6)');
      x.fillStyle = gr; x.fillRect(cx - r, cy - r, r * 2, r * 2); x.restore();
    } else if (mode === 4) {                  // CUBE CITY: tiles of spinning copies flying at you
      const n = 14;
      for (let i = 0; i < n; i++) {
        const k = h1(i * 7.7), f = ((k + c * 0.25) % 1), s = 0.05 + f * f * 1.4 / P.fov;
        x.save(); x.translate(w / 2 + (h1(i) - .5) * w * f * 1.6, h / 2 + (h1(i + 9) - .5) * h * f * 1.6); x.rotate(tt * (k - .5) * 2 + P.twist);
        x.globalAlpha = Math.min(1, f * 3) * (1 - P.fog * (1 - f));
        x.drawImage(this.tmp, (k * w) % (w * .5), 0, w * .5, h * .5, -w * s / 2, -w * s / 2, w * s, w * s); x.restore();
      }
    }
    x.restore();
    if (P.spaceMix < 0.99) { x.globalAlpha = 1 - P.spaceMix; x.drawImage(this.tmp, 0, 0); x.globalAlpha = 1; }
  }
}
