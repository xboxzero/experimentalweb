// GH0ST//SEEK — visual synthesizer engine (WebGL2)
// Sources (screenshots, captures, thumbnails, painted canvases) live in a texture array.
// Each frame they get CUT (sliced), MIXED (blended), LOOPED (frame ring buffer + feedback)
// and run through a psychedelic colour / glitch chain. Everything happens locally on your GPU.

export const SRC_W = 1024, SRC_H = 576, SRC_LAYERS = 8;
export const LOOP_W = 640, LOOP_H = 360, LOOP_MAX = 48;

export const BLEND_NAMES = ['MIX', 'ADD', 'MULTIPLY', 'DIFFERENCE', 'SCREEN', 'LUMA KEY', 'WRAP', 'ACID'];
export const CUT_NAMES = ['STRIPS', 'COLUMNS', 'GRID', 'RINGS', 'WEDGES', 'SHARDS'];
export const MIRROR_NAMES = ['OFF', 'LEFT', 'QUAD', 'TILE'];
export const SPACE_NAMES = ['FLAT', 'TUNNEL', 'TERRAIN', 'ORB', 'CUBE CITY', 'FRACTAL'];

// [group, id, label, min, max, step, default, names?]
export const PARAMS = [
  ['3D', 'space', '3D WORLD', 0, 5, 1, 0, SPACE_NAMES],
  ['3D', 'depth', 'DEPTH / DISPLACE', 0, 2, 0.01, 0.8],
  ['3D', 'camSpeed', 'FLY SPEED', -3, 3, 0.01, 0.5],
  ['3D', 'twist', 'TWIST', -2, 2, 0.01, 0.3],
  ['3D', 'fov', 'LENS', 0.3, 3, 0.01, 1],
  ['3D', 'fog', 'FOG', 0, 1, 0.01, 0.35],
  ['3D', 'spaceMix', '3D MIX', 0, 1, 0.01, 1],
  ['3D', 'spaceFb', '3D → FEEDBACK', 0, 1, 1, 0, ['OFF', 'ON']],
  ['MIX', 'layerA', 'SOURCE A', 0, 7, 1, 0],
  ['MIX', 'layerB', 'SOURCE B', 0, 7, 1, 1],
  ['MIX', 'xfade', 'A↔B CROSSFADE', 0, 1, 0.01, 0.5],
  ['MIX', 'blend', 'BLEND', 0, 7, 1, 3, BLEND_NAMES],
  ['MIX', 'chaosSrc', 'SOURCE ROULETTE', 0, 1, 0.01, 0.25],
  ['CUT', 'slices', 'SLICES', 1, 64, 1, 9],
  ['CUT', 'sliceMode', 'CUT MODE', 0, 5, 1, 0, CUT_NAMES],
  ['CUT', 'shuffle', 'RESHUFFLE / SEC', 0, 16, 0.1, 1.5],
  ['CUT', 'jitter', 'SLICE OFFSET', 0, 1, 0.01, 0.22],
  ['CUT', 'sliceTime', 'TIME SMEAR', 0, 1, 0.01, 0],
  ['WARP', 'kaleido', 'KALEIDO', 0, 16, 1, 0],
  ['WARP', 'kaleRot', 'SPIN', -2, 2, 0.01, 0.15],
  ['WARP', 'warp', 'LIQUID', 0, 0.3, 0.001, 0.02],
  ['WARP', 'warpFreq', 'LIQUID FREQ', 0.5, 40, 0.1, 5],
  ['WARP', 'displace', 'DISPLACE', 0, 0.5, 0.001, 0.06],
  ['WARP', 'mirror', 'MIRROR', 0, 3, 1, 0, MIRROR_NAMES],
  ['WARP', 'pixel', 'PIXELATE', 0, 1, 0.01, 0],
  ['COLOR', 'hue', 'HUE SPIN', 0, 1, 0.001, 0],
  ['COLOR', 'hueSpeed', 'HUE DRIFT', 0, 2, 0.01, 0.08],
  ['COLOR', 'palette', 'ACID PALETTE', 0, 1, 0.01, 0.3],
  ['COLOR', 'sat', 'SATURATION', 0, 3, 0.01, 1.35],
  ['COLOR', 'posterize', 'POSTERIZE', 0, 1, 0.01, 0],
  ['COLOR', 'invert', 'INVERT', 0, 1, 0.01, 0],
  ['COLOR', 'strobe', 'STROBE', 0, 1, 0.01, 0],
  ['LOOP', 'feedback', 'FEEDBACK', 0, 0.98, 0.01, 0.55],
  ['LOOP', 'fbZoom', 'FB ZOOM', -0.05, 0.05, 0.001, 0.006],
  ['LOOP', 'fbRot', 'FB ROTATE', -0.05, 0.05, 0.001, 0.002],
  ['LOOP', 'fbHue', 'FB HUE', 0, 0.1, 0.001, 0.008],
  ['LOOP', 'loopMix', 'LOOP MIX', 0, 1, 0.01, 0.65],
  ['LOOP', 'loopSpeed', 'LOOP SPEED', -4, 4, 0.01, 1],
  ['GLITCH', 'glitch', 'GLITCH', 0, 1, 0.01, 0.15],
  ['GLITCH', 'chroma', 'RGB SPLIT', 0, 0.05, 0.0005, 0.004],
  ['GLITCH', 'grain', 'GRAIN', 0, 0.5, 0.01, 0.07],
  ['GLITCH', 'scan', 'SCANLINES', 0, 1, 0.01, 0.2],
  ['GLITCH', 'audioAmt', 'AUDIO REACT', 0, 2, 0.01, 1],
];

