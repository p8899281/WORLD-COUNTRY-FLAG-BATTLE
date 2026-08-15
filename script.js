const canvas = document.getElementById("arena");
const ctx = canvas ? canvas.getContext("2d", { alpha: false }) : null;

const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas ? confettiCanvas.getContext("2d") : null;

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
  timerText: document.getElementById("timerText"),
  bgmSelect: document.getElementById("bgmSelect"),
  customMusicInputWrapper: document.getElementById("customMusicInputWrapper"),
  customBgmUrl: document.getElementById("customBgmUrl"),
  volumeSlider: document.getElementById("volumeSlider"),
  volumeValueText: document.getElementById("volumeValueText")
};

let TOTAL_FLAGS = 193; 
let flags = [];
let activeFlags = [];
let deadFlags = [];

let whiteAngle = 0;       
let yellowAngle = 0;      

const baseGapSize = Math.PI / 3.4;   
const yellowSize = Math.PI / 4.5;    

const whiteSpeed = 0.042; 
const yellowSpeed = 0.092; 

let arenaR = 0, arenaX = 0, arenaY = 0;
let viewWidth = 0, viewHeight = 0;
let dpr = 1;
let isPlaying = false;
let selectedDeviceMode = 'mobile';
let resizeListenerAttached = false;

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
  MAX_QUALIFYING_ROUNDS = parseInt(num) || 60;
  document.querySelectorAll(".round-btn").forEach(btn => btn.classList.remove("active"));
  if (btnElement) {
    btnElement.classList.add("active");
  }
}

// 🎉 কনফেটি ও টাইমার হ্যান্ডলার
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
let masterVolume = 0.7;

const customAudioPlayer = new Audio();
customAudioPlayer.loop = true;

function formatDirectUrl(url) {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('github.com') && cleanUrl.includes('/blob/')) {
    cleanUrl = cleanUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }
  return cleanUrl;
}

function handleBgmSelectChange() {
  const selected = els.bgmSelect ? els.bgmSelect.value : 'synth';
  if (els.customMusicInputWrapper) {
    if (selected === 'custom') {
      els.customMusicInputWrapper.classList.remove('hidden');
    } else {
      els.customMusicInputWrapper.classList.add('hidden');
    }
  }
  if (isPlaying) {
    startBGM();
  }
}

function changeVolume(val) {
  masterVolume = parseFloat(val) || 0.7;
  customAudioPlayer.volume = masterVolume;
  if (els.volumeValueText) {
    els.volumeValueText.innerText = `${Math.round(masterVolume * 100)}%`;
  }
}

let bgmInterval = null;
let bgmStep = 0;

const musicTracks = {
  synth: {
    notes: [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 880.00, 659.25, 587.33, 698.46, 880.00, 1174.66, 880.00, 698.46, 783.99, 659.25],
    bass: [261.63, 261.63, 220.00, 220.00, 174.61, 174.61, 196.00, 196.00],
    speed: 135,
    type: "sine"
  },
  arcade: {
    notes: [330, 392, 659, 523, 587, 784, 440, 523, 330, 392, 523, 659, 440, 587, 494, 392],
    bass: [110, 130.81, 146.83, 164.81],
    speed: 110,
    type: "square"
  },
  cyber: {
    notes: [220, 261.63, 293.66, 349.23, 440, 349.23, 293.66, 261.63],
    bass: [55, 55, 65.41, 73.42, 87.31, 73.42, 65.41, 55],
    speed: 120,
    type: "sawtooth"
  },
  epic: {
    notes: [440, 440, 523.25, 587.33, 659.25, 587.33, 523.25, 392.00, 440, 440, 659.25, 783.99, 880.00, 783.99, 659.25, 523.25],
    bass: [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98],
    speed: 140,
    type: "triangle"
  },
  suspense: {
    notes: [220.00, 261.63, 220.00, 246.94, 220.00, 207.65, 220.00, 246.94, 261.63, 293.66, 261.63, 246.94, 220.00, 196.00, 220.00, 246.94],
    bass: [110.00, 103.83, 98.00, 103.83],
    speed: 118,
    type: "triangle"
  }
};

function unlockAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (e) {}
}

async function requestDeviceFullscreen() {
  const docEl = document.documentElement;
  try {
    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen();
    } else if (docEl.webkitRequestFullscreen) {
      await docEl.webkitRequestFullscreen();
    } else if (docEl.msRequestFullscreen) {
      await docEl.msRequestFullscreen();
    }

    if (screen.orientation && screen.orientation.lock) {
      if (selectedDeviceMode === 'mobile') {
        screen.orientation.lock('portrait').catch(() => {});
      } else if (selectedDeviceMode === 'tablet') {
        screen.orientation.lock('landscape').catch(() => {});
      }
    }
  } catch (e) {}
}

