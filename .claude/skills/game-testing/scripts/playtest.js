#!/usr/bin/env node
'use strict';
/*
 * Playtest automatico di Calcio da Tavolo.
 *
 * Gioca molte partite in avanti veloce (la fisica viene avanzata a mano, senza
 * aspettare il tempo reale) e raccoglie metriche sulle dinamiche di gioco.
 * Il lato A (squadra in basso, quella del giocatore) è guidato dallo stesso
 * cervello della CPU con un livello scelto, così si possono confrontare livelli,
 * regole, campi e oggetti.
 *
 * Uso:
 *   node playtest.js [--matches 12] [--a 2] [--b 4] [--rules classica|poteri]
 *                    [--field erba|terra|indoor|street|neve|allenamento|casuale]
 *                    [--target 3] [--parallel 4] [--out report.json] [--url file:///.../index.html]
 *
 * Livelli: 2 = Normale, 3 = Difficile, 4 = Estremo (valori intermedi ammessi).
 * Richiede gli hook di test esposti dal gioco: window.__game e window.__step.
 */
const path = require('path');
const fs = require('fs');
const { chromium, devices } = require('playwright');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
  return acc;
}, []));
const opt = {
  matches: Number(args.matches || 12),
  a: Number(args.a || 2),
  b: Number(args.b || 2),
  rules: args.rules || 'classica',
  field: args.field || 'casuale',
  target: Number(args.target || 3),
  parallel: Number(args.parallel || 4),
  out: args.out || null,
  url: args.url || 'file://' + path.resolve(__dirname, '../../../../index.html'),
};

// Codice eseguito dentro la pagina: gioca `n` partite e restituisce gli eventi grezzi.
function inPage({ n, a, b, rules, field, target, seedOffset }) {
  const g = window.__game;
  if (!g || !window.__step) throw new Error('Hook di test mancanti: servono window.__game e window.__step');
  const S = g.S;
  const FIELDS = Object.keys(g.FIELDS);
  const NATIONS = ['BRA', 'JPN', 'ITA', 'ARG', 'FRA', 'ENG', 'NED', 'ESP', 'GER', 'POR'];
  const DT = 1 / 240, MAX_SIM = 1200, STALL = 90;
  const matches = [];

  for (let m = 0; m < n; m++) {
    const k = m + seedOffset;
    const teams = [NATIONS[k % 10], NATIONS[(k * 3 + 1) % 10]];
    if (teams[0] === teams[1]) teams[1] = NATIONS[(k + 5) % 10];
    const f = field === 'casuale' ? FIELDS[k % FIELDS.length] : field;
    g.startMatch({ mode: 'cpu', rules, teams, field: f, ball: 'classico', target, skillD: b });
    S.paused = true; // ferma il ciclo in tempo reale: avanziamo noi la simulazione

    const rec = {
      field: f, teams, firstTurn: S.turn, score: null, simTime: 0, stalled: false, capped: false,
      shots: [], items: [], planMs: [], heat: new Array(60).fill(0), ownGoals: 0, curveChoices: 0,
      obstacleTypes: {}, errors: [],
    };
    let t = 0, lastChange = 0, prevPhase = S.phase, shot = null, nextHeat = 0;
    let prevInv = [S.inv[0].map((x) => x.id + (x.gold ? '*' : '')), S.inv[1].map((x) => x.id + (x.gold ? '*' : ''))];
    let lastTurnKey = '';

    while (S.phase !== 'over') {
      // --- Bot del lato A (squadra 0)
      try {
        if (S.phase === 'aim' && S.turn === 0) {
          const turnKey = S.turnCount + ':' + S.shot;
          if (turnKey !== lastTurnKey) {
            lastTurnKey = turnKey;
            const r = g.cpuUseItems(0);
            if (r.var) { g.doVar(0, r.var.gold); continue; }
          }
          g.M.skillD = a;
          const t0 = performance.now();
          const c = g.cpuPlan(0);
          rec.planMs.push(performance.now() - t0);
          g.M.skillD = b;
          g.shoot(c.disc, c.vx, c.vy);
        } else if (S.phase === 'curve' && !S.curve.cpu) {
          g.M.skillD = a;
          S.curve.value = g.cpuCurve(0);
          g.M.skillD = b;
          rec.curveChoices++;
          g.resumeCurve();
        } else if (S.phase === 'card' && S.cardPick) {
          S.cardPick = null; S.phase = 'aim';
        }
      } catch (e) { rec.errors.push(String(e && e.message || e)); break; }

      // --- Inizio tiro (il lato A tira prima del passo, la CPU durante il passo)
      const startShot = () => {
        shot = {
          team: S.turn, shotNo: S.shot, maxShots: S.maxShots, t,
          b0: { x: g.ball.x, y: g.ball.y }, heavy: !!(S.shooterDisc && S.shooterDisc.heavy),
          gk: !!(S.shooterDisc && S.shooterDisc.gk),
        };
      };
      if (!shot && S.phase === 'moving' && prevPhase !== 'moving' && prevPhase !== 'curve') startShot();
      const before = S.phase;

      try { window.__step(DT); } catch (e) { rec.errors.push(String(e && e.message || e)); break; }
      t += DT;
      if (!shot && S.phase === 'moving' && before !== 'moving' && before !== 'curve') startShot();

      // --- Fine tiro
      if (shot && before === 'moving' && S.phase !== 'moving' && S.phase !== 'curve') {
        shot.dur = t - shot.t;
        shot.ballMove = Math.hypot(g.ball.x - shot.b0.x, g.ball.y - shot.b0.y);
        shot.goal = S.phase === 'goal' ? S.scorer : -1;
        if (shot.goal >= 0 && shot.goal !== shot.team) rec.ownGoals++;
        shot.kept = S.phase !== 'goal' && S.turn === shot.team;
        shot.capped = shot.dur > 13.9;
        rec.shots.push(shot);
        shot = null;
      }

      // --- Oggetti usati (spariscono dall'inventario senza essere raccolti)
      for (const tm of [0, 1]) {
        const now = S.inv[tm].map((x) => x.id + (x.gold ? '*' : ''));
        const before = prevInv[tm].slice();
        for (const id of now) { const i = before.indexOf(id); if (i >= 0) before.splice(i, 1); }
        for (const id of before) rec.items.push({ team: tm, id, t, score: S.score.slice() });
        prevInv[tm] = now;
      }

      if (t >= nextHeat) {
        nextHeat = t + 0.5;
        const cx = Math.min(5, Math.max(0, Math.floor((g.ball.x - 30) / 90)));
        const cy = Math.min(9, Math.max(0, Math.floor((g.ball.y - 60) / 88)));
        rec.heat[cy * 6 + cx]++;
      }
      for (const o of S.obstacles) rec.obstacleTypes[o.type] = 1;

      if (S.phase !== prevPhase) lastChange = t;
      prevPhase = S.phase;
      if (t - lastChange > STALL) { rec.stalled = true; rec.stallPhase = S.phase; break; }
      if (t > MAX_SIM) { rec.capped = true; break; }
    }
    rec.score = S.score.slice();
    rec.simTime = t;
    rec.winner = S.phase === 'over' ? (S.score[0] > S.score[1] ? 0 : 1) : -1;
    matches.push(rec);
  }
  return matches;
}

