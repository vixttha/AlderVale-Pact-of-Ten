class AcademyAudioSynth {
  private ctx: AudioContext | null = null;
  private harpTimer: ReturnType<typeof setInterval> | null = null;
  private harpVolume = 0.25;
  private sfxVolume = 0.55;
  private unlocked = false;

  public unlock() {
    if (this.unlocked) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.ctx && AudioCtx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      this.unlocked = true;
      this.startAmbienceLoop();
    } catch {
      // Ignore if audio unavailable
    }
  }

  public setVolumes(harp: number, sfx: number) {
    this.harpVolume = Math.max(0, Math.min(1, harp));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
  }

  private startAmbienceLoop() {
    if (this.harpTimer) return;
    // Gentle C-major pentatonic acoustic harp frequencies
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    let step = 0;
    this.harpTimer = setInterval(() => {
      if (!this.ctx || this.harpVolume <= 0.01 || this.ctx.state !== 'running') return;
      const idx = (step * 2 + (step % 3)) % scale.length;
      step += 1;
      this.pluckHarp(scale[idx], 1.6, this.harpVolume * 0.14);
    }, 1850);
  }

  public pluckHarp(freq: number, duration = 1.1, gainPeak = 0.08) {
    if (!this.ctx || gainPeak <= 0.002) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(380, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  public playChime(kind: 'cast' | 'fizzle' | 'victory' | 'ui' | 'fish') {
    this.unlock();
    if (!this.ctx || this.sfxVolume <= 0.01) return;
    const vol = this.sfxVolume * 0.18;
    if (kind === 'ui') {
      this.pluckHarp(587.33, 0.28, vol * 0.65);
    } else if (kind === 'cast') {
      this.pluckHarp(440, 0.45, vol);
      setTimeout(() => this.pluckHarp(659.25, 0.55, vol), 80);
    } else if (kind === 'fizzle') {
      this.pluckHarp(196, 0.35, vol);
      setTimeout(() => this.pluckHarp(146.83, 0.45, vol), 90);
    } else if (kind === 'victory') {
      [392, 493.88, 587.33, 783.99].forEach((f, i) => {
        setTimeout(() => this.pluckHarp(f, 0.85, vol), i * 110);
      });
    } else if (kind === 'fish') {
      this.pluckHarp(523.25, 0.4, vol);
      setTimeout(() => this.pluckHarp(783.99, 0.6, vol), 90);
    }
  }
}

export const academyAudio = new AcademyAudioSynth();
