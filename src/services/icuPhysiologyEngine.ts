import {
  ICUInfusionPumpsState,
  ICUHemodynamicsState,
  ICUBloodGasState,
  ICUNeurologicalState,
  ICUBedsideChart,
  ICUSimulationState,
  ICURhythmType,
} from '../types/icu';
import { PatientParameters, VentilatorSettings, MonitoredData } from '../types/ventilation';

export const DEFAULT_ICU_PUMPS: ICUInfusionPumpsState = {
  fentanylMcgPerHour: 100, // 100 mcg/h analgesia
  propofolMcgKgMin: 25, // 25 mcg/kg/min sedação
  midazolamMgPerHour: 0,
  precedexMcgKgHour: 0,
  cisatracuriumMgPerHour: 0, // sem bloqueio neuromuscular no início
  norepinephrineMcgKgMin: 0.08, // 0.08 mcg/kg/min DVA de manutenção
  vasopressinUiMin: 0,
  dobutamineMcgKgMin: 0,
  crystalloidRateMlPerHour: 60, // 60 mL/h hidratação
};

export const DEFAULT_ICU_CHART: ICUBedsideChart = {
  admissionDiagnosis: 'Insuficiência Respiratória Aguda Hipoxêmica (SARA Moderada)',
  icuDay: 2,
  intubationDay: 1,
  fluidBalance24h: {
    intakeMl: 2150,
    outputMl: 1720,
    cumulativeNetMl: +430,
  },
  chestXRaySummary: 'Infiltrado alveolar bilateral difuso em vidro fosco, com predomínio em bases e terços médios. Tubo orotraqueal posicionado 3.5 cm acima da carina.',
  nursingNotes: [
    '07:00 - Paciente intubado sob sedoanalgesia contínua em BIC. Linha arterial radial esquerda pérvia e com bom pulso.',
    '09:30 - Realizada higiene brônquica e aspiração em circuito fechado. Secreção mucoide moderada.',
    '11:00 - Ajuste de noradrenalina para manter PAM > 65 mmHg após titulação ventilatória.',
  ],
};

export class ICUPhysiologyEngine {
  /**
   * Recalculates full ICU patient state based on ventilator settings, active mechanics, and infusion pumps.
   */
  public static calculateState(
    patient: PatientParameters,
    settings: VentilatorSettings,
    monitored: MonitoredData,
    pumps: ICUInfusionPumpsState,
    prevChart: ICUBedsideChart = DEFAULT_ICU_CHART
  ): ICUSimulationState {
    const weight = patient.actualWeightKg || 70;
    const ibw = patient.idealBodyWeightKg || 68;

    // 1. NEUROLOGY & SEDATION DEPTH (RASS)
    const neurology = this.computeNeurology(pumps, weight);

    // 2. HEMODYNAMICS & CARDIOPULMONARY COUPLING
    const hemodynamics = this.computeHemodynamics(patient, settings, monitored, pumps, neurology);

    // 3. DYNAMIC ARTERIAL BLOOD GAS (ABG)
    const bloodGas = this.computeBloodGas(patient, settings, monitored, hemodynamics);

    // 4. BEDSIDE CHART UPDATE
    const chart = this.updateChart(prevChart, patient, monitored, bloodGas);

    return {
      infusionPumps: pumps,
      hemodynamics,
      bloodGas,
      neurology,
      chart,
      lastRecalculationTimestamp: Date.now(),
    };
  }

