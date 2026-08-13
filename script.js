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

// রিং ঘূর্ণন ও স্পিড লজিক
let whiteAngle = 0;       // সাদা রিংয়ের পজিশন
let yellowAngle = 0;      // হলুদ আর্চের পজিশন

const gapSize = Math.PI / 4;       // সাদা রিংয়ের কাটা ফাঁকা জায়গা (~45 degree)
const yellowSize = Math.PI / 3;    // হলুদ দরজার মাপ (~60 degree)

const whiteSpeed = 0.015; // সাদা রিংয়ের সাধারণ গতি
const yellowSpeed = 0.045; // হলুদ রিংয়ের দ্রত গতি (White-এর চেয়ে ৩ গুণ ফাস্ট!)

let arenaR = 0, arenaX = 0, arenaY = 0;
let isPlaying = false;
let round = 1;

let startTime = 0;
let roundDuration = 60; // ১ মিনিটের খেলা

// Web Audio Unlocking System
let audioCtx = null;
let lastSoundTime = 0;

function unlockAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const nowTime = Date.now();
  if (type === "bounce" && nowTime - lastSoundTime < 25) return;
  if (type === "bounce") lastSoundTime = nowTime;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    if (type === "bounce") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(340, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
    } else if (type === "out") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    } else if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
    }
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  } catch (e) {}
}

function speakWinner(name) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("The winner is " + name);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }
}

// ২৫০টি পতাকার ডাটা
const countryList = [
  ["IN","India","🇮🇳"], ["US","United States","🇺🇸"], ["GB","United Kingdom","🇬🇧"], 
  ["BD","Bangladesh","🇧🇩"], ["CM","Cameroon","🇨🇲"], ["BF","Burkina Faso","🇧🇫"],
  ["SC","Seychelles","🇸🇨"], ["MW","Malawi","🇲🇼"], ["SZ","Eswatini","🇸🇿"],
  ["BR","Brazil","🇧🇷"], ["AR","Argentina","🇦🇷"], ["FR","France","🇫🇷"],
  ["DE","Germany","🇩🇪"], ["JP","Japan","🇯🇵"], ["KR","South Korea","🇰🇷"],
  ["CA","Canada","🇨🇦"], ["AU","Australia","🇦🇺"], ["IT","Italy","🇮🇹"]
];
while(countryList.length < TOTAL_FLAGS) {
    countryList.push(countryList[Math.floor(Math.random() * countryList.length)]);
}

function startGame(mode) {
  unlockAudio();
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
  arenaR = Math.min(arenaX, arenaY) - 25; 
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
      r: 9, active: true
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

function isAngleBetween(target, start, end) {
  if (start < end) return target >= start && target <= end;
  return target >= start || target <= end;
}

function eliminate(flag) {
  flag.active = false;
  playSound("out");
  
  activeFlags = activeFlags.filter(f => f.id !== flag.id);
  deadFlags.push(flag); 
  
  const gridEl = document.getElementById("grid-flag-" + flag.id);
  if (gridEl) gridEl.classList.add("eliminated");
  
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
            <span class="win-count">1 win</span>
        </div>
    `).join("");
}

function bounceFlag(f, dx, dy, dist) {
  let nx = dx / dist;
  let ny = dy / dist;
  f.x = arenaX + nx * (arenaR - f.r);
  f.y = arenaY + ny * (arenaR - f.r);
  
  let dot = (f.vx * nx) + (f.vy * ny);
  f.vx -= 2 * dot * nx;
  f.vy -= 2 * dot * ny;
  playSound("bounce");
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
  let speedMult = 1 + (timeRatio * 1.5); 
  
  // সাদা রিং এবং ফাস্ট হলুদ আর্চের আলাদা ঘোরার লজিক
  whiteAngle = normalizeAngle(whiteAngle + whiteSpeed);
  yellowAngle = normalizeAngle(yellowAngle + yellowSpeed);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  let gStart = whiteAngle;
  let gEnd = normalizeAngle(whiteAngle + gapSize);
  
  let yStart = yellowAngle;
  let yEnd = normalizeAngle(yellowAngle + yellowSize);

  // Active Flags Physics
  for (let f of activeFlags) {
    f.x += f.vx * speedMult;
    f.y += f.vy * speedMult;
    
    let dx = f.x - arenaX;
    let dy = f.y - arenaY;
    let dist = Math.hypot(dx, dy);
    
    if (dist > arenaR - f.r) {
      let fAngle = normalizeAngle(Math.atan2(dy, dx));
      
      let inGap = isAngleBetween(fAngle, gStart, gEnd);

      if (inGap) {
          // চেক করছি হলুদ আর্চটি কি কাটা ফাঁকা জায়গাকে বন্ধ করে রেখেছে?
          let inYellow = isAngleBetween(fAngle, yStart, yEnd);
          
          if (inYellow) {
              // হলুদ গেট বন্ধ! তাই ফ্ল্যাগ না পড়ে বাউন্স করবে (১-২ বার)
              bounceFlag(f, dx, dy, dist);
          } else {
              // হলুদ গেট খোলা! ফ্ল্যাগ বাইরে পড়ে আউট হয়ে যাবে
              if (dist > arenaR + 8) { 
                eliminate(f); 
              }
          }
      } else {
          // সাদা রিংয়ের ওয়ালে ধাক্কা খেয়ে বাউন্স করবে
          bounceFlag(f, dx, dy, dist);
      }
    }
  }

  // Dead Flags Physics (নিচে মাধ্যাকর্ষণে ছিটকে পড়া)
  for (let f of deadFlags) {
      f.vy += 0.35;
      f.x += f.vx * 0.9;
      f.y += f.vy;
      
      if (f.y >= canvas.height - f.r) {
          f.y = canvas.height - f.r;
          f.vy *= -0.25;
          f.vx *= 0.8;
      }
      if (f.x <= f.r) { f.x = f.r; f.vx *= -0.5; }
      if (f.x >= canvas.width - f.r) { f.x = canvas.width - f.r; f.vx *= -0.5; }
  }

  // --- RENDER RINGS ---
  
  // ১. কাটা সাদা রিং আঁকা (Gap অংশটি ছাড়া বাকিটুকু)
  ctx.beginPath();
  ctx.arc(arenaX, arenaY, arenaR, gEnd, gStart);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  
  // ২. হাই-স্পিড হলুদ আর্চ (Dynamic Gate)
  ctx.beginPath();
  ctx.arc(arenaX, arenaY, arenaR, yStart, yEnd);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffd23f";
  ctx.shadowBlur = 14;
  ctx.shadowColor = "#ffd23f";
  ctx.stroke();
  ctx.shadowBlur = 0; 

  // Dead Flags (নিচে জমানো)
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.55;
  for (let f of deadFlags) {
      ctx.fillText(f.emoji, f.x, f.y);
  }
  ctx.globalAlpha = 1.0;

  // Active Flags (রিংয়ের ভিতর)
  ctx.font = "22px Arial";
  for (let f of activeFlags) {
      ctx.fillText(f.emoji, f.x, f.y);
  }
  
  requestAnimationFrame(gameLoop);
}

// স্ক্রিনে টাচ করলেই অডিও সিস্টেম পুরোপুরি অ্যাক্টিভ হবে
document.addEventListener("click", unlockAudio);
document.addEventListener("touchstart", unlockAudio);
