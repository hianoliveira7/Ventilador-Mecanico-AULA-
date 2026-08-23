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
  
  // Double triggering detection
  private doubleTriggerPending: boolean = false;
  
  // Dynamic physiological state (smoothed ABG kinetics)
  private currentPaCO2: number = 40;
  private currentPaO2: number = 95;
  private currentpH: number = 7.40;
  private currentSpO2: number = 98;
  
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

    // 1. Effective PEEP (accounting for recruitment maneuver or set PEEP)
    const setPeep = maneuvers.recruitmentManeuverActive ? Math.min(settings.peep + 15, 35) : settings.peep;

    // 2. Dynamic Alveolar Mechanics: PEEP Recruitment & Overdistension Model
    // Base compliance in L/cmH2O
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

    // 3. Dynamic Patient Spontaneous Drive & Muscular Effort Pmus(t)
    let pmus = 0;
    let isPatientTriggering = false;
    let isIneffectiveEffort = false;
    
    let dynamicSpontRate = patient.spontaneousRate;
    let dynamicEffort = patient.spontaneousEffortPressure;
    
    if (patient.spontaneousDrive) {
      // Hypoxemia drives respiratory drive up (chemoreceptor reflex)
      if (this.currentSpO2 < 92) {
        dynamicSpontRate += (92 - this.currentSpO2) * 0.9;
        dynamicEffort -= (92 - this.currentSpO2) * 0.3;
      }
      // Hypercapnia / Acidosis drives respiratory rate and effort up
      const baselineTargetCO2 = (patient.pathology === 'dpoc' || (patient.baselineBicarbonate && patient.baselineBicarbonate > 28)) ? 55 : 42;
      if (this.currentPaCO2 > baselineTargetCO2) {
        dynamicSpontRate += (this.currentPaCO2 - baselineTargetCO2) * 0.6;
        dynamicEffort -= (this.currentPaCO2 - baselineTargetCO2) * 0.35;
      }
      
      dynamicSpontRate = Math.min(dynamicSpontRate, 48); // Max out at 48 rpm
      dynamicEffort = Math.max(dynamicEffort, -28); // Max out at -28 cmH2O pull

      const spontCycleDuration = 60 / Math.max(dynamicSpontRate, 6);
      const spontTimeInCycle = this.totalSimulationTime % spontCycleDuration;
      const spontInspDuration = spontCycleDuration * (patient.spontaneousDutyCycle || 0.33);
      
      if (spontTimeInCycle < spontInspDuration) {
        // Half-sine wave for muscular inspiratory pull Pmus
        const progress = spontTimeInCycle / spontInspDuration;
        pmus = dynamicEffort * Math.sin(progress * Math.PI);

        // Auto-PEEP threshold loading (waterfall effect):
        // In the presence of Auto-PEEP, patient must overcome (Auto-PEEP - Set PEEP) before trigger activates
        const uncounterbalancedAutoPeep = Math.max(0, this.displayedAutoPeep - setPeep * 0.85);

        if (settings.triggerType === 'pressure') {
          const requiredPmus = -Math.abs(settings.triggerSensitivity || 2.0) - uncounterbalancedAutoPeep;
          if (pmus <= requiredPmus) {
            isPatientTriggering = true;
          } else if (pmus < -2.0) {
            isIneffectiveEffort = true;
          }
        } else {
          // Flow trigger: flow demanded = (|Pmus| - uncounterbalancedAutoPeep) / Raw * 60 L/min
          const netEffort = Math.max(0, Math.abs(pmus) - uncounterbalancedAutoPeep);
          const patientInspFlowLpm = (netEffort / Raw) * 60;
          const flowThreshold = Math.max(0.5, settings.triggerSensitivity || 2.0);
          if (patientInspFlowLpm >= flowThreshold) {
            isPatientTriggering = true;
          } else if (Math.abs(pmus) > 2.0) {
            isIneffectiveEffort = true;
          }
        }
      }
    }

    // Secretion crackle / sawtooth noise in airway flow
    let secretionNoise = 0;
    if (patient.secretionsSeverity === 'mild') {
      secretionNoise = (Math.sin(this.totalSimulationTime * 45) + Math.sin(this.totalSimulationTime * 85)) * 1.8;
    } else if (patient.secretionsSeverity === 'severe') {
      secretionNoise = (Math.sin(this.totalSimulationTime * 35) + Math.sin(this.totalSimulationTime * 110) + (Math.random() - 0.5) * 3) * 4.5;
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
        // Spontaneous mode governed by patient's own rate or apnea backup
        const activeRate = patient.spontaneousDrive ? dynamicSpontRate : (60 / settings.backupApneaTime);
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
    const measuredRR = targetRR + (patient.spontaneousDrive ? Math.round(dynamicSpontRate * 0.5) : 0);

    // 6. Breath Cycle State Machine
    if (this.isInspPhase) {
      if (this.cycleTime >= inspTime) {
        if (isInspiratoryHold) {
          // Lock in inspiratory pause
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
            
            // Check for Double Triggering asynchrony (patient inspiratory effort still active at end of Ti)
            if (patient.spontaneousDrive && Math.abs(pmus) > 4.0 && settings.mode === 'VCV' && inspTime < 0.8) {
              this.doubleTriggerPending = true;
            }
            
            audioEngine.playBreathExpSound(expTime, Raw);
          }
        }
      }
    } else {
      // Expiration phase: check if cycle finished OR patient triggered a new breath
      const triggerReady = (this.cycleTime >= 0.20 && !isExpiratoryHold && isPatientTriggering) || this.doubleTriggerPending;
      
      if ((this.cycleTime >= cycleDuration && !isExpiratoryHold) || triggerReady) {
        // End of expiration -> New breath starts!
        this.isInspPhase = true;
        this.isPausePhase = false;
        this.cycleTime = 0;
        this.doubleTriggerPending = false;
        
        // Calculate delivered exhaled tidal volume (accounting for circuit leak)
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
        this.currentVolume = 0; // reset for next breath relative baseline
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
            // Decelerating ramp flow: starts at 2 * (Vt / Ti) and ramps down to 0
            const peakFlowLsec = (2 * vtL) / setInspTime;
            const progress = Math.min(1.0, this.cycleTime / setInspTime);
            flowLsec = peakFlowLsec * (1 - progress * 0.9); // tapers down to 10% of peak
          } else {
            // Square wave flow: constant flow Vt / Ti
            flowLsec = vtL / setInspTime;
          }

          // Flow Starvation (Fome de fluxo): if patient pulls hard (pmus < -4) in VCV, Paw scoops downward
          const flowStarvationScoop = (pmus < -3 && (flowLsec * 60) < 55) ? pmus * 1.3 : pmus;

          this.currentFlow = flowLsec * 60 + secretionNoise;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = this.currentVolume / (C_L * 1000);
          
          const pResistive = Raw * flowLsec;
          this.currentPressure = setPeep + pAlveolar + pResistive + flowStarvationScoop;
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
          const flowLsec = Math.max(0, (drivingP - pmus) / Raw);
          
          this.currentFlow = flowLsec * 60 + secretionNoise;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = this.currentVolume / (C_L * 1000);
          
          this.currentPressure = currentTargetP + pmus;
          this.lastPeakFlow = Math.max(this.lastPeakFlow, this.currentFlow);
          break;
        }

        case 'PSV': {
          const targetPinsp = setPeep + (settings.pressureSupport || 10);
          const drivingP = Math.max(0, targetPinsp - (setPeep + pAlveolar));
          const flowLsec = Math.max(0, (drivingP - pmus) / Raw);
          
          this.currentFlow = flowLsec * 60 + secretionNoise;
          this.currentVolume += (flowLsec * 1000) * dt;
          pAlveolar = this.currentVolume / (C_L * 1000);
          
          this.currentPressure = targetPinsp + pmus;
          this.lastPeakFlow = Math.max(this.lastPeakFlow, this.currentFlow);

          // Check Flow Cycling criterion (Esens, e.g. 25% of peak flow)
          const cycleThreshold = (settings.expiratorySensitivity / 100) * this.lastPeakFlow;
          if (this.cycleTime > 0.12 && this.currentFlow <= Math.max(cycleThreshold, 4)) {
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
      // INSPIRATORY PAUSE (Zero flow, resistive pressure drops to zero, Paw becomes Pplat)
      this.currentFlow = 0;
      pAlveolar = this.currentVolume / (C_L * 1000);
      const minGap = settings.mode === 'VCV' ? Math.max(2.5, Raw * 0.3) : 1.2;
      this.currentPressure = Math.min(this.cyclePeakPressure - minGap, setPeep + pAlveolar + pmus);
      this.cyclePlateauPressure = this.currentPressure;
      this.displayedPlat = Math.round(this.cyclePlateauPressure * 10) / 10;
      this.plateauMeasuredThisCycle = true;

    } else {
      // EXPIRATION
      if (isExpiratoryHold) {
        // Expiratory Hold locked -> measure Total PEEP & Auto-PEEP
        this.currentFlow = 0;
        const autoPeepPressure = this.currentVolume / (C_L * 1000);
        this.currentPressure = setPeep + autoPeepPressure;
      } else {
        // Passive exhalation decaying exponentially with time constant tau = Raw * C
        const decayFactor = Math.exp(-dt / tau);
        let expFlowLsec = -(this.currentVolume / (tau * 1000));
        
        // Ineffective effort artifact during expiration (small upward flow deflection and negative Paw dip)
        if (isIneffectiveEffort) {
          expFlowLsec += 0.25; // small upward notch on flow
        }
        
        this.currentFlow = expFlowLsec * 60 + secretionNoise;
        this.currentVolume = Math.max(0, this.currentVolume * decayFactor);
        
        pAlveolar = this.currentVolume / (C_L * 1000);
        const pResistive = Raw * Math.abs(expFlowLsec);
        this.currentPressure = Math.max(setPeep, setPeep + pAlveolar - pResistive * 0.5) + pmus;
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

    // Plateau estimation if no manual hold was performed
    if (!isInspiratoryHold && this.cyclePlateauPressure === 12) {
      const calcPplat = setPeep + ((computedVti / 1000) / C_L);
      const minGap = settings.mode === 'VCV' ? Math.max(3.0, Raw * 0.35) : 1.5;
      this.cyclePlateauPressure = Math.min(this.cyclePeakPressure - minGap, Math.round(calcPplat * 10) / 10);
    }

    const drivingPressure = Math.max(0, Math.round((this.cyclePlateauPressure - setPeep) * 10) / 10);
    const peepTotal = setPeep + this.displayedAutoPeep;

    // Static and Dynamic Compliance
    const cStat = drivingPressure > 0 ? Math.round(computedVte / drivingPressure) : Math.round(effectiveCompliance_mL);
    const cDyn = (this.cyclePeakPressure - setPeep) > 0 ? Math.round(computedVte / (this.cyclePeakPressure - setPeep)) : Math.round(effectiveCompliance_mL);

    // Rapid Shallow Breathing Index (RSBI = Tobin Index = f / Vt(L))
    const rsbi = computedVte > 0 ? Math.round(measuredRR / (computedVte / 1000)) : 50;

    // Mechanical Power (J/min) = 0.098 * RR * Vt * (PIP - ΔP / 2)
    const mechanicalPower = Math.round(
      0.098 * measuredRR * (computedVte / 1000) * (this.cyclePeakPressure - (drivingPressure / 2)) * 10
    ) / 10;

    const vtPerKgIBW = Math.round((computedVte / patient.idealBodyWeightKg) * 10) / 10;

    // 9. Arterial Blood Gas & Acid-Base Kinetics (Gasometria Arterial)
    const deadSpaceVol = computedVte * patient.deadSpaceFraction;
    const alveolarVentilation = Math.max(0.4, ((computedVte - deadSpaceVol) * measuredRR) / 1000); // L/min
    
    // PaCO2 calculation based on metabolic VCO2 and alveolar ventilation
    const basePaCO2 = (patient.metabolicRateVCO2 / alveolarVentilation) * 0.863;
    const paCO2 = Math.min(115, Math.max(16, Math.round(basePaCO2)));

    // Alveolar PO2: PAO2 = FiO2*(PB - 47) - PaCO2/0.8
    const effectiveFiO2 = maneuvers.o2SuctionActive ? 1.0 : settings.fio2 / 100;
    const pAlveolarO2 = effectiveFiO2 * (760 - 47) - (paCO2 / 0.8);
    
    // Shunt effect and PEEP recruitment effect on oxygenation
    const peepRecruitmentBonus = Math.min(1.0, setPeep / 14);
    let effectiveShuntFraction = (patient.shuntFraction / 100) * (1.25 - 0.55 * peepRecruitmentBonus);
    if (patient.pathology === 'pneumotorax') {
      effectiveShuntFraction = 0.45; // Fixed high shunt in tension pneumothorax
    }
    effectiveShuntFraction = Math.max(0.03, effectiveShuntFraction);
    
    // Calculate P/F ratio based on shunt (normal 5% -> P/F ~450, ARDS 38% -> P/F ~90)
    let currentPfRatio = 520 - (effectiveShuntFraction * 100) * 13;
    currentPfRatio = Math.max(35, Math.min(520, currentPfRatio));
    
    let calcPaO2 = currentPfRatio * effectiveFiO2;
    calcPaO2 = Math.min(pAlveolarO2 - 4, calcPaO2); // Cannot exceed Alveolar PO2
    const paO2 = Math.max(25, Math.round(calcPaO2));

    // Bicarbonate: use chronic compensation if patient is COPD retainer (or specified in patient profile)
    const baseBicarb = patient.baselineBicarbonate || (patient.pathology === 'dpoc' ? 32 : 24);
    
    // Henderson-Hasselbalch equation: pH = 6.1 + log10(HCO3 / (0.0307 * PaCO2))
    const ph = Math.round((6.10 + Math.log10(baseBicarb / (0.0307 * paCO2))) * 100) / 100;
    const baseExcess = Math.round((baseBicarb - 24.8 + 16.2 * (ph - 7.40)) * 10) / 10;

    // SpO2 calculation (Severinghaus equation with Bohr effect)
    const p50 = 26.6 * Math.pow(10, -(ph - 7.40) * 0.4);
    const v = paO2 / p50;
    const spo2 = Math.min(100, Math.max(35, Math.round((Math.pow(v, 2.7) / (Math.pow(v, 2.7) + 1)) * 100)));

    const pfRatio = Math.round(paO2 / effectiveFiO2);
    const aaGradient = Math.max(4, Math.round(pAlveolarO2 - paO2));
    const etco2 = Math.round(paCO2 * (1 - patient.deadSpaceFraction * 0.42));

    // IE Ratio String
    const ieMultiplier = expTime / Math.max(inspTime, 0.1);
    const ieRatioString = `1:${ieMultiplier.toFixed(1)}`;

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

    // Smooth ABG transitions (gradual wash-in/wash-out over ~12 seconds)
    const tauABG = 12.0;
    const alphaABG = 1 - Math.exp(-dt / tauABG);
    this.currentPaCO2 += (paCO2 - this.currentPaCO2) * alphaABG;
    this.currentPaO2 += (paO2 - this.currentPaO2) * alphaABG;
    this.currentSpO2 += (spo2 - this.currentSpO2) * alphaABG;
    
    // Dynamic pH responds to current smoothed PaCO2
    const currentSmoothedPh = Math.round((6.10 + Math.log10(baseBicarb / (0.0307 * this.currentPaCO2))) * 100) / 100;
    this.currentpH = currentSmoothedPh;

    // Dynamic Clinical State Feedback
    let patientInteractionMessage = 'Paciente confortável e acoplado ao ventilador.';
    if (this.currentSpO2 < 85) {
      patientInteractionMessage = '🚨 Hipoxemia Grave: Paciente cianótico, má perfusão periférica, risco de parada por hipóxia.';
    } else if (this.currentSpO2 < 90) {
      patientInteractionMessage = '⚠️ Hipoxemia Leve/Moderada: Oxigenação limítrofe, titular PEEP/FiO₂.';
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
    } else if (patient.spontaneousDrive && rsbi > 105) {
      patientInteractionMessage = '🚨 Fome de Ar / Fadiga Diafragmática: Respiração rápida e superficial (Índice de Tobin > 105).';
    } else if (settings.fio2 > 75 && this.currentSpO2 >= 97) {
      patientInteractionMessage = '⚠️ Hiperóxia: FiO₂ desnecessariamente alta. Inicie o desmame de oxigênio.';
    } else {
      if (patient.spontaneousDrive) {
        patientInteractionMessage = '✅ Paciente com drive respiratório ativo, interagindo de forma sincronizada com o suporte ventilatório.';
      } else {
        patientInteractionMessage = '✅ Ventilação protetora controlada, complacência e trocas gasosas estáveis.';
      }
    }

    const smoothedBaseExcess = Math.round((baseBicarb - 24.8 + 16.2 * (this.currentpH - 7.40)) * 10) / 10;
    const smoothedPfRatio = Math.round(this.currentPaO2 / effectiveFiO2);
    const smoothedEtCO2 = Math.round(this.currentPaCO2 * (1 - patient.deadSpaceFraction * 0.42));
    
    const monitored: MonitoredData = {
      peakPressure: Math.round(this.displayedPeak * 10) / 10,
      plateauPressure: Math.round(this.displayedPlat * 10) / 10,
      isPlateauMeasured: this.plateauMeasuredThisCycle,
      patientInteractionMessage,
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
      ieRatioString,
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
