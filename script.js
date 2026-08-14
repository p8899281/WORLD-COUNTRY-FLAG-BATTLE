const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");

const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");

const els = {
  app: document.getElementById("app"),
  mainTitle: document.getElementById("mainTitle"),
  subTitle: document.getElementById("subTitle"),
  roundLabel: document.getElementById("roundLabel"),
  roundText: document.getElementById("roundText"),
  stageLabel: document.getElementById("stageLabel"),
  modeSelector: document.getElementById("mode-selector"),
  startScreen: document.getElementById("start-screen"),
  winnerOverlay: document.getElementById("winnerOverlay"),
  winnerHeading: document.getElementById("winnerHeading"),
  winnerName: document.getElementById("winnerName"),
  winnerFlagBox: document.getElementById("winnerFlagBox"),
  podiumContainer: document.getElementById("podiumContainer"),
  podium1Flag: document.getElementById("podium1Flag"),
  podium1Name: document.getElementById("podium1Name"),
  podium2Flag: document.getElementById("podium2Flag"),
  podium2Name: document.getElementById("podium2Name"),
  podium3Flag: document.getElementById("podium3Flag"),
  podium3Name: document.getElementById("podium3Name"),
  boardHeading: document.getElementById("boardHeading"),
  qualifiedList: document.getElementById("qualifiedList"),
  roundProgressText: document.getElementById("roundProgressText"),
  finalCountdownText: document.getElementById("finalCountdownText"),
  timerText: document.getElementById("timerText")
};

let TOTAL_FLAGS = 193; 
let flags = [];
let activeFlags = [];
let deadFlags = [];

let whiteAngle = 0;       
let yellowAngle = 0;      

const baseGapSize = Math.PI / 3.2;   
const yellowSize = Math.PI / 4.2;    

const whiteSpeed = 0.038; 
const yellowSpeed = 0.088; 

let arenaR = 0, arenaX = 0, arenaY = 0;
let viewWidth = 0, viewHeight = 0;
let dpr = 1;
let isPlaying = false;

// 📱 SCREEN WAKE LOCK
let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (err) {}
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && isPlaying) {
    await requestWakeLock();
  }
});

// 🏆 কাস্টমাইজেবল রাউন্ড স্টেট (15, 30, 60, 90, 120)
let round = 1;
let MAX_QUALIFYING_ROUNDS = 60; 
let isFinalRound = false;
let podiumPlaces = { first: null, second: null, third: null };

function setTournamentRounds(num, btnElement) {
  MAX_QUALIFYING_ROUNDS = parseInt(num);
  document.querySelectorAll(".round-btn").forEach(btn => btn.classList.remove("active"));
  if (btnElement) {
    btnElement.classList.add("active");
  }
}

// 🎉 কনফেটি ও নকআউট টাইমার হ্যান্ডলার
let confettiParticles = [];
let confettiAnimationId = null;
let knockoutTimeout = null;

let isWarmup = true;
let warmupStartTime = 0;
const warmupDuration = 2.5;

let startTime = 0;
let roundDuration = 45; 

let qualifiedTeams = [];
let leaderboardPage = 0;
let leaderboardInterval = null;

// 🎵 AUDIO SYSTEM
let audioCtx = null;
let lastSoundTime = 0;

const customBgm = new Audio('bgm.mp3');
customBgm.loop = true;
let useCustomBgm = false;

customBgm.addEventListener('canplaythrough', () => {
  useCustomBgm = true;
});

let bgmInterval = null;
let bgmStep = 0;

const marimbaNotes = [
  523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 880.00, 659.25,
  587.33, 698.46, 880.00, 1174.66, 880.00, 698.46, 783.99, 659.25
];
const bassRoots = [261.63, 261.63, 220.00, 220.00, 174.61, 174.61, 196.00, 196.00];

function unlockAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function requestFullscreen() {
  const docEl = document.documentElement;
  if (docEl.requestFullscreen) {
    docEl.requestFullscreen().catch(() => {});
  } else if (docEl.webkitRequestFullscreen) {
    docEl.webkitRequestFullscreen();
  } else if (docEl.msRequestFullscreen) {
    docEl.msRequestFullscreen();
  }
}

