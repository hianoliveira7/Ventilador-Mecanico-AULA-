import { PatientParameters, VentilatorSettings, MonitoredData } from './ventilation';

export type ICURhythmType =
  | 'sinus'
  | 'sinus_tachycardia'
  | 'sinus_bradycardia'
  | 'atrial_fibrillation'
  | 'ventricular_tachycardia'
  | 'ventricular_fibrillation'
  | 'asystole';

export interface ICUInfusionPumpsState {
  // Sedoanalgesia
  fentanylMcgPerHour: number; // 0 - 250 mcg/h
  propofolMcgKgMin: number; // 0 - 80 mcg/kg/min
  midazolamMgPerHour: number; // 0 - 20 mg/h
  precedexMcgKgHour: number; // 0 - 1.5 mcg/kg/h
  cisatracuriumMgPerHour: number; // 0 - 25 mg/h (Bloqueador Neuromuscular)

  // Vasoactive & Inotropic Drugs
  norepinephrineMcgKgMin: number; // 0 - 2.0 mcg/kg/min (Noradrenalina)
  vasopressinUiMin: number; // 0 - 0.04 UI/min (Vasopressina)
  dobutamineMcgKgMin: number; // 0 - 20 mcg/kg/min (Dobutamina)
  crystalloidRateMlPerHour: number; // 0 - 500 mL/h (Volume / Hidratação)
}

export interface ICUHemodynamicsState {
  heartRate: number; // bpm
  cardiacRhythm: ICURhythmType;
  systolicBP: number; // mmHg
  diastolicBP: number; // mmHg
  meanArterialPressure: number; // mmHg (PAM = (PAS + 2*PAD)/3)
  pulsePressure: number; // mmHg (PAS - PAD)
  centralVenousPressure: number; // mmHg (PVC, normal 6-10)
  cardiacOutput: number; // L/min (normal 4.5 - 6.5)
  cardiacIndex: number; // L/min/m2
  strokeVolume: number; // mL/batimento
  spo2: number; // %
  etco2: number; // mmHg
  temperatureC: number; // °C
}

export interface ICUBloodGasState {
  ph: number;
  paco2: number; // mmHg
  pao2: number; // mmHg
  hco3: number; // mEq/L
  baseExcess: number; // mEq/L
  sao2: number; // %
  pao2Fio2Ratio: number; // PaO2 / (FiO2/100)
  lactate: number; // mmol/L
  potassium: number; // mEq/L
  sodium: number; // mEq/L
  hemoglobin: number; // g/dL
}

export interface ICUNeurologicalState {
  rassScore: number; // -5 (comatoso/paralisado) a +4 (combativo)
  rassDescription: string;
  isParalyzed: boolean; // under neuromuscular blockade
  patientDriveActive: boolean; // whether spontaneous effort is triggered
  coughingActive: boolean;
  tubeBitingActive: boolean;
  agitationAlert?: string | null;
}

export interface ICUBedsideChart {
  admissionDiagnosis: string;
  icuDay: number;
  intubationDay: number;
  fluidBalance24h: {
    intakeMl: number;
    outputMl: number;
    cumulativeNetMl: number;
  };
  chestXRaySummary: string;
  chestXRayImagePrompt?: string;
  nursingNotes: string[];
}

export interface ICUSimulationState {
  infusionPumps: ICUInfusionPumpsState;
  hemodynamics: ICUHemodynamicsState;
  bloodGas: ICUBloodGasState;
  neurology: ICUNeurologicalState;
  chart: ICUBedsideChart;
  lastRecalculationTimestamp: number;
}
