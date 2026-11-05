/**
 * Efectos de sonido sintetizados con WebAudio. No requieren recursos externos
 * y respetan la prohibición de reproducir audio antes de una interacción.
 */
export class Sfx {
  private context: AudioContext | null = null;
  enabled = true;

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (this.context) {
      if (this.context.state === "suspended") void this.context.resume();
      return this.context;
    }
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) return null;
    try {
      this.context = new AudioCtor();
      return this.context;
    } catch {
      return null;
    }
  }

  unlock(): void {
    this.ensureContext();
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled && this.context) {
      void this.context.suspend();
    } else if (this.enabled) {
      this.ensureContext();
    }
    return this.enabled;
  }

  private tone(
    frequency: number,
    duration: number,
    options: {
      type?: OscillatorType;
      volume?: number;
      delay?: number;
      slideTo?: number;
    } = {},
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const start = ctx.currentTime + (options.delay ?? 0);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(30, options.slideTo),
        start + duration,
      );
    }
    const volume = options.volume ?? 0.035;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  select(index: number): void {
    try {
      const notes = [392, 440, 494, 523, 587, 659, 698, 784];
      const note = notes[index % notes.length];
      if (typeof note !== "number" || !isFinite(note)) return;
      this.tone(note, 0.09, {
        type: "triangle",
        volume: 0.025,
      });
    } catch {}
  }

  undo(): void {
    this.tone(330, 0.08, { type: "triangle", volume: 0.02, slideTo: 262 });
  }

  invalid(): void {
    this.tone(180, 0.16, { type: "sawtooth", volume: 0.025, slideTo: 120 });
    this.tone(140, 0.2, {
      type: "sawtooth",
      volume: 0.022,
      delay: 0.09,
      slideTo: 90,
    });
  }

  attack(length: number): void {
    const base = 330;
    const steps = Math.min(6, Math.max(2, length - 1));
    for (let i = 0; i < steps; i += 1) {
      this.tone(base * Math.pow(1.12, i), 0.12, {
        type: "triangle",
        volume: 0.03,
        delay: i * 0.035,
      });
    }
  }

  hit(): void {
    this.tone(150, 0.18, { type: "sawtooth", volume: 0.04, slideTo: 55 });
    this.tone(90, 0.22, { type: "square", volume: 0.025, delay: 0.02 });
  }

  block(): void {
    this.tone(220, 0.12, { type: "square", volume: 0.028, slideTo: 330 });
    this.tone(330, 0.16, { type: "triangle", volume: 0.02, delay: 0.05 });
  }

  heal(): void {
    this.tone(523, 0.18, { type: "sine", volume: 0.025 });
    this.tone(659, 0.2, { type: "sine", volume: 0.022, delay: 0.07 });
    this.tone(784, 0.26, { type: "sine", volume: 0.02, delay: 0.14 });
  }

  interrupt(): void {
    this.tone(880, 0.1, { type: "square", volume: 0.025 });
    this.tone(1108, 0.14, { type: "square", volume: 0.022, delay: 0.06 });
    this.tone(1318, 0.2, { type: "triangle", volume: 0.02, delay: 0.12 });
  }

  shuffle(): void {
    for (let i = 0; i < 5; i += 1) {
      this.tone(300 + Math.random() * 400, 0.06, {
        type: "triangle",
        volume: 0.018,
        delay: i * 0.04,
      });
    }
  }

  hint(): void {
    this.tone(700, 0.1, { type: "sine", volume: 0.022 });
    this.tone(930, 0.16, { type: "sine", volume: 0.02, delay: 0.08 });
  }

  reward(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((note, index) => {
      this.tone(note, 0.24, {
        type: "triangle",
        volume: 0.028,
        delay: index * 0.08,
      });
    });
  }

  victory(): void {
    const notes = [392, 523, 659, 784, 1046];
    notes.forEach((note, index) => {
      this.tone(note, 0.34, {
        type: "triangle",
        volume: 0.03,
        delay: index * 0.11,
      });
    });
  }

  defeat(): void {
    const notes = [392, 330, 262, 196];
    notes.forEach((note, index) => {
      this.tone(note, 0.4, {
        type: "sawtooth",
        volume: 0.025,
        delay: index * 0.16,
      });
    });
  }

  destroy(): void {
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }
}
