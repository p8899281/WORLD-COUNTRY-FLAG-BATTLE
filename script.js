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
let deadFlags = []; // যে ফ্ল্যাগগুলো নিচে জমা হবে
let gapAngle = 0;
let baseGapSize = Math.PI / 5; // শুরুর ফাঁকা জায়গা
let arenaR = 0, arenaX = 0, arenaY = 0;
let isPlaying = false;
let round = 1;

// Timer Logic
let startTime = 0;
let roundDuration = 60; // 60 seconds (1 minute)

// Audio Context
let audioCtx;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // ভয়েস ইঞ্জিন চালু করা
    if ('speechSynthesis' in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    }
  }
}

function playSound(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  if (type === "bounce") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  } else if (type === "out") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  } else if (type === "win") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
  }
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 1.5);
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
  arenaY = canvas.height / 2 - 30; // রিং একটু ওপরে রাখা হলো যাতে নিচে ফ্ল্যাগ জমার জায়গা থাকে
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
  
  // ফ্ল্যাগটি রিংয়ের বাইরে গেলে নিচে জমা হওয়ার জন্য deadFlags-এ পাঠানো হলো
  activeFlags = activeFlags.filter(f => f.id !== flag.id);
  deadFlags.push(flag); 
  
  document.getElementById("grid-flag-" + flag.id).classList.add("eliminated");
  updateUI();
  
  if (activeFlags.length === 1) {
      declareWinner(activeFlags[0]);
  } else if (activeFlags.length === 0) {
      // যদি ২ জন একসাথে বেরিয়ে যায়
      declareWinner(deadFlags[deadFlags.length-1]); 
  }
}

function declareWinner(flag) {
    isPlaying = false;
    playSound("win");
    
    els.winnerOverlay.classList.remove("hidden");
    els.winnerFlagBox.innerText = flag.emoji;
    els.winnerName.innerText = flag.name;
    
    // Voice Announcement
    if ('speechSynthesis' in window) {
        let speech = new SpeechSynthesisUtterance("The winner is " + flag.name);
        speech.rate = 1.0;
        window.speechSynthesis.speak(speech);
    }
    
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
  
  // 1 Minute Timer Logic
  let elapsed = (Date.now() - startTime) / 1000;
  let timeLeft = Math.max(0, roundDuration - elapsed);
  
  let mins = Math.floor(timeLeft / 60);
  let secs = Math.floor(timeLeft % 60);
  els.timerText.innerText = `0${mins}:${secs < 10 ? '0' : ''}${secs}`;
  els.timeText2.innerText = `${Math.floor(timeLeft)}s`;
  
  // সময়ের সাথে সাথে গেম ফাস্ট হবে এবং কাটা জায়গাটি বড় হবে (যাতে ৬০ সেকেন্ডে গেম শেষ হয়)
  let timeRatio = elapsed / roundDuration;
  let currentGapSize = baseGapSize + (timeRatio * Math.PI); // ফাঁকা জায়গা ধীরে ধীরে বড় হবে
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
          if (dist > arenaR + 5) { eliminate(f); } // ফাঁকা দিয়ে বের হয়ে গেল
      } else {
          // সাদা দাগে ধাক্কা খেয়ে ফিরে আসা
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

  // Dead Flags Physics (নিচে মাধ্যাকর্ষণের ফলে জমা হওয়া)
  for (let f of deadFlags) {
      f.vy += 0.3; // Gravity (নিচের দিকে টানবে)
      f.x += f.vx * 0.9;
      f.y += f.vy;
      
      // স্ক্রিনের একদম নিচে আটকে যাওয়া
      if (f.y >= canvas.height - f.r) {
          f.y = canvas.height - f.r;
          f.vy *= -0.3; // হালকা বাউন্স করে থেমে যাবে
          f.vx *= 0.8;
      }
      // স্ক্রিনের বাইরে যেন না যায়
      if (f.x <= f.r) { f.x = f.r; f.vx *= -0.5; }
      if (f.x >= canvas.width - f.r) { f.x = canvas.width - f.r; f.vx *= -0.5; }
  }
  
  // Draw Arena (কাটা সাদা রিং)
  ctx.beginPath();
  ctx.arc(arenaX, arenaY, arenaR, gapAngle + currentGapSize, gapAngle + Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  
  // Draw Yellow Exit Ring (হলুদ কাটা অংশ)
  ctx.beginPath();
  ctx.arc(arenaX, arenaY, arenaR, gapAngle, gapAngle + currentGapSize);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffd23f";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#ffd23f";
  ctx.stroke();
  ctx.shadowBlur = 0; 

  // Draw Dead Flags (নিচে পড়ে থাকা ফ্ল্যাগগুলো)
  ctx.font = "18px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.5; // একটু আবছা দেখাবে
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