function startBGM() {
  stopBGM();
  
  if (useCustomBgm) {
    customBgm.currentTime = 0;
    customBgm.volume = 0.65;
    customBgm.play().catch(() => {});
    return;
  }

  bgmStep = 0;
  bgmInterval = setInterval(() => {
    if (!audioCtx || !isPlaying) return;
    try {
      const now = audioCtx.currentTime;

      const pluckOsc = audioCtx.createOscillator();
      const pluckGain = audioCtx.createGain();
      const freq = marimbaNotes[bgmStep % marimbaNotes.length];

      pluckOsc.type = "sine";
      pluckOsc.frequency.setValueAtTime(freq, now);

      pluckGain.gain.setValueAtTime(0.045, now);
      pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      pluckOsc.connect(pluckGain);
      pluckGain.connect(audioCtx.destination);
      pluckOsc.start(now);
      pluckOsc.stop(now + 0.13);

      if (bgmStep % 2 === 0) {
        const bassOsc = audioCtx.createOscillator();
        const bassGain = audioCtx.createGain();
        const bassFreq = bassRoots[Math.floor(bgmStep / 2) % bassRoots.length];

        bassOsc.type = "triangle";
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        bassGain.gain.setValueAtTime(0.05, now);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        bassOsc.connect(bassGain);
        bassGain.connect(audioCtx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.23);
      }

      bgmStep++;
    } catch (e) {}
  }, 135);
}

function stopBGM() {
  if (useCustomBgm) {
    customBgm.pause();
  }
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

function playSound(type, intensity = 1) {
  if (!audioCtx || !isPlaying) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const nowTime = Date.now();

  try {
    const now = audioCtx.currentTime;

    if (type === "bounce") {
      if (nowTime - lastSoundTime < 22) return;
      lastSoundTime = nowTime;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      const pitch = 550 + Math.random() * 80 + Math.min(intensity, 3) * 30;
      osc.type = "sine";
      
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.035);
      
      const vol = Math.min(0.18, 0.08 + intensity * 0.03);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.045);

    } else if (type === "out") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320 + Math.random() * 40, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.13);

    } else if (type === "win") {
      stopBGM(); 
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.10);
        
        gain.gain.setValueAtTime(0.01, now + idx * 0.10);
        gain.gain.exponentialRampToValueAtTime(0.20, now + idx * 0.10 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.10 + 1.8);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.10);
        osc.stop(now + idx * 0.10 + 1.85);
      });
    } else if (type === "grand_fanfare") {
      stopBGM();
      const fanfareTones = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      fanfareTones.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        gain.gain.setValueAtTime(0.01, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.28, now + idx * 0.08 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 2.5);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 2.6);
      });
    }
  } catch (e) {}
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }
}

function speakWinner(name, currentRound) {
  let text = "The winner is " + name;
  if (currentRound % 3 === 0) {
    text += ". Comment your country name!";
  }
  speakText(text);
}

function speakKnockout(name) {
  speakText(name + " finally knocked out");
}

function speakGrandChampion(name) {
  speakText("Congratulations " + name + "! You are the Grand Champion!");
}

function codeToFlagEmoji(code) {
  return code.toUpperCase().replace(/./g, ch =>
    String.fromCodePoint(127397 + ch.charCodeAt(0))
  );
}

