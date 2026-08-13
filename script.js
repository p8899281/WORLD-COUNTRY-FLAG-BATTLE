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

let whiteAngle = 0;       
let yellowAngle = 0;      

const gapSize = Math.PI / 4.5;    // ফিক্সড গ্যাপ (~40 degree)
const yellowSize = Math.PI / 3;   // হলুদ দরজার মাপ (~60 degree)

const whiteSpeed = 0.018; 
const yellowSpeed = 0.052; 

let arenaR = 0, arenaX = 0, arenaY = 0;
let isPlaying = false;
let round = 1;

let startTime = 0;
let roundDuration = 45; // ৪৫ সেকেন্ডের রাউন্ড

// Web Audio System
let audioCtx = null;
let lastSoundTime = 0;

// 🎵 Background Music Engine Variables
let bgmInterval = null;
let bgmStep = 0;
const bgmNotes = [220, 261.63, 293.66, 329.63, 392.00, 440, 523.25, 329.63]; // A Minor Pentatonic Scale

function unlockAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 🎶 Background Music Loop (ASMR Chill Synth)
function startBGM() {
  stopBGM();
  bgmStep = 0;
  bgmInterval = setInterval(() => {
    if (!audioCtx || !isPlaying) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      const freq = bgmNotes[bgmStep % bgmNotes.length];
      bgmStep++;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      // খুব মায়াবী ও সফট ভলিউম
      gain.gain.setValueAtTime(0.012, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.38);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}
  }, 220); // ২০০ মিলিসেকেন্ড পরপর বিট বাজবে
}

function stopBGM() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

// 🎧 ASMR Sound Synthesizer Engine
function playSound(type, intensity = 1) {
  if (!audioCtx || !isPlaying) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const nowTime = Date.now();

  try {
    if (type === "bounce") {
      if (nowTime - lastSoundTime < 30) return;
      lastSoundTime = nowTime;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      const basePitch = 230 + Math.random() * 40 + Math.min(intensity, 3) * 15;
      osc.type = "sine";
      
      osc.frequency.setValueAtTime(basePitch, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.035);
      
      const vol = Math.min(0.06, 0.015 + intensity * 0.008);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.045);

    } else if (type === "out") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(280 + Math.random() * 40, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(550, audioCtx.currentTime + 0.04);
      osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.13);

    } else if (type === "win") {
      stopBGM(); // উইনার স্ক্রিনে বিজিএম সাময়িকভাবে অফ হয়ে চিম বাজবে
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);
        
        gain.gain.setValueAtTime(0.001, audioCtx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + idx * 0.08 + 1.2);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.08);
        osc.stop(audioCtx.currentTime + idx * 0.08 + 1.25);
      });
    }
  } catch (e) {}
}

function speakWinner(name) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("The winner is " + name);
    utterance.rate = 0.92;
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
  startBGM(); // বিজিএম শুরু
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
      vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
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
  if (!flag.active) return;
  flag.active = false;
  playSound("out");
  
  activeFlags = activeFlags.filter(f => f.id !== flag.id);
  deadFlags.push(flag); 
  
  const gridEl = document.getElementById("grid-flag-" + flag.id);
  if (gridEl) gridEl.classList.add("eliminated");
  
  updateUI();
  
  if (activeFlags.length === 1) {
      declareWinner(activeFlags[0]);
  }
}

function declareWinner(flag) {
    if (!isPlaying) return;
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
        startBGM(); // পরবর্তী রাউন্ডের জন্য BGM আবার চালু
        requestAnimationFrame(gameLoop);
    }, 5000);
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
  
  let dot = (f.vx * nx) + (f.vy * ny);
  
  if (dot > 0) {
    f.x = arenaX + nx * (arenaR - f.r);
    f.y = arenaY + ny * (arenaR - f.r);
    
    f.vx -= 2 * dot * nx;
    f.vy -= 2 * dot * ny;
    
    const speed = Math.abs(dot);
    if (speed > 0.8) {
      playSound("bounce", speed);
    }
  }
}

function gameLoop() {
  if (!isPlaying) return;
  
  let elapsed = (Date.now() - startTime) / 1000;
  let timeLeft = Math.max(0, roundDuration - elapsed);
  
  let mins = Math.floor(timeLeft / 60);
  let secs = Math.floor(timeLeft % 60);
  els.timerText.innerText = `0${mins}:${secs < 10 ? '0' : ''}${secs}`;
  els.timeText2.innerText = `${Math.floor(timeLeft)}s`;

  let progress = Math.min(1, elapsed / roundDuration);
  
  let targetCount = Math.max(1, Math.floor(TOTAL_FLAGS * (1 - Math.pow(progress, 0.75))));
  let pressureMult = activeFlags.length > targetCount ? 1.0 + (activeFlags.length - targetCount) * 0.08 : 1.0;
  
  let speedMult = (1.2 + progress * 2.2) * pressureMult; 
  
  whiteAngle = normalizeAngle(whiteAngle + whiteSpeed);
  yellowAngle = normalizeAngle(yellowAngle + yellowSpeed);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  let gStart = whiteAngle;
  let gEnd = normalizeAngle(whiteAngle + gapSize);
  
  let yStart = yellowAngle;
  let yEnd = normalizeAngle(yellowAngle + yellowSize);

  // Active Flags Physics
  for (let f of [...activeFlags]) {
    let dx = f.x - arenaX;
    let dy = f.y - arenaY;
    let dist = Math.hypot(dx, dy) || 1;
    
    if (dist < arenaR * 0.6) {
        f.vx += (dx / dist) * 0.2 * pressureMult;
        f.vy += (dy / dist) * 0.2 * pressureMult;
    }

    f.x += f.vx * (speedMult * 0.35);
    f.y += f.vy * (speedMult * 0.35);
    
    if (dist > arenaR - f.r) {
      let fAngle = normalizeAngle(Math.atan2(dy, dx));
      
      let inGap = isAngleBetween(fAngle, gStart, gEnd);

      if (inGap) {
          let inYellow = isAngleBetween(fAngle, yStart, yEnd);
          
          if (inYellow) {
              bounceFlag(f, dx, dy, dist); 
          } else {
              if (dist > arenaR + 6) { eliminate(f); }
          }
      } else {
          bounceFlag(f, dx, dy, dist);
      }
    }
  }

  // Dead Flags Physics
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

  // RENDER RINGS
  ctx.beginPath();
  ctx.arc(arenaX, arenaY, arenaR, gEnd, gStart);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(arenaX, arenaY, arenaR, yStart, yEnd);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffd23f";
  ctx.shadowBlur = 14;
  ctx.shadowColor = "#ffd23f";
  ctx.stroke();
  ctx.shadowBlur = 0; 

  // Dead Flags Render
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.55;
  for (let f of deadFlags) {
      ctx.fillText(f.emoji, f.x, f.y);
  }
  ctx.globalAlpha = 1.0;

  // Active Flags Render
  ctx.font = "22px Arial";
  for (let f of activeFlags) {
      ctx.fillText(f.emoji, f.x, f.y);
  }
  
  requestAnimationFrame(gameLoop);
}

document.addEventListener("click", unlockAudio);
document.addEventListener("touchstart", unlockAudio);
