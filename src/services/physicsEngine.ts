import {
  VentilatorSettings,
  PatientParameters,
  MonitoredData,
  WaveformSample,
  ManeuverState,
} from '../types/ventilation';
import { audioEngine } from './audioEngine';

export function calculateIBW(heightCm: number, gender: 'male' | 'female'): number {
  const inchesOver5Ft = (heightCm - 152.4) / 2.54;
  const base = gender === 'male' ? 50 : 45.5;
  const ibw = base + 2.3 * Math.max(0, inchesOver5Ft);
  return Math.round(ibw * 10) / 10;
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
  
  // Kinetic equilibrium tracking
  private targetPaCO2: number = 40;
  private targetPaO2: number = 95;
  private equilibrationTimer: number = 0;
  
  // Asynchrony tracking
  private currentActiveAsynchrony: 'none' | 'ineffective_effort' | 'double_trigger' | 'flow_starvation' | 'auto_trigger' | 'premature_cycling' | 'delayed_cycling' = 'none';
  private currentAsynchronyDescription: string = 'Ventilação sincronizada sem assincronias ativas.';

  // Committed display values (updated strictly at breath-cycle events to avoid jitter)
  private displayedPeak: number = 15;
  private displayedPlat: number = 12;
  private displayedVte: number = 440;
  private displayedVti: number = 450;
  private displayedMV: number = 6.0;
  private displayedAutoPeep: number = 0;

  public reset() {
    this.cycleTime = 0;
    this.currentVolume = 0;
    this.currentPressure = 5;
    this.currentFlow = 0;
    this.isInspPhase = true;
    this.isPausePhase = false;
    this.doubleTriggerPending = false;
    this.doubleTriggerCooldown = 0;
    this.triggerDeflectionTimer = 0;
    this.triggerDeflectionDepth = 0;
    this.equilibrationTimer = 0;
  }

  /**
   * Generates a single physics time-step sample (typically dt = 0.0166s = 60Hz)
   */
  public step(
    dt: number,
    settings: VentilatorSettings,
    patient: PatientParameters,
    maneuvers: ManeuverState
  ): { sample: WaveformSample; monitored: MonitoredData } {
    this.totalSimulationTime += dt;
    this.cycleTime += dt;
    if (this.doubleTriggerCooldown > 0) {
      this.doubleTriggerCooldown = Math.max(0, this.doubleTriggerCooldown - dt);
    }
    if (this.triggerDeflectionTimer > 0) {
      this.triggerDeflectionTimer = Math.max(0, this.triggerDeflectionTimer - dt);
    }

    // 1. Effective PEEP (accounting for recruitment maneuver or set PEEP)
    const setPeep = maneuvers.recruitmentManeuverActive ? Math.min(settings.peep + 15, 35) : settings.peep;

    // 2. Dynamic Alveolar Mechanics: PEEP Recruitment & Overdistension Model
    let effectiveCompliance_mL = Math.max(patient.compliance, 5);
    const Raw = Math.max(patient.resistance, 1.5);

    // Alveolar recruitment bonus in restrictive/edematous pathologies (SDRA, EAP, Pós-Op, Obeso)
    if (patient.recruitmentPotential === 'high' || patient.pathology === 'sdra' || patient.pathology === 'edema' || patient.compliance < 35) {
      if (setPeep >= 8 && setPeep <= 18) {
        // Optimal PEEP zone: open lung concept recruits collapsed alveoli
        const recruitmentGain = Math.min(0.35, (setPeep - 5) * 0.035);
        effectiveCompliance_mL *= (1 + recruitmentGain);
      } else if (setPeep > 18) {
        // Overdistension zone: lung is stretched onto the upper flat portion of compliance curve
        const overdistensionPenalty = Math.min(0.4, (setPeep - 18) * 0.04);
        effectiveCompliance_mL *= (1 - overdistensionPenalty);
      }
    }

    const C_L = effectiveCompliance_mL / 1000; // in L/cmH2O
    const tau = Raw * C_L; // Respiratory system time constant tau = R * C (s)

    // 3. Realistic Dynamic Patient Spontaneous Drive & Muscular Effort Pmus(t)
    // Central chemoreceptors & peripheral chemoreceptors response with true physiological latency
    let pmus = 0;
    let isPatientTriggering = false;
    let isIneffectiveEffort = false;
    let detectedAsynchrony: typeof this.currentActiveAsynchrony = 'none';
    let asynchronyDetail = 'Ventilação sincronizada com boa interação neuromuscular.';

    let dynamicSpontRate = patient.spontaneousRate;
    let dynamicEffort = patient.spontaneousEffortPressure;

    const baselineTargetCO2 = (patient.pathology === 'dpoc' || (patient.baselineBicarbonate && patient.baselineBicarbonate > 28)) ? 54 : 40;

    if (patient.spontaneousDrive) {
      // Dynamic Drive Modulation based on actual progressive PaCO2 and SpO2 in brainstem / carotid bodies
      // Hypoxemia stimulus (peripheral chemoreceptors)
      if (this.currentSpO2 < 93) {
        const hypoxDrive = (93 - this.currentSpO2);
        dynamicSpontRate += hypoxDrive * 1.1;
        dynamicEffort -= hypoxDrive * 0.45;
      }

      // Hypercapnia stimulus (central medullary chemoreceptors)
      if (this.currentPaCO2 > baselineTargetCO2) {
        const co2Excess = this.currentPaCO2 - baselineTargetCO2;
        dynamicSpontRate += co2Excess * 0.75;
        dynamicEffort -= co2Excess * 0.40;
      } else if (this.currentPaCO2 < baselineTargetCO2 - 6) {
        // Hypocapnia / Apneic Threshold: spontaneous drive is suppressed by hyperventilation
        const co2Deficit = (baselineTargetCO2 - 6) - this.currentPaCO2;
        dynamicSpontRate = Math.max(0, dynamicSpontRate - co2Deficit * 1.2);
        dynamicEffort = Math.min(-0.2, dynamicEffort + co2Deficit * 0.5);
      }

      dynamicSpontRate = Math.max(0, Math.min(dynamicSpontRate, 50));
      dynamicEffort = Math.min(-0.2, Math.max(dynamicEffort, -30));

      if (dynamicSpontRate >= 3) {
        const spontCycleDuration = 60 / dynamicSpontRate;
        const spontTimeInCycle = this.totalSimulationTime % spontCycleDuration;
        const spontInspDuration = Math.max(0.4, spontCycleDuration * (patient.spontaneousDutyCycle || 0.33));

        if (spontTimeInCycle < spontInspDuration) {
          // Half-sine wave for muscular inspiratory pull Pmus (negative airway pressure pull)
          const progress = spontTimeInCycle / spontInspDuration;
          pmus = dynamicEffort * Math.sin(progress * Math.PI);

          // Auto-PEEP threshold loading (waterfall effect):
          // In the presence of Auto-PEEP, patient must overcome uncounterbalanced Auto-PEEP before trigger activates
          const uncounterbalancedAutoPeep = Math.max(0, this.displayedAutoPeep - setPeep * 0.85);

          if (settings.triggerType === 'pressure') {
            const requiredPmus = -Math.abs(settings.triggerSensitivity || 2.0) - uncounterbalancedAutoPeep;
            if (pmus <= requiredPmus) {
              isPatientTriggering = true;
            } else if (pmus < -1.8 && !this.isInspPhase) {
              isIneffectiveEffort = true;
              detectedAsynchrony = 'ineffective_effort';
              asynchronyDetail = 'Disparo Ineficaz: O esforço muscular do paciente não atinge a sensibilidade devido ao Auto-PEEP (' + this.displayedAutoPeep.toFixed(1) + ' cmH₂O) ou sensibilidade de disparo pesada.';
            }
          } else {
            // Flow trigger: flow demanded = (|Pmus| - uncounterbalancedAutoPeep) / Raw * 60 L/min
            const netEffort = Math.max(0, Math.abs(pmus) - uncounterbalancedAutoPeep);
            const patientInspFlowLpm = (netEffort / Raw) * 60;
            const flowThreshold = Math.max(0.5, settings.triggerSensitivity || 2.0);
            if (patientInspFlowLpm >= flowThreshold) {
              isPatientTriggering = true;
            } else if (Math.abs(pmus) > 1.8 && !this.isInspPhase) {
              isIneffectiveEffort = true;
              detectedAsynchrony = 'ineffective_effort';
              asynchronyDetail = 'Disparo Ineficaz: Esforço muscular inspiratório durante a expiração sem deflagrar ciclo mecânico (Auto-PEEP residual).';
            }
          }
        }
      }
    }

    // Auto-triggering check: excessive trigger sensitivity with circuit noise / leaks
    const isOverSensitiveTrigger = (settings.triggerType === 'flow' && settings.triggerSensitivity <= 0.8 && (patient.circuitLeakPercent || 0) > 10) ||
                                   (settings.triggerType === 'pressure' && settings.triggerSensitivity >= -0.6);
    if (isOverSensitiveTrigger && !patient.spontaneousDrive) {
      if (Math.sin(this.totalSimulationTime * 4) > 0.92) {
        isPatientTriggering = true;
        detectedAsynchrony = 'auto_trigger';
        asynchronyDetail = 'Auto-Disparo (Auto-Triggering): Sensibilidade excessiva com oscilações / microvazamento deflagrando ciclos involuntários.';
      }
    }

    // Secretion noise in airway flow
    let secretionNoise = 0;
    if (patient.secretionsSeverity === 'mild') {
      secretionNoise = (Math.sin(this.totalSimulationTime * 45) + Math.sin(this.totalSimulationTime * 85)) * 1.5;
    } else if (patient.secretionsSeverity === 'severe') {
      secretionNoise = (Math.sin(this.totalSimulationTime * 35) + Math.sin(this.totalSimulationTime * 110) + (Math.random() - 0.5) * 2.5) * 3.8;
    }

    // 4. Determine Breath Timings & Cycle Duration
    let targetRR = settings.respiratoryRate;
    let inspTime = 1.0;
    let expTime = 3.0;
    let cycleDuration = 4.0;

    switch (settings.mode) {
      case 'VCV': {
        cycleDuration = 60 / Math.max(settings.respiratoryRate, 1);
        inspTime = settings.inspiratoryTimePCV || 1.0;
        const pauseTime = (settings.inspiratoryPausePercent / 100) * cycleDuration;
        const totalInspWithPause = inspTime + pauseTime;
        expTime = Math.max(0.35, cycleDuration - totalInspWithPause);
        break;
      }
      case 'PCV': {
        cycleDuration = 60 / Math.max(settings.respiratoryRate, 1);
        inspTime = settings.inspiratoryTimePCV || 1.0;
        expTime = Math.max(0.35, cycleDuration - inspTime);
        break;
      }
      case 'PSV':
      case 'CPAP': {
        const activeRate = (patient.spontaneousDrive && dynamicSpontRate >= 4) ? dynamicSpontRate : (60 / settings.backupApneaTime);
        cycleDuration = 60 / Math.max(activeRate, 4);
        inspTime = cycleDuration * (patient.spontaneousDrive ? (patient.spontaneousDutyCycle || 0.33) : 0.33);
        expTime = Math.max(0.35, cycleDuration - inspTime);
        break;
      }
      case 'APRV': {
        cycleDuration = settings.tHigh + settings.tLow;
        inspTime = settings.tHigh;
        expTime = settings.tLow;
        break;
      }
      case 'SIMV_VC':
      case 'SIMV_PC': {
        cycleDuration = 60 / Math.max(settings.simvRate, 4);
        inspTime = settings.inspiratoryTimePCV || 1.0;
        expTime = Math.max(0.35, cycleDuration - inspTime);
        break;
      }
    }

    // 5. Active Diagnostic Maneuvers
    const isInspiratoryHold = maneuvers.inspiratoryHoldActive;
    const isExpiratoryHold = maneuvers.expiratoryHoldActive;
    const measuredRR = targetRR + (patient.spontaneousDrive ? Math.round(dynamicSpontRate * 0.45) : 0);

    // 6. Breath Cycle State Machine
    if (this.isInspPhase) {
      if (this.cycleTime >= inspTime) {
        if (isInspiratoryHold) {
          this.isPausePhase = true;
        } else {
          const pauseDuration = settings.mode === 'VCV' ? (settings.inspiratoryPausePercent / 100) * cycleDuration : 0;
          if (this.cycleTime < inspTime + pauseDuration) {
            this.isPausePhase = true;
          } else {
            // End of inspiration -> switch to expiration
            this.isInspPhase = false;
            this.isPausePhase = false;
            this.cycleVti = this.currentVolume;
            this.displayedVti = Math.round(this.cycleVti);

            // Check for Double Triggering asynchrony (patient inspiratory effort still active at end of mechanical Ti)
            if (patient.spontaneousDrive && Math.abs(pmus) > 4.5 && (settings.mode === 'VCV' || settings.mode === 'PCV') && inspTime < 0.9 && this.doubleTriggerCooldown === 0) {
              this.doubleTriggerPending = true;
              this.doubleTriggerCooldown = 2.0;
              detectedAsynchrony = 'double_trigger';
              asynchronyDetail = 'Duplo Disparo (Double Triggering): Tempo neural do paciente é maior que o tempo inspiratório programado, gerando empilhamento de volume (breath stacking).';
            }

            audioEngine.playBreathExpSound(expTime, Raw);
          }
        }
      }
    } else {
      // Expiration phase: check if cycle finished OR patient triggered a new breath
      const triggerReady = (this.cycleTime >= 0.18 && !isExpiratoryHold && isPatientTriggering) || this.doubleTriggerPending;

      if ((this.cycleTime >= cycleDuration && !isExpiratoryHold) || triggerReady) {
        // End of expiration -> New breath starts!
        this.isInspPhase = true;
        this.isPausePhase = false;
        this.cycleTime = 0;
        const wasDoubleTrigger = this.doubleTriggerPending;
        this.doubleTriggerPending = false;

        // Realistic initial trigger dip timer
        if (isPatientTriggering || wasDoubleTrigger) {
          this.triggerDeflectionTimer = 0.08; // 80ms trigger deflection notch
          this.triggerDeflectionDepth = Math.min(2.5, Math.max(0.8, Math.abs(pmus) * 0.45));
        }

        // Delivered exhaled tidal volume (accounting for circuit leak)
        const leakFraction = (patient.circuitLeakPercent || 0) / 100;
        this.cycleVte = Math.max(20, Math.round(this.cycleVti * (1 - leakFraction)));
        this.displayedVte = this.cycleVte;
        this.displayedPeak = Math.round(this.cyclePeakPressure * 10) / 10;

        // Calculate Plateau Pressure
        if (!this.plateauMeasuredThisCycle) {
          const calcPplat = setPeep + ((this.displayedVti / 1000) / C_L);
          const minGap = settings.mode === 'VCV' ? Math.max(2.5, Raw * 0.3) : 1.5;
          this.displayedPlat = Math.min(this.displayedPeak - minGap, Math.round(calcPplat * 10) / 10);
        } else {
          this.displayedPlat = Math.round(this.cyclePlateauPressure * 10) / 10;
        }

        // Dynamic Auto-PEEP based on remaining volume at end-expiration (V_trapped = Vti * e^(-Te/tau))
        const effectiveTe = Math.max(0.1, expTime);
        const trappedVolume_mL = this.cycleVti * Math.exp(-effectiveTe / tau);
        this.displayedAutoPeep = Math.max(0, Math.round(((trappedVolume_mL / 1000) / C_L) * 10) / 10);

        this.displayedMV = Math.round(((this.displayedVte * measuredRR) / 1000) * 10) / 10;
        this.plateauMeasuredThisCycle = false;
        this.cyclePeakPressure = setPeep;
        this.currentVolume = wasDoubleTrigger ? this.currentVolume * 0.4 : 0; // Breath stacking volume retention
        this.breathCounter++;

        if (isPatientTriggering || triggerReady) {
          this.spontBreathCounter++;
          this.lastTriggered = true;
          audioEngine.playTriggerSound();
        } else {
          this.lastTriggered = false;
        }

        audioEngine.playBreathInspSound(inspTime, settings.inspiratoryFlow || 60, Raw);
      }
    }

    // 7. Compute Flow, Volume, and Airway Pressure Paw(t) according to the Equation of Motion
    // Paw(t) = PEEP + (V(t) / Crs) + (Raw * Flow) + Pmus
    let pAlveolar = (this.currentVolume / (C_L * 1000)); // cmH2O above PEEP

    if (this.isInspPhase && !this.isPausePhase) {
      // INSPIRATION
      this.lastTriggered = isPatientTriggering;

      switch (settings.mode) {
        case 'VCV': {
          const vtL = (settings.tidalVolume || 450) / 1000;
          const setInspTime = settings.inspiratoryTimePCV || 1.0;
          let flowLsec: number;

          if (settings.flowWaveform === 'decelerating') {
            const peakFlowLsec = (2 * vtL) / setInspTime;
            const progress = Math.min(1.0, this.cycleTime / setInspTime);
            flowLsec = peakFlowLsec * (1 - progress * 0.9);
          } else {
            flowLsec = vtL / setInspTime;
          }

          // Flow Starvation (Fome de fluxo) in VCV:
          // If patient pulls hard (pmus < -3) while set flow is low, Paw curve scallops downward
          let flowStarvationEffect = 0;
          if (pmus < -2.5) {
            flowStarvationEffect = pmus * 1.15;
            if ((flowLsec * 60) < 55) {
              detectedAsynchrony = 'flow_starvation';
              asynchronyDetail = 'Fome de Fluxo (Flow Starvation): O fluxo inspiratório ofertado é insuficiente para a demanda muscular do paciente, causando concavidade inferior na curva de pressão.';
            }
          }

          this.currentFlow = flowLsec * 60 + secretionNoise;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = this.currentVolume / (C_L * 1000);

          const pResistive = Raw * flowLsec;
          let calculatedPaw = setPeep + pAlveolar + pResistive + flowStarvationEffect;

          // Initial negative trigger dip at onset of inspiration
          if (this.triggerDeflectionTimer > 0) {
            calculatedPaw -= this.triggerDeflectionDepth * (this.triggerDeflectionTimer / 0.08);
          }

          this.currentPressure = calculatedPaw;
          this.lastPeakFlow = this.currentFlow;
          break;
        }

        case 'PCV': {
          const targetPinsp = setPeep + settings.inspiratoryPressure;
          const rampTime = settings.pressureRiseTime || 0.1;
          const rampProgress = Math.min(1.0, this.cycleTime / rampTime);
          const currentTargetP = setPeep + (settings.inspiratoryPressure * rampProgress);

          // Flow = (TargetP - Palv - PEEP - pmus) / Raw
          const drivingP = Math.max(0, currentTargetP - (setPeep + pAlveolar));
          const flowLsec = Math.max(0, (drivingP - pmus * 0.6) / Raw);

          this.currentFlow = flowLsec * 60 + secretionNoise;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = this.currentVolume / (C_L * 1000);

          let calculatedPaw = currentTargetP + pmus * 0.35;
          if (this.triggerDeflectionTimer > 0) {
            calculatedPaw -= this.triggerDeflectionDepth * (this.triggerDeflectionTimer / 0.08);
          }

          this.currentPressure = calculatedPaw;
          this.lastPeakFlow = Math.max(this.lastPeakFlow, this.currentFlow);
          break;
        }

        case 'PSV': {
          const targetPinsp = setPeep + (settings.pressureSupport || 10);
          const drivingP = Math.max(0, targetPinsp - (setPeep + pAlveolar));
          const flowLsec = Math.max(0, (drivingP - pmus * 0.75) / Raw);

          this.currentFlow = flowLsec * 60 + secretionNoise;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = this.currentVolume / (C_L * 1000);

          let calculatedPaw = targetPinsp + pmus * 0.3;
          if (this.triggerDeflectionTimer > 0) {
            calculatedPaw -= this.triggerDeflectionDepth * (this.triggerDeflectionTimer / 0.08);
          }

          this.currentPressure = calculatedPaw;
          this.lastPeakFlow = Math.max(this.lastPeakFlow, this.currentFlow);

          // Flow Cycling criterion (Esens, e.g. 25% of peak flow)
          const cycleThreshold = (settings.expiratorySensitivity / 100) * this.lastPeakFlow;
          
          // Check premature cycling (Esens >= 45% while patient is still inspiring)
          if (settings.expiratorySensitivity >= 45 && Math.abs(pmus) > 2.5 && this.currentFlow <= cycleThreshold) {
            detectedAsynchrony = 'premature_cycling';
            asynchronyDetail = 'Ciclagem Prematura: Critério Esens elevado (' + settings.expiratorySensitivity + '%) interrompe o fluxo antes do término do tempo neural do paciente.';
          }
          // Check delayed cycling (Esens <= 10% in obstructive disease)
          if (settings.expiratorySensitivity <= 10 && patient.resistance > 12 && this.cycleTime > 1.3) {
            detectedAsynchrony = 'delayed_cycling';
            asynchronyDetail = 'Ciclagem Tardia: Esens muito baixo prolonga a fase inspiratória para dentro da expiração neural.';
          }

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
          this.currentFlow = flowLsec * 60 + secretionNoise;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = this.currentVolume / (C_L * 1000);
          this.currentPressure = setPeep + pmus;
          break;
        }

        case 'APRV': {
          const targetPinsp = settings.pHigh;
          const drivingP = Math.max(0, targetPinsp - (settings.pLow + pAlveolar));
          const flowLsec = Math.max(0, (drivingP - pmus) / Raw);
          this.currentFlow = flowLsec * 60 + secretionNoise;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = this.currentVolume / (C_L * 1000);
          this.currentPressure = settings.pHigh + pmus;
          break;
        }

        case 'SIMV_VC': {
          const vtL = (settings.tidalVolume || 450) / 1000;
          const setInspTime = settings.inspiratoryTimePCV || 1.0;
          const flowLsec = vtL / setInspTime;

          this.currentFlow = flowLsec * 60 + secretionNoise;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = this.currentVolume / (C_L * 1000);

          const pResistive = Raw * flowLsec;
          this.currentPressure = setPeep + pAlveolar + pResistive + pmus;
          this.lastPeakFlow = this.currentFlow;
          break;
        }

        case 'SIMV_PC': {
          const targetPinsp = setPeep + settings.inspiratoryPressure;
          const drivingP = Math.max(0, targetPinsp - (setPeep + pAlveolar));
          const flowLsec = Math.max(0, (drivingP - pmus) / Raw);

          this.currentFlow = flowLsec * 60 + secretionNoise;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = this.currentVolume / (C_L * 1000);

          this.currentPressure = targetPinsp + pmus;
          this.lastPeakFlow = Math.max(this.lastPeakFlow, this.currentFlow);
          break;
        }
      }

      this.cyclePeakPressure = Math.max(this.cyclePeakPressure, this.currentPressure);

    } else if (this.isPausePhase) {
      // INSPIRATORY PAUSE (Zero flow, Paw becomes Pplat)
      this.currentFlow = 0;
      pAlveolar = this.currentVolume / (C_L * 1000);
      const minGap = settings.mode === 'VCV' ? Math.max(2.5, Raw * 0.3) : 1.2;
      this.currentPressure = Math.min(this.cyclePeakPressure - minGap, setPeep + pAlveolar + pmus * 0.5);
      this.cyclePlateauPressure = this.currentPressure;
      this.displayedPlat = Math.round(this.cyclePlateauPressure * 10) / 10;
      this.plateauMeasuredThisCycle = true;

    } else {
      // EXPIRATION
      if (isExpiratoryHold) {
        this.currentFlow = 0;
        const autoPeepPressure = this.currentVolume / (C_L * 1000);
        this.currentPressure = setPeep + autoPeepPressure;
      } else {
        // Passive exhalation decaying exponentially
        const decayFactor = Math.exp(-dt / tau);
        let expFlowLsec = -(this.currentVolume / (tau * 1000));

        // Ineffective effort artifact during expiration:
        // produces a distinct downward notch in Paw and small positive notch in expiratory flow
        let expPmusDeflection = 0;
        if (isIneffectiveEffort) {
          expFlowLsec += 0.35; // transient upward bump on expiratory flow
          expPmusDeflection = Math.max(-2.5, pmus * 0.6); // negative dip on Paw
        }

        this.currentFlow = expFlowLsec * 60 + secretionNoise;
        this.currentVolume = Math.max(0, this.currentVolume * decayFactor);

        pAlveolar = this.currentVolume / (C_L * 1000);
        const pResistive = Raw * Math.abs(expFlowLsec);
        this.currentPressure = Math.max(setPeep - 2.5, setPeep + pAlveolar - pResistive * 0.45) + expPmusDeflection;
      }
    }

    // Circuit leak factor
    if (patient.circuitLeakPercent && patient.circuitLeakPercent > 0) {
      const leakFactor = 1 - (patient.circuitLeakPercent / 100);
      this.currentVolume *= leakFactor;
    }

    // 8. Derived Diagnostic Metrics
    const computedVte = Math.max(40, Math.round(this.cycleVti * (1 - (patient.circuitLeakPercent || 0) / 100)));
    const computedVti = Math.round(this.cycleVti);
    const minuteVentilation = (computedVte * measuredRR) / 1000; // L/min

    if (!isInspiratoryHold && this.cyclePlateauPressure === 12) {
      const calcPplat = setPeep + ((computedVti / 1000) / C_L);
      const minGap = settings.mode === 'VCV' ? Math.max(3.0, Raw * 0.35) : 1.5;
      this.cyclePlateauPressure = Math.min(this.cyclePeakPressure - minGap, Math.round(calcPplat * 10) / 10);
    }

    const drivingPressure = Math.max(0, Math.round((this.cyclePlateauPressure - setPeep) * 10) / 10);
    const peepTotal = setPeep + this.displayedAutoPeep;

    // 9. Physiological Equilibrium Kinetics & Arterial Blood Gas Processing
    // Calculate Instantaneous Alveolar Ventilation & Target Gas Levels
    const deadSpaceVol = computedVte * patient.deadSpaceFraction;
    const alveolarVentilation = Math.max(0.4, ((computedVte - deadSpaceVol) * measuredRR) / 1000); // L/min

    // Target PaCO2 based on metabolic VCO2 and delivered alveolar ventilation
    const basePaCO2 = (patient.metabolicRateVCO2 / alveolarVentilation) * 0.863;
    this.targetPaCO2 = Math.min(110, Math.max(18, Math.round(basePaCO2)));

    // Target PaO2 & Shunt
    const effectiveFiO2 = maneuvers.o2SuctionActive ? 1.0 : settings.fio2 / 100;
    const pAlveolarO2 = effectiveFiO2 * (760 - 47) - (this.targetPaCO2 / 0.8);
    const peepRecruitmentBonus = Math.min(1.0, setPeep / 14);
    let effectiveShuntFraction = (patient.shuntFraction / 100) * (1.25 - 0.55 * peepRecruitmentBonus);
    if (patient.pathology === 'pneumotorax') {
      effectiveShuntFraction = 0.45;
    }
    effectiveShuntFraction = Math.max(0.03, effectiveShuntFraction);

    let currentPfRatio = 520 - (effectiveShuntFraction * 100) * 13;
    currentPfRatio = Math.max(35, Math.min(520, currentPfRatio));
    let calcPaO2 = currentPfRatio * effectiveFiO2;
    calcPaO2 = Math.min(pAlveolarO2 - 4, calcPaO2);
    this.targetPaO2 = Math.max(25, Math.round(calcPaO2));

    // Physiological Washout Time Constant (tauABG ~ 22s for CO2 equilibration in body stores)
    const tauABG = 22.0;
    const alphaABG = 1 - Math.exp(-dt / tauABG);
    this.currentPaCO2 += (this.targetPaCO2 - this.currentPaCO2) * alphaABG;
    this.currentPaO2 += (this.targetPaO2 - this.currentPaO2) * alphaABG;

    // Bicarbonate & pH
    const baseBicarb = patient.baselineBicarbonate || (patient.pathology === 'dpoc' ? 32 : 24);
    const currentSmoothedPh = Math.round((6.10 + Math.log10(baseBicarb / (0.0307 * this.currentPaCO2))) * 100) / 100;
    this.currentpH = currentSmoothedPh;

    // SpO2 calculation
    const p50 = 26.6 * Math.pow(10, -(this.currentpH - 7.40) * 0.4);
    const v = this.currentPaO2 / p50;
    const targetSpO2 = Math.min(100, Math.max(35, Math.round((Math.pow(v, 2.7) / (Math.pow(v, 2.7) + 1)) * 100)));
    this.currentSpO2 += (targetSpO2 - this.currentSpO2) * alphaABG;

    // Equilibration progress status
    const co2Gap = Math.abs(this.targetPaCO2 - this.currentPaCO2);
    const isEquilibrating = co2Gap > 1.5;
    const progressPercent = Math.min(100, Math.max(0, Math.round(100 - (co2Gap / Math.max(4, Math.abs(this.targetPaCO2 - 40))) * 100)));

    // Dynamic Clinical State & Interaction Feedback
    let patientInteractionMessage = 'Paciente confortável e acoplado ao ventilador.';
    if (detectedAsynchrony !== 'none') {
      patientInteractionMessage = `⚠️ Assincronia Ativa: ${asynchronyDetail}`;
    } else if (isEquilibrating) {
      patientInteractionMessage = `⏳ Processando ajuste ventilatório: Equilíbrio gasométrico e drive bulbar em transição (${progressPercent}% concluído).`;
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

    const smoothedBaseExcess = Math.round((baseBicarb - 24.8 + 16.2 * (this.currentpH - 7.40)) * 10) / 10;
    const smoothedPfRatio = Math.round(this.currentPaO2 / effectiveFiO2);
    const smoothedEtCO2 = Math.round(this.currentPaCO2 * (1 - patient.deadSpaceFraction * 0.42));

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
      isEquilibrating,
      equilibrationProgressPercent: progressPercent,
      meanPressure: Math.round(((this.displayedPeak * inspTime + setPeep * expTime) / cycleDuration) * 10) / 10,
      peep: setPeep,
      peepTotal: Math.round(peepTotal * 10) / 10,
      autoPeep: this.displayedAutoPeep,
      drivingPressure: Math.max(0, Math.round((this.displayedPlat - peepTotal) * 10) / 10),
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
      staticCompliance: Math.round(this.displayedVte / Math.max(1, (this.displayedPlat - peepTotal))),
      dynamicCompliance: Math.round(this.displayedVte / Math.max(1, (this.displayedPeak - peepTotal))),
      airwayResistance: Math.round(Raw * 10) / 10,
      timeConstant: Math.round(tau * 100) / 100,
      rapidShallowBreathingIndex: Math.round(measuredRR / (Math.max(1, this.displayedVte) / 1000)),
      mechanicalPower: Math.round(0.098 * measuredRR * (this.displayedVte / 1000) * (this.displayedPeak - (this.displayedPlat - peepTotal) / 2)),
      vtPerKgIBW: Math.round((this.displayedVte / patient.idealBodyWeightKg) * 10) / 10,
      pao2: Math.round(this.currentPaO2),
      paco2: Math.round(this.currentPaCO2),
      ph: this.currentpH,
      hco3: baseBicarb,
      baseExcess: smoothedBaseExcess,
      spo2: Math.round(this.currentSpO2),
      pfRatio: smoothedPfRatio,
      alveolarPaO2: Math.round(pAlveolarO2),
      aaGradient: Math.max(4, Math.round(pAlveolarO2 - this.currentPaO2)),
      etco2: smoothedEtCO2,
    };

    return { sample, monitored };
  }
}

export const physicsEngine = new VentilationPhysicsEngine();
