const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");

const els = {
  app: document.getElementById("app"),
  modeSelector: document.getElementById("mode-selector"),
  activeCount: document.getElementById("activeCount"),
  progressBar: document.getElementById("progressBar"),
  winnerOverlay: document.getElementById("winnerOverlay"),
  winnerName: document.getElementById("winnerName"),
  winnerFlagBox: document.getElementById("winnerFlagBox"),
  qualifiedList: document.getElementById("qualifiedList"),
  timerText: document.getElementById("timerText"),
  timeText2: document.getElementById("timeText2")
};

let TOTAL_FLAGS = 193; 
let flags = [];
let activeFlags = [];
let deadFlags = [];

let whiteAngle = 0;       
let yellowAngle = 0;      

const gapSize = Math.PI / 3.4;     
const yellowSize = Math.PI / 4.2;  

const whiteSpeed = 0.018; 
const yellowSpeed = 0.052; 

let arenaR = 0, arenaX = 0, arenaY = 0;
let viewWidth = 0, viewHeight = 0;
let dpr = 1;
let isPlaying = false;
let round = 1;

let startTime = 0;
let roundDuration = 45; 

let qualifiedTeams = [];

let audioCtx = null;
let lastSoundTime = 0;

let bgmInterval = null;
let bgmStep = 0;
const bgmNotes = [220, 261.63, 293.66, 329.63, 392.00, 440, 523.25, 329.63]; 

function unlockAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

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
      
      gain.gain.setValueAtTime(0.012, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.38);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}
  }, 220); 
}

function stopBGM() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

function playSound(type, intensity = 1) {
  if (!audioCtx) return;
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
      
      const vol = Math.min(0.07, 0.015 + intensity * 0.008);
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
      stopBGM(); 
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
  ["MA","Morocco"],["MZ","Mozambique"],["MM","Myanmar"],["NA","Namibia"],["NR","Nauru"],
  ["NP","Nepal"],["NL","Netherlands"],["NZ","New Zealand"],["NI","Nicaragua"],["NE","Niger"],
  ["NG","Nigeria"],["KP","North Korea"],["MK","North Macedonia"],["NO","Norway"],["OM","Oman"],
  ["PK","Pakistan"],["PW","Palau"],["PA","Panama"],["PG","Papua New Guinea"],["PY","Paraguay"],
  ["PE","Peru"],["PH","Philippines"],["PL","Poland"],["PT","Portugal"],["QA","Qatar"],
  ["RO","Romania"],["RU","Russia"],["RW","Rwanda"],["KN","Saint Kitts and Nevis"],["LC","Saint Lucia"],
  ["VC","Saint Vincent and the Grenadines"],["WS","Samoa"],["SM","San Marino"],["ST","Sao Tome and Principe"],["SA","Saudi Arabia"],
  ["SN","Senegal"],["RS","Serbia"],["SC","Seychelles"],["SL","Sierra Leone"],["SG","Singapore"],
  ["SK","Slovakia"],["SI","Slovenia"],["SB","Solomon Islands"],["SO","Somalia"],["ZA","South Africa"],
  ["KR","South Korea"],["SS","South Sudan"],["ES","Spain"],["LK","Sri Lanka"],["SD","Sudan"],
  ["SR","Suriname"],["SE","Sweden"],["CH","Switzerland"],["SY","Syria"],["TJ","Tajikistan"],
  ["TZ","Tanzania"],["TH","Thailand"],["TL","Timor-Leste"],["TG","Togo"],["TO","Tonga"],
  ["TT","Trinidad and Tobago"],["TN","Tunisia"],["TR","Turkey"],["TM","Turkmenistan"],["TV","Tuvalu"],
  ["UG","Uganda"],["UA","Ukraine"],["AE","United Arab Emirates"],["GB","United Kingdom"],["US","United States"],
  ["UY","Uruguay"],["UZ","Uzbekistan"],["VU","Vanuatu"],["VE","Venezuela"],["VN","Vietnam"],
  ["YE","Yemen"],["ZM","Zambia"],["ZW","Zimbabwe"]
];

