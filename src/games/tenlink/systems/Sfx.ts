/**
 * Efectos sintetizados con WebAudio, sin archivos externos. Se activan tras la
 * primera interacción del jugador.
 */
export class Sfx {
  private context: AudioContext | null = null;
  enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

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

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.context) void this.context.suspend();
    if (enabled) this.ensureContext();
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
    const context = this.ensureContext();
    if (!context) return;
    const start = context.currentTime + (options.delay ?? 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(30, options.slideTo),
        start + duration,
      );
    }
    const volume = options.volume ?? 0.03;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  click(): void {
    this.tone(480, 0.06, { type: "triangle", volume: 0.02 });
  }

  select(): void {
    this.tone(640, 0.08, { type: "triangle", volume: 0.024 });
  }

  deselect(): void {
    this.tone(420, 0.07, { type: "triangle", volume: 0.018 });
  }

  match(): void {
    this.tone(520, 0.16, { type: "sine", volume: 0.028, slideTo: 980 });
    this.tone(780, 0.14, { type: "triangle", volume: 0.018, delay: 0.04 });
  }

  invalid(): void {
    this.tone(180, 0.14, { type: "sawtooth", volume: 0.02, slideTo: 120 });
  }

  undo(): void {
    this.tone(340, 0.09, { type: "triangle", volume: 0.02, slideTo: 260 });
  }

  hint(): void {
    this.tone(720, 0.1, { type: "sine", volume: 0.02 });
    this.tone(960, 0.14, { type: "sine", volume: 0.018, delay: 0.07 });
  }

  victory(): void {
    const notes = [392, 523, 659, 784, 1046];
    notes.forEach((note, index) => {
      this.tone(note, 0.3, {
        type: "triangle",
        volume: 0.026,
        delay: index * 0.09,
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
