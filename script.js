const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");

// All base elements
const els = {
  app: document.getElementById("app"),
  modeSelector: document.getElementById("mode-selector"),
  activeCount: document.getElementById("activeCount"),
  progressBar: document.getElementById("progressBar"),
  flagGrid: document.getElementById("flagGrid"),
  winnerOverlay: document.getElementById("winnerOverlay"),
  winnerName: document.getElementById("winnerName"),
  winnerFlagBox: document.getElementById("winnerFlagBox"),
  qualifiedList: document.getElementById("qualifiedList")
};

let TOTAL_FLAGS = 250;
let flags = [];
let activeFlags = [];
let gapAngle = 0;
let gapSize = Math.PI / 4; // 45 degrees gap (ফাঁকা জায়গা)
let arenaR = 0, arenaX = 0, arenaY = 0;
let isPlaying = false;
let round = 1;

// Sample Flags (২৫০টি ফ্ল্যাগ বানানোর জন্য ডামি ডাটা)
const countryList = [
  ["IN","India","🇮🇳"], ["US","United States","🇺🇸"], ["GB","United Kingdom","🇬🇧"], 
  ["BD","Bangladesh","🇧🇩"], ["CM","Cameroon","🇨🇲"], ["BF","Burkina Faso","🇧🇫"],
  ["SC","Seychelles","🇸🇨"], ["MW","Malawi","🇲🇼"], ["SZ","Eswatini","🇸🇿"],
  ["BR","Brazil","🇧🇷"], ["AR","Argentina","🇦🇷"], ["FR","France","🇫🇷"]
];
// Fill array to 250
while(countryList.length < TOTAL_FLAGS) {
    countryList.push(countryList[Math.floor(Math.random() * countryList.length)]);
}

function startGame(mode) {
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
  arenaY = canvas.height / 2;
  arenaR = Math.min(arenaX, arenaY) - 20; // 20px padding
}

function initGame() {
  flags = [];
  els.flagGrid.innerHTML = "";
  
  for (let i = 0; i < TOTAL_FLAGS; i++) {
    let country = countryList[i];
    let flagObj = {
      id: i,
      code: country[0],
      name: country[1],
      emoji: country[2],
      x: arenaX + (Math.random() - 0.5) * (arenaR * 0.8),
      y: arenaY + (Math.random() - 0.5) * (arenaR * 0.8),
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      r: 10,
      active: true
    };
    flags.push(flagObj);
    
    // Add to UI Grid
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

// Normalize angle between 0 and 2PI
function normalizeAngle(a) {
  while (a < 0) a += Math.PI * 2;
  while (a >= Math.PI * 2) a -= Math.PI * 2;
  return a;
}

function eliminate(flag) {
  flag.active = false;
  activeFlags = activeFlags.filter(f => f.id !== flag.id);
  document.getElementById("grid-flag-" + flag.id).classList.add("eliminated");
  updateUI();
  
  if (activeFlags.length === 1) {
      declareWinner(activeFlags[0]);
  }
}

function declareWinner(flag) {
    isPlaying = false;
    els.winnerOverlay.classList.remove("hidden");
    els.winnerFlagBox.innerText = flag.emoji;
    els.winnerName.innerText = flag.name;
    
    // Auto restart round after 5 seconds
    setTimeout(() => {
        els.winnerOverlay.classList.add("hidden");
        round++;
        document.getElementById("roundText").innerText = round;
        initGame();
        isPlaying = true;
        requestAnimationFrame(gameLoop);
    }, 5000);
}

function updateUI() {
  els.activeCount.innerText = activeFlags.length;
  let percent = (activeFlags.length / TOTAL_FLAGS) * 100;
  els.progressBar.style.width = percent + "%";
}

// Leaderboard updater (Top 5)
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

function gameLoop() {
  if (!isPlaying) return;
  
  // Rotate the Gap
  gapAngle = normalizeAngle(gapAngle + 0.02);
  
  // Clear Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Update Physics (গতিবিধি ও বাউন্স)
  for (let f of activeFlags) {
    f.x += f.vx;
    f.y += f.vy;
    
    let dx = f.x - arenaX;
    let dy = f.y - arenaY;
    let dist = Math.hypot(dx, dy);
    
    // Check Ring Collision
    if (dist > arenaR - f.r) {
      let fAngle = normalizeAngle(Math.atan2(dy, dx));
      let gStart = gapAngle;
      let gEnd = normalizeAngle(gapAngle + gapSize);
      
      let inGap = false;
      if (gStart < gEnd) {
          if (fAngle >= gStart && fAngle <= gEnd) inGap = true;
      } else {
          if (fAngle >= gStart || fAngle <= gEnd) inGap = true;
      }
      
      if (inGap) {
          // ফাঁকা জায়গা পেলে বাইরে বেরিয়ে যাবে
          if (dist > arenaR + 20) { 
              eliminate(f); 
          }
      } else {
          // সাদা দাগে ধাক্কা খেয়ে ফিরে আসবে
          let nx = dx / dist;
          let ny = dy / dist;
          f.x = arenaX + nx * (arenaR - f.r);
          f.y = arenaY + ny * (arenaR - f.r);
          
          let dot = (f.vx * nx) + (f.vy * ny);
          f.vx -= 2 * dot * nx;
          f.vy -= 2 * dot * ny;
      }
    }
  }
  
  // Draw Arena (সাদা দাগ)
  ctx.beginPath();
  ctx.arc(arenaX, arenaY, arenaR, gapAngle + gapSize, gapAngle + Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ffffff";
  ctx.stroke();
  
  // Draw Arena Gap (হলুদ বের হওয়ার জায়গা)
  ctx.beginPath();
  ctx.arc(arenaX, arenaY, arenaR, gapAngle, gapAngle + gapSize);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffd23f";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#ffd23f";
  ctx.stroke();
  ctx.shadowBlur = 0; // Reset shadow

  // Draw Flags (ইমোজি রেন্ডার)
  ctx.font = "22px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let f of activeFlags) {
      ctx.fillText(f.emoji, f.x, f.y);
  }
  
  requestAnimationFrame(gameLoop);
}