const VERT = `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.,-1.), vec2(3.,-1.), vec2(-1.,3.));
out vec2 vUv;
void main(){ vec2 p = P[gl_VertexID]; vUv = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;

const MAIN = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uSrc;
uniform sampler2DArray uLoop;
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform float uTime, uSeed, uBurst, uAudio, uSrcCount;
uniform float uLayerA, uLayerB, uXfade, uBlend, uChaosSrc;
uniform float uSlices, uSliceMode, uShuffle, uJitter, uSliceTime;
uniform float uKaleido, uKaleRot, uWarp, uWarpFreq, uDisplace, uMirror, uPixel;
uniform float uHue, uPalette, uSat, uPosterize, uInvert, uStrobe;
uniform float uFeedback, uFbZoom, uFbRot, uFbHue;
uniform float uLoopMix, uLoopPos, uLoopFrames;
uniform float uGlitch;
in vec2 vUv;
out vec4 o;

float h11(float p){ p = fract(p*.1031); p *= p+33.33; p *= p+p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c)*p; }
float luma(vec3 c){ return dot(c, vec3(.299,.587,.114)); }

vec3 hueRot(vec3 c, float a){
  const mat3 toY = mat3(.299,.596,.211, .587,-.274,-.523, .114,-.322,.312);
  const mat3 toR = mat3(1.,1.,1., .956,-.272,-1.106, .621,-.647,1.703);
  vec3 y = toY*c; float h = atan(y.z, y.y) + a*6.2831853; float ch = length(y.yz);
  y.yz = vec2(cos(h), sin(h))*ch; return toR*y;
}

vec4 src(vec2 uv, float layer){
  layer = mod(floor(layer), max(uSrcCount, 1.));
  return texture(uSrc, vec3(uv.x, 1.-uv.y, layer));
}

vec3 blend(vec3 a, vec3 b, float m, float x){
  if(m < .5) return mix(a, b, x);
  if(m < 1.5) return mix(a, a+b, x);
  if(m < 2.5) return mix(a, a*b*1.6, x);
  if(m < 3.5) return mix(a, abs(a-b), x);
  if(m < 4.5) return mix(a, 1.-(1.-a)*(1.-b), x);
  if(m < 5.5) return mix(a, b, step(x, luma(a)));
  if(m < 6.5) return mix(a, fract(a+b*1.3), x);
  return mix(a, abs(sin((a+b)*6.2831853 + uTime)), x);
}

void main(){
  vec2 uv = vUv;
  float asp = uRes.x/uRes.y;
  float t = uTime, A = uAudio, B = uBurst;

  if(uPixel > 0.){ float n = mix(300., 10., uPixel); vec2 g = vec2(n*asp, n); uv = (floor(uv*g)+.5)/g; }
  if(uMirror > .5 && uMirror < 2.5) uv.x = .5-abs(uv.x-.5);
  if(uMirror > 1.5 && uMirror < 2.5) uv.y = .5-abs(uv.y-.5);
  if(uMirror > 2.5) uv = 1.-abs(1.-2.*fract(uv*1.5));

  vec2 p = (uv-.5)*vec2(asp,1.);
  if(uKaleido >= 2.){
    float r = length(p); float a = atan(p.y, p.x) + t*uKaleRot;
    float seg = 6.2831853/uKaleido; a = mod(a, seg); a = abs(a-seg*.5);
    p = vec2(cos(a), sin(a))*r*(1.+.15*sin(t*.7));
  }
  float w = uWarp*(1.+A*1.5+B*2.);
  p += w*vec2(sin(p.y*uWarpFreq + t*1.3), cos(p.x*uWarpFreq*1.1 - t*1.7));
  uv = p/vec2(asp,1.)+.5;

  // ---------- CUT ----------
  float S = uSlices, m = uSliceMode;
  vec2 cell;
  if(m < .5) cell = vec2(0., floor(uv.y*S));
  else if(m < 1.5) cell = vec2(floor(uv.x*S), 0.);
  else if(m < 2.5) cell = floor(uv*vec2(S, max(1., floor(S/asp+.5))));
  else if(m < 3.5) cell = vec2(floor(length(p)*S), 0.);
  else if(m < 4.5) cell = vec2(floor((atan(p.y,p.x)/6.2831853+.5)*S), 0.);
  else {
    vec2 g = uv*vec2(asp,1.)*S*.5; vec2 ip = floor(g); float best = 9.; vec2 bc = vec2(0.);
    for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
      vec2 c = ip+vec2(float(i), float(j));
      vec2 q = c + .5 + .45*sin(t*.6 + 6.2831*h22(c+uSeed));
      float d = length(g-q); if(d < best){ best = d; bc = c; }
    }
    cell = bc;
  }
  float stp = uShuffle > 0. ? floor(t*uShuffle) : 0.;
  float hc = h21(cell + vec2(uSeed*13.1, stp*7.3));
  float hc2 = h21(cell*1.7 + vec2(stp*3.1, uSeed));
  float jit = uJitter + B*.5;
  vec2 suv = uv;
  if(m < .5) suv.x += (hc-.5)*jit;
  else if(m < 1.5) suv.y += (hc-.5)*jit;
  else suv += (vec2(hc, hc2)-.5)*jit*.6;

  float la = uLayerA, lb = uLayerB;
  if(hc2 < uChaosSrc) la = floor(h11(hc*91.7+stp)*8.);
  if(h21(cell+stp+3.3) < uChaosSrc*.7) lb = floor(h11(hc2*53.1+stp)*8.);

  // ---------- MIX ----------
  vec4 ca = src(suv, la);
  float lumA = luma(ca.rgb);
  vec2 duv = suv + (lumA-.5)*uDisplace*(1.+A*2.)*vec2(cos(t*.9), sin(t*1.3))*2.;
  vec4 cb = src(duv, lb);
  vec3 c = blend(ca.rgb, cb.rgb, uBlend, uXfade);

  // ---------- LOOP (frame ring buffer, sliced through time) ----------
  if(uLoopFrames > .5 && uLoopMix > 0.){
    float fi = mod(floor(uLoopPos + hc*uSliceTime*uLoopFrames), uLoopFrames);
    vec3 lc = texture(uLoop, vec3(suv, fi)).rgb;
    c = mix(c, lc, uLoopMix);
  }

  // ---------- FEEDBACK ----------
  vec2 fp = (vUv-.5)*vec2(asp,1.);
  fp = rot(fp, uFbRot*(1.+A)) * (1. - uFbZoom*(1.+A*2.));
  vec2 fuv = fp/vec2(asp,1.)+.5;
  fuv.x += (h21(vec2(floor(vUv.y*48.), stp)) - .5)*B*.06*(uGlitch+.2);
  vec3 prev = hueRot(texture(uPrev, fuv).rgb, uFbHue);
  float fb = clamp(uFeedback + A*.08, 0., .985);
  c = mix(mix(c, prev, fb), max(c, prev*fb), .3);

  // ---------- COLOUR ----------
  c = hueRot(c, uHue);
  float l = luma(c);
  vec3 pc = .5+.5*cos(6.2831853*(l*1.7 + t*.07 + vec3(0.,.33,.67)));
  c = mix(c, pc, uPalette);
  c = mix(vec3(luma(c)), c, uSat);
  if(uPosterize > 0.){ float lv = mix(24., 2., uPosterize); c = floor(c*lv+.5)/lv; }
  c = mix(c, 1.-c, uInvert);
  if(uStrobe > 0. && h11(floor(t*14.)+uSeed) < uStrobe*.5) c = 1.-c;

  // ---------- GLITCH BLOCKS ----------
  vec2 blk = floor(vUv*vec2(6., 28.)) + floor(t*(10.+B*30.));
  float gb = h21(blk);
  if(gb < uGlitch*.07*(1.+B*10.)) c = src(fract(vUv + vec2(gb*3.7, 0.)), floor(gb*97.)).bgr;

  o = vec4(clamp(c, 0., 1.), 1.);
}`;

