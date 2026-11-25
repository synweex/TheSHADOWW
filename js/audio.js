// Sunete sintetizate cu WebAudio (fără fișiere externe) + vibrații
window.SC = window.SC || {};

SC.Audio = (function () {
  let ctx = null;
  let master = null;
  let enabled = true;
  let vibrate = true;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, delay = 0) {
    if (!enabled || !ensure()) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol = 0.2, freq = 800, delay = 0) {
    if (!enabled || !ensure()) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  function buzz(ms) {
    if (vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  return {
    unlock: ensure,
    setEnabled(v) { enabled = v; },
    setVibrate(v) { vibrate = v; },
    click() { tone(660, 0.06, 'triangle', 0.15); },
    drop() { tone(420, 0.18, 'sine', 0.12, 220); },
    land() { noise(0.12, 0.35, 500); tone(110, 0.12, 'sine', 0.25, 70); buzz(15); },
    perfect(combo) {
      const base = 520 * Math.pow(1.06, Math.min(combo, 12));
      tone(base, 0.12, 'triangle', 0.22);
      tone(base * 1.5, 0.18, 'triangle', 0.18, null, 0.07);
      noise(0.08, 0.2, 600);
      buzz(25);
    },
    fail() { tone(300, 0.4, 'sawtooth', 0.12, 80); noise(0.3, 0.25, 300, 0.1); buzz([40, 40, 60]); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.2, null, i * 0.11)); buzz([30, 50, 30]); },
    over() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, null, i * 0.15)); },
    milestone() { [659, 880, 1175].forEach((f, i) => tone(f, 0.3, 'sine', 0.18, null, i * 0.09)); buzz(30); },
    coin() { tone(988, 0.08, 'square', 0.08); tone(1319, 0.12, 'square', 0.08, null, 0.07); },
  };
})();
