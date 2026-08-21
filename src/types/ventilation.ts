export type VentilationMode = 'VCV' | 'PCV' | 'PSV' | 'SIMV_VC' | 'SIMV_PC' | 'CPAP' | 'APRV';

export type FlowWaveform = 'square' | 'decelerating';

export type TriggerType = 'flow' | 'pressure';

export interface VentilatorSettings {
  mode: VentilationMode;
  // Common
  fio2: number; // % (21 - 100)
  peep: number; // cmH2O (0 - 30)
  triggerType: TriggerType;
  triggerSensitivity: number; // L/min (0.5 - 10) or cmH2O (-0.5 to -10)
  
  // VCV
  tidalVolume: number; // mL (100 - 1000)
  respiratoryRate: number; // rpm (4 - 50)
  flowWaveform: FlowWaveform;
  inspiratoryFlow: number; // L/min (20 - 120)
  inspiratoryPausePercent: number; // % of cycle or seconds (0 - 30% / 0 - 2.0s)
  inspiratoryTimeVCV?: number; // Calculated or set (s)
  
  // PCV
  inspiratoryPressure: number; // cmH2O (Pinsp above PEEP or absolute, 5 - 50)
  inspiratoryTimePCV: number; // s (0.3 - 3.5)
  pressureRiseTime: number; // s (0.05 - 0.5) (Ramp/Slope)
  
  // PSV
  pressureSupport: number; // cmH2O (0 - 40 above PEEP)
  expiratorySensitivity: number; // % of peak flow for cycling (Esens, 5% - 70%, default 25%)
  backupApneaTime: number; // s (10 - 60, default 20s)
  
  // APRV
  pHigh: number; // cmH2O (10 - 40)
  pLow: number; // cmH2O (0 - 15)
  tHigh: number; // s (1.0 - 10.0)
  tLow: number; // s (0.2 - 2.0)
  
  // SIMV
  simvRate: number; // rpm
  simvPs: number; // cmH2O PS for spontaneous breaths
}

export interface PatientParameters {
  name: string;
  age: number;
  gender: 'male' | 'female';
  heightCm: number;
  actualWeightKg: number;
  // Computed
  idealBodyWeightKg: number;
  
  // Respiratory Mechanics
  compliance: number; // mL/cmH2O (static compliance, normal: 50-70, ARDS: 15-30)
  resistance: number; // cmH2O / (L/s) (normal: 4-8, COPD: 15-35, severe bronchospasm: >25)
  inertance?: number;
  
  // Spontaneous breathing
  spontaneousDrive: boolean; // Is patient attempting spontaneous breaths?
  spontaneousRate: number; // rpm (10 - 45)
  spontaneousEffortPressure: number; // cmH2O negative inspiratory muscle pull Pmus (0 to -25)
  spontaneousDutyCycle: number; // Ti/Ttot for patient (0.3 - 0.45)
  
  // Gas Exchange & Metabolism
  metabolicRateVCO2: number; // mL/min (normal ~200)
  metabolicRateVO2: number; // mL/min (normal ~250)
  deadSpaceFraction: number; // Vd/Vt (normal 0.25 - 0.35, ARDS/COPD: 0.5 - 0.7)
  shuntFraction: number; // Qs/Qt % (normal 3-5%, ARDS: 20-50%, Pneumonia: 15-35%)
  hemoglobin: number; // g/dL (normal 12-15)
  bodyTemperature: number; // °C (normal 37)
  
  // Asynchrony triggers
  asynchronyType?: 'none' | 'ineffective_effort' | 'double_trigger' | 'flow_starvation' | 'auto_trigger';
  secretionsSeverity?: 'none' | 'mild' | 'severe'; // Causes sawtooth waveform in flow
  circuitLeakPercent?: number; // 0 - 50% leak
  endotrachealTubeSize?: number; // mm ID (6.5 - 9.0)
}

export interface MonitoredData {
  // Pressures (cmH2O)
  peakPressure: number; // PIP
  plateauPressure: number; // Pplat
  meanPressure: number; // Pmean
  peepTotal: number; // PEEPt (PEEP + AutoPEEP)
  autoPeep: number; // PEEPi / intrinsic PEEP
  drivingPressure: number; // ΔP = Pplat - PEEP
  
