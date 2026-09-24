import {
  VentilatorSettings,
  PatientParameters,
  MonitoredData,
  WaveformSample,
  ManeuverState,
  VentilationMode,
} from '../types/ventilation';
import { audioEngine } from './audioEngine';
import { mechanicsWorkerBridge } from './mechanicsWorkerBridge';

export function calculateIBW(heightCm: number, gender: 'male' | 'female'): number {
  const inchesOver5Ft = (heightCm - 152.4) / 2.54;
  const base = gender === 'male' ? 50 : 45.5;
  const ibw = base + 2.3 * Math.max(0, inchesOver5Ft);
  return Math.round(ibw * 10) / 10;
}

/**
 * Snapshot of mechanics and physics parameters captured at the completion of each breath cycle.
 */
export interface CycleMechanicsSnapshot {
  breathIndex: number;
  timestamp: number;
  mode: VentilationMode;
  vti: number; // mL
  vte: number; // mL
  peakPressure: number; // cmH2O
  plateauPressure: number; // cmH2O
  setPeep: number; // cmH2O
  autoPeep: number; // cmH2O
  totalPeep: number; // cmH2O
  drivingPressure: number; // cmH2O (Pplat - PEEPtotal)
  staticCompliance: number; // mL/cmH2O (Cstat = Vte / (Pplat - PEEPtotal))
  dynamicCompliance: number; // mL/cmH2O (Cdyn = Vte / (Ppeak - PEEPtotal))
  airwayResistance: number; // cmH2O/(L/s) (Raw = (Ppeak - Pplat) / PeakInspFlow)
  timeConstant: number; // s (tau = Raw * Cstat / 1000)
  isPlateauMeasured: boolean;
}

/**
 * High-performance Rolling State Buffer for respiratory mechanics.
 * Smooths physiological transitions across breath cycles and eliminates graphical micro-oscillations.
 */
export class MechanicsStateBuffer {
  private history: CycleMechanicsSnapshot[] = [];
  private maxHistory: number = 16;
  
  // Continuous smooth physiological state for 60Hz step interpolation
  private smoothedCstat: number = 50;
  private smoothedCdyn: number = 38;
  private smoothedRaw: number = 5.0;
  private smoothedTau: number = 0.25;
  private smoothedAutoPeep: number = 0;
  private smoothedPeep: number = 5;

  public reset(initialCompliance: number = 50, initialResistance: number = 5, initialPeep: number = 5) {
    this.history = [];
    this.smoothedCstat = Math.max(5, initialCompliance);
    this.smoothedRaw = Math.max(1, initialResistance);
    this.smoothedPeep = Math.max(0, initialPeep);
    this.smoothedTau = (this.smoothedRaw * (this.smoothedCstat / 1000));
    this.smoothedCdyn = Math.max(3, this.smoothedCstat * 0.75);
    this.smoothedAutoPeep = 0;
  }

  public pushCycle(snapshot: CycleMechanicsSnapshot) {
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  public getLatest(): CycleMechanicsSnapshot | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  public getRecentHistory(): readonly CycleMechanicsSnapshot[] {
    return this.history;
  }

  /**
   * Smoothly updates intra-cycle mechanics state toward target values
   * Fast, responsive adaptation (tau ~ 0.15s) so user changes in compliance/resistance
   * immediately modify curves and loops without single-frame audio clicks.
   */
  public updateSmoothedState(
    dt: number,
    targetCstat: number,
    targetRaw: number,
    targetPeep: number,
    targetAutoPeep: number
  ) {
    // Responsive compliance adaptation (tau ~ 0.15s)
    const tauC = 0.15;
    const alphaC = 1 - Math.exp(-dt / tauC);
    this.smoothedCstat += (targetCstat - this.smoothedCstat) * alphaC;

    // Responsive airway resistance adaptation filter (tau ~ 0.15s)
    const tauR = 0.15;
    const alphaR = 1 - Math.exp(-dt / tauR);
    this.smoothedRaw += (targetRaw - this.smoothedRaw) * alphaR;

    // Circuit PEEP equilibration filter (tau ~ 0.5s)
    const tauPeep = 0.5;
    const alphaPeep = 1 - Math.exp(-dt / tauPeep);
    this.smoothedPeep += (targetPeep - this.smoothedPeep) * alphaPeep;

    // Auto-PEEP washout/accumulation filter (tau ~ 1.5s)
    const tauAutoPeep = 1.5;
    const alphaAutoPeep = 1 - Math.exp(-dt / tauAutoPeep);
    this.smoothedAutoPeep += (targetAutoPeep - this.smoothedAutoPeep) * alphaAutoPeep;

    // Exact physical calculation of continuous time constant tau = Raw * Cstat / 1000
    this.smoothedTau = (this.smoothedRaw * (this.smoothedCstat / 1000));
    
    // Dynamic compliance tracked proportionally
    const resistiveFactor = Math.max(1.15, 1.0 + (this.smoothedRaw * 0.04));
    this.smoothedCdyn = Math.max(3, this.smoothedCstat / resistiveFactor);
  }

  public get smoothed(): {
    cStat: number;
    cDyn: number;
    raw: number;
    tau: number;
    peep: number;
    autoPeep: number;
  } {
    return {
      cStat: this.smoothedCstat,
      cDyn: this.smoothedCdyn,
      raw: this.smoothedRaw,
      tau: this.smoothedTau,
      peep: this.smoothedPeep,
      autoPeep: this.smoothedAutoPeep,
    };
  }
}

export class VentilationPhysicsEngine {
  private cycleTime: number = 0; // Current time inside the breath cycle (s)
  private totalSimulationTime: number = 0; // Global time (s)
  private currentVolume: number = 0; // mL accumulated in lungs during breath
  private currentPressure: number = 5; // cmH2O (Paw)
  private currentFlow: number = 0; // L/min (V_dot)
  private isInspPhase: boolean = true;
  private isPausePhase: boolean = false;
  private lastPeakFlow: number = 30; // L/min for PSV cycling
  private cyclePeakPressure: number = 15;
  private cyclePlateauPressure: number = 12;
  private plateauMeasuredThisCycle: boolean = false;
  private cycleVti: number = 450;
  private cycleVte: number = 440;
  private lastTriggered: boolean = false;
  private breathCounter: number = 0;
  private spontBreathCounter: number = 0;
  
