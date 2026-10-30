'use strict';

(() => {
  // ---------- Costanti (coordinate logiche del campo, 600x1000) ----------
  const W = 600, H = 1000;
  const F = { l: 30, r: 570, t: 60, b: 940 };       // linee del campo
  const CX = W / 2, CY = H / 2;
  const MOUTH = { l: 220, r: 380 };                 // pali
  const DEPTH = 42;                                 // profondità della porta
  const AREA_W = 320, AREA_H = 150;                 // area di rigore
  const DISC_R = 24, BALL_R = 12, POST_R = 5;
  const DISC_FRICTION = { c: 80, k: 1.6 };
  const BALL_FRICTION = { c: 50, k: 1.3 };
  const MAX_SPEED = 1450;
  const MAX_DRAG = 150;                              // trascinamento per la potenza massima
  const PICK_RADIUS = 62;                            // area di tocco generosa intorno alla pedina
  const SHOTS_PER_TURN = 3;
  const E_BODY = 0.9, E_WALL = 0.72, E_NET = 0.25;
  const STEP = 1 / 240;                              // passo fisso della fisica

  const TEAMS = [
    { name: 'Blu', color: '#2563eb', light: '#60a5fa', dark: '#1e3a8a', gk: '#facc15', gkDark: '#a16207' },
    { name: 'Rossi', color: '#dc2626', light: '#f87171', dark: '#7f1d1d', gk: '#22c55e', gkDark: '#166534' },
  ];
  // Formazione della squadra in basso: portiere, 2 difensori, centrocampista, attaccante.
  const FORMATION = [[300, 905], [185, 805], [415, 805], [300, 715], [300, 0]];
  const DIFFICULTY = {
    facile: { err: 0.13, pow: 0.18, think: 950 },
    normale: { err: 0.065, pow: 0.1, think: 800 },
    difficile: { err: 0.028, pow: 0.05, think: 650 },
  };
  const POSTS = [
    { x: MOUTH.l, y: F.t }, { x: MOUTH.r, y: F.t },
    { x: MOUTH.l, y: F.b }, { x: MOUTH.r, y: F.b },
  ];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const canvas = $('c');
  const ctx = canvas.getContext('2d');
  const stage = $('stage');
  const banner = $('banner');

  // ---------- Impostazioni ----------
  const DEFAULTS = { mode: 'cpu', diff: 'normale', target: '3', sound: true };
  const settings = (() => {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('cdt-settings') || '{}')); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  })();
  function saveSettings() {
    try { localStorage.setItem('cdt-settings', JSON.stringify(settings)); } catch (e) { /* ignorato */ }
  }

  // ---------- Stato di gioco ----------
  const S = {
    phase: 'menu',      // menu | aim | cpu | moving | goal | over
    paused: false,
    score: [0, 0],
    turn: 0,
    shot: 1,
    touched: false,
    moveTime: 0,
    goalTimer: 0,
    scorer: -1,
    aim: null,          // { disc, x, y, id }
    cpu: null,          // { disc, vx, vy, t }
  };
  let discs = [], ball = null, bodies = [];
  let particles = [];
  let scale = 1, dpr = 1, pitch = null;

  const isCpu = (team) => settings.mode === 'cpu' && team === 1;

  function makeBody(x, y, r, m, fr, extra) {
    return Object.assign({ x, y, vx: 0, vy: 0, r, m, c: fr.c, k: fr.k, rot: 0 }, extra);
  }

  function setupPositions(kicker) {
    discs = [];
    for (let team = 0; team < 2; team++) {
      FORMATION.forEach(([x, y], i) => {
        let py = y;
        if (i === 4) py = team === kicker ? CY + BALL_R + DISC_R + 6 : CY + 80 + DISC_R + 6;
        if (team === 1) py = H - py;
        discs.push(makeBody(x, py, DISC_R, 1, DISC_FRICTION, { team, gk: i === 0 }));
      });
    }
    ball = makeBody(CX, CY, BALL_R, 0.45, BALL_FRICTION, { isBall: true });
    bodies = [...discs, ball];
  }

  // ---------- Fisica ----------
  function integrate(b, dt) {
    const sp = Math.hypot(b.vx, b.vy);
    if (sp === 0) return;
    const ns = Math.max(0, sp - (b.c + b.k * sp) * dt);
    const f = ns / sp;
    b.vx *= f; b.vy *= f;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.isBall) b.rot += (ns * dt) / b.r;
  }

  function collide(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const rr = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 === 0) return;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
    const ia = 1 / a.m, ib = 1 / b.m;
    const corr = (rr - d) / (ia + ib);
    a.x -= nx * corr * ia; a.y -= ny * corr * ia;
    b.x += nx * corr * ib; b.y += ny * corr * ib;
    const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rv > 0) return;
    const j = (-(1 + E_BODY) * rv) / (ia + ib);
    a.vx -= j * nx * ia; a.vy -= j * ny * ia;
    b.vx += j * nx * ib; b.vy += j * ny * ib;
    onImpact(a, b, -rv);
  }

  function collidePost(b, p) {
    const dx = b.x - p.x, dy = b.y - p.y;
    const rr = b.r + POST_R;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 === 0) return;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
    b.x = p.x + nx * rr; b.y = p.y + ny * rr;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + E_WALL) * vn * nx; b.vy -= (1 + E_WALL) * vn * ny;
      Sfx.post(-vn);
    }
  }

  function bounce(b, axis, sign, e) {
    const v = axis === 'x' ? 'vx' : 'vy';
    if (b[v] * sign < 0) {
      if (Math.abs(b[v]) > 120) Sfx.hit(Math.abs(b[v]) * 0.4);
      b[v] = -b[v] * e;
    }
  }

  function walls(b) {
    const r = b.r;
    if (b.x - r < F.l) { b.x = F.l + r; bounce(b, 'x', 1, E_WALL); }
    if (b.x + r > F.r) { b.x = F.r - r; bounce(b, 'x', -1, E_WALL); }
    const inMouth = b.x > MOUTH.l && b.x < MOUTH.r;
    // Porta in alto
    if (b.y < F.t) {
      if (b.x - r < MOUTH.l) { b.x = MOUTH.l + r; bounce(b, 'x', 1, E_NET); }
      if (b.x + r > MOUTH.r) { b.x = MOUTH.r - r; bounce(b, 'x', -1, E_NET); }
      if (b.y - r < F.t - DEPTH) { b.y = F.t - DEPTH + r; bounce(b, 'y', 1, E_NET); }
    } else if (b.y - r < F.t && !inMouth) {
      b.y = F.t + r; bounce(b, 'y', 1, E_WALL);
    }
    // Porta in basso
    if (b.y > F.b) {
      if (b.x - r < MOUTH.l) { b.x = MOUTH.l + r; bounce(b, 'x', 1, E_NET); }
      if (b.x + r > MOUTH.r) { b.x = MOUTH.r - r; bounce(b, 'x', -1, E_NET); }
      if (b.y + r > F.b + DEPTH) { b.y = F.b + DEPTH - r; bounce(b, 'y', -1, E_NET); }
    } else if (b.y + r > F.b && !inMouth) {
      b.y = F.b - r; bounce(b, 'y', -1, E_WALL);
    }
  }

  function gkArea(team) {
    const x0 = CX - AREA_W / 2, x1 = CX + AREA_W / 2;
    return team === 0 ? { x0, x1, y0: F.b - AREA_H, y1: F.b + DEPTH } : { x0, x1, y0: F.t - DEPTH, y1: F.t + AREA_H };
  }

  // Il portiere arriva su un punto solo se ci sta tutto dentro la sua area.
  function gkCanReach(d, p) {
    const a = gkArea(d.team);
    return p.x - d.r >= a.x0 && p.x + d.r <= a.x1 && p.y - d.r >= a.y0 && p.y + d.r <= a.y1;
  }

  // Distanza che una pedina può percorrere lungo (dx, dy) prima di uscire dai suoi limiti.
  function gkLimit(d, dx, dy) {
    if (!d.gk) return Infinity;
    const a = gkArea(d.team);
    let t = Infinity;
    if (dx > 0) t = Math.min(t, (a.x1 - d.r - d.x) / dx);
    if (dx < 0) t = Math.min(t, (a.x0 + d.r - d.x) / dx);
    if (dy > 0) t = Math.min(t, (a.y1 - d.r - d.y) / dy);
    if (dy < 0) t = Math.min(t, (a.y0 + d.r - d.y) / dy);
    return Math.max(0, t);
  }

  function keepGoalkeeper(b) {
    const a = gkArea(b.team), r = b.r;
    if (b.x - r < a.x0) { b.x = a.x0 + r; bounce(b, 'x', 1, E_WALL); }
    if (b.x + r > a.x1) { b.x = a.x1 - r; bounce(b, 'x', -1, E_WALL); }
    if (b.y - r < a.y0) { b.y = a.y0 + r; bounce(b, 'y', 1, E_WALL); }
    if (b.y + r > a.y1) { b.y = a.y1 - r; bounce(b, 'y', -1, E_WALL); }
  }

  function physicsStep(dt) {
    for (const b of bodies) integrate(b, dt);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) collide(bodies[i], bodies[j]);
    }
    for (const b of bodies) {
      for (const p of POSTS) collidePost(b, p);
      walls(b);
      if (b.gk) keepGoalkeeper(b);
    }
    if (S.phase === 'moving') checkGoal();
  }

  function onImpact(a, b, strength) {
    Sfx.hit(strength);
    if (S.phase !== 'moving') return;
    if ((a.isBall && b.team === S.turn) || (b.isBall && a.team === S.turn)) S.touched = true;
  }

  const allStopped = () => bodies.every((b) => Math.hypot(b.vx, b.vy) < 5);
  const stopAll = () => bodies.forEach((b) => { b.vx = 0; b.vy = 0; });

  // Distanza percorsa da un corpo che rallenta da v0 a vEnd (attrito c + k·v).
  function travel(v0, vEnd, fr) {
    return (v0 - vEnd) / fr.k - (fr.c / (fr.k * fr.k)) * Math.log((fr.c + fr.k * v0) / (fr.c + fr.k * vEnd));
  }
  function speedFor(dist, vEnd, fr) {
    let lo = vEnd, hi = MAX_SPEED;
    if (travel(hi, vEnd, fr) < dist) return hi;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (travel(mid, vEnd, fr) < dist) lo = mid; else hi = mid;
    }
    return hi;
  }

  // ---------- Flusso di gioco ----------
  function newMatch() {
    S.score = [0, 0];
    S.turn = Math.random() < 0.5 ? 0 : 1;
    S.shot = 1;
    S.paused = false;
    particles = [];
    setupPositions(S.turn);
    updateHud();
    hideOverlays();
    Sfx.whistle();
    startTurn(true);
  }

  function startTurn(newTeam) {
    S.aim = null;
    S.touched = false;
    if (isCpu(S.turn)) {
      S.phase = 'cpu';
      S.cpu = cpuPlan();
    } else {
      S.phase = 'aim';
    }
    if (newTeam) showBanner(turnLabel(S.turn), TEAMS[S.turn].color, 900);
    updateStatus();
  }

  function turnLabel(team) {
    if (settings.mode === 'cpu') return team === 0 ? 'Tocca a te' : 'Tocca alla CPU';
    return `Turno ${TEAMS[team].name}`;
  }

  function shoot(disc, vx, vy) {
    disc.vx = vx; disc.vy = vy;
    S.phase = 'moving';
    S.moveTime = 0;
    S.touched = false;
    S.aim = null;
    Sfx.flick(Math.hypot(vx, vy) / MAX_SPEED);
    updateStatus();
  }

  function endShot() {
    if (S.touched && S.shot < SHOTS_PER_TURN) {
      S.shot++;
      startTurn(false);
    } else {
      S.turn = 1 - S.turn;
      S.shot = 1;
      startTurn(true);
    }
  }

  function checkGoal() {
    if (ball.y + ball.r < F.t) goal(0);
    else if (ball.y - ball.r > F.b) goal(1);
  }

  function goal(team) {
    S.phase = 'goal';
    S.scorer = team;
    S.score[team]++;
    S.goalTimer = 2.0;
    updateHud();
    updateStatus();
    showBanner('GOL!', TEAMS[team].color, 1700, true);
    Sfx.goal();
    try { if (navigator.vibrate) navigator.vibrate([90, 60, 180]); } catch (e) { /* ignorato */ }
    confetti(team);
  }

  function afterGoal() {
    if (S.score[S.scorer] >= Number(settings.target)) return gameOver();
    S.turn = 1 - S.scorer;
    S.shot = 1;
    setupPositions(S.turn);
    Sfx.whistle();
    startTurn(true);
  }

  function gameOver() {
    S.phase = 'over';
    const w = S.score[0] > S.score[1] ? 0 : 1;
    let title = `Vincono i ${TEAMS[w].name}!`;
    if (settings.mode === 'cpu') title = w === 0 ? 'Hai vinto!' : 'Ha vinto la CPU';
    $('overTitle').textContent = title;
    $('overTitle').style.color = TEAMS[w].light;
    $('overScore').textContent = `${S.score[0]} – ${S.score[1]}`;
    Sfx.whistle(true);
    show('over');
    updateStatus();
  }

  function update(dt) {
    if (S.phase === 'moving') {
      S.moveTime += dt;
      if (allStopped() || S.moveTime > 14) { stopAll(); endShot(); }
    } else if (S.phase === 'goal') {
      S.goalTimer -= dt;
      if (S.goalTimer <= 0) afterGoal();
    } else if (S.phase === 'cpu' && S.cpu) {
      S.cpu.t -= dt * 1000;
      if (S.cpu.t <= 0) {
        const c = S.cpu;
        S.cpu = null;
        shoot(c.disc, c.vx, c.vy);
      }
    }
    for (const p of particles) {
      p.vy += 300 * dt; p.vx *= 0.99;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt; p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
  }

  // ---------- CPU ----------
  function pathBlocked(from, to, ignore) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len2 = dx * dx + dy * dy || 1;
    for (const o of bodies) {
      if (o === ignore || o.isBall) continue;
      const t = Math.max(0, Math.min(1, ((o.x - from.x) * dx + (o.y - from.y) * dy) / len2));
      const px = from.x + dx * t, py = from.y + dy * t;
      if (Math.hypot(o.x - px, o.y - py) < o.r + DISC_R - 3) return true;
    }
    return false;
  }

  function cpuPlan() {
    const team = S.turn;
    const lvl = DIFFICULTY[settings.diff] || DIFFICULTY.normale;
    const attackY = team === 0 ? F.t - 20 : F.b + 20;
    const forward = team === 0 ? -1 : 1;
    const ballToGoal = Math.hypot(CX - ball.x, attackY - ball.y);
    const mine = discs.filter((d) => d.team === team);
    let best = null;

    for (const d of mine) {
      const targets = [
        { type: 'goal', x: CX + (Math.random() - 0.5) * 100, y: attackY },
        { type: 'clear', x: ball.x + (ball.x - CX) * 0.4, y: ball.y + forward * 420 },
      ];
      for (const tgt of targets) {
        let gx = tgt.x - ball.x, gy = tgt.y - ball.y;
        const gl = Math.hypot(gx, gy) || 1;
        gx /= gl; gy /= gl;
        const ghost = { x: ball.x - gx * (DISC_R + BALL_R), y: ball.y - gy * (DISC_R + BALL_R) };
        const tx = ghost.x - d.x, ty = ghost.y - d.y;
        const dist = Math.hypot(tx, ty) || 1;
        const dir = { x: tx / dist, y: ty / dist };
        const cut = dir.x * gx + dir.y * gy;
        if (cut < 0.3) continue;
        if (d.gk && !gkCanReach(d, ghost)) continue;
        let score = cut * 2 - dist / 500;
        if (pathBlocked(d, ghost, d)) score -= 2;
        if (tgt.type === 'goal') score += ballToGoal < 480 ? 0.9 : -0.4;
        if (d.gk) score -= 0.4;
        if (!best || score > best.score) best = { d, dir, dist, cut, tgt, gl, score };
      }
    }

    let disc, dir, speed;
    if (best) {
      disc = best.d; dir = best.dir;
      const ballDist = best.tgt.type === 'goal' ? best.gl + 60 : 380;
      const ballSpeed = speedFor(ballDist, 0, BALL_FRICTION);
      const contact = Math.min(MAX_SPEED, ballSpeed / (1.31 * best.cut));
      speed = speedFor(best.dist, contact, DISC_FRICTION);
    } else {
      // Nessun tiro pulito: colpisci la palla con la pedina più vicina.
      // Il portiere entra in gioco solo se la palla è dentro la sua area.
      const usable = mine.filter((d) => !d.gk || gkCanReach(d, ball));
      disc = usable.reduce((a, b) => (Math.hypot(b.x - ball.x, b.y - ball.y) < Math.hypot(a.x - ball.x, a.y - ball.y) ? b : a));
      const dx = ball.x - disc.x, dy = ball.y - disc.y, dl = Math.hypot(dx, dy) || 1;
      dir = { x: dx / dl, y: dy / dl };
      speed = speedFor(dl, 500, DISC_FRICTION);
    }
    const ang = Math.atan2(dir.y, dir.x) + (Math.random() * 2 - 1) * lvl.err;
    speed = Math.min(MAX_SPEED, speed * (1 + (Math.random() * 2 - 1) * lvl.pow));
    return { disc, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, t: lvl.think, total: lvl.think };
  }

  // ---------- Input touch / mouse ----------
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function aimVector(aim) {
    let dx = aim.disc.x - aim.x, dy = aim.disc.y - aim.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;
    const power = Math.min(len, MAX_DRAG) / MAX_DRAG;
    dx /= len; dy /= len;
    return { dx, dy, len, power, speed: power * MAX_SPEED };
  }

  canvas.addEventListener('pointerdown', (e) => {
    Sfx.unlock();
    if (S.paused || S.phase !== 'aim' || isCpu(S.turn) || S.aim) return;
    const p = toLogical(e);
    let pick = null, bestD = PICK_RADIUS;
    for (const d of discs) {
      if (d.team !== S.turn) continue;
      const dd = Math.hypot(d.x - p.x, d.y - p.y);
      if (dd < bestD) { bestD = dd; pick = d; }
    }
    if (!pick) return;
    S.aim = { disc: pick, x: p.x, y: p.y, id: e.pointerId };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignorato */ }
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (err) { /* ignorato */ }
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!S.aim || e.pointerId !== S.aim.id) return;
    const p = toLogical(e);
    S.aim.x = p.x; S.aim.y = p.y;
    e.preventDefault();
  });

  function release(e, cancel) {
    if (!S.aim || e.pointerId !== S.aim.id) return;
    const aim = S.aim;
    S.aim = null;
    if (cancel || S.phase !== 'aim') return;
    const v = aimVector(aim);
    if (!v || v.len < 16) return; // trascinamento troppo corto: annulla
    shoot(aim.disc, v.dx * v.speed, v.dy * v.speed);
  }
  canvas.addEventListener('pointerup', (e) => release(e, false));
  canvas.addEventListener('pointercancel', (e) => release(e, true));
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- Rendering ----------
  function resize() {
    const rect = stage.getBoundingClientRect();
    const availW = Math.max(100, rect.width - 12), availH = Math.max(100, rect.height - 4);
    scale = Math.min(availW / W, availH / H);
    const cssW = Math.floor(W * scale), cssH = Math.floor(H * scale);
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    pitch = document.createElement('canvas');
    pitch.width = canvas.width; pitch.height = canvas.height;
    const pc = pitch.getContext('2d');
    pc.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    drawPitch(pc);
  }

  function drawPitch(g) {
    g.fillStyle = '#17602a';
    g.fillRect(0, 0, W, H);
    const bands = 12, bh = (F.b - F.t) / bands;
    for (let i = 0; i < bands; i++) {
      g.fillStyle = i % 2 ? '#2b8a3e' : '#319a45';
      g.fillRect(F.l, F.t + i * bh, F.r - F.l, bh + 0.5);
    }
    // Reti
    for (const top of [true, false]) {
      const y0 = top ? F.t - DEPTH : F.b;
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.fillRect(MOUTH.l, y0, MOUTH.r - MOUTH.l, DEPTH);
      g.save();
      g.beginPath(); g.rect(MOUTH.l, y0, MOUTH.r - MOUTH.l, DEPTH); g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
      for (let x = MOUTH.l - DEPTH; x < MOUTH.r + DEPTH; x += 10) {
        g.beginPath(); g.moveTo(x, y0); g.lineTo(x + DEPTH, y0 + DEPTH); g.stroke();
        g.beginPath(); g.moveTo(x + DEPTH, y0); g.lineTo(x, y0 + DEPTH); g.stroke();
      }
      g.restore();
      g.strokeStyle = '#e5e7eb'; g.lineWidth = 4;
      g.beginPath();
      if (top) { g.moveTo(MOUTH.l, F.t); g.lineTo(MOUTH.l, F.t - DEPTH); g.lineTo(MOUTH.r, F.t - DEPTH); g.lineTo(MOUTH.r, F.t); }
      else { g.moveTo(MOUTH.l, F.b); g.lineTo(MOUTH.l, F.b + DEPTH); g.lineTo(MOUTH.r, F.b + DEPTH); g.lineTo(MOUTH.r, F.b); }
      g.stroke();
    }
    // Linee
    g.strokeStyle = 'rgba(255,255,255,0.88)';
    g.lineWidth = 3;
    g.strokeRect(F.l, F.t, F.r - F.l, F.b - F.t);
    g.beginPath(); g.moveTo(F.l, CY); g.lineTo(F.r, CY); g.stroke();
    g.beginPath(); g.arc(CX, CY, 80, 0, Math.PI * 2); g.stroke();
    dot(g, CX, CY, 4);
    for (const top of [true, false]) {
      const s = top ? 1 : -1, line = top ? F.t : F.b;
      g.strokeRect(CX - AREA_W / 2, top ? F.t : F.b - AREA_H, AREA_W, AREA_H);
      g.strokeRect(CX - 95, top ? F.t : F.b - 55, 190, 55);
      dot(g, CX, line + s * 108, 3.5);
      g.beginPath();
      const a0 = top ? 0.2 * Math.PI : 1.2 * Math.PI;
      g.arc(CX, line + s * 108, 70, a0, a0 + 0.6 * Math.PI);
      g.stroke();
    }
    for (const [x, y, a] of [[F.l, F.t, 0], [F.r, F.t, 0.5], [F.r, F.b, 1], [F.l, F.b, 1.5]]) {
      g.beginPath(); g.arc(x, y, 14, a * Math.PI, (a + 0.5) * Math.PI); g.stroke();
    }
    // Pali
    g.fillStyle = '#ffffff';
    for (const p of POSTS) dot(g, p.x, p.y, POST_R + 1);
  }

  function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }

  function drawDisc(g, d, t) {
    const team = TEAMS[d.team];
    const active = (S.phase === 'aim' && !isCpu(S.turn) && d.team === S.turn) ||
      (S.aim && S.aim.disc === d) || (S.cpu && S.cpu.disc === d);
    // Ombra
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.beginPath(); g.ellipse(d.x + 3, d.y + 5, d.r, d.r * 0.9, 0, 0, Math.PI * 2); g.fill();
    // Alone selezionabile
    if (active) {
      const pulse = S.aim && S.aim.disc === d ? 1 : 0.5 + 0.5 * Math.sin(t * 5);
      g.strokeStyle = `rgba(255,255,255,${0.35 + 0.45 * pulse})`;
      g.lineWidth = 3;
      g.beginPath(); g.arc(d.x, d.y, d.r + 5 + pulse * 2, 0, Math.PI * 2); g.stroke();
    }
    // Base
    const grad = g.createRadialGradient(d.x - 6, d.y - 8, 2, d.x, d.y, d.r);
    grad.addColorStop(0, team.light); grad.addColorStop(1, team.dark);
    g.fillStyle = grad;
    dot(g, d.x, d.y, d.r);
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(d.x, d.y, d.r - 0.5, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath(); g.arc(d.x, d.y, d.r * 0.72, 0, Math.PI * 2); g.fill();
    // Giocatore visto dall'alto: spalle e testa
    const facing = d.team === 0 ? -1 : 1;
    g.fillStyle = d.gk ? team.gk : team.color;
    g.strokeStyle = d.gk ? team.gkDark : team.dark; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(d.x, d.y + facing * 1, d.r * 0.58, d.r * 0.3, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#e8b98a';
    dot(g, d.x, d.y + facing * 2, d.r * 0.22);
    g.fillStyle = '#3b2412';
    g.beginPath(); g.arc(d.x, d.y + facing * 2, d.r * 0.22, facing > 0 ? Math.PI : 0, facing > 0 ? 2 * Math.PI : Math.PI); g.fill();
  }

  function drawBall(g) {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    dot(g, ball.x + 2, ball.y + 4, ball.r);
    g.save();
    g.translate(ball.x, ball.y);
    g.beginPath(); g.arc(0, 0, ball.r, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#ffffff'; g.fillRect(-ball.r, -ball.r, ball.r * 2, ball.r * 2);
    g.rotate(ball.rot);
    g.fillStyle = '#1f2937';
    dot(g, 0, 0, ball.r * 0.36);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      dot(g, Math.cos(a) * ball.r * 0.95, Math.sin(a) * ball.r * 0.95, ball.r * 0.3);
    }
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); g.stroke();
  }

  function drawAim(g, disc, dx, dy, power, finger) {
    const col = `hsl(${120 - power * 120}, 90%, 55%)`;
    if (finger) {
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.setLineDash([4, 6]);
      g.beginPath(); g.moveTo(disc.x, disc.y); g.lineTo(finger.x, finger.y); g.stroke();
      g.setLineDash([]);
    }
    // Traiettoria prevista della pedina (senza contare le collisioni)
    const reach = Math.min(travel(power * MAX_SPEED, 0, DISC_FRICTION), 900, gkLimit(disc, dx, dy));
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2.5; g.setLineDash([2, 9]); g.lineCap = 'round';
    g.beginPath(); g.moveTo(disc.x + dx * (disc.r + 4), disc.y + dy * (disc.r + 4));
    g.lineTo(disc.x + dx * (disc.r + reach), disc.y + dy * (disc.r + reach)); g.stroke();
    g.setLineDash([]); g.lineCap = 'butt';
    // Freccia
    const len = 30 + power * 80;
    const sx = disc.x + dx * (disc.r + 4), sy = disc.y + dy * (disc.r + 4);
    const ex = sx + dx * len, ey = sy + dy * len;
    g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.lineCap = 'butt';
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(ex + dx * 14, ey + dy * 14);
    g.lineTo(ex - dy * 11, ey + dx * 11);
    g.lineTo(ex + dy * 11, ey - dx * 11);
    g.closePath(); g.fill();
    // Anello di potenza
    g.strokeStyle = col; g.lineWidth = 4;
    g.beginPath(); g.arc(disc.x, disc.y, disc.r + 9, -Math.PI / 2, -Math.PI / 2 + power * Math.PI * 2); g.stroke();
  }

  function render(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (pitch) ctx.drawImage(pitch, 0, 0);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);

    for (const d of discs) drawDisc(ctx, d, t);
    drawBall(ctx);

    if (S.aim) {
      const v = aimVector(S.aim);
      if (v && v.len >= 16) drawAim(ctx, S.aim.disc, v.dx, v.dy, v.power, S.aim);
    } else if (S.cpu) {
      const sp = Math.hypot(S.cpu.vx, S.cpu.vy);
      const grow = Math.min(1, 1.4 * (1 - S.cpu.t / S.cpu.total));
      drawAim(ctx, S.cpu.disc, S.cpu.vx / sp, S.cpu.vy / sp, (sp / MAX_SPEED) * grow, null);
    }

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-4, -2.5, 8, 5);
      ctx.restore();
    }
  }

  function confetti(team) {
    const cols = [TEAMS[team].color, TEAMS[team].light, '#ffffff', '#facc15'];
    const y = team === 0 ? F.t : F.b;
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 450;
      particles.push({
        x: CX + (Math.random() - 0.5) * 140, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
        life: 1.2 + Math.random() * 1.2,
        color: cols[i % cols.length],
      });
    }
  }

  // ---------- HUD ----------
  let bannerTimer = 0;
  function showBanner(text, color, ms, isGoal) {
    banner.textContent = text;
    banner.style.color = '#fff';
    banner.style.background = color;
    banner.classList.toggle('goal', !!isGoal);
    banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => banner.classList.remove('show'), ms);
  }

  function updateHud() {
    $('s0').textContent = S.score[0];
    $('s1').textContent = S.score[1];
    $('n0').textContent = settings.mode === 'cpu' ? 'Tu' : TEAMS[0].name;
    $('n1').textContent = settings.mode === 'cpu' ? 'CPU' : TEAMS[1].name;
  }

  function updateStatus() {
    const st = $('statusText');
    const team = TEAMS[S.turn];
    const who = `<span class="who" style="color:${team.light}">${settings.mode === 'cpu' ? (S.turn === 0 ? 'Tu' : 'CPU') : team.name}</span>`;
    let msg = '';
    if (S.phase === 'aim') msg = `${who} · trascina indietro una pedina e rilascia`;
    else if (S.phase === 'cpu') msg = `${who} · sta mirando…`;
    else if (S.phase === 'moving') msg = `${who} · tiro in corso`;
    else if (S.phase === 'goal') msg = `Gol dei ${TEAMS[S.scorer].name}!`;
    else msg = '&nbsp;';
    st.innerHTML = msg;
    const shots = $('shots');
    shots.innerHTML = '';
    if (S.phase === 'aim' || S.phase === 'cpu' || S.phase === 'moving') {
      for (let i = 1; i <= SHOTS_PER_TURN; i++) {
        const el = document.createElement('i');
        if (i <= SHOTS_PER_TURN - S.shot + 1) el.className = 'on';
        shots.appendChild(el);
      }
      shots.title = `Tiri rimasti: ${SHOTS_PER_TURN - S.shot + 1}`;
    }
  }

  // ---------- Audio (WebAudio sintetizzato) ----------
  const Sfx = {
    ctx: null, last: 0,
    unlock() {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    ok() { return settings.sound && this.ctx && this.ctx.state === 'running'; },
    tone(freq, dur, type, vol, toFreq, delay = 0) {
      if (!this.ok()) return;
      const c = this.ctx, t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, vol, freq, q = 1) {
      if (!this.ok()) return;
      const c = this.ctx, t = c.currentTime;
      const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(c.destination);
      src.start(t);
    },
    hit(strength) {
      if (!this.ok()) return;
      const now = this.ctx.currentTime;
      if (now - this.last < 0.035 || strength < 40) return;
      this.last = now;
      const v = Math.min(0.35, strength / 2500);
      this.tone(1100 + Math.random() * 300, 0.05, 'triangle', v, 500);
    },
    post(strength) { this.tone(1900, 0.18, 'sine', Math.min(0.25, strength / 3000), 1700); },
    flick(p) { this.noise(0.07, 0.15 + p * 0.3, 2400, 0.8); },
    whistle(long) {
      const d = long ? 0.6 : 0.22;
      this.tone(2700, d, 'square', 0.035);
      this.tone(2850, d, 'square', 0.025);
      if (long) this.tone(2700, 0.25, 'square', 0.035, null, 0.75);
    },
    goal() {
      this.noise(2.2, 0.22, 700, 0.4);
      this.tone(523, 0.18, 'triangle', 0.18);
      this.tone(659, 0.18, 'triangle', 0.18, null, 0.15);
      this.tone(784, 0.4, 'triangle', 0.2, null, 0.3);
    },
  };

  // ---------- Menu e overlay ----------
  function show(id) { $(id).classList.add('show'); }
  function hide(id) { $(id).classList.remove('show'); }
  function hideOverlays() { ['menu', 'pause', 'over'].forEach(hide); }

  function syncMenu() {
    document.querySelectorAll('.seg').forEach((seg) => {
      const key = seg.dataset.key;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(settings[key])));
    });
    $('diffGroup').style.display = settings.mode === 'cpu' ? '' : 'none';
    $('soundBtn').textContent = settings.sound ? '🔊' : '🔇';
  }

  document.querySelectorAll('.seg').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      settings[seg.dataset.key] = b.dataset.v;
      saveSettings();
      syncMenu();
    });
  });

  function openMenu() {
    S.phase = 'menu';
    S.aim = null; S.cpu = null;
    S.paused = false;
    setupPositions(0);
    hideOverlays();
    show('menu');
    updateStatus();
  }

  function pause() {
    if (S.phase === 'menu' || S.phase === 'over' || S.paused) return;
    S.paused = true;
    S.aim = null;
    show('pause');
  }
  function resume() { S.paused = false; hide('pause'); }

  $('playBtn').addEventListener('click', () => { Sfx.unlock(); newMatch(); });
  $('menuBtn').addEventListener('click', () => (S.paused ? resume() : pause()));
  $('resumeBtn').addEventListener('click', resume);
  $('restartBtn').addEventListener('click', newMatch);
  $('quitBtn').addEventListener('click', openMenu);
  $('againBtn').addEventListener('click', newMatch);
  $('overMenuBtn').addEventListener('click', openMenu);
  $('soundBtn').addEventListener('click', () => {
    settings.sound = !settings.sound;
    saveSettings(); syncMenu(); Sfx.unlock();
  });
  // Pausa automatica quando l'app va in background
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

  // ---------- Ciclo principale ----------
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!S.paused && S.phase !== 'menu' && !document.hidden) {
      acc += dt;
      while (acc >= STEP) { physicsStep(STEP); acc -= STEP; }
      update(dt);
    } else {
      acc = 0;
    }
    render(now / 1000);
    requestAnimationFrame(frame);
  }

  setupPositions(0);
  syncMenu();
  updateHud();
  resize();
  requestAnimationFrame(frame);

  // Hook per i test automatici.
  window.__game = { S, get ball() { return ball; }, get discs() { return discs; }, settings, cpuPlan, shoot };
})();