function startBGM() {
  stopBGM();
  const selectedType = els.bgmSelect ? els.bgmSelect.value : 'synth';

  if (selectedType === 'custom') {
    let targetSrc = els.customBgmUrl ? formatDirectUrl(els.customBgmUrl.value) : '';
    if (targetSrc) {
      customAudioPlayer.src = targetSrc;
      customAudioPlayer.volume = masterVolume;
      customAudioPlayer.currentTime = 0;
      customAudioPlayer.play().catch(() => {});
    }
  } else {
    const track = musicTracks[selectedType] || musicTracks.synth;
    bgmStep = 0;
    
    bgmInterval = setInterval(() => {
      if (!audioCtx || !isPlaying) return;
      try {
        const now = audioCtx.currentTime;

        const melodyOsc = audioCtx.createOscillator();
        const melodyGain = audioCtx.createGain();
        const freq = track.notes[bgmStep % track.notes.length];

        melodyOsc.type = track.type;
        melodyOsc.frequency.setValueAtTime(freq, now);

        const melVol = (track.type === "square" || track.type === "sawtooth") ? 0.025 : 0.045;
        melodyGain.gain.setValueAtTime(melVol * masterVolume, now);
        melodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        melodyOsc.connect(melodyGain);
        melodyGain.connect(audioCtx.destination);
        melodyOsc.start(now);
        melodyOsc.stop(now + 0.13);

        if (bgmStep % 2 === 0) {
          const bassOsc = audioCtx.createOscillator();
          const bassGain = audioCtx.createGain();
          const bassFreq = track.bass[Math.floor(bgmStep / 2) % track.bass.length];

          bassOsc.type = "triangle";
          bassOsc.frequency.setValueAtTime(bassFreq, now);

          bassGain.gain.setValueAtTime(0.05 * masterVolume, now);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

          bassOsc.connect(bassGain);
          bassGain.connect(audioCtx.destination);
          bassOsc.start(now);
          bassOsc.stop(now + 0.23);
        }

        bgmStep++;
      } catch (e) {}
    }, track.speed);
  }
}

function stopBGM() {
  try {
    customAudioPlayer.pause();
  } catch (e) {}
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

function playSound(type, intensity = 1) {
  if (!audioCtx || !isPlaying) return;
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  
  const nowTime = Date.now();

  try {
    const now = audioCtx.currentTime;

    if (type === "bounce") {
      if (nowTime - lastSoundTime < 24) return;
      lastSoundTime = nowTime;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      const pitch = 500 + Math.random() * 80 + Math.min(intensity, 3) * 20;
      osc.type = "sine";
      
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.03);
      
      const vol = Math.min(0.055, (0.015 + intensity * 0.012) * masterVolume);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.038);

    } else if (type === "out") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(280 + Math.random() * 50, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.045);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);
      
      const outVol = Math.min(0.35, 0.26 * masterVolume);
      gain.gain.setValueAtTime(outVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.16);

    } else if (type === "win") {
      stopBGM(); 
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.10);
        
        gain.gain.setValueAtTime(0.01 * masterVolume, now + idx * 0.10);
        gain.gain.exponentialRampToValueAtTime(0.20 * masterVolume, now + idx * 0.10 + 0.04);
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
        
        gain.gain.setValueAtTime(0.01 * masterVolume, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.28 * masterVolume, now + idx * 0.08 + 0.05);
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
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = masterVolume;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
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

// 🚀 EMOJI SPRITE CACHE — ctx.fillText() for color emoji is extremely slow when called
// ~190 times per frame (font shaping + glyph rasterization runs every single call).
// We pre-render every flag emoji to a tiny offscreen canvas ONCE, then just drawImage()
// it every frame. This is the single biggest performance win for smooth 60fps play.
const EMOJI_SPRITE_SCALE = 3; // internal render resolution multiplier, keeps sprites crisp
const emojiSpriteCache = new Map();