const countryData = [
  ["AF","Afghanistan"],["AL","Albania"],["DZ","Algeria"],["AD","Andorra"],["AO","Angola"],
  ["AG","Antigua and Barbuda"],["AR","Argentina"],["AM","Armenia"],["AU","Australia"],["AT","Austria"],
  ["AZ","Azerbaijan"],["BS","Bahamas"],["BH","Bahrain"],["BD","Bangladesh"],["BB","Barbados"],
  ["BY","Belarus"],["BE","Belgium"],["BZ","Belize"],["BJ","Benin"],["BT","Bhutan"],
  ["BO","Bolivia"],["BA","Bosnia and Herzegovina"],["BW","Botswana"],["BR","Brazil"],["BN","Brunei"],
  ["BG","Bulgaria"],["BF","Burkina Faso"],["BI","Burundi"],["CV","Cabo Verde"],["KH","Cambodia"],
  ["CM","Cameroon"],["CA","Canada"],["CF","Central African Republic"],["TD","Chad"],["CL","Chile"],
  ["CN","China"],["CO","Colombia"],["KM","Comoros"],["CG","Congo"],["CD","DR Congo"],
  ["CR","Costa Rica"],["CI","Côte d'Ivoire"],["HR","Croatia"],["CU","Cuba"],["CY","Cyprus"],
  ["CZ","Czechia"],["DK","Denmark"],["DJ","Djibouti"],["DM","Dominica"],["DO","Dominican Republic"],
  ["EC","Ecuador"],["EG","Egypt"],["SV","El Salvador"],["GQ","Equatorial Guinea"],["ER","Eritrea"],
  ["EE","Estonia"],["SZ","Eswatini"],["ET","Ethiopia"],["FJ","Fiji"],["FI","Finland"],
  ["FR","France"],["GA","Gabon"],["GM","Gambia"],["GE","Georgia"],["DE","Germany"],
  ["GH","Ghana"],["GR","Greece"],["GD","Grenada"],["GT","Guatemala"],["GN","Guinea"],
  ["GW","Guinea-Bissau"],["GY","Guyana"],["HT","Haiti"],["HN","Honduras"],["HU","Hungary"],
  ["IS","Iceland"],["IN","India"],["ID","Indonesia"],["IR","Iran"],["IQ","Iraq"],
  ["IE","Ireland"],["IL","Israel"],["IT","Italy"],["JM","Jamaica"],["JP","Japan"],
  ["JO","Jordan"],["KZ","Kazakhstan"],["KE","Kenya"],["KI","Kiribati"],["KW","Kuwait"],
  ["KG","Kyrgyzstan"],["LA","Laos"],["LV","Latvia"],["LB","Lebanon"],["LS","Lesotho"],
  ["LR","Liberia"],["LY","Libya"],["LI","Liechtenstein"],["LT","Lithuania"],["LU","Luxembourg"],
  ["MG","Madagascar"],["MW","Malawi"],["MY","Malaysia"],["MV","Maldives"],["ML","Mali"],
  ["MT","Malta"],["MH","Marshall Islands"],["MR","Mauritania"],["MU","Mauritius"],["MX","Mexico"],
  ["FM","Micronesia"],["MD","Moldova"],["MC","Monaco"],["MN","Mongolia"],["ME","Montenegro"],
  ["MA","Morocco"],["MZ","Mozambique"],["MM","Myanmar"],["NA","Namibia"],["NR","Nauru"],["NP","Nepal"],
  ["NL","Netherlands"],["NZ","New Zealand"],["NI","Nicaragua"],["NE","Niger"],["NG","Nigeria"],
  ["KP","North Korea"],["MK","North Macedonia"],["NO","Norway"],["OM","Oman"],["PK","Pakistan"],
  ["PW","Palau"],["PA","Panama"],["PG","Papua New Guinea"],["PY","Paraguay"],["PE","Peru"],
  ["PH","Philippines"],["PL","Poland"],["PT","Portugal"],["QA","Qatar"],["RO","Romania"],
  ["RU","Russia"],["RW","Rwanda"],["KN","Saint Kitts and Nevis"],["LC","Saint Lucia"],
  ["VC","Saint Vincent and the Grenadines"],["WS","Samoa"],["SM","San Marino"],["ST","Sao Tome and Principe"],
  ["SA","Saudi Arabia"],["SN","Senegal"],["RS","Serbia"],["SC","Seychelles"],["SL","Sierra Leone"],
  ["SG","Singapore"],["SK","Slovakia"],["SI","Slovenia"],["SB","Solomon Islands"],["SO","Somalia"],
  ["ZA","South Africa"],["KR","South Korea"],["SS","South Sudan"],["ES","Spain"],["LK","Sri Lanka"],
  ["SD","Sudan"],["SR","Suriname"],["SE","Sweden"],["CH","Switzerland"],["SY","Syria"],
  ["TJ","Tajikistan"],["TZ","Tanzania"],["TH","Thailand"],["TL","Timor-Leste"],["TG","Togo"],
  ["TO","Tonga"],["TT","Trinidad and Tobago"],["TN","Tunisia"],["TR","Turkey"],["TM","Turkmenistan"],
  ["TV","Tuvalu"],["UG","Uganda"],["UA","Ukraine"],["AE","United Arab Emirates"],["GB","United Kingdom"],
  ["US","United States"],["UY","Uruguay"],["UZ","Uzbekistan"],["VU","Vanuatu"],["VE","Venezuela"],
  ["VN","Vietnam"],["YE","Yemen"],["ZM","Zambia"],["ZW","Zimbabwe"]
];

const countryList = countryData.map(([code, name]) => [code, name, codeToFlagEmoji(code)]);
TOTAL_FLAGS = countryList.length;

function selectMode(mode) {
  document.body.classList.add(mode + '-mode');
  els.modeSelector.classList.add("hidden");
  els.startScreen.classList.remove("hidden");
}

function beginBattle() {
  unlockAudio();
  requestWakeLock();

  const fsToggle = document.getElementById("fullscreenToggle");
  if (fsToggle && fsToggle.checked) {
    requestFullscreen();
  }

  els.startScreen.classList.add("hidden");
  els.app.classList.remove("hidden");
  
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  
  round = 1;
  isFinalRound = false;
  qualifiedTeams = [];
  podiumPlaces = { first: null, second: null, third: null };

  initGame();
  startLeaderboardAutoCycle();
  updateRoundFooterInfo(0);
  isPlaying = true;
  startBGM(); 
  requestAnimationFrame(gameLoop);
}