// ---------- Statistiche ----------
const mean = (xs) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
const pct = (x) => (100 * x).toFixed(1) + '%';
// Intervallo di Wilson al 95% per una proporzione
function wilson(k, n) {
  if (!n) return [0, 0];
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n), r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - r) / d, (c + r) / d];
}

function summarize(all) {
  const done = all.filter((m) => m.winner >= 0);
  const shots = all.flatMap((m) => m.shots);
  const by = (team) => shots.filter((s) => s.team === team);
  const winsA = done.filter((m) => m.winner === 0).length;
  const firstWins = done.filter((m) => m.winner === m.firstTurn).length;
  const goals = shots.filter((s) => s.goal >= 0);
  const turns = [];
  for (const m of all) {
    let cur = null;
    for (const s of m.shots) {
      if (!cur || s.shotNo === 1) { cur = { team: s.team, n: 0 }; turns.push(cur); }
      cur.n++;
    }
  }
  const items = all.flatMap((m) => m.items);
  const itemStats = {};
  for (const m of all) {
    for (const it of m.items) {
      const key = it.id;
      const st = itemStats[key] || (itemStats[key] = { used: 0, goalSoon: 0 });
      st.used++;
      // gol della stessa squadra nei 20 secondi simulati successivi
      if (m.shots.some((s) => s.goal === it.team && s.t >= it.t && s.t <= it.t + 20)) st.goalSoon++;
    }
  }
  const sideStats = (team) => {
    const ss = by(team);
    return {
      shots: ss.length,
      keepRate: mean(ss.map((s) => (s.kept ? 1 : 0))),
      goalPerShot: mean(ss.map((s) => (s.goal === team ? 1 : 0))),
      noBallContact: mean(ss.map((s) => (s.ballMove < 4 ? 1 : 0))),
      gkShots: ss.filter((s) => s.gk).length,
      heavyShots: ss.filter((s) => s.heavy).length,
    };
  };
  const heat = new Array(60).fill(0);
  for (const m of all) m.heat.forEach((v, i) => { heat[i] += v; });
  const heatTot = heat.reduce((s, v) => s + v, 0) || 1;
  const rows = [];
  for (let r = 0; r < 10; r++) rows.push(heat.slice(r * 6, r * 6 + 6).map((v) => String(Math.round((100 * v) / heatTot)).padStart(3)).join(''));
  const plan = all.flatMap((m) => m.planMs).sort((x, y) => x - y);
  return {
    config: opt,
    matches: all.length,
    finished: done.length,
    stalled: all.filter((m) => m.stalled).map((m) => ({ field: m.field, phase: m.stallPhase, score: m.score })),
    capped: all.filter((m) => m.capped).length,
    errors: [...new Set(all.flatMap((m) => m.errors))],
    winRateA: done.length ? winsA / done.length : null,
    winRateA_CI95: wilson(winsA, done.length),
    firstTurnWinRate: done.length ? firstWins / done.length : null,
    goalsPerMatch: mean(all.map((m) => m.score[0] + m.score[1])),
    ownGoalsTotal: all.reduce((s, m) => s + m.ownGoals, 0),
    shotsPerMatch: mean(all.map((m) => m.shots.length)),
    shotsPerGoal: goals.length ? shots.length / goals.length : null,
    simMinutesPerMatch: mean(all.map((m) => m.simTime / 60)),
    // stima con 3 s di mira per ogni tiro del giocatore umano
    estRealMinutesPerMatch: mean(all.map((m) => (m.simTime + 3 * m.shots.filter((s) => s.team === 0).length) / 60)),
    shotsPerTurn: mean(turns.map((x) => x.n)),
    turnsWithMaxShots: mean(turns.map((x) => (x.n >= 3 ? 1 : 0))),
    cappedShots: shots.filter((s) => s.capped).length,
    sideA: sideStats(0),
    sideB: sideStats(1),
    items: itemStats,
    itemsUsedTotal: items.length,
    curveChoicesA: all.reduce((s, m) => s + m.curveChoices, 0),
    planMsA: plan.length ? { median: Math.round(plan[plan.length >> 1]), p95: Math.round(plan[Math.floor(plan.length * 0.95)]), max: Math.round(plan[plan.length - 1]) } : null,
    ballHeatmapPct: rows, // 10 righe (porta in alto = squadra B) x 6 colonne, % del tempo
    perMatch: all.map((m) => ({ field: m.field, teams: m.teams.join('-'), score: m.score.join('-'), first: m.firstTurn, shots: m.shots.length, simMin: +(m.simTime / 60).toFixed(1) })),
  };
}