const POST = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime, uChroma, uGrain, uScan, uBurst;
in vec2 vUv;
out vec4 o;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
void main(){
  vec2 uv = vUv, d = uv-.5;
  float ca = uChroma*(1.+uBurst*5.);
  vec3 c = vec3(texture(uTex, uv + d*ca*8. + vec2(ca,0.)).r, texture(uTex, uv).g, texture(uTex, uv - d*ca*8. - vec2(ca,0.)).b);
  c *= 1. - uScan*.45*(.5+.5*sin(gl_FragCoord.y*2.2 + uTime*8.));
  c += (h21(gl_FragCoord.xy + fract(uTime)*937.) - .5)*uGrain;
  c *= 1. - dot(d,d)*.7;
  o = vec4(c, 1.);
}`;

// 3D stage: the flat synth output becomes the texture of a raymarched world
const SPACE = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime, uCamT, uSpace, uDepth, uTwist, uFov, uFog, uSpaceMix, uAudio, uBurst;
in vec2 vUv;
out vec4 o;
#define PI 3.14159265
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }
float lum(vec3 c){ return dot(c, vec3(.299,.587,.114)); }
vec3 tx(vec2 uv){ return textureLod(uTex, uv, 0.).rgb; }
vec3 fogc(){ return tx(vec2(.5+.3*sin(uTime*.1), .5+.2*cos(uTime*.13)))*.3; }
float box(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.)) + min(max(q.x, max(q.y, q.z)), 0.); }

vec3 tunnel(vec2 p){
  float r = length(p), a = atan(p.y, p.x);
  a += uTwist*r*1.5 + uTwist*uTime*.25;
  float z = uFov*.4/max(r, 1e-3);
  vec3 c = tx(vec2(a/PI*2., z + uCamT));
  float b = lum(c);
  c *= clamp(r*1.4, 0., 1.)*(.55 + .9*b*uDepth);
  return mix(c, fogc(), clamp(z*uFog*.12, 0., 1.));
}

float hgt(vec2 xz){ return lum(tx(xz*.07))*uDepth*1.6; }
vec3 terrain(vec2 p){
  vec3 ro = vec3(sin(uCamT*.25)*3., 1.7 + .3*sin(uTime*.4) + uAudio*.4, uCamT*4.);
  vec3 rd = normalize(vec3(p, uFov*1.3));
  rd.yz = rot(.32)*rd.yz;
  rd.xy = rot(uTwist*.35*sin(uTime*.2))*rd.xy;
  float t = .1; bool hit = false; vec3 pos = ro;
  for(int i = 0; i < 96; i++){
    pos = ro + rd*t;
    float d = pos.y - hgt(pos.xz);
    if(d < .002*t){ hit = true; break; }
    t += max(d*.45, .01); if(t > 45.) break;
  }
  if(!hit) return tx(vec2(rd.x*.5+.5+uCamT*.02, rd.y*1.5+.2))*.6;
  float e = .06;
  vec3 n = normalize(vec3(hgt(pos.xz-vec2(e,0.)) - hgt(pos.xz+vec2(e,0.)), 2.*e, hgt(pos.xz-vec2(0.,e)) - hgt(pos.xz+vec2(0.,e))));
  vec3 c = tx(pos.xz*.07)*(.35 + .95*clamp(dot(n, normalize(vec3(.4,.8,-.3))), 0., 1.));
  return mix(c, fogc(), 1.-exp(-t*uFog*.09));
}

vec2 suv(vec3 n){ return vec2(atan(n.z, n.x)/PI + uTime*.03, acos(clamp(n.y, -1., 1.))/PI); }
float orbD(vec3 p){ vec3 n = normalize(p); return (length(p) - (1. + uDepth*.4*lum(tx(suv(n))) + .06*uTwist*sin(9.*n.y + uTime*2.) + uAudio*.15))*.55; }
vec3 orb(vec2 p){
  vec3 ro = vec3(0., 0., -3.3/uFov), rd = normalize(vec3(p, 1.5));
  float ang = uCamT*.5;
  ro.xz = rot(ang)*ro.xz; rd.xz = rot(ang)*rd.xz;
  float t = 0.; bool hit = false; vec3 pos = ro;
  for(int i = 0; i < 72; i++){ pos = ro + rd*t; float d = orbD(pos); if(d < .002){ hit = true; break; } t += d; if(t > 12.) break; }
  vec3 bg = tunnel(p*.7)*.4;
  if(!hit) return bg;
  vec3 n = normalize(pos);
  vec3 col = tx(suv(n));
  float fr = pow(1. - abs(dot(n, -rd)), 2.);
  vec3 rf = tx(reflect(rd, n).xy*.5 + .5);
  return col*(.45 + .7*max(dot(n, normalize(vec3(-.5,.7,-.6))), 0.)) + fr*rf;
}

vec3 cubes(vec2 p){
  vec3 ro = vec3(0., 0., uCamT*3.), rd = normalize(vec3(p, uFov));
  rd.xy = rot(uTwist*uTime*.2)*rd.xy;
  float t = 0.; bool hit = false; vec3 pos = ro, q = vec3(0.), id = vec3(0.);
  for(int i = 0; i < 84; i++){
    pos = ro + rd*t; id = floor(pos/3.); q = mod(pos, 3.) - 1.5;
    float h = fract(sin(dot(id, vec3(12.9,78.2,37.7)))*43758.5);
    q.xy = rot(uTime*.5 + h*6.)*q.xy; q.yz = rot(uTime*.3 + h*3.)*q.yz;
    float d = box(q, vec3(.5 + .3*uDepth*h + uAudio*.1));
    if(d < .002){ hit = true; break; } t += d*.7; if(t > 50.) break;
  }
  if(!hit) return fogc();
  vec3 aq = abs(q);
  vec2 uv = (aq.x > aq.y && aq.x > aq.z) ? q.yz : (aq.y > aq.z ? q.xz : q.xy);
  vec3 col = tx(uv*.8 + .5 + id.xy*.37);
  return mix(col, fogc(), 1. - exp(-t*uFog*.06));
}

vec3 fractal(vec2 p){
  vec3 ro = vec3(0., 0., -4. + sin(uCamT*.4)*1.5), rd = normalize(vec3(p, uFov*1.3));
  float t = 0., trap = 1e9; bool hit = false; vec3 pos = ro;
  for(int i = 0; i < 72; i++){
    pos = ro + rd*t; vec3 q = pos; float s = 1.; trap = 1e9;
    for(int k = 0; k < 5; k++){
      q = abs(q) - vec3(.9,.7,.5)*(.75 + .25*uDepth);
      q.xy = rot(uTime*.13 + uTwist)*q.xy; q.xz = rot(uCamT*.1 + .6)*q.xz;
      q *= 1.45; s *= 1.45; trap = min(trap, length(q.xy));
    }
    float d = box(q, vec3(.6))/s;
    if(d < .001){ hit = true; break; } t += d; if(t > 16.) break;
  }
  if(!hit) return fogc()*1.4;
  vec3 col = tx(vec2(trap*.3, pos.z*.2 + uTime*.05));
  return mix(col*(1.25 - t*.05), fogc(), 1. - exp(-t*uFog*.15));
}

void main(){
  vec2 p = (vUv - .5)*vec2(uRes.x/uRes.y, 1.)*2.;
  p += vec2(sin(uTime*37.), cos(uTime*29.))*.012*uBurst;
  float m = uSpace; vec3 c;
  if(m < 1.5) c = tunnel(p); else if(m < 2.5) c = terrain(p); else if(m < 3.5) c = orb(p); else if(m < 4.5) c = cubes(p); else c = fractal(p);
  o = vec4(clamp(mix(tx(vUv), c, uSpaceMix), 0., 1.), 1.);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(gl, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

export class Synth {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) throw Object.assign(new Error('WebGL2 is switched off or unsupported in this browser'), { noGL: true });
    this.gl = gl;
    this.params = {};
    for (const p of PARAMS) this.params[p[1]] = p[6];
    this.scale = 0.75;
    this.time = 0; this.seed = Math.random() * 100; this.burstV = 0; this.audio = 0; this.hueAcc = 0;
    this.sources = new Array(SRC_LAYERS).fill(null); // {el, live, name}
    this.loopFrames = 0; this.loopLen = 24; this.recHead = -1; this.recEvery = 2; this.recTick = 0;
    this.loopPos = 0; this.loopMode = 'fwd'; this.loopDir = 1;
    this.frameHooks = [];
    this.stage = document.createElement('canvas'); this.stage.width = SRC_W; this.stage.height = SRC_H;
    this.sctx = this.stage.getContext('2d', { willReadFrequently: false });

    this.main = program(gl, MAIN);
    this.post = program(gl, POST);
    try { this.space = program(gl, SPACE); } catch (e) { this.space = null; this.spaceError = String(e.message || e).slice(0, 200); }
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; if (this.onLost) this.onLost(); });
    this.camT = 0;
    this.spaceTex = gl.createTexture(); this.spaceFbo = gl.createFramebuffer();
    this.vao = gl.createVertexArray();

    // source texture array
    this.srcTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.srcTex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, SRC_W, SRC_H, SRC_LAYERS);
    this._params3D(gl.MIRRORED_REPEAT);
    // loop ring buffer
    this.loopTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.loopTex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, LOOP_W, LOOP_H, LOOP_MAX);
    this._params3D(gl.MIRRORED_REPEAT);
    this.layerFbo = gl.createFramebuffer();

    this.fbTex = [gl.createTexture(), gl.createTexture()];
    this.fbo = [gl.createFramebuffer(), gl.createFramebuffer()];
    this.cur = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  _params3D(wrap) {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, wrap);
  }

  resize() {
    const gl = this.gl;
    const w = Math.max(64, Math.round(innerWidth * this.scale));
    const h = Math.max(64, Math.round(innerHeight * this.scale));
    this.canvas.width = w; this.canvas.height = h;
    this.w = w; this.h = h;
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.fbTex[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[i]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fbTex[i], 0);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.spaceTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.spaceFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.spaceTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  setScale(s) { this.scale = s; this.resize(); }

  // draw any image-like thing into the staging canvas (cover fit), then upload into layer
  _upload(layer, el) {
    const iw = el.videoWidth || el.naturalWidth || el.width, ih = el.videoHeight || el.naturalHeight || el.height;
    if (!iw || !ih) return false;
    const s = Math.max(SRC_W / iw, SRC_H / ih), dw = iw * s, dh = ih * s;
    this.sctx.fillStyle = '#000'; this.sctx.fillRect(0, 0, SRC_W, SRC_H);
    this.sctx.drawImage(el, (SRC_W - dw) / 2, (SRC_H - dh) / 2, dw, dh);
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.srcTex);
    try {
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, SRC_W, SRC_H, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.stage);
    } catch (e) { return false; } // tainted (no CORS)
    return true;
  }

  setSource(layer, el, opts = {}) {
    if (this.sources[layer] && this.sources[layer].stop && this.sources[layer].el !== el) this.sources[layer].stop();
    this.sources[layer] = { el, live: !!opts.live, name: opts.name || 'source', stop: opts.stop || null, kind: opts.kind || 'image' };
    return this._upload(layer, el);
  }
  refresh(layer) { const s = this.sources[layer]; if (s) return this._upload(layer, s.el); return false; }

  // copy the current output into a source layer (recursion!)
  grabSelf(layer) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbo[this.cur]);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.layerFbo);
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.srcTex, 0, layer);
    // flip vertically so it matches the image convention used by src()
    gl.blitFramebuffer(0, 0, this.w, this.h, 0, SRC_H, SRC_W, 0, gl.COLOR_BUFFER_BIT, gl.LINEAR);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    if (this.sources[layer] && this.sources[layer].stop) this.sources[layer].stop();
    this.sources[layer] = { el: null, live: false, name: 'SELF ∞', kind: 'self' };
  }

  recordLoop(len) { this.loopLen = Math.max(4, Math.min(LOOP_MAX, len | 0)); this.recHead = 0; this.recTick = 0; this.loopFrames = 0; }
  clearLoop() { this.loopFrames = 0; this.recHead = -1; }
  get recording() { return this.recHead >= 0; }

  burst(v = 1) { this.burstV = Math.min(2, this.burstV + v); }
  reseed() { this.seed = Math.random() * 100; }

  _set1(prog, name, v) { const l = prog.u[name]; if (l) this.gl.uniform1f(l, v); }

  frame(dt) {
    if (this.lost) return;
    const gl = this.gl, P = this.params;
    this.time += dt;
    this.burstV *= Math.pow(0.04, dt);
    this.hueAcc = (this.hueAcc + P.hueSpeed * dt * 0.1) % 1;

    for (let i = 0; i < SRC_LAYERS; i++) { const s = this.sources[i]; if (s && s.live) this._upload(i, s.el); }

    // loop playback head
    if (this.loopFrames > 0) {
      const adv = P.loopSpeed * dt * 30 / this.recEvery;
      if (this.loopMode === 'fwd') this.loopPos += adv;
      else if (this.loopMode === 'rev') this.loopPos -= adv;
      else if (this.loopMode === 'pong') {
        this.loopPos += adv * this.loopDir;
        if (this.loopPos >= this.loopFrames - 1) { this.loopPos = this.loopFrames - 1; this.loopDir = -1; }
        if (this.loopPos <= 0) { this.loopPos = 0; this.loopDir = 1; }
      } else if (this.loopMode === 'stut') {
        this.loopPos += adv;
        if (Math.random() < dt * 4) this.loopPos = Math.floor(Math.random() * this.loopFrames);
      }
      this.loopPos = ((this.loopPos % this.loopFrames) + this.loopFrames) % this.loopFrames;
    }

    const prev = this.cur, next = 1 - this.cur;
    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, this.w, this.h);

    // main pass
    const m = this.main;
    gl.useProgram(m.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[next]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.srcTex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.loopTex);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.fbTex[prev]);
    gl.uniform1i(m.u.uSrc, 0); gl.uniform1i(m.u.uLoop, 1); gl.uniform1i(m.u.uPrev, 2);
    gl.uniform2f(m.u.uRes, this.w, this.h);
    this._set1(m, 'uTime', this.time); this._set1(m, 'uSeed', this.seed);
    this._set1(m, 'uBurst', this.burstV); this._set1(m, 'uAudio', this.audio * P.audioAmt);
    this._set1(m, 'uSrcCount', SRC_LAYERS);
    for (const k in P) this._set1(m, 'u' + k[0].toUpperCase() + k.slice(1), P[k]);
    this._set1(m, 'uHue', (P.hue + this.hueAcc) % 1);
    this._set1(m, 'uLoopPos', this.loopPos); this._set1(m, 'uLoopFrames', this.loopFrames);
    if (this.loopFrames === 0) this._set1(m, 'uLoopMix', 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 3D stage
    const in3D = P.space >= 0.5 && !!this.space;
    if (in3D) {
      this.camT += dt * P.camSpeed * (1 + this.audio * P.audioAmt);
      const sp = this.space;
      gl.useProgram(sp.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.spaceFbo);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fbTex[next]);
      gl.uniform1i(sp.u.uTex, 0);
      gl.uniform2f(sp.u.uRes, this.w, this.h);
      this._set1(sp, 'uTime', this.time); this._set1(sp, 'uCamT', this.camT);
      this._set1(sp, 'uAudio', this.audio * P.audioAmt); this._set1(sp, 'uBurst', this.burstV);
      for (const k of ['space', 'depth', 'twist', 'fov', 'fog', 'spaceMix']) this._set1(sp, 'u' + k[0].toUpperCase() + k.slice(1), P[k]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (P.spaceFb >= 0.5) { // let the 3D world fall back into the feedback loop
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.spaceFbo);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo[next]);
        gl.blitFramebuffer(0, 0, this.w, this.h, 0, 0, this.w, this.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      }
    }
    const showTex = in3D && P.spaceFb < 0.5 ? this.spaceTex : this.fbTex[next];

    // record into loop ring buffer
    if (this.recHead >= 0 && (this.recTick++ % this.recEvery === 0)) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, in3D && P.spaceFb < 0.5 ? this.spaceFbo : this.fbo[next]);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.layerFbo);
      gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.loopTex, 0, this.recHead);
      gl.blitFramebuffer(0, 0, this.w, this.h, 0, 0, LOOP_W, LOOP_H, gl.COLOR_BUFFER_BIT, gl.LINEAR);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      this.recHead++;
      if (this.recHead >= this.loopLen) { this.loopFrames = this.loopLen; this.recHead = -1; this.loopPos = 0; if (this.onLoopDone) this.onLoopDone(); }
    }

    // post pass to screen
    const q = this.post;
    gl.useProgram(q.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, showTex);
    gl.uniform1i(q.u.uTex, 0);
    gl.uniform2f(q.u.uRes, this.w, this.h);
    this._set1(q, 'uTime', this.time); this._set1(q, 'uChroma', P.chroma + this.audio * P.audioAmt * 0.004);
    this._set1(q, 'uGrain', P.grain); this._set1(q, 'uScan', P.scan); this._set1(q, 'uBurst', this.burstV);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.cur = next;

    for (const f of this.frameHooks.splice(0)) f(this.canvas);
  }

  // run fn(canvas) right after the next frame is drawn (for snapshots)
  afterFrame(fn) { this.frameHooks.push(fn); }
}
