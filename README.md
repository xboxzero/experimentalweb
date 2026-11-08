# GH0ST//SEEK — experimental web

**Live:** https://xboxzero.github.io/experimentalweb/

An experimental, anti-surveillance search engine that doubles as a psychedelic **visual synthesizer**.
You type, it searches in real time, sprays your query as graffiti, screenshots the results and
**cuts, mixes and loops** them on your GPU.

## Search, without being searched
- **No backend, no cookies, no storage, no analytics, no third-party scripts, self-hosted fonts.**
- Strict Content-Security-Policy and `Referrer-Policy: no-referrer` on every request and link.
- Real-time results straight from open APIs: Wikipedia, DuckDuckGo instant answers, HN Algolia (web links),
  Openverse + Wikimedia Commons (open-licensed images) and the Internet Archive.
- **🛡 Surveillance report:** every request the page makes is logged with host + purpose. **PANIC** wipes it all.
- **WHAT THEY SEE:** a fingerprint mirror showing what any website can read without cookies.
- **ESCAPE TO…** and `!bangs` (`!m`, `!ddg`, `!mg`, `!sx`, `!yt`, `!r`, `!wb` …) to jump to privacy engines.

## Alternative-site finder
- Search a big-tech service (`youtube`, `whatsapp`, `google maps`, `chrome`…) → get the escape routes.
- Paste a link → **link surgery**: tracker params and redirect wrappers removed, rerouted to privacy
  frontends (Invidious, xcancel/Nitter, Redlib, Scribe, BreezeWiki… via farside.link) or archives.
- Full offline directory under **ALT SITES**.

## GH0ST browser & video deck
- **⧉ BROWSER** (`B`): browse inside the page in a credentialless, referrer-less, sandboxed frame with an optional **NO-JS** mode.
  YouTube/Vimeo links become privacy embeds (youtube-nocookie). Sites that refuse framing get archive / frontend / new-tab escape routes.
  **3D WARP**, **MELT** (liquid SVG displacement + hue cycling), **BLEND** (page × synth blend modes) and **PAGE → SYNTH** (live region capture).
- **VIDEO** mode: Wikimedia Commons videos (fed straight into the synth) + Internet Archive films (captured).
  The deck can **SCRATCH**, change speed, and route the soundtrack into the audio-reactive FX. Direct `.mp4/.webm` links play too.
- Results are unfiltered by default; a SAFE FILTER toggle lives in the rack. Escape links turn engine safe-search off; Ahmia (Tor) added.

## Visual synthesizer
- **3D WORLDS:** the synth output becomes the texture of raymarched spaces: TUNNEL, TERRAIN (luminance heightfield fly-over),
  ORB (displaced mirror sphere), CUBE CITY, FRACTAL — with depth, fly speed, twist, lens, fog, and 3D → feedback recursion.
- 8-slot **source bank**: graffiti tag wall (repainted on every keystroke), a live "screenshot" of the
  results page, result thumbnails, **SHOT** (opt-in website screenshots), **live tab/screen capture**,
  webcam, files, pasted screenshots (Ctrl+V) and **SELF ∞** (the output fed back into itself).
- **CUT:** strips / columns / grid / rings / wedges / voronoi shards, reshuffled in time.
- **MIX:** A/B crossfade, 8 blend modes, luminance displacement, source roulette.
- **LOOP:** 48-frame ring buffer with forward / reverse / ping-pong / stutter and **time smear** (slit-scan).
- **PSYCHEDELIC:** feedback zoom/rotate/hue, kaleidoscope, liquid warp, acid palette, posterize, strobe, RGB split, glitch blocks.
- CHAOS, AUTOPILOT, **DÉRIVE** (the page searches random corners of Wikipedia by itself), presets,
  drone + typing sounds, mic-reactive, Web MIDI (CC map + learn), PNG snapshots and WebM recording.

**Engines:** the GPU engine needs WebGL2. If it's switched off (LibreWolf, Mullvad/Tor Browser, hardware acceleration off)
or a shader fails on your GPU, the page falls back to the **LITE engine** (plain Canvas 2D, same controls, fake 3D) and tells you why.
Force it with `#lite` or the ENGINE selector in the rack. The 🛡 report shows which engine is running.

Keys: `H` hide UI · `C` chaos · `R` loop · `Space` burst · `1-8` / `⇧1-8` sources · `A` autopilot · `D` dérive · `S` snap · `F` fullscreen · `/` search.

## Deploy
Static files only. In the repo settings → Pages → deploy from branch (root). Nothing to build.
