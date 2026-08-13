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
    ["PH","Philippines","🇵🇭"],["PL","Poland","🇵🇱"],["PT","Portugal","🇵🇹"],["QA","Qatar","🇶🇦"],["RO","Romania","🇷🇴"],
    ["RU","Russia","🇷🇺"],["RW","Rwanda","🇷🇼"],["SA","Saudi Arabia","🇸🇦"],["SN","Senegal","🇸🇳"],["RS","Serbia","🇷🇸"],
    ["SC","Seychelles","🇸🇨"],["SL","Sierra Leone","🇸🇱"],["SG","Singapore","🇸🇬"],["SK","Slovakia","🇸🇰"],["SI","Slovenia","🇸🇮"],
    ["SB","Solomon Islands","🇸🇧"],["SO","Somalia","🇸🇴"],["ZA","South Africa","🇿🇦"],["KR","South Korea","🇰🇷"],["ES","Spain","🇪🇸"],
    ["LK","Sri Lanka","🇱🇰"],["SD","Sudan","🇸🇩"],["SR","Suriname","🇸🇷"],["SZ","Eswatini","🇸🇿"],["SE","Sweden","🇸🇪"],
    ["CH","Switzerland","🇨🇭"],["SY","Syria","🇸🇾"],["TW","Taiwan","🇹🇼"],["TJ","Tajikistan","🇹🇯"],["TZ","Tanzania","🇹🇿"],
    ["TH","Thailand","🇹🇭"],["TL","Timor-Leste","🇹🇱"],["TG","Togo","🇹🇬"],["TO","Tonga","🇹🇴"],["TT","Trinidad and Tobago","🇹🇹"],
    ["TN","Tunisia","🇹🇳"],["TR","Turkey","🇹🇷"],["TM","Turkmenistan","🇹🇲"],["UG","Uganda","🇺🇬"],["UA","Ukraine","🇺🇦"],
    ["AE","United Arab Emirates","🇦🇪"],["GB","United Kingdom","🇬🇧"],["US","United States","🇺🇸"],["UY","Uruguay","🇺🇾"],["UZ","Uzbekistan","🇺🇿"],
    ["VU","Vanuatu","🇻🇺"],["VE","Venezuela","🇻🇪"],["VN","Vietnam","🇻🇳"],["YE","Yemen","🇾🇪"],["ZM","Zambia","🇿🇲"],["ZW","Zimbabwe","🇿🇼"],
    ["WS","Samoa","🇼🇸"],["BB","Barbados","🇧🇧"],["PR","Puerto Rico","🇵🇷"],["PS","Palestine","🇵🇸"],["XK","Kosovo","🇽🇰"],
    ["HK","Hong Kong","🇭🇰"],["MO","Macao","🇲🇴"],["GL","Greenland","🇬🇱"],["FO","Faroe Islands","🇫🇴"],["GI","Gibraltar","🇬🇮"],
    ["CW","Curaçao","🇨🇼"],["AW","Aruba","🇦🇼"],["BM","Bermuda","🇧🇲"],["KY","Cayman Islands","🇰🇾"],["GG","Guernsey","🇬🇬"],
    ["JE","Jersey","🇯🇪"],["IM","Isle of Man","🇮🇲"],["SX","Sint Maarten","🇸🇽"],["AI","Anguilla","🇦🇮"],["VG","British Virgin Islands","🇻🇬"],
    ["VI","U.S. Virgin Islands","🇻🇮"],["TC","Turks and Caicos Islands","🇹🇨"],["CC","Cocos (Keeling) Islands","🇨🇨"],["CK","Cook Islands","🇨🇰"],
    ["NU","Niue","🇳🇺"],["PN","Pitcairn Islands","🇵🇳"],["TK","Tokelau","🇹🇰"],["FM","Micronesia","🇫🇲"],["MH","Marshall Islands","🇲🇭"],
    ["PW","Palau","🇵🇼"],["NR","Nauru","🇳🇷"],["AQ","Antarctica","🇦🇶"]
  ];

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
  const stats = JSON.parse(localStorage.getItem(STORAGE_STATS) || "{}");
  for (const c of COUNTRY_DATA) stats[c[1]] ??= { wins: 0, finals: 0, champs: 0 };

  const state = {
    running: false, paused: false, inBattle: false, tournamentOver: false,
    stage: "QUALIFYING", round: 1, totalRounds: 0, winner: null,
    flags: [], active: [], eliminated: [], particles: [], shake: 0, zoom: 1,
    lastTime: 0, countdown: 0, phase: "idle", nextActionAt: 0, bracketSize: 0
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

  function noiseBurst(dur, gain = 0.06) {
    if (!audioCtx || !settings.soundOn) return;
    const len = audioCtx.sampleRate * dur, buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audioCtx.createBufferSource(); src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 900;
    const g = audioCtx.createGain(); g.gain.value = gain;
    src.connect(filter); filter.connect(g); g.connect(masterGain); src.start();
  }

  let impactThrottle = 0, wallThrottle = 0;
  function collisionSound(intensity = 1) {
    const t = now();
    if (t - impactThrottle < 20) return;
    impactThrottle = t;
    const vol = clamp(0.02 + intensity * 0.08 * settings.volume, 0.02, 0.12);
    tone(170 + intensity * 120, 0.04 + intensity * 0.02, "triangle", vol);
    tone(95 + intensity * 45, 0.05, "sine", vol * 0.6);
  }
  function wallSound(intensity = 1) {
    const t = now();
    if (t - wallThrottle < 25) return;
    wallThrottle = t;
    tone(280 + intensity * 80, 0.03, "sine", 0.03 + intensity * 0.03);
  }
  function eliminationSound() { tone(320, 0.06, "square", 0.06); tone(220, 0.1, "sawtooth", 0.04, 0.06); }
  function roundSound() { tone(523, 0.08, "triangle", 0.06); tone(659, 0.08, "triangle", 0.06, 0.08); tone(784, 0.1, "triangle", 0.06, 0.16); }
  function victorySound(final = false) {
    tone(523, 0.12, "triangle", 0.08); tone(659, 0.12, "triangle", 0.08, 0.12); tone(784, 0.18, "triangle", 0.1, 0.22);
    if (final) { tone(1046, 0.22, "sine", 0.12, 0.42); noiseBurst(0.22, 0.04); }
  }

  function startMusic() {
    if (!audioCtx || !settings.musicOn) return;
    stopMusic();
    musicOsc = audioCtx.createOscillator();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 12;
    lfo.connect(lfoGain); lfoGain.connect(musicOsc.frequency);
    musicGain.gain.value = 0.03;
    musicOsc.type = "sine";
    musicOsc.frequency.value = 55;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 380;
    musicOsc.connect(filter); filter.connect(musicGain);
    musicOsc.start(); lfo.start();
    musicOsc._lfo = lfo;
  }
  function stopMusic() {
    try { if (musicOsc) { musicOsc.stop(); musicOsc._lfo?.stop(); } } catch {}
    musicOsc = null;
  }

  function announce(text) {
    els.announcement.textContent = text;
    if (settings.voiceOn && "speechSynthesis" in window) {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, " "));
        u.rate = 1.02; u.pitch = 1.05; u.volume = settings.volume;
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

  function createFlags() {
    const count = settings.flagCount;
    const pool = [...COUNTRY_DATA].sort(() => Math.random() - 0.5).slice(0, Math.min(count, COUNTRY_DATA.length));
    state.flags = pool.map(([id, name, flag], i) => {
      const a = Math.random() * Math.PI * 2, rr = rand(0, arena.r * 0.7);
      return {
        id, name, flag, x: arena.x + Math.cos(a) * rr, y: arena.y + Math.sin(a) * rr,
        vx: rand(-1.8, 1.8), vy: rand(-1.8, 1.8), r: 10 + Math.random() * 3,
        hp: 100, active: true, elimAt: 0, angle: Math.random() * Math.PI * 2, spin: rand(-0.03, 0.03),
        trail: [], lastHit: 0
      };
    });
    state.active = state.flags.slice();
    state.eliminated = [];
    state.bracketSize = state.active.length;
    state.totalRounds = Math.max(1, Math.ceil(Math.log2(state.active.length)));
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
      el.classList.toggle("finalist", state.stage === "FINAL" && f.active);
      el.classList.toggle("winner", state.winner?.id === f.id);
      el.classList.toggle("active", f.active);
    });
  }

  function updateLeaderboard() {
    const arr = Object.entries(stats).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.wins - a.wins || b.champs - a.champs || b.finals - a.finals);
    els.leaderboardList.innerHTML = arr.slice(0, 12).map((x, i) => `<div class="lb-row"><div class="lb-rank">#${i + 1}</div><div class="lb-name">${x.name}</div><div class="lb-wins">${x.wins} wins</div></div>`).join("");
  }

  function stageForRound(activeCount) {
    if (activeCount > 128) return "QUALIFYING";
    if (activeCount > 64) return "KNOCKOUT";
    if (activeCount > 16) return "QUARTER FINAL";
    if (activeCount > 2) return "SEMI FINAL";
    return "FINAL";
  }

  function startTournament() {
    state.running = true; state.paused = false; state.tournamentOver = false; state.round = 1; state.winner = null;
    createFlags();
    state.stage = stageForRound(state.active.length);
    announce(`Round 1 is starting.`);
    state.phase = "countdown"; state.countdown = 3; state.nextActionAt = now() + 700;
    els.overlayWinner.classList.add("hidden"); els.overlayStage.classList.remove("hidden"); els.overlayStage.textContent = state.stage;
    roundSound();
    syncGrid(); syncUIOnly();
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
    announce(`Three... Two... One... Go!`);
    roundSound();
    if (state.stage === "FINAL") { state.zoom = 1.06; state.shake = 8; }
  }

  function eliminateFlag(flag, cause = "battle") {
    if (!flag.active) return;
    flag.active = false; flag.elimAt = now();
    state.active = state.active.filter(f => f.active);
    state.eliminated.push(flag);
    stats[flag.name].wins ??= 0; stats[flag.name].finals ??= 0; stats[flag.name].champs ??= 0;
    if (cause === "final") stats[flag.name].finals++;
    eliminationSound();
    const cell = [...document.querySelectorAll(".flag-cell")].find(x => x.dataset.id === flag.id);
    if (cell) { cell.classList.add("elim"); cell.classList.remove("active"); }
  }

  function maybeSetWinner() {
    if (state.active.length > 1) return false;
    state.winner = state.active[0] || state.flags[Math.floor(Math.random() * state.flags.length)];
    if (state.winner) {
      state.winner.active = true;
      stats[state.winner.name].wins++;
      stats[state.winner.name].champs++;
      updateLeaderboard();
      const final = state.stage === "FINAL";
      announce(final ? `The World Country Flag Battle Champion is ${state.winner.name}.` : `The winner of Round ${state.round} is ${state.winner.name}.`);
      victorySound(final);
      els.overlayWinner.classList.remove("hidden");
      els.winnerName.textContent = state.winner.name;
      els.winnerFlag.textContent = state.winner.flag || "🏳️";
      document.querySelectorAll(".flag-cell").forEach(el => el.classList.toggle("winner", el.dataset.id === state.winner.id));
    }
    state.inBattle = false; state.phase = "winner"; state.nextActionAt = now() + (state.stage === "FINAL" ? 4500 : 1800);
    return true;
  }

  function nextRoundOrFinish() {
    if (state.active.length <= 1) {
      if (!state.winner) maybeSetWinner();
      state.tournamentOver = true;
      if (settings.autoMode) setTimeout(() => { els.overlayWinner.classList.add("hidden"); startTournament(); }, 6500);
      return;
    }
    state.round++;
    state.stage = stageForRound(state.active.length);
    syncGrid(); syncUIOnly();
    els.overlayStage.textContent = state.stage;
    els.overlayStage.classList.remove("hidden");
    announce(`Round ${state.round} is starting.`);
    state.phase = "countdown"; state.countdown = state.stage === "FINAL" ? 4 : 3; state.nextActionAt = now() + 900;
    roundSound();
  }

  function simulate(dt) {
    if (state.paused || !state.running) return;
    if (state.phase === "countdown" && now() >= state.nextActionAt) {
      if (state.countdown > 1) { state.countdown--; state.nextActionAt = now() + 850; if (settings.soundOn) tone(420 + state.countdown * 90, 0.08, "square", 0.05); els.overlayStage.textContent = state.stage + `\n${state.countdown}`; }
      else beginBattle();
    } else if (state.phase === "winner" && now() >= state.nextActionAt) {
      els.overlayWinner.classList.add("hidden");
      state.phase = "between";
      nextRoundOrFinish();
    }

    if (!state.inBattle) return;
    const speedFactor = settings.speed * ({slow:0.8, normal:1, fast:1.35}[settings.battleSpeed] || 1) * dt * 0.06;
    const damping = 0.996;
    for (const f of state.active) {
      const jitter = settings.collisionIntensity === "high" ? 0.06 : settings.collisionIntensity === "low" ? 0.02 : 0.04;
      f.vx += rand(-jitter, jitter) * speedFactor;
      f.vy += rand(-jitter, jitter) * speedFactor;
      const maxV = settings.battleSpeed === "fast" ? 3.8 : 3.1;
      const sp = Math.hypot(f.vx, f.vy) || 1;
      if (sp > maxV) { f.vx = f.vx / sp * maxV; f.vy = f.vy / sp * maxV; }
      f.x += f.vx * speedFactor * 16;
      f.y += f.vy * speedFactor * 16;
      f.angle += f.spin * settings.speed;
      f.vx *= damping; f.vy *= damping;

      const dx = f.x - arena.x, dy = f.y - arena.y, dist = Math.hypot(dx, dy);
      const limit = arena.r - f.r - 4;
      if (dist > limit) {
        const nx = dx / dist, ny = dy / dist;
        f.x = arena.x + nx * limit; f.y = arena.y + ny * limit;
        const dot = f.vx * nx + f.vy * ny;
        f.vx -= 1.9 * dot * nx; f.vy -= 1.9 * dot * ny;
        f.vx += nx * -0.2; f.vy += ny * -0.2;
        wallSound(Math.min(1, Math.abs(dot) / 4));
      }
      f.trail.push([f.x, f.y]); if (f.trail.length > 6) f.trail.shift();
    }

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
          const impulse = -rel * 0.92;
          a.vx -= impulse * nx; a.vy -= impulse * ny;
          b.vx += impulse * nx; b.vy += impulse * ny;
          const inten = Math.abs(rel);
          collisionSound(inten);
          if (inten > 1.1) {
            a.hp -= inten * 4.5; b.hp -= inten * 4.5;
            state.particles.push(...spawnBurst((a.x + b.x) / 2, (a.y + b.y) / 2, inten));
          }
        }
      }
    }

    for (const f of [...state.active]) {
      if (f.hp <= 0 && state.active.length > 1) eliminateFlag(f, state.stage === "FINAL" ? "final" : "battle");
    }
    if (state.active.length === 1) maybeSetWinner();
  }

  function spawnBurst(x, y, inten) {
    const n = Math.min(10, 4 + inten | 0), arr = [];
    for (let i = 0; i < n; i++) arr.push({ x, y, vx: rand(-2, 2) * inten, vy: rand(-2, 2) * inten, life: rand(18, 34), c: Math.random() > .5 ? "#ffd23f" : "#20d69c" });
    return arr;
  }

  function drawArena() {
    ctx.clearRect(0, 0, arena.w, arena.h);
    const g = ctx.createRadialGradient(arena.x, arena.y, arena.r * 0.1, arena.x, arena.y, arena.r * 1.1);
    g.addColorStop(0, "rgba(4,32,21,.35)");
    g.addColorStop(1, "rgba(0,0,0,.95)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, arena.w, arena.h);

    const pulse = 0.5 + 0.5 * Math.sin(now() * 0.002);
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,.75)"; ctx.shadowBlur = 18;
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#fff";
    ctx.beginPath(); ctx.arc(arena.x, arena.y, arena.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(255,210,63,${0.85 * pulse})`; ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(arena.x, arena.y, arena.r, Math.PI * 0.18, Math.PI * 0.18 + Math.PI * 1.2);
    ctx.stroke();
    ctx.restore();

    for (const p of state.particles) {
      p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; p.life -= 1;
      ctx.fillStyle = p.c; ctx.globalAlpha = clamp(p.life / 34, 0, 1);
      ctx.fillRect(p.x, p.y, 2, 2); ctx.globalAlpha = 1;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    for (const f of state.flags) {
      const active = f.active;
      const alpha = active ? 1 : 0.14;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(f.x, f.y); ctx.rotate(f.angle);
      ctx.shadowColor = active ? "rgba(32,214,156,.35)" : "transparent";
      ctx.shadowBlur = active ? 10 : 0;
      if (active) {
        ctx.fillStyle = "rgba(0,0,0,.28)";
        ctx.beginPath(); ctx.arc(0, 0, f.r + 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = `${Math.max(14, f.r * 1.7)}px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(f.flag, 0, 0);
      ctx.restore();
    }

    if (state.phase === "countdown") {
      ctx.save();
      ctx.fillStyle = "rgba(255,210,63,.12)";
      ctx.fillRect(0, 0, arena.w, arena.h);
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
    if (musicGain) musicGain.gain.value = settings.musicOn ? 0.03 : 0;
    if (!settings.musicOn) stopMusic(); else if (unlockedAudio) startMusic();
    syncUI(); saveSettings();
  }

  function togglePause(p) { state.paused = p; }

  els.startBtn.onclick = () => { unlockAudio(); if (audioCtx?.state === "suspended") audioCtx.resume(); if (settings.musicOn) startMusic(); startTournament(); };
  els.pauseBtn.onclick = () => togglePause(true);
  els.resumeBtn.onclick = () => togglePause(false);
  els.restartBtn.onclick = () => startTournament();
  els.fsBtn.onclick = async () => {
    const el = document.documentElement;
    try { if (!document.fullscreenElement) await el.requestFullscreen(); else await document.exitFullscreen(); } catch {}
  };

  [els.autoMode, els.soundOn, els.voiceOn, els.musicOn, els.volume, els.flagCount, els.battleSpeed, els.collisionIntensity].forEach(el => el.addEventListener("change", applySettingsFromUI));
  els.volume.addEventListener("input", () => { els.volumeVal.textContent = `${els.volume.value}%`; applySettingsFromUI(); });
  els.speedBtns.forEach(btn => btn.onclick = () => { els.speedBtns.forEach(b => b.classList.remove("active")); btn.classList.add("active"); setSpeed(Number(btn.dataset.speed)); });

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) state.paused = true; });
  loadSettings(); resize(); syncUI(); updateLeaderboard(); requestAnimationFrame(loop);
})();