  /**
   * Computes RASS score and motor agitation / fighting based on sedatives and paralytics
   */
  private static computeNeurology(
    pumps: ICUInfusionPumpsState,
    weightKg: number
  ): ICUNeurologicalState {
    // Neuromuscular blockade (Cisatracúrio)
    const isParalyzed = pumps.cisatracuriumMgPerHour >= 3.0;
    if (isParalyzed) {
      return {
        rassScore: -5,
        rassDescription: 'RASS -5: Coma / Paralisado Quimicamente (Bloqueio Neuromuscular)',
        isParalyzed: true,
        patientDriveActive: false,
        coughingActive: false,
        tubeBitingActive: false,
        agitationAlert: null,
      };
    }

    // Cumulative sedative index (Propofol + Midazolam + Precedex + Fentanyl)
    // Fentanyl: 100 mcg/h ~ 2 pts
    // Propofol: 20 mcg/kg/min ~ 2.5 pts, 50 mcg/kg/min ~ 4.5 pts
    // Midazolam: 5 mg/h ~ 3 pts
    const fentanylPoints = Math.min(3, pumps.fentanylMcgPerHour / 45);
    const propofolPoints = Math.min(5, pumps.propofolMcgKgMin / 12);
    const midazolamPoints = Math.min(4, pumps.midazolamMgPerHour / 3);
    const precedexPoints = Math.min(2.5, pumps.precedexMcgKgHour / 0.5);

    const sedationDepthIndex = fentanylPoints + propofolPoints + midazolamPoints + precedexPoints;

    let rassScore: number;
    let rassDescription: string;
    let patientDriveActive = false;
    let coughingActive = false;
    let tubeBitingActive = false;
    let agitationAlert: string | null = null;

    if (sedationDepthIndex >= 6.5) {
      rassScore = -4;
      rassDescription = 'RASS -4: Sedação Profunda (Sem resposta a comandos, abre olhos brevemente ao estímulo físico)';
      patientDriveActive = false;
    } else if (sedationDepthIndex >= 4.0) {
      rassScore = -3;
      rassDescription = 'RASS -3: Sedação Moderada (Abre os olhos ao chamado verbal, sem contato visual sustentado)';
      patientDriveActive = false;
    } else if (sedationDepthIndex >= 2.2) {
      rassScore = -2;
      rassDescription = 'RASS -2: Sedação Leve (Desperta e mantém contato visual < 10 segundos)';
      patientDriveActive = true;
    } else if (sedationDepthIndex >= 1.0) {
      rassScore = -1;
      rassDescription = 'RASS -1: Sonolento (Desperta prontamente e sustenta contato visual > 10 segundos)';
      patientDriveActive = true;
    } else if (sedationDepthIndex >= 0.3) {
      rassScore = 0;
      rassDescription = 'RASS 0: Alerta e Calmo (Acordado, interagindo normalmente)';
      patientDriveActive = true;
    } else {
      // Under-sedated patient with ETT in place -> agitation & fighting ventilator
      rassScore = +2;
      rassDescription = 'RASS +2: Agitado (Movimentos descoordenados, assincronia com o ventilador, tosse)';
      patientDriveActive = true;
      coughingActive = true;
      tubeBitingActive = true;
      agitationAlert = '⚠️ Paciente com sedação insuficiente! Agitação motora gerando picos pressóricos e assincronia.';
    }

    return {
      rassScore,
      rassDescription,
      isParalyzed,
      patientDriveActive,
      coughingActive,
      tubeBitingActive,
      agitationAlert,
    };
  }

