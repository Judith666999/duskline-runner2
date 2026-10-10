import { loadSetting, saveSetting } from './config.js';

export class AudioSystem {
  constructor() { this.enabled = loadSetting('duskline-sound', 'on') === 'on'; this.context = null; this.timer = null; this.step = 0; }
  unlock() {
    if (!this.enabled) return;
    if (!this.context) { this.context = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.context.createGain(); this.master.gain.value = 0.58; this.master.connect(this.context.destination); }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
  }
  tone(frequency, duration, type = 'sine', volume = 0.05, delay = 0, end = frequency * 0.7) {
    if (!this.enabled || !this.context) return;
    const t = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator(), envelope = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, t); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    envelope.gain.setValueAtTime(0.001, t); envelope.gain.linearRampToValueAtTime(volume, t + 0.008); envelope.gain.exponentialRampToValueAtTime(0.001, t + duration);
    oscillator.connect(envelope).connect(this.master); oscillator.start(t); oscillator.stop(t + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
  effect(name, value = 1) {
    if (name === 'coin') { this.tone(720 + Math.min(value, 12) * 35, .085, 'triangle', .09, 0, 1250); }
    else if (name === 'jump') this.tone(210, .17, 'sine', .08, 0, 620);
    else if (name === 'slide') this.tone(160, .23, 'sawtooth', .026, 0, 45);
    else if (name === 'hit') { this.tone(70, .38, 'triangle', .2, 0, 25); this.tone(110, .15, 'sawtooth', .06); }
    else if (name === 'start') { [220, 330, 440].forEach((f, i) => this.tone(f, .14, 'triangle', .07, i * .07, f)); }
    else if (name === 'record') { [440, 554, 660, 880].forEach((f, i) => this.tone(f, .25, 'triangle', .07, i * .12, f)); }
    else if (name === 'land') this.tone(85, .07, 'triangle', .04);
    else this.tone(320, .04, 'sine', .035, 0, 260);
  }
  music(start) {
    this.stop(); if (!start || !this.enabled || !this.context) return;
    this.step = 0;
    const notes = [110, 0, 164.81, 0, 138.59, 0, 123.47, 0, 110, 0, 185, 0, 146.83, 0, 164.81, 0];
    this.timer = setInterval(() => { const note = notes[this.step++ % notes.length]; if (note) this.tone(note, .4, 'sine', .012, 0, note); }, 360);
  }
  stop() { if (this.timer !== null) clearInterval(this.timer); this.timer = null; }
  toggle(running) { this.enabled = !this.enabled; saveSetting('duskline-sound', this.enabled ? 'on' : 'off'); if (this.enabled) { this.unlock(); this.effect('click'); this.music(running); } else this.stop(); return this.enabled; }
}
