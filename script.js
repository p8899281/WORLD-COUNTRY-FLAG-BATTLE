(() => {
  const $ = (s) => document.querySelector(s);
  const canvas = $("#arena");
  const ctx = canvas.getContext("2d");

  const els = {
    stageText: $("#stageText"), roundText: $("#roundText"), activeText: $("#activeText"),
    announcement: $("#announcement"), overlayStage: $("#overlayStage"), overlayWinner: $("#overlayWinner"),
    winnerName: $("#winnerName"), winnerFlag: $("#winnerFlag"), flagGrid: $("#flagGrid"),
    leaderboardList: $("#leaderboardList"), trackerCount: $("#trackerCount"),
    startBtn: $("#startBtn"), pauseBtn: $("#pauseBtn"), resumeBtn: $("#resumeBtn"), restartBtn: $("#restartBtn"), fsBtn: $("#fsBtn"),
    autoMode: $("#autoMode"), soundOn: $("#soundOn"), voiceOn: $("#voiceOn"), musicOn: $("#musicOn"),
    volume: $("#volume"), volumeVal: $("#volumeVal"), speedVal: $("#speedVal"), speedLabel: $("#speedLabel"), autoLabel: $("#autoLabel"),
    flagCount: $("#flagCount"), battleSpeed: $("#battleSpeed"), collisionIntensity: $("#collisionIntensity"),
    speedBtns: [...document.querySelectorAll(".speedBtn")]
  };

  const COUNTRY_DATA = [
    ["AF","Afghanistan","🇦🇫"],["AL","Albania","🇦🇱"],["DZ","Algeria","🇩🇿"],["AD","Andorra","🇦🇩"],["AO","Angola","🇦🇴"],
    ["AR","Argentina","🇦🇷"],["AM","Armenia","🇦🇲"],["AU","Australia","🇦🇺"],["AT","Austria","🇦🇹"],["AZ","Azerbaijan","🇦🇿"],
    ["BS","Bahamas","🇧🇸"],["BH","Bahrain","🇧🇭"],["BD","Bangladesh","🇧🇩"],["BB","Barbados","🇧🇧"],["BY","Belarus","🇧🇾"],
    ["BE","Belgium","🇧🇪"],["BZ","Belize","🇧🇿"],["BJ","Benin","🇧🇯"],["BT","Bhutan","🇧🇹"],["BO","Bolivia","🇧🇴"],
    ["BA","Bosnia and Herzegovina","🇧🇦"],["BW","Botswana","🇧🇼"],["BR","Brazil","🇧🇷"],["BN","Brunei","🇧🇳"],["BG","Bulgaria","🇧🇬"],
    ["BF","Burkina Faso","🇧🇫"],["BI","Burundi","🇧🇮"],["KH","Cambodia","🇰🇭"],["CM","Cameroon","🇨🇲"],["CA","Canada","🇨🇦"],
    ["CV","Cape Verde","🇨🇻"],["CF","Central African Republic","🇨🇫"],["TD","Chad","🇹🇩"],["CL","Chile","🇨🇱"],["CN","China","🇨🇳"],
    ["CO","Colombia","🇨🇴"],["KM","Comoros","🇰🇲"],["CR","Costa Rica","🇨🇷"],["HR","Croatia","🇭🇷"],["CU","Cuba","🇨🇺"],
    ["CY","Cyprus","🇨🇾"],["CZ","Czechia","🇨🇿"],["DK","Denmark","🇩🇰"],["DJ","Djibouti","🇩🇯"],["DM","Dominica","🇩🇲"],
    ["DO","Dominican Republic","🇩🇴"],["EC","Ecuador","🇪🇨"],["EG","Egypt","🇪🇬"],["SV","El Salvador","🇸🇻"],["GQ","Equatorial Guinea","🇬🇶"],
    ["ER","Eritrea","🇪🇷"],["EE","Estonia","🇪🇪"],["ET","Ethiopia","🇪🇹"],["FJ","Fiji","🇫🇯"],["FI","Finland","🇫🇮"],
    ["FR","France","🇫🇷"],["GA","Gabon","🇬🇦"],["GM","Gambia","🇬🇲"],["GE","Georgia","🇬🇪"],["DE","Germany","🇩🇪"],
    ["GH","Ghana","🇬🇭"],["GR","Greece","🇬🇷"],["GT","Guatemala","🇬🇹"],["GN","Guinea","🇬🇳"],["GW","Guinea-Bissau","🇬🇼"],
    ["GY","Guyana","🇬🇾"],["HT","Haiti","🇭🇹"],["HN","Honduras","🇭🇳"],["HU","Hungary","🇭🇺"],["IS","Iceland","🇮🇸"],
    ["IN","India","🇮🇳"],["ID","Indonesia","🇮🇩"],["IR","Iran","🇮🇷"],["IQ","Iraq","🇮🇶"],["IE","Ireland","🇮🇪"],
    ["IL","Israel","🇮🇱"],["IT","Italy","🇮🇹"],["JM","Jamaica","🇯🇲"],["JP","Japan","🇯🇵"],["JO","Jordan","🇯🇴"],
    ["KZ","Kazakhstan","🇰🇿"],["KE","Kenya","🇰🇪"],["KI","Kiribati","🇰🇮"],["KW","Kuwait","🇰🇼"],["KG","Kyrgyzstan","🇰🇬"],
    ["LA","Laos","🇱🇦"],["LV","Latvia","🇱🇻"],["LB","Lebanon","🇱🇧"],["LS","Lesotho","🇱🇸"],["LR","Liberia","🇱🇷"],
    ["LY","Libya","🇱🇾"],["LT","Lithuania","🇱🇹"],["LU","Luxembourg","🇱🇺"],["MG","Madagascar","🇲🇬"],["MW","Malawi","🇲🇼"],
    ["MY","Malaysia","🇲🇾"],["MV","Maldives","🇲🇻"],["ML","Mali","🇲🇱"],["MT","Malta","🇲🇹"],["MR","Mauritania","🇲🇷"],
    ["MU","Mauritius","🇲🇺"],["MX","Mexico","🇲🇽"],["MD","Moldova","🇲🇩"],["MC","Monaco","🇲🇨"],["MN","Mongolia","🇲🇳"],
    ["ME","Montenegro","🇲🇪"],["MA","Morocco","🇲🇦"],["MZ","Mozambique","🇲🇿"],["MM","Myanmar","🇲🇲"],["NA","Namibia","🇳🇦"],
    ["NP","Nepal","🇳🇵"],["NL","Netherlands","🇳🇱"],["NZ","New Zealand","🇳🇿"],["NI","Nicaragua","🇳🇮"],["NE","Niger","🇳🇪"],
    ["NG","Nigeria","🇳🇬"],["KP","North Korea","🇰🇵"],["MK","North Macedonia","🇲🇰"],["NO","Norway","🇳🇴"],["OM","Oman","🇴🇲"],
    ["PK","Pakistan","🇵🇰"],["PA","Panama","🇵🇦"],["PG","Papua New Guinea","🇵🇬"],["PY","Paraguay","🇵🇾"],["PE","Peru","🇵🇪"],
    ["PH","Philippines","🇵🇭"],["PL","Poland","🇵🇱"],["PT","Portugal","🇵🇹"],["QA","Qatar","🇶🇦"],["RO","Romania","🇷🇴"],["RU","Russia","🇷🇺"]
  ];

  // Preload Flag Images for Canvas Rendering
  const flagImages = {};
  COUNTRY_DATA.forEach(([id]) => {
    const img = new Image();
    img.src = `https://flagcdn.com/w80/${id.toLowerCase()}.png`;
    flagImages[id] = img;
  });

  const STORAGE_KEY = "wcfb_settings_v1";
  const STORAGE_STATS = "wcfb_stats_v1";

  const settings = {
    flagCount: 250,
    battleSpeed: "normal",
    collisionIntensity: "normal",
    autoMode: true,
    soundOn: true,
    voiceOn: true,
    musicOn: true,
    volume: 0.7,
    speed: 1
  };

  let audioCtx = null, masterGain = null, musicOsc = null, musicGain = null, unlockedAudio = false;
  let autoTimer = null;
  const stats = JSON.parse(localStorage.getItem(STORAGE_STATS) || "{}");
  for (const c of COUNTRY_DATA) stats[c[1]] ??= { wins: 0, finals: 0, champs: 0 };

  const state = {
    running: false, paused: false, inBattle: false, tournamentOver: false,
    stage: "QUALIFYING", round: 1, winner: null, targetCount: 128,
    flags: [], active: [], eliminated: [], particles: [], shake: 0,
    lastTime: 0, countdown: 0, phase: "idle", nextActionAt: 0
  };

  const arena = { x: 0, y: 0, r: 0, w: 0, h: 0 };
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => performance.now();

  function saveSettings() { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
  function loadSettings() {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    Object.assign(settings, s);
    syncUI();
  }

  function syncUI() {
    els.autoMode.checked = settings.autoMode;
    els.soundOn.checked = settings.soundOn;
    els.voiceOn.checked = settings.voiceOn;
    els.musicOn.checked = settings.musicOn;
    els.volume.value = Math.round(settings.volume * 100);
    els.volumeVal.textContent = `${Math.round(settings.volume * 100)}%`;
    els.speedVal.textContent = `×${settings.speed}`;
    els.speedLabel.textContent = `×${settings.speed}`;
    els.autoLabel.textContent = settings.autoMode ? "AUTO ON" : "AUTO OFF";
    els.flagCount.value = String(settings.flagCount);
    els.battleSpeed.value = settings.battleSpeed;
    els.collisionIntensity.value = settings.collisionIntensity;
    els.speedBtns.forEach(b => b.classList.toggle("active", Number(b.dataset.speed) === settings.speed));
  }

  function unlockAudio() {
    if (unlockedAudio) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
      musicGain = audioCtx.createGain();
      musicGain.connect(masterGain);
      masterGain.gain.value = settings.volume;
      musicGain.gain.value = settings.musicOn ? 0.035 : 0;
      unlockedAudio = true;
    } catch { unlockedAudio = false; }
  }

  function tone(freq, dur, type = "sine", gain = 0.08, when = 0) {
    if (!audioCtx || !settings.soundOn) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime + when);
    g.gain.exponentialRampToValueAtTime(gain, audioCtx.currentTime + when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + when + dur);
    o.connect(g); g.connect(masterGain);
    o.start(audioCtx.currentTime + when); o.stop(audioCtx.currentTime + when + dur + 0.02);
  }

  let impactThrottle = 0, wallThrottle = 0;
  function collisionSound(intensity = 1) {
    const t = now();
    if (t - impactThrottle < 25) return;
    impactThrottle = t;
    const vol = clamp(0.02 + intensity * 0.05 * settings.volume, 0.02, 0.1);
    tone(170 + intensity * 100, 0.04, "triangle", vol);
  }
  function wallSound(intensity = 1) {
    const t = now();
    if (t - wallThrottle < 30) return;
    wallThrottle = t;
    tone(260 + intensity * 60, 0.03, "sine", 0.03);
  }
  function eliminationSound() { tone(320, 0.05, "square", 0.04); }
  function roundSound() { tone(523, 0.08, "triangle", 0.06); tone(659, 0.08, "triangle", 0.06, 0.08); }
  function victorySound(final = false) {
    tone(523, 0.12, "triangle", 0.08); tone(659, 0.12, "triangle", 0.08, 0.12); tone(784, 0.18, "triangle", 0.1, 0.22);
    if (final) tone(1046, 0.25, "sine", 0.12, 0.35);
  }

  function announce(text) {
    els.announcement.textContent = text;
    if (settings.voiceOn && "speechSynthesis" in window) {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, " "));
        u.rate = 1.05; u.pitch = 1.05; u.volume = settings.volume;
        speechSynthesis.speak(u);
      } catch {}
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    arena.w = rect.width; arena.h = rect.height; arena.x = rect.width / 2; arena.y = rect.height / 2; arena.r = Math.min(rect.width, rect.height) * 0.41;
  }

  function getStageInfo(activeCount) {
    if (activeCount > 128) return { stage: "QUALIFYING", target: 128 };
    if (activeCount > 64) return { stage: "KNOCKOUT", target: 64 };
    if (activeCount > 16) return { stage: "QUARTER FINAL", target: 16 };
    if (activeCount > 2) return { stage: "SEMI FINAL", target: 2 };
    return { stage: "FINAL", target: 1 };
  }

  function createFlags() {
    const count = settings.flagCount;
    const pool = [...COUNTRY_DATA].sort(() => Math.random() - 0.5).slice(0, Math.min(count, COUNTRY_DATA.length));
    state.flags = pool.map(([id, name, flag]) => {
      const a = Math.random() * Math.PI * 2, rr = rand(0, arena.r * 0.7);
      return {
        id, name, flag, x: arena.x + Math.cos(a) * rr, y: arena.y + Math.sin(a) * rr,
        vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), r: 12, hp: 100, active: true,
        angle: Math.random() * Math.PI * 2, spin: rand(-0.02, 0.02)
      };
    });
    state.active = state.flags.slice();
    state.eliminated = [];
    updateGrid(); updateLeaderboard();
  }

  function updateGrid() {
    els.flagGrid.innerHTML = "";
    for (const f of state.flags) {
      const d = document.createElement("div");
      d.className = "flag-cell active"; d.textContent = f.flag; d.title = f.name;
      d.dataset.id = f.id;
      els.flagGrid.appendChild(d);
    }
    syncGrid();
  }

  function syncGrid() {
    els.trackerCount.textContent = `${state.active.length} / ${state.flags.length} FLAGS`;
    els.activeText.textContent = String(state.active.length);
    els.roundText.textContent = String(state.round);
    els.stageText.textContent = state.stage;
    document.querySelectorAll(".flag-cell").forEach(el => {
      const f = state.flags.find(x => x.id === el.dataset.id);
      if (!f) return;
      el.classList.toggle("elim", !f.active);
      el.classList.toggle("winner", state.winner?.id === f.id);
      el.classList.toggle("active", f.active);
    });
  }

  function updateLeaderboard() {
    const arr = Object.entries(stats).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.champs - a.champs || b.wins - a.wins);
    els.leaderboardList.innerHTML = arr.slice(0, 12).map((x, i) => `<div class="lb-row"><div class="lb-rank">#${i + 1}</div><div class="lb-name">${x.name}</div><div class="lb-wins">${x.champs} Wins</div></div>`).join("");
  }

  function startTournament() {
    if (autoTimer) clearTimeout(autoTimer);
    state.running = true; state.paused = false; state.tournamentOver = false; state.round = 1; state.winner = null;
    createFlags();
    const info = getStageInfo(state.active.length);
    state.stage = info.stage; state.targetCount = info.target;
    announce(`Tournament started! Stage: ${state.stage}`);
    state.phase = "countdown"; state.countdown = 3; state.nextActionAt = now() + 700;
    els.overlayWinner.classList.add("hidden"); els.overlayStage.classList.remove("hidden"); els.overlayStage.textContent = `${state.stage}\nROUND ${state.round}`;
    roundSound(); syncGrid(); syncUIOnly();
  }

  function syncUIOnly() {
    els.stageText.textContent = state.stage;
    els.roundText.textContent = String(state.round);
    els.activeText.textContent = String(state.active.length);
    els.speedLabel.textContent = `×${settings.speed}`;
    els.autoLabel.textContent = settings.autoMode ? "AUTO ON" : "AUTO OFF";
  }

  function beginBattle() {
    state.inBattle = true; state.phase = "battle"; els.overlayStage.classList.add("hidden");
    announce(`3... 2... 1... Battle!`);
    roundSound();
  }

  function eliminateFlag(flag) {
    if (!flag.active) return;
    flag.active = false;
    state.active = state.active.filter(f => f.active);
    state.eliminated.push(flag);
    eliminationSound();
  }

  function checkRoundOrTournamentEnd() {
    if (state.active.length <= state.targetCount || state.active.length <= 1) {
      state.inBattle = false;
      state.phase = "winner";

      if (state.active.length === 1) {
        state.winner = state.active[0];
        stats[state.winner.name].champs++;
        stats[state.winner.name].wins++;
        updateLeaderboard();
        announce(`CHAMPION! ${state.winner.name} wins the World Flag Battle!`);
        victorySound(true);
        els.overlayWinner.classList.remove("hidden");
        els.winnerName.textContent = state.winner.name;
        els.winnerFlag.textContent = state.winner.flag;
      } else {
        announce(`Round ${state.round} Complete! ${state.active.length} flags qualify.`);
        victorySound(false);
      }
      state.nextActionAt = now() + (state.active.length === 1 ? 4000 : 2000);
    }
  }

  function nextRoundOrFinish() {
    if (state.active.length <= 1) {
      state.tournamentOver = true;
      if (settings.autoMode) {
        autoTimer = setTimeout(() => { els.overlayWinner.classList.add("hidden"); startTournament(); }, 6000);
      }
      return;
    }

    state.round++;
    const info = getStageInfo(state.active.length);
    state.stage = info.stage; state.targetCount = info.target;

    // Reset HP & Reposition survivors in Arena
    state.active.forEach(f => {
      f.hp = 100;
      const a = Math.random() * Math.PI * 2, rr = rand(0, arena.r * 0.7);
      f.x = arena.x + Math.cos(a) * rr;
      f.y = arena.y + Math.sin(a) * rr;
      f.vx = rand(-1.5, 1.5); f.vy = rand(-1.5, 1.5);
    });

    syncGrid(); syncUIOnly();
    els.overlayStage.textContent = `${state.stage}\nROUND ${state.round}`;
    els.overlayStage.classList.remove("hidden");
    announce(`${state.stage} - Round ${state.round}`);
    state.phase = "countdown"; state.countdown = 3; state.nextActionAt = now() + 800;
    roundSound();
  }

  function simulate(dt) {
    if (state.paused || !state.running) return;

    if (state.phase === "countdown" && now() >= state.nextActionAt) {
      if (state.countdown > 1) {
        state.countdown--; state.nextActionAt = now() + 800;
        els.overlayStage.textContent = `${state.stage}\n${state.countdown}`;
      } else beginBattle();
    } else if (state.phase === "winner" && now() >= state.nextActionAt) {
      els.overlayWinner.classList.add("hidden");
      nextRoundOrFinish();
    }

    if (!state.inBattle) return;

    const speedFactor = settings.speed * ({slow:0.8, normal:1, fast:1.3}[settings.battleSpeed] || 1) * dt * 0.06;

    for (const f of state.active) {
      f.x += f.vx * speedFactor * 4;
      f.y += f.vy * speedFactor * 4;
      f.angle += f.spin;

      const dx = f.x - arena.x, dy = f.y - arena.y, dist = Math.hypot(dx, dy);
      const limit = arena.r - f.r - 2;
      if (dist > limit) {
        const nx = dx / dist, ny = dy / dist;
        f.x = arena.x + nx * limit; f.y = arena.y + ny * limit;
        const dot = f.vx * nx + f.vy * ny;
        f.vx -= 1.8 * dot * nx; f.vy -= 1.8 * dot * ny;
        wallSound(Math.abs(dot));
      }
    }

    // Collision Detection & Balanced Damage
    for (let i = 0; i < state.active.length; i++) {
      for (let j = i + 1; j < state.active.length; j++) {
        const a = state.active[i], b = state.active[j];
        const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 0.001;
        const minD = a.r + b.r;
        if (dist < minD) {
          const nx = dx / dist, ny = dy / dist;
          const overlap = minD - dist;
          a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;

          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          const impulse = -rel * 0.9;
          a.vx -= impulse * nx; a.vy -= impulse * ny;
          b.vx += impulse * nx; b.vy += impulse * ny;

          const inten = Math.abs(rel);
          collisionSound(inten);
          if (inten > 0.5) {
            a.hp -= inten * 0.45; b.hp -= inten * 0.45; // Balanced HP Drain
          }
        }
      }
    }

    for (const f of [...state.active]) {
      if (f.hp <= 0) eliminateFlag(f);
    }

    checkRoundOrTournamentEnd();
  }

  function drawArena() {
    ctx.clearRect(0, 0, arena.w, arena.h);
    
    // Background Ring
    const g = ctx.createRadialGradient(arena.x, arena.y, arena.r * 0.1, arena.x, arena.y, arena.r * 1.05);
    g.addColorStop(0, "rgba(4,32,21,.35)"); g.addColorStop(1, "rgba(0,0,0,.95)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, arena.w, arena.h);

    ctx.save();
    ctx.shadowColor = "#20d69c"; ctx.shadowBlur = 15;
    ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(arena.x, arena.y, arena.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Render Flags
    for (const f of state.flags) {
      if (!f.active) continue;
      ctx.save();
      ctx.translate(f.x, f.y); ctx.rotate(f.angle);

      const img = flagImages[f.id];
      if (img && img.complete && img.naturalWidth !== 0) {
        ctx.beginPath();
        ctx.arc(0, 0, f.r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, -f.r, -f.r, f.r * 2, f.r * 2);
        ctx.lineWidth = 1.5; ctx.strokeStyle = "#ffffff"; ctx.stroke();
      } else {
        ctx.font = `${f.r * 1.6}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(f.flag, 0, 0);
      }
      ctx.restore();
    }
  }

  function loop(t) {
    const dt = Math.min(32, t - state.lastTime || 16);
    state.lastTime = t;
    simulate(dt);
    drawArena();
    syncGrid();
    requestAnimationFrame(loop);
  }

  function setSpeed(s) { settings.speed = s; syncUI(); saveSettings(); }
  function applySettingsFromUI() {
    settings.autoMode = els.autoMode.checked;
    settings.soundOn = els.soundOn.checked;
    settings.voiceOn = els.voiceOn.checked;
    settings.musicOn = els.musicOn.checked;
    settings.volume = Number(els.volume.value) / 100;
    settings.flagCount = Number(els.flagCount.value);
    settings.battleSpeed = els.battleSpeed.value;
    settings.collisionIntensity = els.collisionIntensity.value;
    if (masterGain) masterGain.gain.value = settings.volume;
    syncUI(); saveSettings();
  }

  els.startBtn.onclick = () => { unlockAudio(); if (audioCtx?.state === "suspended") audioCtx.resume(); startTournament(); };
  els.pauseBtn.onclick = () => { state.paused = true; };
  els.resumeBtn.onclick = () => { state.paused = false; };
  els.restartBtn.onclick = () => startTournament();
  els.fsBtn.onclick = async () => {
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch {}
  };

  [els.autoMode, els.soundOn, els.voiceOn, els.musicOn, els.volume, els.flagCount, els.battleSpeed, els.collisionIntensity].forEach(el => el.addEventListener("change", applySettingsFromUI));
  els.volume.addEventListener("input", () => { els.volumeVal.textContent = `${els.volume.value}%`; applySettingsFromUI(); });
  els.speedBtns.forEach(btn => btn.onclick = () => { els.speedBtns.forEach(b => b.classList.remove("active")); btn.classList.add("active"); setSpeed(Number(btn.dataset.speed)); });

  window.addEventListener("resize", resize);
  loadSettings(); resize(); syncUI(); updateLeaderboard(); requestAnimationFrame(loop);
})();
