const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");

const els = {
  app: document.getElementById("app"),
  modeSelector: document.getElementById("mode-selector"),
  activeCount: document.getElementById("activeCount"),
  progressBar: document.getElementById("progressBar"),
  flagGrid: document.getElementById("flagGrid"),
  winnerOverlay: document.getElementById("winnerOverlay"),
  winnerName: document.getElementById("winnerName"),
  winnerFlagBox: document.getElementById("winnerFlagBox"),
  qualifiedList: document.getElementById("qualifiedList"),
  timerText: document.getElementById("timerText"),
  timeText2: document.getElementById("timeText2")
};

let TOTAL_FLAGS = 250;
let flags = [];
let activeFlags = [];
let deadFlags = [];
let gapAngle = 0;
let baseGapSize = Math.PI / 5;
let arenaR = 0, arenaX = 0, arenaY = 0;
let isPlaying = false;
let round = 1;

let startTime = 0;
let roundDuration = 60; // 1 min

// Audio Context Setup
let audioCtx = null;
let lastSoundTime = 0;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  const now = Date.now();
  // Throttle bounce sounds (৩০ মিলিফেকেন্ডের ব্যবধান না থাকলে সাউন্ড ওভারলোড হবে না)
  if (type === "bounce" && now - lastSoundTime < 30) return;
  if (type === "bounce") lastSoundTime = now;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    if (type === "bounce") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    } else if (type === "out") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    } else if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
    }
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  } catch (e) {
    console.log("Audio Error:", e);
  }
}

function speakWinner(name) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // আগের কোনো কথা আটকে থাকলে তা ক্লিয়ার করবে
    const utterance = new SpeechSynthesisUtterance("The winner is " + name);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }
}

const countryList = [
  ["IN","India","🇮🇳"], ["US","United States","🇺🇸"], ["GB","United Kingdom","🇬🇧"], 
  ["BD","Bangladesh","🇧🇩"], ["CM","Cameroon","🇨🇲"], ["BF","Burkina Faso","🇧🇫"],
  ["SC","Seychelles","🇸🇨"], ["MW","Malawi","🇲🇼"], ["SZ","Eswatini","🇸🇿"],
  ["BR","Brazil","🇧🇷"], ["AR","Argentina","🇦🇷"], ["FR","France","🇫🇷"],
  ["DE","Germany","🇩🇪"], ["JP","Japan","🇯🇵"], ["KR","South Korea","🇰🇷"]
];
while(countryList.length < TOTAL_FLAGS) {
    countryList.push(countryList[Math.floor(Math.random() * countryList.length)]);
}

function startGame(mode) {
  initAudio();
  document.body.classList.add(mode + '-mode');
  els.modeSelector.classList.add("hidden");
  els.app.classList.remove("hidden");
  
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  
  initGame();
  isPlaying = true;
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  arenaX = canvas.width / 2;
  arenaY = canvas.height / 2 - 30;
  arenaR = Math.min(arenaX, arenaY) - 20; 
}

function initGame() {
  flags = [];
  deadFlags = [];
  els.flagGrid.innerHTML = "";
  startTime = Date.now();
  
  for (let i = 0; i < TOTAL_FLAGS; i++) {
    let country = countryList[i];
    let flagObj = {
      id: i, code: country[0], name: country[1], emoji: country[2],
      x: arenaX + (Math.random() - 0.5) * (arenaR * 0.8),
      y: arenaY + (Math.random() - 0.5) * (arenaR * 0.8),
      vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
      r: 10, active: true
    };
    flags.push(flagObj);
    
    let span = document.createElement("div");
    span.className = "flag-icon";
    span.id = "grid-flag-" + i;
    span.innerText = country[2];
    els.flagGrid.appendChild(span);
  }
  activeFlags = [...flags];
  updateUI();
  updateLeaderboard();
}

function normalizeAngle(a) {
  while (a < 0) a += Math.PI * 2;
  while (a >= Math.PI * 2) a -= Math.PI * 2;
  return a;
}

function eliminate(flag) {
  flag.active = false;
  playSound("out");
  
  activeFlags = activeFlags.filter(f => f.id !== flag.id);
  deadFlags.push(flag); 
  
  document.getElementById("grid-flag-" + flag.id).classList.add("eliminated");
  updateUI();
  
  if (activeFlags.length === 1) {
      declareWinner(activeFlags[0]);
  } else if (activeFlags.length === 0 && deadFlags.length > 0) {
      declareWinner(deadFlags[deadFlags.length-1]); 
  }
}