  // Volumes (mL)
  vte: number; // Exhaled Tidal Volume
  vti: number; // Inhaled Tidal Volume
  minuteVolume: number; // L/min (MV)
  spontaneousMinuteVolume: number; // L/min
  leakVolume: number; // mL
  
  // Rates & Times
  totalRate: number; // rpm (f_tot)
  spontaneousRate: number; // rpm (f_spont)
  mandatoryRate: number; // rpm (f_mand)
  inspiratoryTime: number; // s (Ti)
  expiratoryTime: number; // s (Te)
  ieRatioString: string; // e.g. "1:2.0"
  
  isPlateauMeasured: boolean;
  patientInteractionMessage: string; // Dynamic clinical status
  
  // Mechanics
  staticCompliance: number; // mL/cmH2O (Cstat)
  dynamicCompliance: number; // mL/cmH2O (Cdyn)
  airwayResistance: number; // cmH2O / (L/s) (Raw)
  timeConstant: number; // tau = R * C (s)
  rapidShallowBreathingIndex: number; // RSBI = f / (Vt in L) (Tobin)
  mechanicalPower: number; // J/min
  vtPerKgIBW: number; // mL/kg IBW
  
  // Gas Exchange
  pao2: number; // mmHg
  paco2: number; // mmHg
  ph: number;
  hco3: number; // mEq/L
  baseExcess: number; // mEq/L
  spo2: number; // %
  pfRatio: number; // PaO2 / FiO2 (Horovitz index)
  alveolarPaO2: number; // PAO2
  aaGradient: number; // (A-a) DO2
  etco2: number; // mmHg
}

export interface WaveformSample {
  time: number; // s
  pressure: number; // cmH2O
  flow: number; // L/min (positive = insp, negative = exp)
  volume: number; // mL (accumulated relative to FRC)
  phase: 'insp' | 'insp_pause' | 'exp' | 'exp_pause';
  isSpontaneous: boolean;
  isTriggered: boolean;
}

export interface LoopSample {
  pressure: number;
  flow: number;
  volume: number;
}

export type AlarmSeverity = 'high' | 'medium' | 'low';

export interface AlarmItem {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: AlarmSeverity;
  active: boolean;
  timestamp: number;
}

export interface AlarmLimits {
  pHighMax: number; // cmH2O (e.g. 40)
  pLowMin: number; // cmH2O (e.g. 8)
  mvHighMax: number; // L/min (e.g. 15)
  mvLowMin: number; // L/min (e.g. 3)
  vteHighMax: number; // mL (e.g. 800)
  vteLowMin: number; // mL (e.g. 200)
  rateHighMax: number; // rpm (e.g. 35)
  apneaTimeMax: number; // s (e.g. 20)
  peepiHighMax: number; // cmH2O (e.g. 5)
}

export interface ManeuverState {
  inspiratoryHoldActive: boolean;
  expiratoryHoldActive: boolean;
  recruitmentManeuverActive: boolean;
  recruitmentTimeRemaining: number;
  o2SuctionActive: boolean;
  o2SuctionTimeRemaining: number;
  nebulizerActive: boolean;
  nebulizerTimeRemaining: number;
  isFrozen: boolean;
}

export interface ClinicalCaseGoal {
  id: string;
  description: string;
  isMet: (monitored: MonitoredData, settings: VentilatorSettings, patient: PatientParameters) => boolean;
  targetFeedback: string;
}

export interface ClinicalCase {
  id: string;
  title: string;
  category:
    | 'Normal'
    | 'SDRA'
    | 'DPOC'
    | 'Obstrutiva'
    | 'Restritiva'
    | 'Emergência'
    | 'Desmame'
    | 'Assincronia'
    | 'Básico';
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  description: string;
  patientProfile: PatientParameters;
  initialSettings: VentilatorSettings;
  clinicalHistory: string;
  physicalExam: string;
  initialABG: {
    ph: number;
    paco2: number;
    pao2: number;
    hco3: number;
    spo2: number;
    fio2: number;
  };
  goals: ClinicalCaseGoal[];
  teachingPoints: string[];
}