const countryList = countryData.map(([code, name]) => [code, name, codeToFlagEmoji(code)]);
TOTAL_FLAGS = countryList.length;

function startGame(mode) {
  unlockAudio();
  document.body.classList.add(mode + '-mode');
  els.modeSelector.classList.add("hidden");
  els.app.classList.remove("hidden");
  
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  
  initGame();
  isPlaying = true;
  startBGM(); 
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  viewWidth = rect.width;
  viewHeight = rect.height;
  
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  
  canvas.width = viewWidth * dpr;
  canvas.height = viewHeight * dpr;
  
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  arenaX = viewWidth / 2;
  arenaY = viewHeight / 2 - 35;
  arenaR = Math.min(arenaX, arenaY) - 35; 

  const itemWidth = 22;
  const itemsPerRow = Math.max(10, Math.floor((viewWidth - 20) / itemWidth));
  const startX = (viewWidth - (itemsPerRow * itemWidth)) / 2 + 11;

  deadFlags.forEach((flag, idx) => {
    const col = idx % itemsPerRow;
    const row = Math.floor(idx / itemsPerRow);
    flag.targetX = startX + col * itemWidth;
    flag.targetY = viewHeight - 12 - (row * 18);
    if (flag.settled) {
      flag.x = flag.targetX;
      flag.y = flag.targetY;
    }
  });
}