// 🎯 রিং বড় করা এবং লিডারবোর্ড ও প্রোগ্রেস লাইনের ঠিক মাঝখানে নিখুঁত কেন্দ্রস্থকরণ
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  viewWidth = rect.width;
  viewHeight = rect.height;
  
  dpr = Math.max(window.devicePixelRatio || 1, 2);
  
  canvas.width = Math.floor(viewWidth * dpr);
  canvas.height = Math.floor(viewHeight * dpr);
  
  confettiCanvas.width = Math.floor(viewWidth * dpr);
  confettiCanvas.height = Math.floor(viewHeight * dpr);
  
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  confettiCtx.resetTransform();
  confettiCtx.scale(dpr, dpr);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  arenaX = viewWidth / 2;

  const itemWidth = 20;
  const itemsPerRow = Math.max(10, Math.floor((viewWidth - 20) / itemWidth));
  const startX = (viewWidth - (itemsPerRow * itemWidth)) / 2 + 10;
  
  const totalDeadRows = Math.ceil(TOTAL_FLAGS / itemsPerRow);
  const deadFlagsHeight = totalDeadRows * 14 + 8;

  // লিডারবোর্ড (শীর্ষ) এবং প্রোগ্রেস লাইন / মৃত ফ্ল্যাগ জোনের মাঝের উচ্চতা
  const topPadding = 10; 
  const bottomReserved = deadFlagsHeight + 36;
  const usableH = Math.max(180, viewHeight - topPadding - bottomReserved);

  // রিংয়ের সাইজ আগের চেয়ে বড় করা হয়েছে
  arenaR = Math.min((viewWidth - 20) / 2, usableH / 2);
  // লিডারবোর্ড ও প্রোগ্রেস লাইনের ঠিক মধ্যবিন্দুতে সেট
  arenaY = topPadding + (usableH / 2);

  deadFlags.forEach((flag, idx) => {
    const col = idx % itemsPerRow;
    const row = Math.floor(idx / itemsPerRow);
    flag.targetX = startX + col * itemWidth;
    flag.targetY = viewHeight - 8 - (row * 14);
    if (flag.settled) {
      flag.x = flag.targetX;
      flag.y = flag.targetY;
    }
  });
}

function updateRoundFooterInfo(currentElapsed = 0) {
  if (isFinalRound) {
    if (els.roundProgressText) els.roundProgressText.innerText = "🏆 GRAND FINAL";
    if (els.finalCountdownText) els.finalCountdownText.innerText = "STAGE ACTIVE";
    return;
  }

  if (els.roundProgressText) {
    els.roundProgressText.innerText = `ROUNDS: ${round} / ${MAX_QUALIFYING_ROUNDS}`;
  }

  if (els.finalCountdownText) {
    const totalTournamentSecs = MAX_QUALIFYING_ROUNDS * roundDuration; 
    const elapsedSoFar = ((round - 1) * roundDuration) + currentElapsed;
    const remainingSecs = Math.max(0, totalTournamentSecs - elapsedSoFar);

    const totalMins = Math.floor(remainingSecs / 60);
    const totalSecs = Math.floor(remainingSecs % 60);

    els.finalCountdownText.innerText = `FINAL IN: ${totalMins < 10 ? '0' : ''}${totalMins}:${totalSecs < 10 ? '0' : ''}${totalSecs}`;
  }
}

function initGame() {
  flags = [];
  deadFlags = [];
  
  isWarmup = true;
  warmupStartTime = Date.now();
  podiumPlaces = { first: null, second: null, third: null };

  let currentPool = [];
  if (isFinalRound) {
    currentPool = qualifiedTeams.map(t => [t.code, t.name, t.emoji]);
    if (currentPool.length < 3) {
      for (let c of countryList) {
        if (!currentPool.some(p => p[0] === c[0])) {
          currentPool.push(c);
          if (currentPool.length >= 3) break;
        }
      }
    }

    TOTAL_FLAGS = currentPool.length;
    els.mainTitle.innerText = "🏆 GRAND FINAL BATTLE 🏆";
    els.roundLabel.innerText = "🏆";
    els.roundText.innerText = "FINAL";
    els.stageLabel.innerText = "CHAMPIONSHIP";
    els.boardHeading.innerText = "FINALISTS LEADERBOARD";
  } else {
    currentPool = countryList;
    TOTAL_FLAGS = countryList.length;
    els.mainTitle.innerText = "193-WORLD FLAGS BATTLE";
    els.roundLabel.innerText = "ROUND";
    els.roundText.innerText = round;
    els.stageLabel.innerText = "QUALIFYING";
    els.boardHeading.innerText = "QUALIFIED FOR FINAL";
  }

  for (let i = 0; i < TOTAL_FLAGS; i++) {
    let country = currentPool[i];
    
    let spawnAngle = Math.random() * Math.PI * 2;
    let spawnDist = Math.sqrt(Math.random()) * (arenaR * 0.65);
    
    let moveAngle = Math.random() * Math.PI * 2;
    let speed = 14.0 + Math.random() * 8.0;
    
    let flagObj = {
      id: i, code: country[0], name: country[1], emoji: country[2],
      x: arenaX + Math.cos(spawnAngle) * spawnDist,
      y: arenaY + Math.sin(spawnAngle) * spawnDist,
      vx: Math.cos(moveAngle) * speed,
      vy: Math.sin(moveAngle) * speed,
      r: 10, active: true, settled: false, targetX: 0, targetY: 0
    };
    flags.push(flagObj);
  }
  activeFlags = [...flags];
  renderLeaderboard();
  updateRoundFooterInfo(0);
}

