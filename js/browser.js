// GH0ST BROWSER: browse inside the page. The frame is credentialless (no cookies of yours go along),
// referrer-less, sandboxed and has no camera, mic or location. Optional NO-JS mode kills page scripts.
// You can melt it, tilt it in 3D, blend it with the synth, or capture it live into the synth.
import { reroute, cleanUrl } from './alts.js';

// sites known to refuse being framed: we offer archive/frontends/new tab instead
const BLOCKS = /(^|\.)(google\.[a-z.]+|youtube\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|reddit\.com|github\.com|mojeek\.com|duckduckgo\.com|amazon\.[a-z.]+|linkedin\.com|tiktok\.com|netflix\.com|apple\.com|microsoft\.com|bing\.com|stackoverflow\.com|medium\.com|nytimes\.com|discord\.com|twitch\.tv|startpage\.com|brave\.com|search\.brave\.com|openai\.com|chatgpt\.com|whatsapp\.com|pinterest\.com|imgur\.com|bsky\.app|threads\.net|paypal\.com|spotify\.com)$/i;
const MEDIA = /\.(mp4|webm|ogv|ogg|mov|m4v)(\?|#|$)/i;

export const SEARCHERS = {
  MARGINALIA: 'https://marginalia-search.com/search?query=%s',
  WIBY: 'https://wiby.me/?q=%s',
  WIKIPEDIA: 'https://en.wikipedia.org/w/index.php?search=%s',
  'OPENSTREETMAP': 'https://www.openstreetmap.org/search?query=%s',
};

// turn watch pages into privacy-enhanced embeds that are allowed in frames
export function embedify(raw) {
  let u; try { u = new URL(raw); } catch { return raw; }
  const h = u.hostname.replace(/^(www|m)\./, '');
  let id = null;
  if (h === 'youtube.com' && u.pathname === '/watch') id = u.searchParams.get('v');
  else if (h === 'youtube.com' && /^\/(shorts|live|embed)\//.test(u.pathname)) id = u.pathname.split('/')[2];
  else if (h === 'youtu.be') id = u.pathname.slice(1);
  if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  const vm = h === 'vimeo.com' && u.pathname.match(/^\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1&autoplay=1`;
  if (h === 'open.spotify.com' && !u.pathname.startsWith('/embed')) return 'https://open.spotify.com/embed' + u.pathname;
  if (h === 'twitter.com' || h === 'x.com') return 'https://xcancel.com' + u.pathname + u.search;
  return raw;
}

export class GhostBrowser {
  constructor(deps) {
    this.d = deps;
    this.el = document.querySelector('#browser');
    this.frame = document.querySelector('#bFrame');
    this.addr = document.querySelector('#bAddr');
    this.note = document.querySelector('#bNote');
    this.hist = []; this.pos = -1; this.js = true; this.blendIdx = 0;
    this.frame.setAttribute('credentialless', '');
    this.frame.referrerPolicy = 'no-referrer';
    this.frame.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
    this._sandbox();
    const $ = (s) => document.querySelector(s);
    $('#bGo').onclick = () => this.go(this.addr.value);
    this.addr.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.go(this.addr.value); } if (e.key === 'Escape') this.addr.blur(); });
    $('#bBack').onclick = () => this.step(-1);
    $('#bFwd').onclick = () => this.step(1);
    $('#bReload').onclick = () => this.load(this.hist[this.pos], false);
    $('#bClose').onclick = () => this.close();
    $('#bExt').onclick = () => this.cur && window.open(this.cur, '_blank', 'noopener,noreferrer');
    $('#bArchive').onclick = () => this.cur && this.load('https://web.archive.org/web/2/' + this.cur);
    $('#bCapture').onclick = () => this.d.captureElement(this.frame, 'PAGE ● ' + (this.host || 'WEB'));
    $('#bWarp').onclick = (e) => e.currentTarget.classList.toggle('on', this.el.classList.toggle('warp'));
    $('#bMelt').onclick = (e) => e.currentTarget.classList.toggle('on', this.el.classList.toggle('melt'));
    $('#bBlend').onclick = (e) => {
      const modes = ['normal', 'difference', 'screen', 'exclusion', 'hard-light', 'luminosity', 'color-dodge'];
      this.blendIdx = (this.blendIdx + 1) % modes.length;
      this.el.style.mixBlendMode = modes[this.blendIdx];
      e.currentTarget.textContent = 'BLEND: ' + modes[this.blendIdx].toUpperCase();
      e.currentTarget.classList.toggle('on', this.blendIdx > 0);
    };
    $('#bJs').onclick = (e) => { this.js = !this.js; this._sandbox(); e.currentTarget.textContent = this.js ? 'JS: ON' : 'JS: OFF'; e.currentTarget.classList.toggle('on', !this.js); if (this.cur) this.load(this.cur, false); this.d.toast(this.js ? 'page scripts allowed' : 'NO-JS: page scripts, trackers and most ads are dead'); };
    $('#bMax').onclick = (e) => e.currentTarget.classList.toggle('on', this.el.classList.toggle('max'));
    // mouse-driven 3D tilt while WARP is on
    this.el.addEventListener('pointermove', (e) => {
      if (!this.el.classList.contains('warp')) return;
      const r = this.el.getBoundingClientRect();
      this.el.style.setProperty('--tx', ((e.clientY - r.top) / r.height - .5) * -14 + 'deg');
      this.el.style.setProperty('--ty', ((e.clientX - r.left) / r.width - .5) * 18 + 'deg');
    });
  }

  _sandbox() {
    const base = 'allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation';
    this.frame.setAttribute('sandbox', this.js ? base + ' allow-scripts' : base);
  }

  get cur() { return this.hist[this.pos]; }

  go(input) {
    input = (input || '').trim(); if (!input) return;
    let url;
    if (/^https?:\/\//i.test(input)) url = input;
    else if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(input)) url = 'https://' + input;
    else url = SEARCHERS[document.querySelector('#bSearcher').value].replace('%s', encodeURIComponent(input));
    this.load(url);
  }

  open(url) { this.el.hidden = false; document.body.classList.add('browsing'); this.load(url); }
  close() { this.el.hidden = true; document.body.classList.remove('browsing'); this.frame.src = 'about:blank'; }

  step(n) { const p = this.pos + n; if (p < 0 || p >= this.hist.length) return; this.pos = p; this.load(this.hist[p], false); }

  load(url, push = true) {
    if (!url) return;
    if (MEDIA.test(url)) { this.d.playVideo(url, url.split('/').pop()); return; }
    const c = cleanUrl(url); if (c) url = c.url;
    const target = embedify(url);
    if (push) { this.hist = this.hist.slice(0, this.pos + 1); this.hist.push(url); this.pos = this.hist.length - 1; }
    this.el.hidden = false; document.body.classList.add('browsing');
    let u; try { u = new URL(target); } catch { return; }
    this.host = u.hostname.replace(/^www\./, '');
    this.addr.value = url;
    try { this.d.logRequest(u.hostname, 'browser frame (no cookies, no referrer)', ''); } catch { }
    this.frame.src = target;
    this.d.onNavigate && this.d.onNavigate(url, this.host);
    this._note(new URL(url), target !== url);
  }

  _note(u, embedded) {
    const kids = [];
    const blocked = BLOCKS.test(u.hostname) && !embedded;
    if (embedded) kids.push(this._span('↪ privacy embed: ' + new URL(embedify(u.href)).hostname, 'ok'));
    if (blocked) kids.push(this._span('⚠ ' + u.hostname + ' usually refuses to be framed — try:', 'warn'));
    else kids.push(this._span('blank or refused? try:', 'dim'));
    for (const [n, l] of reroute(u)) kids.push(this._chip(n, () => this.load(l)));
    kids.push(this._chip('↗ new tab', () => window.open(u.href, '_blank', 'noopener,noreferrer')));
    this.note.replaceChildren(...kids);
  }
  _span(t, c) { const s = document.createElement('span'); s.className = c; s.textContent = t; return s; }
  _chip(t, fn) { const b = document.createElement('button'); b.className = 'chip'; b.textContent = t; b.onclick = fn; return b; }
}

// VIDEO DECK: plays any video; CORS-friendly ones are fed straight into the synth as live sources,
// the rest are captured from the screen region. It can scratch, speed-shift and drive the visuals with its audio.
export class VideoDeck {
  constructor(deps) {
    this.d = deps;
    this.el = document.querySelector('#deck');
    this.v = document.querySelector('#deckVideo');
    this.title = document.querySelector('#deckTitle');
    this.cors = false; this.scratchT = null;
    this.v.loop = true; this.v.playsInline = true;
    const $ = (s) => document.querySelector(s);
    $('#dClose').onclick = () => this.close();
    $('#dFeed').onclick = () => this.feed();
    $('#dCap').onclick = () => this.d.captureElement(this.v, 'VID ● ' + this.title.textContent.slice(0, 10));
    $('#dSpeed').onchange = (e) => { this.v.playbackRate = +e.target.value; };
    $('#dScratch').onclick = (e) => e.currentTarget.classList.toggle('on', this.scratch());
    $('#dAudio').onclick = async (e) => {
      if (!this.cors) return this.d.toast('this video has no CORS — its sound cannot be analysed (try a Commons video)');
      try { await this.d.sound.connectMedia(this.v); this.v.muted = false; e.currentTarget.classList.add('on'); this.d.toast('the soundtrack now drives the visuals'); } catch { this.d.toast('audio routing failed'); }
    };
  }

  async play(url, title = 'video', opts = {}) {
    this.el.hidden = false;
    this.title.textContent = title;
    this.v.muted = true;
    this.cors = !opts.nocors;
    try { this.d.logRequest(new URL(url).hostname, 'video stream', title); } catch { }
    const attempt = (cors) => new Promise((res, rej) => {
      this.v.onloadeddata = () => res(); this.v.onerror = () => rej(new Error('video error'));
      if (cors) this.v.crossOrigin = 'anonymous'; else this.v.removeAttribute('crossorigin');
      this.v.src = url; this.v.load();
    });
    try { await attempt(this.cors); }
    catch {
      if (!this.cors) return this.d.toast('video failed to load');
      this.cors = false;
      try { await attempt(false); } catch { return this.d.toast('video failed to load'); }
    }
    this.v.play().catch(() => { });
    document.querySelector('#dFeed').textContent = this.cors ? 'FEED → SYNTH' : 'FEED (capture)';
    if (opts.autoFeed && this.cors) this.feed();
  }

  feed() {
    if (!this.v.src) return;
    if (this.cors) this.d.feed(this.v, 'VID ● ' + this.title.textContent.slice(0, 10).toUpperCase(), { live: true, toB: true, kind: 'video' });
    else { this.d.toast('this host blocks direct remixing — capturing the player instead'); this.d.captureElement(this.v, 'VID ● ' + this.title.textContent.slice(0, 10)); }
  }

  scratch() {
    if (this.scratchT) { clearInterval(this.scratchT); this.scratchT = null; return false; }
    this.scratchT = setInterval(() => {
      if (!this.v.duration) return;
      const jump = (Math.random() - .5) * 2;
      this.v.currentTime = Math.max(0, Math.min(this.v.duration - .1, this.v.currentTime + jump));
      this.v.playbackRate = [0.5, 1, 1, 2, 3][Math.floor(Math.random() * 5)];
    }, 180 + Math.random() * 200);
    return true;
  }

  close() { if (this.scratchT) this.scratch(); this.v.pause(); this.el.hidden = true; }
}
