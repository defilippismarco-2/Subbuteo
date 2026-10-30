'use strict';

(() => {
  // =====================================================================
  // Costanti (coordinate logiche del campo, 600x1000)
  // =====================================================================
  const W = 600, H = 1000, TAU = Math.PI * 2;
  const F = { l: 30, r: 570, t: 60, b: 940 };       // linee del campo
  const CX = W / 2, CY = H / 2;
  const MOUTH = { l: 220, r: 380 };                 // pali
  const DEPTH = 42;                                 // profondità della porta
  const AREA_W = 320, AREA_H = 150;                 // area di rigore
  const DISC_R = 24, BALL_R = 12, POST_R = 5, TOKEN_R = 17;
  const DISC_FRICTION = { c: 80, k: 1.6 };
  const BALL_FRICTION = { c: 50, k: 1.3 };
  const MAX_SPEED = 1450;
  const MAX_DRAG = 150;                              // trascinamento per la potenza massima
  const PICK_RADIUS = 62;                            // area di tocco generosa intorno alla pedina
  const BASE_SHOTS = 3;
  const E_BODY = 0.9, E_WALL = 0.72, E_NET = 0.25;
  const STEP = 1 / 240, SIM_STEP = 1 / 160;          // passo fisso della fisica / dell'anteprima
  const SPIN_RATE = 1.6;                             // rad/s di curva con effetto pieno
  const FORCE_MIN_SPEED = 60;                        // sotto questa velocità vento e pendenza non agiscono
  const AIM_BASE = 0.5;                              // la linea di mira mostra metà della corsa reale
  const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const POSTS = [
    { x: MOUTH.l, y: F.t, r: POST_R }, { x: MOUTH.r, y: F.t, r: POST_R },
    { x: MOUTH.l, y: F.b, r: POST_R }, { x: MOUTH.r, y: F.b, r: POST_R },
  ];
  // Formazione della squadra in basso: portiere, 2 difensori, centrocampista, attaccante.
  const FORMATION = [[300, 905], [185, 805], [415, 805], [300, 715], [300, 0]];

  // =====================================================================
  // Nazionali
  // =====================================================================
  const NATIONS = {
    BRA: { name: 'Brasile', rating: 5, kits: [{ shirt: '#fcd116', base: '#169b3e' }, { shirt: '#2a52be', base: '#fcd116' }] },
    JPN: { name: 'Giappone', rating: 3, kits: [{ shirt: '#1b2f7a', base: '#f4f6fb' }, { shirt: '#f4f6fb', base: '#1b2f7a' }] },
    ITA: { name: 'Italia', rating: 4, kits: [{ shirt: '#2a72d4', base: '#f4f6fb' }, { shirt: '#f4f6fb', base: '#2a72d4' }] },
    ARG: { name: 'Argentina', rating: 5, kits: [{ shirt: '#8ecdf2', stripe: '#ffffff', base: '#1c2340' }, { shirt: '#24204f', base: '#8ecdf2' }] },
    FRA: { name: 'Francia', rating: 5, kits: [{ shirt: '#1d2b5c', base: '#e63946' }, { shirt: '#f4f6fb', base: '#1d2b5c' }] },
    ENG: { name: 'Inghilterra', rating: 4, kits: [{ shirt: '#f4f6fb', base: '#1d2b5c' }, { shirt: '#c8102e', base: '#f4f6fb' }] },
    NED: { name: 'Olanda', rating: 3, kits: [{ shirt: '#f36c21', base: '#141414' }, { shirt: '#1f3a8a', base: '#f36c21' }] },
    ESP: { name: 'Spagna', rating: 4, kits: [{ shirt: '#c60b1e', base: '#1d2b5c' }, { shirt: '#f6e7b0', base: '#c60b1e' }] },
    GER: { name: 'Germania', rating: 4, kits: [{ shirt: '#f4f6fb', base: '#141414' }, { shirt: '#1f2937', base: '#dd0000' }] },
    POR: { name: 'Portogallo', rating: 4, kits: [{ shirt: '#9b1b30', base: '#0b6b3a' }, { shirt: '#f4f6fb', base: '#9b1b30' }] },
  };
  const NATION_IDS = Object.keys(NATIONS);
  const GK_COLORS = ['#22c55e', '#facc15', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#111827', '#84cc16'];

  // =====================================================================
  // Campi, palloni, oggetti, ostacoli
  // =====================================================================
  const FIELDS = {
    erba: { name: 'Erba', fric: 1, lines: 'rgba(255,255,255,0.88)', obstacles: ['fango', 'irrigatore', 'vento', 'invasore'], invader: 'tifoso' },
    terra: { name: 'Terra', fric: 1.15, lines: 'rgba(255,248,236,0.78)', obstacles: ['fango', 'sasso', 'vento', 'pendenza', 'invasore'], invader: 'cane' },
    indoor: { name: 'Indoor', fric: 0.85, lines: '#f8fafc', obstacles: ['bagnato', 'cono', 'sagome', 'invasore'], invader: 'tifoso' },
    street: { name: 'Street', fric: 1, lines: '#facc15', obstacles: ['tombino', 'pozzanghera', 'bidone', 'pendenza', 'vento', 'invasore'], invader: 'skater' },
    neve: { name: 'Neve', fric: 1.25, lines: '#d4313c', obstacles: ['ghiaccio', 'cumulo', 'pupazzo', 'vento'] },
    allenamento: { name: 'Allenamento', fric: 1, lines: 'rgba(255,255,255,0.8)', obstacles: ['cono', 'sagome', 'irrigatore', 'vento'] },
  };
  const FIELD_IDS = Object.keys(FIELDS);

  const BALLS = {
    classico: { name: 'Classico', base: '#ffffff', patch: '#1f2937', aim: '#ffffff', style: 'patches' },
    retro: { name: 'Retrò', base: '#a0632f', patch: '#5a3216', aim: '#e0a96d', style: 'panels' },
    neon: { name: 'Neon', base: '#0b0f14', patch: '#39ff14', aim: '#39ff14', style: 'patches', glow: '#39ff14' },
    invernale: { name: 'Invernale', base: '#f97316', patch: '#1f2937', aim: '#ff6a1a', style: 'patches' },
    futsal: { name: 'Futsal', base: '#fde047', patch: '#1d4ed8', aim: '#fde047', style: 'swirl' },
    galassia: { name: 'Galassia', base: '#3b0f75', patch: '#f0abfc', aim: '#d08cff', style: 'stars' },
  };
  const BALL_IDS = Object.keys(BALLS);

  const ITEMS = {
    fiato: { name: 'Fiato', icon: '💨', w: 1,
      desc: 'Il turno ha 4 tiri invece di 3.', gold: '5 tiri.' },
    piombo: { name: 'Palla di piombo', icon: '⚫', w: 1,
      desc: 'Per un tiro la tua pedina pesa il triplo: travolge gli avversari, non si fa spostare e calcia più forte.', gold: 'vale per tutti i tiri del turno.' },
    giro: { name: 'Tiro a giro', icon: '🌀', w: 1,
      desc: 'Tira normalmente: quando la pedina colpisce la palla il gioco si ferma e trascini a destra o a sinistra per far curvare la palla.', gold: 'la curva può essere il doppio più stretta.' },
    laser: { name: 'Laser', icon: '🎯', w: 1,
      desc: 'Mostra dove andrà la palla dopo l\'impatto, con i rimbalzi, e allunga la linea di mira del 60%.', gold: 'linea di mira lunga il doppio (+100%), per 2 tiri consecutivi.' },
    dribbling: { name: 'Dribbling', icon: '🧲', w: 1,
      desc: 'Per un tiro la palla resta attaccata alla pedina che la tocca e viaggia con lei. Si stacca se la pedina urta qualcosa.', gold: 'vale per 2 tiri: tra uno e l\'altro la palla resta incollata.' },
    giallo: { name: 'Cartellino giallo', icon: '🟨', w: 1,
      desc: 'Scegli una pedina avversaria: nel suo prossimo turno non si può usare e resta ferma come un paletto.', gold: 'due pedine.' },
    volante: { name: 'Portiere volante', icon: '🧤', w: 1,
      desc: 'Per questo turno il tuo portiere può uscire dall\'area. Alla fine rientra da solo.', gold: 'dura anche il tuo turno successivo.' },
    var: { name: 'VAR', icon: '📺', w: 0.6,
      desc: 'Annulla l\'ultimo tiro dell\'avversario e rimette tutto com\'era, poi tocca a te. Si può usare anche durante il turno avversario.', gold: 'può annullare anche un gol subito.' },
  };
  const ITEM_IDS = Object.keys(ITEMS);

  const OBST = {
    fango: { kind: 'slow', name: 'Fango', icon: '🟫', desc: 'Rallenta molto palla e pedine.' },
    pozzanghera: { kind: 'slow', name: 'Pozzanghera', icon: '💧', desc: 'Rallenta molto palla e pedine.' },
    cumulo: { kind: 'slow', name: 'Cumulo di neve', icon: '🌨️', desc: 'Rallenta molto palla e pedine.' },
    ghiaccio: { kind: 'ice', name: 'Ghiaccio', icon: '🧊', desc: 'Quasi senza attrito: tutto scivola lontano.' },
    bagnato: { kind: 'ice', name: 'Pavimento bagnato', icon: '⚠️', desc: 'Scivoloso: palla e pedine frenano pochissimo.' },
    irrigatore: { kind: 'sprinkler', name: 'Irrigatore', icon: '🚿', desc: 'A intervalli bagna una zona, che resta scivolosa per 2 turni.' },
    cono: { kind: 'post', name: 'Coni', icon: '🔶', r: 12, desc: 'Ostacoli fissi. Si abbattono al terzo colpo.' },
    sasso: { kind: 'post', name: 'Sassi', icon: '🪨', r: 15, desc: 'Ostacoli fissi. Si spaccano al terzo colpo.' },
    bidone: { kind: 'post', name: 'Bidoni', icon: '🗑️', r: 17, desc: 'Ostacoli fissi. Si ribaltano al terzo colpo.' },
    pupazzo: { kind: 'post', name: 'Pupazzo di neve', icon: '⛄', r: 17, desc: 'Ostacolo fisso. Si sgretola al terzo colpo.' },
    sagome: { kind: 'barrier', name: 'Barriera di sagome', icon: '🧍', desc: 'Una barriera davanti a una porta che si sposta a ogni turno.' },
    vento: { kind: 'wind', name: 'Vento', icon: '🌬️', desc: 'Sposta la palla in corsa. Cambia direzione e forza a ogni turno: guarda la freccia in alto a sinistra.' },
    pendenza: { kind: 'slope', name: 'Pendenza', icon: '↘️', desc: 'Una zona in discesa che devia ciò che ci passa sopra nella direzione delle frecce.' },
    tombino: { kind: 'manhole', name: 'Tombini', icon: '🕳️', desc: 'La palla che cade in un tombino esce dall\'altro.' },
    invasore: { kind: 'invader', name: 'Invasore di campo', icon: '🏃', desc: 'Ogni tanto qualcuno attraversa il campo durante un tiro: un tifoso, un cane o uno skater.' },
  };

  const ROUND_NAMES = ['Quarti di finale', 'Semifinale', 'Finale'];
  const DIFF_IDX = { facile: 0, normale: 1, difficile: 2 };

  // =====================================================================
  // Utilità
  // =====================================================================
  const $ = (id) => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbHex(r, g, b) { return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function cdist(a, b) { const A = hexRgb(a), B = hexRgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }
  function lum(h) { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }

  // =====================================================================
  // DOM e impostazioni
  // =====================================================================
  const canvas = $('c');
  const ctx = canvas.getContext('2d');
  const stage = $('stage');
  const banner = $('banner');

  const DEFAULTS = {
    mode: 'cpu', rules: 'poteri', diff: 'normale', target: '3', field: 'erba', ball: 'classico',
    team0: 'ITA', team1: 'random', p2team: 'BRA', tourTeam: 'ITA', sound: true, full: false,
  };
  const settings = (() => {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('cdt-settings') || '{}')); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  })();
  function saveSettings() {
    try { localStorage.setItem('cdt-settings', JSON.stringify(settings)); } catch (e) { /* ignorato */ }
  }

  // =====================================================================
  // Stato di gioco
  // =====================================================================
  const newFx = () => ({ piombo: 0, piomboTurn: false, laser: 0, laserGold: false, giro: false, giroGold: false, dribble: 0, volante: 0 });
  const S = {
    phase: 'menu',      // menu | aim | card | cpu | moving | curve | goal | over
    paused: false,
    score: [0, 0], turn: 0, shot: 1, maxShots: BASE_SHOTS,
    touched: false, moveTime: 0, goalTimer: 0, scorer: -1, lastTouch: -1,
    aim: null, curve: null, curveReq: false, cardPick: null, cpu: null, shooterDisc: null,
    inv: [[], []], fx: [newFx(), newFx()],
    tokens: [], obstacles: [], solids: [], wind: null, invader: null,
    cards: [], lastShot: null, floats: [],
    shotCount: 0, turnCount: 0, sinceGold: 0,
  };
  let M = null;                       // configurazione della partita in corso
  let FIELD = FIELDS.erba, FIELD_ID = 'erba', BALL = BALLS.classico;
  let TEAMS = [];
  // Mondo "vivo": la simulazione d'anteprima ne usa una copia con sim = true.
  const LW = { bodies: [], ball: null, sim: false, shooter: -1, dribble: false, hold: false, giro: false, giroGold: false };
  let discs = [], ball = null;
  let particles = [];
  let dpr = 1, pitch = null;
  // Porzione del campo logico mostrata a schermo: a campo intero si tagliano i bordi esterni.
  const VIEW_NORMAL = { x: 0, y: 0, w: W, h: H };
  const VIEW_FULL = { x: F.l - 6, y: F.t - DEPTH - 6, w: F.r - F.l + 12, h: F.b - F.t + 2 * DEPTH + 12 };
  let VIEW = VIEW_NORMAL;

  const isCpu = (team) => !!M && M.mode !== '2p' && team === 1;
  const powers = () => !!M && M.rules === 'poteri';
  const teamLabel = (team) => (M && M.mode !== '2p' ? (team === 0 ? 'Tu' : 'CPU') : TEAMS[team].name);
  const effFric = (fr) => ({ c: fr.c * FIELD.fric, k: fr.k * FIELD.fric });

  // =====================================================================
  // Squadre
  // =====================================================================
  function buildTeams(a, b) {
    const ka = NATIONS[a].kits[0];
    let kb = NATIONS[b].kits[0];
    if (cdist(ka.shirt, kb.shirt) < 130) kb = NATIONS[b].kits[1];
    const gkPick = (avoid) => GK_COLORS.reduce((best, c) => {
      const s = Math.min(...avoid.map((x) => cdist(c, x)));
      return s > best.s ? { c, s } : best;
    }, { c: GK_COLORS[0], s: -1 }).c;
    const gk0 = gkPick([ka.shirt, kb.shirt, ka.base]);
    const gk1 = gkPick([ka.shirt, kb.shirt, kb.base, gk0]);
    const make = (id, kit, gk) => ({
      id, name: NATIONS[id].name, shirt: kit.shirt, base: kit.base, stripe: kit.stripe || null,
      light: mix(kit.base, '#ffffff', 0.35), dark: mix(kit.base, '#000000', 0.45),
      shirtDark: mix(kit.shirt, '#000000', 0.35), shirtLight: mix(kit.shirt, '#ffffff', 0.3),
      gk, gkDark: mix(gk, '#000000', 0.45),
      ui: lum(kit.shirt) < 0.35 ? mix(kit.shirt, '#ffffff', 0.5) : kit.shirt,
      text: lum(kit.shirt) > 0.62 ? '#111111' : '#ffffff',
    });
    return [make(a, ka, gk0), make(b, kb, gk1)];
  }

  // Bandiere disegnate a mano (niente emoji, così si vedono ovunque).
  const flagCache = {};
  function drawFlag(g, id, w, h) {
    const vert = (cols) => cols.forEach((c, i) => { g.fillStyle = c; g.fillRect((w / cols.length) * i, 0, w / cols.length + 0.5, h); });
    const hor = (cols, parts) => {
      let y = 0; const tot = (parts || cols.map(() => 1)).reduce((s, v) => s + v, 0);
      cols.forEach((c, i) => { const hh = (h * (parts ? parts[i] : 1)) / tot; g.fillStyle = c; g.fillRect(0, y, w, hh + 0.5); y += hh; });
    };
    switch (id) {
      case 'ITA': vert(['#009246', '#ffffff', '#ce2b37']); break;
      case 'FRA': vert(['#0055a4', '#ffffff', '#ef4135']); break;
      case 'GER': hor(['#000000', '#dd0000', '#ffce00']); break;
      case 'NED': hor(['#ae1c28', '#ffffff', '#21468b']); break;
      case 'ESP': hor(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]); break;
      case 'ARG':
        hor(['#74acdf', '#ffffff', '#74acdf']);
        g.fillStyle = '#f6b40e'; dot(g, w / 2, h / 2, h * 0.11); break;
      case 'JPN':
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#bc002d'; dot(g, w / 2, h / 2, h * 0.3); break;
      case 'ENG':
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#ce1124'; g.fillRect(w / 2 - h * 0.1, 0, h * 0.2, h); g.fillRect(0, h * 0.4, w, h * 0.2); break;
      case 'POR':
        g.fillStyle = '#006600'; g.fillRect(0, 0, w * 0.4, h);
        g.fillStyle = '#ff0000'; g.fillRect(w * 0.4, 0, w * 0.6, h);
        g.fillStyle = '#ffd700'; dot(g, w * 0.4, h / 2, h * 0.22);
        g.fillStyle = '#ff0000'; dot(g, w * 0.4, h / 2, h * 0.13); break;
      case 'BRA':
        g.fillStyle = '#009c3b'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffdf00';
        g.beginPath(); g.moveTo(w * 0.08, h / 2); g.lineTo(w / 2, h * 0.1); g.lineTo(w * 0.92, h / 2); g.lineTo(w / 2, h * 0.9); g.closePath(); g.fill();
        g.fillStyle = '#002776'; dot(g, w / 2, h / 2, h * 0.23); break;
    }
  }
  function flagURL(id) {
    if (!flagCache[id]) {
      const c = document.createElement('canvas');
      c.width = 60; c.height = 40;
      drawFlag(c.getContext('2d'), id, 60, 40);
      flagCache[id] = c.toDataURL();
    }
    return flagCache[id];
  }

  // =====================================================================
  // Corpi
  // =====================================================================
  function makeBody(x, y, r, m, fr, extra) {
    return Object.assign({ x, y, vx: 0, vy: 0, r, m, c: fr.c, k: fr.k, rot: 0, spin: 0 }, extra);
  }

  function setBodies(list) {
    list.forEach((b, i) => { b.i = i; });
    LW.bodies = list;
    discs = list.filter((b) => !b.isBall);
    ball = list.find((b) => b.isBall);
    LW.ball = ball;
  }

  function setupPositions(kicker) {
    const list = [];
    for (let team = 0; team < 2; team++) {
      FORMATION.forEach(([x, y], i) => {
        let py = y;
        if (i === 4) py = team === kicker ? CY + BALL_R + DISC_R + 6 : CY + 80 + DISC_R + 6;
        if (team === 1) py = H - py;
        list.push(makeBody(x, py, DISC_R, 1, DISC_FRICTION, { team, gk: i === 0 }));
      });
    }
    list.push(makeBody(CX, CY, BALL_R, 0.45, BALL_FRICTION, { isBall: true, attached: -1, ax: 0, ay: -1, mh: 0 }));
    setBodies(list);
    LW.hold = false; LW.dribble = false;
    applyStatus();
  }

  // Ricalcola gli stati che dipendono da oggetti e cartellini.
  function applyStatus() {
    for (const d of discs) {
      d.m = 1; d.heavy = false;
      d.frozen = S.cards.some((c) => c.i === d.i);
      d.flying = d.gk && S.fx[d.team].volante > 0;
      if (d.gk && !d.flying && !insideArea(d)) d.returning = true;
    }
  }

  // =====================================================================
  // Area del portiere
  // =====================================================================
  function gkArea(team) {
    const x0 = CX - AREA_W / 2, x1 = CX + AREA_W / 2;
    return team === 0 ? { x0, x1, y0: F.b - AREA_H, y1: F.b + DEPTH } : { x0, x1, y0: F.t - DEPTH, y1: F.t + AREA_H };
  }
  function insideArea(d) {
    const a = gkArea(d.team);
    return d.x - d.r >= a.x0 - 0.5 && d.x + d.r <= a.x1 + 0.5 && d.y - d.r >= a.y0 - 0.5 && d.y + d.r <= a.y1 + 0.5;
  }
  // Il portiere arriva su un punto solo se ci sta tutto dentro la sua area.
  function gkCanReach(d, p) {
    if (d.flying) return true;
    const a = gkArea(d.team);
    return p.x - d.r >= a.x0 && p.x + d.r <= a.x1 && p.y - d.r >= a.y0 && p.y + d.r <= a.y1;
  }
  // Distanza che una pedina può percorrere lungo (dx, dy) prima di uscire dai suoi limiti.
  function gkLimit(d, dx, dy) {
    if (!d.gk || d.flying) return Infinity;
    const a = gkArea(d.team);
    let t = Infinity;
    if (dx > 0) t = Math.min(t, (a.x1 - d.r - d.x) / dx);
    if (dx < 0) t = Math.min(t, (a.x0 + d.r - d.x) / dx);
    if (dy > 0) t = Math.min(t, (a.y1 - d.r - d.y) / dy);
    if (dy < 0) t = Math.min(t, (a.y0 + d.r - d.y) / dy);
    return Math.max(0, t);
  }

  // =====================================================================
  // Fisica
  // =====================================================================
  const inEllipse = (b, o) => { const dx = (b.x - o.x) / o.rx, dy = (b.y - o.y) / o.ry; return dx * dx + dy * dy <= 1; };
  const inRect = (b, o) => Math.abs(b.x - o.x) <= o.w / 2 && Math.abs(b.y - o.y) <= o.h / 2;

  function zoneMult(b) {
    let m = FIELD.fric;
    for (const o of S.obstacles) {
      const k = OBST[o.type].kind;
      if (k === 'slow' && inEllipse(b, o)) m *= 3;
      else if ((k === 'ice' || (k === 'sprinkler' && o.on)) && inEllipse(b, o)) m *= 0.28;
    }
    return m;
  }

  function integrate(b, dt) {
    if (b.frozen) { b.vx = 0; b.vy = 0; return; }
    let sp = Math.hypot(b.vx, b.vy);
    if (sp === 0) return;
    if (sp > FORCE_MIN_SPEED) {
      if (b.isBall && S.wind) { b.vx += S.wind.ax * dt; b.vy += S.wind.ay * dt; }
      for (const o of S.obstacles) {
        if (o.type === 'pendenza' && inRect(b, o)) { b.vx += o.ax * dt; b.vy += o.ay * dt; }
      }
      if (b.spin) {
        const a = b.spin * SPIN_RATE * dt, c = Math.cos(a), s = Math.sin(a);
        const vx = b.vx * c - b.vy * s;
        b.vy = b.vx * s + b.vy * c; b.vx = vx;
      }
      sp = Math.hypot(b.vx, b.vy);
    }
    const ns = Math.max(0, sp - (b.c + b.k * sp) * zoneMult(b) * dt);
    const f = ns / sp;
    b.vx *= f; b.vy *= f;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.isBall) b.rot += (ns * dt) / b.r;
  }

  // La palla in dribbling segue la pedina, davanti a lei.
  function follow(Wd) {
    const bl = Wd.ball, d = Wd.bodies[bl.attached];
    const sp = Math.hypot(d.vx, d.vy);
    if (sp > 20) { bl.ax = d.vx / sp; bl.ay = d.vy / sp; }
    bl.x = d.x + bl.ax * (d.r + bl.r + 0.5);
    bl.y = d.y + bl.ay * (d.r + bl.r + 0.5);
    bl.vx = d.vx; bl.vy = d.vy;
    if (sp < 25 && !Wd.hold) bl.attached = -1;
  }
  const involvesDribble = (Wd, b) => Wd.ball.attached >= 0 && (b === Wd.ball || b.i === Wd.ball.attached);

  function collide(Wd, a, b) {
    const bl = Wd.ball;
    if (bl.attached >= 0) {
      const owner = Wd.bodies[bl.attached];
      if ((a === bl && b === owner) || (b === bl && a === owner)) return;
    }
    const dx = b.x - a.x, dy = b.y - a.y;
    const rr = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 === 0) return;
    const ia = a.frozen ? 0 : 1 / a.m, ib = b.frozen ? 0 : 1 / b.m;
    if (ia + ib === 0) return;
    const disc = a.isBall ? b : b.isBall ? a : null;
    if (disc && Wd.dribble && disc.i === Wd.shooter && bl.attached < 0) {
      bl.attached = disc.i;
      const sp = Math.hypot(disc.vx, disc.vy) || 1;
      bl.ax = disc.vx / sp; bl.ay = disc.vy / sp;
      if (!Wd.sim) { onBallTouch(disc); Sfx.hit(400); }
      return;
    }
    if (involvesDribble(Wd, a) || involvesDribble(Wd, b)) bl.attached = -1;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
    const corr = (rr - d) / (ia + ib);
    a.x -= nx * corr * ia; a.y -= ny * corr * ia;
    b.x += nx * corr * ib; b.y += ny * corr * ib;
    const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rv > 0) return;
    const j = (-(1 + E_BODY) * rv) / (ia + ib);
    a.vx -= j * nx * ia; a.vy -= j * ny * ia;
    b.vx += j * nx * ib; b.vy += j * ny * ib;
    if (a.isBall || b.isBall) bl.spin = 0;
    // Tiro a giro: al primo contatto tra la pedina tirata e la palla si sceglie la curva.
    if (disc && Wd.giro && disc.i === Wd.shooter) { Wd.giro = false; if (!Wd.sim) S.curveReq = true; }
    if (!Wd.sim) onImpact(a, b, -rv);
  }

  function collideStatic(Wd, b, c, breakable) {
    const dx = b.x - c.x, dy = b.y - c.y;
    const rr = b.r + c.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 === 0) return;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
    b.x = c.x + nx * rr; b.y = c.y + ny * rr;
    const vn = b.vx * nx + b.vy * ny;
    if (involvesDribble(Wd, b)) Wd.ball.attached = -1;
    b.spin = 0;
    if (vn < 0) {
      b.vx -= (1 + E_WALL) * vn * nx; b.vy -= (1 + E_WALL) * vn * ny;
      if (!Wd.sim) {
        if (breakable && c.o) { if (-vn > 60) hitObstacle(c.o); Sfx.hit(-vn); }
        else Sfx.post(-vn);
      }
    }
  }

  function collideInvader(b, v) {
    const dx = b.x - v.x, dy = b.y - v.y;
    const rr = b.r + v.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 === 0) return;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
    b.x = v.x + nx * rr; b.y = v.y + ny * rr;
    const vn = (b.vx - v.vx) * nx + (b.vy - v.vy) * ny;
    if (involvesDribble(LW, b)) ball.attached = -1;
    if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; Sfx.hit(-vn); }
  }

  function bounce(Wd, b, axis, sign, e) {
    const v = axis === 'x' ? 'vx' : 'vy';
    if (b[v] * sign < 0) {
      if (!Wd.sim && Math.abs(b[v]) > 120) Sfx.hit(Math.abs(b[v]) * 0.4);
      b[v] = -b[v] * e;
      b.spin = 0;
      if (involvesDribble(Wd, b)) Wd.ball.attached = -1;
    }
  }

  function walls(Wd, b) {
    const r = b.r;
    if (b.x - r < F.l) { b.x = F.l + r; bounce(Wd, b, 'x', 1, E_WALL); }
    if (b.x + r > F.r) { b.x = F.r - r; bounce(Wd, b, 'x', -1, E_WALL); }
    const inMouth = b.x > MOUTH.l && b.x < MOUTH.r;
    if (b.y < F.t) {
      if (b.x - r < MOUTH.l) { b.x = MOUTH.l + r; bounce(Wd, b, 'x', 1, E_NET); }
      if (b.x + r > MOUTH.r) { b.x = MOUTH.r - r; bounce(Wd, b, 'x', -1, E_NET); }
      if (b.y - r < F.t - DEPTH) { b.y = F.t - DEPTH + r; bounce(Wd, b, 'y', 1, E_NET); }
    } else if (b.y - r < F.t && !inMouth) {
      b.y = F.t + r; bounce(Wd, b, 'y', 1, E_WALL);
    }
    if (b.y > F.b) {
      if (b.x - r < MOUTH.l) { b.x = MOUTH.l + r; bounce(Wd, b, 'x', 1, E_NET); }
      if (b.x + r > MOUTH.r) { b.x = MOUTH.r - r; bounce(Wd, b, 'x', -1, E_NET); }
      if (b.y + r > F.b + DEPTH) { b.y = F.b + DEPTH - r; bounce(Wd, b, 'y', -1, E_NET); }
    } else if (b.y + r > F.b && !inMouth) {
      b.y = F.b - r; bounce(Wd, b, 'y', -1, E_WALL);
    }
  }

  function keepGoalkeeper(Wd, b) {
    const a = gkArea(b.team), r = b.r;
    if (b.x - r < a.x0) { b.x = a.x0 + r; bounce(Wd, b, 'x', 1, E_WALL); }
    if (b.x + r > a.x1) { b.x = a.x1 - r; bounce(Wd, b, 'x', -1, E_WALL); }
    if (b.y - r < a.y0) { b.y = a.y0 + r; bounce(Wd, b, 'y', 1, E_WALL); }
    if (b.y + r > a.y1) { b.y = a.y1 - r; bounce(Wd, b, 'y', -1, E_WALL); }
  }

  function manholes(Wd, dt) {
    const bl = Wd.ball;
    if (bl.attached >= 0) return;
    if (bl.mh > 0) { bl.mh -= dt; return; }
    for (const o of S.obstacles) {
      if (o.type !== 'tombino') continue;
      for (const [from, to] of [[o.a, o.b], [o.b, o.a]]) {
        if (Math.hypot(bl.x - from.x, bl.y - from.y) < o.r - 3) {
          const sp = Math.hypot(bl.vx, bl.vy);
          const ux = sp > 1 ? bl.vx / sp : 0, uy = sp > 1 ? bl.vy / sp : 1;
          bl.x = to.x + ux * (o.r + bl.r + 2); bl.y = to.y + uy * (o.r + bl.r + 2);
          const out = Math.max(sp * 0.85, 220);
          bl.vx = ux * out; bl.vy = uy * out;
          bl.mh = 0.4;
          if (!Wd.sim) { Sfx.plop(); addFloat(to.x, to.y - 20, '🕳️', '#ffffff'); }
          return;
        }
      }
    }
  }

  function physicsStep(Wd, dt) {
    const list = Wd.bodies, bl = Wd.ball;
    for (const b of list) if (!(b === bl && bl.attached >= 0)) integrate(b, dt);
    if (bl.attached >= 0) follow(Wd);
    if (!Wd.sim && S.invader) { S.invader.x += S.invader.vx * dt; S.invader.walk += dt; }
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) collide(Wd, list[i], list[j]);
    }
    for (const b of list) {
      for (const p of POSTS) collideStatic(Wd, b, p, false);
      for (const s of S.solids) collideStatic(Wd, b, s, true);
      if (!Wd.sim && S.invader) collideInvader(b, S.invader);
      walls(Wd, b);
      if (b.gk && !b.flying && !b.returning) keepGoalkeeper(Wd, b);
    }
    manholes(Wd, dt);
    if (!Wd.sim && S.invader && (S.invader.x < -60 || S.invader.x > W + 60)) S.invader = null;
    if (!Wd.sim && S.phase === 'moving') { checkGoal(); pickTokens(); }
  }

  function onImpact(a, b, strength) {
    Sfx.hit(strength);
    if (a.isBall) onBallTouch(b);
    else if (b.isBall) onBallTouch(a);
  }
  function onBallTouch(disc) {
    S.lastTouch = disc.team;
    if (S.phase === 'moving' && disc.team === S.turn) S.touched = true;
  }

  const allStopped = () => LW.bodies.every((b) => Math.hypot(b.vx, b.vy) < 5) && !S.invader;
  const stopAll = () => LW.bodies.forEach((b) => { b.vx = 0; b.vy = 0; });

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

  // Simula un tiro su una copia del mondo (anteprima laser, effetto, CPU).
  function simOpts(team) {
    const fx = S.fx[team];
    return { dribble: fx.dribble > 0, hold: fx.dribble > 1, heavy: fx.piombo > 0 || fx.piomboTurn };
  }
  function simulateShot(idx, vx, vy, maxT, opts) {
    const list = LW.bodies.map((b) => Object.assign({}, b));
    const Wd = { bodies: list, ball: list[list.length - 1], sim: true, shooter: idx, dribble: opts.dribble, hold: opts.hold };
    const d = list[idx];
    d.vx = vx; d.vy = vy;
    if (opts.heavy) d.m = 3;
    if (Wd.ball.attached >= 0 && Wd.ball.attached !== idx) Wd.ball.attached = -1;
    return runSim(Wd, d, maxT);
  }
  // Prosegue il tiro in corso con un certo effetto sulla palla (anteprima della curva).
  function simulateCurve(spin, maxT) {
    const list = LW.bodies.map((b) => Object.assign({}, b));
    const Wd = { bodies: list, ball: list[list.length - 1], sim: true, shooter: LW.shooter, dribble: false, hold: false };
    Wd.ball.spin = spin;
    return runSim(Wd, list[LW.shooter], maxT);
  }
  function runSim(Wd, d, maxT) {
    const list = Wd.bodies;
    const dp = [{ x: d.x, y: d.y }], bp = [{ x: Wd.ball.x, y: Wd.ball.y }];
    const b0 = { x: Wd.ball.x, y: Wd.ball.y };
    let goal = -1;
    for (let t = 0; t < maxT; t += SIM_STEP) {
      physicsStep(Wd, SIM_STEP);
      dp.push({ x: d.x, y: d.y });
      if (Wd.ball.x !== bp[bp.length - 1].x || Wd.ball.y !== bp[bp.length - 1].y) bp.push({ x: Wd.ball.x, y: Wd.ball.y });
      if (Wd.ball.y + BALL_R < F.t) { goal = 0; break; }
      if (Wd.ball.y - BALL_R > F.b) { goal = 1; break; }
      if (list.every((b) => Math.hypot(b.vx, b.vy) < 5)) break;
    }
    const moved = Math.hypot(Wd.ball.x - b0.x, Wd.ball.y - b0.y) > 4;
    return { dp, bp, goal, ball: Wd.ball, moved };
  }

  // =====================================================================
  // Ostacoli
  // =====================================================================
  function rebuildSolids() {
    S.solids = [];
    S.wind = null;
    for (const o of S.obstacles) {
      const k = OBST[o.type].kind;
      if (k === 'post') S.solids.push({ x: o.x, y: o.y, r: o.r, o });
      else if (k === 'barrier') barrierPoints(o).forEach((p) => S.solids.push({ x: p.x, y: p.y, r: 14, o: null }));
      else if (k === 'wind') S.wind = o;
    }
  }
  function barrierPoints(o) {
    const cx = CX + Math.sin(o.phase) * 150;
    return [-1, 0, 1].map((i) => ({ x: cx + i * 32, y: o.y }));
  }

  function hitObstacle(o) {
    o.hits = (o.hits || 0) + 1;
    if (o.hits >= 3) {
      S.obstacles = S.obstacles.filter((x) => x !== o);
      rebuildSolids();
      Sfx.crack();
      burst(o.x, o.y, ['#ffffff', '#cbd5e1', '#94a3b8'], 16);
    }
  }

  function canSpawn(type) {
    const k = OBST[type].kind;
    if (type === 'invasore') return false;
    if (['wind', 'slope', 'manhole', 'barrier', 'sprinkler'].includes(k)) return !S.obstacles.some((o) => o.type === type);
    if (k === 'slow' || k === 'ice') return S.obstacles.filter((o) => ['slow', 'ice'].includes(OBST[o.type].kind)).length < 2;
    if (k === 'post') return S.obstacles.filter((o) => OBST[o.type].kind === 'post').length < 4;
    return true;
  }

  const clearOf = (x, y, r) =>
    LW.bodies.every((b) => Math.hypot(b.x - x, b.y - y) > b.r + r + 10) &&
    S.solids.every((s) => Math.hypot(s.x - x, s.y - y) > s.r + r + 40) &&
    S.tokens.every((t) => Math.hypot(t.x - x, t.y - y) > TOKEN_R + r + 10);
  const zoneClear = (x, y, dist) => S.obstacles.every((o) => {
    const k = OBST[o.type].kind;
    if (!['slow', 'ice', 'sprinkler', 'slope'].includes(k)) return true;
    return Math.hypot(o.x - x, o.y - y) > dist;
  });

  function tryPlace(type) {
    const k = OBST[type].kind;
    const life = 7 + Math.floor(Math.random() * 4);
    const shape = Array.from({ length: 10 }, () => rand(0.86, 1.1));
    if (k === 'slow' || k === 'ice' || k === 'sprinkler') {
      const x = rand(F.l + 110, F.r - 110), y = rand(270, 730);
      if (!zoneClear(x, y, 170)) return null;
      const big = k === 'sprinkler';
      return { type, x, y, rx: big ? 90 : rand(60, 85), ry: big ? 72 : rand(44, 64), shape, life, on: false, timer: 0 };
    }
    if (k === 'post') {
      const r = OBST[type].r;
      const x = rand(F.l + 50, F.r - 50), y = rand(250, 750);
      if (!clearOf(x, y, r)) return null;
      return { type, x, y, r, hits: 0, life: life + 4, seed: Math.random() * 1000 };
    }
    if (k === 'barrier') {
      const y = Math.random() < 0.5 ? F.t + AREA_H + 50 : F.b - AREA_H - 50;
      return { type, y, phase: rand(0, TAU), life };
    }
    if (k === 'wind') {
      const o = { type, life };
      rerollWind(o);
      return o;
    }
    if (k === 'slope') {
      const w = rand(150, 190), h = rand(110, 140);
      const x = rand(F.l + 60 + w / 2, F.r - 60 - w / 2), y = rand(300, 700);
      if (!zoneClear(x, y, 190)) return null;
      const ang = Math.floor(Math.random() * 8) * (TAU / 8);
      return { type, x, y, w, h, ang, ax: Math.cos(ang) * 200, ay: Math.sin(ang) * 200, life };
    }
    if (k === 'manhole') {
      const a = { x: rand(F.l + 60, CX - 60), y: rand(260, 740) };
      const b = { x: rand(CX + 60, F.r - 60), y: rand(260, 740) };
      if (Math.hypot(a.x - b.x, a.y - b.y) < 280) return null;
      if (!clearOf(a.x, a.y, 15) || !clearOf(b.x, b.y, 15)) return null;
      return { type, a, b, r: 15, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, life: life + 2 };
    }
    return null;
  }

  function rerollWind(o) {
    o.ang = rand(0, TAU);
    o.str = rand(45, 110);
    o.ax = Math.cos(o.ang) * o.str; o.ay = Math.sin(o.ang) * o.str;
  }

  function spawnObstacle() {
    const options = FIELD.obstacles.filter(canSpawn);
    if (!options.length) return;
    const type = pickOne(options);
    for (let i = 0; i < 40; i++) {
      const o = tryPlace(type);
      if (o) {
        S.obstacles.push(o);
        if (OBST[type].kind === 'post' && canSpawn(type)) {
          rebuildSolids();
          for (let j = 0; j < 30; j++) { const o2 = tryPlace(type); if (o2) { S.obstacles.push(o2); break; } }
        }
        rebuildSolids();
        separateBodies();
        return;
      }
    }
  }

  // Dopo che un ostacolo compare o si sposta, nessuna pedina deve restarci incastrata.
  function separateBodies() {
    for (let it = 0; it < 6; it++) {
      for (const b of LW.bodies) {
        for (const s of S.solids) {
          const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy) || 1, rr = b.r + s.r + 1;
          if (d < rr) {
            const nx = dx / d, ny = dy / d;
            b.x = clamp(s.x + nx * rr, F.l + b.r, F.r - b.r);
            b.y = clamp(s.y + ny * rr, F.t + b.r, F.b - b.r);
          }
        }
      }
    }
  }

  // Eventi a ogni cambio di turno: le cose in campo si muovono, nascono e scadono.
  function turnEvents() {
    if (!powers()) return;
    for (const o of S.obstacles) {
      o.life--;
      if (o.type === 'sagome') o.phase += 1.15;
      if (o.type === 'vento') rerollWind(o);
      if (o.type === 'irrigatore') { o.timer++; o.on = o.timer % 4 === 1 || o.timer % 4 === 2; }
    }
    S.obstacles = S.obstacles.filter((o) => o.life > 0);
    rebuildSolids();
    if (S.obstacles.length < 4 && Math.random() < 0.4) spawnObstacle();
    rebuildSolids();
    separateBodies();
  }

  function maybeInvader() {
    if (!powers() || S.invader || S.shotCount < 3 || !FIELD.obstacles.includes('invasore')) return;
    if (Math.random() > 0.07) return;
    const left = Math.random() < 0.5;
    S.invader = {
      x: left ? -40 : W + 40, y: rand(280, 720), vx: (left ? 1 : -1) * rand(200, 260),
      r: FIELD.invader === 'cane' ? 16 : 18, kind: FIELD.invader, walk: 0,
      color: pickOne(['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7']),
    };
    Sfx.crowd();
  }

  // =====================================================================
  // Oggetti in campo e inventario
  // =====================================================================
  function randomItem() {
    const tot = ITEM_IDS.reduce((s, id) => s + ITEMS[id].w, 0);
    let r = Math.random() * tot;
    for (const id of ITEM_IDS) { r -= ITEMS[id].w; if (r <= 0) return id; }
    return ITEM_IDS[0];
  }

  function spawnToken() {
    for (let i = 0; i < 40; i++) {
      const x = rand(F.l + 50, F.r - 50), y = rand(240, 760);
      if (!clearOf(x, y, TOKEN_R + 14)) continue;
      S.sinceGold++;
      const gold = Math.random() < 1 / 6 || S.sinceGold >= 10;
      if (gold) S.sinceGold = 0;
      S.tokens.push({ id: randomItem(), gold, x, y, life: 8 });
      return;
    }
  }

  function pickTokens() {
    for (const t of S.tokens.slice()) {
      for (const b of LW.bodies) {
        if (Math.hypot(b.x - t.x, b.y - t.y) > TOKEN_R + b.r * 0.6) continue;
        const team = b.isBall ? S.lastTouch : b.team;
        if (team < 0 || S.inv[team].length >= 2) continue;
        S.inv[team].push({ id: t.id, gold: t.gold, age: 0 });
        S.tokens = S.tokens.filter((x) => x !== t);
        addFloat(t.x, t.y - 26, `+${ITEMS[t.id].icon} ${ITEMS[t.id].name}`, TEAMS[team].ui);
        burst(t.x, t.y, t.gold ? ['#fbbf24', '#fde68a', '#ffffff'] : ['#ffffff', TEAMS[team].ui], 14);
        Sfx.pickup(t.gold);
        renderStrips();
        break;
      }
    }
  }

  function tickTokens() {
    if (!powers()) return;
    for (const t of S.tokens) t.life--;
    S.tokens = S.tokens.filter((t) => t.life > 0);
    if (S.tokens.length < 2 && Math.random() < 0.45) spawnToken();
  }

  function canUse(team, it) {
    if (it.id === 'var') return varAvailable(team, it.gold);
    if (S.turn !== team || S.phase !== 'aim' || S.aim) return false;
    const fx = S.fx[team];
    switch (it.id) {
      case 'giro': return !fx.giro;
      case 'laser': return fx.laser === 0;
      case 'piombo': return !(fx.piombo || fx.piomboTurn);
      case 'dribbling': return fx.dribble === 0;
      case 'volante': return fx.volante === 0;
      case 'giallo': return discs.some((d) => d.team !== team && !d.frozen);
      default: return true;
    }
  }

  function varAvailable(team, gold) {
    const L = S.lastShot;
    if (!L || L.team === team) return false;
    if (!['aim', 'cpu', 'goal', 'card'].includes(S.phase)) return false;
    return !L.scored || gold;
  }

  function applyItem(team, it, targets) {
    const fx = S.fx[team];
    switch (it.id) {
      case 'fiato': S.maxShots += it.gold ? 2 : 1; break;
      case 'piombo': if (it.gold) fx.piomboTurn = true; else fx.piombo = 1; break;
      case 'giro': fx.giro = true; fx.giroGold = it.gold; break;
      case 'laser': fx.laser = it.gold ? 2 : 1; fx.laserGold = it.gold; break;
      case 'dribbling': fx.dribble = it.gold ? 2 : 1; break;
      case 'volante': {
        fx.volante = it.gold ? 2 : 1;
        const gk = discs.find((d) => d.gk && d.team === team);
        gk.flying = true; gk.returning = false;
        break;
      }
      case 'giallo':
        for (const d of targets) { S.cards.push({ i: d.i, owner: d.team, started: false }); d.frozen = true; d.vx = 0; d.vy = 0; }
        Sfx.whistle();
        break;
      case 'var': doVar(team, it.gold); return;
    }
    Sfx.use();
    updateStatus();
  }

  function takeSnap() {
    return {
      bodies: LW.bodies.map((b) => Object.assign({}, b)),
      score: S.score.slice(),
      tokens: S.tokens.map((t) => Object.assign({}, t)),
      obstacles: S.obstacles.map((o) => Object.assign({}, o)),
      lastTouch: S.lastTouch,
    };
  }

  function doVar(team, gold) {
    const L = S.lastShot, sn = L.snap;
    const wasGoal = L.scored;
    setBodies(sn.bodies.map((b) => Object.assign({}, b, { vx: 0, vy: 0, spin: 0 })));
    S.score = sn.score.slice();
    S.tokens = sn.tokens;
    S.obstacles = sn.obstacles;
    S.lastTouch = sn.lastTouch;
    S.invader = null; S.cpu = null; S.aim = null; S.curve = null; S.cardPick = null;
    S.lastShot = null;
    LW.hold = false; LW.dribble = false;
    rebuildSolids();
    if (S.turn !== team) { endTurnCleanup(S.turn); S.turn = team; S.turnCount++; }
    applyStatus();
    updateHud();
    Sfx.var();
    showBanner(wasGoal ? 'VAR: gol annullato' : 'VAR: tiro annullato', '#111827', 1500);
    startTurn(true, true);
  }

  // =====================================================================
  // Flusso di gioco
  // =====================================================================
  function startMatch(cfg) {
    M = cfg;
    FIELD_ID = M.field; FIELD = FIELDS[M.field]; BALL = BALLS[M.ball];
    TEAMS = buildTeams(M.teams[0], M.teams[1]);
    Object.assign(S, {
      score: [0, 0], inv: [[], []], fx: [newFx(), newFx()], tokens: [], obstacles: [], solids: [], wind: null,
      invader: null, cards: [], lastShot: null, floats: [], shotCount: 0, turnCount: 0, sinceGold: 0, lastTouch: -1,
      paused: false, aim: null, curve: null, curveReq: false, cardPick: null, cpu: null,
    });
    particles = [];
    S.turn = Math.random() < 0.5 ? 0 : 1;
    setupPositions(S.turn);
    if (powers()) { spawnObstacle(); spawnObstacle(); spawnToken(); }
    rebuildSolids();
    hideOverlays();
    updateHud();
    S.phase = 'aim';
    renderStrips();
    resize();
    Sfx.whistle();
    startTurn(true);
  }

  function startTurn(newTeam, quiet) {
    S.aim = null; S.curve = null; S.cardPick = null;
    S.touched = false;
    if (newTeam) {
      S.shot = 1; S.maxShots = BASE_SHOTS;
      for (const c of S.cards) if (c.owner === S.turn) c.started = true;
    }
    if (isCpu(S.turn)) {
      S.phase = 'cpu';
      S.cpu = { stage: 'items', t: newTeam ? 650 : 300 };
      if (newTeam) S.inv[S.turn].forEach((it) => { it.age++; });
    } else {
      S.phase = 'aim';
    }
    if (newTeam && !quiet) showBanner(turnLabel(S.turn), TEAMS[S.turn].shirt, 900, false, TEAMS[S.turn].text);
    updateStatus();
  }

  function turnLabel(team) {
    if (M.mode !== '2p') return team === 0 ? 'Tocca a te' : 'Tocca alla CPU';
    return `Turno ${TEAMS[team].name}`;
  }

  function shoot(disc, vx, vy) {
    const team = S.turn, fx = S.fx[team];
    S.lastShot = { team, snap: takeSnap(), scored: false };
    if (ball.attached >= 0 && ball.attached !== disc.i) ball.attached = -1;
    disc.m = fx.piombo > 0 || fx.piomboTurn ? 3 : 1;
    disc.heavy = disc.m > 1;
    fx.piombo = 0;
    LW.giro = fx.giro;
    LW.giroGold = fx.giro && fx.giroGold;
    fx.giro = false;
    S.curveReq = false;
    if (fx.laser > 0) fx.laser--;
    if (fx.dribble > 0) { LW.dribble = true; fx.dribble--; LW.hold = fx.dribble > 0; }
    else { LW.dribble = false; LW.hold = false; }
    LW.shooter = disc.i;
    disc.vx = vx; disc.vy = vy;
    S.shooterDisc = disc;
    S.phase = 'moving';
    S.moveTime = 0;
    S.touched = ball.attached === disc.i;
    S.aim = null;
    maybeInvader();
    Sfx.flick(Math.hypot(vx, vy) / MAX_SPEED);
    updateStatus();
  }

  function endShot() {
    const d = S.shooterDisc;
    if (d) { d.m = 1; d.heavy = false; }
    ball.spin = 0;
    LW.giro = false;
    if (ball.attached >= 0 && !LW.hold) ball.attached = -1;
    LW.dribble = false;
    S.shotCount++;
    tickTokens();
    if (S.touched && S.shot < S.maxShots) {
      S.shot++;
      startTurn(false);
    } else {
      switchTurn();
    }
  }

  function endTurnCleanup(team) {
    const fx = S.fx[team];
    fx.piomboTurn = false;
    if (ball.attached >= 0) ball.attached = -1;
    LW.hold = false;
    if (fx.volante > 0) {
      fx.volante--;
      if (fx.volante === 0) {
        const gk = discs.find((d) => d.gk && d.team === team);
        gk.flying = false;
        gk.returning = !insideArea(gk);
      }
    }
    const before = S.cards.length;
    S.cards = S.cards.filter((c) => !(c.owner === team && c.started));
    if (S.cards.length !== before) for (const dd of discs) dd.frozen = S.cards.some((c) => c.i === dd.i);
  }

  function switchTurn() {
    endTurnCleanup(S.turn);
    S.turn = 1 - S.turn;
    S.turnCount++;
    turnEvents();
    startTurn(true);
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
    if (S.lastShot) S.lastShot.scored = true;
    updateHud();
    updateStatus();
    showBanner('GOL!', TEAMS[team].shirt, 1700, true, TEAMS[team].text);
    Sfx.goal();
    try { if (navigator.vibrate) navigator.vibrate([90, 60, 180]); } catch (e) { /* ignorato */ }
    confetti(team);
  }

  function afterGoal() {
    if (S.score[S.scorer] >= M.target) return gameOver();
    endTurnCleanup(S.turn);
    S.turn = 1 - S.scorer;
    S.turnCount++;
    S.invader = null;
    setupPositions(S.turn);
    turnEvents();
    Sfx.whistle();
    startTurn(true);
  }

  function gameOver() {
    S.phase = 'over';
    const w = S.score[0] > S.score[1] ? 0 : 1;
    let title = `Vince ${TEAMS[w].name}!`;
    if (M.mode !== '2p') title = w === 0 ? 'Hai vinto!' : 'Ha vinto la CPU';
    $('overScore').textContent = `${S.score[0]} – ${S.score[1]}`;
    if (M.mode === 'tour') {
      recordTour(S.score[0], S.score[1]);
      if (w === 0) title = T.champion === T.team ? 'Campioni del mondo!' : ['Quarti superati!', 'Semifinale vinta!'][M.round] || 'Vittoria!';
      else title = 'Eliminati';
      $('againBtn').textContent = 'Vai al tabellone';
    } else {
      $('againBtn').textContent = 'Rivincita';
    }
    $('overTitle').textContent = title;
    $('overTitle').style.color = TEAMS[w].ui;
    Sfx.whistle(true);
    show('over');
    updateStatus();
  }

  // Tiro a giro: il tiro si ferma all'impatto con la palla e si sceglie la curva.
  const curveMax = () => (LW.giroGold ? 2 : 1);
  function enterCurve() {
    S.phase = 'curve';
    S.curve = { value: 0, id: null, x0: 0, cpu: isCpu(S.turn), t: 900 };
    if (S.curve.cpu) S.curve.value = cpuCurve(S.turn);
    Sfx.use();
    updateStatus();
  }
  function resumeCurve() {
    ball.spin = S.curve.value * curveMax();
    S.curve = null;
    S.phase = 'moving';
    updateStatus();
  }
  function cpuCurve(team) {
    const lvl = skillFrom(M.skillD);
    let best = 0, bestSc = -Infinity;
    for (const v of [-1, -0.6, -0.3, 0, 0.3, 0.6, 1]) {
      const sc = evalOutcome(simulateCurve(v * curveMax(), 4), team);
      if (sc > bestSc) { bestSc = sc; best = v; }
    }
    return clamp(best + (Math.random() * 2 - 1) * lvl.err * 3, -1, 1);
  }

  function update(dt) {
    if (S.phase === 'moving') {
      S.moveTime += dt;
      if (allStopped() || S.moveTime > 14) { stopAll(); S.invader = null; endShot(); }
    } else if (S.phase === 'goal') {
      S.goalTimer -= dt;
      if (S.goalTimer <= 0) afterGoal();
    } else if (S.phase === 'cpu' && S.cpu) {
      S.cpu.t -= dt * 1000;
      if (S.cpu.t <= 0) cpuStep();
    } else if (S.phase === 'curve' && S.curve.cpu) {
      S.curve.t -= dt * 1000;
      if (S.curve.t <= 0) resumeCurve();
    }
    // Portieri che rientrano in area dopo il volo
    for (const d of discs) {
      if (!d.returning) continue;
      const a = gkArea(d.team);
      const tx = clamp(d.x, a.x0 + d.r, a.x1 - d.r), ty = clamp(d.y, a.y0 + d.r, a.y1 - d.r);
      const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy);
      if (dist < 2) { d.x = tx; d.y = ty; d.returning = false; continue; }
      const stepLen = Math.min(dist, 420 * dt);
      d.x += (dx / dist) * stepLen; d.y += (dy / dist) * stepLen;
    }
    for (const p of particles) {
      p.vy += 300 * dt; p.vx *= 0.99;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt; p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const f of S.floats) { f.y -= 30 * dt; f.life -= dt; }
    S.floats = S.floats.filter((f) => f.life > 0);
  }

  // =====================================================================
  // CPU
  // =====================================================================
  function skillFrom(d) {
    d = clamp(d, 0, 2.8);
    if (d >= 2) return { err: Math.max(0.012, 0.028 - (d - 2) * 0.02), pow: Math.max(0.03, 0.05 - (d - 2) * 0.025), think: 650 };
    const errs = [0.13, 0.065, 0.028], pows = [0.18, 0.1, 0.05], thinks = [950, 800, 650];
    const i = Math.floor(d), f = d - i;
    const L = (a) => a[i] + (a[i + 1] - a[i]) * f;
    return { err: L(errs), pow: L(pows), think: L(thinks) };
  }

  function cpuStep() {
    const team = S.turn;
    if (S.cpu.stage === 'items') {
      const r = cpuUseItems(team);
      if (r.var) { doVar(team, r.var.gold); return; }
      if (r.used.length) {
        showBanner('CPU: ' + r.used.map((it) => `${ITEMS[it.id].icon} ${ITEMS[it.id].name}`).join(', '), TEAMS[team].shirt, 1400, false, TEAMS[team].text);
      }
      S.cpu = { stage: 'plan', t: r.used.length ? 900 : 0 };
    } else if (S.cpu.stage === 'plan') {
      S.cpu = cpuPlan(team);
    } else {
      const c = S.cpu;
      S.cpu = null;
      shoot(c.disc, c.vx, c.vy);
    }
  }

  function cpuWants(team, it) {
    const fx = S.fx[team];
    const own = team === 0 ? F.b : F.t, opp = team === 0 ? F.t : F.b;
    const dOwn = Math.hypot(ball.x - CX, ball.y - own), dOpp = Math.hypot(ball.x - CX, ball.y - opp);
    const late = it.age >= 3;
    switch (it.id) {
      case 'var': {
        if (!varAvailable(team, it.gold)) return false;
        const L = S.lastShot;
        if (L.scored) return true;
        const sb = L.snap.bodies[L.snap.bodies.length - 1];
        const before = Math.hypot(sb.x - CX, sb.y - own);
        return before - dOwn > 120 || dOwn < 260 || late;
      }
      case 'fiato': return true;
      case 'laser': return fx.laser === 0;
      case 'piombo': return fx.piombo === 0 && !fx.piomboTurn;
      case 'giro': return !fx.giro;
      case 'dribbling': return fx.dribble === 0 && (dOpp > 260 || late);
      case 'volante': return fx.volante === 0 && (dOwn < 420 || late);
      case 'giallo': return discs.some((d) => d.team !== team && !d.frozen);
      default: return false;
    }
  }

  function cpuUseItems(team) {
    const inv = S.inv[team], used = [];
    for (let k = inv.length - 1; k >= 0; k--) {
      const it = inv[k];
      if (!cpuWants(team, it)) continue;
      inv.splice(k, 1);
      if (it.id === 'var') return { var: it, used };
      let targets = null;
      if (it.id === 'giallo') {
        targets = discs.filter((d) => d.team !== team && !d.frozen)
          .sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y))
          .slice(0, it.gold ? 2 : 1);
      }
      applyItem(team, it, targets);
      used.push(it);
    }
    renderStrips();
    return { used };
  }

  function pathBlocked(from, to, ignore) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len2 = dx * dx + dy * dy || 1;
    const blockers = discs.filter((o) => o !== ignore).concat(S.solids);
    for (const o of blockers) {
      const t = clamp(((o.x - from.x) * dx + (o.y - from.y) * dy) / len2, 0, 1);
      const px = from.x + dx * t, py = from.y + dy * t;
      if (Math.hypot(o.x - px, o.y - py) < o.r + DISC_R - 3) return true;
    }
    return false;
  }

  function cpuCandidates(team) {
    const attackY = team === 0 ? F.t - 20 : F.b + 20;
    const forward = team === 0 ? -1 : 1;
    const ballToGoal = Math.hypot(CX - ball.x, attackY - ball.y);
    const out = [];
    for (const d of discs) {
      if (d.team !== team || d.frozen) continue;
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
        const blocked = pathBlocked(d, ghost, d);
        let score = cut * 2 - dist / 500;
        if (blocked) score -= 2;
        if (tgt.type === 'goal') score += ballToGoal < 480 ? 0.9 : -0.4;
        if (d.gk && !d.flying) score -= 0.4;
        out.push({ d, dir, dist, cut, tgt, gl, score, blocked, ghost });
      }
    }
    return out.sort((a, b) => b.score - a.score);
  }

  function shotSpeed(c, heavy, dribble) {
    if (dribble) return speedFor(c.dist + Math.min(c.gl, 520), 0, effFric(DISC_FRICTION));
    const ballDist = c.tgt.type === 'goal' ? c.gl + 60 : 380;
    const ballSpeed = speedFor(ballDist, 0, effFric(BALL_FRICTION));
    const contact = Math.min(MAX_SPEED, ballSpeed / ((heavy ? 1.65 : 1.31) * c.cut));
    return speedFor(c.dist, contact, effFric(DISC_FRICTION));
  }

  function evalOutcome(sim, team) {
    if (sim.goal === team) return 1000;
    if (sim.goal === 1 - team) return -1000;
    const b = sim.ball;
    const oppY = team === 0 ? F.t : F.b, ownY = team === 0 ? F.b : F.t;
    let s = -Math.hypot(b.x - CX, b.y - oppY) * 0.6 + Math.hypot(b.x - CX, b.y - ownY) * 0.3;
    if (!sim.moved) s -= 300;
    return s;
  }

  function cpuPlan(team) {
    const lvl = skillFrom(M.skillD);
    const fx = S.fx[team];
    const heavy = fx.piombo > 0 || fx.piomboTurn;
    const dribble = fx.dribble > 0;
    const cands = cpuCandidates(team);
    const build = (c) => ({ disc: c.d, ang: Math.atan2(c.dir.y, c.dir.x), speed: shotSpeed(c, heavy, dribble) });
    let pick = null;
    if (cands.length && fx.laser > 0) {
      // Con il laser la CPU "vede" l'esito: prova diversi tiri e sceglie il migliore.
      for (const c of cands.slice(0, 6)) {
        const p = build(c);
        const sim = simulateShot(p.disc.i, Math.cos(p.ang) * p.speed, Math.sin(p.ang) * p.speed, 4, simOpts(team));
        const sc = evalOutcome(sim, team);
        if (!pick || sc > pick.sc) pick = Object.assign(p, { sc });
      }
    } else if (cands.length) {
      pick = build(cands[0]);
    } else {
      // Nessun tiro pulito: colpisci la palla con la pedina più vicina che può arrivarci.
      const usable = discs.filter((d) => d.team === team && !d.frozen && (!d.gk || gkCanReach(d, ball)));
      const d = usable.reduce((a, b) => (Math.hypot(b.x - ball.x, b.y - ball.y) < Math.hypot(a.x - ball.x, a.y - ball.y) ? b : a));
      const dl = Math.hypot(ball.x - d.x, ball.y - d.y) || 1;
      pick = { disc: d, ang: Math.atan2(ball.y - d.y, ball.x - d.x), speed: speedFor(dl, 500, effFric(DISC_FRICTION)) };
    }
    const errMul = fx.laser > 0 ? 0.5 : 1;
    const ang = pick.ang + (Math.random() * 2 - 1) * lvl.err * errMul;
    const speed = Math.min(MAX_SPEED, pick.speed * (1 + (Math.random() * 2 - 1) * lvl.pow * errMul));
    return { stage: 'shoot', disc: pick.disc, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, t: lvl.think, total: lvl.think };
  }

  // =====================================================================
  // Input touch / mouse
  // =====================================================================
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: VIEW.x + ((e.clientX - r.left) / r.width) * VIEW.w, y: VIEW.y + ((e.clientY - r.top) / r.height) * VIEW.h };
  }

  function aimVector(aim) {
    let dx = aim.disc.x - aim.x, dy = aim.disc.y - aim.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;
    const power = Math.min(len, MAX_DRAG) / MAX_DRAG;
    dx /= len; dy /= len;
    return { dx, dy, len, power, speed: power * MAX_SPEED };
  }

  function nearestDisc(p, filter) {
    let pick = null, bestD = PICK_RADIUS;
    for (const d of discs) {
      if (!filter(d)) continue;
      const dd = Math.hypot(d.x - p.x, d.y - p.y);
      if (dd < bestD) { bestD = dd; pick = d; }
    }
    return pick;
  }

  canvas.addEventListener('pointerdown', (e) => {
    Sfx.unlock();
    if (S.paused) return;
    const p = toLogical(e);
    if (S.phase === 'card' && S.cardPick) {
      const cp = S.cardPick;
      const d = nearestDisc(p, (x) => x.team !== cp.team && !x.frozen && !cp.picked.includes(x));
      if (!d) return;
      cp.picked.push(d);
      if (cp.picked.length >= cp.need || !discs.some((x) => x.team !== cp.team && !x.frozen && !cp.picked.includes(x))) {
        const it = S.inv[cp.team].splice(cp.idx, 1)[0];
        S.cardPick = null;
        S.phase = 'aim';
        applyItem(cp.team, it, cp.picked);
        showBanner(cp.picked.length > 1 ? 'Due ammoniti!' : 'Ammonito!', '#facc15', 900, false, '#111111');
      }
      updateStatus();
      return;
    }
    if (S.phase === 'curve' && !S.curve.cpu && S.curve.id == null) {
      S.curve.id = e.pointerId; S.curve.x0 = p.x;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignorato */ }
      return;
    }
    if (S.phase !== 'aim' || isCpu(S.turn) || S.aim) return;
    const pick = nearestDisc(p, (d) => d.team === S.turn && !d.frozen);
    if (!pick) return;
    S.aim = { disc: pick, x: p.x, y: p.y, id: e.pointerId };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignorato */ }
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (err) { /* ignorato */ }
    renderStrips();
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = toLogical(e);
    if (S.curve && e.pointerId === S.curve.id) { S.curve.value = clamp((p.x - S.curve.x0) / 110, -1, 1); return; }
    if (!S.aim || e.pointerId !== S.aim.id) return;
    S.aim.x = p.x; S.aim.y = p.y;
    e.preventDefault();
  });

  function release(e, cancel) {
    if (S.curve && e.pointerId === S.curve.id) {
      if (cancel) { S.curve.id = null; return; }
      resumeCurve();
      return;
    }
    if (!S.aim || e.pointerId !== S.aim.id) return;
    const aim = S.aim;
    S.aim = null;
    renderStrips();
    if (cancel || S.phase !== 'aim') return;
    const v = aimVector(aim);
    if (!v || v.len < 16) return; // trascinamento troppo corto: annulla
    shoot(aim.disc, v.dx * v.speed, v.dy * v.speed);
  }
  canvas.addEventListener('pointerup', (e) => release(e, false));
  canvas.addEventListener('pointercancel', (e) => release(e, true));
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  function onSlot(team, k) {
    Sfx.unlock();
    if (S.paused || isCpu(team)) return;
    const it = S.inv[team][k];
    if (!it) return;
    if (S.cardPick && S.cardPick.team === team && S.cardPick.idx === k) {
      S.cardPick = null; S.phase = 'aim'; updateStatus(); return;
    }
    if (!canUse(team, it)) {
      let msg = S.turn === team ? 'Già attivo' : 'Usalo nel tuo turno';
      if (it.id === 'var') msg = S.lastShot && S.lastShot.scored && !it.gold ? 'Solo il VAR d\'oro annulla i gol' : 'Nessun tiro avversario da rivedere';
      showBanner(msg, '#334155', 1100);
      return;
    }
    if (it.id === 'giallo') {
      S.phase = 'card';
      S.cardPick = { team, idx: k, need: it.gold ? 2 : 1, picked: [] };
      updateStatus();
      return;
    }
    S.inv[team].splice(k, 1);
    if (it.id !== 'var') showBanner(`${ITEMS[it.id].icon} ${ITEMS[it.id].name}${it.gold ? ' d\'oro' : ''}`, TEAMS[team].shirt, 900, false, TEAMS[team].text);
    applyItem(team, it);
  }
  ['strip0', 'strip1'].forEach((id) => $(id).addEventListener('click', (e) => {
    const b = e.target.closest('.slot');
    if (!b || b.classList.contains('empty')) return;
    onSlot(Number(b.dataset.team), Number(b.dataset.k));
  }));

  // =====================================================================
  // Rendering: campo
  // =====================================================================
  function resize() {
    document.body.classList.toggle('full', !!settings.full && S.phase !== 'menu');
    document.body.classList.toggle('vs-cpu', !!M && M.mode !== '2p');
    VIEW = document.body.classList.contains('full') ? VIEW_FULL : VIEW_NORMAL;
    $('fullBtn').textContent = settings.full ? '🗗' : '⛶';
    $('fullBtn').setAttribute('aria-label', settings.full ? 'Esci da campo intero' : 'Campo intero');
    const rect = stage.getBoundingClientRect();
    const pad = settings.full ? 0 : 12;
    const availW = Math.max(100, rect.width - pad), availH = Math.max(100, rect.height - pad / 3);
    const scale = Math.min(availW / VIEW.w, availH / VIEW.h);
    const cssW = Math.floor(VIEW.w * scale), cssH = Math.floor(VIEW.h * scale);
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    pitch = document.createElement('canvas');
    pitch.width = canvas.width; pitch.height = canvas.height;
    const pc = pitch.getContext('2d');
    viewTransform(pc);
    drawPitch(pc, FIELD_ID);
  }
  function viewTransform(g) {
    const sx = canvas.width / VIEW.w, sy = canvas.height / VIEW.h;
    g.setTransform(sx, 0, 0, sy, -VIEW.x * sx, -VIEW.y * sy);
  }

  function speckles(g, R, n, x0, y0, w, h, colors, s0, s1, alpha) {
    g.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      g.fillStyle = colors[i % colors.length];
      const s = s0 + R() * (s1 - s0);
      g.fillRect(x0 + R() * w, y0 + R() * h, s, s);
    }
    g.globalAlpha = 1;
  }

  function drawPitch(g, id) {
    const R = rng(11);
    const fw = F.r - F.l, fh = F.b - F.t;
    // Fuori campo
    const outside = { erba: '#17602a', allenamento: '#1f5e2c', terra: '#6e4a2a', indoor: '#d4622c', street: '#7c8189', neve: '#c7d4e4' }[id];
    g.fillStyle = outside;
    g.fillRect(0, 0, W, H);
    if (id === 'street') {
      g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    }
    if (id === 'terra') speckles(g, R, 900, 0, 0, W, H, ['#5a3b20', '#7d5531'], 1, 3, 0.6);
    if (id === 'neve') speckles(g, R, 600, 0, 0, W, H, ['#ffffff', '#e2e8f0'], 1, 3, 0.8);
    if (id === 'indoor') { g.fillStyle = '#b84f1f'; g.fillRect(F.l - 14, F.t - 14, fw + 28, fh + 28); }

    // Superficie
    switch (id) {
      case 'erba':
      case 'allenamento': {
        const train = id === 'allenamento';
        const bands = 12, bh = fh / bands;
        for (let i = 0; i < bands; i++) {
          g.fillStyle = train ? (i % 2 ? '#3d944c' : '#46a456') : (i % 2 ? '#2b8a3e' : '#319a45');
          g.fillRect(F.l, F.t + i * bh, fw, bh + 0.5);
        }
        if (train) {
          g.fillStyle = 'rgba(122,86,46,0.38)';
          for (const [x, y, rx, ry] of [[CX, F.t + 60, 95, 40], [CX, F.b - 60, 95, 40], [CX, CY, 70, 55]]) {
            g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
          }
          for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(F.l + 30 + R() * (fw - 60), F.t + 80 + R() * (fh - 160), 10 + R() * 22, 8 + R() * 14, R() * 3, 0, TAU); g.fill(); }
        } else {
          speckles(g, R, 1400, F.l, F.t, fw, fh, ['#2f9443', '#27803a'], 1, 2, 0.5);
        }
        break;
      }
      case 'terra':
        g.fillStyle = '#b9834f'; g.fillRect(F.l, F.t, fw, fh);
        speckles(g, R, 2600, F.l, F.t, fw, fh, ['#a87443', '#c8945f', '#94623a', '#d1a273'], 1, 3, 0.55);
        g.fillStyle = 'rgba(120,80,45,0.35)';
        for (const [x, y, rx, ry] of [[CX, F.t + 55, 110, 45], [CX, F.b - 55, 110, 45], [CX, CY, 90, 60]]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(150,150,150,0.55)';
        for (let i = 0; i < 140; i++) { g.beginPath(); g.ellipse(F.l + R() * fw, F.t + R() * fh, 1.5 + R() * 2.5, 1 + R() * 2, R() * 3, 0, TAU); g.fill(); }
        break;
      case 'indoor': {
        g.fillStyle = '#1f5fc4'; g.fillRect(F.l, F.t, fw, fh);
        const gr = g.createLinearGradient(F.l, F.t, F.r, F.b);
        gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.06)');
        g.fillStyle = gr; g.fillRect(F.l, F.t, fw, fh);
        g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1;
        for (let x = F.l; x < F.r; x += 45) { g.beginPath(); g.moveTo(x, F.t); g.lineTo(x, F.b); g.stroke(); }
        g.fillStyle = 'rgba(15,50,120,0.45)';
        g.fillRect(CX - AREA_W / 2, F.t, AREA_W, AREA_H); g.fillRect(CX - AREA_W / 2, F.b - AREA_H, AREA_W, AREA_H);
        break;
      }
      case 'street':
        g.fillStyle = '#3a3e44'; g.fillRect(F.l, F.t, fw, fh);
        speckles(g, R, 4200, F.l, F.t, fw, fh, ['#4b5058', '#30343a', '#5a5f67', '#26292e'], 1, 2.5, 0.7);
        g.strokeStyle = 'rgba(15,15,18,0.65)'; g.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
          let x = F.l + R() * fw, y = F.t + R() * fh;
          g.beginPath(); g.moveTo(x, y);
          for (let s = 0; s < 6; s++) { x += (R() - 0.5) * 50; y += (R() - 0.5) * 50; g.lineTo(x, y); }
          g.stroke();
        }
        g.fillStyle = 'rgba(10,10,12,0.25)';
        for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(F.l + R() * fw, F.t + R() * fh, 14 + R() * 20, 9 + R() * 12, R() * 3, 0, TAU); g.fill(); }
        break;
      case 'neve':
        g.fillStyle = '#f2f7fd'; g.fillRect(F.l, F.t, fw, fh);
        g.fillStyle = 'rgba(150,175,210,0.12)';
        for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(F.l + R() * fw, F.t + R() * fh, 20 + R() * 60, 12 + R() * 30, R() * 3, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(120,135,160,0.14)';
        for (let i = 0; i < 40; i++) {
          const x = F.l + R() * fw, y = F.t + R() * fh, a = R() * TAU;
          for (let s = 0; s < 4; s++) { g.beginPath(); g.ellipse(x + Math.cos(a) * s * 16 + (s % 2) * 6, y + Math.sin(a) * s * 16, 3, 5, a, 0, TAU); g.fill(); }
        }
        speckles(g, R, 400, F.l, F.t, fw, fh, ['#ffffff'], 1, 2, 0.9);
        break;
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
    g.strokeStyle = FIELDS[id].lines;
    g.fillStyle = FIELDS[id].lines;
    g.lineWidth = 3;
    g.strokeRect(F.l, F.t, fw, fh);
    g.beginPath(); g.moveTo(F.l, CY); g.lineTo(F.r, CY); g.stroke();
    g.beginPath(); g.arc(CX, CY, 80, 0, TAU); g.stroke();
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
    g.fillStyle = '#ffffff';
    for (const p of POSTS) dot(g, p.x, p.y, POST_R + 1);
  }

  // =====================================================================
  // Rendering: pedine, palla, oggetti, ostacoli
  // =====================================================================
  function drawDisc(g, d, t) {
    const team = TEAMS[d.team];
    const myTurn = (S.phase === 'aim' && !isCpu(S.turn) && d.team === S.turn && !d.frozen);
    const active = myTurn || (S.aim && S.aim.disc === d) || (S.cpu && S.cpu.disc === d);
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.beginPath(); g.ellipse(d.x + 3, d.y + 5, d.r, d.r * 0.9, 0, 0, TAU); g.fill();
    if (active) {
      const pulse = S.aim && S.aim.disc === d ? 1 : 0.5 + 0.5 * Math.sin(t * 5);
      g.strokeStyle = `rgba(255,255,255,${0.35 + 0.45 * pulse})`;
      g.lineWidth = 3;
      g.beginPath(); g.arc(d.x, d.y, d.r + 5 + pulse * 2, 0, TAU); g.stroke();
    }
    if (S.cardPick && d.team !== S.cardPick.team && !d.frozen) {
      const sel = S.cardPick.picked.includes(d);
      g.strokeStyle = sel ? '#facc15' : `rgba(250,204,21,${0.4 + 0.4 * Math.sin(t * 6)})`;
      g.lineWidth = 4;
      g.beginPath(); g.arc(d.x, d.y, d.r + 6, 0, TAU); g.stroke();
    }
    // Corpo della pedina nel colore della maglia, bordo nel secondo colore
    const grad = g.createRadialGradient(d.x - 6, d.y - 8, 2, d.x, d.y, d.r);
    grad.addColorStop(0, team.shirtLight); grad.addColorStop(1, team.shirtDark);
    g.fillStyle = grad;
    dot(g, d.x, d.y, d.r);
    g.strokeStyle = team.base; g.lineWidth = d.r * 0.2;
    g.beginPath(); g.arc(d.x, d.y, d.r * 0.88, 0, TAU); g.stroke();
    g.strokeStyle = d.heavy ? '#9ca3af' : 'rgba(0,0,0,0.5)'; g.lineWidth = d.heavy ? 4 : 1.5;
    g.beginPath(); g.arc(d.x, d.y, d.r - (d.heavy ? 2 : 0.5), 0, TAU); g.stroke();
    // Giocatore visto dall'alto: spalle e testa
    const facing = d.team === 0 ? -1 : 1;
    g.save();
    g.beginPath(); g.ellipse(d.x, d.y + facing, d.r * 0.58, d.r * 0.3, 0, 0, TAU);
    g.fillStyle = d.gk ? team.gk : team.shirt; g.fill();
    if (!d.gk && team.stripe) {
      g.clip();
      g.fillStyle = team.stripe;
      for (let i = -2; i <= 2; i += 2) g.fillRect(d.x + i * d.r * 0.17 - d.r * 0.08, d.y - d.r, d.r * 0.16, d.r * 2);
    }
    g.restore();
    g.strokeStyle = d.gk ? team.gkDark : mix(team.shirt, '#000000', 0.55); g.lineWidth = 1.8;
    g.beginPath(); g.ellipse(d.x, d.y + facing, d.r * 0.58, d.r * 0.3, 0, 0, TAU); g.stroke();
    g.fillStyle = '#e8b98a';
    dot(g, d.x, d.y + facing * 2, d.r * 0.22);
    g.fillStyle = '#3b2412';
    g.beginPath(); g.arc(d.x, d.y + facing * 2, d.r * 0.22, facing > 0 ? Math.PI : 0, facing > 0 ? TAU : Math.PI); g.fill();
    if (d.flying) {
      g.strokeStyle = 'rgba(103,232,249,0.9)'; g.lineWidth = 2.5; g.setLineDash([5, 5]);
      g.beginPath(); g.arc(d.x, d.y, d.r + 4, t * 2, t * 2 + TAU); g.stroke(); g.setLineDash([]);
    }
    if (d.frozen) {
      g.fillStyle = 'rgba(15,23,42,0.35)'; dot(g, d.x, d.y, d.r);
      g.fillStyle = '#facc15'; g.strokeStyle = '#713f12'; g.lineWidth = 1.5;
      g.save(); g.translate(d.x + d.r * 0.55, d.y - d.r * 0.75); g.rotate(0.25);
      g.fillRect(-6, -8, 12, 16); g.strokeRect(-6, -8, 12, 16);
      g.restore();
    }
  }

  function drawBallSprite(g, x, y, r, rot, def) {
    g.save();
    g.translate(x, y);
    if (def.glow) { g.shadowColor = def.glow; g.shadowBlur = 12; }
    g.fillStyle = def.base;
    dot(g, 0, 0, r);
    g.shadowBlur = 0;
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
    g.rotate(rot);
    switch (def.style) {
      case 'patches':
        g.fillStyle = def.patch;
        dot(g, 0, 0, r * 0.36);
        for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; dot(g, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3); }
        break;
      case 'panels':
        g.strokeStyle = def.patch; g.lineWidth = r * 0.14;
        g.beginPath(); g.arc(-r * 0.95, 0, r * 0.95, -0.95, 0.95); g.stroke();
        g.beginPath(); g.arc(r * 0.95, 0, r * 0.95, Math.PI - 0.95, Math.PI + 0.95); g.stroke();
        g.strokeStyle = '#f5e6c8'; g.lineWidth = r * 0.09;
        for (const yy of [-0.25, 0, 0.25]) { g.beginPath(); g.moveTo(-r * 0.16, yy * r); g.lineTo(r * 0.16, yy * r); g.stroke(); }
        break;
      case 'swirl':
        g.strokeStyle = def.patch; g.lineWidth = r * 0.34;
        g.beginPath(); g.arc(-r * 0.55, -r * 0.55, r * 0.95, 0, 1.6); g.stroke();
        g.beginPath(); g.arc(r * 0.55, r * 0.55, r * 0.95, Math.PI, Math.PI + 1.6); g.stroke();
        break;
      case 'stars': {
        g.fillStyle = def.patch;
        const R = rng(3);
        for (let i = 0; i < 8; i++) dot(g, (R() - 0.5) * r * 1.7, (R() - 0.5) * r * 1.7, r * (0.07 + R() * 0.08));
        g.strokeStyle = 'rgba(240,171,252,0.6)'; g.lineWidth = r * 0.1;
        g.beginPath(); g.ellipse(0, 0, r * 0.8, r * 0.35, 0.5, 0, TAU); g.stroke();
        break;
      }
    }
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  }

  function drawBall(g) {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    dot(g, ball.x + 2, ball.y + 4, ball.r);
    drawBallSprite(g, ball.x, ball.y, ball.r, ball.rot, BALL);
  }

  function drawTokens(g, t) {
    for (const tk of S.tokens) {
      const bob = Math.sin(t * 3 + tk.x) * 2;
      const fade = tk.life <= 2 ? 0.5 + 0.5 * Math.sin(t * 8) : 1;
      g.globalAlpha = fade;
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath(); g.ellipse(tk.x + 2, tk.y + 6, TOKEN_R, TOKEN_R * 0.7, 0, 0, TAU); g.fill();
      g.fillStyle = tk.gold ? '#fff7d6' : 'rgba(255,255,255,0.92)';
      dot(g, tk.x, tk.y + bob, TOKEN_R);
      g.strokeStyle = tk.gold ? '#f59e0b' : 'rgba(15,23,42,0.4)'; g.lineWidth = tk.gold ? 3.5 : 2;
      g.beginPath(); g.arc(tk.x, tk.y + bob, TOKEN_R, 0, TAU); g.stroke();
      g.font = `19px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ITEMS[tk.id].icon, tk.x, tk.y + bob + 1);
      if (tk.gold) {
        g.fillStyle = '#f59e0b'; g.fillRect(tk.x - 13, tk.y + bob + TOKEN_R - 4, 26, 11);
        g.fillStyle = '#1c1a05'; g.font = '900 9px system-ui, sans-serif';
        g.fillText('ORO', tk.x, tk.y + bob + TOKEN_R + 2);
      }
      g.globalAlpha = 1;
    }
  }

  function blobPath(g, o, sc) {
    const n = o.shape.length;
    const pts = o.shape.map((f, i) => {
      const a = (i / n) * TAU;
      return { x: o.x + Math.cos(a) * o.rx * f * sc, y: o.y + Math.sin(a) * o.ry * f * sc };
    });
    g.beginPath();
    const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    let m = mid(pts[n - 1], pts[0]);
    g.moveTo(m.x, m.y);
    for (let i = 0; i < n; i++) { const q = pts[(i + 1) % n]; m = mid(pts[i], q); g.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y); }
    g.closePath();
  }

  function drawObstacles(g, t) {
    for (const o of S.obstacles) {
      g.globalAlpha = o.life <= 1 ? 0.6 + 0.3 * Math.sin(t * 6) : 1;
      switch (o.type) {
        case 'fango':
          g.fillStyle = 'rgba(92,58,28,0.92)'; blobPath(g, o, 1); g.fill();
          g.fillStyle = 'rgba(60,36,16,0.8)'; blobPath(g, o, 0.62); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(o.x - o.rx * 0.3, o.y - o.ry * 0.35, o.rx * 0.25, o.ry * 0.12, -0.3, 0, TAU); g.fill();
          break;
        case 'pozzanghera':
          g.fillStyle = 'rgba(52,70,92,0.9)'; blobPath(g, o, 1); g.fill();
          g.strokeStyle = 'rgba(200,220,240,0.35)'; g.lineWidth = 1.5;
          for (let k = 0; k < 2; k++) { const ph = ((t * 0.6 + k * 0.5) % 1); g.globalAlpha = 1 - ph; g.beginPath(); g.ellipse(o.x, o.y, o.rx * 0.7 * ph, o.ry * 0.7 * ph, 0, 0, TAU); g.stroke(); }
          g.globalAlpha = 1;
          break;
        case 'cumulo':
          g.fillStyle = 'rgba(120,140,170,0.35)'; g.save(); g.translate(5, 7); blobPath(g, o, 1); g.fill(); g.restore();
          g.fillStyle = '#ffffff'; blobPath(g, o, 1); g.fill();
          g.fillStyle = 'rgba(200,215,235,0.7)'; blobPath(g, o, 0.55); g.fill();
          g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(o.x - o.rx * 0.2, o.y - o.ry * 0.25, o.rx * 0.35, o.ry * 0.25, 0, 0, TAU); g.fill();
          break;
        case 'ghiaccio':
          g.fillStyle = 'rgba(190,232,252,0.88)'; blobPath(g, o, 1); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.5;
          for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(o.x - o.rx * 0.5 + k * 18, o.y - o.ry * 0.4); g.lineTo(o.x - o.rx * 0.2 + k * 18, o.y + o.ry * 0.3); g.stroke(); }
          g.strokeStyle = 'rgba(100,160,200,0.5)'; blobPath(g, o, 1); g.stroke();
          break;
        case 'bagnato':
          g.fillStyle = 'rgba(147,197,253,0.42)'; blobPath(g, o, 1); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(o.x - o.rx * 0.5, o.y - o.ry * 0.2); g.lineTo(o.x - o.rx * 0.1, o.y - o.ry * 0.45); g.stroke();
          g.fillStyle = '#facc15'; g.strokeStyle = '#1f2937'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(o.x + o.rx * 0.65, o.y - o.ry * 0.95); g.lineTo(o.x + o.rx * 0.65 - 11, o.y - o.ry * 0.95 + 18); g.lineTo(o.x + o.rx * 0.65 + 11, o.y - o.ry * 0.95 + 18); g.closePath(); g.fill(); g.stroke();
          g.fillStyle = '#1f2937'; g.font = '900 11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('!', o.x + o.rx * 0.65, o.y - o.ry * 0.95 + 11);
          break;
        case 'irrigatore':
          if (o.on) {
            g.fillStyle = 'rgba(96,165,250,0.38)'; blobPath(g, o, 1); g.fill();
            g.fillStyle = 'rgba(219,234,254,0.9)';
            for (let k = 0; k < 14; k++) {
              const a = k * 0.45 + t * 2.2, rr = ((t * 1.3 + k * 0.13) % 1);
              dot(g, o.x + Math.cos(a) * o.rx * rr, o.y + Math.sin(a) * o.ry * rr, 2);
            }
          } else {
            g.strokeStyle = 'rgba(147,197,253,0.35)'; g.setLineDash([4, 6]); g.lineWidth = 1.5;
            blobPath(g, o, 1); g.stroke(); g.setLineDash([]);
          }
          g.fillStyle = '#4b5563'; dot(g, o.x, o.y, 7);
          g.fillStyle = o.on ? '#60a5fa' : '#9ca3af'; dot(g, o.x, o.y, 3.5);
          break;
        case 'cono':
          g.fillStyle = 'rgba(0,0,0,0.3)'; dot(g, o.x + 2, o.y + 4, o.r);
          g.fillStyle = '#f97316'; dot(g, o.x, o.y, o.r);
          g.fillStyle = '#ffffff'; dot(g, o.x, o.y, o.r * 0.62);
          g.fillStyle = '#ea580c'; dot(g, o.x, o.y, o.r * 0.42);
          g.fillStyle = '#7c2d12'; dot(g, o.x, o.y, o.r * 0.16);
          break;
        case 'sasso': {
          const R = rng(Math.floor(o.seed));
          g.fillStyle = 'rgba(0,0,0,0.3)'; dot(g, o.x + 2, o.y + 4, o.r);
          g.fillStyle = '#8b8f94';
          g.beginPath();
          for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU, rr = o.r * (0.8 + R() * 0.3); g[k ? 'lineTo' : 'moveTo'](o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr); }
          g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(o.x - 4, o.y - 4, o.r * 0.4, o.r * 0.25, -0.5, 0, TAU); g.fill();
          break;
        }
        case 'bidone':
          g.fillStyle = 'rgba(0,0,0,0.3)'; dot(g, o.x + 3, o.y + 5, o.r);
          g.fillStyle = '#3f4b3e'; dot(g, o.x, o.y, o.r);
          g.strokeStyle = '#9ca3af'; g.lineWidth = 2.5; g.beginPath(); g.arc(o.x, o.y, o.r - 1.5, 0, TAU); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1.5;
          g.beginPath(); g.arc(o.x, o.y, o.r * 0.6, 0, TAU); g.stroke();
          g.fillStyle = '#9ca3af'; g.fillRect(o.x - 6, o.y - 2, 12, 4);
          break;
        case 'pupazzo':
          g.fillStyle = 'rgba(80,100,140,0.3)'; dot(g, o.x + 3, o.y + 5, o.r);
          g.fillStyle = '#ffffff'; dot(g, o.x, o.y, o.r);
          g.fillStyle = '#eef2f7'; dot(g, o.x, o.y, o.r * 0.62);
          g.strokeStyle = '#cbd5e1'; g.lineWidth = 1; g.beginPath(); g.arc(o.x, o.y, o.r * 0.62, 0, TAU); g.stroke();
          g.fillStyle = '#111827'; dot(g, o.x - 3.5, o.y - 2, 1.6); dot(g, o.x + 3.5, o.y - 2, 1.6);
          g.fillStyle = '#f97316';
          g.beginPath(); g.moveTo(o.x - 2, o.y + 1); g.lineTo(o.x + 2, o.y + 1); g.lineTo(o.x, o.y + 10); g.closePath(); g.fill();
          g.strokeStyle = '#dc2626'; g.lineWidth = 3; g.beginPath(); g.arc(o.x, o.y, o.r * 0.78, 0.3, 1.4); g.stroke();
          break;
        case 'sagome': {
          const pts = barrierPoints(o);
          g.strokeStyle = '#6b7280'; g.lineWidth = 4;
          g.beginPath(); g.moveTo(pts[0].x, pts[0].y); g.lineTo(pts[2].x, pts[2].y); g.stroke();
          for (const p of pts) {
            g.fillStyle = 'rgba(0,0,0,0.3)'; dot(g, p.x + 2, p.y + 4, 14);
            g.fillStyle = '#facc15'; g.beginPath(); g.ellipse(p.x, p.y, 14, 9, 0, 0, TAU); g.fill();
            g.strokeStyle = '#a16207'; g.lineWidth = 1.5; g.stroke();
            g.fillStyle = '#1f2937'; dot(g, p.x, p.y, 5);
          }
          break;
        }
        case 'pendenza': {
          g.save();
          g.translate(o.x, o.y);
          g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
          g.strokeStyle = 'rgba(255,255,255,0.35)'; g.setLineDash([6, 6]); g.lineWidth = 1.5;
          g.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h); g.setLineDash([]);
          g.beginPath(); g.rect(-o.w / 2, -o.h / 2, o.w, o.h); g.clip();
          g.rotate(o.ang);
          g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
          const off = (t * 30) % 40;
          for (let x = -140; x < 140; x += 40) {
            for (let y = -100; y <= 100; y += 50) {
              g.beginPath(); g.moveTo(x + off - 8, y - 10); g.lineTo(x + off + 2, y); g.lineTo(x + off - 8, y + 10); g.stroke();
            }
          }
          g.restore();
          break;
        }
        case 'tombino':
          for (const p of [o.a, o.b]) {
            g.fillStyle = '#6b7280'; dot(g, p.x, p.y, o.r + 3);
            g.fillStyle = '#1f2328'; dot(g, p.x, p.y, o.r);
            g.strokeStyle = '#4b5563'; g.lineWidth = 2;
            for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(p.x + k * 5, p.y - o.r + 3); g.lineTo(p.x + k * 5, p.y + o.r - 3); g.stroke(); }
          }
          break;
      }
      if (o.hits) {
        g.strokeStyle = 'rgba(30,30,30,0.7)'; g.lineWidth = 1.5;
        for (let k = 0; k < o.hits; k++) {
          const a = k * 2.1 + 0.4;
          g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r); g.stroke();
        }
      }
      g.globalAlpha = 1;
    }
  }

  function drawWind(g, t) {
    const w = S.wind;
    if (!w) return;
    // Scie leggere sul campo
    g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const R = rng(i * 13 + 1);
      const ph = (t * w.str / 400 + R()) % 1;
      const x = F.l + R() * (F.r - F.l), y = F.t + R() * (F.b - F.t);
      const px = x + Math.cos(w.ang) * (ph * 200 - 100), py = y + Math.sin(w.ang) * (ph * 200 - 100);
      g.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(w.ang) * 30, py + Math.sin(w.ang) * 30); g.stroke();
    }
    g.globalAlpha = 1;
    // Indicatore
    const x = F.l + 30, y = F.t + 32;
    g.fillStyle = 'rgba(15,23,42,0.6)'; dot(g, x, y, 24);
    g.save(); g.translate(x, y); g.rotate(w.ang);
    const len = 8 + (w.str / 110) * 10;
    g.strokeStyle = '#e0f2fe'; g.fillStyle = '#e0f2fe'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-len, 0); g.lineTo(len - 4, 0); g.stroke();
    g.beginPath(); g.moveTo(len + 4, 0); g.lineTo(len - 6, -7); g.lineTo(len - 6, 7); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = '#e0f2fe'; g.font = '800 9px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('VENTO', x, y + 32);
  }

  function drawInvader(g) {
    const v = S.invader;
    if (!v) return;
    const dir = Math.sign(v.vx);
    const swing = Math.sin(v.walk * 14) * 4;
    g.fillStyle = 'rgba(0,0,0,0.3)'; dot(g, v.x + 3, v.y + 5, v.r);
    if (v.kind === 'cane') {
      g.fillStyle = '#8b5a2b';
      g.beginPath(); g.ellipse(v.x, v.y, v.r * 1.2, v.r * 0.6, 0, 0, TAU); g.fill();
      dot(g, v.x + dir * v.r * 1.2, v.y, v.r * 0.5);
      g.fillStyle = '#5c3a1a'; dot(g, v.x + dir * v.r * 1.3, v.y - 6, 4); dot(g, v.x + dir * v.r * 1.3, v.y + 6, 4);
      g.strokeStyle = '#8b5a2b'; g.lineWidth = 3; g.beginPath(); g.moveTo(v.x - dir * v.r * 1.1, v.y); g.lineTo(v.x - dir * v.r * 1.6, v.y + swing); g.stroke();
      return;
    }
    if (v.kind === 'skater') {
      g.fillStyle = '#111827'; g.fillRect(v.x - 22, v.y - 6, 44, 12);
      g.fillStyle = '#ef4444'; for (const k of [-15, 15]) dot(g, v.x + k, v.y, 3);
    }
    g.fillStyle = v.color;
    g.beginPath(); g.ellipse(v.x, v.y, v.r * 0.55, v.r * 0.9, 0, 0, TAU); g.fill();
    g.fillStyle = '#e8b98a'; dot(g, v.x, v.y, v.r * 0.35);
    dot(g, v.x + dir * 4, v.y - v.r * 0.9 - swing * 0.5, 4); dot(g, v.x - dir * 4, v.y + v.r * 0.9 + swing * 0.5, 4);
  }

  // Linea di mira: colore del pallone, con un bordo scuro che la rende leggibile su ogni campo.
  function strokePath(g, pts, maxLen, color, dash, width) {
    if (pts.length < 2 || maxLen <= 0) return;
    const out = [pts[0]];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i], seg = Math.hypot(q.x - p.x, q.y - p.y);
      if (acc + seg >= maxLen) { const f = (maxLen - acc) / (seg || 1); out.push({ x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f }); break; }
      acc += seg; out.push(q);
    }
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [col, lw] of [['rgba(0,0,0,0.45)', width + 3], [color, width]]) {
      g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash);
      g.beginPath(); g.moveTo(out[0].x, out[0].y);
      for (const p of out) g.lineTo(p.x, p.y);
      g.stroke();
    }
    g.setLineDash([]); g.lineCap = 'butt'; g.lineJoin = 'miter';
  }

  function drawAim(g, disc, dx, dy, power, finger, team) {
    const col = BALL.aim;
    const fx = S.fx[team];
    const speed = power * MAX_SPEED;
    const real = Math.min(travel(speed, 0, effFric(DISC_FRICTION)), 1200);
    const laser = fx.laser > 0;
    const L = real * AIM_BASE * (laser ? (fx.laserGold ? 2 : 1.6) : 1);
    if (finger) {
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.setLineDash([4, 6]);
      g.beginPath(); g.moveTo(disc.x, disc.y); g.lineTo(finger.x, finger.y); g.stroke();
      g.setLineDash([]);
    }
    if (laser) {
      const sim = simulateShot(disc.i, dx * speed, dy * speed, 4, simOpts(team));
      strokePath(g, sim.dp, L, col, [2, 9], 2.5);
      {
        strokePath(g, sim.bp, L, col, [9, 6], 3);
        if (sim.goal >= 0) {
          const end = sim.bp[sim.bp.length - 1];
          g.fillStyle = col; g.font = '900 13px system-ui, sans-serif'; g.textAlign = 'center';
          g.fillText('GOL', end.x, end.y + (end.y < CY ? 22 : -16));
        }
      }
    } else {
      const reach = Math.min(L, gkLimit(disc, dx, dy));
      strokePath(g, [{ x: disc.x, y: disc.y }, { x: disc.x + dx * (disc.r + reach), y: disc.y + dy * (disc.r + reach) }], disc.r + reach, col, [2, 9], 2.5);
    }
    // Freccia
    const len = 30 + power * 80;
    const sx = disc.x + dx * (disc.r + 4), sy = disc.y + dy * (disc.r + 4);
    const ex = sx + dx * len, ey = sy + dy * len;
    g.lineCap = 'round';
    for (const [c, lw] of [['rgba(0,0,0,0.45)', 10], [col, 7]]) {
      g.strokeStyle = c; g.lineWidth = lw;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    }
    g.lineCap = 'butt';
    g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(ex + dx * 14, ey + dy * 14);
    g.lineTo(ex - dy * 11, ey + dx * 11);
    g.lineTo(ex + dy * 11, ey - dx * 11);
    g.closePath(); g.fill(); g.stroke();
    // Anello di potenza
    for (const [c, lw] of [['rgba(0,0,0,0.4)', 7], [col, 4]]) {
      g.strokeStyle = c; g.lineWidth = lw;
      g.beginPath(); g.arc(disc.x, disc.y, disc.r + 9, -Math.PI / 2, -Math.PI / 2 + power * TAU); g.stroke();
    }
  }

  function drawCurveUI(g) {
    const sp = S.curve;
    // Anteprima della traiettoria curva della palla
    const sim = simulateCurve(sp.value * curveMax(), 4);
    strokePath(g, sim.bp, 700, BALL.aim, [9, 6], 3.5);
    g.strokeStyle = BALL.aim; g.lineWidth = 3;
    g.beginPath(); g.arc(ball.x, ball.y, ball.r + 6 + Math.sin(performance.now() / 120) * 2, 0, TAU); g.stroke();
    const y = ball.y > CY ? F.t + AREA_H + 60 : F.b - AREA_H - 40;
    g.fillStyle = 'rgba(15,23,42,0.7)';
    g.fillRect(CX - 150, y - 16, 300, 32);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(CX - 1, y - 12, 2, 24);
    g.fillStyle = BALL.aim;
    dot(g, CX + sp.value * 135, y, 11);
    g.fillStyle = '#ffffff'; g.font = '800 12px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(sp.cpu ? 'EFFETTO CPU' : '◀ TRASCINA PER CURVARE ▶', CX, y - 28);
  }

  function render(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (pitch) ctx.drawImage(pitch, 0, 0);
    viewTransform(ctx);
    if (!ball) return;

    drawObstacles(ctx, t);
    drawTokens(ctx, t);
    for (const d of discs) drawDisc(ctx, d, t);
    drawBall(ctx);
    drawInvader(ctx);
    drawWind(ctx, t);

    if (S.aim) {
      const v = aimVector(S.aim);
      if (v && v.len >= 16) drawAim(ctx, S.aim.disc, v.dx, v.dy, v.power, S.aim, S.turn);
    } else if (S.curve) {
      drawCurveUI(ctx);
    } else if (S.cpu && S.cpu.stage === 'shoot') {
      const sp = Math.hypot(S.cpu.vx, S.cpu.vy);
      const grow = Math.min(1, 1.4 * (1 - S.cpu.t / S.cpu.total));
      drawAim(ctx, S.cpu.disc, S.cpu.vx / sp, S.cpu.vy / sp, (sp / MAX_SPEED) * grow, null, S.turn);
    }

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-4, -2.5, 8, 5);
      ctx.restore();
    }
    for (const f of S.floats) {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.font = `800 16px system-ui, ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }

  function confetti(team) {
    const cols = [TEAMS[team].shirt, TEAMS[team].base, '#ffffff', '#facc15'];
    burst(CX, team === 0 ? F.t : F.b, cols, 90, 140);
  }
  function burst(x, y, cols, n, spread = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 120 + Math.random() * 380;
      particles.push({
        x: x + (Math.random() - 0.5) * spread, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 180,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
        life: 0.8 + Math.random() * 1.2, color: cols[i % cols.length],
      });
    }
  }
  function addFloat(x, y, text, color) { S.floats.push({ x, y, text, color, life: 1.6 }); }

  // =====================================================================
  // HUD
  // =====================================================================
  let bannerTimer = 0;
  function showBanner(text, bg, ms, isGoal, fg) {
    banner.textContent = text;
    banner.style.color = fg || '#ffffff';
    banner.style.background = bg;
    banner.classList.toggle('goal', !!isGoal);
    banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => banner.classList.remove('show'), ms);
  }

  function updateHud() {
    if (!M) return;
    $('s0').textContent = S.score[0];
    $('s1').textContent = S.score[1];
    for (const k of [0, 1]) {
      $('f' + k).src = flagURL(TEAMS[k].id);
      $('n' + k).textContent = TEAMS[k].id;
    }
  }

  function renderStrips() {
    for (const team of [0, 1]) {
      const el = $('strip' + team);
      const visible = powers() && S.phase !== 'menu';
      el.hidden = !visible;
      if (!visible) continue;
      const fx = S.fx[team];
      const chips = [];
      if (fx.piombo || fx.piomboTurn) chips.push('⚫ Piombo');
      if (fx.laser) chips.push(`🎯 ×${fx.laser}`);
      if (fx.giro) chips.push('🌀 Giro');
      if (fx.dribble) chips.push(`🧲 ×${fx.dribble}`);
      if (fx.volante) chips.push(`🧤 ×${fx.volante}`);
      let html = `<div class="who"><img src="${flagURL(TEAMS[team].id)}" alt=""><span>${teamLabel(team).toUpperCase()}</span></div>`;
      html += `<div class="chips">${chips.map((c) => `<span>${c}</span>`).join('')}</div><div class="slots">`;
      for (let k = 0; k < 2; k++) {
        const it = S.inv[team][k];
        if (!it) { html += '<button class="slot empty" aria-label="Slot vuoto"></button>'; continue; }
        const usable = !isCpu(team) && canUse(team, it);
        const sel = S.cardPick && S.cardPick.team === team && S.cardPick.idx === k;
        html += `<button class="slot${it.gold ? ' gold' : ''}${usable ? '' : ' off'}${sel ? ' sel' : ''}" data-team="${team}" data-k="${k}" aria-label="${ITEMS[it.id].name}">${ITEMS[it.id].icon}${it.gold ? '<small>ORO</small>' : ''}</button>`;
      }
      el.innerHTML = html + '</div>';
    }
  }

  function updateStatus() {
    const st = $('statusText');
    if (!M || S.phase === 'menu') { st.innerHTML = '&nbsp;'; $('shots').innerHTML = ''; renderStrips(); return; }
    const team = TEAMS[S.turn];
    const who = `<span class="who" style="color:${team.ui}">${teamLabel(S.turn)}</span>`;
    let msg = '&nbsp;';
    if (S.phase === 'aim') msg = `${who} · trascina indietro una pedina e rilascia`;
    else if (S.phase === 'curve') msg = S.curve.cpu ? `${who} · sceglie l'effetto…` : `${who} · trascina a destra o sinistra per curvare la palla, poi rilascia`;
    else if (S.phase === 'card') msg = `${who} · tocca la pedina avversaria da ammonire`;
    else if (S.phase === 'cpu') msg = `${who} · sta mirando…`;
    else if (S.phase === 'moving') msg = `${who} · tiro in corso`;
    else if (S.phase === 'goal') msg = `Gol: ${TEAMS[S.scorer].name}!`;
    st.innerHTML = msg;
    const shots = $('shots');
    shots.innerHTML = '';
    if (['aim', 'cpu', 'moving', 'curve', 'card'].includes(S.phase)) {
      for (let i = 1; i <= S.maxShots; i++) {
        const el = document.createElement('i');
        if (i <= S.maxShots - S.shot + 1) el.className = 'on';
        shots.appendChild(el);
      }
      shots.title = `Tiri rimasti: ${S.maxShots - S.shot + 1}`;
    }
    renderStrips();
  }

  // =====================================================================
  // Audio (WebAudio sintetizzato)
  // =====================================================================
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
      this.tone(1100 + Math.random() * 300, 0.05, 'triangle', Math.min(0.35, strength / 2500), 500);
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
    pickup(gold) {
      this.tone(880, 0.1, 'triangle', 0.15);
      this.tone(1320, 0.14, 'triangle', 0.15, null, 0.08);
      if (gold) this.tone(1760, 0.2, 'triangle', 0.14, null, 0.16);
    },
    use() { this.noise(0.25, 0.18, 1200, 0.6); this.tone(600, 0.2, 'sine', 0.1, 1200); },
    var() { this.tone(880, 0.15, 'square', 0.06); this.tone(880, 0.15, 'square', 0.06, null, 0.22); this.tone(660, 0.3, 'square', 0.06, null, 0.44); },
    crack() { this.noise(0.25, 0.3, 500, 0.8); },
    plop() { this.tone(300, 0.15, 'sine', 0.2, 120); },
    crowd() { this.noise(1.2, 0.12, 900, 0.5); },
  };

  // =====================================================================
  // Torneo
  // =====================================================================
  let T = (() => { try { return JSON.parse(localStorage.getItem('cdt-tour') || 'null'); } catch (e) { return null; } })();
  function saveTour() { try { localStorage.setItem('cdt-tour', JSON.stringify(T)); } catch (e) { /* ignorato */ } }
  const tourActive = () => !!T && !T.out && !T.champion;

  function newTour(team) {
    const teams = shuffle([team, ...shuffle(NATION_IDS.filter((id) => id !== team)).slice(0, 7)]);
    T = { team, round: 0, out: false, champion: null, rounds: [[0, 2, 4, 6].map((i) => ({ a: teams[i], b: teams[i + 1], sa: null, sb: null }))] };
    saveTour();
  }
  const winnerOf = (m) => (m.sa > m.sb ? m.a : m.b);
  const myMatch = () => T.rounds[T.round].find((m) => m.a === T.team || m.b === T.team);

  function simMatch(m) {
    const target = Number(settings.target);
    const p = 0.5 + (NATIONS[m.a].rating - NATIONS[m.b].rating) * 0.08;
    const aWins = Math.random() < p;
    const lose = Math.floor(Math.random() * target);
    m.sa = aWins ? target : lose; m.sb = aWins ? lose : target;
  }

  function recordTour(sMe, sOpp) {
    const m = myMatch();
    if (m.a === T.team) { m.sa = sMe; m.sb = sOpp; } else { m.sb = sMe; m.sa = sOpp; }
    for (const x of T.rounds[T.round]) if (x.sa === null) simMatch(x);
    if (winnerOf(m) !== T.team) T.out = true;
    for (;;) {
      const r = T.rounds[T.round];
      if (r.length === 1) { T.champion = winnerOf(r[0]); break; }
      const w = r.map(winnerOf), next = [];
      for (let i = 0; i < w.length; i += 2) next.push({ a: w[i], b: w[i + 1], sa: null, sb: null });
      T.rounds.push(next);
      T.round++;
      if (!T.out) break;
      for (const x of next) simMatch(x);
    }
    saveTour();
  }

  function renderBracket() {
    const body = $('bracketBody');
    let html = '';
    if (T.champion) {
      html += `<p class="tour-note">${T.champion === T.team ? 'Hai vinto il torneo!' : `Vincitore del torneo: ${NATIONS[T.champion].name}.`}</p>`;
    } else if (T.out) {
      html += '<p class="tour-note">Sei stato eliminato.</p>';
    }
    for (let r = 0; r < 3; r++) {
      html += `<div class="round"><h3>${ROUND_NAMES[r]}</h3>`;
      const matches = T.rounds[r] || Array.from({ length: 4 >> r }, () => null);
      for (const m of matches) {
        if (!m) { html += '<div class="match"><span class="t">—</span><span class="res">vs</span><span class="t r">—</span></div>'; continue; }
        const played = m.sa !== null;
        const me = m.a === T.team || m.b === T.team;
        const cls = (id) => (played ? (winnerOf(m) === id ? ' w' : ' l') : '');
        html += `<div class="match${me ? ' me' : ''}">` +
          `<span class="t${cls(m.a)}"><img src="${flagURL(m.a)}" alt="">${m.a}</span>` +
          `<span class="res">${played ? `${m.sa} – ${m.sb}` : 'vs'}</span>` +
          `<span class="t r${cls(m.b)}">${m.b}<img src="${flagURL(m.b)}" alt=""></span></div>`;
      }
      html += '</div>';
    }
    body.innerHTML = html;
    $('bracketTitle').textContent = T.champion === T.team ? '🏆 Campioni!' : `Torneo · ${NATIONS[T.team].name}`;
    const play = $('bracketPlay');
    if (tourActive()) {
      const m = myMatch();
      const opp = m.a === T.team ? m.b : m.a;
      play.textContent = `Gioca ${ROUND_NAMES[T.round].toLowerCase()} contro ${NATIONS[opp].name}`;
    } else {
      play.textContent = 'Nuovo torneo';
    }
  }

  function playTourMatch() {
    const m = myMatch();
    const opp = m.a === T.team ? m.b : m.a;
    startMatch({
      mode: 'tour', rules: settings.rules, teams: [T.team, opp],
      field: settings.field === 'casuale' ? pickOne(FIELD_IDS) : settings.field,
      ball: settings.ball, target: Number(settings.target), round: T.round,
      skillD: DIFF_IDX[settings.diff] + T.round * 0.4 + (NATIONS[opp].rating - 4) * 0.3,
    });
  }

  // =====================================================================
  // Menu
  // =====================================================================
  function show(id) { $(id).classList.add('show'); }
  function hide(id) { $(id).classList.remove('show'); }
  function hideOverlays() { ['home', 'setup', 'bracket', 'legend', 'pause', 'over'].forEach(hide); }

  function openHome() {
    S.phase = 'menu';
    S.aim = null; S.cpu = null; S.curve = null; S.cardPick = null;
    S.paused = false;
    M = null;
    hideOverlays();
    $('homeContinue').hidden = !tourActive();
    show('home');
    updateStatus();
    resize();
  }

  function teamPicker(key, label, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'group';
    const lab = document.createElement('label');
    lab.textContent = label;
    const grid = document.createElement('div');
    grid.className = 'teams';
    const name = document.createElement('div');
    name.className = 'pick-name';
    const ids = opts.random ? [...NATION_IDS, 'random'] : NATION_IDS;
    const refresh = () => {
      grid.querySelectorAll('.tbtn').forEach((b) => {
        b.classList.toggle('on', b.dataset.v === settings[key]);
        b.classList.toggle('dis', !!opts.avoid && b.dataset.v === settings[opts.avoid]);
      });
      name.textContent = settings[key] === 'random' ? 'Avversario a sorpresa' : NATIONS[settings[key]].name;
    };
    for (const id of ids) {
      const b = document.createElement('button');
      b.className = 'tbtn';
      b.dataset.v = id;
      b.innerHTML = id === 'random' ? '<span class="rnd">🎲</span>?' : `<img src="${flagURL(id)}" alt="">${id}`;
      b.setAttribute('aria-label', id === 'random' ? 'Casuale' : NATIONS[id].name);
      b.addEventListener('click', () => {
        if (opts.avoid && id === settings[opts.avoid]) return;
        settings[key] = id;
        saveSettings();
        document.querySelectorAll('#teamPickers .teams').forEach((g) => g.dispatchEvent(new Event('refresh')));
      });
      grid.appendChild(b);
    }
    grid.addEventListener('refresh', refresh);
    refresh();
    wrap.append(lab, grid, name);
    return wrap;
  }

  function openSetup(mode) {
    settings.mode = mode;
    saveSettings();
    const box = $('teamPickers');
    box.innerHTML = '';
    if (mode === 'cpu') {
      $('setupTitle').textContent = 'Amichevole';
      if (settings.team1 === settings.team0) settings.team1 = 'random';
      box.append(teamPicker('team0', 'La tua nazionale', { avoid: 'team1' }), teamPicker('team1', 'Avversario', { random: true, avoid: 'team0' }));
      $('startBtn').textContent = 'Gioca';
    } else if (mode === '2p') {
      $('setupTitle').textContent = '2 giocatori';
      if (settings.p2team === settings.team0) settings.p2team = NATION_IDS.find((id) => id !== settings.team0);
      box.append(teamPicker('team0', 'Giocatore 1 (in basso)', { avoid: 'p2team' }), teamPicker('p2team', 'Giocatore 2 (in alto)', { avoid: 'team0' }));
      $('startBtn').textContent = 'Gioca';
    } else {
      $('setupTitle').textContent = 'Torneo';
      box.append(teamPicker('tourTeam', 'La tua nazionale (la tieni per tutto il torneo)'));
      $('startBtn').textContent = 'Inizia torneo';
    }
    $('diffGroup').style.display = mode === '2p' ? 'none' : '';
    syncMenu();
    hideOverlays();
    show('setup');
  }

  function buildTiles() {
    const fg = $('fieldGrid');
    fg.innerHTML = '';
    for (const id of [...FIELD_IDS, 'casuale']) {
      const b = document.createElement('button');
      b.className = 'tile';
      b.dataset.v = id;
      if (id === 'casuale') {
        b.innerHTML = '<span class="rnd">🎲</span>Casuale';
      } else {
        const c = document.createElement('canvas');
        c.width = 84; c.height = 140;
        const g = c.getContext('2d');
        g.setTransform(84 / W, 0, 0, 140 / H, 0, 0);
        drawPitch(g, id);
        b.appendChild(c);
        b.append(FIELDS[id].name);
      }
      b.addEventListener('click', () => { settings.field = id; saveSettings(); syncMenu(); });
      fg.appendChild(b);
    }
    const bg = $('ballGrid');
    bg.innerHTML = '';
    for (const id of BALL_IDS) {
      const b = document.createElement('button');
      b.className = 'tile';
      b.dataset.v = id;
      const c = document.createElement('canvas');
      c.width = 80; c.height = 80;
      const g = c.getContext('2d');
      g.fillStyle = '#1b5e2e'; g.fillRect(0, 0, 80, 80);
      drawBallSprite(g, 40, 40, 26, 0.3, BALLS[id]);
      const sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = BALLS[id].aim;
      b.append(c, BALLS[id].name, sw);
      b.addEventListener('click', () => { settings.ball = id; saveSettings(); syncMenu(); });
      bg.appendChild(b);
    }
  }

  function syncMenu() {
    document.querySelectorAll('.seg').forEach((seg) => {
      const key = seg.dataset.key;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(settings[key])));
    });
    $('fieldGrid').querySelectorAll('.tile').forEach((b) => b.classList.toggle('on', b.dataset.v === settings.field));
    $('ballGrid').querySelectorAll('.tile').forEach((b) => b.classList.toggle('on', b.dataset.v === settings.ball));
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

  function quickConfig() {
    const t0 = settings.team0;
    let t1 = settings.mode === '2p' ? settings.p2team : settings.team1;
    if (t1 === 'random' || t1 === t0) t1 = pickOne(NATION_IDS.filter((id) => id !== t0));
    return {
      mode: settings.mode, rules: settings.rules, teams: [t0, t1],
      field: settings.field === 'casuale' ? pickOne(FIELD_IDS) : settings.field,
      ball: settings.ball, target: Number(settings.target),
      skillD: DIFF_IDX[settings.diff] + (NATIONS[t1].rating - 4) * 0.2,
    };
  }

  function renderLegend() {
    const fieldsOf = (type) => FIELD_IDS.filter((f) => FIELDS[f].obstacles.includes(type)).map((f) => FIELDS[f].name).join(', ');
    let html = '<h3>Oggetti</h3><p class="intro">Solo con le regole "Con poteri". Compaiono in campo: li prende la squadra che ci passa sopra con una pedina, o che ci manda sopra la palla. Si tengono al massimo 2 oggetti e si usano toccandoli prima di tirare.</p>';
    for (const id of ITEM_IDS) {
      const it = ITEMS[id];
      html += `<div class="li"><div class="ic">${it.icon}</div><div><h4>${it.name}</h4><p>${it.desc} <span class="gold">Oro:</span> ${it.gold}</p></div></div>`;
    }
    html += '<div class="li"><div class="ic">⭐</div><div><h4>Oggetti d\'oro</h4><p>Hanno il bordo dorato e la scritta ORO. Ogni oggetto ha 1 possibilità su 6 di essere d\'oro, e almeno uno ogni 10 lo è di sicuro.</p></div></div>';
    html += '<h3>Ostacoli</h3><p class="intro">Solo con le regole "Con poteri". Ogni campo ha i suoi: compaiono a caso durante la partita e spariscono dopo qualche turno.</p>';
    for (const id of Object.keys(OBST)) {
      const o = OBST[id];
      html += `<div class="li"><div class="ic">${o.icon}</div><div><h4>${o.name}</h4><p>${o.desc}</p><p class="where">Campi: ${fieldsOf(id)}</p></div></div>`;
    }
    html += '<h3>Comandi</h3>';
    html += '<div class="li"><div class="ic">👆</div><div><h4>Tiro</h4><p>Trascina all\'indietro una tua pedina e rilascia. La linea tratteggiata mostra metà della corsa: con il Laser si allunga e mostra anche la palla.</p></div></div>';
    html += '<div class="li"><div class="ic">🔁</div><div><h4>Turni</h4><p>Hai 3 tiri per turno. Se una tua pedina tocca la palla tiri ancora, altrimenti tocca all\'avversario. Il portiere resta nella sua area.</p></div></div>';
    $('legendBody').innerHTML = html;
  }
  let legendBack = 'home';
  function openLegend(from) {
    legendBack = from;
    renderLegend();
    hide(from);
    show('legend');
  }

  function pause() {
    if (!M || S.phase === 'menu' || S.phase === 'over' || S.paused) return;
    S.paused = true;
    S.aim = null;
    show('pause');
  }
  function resume() { S.paused = false; hide('pause'); }

  $('homeCpu').addEventListener('click', () => { Sfx.unlock(); openSetup('cpu'); });
  $('home2p').addEventListener('click', () => { Sfx.unlock(); openSetup('2p'); });
  $('homeTour').addEventListener('click', () => { Sfx.unlock(); openSetup('tour'); });
  $('homeContinue').addEventListener('click', () => { Sfx.unlock(); hideOverlays(); renderBracket(); show('bracket'); });
  $('homeLegend').addEventListener('click', () => openLegend('home'));
  $('legendClose').addEventListener('click', () => { hide('legend'); show(legendBack); });
  $('setupBack').addEventListener('click', openHome);
  $('startBtn').addEventListener('click', () => {
    Sfx.unlock();
    if (settings.mode === 'tour') {
      newTour(settings.tourTeam);
      hideOverlays(); renderBracket(); show('bracket');
    } else {
      startMatch(quickConfig());
    }
  });
  $('bracketPlay').addEventListener('click', () => {
    Sfx.unlock();
    if (tourActive()) playTourMatch(); else openSetup('tour');
  });
  $('bracketMenu').addEventListener('click', openHome);
  $('menuBtn').addEventListener('click', () => (S.paused ? resume() : pause()));
  $('resumeBtn').addEventListener('click', resume);
  $('pauseLegend').addEventListener('click', () => openLegend('pause'));
  $('restartBtn').addEventListener('click', () => {
    if (M.mode === 'tour') playTourMatch(); else startMatch(Object.assign({}, M));
  });
  $('quitBtn').addEventListener('click', openHome);
  $('againBtn').addEventListener('click', () => {
    if (M.mode === 'tour') { hideOverlays(); renderBracket(); show('bracket'); }
    else startMatch(Object.assign({}, M));
  });
  $('overMenuBtn').addEventListener('click', openHome);
  $('fullBtn').addEventListener('click', () => {
    settings.full = !settings.full;
    saveSettings();
    // Su browser che lo permettono, prova anche il vero schermo intero.
    try {
      const de = document.documentElement;
      if (settings.full && de.requestFullscreen && !document.fullscreenElement) de.requestFullscreen().catch(() => {});
      else if (!settings.full && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch (e) { /* ignorato */ }
    resize();
  });
  $('soundBtn').addEventListener('click', () => {
    settings.sound = !settings.sound;
    saveSettings(); syncMenu(); Sfx.unlock();
  });
  // Pausa automatica quando l'app va in background
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

  // =====================================================================
  // Ciclo principale
  // =====================================================================
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (M && !S.paused && S.phase !== 'menu' && S.phase !== 'over' && !document.hidden) {
      acc += dt;
      while (acc >= STEP && S.phase !== 'curve') {
        physicsStep(LW, STEP);
        acc -= STEP;
        if (S.curveReq && S.phase === 'moving') { S.curveReq = false; enterCurve(); }
      }
      if (S.phase === 'curve') acc = 0;
      update(dt);
    } else {
      acc = 0;
    }
    render(now / 1000);
    requestAnimationFrame(frame);
  }

  TEAMS = buildTeams('ITA', 'BRA');
  setupPositions(0);
  buildTiles();
  syncMenu();
  openHome();
  requestAnimationFrame(frame);

  // Hook per i test automatici.
  window.__game = {
    S, settings, ITEMS, OBST, FIELDS, LW,
    get ball() { return ball; }, get discs() { return discs; }, get M() { return M; }, get T() { return T; },
    cpuPlan, cpuUseItems, shoot, startMatch, quickConfig, applyItem, spawnObstacle, spawnToken, varAvailable, doVar,
    simulateShot, simOpts, renderBracket, recordTour, newTour, playTourMatch, openSetup, gameOver, resumeCurve,
  };
})();
