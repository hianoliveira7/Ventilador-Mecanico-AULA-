import {
  VentilatorSettings,
  PatientParameters,
  ManeuverState,
} from '../types/ventilation';

export interface MechanicsWorkerInput {
  type: 'COMPUTE_MECHANICS';
  id?: number;
  dt: number;
  settings: VentilatorSettings;
  patient: PatientParameters;
  maneuvers: ManeuverState;
  state: {
    dynamicEffectiveCompliance: number;
    dynamicEffectiveResistance: number;
    dynamicAutoPeep: number;
    dynamicEffectivePeep: number;
    currentPaCO2: number;
    currentPaO2: number;
    currentSpO2: number;
    cycleVti: number;
    measuredRR: number;
    cyclePeakPressure: number;
    expTime: number;
    totalSimulationTime: number;
  };
}

export interface MechanicsWorkerOutput {
  type: 'MECHANICS_COMPUTED';
  id?: number;
  dynamicEffectiveCompliance: number;
  dynamicEffectiveResistance: number;
  dynamicAutoPeep: number;
  dynamicEffectivePeep: number;
  targetCompliance: number;
  targetResistance: number;
  targetAutoPeep: number;
  timeConstant: number;
  timeConstantFast: number;
  timeConstantSlow: number;
  targetPaCO2: number;
  targetPaO2: number;
  currentPaCO2: number;
  currentPaO2: number;
  currentpH: number;
  currentSpO2: number;
  baseBicarb: number;
  baseExcess: number;
  pfRatio: number;
  pAlveolarO2: number;
  etco2: number;
  isEquilibrating: boolean;
  equilibrationProgressPercent: number;
  mechanicsEquilibrationProgress: number;
  physiologicalTransitionMessage: string;
  detectedAsynchrony: 'none' | 'ineffective_effort' | 'double_trigger' | 'flow_starvation' | 'auto_trigger' | 'premature_cycling' | 'delayed_cycling';
  asynchronyDetail: string;
}

/**
 * Executes high-precision computational mechanics modeling in background worker thread
 */