function normalizeAngle(a) {
  while (a < 0) a += Math.PI * 2;
  while (a >= Math.PI * 2) a -= Math.PI * 2;
  return a;
}

function isAngleBetween(target, start, end) {
  if (start < end) return target >= start && target <= end;
  return target >= start || target <= end;
}

function showKnockoutOverlay(flag) {
  isPlaying = false;
  stopBGM();
  if (knockoutTimeout) clearTimeout(knockoutTimeout);

  const pauseStartTime = Date.now();

  els.winnerOverlay.classList.remove("hidden");
  els.winnerHeading.innerText = "❌ FINALLY KNOCKED OUT ❌";
  els.winnerHeading.style.color = "#ff4444";
  els.winnerFlagBox.classList.remove("hidden");
  els.winnerFlagBox.innerText = flag.emoji;
  els.winnerName.classList.remove("hidden");
  els.winnerName.innerText = flag.name;
  els.podiumContainer.classList.add("hidden");

  speakKnockout(flag.name);

  knockoutTimeout = setTimeout(() => {
    if (activeFlags.length === 1) {
      declareWinner(activeFlags[0]);
      return;
    }

    els.winnerOverlay.classList.add("hidden");
    const pauseDuration = Date.now() - pauseStartTime;
    startTime += pauseDuration;

    isPlaying = true;
    startBGM();
    requestAnimationFrame(gameLoop);
  }, 2200);
}

function eliminate(flag) {
  if (!flag.active) return;
  flag.active = false;
  playSound("out");
  
  activeFlags = activeFlags.filter(f => f.id !== flag.id);
  
  const slotIndex = deadFlags.length;
  const itemWidth = 20;
  const itemsPerRow = Math.max(10, Math.floor((viewWidth - 20) / itemWidth));
  const col = slotIndex % itemsPerRow;
  const row = Math.floor(slotIndex / itemsPerRow);
  
  const startX = (viewWidth - (itemsPerRow * itemWidth)) / 2 + 10;
  flag.targetX = startX + col * itemWidth;
  flag.targetY = viewHeight - 8 - (row * 14);
  flag.settled = false;

  deadFlags.push(flag); 
  
  if (isFinalRound) {
    if (activeFlags.length === 2) {
      podiumPlaces.third = flag;
    } else if (activeFlags.length === 1) {
      podiumPlaces.second = flag;
    }

    if (activeFlags.length < 10 && activeFlags.length >= 1) {
      showKnockoutOverlay(flag);
      return;
    }
  }

  if (activeFlags.length === 1) {
      declareWinner(activeFlags[0]);
  }
}

function startCelebrationConfetti() {
  confettiParticles = [];
  const colors = ["#ffd700", "#ff0055", "#00ff66", "#00d2ff", "#ffffff", "#ff8800", "#cc00ff"];
  
  for (let i = 0; i < 180; i++) {
    confettiParticles.push({
      x: viewWidth / 2 + (Math.random() - 0.5) * 60,
      y: viewHeight / 2 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 1.2) * 14,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      gravity: 0.28,
      drag: 0.985,
      alpha: 1.0
    });
  }

  function loopConfetti() {
    confettiCtx.clearRect(0, 0, viewWidth, viewHeight);
    
    for (let p of confettiParticles) {
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vRot;

      if (p.y > viewHeight - 20) {
        p.alpha -= 0.012;
      }

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.globalAlpha = Math.max(0, p.alpha);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
      confettiCtx.restore();
    }

    confettiParticles = confettiParticles.filter(p => p.alpha > 0);
    
    if (confettiParticles.length < 90) {
      for (let j = 0; j < 6; j++) {
        confettiParticles.push({
          x: Math.random() * viewWidth,
          y: -10,
          vx: (Math.random() - 0.5) * 4,
          vy: 2 + Math.random() * 4,
          size: 4 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 8,
          gravity: 0.1,
          drag: 0.99,
          alpha: 1.0
        });
      }
    }

    confettiAnimationId = requestAnimationFrame(loopConfetti);
  }

  cancelAnimationFrame(confettiAnimationId);
  loopConfetti();
}