function getEmojiSprite(emoji, fontSizePx) {
  const key = emoji + "@" + fontSizePx;
  let sprite = emojiSpriteCache.get(key);
  if (sprite) return sprite;

  const cssSize = Math.ceil(fontSizePx * 1.5);
  const pixelSize = cssSize * EMOJI_SPRITE_SCALE;

  const off = document.createElement("canvas");
  off.width = pixelSize;
  off.height = pixelSize;
  const octx = off.getContext("2d");
  octx.textAlign = "center";
  octx.textBaseline = "middle";
  octx.font = `${fontSizePx * EMOJI_SPRITE_SCALE}px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`;
  octx.fillText(emoji, pixelSize / 2, pixelSize / 2);

  sprite = { canvas: off, cssSize };
  emojiSpriteCache.set(key, sprite);
  return sprite;
}

function drawFlagEmoji(targetCtx, emoji, x, y, fontSizePx) {
  const sprite = getEmojiSprite(emoji, fontSizePx);
  const half = sprite.cssSize / 2;
  targetCtx.drawImage(sprite.canvas, x - half, y - half, sprite.cssSize, sprite.cssSize);
}

function preloadEmojiSprites() {
  for (let i = 0; i < countryList.length; i++) {
    const emoji = countryList[i][2];
    getEmojiSprite(emoji, 23);
    getEmojiSprite(emoji, 14);
  }
}
preloadEmojiSprites();

function selectMode(mode) {
  selectedDeviceMode = mode;
  document.body.classList.remove('mobile-mode', 'tablet-mode', 'pc-mode');
  document.body.classList.add(mode + '-mode');
  if (els.modeSelector) els.modeSelector.classList.add("hidden");
  if (els.startScreen) els.startScreen.classList.remove("hidden");
}

