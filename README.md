# 🌍 World Country Flag Battle

A fully automatic, physics-driven flag battle-royale tournament that runs entirely
in the browser — vanilla HTML/CSS/JS only, no build step, no backend.

## Run it locally
Just open `index.html` in a browser, or serve the folder with any static server
(`npx serve .`). Everything — physics, sound, voice, tournament logic — runs
client-side.

## Deploy (GitHub → Vercel)
1. Push this folder's contents to a new GitHub repository.
2. Go to vercel.com → **New Project** → import that repo.
3. Framework preset: **Other** (static site). Leave build command empty.
4. Click **Deploy**. Done — Vercel serves `index.html` directly.

## How a tournament works
- Press **Start** once. Flags spawn at random positions/velocities inside the
  circular arena and the tournament runs to completion automatically, forever
  (if Auto Mode is on), with a brand-new random bracket and champion every time.
- Physics: each flag has health; collisions (flag-vs-flag and flag-vs-wall) deal
  damage scaled by impact speed. A flag is eliminated when health hits zero.
- Every ~6.5s (scaled by battle speed) the flag with the most kills/damage in
  that window is crowned that round's spotlight winner — this drives the round
  counter, the voice announcer, and the "Qualified for Final" strip.
- Stage (Qualifying → Knockout → Quarter-Final → Semi-Final → FINAL) is derived
  purely from how many flags remain, so it works the same at any flag count.
- A "rubber-band" system quietly increases damage if a stage stalls too long
  (mainly relevant to 1-vs-1 finals), guaranteeing every tournament finishes.
- All-time leaderboard (wins / finals reached / titles) is saved to
  `localStorage` and persists across tournaments and page reloads.

## Flags
Flags are rendered from Unicode regional-indicator emoji (no image downloads,
nothing to fail to load). If you want higher-fidelity flag art, drop PNGs into
`assets/flags/<ISO-CODE>.png` (e.g. `assets/flags/JP.png`) and flip
`USE_IMAGE_FLAGS` to `true` at the top of `game.js` — the renderer already
knows to prefer the PNG and silently fall back to the emoji if one is missing.

## Settings
Gear icon → number of flags (50/100/150/200/All), collision intensity, and
default battle speed. Sound/Voice/Music/Auto Mode/Volume live in the main
control bar for quick access during a stream. Everything is saved to
`localStorage` automatically.

## Files
```
index.html    structure + all overlays
style.css     esports/broadcast visual theme
countries.js  235-nation dataset + emoji-flag generator
audio.js      Web Audio SFX/music + Speech Synthesis announcer
physics.js    circle-collision physics engine
game.js       tournament state machine, rendering loop, UI wiring
assets/flags  optional — drop PNGs here (see "Flags" above)
```
