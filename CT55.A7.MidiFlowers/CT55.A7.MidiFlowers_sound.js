/* CT55.A7.MidiFlowers -- sound.
 *
 * ONE software synthesizer makes every sample, both for the speakers and for the movie, so the movie's sound is
 * exactly what you hear and is locked to the picture (the CT54 lesson: live Web Audio nodes cannot be captured in
 * step with a recording that runs slower than real time).
 *
 *  * Not recording: a ScriptProcessor pulls Synth.render() in real time (48 kHz).
 *  * Recording: each movie frame renders exactly its own share of samples (48000 / fps) in the frame loop; those
 *    samples go to the movie's audio encoder AND into a small queue the speakers play from, so you still hear it.
 *
 * Voices:  bell  - a soft pastel bell for a flower (pentatonic, panned to where it leaves the emitter)
 *          bloom - the pulse: a 3-note bell chord plus a low soft thump
 *          wind  - band-passed noise whose loudness follows the number of swirling flowers and the travel speed
 * Nothing is loaded from the internet; no sound files.
 */
(function (global) {
  'use strict';
  const SR = 48000;
  const TBL = 4096, SINE = new Float32Array(TBL + 1);
  for (let i = 0; i <= TBL; i++) SINE[i] = Math.sin(2 * Math.PI * i / TBL);
  const sin1 = (ph) => { const p = (ph - Math.floor(ph)) * TBL, i = p | 0, f = p - i; return SINE[i] + (SINE[i + 1] - SINE[i]) * f; };

  // C major pentatonic, MIDI note numbers
  const SCALE = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const PARTIALS = [[1, 1, 1.7], [2.0, 0.32, 0.9], [3.01, 0.15, 0.5], [4.17, 0.07, 0.28]];   // ratio, amp, decay s

  class Synth {
    constructor() {
      this.voices = []; this.maxVoices = 40;
      this.seed = 0x5eed55;
      this.wind = { level: 0, target: 0, fc: 600, lpL: 0, bpL: 0, lpR: 0, bpR: 0, ph: 0 };
      this.master = 0.8; this.muted = false;
    }
    rnd() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
    clear() { this.voices.length = 0; }
    _push(v) { this.voices.push(v); if (this.voices.length > this.maxVoices) this.voices.shift(); }
    /** a flower: pan -1..1, bright 0..1 picks the register */
    bell(pan = 0, bright = 0.5, gain = 0.16) {
      const k = Math.min(SCALE.length - 1, Math.max(0, Math.floor((bright * 0.6 + this.rnd() * 0.4) * SCALE.length)));
      const f = mtof(SCALE[k]) * (1 + (this.rnd() - 0.5) * 0.004);
      this._push({ kind: 'bell', f, pan, gain, t: 0, ph: PARTIALS.map(() => this.rnd()) });
    }
    /** the pulse */
    bloom(pan = 0, gain = 0.5) {
      const root = 60 + [0, 2, 4, 7, 9][Math.floor(this.rnd() * 5)];
      for (const iv of [0, 7, 16]) this._push({ kind: 'bell', f: mtof(root + iv), pan: pan + (iv - 7) / 30, gain: 0.14, t: 0, ph: PARTIALS.map(() => this.rnd()), slow: 1.6 });
      this._push({ kind: 'thump', pan, gain, t: 0, ph: 0 });
    }
    /** wind loudness target 0..1 */
    setWind(x) { this.wind.target = Math.max(0, Math.min(1, x)); }

    /** n stereo samples, planar [L0..Ln-1, R0..Rn-1] */
    render(n) {
      const out = new Float32Array(2 * n), dt = 1 / SR, W = this.wind;
      // voices
      for (let vi = this.voices.length - 1; vi >= 0; vi--) {
        const v = this.voices[vi];
        const pn = Math.max(-1, Math.min(1, v.pan)), pl = Math.cos((pn + 1) * Math.PI / 4), pr = Math.sin((pn + 1) * Math.PI / 4);
        let t = v.t, alive = false;
        if (v.kind === 'bell') {
          const slow = v.slow || 1;
          for (let s = 0; s < n; s++, t += dt) {
            const att = t < 0.004 ? t / 0.004 : 1;
            let x = 0;
            for (let p = 0; p < PARTIALS.length; p++) {
              const [r, a, d] = PARTIALS[p];
              const e = Math.exp(-t / (d * slow)); if (e < 1e-4) continue;
              v.ph[p] += v.f * r * dt; x += sin1(v.ph[p]) * a * e;
            }
            x *= att * v.gain; out[s] += x * pl; out[n + s] += x * pr;
          }
          alive = t < 1.7 * slow * 7;                       // e^-7: inaudible
        } else if (v.kind === 'thump') {
          for (let s = 0; s < n; s++, t += dt) {
            const f = 45 + 50 * Math.exp(-t / 0.08);
            v.ph += f * dt;
            const e = (t < 0.006 ? t / 0.006 : 1) * Math.exp(-t / 0.22);
            const x = sin1(v.ph) * e * v.gain; out[s] += x * pl; out[n + s] += x * pr;
          }
          alive = t < 1.6;
        }
        v.t = t;
        if (!alive) this.voices.splice(vi, 1);
      }
      // wind: two decorrelated noise channels through a state-variable band-pass whose centre wanders
      const k = 1 - Math.exp(-dt / 0.35);
      for (let s = 0; s < n; s++) {
        W.level += (W.target - W.level) * k;
        if (W.level < 1e-4) continue;
        W.ph += dt * 0.11;
        const fc = 420 + 260 * sin1(W.ph) + 180 * sin1(W.ph * 2.7 + 0.3);
        const F = 2 * Math.sin(Math.PI * fc / SR), Q = 0.9;
        const nl = this.rnd() * 2 - 1, nr = this.rnd() * 2 - 1;
        W.lpL += F * W.bpL; const hpL = nl - W.lpL - Q * W.bpL; W.bpL += F * hpL;
        W.lpR += F * W.bpR; const hpR = nr - W.lpR - Q * W.bpR; W.bpR += F * hpR;
        const g = W.level * 0.22;
        out[s] += W.bpL * g; out[n + s] += W.bpR * g;
      }
      // master + soft limiter
      const m = this.muted ? 0 : this.master;
      for (let i = 0; i < 2 * n; i++) out[i] = Math.tanh(out[i] * m * 1.4);
      return out;
    }
  }

  /** speakers: real-time pull when live; a queue fed by the movie frames while recording */
  class Speaker {
    constructor(synth) { this.synth = synth; this.ctx = null; this.mode = 'live'; this.q = []; this.qLen = 0; this.qOff = 0; }
    get running() { return !!this.ctx && this.ctx.state === 'running'; }
    start() {
      if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
      const AC = global.AudioContext || global.webkitAudioContext; if (!AC) return;
      try { this.ctx = new AC({ sampleRate: SR }); } catch { this.ctx = new AC(); }
      this.synth.clear();
      const node = this.ctx.createScriptProcessor(1024, 0, 2);
      node.onaudioprocess = (e) => {
        const L = e.outputBuffer.getChannelData(0), R = e.outputBuffer.getChannelData(1), n = L.length;
        if (this.mode === 'live') { const b = this.synth.render(n); L.set(b.subarray(0, n)); R.set(b.subarray(n)); return; }
        // recording: play what the movie frames made (silence if they are late)
        let w = 0;
        while (w < n && this.q.length) {
          const b = this.q[0], bn = b.length / 2, take = Math.min(n - w, bn - this.qOff);
          L.set(b.subarray(this.qOff, this.qOff + take), w); R.set(b.subarray(bn + this.qOff, bn + this.qOff + take), w);
          w += take; this.qOff += take; this.qLen -= take;
          if (this.qOff >= bn) { this.q.shift(); this.qOff = 0; }
        }
        for (; w < n; w++) { L[w] = 0; R[w] = 0; }
      };
      node.connect(this.ctx.destination);
      this.node = node;
      if (this.ctx.state !== 'running') this.ctx.resume();
    }
    setMode(m) { this.mode = m; this.q.length = 0; this.qLen = 0; this.qOff = 0; }
    /** while recording: a movie frame's samples, to be heard */
    feed(buf) {
      if (this.mode !== 'film' || !this.running) return;
      this.q.push(buf); this.qLen += buf.length / 2;
      while (this.qLen > SR * 0.35 && this.q.length > 1) { const b = this.q.shift(); this.qLen -= b.length / 2 - this.qOff; this.qOff = 0; }
    }
  }

  global.CT55Sound = { SR, Synth, Speaker };
})(window);
