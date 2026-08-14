/* ============================================================
   WORLD COUNTRY FLAG BATTLE — audio.js
   100% synthesized Web Audio sound effects + generative ambient
   pad + Speech Synthesis voice announcer. No external audio
   files are required, so there is nothing to fail to load.
   ============================================================ */

(function (global) {
  "use strict";

  class AudioSystem {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.sfxGain = null;
      this.musicGain = null;
      this.unlocked = false;

      this.soundOn = true;
      this.voiceOn = true;
      this.musicOn = true;
      this.volume = 0.8;

      this._lastCollision = 0;
      this._lastWall = 0;
      this._musicTimer = null;
      this._musicStep = 0;
      this._voiceSupported =
        typeof window !== "undefined" && "speechSynthesis" in window;
      this._voices = [];

      if (this._voiceSupported) {
        const loadVoices = () => {
          this._voices = window.speechSynthesis.getVoices();
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    // Must be called from within a user-gesture handler (e.g. Start click)
    unlock() {
      if (this.unlocked) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 1;
        this.sfxGain.connect(this.master);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.18;
        this.musicGain.connect(this.master);

        if (this.ctx.state === "suspended") this.ctx.resume();
        this.unlocked = true;
        this._startMusicLoop();
      } catch (e) {
        console.warn("Web Audio unavailable, continuing without sound.", e);
        this.unlocked = false;
      }
    }

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      if (this.master) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }

    // ---------- low level helpers ----------
    _now() {
      return this.ctx ? this.ctx.currentTime : 0;
    }

    _envGain(startVal, atTime) {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, atTime);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, startVal), atTime + 0.008);
      return g;
    }

    _tone({ freq = 440, dur = 0.12, type = "sine", startGain = 0.4, glideTo = null, dest = null }) {
      if (!this.ctx || !this.soundOn) return;
      const t0 = this._now();
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      const g = this._envGain(startGain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(dest || this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    _noiseBurst({ dur = 0.06, startGain = 0.3, filterFreq = 1200, dest = null }) {
      if (!this.ctx || !this.soundOn) return;
      const t0 = this._now();
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = filterFreq;
      const g = this._envGain(startGain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      noise.connect(filter);
      filter.connect(g);
      g.connect(dest || this.sfxGain);
      noise.start(t0);
      noise.stop(t0 + dur + 0.01);
    }

    // ---------- gameplay sounds ----------
    collision(intensity) {
      // intensity: 0..1
      if (!this.ctx || !this.soundOn) return;
      const t = performance.now();
      if (t - this._lastCollision < 28) return; // throttle
      this._lastCollision = t;
      const amp = 0.15 + intensity * 0.55;
      this._noiseBurst({ dur: 0.05 + intensity * 0.05, startGain: amp * 0.6, filterFreq: 900 + intensity * 1800 });
      this._tone({
        freq: 180 + intensity * 260,
        dur: 0.07 + intensity * 0.06,
        type: "triangle",
        startGain: amp,
        glideTo: 90 + intensity * 80,
      });
    }

    wallBounce(intensity) {
      if (!this.ctx || !this.soundOn) return;
      const t = performance.now();
      if (t - this._lastWall < 40) return;
      this._lastWall = t;
      const amp = 0.1 + intensity * 0.25;
      this._tone({ freq: 620 + intensity * 200, dur: 0.05, type: "sine", startGain: amp, glideTo: 900 });
    }

    elimination() {
      if (!this.ctx || !this.soundOn) return;
      this._tone({ freq: 520, dur: 0.22, type: "sawtooth", startGain: 0.28, glideTo: 90 });
      this._noiseBurst({ dur: 0.15, startGain: 0.18, filterFreq: 500 });
    }

    countdownBeep(isGo) {
      if (!this.ctx || !this.soundOn) return;
      if (isGo) {
        this._tone({ freq: 880, dur: 0.35, type: "square", startGain: 0.35, glideTo: 1200 });
      } else {
        this._tone({ freq: 440, dur: 0.15, type: "square", startGain: 0.3 });
      }
    }

    roundWinner() {
      if (!this.ctx || !this.soundOn) return;
      const t0 = this._now();
      [523.25, 659.25, 783.99].forEach((f, i) => {
        this._tone({ freq: f, dur: 0.28, type: "triangle", startGain: 0.22 });
      });
    }

    stageTransition() {
      if (!this.ctx || !this.soundOn) return;
      this._tone({ freq: 220, dur: 0.5, type: "sawtooth", startGain: 0.25, glideTo: 440 });
    }

    champion() {
      if (!this.ctx || !this.soundOn) return;
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
      notes.forEach((f, i) => {
        setTimeout(() => {
          this._tone({ freq: f, dur: 0.4, type: "triangle", startGain: 0.3 });
          this._noiseBurst({ dur: 0.08, startGain: 0.08, filterFreq: 3000 });
        }, i * 160);
      });
    }

    // ---------- generative ambient music ----------
    _startMusicLoop() {
      if (this._musicTimer) return;
      const scale = [0, 2, 4, 7, 9, 12, 14, 16]; // major-ish pentatonic-extended
      const base = 220;
      const step = () => {
        if (this.musicOn && this.ctx) {
          const degree = scale[Math.floor(Math.random() * scale.length)];
          const freq = base * Math.pow(2, degree / 12);
          const t0 = this._now();
          const osc = this.ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.4);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
          osc.connect(g);
          g.connect(this.musicGain);
          osc.start(t0);
          osc.stop(t0 + 2.3);
        }
        this._musicTimer = setTimeout(step, 1400 + Math.random() * 900);
      };
      step();
    }

    // ---------- speech synthesis ----------
    speak(text) {
      if (!this.voiceOn || !this._voiceSupported) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.03;
        u.pitch = 1.0;
        u.volume = this.volume;
        const preferred = this._voices.find(
          (v) => /en-US|en_US|English/i.test(v.lang + v.name) && /Male|Google US/i.test(v.name)
        );
        if (preferred) u.voice = preferred;
        window.speechSynthesis.speak(u);
      } catch (e) {
        // silently ignore — speech is a nice-to-have
      }
    }
  }

  global.WCFB = global.WCFB || {};
  global.WCFB.AudioSystem = AudioSystem;
})(window);
