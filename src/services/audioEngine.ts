// Advanced ICU Acoustics & Mechanical Ventilator Sound Synthesizer (Web Audio API)
// High-fidelity real-time procedural synthesis:
// 1. Servo-valve pneumatics (metal click, corrugated tube gas resonance, humidifier bubbler)
// 2. Exhalation diaphragm release (PEEP valve pop, exponential decompression hiss, wheezing on high Raw)
// 3. Spontaneous trigger suction and electronic detection chirp
// 4. ICU Ambient room soundscape (medical gas wall outlet hiss, laminar air HVAC hum, distant ICU beeps)
// 5. Infusion pump (Bomba de infusão) stepper clicks and periodic reminder chirps
// 6. Philips IntelliVue / GE Solar style dual-harmonic SpO2 monitor pulse with real-time pitch tracking
// 7. IEC 60601-1-8 / ISO 9703-2 compliant multi-tone ICU alarm sequences

export interface AudioSettings {
  masterVolume: number; // 0.0 to 1.0
  soundEnabled: boolean;
  breathSoundsEnabled: boolean;
  pulseOxToneEnabled: boolean;
  icuAmbianceEnabled: boolean;
  infusionPumpEnabled: boolean;
  humidifierBubblerEnabled: boolean;
  uiClicksEnabled: boolean;
  alarmsEnabled: boolean;
  breathVolume: number; // 0.0 to 1.0
  pulseOxVolume: number; // 0.0 to 1.0
  ambianceVolume: number; // 0.0 to 1.0
}

class VentilatorAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private stateChangeListeners: Array<(state: string) => void> = [];

  // Dedicated sub-bus gain nodes
  private breathGain: GainNode | null = null;
  private pulseOxGain: GainNode | null = null;
  private ambianceGain: GainNode | null = null;
  private alarmGain: GainNode | null = null;

  // Background Ambient Nodes & Timers
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private ambientGainNode: GainNode | null = null;
  private pumpTimer: number | null = null;
  private distantBeepTimer: number | null = null;
  private alarmInterval: number | null = null;
  private currentAlarmSeverity: 'high' | 'medium' | 'low' | null = null;

  private settings: AudioSettings = {
    masterVolume: 0.85,
    soundEnabled: true,
    breathSoundsEnabled: true,
    pulseOxToneEnabled: true,
    icuAmbianceEnabled: true, // Authentic ICU background hum & gas lines
    infusionPumpEnabled: true, // Realistic infusion pump chirps
    humidifierBubblerEnabled: true,
    uiClicksEnabled: true,
    alarmsEnabled: true,
    breathVolume: 0.9,
    pulseOxVolume: 0.65,
    ambianceVolume: 0.45,
  };

  constructor() {
    this.attachAutoUnlock();
  }

  public onStateChange(cb: (state: string) => void) {
    this.stateChangeListeners.push(cb);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter((l) => l !== cb);
    };
  }

  private notifyState() {
    const s = this.getContextState();
    this.stateChangeListeners.forEach((cb) => {
      try {
        cb(s);
      } catch {
        // Ignore
      }
    });
  }

  private attachAutoUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = async () => {
      try {
        const ctx = this.getOrCreateContext();
        if (ctx && ctx.state === 'suspended') {
          await ctx.resume();
        }
        this.notifyState();
        this.syncAmbianceState();
      } catch {
        // Fallback
      }
    };

    const events = ['click', 'pointerdown', 'touchstart', 'keydown', 'mousedown'];
    events.forEach((ev) => {
      window.addEventListener(ev, unlock, { capture: true, passive: true });
      document.addEventListener(ev, unlock, { capture: true, passive: true });
    });
  }

  private getOrCreateContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();

        // Master Gain Bus
        this.masterGain = this.ctx.createGain();
        const initialVol = this.isMuted || !this.settings.soundEnabled ? 0 : this.settings.masterVolume;
        this.masterGain.gain.setValueAtTime(initialVol, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // Sub-buses
        this.breathGain = this.ctx.createGain();
        this.breathGain.gain.setValueAtTime(this.settings.breathVolume, this.ctx.currentTime);
        this.breathGain.connect(this.masterGain);

        this.pulseOxGain = this.ctx.createGain();
        this.pulseOxGain.gain.setValueAtTime(this.settings.pulseOxVolume, this.ctx.currentTime);
        this.pulseOxGain.connect(this.masterGain);

        this.ambianceGain = this.ctx.createGain();
        this.ambianceGain.gain.setValueAtTime(this.settings.ambianceVolume, this.ctx.currentTime);
        this.ambianceGain.connect(this.masterGain);

        this.alarmGain = this.ctx.createGain();
        this.alarmGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.alarmGain.connect(this.masterGain);

        this.ctx.onstatechange = () => {
          this.notifyState();
          this.syncAmbianceState();
        };
      }
    }

    return this.ctx;
  }

  public async resumeAudio(): Promise<boolean> {
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx) return false;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.syncAmbianceState();
      this.notifyState();
      this.playConfirmBeep();
      return true;
    } catch (e) {
      console.warn('Audio resume error:', e);
      return false;
    }
  }

  public getContextState(): 'running' | 'suspended' | 'closed' | 'uninitialized' {
    if (!this.ctx) return 'uninitialized';
    return this.ctx.state as 'running' | 'suspended' | 'closed';
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };

    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.masterGain) {
        const vol = this.isMuted || !this.settings.soundEnabled ? 0 : this.settings.masterVolume;
        this.masterGain.gain.setValueAtTime(vol, now);
      }
      if (this.breathGain) {
        this.breathGain.gain.setValueAtTime(
          this.settings.breathSoundsEnabled ? this.settings.breathVolume : 0,
          now
        );
      }
      if (this.pulseOxGain) {
        this.pulseOxGain.gain.setValueAtTime(
          this.settings.pulseOxToneEnabled ? this.settings.pulseOxVolume : 0,
          now
        );
      }
      if (this.ambianceGain) {
        this.ambianceGain.gain.setValueAtTime(
          this.settings.icuAmbianceEnabled ? this.settings.ambianceVolume : 0,
          now
        );
      }
    }

    if (!this.settings.alarmsEnabled || !this.settings.soundEnabled || this.isMuted) {
      this.stopAlarm();
    }

    this.syncAmbianceState();
    this.notifyState();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      const vol = muted || !this.settings.soundEnabled ? 0 : this.settings.masterVolume;
      this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
    if (muted) {
      this.stopAlarm();
    }
    this.syncAmbianceState();
    this.notifyState();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public isEnabled(): boolean {
    return this.settings.soundEnabled && !this.isMuted;
  }

  public setMasterVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.settings.masterVolume = clamped;
    if (this.ctx && this.masterGain && !this.isMuted && this.settings.soundEnabled) {
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.updateSettings({ soundEnabled: enabled });
  }

  // =========================================================================
  // 1. ICU AMBIENT SOUNDSCAPE (Medical gas lines, HVAC laminar hum, pumps)
  // =========================================================================

  private syncAmbianceState() {
    const shouldPlay =
      this.settings.soundEnabled &&
      !this.isMuted &&
      this.settings.icuAmbianceEnabled &&
      this.ctx &&
      this.ctx.state === 'running';

    if (shouldPlay) {
      this.startIcuBackgroundHum();
      this.startInfusionPumpSchedule();
      this.startDistantIcuEchoSchedule();
    } else {
      this.stopIcuBackgroundHum();
      this.stopInfusionPumpSchedule();
      this.stopDistantIcuEchoSchedule();
    }
  }

  private startIcuBackgroundHum() {
    if (this.ambientNoiseSource || !this.ctx || this.ctx.state !== 'running' || !this.ambianceGain) {
      return;
    }

    try {
      // Create seamless looping 4-second pinkish medical gas line noise
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const out = buffer.getChannelData(channel);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          out[i] = (b0 + b1 + b2 + white * 0.5362) * 0.035;
        }
      }

      this.ambientNoiseSource = this.ctx.createBufferSource();
      this.ambientNoiseSource.buffer = buffer;
      this.ambientNoiseSource.loop = true;

      // Filter: warm room acoustics (Lowpass 280Hz + 60Hz HVAC transformer resonance)
      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(260, this.ctx.currentTime);

      // Low 60Hz electrical/HVAC transformer hum
      const humOsc = this.ctx.createOscillator();
      humOsc.type = 'sine';
      humOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
      const humGain = this.ctx.createGain();
      humGain.gain.setValueAtTime(0.018, this.ctx.currentTime);
      humOsc.connect(humGain);
      humGain.connect(this.ambianceGain);
      humOsc.start();

      this.ambientNoiseSource.connect(this.ambientFilter);
      this.ambientFilter.connect(this.ambianceGain);
      this.ambientNoiseSource.start();
    } catch {
      // Context guard
    }
  }

  private stopIcuBackgroundHum() {
    if (this.ambientNoiseSource) {
      try {
        this.ambientNoiseSource.stop();
        this.ambientNoiseSource.disconnect();
      } catch {
        // Ignore
      }
      this.ambientNoiseSource = null;
    }
  }

  /**
   * Infusion Pump (Bomba de infusão): Occasional syringe mechanical clicks & soft triple alert
   */
  private startInfusionPumpSchedule() {
    if (this.pumpTimer !== null) return;
    this.pumpTimer = window.setInterval(() => {
      if (
        this.settings.soundEnabled &&
        !this.isMuted &&
        this.settings.infusionPumpEnabled &&
        this.ctx &&
        this.ctx.state === 'running'
      ) {
        // 40% chance of triple chime, 60% chance of mechanical stepper click
        if (Math.random() < 0.45) {
          this.playInfusionPumpChime();
        } else {
          this.playInfusionPumpClick();
        }
      }
    }, 28000); // Every 28 seconds
  }

  private stopInfusionPumpSchedule() {
    if (this.pumpTimer !== null) {
      clearInterval(this.pumpTimer);
      this.pumpTimer = null;
    }
  }

  /**
   * Distant ICU monitor echoes adding spatial realism (sounds from down the hall)
   */
  private startDistantIcuEchoSchedule() {
    if (this.distantBeepTimer !== null) return;
    this.distantBeepTimer = window.setInterval(() => {
      if (
        this.settings.soundEnabled &&
        !this.isMuted &&
        this.settings.icuAmbianceEnabled &&
        this.ctx &&
        this.ctx.state === 'running' &&
        Math.random() < 0.6
      ) {
        this.playDistantIcuBeep();
      }
    }, 18000);
  }

  private stopDistantIcuEchoSchedule() {
    if (this.distantBeepTimer !== null) {
      clearInterval(this.distantBeepTimer);
      this.distantBeepTimer = null;
    }
  }

  public playInfusionPumpChime() {
    if (!this.settings.soundEnabled || !this.settings.infusionPumpEnabled || this.isMuted) return;
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx || ctx.state !== 'running' || !this.ambianceGain) return;

      const now = ctx.currentTime;
      const pitches = [2093, 2349, 2793]; // High C7, D7, F7 clinical pump chime
      pitches.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.045, now + idx * 0.09 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.08);

        osc.connect(gain);
        gain.connect(this.ambianceGain!);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.09);
      });
    } catch {
      // Ignore
    }
  }

  public playInfusionPumpClick() {
    if (!this.settings.soundEnabled || !this.settings.infusionPumpEnabled || this.isMuted) return;
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx || ctx.state !== 'running' || !this.ambianceGain) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(3200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.015);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      osc.connect(gain);
      gain.connect(this.ambianceGain);
      osc.start(now);
      osc.stop(now + 0.02);
    } catch {
      // Ignore
    }
  }

  public playDistantIcuBeep() {
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx || ctx.state !== 'running' || !this.ambianceGain) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Heavy lowpass to simulate sound coming from through a doorway / hall
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.02, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambianceGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore
    }
  }

  // =========================================================================
  // 2. VENTILATOR CIRCUIT & MECHANICAL ACOUSTICS (High-fidelity physics)
  // =========================================================================

  /**
   * Inspiratory Gas Delivery Sound:
   * - High-speed proportional servo-valve mechanical click (metal plunger hitting valve seat)
   * - Pressurized laminar gas turbulence through corrugated tubing
   * - Heated humidifier bubbler gentle gurgle
   */
  public playBreathInspSound(duration: number = 1.0, flowLmin: number = 60, raw: number = 8) {
    if (!this.settings.soundEnabled || !this.settings.breathSoundsEnabled || this.isMuted) return;
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx || ctx.state !== 'running' || !this.breathGain) return;

      const safeDur = Math.max(0.3, Math.min(duration, 3.5));
      const now = ctx.currentTime;

      // 1. Servo-Valve Opening Click (Sharp acoustic impulse at t = 0)
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(1650, now);
      clickOsc.frequency.exponentialRampToValueAtTime(220, now + 0.035);
      clickGain.gain.setValueAtTime(0.18, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      clickOsc.connect(clickGain);
      clickGain.connect(this.breathGain);
      clickOsc.start(now);
      clickOsc.stop(now + 0.04);

      // 2. Continuous Pressurized Airflow Noise (Corrugated Circuit Resonant Bandpass)
      const bufferSize = Math.floor(ctx.sampleRate * safeDur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass frequency scales with flow velocity (450Hz - 900Hz)
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const centerFreq = 480 + Math.min(flowLmin * 4.5, 520);
      filter.frequency.setValueAtTime(centerFreq, now);
      filter.Q.setValueAtTime(2.4, now);

      // Secondary High Shelf to capture pressurized air hiss
      const highFilter = ctx.createBiquadFilter();
      highFilter.type = 'highpass';
      highFilter.frequency.setValueAtTime(800, now);

      const flowGain = ctx.createGain();
      flowGain.gain.setValueAtTime(0.001, now);
      flowGain.gain.linearRampToValueAtTime(0.24, now + 0.07); // Fast servo rise
      flowGain.gain.setValueAtTime(0.22, now + safeDur * 0.7);
      flowGain.gain.exponentialRampToValueAtTime(0.001, now + safeDur);

      noise.connect(filter);
      filter.connect(flowGain);
      flowGain.connect(this.breathGain);

      noise.start(now);
      noise.stop(now + safeDur + 0.02);

      // 3. Humidifier / Circuit Moisture Bubbler (Subtle organic ICU touch)
      if (this.settings.humidifierBubblerEnabled) {
        this.playHumidifierBubbles(now + 0.12, safeDur * 0.6);
      }
    } catch {
      // Guard
    }
  }

  /**
   * Exhalation Diaphragm Release:
   * - Mechanical diaphragm opening pop (silicone valve movement against PEEP)
   * - Decelerating exponential air release whoosh
   * - Expiratory whistling/wheezing if airway resistance (Raw) is elevated (e.g. COPD/Bronchospasm)
   */
  public playBreathExpSound(duration: number = 1.5, raw: number = 8) {
    if (!this.settings.soundEnabled || !this.settings.breathSoundsEnabled || this.isMuted) return;
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx || ctx.state !== 'running' || !this.breathGain) return;

      const safeDur = Math.max(0.25, Math.min(duration * 0.7, 1.6));
      const now = ctx.currentTime;

      // 1. Exhalation Diaphragm Valve "Pop / Thump"
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popOsc.type = 'sine';
      popOsc.frequency.setValueAtTime(280, now);
      popOsc.frequency.exponentialRampToValueAtTime(75, now + 0.045);
      popGain.gain.setValueAtTime(0.22, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      popOsc.connect(popGain);
      popGain.connect(this.breathGain);
      popOsc.start(now);
      popOsc.stop(now + 0.05);

      // 2. Exponential Outflow Decompression Gas Rush
      const bufferSize = Math.floor(ctx.sampleRate * safeDur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + safeDur);

      const expGain = ctx.createGain();
      expGain.gain.setValueAtTime(0.19, now);
      expGain.gain.exponentialRampToValueAtTime(0.001, now + safeDur);

      noise.connect(filter);
      filter.connect(expGain);
      expGain.connect(this.breathGain);

      noise.start(now);
      noise.stop(now + safeDur + 0.02);

      // 3. High Airway Resistance Wheeze (If Raw > 14 cmH2O/L/s e.g. Severe COPD)
      if (raw > 14) {
        const wheezeOsc = ctx.createOscillator();
        const wheezeGain = ctx.createGain();
        wheezeOsc.type = 'sawtooth';
        wheezeOsc.frequency.setValueAtTime(380 + (raw - 14) * 15, now + 0.06);
        wheezeOsc.frequency.exponentialRampToValueAtTime(240, now + safeDur * 0.9);

        const wheezeFilter = ctx.createBiquadFilter();
        wheezeFilter.type = 'bandpass';
        wheezeFilter.frequency.setValueAtTime(450, now);
        wheezeFilter.Q.setValueAtTime(6.0, now);

        wheezeGain.gain.setValueAtTime(0.001, now + 0.06);
        wheezeGain.gain.linearRampToValueAtTime(0.04, now + 0.12);
        wheezeGain.gain.exponentialRampToValueAtTime(0.001, now + safeDur * 0.9);

        wheezeOsc.connect(wheezeFilter);
        wheezeFilter.connect(wheezeGain);
        wheezeGain.connect(this.breathGain);

        wheezeOsc.start(now + 0.06);
        wheezeOsc.stop(now + safeDur);
      }
    } catch {
      // Guard
    }
  }

  /**
   * Spontaneous Patient Trigger Sound:
   * Patient creates negative pleural suction followed by machine pressure sensor trigger pip.
   */
  public playTriggerSound() {
    if (!this.settings.soundEnabled || !this.settings.breathSoundsEnabled || this.isMuted) return;
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx || ctx.state !== 'running' || !this.breathGain) return;

      const now = ctx.currentTime;

      // Electronic Trigger Detection Pip (Dräger / PB840 distinctive chirp)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1318.5, now); // E6
      osc.frequency.setValueAtTime(1760.0, now + 0.025); // A6

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      osc.connect(gain);
      gain.connect(this.breathGain);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Guard
    }
  }

  /**
   * Humidifier / Water Circuit Bubbles (Subtle realistic water gurgling in circuit)
   */
  private playHumidifierBubbles(startTime: number, maxDuration: number) {
    if (!this.ctx || !this.breathGain) return;
    const bubbleCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < bubbleCount; i++) {
      const bTime = startTime + Math.random() * maxDuration;
      const bFreq = 650 + Math.random() * 400;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(bFreq, bTime);
      osc.frequency.exponentialRampToValueAtTime(bFreq * 1.5, bTime + 0.025);

      gain.gain.setValueAtTime(0.001, bTime);
      gain.gain.linearRampToValueAtTime(0.03, bTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0005, bTime + 0.03);

      osc.connect(gain);
      gain.connect(this.breathGain);

      osc.start(bTime);
      osc.stop(bTime + 0.035);
    }
  }

  // =========================================================================
  // 3. MULTIPARAMETER MONITOR SpO2 PULSE OXIMETRY TONE (Philips/GE Style)
  // =========================================================================

  /**
   * SpO2 Pulse: Dual-harmonic rich tone with real-time frequency modulation
   * SpO2 > 98%: ~880 Hz (A5) - High, reassuring pitch
   * SpO2 90%: ~620 Hz (D#5) - Cautionary lower pitch
   * SpO2 75%: ~400 Hz (G4) - Ominous low hypoxic tone
   */
  public playSpO2Pulse(spo2: number = 98) {
    if (!this.settings.soundEnabled || !this.settings.pulseOxToneEnabled || this.isMuted) return;
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx || ctx.state !== 'running' || !this.pulseOxGain) return;

      const clampedSpo2 = Math.max(60, Math.min(100, spo2));
      // Frequency mapping function (exponential curve like real Philips monitors)
      const baseFreq = 380 * Math.pow(2, (clampedSpo2 - 60) / 33);

      const now = ctx.currentTime;

      // 1. Fundamental Sine
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.22, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(this.pulseOxGain);
      osc1.start(now);
      osc1.stop(now + 0.13);

      // 2. Second Harmonic Overtone (Adds body and presence like hospital monitors)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 2, now);

      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.linearRampToValueAtTime(0.06, now + 0.012);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc2.connect(gain2);
      gain2.connect(this.pulseOxGain);
      osc2.start(now);
      osc2.stop(now + 0.09);
    } catch {
      // Guard
    }
  }

  // =========================================================================
  // 4. IEC 60601-1-8 / ISO 9703-2 MEDICAL ALARMS
  // =========================================================================

  public triggerAlarmPattern(severity: 'high' | 'medium' | 'low') {
    if (!this.settings.soundEnabled || !this.settings.alarmsEnabled || this.isMuted) return;
    if (this.currentAlarmSeverity === severity && this.alarmInterval !== null) return;

    this.stopAlarm();
    this.currentAlarmSeverity = severity;

    const playHarmonicBeep = (freq: number, startDelay: number, duration: number = 0.13) => {
      const ctx = this.getOrCreateContext();
      if (!ctx || ctx.state !== 'running' || !this.alarmGain) return;

      const now = ctx.currentTime + startDelay;

      // Primary tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.42, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.alarmGain);

      osc.start(now);
      osc.stop(now + duration + 0.02);

      // Overtone harmonic
      const oscH = ctx.createOscillator();
      const gainH = ctx.createGain();
      oscH.type = 'sine';
      oscH.frequency.setValueAtTime(freq * 2, now);
      gainH.gain.setValueAtTime(0.001, now);
      gainH.gain.linearRampToValueAtTime(0.12, now + 0.015);
      gainH.gain.exponentialRampToValueAtTime(0.001, now + duration);

      oscH.connect(gainH);
      gainH.connect(this.alarmGain);
      oscH.start(now);
      oscH.stop(now + duration + 0.02);
    };

    const runSequence = () => {
      if (this.isMuted || !this.settings.soundEnabled || !this.settings.alarmsEnabled) return;
      const ctx = this.getOrCreateContext();
      if (!ctx || ctx.state !== 'running') return;

      if (severity === 'high') {
        // ISO 9703-2 Standard: 3 beeps + pause + 2 beeps (960 Hz)
        const f = 960;
        playHarmonicBeep(f, 0.0, 0.12);
        playHarmonicBeep(f, 0.18, 0.12);
        playHarmonicBeep(f, 0.36, 0.12);
        // Short pause
        playHarmonicBeep(f, 0.78, 0.12);
        playHarmonicBeep(f, 0.96, 0.12);
      } else if (severity === 'medium') {
        // 2 beeps (660 Hz)
        const f = 660;
        playHarmonicBeep(f, 0.0, 0.15);
        playHarmonicBeep(f, 0.28, 0.15);
      } else {
        // Low: 1 beep (480 Hz)
        playHarmonicBeep(480, 0.0, 0.22);
      }
    };

    runSequence();
    const intervalTime = severity === 'high' ? 4500 : severity === 'medium' ? 7000 : 12000;
    this.alarmInterval = window.setInterval(runSequence, intervalTime);
  }

  public stopAlarm() {
    if (this.alarmInterval !== null) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    this.currentAlarmSeverity = null;
  }

  // =========================================================================
  // 5. TACTILE UI SOUNDS & FEEDBACK
  // =========================================================================

  public playClick(pitch: number = 800) {
    if (!this.settings.soundEnabled || !this.settings.uiClicksEnabled || this.isMuted) return;
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx || ctx.state !== 'running' || !this.masterGain) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, now + 0.025);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Guard
    }
  }

  public playRotaryTick() {
    this.playClick(1150);
  }

  public playConfirmBeep() {
    if (!this.settings.soundEnabled || this.isMuted) return;
    try {
      const ctx = this.getOrCreateContext();
      if (!ctx || ctx.state !== 'running' || !this.masterGain) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      osc.frequency.setValueAtTime(1318.5, now + 0.07); // E6

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Guard
    }
  }
}

export const audioEngine = new VentilatorAudioEngine();
