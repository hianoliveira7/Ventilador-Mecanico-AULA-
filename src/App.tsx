import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Play, User, Activity, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, GripVertical } from 'lucide-react';
import {
  VentilatorSettings,
  PatientParameters,
  MonitoredData,
  WaveformSample,
  AlarmLimits,
  AlarmItem,
  ManeuverState,
  ClinicalCase,
} from './types/ventilation';
import { physicsEngine, calculateIBW } from './services/physicsEngine';
import { audioEngine } from './services/audioEngine';
import { CLINICAL_CASES } from './data/clinicalCases';
import { TopBar } from './components/TopBar';
import { ParameterControls } from './components/ParameterControls';
import { WaveformDisplay } from './components/WaveformDisplay';
import { LoopsDisplay } from './components/LoopsDisplay';
import { MonitorPanel } from './components/MonitorPanel';
import { ManeuverBar } from './components/ManeuverBar';
import { ClinicalCaseModal } from './components/ClinicalCaseModal';
import { ClinicalCasesPage } from './components/ClinicalCasesPage';
import { EducationalModal } from './components/EducationalModal';
import { DraggableGasometryModal } from './components/DraggableGasometryModal';
import { DraggableMissionsModal } from './components/DraggableMissionsModal';
import { PatientConfigModal } from './components/PatientConfigModal';
import { AlarmManagerModal } from './components/AlarmManagerModal';
import { ClinicalCalculatorModal } from './components/ClinicalCalculatorModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { MenuModal } from './components/MenuModal';
import { QuizModal } from './components/QuizModal';
import { RoleSelectionPortal } from './components/RoleSelectionPortal';
import { AsynchronyDatabaseModal } from './components/AsynchronyDatabaseModal';
import { AsynchronyResolutionBanner } from './components/AsynchronyResolutionBanner';
import { AsynchronyPreset } from './data/asynchroniesData';
import { StudentTutorialModal } from './components/StudentTutorialModal';
import { TeacherAdminModal } from './components/TeacherAdminModal';
import { TeacherAuthModal } from './components/TeacherAuthModal';
import { InteractiveTour } from './components/InteractiveTour';
import { DebriefingModal } from './components/DebriefingModal';
import { FlashcardsModal } from './components/FlashcardsModal';
import { VentilatorAdmissionScreen } from './components/VentilatorAdmissionScreen';
import { CardiacArrestEmergencyModal } from './components/CardiacArrestEmergencyModal';
import { educationalStorage, UserRole } from './services/educationalStorage';
import {
  PedagogicalSettings,
  CaseDebriefingReport,
  CaseIntervention,
  FormulaOverlayType,
} from './types/ventilation';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const { isLight } = useTheme();

  // Pedagogical & Evaluation Settings
  const [pedagogicalSettings, setPedagogicalSettings] = useState<PedagogicalSettings>(() =>
    educationalStorage.getPedagogicalSettings()
  );
  const [activeFormulaOverlay, setActiveFormulaOverlay] = useState<FormulaOverlayType>('none');
  const [isDebriefingOpen, setIsDebriefingOpen] = useState<boolean>(false);
  const [currentDebriefingReport, setCurrentDebriefingReport] = useState<CaseDebriefingReport | null>(null);
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState<boolean>(false);

  // Peri-Arrest / Cardiac Arrest (PCR) Emergency State
  const [isCardiacArrestModalOpen, setIsCardiacArrestModalOpen] = useState<boolean>(false);
  const hasTriggeredPcrRef = useRef<boolean>(false);

  // Ventilator Standby / Pre-Ventilation State
  const [isVentilating, setIsVentilating] = useState<boolean>(false);
  const isVentilatingRef = useRef(isVentilating);
  useEffect(() => {
    isVentilatingRef.current = isVentilating;
  }, [isVentilating]);

  // Case tracking for After Action Review (AAR)
  const [caseStartTime, setCaseStartTime] = useState<number>(Date.now());
  const [caseInterventions, setCaseInterventions] = useState<CaseIntervention[]>([]);
  const [viliExposureSeconds, setViliExposureSeconds] = useState<number>(0);
  const [highPlateauSeconds, setHighPlateauSeconds] = useState<number>(0);
  const [hasDeteriorated, setHasDeteriorated] = useState<boolean>(false);
  const [deteriorationWarning, setDeteriorationWarning] = useState<string | null>(null);
  const [deteriorationSecondsCounter, setDeteriorationSecondsCounter] = useState<number>(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(0);

  // 1. Core Ventilator Settings
  const [settings, setSettings] = useState<VentilatorSettings>({
    mode: 'VCV',
    fio2: 40,
    peep: 5,
    triggerType: 'flow',
    triggerSensitivity: 2.0,
    tidalVolume: 420,
    respiratoryRate: 15,
    flowWaveform: 'decelerating',
    inspiratoryFlow: 60,
    inspiratoryPausePercent: 10,
    inspiratoryPressure: 15,
    inspiratoryTimePCV: 1.0,
    pressureRiseTime: 0.1,
    pressureSupport: 10,
    expiratorySensitivity: 25,
    backupApneaTime: 20,
    pHigh: 22,
    pLow: 0,
    tHigh: 3.5,
    tLow: 0.5,
    simvRate: 12,
    simvPs: 10,
  });

  const [draftSettings, setDraftSettings] = useState<VentilatorSettings>(settings);

  const handleUpdateDraft = (updater: VentilatorSettings | ((prev: VentilatorSettings) => VentilatorSettings)) => {
    setDraftSettings(updater);
  };

  const hasChanges = JSON.stringify(draftSettings) !== JSON.stringify(settings);

  const handleConfirmSettings = () => {
    audioEngine.playConfirmBeep();

    // Record clinical interventions for debriefing report
    if (activeClinicalCase) {
      const elapsed = Math.max(1, Math.round((Date.now() - caseStartTime) / 1000));
      const timeStr = `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
      (Object.keys(draftSettings) as (keyof VentilatorSettings)[]).forEach((k) => {
        if (draftSettings[k] !== settings[k]) {
          setCaseInterventions((prev) => [
            ...prev,
            {
              id: `int_${Date.now()}_${k}_${Math.random().toString(36).substring(2, 5)}`,
              timestampSeconds: elapsed,
              timeString: timeStr,
              parameterChanged: String(k).toUpperCase(),
              oldValue: String(settings[k] ?? '-'),
              newValue: String(draftSettings[k] ?? '-'),
            },
          ]);
        }
      });
    }

    setSettings(draftSettings);
  };

  const handleDiscardSettings = () => {
    audioEngine.playClick(750);
    setDraftSettings(settings);
  };

  // 2. Patient Profile & Respiratory Mechanics
  const [patient, setPatient] = useState<PatientParameters>({
    name: 'Paciente 01 - UTI Adulto',
    age: 58,
    gender: 'male',
    heightCm: 172,
    actualWeightKg: 74,
    idealBodyWeightKg: calculateIBW(172, 'male'),
    compliance: 50,
    resistance: 6,
    spontaneousDrive: false,
    spontaneousRate: 16,
    spontaneousEffortPressure: -5,
    spontaneousDutyCycle: 0.33,
    metabolicRateVCO2: 200,
    metabolicRateVO2: 250,
    deadSpaceFraction: 0.33,
    shuntFraction: 8,
    hemoglobin: 13.5,
    bodyTemperature: 37.0,
    secretionsSeverity: 'none',
    circuitLeakPercent: 0,
  });

  // 3. Alarm Limits
  const [alarmLimits, setAlarmLimits] = useState<AlarmLimits>({
    pHighMax: 40,
    pLowMin: 8,
    mvHighMax: 15,
    mvLowMin: 3.0,
    vteHighMax: 800,
    vteLowMin: 150,
    rateHighMax: 35,
    apneaTimeMax: 20,
    peepiHighMax: 5.0,
  });

  // 4. Diagnostic Maneuvers & State
  const [maneuverState, setManeuverState] = useState<ManeuverState>({
    inspiratoryHoldActive: false,
    expiratoryHoldActive: false,
    recruitmentManeuverActive: false,
    recruitmentTimeRemaining: 0,
    o2SuctionActive: false,
    o2SuctionTimeRemaining: 0,
    nebulizerActive: false,
    nebulizerTimeRemaining: 0,
    isFrozen: false,
  });

  // 5. Monitored Data & Waveform Samples
  const [currentSample, setCurrentSample] = useState<WaveformSample | null>(null);
  const [monitored, setMonitored] = useState<MonitoredData>({
    peakPressure: 18.5,
    plateauPressure: 14.0,
    meanPressure: 8.2,
    peep: 5.0,
    peepTotal: 5.0,
    autoPeep: 0,
    drivingPressure: 9.0,
    vte: 420,
    vti: 420,
    minuteVolume: 6.3,
    spontaneousMinuteVolume: 0,
    leakVolume: 0,
    totalRate: 15,
    spontaneousRate: 0,
    mandatoryRate: 15,
    inspiratoryTime: 0.95,
    expiratoryTime: 3.05,
    ieRatioString: '1:3.2',
    staticCompliance: 50,
    dynamicCompliance: 38,
    airwayResistance: 6.0,
    timeConstant: 0.30,
    rapidShallowBreathingIndex: 35,
    mechanicalPower: 8.5,
    vtPerKgIBW: 6.2,
    pao2: 95,
    paco2: 40,
    ph: 7.40,
    hco3: 24.0,
    baseExcess: 0.0,
    spo2: 98,
    pfRatio: 238,
    alveolarPaO2: 235,
    aaGradient: 140,
    etco2: 36,
  });

  // 6. Alarms Engine
  const [activeAlarms, setActiveAlarms] = useState<AlarmItem[]>([]);
  const [alarmHistory, setAlarmHistory] = useState<AlarmItem[]>([]);
  const [isSilenceActive, setIsSilenceActive] = useState<boolean>(false);
  const [silenceSecondsRemaining, setSilenceSecondsRemaining] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // 7. View & Modals
  const [userRole, setUserRole] = useState<UserRole | null>(() => educationalStorage.getUserRole());
  const [isRolePortalOpen, setIsRolePortalOpen] = useState<boolean>(true);
  const [isAsynchroniesOpen, setIsAsynchroniesOpen] = useState<boolean>(false);
  const [activeAsynchrony, setActiveAsynchrony] = useState<AsynchronyPreset | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isInteractiveTourOpen, setIsInteractiveTourOpen] = useState<boolean>(false);
  const [isTeacherAdminOpen, setIsTeacherAdminOpen] = useState<boolean>(false);
  const [isTeacherAuthOpen, setIsTeacherAuthOpen] = useState<boolean>(false);

  const handleSelectRole = (role: UserRole) => {
    if (role === 'teacher') {
      setIsTeacherAuthOpen(true);
      setIsRolePortalOpen(false);
      return;
    }
    setUserRole('student');
    educationalStorage.setUserRole('student');
    setIsRolePortalOpen(false);
  };

  const handleLoadAsynchronyScenario = (
    newPatient: PatientParameters,
    newSettings: VentilatorSettings,
    _title: string,
    preset?: AsynchronyPreset
  ) => {
    physicsEngine.reset(newPatient.compliance, newPatient.resistance, newSettings.peep);
    setPatient(newPatient);
    setSettings(newSettings);
    setDraftSettings(newSettings);
    if (preset) {
      setActiveAsynchrony(preset);
    }
    audioEngine.playConfirmBeep();
  };

  const handleOpenTeacherAdmin = () => {
    if (userRole === 'teacher') {
      setIsTeacherAdminOpen(true);
    } else {
      setIsTeacherAuthOpen(true);
    }
  };

  const handleTeacherAuthSuccess = () => {
    setUserRole('teacher');
    educationalStorage.setUserRole('teacher');
    setIsTeacherAuthOpen(false);
    setIsTeacherAdminOpen(true);
  };

  const [viewMode, setViewMode] = useState<'waveforms' | 'loops' | 'split'>('waveforms');
  const [currentPage, setCurrentPage] = useState<'simulator' | 'clinical_cases'>('simulator');
  const [isClinicalCasesOpen, setIsClinicalCasesOpen] = useState<boolean>(false);
  const [isEducationalOpen, setIsEducationalOpen] = useState<boolean>(false);
  const [isQuizOpen, setIsQuizOpen] = useState<boolean>(false);
  const [activeClinicalCase, setActiveClinicalCase] = useState<ClinicalCase | null>(CLINICAL_CASES[0]);
  const [isGasometryOpen, setIsGasometryOpen] = useState<boolean>(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState<boolean>(false);
  const [isPatientConfigOpen, setIsPatientConfigOpen] = useState<boolean>(false);
  const [isAlarmsModalOpen, setIsAlarmsModalOpen] = useState<boolean>(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [audioContextState, setAudioContextState] = useState<string>(audioEngine.getContextState());
  const [isAudioBannerDismissed, setIsAudioBannerDismissed] = useState<boolean>(false);

  // 8a. Resizable Parameter Controls Splitter (Vertical height between graphs and parameters)
  const [paramPanelHeight, setParamPanelHeight] = useState<number>(165);
  const [isDraggingParamSplitter, setIsDraggingParamSplitter] = useState<boolean>(false);
  const [isParamPanelCollapsed, setIsParamPanelCollapsed] = useState<boolean>(false);

  const handleParamSplitterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    setIsDraggingParamSplitter(true);
    const startY = e.clientY;
    const startHeight = paramPanelHeight;

    const onPointerMove = (moveEvent: PointerEvent) => {
      // Dragging upward increases parameter controls height; dragging downward gives more space to graphs
      const delta = startY - moveEvent.clientY;
      const newHeight = Math.min(360, Math.max(80, startHeight + delta));
      setParamPanelHeight(newHeight);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      setIsDraggingParamSplitter(false);
      try {
        if (target.hasPointerCapture(upEvent.pointerId)) {
          target.releasePointerCapture(upEvent.pointerId);
        }
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // 8b. Resizable Clinical Panel & Splitter State
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(330);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);

  const handleSplitterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    setIsDraggingSplitter(true);
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = startX - moveEvent.clientX; // Dragging left increases right panel width
      const newWidth = Math.min(560, Math.max(200, startWidth + delta));
      setRightPanelWidth(newWidth);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      setIsDraggingSplitter(false);
      try {
        if (target.hasPointerCapture(upEvent.pointerId)) {
          target.releasePointerCapture(upEvent.pointerId);
        }
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Listen to audio engine context state changes
  useEffect(() => {
    const unsub = audioEngine.onStateChange((state) => {
      setAudioContextState(state);
    });
    // Check initial state
    setAudioContextState(audioEngine.getContextState());
    return () => unsub();
  }, []);

  // Pulse Oximeter Rhythm Interval (simulating ICU pulse beep if enabled)
  useEffect(() => {
    // Standard ICU heart rate approx 75 bpm = 800ms
    const pulseTimer = setInterval(() => {
      if (!maneuverStateRef.current.isFrozen && isVentilatingRef.current && monitored.spo2 > 0) {
        audioEngine.playSpO2Pulse(monitored.spo2);
      }
    }, 850);

    return () => clearInterval(pulseTimer);
  }, [monitored.spo2]);

  // Keep references for physics interval
  const settingsRef = useRef(settings);
  const patientRef = useRef(patient);
  const maneuverStateRef = useRef(maneuverState);
  const alarmLimitsRef = useRef(alarmLimits);

  useEffect(() => {
    settingsRef.current = settings;
    patientRef.current = patient;
    maneuverStateRef.current = maneuverState;
    alarmLimitsRef.current = alarmLimits;
  }, [settings, patient, maneuverState, alarmLimits]);

  // Main High-Frequency Physics Engine Loop (60 Hz)
  useEffect(() => {
    const dt = 0.0166; // 60fps time step
    let lastTime = performance.now();

    const interval = setInterval(() => {
      if (maneuverStateRef.current.isFrozen || !isVentilatingRef.current) return;

      const { sample, monitored: newMonitored } = physicsEngine.step(
        dt,
        settingsRef.current,
        patientRef.current,
        maneuverStateRef.current
      );

      setCurrentSample(sample);
      setMonitored(newMonitored);
    }, 16);

    return () => clearInterval(interval);
  }, []);

  // Alarm Evaluation Engine (1 Hz)
  useEffect(() => {
    const checkAlarms = () => {
      const limits = alarmLimitsRef.current;
      const mon = monitored;
      const newAlarms: AlarmItem[] = [];

      // 1. High Peak Pressure
      if (mon.peakPressure >= limits.pHighMax) {
        newAlarms.push({
          id: 'p-high',
          code: 'P_HIGH',
          title: 'PRESSÃO DE PICO ELEVADA',
          description: `PIP ${mon.peakPressure.toFixed(1)} cmH₂O ≥ limite ${limits.pHighMax}`,
          severity: 'high',
          active: true,
          timestamp: Date.now(),
        });
      }

      // 2. Low Peak Pressure / Disconnection
      if (mon.peakPressure < limits.pLowMin) {
        newAlarms.push({
          id: 'p-low',
          code: 'P_LOW_DISCONN',
          title: 'PRESSÃO BAIXA / DESCONEXÃO',
          description: `PIP ${mon.peakPressure.toFixed(1)} cmH₂O < limite ${limits.pLowMin}`,
          severity: 'high',
          active: true,
          timestamp: Date.now(),
        });
      }

      // 3. High Minute Volume
      if (mon.minuteVolume >= limits.mvHighMax) {
        newAlarms.push({
          id: 'mv-high',
          code: 'MV_HIGH',
          title: 'VENTILAÇÃO MINUTO ALTA',
          description: `VM ${mon.minuteVolume.toFixed(1)} L/min ≥ limite ${limits.mvHighMax}`,
          severity: 'medium',
          active: true,
          timestamp: Date.now(),
        });
      }

      // 4. Low Minute Volume
      if (mon.minuteVolume < limits.mvLowMin) {
        newAlarms.push({
          id: 'mv-low',
          code: 'MV_LOW',
          title: 'VENTILAÇÃO MINUTO BAIXA',
          description: `VM ${mon.minuteVolume.toFixed(1)} L/min < limite ${limits.mvLowMin}`,
          severity: 'high',
          active: true,
          timestamp: Date.now(),
        });
      }

      // 5. High Tidal Volume
      if (mon.vte >= limits.vteHighMax) {
        newAlarms.push({
          id: 'vt-high',
          code: 'VT_HIGH',
          title: 'VOLUME CORRENTE ALTO',
          description: `Vte ${mon.vte} mL ≥ limite ${limits.vteHighMax}`,
          severity: 'medium',
          active: true,
          timestamp: Date.now(),
        });
      }

      // 6. Low Tidal Volume
      if (mon.vte < limits.vteLowMin) {
        newAlarms.push({
          id: 'vt-low',
          code: 'VT_LOW',
          title: 'VOLUME CORRENTE BAIXO',
          description: `Vte ${mon.vte} mL < limite ${limits.vteLowMin}`,
          severity: 'medium',
          active: true,
          timestamp: Date.now(),
        });
      }

      // 7. Auto-PEEP high
      if (mon.autoPeep >= limits.peepiHighMax) {
        newAlarms.push({
          id: 'peepi-high',
          code: 'PEEPI_HIGH',
          title: 'AUTO-PEEP / APRISIONAMENTO AÉREO',
          description: `Auto-PEEP ${mon.autoPeep.toFixed(1)} cmH₂O ≥ ${limits.peepiHighMax}`,
          severity: 'medium',
          active: true,
          timestamp: Date.now(),
        });
      }

      setActiveAlarms(newAlarms);

      // Trigger audio alarm if any high/medium active and not silenced
      if (newAlarms.length > 0 && !isSilenceActive && !isAudioMuted) {
        const topSeverity = newAlarms.some((a) => a.severity === 'high')
          ? 'high'
          : 'medium';
        audioEngine.triggerAlarmPattern(topSeverity);
      } else {
        audioEngine.stopAlarm();
      }

      // Append to history if new
      if (newAlarms.length > 0) {
        setAlarmHistory((prev) => {
          const uniqueNew = newAlarms.filter(
            (na) => !prev.some((p) => p.code === na.code && Date.now() - p.timestamp < 15000)
          );
          return [...prev, ...uniqueNew].slice(-30);
        });
      }
    };

    const alarmTimer = setInterval(checkAlarms, 1000);
    return () => clearInterval(alarmTimer);
  }, [monitored, isSilenceActive, isAudioMuted]);

  // Timers countdown for diagnostic maneuvers & alarm silence (1s interval)
  useEffect(() => {
    const timer = setInterval(() => {
      // Silence timer countdown
      if (isSilenceActive) {
        setSilenceSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsSilenceActive(false);
            audioEngine.setMuted(false);
            return 0;
          }
          return prev - 1;
        });
      }

      // Diagnostic maneuvers timers countdown
      setManeuverState((prev) => {
        let changed = false;
        let o2Sec = prev.o2SuctionTimeRemaining;
        let o2Active = prev.o2SuctionActive;
        let recSec = prev.recruitmentTimeRemaining;
        let recActive = prev.recruitmentManeuverActive;
        let nebSec = prev.nebulizerTimeRemaining;
        let nebActive = prev.nebulizerActive;

        if (o2Active) {
          if (o2Sec <= 1) {
            o2Active = false;
            o2Sec = 0;
            changed = true;
          } else {
            o2Sec -= 1;
            changed = true;
          }
        }

        if (recActive) {
          if (recSec <= 1) {
            recActive = false;
            recSec = 0;
            changed = true;
          } else {
            recSec -= 1;
            changed = true;
          }
        }

        if (nebActive) {
          if (nebSec <= 1) {
            nebActive = false;
            nebSec = 0;
            changed = true;
          } else {
            nebSec -= 1;
            changed = true;
          }
        }

        if (!changed) return prev;
        return {
          ...prev,
          o2SuctionActive: o2Active,
          o2SuctionTimeRemaining: o2Sec,
          recruitmentManeuverActive: recActive,
          recruitmentTimeRemaining: recSec,
          nebulizerActive: nebActive,
          nebulizerTimeRemaining: nebSec,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSilenceActive]);

  // Handlers for Silence, Sound, and Maneuvers
  const handleToggleSilence = () => {
    if (isSilenceActive) {
      setIsSilenceActive(false);
      setSilenceSecondsRemaining(0);
      audioEngine.setMuted(false);
    } else {
      setIsSilenceActive(true);
      setSilenceSecondsRemaining(120);
      audioEngine.setMuted(true);
    }
  };

  const handleToggleAudioMute = () => {
    const nextState = !isAudioMuted;
    setIsAudioMuted(nextState);
    audioEngine.setSoundEnabled(!nextState);
  };

  const handleToggleInspHold = () => {
    setManeuverState((prev) => ({
      ...prev,
      inspiratoryHoldActive: !prev.inspiratoryHoldActive,
      expiratoryHoldActive: false,
    }));
  };

  const handleStartInspHold = () => {
    setManeuverState((prev) => ({
      ...prev,
      inspiratoryHoldActive: true,
      expiratoryHoldActive: false,
    }));
  };

  const handleEndInspHold = () => {
    setManeuverState((prev) => ({
      ...prev,
      inspiratoryHoldActive: false,
    }));
  };

  const handleToggleExpHold = () => {
    setManeuverState((prev) => ({
      ...prev,
      expiratoryHoldActive: !prev.expiratoryHoldActive,
      inspiratoryHoldActive: false,
    }));
  };

  const handleToggleO2Suction = () => {
    setManeuverState((prev) => ({
      ...prev,
      o2SuctionActive: !prev.o2SuctionActive,
      o2SuctionTimeRemaining: !prev.o2SuctionActive ? 120 : 0,
    }));
  };

  const handleToggleNebulizer = () => {
    setManeuverState((prev) => ({
      ...prev,
      nebulizerActive: !prev.nebulizerActive,
      nebulizerTimeRemaining: !prev.nebulizerActive ? 600 : 0,
    }));
  };

  const handleToggleRecruitment = () => {
    setManeuverState((prev) => ({
      ...prev,
      recruitmentManeuverActive: !prev.recruitmentManeuverActive,
      recruitmentTimeRemaining: !prev.recruitmentManeuverActive ? 30 : 0,
    }));
  };

  const handleToggleFreeze = () => {
    setManeuverState((prev) => ({
      ...prev,
      isFrozen: !prev.isFrozen,
    }));
  };

  const handleToggleSpontaneousDrive = () => {
    audioEngine.playClick(900);
    setPatient((prev) => ({
      ...prev,
      spontaneousDrive: !prev.spontaneousDrive,
    }));
  };

  const handleManualBreath = () => {
    physicsEngine.reset();
  };

  // Load a full clinical case
  const handleLoadCase = (selectedCase: ClinicalCase) => {
    setActiveClinicalCase(selectedCase);
    setPatient(selectedCase.patientProfile);
    setSettings(selectedCase.initialSettings);
    setDraftSettings(selectedCase.initialSettings);
    setCaseStartTime(Date.now());
    setCaseInterventions([]);
    setViliExposureSeconds(0);
    setHighPlateauSeconds(0);
    setHasDeteriorated(false);
    setDeteriorationWarning(null);
    setDeteriorationSecondsCounter(0);
    setCurrentPhaseIndex(0);
    setIsCardiacArrestModalOpen(false);
    hasTriggeredPcrRef.current = false;

    // If it's an admission case, starts in Standby so student configures initial parameters from scratch!
    const shouldStartStandby =
      selectedCase.id.includes('admissao') ||
      selectedCase.id === 'admissao-uti-zero-sdra' ||
      selectedCase.category === 'Emergência';
    setIsVentilating(!shouldStartStandby);

    physicsEngine.reset(
      selectedCase.patientProfile.compliance,
      selectedCase.patientProfile.resistance,
      selectedCase.initialSettings.peep
    );
  };

  // Safety tracking, temporal phase progression and physiological dynamic deterioration
  useEffect(() => {
    const timer = setInterval(() => {
      if (!activeClinicalCase || maneuverStateRef.current.isFrozen) return;

      const elapsedCaseSec = Math.floor((Date.now() - caseStartTime) / 1000);

      // Automatic Temporal Progression across Phases (e.g. Admission -> Worsening/Inflammatory Cascade -> Stabilization)
      if (activeClinicalCase.phases && activeClinicalCase.phases.length > 1) {
        const phase2Trigger = pedagogicalSettings.admissionPhase2TimeSeconds || 90;
        const phase3Trigger = pedagogicalSettings.admissionPhase3TimeSeconds || 200;

        // Trigger Phase 2 (Configurable in Teacher Area)
        if (currentPhaseIndex === 0 && elapsedCaseSec >= phase2Trigger) {
          const nextPhase = activeClinicalCase.phases[1];
          if (nextPhase) {
            setCurrentPhaseIndex(1);
            if (nextPhase.patientOverrides) {
              setPatient((p) => ({ ...p, ...nextPhase.patientOverrides }));
            }
            audioEngine.triggerAlarmPattern('medium');
            setDeteriorationWarning(
              `⚡ EVOLUÇÃO TEMPORAL: ${nextPhase.name}! A complacência caiu e o shunt aumentou. Reavalie a Driving Pressure imediatamente!`
            );
          }
        }
        // Trigger Phase 3 (Configurable in Teacher Area)
        else if (currentPhaseIndex === 1 && elapsedCaseSec >= phase3Trigger) {
          const nextPhase = activeClinicalCase.phases[2];
          if (nextPhase) {
            setCurrentPhaseIndex(2);
            if (nextPhase.patientOverrides) {
              setPatient((p) => ({ ...p, ...nextPhase.patientOverrides }));
            }
            audioEngine.playConfirmBeep();
            setDeteriorationWarning(
              `⚡ FASE FINAL: ${nextPhase.name}! Busque a estabilização gasométrica com proteção alveolar plena.`
            );
          }
        }
      }

      // VILI Tracking
      if (monitored.drivingPressure > pedagogicalSettings.dpSafetyThreshold) {
        setViliExposureSeconds((s) => s + 1);
      }
      if (monitored.plateauPressure > pedagogicalSettings.platSafetyThreshold) {
        setHighPlateauSeconds((s) => s + 1);
      }

      // Critical Cardiac Arrest (PCR) Trigger: SpO2 <= 35% in any case
      if (
        !maneuverStateRef.current.isFrozen &&
        monitored.spo2 > 0 &&
        monitored.spo2 <= 35 &&
        !isCardiacArrestModalOpen &&
        !hasTriggeredPcrRef.current
      ) {
        hasTriggeredPcrRef.current = true;
        setIsCardiacArrestModalOpen(true);
      } else if (monitored.spo2 > 40) {
        hasTriggeredPcrRef.current = false;
      }

      // Dynamic Physiological Deterioration Trigger
      if (pedagogicalSettings.deteriorationEnabled && !hasDeteriorated) {
        const isDangerous =
          monitored.drivingPressure > pedagogicalSettings.dpSafetyThreshold ||
          monitored.plateauPressure > pedagogicalSettings.platSafetyThreshold;

        if (isDangerous) {
          setDeteriorationSecondsCounter((prev) => {
            const next = prev + 1;
            if (next >= pedagogicalSettings.deteriorationTimeoutSeconds) {
              setHasDeteriorated(true);
              setDeteriorationWarning(
                `Alerta de Barotrauma: Exposição mantida a pressões hiperdistensivas (ΔP > ${pedagogicalSettings.dpSafetyThreshold} cmH₂O ou Pplat > ${pedagogicalSettings.platSafetyThreshold} cmH₂O). Paciente desenvolveu pneumotórax com perda aguda de complacência!`
              );
              setPatient((p) => ({
                ...p,
                compliance: Math.max(12, Math.round(p.compliance * 0.55)),
                resistance: Math.min(26, Math.round(p.resistance * 1.4)),
              }));
              audioEngine.triggerAlarmPattern('high');
              return 0;
            }
            return next;
          });
        } else {
          setDeteriorationSecondsCounter(0);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    activeClinicalCase,
    caseStartTime,
    currentPhaseIndex,
    monitored.drivingPressure,
    monitored.plateauPressure,
    pedagogicalSettings,
    hasDeteriorated,
  ]);

  // Debriefing Report Generator (After Action Review - AAR)
  const generateDebriefingReport = useCallback((): CaseDebriefingReport | null => {
    if (!activeClinicalCase) return null;
    const durationSec = Math.max(5, Math.round((Date.now() - caseStartTime) / 1000));
    const currentGoals = activeClinicalCase.goals || [];
    const goalsMet = currentGoals.filter((g) => {
      try {
        return g.isMet(monitored, settings, patient);
      } catch {
        return false;
      }
    }).length;

    let baseScore = Math.round((goalsMet / Math.max(1, currentGoals.length)) * 75);
    const viliPenalty = Math.min(25, Math.floor(viliExposureSeconds / 4));
    const platPenalty = Math.min(20, Math.floor(highPlateauSeconds / 3));
    const deteriorationPenalty = hasDeteriorated ? 30 : 0;

    let finalScore = Math.max(15, Math.min(100, baseScore + 25 - viliPenalty - platPenalty - deteriorationPenalty));
    if (goalsMet === currentGoals.length && !hasDeteriorated && viliExposureSeconds < 15) {
      finalScore = 100;
    }

    const rating: CaseDebriefingReport['rating'] =
      finalScore >= 85
        ? 'Excelente (Padrão Ouro)'
        : finalScore >= 70
        ? 'Adequado / Seguro'
        : finalScore >= 50
        ? 'Risco Moderado'
        : 'Risco Crítico / Iatrogênico';

    const rep: CaseDebriefingReport = {
      id: `rep_${Date.now()}`,
      caseId: activeClinicalCase.id,
      caseTitle: activeClinicalCase.title,
      studentName: 'Estudante UTI',
      completedAt: new Date().toLocaleString('pt-BR'),
      durationSeconds: durationSec,
      score: finalScore,
      rating,
      goalsCompletedCount: goalsMet,
      totalGoalsCount: currentGoals.length,
      safetyMetrics: {
        timeUnderViliSeconds: viliExposureSeconds,
        timeHighPlateauSeconds: highPlateauSeconds,
        autoPeepRiskEvents: monitored.autoPeep > 3 ? 1 : 0,
        asynchronyEventsCount: activeAsynchrony ? 1 : 0,
        hadDeterioration: hasDeteriorated,
      },
      interventions: caseInterventions,
      guidelineFeedback: activeClinicalCase.teachingPoints || [
        'Ventilação protetora com Vt de 4-8 mL/kg de peso predito previne volutrauma e barotrauma.',
        'Manter Driving Pressure ≤ 14-15 cmH₂O e Pressão de Platô ≤ 30 cmH₂O.',
      ],
      recommendations: [
        hasDeteriorated
          ? 'Evitar exposição prolongada a pressões de distensão elevadas.'
          : 'Excelente adesão aos alvos de proteção pulmonar.',
        'Sempre correlacione os achados das curvas com a gasometria arterial e a mecânica pulmonar.',
      ],
    };

    educationalStorage.saveDebriefingReport(rep);
    setCurrentDebriefingReport(rep);
    return rep;
  }, [
    activeClinicalCase,
    caseStartTime,
    monitored,
    settings,
    patient,
    viliExposureSeconds,
    highPlateauSeconds,
    hasDeteriorated,
    caseInterventions,
    activeAsynchrony,
  ]);

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-sans select-none transition-colors ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#050505] text-zinc-100'
      }`}
    >
      {currentPage === 'clinical_cases' ? (
        <ClinicalCasesPage
          onBackToSimulator={() => setCurrentPage('simulator')}
          onLoadCaseInSimulator={(selectedCase) => {
            handleLoadCase(selectedCase);
            setCurrentPage('simulator');
          }}
          currentMonitored={monitored}
          currentSettings={settings}
          currentPatient={patient}
        />
      ) : !isVentilating ? (
        <VentilatorAdmissionScreen
          currentCase={activeClinicalCase}
          patient={patient}
          initialSettings={settings}
          onStartVentilation={(configuredSettings) => {
            setSettings(configuredSettings);
            setDraftSettings(configuredSettings);
            setIsVentilating(true);
            setCaseStartTime(Date.now());
            physicsEngine.reset(patient.compliance, patient.resistance, configuredSettings.peep);
            audioEngine.playConfirmBeep();
            if (!educationalStorage.hasCompletedTour()) {
              setIsInteractiveTourOpen(true);
            }
          }}
          onOpenCasesList={() => setCurrentPage('clinical_cases')}
          onUpdatePatient={setPatient}
        />
      ) : (
        <>
          {/* 1. Header Bar */}
          <TopBar
            mode={settings.mode}
            patient={patient}
            activeAlarms={activeAlarms}
            userRole={userRole}
            simulationTimeSeconds={0}
            blindMechanicsActive={pedagogicalSettings.blindMechanicsEnabled}
            isVentilating={isVentilating}
            onToggleStandby={() => setIsVentilating(false)}
            onOpenPatientConfig={() => setIsPatientConfigOpen(true)}
            onOpenAlarmsModal={() => setIsAlarmsModalOpen(true)}
            onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
            onOpenMenu={() => setIsMenuOpen(true)}
            onOpenRolePortal={() => setIsRolePortalOpen(true)}
            onOpenTutorial={() => setIsInteractiveTourOpen(true)}
            onOpenTeacherAdmin={handleOpenTeacherAdmin}
            onOpenClinicalCases={() => setCurrentPage('clinical_cases')}
            onOpenQuiz={() => setIsQuizOpen(true)}
            onOpenEducational={() => setIsEducationalOpen(true)}
            onOpenGasometry={() => setIsGasometryOpen(true)}
            onOpenMissions={() => setIsMissionsOpen(true)}
            onOpenAsynchronies={() => setIsAsynchroniesOpen(true)}
            onOpenFlashcards={() => setIsFlashcardsOpen(true)}
            onOpenDebriefing={() => {
              generateDebriefingReport();
              setIsDebriefingOpen(true);
            }}
          />

      {/* Audio Unlock Banner (Minimal & Dismissible if browser suspended AudioContext) */}
      {audioContextState !== 'running' && !isAudioBannerDismissed && (
        <div
          id="audio-activation-banner"
          onClick={() => {
            audioEngine.resumeAudio();
            setIsAudioBannerDismissed(true);
          }}
          className={`border-b px-3 py-1 flex items-center justify-between cursor-pointer transition-all text-xs z-30 ${
            isLight
              ? 'bg-cyan-50 border-cyan-300 hover:bg-cyan-100 text-cyan-950'
              : 'bg-[#0b1322] border-cyan-500/30 hover:bg-[#101b30] text-cyan-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
            <span className="font-mono text-[11px]">
              <strong className={isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}>
                ÁUDIO DA UTI SUSPENSO:
              </strong>{' '}
              Clique aqui para habilitar os sons de respiração e alarmes no navegador.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                audioEngine.resumeAudio();
                setIsAudioBannerDismissed(true);
              }}
              className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-[10px] rounded shadow transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Ativar Áudio</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAudioBannerDismissed(true);
              }}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-zinc-800 text-zinc-400'
              }`}
              title="Dispensar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Studio Layout (Flexible Split View with Resizable Splitters) */}
      <main
        className={`flex-1 flex min-h-0 overflow-hidden p-2 gap-0 relative transition-colors ${
          isLight ? 'bg-slate-100' : 'bg-[#070709]'
        }`}
      >
        {/* Main Central/Left Workspace: Maximized Waveforms on Top + Mode & Parameters on Bottom */}
        <div className="flex-1 min-w-0 h-full flex flex-col gap-0 overflow-hidden">
          {/* Active Asynchrony Resolution Banner (Simulate & Solve Challenge) */}
          {activeAsynchrony && (
            <AsynchronyResolutionBanner
              asynchrony={activeAsynchrony}
              currentSettings={settings}
              currentPatient={patient}
              currentMonitored={monitored}
              onOpenDatabase={() => setIsAsynchroniesOpen(true)}
              onClose={() => setActiveAsynchrony(null)}
            />
          )}

          {/* Top Waveforms Area (Maximized Canvas Height & Width) */}
          <div id="tour-waveforms" className="flex-1 min-h-0 overflow-hidden">
            {viewMode === 'waveforms' && (
              <div className="h-full">
                <WaveformDisplay
                  currentSample={currentSample}
                  maneuverState={maneuverState}
                  onToggleFreeze={handleToggleFreeze}
                  peepSet={settings.peep}
                  viewMode={viewMode}
                  onSelectViewMode={setViewMode}
                  monitored={monitored}
                  formulaOverlay={activeFormulaOverlay}
                  onSelectFormulaOverlay={setActiveFormulaOverlay}
                />
              </div>
            )}

            {viewMode === 'loops' && (
              <div className="h-full">
                <LoopsDisplay
                  currentSample={currentSample}
                  peepSet={settings.peep}
                  viewMode={viewMode}
                  onSelectViewMode={setViewMode}
                  monitored={monitored}
                  patient={patient}
                  isFrozen={maneuverState.isFrozen}
                />
              </div>
            )}

            {viewMode === 'split' && (
              <div className="h-full grid grid-rows-2 gap-2">
                <div className="min-h-0">
                  <WaveformDisplay
                    currentSample={currentSample}
                    maneuverState={maneuverState}
                    onToggleFreeze={handleToggleFreeze}
                    peepSet={settings.peep}
                    viewMode={viewMode}
                    onSelectViewMode={setViewMode}
                    monitored={monitored}
                    formulaOverlay={activeFormulaOverlay}
                    onSelectFormulaOverlay={setActiveFormulaOverlay}
                  />
                </div>
                <div className="min-h-0">
                  <LoopsDisplay
                    currentSample={currentSample}
                    peepSet={settings.peep}
                    viewMode={viewMode}
                    onSelectViewMode={setViewMode}
                    monitored={monitored}
                    patient={patient}
                    isFrozen={maneuverState.isFrozen}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Draggable Resizer Splitter between Graph Area and Parameter Controls */}
          <div
            onPointerDown={handleParamSplitterPointerDown}
            onDoubleClick={() => setParamPanelHeight(165)}
            title="Arraste verticalmente para ajustar o espaço entre os gráficos e os parâmetros (duplo clique para restaurar 165px)"
            className={`group relative h-4 my-0.5 w-full cursor-row-resize flex items-center justify-center shrink-0 select-none touch-none z-20 transition-colors ${
              isDraggingParamSplitter ? 'bg-cyan-500/20' : ''
            }`}
          >
            {/* Visual Grab Bar */}
            <div
              className={`h-1 rounded-full transition-all duration-150 ${
                isDraggingParamSplitter
                  ? 'w-48 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.9)] scale-y-125'
                  : isLight
                  ? 'w-28 bg-slate-300 group-hover:bg-cyan-600 group-hover:w-40'
                  : 'w-28 bg-zinc-700/80 group-hover:bg-cyan-400 group-hover:w-40'
              }`}
            />

            {/* Quick Collapse / Expand button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsParamPanelCollapsed((prev) => !prev);
              }}
              className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border shadow-sm flex items-center justify-center cursor-pointer transition-all hover:scale-110 z-30 ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-700 hover:text-cyan-700 hover:border-cyan-400'
                  : 'bg-[#121420] border-zinc-700 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500'
              }`}
              title={isParamPanelCollapsed ? 'Expandir Parâmetros' : 'Recolher Parâmetros'}
            >
              {isParamPanelCollapsed ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {/* Dragging height indicator badge */}
            {isDraggingParamSplitter && (
              <div className="absolute top-1/2 -translate-y-7 bg-cyan-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-40">
                Altura: {paramPanelHeight}px
              </div>
            )}
          </div>

          {/* Bottom Area: Parameters & Mode (User Resizable Height) */}
          {!isParamPanelCollapsed && (
            <div
              id="tour-parameters"
              style={{
                height: `${Math.max(165, paramPanelHeight)}px`,
              }}
              className="shrink-0 overflow-y-auto lg:overflow-hidden transition-all"
            >
              <ParameterControls
                settings={settings}
                draftSettings={draftSettings}
                onUpdateDraft={handleUpdateDraft}
                hasChanges={hasChanges}
                onConfirm={handleConfirmSettings}
                onDiscard={handleDiscardSettings}
              />
            </div>
          )}
        </div>

        {/* Draggable Resizer Splitter between Graph Area and Clinical Data Panel */}
        <div
          onPointerDown={handleSplitterPointerDown}
          onDoubleClick={() => setRightPanelWidth(330)}
          title="Arraste para ajustar a largura do painel de dados clínicos (duplo clique para restaurar 330px)"
          className={`group relative w-3.5 mx-0.5 h-full cursor-col-resize flex items-center justify-center shrink-0 select-none touch-none z-20 transition-colors ${
            isDraggingSplitter ? 'bg-cyan-500/20' : ''
          }`}
        >
          {/* Visual Grab Handle */}
          <div
            className={`w-1 rounded-full transition-all duration-150 ${
              isDraggingSplitter
                ? 'h-32 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.9)] scale-x-125'
                : isLight
                ? 'h-20 bg-slate-300 group-hover:bg-cyan-500 group-hover:h-28'
                : 'h-20 bg-zinc-700/80 group-hover:bg-cyan-400 group-hover:h-28'
            }`}
          />

          {/* Quick Collapse / Expand button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRightPanelCollapsed((prev) => !prev);
            }}
            className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border shadow-md flex items-center justify-center cursor-pointer transition-all hover:scale-110 z-30 ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:text-cyan-600 hover:border-cyan-400'
                : 'bg-[#121420] border-zinc-700 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500'
            }`}
            title={isRightPanelCollapsed ? 'Expandir Painel de Dados Clínicos' : 'Recolher Painel de Dados Clínicos'}
          >
            {isRightPanelCollapsed ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Dragging width indicator badge */}
          {isDraggingSplitter && (
            <div className="absolute top-1/2 -translate-y-16 bg-cyan-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-40">
              {rightPanelWidth}px
            </div>
          )}
        </div>

        {/* Right Column: Monitorization & Mechanics (User Resizable Width) */}
        {!isRightPanelCollapsed && (
          <div
            id="tour-monitored"
            style={{ width: `${rightPanelWidth}px` }}
            className="h-full min-h-0 shrink-0 overflow-hidden"
          >
            <MonitorPanel
              monitored={monitored}
              patient={patient}
              onOpenGasometry={() => setIsGasometryOpen(true)}
              blindMechanicsMode={pedagogicalSettings.blindMechanicsEnabled}
              allowStudentRevealBlind={pedagogicalSettings.allowStudentRevealBlind}
              onToggleBlindMechanics={() => {
                setPedagogicalSettings((prev) => {
                  const updated = {
                    ...prev,
                    blindMechanicsEnabled: !prev.blindMechanicsEnabled,
                  };
                  educationalStorage.savePedagogicalSettings(updated);
                  return updated;
                });
              }}
            />
          </div>
        )}
      </main>

      {/* Dynamic Deterioration / Barotrauma Warning Toast */}
      {deteriorationWarning && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[90%] bg-red-950/95 border border-red-500 text-red-200 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="text-xs font-mono font-bold leading-relaxed">{deteriorationWarning}</p>
          </div>
          <button
            onClick={() => setDeteriorationWarning(null)}
            className="p-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Bottom Diagnostic Maneuvers & Control Bar (with Dropdown) */}
      <ManeuverBar
        maneuverState={maneuverState}
        patient={patient}
        viewMode={viewMode}
        onToggleInspHold={handleToggleInspHold}
        onStartInspHold={handleStartInspHold}
        onEndInspHold={handleEndInspHold}
        onToggleExpHold={handleToggleExpHold}
        onToggleO2Suction={handleToggleO2Suction}
        onToggleNebulizer={handleToggleNebulizer}
        onToggleRecruitment={handleToggleRecruitment}
        onToggleSpontaneousDrive={handleToggleSpontaneousDrive}
        onManualBreath={handleManualBreath}
        onToggleFreeze={handleToggleFreeze}
        onChangeViewMode={setViewMode}
        onOpenPatientConfig={() => setIsPatientConfigOpen(true)}
        onOpenClinicalCases={() => setIsClinicalCasesOpen(true)}
        onOpenReport={() => setIsGasometryOpen(true)}
        onOpenSettings={() => setIsAlarmsModalOpen(true)}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenHelp={() => setIsEducationalOpen(true)}
        onOpenAudio={() => setIsAudioSettingsOpen(true)}
        onOpenQuiz={() => setIsQuizOpen(true)}
        onOpenMissions={() => setIsMissionsOpen(true)}
        onResetSimulation={() => physicsEngine.reset()}
      />
      </>
      )}

      {/* Modals & Dialogs */}
      <RoleSelectionPortal
        isOpen={isRolePortalOpen}
        currentRole={userRole}
        onSelectRole={handleSelectRole}
        onClose={() => setIsRolePortalOpen(false)}
        onOpenTutorial={() => {
          setIsRolePortalOpen(false);
          setIsTutorialOpen(true);
        }}
        onOpenMissions={() => {
          setIsRolePortalOpen(false);
          setIsMissionsOpen(true);
        }}
        onOpenCases={() => {
          setIsRolePortalOpen(false);
          setCurrentPage('clinical_cases');
        }}
        onOpenQuiz={() => {
          setIsRolePortalOpen(false);
          setIsQuizOpen(true);
        }}
        onOpenEducational={() => {
          setIsRolePortalOpen(false);
          setIsEducationalOpen(true);
        }}
        onOpenTeacherAdmin={() => {
          setIsRolePortalOpen(false);
          setIsTeacherAdminOpen(true);
        }}
        onOpenAsynchronies={() => {
          setIsRolePortalOpen(false);
          setIsAsynchroniesOpen(true);
        }}
        onEnterSimulatorDirectly={() => setIsRolePortalOpen(false)}
      />

      <AsynchronyDatabaseModal
        isOpen={isAsynchroniesOpen}
        onClose={() => setIsAsynchroniesOpen(false)}
        onLoadAsynchronyScenario={handleLoadAsynchronyScenario}
      />

      <StudentTutorialModal
        isOpen={isTutorialOpen && isVentilating}
        onClose={() => setIsTutorialOpen(false)}
        onOpenMissions={() => setIsMissionsOpen(true)}
        onOpenCases={() => {
          setIsTutorialOpen(false);
          setCurrentPage('clinical_cases');
        }}
        onStartTour={() => {
          setIsTutorialOpen(false);
          setIsInteractiveTourOpen(true);
        }}
      />

      <TeacherAdminModal
        isOpen={isTeacherAdminOpen && userRole === 'teacher'}
        onClose={() => setIsTeacherAdminOpen(false)}
        onLoadCaseInSimulator={(selectedCase) => {
          handleLoadCase(selectedCase);
          setCurrentPage('simulator');
        }}
        onPedagogicalSettingsChange={(updated) => setPedagogicalSettings(updated)}
      />

      <MenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        userRole={userRole}
        onOpenClinicalCases={() => {
          setIsMenuOpen(false);
          setCurrentPage('clinical_cases');
        }}
        onOpenEducational={() => setIsEducationalOpen(true)}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenAlarms={() => setIsAlarmsModalOpen(true)}
        onOpenAudio={() => setIsAudioSettingsOpen(true)}
        onOpenPatient={() => setIsPatientConfigOpen(true)}
        onOpenQuiz={() => setIsQuizOpen(true)}
        onOpenGasometry={() => setIsGasometryOpen(true)}
        onOpenMissions={() => setIsMissionsOpen(true)}
        onOpenRolePortal={() => setIsRolePortalOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenTeacherAdmin={handleOpenTeacherAdmin}
        onOpenAsynchronies={() => setIsAsynchroniesOpen(true)}
        onOpenFlashcards={() => setIsFlashcardsOpen(true)}
        onOpenDebriefing={() => {
          generateDebriefingReport();
          setIsDebriefingOpen(true);
        }}
      />

      <QuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        onOpenTeacherAdmin={handleOpenTeacherAdmin}
      />

      <ClinicalCaseModal
        isOpen={isClinicalCasesOpen}
        onClose={() => setIsClinicalCasesOpen(false)}
        onLoadCase={handleLoadCase}
        currentMonitored={monitored}
        currentSettings={settings}
        currentPatient={patient}
      />

      <EducationalModal
        isOpen={isEducationalOpen}
        onClose={() => setIsEducationalOpen(false)}
      />

      <DraggableGasometryModal
        isOpen={isGasometryOpen}
        onClose={() => setIsGasometryOpen(false)}
        monitored={monitored}
        patient={patient}
        settings={settings}
      />

      <DraggableMissionsModal
        isOpen={isMissionsOpen}
        onClose={() => setIsMissionsOpen(false)}
        currentCase={activeClinicalCase}
        monitoredData={monitored}
        settings={settings}
        patient={patient}
        onOpenCases={() => setCurrentPage('clinical_cases')}
        currentPhaseIndex={currentPhaseIndex}
        onNextPhase={() => {
          if (activeClinicalCase?.phases && currentPhaseIndex < activeClinicalCase.phases.length - 1) {
            const nextIdx = currentPhaseIndex + 1;
            const nextPhase = activeClinicalCase.phases[nextIdx];
            setCurrentPhaseIndex(nextIdx);
            if (nextPhase.patientOverrides) {
              setPatient((p) => ({ ...p, ...nextPhase.patientOverrides }));
            }
            audioEngine.playConfirmBeep();
            setDeteriorationWarning(`⚡ Avançou para ${nextPhase.name}! A gravidade pulmonar aumentou.`);
          }
        }}
        hasDeteriorated={hasDeteriorated}
        deteriorationWarning={deteriorationWarning}
        onOpenDebriefing={() => {
          generateDebriefingReport();
          setIsDebriefingOpen(true);
        }}
      />

      <PatientConfigModal
        isOpen={isPatientConfigOpen}
        onClose={() => setIsPatientConfigOpen(false)}
        patient={patient}
        onUpdatePatient={setPatient}
        blindMechanicsActive={pedagogicalSettings.blindMechanicsEnabled}
        userRole={userRole}
      />

      <AlarmManagerModal
        isOpen={isAlarmsModalOpen}
        onClose={() => setIsAlarmsModalOpen(false)}
        limits={alarmLimits}
        onUpdateLimits={setAlarmLimits}
        activeAlarms={activeAlarms}
        alarmHistory={alarmHistory}
        isSilenceActive={isSilenceActive}
        onToggleSilence={handleToggleSilence}
      />

      <ClinicalCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApplyVt={(targetVt) => setSettings((s) => ({ ...s, tidalVolume: targetVt }))}
        onSelectFormulaOverlay={setActiveFormulaOverlay}
      />

      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        spo2={monitored.spo2}
      />

      <InteractiveTour
        isOpen={isInteractiveTourOpen && isVentilating}
        onClose={() => setIsInteractiveTourOpen(false)}
        onComplete={() => educationalStorage.setTourCompleted(true)}
      />

      <TeacherAuthModal
        isOpen={isTeacherAuthOpen}
        onClose={() => setIsTeacherAuthOpen(false)}
        onSuccess={handleTeacherAuthSuccess}
      />

      <DebriefingModal
        isOpen={isDebriefingOpen}
        onClose={() => setIsDebriefingOpen(false)}
        report={currentDebriefingReport}
        onRestartCase={() => {
          if (activeClinicalCase) {
            handleLoadCase(activeClinicalCase);
          }
        }}
      />

      <FlashcardsModal
        isOpen={isFlashcardsOpen}
        onClose={() => setIsFlashcardsOpen(false)}
        onApplyPresetToSimulator={(preset) => {
          if (!preset) return;
          if (preset.mode) setSettings((s) => ({ ...s, mode: preset.mode! }));
          if (preset.peep !== undefined) setSettings((s) => ({ ...s, peep: preset.peep! }));
          if (preset.tidalVolume !== undefined) setSettings((s) => ({ ...s, tidalVolume: preset.tidalVolume! }));
          if (preset.respiratoryRate !== undefined) setSettings((s) => ({ ...s, respiratoryRate: preset.respiratoryRate! }));
          if (preset.compliance !== undefined) setPatient((p) => ({ ...p, compliance: preset.compliance! }));
          if (preset.resistance !== undefined) setPatient((p) => ({ ...p, resistance: preset.resistance! }));
          if (preset.spontaneousDrive !== undefined) setPatient((p) => ({ ...p, spontaneousDrive: preset.spontaneousDrive! }));
          audioEngine.playConfirmBeep();
          setIsFlashcardsOpen(false);
        }}
      />

      <CardiacArrestEmergencyModal
        isOpen={isCardiacArrestModalOpen}
        onClose={() => setIsCardiacArrestModalOpen(false)}
        monitored={monitored}
        currentSettings={settings}
        onApplyRescueSettings={(rescueSettings) => {
          setSettings(rescueSettings);
          setDraftSettings(rescueSettings);
          // Rapid stabilization bounce on rescue
          setPatient((p) => ({
            ...p,
            shuntFraction: Math.max(10, Math.round((p.shuntFraction ?? 20) * 0.7)),
          }));
          audioEngine.playConfirmBeep();
        }}
        onRestartCase={() => {
          if (activeClinicalCase) {
            handleLoadCase(activeClinicalCase);
          } else {
            physicsEngine.reset();
            setSettings({ ...settings, fio2: 60, peep: 8, respiratoryRate: 16 });
          }
        }}
        onOpenDebriefing={() => {
          generateDebriefingReport();
          setIsDebriefingOpen(true);
        }}
      />
    </div>
  );
}
