/* ============================================================
   WORLD COUNTRY FLAG BATTLE — physics.js
   Lightweight 2D circle physics: position/velocity integration,
   flag-vs-flag collision (broad phase via spatial grid + elastic
   response), arena boundary collision, health/damage/elimination.
   ============================================================ */

(function (global) {
  "use strict";

  const MAX_SPEED = 240;
  const MIN_JITTER = 6;
  const FRICTION = 0.999;
  const WALL_DAMPING = 0.9;
  const RESTITUTION = 0.98;
  const IFRAME_MS = 220; // brief invulnerability after taking damage
  const SPAWN_GRACE_MS = 700;

  let _flagInstanceCounter = 0;

  class Flag {
    constructor(country, x, y, radius) {
      this.iid = _flagInstanceCounter++; // unique per-instance id (dedupe collisions)
      this.country = country; // {id, code, name, emoji}
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 70;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.baseRadius = radius;
      this.radius = radius;
      this.maxHealth = 100;
      this.health = 100;
      this.eliminated = false;
      this.spawnT = performance.now();
      this.lastHitT = 0;
      this.hitFlashT = 0;
      this.wallFlashT = 0;
      this.killsThisRound = 0;
      this.damageThisRound = 0;
      this.roundWins = 0;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.6;
    }

    get invulnerable() {
      const now = performance.now();
      return now - this.spawnT < SPAWN_GRACE_MS || now - this.lastHitT < IFRAME_MS;
    }

    takeDamage(amount, attacker) {
      if (this.eliminated || this.invulnerable) return false;
      this.health -= amount;
      this.lastHitT = performance.now();
      this.hitFlashT = this.lastHitT;
      if (attacker) attacker.damageThisRound += amount;
      if (this.health <= 0) {
        this.health = 0;
        this.eliminated = true;
        if (attacker) attacker.killsThisRound += 1;
        return true; // died
      }
      return false;
    }
  }

  class Arena {
    constructor(cx, cy, radius) {
      this.cx = cx;
      this.cy = cy;
      this.radius = radius;
    }
  }

  class PhysicsWorld {
    constructor(arena) {
      this.arena = arena;
      this.flags = []; // active flags only
      this.cellSize = 48;
      this.grid = new Map();
      this.damageScale = 2.0; // adjusted by "collision intensity" setting
      this.rubberBand = 1; // grows if a stage stalls, to force resolution
      this.onCollision = null; // (intensityNorm, flagA, flagB) => void
      this.onWallHit = null; // (intensityNorm, flag) => void
      this.onElimination = null; // (victim, attacker|null) => void
      this.onParticles = null; // (x, y, color, count, power) => void
    }

    setFlags(flags) {
      this.flags = flags;
    }

    _cellKey(x, y) {
      const cx = Math.floor(x / this.cellSize);
      const cy = Math.floor(y / this.cellSize);
      return cx + "," + cy;
    }

    _buildGrid() {
      this.grid.clear();
      for (const f of this.flags) {
        if (f.eliminated) continue;
        const key = this._cellKey(f.x, f.y);
        let arr = this.grid.get(key);
        if (!arr) {
          arr = [];
          this.grid.set(key, arr);
        }
        arr.push(f);
      }
    }

    _neighbors(f) {
      const baseCx = Math.floor(f.x / this.cellSize);
      const baseCy = Math.floor(f.y / this.cellSize);
      const out = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const arr = this.grid.get(baseCx + dx + "," + (baseCy + dy));
          if (arr) out.push(arr);
        }
      }
      return out;
    }

    step(dt) {
      const arena = this.arena;
      const flags = this.flags;

      // integrate + jitter + friction + boundary
      for (const f of flags) {
        if (f.eliminated) continue;

        // gentle brownian jitter so motion never fully dies down
        f.vx += (Math.random() - 0.5) * MIN_JITTER * dt;
        f.vy += (Math.random() - 0.5) * MIN_JITTER * dt;

        f.vx *= FRICTION;
        f.vy *= FRICTION;

        const speed = Math.hypot(f.vx, f.vy);
        if (speed > MAX_SPEED) {
          const s = MAX_SPEED / speed;
          f.vx *= s;
          f.vy *= s;
        }

        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rotation += f.rotationSpeed * dt;

        // arena boundary
        const dxc = f.x - arena.cx;
        const dyc = f.y - arena.cy;
        const dist = Math.hypot(dxc, dyc);
        const limit = arena.radius - f.radius;
        if (dist > limit && limit > 0) {
          const nx = dxc / (dist || 1);
          const ny = dyc / (dist || 1);
          f.x = arena.cx + nx * limit;
          f.y = arena.cy + ny * limit;
          const vn = f.vx * nx + f.vy * ny;
          if (vn > 0) {
            f.vx -= 2 * vn * nx;
            f.vy -= 2 * vn * ny;
            f.vx *= WALL_DAMPING;
            f.vy *= WALL_DAMPING;
          }
          const impactNorm = Math.min(1, Math.abs(vn) / MAX_SPEED);
          f.wallFlashT = performance.now();
          if (this.onWallHit) this.onWallHit(impactNorm, f);
          if (impactNorm > 0.25 && this.onParticles) {
            this.onParticles(f.x, f.y, "wall", 4, impactNorm);
          }
        }
      }

      // collisions (broad phase grid) — dedupe pairs via instance id
      this._buildGrid();
      const seen = new Set();
      for (const f of flags) {
        if (f.eliminated) continue;
        const buckets = this._neighbors(f);
        for (const bucket of buckets) {
          for (const other of bucket) {
            if (other === f || other.eliminated) continue;
            const key = f.iid < other.iid ? f.iid + "_" + other.iid : other.iid + "_" + f.iid;
            if (seen.has(key)) continue;
            seen.add(key);
            this._resolvePair(f, other, dt);
          }
        }
      }
    }

    _resolvePair(a, b, dt) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const minDist = a.radius + b.radius;
      if (dist >= minDist) return;

      const nx = dx / dist;
      const ny = dy / dist;

      // separate overlap
      const overlap = minDist - dist;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      // relative velocity along normal
      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const velAlongNormal = rvx * nx + rvy * ny;

      let impactSpeed = Math.abs(velAlongNormal);

      if (velAlongNormal < 0) {
        // approaching — apply impulse (equal mass elastic-ish collision)
        const j = -(1 + RESTITUTION) * velAlongNormal / 2;
        const ix = j * nx;
        const iy = j * ny;
        a.vx -= ix;
        a.vy -= iy;
        b.vx += ix;
        b.vy += iy;
      } else {
        // already resolving separation (e.g. from jitter) — still register a soft tap
        impactSpeed = Math.max(impactSpeed, 12);
      }

      const intensityNorm = Math.min(1, impactSpeed / 180);
      if (this.onCollision) this.onCollision(intensityNorm, a, b);

      if (intensityNorm > 0.3 && this.onParticles) {
        this.onParticles((a.x + b.x) / 2, (a.y + b.y) / 2, "hit", 6, intensityNorm);
      }

      // damage both, scaled by intensity + settings + rubber band
      const dmg = 3 + intensityNorm * 16 * this.damageScale * this.rubberBand;
      const aDied = a.takeDamage(dmg * (0.7 + Math.random() * 0.6), b);
      const bDied = b.takeDamage(dmg * (0.7 + Math.random() * 0.6), a);

      // (a/b can only die here if they were NOT invulnerable at hit time, since
      // takeDamage() bails out for invulnerable targets before applying damage)
      if (aDied && this.onElimination) this.onElimination(a, b);
      if (bDied && this.onElimination) this.onElimination(b, a);
    }
  }

  global.WCFB = global.WCFB || {};
  global.WCFB.Flag = Flag;
  global.WCFB.Arena = Arena;
  global.WCFB.PhysicsWorld = PhysicsWorld;
})(window);