  /**
   * Cardiopulmonary interaction:
   * Positive pressure ventilation & high PEEP compress thoracic vena cava -> decreases venous return & stroke volume.
   * Vasoactive drugs (Noradrenaline) raise SVR and restore MAP.
   */
  private static computeHemodynamics(
    patient: PatientParameters,
    settings: VentilatorSettings,
    monitored: MonitoredData,
    pumps: ICUInfusionPumpsState,
    neuro: ICUNeurologicalState
  ): ICUHemodynamicsState {
    const baselineHR = patient.baselineHeartRate || 76;
    const baselineMAP = patient.baselineSystolicBP
      ? (patient.baselineSystolicBP + 2 * (patient.baselineDiastolicBP || 80)) / 3
      : 85;

    // PEEP and Mean Airway Pressure impact on Venous Return
    // Every cmH2O of Pmean above 10 reduces MAP by ~1.2 mmHg (or ~2.5 mmHg if hypovolemic)
    const pMean = monitored.meanPressure || settings.peep + 4;
    const excessThoracicPressure = Math.max(0, pMean - 9);
    const hypovolemiaMultiplier = patient.volumeStatus === 'hypovolemic' ? 2.3 : 1.1;
    const peepHemodynamicDrop = excessThoracicPressure * hypovolemiaMultiplier;

    // Vasoactive support impact:
    // Norepinephrine: 0.1 mcg/kg/min raises MAP by ~14 mmHg
    const noraBoost = pumps.norepinephrineMcgKgMin * 125;
    // Vasopressin: 0.02 UI/min raises MAP by ~8 mmHg
    const vasoBoost = pumps.vasopressinUiMin * 350;
    // Fluid infusion (crystalloid): blunts PEEP drop
    const volumeCompensation = Math.min(8, (pumps.crystalloidRateMlPerHour / 100) * 3);

    // Agitation impact: under-sedation causes adrenergic surge (tachycardia + hypertension)
    const agitationMAPBoost = neuro.rassScore > 0 ? neuro.rassScore * 7 : 0;
    const agitationHRBoost = neuro.rassScore > 0 ? neuro.rassScore * 14 : 0;

    // Final MAP
    let calculatedMAP = baselineMAP - peepHemodynamicDrop + noraBoost + vasoBoost + volumeCompensation + agitationMAPBoost;
    calculatedMAP = Math.max(35, Math.min(130, Math.round(calculatedMAP)));

    // Pulse Pressure & Systolic/Diastolic breakdown
    // Inotropy from Dobutamine widens pulse pressure
    const dobutamineFactor = pumps.dobutamineMcgKgMin * 1.5;
    const pulsePressure = Math.max(22, Math.min(65, Math.round(40 + dobutamineFactor - excessThoracicPressure * 0.5)));
    const systolicBP = Math.round(calculatedMAP + (2 / 3) * pulsePressure);
    const diastolicBP = Math.max(25, Math.round(calculatedMAP - (1 / 3) * pulsePressure));

    // Heart Rate
    // Hypovolemia and hypotension cause reflex tachycardia
    const hypotensionTachycardia = calculatedMAP < 65 ? (65 - calculatedMAP) * 1.2 : 0;
    const dobutamineHR = pumps.dobutamineMcgKgMin * 1.2;
    // Deep propofol/precedex has vagomimetic / bradycardic effect
    const sedativeBradycardia = pumps.precedexMcgKgHour * 12 + (pumps.propofolMcgKgMin > 45 ? 6 : 0);

    let heartRate = Math.round(baselineHR + agitationHRBoost + hypotensionTachycardia + dobutamineHR - sedativeBradycardia);
    heartRate = Math.max(40, Math.min(165, heartRate));

    // Cardiac Output & Cardiac Index
    const strokeVolume = Math.max(25, Math.min(95, Math.round(68 - excessThoracicPressure * 1.4 + (pumps.dobutamineMcgKgMin * 1.8))));
    const cardiacOutput = Number(((heartRate * strokeVolume) / 1000).toFixed(1));
    const bsa = 1.85; // approx standard BSA
    const cardiacIndex = Number((cardiacOutput / bsa).toFixed(2));

    // Central Venous Pressure (CVP / PVC): raised directly by PEEP transmission
    const baselineCvp = patient.volumeStatus === 'hypovolemic' ? 3 : 7;
    const transmittedPeepToCvp = Math.round(settings.peep * 0.4);
    const centralVenousPressure = baselineCvp + transmittedPeepToCvp;

    // Cardiac Rhythm Classification
    let cardiacRhythm: ICURhythmType = 'sinus';
    if (heartRate > 105) {
      cardiacRhythm = 'sinus_tachycardia';
    } else if (heartRate < 55) {
      cardiacRhythm = 'sinus_bradycardia';
    }

    // Temperature
    const temperatureC = patient.bodyTemperature || 37.0;

    // Pulse Oximetry estimate (SpO2)
    // SARA shunt with low PEEP causes severe desaturation
    const pO2Est = this.estimatePaO2(patient, settings);
    const spo2 = Math.max(55, Math.min(100, Math.round(this.calculateSaO2FromPaO2(pO2Est))));

    // End-Tidal CO2 (EtCO2): normally ~2-5 mmHg lower than PaCO2
    const paco2Est = this.estimatePaCO2(patient, settings, monitored);
    const etco2 = Math.max(15, Math.min(75, Math.round(paco2Est - 4)));

    return {
      heartRate,
      cardiacRhythm,
      systolicBP,
      diastolicBP,
      meanArterialPressure: calculatedMAP,
      pulsePressure,
      centralVenousPressure,
      cardiacOutput,
      cardiacIndex,
      strokeVolume,
      spo2,
      etco2,
      temperatureC,
    };
  }