function declareWinner(flag) {
    if (!isPlaying && !isFinalRound) return;
    isPlaying = false;
    if (knockoutTimeout) clearTimeout(knockoutTimeout);
    
    // 🏆 গ্র্যান্ড ফাইনাল বিজয়ী (15, 30, 60, 90, 120 সব রাউন্ডেই চলবে)
    if (isFinalRound) {
      podiumPlaces.first = flag;

      if (!podiumPlaces.second && deadFlags.length >= 1) {
        podiumPlaces.second = deadFlags[deadFlags.length - 1];
      }
      if (!podiumPlaces.third && deadFlags.length >= 2) {
        podiumPlaces.third = deadFlags[deadFlags.length - 2];
      }

      playSound("grand_fanfare");
      speakGrandChampion(flag.name);

      els.winnerHeading.innerText = "👑 TOURNAMENT CHAMPION 👑";
      els.winnerHeading.style.color = "#ffd23f";
      els.winnerFlagBox.classList.add("hidden");
      els.winnerName.classList.add("hidden");
      els.podiumContainer.classList.remove("hidden");

      els.podium1Flag.innerText = podiumPlaces.first ? podiumPlaces.first.emoji : "🥇";
      els.podium1Name.innerText = podiumPlaces.first ? podiumPlaces.first.name : "Champion";

      els.podium2Flag.innerText = podiumPlaces.second ? podiumPlaces.second.emoji : "🥈";
      els.podium2Name.innerText = podiumPlaces.second ? podiumPlaces.second.name : "Runner Up";

      els.podium3Flag.innerText = podiumPlaces.third ? podiumPlaces.third.emoji : "🥉";
      els.podium3Name.innerText = podiumPlaces.third ? podiumPlaces.third.name : "3rd Place";

      els.winnerOverlay.classList.remove("hidden");
      startCelebrationConfetti();
      return; 
    }

    // 🎖️ সাধারণ কোয়ালিফাইং রাউন্ড
    playSound("win");
    speakWinner(flag.name, round);
    els.winnerHeading.innerText = "ROUND WINNER";
    els.winnerHeading.style.color = "#ffd23f";
    els.winnerFlagBox.classList.remove("hidden");
    els.winnerName.classList.remove("hidden");
    els.podiumContainer.classList.add("hidden");

    els.winnerOverlay.classList.remove("hidden");
    els.winnerFlagBox.innerText = flag.emoji;
    els.winnerName.innerText = flag.name;
    
    recordQualifier(flag);
    
    setTimeout(() => {
        els.winnerOverlay.classList.add("hidden");
        
        if (round >= MAX_QUALIFYING_ROUNDS) {
          isFinalRound = true;
        } else {
          round++;
          els.roundText.innerText = round;
        }

        initGame();
        isPlaying = true;
        startBGM(); 
        requestAnimationFrame(gameLoop);
    }, 5000);
}

function recordQualifier(flag) {
  let entry = qualifiedTeams.find(t => t.code === flag.code);
  if (entry) {
    entry.wins++;
  } else {
    qualifiedTeams.push({ code: flag.code, name: flag.name, emoji: flag.emoji, wins: 1 });
  }
  renderLeaderboard();
  updateRoundFooterInfo(0);
}

function startLeaderboardAutoCycle() {
  if (leaderboardInterval) clearInterval(leaderboardInterval);
  leaderboardInterval = setInterval(() => {
    if (qualifiedTeams.length > 5) {
      const totalPages = Math.ceil(qualifiedTeams.length / 5);
      leaderboardPage = (leaderboardPage + 1) % totalPages;
      renderLeaderboard();
    } else {
      leaderboardPage = 0;
    }
  }, 3500);
}

function renderLeaderboard() {
  if (qualifiedTeams.length === 0) {
    let emptyHtml = `
      <div class="board-row" style="justify-content:center; opacity:0.6;">
          No qualifiers yet — finish a round!
      </div>`;
    for (let i = 1; i < 5; i++) {
      emptyHtml += `<div class="board-row empty-row" style="visibility:hidden;">&nbsp;</div>`;
    }
    els.qualifiedList.innerHTML = emptyHtml;
    return;
  }

  let sorted = [...qualifiedTeams].sort((a, b) => b.wins - a.wins);
  const totalPages = Math.ceil(sorted.length / 5);
  if (leaderboardPage >= totalPages) leaderboardPage = 0;

  const startIdx = leaderboardPage * 5;
  const pageItems = sorted.slice(startIdx, startIdx + 5);

  let rowsHtml = pageItems.map((c, i) => {
    const actualRank = startIdx + i + 1;
    return `
      <div class="board-row">
          <span class="rank">#${actualRank}</span>
          <span class="country-name">${c.emoji} ${c.name}</span>
          <span class="win-count">${c.wins} win${c.wins > 1 ? 's' : ''}</span>
      </div>
    `;
  }).join("");

  for (let k = pageItems.length; k < 5; k++) {
    rowsHtml += `<div class="board-row empty-row" style="visibility:hidden;">&nbsp;</div>`;
  }

  els.qualifiedList.innerHTML = rowsHtml;
}