function initGame() {
  flags = [];
  deadFlags = [];
  startTime = Date.now();
  
  for (let i = 0; i < TOTAL_FLAGS; i++) {
    let country = countryList[i];
    let flagObj = {
      id: i, code: country[0], name: country[1], emoji: country[2],
      x: arenaX + (Math.random() - 0.5) * (arenaR * 0.8),
      y: arenaY + (Math.random() - 0.5) * (arenaR * 0.8),
      vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
      r: 10, active: true, settled: false, targetX: 0, targetY: 0
    };
    flags.push(flagObj);
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
  
  const slotIndex = deadFlags.length;
  const itemWidth = 22;
  const itemsPerRow = Math.max(10, Math.floor((viewWidth - 20) / itemWidth));
  const col = slotIndex % itemsPerRow;
  const row = Math.floor(slotIndex / itemsPerRow);
  
  const startX = (viewWidth - (itemsPerRow * itemWidth)) / 2 + 11;
  flag.targetX = startX + col * itemWidth;
  flag.targetY = viewHeight - 12 - (row * 18);
  flag.settled = false;

  deadFlags.push(flag); 
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
    
    recordQualifier(flag);
    
    setTimeout(() => {
        els.winnerOverlay.classList.add("hidden");
        round++;
        document.getElementById("roundText").innerText = round;
        initGame();
        isPlaying = true;
        startBGM(); 
        requestAnimationFrame(gameLoop);
    }, 5000);
}

function updateUI() {
  if (els.activeCount && els.progressBar) {
    els.activeCount.innerText = activeFlags.length;
    let ratio = activeFlags.length / TOTAL_FLAGS;
    els.progressBar.style.width = (ratio * 100) + "%";
  }
}

function recordQualifier(flag) {
  let entry = qualifiedTeams.find(t => t.code === flag.code);
  if (entry) {
    entry.wins++;
  } else {
    qualifiedTeams.push({ code: flag.code, name: flag.name, emoji: flag.emoji, wins: 1 });
  }
  updateLeaderboard();
}

function updateLeaderboard() {
    if (qualifiedTeams.length === 0) {
        els.qualifiedList.innerHTML = `
            <div class="board-row" style="justify-content:center; opacity:0.6;">
                No qualifiers yet — finish a round!
            </div>`;
        return;
    }
    let sorted = [...qualifiedTeams].sort((a, b) => b.wins - a.wins);
    els.qualifiedList.innerHTML = sorted.map((c, i) => `
        <div class="board-row">
            <span class="rank">#${i+1}</span>
            <span>${c.emoji} ${c.name}</span>
            <span class="win-count">${c.wins} win${c.wins > 1 ? 's' : ''}</span>
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

  let activeGapSize = (timeLeft === 0 && activeFlags.length > 1) ? gapSize * 2.2 : gapSize;

  let progress = Math.min(1, elapsed / roundDuration);
  let targetCount = Math.max(1, Math.floor(TOTAL_FLAGS * (1 - Math.pow(progress, 0.75))));
  let pressureMult = activeFlags.length > targetCount ? 1.0 + (activeFlags.length - targetCount) * 0.08 : 1.0;
  let speedMult = (1.2 + progress * 2.2) * pressureMult; 
  
  whiteAngle = normalizeAngle(whiteAngle + whiteSpeed);
  yellowAngle = normalizeAngle(yellowAngle + yellowSpeed);
  
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  
  let gStart = whiteAngle;
  let gEnd = normalizeAngle(whiteAngle + activeGapSize);
  
  let yStart = yellowAngle;
  let yEnd = normalizeAngle(yellowAngle + yellowSize);

  const len = activeFlags.length;
  for (let i = 0; i < len; i++) {
    let f1 = activeFlags[i];
    for (let j = i + 1; j < len; j++) {
      let f2 = activeFlags[j];
      let dx = f2.x - f1.x;
      let dy = f2.y - f1.y;
      let distSq = dx * dx + dy * dy;
      let minDist = f1.r + f2.r;
      if (distSq < minDist * minDist && distSq > 0) {
        let dist = Math.sqrt(distSq);
        let overlap = minDist - dist;
        let nx = dx / dist;
        let ny = dy / dist;
        f1.x -= nx * overlap * 0.15;
        f1.y -= ny * overlap * 0.15;
        f2.x += nx * overlap * 0.15;
        f2.y += ny * overlap * 0.15;
      }
    }
  }

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

  for (let f of deadFlags) {
      if (!f.settled) {
          f.vy += 0.4;
          f.x += (f.targetX - f.x) * 0.12;
          f.y += f.vy;
          
          if (f.y >= f.targetY) {
              f.y = f.targetY;
              f.x = f.targetX;
              f.settled = true;
              f.vx = 0;
              f.vy = 0;
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

  // 🟡 ৩. মোটা গোল্ডেন ইয়োলো হরাইজন্টাল লাইন (ডান থেকে বাম দিকে কমে আসবে)
  let flagRatio = activeFlags.length / TOTAL_FLAGS;
  let fullLineWidth = arenaR * 1.7; // পুরো লাইনের সর্বোচ্চ দৈর্ঘ্য
  let lineStartX = arenaX - (fullLineWidth / 2); // বাঁ দিকের স্টার্টিং পয়েন্ট
  let currentLineWidth = fullLineWidth * flagRatio;
  let lineY = arenaY + arenaR + 12; // রিংয়ের নিচে পজিশন

  ctx.beginPath();
  ctx.moveTo(lineStartX, lineY);
  ctx.lineTo(lineStartX + currentLineWidth, lineY);
  ctx.lineWidth = 6; // লাইন মোটা করা হয়েছে
  ctx.strokeStyle = "#ffd700";
  ctx.lineCap = "round";
  ctx.stroke();

  // 🏷️ ৪. লাইনের ঠিক নিচে "KOTO BY KOTO FLAG ACHE" টেক্সট
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "#ffd700";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${activeFlags.length} / ${TOTAL_FLAGS} FLAGS`, arenaX, lineY + 8);

  // HD Font Rendering
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  ctx.font = "15px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  ctx.globalAlpha = 0.85; 
  for (let f of deadFlags) {
      ctx.fillText(f.emoji, f.x, f.y);
  }

  ctx.font = "22px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  ctx.globalAlpha = 1.0;
  for (let f of activeFlags) {
      ctx.fillText(f.emoji, f.x, f.y);
  }
  
  requestAnimationFrame(gameLoop);
}

document.addEventListener("click", unlockAudio);
document.addEventListener("touchstart", unlockAudio);