function declareWinner(flag) {
    isPlaying = false;
    playSound("win");
    speakWinner(flag.name);
    
    els.winnerOverlay.classList.remove("hidden");
    els.winnerFlagBox.innerText = flag.emoji;
    els.winnerName.innerText = flag.name;
    
    setTimeout(() => {
        els.winnerOverlay.classList.add("hidden");
        round++;
        document.getElementById("roundText").innerText = round;
        initGame();
        isPlaying = true;
        requestAnimationFrame(gameLoop);
    }, 6000);
}

function updateUI() {
  els.activeCount.innerText = activeFlags.length;
  let percent = (activeFlags.length / TOTAL_FLAGS) * 100;
  els.progressBar.style.width = percent + "%";
}

function updateLeaderboard() {
    let top = countryList.slice(0, 5);
    els.qualifiedList.innerHTML = top.map((c, i) => `
        <div class="board-row">
            <span class="rank">#${i+1}</span>
            <span>${c[2]} ${c[1]}</span>
            <span class="win-count">${round} win</span>
        </div>
    `).join("");
}

function gameLoop() {
  if (!isPlaying) return;
  
  let elapsed = (Date.now() - startTime) / 1000;
  let timeLeft = Math.max(0, roundDuration - elapsed);
  
  let mins = Math.floor(timeLeft / 60);
  let secs = Math.floor(timeLeft % 60);
  els.timerText.innerText = `0${mins}:${secs < 10 ? '0' : ''}${secs}`;
  els.timeText2.innerText = `${Math.floor(timeLeft)}s`;
  
  let timeRatio = elapsed / roundDuration;
  let currentGapSize = baseGapSize + (timeRatio * Math.PI); 
  let speedMult = 1 + (timeRatio * 1.5); 
  
  gapAngle = normalizeAngle(gapAngle + 0.025);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Active Flags Physics
  for (let f of activeFlags) {
    f.x += f.vx * speedMult;
    f.y += f.vy * speedMult;
    
    let dx = f.x - arenaX;
    let dy = f.y - arenaY;
    let dist = Math.hypot(dx, dy);
    
    if (dist > arenaR - f.r) {
      let fAngle = normalizeAngle(Math.atan2(dy, dx));
      let gStart = gapAngle;
      let gEnd = normalizeAngle(gapAngle + currentGapSize);
      
      let inGap = false;
      if (gStart < gEnd) inGap = (fAngle >= gStart && fAngle <= gEnd);
      else inGap = (fAngle >= gStart || fAngle <= gEnd);
      
      if (inGap) {
          if (dist > arenaR + 5) { eliminate(f); }
      } else {
          let nx = dx / dist;
          let ny = dy / dist;
          f.x = arenaX + nx * (arenaR - f.r);
          f.y = arenaY + ny * (arenaR - f.r);
          
          let dot = (f.vx * nx) + (f.vy * ny);
          f.vx -= 2 * dot * nx;
          f.vy -= 2 * dot * ny;
          playSound("bounce");
      }
    }
  }

  // Dead Flags Physics
  for (let f of deadFlags) {
      f.vy += 0.3;
      f.x += f.vx * 0.9;
      f.y += f.vy;
      
      if (f.y >= canvas.height - f.r) {
          f.y = canvas.height - f.r;
          f.vy *= -0.3;
          f.vx *= 0.8;
      }
      if (f.x <= f.r) { f.x = f.r; f.vx *= -0.5; }
      if (f.x >= canvas.width - f.r) { f.x = canvas.width - f.r; f.vx *= -0.5; }
  }
  
  // Draw Arena Arc (White)
  ctx.beginPath();
  ctx.arc(arenaX, arenaY, arenaR, gapAngle + currentGapSize, gapAngle + Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  
  // Draw Yellow Exit Ring
  ctx.beginPath();
  ctx.arc(arenaX, arenaY, arenaR, gapAngle, gapAngle + currentGapSize);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffd23f";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#ffd23f";
  ctx.stroke();
  ctx.shadowBlur = 0; 

  // Draw Dead Flags
  ctx.font = "18px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.5;
  for (let f of deadFlags) {
      ctx.fillText(f.emoji, f.x, f.y);
  }
  ctx.globalAlpha = 1.0;

  // Draw Active Flags
  ctx.font = "24px Arial";
  for (let f of activeFlags) {
      ctx.fillText(f.emoji, f.x, f.y);
  }
  
  requestAnimationFrame(gameLoop);
}