function bounceFlag(f, dx, dy, dist) {
  let nx = dx / dist;
  let ny = dy / dist;
  
  f.x = arenaX + nx * (arenaR - f.r - 2.5);
  f.y = arenaY + ny * (arenaR - f.r - 2.5);

  let dot = (f.vx * nx) + (f.vy * ny);
  if (dot > 0) {
    f.vx -= 2.05 * dot * nx;
    f.vy -= 2.05 * dot * ny;
    
    let tangX = -ny;
    let tangY = nx;
    let scatter = (Math.random() - 0.5) * 3.5;
    f.vx += tangX * scatter;
    f.vy += tangY * scatter;
    
    const speed = Math.abs(dot);
    if (speed > 0.5) {
      playSound("bounce", speed);
    }
  }
}

function gameLoop() {
  if (!isPlaying) return;
  
  ctx.clearRect(0, 0, viewWidth, viewHeight);

  // -------------------------------------------------------------
  // ⚡ ১. ওয়ার্ম-আপ ফেজ
  // -------------------------------------------------------------
  if (isWarmup) {
    let warmupElapsed = (Date.now() - warmupStartTime) / 1000;
    els.timerText.innerText = `00:45`;
    updateRoundFooterInfo(0);

    ctx.beginPath();
    ctx.arc(arenaX, arenaY, arenaR, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    const len = activeFlags.length;
    const minDist = 20;
    const minDistSq = 400;

    for (let i = 0; i < len; i++) {
      let f1 = activeFlags[i];
      for (let j = i + 1; j < len; j++) {
        let f2 = activeFlags[j];
        let dx = f2.x - f1.x;
        if (dx > minDist || dx < -minDist) continue;
        let dy = f2.y - f1.y;
        if (dy > minDist || dy < -minDist) continue;

        let distSq = dx * dx + dy * dy;
        if (distSq < minDistSq && distSq > 0.0001) {
          let dist = Math.sqrt(distSq);
          let overlap = minDist - dist;
          let nx = dx / dist;
          let ny = dy / dist;
          
          f1.x -= nx * overlap * 0.45;
          f1.y -= ny * overlap * 0.45;
          f2.x += nx * overlap * 0.45;
          f2.y += ny * overlap * 0.45;
        }
      }
    }

    for (let f of activeFlags) {
      let jitterX = (Math.random() - 0.5) * 4;
      let jitterY = (Math.random() - 0.5) * 4;

      f.x += f.vx * 0.45 + jitterX;
      f.y += f.vy * 0.45 + jitterY;

      let dx = f.x - arenaX;
      let dy = f.y - arenaY;
      let dist = Math.hypot(dx, dy) || 1;

      if (dist > arenaR - f.r) {
        bounceFlag(f, dx, dy, dist);
      }
    }

    if (warmupElapsed >= warmupDuration) {
      isWarmup = false;
      startTime = Date.now();
    }
  } 
  // -------------------------------------------------------------
  // ⚔️ ২. মূল লড়াই ফেজ
  // -------------------------------------------------------------
  else {
    let elapsed = (Date.now() - startTime) / 1000;
    let timeLeft = Math.max(0, roundDuration - elapsed);
    
    let mins = Math.floor(timeLeft / 60);
    let secs = Math.floor(timeLeft % 60);
    els.timerText.innerText = `0${mins}:${secs < 10 ? '0' : ''}${secs}`;

    updateRoundFooterInfo(elapsed);

    let timeRatio = Math.min(1, elapsed / 42.5);

    let outwardPush = 0.35 + Math.pow(timeRatio, 1.2) * 0.65;
    let speedMult = 2.8 + timeRatio * 2.2;

    let activeGapSize = baseGapSize;
    if (isFinalRound && activeFlags.length <= 10) {
      activeGapSize = baseGapSize * 0.5;
    } else if (elapsed >= 34.0) {
      let lateRatio = Math.min(1, (elapsed - 34.0) / 8.0);
      activeGapSize = baseGapSize * (1 + lateRatio * 1.1);
    }

    whiteAngle = normalizeAngle(whiteAngle + whiteSpeed * (1 + timeRatio * 0.4));
    yellowAngle = normalizeAngle(yellowAngle + yellowSpeed * (1 + timeRatio * 0.4));
    
    let gStart = whiteAngle;
    let gEnd = normalizeAngle(whiteAngle + activeGapSize);
    
    let yStart = yellowAngle;
    let yEnd = normalizeAngle(yellowAngle + yellowSize);

    const len = activeFlags.length;
    const minDist = 20;
    const minDistSq = 400;

    for (let i = 0; i < len; i++) {
      let f1 = activeFlags[i];
      for (let j = i + 1; j < len; j++) {
        let f2 = activeFlags[j];
        let dx = f2.x - f1.x;
        if (dx > minDist || dx < -minDist) continue;
        let dy = f2.y - f1.y;
        if (dy > minDist || dy < -minDist) continue;

        let distSq = dx * dx + dy * dy;
        if (distSq < minDistSq && distSq > 0.0001) {
          let dist = Math.sqrt(distSq);
          let overlap = minDist - dist;
          let nx = dx / dist;
          let ny = dy / dist;
          
          f1.x -= nx * overlap * 0.45;
          f1.y -= ny * overlap * 0.45;
          f2.x += nx * overlap * 0.45;
          f2.y += ny * overlap * 0.45;
          
          let vrel = (f1.vx - f2.vx) * nx + (f1.vy - f2.vy) * ny;
          if (vrel > 0) {
            f1.vx -= vrel * 0.95 * nx;
            f1.vy -= vrel * 0.95 * ny;
            f2.vx += vrel * 0.95 * nx;
            f2.vy += vrel * 0.95 * ny;
          }
        }
      }
    }

    for (let f of [...activeFlags]) {
      let dx = f.x - arenaX;
      let dy = f.y - arenaY;
      let dist = Math.hypot(dx, dy) || 1;
      
      f.vx += (dx / dist) * outwardPush;
      f.vy += (dy / dist) * outwardPush;

      let currentV = Math.hypot(f.vx, f.vy);
      if (currentV > 24.0) {
        f.vx = (f.vx / currentV) * 24.0;
        f.vy = (f.vy / currentV) * 24.0;
      }

      f.x += f.vx * (speedMult * 0.28);
      f.y += f.vy * (speedMult * 0.28);
      
      if (dist > arenaR - f.r) {
        let fAngle = normalizeAngle(Math.atan2(dy, dx));
        let inGap = isAngleBetween(fAngle, gStart, gEnd);

        if (inGap) {
            let inYellow = isAngleBetween(fAngle, yStart, yEnd);
            if (inYellow) {
                bounceFlag(f, dx, dy, dist); 
            } else {
                if (dist > arenaR + 4) { 
                  eliminate(f); 
                }
            }
        } else {
            bounceFlag(f, dx, dy, dist);
        }
      }
    }

    // ১. সাদা রিং
    ctx.beginPath();
    ctx.arc(arenaX, arenaY, arenaR, gEnd, gStart);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    
    // ২. নীল নিয়ন আর্চ
    ctx.beginPath();
    ctx.arc(arenaX, arenaY, arenaR, yStart, yEnd);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#00d2ff";
    ctx.stroke();
  }

  // নিচে এলিমিনেটেড ফ্ল্যাগ সাজানো
  for (let f of deadFlags) {
      if (!f.settled) {
          f.x += (f.targetX - f.x) * 0.18;
          f.y += (f.targetY - f.y) * 0.18;

          let dx = f.targetX - f.x;
          let dy = f.targetY - f.y;
          if (dx * dx + dy * dy < 0.5) {
              f.x = f.targetX;
              f.y = f.targetY;
              f.settled = true;
          }
      }
  }

  // 🟡 ৩. গোল্ডেন প্রোগ্রেস লাইন
  let flagRatio = activeFlags.length / TOTAL_FLAGS;
  let fullLineWidth = arenaR * 1.6; 
  let lineStartX = arenaX - (fullLineWidth / 2); 
  let currentLineWidth = fullLineWidth * flagRatio;
  let lineY = arenaY + arenaR + 14; 

  // (A) ব্যাকগ্রাউন্ড ট্র্যাক
  ctx.beginPath();
  ctx.moveTo(lineStartX, lineY);
  ctx.lineTo(lineStartX + fullLineWidth, lineY);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineCap = "round";
  ctx.stroke();

  // (B) গোল্ডেন লাইন
  ctx.beginPath();
  ctx.moveTo(lineStartX, lineY);
  ctx.lineTo(lineStartX + currentLineWidth, lineY);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ffd700";
  ctx.lineCap = "round";
  ctx.stroke();

  // 🏷️ ৪. আল্ট্রা-শার্প সাদা টেক্সট
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${activeFlags.length} / ${TOTAL_FLAGS} FLAGS`, arenaX, lineY + 7);

  // 🎨 ইমোজি রেন্ডারিং
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  ctx.font = "14px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  ctx.globalAlpha = 0.85; 
  for (let f of deadFlags) {
      ctx.fillText(f.emoji, f.x, f.y);
  }

  ctx.font = "23px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  ctx.globalAlpha = 1.0;
  for (let f of activeFlags) {
      ctx.fillText(f.emoji, f.x, f.y);
  }
  
  requestAnimationFrame(gameLoop);
}

document.addEventListener("click", unlockAudio);
document.addEventListener("touchstart", unlockAudio);