  /**
   * Dynamic Arterial Blood Gas (ABG / Gasometria Arterial) calculation
   */
  private static computeBloodGas(
    patient: PatientParameters,
    settings: VentilatorSettings,
    monitored: MonitoredData,
    hemo: ICUHemodynamicsState
  ): ICUBloodGasState {
    const paco2 = this.estimatePaCO2(patient, settings, monitored);
    const pao2 = this.estimatePaO2(patient, settings);
    const hco3 = patient.baselineBicarbonate || 24;

    // Henderson-Hasselbalch equation for acute respiratory state:
    // pH = 6.1 + log10(HCO3 / (0.0307 * PaCO2))
    const phVal = 6.1 + Math.log10(hco3 / (0.0307 * Math.max(10, paco2)));
    const ph = Number(Math.max(6.85, Math.min(7.68, phVal)).toFixed(2));

    // Base Excess (BE)
    const baseExcess = Number((hco3 - 24 + 10 * (ph - 7.4)).toFixed(1));

    // PaO2 / FiO2 ratio
    const fio2Fraction = Math.max(0.21, settings.fio2 / 100);
    const pao2Fio2Ratio = Math.round(pao2 / fio2Fraction);

    // SaO2
    const sao2 = Number(this.calculateSaO2FromPaO2(pao2).toFixed(1));

    // Lactate: rises if MAP < 65 or Cardiac Index < 2.0 (Tissue hypoperfusion)
    let lactate = 1.1;
    if (hemo.meanArterialPressure < 65) {
      lactate += (65 - hemo.meanArterialPressure) * 0.12;
    }
    if (hemo.cardiacIndex < 2.2) {
      lactate += (2.2 - hemo.cardiacIndex) * 1.5;
    }
    lactate = Number(Math.min(14.0, lactate).toFixed(1));

    return {
      ph,
      paco2: Math.round(paco2),
      pao2: Math.round(pao2),
      hco3: Number(hco3.toFixed(1)),
      baseExcess,
      sao2,
      pao2Fio2Ratio,
      lactate,
      potassium: 4.2,
      sodium: 140,
      hemoglobin: patient.hemoglobin || 12.5,
    };
  }

  /**
   * PaCO2 estimate based on Minute Ventilation vs Dead Space
   */
  private static estimatePaCO2(
    patient: PatientParameters,
    settings: VentilatorSettings,
    monitored: MonitoredData
  ): number {
    const effectiveVt = monitored.vte > 50 ? monitored.vte : settings.tidalVolume || 450;
    const effectiveRR = monitored.totalRate > 2 ? monitored.totalRate : settings.respiratoryRate || 15;

    // Minute ventilation (L/min)
    const veTotal = (effectiveVt * effectiveRR) / 1000;

    // Alveolar ventilation factoring dead space fraction (Vd/Vt)
    const deadSpaceFraction = patient.deadSpaceFraction || 0.35;
    const veAlveolar = veTotal * (1 - deadSpaceFraction);

    // PaCO2 is inversely proportional to alveolar ventilation:
    // Standard VCO2 ~200 mL/min requires ~4.2 L/min alveolar ventilation to achieve PaCO2 40 mmHg
    const baselineAlveolarTarget = 4.2;
    const computedPaCO2 = (baselineAlveolarTarget / Math.max(0.9, veAlveolar)) * 40;

    return Math.max(18, Math.min(95, computedPaCO2));
  }

  /**
   * PaO2 estimate based on FiO2, PEEP alveolar recruitment, and shunt
   */
  private static estimatePaO2(
    patient: PatientParameters,
    settings: VentilatorSettings
  ): number {
    const fio2Dec = Math.max(0.21, settings.fio2 / 100);
    // Ideal Alveolar PO2: PAO2 = FiO2*(Patm - 47) - PaCO2/0.8
    const pao2Alveolar = fio2Dec * (760 - 47) - 40 / 0.8;

    // Shunt fraction (Qs/Qt)
    let baseShunt = patient.shuntFraction ? patient.shuntFraction / 100 : 0.15;
    if (patient.pathology === 'sdra') {
      baseShunt = 0.38; // 38% shunt in untreated ARDS
    }

    // PEEP recruitment effect: reduces shunt
    // PEEP 5 has full shunt, PEEP 14 reduces shunt significantly in ARDS
    const peepRecruitmentBonus = Math.max(0, (settings.peep - 5) * 0.018);
    const effectiveShunt = Math.max(0.04, baseShunt - peepRecruitmentBonus);

    // PaO2 approximation
    const pao2 = pao2Alveolar * (1 - effectiveShunt * 1.8);
    return Math.max(38, Math.min(480, pao2));
  }

  /**
   * Severinghaus formula for Oxyhemoglobin dissociation curve
   */
  private static calculateSaO2FromPaO2(pao2: number): number {
    if (pao2 <= 0) return 0;
    const s = 100 / (1 + 23400 * Math.pow(Math.pow(pao2, 3) + 150 * pao2, -1));
    return Math.max(30, Math.min(100, s));
  }

  private static updateChart(
    prevChart: ICUBedsideChart,
    patient: PatientParameters,
    monitored: MonitoredData,
    bloodGas: ICUBloodGasState
  ): ICUBedsideChart {
    return {
      ...prevChart,
      admissionDiagnosis: patient.pathology === 'sdra'
        ? 'SARA / Síndrome do Desconforto Respiratório Agudo'
        : patient.pathology === 'dpoc'
        ? 'Exacerbação Grave de Doença Pulmonar Obstrutiva Crônica (DPOC)'
        : prevChart.admissionDiagnosis,
    };
  }
}
