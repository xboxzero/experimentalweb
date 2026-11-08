// Sound: a drone that follows the visuals, keystrokes become notes, the mic can drive the image.
export class Sound {
  constructor() { this.ctx = null; this.on = false; this.level = 0; this.analyser = null; this.micStream = null; this.inputs = 0; this.media = new WeakMap(); }

  _ensure() {
    if (this.ctx) return;
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
    this.delay = ctx.createDelay(2); this.delay.delayTime.value = 0.375;
    this.fbk = ctx.createGain(); this.fbk.gain.value = 0.45;
    this.delay.connect(this.fbk); this.fbk.connect(this.delay); this.delay.connect(this.master);
    this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 600; this.filter.Q.value = 8;
    this.filter.connect(this.master); this.filter.connect(this.delay);
    this.oscs = [55, 82.4, 110.3].map((f, i) => {
      const o = ctx.createOscillator(); o.type = i === 1 ? 'square' : 'sawtooth'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.06; o.connect(g); g.connect(this.filter); o.start(); return o;
    });
    this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 0.13;
    const lg = ctx.createGain(); lg.gain.value = 400; this.lfo.connect(lg); lg.connect(this.filter.frequency); this.lfo.start();
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 512;
    this.buf = new Uint8Array(this.analyser.frequencyBinCount);
  }

  // route a <video>/<audio> element's sound into the analyser (drives the visuals) and the speakers
  async connectMedia(el) {
    this._ensure(); await this.ctx.resume();
    if (this.media.has(el)) return true;
    const src = this.ctx.createMediaElementSource(el);
    src.connect(this.analyser); src.connect(this.ctx.destination);
    this.media.set(el, src); this.inputs++;
    return true;
  }

  toggle() {
    this._ensure();
    this.on = !this.on;
    this.ctx.resume();
    this.master.gain.setTargetAtTime(this.on ? 0.5 : 0, this.ctx.currentTime, 0.3);
    return this.on;
  }

  // follow synth parameters
  follow(P, burst) {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    const base = 36 + P.slices * 0.9;
    this.oscs[0].frequency.setTargetAtTime(base, t, 0.4);
    this.oscs[1].frequency.setTargetAtTime(base * (1.5 + P.warp * 2), t, 0.4);
    this.oscs[2].frequency.setTargetAtTime(base * 2 * (1 + P.hue * 0.06) + burst * 30, t, 0.2);
    this.filter.frequency.setTargetAtTime(300 + P.feedback * 1800 + burst * 2500 + P.glitch * 1500, t, 0.1);
    this.fbk.gain.setTargetAtTime(Math.min(0.85, 0.2 + P.feedback * 0.6), t, 0.3);
  }

  // every keystroke = a note
  key(ch) {
    if (!this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const scale = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];
    const n = ch.toLowerCase().charCodeAt(0) || 0;
    const f = 220 * Math.pow(2, scale[n % scale.length] / 12) * (n % 3 === 0 ? 2 : 1);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = n % 2 ? 'triangle' : 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g); g.connect(this.delay); g.connect(this.master); o.start(t); o.stop(t + 0.4);
  }

  noise(dur = 0.15) {
    if (!this.on) return;
    const ctx = this.ctx, b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource(); s.buffer = b; const g = ctx.createGain(); g.gain.value = 0.3;
    s.connect(g); g.connect(this.delay); g.connect(this.master); s.start();
  }

  async mic() {
    this._ensure();
    if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null; this.micSrc.disconnect(); this.inputs--; return false; }
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    await this.ctx.resume();
    this.micSrc = this.ctx.createMediaStreamSource(this.micStream);
    this.micSrc.connect(this.analyser); this.inputs++;
    return true;
  }

  read() {
    if (!this.analyser || this.inputs <= 0) return this.level *= 0.9;
    this.analyser.getByteFrequencyData(this.buf);
    let s = 0; for (let i = 2; i < 64; i++) s += this.buf[i];
    const v = Math.min(1, s / (62 * 160));
    this.level = Math.max(v, this.level * 0.85);
    return this.level;
  }
}