(async () => {
  const browser = await chromium.launch();
  const per = Math.ceil(opt.matches / opt.parallel);
  const jobs = [];
  for (let w = 0; w < opt.parallel; w++) {
    const n = Math.min(per, opt.matches - w * per);
    if (n <= 0) break;
    jobs.push((async () => {
      const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await page.goto(opt.url);
      const res = await page.evaluate(inPage, { n, a: opt.a, b: opt.b, rules: opt.rules, field: opt.field, target: opt.target, seedOffset: w * per });
      if (pageErrors.length) res.forEach((m) => m.errors.push(...pageErrors));
      return res;
    })());
  }
  const all = (await Promise.all(jobs)).flat();
  await browser.close();
  const sum = summarize(all);
  if (opt.out) fs.writeFileSync(opt.out, JSON.stringify({ summary: sum, raw: all }, null, 2));
  const lines = [
    `Partite: ${sum.matches} (finite ${sum.finished}, bloccate ${sum.stalled.length}, oltre il limite ${sum.capped})  lato A liv ${opt.a} vs lato B liv ${opt.b}, regole ${opt.rules}, campo ${opt.field}`,
    `Vittorie A: ${sum.winRateA === null ? '-' : pct(sum.winRateA)}  (IC95 ${pct(sum.winRateA_CI95[0])}–${pct(sum.winRateA_CI95[1])})   vince chi inizia: ${sum.firstTurnWinRate === null ? '-' : pct(sum.firstTurnWinRate)}`,
    `Gol/partita ${sum.goalsPerMatch.toFixed(2)}  tiri/partita ${sum.shotsPerMatch.toFixed(1)}  tiri/gol ${sum.shotsPerGoal ? sum.shotsPerGoal.toFixed(1) : '-'}  autogol ${sum.ownGoalsTotal}`,
    `Durata: ${sum.simMinutesPerMatch.toFixed(1)} min simulati, ~${sum.estRealMinutesPerMatch.toFixed(1)} min reali stimati   tiri/turno ${sum.shotsPerTurn.toFixed(2)}  turni con 3+ tiri ${pct(sum.turnsWithMaxShots)}`,
    `A: possesso mantenuto ${pct(sum.sideA.keepRate)}, gol/tiro ${pct(sum.sideA.goalPerShot)}, tiri a vuoto ${pct(sum.sideA.noBallContact)}   B: possesso ${pct(sum.sideB.keepRate)}, gol/tiro ${pct(sum.sideB.goalPerShot)}, a vuoto ${pct(sum.sideB.noBallContact)}`,
    `Tiri al limite di 14 s: ${sum.cappedShots}   pianificazione A: ${sum.planMsA ? `mediana ${sum.planMsA.median} ms, p95 ${sum.planMsA.p95} ms` : '-'}`,
    sum.itemsUsedTotal ? `Oggetti usati (${sum.itemsUsedTotal}): ` + Object.entries(sum.items).map(([k, v]) => `${k} ${v.used} (gol entro 20s ${v.goalSoon})`).join(', ') : 'Oggetti: nessuno',
    'Mappa di calore della palla (% del tempo, porta di B in alto):',
    ...sum.ballHeatmapPct.map((r) => '  ' + r),
    sum.errors.length ? 'ERRORI: ' + sum.errors.join(' | ') : 'Errori: nessuno',
  ];
  console.log(lines.join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