  // Committed active settings applied to current breath cycle
  private activeSettings: VentilatorSettings | null = null;
  private pendingSettings: VentilatorSettings | null = null;

  // Dedicated Respiratory Mechanics State Buffer
  private stateBuffer: MechanicsStateBuffer = new MechanicsStateBuffer();

  // Cycle-Locked Physics State (Recalculated with absolute precision at every breath cycle)
  private cycleTimeConstant: number = 0.25; // s (tau = Raw * Cstat)
  private cycleCstat: number = 50; // mL/cmH2O
  private cycleCdyn: number = 38; // mL/cmH2O
  private cycleRaw: number = 5.0; // cmH2O/(L/s)
  private cyclePeakInspFlow: number = 60; // L/min

  // Double triggering state
  private doubleTriggerPending: boolean = false;
  private doubleTriggerCooldown: number = 0;
  
  // Trigger deflection animation state for realistic ICU pressure dip
  private triggerDeflectionTimer: number = 0;
  private triggerDeflectionDepth: number = 0;
  
  // Dynamic physiological state (smoothed arterial blood gas & drive kinetics)
  private currentPaCO2: number = 40;
  private currentPaO2: number = 95;
  private currentpH: number = 7.40;
  private currentSpO2: number = 98;
  
  // Dynamic Physiological Mechanics State
  private dynamicEffectiveCompliance: number = 50; // mL/cmH2O
  private dynamicEffectiveResistance: number = 5; // cmH2O/(L/s)
  private dynamicAutoPeep: number = 0; // cmH2O
  private dynamicEffectivePeep: number = 5; // cmH2O

  // Committed display values (updated strictly at breath-cycle events to avoid jitter)
  private displayedPeak: number = 15;
  private displayedPlat: number = 12;
  private displayedVte: number = 440;
  private displayedVti: number = 450;
  private displayedMV: number = 6.0;
  private displayedAutoPeep: number = 0;
  private displayedCstat: number = 50;
  private displayedCdyn: number = 38;
  private displayedRaw: number = 5.0;
  private displayedTau: number = 0.25;

  public reset(initialCompliance: number = 50, initialResistance: number = 5, initialPeep: number = 5) {
    this.cycleTime = 0;
    this.totalSimulationTime = 0;
    this.currentVolume = 0;
    this.currentPressure = initialPeep;
    this.currentFlow = 0;
    this.isInspPhase = true;
    this.isPausePhase = false;
    this.doubleTriggerPending = false;
    this.doubleTriggerCooldown = 0;
    this.triggerDeflectionTimer = 0;
    this.triggerDeflectionDepth = 0;
    this.dynamicAutoPeep = 0;
    this.activeSettings = null;
    this.pendingSettings = null;
    this.dynamicEffectiveCompliance = initialCompliance;
    this.dynamicEffectiveResistance = initialResistance;
    this.dynamicEffectivePeep = initialPeep;
    this.currentPaCO2 = 40;
    this.currentPaO2 = 95;
    this.currentpH = 7.40;
    this.currentSpO2 = 98;
    this.displayedPeak = initialPeep + 10;
    this.displayedPlat = initialPeep + 8;
    this.displayedAutoPeep = 0;
    this.cyclePeakInspFlow = 60;
    this.lastPeakFlow = 30;
    this.breathCounter = 0;
    this.spontBreathCounter = 0;
    this.cycleVti = 450;
    this.cycleVte = 450;
    this.stateBuffer.reset(initialCompliance, initialResistance, initialPeep);
  }

