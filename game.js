/* ============================================================
   WORLD COUNTRY FLAG BATTLE — game.js
   Tournament state machine, rendering loop, UI wiring.
   ============================================================ */

(function () {
  "use strict";

  const COUNTRIES = window.WCFB.COUNTRIES;
  const Flag = window.WCFB.Flag;
  const Arena = window.WCFB.Arena;
  const PhysicsWorld = window.WCFB.PhysicsWorld;
  const AudioSystem = window.WCFB.AudioSystem;

  // If true, the renderer will try assets/flags/<CODE>.png first and fall
  // back to the emoji flag automatically. Off by default in this build
  // because no PNGs are bundled — flip to true once you drop images in.
  const USE_IMAGE_FLAGS = false;

  // ---------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const dom = {
    app: $("app"),
    flagTotalSub: $("flagTotalSub"),
    stageLabel: $("stageLabel"),
    roundLabel: $("roundLabel"),
    activeLabel: $("activeLabel"),
    clockLabel: $("clockLabel"),
    championsCountLabel: $("championsCountLabel"),
    qualifiedList: $("qualifiedList"),
    canvas: $("arenaCanvas"),
    countdownOverlay: $("countdownOverlay"),
    countdownNum: $("countdownNum"),
    stageBanner: $("stageBanner"),
    stageBannerText: $("stageBannerText"),
    roundWinnerOverlay: $("roundWinnerOverlay"),
    rwRound: $("rwRound"),
    rwFlag: $("rwFlag"),
    rwName: $("rwName"),
    idleOverlay: $("idleOverlay"),
    liveStatusLine: $("liveStatusLine"),
    flagsProgressFill: $("flagsProgressFill"),
    flagsProgressLabel: $("flagsProgressLabel"),
    leaderboardList: $("leaderboardList"),
    flagGrid: $("flagGrid"),
    flagGridCount: $("flagGridCount"),
    btnStart: $("btnStart"),
    btnPause: $("btnPause"),
    btnResume: $("btnResume"),
    btnRestart: $("btnRestart"),
    btnFullscreen: $("btnFullscreen"),
    chkAuto: $("chkAuto"),
    chkSound: $("chkSound"),
    chkVoice: $("chkVoice"),
    chkMusic: $("chkMusic"),
    rangeVolume: $("rangeVolume"),
    spd1: $("spd1"),
    spd2: $("spd2"),
    spd4: $("spd4"),
    btnSettings: $("btnSettings"),
    settingsBackdrop: $("settingsBackdrop"),
    btnCloseSettings: $("btnCloseSettings"),
    selFlagCount: $("selFlagCount"),
    selCollision: $("selCollision"),
    selSpeedDefault: $("selSpeedDefault"),
    btnApplySettings: $("btnApplySettings"),
    championOverlay: $("championOverlay"),
    championParticles: $("championParticles"),
    champFlag: $("champFlag"),
    champName: $("champName"),
    champSub: $("champSub"),
    champNext: $("champNext"),
  };

  dom.flagTotalSub.textContent = `${COUNTRIES.length} nations enter. One survives.`;

  // ---------------------------------------------------------
  // Persistence (settings + all-time stats)
  // ---------------------------------------------------------
  const LS_SETTINGS = "wcfb_settings_v1";
  const LS_ALLTIME = "wcfb_alltime_v1";
  const LS_STATS = "wcfb_stats_v1";

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      /* localStorage may be unavailable (private mode) — ignore */
    }
  }

  const settings = Object.assign(
    {
      flagCount: COUNTRIES.length,
      collision: "normal",
      speedDefault: 1,
      soundOn: true,
      voiceOn: true,
      musicOn: true,
      autoMode: true,
      volume: 80,
    },
    loadJSON(LS_SETTINGS, {})
  );

  let allTime = loadJSON(LS_ALLTIME, {}); // code -> {name, emoji, wins, finals, titles}
  let stats = Object.assign({ tournaments: 0, championsCrowned: 0 }, loadJSON(LS_STATS, {}));

  function persistSettings() { saveJSON(LS_SETTINGS, settings); }
  function persistAllTime() { saveJSON(LS_ALLTIME, allTime); }
  function persistStats() { saveJSON(LS_STATS, stats); }

  function recordAllTime(country, field) {
    let e = allTime[country.code];
    if (!e) {
      e = { name: country.name, emoji: country.emoji, wins: 0, finals: 0, titles: 0 };
      allTime[country.code] = e;
    }
    e[field] += 1;
    persistAllTime();
  }

  // ---------------------------------------------------------
  // Audio
  // ---------------------------------------------------------
  const audio = new AudioSystem();
  audio.soundOn = settings.soundOn;
  audio.voiceOn = settings.voiceOn;
  audio.musicOn = settings.musicOn;
  audio.volume = settings.volume / 100;

  // ---------------------------------------------------------
  // Arena / physics
  // ---------------------------------------------------------
  const ARENA = new Arena(500, 500, 455);
  const world = new PhysicsWorld(ARENA);
  const COLLISION_SCALE = { low: 0.55, normal: 1.0, high: 1.6 };
  world.damageScale = COLLISION_SCALE[settings.collision];

  // ---------------------------------------------------------
  // Game state
  // ---------------------------------------------------------
  const STAGE_ORDER = ["QUALIFYING", "KNOCKOUT", "QUARTERFINAL", "SEMIFINAL", "FINAL"];
  const STAGE_TITLE = {
    QUALIFYING: "Qualifying",
    KNOCKOUT: "Knockout",
    QUARTERFINAL: "Quarter Final",
    SEMIFINAL: "Semi Final",
    FINAL: "FINAL",
  };
  const STAGE_ANNOUNCE = {
    KNOCKOUT: "The Knockout stage begins.",
    QUARTERFINAL: "We are entering the Quarter Finals.",
    SEMIFINAL: "The Semi Finals begin now.",
    FINAL: "This is it. The FINAL.",
  };

  function getStageForCount(n) {
    if (n <= 2) return "FINAL";
    if (n <= 4) return "SEMIFINAL";
    if (n <= 8) return "QUARTERFINAL";
    if (n <= 16) return "KNOCKOUT";
    return "QUALIFYING";
  }

  const state = {
    phase: "idle", // idle | countdown | battle | champion
    paused: false,
    speed: settings.speedDefault,
    stage: "QUALIFYING",
    round: 0,
    initialCount: 0,
    activeCount: 0,
    stageStartTime: 0,
    lastRoundTime: 0,
    tournamentStartTs: 0,
    lastTs: null,
    finalsRecorded: false,
    timers: [], // pending setTimeout ids for this tournament (cleared on restart)
    tournamentSpotlight: new Map(), // code -> {country, wins}
    recentEliminations: [], // small rolling buffer, used for a tiebreak champion
    championDeclared: false,
  };

  function later(fn, ms) {
    const id = setTimeout(fn, Math.max(0, ms / state.speed));
    state.timers.push(id);
    return id;
  }
  function clearTimers() {
    state.timers.forEach((id) => clearTimeout(id));
    state.timers = [];
  }

  // ---------------------------------------------------------
  // Particles
  // ---------------------------------------------------------
  const MAX_PARTICLES = 260;
  const particles = [];
  function spawnParticles(x, y, type, count, power) {
    const colors = {
      hit: ["#ffd24a", "#ff9d4a", "#ffe89a"],
      wall: ["#7ef1ff", "#bdf6ff"],
      elim: ["#ff4d5e", "#ff9d9d", "#5f8271"],
      confetti: ["#2bff9e", "#ffd24a", "#7ef1ff", "#ff4d5e", "#eafff2"],
    };
    const palette = colors[type] || colors.hit;
    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const angle = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 90 * (0.4 + power);
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.4 + Math.random() * 0.4,
        color: palette[(Math.random() * palette.length) | 0],
        size: 1.5 + Math.random() * 2.5,
      });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
  }

  world.onCollision = (intensity, a, b) => {
    audio.collision(intensity);
  };
  world.onWallHit = (intensity, f) => {
    audio.wallBounce(intensity);
  };
  world.onParticles = (x, y, type, count, power) => spawnParticles(x, y, type, count, power);
  world.onElimination = (victim, attacker) => {
    handleElimination(victim, attacker);
  };

  // ---------------------------------------------------------
  // Flag art (emoji by default, optional PNG upgrade path)
  // ---------------------------------------------------------
  const flagArtCache = new Map();
  function getFlagArt(code) {
    if (!USE_IMAGE_FLAGS) return { ready: true, useEmoji: true };
    let entry = flagArtCache.get(code);
    if (entry) return entry;
    entry = { img: null, ready: false, useEmoji: true };
    flagArtCache.set(code, entry);
    const img = new Image();
    img.onload = () => { entry.img = img; entry.ready = true; entry.useEmoji = false; };
    img.onerror = () => { entry.ready = true; entry.useEmoji = true; };
    img.src = `assets/flags/${code}.png`;
    return entry;
  }

  // ---------------------------------------------------------
  // Tournament setup
  // ---------------------------------------------------------
  const chipMap = new Map(); // iid -> element

  function shuffledCountries() {
    const arr = COUNTRIES.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function computeRadius(n) {
    const arenaArea = Math.PI * ARENA.radius * ARENA.radius;
    const r = Math.sqrt((arenaArea * 0.3) / (n * Math.PI));
    return Math.max(9, Math.min(34, r));
  }

  function placeFlags(list, radius) {
    const flags = [];
    for (const country of list) {
      let x, y, tries = 0, ok = false;
      do {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * (ARENA.radius - radius - 4);
        x = ARENA.cx + Math.cos(ang) * rad;
        y = ARENA.cy + Math.sin(ang) * rad;
        ok = true;
        for (let k = Math.max(0, flags.length - 40); k < flags.length; k++) {
          const f = flags[k];
          const d = Math.hypot(f.x - x, f.y - y);
          if (d < radius * 1.7) { ok = false; break; }
        }
        tries++;
      } while (!ok && tries < 25);
      const f = new Flag(country, x, y, radius);
      flags.push(f);
    }
    return flags;
  }

  function buildFlagGrid(flags) {
    dom.flagGrid.innerHTML = "";
    chipMap.clear();
    const frag = document.createDocumentFragment();
    for (const f of flags) {
      const el = document.createElement("div");
      el.className = "flag-chip";
      el.title = f.country.name;
      el.textContent = f.country.emoji;
      chipMap.set(f.iid, el);
      frag.appendChild(el);
    }
    dom.flagGrid.appendChild(frag);
  }

  function startTournament() {
    clearTimers();
    audio.unlock();
    document.body.classList.remove("final-mode");

    dom.idleOverlay.hidden = true;
    dom.championOverlay.hidden = true;
    dom.roundWinnerOverlay.hidden = true;
    dom.stageBanner.hidden = true;

    const n = Math.min(settings.flagCount, COUNTRIES.length);
    const radius = computeRadius(n);
    const chosen = shuffledCountries().slice(0, n);
    const flags = placeFlags(chosen, radius);
    flags.forEach((f) => (f.baseRadius = radius));
    world.setFlags(flags);
    world.rubberBand = 1;
    world.damageScale = COLLISION_SCALE[settings.collision];

    state.phase = "countdown";
    state.paused = false;
    state.stage = "QUALIFYING";
    state.round = 0;
    state.initialCount = n;
    state.activeCount = n;
    state.stageStartTime = performance.now();
    state.lastRoundTime = performance.now();
    state.tournamentStartTs = performance.now();
    state.finalsRecorded = false;
    state.tournamentSpotlight = new Map();
    state.recentEliminations = [];
    state.championDeclared = false;

    buildFlagGrid(flags);
    renderQualifiedList();
    updateHeaderStats();

    dom.btnStart.hidden = true;

    runCountdown(() => {
      state.phase = "battle";
      state.lastTs = null;
      audio.speak("Round one is starting. Three, two, one, go!");
    }, "Round 1 is starting.");
  }

  function runCountdown(onDone, introLine) {
    dom.countdownOverlay.hidden = false;
    const seq = introLine ? [3, 2, 1, "GO"] : [3, 2, 1, "GO"];
    let i = 0;
    if (introLine) audio.speak(introLine);
    const step = () => {
      if (i >= seq.length) {
        dom.countdownOverlay.hidden = true;
        onDone();
        return;
      }
      const val = seq[i];
      dom.countdownNum.textContent = val === "GO" ? "GO!" : val;
      dom.countdownNum.style.animation = "none";
      // reflow to restart animation
      void dom.countdownNum.offsetWidth;
      dom.countdownNum.style.animation = "";
      audio.countdownBeep(val === "GO");
      i++;
      later(step, 700);
    };
    step();
  }

  // ---------------------------------------------------------
  // Elimination / round / stage handling
  // ---------------------------------------------------------
  function handleElimination(victim, attacker) {
    state.activeCount = world.flags.reduce((acc, f) => acc + (f.eliminated ? 0 : 1), 0);
    const chip = chipMap.get(victim.iid);
    if (chip) chip.classList.add("eliminated");
    audio.elimination();
    spawnParticles(victim.x, victim.y, "elim", 10, 0.8);
    updateHeaderStats();

    state.recentEliminations.push(victim);
    if (state.recentEliminations.length > 4) state.recentEliminations.shift();

    const newStage = getStageForCount(state.activeCount);
    if (newStage !== state.stage) {
      transitionStage(newStage);
    }

    if (state.championDeclared) return;

    if (state.activeCount === 1) {
      const champ = world.flags.find((f) => !f.eliminated);
      if (champ) { state.championDeclared = true; later(() => triggerChampion(champ), 300); }
    } else if (state.activeCount <= 0) {
      // Extremely rare: the last two flags eliminated each other in the same
      // collision, leaving no survivor. Declare a tiebreak champion so the
      // tournament always ends cleanly instead of stalling forever.
      const pool = state.recentEliminations.slice(-2);
      const champ = pool[(Math.random() * pool.length) | 0] || victim;
      state.championDeclared = true;
      later(() => triggerChampion(champ), 300);
    }
  }

  function transitionStage(newStage) {
    if (state.stage === newStage) return;
    state.stage = newStage;
    state.stageStartTime = performance.now();
    world.rubberBand = 1;
    updateHeaderStats();
    audio.stageTransition();

    dom.stageBannerText.textContent = STAGE_TITLE[newStage].toUpperCase() + " STAGE";
    dom.stageBanner.hidden = false;
    dom.stageBanner.style.animation = "none";
    void dom.stageBanner.offsetWidth;
    dom.stageBanner.style.animation = "";
    later(() => { dom.stageBanner.hidden = true; }, 1650);

    const line = STAGE_ANNOUNCE[newStage];
    if (line) audio.speak(line);

    if (newStage === "FINAL") enterFinalSequence();
  }

  function enterFinalSequence() {
    const remaining = world.flags.filter((f) => !f.eliminated);
    remaining.forEach((f) => {
      const chip = chipMap.get(f.iid);
      if (chip) chip.classList.add("finalist");
      if (!state.finalsRecorded) recordAllTime(f.country, "finals");
    });
    state.finalsRecorded = true;
    document.body.classList.add("final-mode");
  }

  function maybeTickRound(nowTs) {
    const interval = 6500;
    if (nowTs - state.lastRoundTime < interval / state.speed) return;
    state.lastRoundTime = nowTs;

    let winner = null;
    let bestScore = -1;
    for (const f of world.flags) {
      if (f.eliminated) continue;
      const score = f.killsThisRound * 100 + f.damageThisRound;
      if (score > bestScore && (f.killsThisRound > 0 || f.damageThisRound > 25)) {
        bestScore = score;
        winner = f;
      }
    }
    for (const f of world.flags) { f.killsThisRound = 0; f.damageThisRound = 0; }
    if (!winner) return; // quiet window — skip silently, try again next tick

    state.round += 1;
    winner.roundWins += 1;
    recordAllTime(winner.country, "wins");
    renderLeaderboard(winner.country.code);

    const spot = state.tournamentSpotlight.get(winner.country.code) || { country: winner.country, wins: 0 };
    spot.wins += 1;
    state.tournamentSpotlight.set(winner.country.code, spot);
    renderQualifiedList();

    showRoundWinnerOverlay(winner);
    updateHeaderStats();
    audio.roundWinner();
    audio.speak(`The winner of round ${state.round} is ${winner.country.name}.`);

    const chip = chipMap.get(winner.iid);
    if (chip) {
      chip.classList.add("round-winner");
      later(() => chip.classList.remove("round-winner"), 2400);
    }
  }

  function showRoundWinnerOverlay(flag) {
    dom.rwRound.textContent = state.round;
    dom.rwFlag.textContent = flag.country.emoji;
    dom.rwName.textContent = flag.country.name;
    const frac = state.initialCount > 0 ? 1 - state.activeCount / state.initialCount : 0;
    dom.roundWinnerOverlay.style.setProperty("--rw-progress", frac);
    dom.roundWinnerOverlay.hidden = false;
    dom.roundWinnerOverlay.style.animation = "none";
    void dom.roundWinnerOverlay.offsetWidth;
    dom.roundWinnerOverlay.style.animation = "";
    later(() => { dom.roundWinnerOverlay.hidden = true; }, 2600);
  }

  function triggerChampion(champFlag) {
    state.phase = "champion";
    document.body.classList.remove("final-mode");
    stats.tournaments += 1;
    stats.championsCrowned += 1;
    persistStats();
    recordAllTime(champFlag.country, "titles");
    renderLeaderboard(champFlag.country.code);
    updateHeaderStats();

    const chip = chipMap.get(champFlag.iid);
    if (chip) { chip.classList.remove("eliminated"); chip.classList.add("champion-chip"); }

    dom.champFlag.textContent = champFlag.country.emoji;
    dom.champName.textContent = champFlag.country.name;
    dom.champSub.textContent = `Survived ${state.round} rounds across ${state.initialCount} nations.`;
    dom.champNext.textContent = settings.autoMode
      ? "Starting a new tournament shortly…"
      : "Auto Mode is off — press Restart to begin a new tournament.";
    dom.championOverlay.hidden = false;
    spawnConfetti();
    audio.champion();
    audio.speak(`The World Country Flag Battle Champion is ${champFlag.country.name}.`);

    later(() => {
      dom.championOverlay.hidden = true;
      if (settings.autoMode) {
        startTournament();
      } else {
        state.phase = "idle";
        dom.idleOverlay.hidden = false;
        dom.btnStart.hidden = false;
      }
    }, 7000);
  }

  function spawnConfetti() {
    dom.championParticles.innerHTML = "";
    const colors = ["#2bff9e", "#ffd24a", "#7ef1ff", "#ff4d5e", "#eafff2"];
    for (let i = 0; i < 90; i++) {
      const el = document.createElement("div");
      el.className = "confetti-piece";
      el.style.left = Math.random() * 100 + "%";
      el.style.background = colors[(Math.random() * colors.length) | 0];
      el.style.animationDuration = 2.2 + Math.random() * 2.2 + "s";
      el.style.animationDelay = Math.random() * 0.6 + "s";
      dom.championParticles.appendChild(el);
    }
  }

  // ---------------------------------------------------------
  // Rubber-band (prevents stalemates, esp. in 1v1 finals)
  // ---------------------------------------------------------
  function updateRubberBand(nowTs) {
    const elapsed = nowTs - state.stageStartTime;
    const threshold = 14000 / state.speed;
    if (elapsed > threshold) {
      world.rubberBand = Math.min(4, 1 + ((elapsed - threshold) / 4000) * 0.4);
    } else {
      world.rubberBand = 1;
    }
  }

  // ---------------------------------------------------------
  // UI: header stats / leaderboard / qualified list
  // ---------------------------------------------------------
  function updateHeaderStats() {
    dom.stageLabel.textContent = state.phase === "idle" ? "— Idle —" : STAGE_TITLE[state.stage];
    dom.roundLabel.textContent = state.round;
    dom.activeLabel.textContent = `${state.activeCount} / ${state.initialCount}`;
    dom.championsCountLabel.textContent = stats.championsCrowned;
    dom.flagGridCount.textContent = `${state.activeCount} / ${state.initialCount} FLAGS`;

    const stageName = state.phase === "idle" ? "Idle" : STAGE_TITLE[state.stage];
    dom.liveStatusLine.textContent = `${stageName} · ${dom.clockLabel.textContent}`;

    dom.flagsProgressLabel.textContent = `${state.activeCount} / ${state.initialCount} FLAGS`;
    const frac = state.initialCount > 0 ? 1 - state.activeCount / state.initialCount : 0;
    dom.flagsProgressFill.style.width = `${Math.max(0, Math.min(100, frac * 100))}%`;
  }

  function updateSessionClock() {
    if (state.phase === "idle") return;
    const elapsed = (performance.now() - state.tournamentStartTs) / 1000;
    const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const s = String(Math.floor(elapsed % 60)).padStart(2, "0");
    dom.clockLabel.textContent = `${m}:${s}`;
    const stageName = STAGE_TITLE[state.stage];
    dom.liveStatusLine.textContent = `${stageName} · ${m}:${s}`;
  }

  function renderQualifiedList() {
    const arr = Array.from(state.tournamentSpotlight.values()).sort((a, b) => b.wins - a.wins);
    dom.qualifiedList.innerHTML = "";
    if (arr.length === 0) {
      const li = document.createElement("li");
      li.className = "qualified-empty";
      li.textContent = "No spotlight winners yet — battle in progress.";
      dom.qualifiedList.appendChild(li);
      return;
    }
    arr.slice(0, 8).forEach((entry, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="q-rank">#${idx + 1}</span><span class="q-country"><span class="flag">${entry.country.emoji}</span>${entry.country.name}</span><span class="q-wins">${entry.wins} win${entry.wins > 1 ? "s" : ""}</span>`;
      dom.qualifiedList.appendChild(li);
    });
  }

  function renderLeaderboard(flashCode) {
    const rows = Object.entries(allTime)
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => b.wins - a.wins || b.titles - a.titles)
      .slice(0, 12);
    dom.leaderboardList.innerHTML = "";
    if (rows.length === 0) {
      const li = document.createElement("li");
      li.className = "lb-empty";
      li.textContent = "No data yet. Start a tournament!";
      dom.leaderboardList.appendChild(li);
      return;
    }
    rows.forEach((r, idx) => {
      const li = document.createElement("li");
      if (r.code === flashCode) li.classList.add("new-entry");
      li.innerHTML = `
        <span class="lb-rank">#${idx + 1}</span>
        <span class="lb-country">${r.emoji} ${r.name}</span>
        <span class="lb-wins">${r.wins}</span>
        <span class="lb-finals">${r.finals}</span>
        <span class="lb-titles">${r.titles}</span>`;
      dom.leaderboardList.appendChild(li);
    });
  }

  // ---------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------
  const ctx = dom.canvas.getContext("2d");
  function setupCanvasDPR() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    dom.canvas.width = 1000 * dpr;
    dom.canvas.height = 1000 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  setupCanvasDPR();

  let ambientT = 0;
  function drawArenaBackground(nowTs) {
    ctx.clearRect(0, 0, 1000, 1000);

    // outer glow ring
    const grd = ctx.createRadialGradient(ARENA.cx, ARENA.cy, ARENA.radius * 0.2, ARENA.cx, ARENA.cy, ARENA.radius * 1.05);
    grd.addColorStop(0, "rgba(16,40,28,0.9)");
    grd.addColorStop(1, "rgba(5,11,8,0.98)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(ARENA.cx, ARENA.cy, ARENA.radius + 20, 0, Math.PI * 2);
    ctx.fill();

    // tick marks
    ctx.save();
    ctx.translate(ARENA.cx, ARENA.cy);
    const finalMode = state.stage === "FINAL" && state.phase !== "idle";
    ctx.strokeStyle = finalMode ? "rgba(255,210,74,0.35)" : "rgba(43,255,158,0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const len = i % 4 === 0 ? 16 : 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (ARENA.radius - 2), Math.sin(a) * (ARENA.radius - 2));
      ctx.lineTo(Math.cos(a) * (ARENA.radius - 2 - len), Math.sin(a) * (ARENA.radius - 2 - len));
      ctx.stroke();
    }
    ctx.restore();

    // border ring
    ctx.beginPath();
    ctx.arc(ARENA.cx, ARENA.cy, ARENA.radius, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = finalMode ? "#ffd24a" : "#2bff9e";
    ctx.shadowColor = finalMode ? "rgba(255,210,74,0.65)" : "rgba(43,255,158,0.55)";
    ctx.shadowBlur = 22;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // progress arc showing tournament advancement
    if (state.initialCount > 0) {
      const frac = 1 - state.activeCount / state.initialCount;
      ctx.beginPath();
      ctx.arc(ARENA.cx, ARENA.cy, ARENA.radius + 10, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#ffd24a";
      ctx.shadowColor = "rgba(255,210,74,0.6)";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // gentle ambient particles drifting near the border (always-on atmosphere)
    ambientT += 0.006;
    ctx.fillStyle = "rgba(126,241,255,0.35)";
    for (let i = 0; i < 14; i++) {
      const a = ambientT * (0.3 + (i % 5) * 0.05) + i * 1.3;
      const rr = ARENA.radius - 10 - ((i * 37) % 60);
      const x = ARENA.cx + Math.cos(a) * rr;
      const y = ARENA.cy + Math.sin(a) * rr;
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFlags(nowTs) {
    const growthBase = state.initialCount > 0 ? 1 - state.activeCount / state.initialCount : 0;
    for (const f of world.flags) {
      if (f.eliminated) continue;

      const targetR = f.baseRadius * (1 + growthBase * 1.5);
      f.radius += (Math.min(targetR, 62) - f.radius) * 0.04;

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);

      const healthFrac = f.health / f.maxHealth;
      let ringColor = "#2bff9e";
      if (healthFrac < 0.3) ringColor = "#ff4d5e";
      else if (healthFrac < 0.6) ringColor = "#ffd24a";

      const recentlyHit = nowTs - f.hitFlashT < 150;

      // backdrop disc
      ctx.beginPath();
      ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#0c1712";
      ctx.fill();

      // health ring
      ctx.lineWidth = Math.max(1.5, f.radius * 0.14);
      ctx.strokeStyle = recentlyHit ? "#ffffff" : ringColor;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = recentlyHit ? 18 : 8;
      ctx.beginPath();
      ctx.arc(0, 0, f.radius - ctx.lineWidth / 2, 0, Math.PI * 2 * healthFrac);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // faint full-circle base ring
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(0, 0, f.radius - 1, 0, Math.PI * 2);
      ctx.stroke();

      // flag art: prefer a local PNG (assets/flags/<CODE>.png) if enabled and
      // loaded, otherwise fall back to the emoji flag — never breaks either way
      ctx.rotate(-f.rotation); // keep the artwork upright-ish, just a subtle bob
      const art = getFlagArt(f.country.code);
      if (USE_IMAGE_FLAGS && art.ready && !art.useEmoji && art.img) {
        const d = (f.radius - ctx.lineWidth) * 1.7;
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, f.radius - ctx.lineWidth, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(art.img, -d / 2, -d / 2, d, d);
        ctx.restore();
      } else {
        ctx.font = `${Math.floor(f.radius * 1.35)}px "Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(f.country.emoji, 0, 1);
      }

      ctx.restore();
    }
  }

  function draw(nowTs) {
    drawArenaBackground(nowTs);
    drawParticles();
    if (world.flags.length) drawFlags(nowTs);
  }

  // ---------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------
  function loop(ts) {
    requestAnimationFrame(loop);
    if (state.lastTs == null) state.lastTs = ts;
    let dtMs = ts - state.lastTs;
    state.lastTs = ts;
    dtMs = Math.min(dtMs, 50);

    if (!state.paused && state.phase === "battle") {
      const dt = (dtMs / 1000) * state.speed;
      world.step(dt);
      updateRubberBand(ts);
      maybeTickRound(ts);
      updateParticles(dt);
    } else {
      updateParticles(dtMs / 1000);
    }

    updateSessionClock();
    draw(ts);
  }
  requestAnimationFrame(loop);

  // ---------------------------------------------------------
  // Controls wiring
  // ---------------------------------------------------------
  dom.btnStart.addEventListener("click", () => {
    if (state.phase !== "idle") return;
    startTournament();
  });

  dom.btnPause.addEventListener("click", () => {
    if (state.phase === "idle") return;
    state.paused = true;
    dom.btnPause.hidden = true;
    dom.btnResume.hidden = false;
  });
  dom.btnResume.addEventListener("click", () => {
    state.paused = false;
    state.lastTs = null;
    dom.btnPause.hidden = false;
    dom.btnResume.hidden = true;
  });

  dom.btnRestart.addEventListener("click", () => {
    dom.btnPause.hidden = false;
    dom.btnResume.hidden = true;
    startTournament();
  });

  dom.btnFullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      dom.app.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  });

  dom.chkAuto.checked = settings.autoMode;
  dom.chkSound.checked = settings.soundOn;
  dom.chkVoice.checked = settings.voiceOn;
  dom.chkMusic.checked = settings.musicOn;
  dom.rangeVolume.value = settings.volume;

  dom.chkAuto.addEventListener("change", () => { settings.autoMode = dom.chkAuto.checked; persistSettings(); });
  dom.chkSound.addEventListener("change", () => { settings.soundOn = dom.chkSound.checked; audio.soundOn = settings.soundOn; persistSettings(); });
  dom.chkVoice.addEventListener("change", () => { settings.voiceOn = dom.chkVoice.checked; audio.voiceOn = settings.voiceOn; persistSettings(); });
  dom.chkMusic.addEventListener("change", () => { settings.musicOn = dom.chkMusic.checked; audio.musicOn = settings.musicOn; persistSettings(); });
  dom.rangeVolume.addEventListener("input", () => {
    settings.volume = Number(dom.rangeVolume.value);
    audio.setVolume(settings.volume / 100);
    persistSettings();
  });

  function setSpeed(v) {
    state.speed = v;
    settings.speedDefault = v;
    persistSettings();
    [dom.spd1, dom.spd2, dom.spd4].forEach((b) => b.classList.remove("active"));
    ({ 1: dom.spd1, 2: dom.spd2, 4: dom.spd4 }[v]).classList.add("active");
  }
  dom.spd1.addEventListener("click", () => setSpeed(1));
  dom.spd2.addEventListener("click", () => setSpeed(2));
  dom.spd4.addEventListener("click", () => setSpeed(4));
  setSpeed(settings.speedDefault);

  dom.btnSettings.addEventListener("click", () => { dom.settingsBackdrop.hidden = false; });
  dom.btnCloseSettings.addEventListener("click", () => { dom.settingsBackdrop.hidden = true; });
  dom.settingsBackdrop.addEventListener("click", (e) => { if (e.target === dom.settingsBackdrop) dom.settingsBackdrop.hidden = true; });

  dom.selFlagCount.value = String(settings.flagCount);
  dom.selCollision.value = settings.collision;
  dom.selSpeedDefault.value = String(settings.speedDefault);

  dom.btnApplySettings.addEventListener("click", () => {
    settings.flagCount = Number(dom.selFlagCount.value);
    settings.collision = dom.selCollision.value;
    world.damageScale = COLLISION_SCALE[settings.collision];
    setSpeed(Number(dom.selSpeedDefault.value));
    persistSettings();
    dom.settingsBackdrop.hidden = true;
  });

  // Initial leaderboard paint (from persisted all-time data, if any)
  renderLeaderboard(null);
  updateHeaderStats();
})();