export function computeRespiratoryMechanics(input: MechanicsWorkerInput): MechanicsWorkerOutput {
  const { dt, settings, patient, maneuvers, state } = input;

  // 1. Effective Set PEEP
  const setPeep = maneuvers.recruitmentManeuverActive ? Math.min(settings.peep + 15, 35) : settings.peep;

  // Smooth circuit PEEP transition
  const tauPeep = 1.2;
  const alphaPeep = 1 - Math.exp(-dt / tauPeep);
  const newEffectivePeep = state.dynamicEffectivePeep + (setPeep - state.dynamicEffectivePeep) * alphaPeep;

  // 2. Alveolar Mechanics Modeling: Recruitment, Derecruitment & Overdistension
  let calcTargetCompliance = Math.max(patient.compliance, 5);
  let calcTargetResistance = Math.max(patient.resistance, 1.5);

  // Nonlinear Rohrer resistance for artificial airway & bronchospasm
  // Raw = K1 + K2 * Flow + Secretion obstruction
  if (patient.secretionsSeverity === 'mild') {
    calcTargetResistance += 2.0;
  } else if (patient.secretionsSeverity === 'severe') {
    calcTargetResistance += 5.5;
  }

  // Alveolar recruitment bonus in restrictive/edematous pathologies (SDRA, EAP, Pós-Op, Obeso)
  if (
    patient.recruitmentPotential === 'high' ||
    patient.pathology === 'sdra' ||
    patient.pathology === 'edema' ||
    patient.compliance < 35
  ) {
    if (setPeep >= 8 && setPeep <= 18) {
      // Optimal PEEP zone: open lung concept recruits collapsed alveoli
      const recruitmentGain = Math.min(0.35, (setPeep - 5) * 0.035);
      calcTargetCompliance *= (1 + recruitmentGain);
    } else if (setPeep > 18) {
      // Overdistension zone: lung is stretched onto the upper flat portion of compliance curve
      const overdistensionPenalty = Math.min(0.4, (setPeep - 18) * 0.04);
      calcTargetCompliance *= (1 - overdistensionPenalty);
    }
  }

  // 3. Multi-breath Viscoelastic Relaxation & Mechanics Latency
  // Fast, responsive adaptation so user modifications are immediately visible, with smooth 0.25s interpolation
  const tauCompliance = 0.25;
  const alphaCompliance = 1 - Math.exp(-dt / tauCompliance);
  const newCompliance = state.dynamicEffectiveCompliance + (calcTargetCompliance - state.dynamicEffectiveCompliance) * alphaCompliance;

  const tauResistance = 0.25;
  const alphaResistance = 1 - Math.exp(-dt / tauResistance);
  const newResistance = state.dynamicEffectiveResistance + (calcTargetResistance - state.dynamicEffectiveResistance) * alphaResistance;

  const C_L = newCompliance / 1000; // in L/cmH2O
  const Raw = newResistance; // in cmH2O / (L/s)
  
  // Time constants: Total, Fast (conductive airways), and Slow (peripheral alveoli)
  const timeConstant = Raw * C_L;
  const timeConstantFast = Math.round(timeConstant * 0.65 * 100) / 100;
  const timeConstantSlow = Math.round(timeConstant * 1.35 * 100) / 100;

  // 4. Auto-PEEP Kinetics (Multi-breath trapped volume accumulation)
  const effectiveTe = Math.max(0.1, state.expTime);
  const trappedVolume_mL = state.cycleVti * Math.exp(-effectiveTe / Math.max(0.05, timeConstant));
  const targetAutoPeep = Math.max(0, Math.round(((trappedVolume_mL / 1000) / Math.max(0.005, C_L)) * 10) / 10);

  const tauAutoPeep = 8.0;
  const alphaAutoPeep = 1 - Math.exp(-dt / tauAutoPeep);
  const newAutoPeep = state.dynamicAutoPeep + (targetAutoPeep - state.dynamicAutoPeep) * alphaAutoPeep;

  // 5. Gas Exchange Kinetics (Arterial Blood Gas Equilibrium)
  const computedVte = Math.max(40, Math.round(state.cycleVti * (1 - (patient.circuitLeakPercent || 0) / 100)));
  const deadSpaceVol = computedVte * patient.deadSpaceFraction;
  const alveolarVentilation = Math.max(0.4, ((computedVte - deadSpaceVol) * state.measuredRR) / 1000);

  const basePaCO2 = (patient.metabolicRateVCO2 / alveolarVentilation) * 0.863;
  const targetPaCO2 = Math.min(110, Math.max(18, Math.round(basePaCO2)));

  const effectiveFiO2 = maneuvers.o2SuctionActive ? 1.0 : settings.fio2 / 100;
  const pAlveolarO2 = effectiveFiO2 * (760 - 47) - (targetPaCO2 / 0.8);
  const peepRecruitmentBonus = Math.min(1.0, newEffectivePeep / 14);
  let effectiveShuntFraction = (patient.shuntFraction / 100) * (1.25 - 0.55 * peepRecruitmentBonus);
  if (patient.pathology === 'pneumotorax') {
    effectiveShuntFraction = 0.45;
  }
  effectiveShuntFraction = Math.max(0.03, effectiveShuntFraction);

  let currentPfRatio = 520 - (effectiveShuntFraction * 100) * 13;
  currentPfRatio = Math.max(35, Math.min(520, currentPfRatio));
  let calcPaO2 = currentPfRatio * effectiveFiO2;
  calcPaO2 = Math.min(pAlveolarO2 - 4, calcPaO2);
  const targetPaO2 = Math.max(5, Math.round(calcPaO2));

  // Physiological Washout Time Constant (tauABG ~ 22s)
  const tauABG = 22.0;
  const alphaABG = 1 - Math.exp(-dt / tauABG);
  const newPaCO2 = state.currentPaCO2 + (targetPaCO2 - state.currentPaCO2) * alphaABG;
  const newPaO2 = state.currentPaO2 + (targetPaO2 - state.currentPaO2) * alphaABG;

  const baseBicarb = patient.baselineBicarbonate || (patient.pathology === 'dpoc' ? 32 : 24);
  const newpH = Math.round((6.10 + Math.log10(baseBicarb / (0.0307 * newPaCO2))) * 100) / 100;

  // Severinghaus oxygen-hemoglobin dissociation
  const p50 = 26.6 * Math.pow(10, -(newpH - 7.40) * 0.4);
  const v = newPaO2 / p50;
  const targetSpO2 = Math.min(100, Math.max(0, Math.round((Math.pow(v, 2.7) / (Math.pow(v, 2.7) + 1)) * 100)));
  const newSpO2 = state.currentSpO2 + (targetSpO2 - state.currentSpO2) * alphaABG;

  // 6. Transition & Equilibration Metrics
  const co2Gap = Math.abs(targetPaCO2 - newPaCO2);
  const complianceGapRatio = Math.abs(calcTargetCompliance - newCompliance) / Math.max(1, calcTargetCompliance);
  const autoPeepGap = Math.abs(targetAutoPeep - newAutoPeep);

  const isMechanicsTransitioning = complianceGapRatio > 0.05 || autoPeepGap > 0.4;
  const isGasTransitioning = co2Gap > 1.5;
  const isEquilibrating = isMechanicsTransitioning || isGasTransitioning;

  const gasProgress = Math.min(100, Math.max(0, Math.round(100 - (co2Gap / Math.max(4, Math.abs(targetPaCO2 - 40))) * 100)));
  const mechanicsProgress = Math.min(100, Math.max(0, Math.round((1 - Math.max(complianceGapRatio, autoPeepGap / 4)) * 100)));
  const totalProgress = Math.round((gasProgress + mechanicsProgress) / 2);

  let physiologicalTransitionMessage = '';
  if (complianceGapRatio > 0.05) {
    physiologicalTransitionMessage = setPeep > 10
      ? 'Recrutando alvéolos e redistribuindo surfactante via PEEP...'
      : 'Acomodação viscoelástica e desrecrutamento progressivo alveolar...';
  } else if (autoPeepGap > 0.4) {
    physiologicalTransitionMessage = targetAutoPeep > newAutoPeep
      ? 'Acúmulo progressivo de Auto-PEEP por tempo expiratório curto...'
      : 'Lavagem progressiva de aprisionamento aéreo expiratório...';
  } else if (isGasTransitioning) {
    physiologicalTransitionMessage = 'Equilíbrio cinético de PaCO₂/PaO₂ e acomodação do drive bulbar...';
  }

  // 7. Dynamic Asynchrony Check (Mode-specific & physiologically grounded)
  let detectedAsynchrony: MechanicsWorkerOutput['detectedAsynchrony'] = 'none';
  let asynchronyDetail = 'Ventilação sincronizada sem assincronias ativas.';

  const isPsvMode = settings.mode === 'PSV' || settings.mode === 'CPAP';
  const isObstructivePathology = patient.pathology === 'dpoc' || patient.pathology === 'asma' || patient.resistance >= 16;
  const isNormalLung = patient.pathology === 'normal' || (patient.compliance >= 50 && patient.resistance <= 8);

  // In PSV mode: cycling is governed by Expiratory Sensitivity (Esens % of peak flow)
  if (isPsvMode && patient.spontaneousDrive) {
    if (settings.expiratorySensitivity >= 45) {
      detectedAsynchrony = 'premature_cycling';
      asynchronyDetail = `Ciclagem Prematura: Critério Esens elevado (${settings.expiratorySensitivity}%) interrompe o fluxo antes do término do tempo neural.`;
    } else if (settings.expiratorySensitivity <= 10 && isObstructivePathology && timeConstant > 0.45) {
      detectedAsynchrony = 'delayed_cycling';
      asynchronyDetail = `Ciclagem Tardia: Esens de ${settings.expiratorySensitivity}% em paciente obstrutivo com tau prolongado (${timeConstant.toFixed(2)}s) atrasa a abertura expiratória.`;
    }
  } else if ((settings.mode === 'VCV' || settings.mode === 'PCV') && patient.spontaneousDrive) {
    // In VCV or PCV, cycling is controlled by time/volume, NOT by Esens.
    // In normal lung, a standard inspiratory time (0.8 - 1.4s) is physiological and harmonious.
    // Delayed cycling in controlled modes ONLY occurs if set mechanical Ti is grossly prolonged
    // (e.g. Ti > 1.65s in obstructive, or extreme inverted I:E > 2.0s in non-obstructive)
    // AND Ti must drastically exceed neural Ti.
    const spontDuty = patient.spontaneousDutyCycle || 0.33;
    const cycleDuration = 60 / Math.max(patient.spontaneousRate, 5);
    const neuralTi = cycleDuration * spontDuty;

    let totalMechTi = settings.inspiratoryTimePCV || 1.0;
    if (settings.mode === 'VCV') {
      const flowRate = settings.inspiratoryFlow || 60;
      const vt = settings.tidalVolume || 450;
      const flowDeliveryTime = settings.flowWaveform === 'decelerating' ? (vt * 0.06) / (0.65 * flowRate) : (vt * 0.06) / flowRate;
      const pausePercent = settings.inspiratoryPausePercent || 0;
      const pauseDuration = pausePercent > 0 ? Math.min(0.5, (pausePercent / 100) * (60 / Math.max(settings.respiratoryRate || 15, 6))) : 0;
      totalMechTi = flowDeliveryTime + pauseDuration;
    }

    const minDelayedTiThreshold = isNormalLung ? 2.0 : (isObstructivePathology ? 1.65 : 1.85);

    if (totalMechTi >= minDelayedTiThreshold && totalMechTi > neuralTi * 1.85) {
      detectedAsynchrony = 'delayed_cycling';
      asynchronyDetail = `Ciclagem Tardia: Tempo inspiratório programado (${totalMechTi.toFixed(2)}s) excede excessivamente o tempo neural (${neuralTi.toFixed(2)}s), gerando esforço expiratório ativo prematuro.`;
    }
  }

  const smoothedBaseExcess = Math.round((baseBicarb - 24.8 + 16.2 * (newpH - 7.40)) * 10) / 10;
  const smoothedPfRatio = Math.round(newPaO2 / effectiveFiO2);
  const smoothedEtCO2 = Math.round(newPaCO2 * (1 - patient.deadSpaceFraction * 0.42));

  return {
    type: 'MECHANICS_COMPUTED',
    id: input.id,
    dynamicEffectiveCompliance: newCompliance,
    dynamicEffectiveResistance: newResistance,
    dynamicAutoPeep: newAutoPeep,
    dynamicEffectivePeep: newEffectivePeep,
    targetCompliance: calcTargetCompliance,
    targetResistance: calcTargetResistance,
    targetAutoPeep,
    timeConstant: Math.round(timeConstant * 100) / 100,
    timeConstantFast,
    timeConstantSlow,
    targetPaCO2,
    targetPaO2,
    currentPaCO2: newPaCO2,
    currentPaO2: newPaO2,
    currentpH: newpH,
    currentSpO2: newSpO2,
    baseBicarb,
    baseExcess: smoothedBaseExcess,
    pfRatio: smoothedPfRatio,
    pAlveolarO2: Math.round(pAlveolarO2),
    etco2: smoothedEtCO2,
    isEquilibrating,
    equilibrationProgressPercent: totalProgress,
    mechanicsEquilibrationProgress: mechanicsProgress,
    physiologicalTransitionMessage,
    detectedAsynchrony,
    asynchronyDetail,
  };
}

// Attach listener if executed inside a Web Worker thread
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.addEventListener('message', (event: MessageEvent<MechanicsWorkerInput>) => {
    if (event.data && event.data.type === 'COMPUTE_MECHANICS') {
      const result = computeRespiratoryMechanics(event.data);
      self.postMessage(result);
    }
  });
}
