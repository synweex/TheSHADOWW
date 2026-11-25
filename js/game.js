// SkyStack City — motorul jocului (canvas 2D)
window.SC = window.SC || {};

(function () {
  const W = 360;          // lățimea logică a ecranului
  const FH = 40;          // înălțimea unui etaj
  const BASE_BW = 128;    // lățimea unui bloc
  const THETA = 0.46;     // amplitudinea balansului macaralei
  const OMEGA = 1.4;      // viteza de bază a balansului (mai mică = mai lent)
  const SLING = 12;       // lungimea chingilor dintre cârlig și bloc

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeBack = (t) => { t = clamp(t, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const damp = (k, dt) => 1 - Math.exp(-k * dt);

  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) {
    const A = hexRgb(a), B = hexRgb(b);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function star(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = rot + (k * Math.PI) / 5, rr = k % 2 ? r * 0.42 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  // ---------- Stiluri de clădiri ----------
  const STYLE = {
    casa:    { wall: ['#f4c690', '#efba7e', '#f7d1a2'], trim: '#b5643a', win: '#86cfe9', cols: 3 },
    bloc:    { wall: ['#a9c0d6', '#9db5cd', '#b3c8dc'], trim: '#5e7590', win: '#d3ecf9', cols: 4 },
    birouri: { wall: ['#4fb3c8', '#47a9be', '#58bcd0'], trim: '#2b6f80', win: '#c4f4ff', cols: 6, glass: true },
    turn:    { wall: ['#38476b', '#34436a', '#3f5079'], trim: '#d9b45a', win: '#7fa0d8', cols: 5, gold: true },
    spatiu:  { wall: ['#e3e8f0', '#d6dde9', '#eaeef5'], trim: '#8b97ab', win: '#6fd3ff', cols: 3, space: true },
  };
  SC.STYLE = STYLE;

  function drawFloor(ctx, cx, top, w, h, style, i, lit, ground) {
    const S = STYLE[style] || STYLE.bloc;
    const x = cx - w / 2;
    ctx.fillStyle = S.wall[i % 3];
    ctx.fillRect(x, top, w, h);
    // umbră laterală + lumină pe muchie + umbra plăcii de deasupra
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + w * 0.84, top, w * 0.16, h);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x, top, w * 0.045, h);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(x, top, w, 3);

    if (S.space) {
      if (i % 2 === 0) {
        for (const side of [-1, 1]) {
          const px = side < 0 ? x - w * 0.3 : x + w * 1.06;
          ctx.fillStyle = '#23468f';
          ctx.fillRect(px, top + h * 0.28, w * 0.24, h * 0.44);
          ctx.fillStyle = 'rgba(140,190,255,0.35)';
          ctx.fillRect(px, top + h * 0.28, w * 0.24, h * 0.12);
          ctx.strokeStyle = '#6f8fd0'; ctx.lineWidth = 1;
          for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(px + k * w * 0.06, top + h * 0.28); ctx.lineTo(px + k * w * 0.06, top + h * 0.72); ctx.stroke(); }
        }
        ctx.fillStyle = '#8b97ab';
        ctx.fillRect(x - w * 0.06, top + h * 0.46, w * 0.06, h * 0.08);
        ctx.fillRect(x + w, top + h * 0.46, w * 0.06, h * 0.08);
      }
      for (let c = 0; c < S.cols; c++) {
        const wx = x + w * (0.2 + c * 0.3);
        ctx.fillStyle = '#7b879b';
        ctx.beginPath(); ctx.arc(wx, top + h * 0.48, h * 0.24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hash(i * 7 + c) < 0.6 ? '#ffe28a' : S.win;
        ctx.beginPath(); ctx.arc(wx, top + h * 0.48, h * 0.17, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(wx - h * 0.06, top + h * 0.42, h * 0.05, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ff7a59';
      ctx.fillRect(x, top + h - 6, w, 2);
      ctx.fillStyle = S.trim;
      ctx.fillRect(x - 2, top + h - 4, w + 4, 4);
      return;
    }

    const m = w * 0.08;
    const slot = (w - 2 * m) / S.cols;
    const ww = slot * (S.glass ? 0.82 : 0.6);
    const wh = h * (S.glass ? 0.66 : 0.48);
    const wy = top + h * (S.glass ? 0.12 : 0.18);
    for (let c = 0; c < S.cols; c++) {
      const wx = x + m + c * slot + (slot - ww) / 2;
      if (ground && c === Math.floor(S.cols / 2)) {
        ctx.fillStyle = '#5a3b2a';
        ctx.fillRect(wx - 2, top + h * 0.28, ww + 4, h * 0.72 - 5);
        ctx.fillStyle = '#7a5640';
        ctx.fillRect(wx, top + h * 0.32, ww, 3);
        ctx.fillStyle = '#e8c07a';
        ctx.fillRect(wx + ww - 3, top + h * 0.6, 2, 3);
        continue;
      }
      const isLit = hash(i * 13 + c * 3.7) < (lit ? 0.8 : S.gold ? 0.45 : 0.12);
      ctx.fillStyle = isLit ? '#ffd866' : S.win;
      ctx.fillRect(wx, wy, ww, wh);
      if (isLit) {
        ctx.fillStyle = 'rgba(255,170,60,0.35)';
        ctx.fillRect(wx, wy + wh * 0.6, ww, wh * 0.4);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.moveTo(wx, wy + wh * 0.7); ctx.lineTo(wx + ww * 0.55, wy); ctx.lineTo(wx + ww * 0.8, wy); ctx.lineTo(wx, wy + wh); ctx.closePath(); ctx.fill();
      }
      if (style === 'casa') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(wx - 2, wy - 2, ww + 4, 2);
        ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        ctx.fillStyle = '#d4553f';
        ctx.fillRect(wx - 1, wy + wh, ww + 2, 3);
        ctx.fillStyle = '#6cc04a';
        ctx.fillRect(wx, wy + wh - 2, ww, 2);
      } else if (style === 'bloc' && c % 2 === 0) {
        ctx.fillStyle = '#6b819a';
        ctx.fillRect(wx - 3, wy + wh, ww + 6, 3);
        ctx.fillRect(wx - 3, wy + wh - 6, 1.5, 6);
        ctx.fillRect(wx + ww + 1.5, wy + wh - 6, 1.5, 6);
      }
    }
    if (S.gold) {
      ctx.fillStyle = S.trim;
      ctx.fillRect(x + 2, top, 3, h);
      ctx.fillRect(x + w - 5, top, 3, h);
    }
    ctx.fillStyle = S.trim;
    ctx.fillRect(x - 3, top + h - 5, w + 6, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x - 3, top + h - 5, w + 6, 1);
  }
  SC.drawFloor = drawFloor;

  function drawRoof(ctx, cx, top, w, style, t) {
    const x = cx - w / 2;
    if (style === 'casa') {
      ctx.fillStyle = '#7a3b2a';
      ctx.fillRect(x + w * 0.66, top - 34, 12, 24);
      ctx.fillStyle = '#c4453a';
      ctx.beginPath(); ctx.moveTo(x - 10, top); ctx.lineTo(cx, top - 38); ctx.lineTo(x + w + 10, top); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.moveTo(cx, top - 38); ctx.lineTo(x + w + 10, top); ctx.lineTo(cx, top); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#86cfe9';
      ctx.beginPath(); ctx.arc(cx, top - 16, 6, 0, Math.PI * 2); ctx.fill();
    } else if (style === 'bloc') {
      ctx.fillStyle = '#5e7590';
      ctx.fillRect(x - 3, top - 8, w + 6, 8);
      ctx.fillStyle = '#8796a8';
      ctx.fillRect(x + w * 0.15, top - 26, 26, 18);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.75, top - 8); ctx.lineTo(x + w * 0.75, top - 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.75 - 8, top - 32); ctx.lineTo(x + w * 0.75 + 8, top - 32); ctx.stroke();
    } else if (style === 'birouri') {
      ctx.fillStyle = '#2b6f80';
      ctx.fillRect(x - 3, top - 10, w + 6, 10);
      ctx.fillStyle = '#3a3f4a';
      ctx.beginPath(); ctx.ellipse(cx, top - 12, w * 0.36, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('H', cx, top - 12);
    } else if (style === 'turn') {
      ctx.fillStyle = '#2c3856';
      ctx.fillRect(x + w * 0.12, top - 16, w * 0.76, 16);
      ctx.fillRect(x + w * 0.28, top - 32, w * 0.44, 16);
      ctx.fillStyle = '#d9b45a';
      ctx.fillRect(x + w * 0.12, top - 18, w * 0.76, 3);
      ctx.fillRect(x + w * 0.28, top - 34, w * 0.44, 3);
      ctx.fillStyle = '#c9ced8';
      ctx.beginPath(); ctx.moveTo(cx - 4, top - 34); ctx.lineTo(cx, top - 90); ctx.lineTo(cx + 4, top - 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = Math.sin(t * 5) > 0 ? '#ff3b3b' : '#6b1a1a';
      ctx.beginPath(); ctx.arc(cx, top - 90, 3.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#8b97ab';
      ctx.fillRect(cx - 3, top - 30, 6, 30);
      ctx.fillStyle = '#dfe5ee';
      ctx.beginPath(); ctx.ellipse(cx, top - 32, 24, 9, -0.3, 0, Math.PI); ctx.fill();
      ctx.fillStyle = Math.sin(t * 4) > 0 ? '#63e6ff' : '#2a7a90';
      ctx.beginPath(); ctx.arc(cx, top - 40, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  SC.drawRoof = drawRoof;

  // ---------- Culorile cerului după altitudine (în etaje) ----------
  const SKY = [
    { f: 0,   top: '#4aa3f0', bot: '#cdeeff' },
    { f: 20,  top: '#6fbcf8', bot: '#f1f9ff' },
    { f: 42,  top: '#2c6cc6', bot: '#93c8f2' },
    { f: 62,  top: '#122a63', bot: '#4569b0' },
    { f: 82,  top: '#04050e', bot: '#11183a' },
    { f: 160, top: '#030309', bot: '#0b0c25' },
    { f: 240, top: '#0b0319', bot: '#22103d' },
    { f: 330, top: '#14031c', bot: '#0a1838' },
  ];
  function skyAt(f) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (f <= b.f) {
        const t = clamp((f - a.f) / (b.f - a.f), 0, 1);
        return [mix(a.top, b.top, t), mix(a.bot, b.bot, t)];
      }
    }
    const l = SKY[SKY.length - 1];
    return [l.top, l.bot];
  }

  // ---------- Obiecte de fundal (generate o singură dată) ----------
  function buildBackground() {
    let seed = 1;
    const rnd = () => hash(seed++ * 3.17);
    const objs = [];
    for (let k = 0; k < 46; k++) objs.push({ t: 'cloud', f: 10 + rnd() * 52, x: rnd() * W, sy: rnd() * 600, p: 0.45 + rnd() * 0.4, s: 0.6 + rnd() * 0.9, v: 4 + rnd() * 10 });
    for (let k = 0; k < 7; k++) objs.push({ t: 'bird', f: 1 + rnd() * 16, x: rnd() * W, sy: rnd() * 500, p: 0.85, v: 18 + rnd() * 18 });
    for (let k = 0; k < 3; k++) objs.push({ t: 'plane', f: 32 + rnd() * 18, x: rnd() * W, sy: rnd() * 500, p: 0.6, v: 30 + rnd() * 15 });
    objs.push({ t: 'balloon', f: 62, x: 70, sy: 260, p: 0.5, v: 0 });
    for (let k = 0; k < 7; k++) objs.push({ t: 'sat', f: 86 + rnd() * 70, x: rnd() * W, sy: rnd() * 600, p: 0.4, v: 8 + rnd() * 10 });
    objs.push({ t: 'station', f: 112, x: 260, sy: 240, p: 0.38, v: 5 });
    objs.push({ t: 'moon', f: 145, x: 270, sy: 230, p: 0.22, v: 0 });
    objs.push({ t: 'planet', f: 200, x: 90, sy: 260, p: 0.2, v: 0, c1: '#e6b36a', c2: '#a86a2c', ring: true });
    objs.push({ t: 'planet', f: 262, x: 280, sy: 300, p: 0.18, v: 0, c1: '#e0644b', c2: '#7a2016' });
    objs.push({ t: 'planet', f: 300, x: 80, sy: 220, p: 0.17, v: 0, c1: '#7fd3e6', c2: '#2a6a9a', ring: true });
    for (let k = 0; k < 9; k++) objs.push({ t: 'nebula', f: 230 + rnd() * 200, x: rnd() * W, sy: rnd() * 600, p: 0.12, s: 90 + rnd() * 120, h: Math.floor(rnd() * 360) });
    objs.push({ t: 'galaxy', f: 345, x: 200, sy: 260, p: 0.12 });
    for (let k = 0; k < 6; k++) objs.push({ t: 'rock', f: 170 + rnd() * 120, x: rnd() * W, sy: rnd() * 600, p: 0.5, s: 4 + rnd() * 8, v: 6 + rnd() * 12 });
    const stars = [];
    for (let k = 0; k < 140; k++) stars.push({ x: rnd() * W, y: rnd() * 900, r: 0.5 + rnd() * 1.4, d: 0.02 + rnd() * 0.06, tw: rnd() * 6 });
    const mkSky = (minH, maxH) => {
      const arr = []; let sx = -30;
      while (sx < W + 30) {
        const w = 22 + rnd() * 34;
        arr.push({ x: sx, w, h: minH + rnd() * (maxH - minH), c: rnd(), top: rnd() < 0.3 ? Math.floor(rnd() * 3) + 1 : 0, wins: Array.from({ length: 60 }, () => rnd()) });
        sx += w + 1 + rnd() * 4;
      }
      return arr;
    };
    const skyFar = mkSky(70, 190);
    const skyNear = mkSky(35, 120);
    const trees = [];
    for (let k = 0; k < 10; k++) trees.push({ x: -120 + rnd() * (W + 240), s: 0.7 + rnd() * 0.6 });
    const cars = [];
    const carCols = ['#e74c3c', '#f1c40f', '#3498db', '#ecf0f1', '#2ecc71', '#9b59b6', '#e67e22'];
    for (let k = 0; k < 6; k++) cars.push({ x: rnd() * 900, v: (k % 2 ? -1 : 1) * (40 + rnd() * 40), c: carCols[k % carCols.length], lane: k % 2, bus: rnd() < 0.2 });
    return { objs, stars, skyFar, skyNear, trees, cars };
  }

  // ---------- Clasa Game ----------
  class Game {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.bg = buildBackground();
      this.H = 640;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.reset({ mode: 'idle' });
    }

    resize() {
      const r = this.cv.getBoundingClientRect();
      if (!r.width) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.cv.width = Math.round(r.width * this.dpr);
      this.cv.height = Math.round(r.height * this.dpr);
      this.scale = r.width / W;
      this.H = r.height / this.scale;
      this.vignette = null;
    }

    reset(cfg) {
      this.cfg = Object.assign({ lives: 3, speed: 1, wind: 0, width: 1, time: 0, drift: 0 }, cfg);
      this.mode = this.cfg.mode;
      const idle = this.mode === 'idle';
      // în meniu macaraua stă mai jos, sub logo
      this.pivotY = idle ? 200 : 104;
      this.rope = idle ? 58 : 165;
      this.topScreen = this.pivotY + this.rope + SLING + FH + FH * 2;
      this.floors = [];
      this.lives = this.maxLives = this.cfg.lives;
      this.pop = 0; this.perfects = 0; this.combo = 0; this.maxCombo = 0; this.livesLost = 0;
      this.BW = BASE_BW * this.cfg.width;
      this.state = 'spawn';
      this.spawnT = 0; this.waitT = 0; this.endT = 0;
      this.phase = Math.random() * Math.PI * 2;
      this.omega = OMEGA;
      this.hRot = 0; this.hRotV = 0;
      this.swayAmp = 0; this.swayPhase = 0;
      this.camY = 90 - this.H; this.skyCamY = this.camY; this.zoom = 1;
      this.blk = null;
      this.debris = []; this.parts = []; this.floats = []; this.rings = []; this.banner = null;
      this.timeLeft = this.cfg.time;
      this.wind = 0; this.windTarget = 0; this.windT = 0;
      this.t = 0; this.finished = false; this.win = false; this.result = null; this.ended = false;
      this.roof = null; this.shake = 0; this.flash = 0; this.redFlash = 0; this.fade = null;
      this.zoneIdx = 0;
      this.pivotX = W / 2; this.pivotV = 0;
      this.paused = false;
      this.endReason = '';
      this.autoTol = 6; this.autoDelay = 0.6;
    }

    // ---- utilitare ----
    styleFor(i) {
      if (this.cfg.style) return this.cfg.style;
      if (this.mode === 'idle') return ['bloc', 'birouri', 'turn'][Math.floor(i / 5) % 3];
      if (this.mode !== 'endless') return 'bloc';
      if (i >= 80) return 'spatiu';
      if (i < 12) return 'bloc';
      if (i < 28) return 'birouri';
      return Math.floor(i / 10) % 2 === 0 ? 'turn' : 'birouri';
    }
    popPer() {
      if (this.cfg.popPer) return this.cfg.popPer;
      return this.mode === 'endless' ? 20 : 15;
    }
    floorTop(i) { return -(i + 1) * FH; }
    swayDisp(i) {
      const n = this.floors.length;
      if (n < 2) return 0;
      return this.swayAmp * Math.sin(this.swayPhase) * Math.pow((i + 1) / n, 1.6);
    }
    floorX(i) { return this.floors[i].xb + this.swayDisp(i); }
    lean() { const n = this.floors.length; return n ? this.floors[n - 1].xb - W / 2 : 0; }
    topInfo() {
      const n = this.floors.length;
      if (!n) return { x: W / 2, xb: W / 2, y: 0 };
      return { x: this.floorX(n - 1), xb: this.floors[n - 1].xb, y: this.floorTop(n - 1) };
    }
    viewFloor() { return Math.max(0, -(this.skyCamY + this.topScreen) / FH); }
    spaceFactor() { return clamp((this.viewFloor() - 58) / 26, 0, 1); }
    ropeLen() {
      if (this.state === 'spawn') return Math.max(8, this.rope * easeBack(this.spawnT / 0.6));
      return this.rope;
    }
    angle() { return THETA * Math.sin(this.phase); }

    // poziția blocului agățat (coordonate ecran)
    hangPose() {
      const a = this.angle(), L = this.ropeLen();
      const ex = this.pivotX + L * Math.sin(a), ey = this.pivotY + L * Math.cos(a);
      const d = SLING + FH / 2, r = this.hRot;
      return { ex, ey, x: ex - d * Math.sin(r), y: ey + d * Math.cos(r), rot: r, a, L };
    }

    // ---- input ----
    tap() {
      if (this.paused || this.mode === 'idle') return;
      if (this.state === 'hang' || (this.state === 'spawn' && this.spawnT > 0.35)) this.release();
    }

    releaseVel(p) {
      const R = p.L + SLING + FH / 2;
      const da = THETA * this.omega * Math.cos(this.phase);
      return { vx: R * Math.cos(p.a) * da * 0.4 + this.pivotV * 0.5, vy: -R * Math.sin(p.a) * da * 0.3 };
    }

    release() {
      const p = this.hangPose();
      const v = this.releaseVel(p);
      const n = this.floors.length;
      this.blk = { x: p.x, y: p.y + this.camY, vx: v.vx, vy: v.vy, rot: p.rot, style: this.styleFor(n), i: n };
      this.state = 'drop';
      this.retract = 0;
      if (this.mode !== 'idle') SC.Audio.drop();
    }

    // estimează unde aterizează blocul dacă e lăsat acum (folosit de demo-ul din meniu)
    predictDx() {
      const p = this.hangPose(), v = this.releaseVel(p);
      let x = p.x, y = p.y + this.camY, vx = v.vx, vy = v.vy, t = 0;
      const top = this.topInfo();
      const g = this.gravity();
      while (y + FH / 2 < top.y && t < 3) { const dt = 1 / 90; vy += g * dt; vx += this.wind * dt; x += vx * dt; y += vy * dt; t += dt; }
      const sw = this.floors.length < 2 ? 0 : this.swayAmp * Math.sin(this.swayPhase + 1.25 * t);
      return x - (top.xb + sw);
    }

    gravity() { return 1750 * (1 - 0.45 * this.spaceFactor()); }

    spawnNext() {
      this.state = 'spawn'; this.spawnT = 0; this.blk = null;
      this.hRot = 0; this.hRotV = 0;
      this.autoTol = Math.random() < 0.6 ? 3 : 4 + Math.random() * 14;
      this.autoDelay = 0.3 + Math.random() * 0.8;
    }

    // ---- logica de aterizare ----
    resolve(top) {
      const b = this.blk;
      const dx = b.x - top.x;
      const ad = Math.abs(dx);
      const first = this.floors.length === 0;
      const perfTol = this.BW * (first ? 0.12 : 0.075);
      const okTol = this.BW * (first ? 0.85 : 0.6);
      if (ad > okTol) return this.fail(dx >= 0 ? 1 : -1, 'Ratat!');
      const perfect = ad <= perfTol;
      const xb = perfect ? top.xb : top.xb + dx;
      if (!perfect && Math.abs(xb - W / 2) > this.BW * 1.0) return this.fail(dx >= 0 ? 1 : -1, 'Prea înclinat!');
      this.place(xb, perfect, 1 - ad / okTol);
    }

    place(xb, perfect, acc) {
      const idle = this.mode === 'idle';
      const i = this.floors.length;
      this.floors.push({ xb, style: this.blk.style, perfect, land: 1 });
      this.blk = null;
      if (perfect) {
        this.combo++; this.perfects++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.swayAmp *= 0.75;
        this.flash = 1;
      } else {
        this.combo = 0;
      }
      const gain = Math.round(this.popPer() * (perfect ? 1 + Math.min(this.combo, 10) * 0.1 : 0.45 + 0.5 * acc));
      this.pop += gain;
      const x = this.floorX(i), y = this.floorTop(i);
      const bottom = y + FH;
      if (!idle) this.floats.push({ x: x + 46, y: y + 8, text: '+' + gain, icon: true, color: perfect ? '#ffe066' : '#ffffff', life: 1.3, max: 1.3 });
      // nori de praf în ambele părți
      for (let k = 0; k < 8; k++) {
        const side = k % 2 ? 1 : -1;
        this.parts.push({ k: 'puff', x: x + side * (this.BW / 2 - 6), y: bottom - 2, vx: side * (25 + Math.random() * 55), vy: -10 - Math.random() * 25, life: 0.7, max: 0.7, r: 4 + Math.random() * 4, c: '255,248,235' });
      }
      if (perfect) {
        this.banner = { text: this.combo > 1 ? `PERFECT x${this.combo}` : 'PERFECT!', life: 1.1, max: 1.1, big: this.combo >= 3 };
        this.rings.push({ x, y: y + FH / 2, life: 0.5, max: 0.5, w: this.BW });
        if (!idle) SC.Audio.perfect(this.combo);
        const nStars = 8 + Math.min(this.combo, 8) * 2;
        for (let k = 0; k < nStars; k++) {
          const a = Math.random() * Math.PI * 2, sp = 90 + Math.random() * 140;
          this.parts.push({ k: 'star', x: x + Math.cos(a) * 20, y: y + FH / 2 + Math.sin(a) * 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.9, max: 0.9, s: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, c: ['#ffd54a', '#fff6c2', '#ffb347', '#ffffff'][k % 4] });
        }
      } else if (!idle) {
        SC.Audio.land();
      }
      this.shake = perfect ? 0.12 : 0.22;
      if (!idle) {
        SC.Save.d.stats.blocks++;
        if (perfect) SC.Save.d.stats.perfects++;
      }

      if (this.mode === 'endless') {
        const n = this.floors.length;
        for (let z = this.zoneIdx + 1; z < SC.ZONES.length; z++) {
          if (n >= SC.ZONES[z].f) {
            this.zoneIdx = z;
            this.banner = { text: SC.ZONES[z].msg, life: 2.6, max: 2.6, milestone: true };
            SC.Audio.milestone();
          }
        }
      }

      if (!idle && this.checkGoal()) return this.finish(true);
      this.state = 'wait';
      this.waitT = 0.3;
    }

    fail(dir, msg) {
      const b = this.blk;
      this.debris.push({ x: b.x, y: b.y, vx: dir * 80 + b.vx * 0.5, vy: Math.min(b.vy, 200) * 0.3, rot: b.rot, vr: dir * (2.5 + Math.random() * 2), style: b.style, i: b.i });
      this.blk = null;
      this.combo = 0;
      if (this.mode !== 'idle') {
        this.lives--; this.livesLost++;
        this.banner = { text: msg, life: 1.1, max: 1.1, bad: true };
        this.redFlash = 1;
        SC.Audio.fail();
      }
      this.shake = 0.35;
      this.state = 'wait';
      this.waitT = 0.75;
    }

    checkGoal() {
      const c = this.cfg;
      if (c.target && this.floors.length >= c.target) return true;
      const g = c.goal;
      if (!g) return false;
      if (g.type === 'floors') return this.floors.length >= g.value;
      if (g.type === 'perfects') return this.perfects >= g.value;
      if (g.type === 'combo') return this.maxCombo >= g.value;
      if (g.type === 'population') return this.pop >= g.value;
      return false;
    }

    finish(win, reason) {
      if (this.finished) return;
      this.finished = true;
      this.win = win;
      this.state = 'done';
      this.endReason = reason || '';
      this.blk = null;
      if (win) {
        if (this.floors.length && this.mode !== 'endless') this.roof = { t: 0, style: this.floors[this.floors.length - 1].style };
        this.zoomOut = this.mode !== 'endless' && this.floors.length > 3;
        this.endT = 2.6;
        SC.Audio.win();
        this.banner = { text: this.mode === 'city' ? 'CLĂDIRE GATA!' : 'MISIUNE REUȘITĂ!', life: 2.4, max: 2.4, big: true };
        for (let k = 0; k < 90; k++) {
          this.parts.push({ k: 'conf', x: Math.random() * W, y: -20 - Math.random() * 160, vx: (Math.random() - 0.5) * 80, vy: 70 + Math.random() * 120, life: 3, max: 3, c: `hsl(${Math.random() * 360},90%,60%)`, s: 3 + Math.random() * 3, rot: Math.random() * 6, screen: true });
        }
      } else {
        this.endT = 1.4;
        SC.Audio.over();
      }
      SC.Save.d.stats.games++;
      this.result = {
        mode: this.mode, win, floors: this.floors.length, pop: this.pop,
        perfects: this.perfects, maxCombo: this.maxCombo, livesLost: this.livesLost,
        reason: this.endReason, cfg: this.cfg,
        alt: SC.altitude(this.floors.length),
      };
    }

    // ---- update ----
    update(dt) {
      if (this.paused) return;
      this.t += dt;
      const c = this.cfg;
      const n = this.floors.length;
      const endless = this.mode === 'endless';
      const idle = this.mode === 'idle';

      // dificultate progresivă (blândă)
      const sp = c.speed * (1 + Math.min(endless ? 0.6 : 0.3, n * (endless ? 0.005 : 0.008)));
      const userSpeed = idle ? 0.9 : (SC.Save.d.settings.craneSpeed || 1);
      this.omega = OMEGA * sp * userSpeed;
      this.phase += this.omega * dt;

      const drift = c.drift + (endless ? clamp((n - 35) * 1.0, 0, 50) : 0);
      const px = W / 2 + Math.sin(this.t * 0.45) * drift;
      this.pivotV = (px - this.pivotX) / Math.max(dt, 0.001);
      this.pivotX = px;

      // blocul agățat se leagănă cu puțină întârziere (arc)
      const tgt = -this.angle();
      this.hRotV += (90 * (tgt - this.hRot) - 9 * this.hRotV) * dt;
      this.hRot += this.hRotV * dt;

      // balansul turnului
      let target = n > 3 ? Math.min(endless ? 30 : 20, (n - 3) * 0.45) : 0;
      target += Math.min(18, Math.abs(this.lean()) * 0.12);
      if (idle) target *= 0.5;
      this.swayAmp = lerp(this.swayAmp, target, damp(1.5, dt));
      this.swayPhase += dt * 1.1;

      // vânt
      let windLevel = c.wind;
      if (endless && n >= 40 && n < 80) windLevel = Math.max(windLevel, 1);
      this.windT -= dt;
      if (this.windT <= 0) {
        this.windT = 4 + Math.random() * 4;
        const mag = windLevel === 0 ? 0 : windLevel === 1 ? 55 + Math.random() * 45 : 120 + Math.random() * 60;
        this.windTarget = (Math.random() < 0.5 ? -1 : 1) * mag;
      }
      if (!windLevel) this.windTarget = 0;
      this.wind = lerp(this.wind, this.windTarget, damp(1.2, dt));

      if (c.time && !this.finished && !idle) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) { this.timeLeft = 0; this.finish(false, 'Timpul a expirat!'); }
      }

      switch (this.state) {
        case 'spawn':
          this.spawnT += dt;
          if (this.spawnT >= 0.6) this.state = 'hang';
          break;
        case 'hang':
          if (idle) {
            this.autoDelay -= dt;
            if (this.autoDelay <= 0 && Math.abs(this.predictDx()) < this.autoTol) this.release();
          }
          break;
        case 'drop': {
          const b = this.blk;
          const prevBottom = b.y + FH / 2;
          b.vy += this.gravity() * dt;
          b.vx += this.wind * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.rot *= Math.exp(-7 * dt);
          this.retract += dt;
          const top = this.topInfo();
          const bottom = b.y + FH / 2;
          if (prevBottom <= top.y && bottom >= top.y) this.resolve(top);
          else if (b.y - this.camY > this.H + 60) this.fail(b.x >= top.x ? 1 : -1, 'Ratat!');
          break;
        }
        case 'wait':
          this.waitT -= dt;
          if (this.waitT <= 0) {
            if (idle && n >= 14 && !this.fade) this.fade = { t: 0 };
            else if (this.lives <= 0) this.finish(false, 'Nu mai ai vieți!');
            else if (!this.fade) this.spawnNext();
          }
          break;
        case 'done':
          this.endT -= dt;
          if (this.roof) this.roof.t += dt;
          if (this.endT <= 0 && !this.ended) {
            this.ended = true;
            if (c.onEnd) c.onEnd(this.result);
          }
          break;
      }

      // demo-ul din meniu: după ~14 etaje, o tranziție și reîncepe
      if (this.fade) {
        this.fade.t += dt / 1.2;
        if (this.fade.t >= 0.5 && !this.fade.cleared) {
          this.fade.cleared = true;
          this.floors = []; this.debris = []; this.parts = []; this.swayAmp = 0;
          this.camY = this.skyCamY = 90 - this.H;
          this.spawnNext();
        }
        if (this.fade.t >= 1) this.fade = null;
      }

      // camera
      const topY = n ? this.floorTop(n - 1) : 0;
      let camTarget = Math.min(90 - this.H, topY - this.topScreen);
      let zTarget = 1;
      if (this.state === 'done' && this.win && this.zoomOut && this.endT < 2.2) {
        const hTot = n * FH + 110;
        zTarget = clamp((this.H - 260) / hTot, 0.18, 1);
        camTarget = -(this.H - 120) / zTarget;
      }
      this.zoom = lerp(this.zoom, zTarget, damp(2.5, dt));
      this.camY = lerp(this.camY, camTarget, damp(zTarget < 1 ? 2.5 : 4, dt));
      if (zTarget === 1 && Math.abs(this.zoom - 1) < 0.01) this.skyCamY = this.camY;

      // resturi, particule, texte
      for (const d of this.debris) { d.vy += 1600 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; }
      this.debris = this.debris.filter((d) => d.y - this.camY < this.H / this.zoom + 200);
      for (const p of this.parts) {
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 'conf') { p.vx += Math.sin(this.t * 3 + p.rot) * 30 * dt; p.rot += dt * 5; }
        else if (p.k === 'puff') { p.vx *= Math.exp(-3 * dt); p.vy *= Math.exp(-2 * dt); }
        else if (p.k === 'star') { p.vy += 380 * dt; p.vx *= Math.exp(-1.5 * dt); p.rot += p.vr * dt; }
        else p.vy += 300 * dt;
      }
      this.parts = this.parts.filter((p) => p.life > 0);
      for (const f of this.floats) { f.life -= dt; f.y -= 34 * dt; }
      this.floats = this.floats.filter((f) => f.life > 0);
      for (const r of this.rings) r.life -= dt;
      this.rings = this.rings.filter((r) => r.life > 0);
      for (const f of this.floors) if (f.land > 0) f.land = Math.max(0, f.land - dt * 3.2);
      if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; }
      this.shake = Math.max(0, this.shake - dt);
      this.flash = Math.max(0, this.flash - dt * 3);
      this.redFlash = Math.max(0, this.redFlash - dt * 2);
    }

    // ---- desenare ----
    render() {
      const ctx = this.ctx;
      const s = this.scale * this.dpr;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      const H = this.H;
      const vf = this.viewFloor();
      const sf = this.spaceFactor();
      const idle = this.mode === 'idle';

      this.renderSky(ctx, vf, idle);
      this.renderBgObjects(ctx, vf);
      this.renderSkyline(ctx, idle);

      // ---- lumea (cu zoom la final) ----
      const z = this.zoom;
      const shx = (Math.random() - 0.5) * this.shake * 14;
      const shy = (Math.random() - 0.5) * this.shake * 10;
      ctx.save();
      ctx.translate(W / 2 + shx, shy);
      ctx.scale(z, z);
      ctx.translate(-W / 2, -this.camY);
      const viewBottom = this.camY + H / z;
      const visible = (y0, y1) => y1 > this.camY - 120 && y0 < viewBottom + 20;

      if (this.cfg.neighbors) this.renderNeighbors(ctx, visible);
      if (visible(-60, 80)) this.renderGround(ctx, z, viewBottom, idle);

      const lit = sf > 0.35 || idle;
      const n = this.floors.length;
      for (let i = 0; i < n; i++) {
        const top = this.floorTop(i);
        if (!visible(top, top + FH)) continue;
        const f = this.floors[i];
        const x = this.floorX(i);
        if (f.land > 0) {
          const k = f.land;
          const sq = Math.sin(k * Math.PI) * 0.09 * (k > 0.5 ? 1 : 0.6);
          ctx.save();
          ctx.translate(x, top + FH);
          ctx.scale(1 + sq, 1 - sq);
          drawFloor(ctx, 0, -FH, this.BW, FH, f.style, i, lit && !f.dark, i === 0);
          ctx.restore();
        } else {
          drawFloor(ctx, x, top, this.BW, FH, f.style, i, lit, i === 0);
        }
        if (f.perfect && i === n - 1 && this.flash > 0) {
          ctx.fillStyle = `rgba(255,240,170,${this.flash * 0.55})`;
          ctx.fillRect(x - this.BW / 2, top, this.BW, FH);
        }
      }

      // umbra blocului care urmează să aterizeze
      if ((this.state === 'hang' || this.state === 'drop' || this.state === 'spawn') && n >= 0) {
        const top = this.topInfo();
        const bx = this.state === 'drop' && this.blk ? this.blk.x : this.hangPose().x;
        const by = this.state === 'drop' && this.blk ? this.blk.y : this.hangPose().y + this.camY;
        const dist = Math.max(0, top.y - by);
        const a = clamp(0.28 - dist / 900, 0.05, 0.28);
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.beginPath(); ctx.ellipse(bx, top.y + 1, this.BW * 0.48, 4, 0, 0, Math.PI * 2); ctx.fill();
      }

      if (this.roof && n) {
        const k = easeBack(this.roof.t / 0.55);
        const top = this.floorTop(n - 1);
        ctx.save();
        ctx.globalAlpha = clamp(this.roof.t * 4, 0, 1);
        const rx = this.floorX(n - 1);
        ctx.translate(rx, top - (1 - k) * 80);
        drawRoof(ctx, 0, 0, this.BW, this.roof.style, this.t);
        ctx.restore();
      }

      for (const d of this.debris) {
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
        drawFloor(ctx, 0, -FH / 2, this.BW, FH, d.style, d.i, lit, false);
        ctx.restore();
      }

      if (this.state === 'drop' && this.blk) {
        const b = this.blk;
        // dâră de mișcare
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(b.x - this.BW / 2 + 6, b.y - FH / 2 - Math.min(60, b.vy * 0.06), this.BW - 12, Math.min(60, b.vy * 0.06));
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        drawFloor(ctx, 0, -FH / 2, this.BW, FH, b.style, b.i, lit, b.i === 0);
        ctx.restore();
      }

      // unde de șoc la plasări perfecte
      for (const r of this.rings) {
        const k = 1 - r.life / r.max;
        ctx.strokeStyle = `rgba(255,230,120,${(1 - k) * 0.9})`;
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, r.w * (0.55 + k * 0.7), FH * (0.6 + k * 1.2), 0, 0, Math.PI * 2); ctx.stroke();
      }

      this.renderParts(ctx, false);

      // texte plutitoare
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const f of this.floats) {
        const age = f.max - f.life;
        const sc = easeBack(age / 0.25);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.scale(sc, sc);
        ctx.globalAlpha = clamp(f.life / 0.4, 0, 1);
        ctx.font = '800 17px Fredoka, system-ui, sans-serif';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,25,50,0.55)';
        ctx.strokeText(f.text, -8, 0);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, -8, 0);
        if (f.icon) { // omuleț
          const ix = ctx.measureText(f.text).width / 2 + 2;
          ctx.fillStyle = f.color;
          ctx.beginPath(); ctx.arc(ix, -4, 3.2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(ix, 4, 5, 4, 0, Math.PI, 0); ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // macaraua (spațiu ecran)
      if (!(this.state === 'done' && this.zoom < 0.95)) this.renderCrane(ctx, lit);
      if (Math.abs(this.wind) > 15) this.renderWind(ctx);
      this.renderParts(ctx, true);
      this.renderBanner(ctx);
      this.renderOverlay(ctx, idle);
    }

    renderSky(ctx, vf, idle) {
      const H = this.H;
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      if (idle) {
        // apus de soare în meniu
        gr.addColorStop(0, '#2d4fb5'); gr.addColorStop(0.45, '#7b8fe0'); gr.addColorStop(0.78, '#ffb48a'); gr.addColorStop(1, '#ffd9a0');
      } else {
        const [ct, cb] = skyAt(vf);
        gr.addColorStop(0, ct); gr.addColorStop(1, cb);
      }
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);

      // soarele
      const sunA = idle ? 1 : clamp(1 - vf / 45, 0, 1);
      if (sunA > 0) {
        const sx = idle ? W * 0.7 : W * 0.8;
        const sy = idle ? H * 0.62 : 150 + vf * FH * 0.25;
        const r = idle ? 46 : 30;
        const g = ctx.createRadialGradient(sx, sy, r * 0.6, sx, sy, r * 4);
        g.addColorStop(0, idle ? 'rgba(255,220,150,0.7)' : 'rgba(255,250,210,0.75)');
        g.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.globalAlpha = sunA;
        ctx.fillStyle = g;
        ctx.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
        ctx.fillStyle = idle ? '#ffe3a3' : '#fff6c8';
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      const starA = idle ? 0 : clamp((vf - 50) / 30, 0, 1);
      if (starA > 0) {
        for (const st of this.bg.stars) {
          const y = ((st.y - this.skyCamY * st.d) % (H + 20) + H + 20) % (H + 20) - 10;
          ctx.globalAlpha = starA * (0.55 + 0.45 * Math.sin(this.t * 2 + st.tw));
          ctx.fillStyle = '#fff';
          ctx.fillRect(st.x, y, st.r, st.r);
        }
        ctx.globalAlpha = 1;
      }

      const earthT = idle ? 0 : clamp((vf - 64) / 36, 0, 1) * (1 - clamp((vf - 175) / 90, 0, 1));
      if (earthT > 0.01) {
        const R = 900 - earthT * 250;
        const cy = H + R - earthT * 150;
        const eg = ctx.createRadialGradient(W / 2, cy, R - 60, W / 2, cy, R + 30);
        eg.addColorStop(0, '#1f5fb8'); eg.addColorStop(0.8, '#3d8fe0'); eg.addColorStop(0.93, '#9fe0ff'); eg.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.globalAlpha = earthT;
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.arc(W / 2, cy, R + 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(90,170,90,0.6)';
        ctx.beginPath(); ctx.ellipse(W * 0.3, cy - R + 40, 60, 16, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(W * 0.75, cy - R + 60, 40, 12, -0.1, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    renderSkyline(ctx, idle) {
      const H = this.H;
      const layers = [
        { arr: this.bg.skyFar, p: 0.35, day: ['#b4cdea', '#a6c1e2'], dusk: ['#b08bb8', '#a17fb0'], win: 'rgba(255,255,255,0.28)', lit: '#ffe2a0' },
        { arr: this.bg.skyNear, p: 0.55, day: ['#8eaed3', '#7d9dc6'], dusk: ['#76649c', '#6a5a92'], win: 'rgba(255,255,255,0.3)', lit: '#ffd27a' },
      ];
      for (const L of layers) {
        const base = -this.skyCamY * L.p + (H - 90) * (1 - L.p);
        if (base - 220 > H) continue;
        for (const b of L.arr) {
          const top = base - b.h;
          if (top > H) continue;
          const cols = idle ? L.dusk : L.day;
          ctx.fillStyle = b.c < 0.5 ? cols[0] : cols[1];
          ctx.fillRect(b.x, top, b.w, b.h + 400);
          if (b.top === 1) { ctx.fillRect(b.x + b.w * 0.3, top - 10, b.w * 0.4, 10); }
          if (b.top === 2) { ctx.fillRect(b.x + b.w / 2 - 1, top - 18, 2, 18); }
          if (b.top === 3) { ctx.beginPath(); ctx.moveTo(b.x, top); ctx.lineTo(b.x + b.w / 2, top - 12); ctx.lineTo(b.x + b.w, top); ctx.fill(); }
          let k = 0;
          for (let wy = top + 7; wy < base - 6 && k < 60; wy += 11)
            for (let wx = b.x + 4; wx < b.x + b.w - 6; wx += 8, k++) {
              const on = idle && b.wins[k % 60] < 0.35 + 0.1 * Math.sin(this.t * 0.5 + k);
              ctx.fillStyle = on ? L.lit : L.win;
              ctx.fillRect(wx, wy, 3.5, 5);
            }
        }
        // ceață ușoară peste stratul îndepărtat
        if (L.p < 0.5) {
          const fg = ctx.createLinearGradient(0, base - 200, 0, base);
          fg.addColorStop(0, 'rgba(255,255,255,0)');
          fg.addColorStop(1, idle ? 'rgba(255,200,170,0.35)' : 'rgba(220,240,255,0.35)');
          ctx.fillStyle = fg;
          ctx.fillRect(0, base - 200, W, 200);
        }
      }
    }

    renderNeighbors(ctx, visible) {
      this.cfg.neighbors.forEach((nb, k) => {
        if (!nb) return;
        const cx = k === 0 ? 14 : W - 14;
        const w = 72, h = 26;
        for (let i = 0; i < nb.floors; i++) {
          const top = -(i + 1) * h;
          if (!visible(top, top + h)) continue;
          drawFloor(ctx, cx, top, w, h, SC.BUILDINGS[nb.type].style, i, false, i === 0);
        }
        if (nb.complete) {
          ctx.save(); ctx.translate(cx, -nb.floors * h); ctx.scale(0.56, 0.56);
          drawRoof(ctx, 0, 0, w / 0.56, SC.BUILDINGS[nb.type].style, this.t);
          ctx.restore();
        }
      });
    }

    renderGround(ctx, z, viewBottom, idle) {
      const L = W / 2 - W / (2 * z) - 30, R = W / 2 + W / (2 * z) + 30, span = R - L;
      // copaci și felinare (în spatele turnului)
      for (const tr of this.bg.trees) {
        if (Math.abs(tr.x - W / 2) < this.BW / 2 + 16) continue;
        ctx.fillStyle = '#7a5230';
        ctx.fillRect(tr.x - 2, -14 * tr.s, 4, 14 * tr.s);
        ctx.fillStyle = idle ? '#3d7d45' : '#3f9a3a';
        ctx.beginPath(); ctx.arc(tr.x, -20 * tr.s, 11 * tr.s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = idle ? '#4f9455' : '#55b34d';
        ctx.beginPath(); ctx.arc(tr.x - 3 * tr.s, -23 * tr.s, 6 * tr.s, 0, Math.PI * 2); ctx.fill();
      }
      for (let lx = 20; lx < W; lx += 110) {
        if (Math.abs(lx - W / 2) < this.BW / 2 + 10) continue;
        ctx.fillStyle = '#4a4f5a';
        ctx.fillRect(lx - 1, -30, 2, 30);
        ctx.fillRect(lx - 1, -30, 8, 2);
        ctx.fillStyle = idle ? '#ffe08a' : '#dfe6ee';
        ctx.fillRect(lx + 4, -29, 5, 3);
        if (idle) {
          const g = ctx.createRadialGradient(lx + 6, -26, 1, lx + 6, -26, 22);
          g.addColorStop(0, 'rgba(255,220,130,0.45)'); g.addColorStop(1, 'rgba(255,220,130,0)');
          ctx.fillStyle = g; ctx.fillRect(lx - 16, -48, 44, 44);
        }
      }
      // iarbă, trotuar, stradă
      ctx.fillStyle = idle ? '#5fa84a' : '#6cc04a';
      ctx.fillRect(L, 0, span, viewBottom + 40);
      ctx.fillStyle = idle ? '#4e9440' : '#58a83a';
      ctx.fillRect(L, 0, span, 5);
      ctx.fillStyle = '#c9cdd3';
      ctx.fillRect(L, 6, span, 7);
      ctx.fillStyle = '#4c525c';
      ctx.fillRect(L, 13, span, 34);
      ctx.fillStyle = '#e8e8e8';
      for (let x = L - (L % 36); x < R; x += 36) ctx.fillRect(x, 29, 18, 2.5);
      ctx.fillStyle = '#b5bac1';
      ctx.fillRect(L, 47, span, 4);
      // mașini
      for (const c of this.bg.cars) {
        const x = L + ((c.x + this.t * c.v) % span + span) % span;
        const y = c.lane ? 44 : 27;
        const len = c.bus ? 44 : 26, dir = Math.sign(c.v);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x - len / 2, y, len, 2);
        ctx.fillStyle = c.bus ? '#f39c12' : c.c;
        rrect(ctx, x - len / 2, y - 9, len, 8, 2); ctx.fill();
        if (!c.bus) { rrect(ctx, x - len * 0.28, y - 15, len * 0.5, 7, 3); ctx.fill(); }
        else { ctx.fillRect(x - len / 2, y - 15, len, 7); }
        ctx.fillStyle = '#bfe6ff';
        if (c.bus) for (let k = 0; k < 5; k++) ctx.fillRect(x - len / 2 + 3 + k * 8, y - 14, 6, 5);
        else ctx.fillRect(x - len * 0.24, y - 14, len * 0.42, 5);
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(x - len * 0.3, y - 1, 3, 0, Math.PI * 2); ctx.arc(x + len * 0.3, y - 1, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = idle ? '#fff1b0' : '#fff6d0';
        ctx.fillRect(x + dir * (len / 2 - 2) - 1, y - 7, 2, 2);
      }
      // fundația
      ctx.fillStyle = '#9aa1ab';
      ctx.fillRect(W / 2 - this.BW / 2 - 12, -4, this.BW + 24, 10);
      ctx.fillStyle = '#7d848e';
      ctx.fillRect(W / 2 - this.BW / 2 - 12, 4, this.BW + 24, 3);
    }

    renderParts(ctx, screen) {
      for (const pt of this.parts) {
        if (!!pt.screen !== screen) continue;
        const k = clamp(pt.life / pt.max, 0, 1);
        if (pt.k === 'puff') {
          ctx.fillStyle = `rgba(${pt.c},${k * 0.75})`;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * (1.6 - k * 0.6) + (1 - k) * 6, 0, Math.PI * 2); ctx.fill();
        } else if (pt.k === 'star') {
          ctx.globalAlpha = k;
          ctx.fillStyle = pt.c;
          star(ctx, pt.x, pt.y, pt.s * (0.5 + k * 0.5), pt.rot);
          ctx.globalAlpha = 1;
        } else if (pt.k === 'conf') {
          ctx.globalAlpha = clamp(pt.life, 0, 1);
          ctx.fillStyle = pt.c;
          ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot);
          ctx.fillRect(-pt.s, -pt.s / 2 * Math.abs(Math.cos(pt.rot * 2)), pt.s * 2, pt.s * Math.abs(Math.cos(pt.rot * 2)) + 0.5);
          ctx.restore();
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = k;
          ctx.fillStyle = pt.c;
          ctx.fillRect(pt.x - pt.s / 2, pt.y - pt.s / 2, pt.s, pt.s);
          ctx.globalAlpha = 1;
        }
      }
    }

    renderBanner(ctx) {
      if (!this.banner) return;
      const b = this.banner;
      const age = b.max - b.life;
      const sc = easeBack(age / 0.3) * (b.big ? 1.1 : 1);
      ctx.save();
      ctx.globalAlpha = clamp(b.life / 0.35, 0, 1);
      const y = b.milestone ? this.H * 0.36 : this.topScreen - 170 - age * 14;
      ctx.translate(W / 2, y);
      ctx.rotate(b.bad ? Math.sin(age * 30) * 0.04 * Math.max(0, 1 - age * 2) : -0.03);
      ctx.scale(sc, sc);
      const size = b.milestone ? 21 : b.big ? 32 : 28;
      ctx.font = `700 ${size}px Fredoka, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (b.milestone) {
        const w = ctx.measureText(b.text).width + 36;
        ctx.fillStyle = 'rgba(12,18,45,0.72)';
        rrect(ctx, -w / 2, -24, w, 48, 24); ctx.fill();
        ctx.strokeStyle = 'rgba(255,214,90,0.9)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillText(b.text, 0, 1);
      } else {
        ctx.lineJoin = 'round';
        ctx.lineWidth = 8; ctx.strokeStyle = b.bad ? '#5a0e16' : '#3b2300';
        ctx.strokeText(b.text, 0, 2);
        const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
        if (b.bad) { g.addColorStop(0, '#ff9a9a'); g.addColorStop(1, '#ff3b4e'); }
        else { g.addColorStop(0, '#fff6b0'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#ff9a1f'); }
        ctx.fillStyle = g;
        ctx.fillText(b.text, 0, 0);
      }
      ctx.restore();
    }

    renderOverlay(ctx, idle) {
      const H = this.H;
      if (!this.vignette) {
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,10,30,0.28)');
        this.vignette = g;
      }
      ctx.fillStyle = this.vignette;
      ctx.fillRect(0, 0, W, H);
      if (this.flash > 0.5) { ctx.fillStyle = `rgba(255,250,220,${(this.flash - 0.5) * 0.3})`; ctx.fillRect(0, 0, W, H); }
      if (this.redFlash > 0) {
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75);
        g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(220,20,40,${this.redFlash * 0.45})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      if (this.fade) {
        ctx.fillStyle = `rgba(255,214,170,${Math.sin(this.fade.t * Math.PI)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    renderCrane(ctx, lit) {
      const py = this.pivotY;
      const jt = py - 24, jb = py - 6;
      // umbra brațului
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, jb + 2, W, 4);
      // brațul cu zăbrele
      ctx.fillStyle = 'rgba(240,180,0,0.25)';
      ctx.fillRect(0, jt, W, jb - jt);
      ctx.strokeStyle = '#d39a00'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = -20; x < W + 20; x += 18) { ctx.moveTo(x, jb); ctx.lineTo(x + 9, jt); ctx.lineTo(x + 18, jb); }
      ctx.stroke();
      const cg = ctx.createLinearGradient(0, jt, 0, jt + 5);
      cg.addColorStop(0, '#ffd84a'); cg.addColorStop(1, '#e8a800');
      ctx.fillStyle = cg;
      ctx.fillRect(0, jt - 1, W, 5);
      ctx.fillRect(0, jb - 3, W, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(0, jt - 1, W, 1);
      // căruciorul
      const px = this.pivotX;
      ctx.fillStyle = '#2f3440';
      rrect(ctx, px - 18, jt - 8, 36, 26, 5); ctx.fill();
      ctx.fillStyle = '#454b59';
      rrect(ctx, px - 14, jt - 5, 28, 8, 3); ctx.fill();
      ctx.fillStyle = '#1c1f26';
      for (const dx of [-10, 10]) { ctx.beginPath(); ctx.arc(px + dx, jt - 1, 3.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = Math.sin(this.t * 6) > 0 ? '#ff5a4a' : '#7a2620';
      ctx.beginPath(); ctx.arc(px + 13, jt + 12, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#20242c';
      ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill();

      const drawHook = (x, y, rot) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.fillStyle = '#f0b400';
        rrect(ctx, -7, -8, 14, 10, 2); ctx.fill();
        ctx.strokeStyle = '#5c616b'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 5, 4, -Math.PI * 0.5, Math.PI * 0.9); ctx.stroke();
        ctx.restore();
      };

      if (this.state === 'spawn' || this.state === 'hang') {
        const p = this.hangPose();
        ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p.ex, p.ey); ctx.stroke();
        ctx.save();
        ctx.translate(p.ex, p.ey); ctx.rotate(p.rot);
        ctx.strokeStyle = '#4a4f59'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(-this.BW * 0.36, SLING); ctx.moveTo(0, 4); ctx.lineTo(this.BW * 0.36, SLING); ctx.stroke();
        const n = this.floors.length;
        drawFloor(ctx, 0, SLING, this.BW, FH, this.styleFor(n), n, lit, n === 0);
        ctx.restore();
        drawHook(p.ex, p.ey, p.rot);
      } else if (this.state === 'drop') {
        const L = Math.max(14, this.rope * (1 - ease(this.retract / 0.4)) + 14);
        ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + L); ctx.stroke();
        drawHook(px, py + L, Math.sin(this.retract * 20) * 0.3 * Math.max(0, 1 - this.retract * 2));
      } else {
        ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + 18); ctx.stroke();
        drawHook(px, py + 18, 0);
      }
    }

    renderWind(ctx) {
      const dir = Math.sign(this.wind);
      const a = clamp(Math.abs(this.wind) / 200, 0.15, 0.6);
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      for (let k = 0; k < 9; k++) {
        const y = 140 + ((k * 73) % (this.H - 200)) + Math.sin(this.t * 2 + k) * 6;
        const len = 30 + (k % 3) * 15;
        const x = ((this.t * this.wind * 1.8 + k * 97) % (W + 80) + W + 80) % (W + 80) - 40;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - dir * len / 2, y - 4, x - dir * len, y); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }

    renderBgObjects(ctx, vf) {
      const H = this.H;
      for (const o of this.bg.objs) {
        const y = o.sy + (vf - o.f) * FH * o.p;
        if (y < -200 || y > H + 200) continue;
        let x = o.x;
        if (o.v) x = ((o.x + this.t * o.v) % (W + 160) + W + 160) % (W + 160) - 80;
        switch (o.t) {
          case 'cloud': {
            const s = o.s;
            ctx.fillStyle = 'rgba(200,220,240,0.7)';
            ctx.beginPath(); ctx.ellipse(x + 22 * s, y + 14 * s, 30 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.beginPath();
            ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
            ctx.arc(x + 20 * s, y - 8 * s, 22 * s, 0, Math.PI * 2);
            ctx.arc(x + 44 * s, y, 17 * s, 0, Math.PI * 2);
            ctx.rect(x, y - 2 * s, 44 * s, 16 * s);
            ctx.fill();
            break;
          }
          case 'bird': {
            const fl = Math.sin(this.t * 10 + o.x) * 4;
            ctx.strokeStyle = '#2d3b4f'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(x - 7, y - fl); ctx.quadraticCurveTo(x - 3, y - 2, x, y); ctx.quadraticCurveTo(x + 3, y - 2, x + 7, y - fl); ctx.stroke();
            break;
          }
          case 'plane': {
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x - 140, y); ctx.stroke();
            ctx.fillStyle = '#f4f6fa';
            ctx.beginPath(); ctx.ellipse(x, y, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#d63b3b';
            ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x - 24, y - 10); ctx.lineTo(x - 14, y); ctx.fill();
            ctx.fillStyle = '#c9d0db';
            ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x - 10, y + 10); ctx.lineTo(x + 4, y); ctx.fill();
            break;
          }
          case 'balloon': {
            ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.lineTo(x, y + 40); ctx.stroke();
            ctx.fillStyle = '#f1f1f1';
            ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffb347'; ctx.fillRect(x - 4, y + 40, 8, 6);
            break;
          }
          case 'sat': {
            ctx.save(); ctx.translate(x, y); ctx.rotate(this.t * 0.2 + o.f);
            ctx.fillStyle = '#c9ced8'; ctx.fillRect(-4, -4, 8, 8);
            ctx.fillStyle = '#3460b8'; ctx.fillRect(-18, -3, 12, 6); ctx.fillRect(6, -3, 12, 6);
            ctx.restore();
            break;
          }
          case 'station': {
            ctx.fillStyle = '#c9ced8'; ctx.fillRect(x - 30, y - 3, 60, 6); ctx.fillRect(x - 6, y - 8, 12, 16);
            ctx.fillStyle = '#2e55a8';
            for (const dx of [-28, -16, 10, 22]) { ctx.fillRect(x + dx, y - 22, 8, 16); ctx.fillRect(x + dx, y + 6, 8, 16); }
            break;
          }
          case 'moon': {
            const g = ctx.createRadialGradient(x, y, 60, x, y, 110);
            g.addColorStop(0, 'rgba(255,255,240,0.25)'); g.addColorStop(1, 'rgba(255,255,240,0)');
            ctx.fillStyle = g; ctx.fillRect(x - 110, y - 110, 220, 220);
            ctx.fillStyle = '#e8e6df';
            ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#cfccc2';
            for (const [cx, cy, r] of [[-20, -15, 14], [25, 10, 10], [-5, 30, 8], [30, -30, 7], [-38, 18, 6]]) {
              ctx.beginPath(); ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2); ctx.fill();
            }
            break;
          }
          case 'planet': {
            const g = ctx.createRadialGradient(x - 15, y - 15, 5, x, y, 50);
            g.addColorStop(0, o.c1); g.addColorStop(1, o.c2);
            if (o.ring) {
              ctx.strokeStyle = 'rgba(230,210,170,0.6)'; ctx.lineWidth = 6;
              ctx.beginPath(); ctx.ellipse(x, y, 80, 18, -0.3, Math.PI, Math.PI * 2); ctx.stroke();
            }
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2); ctx.fill();
            if (o.ring) {
              ctx.strokeStyle = 'rgba(230,210,170,0.75)'; ctx.lineWidth = 6;
              ctx.beginPath(); ctx.ellipse(x, y, 80, 18, -0.3, 0, Math.PI); ctx.stroke();
            }
            break;
          }
          case 'nebula': {
            const g = ctx.createRadialGradient(x, y, 0, x, y, o.s);
            g.addColorStop(0, `hsla(${o.h},80%,60%,0.28)`); g.addColorStop(1, `hsla(${o.h},80%,40%,0)`);
            ctx.fillStyle = g;
            ctx.fillRect(x - o.s, y - o.s, o.s * 2, o.s * 2);
            break;
          }
          case 'galaxy': {
            ctx.save(); ctx.translate(x, y); ctx.rotate(this.t * 0.05);
            for (let k = 0; k < 220; k++) {
              const a = k * 0.18, r = k * 0.45;
              ctx.fillStyle = `hsla(${260 + k * 0.4},90%,${70 - k * 0.1}%,0.8)`;
              ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r * 0.5, 2, 2);
              ctx.fillRect(-Math.cos(a) * r, -Math.sin(a) * r * 0.5, 2, 2);
            }
            ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            break;
          }
          case 'rock': {
            ctx.fillStyle = '#8a7b6c';
            ctx.beginPath(); ctx.arc(x, y, o.s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#6d6054';
            ctx.beginPath(); ctx.arc(x + o.s * 0.3, y - o.s * 0.2, o.s * 0.35, 0, Math.PI * 2); ctx.fill();
            break;
          }
        }
      }
    }
  }

  SC.Game = Game;
  SC.FH = FH;
})();