  /**
   * Generates a single physics time-step sample (dt = 0.0166s = 60Hz)
   * Offloads heavy mechanics and kinetics computations to Web Worker while maintaining
   * state buffer continuity to prevent waveform oscillations.
   */
  public step(
    dt: number,
    settings: VentilatorSettings,
    patient: PatientParameters,
    maneuvers: ManeuverState
  ): { sample: WaveformSample; monitored: MonitoredData } {
    // 0. Manage Next-Cycle Settings Application
    if (!this.activeSettings) {
      this.activeSettings = { ...settings };
    } else {
      this.pendingSettings = { ...settings };
    }

    const currentActiveSettings = this.activeSettings;

    this.totalSimulationTime += dt;
    this.cycleTime += dt;
    if (this.doubleTriggerCooldown > 0) {
      this.doubleTriggerCooldown = Math.max(0, this.doubleTriggerCooldown - dt);
    }
    if (this.triggerDeflectionTimer > 0) {
      this.triggerDeflectionTimer = Math.max(0, this.triggerDeflectionTimer - dt);
    }

    // 1. Effective Set PEEP
    const setPeep = maneuvers.recruitmentManeuverActive ? Math.min(currentActiveSettings.peep + 15, 35) : currentActiveSettings.peep;

    // 2. Dynamic Spontaneous Rate & Respiratory Drive Modulation
    let dynamicSpontRate = patient.spontaneousRate;
    let dynamicEffort = patient.spontaneousEffortPressure;

    const baselineTargetCO2 = (patient.pathology === 'dpoc' || (patient.baselineBicarbonate && patient.baselineBicarbonate > 28)) ? 54 : 40;

    if (patient.spontaneousDrive) {
      if (this.currentSpO2 < 93) {
        const hypoxDrive = (93 - this.currentSpO2);
        dynamicSpontRate += hypoxDrive * 1.1;
        dynamicEffort -= hypoxDrive * 0.45;
      }

      if (this.currentPaCO2 > baselineTargetCO2) {
        const co2Excess = this.currentPaCO2 - baselineTargetCO2;
        dynamicSpontRate += co2Excess * 0.75;
        dynamicEffort -= co2Excess * 0.40;
      } else if (this.currentPaCO2 < baselineTargetCO2 - 6) {
        const co2Deficit = (baselineTargetCO2 - 6) - this.currentPaCO2;
        dynamicSpontRate = Math.max(0, dynamicSpontRate - co2Deficit * 1.2);
        dynamicEffort = Math.min(-0.2, dynamicEffort + co2Deficit * 0.5);
      }

      dynamicSpontRate = Math.max(3, Math.min(dynamicSpontRate, 60));
      dynamicEffort = Math.min(-0.2, Math.max(dynamicEffort, -30));

      const vtPerKgIBW = (this.displayedVte || 400) / Math.max(1, patient.idealBodyWeightKg || 57);
      if (vtPerKgIBW >= 5.8 && this.displayedVte >= 340) {
        // Adequate tidal volume satisfies air hunger: muscular effort settles to comfortable synchronized range
        dynamicEffort = Math.max(dynamicEffort * 0.7, -4.0);
      }
    }

    // 3. Determine Breath Timings: When spontaneous drive is active, the graph and cycle follow the patient's FR
    let targetRR = currentActiveSettings.respiratoryRate;
    const effectiveRR = patient.spontaneousDrive 
      ? Math.max(dynamicSpontRate, 3) 
      : Math.max(targetRR, 1);
    
    let cycleDuration = 60 / effectiveRR;
    let inspTime = 1.0;
    let expTime = 3.0;

    switch (currentActiveSettings.mode) {
      case 'VCV': {
        const setInsp = currentActiveSettings.inspiratoryTimePCV || 1.0;
        inspTime = patient.spontaneousDrive ? Math.min(setInsp, cycleDuration * 0.42) : setInsp;
        const pauseTime = ((currentActiveSettings.inspiratoryPausePercent || 0) / 100) * cycleDuration;
        const totalInspWithPause = inspTime + pauseTime;
        expTime = Math.max(0.25, cycleDuration - totalInspWithPause);
        break;
      }
      case 'PCV': {
        const setInsp = currentActiveSettings.inspiratoryTimePCV || 1.0;
        inspTime = patient.spontaneousDrive ? Math.min(setInsp, cycleDuration * 0.42) : setInsp;
        expTime = Math.max(0.25, cycleDuration - inspTime);
        break;
      }
      case 'PSV':
      case 'CPAP': {
        const activeRate = patient.spontaneousDrive ? dynamicSpontRate : (60 / currentActiveSettings.backupApneaTime);
        cycleDuration = 60 / Math.max(activeRate, 3);
        inspTime = cycleDuration * (patient.spontaneousDutyCycle || 0.33);
        expTime = Math.max(0.25, cycleDuration - inspTime);
        break;
      }
      case 'APRV': {
        if (patient.spontaneousDrive) {
          cycleDuration = 60 / dynamicSpontRate;
          inspTime = cycleDuration * 0.65;
          expTime = cycleDuration * 0.35;
        } else {
          cycleDuration = currentActiveSettings.tHigh + currentActiveSettings.tLow;
          inspTime = currentActiveSettings.tHigh;
          expTime = currentActiveSettings.tLow;
        }
        break;
      }
      case 'SIMV_VC':
      case 'SIMV_PC': {
        const simvBaseRate = patient.spontaneousDrive ? dynamicSpontRate : currentActiveSettings.simvRate;
        cycleDuration = 60 / Math.max(simvBaseRate, 3);
        inspTime = Math.min(currentActiveSettings.inspiratoryTimePCV || 1.0, cycleDuration * 0.42);
        expTime = Math.max(0.25, cycleDuration - inspTime);
        break;
      }
    }

    const measuredRR = patient.spontaneousDrive ? Math.round(dynamicSpontRate) : targetRR;

    // 4. Delegate Heavy Mechanics and Kinetics Calculations to Web Worker
    const workerOutput = mechanicsWorkerBridge.updateMechanics(
      dt,
      currentActiveSettings,
      patient,
      maneuvers,
      {
        dynamicEffectiveCompliance: this.dynamicEffectiveCompliance,
        dynamicEffectiveResistance: this.dynamicEffectiveResistance,
        dynamicAutoPeep: this.dynamicAutoPeep,
        dynamicEffectivePeep: this.dynamicEffectivePeep,
        currentPaCO2: this.currentPaCO2,
        currentPaO2: this.currentPaO2,
        currentSpO2: this.currentSpO2,
        cycleVti: this.cycleVti,
        measuredRR,
        cyclePeakPressure: this.cyclePeakPressure,
        expTime,
        totalSimulationTime: this.totalSimulationTime,
      }
    );

    // Sync state with worker output
    this.dynamicEffectiveCompliance = workerOutput.dynamicEffectiveCompliance;
    this.dynamicEffectiveResistance = workerOutput.dynamicEffectiveResistance;
    this.dynamicAutoPeep = workerOutput.dynamicAutoPeep;
    this.dynamicEffectivePeep = workerOutput.dynamicEffectivePeep;
    this.currentPaCO2 = workerOutput.currentPaCO2;
    this.currentPaO2 = workerOutput.currentPaO2;
    this.currentpH = workerOutput.currentpH;
    this.currentSpO2 = workerOutput.currentSpO2;

    // Update the high-precision state buffer for continuous damping of physiological transitions
    this.stateBuffer.updateSmoothedState(
      dt,
      this.dynamicEffectiveCompliance,
      this.dynamicEffectiveResistance,
      setPeep,
      this.dynamicAutoPeep
    );

    const smoothedState = this.stateBuffer.smoothed;
    const C_L = smoothedState.cStat / 1000; // in L/cmH2O
    const Raw = smoothedState.raw; // in cmH2O / (L/s)
    
    // Absolute precision calculation of time constant tau (s) = Raw * C_L
    const tau = smoothedState.tau;

    // 5. Realistic Dynamic Patient Spontaneous Drive & Muscular Effort Pmus(t)
    let pmus = 0;
    let isPatientTriggering = false;
    let isIneffectiveEffort = false;
    let detectedAsynchrony = workerOutput.detectedAsynchrony;
    let asynchronyDetail = workerOutput.asynchronyDetail;

    if (patient.spontaneousDrive && dynamicSpontRate >= 3) {
      const spontDuty = patient.spontaneousDutyCycle || 0.33;
      const spontInspDuration = Math.max(0.35, cycleDuration * spontDuty);

      // Neural effort occurs during neural inspiration and at the end of expiration to trigger next cycle
      if (this.isInspPhase && this.cycleTime < spontInspDuration) {
        const progress = this.cycleTime / spontInspDuration;
        pmus = dynamicEffort * Math.sin(progress * Math.PI);
      } else if (!this.isInspPhase) {
        // As expiration approaches patient cycle duration, patient initiates inspiratory effort
        const expProgress = this.cycleTime / Math.max(0.1, expTime);
        if (expProgress > 0.65 || this.cycleTime >= cycleDuration - 0.20) {
          const preTriggerProgress = Math.min(1.0, (this.cycleTime - (cycleDuration - 0.25)) / 0.25);
          pmus = dynamicEffort * Math.max(0, Math.sin(Math.max(0, preTriggerProgress) * (Math.PI / 2)));
        }
      }

      const uncounterbalancedAutoPeep = Math.max(0, this.displayedAutoPeep - setPeep * 0.85);

      if (currentActiveSettings.triggerType === 'pressure') {
        const requiredPmus = -Math.abs(currentActiveSettings.triggerSensitivity || 2.0) - uncounterbalancedAutoPeep;
        if (pmus <= requiredPmus || (!this.isInspPhase && this.cycleTime >= cycleDuration)) {
          isPatientTriggering = true;
        } else if (pmus < -1.8 && !this.isInspPhase && (uncounterbalancedAutoPeep >= 1.5 || this.displayedAutoPeep >= 2.5)) {
          isIneffectiveEffort = true;
          detectedAsynchrony = 'ineffective_effort';
          asynchronyDetail = `Disparo Ineficaz: O esforço muscular não atinge a sensibilidade devido ao Auto-PEEP (${this.displayedAutoPeep.toFixed(1)} cmH₂O).`;
        }
      } else {
        const netEffort = Math.max(0, Math.abs(pmus) - uncounterbalancedAutoPeep);
        if (netEffort >= (currentActiveSettings.triggerSensitivity || 2.0) * 0.55 || (!this.isInspPhase && this.cycleTime >= cycleDuration)) {
          isPatientTriggering = true;
        } else if (netEffort > 0.8 && !this.isInspPhase && (uncounterbalancedAutoPeep >= 1.5 || this.displayedAutoPeep >= 2.5)) {
          isIneffectiveEffort = true;
          detectedAsynchrony = 'ineffective_effort';
          asynchronyDetail = `Disparo Ineficaz: Auto-PEEP elevado (${this.displayedAutoPeep.toFixed(1)} cmH₂O) impedindo a deflexão de fluxo disparar o ventilador.`;
        }
      }
    }

    // Secretions crackle/flutter noise
    let secretionNoise = 0;
    if (patient.secretionsSeverity === 'mild') {
      secretionNoise = (Math.sin(this.totalSimulationTime * 45) + (Math.random() - 0.5) * 1.5) * 1.2;
    } else if (patient.secretionsSeverity === 'severe') {
      secretionNoise = (Math.sin(this.totalSimulationTime * 35) + Math.sin(this.totalSimulationTime * 110) + (Math.random() - 0.5) * 2.5) * 3.8;
    }

    // 5. Active Diagnostic Maneuvers
    const isInspiratoryHold = maneuvers.inspiratoryHoldActive;
    const isExpiratoryHold = maneuvers.expiratoryHoldActive;

    const isVcvMode = currentActiveSettings.mode === 'VCV' || currentActiveSettings.mode === 'SIMV_VC';
    const autoPauseDuration = isVcvMode ? ((currentActiveSettings.inspiratoryPausePercent || 0) / 100) * cycleDuration : 0;
    const totalInspWithAutoPause = inspTime + autoPauseDuration;

    // 6. Breath Cycle State Machine with Cycle-Locked Precision Recalculations
    if (this.isInspPhase) {
      if (this.cycleTime < inspTime) {
        // Active gas delivery phase
        this.isPausePhase = false;
      } else {
        // We reached or passed the end of active flow delivery
        if (isInspiratoryHold) {
          // Manual hold button is pressed and held
          this.isPausePhase = true;
        } else if (isVcvMode && this.cycleTime < totalInspWithAutoPause) {
          // Automatic pause in VCV
          this.isPausePhase = true;
        } else {
          // Normal end of inspiration & pause -> switch cleanly to expiration
          this.isInspPhase = false;
          this.isPausePhase = false;
          this.cycleVti = this.currentVolume;
          this.displayedVti = Math.round(this.cycleVti);

          // Double Triggering check
          const vtPerKg = (this.cycleVti || 450) / Math.max(1, patient.idealBodyWeightKg || 57);
          const isVtAdequate = vtPerKg >= 5.8 && this.cycleVti >= 330;
          const isTiAdequate = inspTime >= 0.80 || (currentActiveSettings.mode === 'VCV' && (currentActiveSettings.inspiratoryFlow || 60) <= 65) || (currentActiveSettings.inspiratoryPausePercent || 0) >= 10;

          if (
            patient.spontaneousDrive &&
            Math.abs(pmus) > 4.5 &&
            (currentActiveSettings.mode === 'VCV' || currentActiveSettings.mode === 'PCV') &&
            (!isVtAdequate || !isTiAdequate) &&
            inspTime < 0.80 &&
            this.doubleTriggerCooldown === 0
          ) {
            this.doubleTriggerPending = true;
            this.doubleTriggerCooldown = 2.0;
            detectedAsynchrony = 'double_trigger';
            asynchronyDetail =
              'Duplo Disparo (Double Triggering): Tempo neural do paciente é maior que o tempo inspiratório programado, gerando empilhamento de volume.';
          } else if (isVtAdequate && isTiAdequate) {
            this.doubleTriggerPending = false;
            if (detectedAsynchrony === 'double_trigger') {
              detectedAsynchrony = 'none';
              asynchronyDetail = 'Ventilação sincronizada: volume corrente protetor e tempo inspiratório harmonizados.';
            }
          }

          audioEngine.playBreathExpSound(expTime, Raw);
        }
      }
    } else {
      // Expiration phase: check if cycle finished OR patient triggered a new breath
      const triggerReady = (this.cycleTime >= 0.18 && !isExpiratoryHold && isPatientTriggering) || this.doubleTriggerPending;

      if ((this.cycleTime >= cycleDuration && !isExpiratoryHold) || triggerReady) {
        // === START OF NEW CYCLE: APPLY PENDING ADJUSTED SETTINGS HERE ===
        if (this.pendingSettings) {
          this.activeSettings = { ...this.pendingSettings };
        }

        this.isInspPhase = true;
        this.isPausePhase = false;
        this.cycleTime = 0;
        const wasDoubleTrigger = this.doubleTriggerPending;
        this.doubleTriggerPending = false;

        if (isPatientTriggering || wasDoubleTrigger) {
          this.triggerDeflectionTimer = 0.08;
          this.triggerDeflectionDepth = Math.min(2.5, Math.max(0.8, Math.abs(pmus) * 0.45));
        }

        const leakFraction = (patient.circuitLeakPercent || 0) / 100;
        this.cycleVte = Math.max(20, Math.round(this.cycleVti * (1 - leakFraction)));
        this.displayedVte = this.cycleVte;
        this.displayedPeak = Math.round(this.cyclePeakPressure * 10) / 10;

        // Plateau calculation: dynamically derived from both volume delivery AND pressure target increases
        if (!this.plateauMeasuredThisCycle) {
          let calcPplat = setPeep + ((this.displayedVti / 1000) / C_L);
          if (currentActiveSettings.mode === 'PCV') {
            const setPinspTarget = setPeep + currentActiveSettings.inspiratoryPressure;
            calcPplat = Math.min(setPinspTarget, Math.max(setPeep + 2, calcPplat));
          } else if (currentActiveSettings.mode === 'PSV') {
            const setPsvTarget = setPeep + (currentActiveSettings.pressureSupport || 10);
            calcPplat = Math.min(setPsvTarget, Math.max(setPeep + 2, calcPplat));
          }
          const minGap = isVcvMode ? Math.max(2.0, Raw * 0.25) : 0.8;
          this.displayedPlat = Math.min(this.displayedPeak - minGap, Math.round(calcPplat * 10) / 10);
        } else {
          this.displayedPlat = Math.round(this.cyclePlateauPressure * 10) / 10;
        }

        this.displayedAutoPeep = Math.round(this.dynamicAutoPeep * 10) / 10;
        const totalPeep = setPeep + this.displayedAutoPeep;
        const drivingPressure = Math.max(0, Math.round((this.displayedPlat - totalPeep) * 10) / 10);

        // =========================================================================
        // RECALCULATE MECHANICS (Cstat, Cdyn, Raw, tau) WITH ABSOLUTE PRECISION
        // =========================================================================
        const effectiveDeltaPStat = Math.max(1.0, this.displayedPlat - totalPeep);
        const effectiveDeltaPDyn = Math.max(1.5, this.displayedPeak - totalPeep);
        
        // Static Compliance: Cstat = Vte / (Pplat - PEEPtotal)
        this.cycleCstat = Math.min(180, Math.max(5, Math.round((this.displayedVte / effectiveDeltaPStat) * 10) / 10));
        
        // Dynamic Compliance: Cdyn = Vte / (Ppeak - PEEPtotal)
        this.cycleCdyn = Math.min(this.cycleCstat * 0.95, Math.max(3, Math.round((this.displayedVte / effectiveDeltaPDyn) * 10) / 10));
        
        // Airway Resistance: Raw = (Ppeak - Pplat) / PeakFlow (L/s)
        const peakFlowLsec = Math.max(0.2, this.cyclePeakInspFlow / 60);
        const calculatedRaw = (this.displayedPeak - this.displayedPlat) / peakFlowLsec;
        this.cycleRaw = Math.min(60, Math.max(1.5, Math.round(calculatedRaw * 10) / 10));

        // Time Constant: tau = Raw * (Cstat / 1000) (seconds)
        this.cycleTimeConstant = Math.round((this.cycleRaw * (this.cycleCstat / 1000)) * 1000) / 1000;

        // Commit display values
        this.displayedCstat = this.cycleCstat;
        this.displayedCdyn = this.cycleCdyn;
        this.displayedRaw = this.cycleRaw;
        this.displayedTau = this.cycleTimeConstant;
        this.displayedMV = Math.round(((this.displayedVte * measuredRR) / 1000) * 10) / 10;

        // Push cycle snapshot to State Buffer for smooth transition logging
        this.stateBuffer.pushCycle({
          breathIndex: this.breathCounter,
          timestamp: this.totalSimulationTime,
          mode: currentActiveSettings.mode,
          vti: this.displayedVti,
          vte: this.displayedVte,
          peakPressure: this.displayedPeak,
          plateauPressure: this.displayedPlat,
          setPeep,
          autoPeep: this.displayedAutoPeep,
          totalPeep,
          drivingPressure,
          staticCompliance: this.cycleCstat,
          dynamicCompliance: this.cycleCdyn,
          airwayResistance: this.cycleRaw,
          timeConstant: this.cycleTimeConstant,
          isPlateauMeasured: this.plateauMeasuredThisCycle,
        });

        this.plateauMeasuredThisCycle = false;
        this.cyclePeakPressure = setPeep;
        this.currentVolume = wasDoubleTrigger ? this.currentVolume * 0.4 : 0;
        this.breathCounter++;

        if (isPatientTriggering || triggerReady) {
          this.spontBreathCounter++;
          this.lastTriggered = true;
          audioEngine.playTriggerSound();
        } else {
          this.lastTriggered = false;
        }

        audioEngine.playBreathInspSound(inspTime, currentActiveSettings.inspiratoryFlow || 60, Raw);
      }
    }

    // 7. Compute Flow, Volume, and Airway Pressure Paw(t) according to the Equation of Motion
    // Continuous non-linear compliance adjustment (Upper Inflection Point / Overdistension Beak at high volume)
    const overdistensionThreshold = 460; // mL
    let volumeNonLinearity = 1.0;
    if (this.currentVolume > overdistensionThreshold) {
      const overVol = (this.currentVolume - overdistensionThreshold) / 250;
      volumeNonLinearity = 1.0 + 0.45 * overVol * overVol; // Non-linear stiffness increase
    }

    let pAlveolar = (this.currentVolume / (C_L * 1000)) * volumeNonLinearity; // cmH2O above PEEP

    // Analog micro-turbulence transducer signal noise (<0.08 cmH2O, <0.15 L/min)
    const microNoiseP = (Math.sin(this.totalSimulationTime * 70) * 0.04) + ((Math.random() - 0.5) * 0.05);
    const microNoiseFlow = (Math.cos(this.totalSimulationTime * 85) * 0.08) + ((Math.random() - 0.5) * 0.1);

    if (this.isInspPhase && !this.isPausePhase) {
      // INSPIRATION
      this.lastTriggered = isPatientTriggering;

      switch (currentActiveSettings.mode) {
        case 'VCV': {
          const vtL = (currentActiveSettings.tidalVolume || 450) / 1000;
          const setInspTime = currentActiveSettings.inspiratoryTimePCV || 1.0;
          let flowLsec: number;

          if (currentActiveSettings.flowWaveform === 'decelerating') {
            const peakFlowLsec = (2 * vtL) / setInspTime;
            const progress = Math.min(1.0, this.cycleTime / setInspTime);
            flowLsec = peakFlowLsec * (1 - progress * 0.88);
          } else {
            flowLsec = vtL / setInspTime;
          }

          let flowStarvationEffect = 0;
          if (pmus < -2.0) {
            flowStarvationEffect = pmus * 1.15;
            // True flow starvation in VCV occurs when set inspiratory flow is low (<50 L/min) while patient has vigorous demand
            if ((currentActiveSettings.inspiratoryFlow || 60) < 50 && (patient.spontaneousEffortPressure <= -6 || pmus < -4.5)) {
              detectedAsynchrony = 'flow_starvation';
              asynchronyDetail = 'Fome de Fluxo (Flow Starvation): O fluxo inspiratório ofertado é insuficiente para a demanda muscular.';
            }
          }

          this.currentFlow = flowLsec * 60 + secretionNoise + microNoiseFlow;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = (this.currentVolume / (C_L * 1000)) * volumeNonLinearity;

          const pResistive = Raw * flowLsec;
          let calculatedPaw = setPeep + pAlveolar + pResistive + flowStarvationEffect + microNoiseP;

          if (this.triggerDeflectionTimer > 0) {
            const trigRatio = this.triggerDeflectionTimer / 0.08;
            calculatedPaw -= this.triggerDeflectionDepth * Math.sin(trigRatio * Math.PI);
          }

          this.currentPressure = calculatedPaw;
          this.lastPeakFlow = this.currentFlow;
          this.cyclePeakInspFlow = Math.max(this.cyclePeakInspFlow, this.currentFlow);
          break;
        }

        case 'PCV': {
          const targetDeltaP = currentActiveSettings.inspiratoryPressure;
          const rampTime = Math.max(0.02, currentActiveSettings.pressureRiseTime || 0.1);
          // High-fidelity Exponential Pressurization Ramp: P_target(t) = PEEP + DeltaP * (1 - e^(-t / tau_rise))
          const tauRise = rampTime / 2.3;
          const exponentialRampFactor = 1 - Math.exp(-this.cycleTime / tauRise);
          const currentTargetP = setPeep + (targetDeltaP * exponentialRampFactor);

          const drivingP = Math.max(0, currentTargetP - (setPeep + pAlveolar));
          const flowLsec = Math.max(0, (drivingP - pmus * 0.6) / Raw);

          this.currentFlow = flowLsec * 60 + secretionNoise + microNoiseFlow;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = (this.currentVolume / (C_L * 1000)) * volumeNonLinearity;

          let calculatedPaw = currentTargetP + pmus * 0.35 + microNoiseP;
          if (this.triggerDeflectionTimer > 0) {
            const trigRatio = this.triggerDeflectionTimer / 0.08;
            calculatedPaw -= this.triggerDeflectionDepth * Math.sin(trigRatio * Math.PI);
          }

          this.currentPressure = calculatedPaw;
          this.lastPeakFlow = Math.max(this.lastPeakFlow, this.currentFlow);
          this.cyclePeakInspFlow = Math.max(this.cyclePeakInspFlow, this.currentFlow);
          break;
        }

        case 'PSV': {
          const targetDeltaP = currentActiveSettings.pressureSupport || 10;
          const rampTime = Math.max(0.02, currentActiveSettings.pressureRiseTime || 0.1);
          const tauRise = rampTime / 2.3;
          const exponentialRampFactor = 1 - Math.exp(-this.cycleTime / tauRise);
          const targetPinsp = setPeep + (targetDeltaP * exponentialRampFactor);

          const drivingP = Math.max(0, targetPinsp - (setPeep + pAlveolar));
          const flowLsec = Math.max(0, (drivingP - pmus * 0.75) / Raw);

          this.currentFlow = flowLsec * 60 + secretionNoise + microNoiseFlow;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = (this.currentVolume / (C_L * 1000)) * volumeNonLinearity;

          let calculatedPaw = targetPinsp + pmus * 0.3 + microNoiseP;
          if (this.triggerDeflectionTimer > 0) {
            const trigRatio = this.triggerDeflectionTimer / 0.08;
            calculatedPaw -= this.triggerDeflectionDepth * Math.sin(trigRatio * Math.PI);
          }

          this.currentPressure = calculatedPaw;
          this.lastPeakFlow = Math.max(this.lastPeakFlow, this.currentFlow);
          this.cyclePeakInspFlow = Math.max(this.cyclePeakInspFlow, this.currentFlow);

          const cycleThreshold = (currentActiveSettings.expiratorySensitivity / 100) * this.lastPeakFlow;
          if (this.cycleTime > 0.10 && this.currentFlow <= Math.max(cycleThreshold, 3.5)) {
            this.isInspPhase = false;
            this.isPausePhase = false;
            this.cycleVti = this.currentVolume;
            audioEngine.playBreathExpSound(expTime, Raw);
          }
          break;
        }

        case 'CPAP': {
          const drivingP = -pmus;
          const flowLsec = Math.max(0, drivingP / Raw);
          this.currentFlow = flowLsec * 60 + secretionNoise + microNoiseFlow;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = (this.currentVolume / (C_L * 1000)) * volumeNonLinearity;
          this.currentPressure = setPeep + pmus + microNoiseP;
          this.cyclePeakInspFlow = Math.max(this.cyclePeakInspFlow, this.currentFlow);
          break;
        }

        case 'APRV': {
          const targetPinsp = currentActiveSettings.pHigh;
          const drivingP = Math.max(0, targetPinsp - (currentActiveSettings.pLow + pAlveolar));
          const flowLsec = Math.max(0, (drivingP - pmus) / Raw);
          this.currentFlow = flowLsec * 60 + secretionNoise + microNoiseFlow;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = (this.currentVolume / (C_L * 1000)) * volumeNonLinearity;
          this.currentPressure = currentActiveSettings.pHigh + pmus + microNoiseP;
          this.cyclePeakInspFlow = Math.max(this.cyclePeakInspFlow, this.currentFlow);
          break;
        }

        case 'SIMV_VC': {
          const vtL = (currentActiveSettings.tidalVolume || 450) / 1000;
          const setInspTime = currentActiveSettings.inspiratoryTimePCV || 1.0;
          const flowLsec = vtL / setInspTime;

          this.currentFlow = flowLsec * 60 + secretionNoise + microNoiseFlow;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = (this.currentVolume / (C_L * 1000)) * volumeNonLinearity;

          const pResistive = Raw * flowLsec;
          this.currentPressure = setPeep + pAlveolar + pResistive + pmus + microNoiseP;
          this.lastPeakFlow = this.currentFlow;
          this.cyclePeakInspFlow = Math.max(this.cyclePeakInspFlow, this.currentFlow);
          break;
        }

        case 'SIMV_PC': {
          const targetDeltaP = currentActiveSettings.inspiratoryPressure;
          const rampTime = Math.max(0.02, currentActiveSettings.pressureRiseTime || 0.1);
          const tauRise = rampTime / 2.3;
          const exponentialRampFactor = 1 - Math.exp(-this.cycleTime / tauRise);
          const targetPinsp = setPeep + (targetDeltaP * exponentialRampFactor);

          const drivingP = Math.max(0, targetPinsp - (setPeep + pAlveolar));
          const flowLsec = Math.max(0, (drivingP - pmus) / Raw);

          this.currentFlow = flowLsec * 60 + secretionNoise + microNoiseFlow;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = (this.currentVolume / (C_L * 1000)) * volumeNonLinearity;

          this.currentPressure = targetPinsp + pmus + microNoiseP;
          this.lastPeakFlow = Math.max(this.lastPeakFlow, this.currentFlow);
          this.cyclePeakInspFlow = Math.max(this.cyclePeakInspFlow, this.currentFlow);
          break;
        }
      }

      this.cyclePeakPressure = Math.max(this.cyclePeakPressure, this.currentPressure);

    } else if (this.isPausePhase) {
      // INSPIRATORY PAUSE (True zero-flow static plateau equilibrium)
      this.currentFlow = microNoiseFlow;
      pAlveolar = (this.currentVolume / (C_L * 1000)) * volumeNonLinearity;
      
      let staticEquilibriumP = setPeep + pAlveolar + pmus * 0.5;
      if (currentActiveSettings.mode === 'PCV') {
        staticEquilibriumP = Math.min(setPeep + currentActiveSettings.inspiratoryPressure, staticEquilibriumP);
      } else if (currentActiveSettings.mode === 'PSV') {
        staticEquilibriumP = Math.min(setPeep + (currentActiveSettings.pressureSupport || 10), staticEquilibriumP);
      }

      const minGap = isVcvMode ? Math.max(2.0, Raw * 0.25) : 0.8;
      this.currentPressure = Math.min(this.cyclePeakPressure - minGap, staticEquilibriumP) + microNoiseP;
      this.cyclePlateauPressure = this.currentPressure;
      this.displayedPlat = Math.round(this.cyclePlateauPressure * 10) / 10;
      this.plateauMeasuredThisCycle = true;

    } else {
      // EXPIRATION (Governed by exact cycle time constant tau = R_exp * C_L)
      if (isExpiratoryHold) {
        this.currentFlow = microNoiseFlow;
        const autoPeepPressure = this.currentVolume / (C_L * 1000);
        this.currentPressure = setPeep + autoPeepPressure + microNoiseP;
      } else {
        // Expiratory Resistance is ~1.2x inspiratory due to exhalation valve and tubing compression
        // In obstructive patients (DPOC), small airway collapse increases resistance as volume empties (scooping effect)
        let rExpFactor = 1.22;
        if (Raw >= 10 && this.cycleVti > 0) {
          const volumeEmptiedRatio = 1 - (this.currentVolume / Math.max(1, this.cycleVti));
          rExpFactor += 0.55 * Math.pow(volumeEmptiedRatio, 1.8); // Obstructive flow-volume scooping
        }

        const effectiveRexp = Raw * rExpFactor;
        const effectiveExpTau = Math.max(0.04, effectiveRexp * C_L);
        const decayFactor = Math.exp(-dt / effectiveExpTau);

        let expFlowLsec = -(this.currentVolume / (effectiveExpTau * 1000));

        let expPmusDeflection = 0;
        if (isIneffectiveEffort) {
          expFlowLsec += 0.35;
          expPmusDeflection = Math.max(-2.5, pmus * 0.6);
        }

        this.currentFlow = expFlowLsec * 60 + secretionNoise + microNoiseFlow;
        this.currentVolume = Math.max(0, this.currentVolume * decayFactor);

        pAlveolar = (this.currentVolume / (C_L * 1000));
        
        // Rapid exponential decay of airway pressure down to PEEP when exhalation valve opens
        const expTimeElapsed = Math.max(0, this.cycleTime - inspTime);
        const valveDecayTau = 0.055; // 55ms rapid valve opening transient
        const valveDecayFactor = Math.exp(-expTimeElapsed / valveDecayTau);
        const endInspP = Math.max(setPeep + pAlveolar, this.cyclePlateauPressure || setPeep + 10);
        
        // Physical Paw during expiration = setPeep + dynamicAutoPeep + exhalation valve flow resistance + transient valve opening spike
        const absExpFlowLsec = Math.abs(expFlowLsec);
        const valveResistanceP = Math.min(3.5, absExpFlowLsec * (1.6 + (Raw > 15 ? 0.8 : 0)));
        const transientSpike = (endInspP - setPeep) * valveDecayFactor * 0.45;
        const expPressureCurve = setPeep + this.dynamicAutoPeep + valveResistanceP + transientSpike;

        this.currentPressure = Math.max(setPeep - 2.5, expPressureCurve) + expPmusDeflection + microNoiseP;
      }
    }

    // Circuit leak factor
    if (patient.circuitLeakPercent && patient.circuitLeakPercent > 0) {
      const leakFactor = 1 - (patient.circuitLeakPercent / 100);
      this.currentVolume *= leakFactor;
    }

    const computedVte = Math.max(40, Math.round(this.cycleVti * (1 - (patient.circuitLeakPercent || 0) / 100)));
    const totalPeep = setPeep + this.displayedAutoPeep;
    const drivingPressure = Math.max(0, Math.round((this.displayedPlat - totalPeep) * 10) / 10);

    // Dynamic Clinical State & Interaction Feedback
    let patientInteractionMessage = 'Paciente confortável e acoplado ao ventilador.';
    if (detectedAsynchrony !== 'none') {
      patientInteractionMessage = `⚠️ Assincronia Ativa: ${asynchronyDetail}`;
    } else if (this.currentSpO2 < 85) {
      patientInteractionMessage = '🚨 Hipoxemia Grave: Paciente cianótico, má perfusão periférica, risco iminente por hipóxia.';
    } else if (this.currentSpO2 < 90) {
      patientInteractionMessage = '⚠️ Hipoxemia Moderada: Oxigenação limítrofe, titular PEEP/FiO₂.';
    } else if (patient.pathology === 'neuro' && (this.currentPaCO2 < 34 || this.currentPaCO2 > 42)) {
      patientInteractionMessage = this.currentPaCO2 < 34 
        ? '⚠️ TCE/Neurocrítico: Hipocapnia iatrogênica (risco de isquemia cerebral por vasoconstrição).' 
        : '🚨 TCE/Neurocrítico: Hipercapnia com risco de vasodilatação cerebral e pico de PIC!';
    } else if (this.currentPaCO2 > 58 && this.currentpH < 7.24 && patient.pathology !== 'dpoc') {
      patientInteractionMessage = '🚨 Acidose Respiratória Descompensada: Retenção aguda de CO₂ com pH criticamente baixo.';
    } else if (patient.pathology === 'dpoc' && this.currentPaCO2 < 42 && this.currentpH > 7.50) {
      patientInteractionMessage = '⚠️ DPOC - Alcalose Metabólica Pós-Hipercápnica: Hiperventilação excessiva em retentor crônico!';
    } else if (drivingPressure > 14.5 && this.plateauMeasuredThisCycle) {
      patientInteractionMessage = '⚠️ Risco de VILI (Lesão Pulmonar): Driving Pressure elevada (ΔP > 14 cmH₂O). Reduza o Vt ou titule PEEP.';
    } else if (this.displayedAutoPeep > 3.5) {
      patientInteractionMessage = '⚠️ Auto-PEEP / Aprisionamento Aéreo: Tempo expiratório insuficiente. Aumente fluxo insp ou reduza FR.';
    } else if (patient.spontaneousDrive && (measuredRR / (Math.max(1, this.displayedVte) / 1000)) > 105) {
      patientInteractionMessage = '🚨 Fome de Ar / Fadiga Diafragmática: Respiração rápida e superficial (Índice de Tobin > 105).';
    } else {
      if (patient.spontaneousDrive) {
        patientInteractionMessage = '✅ Paciente com drive respiratório ativo, interagindo de forma sincronizada com o suporte ventilatório.';
      } else {
        patientInteractionMessage = '✅ Ventilação protetora controlada, mecânica pulmonar e trocas gasosas estáveis.';
      }
    }

    const phase: WaveformSample['phase'] = this.isInspPhase 
      ? (this.isPausePhase ? 'insp_pause' : 'insp')
      : (isExpiratoryHold ? 'exp_pause' : 'exp');

    const sample: WaveformSample = {
      time: this.totalSimulationTime,
      pressure: Math.round(this.currentPressure * 10) / 10,
      flow: Math.round(this.currentFlow * 10) / 10,
      volume: Math.round(this.currentVolume),
      phase,
      isSpontaneous: isPatientTriggering,
      isTriggered: this.lastTriggered,
    };

    const monitored: MonitoredData = {
      peakPressure: Math.round(this.displayedPeak * 10) / 10,
      plateauPressure: Math.round(this.displayedPlat * 10) / 10,
      isPlateauMeasured: this.plateauMeasuredThisCycle,
      patientInteractionMessage,
      activeAsynchrony: detectedAsynchrony,
      asynchronyDescription: asynchronyDetail,
      isEquilibrating: workerOutput.isEquilibrating,
      equilibrationProgressPercent: workerOutput.equilibrationProgressPercent,
      mechanicsEquilibrationProgress: workerOutput.mechanicsEquilibrationProgress,
      physiologicalTransitionMessage: workerOutput.physiologicalTransitionMessage,
      meanPressure: Math.round(((this.displayedPeak * inspTime + setPeep * expTime) / cycleDuration) * 10) / 10,
      peep: setPeep,
      peepTotal: Math.round(totalPeep * 10) / 10,
      autoPeep: this.displayedAutoPeep,
      drivingPressure,
      vte: Math.round(this.displayedVte),
      vti: Math.round(this.displayedVti),
      minuteVolume: Math.round(this.displayedMV * 10) / 10,
      spontaneousMinuteVolume: Math.round((this.displayedMV * (patient.spontaneousDrive ? 0.4 : 0)) * 10) / 10,
      leakVolume: Math.round(this.displayedVti - this.displayedVte),
      totalRate: measuredRR,
      spontaneousRate: patient.spontaneousDrive ? Math.round(dynamicSpontRate) : 0,
      mandatoryRate: targetRR,
      inspiratoryTime: Math.round(inspTime * 100) / 100,
      expiratoryTime: Math.round(expTime * 100) / 100,
      ieRatioString: `1:${(expTime / Math.max(inspTime, 0.1)).toFixed(1)}`,
      staticCompliance: this.displayedCstat,
      dynamicCompliance: this.displayedCdyn,
      airwayResistance: this.displayedRaw,
      timeConstant: this.displayedTau,
      rapidShallowBreathingIndex: Math.round(measuredRR / (Math.max(1, this.displayedVte) / 1000)),
      mechanicalPower: Math.round(0.098 * measuredRR * (this.displayedVte / 1000) * (this.displayedPeak - (this.displayedPlat - totalPeep) / 2)),
      vtPerKgIBW: Math.round((this.displayedVte / patient.idealBodyWeightKg) * 10) / 10,
      pao2: Math.round(this.currentPaO2),
      paco2: Math.round(this.currentPaCO2),
      ph: this.currentpH,
      hco3: workerOutput.baseBicarb,
      baseExcess: workerOutput.baseExcess,
      spo2: Math.round(this.currentSpO2),
      pfRatio: workerOutput.pfRatio,
      alveolarPaO2: workerOutput.pAlveolarO2,
      aaGradient: Math.max(4, Math.round(workerOutput.pAlveolarO2 - this.currentPaO2)),
      etco2: workerOutput.etco2,
    };

    return { sample, monitored };
  }

  /**
   * Retrieves the state buffer containing historical breath cycle mechanics.
   */
  public getStateBuffer(): MechanicsStateBuffer {
    return this.stateBuffer;
  }
}

export const physicsEngine = new VentilationPhysicsEngine();
