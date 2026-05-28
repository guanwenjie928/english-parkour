// 8-bit 音效合成器 — Web Audio API 零文件依赖
// 惰性单例 + 数据驱动合成，所有音效用纯配置定义

class SoundGenerator {
  static #instance = null;
  #ctx = null;
  #masterGain = null;
  #bgmNodes = null;
  #bgmPlaying = null;

  static get() {
    return this.#instance ??= new SoundGenerator();
  }

  // 音效定义表 — 纯数据，无命令式代码
  #definitions = Object.freeze({
    correct:   { osc: 'square', notes: ['C5','E5','G5'], dur: 0.15, gap: 0.08, gain: 0.25, type: 'arpeggio' },
    wrong:     { osc: 'sawtooth', notes: ['C4','G3'], dur: 0.3, gap: 0, gain: 0.2, type: 'slide', filterFreq: 800 },
    item_get:  { osc: 'sine', notes: ['C5','C6'], dur: 0.12, gap: 0.06, gain: 0.2, type: 'jump' },
    rocket:    { osc: 'sawtooth', notes: ['G2','G3','G4'], dur: 0.3, gap: 0.05, gain: 0.15, type: 'sweep', sweepStart: 200, sweepEnd: 800 },
    electric:  { osc: 'square', notes: ['C5'], dur: 0.1, gap: 0.08, gain: 0.18, type: 'noise_burst', bursts: 3 },
    banana:    { osc: 'triangle', notes: ['E4','C3'], dur: 0.35, gap: 0, gain: 0.2, type: 'slide', vibrato: 8 },
    shield:    { osc: 'sine', notes: ['G3','C5'], dur: 0.2, gap: 0.04, gain: 0.18, type: 'sweep', sweepStart: 200, sweepEnd: 1200 },
    countdown: { osc: 'square', notes: ['C4'], dur: 0.12, gap: 0, gain: 0.3, type: 'perc', percFreq: 80 },
    victory:   { osc: 'square', notes: ['C4','E4','G4','C5'], dur: 0.22, gap: 0.1, gain: 0.22, type: 'arpeggio' },
    click:     { osc: 'sine', notes: ['C6'], dur: 0.02, gap: 0, gain: 0.15, type: 'staccato' },
    heartbeat: { osc: 'sine', notes: ['C2'], dur: 0.08, gap: 0.15, gain: 0.3, type: 'double_pulse', pulseGap: 0.12 },
    go:        { osc: 'square', notes: ['C5','E5','G5','C6'], dur: 0.1, gap: 0.05, gain: 0.25, type: 'arpeggio' },
  });

  // BGM 定义
  #bgmDefs = Object.freeze({
    menu: { bpm: 100, pattern: ['C4','E4','G4','C5','G4','E4'], osc: 'square', gain: 0.08, noteLen: 0.4 },
    game: { bpm: 140, pattern: ['C4','C4','G4','G4','A4','A4','G4','F4','F4','E4','E4','D4','D4','C4'], osc: 'square', gain: 0.06, noteLen: 0.15 },
    final: { bpm: 90, pattern: ['C4','E4','G4','C5','E5','C5','G4','E4','C4','D4','F4','A4','D5','A4','F4','D4'], osc: 'triangle', gain: 0.07, noteLen: 0.3 },
  });

  // 确保 AudioContext 已初始化（用户手势后调用）
  #ensureContext() {
    if (!this.#ctx) {
      this.#ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.#masterGain = this.#ctx.createGain();
      this.#masterGain.gain.value = 0.8;
      this.#masterGain.connect(this.#ctx.destination);
    }
    if (this.#ctx.state === 'suspended') this.#ctx.resume();
  }

  // 主播放接口
  play(name) {
    const def = this.#definitions[name];
    if (!def) return;
    this.#ensureContext();
    const now = this.#ctx.currentTime;

    if (def.type === 'noise_burst') {
      this.#playNoiseBurst(def, now);
      return;
    }

    def.notes.forEach((note, i) => {
      const offset = i * (def.dur + def.gap);
      this.#scheduleTone(def, note, now + offset);
    });
  }

  #scheduleTone(def, note, startTime) {
    const osc = this.#ctx.createOscillator();
    const gain = this.#ctx.createGain();
    const freq = this.#noteToFreq(note);

    osc.type = def.osc;

    if (def.type === 'slide' && def.notes.length === 2 && note === def.notes[0]) {
      osc.frequency.setValueAtTime(this.#noteToFreq(def.notes[0]), startTime);
      osc.frequency.linearRampToValueAtTime(this.#noteToFreq(def.notes[1]), startTime + def.dur);
    } else if (def.type === 'sweep') {
      osc.frequency.setValueAtTime(def.sweepStart, startTime);
      osc.frequency.exponentialRampToValueAtTime(def.sweepEnd, startTime + def.dur);
    } else if (def.type === 'perc') {
      osc.frequency.setValueAtTime(def.percFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(def.percFreq * 0.5, startTime + def.dur);
    } else if (def.type === 'double_pulse') {
      // 双脉冲 thump-thump
      gain.gain.setValueAtTime(def.gain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + def.dur);
      gain.gain.setValueAtTime(def.gain, startTime + def.pulseGap);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + def.pulseGap + def.dur);
    } else {
      osc.frequency.setValueAtTime(freq, startTime);
    }

    // 包络
    if (def.type !== 'double_pulse') {
      gain.gain.setValueAtTime(def.gain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + def.dur);
    }

    osc.connect(gain);
    gain.connect(this.#masterGain);
    osc.start(startTime);
    osc.stop(startTime + def.dur + def.gap + 0.05);
  }

  #playNoiseBurst(def, startTime) {
    const burstDur = def.dur;
    const gap = def.gap;
    for (let b = 0; b < def.bursts; b++) {
      const t = startTime + b * (burstDur + gap);
      const bufferSize = this.#ctx.sampleRate * burstDur;
      const buffer = this.#ctx.createBuffer(1, bufferSize, this.#ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const source = this.#ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.#ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2000;
      filter.Q.value = 0.5;

      const gain = this.#ctx.createGain();
      gain.gain.setValueAtTime(def.gain, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + burstDur);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.#masterGain);
      source.start(t);
      source.stop(t + burstDur);
    }
  }

  #noteToFreq(note) {
    const NOTES = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
    const octave = +note.slice(-1);
    const semitone = NOTES[note[0]] + (note[1] === '#' ? 1 : 0);
    return 440 * Math.pow(2, (semitone - 9 + (octave - 4) * 12) / 12);
  }

  // === BGM 播放 ===
  playBGM(name) {
    this.#ensureContext();
    this.stopBGM();

    const def = this.#bgmDefs[name];
    if (!def) return;

    this.#bgmPlaying = name;
    const beatLen = 60 / def.bpm;

    const scheduleLoop = () => {
      if (this.#bgmPlaying !== name) return;
      const now = this.#ctx.currentTime;

      def.pattern.forEach((note, i) => {
        const osc = this.#ctx.createOscillator();
        const gain = this.#ctx.createGain();
        osc.type = def.osc;
        osc.frequency.setValueAtTime(this.#noteToFreq(note), now + i * beatLen);
        gain.gain.setValueAtTime(def.gain, now + i * beatLen);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * beatLen + def.noteLen);
        osc.connect(gain);
        gain.connect(this.#masterGain);
        osc.start(now + i * beatLen);
        osc.stop(now + i * beatLen + def.noteLen + 0.05);
      });

      const loopDuration = def.pattern.length * beatLen;
      this.#bgmNodes = setTimeout(scheduleLoop, loopDuration * 1000 - 100); // 提前100ms调度
    };

    scheduleLoop();
  }

  stopBGM() {
    this.#bgmPlaying = null;
    if (this.#bgmNodes) { clearTimeout(this.#bgmNodes); this.#bgmNodes = null; }
  }

  fadeBGM(duration = 1.0) {
    if (!this.#masterGain) return;
    const now = this.#ctx.currentTime;
    this.#masterGain.gain.setValueAtTime(this.#masterGain.gain.value, now);
    this.#masterGain.gain.linearRampToValueAtTime(0.001, now + duration);
  }

  setMasterVolume(v) {
    if (this.#masterGain) this.#masterGain.gain.value = clamp(v, 0, 1);
  }

  // 确保 AudioContext 在用户手势后恢复
  static unlock() {
    const inst = SoundGenerator.get();
    inst.#ensureContext();

    // 浏览器自动播放策略：AudioContext 必须在用户手势后创建/恢复
    // 注册一次性事件监听，在用户首次交互时恢复 AudioContext
    if (inst.#ctx && inst.#ctx.state === 'suspended') {
      const resume = () => {
        inst.#ensureContext();
      };
      document.addEventListener('click', resume, { once: true });
      document.addEventListener('touchstart', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
    }
  }
}

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

export { SoundGenerator };