function beginBattle() {
  unlockAudio();
  requestWakeLock();

  const fsToggle = document.getElementById("fullscreenToggle");
  if (fsToggle && fsToggle.checked) {
    requestDeviceFullscreen();
  }

  if (els.startScreen) els.startScreen.classList.add("hidden");
  if (els.app) els.app.classList.remove("hidden");
  
  resizeCanvas();
  if (!resizeListenerAttached) {
    window.addEventListener("resize", resizeCanvas);
    resizeListenerAttached = true;
  }
  
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

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  viewWidth = rect.width;
  viewHeight = rect.height;
  
  dpr = Math.min(window.devicePixelRatio || 1, 2); // হাই কোয়ালিটি কিন্তু স্মুথ পারফরম্যান্স (২.৫ থেকে কমিয়ে ২ করা হয়েছে)
  
  canvas.width = Math.floor(viewWidth * dpr);
  canvas.height = Math.floor(viewHeight * dpr);
  
  if (confettiCanvas) {
    confettiCanvas.width = Math.floor(viewWidth * dpr);
    confettiCanvas.height = Math.floor(viewHeight * dpr);
  }
  
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  if (confettiCtx) {
    confettiCtx.resetTransform();
    confettiCtx.scale(dpr, dpr);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  arenaX = viewWidth / 2;

  const itemWidth = 20;
  const itemsPerRow = Math.max(10, Math.floor((viewWidth - 20) / itemWidth));
  const startX = (viewWidth - (itemsPerRow * itemWidth)) / 2 + 10;
  
  const totalDeadRows = Math.ceil(TOTAL_FLAGS / itemsPerRow);
  const deadFlagsHeight = totalDeadRows * 14 + 8;

  const topPadding = 10; 
  const bottomReserved = deadFlagsHeight + 36;
  const usableH = Math.max(180, viewHeight - topPadding - bottomReserved);

  arenaR = Math.min((viewWidth - 20) / 2, usableH / 2);
  arenaY = topPadding + (usableH / 2);

  for (let i = 0; i < deadFlags.length; i++) {
    const flag = deadFlags[i];
    const col = i % itemsPerRow;
    const row = Math.floor(i / itemsPerRow);
    flag.targetX = startX + col * itemWidth;
    flag.targetY = viewHeight - 8 - (row * 14);
    if (flag.settled) {
      flag.x = flag.targetX;
      flag.y = flag.targetY;
    }
  }
}

function updateRoundFooterInfo(currentElapsed = 0) {
  if (isFinalRound) {
    if (els.roundProgressText) {
      els.roundProgressText.innerText = `🏆 ACTIVE: ${activeFlags.length} / ${TOTAL_FLAGS}`;
    }
    if (els.finalCountdownText) {
      const timeLeft = Math.max(0, roundDuration - currentElapsed);
      const m = Math.floor(timeLeft / 60);
      const s = Math.floor(timeLeft % 60);
      els.finalCountdownText.innerText = `TIME LEFT: ${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return;
  }

  if (els.roundProgressText) {
    els.roundProgressText.innerText = `ROUNDS: ${round} / ${MAX_QUALIFYING_ROUNDS}`;
  }

  if (els.finalCountdownText) {
    const totalTournamentSecs = MAX_QUALIFYING_ROUNDS * 45; 
    const elapsedSoFar = ((round - 1) * 45) + currentElapsed;
    const remainingSecs = Math.max(0, totalTournamentSecs - elapsedSoFar);

    const totalMins = Math.floor(remainingSecs / 60);
    const totalSecs = Math.floor(remainingSecs % 60);

    els.finalCountdownText.innerText = `FINAL IN: ${totalMins < 10 ? '0' : ''}${totalMins}:${totalSecs < 10 ? '0' : ''}${totalSecs}`;
  }
}

function renderFinalStandings() {
  if (!els.qualifiedList) return;

  // 🏆 লাইভ ফাইনাল স্ট্যান্ডিং: আগে সবাই যারা এখনো একটিভ (ব্যাটেলে টিকে আছে),
  // তারপর সবচেয়ে সাম্প্রতিক নকআউট থেকে শুরু করে পুরনো নকআউট পর্যন্ত।
  const standings = [];
  for (let i = 0; i < activeFlags.length; i++) {
    let f = activeFlags[i];
    standings.push({ name: f.name, emoji: f.emoji, active: true });
  }
  for (let i = deadFlags.length - 1; i >= 0; i--) {
    let f = deadFlags[i];
    standings.push({ name: f.name, emoji: f.emoji, active: false });
  }

  if (standings.length === 0) return;

  const totalPages = Math.ceil(standings.length / 5);
  if (leaderboardPage >= totalPages) leaderboardPage = 0;

  const startIdx = leaderboardPage * 5;
  const pageItems = standings.slice(startIdx, startIdx + 5);

  let rowsHtml = pageItems.map((c, i) => {
    const rank = startIdx + i + 1;
    const statusHtml = c.active
      ? `<span class="win-count" style="color:#00ff66;">🟢 ACTIVE</span>`
      : `<span class="win-count" style="color:#ff5566;">❌ OUT</span>`;
    return `
      <div class="board-row">
          <span class="rank">#${rank}</span>
          <span class="country-name">${c.emoji} ${c.name}</span>
          ${statusHtml}
      </div>
    `;
  }).join("");

  for (let k = pageItems.length; k < 5; k++) {
    rowsHtml += `<div class="board-row empty-row" style="visibility:hidden;">&nbsp;</div>`;
  }

  els.qualifiedList.innerHTML = rowsHtml;
}

function initGame() {
  flags.length = 0;
  deadFlags.length = 0;
  
  isWarmup = true;
  warmupStartTime = Date.now();
  podiumPlaces = { first: null, second: null, third: null };

  let currentPool = [];
  if (isFinalRound) {
    roundDuration = 200; 

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
    if (els.mainTitle) els.mainTitle.innerText = "🏆 GRAND FINAL BATTLE 🏆";
    if (els.roundLabel) els.roundLabel.innerText = "🏆";
    if (els.roundText) els.roundText.innerText = "FINAL";
    if (els.stageLabel) els.stageLabel.innerText = "CHAMPIONSHIP";
    if (els.boardHeading) els.boardHeading.innerText = "FINALISTS LEADERBOARD";
  } else {
    roundDuration = 45;

    currentPool = countryList;
    TOTAL_FLAGS = countryList.length;
    if (els.mainTitle) els.mainTitle.innerText = "193-WORLD FLAGS BATTLE";
    if (els.roundLabel) els.roundLabel.innerText = "ROUND";
    if (els.roundText) els.roundText.innerText = round;
    if (els.stageLabel) els.stageLabel.innerText = "QUALIFYING";
    if (els.boardHeading) els.boardHeading.innerText = "QUALIFIED FOR FINAL";
  }

  for (let i = 0; i < TOTAL_FLAGS; i++) {
    let country = currentPool[i];
    
    let spawnAngle = Math.random() * Math.PI * 2;
    let spawnDist = Math.sqrt(Math.random()) * (arenaR * 0.65);
    
    let moveAngle = Math.random() * Math.PI * 2;
    let speed = 12.0 + Math.random() * 8.0;
    
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
  if (isFinalRound) {
    renderFinalStandings();
  } else {
    renderLeaderboard();
  }
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

  if (els.winnerOverlay) els.winnerOverlay.classList.remove("hidden");
  if (els.winnerHeading) {
    els.winnerHeading.innerText = "❌ FINALLY KNOCKED OUT ❌";
    els.winnerHeading.style.color = "#ff4444";
  }
  if (els.winnerFlagBox) {
    els.winnerFlagBox.classList.remove("hidden");
    els.winnerFlagBox.innerText = flag.emoji;
  }
  if (els.winnerName) {
    els.winnerName.classList.remove("hidden");
    els.winnerName.innerText = flag.name;
  }
  if (els.podiumContainer) els.podiumContainer.classList.add("hidden");

  speakKnockout(flag.name);

  knockoutTimeout = setTimeout(() => {
    if (activeFlags.length === 1) {
      declareWinner(activeFlags[0]);
      return;
    }

    if (els.winnerOverlay) els.winnerOverlay.classList.add("hidden");
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
    renderFinalStandings();

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

// 🎉 কনফেটি সেলিব্রেশন সিস্টেম (প্রতিটি রাউন্ডের বিজয়ীর জন্যও সক্রিয়)
function startCelebrationConfetti() {
  if (!confettiCtx) return;
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
    if (!confettiCtx) return;
    confettiCtx.clearRect(0, 0, viewWidth, viewHeight);
    
    for (let i = 0; i < confettiParticles.length; i++) {
      let p = confettiParticles[i];
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

function stopCelebrationConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  confettiParticles = [];
  if (confettiCtx) {
    confettiCtx.clearRect(0, 0, viewWidth, viewHeight);
  }
}

function declareWinner(flag) {
    if (!isPlaying && !isFinalRound) return;
    isPlaying = false;
    if (knockoutTimeout) clearTimeout(knockoutTimeout);
    
    // 🏆 গ্র্যান্ড ফাইনাল বিজয়ী
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

      if (els.winnerHeading) {
        els.winnerHeading.innerText = "👑 TOURNAMENT CHAMPION 👑";
        els.winnerHeading.style.color = "#ffd23f";
      }
      if (els.winnerFlagBox) els.winnerFlagBox.classList.add("hidden");
      if (els.winnerName) els.winnerName.classList.add("hidden");
      if (els.podiumContainer) els.podiumContainer.classList.remove("hidden");

      if (els.podium1Flag) els.podium1Flag.innerText = podiumPlaces.first ? podiumPlaces.first.emoji : "🥇";
      if (els.podium1Name) els.podium1Name.innerText = podiumPlaces.first ? podiumPlaces.first.name : "Champion";

      if (els.podium2Flag) els.podium2Flag.innerText = podiumPlaces.second ? podiumPlaces.second.emoji : "🥈";
      if (els.podium2Name) els.podium2Name.innerText = podiumPlaces.second ? podiumPlaces.second.name : "Runner Up";

      if (els.podium3Flag) els.podium3Flag.innerText = podiumPlaces.third ? podiumPlaces.third.emoji : "🥉";
      if (els.podium3Name) els.podium3Name.innerText = podiumPlaces.third ? podiumPlaces.third.name : "3rd Place";

      if (els.winnerOverlay) els.winnerOverlay.classList.remove("hidden");
      startCelebrationConfetti(); // গ্র্যান্ড সেলিব্রেশন
      return; 
    }

    // 🎖️ সাধারণ কোয়ালিফাইং রাউন্ড (এখানেও সেলিব্রেশন কনফেটি চলবে)
    playSound("win");
    speakWinner(flag.name, round);
    if (els.winnerHeading) {
      els.winnerHeading.innerText = "ROUND WINNER";
      els.winnerHeading.style.color = "#ffd23f";
    }
    if (els.winnerFlagBox) {
      els.winnerFlagBox.classList.remove("hidden");
      els.winnerFlagBox.innerText = flag.emoji;
    }
    if (els.winnerName) {
      els.winnerName.classList.remove("hidden");
      els.winnerName.innerText = flag.name;
    }
    if (els.podiumContainer) els.podiumContainer.classList.add("hidden");

    if (els.winnerOverlay) els.winnerOverlay.classList.remove("hidden");
    
    // 🎊 রাউন্ড বিজয়ীর জন্য কনফেটি ব্লাস্ট শুরু
    startCelebrationConfetti();
    
    recordQualifier(flag);
    
    setTimeout(() => {
        if (els.winnerOverlay) els.winnerOverlay.classList.add("hidden");
        
        // পরের রাউন্ড শুরুর আগে কনফেটি থামানো
        stopCelebrationConfetti();
        
        if (round >= MAX_QUALIFYING_ROUNDS) {
          isFinalRound = true;
        } else {
          round++;
          if (els.roundText) els.roundText.innerText = round;
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
    if (isFinalRound) {
      const totalEntries = activeFlags.length + deadFlags.length;
      if (totalEntries > 5) {
        const totalPages = Math.ceil(totalEntries / 5);
        leaderboardPage = (leaderboardPage + 1) % totalPages;
        renderFinalStandings();
      } else {
        leaderboardPage = 0;
      }
      return;
    }

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
  if (!els.qualifiedList) return;

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

// 💥 শুধু রিংয়ে ধাক্কা লাগলেই হালকা বাউন্স সাউন্ড বাজবে
// 🚀 SPATIAL GRID COLLISION — brute-force O(n²) pairwise checks (193*192/2 ≈ 18,500
// comparisons every single frame) get slow once flags are packed together, especially
// during warm-up. Bucketing flags into a uniform grid and only checking neighboring
// cells keeps this fast and scales much better on weaker phones.
const COLLISION_CELL = 20;   // == minDist
const COLLISION_CELL_SQ = 400;
const collisionGrid = new Map();
const collisionNeighborOffsets = [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 1]];

function resolveCollisionPair(f1, f2, pushFactor, resolveVelocity) {
  let dx = f2.x - f1.x;
  if (dx > COLLISION_CELL || dx < -COLLISION_CELL) return;
  let dy = f2.y - f1.y;
  if (dy > COLLISION_CELL || dy < -COLLISION_CELL) return;

  let distSq = dx * dx + dy * dy;
  if (distSq < COLLISION_CELL_SQ && distSq > 0.0001) {
    let dist = Math.sqrt(distSq);
    let overlap = COLLISION_CELL - dist;
    let nx = dx / dist;
    let ny = dy / dist;

    f1.x -= nx * overlap * pushFactor;
    f1.y -= ny * overlap * pushFactor;
    f2.x += nx * overlap * pushFactor;
    f2.y += ny * overlap * pushFactor;

    if (resolveVelocity) {
      let vrel = (f1.vx - f2.vx) * nx + (f1.vy - f2.vy) * ny;
      if (vrel > 0) {
        f1.vx -= vrel * 1.02 * nx;
        f1.vy -= vrel * 1.02 * ny;
        f2.vx += vrel * 1.02 * nx;
        f2.vy += vrel * 1.02 * ny;
      }
    }
  }
}

function resolveAllCollisions(list, pushFactor, resolveVelocity) {
  collisionGrid.clear();

  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    const col = Math.floor(f.x / COLLISION_CELL);
    const row = Math.floor(f.y / COLLISION_CELL);
    const key = col + "_" + row;
    let cell = collisionGrid.get(key);
    if (!cell) {
      cell = [];
      collisionGrid.set(key, cell);
    }
    cell.push(f);
  }

  collisionGrid.forEach((cellFlags, key) => {
    const parts = key.split("_");
    const col = parseInt(parts[0], 10);
    const row = parseInt(parts[1], 10);

    for (let o = 0; o < collisionNeighborOffsets.length; o++) {
      const dx = collisionNeighborOffsets[o][0];
      const dy = collisionNeighborOffsets[o][1];
      const isSelf = dx === 0 && dy === 0;

      if (isSelf) {
        for (let i = 0; i < cellFlags.length; i++) {
          for (let j = i + 1; j < cellFlags.length; j++) {
            resolveCollisionPair(cellFlags[i], cellFlags[j], pushFactor, resolveVelocity);
          }
        }
      } else {
        const neighborCell = collisionGrid.get((col + dx) + "_" + (row + dy));
        if (!neighborCell) continue;
        for (let i = 0; i < cellFlags.length; i++) {
          for (let j = 0; j < neighborCell.length; j++) {
            resolveCollisionPair(cellFlags[i], neighborCell[j], pushFactor, resolveVelocity);
          }
        }
      }
    }
  });
}

function bounceFlag(f, dx, dy, dist) {
  let nx = dx / dist;
  let ny = dy / dist;
  
  f.x = arenaX + nx * (arenaR - f.r - 0.5);
  f.y = arenaY + ny * (arenaR - f.r - 0.5);

  let dot = (f.vx * nx) + (f.vy * ny);
  if (dot > 0) {
    f.vx -= 1.9 * dot * nx;
    f.vy -= 1.9 * dot * ny;
    
    let tangX = -ny;
    let tangY = nx;
    let scatter = (Math.random() - 0.5) * 3.0;
    f.vx += tangX * scatter;
    f.vy += tangY * scatter;
    
    const speed = Math.abs(dot);
    if (speed > 0.4) {
      playSound("bounce", speed);
    }
  }
}

function gameLoop() {
  if (!isPlaying || !ctx) return;
  
  ctx.fillStyle = "#020c06";
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  // -------------------------------------------------------------
  // ⚡ ১. ওয়ার্ম-আপ ফেজ
  // -------------------------------------------------------------
  if (isWarmup) {
    let warmupElapsed = (Date.now() - warmupStartTime) / 1000;
    let mins = Math.floor(roundDuration / 60);
    let secs = Math.floor(roundDuration % 60);
    if (els.timerText) els.timerText.innerText = `0${mins}:${secs < 10 ? '0' : ''}${secs}`;
    updateRoundFooterInfo(0);

    ctx.beginPath();
    ctx.arc(arenaX, arenaY, arenaR, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    const len = activeFlags.length;

    resolveAllCollisions(activeFlags, 0.45, false);

    for (let i = 0; i < len; i++) {
      let f = activeFlags[i];
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
    if (els.timerText) els.timerText.innerText = `0${mins}:${secs < 10 ? '0' : ''}${secs}`;

    updateRoundFooterInfo(elapsed);

    let targetDuration = isFinalRound ? 195.0 : 42.0;
    let timeRatio = Math.min(1, elapsed / targetDuration);

    let outwardPush = 0.30 + Math.pow(timeRatio, 1.2) * 0.85;
    let speedMult = 2.4 + timeRatio * 2.8;

    let activeGapSize = baseGapSize;
    if (isFinalRound) {
      if (activeFlags.length <= 10) {
        activeGapSize = baseGapSize * 0.5;
      } else if (elapsed >= 160.0) {
        let lateRatio = Math.min(1, (elapsed - 160.0) / 30.0);
        activeGapSize = baseGapSize * (1 + lateRatio * 1.1);
      }
    } else if (elapsed >= 32.0) {
      let lateRatio = Math.min(1, (elapsed - 32.0) / 9.0);
      activeGapSize = baseGapSize * (1 + lateRatio * 1.1);
    }

    whiteAngle = normalizeAngle(whiteAngle + whiteSpeed * (1 + timeRatio * 0.35));
    yellowAngle = normalizeAngle(yellowAngle + yellowSpeed * (1 + timeRatio * 0.35));
    
    let gStart = whiteAngle;
    let gEnd = normalizeAngle(whiteAngle + activeGapSize);
    
    let yStart = yellowAngle;
    let yEnd = normalizeAngle(yellowAngle + yellowSize);

    let targetMaxAlive;
    if (elapsed < targetDuration) {
      let p = elapsed / targetDuration;
      targetMaxAlive = Math.max(2, Math.round(TOTAL_FLAGS * (1 - Math.pow(p, 1.1))));
    } else {
      targetMaxAlive = 1;
    }

    const len = activeFlags.length;

    resolveAllCollisions(activeFlags, 0.48, true);

    // ⚠️ FIX: eliminate() নিচে গিয়ে module-level `activeFlags` কে নতুন
    // (ছোট) array দিয়ে reassign করে দেয়। এই loop যদি সরাসরি `activeFlags`
    // ব্যবহার করে ঘোরে, তাহলে কোনো flag eliminate হওয়া মাত্র array shift
    // হয়ে যায় এবং ঠিক পরের flag টা সেই frame এ পুরোপুরি skip হয়ে যায় —
    // তার push/bounce/eliminate কোনো check-ই চলে না। এটাই "৪-৫টা বার হচ্ছে
    // মনে হয় কিন্তু একটাই বার হচ্ছে" আর ফ্ল্যাগ গুলো আটকে/অদ্ভুতভাবে move
    // করার আসল কারণ। এখন এই frame এর জন্য fixed snapshot এ loop চালাচ্ছি,
    // তাই কোনো flag miss হবে না, কিন্তু eliminate() ঠিকই আসল activeFlags
    // আপডেট করবে।
    const battleBatch = activeFlags;

    for (let i = 0; i < battleBatch.length; i++) {
      let f = battleBatch[i];
      if (!f.active) continue;

      let preDx = f.x - arenaX;
      let preDy = f.y - arenaY;
      let preDist = Math.hypot(preDx, preDy) || 1;
      
      f.vx += (preDx / preDist) * outwardPush;
      f.vy += (preDy / preDist) * outwardPush;

      let currentV = Math.hypot(f.vx, f.vy);
      if (currentV > 25.0) {
        f.vx = (f.vx / currentV) * 25.0;
        f.vy = (f.vy / currentV) * 25.0;
      }

      f.x += f.vx * (speedMult * 0.28);
      f.y += f.vy * (speedMult * 0.28);

      // dx/dy/dist movement এর পরে recalc করা হচ্ছে, নাহলে boundary check
      // এক frame পুরনো position দিয়ে হতো।
      let dx = f.x - arenaX;
      let dy = f.y - arenaY;
      let dist = Math.hypot(dx, dy) || 1;
      
      if (dist > arenaR - f.r) {
        let fAngle = normalizeAngle(Math.atan2(dy, dx));
        let inGap = isAngleBetween(fAngle, gStart, gEnd);

        if (inGap) {
            let inYellow = isAngleBetween(fAngle, yStart, yEnd);
            if (inYellow) {
                bounceFlag(f, dx, dy, dist); 
            } else {
                if (activeFlags.length > targetMaxAlive) {
                    if (dist > arenaR + f.r + 2) {
                        eliminate(f); 
                    }
                } else {
                    bounceFlag(f, dx, dy, dist); 
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
  for (let i = 0; i < deadFlags.length; i++) {
      let f = deadFlags[i];
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

  ctx.beginPath();
  ctx.moveTo(lineStartX, lineY);
  ctx.lineTo(lineStartX + fullLineWidth, lineY);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(lineStartX, lineY);
  ctx.lineTo(lineStartX + currentLineWidth, lineY);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ffd700";
  ctx.lineCap = "round";
  ctx.stroke();

  // 🏷️ ৪. আল্ট্রা-শার্প টেক্সট
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${activeFlags.length} / ${TOTAL_FLAGS} FLAGS`, arenaX, lineY + 7);

  // 🎨 ইমোজি রেন্ডারিং (cached sprite blitting — fillText নয়)
  ctx.globalAlpha = 0.85; 
  for (let i = 0; i < deadFlags.length; i++) {
      let f = deadFlags[i];
      drawFlagEmoji(ctx, f.emoji, f.x, f.y, 14);
  }

  ctx.globalAlpha = 1.0;
  for (let i = 0; i < activeFlags.length; i++) {
      let f = activeFlags[i];
      drawFlagEmoji(ctx, f.emoji, f.x, f.y, 23);
  }

  // 🌟 ৫. রাউন্ড ব্যানার টেক্সট (সব ফ্ল্যাগের সবার ওপরে রেন্ডার হবে)
  if (isWarmup) {
    let warmupElapsed = (Date.now() - warmupStartTime) / 1000;
    let alpha = 1;
    if (warmupElapsed > 1.8) {
      alpha = Math.max(0, (warmupDuration - warmupElapsed) / 0.7);
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    let roundBannerText = isFinalRound ? "🏆 GRAND FINAL 🏆" : `⚔️ ROUND ${round} ⚔️`;
    ctx.font = "900 24px system-ui, -apple-system, sans-serif";
    let textMetrics = ctx.measureText(roundBannerText);
    let bgWidth = textMetrics.width + 48;
    let bgHeight = 46;

    ctx.fillStyle = "rgba(3, 8, 20, 0.94)";
    ctx.strokeStyle = isFinalRound ? "#00d2ff" : "#ffd700";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = isFinalRound ? "#00d2ff" : "#ffd700";
    ctx.shadowBlur = 18;

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(arenaX - bgWidth / 2, arenaY - bgHeight / 2, bgWidth, bgHeight, 23);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(arenaX - bgWidth / 2, arenaY - bgHeight / 2, bgWidth, bgHeight);
      ctx.strokeRect(arenaX - bgWidth / 2, arenaY - bgHeight / 2, bgWidth, bgHeight);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isFinalRound ? "#00d2ff" : "#ffd700";
    ctx.fillText(roundBannerText, arenaX, arenaY);

    ctx.restore();
  }
  
  requestAnimationFrame(gameLoop);
}

// গ্লোবাল ফাংশন বাইন্ডিং
window.selectMode = selectMode;
window.setTournamentRounds = setTournamentRounds;
window.handleBgmSelectChange = handleBgmSelectChange;
window.changeVolume = changeVolume;
window.beginBattle = beginBattle;

document.addEventListener("click", unlockAudio);
document.addEventListener("touchstart", unlockAudio);
