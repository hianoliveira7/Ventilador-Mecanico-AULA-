import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Play, User, Activity, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, GripVertical, Heart, SlidersHorizontal, Lock, Users, Maximize } from 'lucide-react';
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
import { TeacherMirrorGridModal } from './components/TeacherMirrorGridModal';
import { InteractiveTour } from './components/InteractiveTour';
import { DebriefingModal } from './components/DebriefingModal';
import { FlashcardsModal } from './components/FlashcardsModal';
import { VentilatorAdmissionScreen } from './components/VentilatorAdmissionScreen';
import { CardiacArrestEmergencyModal } from './components/CardiacArrestEmergencyModal';
import { KahootPortalModal } from './components/KahootPortalModal';
import { KahootResultModal } from './components/KahootResultModal';
import { KahootTopBanner } from './components/KahootTopBanner';
import { RoleActionPanel, TeamRole } from './components/RoleActionPanel';
import { localDatabase, KahootRoom, StudentGameResult } from './services/localDatabase';
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
  const [caseElapsedSeconds, setCaseElapsedSeconds] = useState<number>(0);
  const [caseInterventions, setCaseInterventions] = useState<CaseIntervention[]>([]);
  const [viliExposureSeconds, setViliExposureSeconds] = useState<number>(0);
  const [highPlateauSeconds, setHighPlateauSeconds] = useState<number>(0);
  const [hasDeteriorated, setHasDeteriorated] = useState<boolean>(false);
  const [deteriorationWarning, setDeteriorationWarning] = useState<string | null>(null);
  const [deteriorationSecondsCounter, setDeteriorationSecondsCounter] = useState<number>(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(0);
  const lastSurpriseTimestampRef = useRef<number>(0);

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

  const isFisioterapeutaRole = (role: TeamRole | string, roomMode?: 'team' | 'individual'): boolean => {
    if (roomMode === 'individual') return true;
    return role === 'Fisioterapeuta Respiratório' || role === 'Todos';
  };

  const hasChanges = JSON.stringify(draftSettings) !== JSON.stringify(settings);

  const handleConfirmSettings = () => {
    // Role verification for Kahoot team session: Only Fisioterapeuta can change ventilator settings
    if (activeKahootSession && activeKahootSession.room.mode === 'team') {
      const isFisio = isFisioterapeutaRole(activeTeamRole, activeKahootSession.room.mode);
      if (!isFisio) {
        console.warn(
          `[Kahoot Collaboration] ⛔ handleConfirmSettings Blocked: Role "${activeTeamRole}" (${activeKahootSession.studentName}) attempted to confirm ventilator parameters in team mode. Only "Fisioterapeuta Respiratório" can modify ventilator settings.`
        );
        audioEngine.playClick(600);
        return;
      }
    }

    audioEngine.playConfirmBeep();

    // Record clinical interventions for debriefing report
    if (activeClinicalCase) {
      const elapsed = Math.max(1, caseElapsedSeconds);
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
    heartRate: 75,
    systolicBP: 120,
    diastolicBP: 80,
    meanArterialPressure: 93,
    cardiacOutput: 5.2,
    cardiacIndex: 2.8,
    pulsePressureVariation: 8,
    strokeVolume: 70,
  });

  // Critical Cardiac Arrest (PCR) Emergency Trigger (SpO2 <= 35%)
  const [isPatientDeceased, setIsPatientDeceased] = useState<boolean>(false);

  useEffect(() => {
    if (!isVentilating || isPatientDeceased || isDebriefingOpen) return;
    if (
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
  }, [monitored.spo2, isCardiacArrestModalOpen, isVentilating, isPatientDeceased, isDebriefingOpen]);

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
  const [isTeacherMirrorGridOpen, setIsTeacherMirrorGridOpen] = useState<boolean>(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(false);

  // Multidisciplinary Team Role State
  const [activeTeamRole, setActiveTeamRole] = useState<TeamRole>('Fisioterapeuta Respiratório');
  const [isRoleActionPanelOpen, setIsRoleActionPanelOpen] = useState<boolean>(false);

  // Kahoot Gamified Mode State
  const [isKahootPortalOpen, setIsKahootPortalOpen] = useState<boolean>(false);
  const [isKahootResultModalOpen, setIsKahootResultModalOpen] = useState<boolean>(false);
  const [kahootResult, setKahootResult] = useState<StudentGameResult | null>(null);
  const [activeKahootSession, setActiveKahootSession] = useState<{
    studentName: string;
    room: KahootRoom;
    case: ClinicalCase;
    remainingSeconds: number;
    timeLimitSeconds: number;
    teamName?: string;
  } | null>(null);

  const handleStartKahootSession = (
    studentName: string,
    room: KahootRoom,
    selectedCase: ClinicalCase,
    teamRole?: string,
    teamName?: string
  ) => {
    if (teamRole) {
      setActiveTeamRole(teamRole as TeamRole);
    }
    setIsRoleActionPanelOpen(true);
    handleLoadCase(selectedCase);
    setIsVentilating(false);
    setCaseElapsedSeconds(0);
    const timeLimitSeconds = room.timeLimitMinutes * 60;
    const effectiveTeamName = teamName || (room.mode === 'team' ? 'Equipe UTI Alfa' : undefined);
    
    const sessionStart = Date.now();
    sessionStartTimeRef.current = sessionStart;

    // Reset collaboration sync refs to clean slate for new session
    lastSettingsTimestampRef.current = sessionStart;
    lastPatientTimestampRef.current = sessionStart;
    lastPublishedSettingsHashRef.current = '';
    lastPublishedPatientHashRef.current = '';
    lastPublishedVentilatingRef.current = null;
    isApplyingRemoteSettingsRef.current = false;
    isApplyingRemotePatientRef.current = false;

    // If team mode, clear any stale teamResult in cloud so new joiners don't get immediate completion
    if (effectiveTeamName) {
      localDatabase.publishRoomState(
        room.code,
        {
          teamResult: null,
          sessionStatus: 'active',
          sessionStartedAt: sessionStart,
        },
        effectiveTeamName,
        {
          role: teamRole || activeTeamRole,
          author: studentName,
          actionType: 'session_start',
        }
      );
    }

    setActiveKahootSession({
      studentName,
      room,
      case: selectedCase,
      remainingSeconds: timeLimitSeconds,
      timeLimitSeconds,
      teamName: effectiveTeamName,
    });
  };

  const handleFinishKahootSession = useCallback(() => {
    setActiveKahootSession((currentSession) => {
      if (!currentSession) return null;
      const elapsedSeconds = currentSession.timeLimitSeconds - currentSession.remainingSeconds;
      const isTeam = currentSession.room.mode === 'team' || Boolean(currentSession.teamName);
      const result = localDatabase.evaluateStudentPerformance(
        currentSession.studentName,
        currentSession.room.code,
        currentSession.case,
        monitored,
        settings,
        patient,
        elapsedSeconds,
        currentSession.timeLimitSeconds,
        currentSession.teamName,
        isTeam,
        activeTeamRole
      );

      // In team mode, publish the final teamResult to the shared team state doc so all teammates receive the exact same score simultaneously
      if (isTeam && currentSession.teamName) {
        console.log(`[Kahoot Collaboration] 📢 Publishing unified teamResult to team "${currentSession.teamName}"`);
        localDatabase.publishRoomState(
          currentSession.room.code,
          {
            teamResult: result,
            sessionStatus: 'completed',
          },
          currentSession.teamName,
          {
            role: activeTeamRole,
            author: currentSession.studentName,
            actionType: 'team_completed',
          }
        );
      }

      setKahootResult(result);
      setIsKahootResultModalOpen(true);
      return null;
    });
  }, [monitored, settings, patient, activeTeamRole]);

  // Live Kahoot Timer Countdown & Presence Heartbeat
  useEffect(() => {
    if (!activeKahootSession) return;

    if (activeKahootSession.remainingSeconds <= 0) {
      handleFinishKahootSession();
      return;
    }

    const timer = setTimeout(() => {
      setActiveKahootSession((prev) => {
        if (!prev) return null;
        if (prev.remainingSeconds <= 1) {
          return { ...prev, remainingSeconds: 0 };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeKahootSession?.remainingSeconds, activeKahootSession === null, handleFinishKahootSession]);

  // Real-time Role Presence Heartbeat & Tab Unload Cleanup
  useEffect(() => {
    if (!activeKahootSession) return;

    const roomCode = activeKahootSession.room.code;
    const studentName = activeKahootSession.studentName;
    const teamName = activeKahootSession.teamName;

    // Send initial presence ping
    localDatabase.pingRolePresence(roomCode, activeTeamRole, studentName, teamName);

    // Heartbeat ping every 8 seconds
    const heartbeatInterval = setInterval(() => {
      localDatabase.pingRolePresence(roomCode, activeTeamRole, studentName, teamName);
    }, 8000);

    // Release role on tab close or page hide
    const handleUnload = () => {
      localDatabase.releaseRolePresence(roomCode, activeTeamRole, studentName, teamName);
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      localDatabase.releaseRolePresence(roomCode, activeTeamRole, studentName, teamName);
    };
  }, [activeKahootSession?.room.code, activeKahootSession?.studentName, activeKahootSession?.teamName, activeTeamRole]);



  useEffect(() => {
    // Initial sync from Firestore
    educationalStorage.syncFromFirestore().catch((err) => {
      console.warn('Initial Firestore sync error:', err);
    });

    // Start real-time bidirectional listening
    const cleanupSync = educationalStorage.initBidirectionalSync();
    localDatabase.init();

    // Subscribe to pedagogical settings updates from Firestore/localStorage
    const unsubSettings = educationalStorage.subscribePedagogicalSettings((newSettings) => {
      setPedagogicalSettings(newSettings);
    });

    return () => {
      cleanupSync();
      unsubSettings();
    };
  }, []);

  const handleSelectRole = (role: UserRole) => {
    setUserRole(role);
    if (role) {
      educationalStorage.setUserRole(role);
    }
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
    setIsTeacherAuthOpen(true);
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

  const settingsRef = useRef(settings);
  const draftSettingsRef = useRef(draftSettings);
  const patientRef = useRef(patient);
  const monitoredRef = useRef(monitored);
  const maneuverStateRef = useRef(maneuverState);
  const alarmLimitsRef = useRef(alarmLimits);

  useEffect(() => {
    settingsRef.current = settings;
    draftSettingsRef.current = draftSettings;
    patientRef.current = patient;
    monitoredRef.current = monitored;
    maneuverStateRef.current = maneuverState;
    alarmLimitsRef.current = alarmLimits;
  }, [settings, draftSettings, patient, monitored, maneuverState, alarmLimits]);

  // Kahoot Real-time State Synchronization & Race Condition Controls
  const isApplyingRemoteSettingsRef = useRef<boolean>(false);
  const isApplyingRemotePatientRef = useRef<boolean>(false);
  const lastSettingsTimestampRef = useRef<number>(0);
  const lastPatientTimestampRef = useRef<number>(0);
  const lastPublishedSettingsHashRef = useRef<string>('');
  const lastPublishedPatientHashRef = useRef<string>('');
  const lastPublishedMonitoredHashRef = useRef<string>('');
  const lastPublishedVentilatingRef = useRef<boolean | null>(null);
  const sessionStartTimeRef = useRef<number>(0);

  // Kahoot Ingestion Channel: Listen for verified remote updates from peers & teacher
  useEffect(() => {
    if (!activeKahootSession) return;

    const roomCode = activeKahootSession.room.code;
    const teamName = activeKahootSession.teamName;
    const isTeamMode = activeKahootSession.room.mode === 'team';

    console.log(
      `[Kahoot Collaboration] 🚀 Initializing sync for room "${roomCode}" [Mode: "${activeKahootSession.room.mode}" | Team: "${teamName || 'Principal'}" | Role: "${activeTeamRole}" | Student: "${activeKahootSession.studentName}"]`
    );

    // Subscribe to remote updates from other devices in the same room & group
    const unsubscribe = localDatabase.subscribeRoomState(roomCode, (remoteState) => {
      if (!remoteState) return;

      const packetTime = remoteState.updatedAt || Date.now();

      // 1. Settings Synchronization (Restricted to Fisioterapeuta)
      if (remoteState.settings) {
        if (!remoteState.updatedAt || packetTime >= lastSettingsTimestampRef.current) {
          if (remoteState.updatedAt) lastSettingsTimestampRef.current = remoteState.updatedAt;

          const senderRole = remoteState.senderRole;
          const isUnauthorizedSender = isTeamMode && senderRole && senderRole !== 'Fisioterapeuta Respiratório' && senderRole !== 'Todos';

          if (isUnauthorizedSender) {
            console.warn(
              `[Kahoot Collaboration] ⛔ Ingestion Verification Blocked: Remote settings sent by "${remoteState.senderAuthor || 'unknown'}" with role "${senderRole}". Only "Fisioterapeuta Respiratório" can modify ventilator parameters in a team session. Ignoring incoming settings.`
            );
          } else {
            const curSettings = settingsRef.current;
            const settingsHash = JSON.stringify(remoteState.settings);
            if (JSON.stringify(curSettings) !== settingsHash) {
              console.log(
                `[Kahoot Collaboration] 🔄 Applying verified remote ventilator settings (Mode: ${remoteState.settings.mode}, Vt: ${remoteState.settings.tidalVolume}, PEEP: ${remoteState.settings.peep}, FiO2: ${remoteState.settings.fio2}, RR: ${remoteState.settings.respiratoryRate})`
              );
              isApplyingRemoteSettingsRef.current = true;
              settingsRef.current = remoteState.settings;
              setSettings(remoteState.settings);
              lastPublishedSettingsHashRef.current = settingsHash;
              // Only overwrite draftSettings if student has no pending unconfirmed draft
              setDraftSettings((prevDraft) => {
                const isEditing = JSON.stringify(prevDraft) !== JSON.stringify(curSettings);
                return isEditing ? prevDraft : remoteState.settings;
              });
            }
          }
        }
      }

      // 2. Apply Patient Interventions (Doctor/Nurse actions: sedation, bronchodilator, suction, cuff, etc.)
      if (remoteState.patient) {
        if (!remoteState.updatedAt || packetTime >= lastPatientTimestampRef.current) {
          if (remoteState.updatedAt) lastPatientTimestampRef.current = remoteState.updatedAt;

          const curPatient = patientRef.current;
          const patientHash = JSON.stringify(remoteState.patient);
          if (JSON.stringify(curPatient) !== patientHash) {
            console.log(
              `[Kahoot Collaboration] 🩺 Applying remote patient physiological update from "${remoteState.senderRole || 'Peer'}":`,
              {
                compliance: remoteState.patient.compliance,
                resistance: remoteState.patient.resistance,
                spontaneousDrive: remoteState.patient.spontaneousDrive,
                secretions: remoteState.patient.secretionsSeverity,
                leak: remoteState.patient.circuitLeakPercent,
              }
            );
            isApplyingRemotePatientRef.current = true;
            patientRef.current = remoteState.patient;
            setPatient(remoteState.patient);
            lastPublishedPatientHashRef.current = patientHash;
          }
        }
      }

      // 3. Apply Telemetry / Vitals (SpO2, PaO2, PaCO2, pH, HR, BP, PIP, Vte, MV)
      if (remoteState.monitored) {
        physicsEngine.syncRemoteMonitoredState(remoteState.monitored);
        setMonitored((prev) => ({
          ...prev,
          ...remoteState.monitored,
        }));
      }

      // 4. Ventilation power state (Start / Standby)
      if (typeof remoteState.isVentilating === 'boolean') {
        setIsVentilating((prev) => {
          if (prev !== remoteState.isVentilating) {
            console.log(`[Kahoot Collaboration] ⚡ Ventilation power state synced remotely: isVentilating = ${remoteState.isVentilating}`);
            lastPublishedVentilatingRef.current = remoteState.isVentilating;
            return remoteState.isVentilating;
          }
          return prev;
        });
      }

      // 5. Teacher Surprise Events
      if (remoteState.surpriseEvent && remoteState.surpriseEvent.timestamp > lastSurpriseTimestampRef.current) {
        lastSurpriseTimestampRef.current = remoteState.surpriseEvent.timestamp;
        console.log(`[Kahoot Collaboration] 🚨 Teacher surprise event received: "${remoteState.surpriseEvent.title}"`);
        setDeteriorationWarning(`${remoteState.surpriseEvent.title}: ${remoteState.surpriseEvent.description}`);
        audioEngine.triggerAlarmPattern('high');
        if (remoteState.surpriseEvent.complianceOverride) {
          setPatient((p) => ({
            ...p,
            compliance: remoteState.surpriseEvent.complianceOverride,
            resistance: remoteState.surpriseEvent.resistanceOverride || p.resistance,
          }));
        }
      }

      // 6. Unified Team Completion: When any teammate completes the session, sync score to all teammates
      if (remoteState.teamResult) {
        if (!remoteState.teamResult.submittedAt || remoteState.teamResult.submittedAt >= sessionStartTimeRef.current - 2000) {
          console.log(`[Kahoot Collaboration] 🏆 Group session completed by teammate! Synchronizing unified group result:`, remoteState.teamResult);
          setKahootResult(remoteState.teamResult);
          setIsKahootResultModalOpen(true);
          setActiveKahootSession(null);
        } else {
          console.log(`[Kahoot Collaboration] ℹ️ Ignoring stale teamResult from previous session (submittedAt: ${remoteState.teamResult.submittedAt}, sessionStart: ${sessionStartTimeRef.current})`);
        }
      }
    }, teamName);

    return () => {
      console.log(`[Kahoot Collaboration] 🔌 Disconnecting sync listener for room "${roomCode}"`);
      unsubscribe();
    };
  }, [activeKahootSession?.room.code, activeKahootSession?.teamName, activeKahootSession?.room.mode, activeTeamRole]);

  // Publish Channel A: Ventilator Parameters & Power (STRICTLY RESTRICTED TO FISIOTERAPEUTA)
  useEffect(() => {
    if (!activeKahootSession) return;

    // Echo prevention: if this state change was caused by a remote update, do not re-broadcast
    if (isApplyingRemoteSettingsRef.current) {
      isApplyingRemoteSettingsRef.current = false;
      return;
    }

    const roomCode = activeKahootSession.room.code;
    const teamName = activeKahootSession.teamName;
    const settingsHash = JSON.stringify(settings);
    const hasSettingsChanged = settingsHash !== lastPublishedSettingsHashRef.current;
    const hasVentilatingChanged = isVentilating !== lastPublishedVentilatingRef.current;

    if (!hasSettingsChanged && !hasVentilatingChanged) {
      return;
    }

    // ROLE VERIFICATION: Only Fisioterapeuta (or Todos / individual mode) can push ventilator changes
    const isAuthorized = isFisioterapeutaRole(activeTeamRole, activeKahootSession.room.mode);

    if (!isAuthorized) {
      if (hasSettingsChanged) {
        console.warn(
          `[Kahoot Collaboration] ⛔ STATE VERIFICATION BLOCKED: Student "${activeKahootSession.studentName}" has role "${activeTeamRole}" and attempted to modify ventilator parameters. Only "Fisioterapeuta Respiratório" has authority to push ventilator settings in team mode. Changes were NOT pushed to shared session state.`
        );
      }
      return;
    }

    // Role verified: Push ventilator parameter updates
    lastPublishedSettingsHashRef.current = settingsHash;
    lastPublishedVentilatingRef.current = isVentilating;

    console.log(
      `[Kahoot Collaboration] ✅ STATE VERIFICATION PASSED: Fisioterapeuta "${activeKahootSession.studentName}" pushing verified ventilator settings to room "${roomCode}" [Team: "${teamName || 'Principal'}"]`,
      {
        mode: settings.mode,
        tidalVolume: settings.tidalVolume,
        peep: settings.peep,
        fio2: settings.fio2,
        respiratoryRate: settings.respiratoryRate,
        isVentilating,
      }
    );

    localDatabase.publishRoomState(
      roomCode,
      {
        settings,
        isVentilating,
        activeCaseId: activeClinicalCase?.id,
      },
      teamName,
      {
        role: activeTeamRole,
        author: activeKahootSession.studentName,
        actionType: 'ventilator_parameters',
      }
    );
  }, [
    settings,
    isVentilating,
    activeTeamRole,
    activeKahootSession?.room.code,
    activeKahootSession?.teamName,
    activeKahootSession?.room.mode,
    activeKahootSession?.studentName,
    activeClinicalCase?.id,
  ]);

  // Publish Channel B: Patient Physiological Interventions (Doctor, Nurse, Multidisciplinary actions)
  useEffect(() => {
    if (!activeKahootSession) return;

    // Echo prevention: if this state change was caused by a remote update, do not re-broadcast
    if (isApplyingRemotePatientRef.current) {
      isApplyingRemotePatientRef.current = false;
      return;
    }

    const patientHash = JSON.stringify(patient);
    if (patientHash === lastPublishedPatientHashRef.current) {
      return;
    }

    lastPublishedPatientHashRef.current = patientHash;
    const roomCode = activeKahootSession.room.code;
    const teamName = activeKahootSession.teamName;

    console.log(
      `[Kahoot Collaboration] 🩺 Role "${activeTeamRole}" (${activeKahootSession.studentName}) pushing clinical patient updates to room "${roomCode}" [Team: "${teamName || 'Principal'}"] (WITHOUT overwriting ventilator settings):`,
      {
        compliance: patient.compliance,
        resistance: patient.resistance,
        spontaneousDrive: patient.spontaneousDrive,
        secretions: patient.secretionsSeverity,
        leak: patient.circuitLeakPercent,
      }
    );

    localDatabase.publishRoomState(
      roomCode,
      {
        patient,
        activeCaseId: activeClinicalCase?.id,
      },
      teamName,
      {
        role: activeTeamRole,
        author: activeKahootSession.studentName,
        actionType: 'patient_parameters',
      }
    );
  }, [
    patient,
    activeTeamRole,
    activeKahootSession?.room.code,
    activeKahootSession?.teamName,
    activeKahootSession?.studentName,
    activeClinicalCase?.id,
  ]);

  // Publish Channel C: Real-Time Telemetry & Vitals (SpO2, PaO2, PaCO2, pH, HR, BP, PIP, Vte)
  useEffect(() => {
    if (!activeKahootSession) return;

    // Only active simulator drivers or Fisioterapeuta broadcast telemetry to prevent write thrashing
    const isPrimaryDriver = isFisioterapeutaRole(activeTeamRole, activeKahootSession.room.mode);
    if (!isPrimaryDriver) return;

    const roomCode = activeKahootSession.room.code;
    const teamName = activeKahootSession.teamName;

    const telemetryTimer = setInterval(() => {
      const curMon = monitoredRef.current;
      const monHash = `${curMon.spo2}_${curMon.peakPressure}_${curMon.vte}_${curMon.pao2}_${curMon.ph}_${curMon.heartRate}`;

      if (monHash !== lastPublishedMonitoredHashRef.current) {
        lastPublishedMonitoredHashRef.current = monHash;
        localDatabase.publishRoomState(
          roomCode,
          {
            monitored: {
              spo2: curMon.spo2,
              pao2: curMon.pao2,
              paco2: curMon.paco2,
              ph: curMon.ph,
              hco3: curMon.hco3,
              peakPressure: curMon.peakPressure,
              plateauPressure: curMon.plateauPressure,
              peepTotal: curMon.peepTotal,
              autoPeep: curMon.autoPeep,
              drivingPressure: curMon.drivingPressure,
              vte: curMon.vte,
              minuteVolume: curMon.minuteVolume,
              totalRate: curMon.totalRate,
              heartRate: curMon.heartRate,
              systolicBP: curMon.systolicBP,
              diastolicBP: curMon.diastolicBP,
              meanArterialPressure: curMon.meanArterialPressure,
            },
          },
          teamName,
          {
            role: activeTeamRole,
            author: activeKahootSession.studentName,
            actionType: 'telemetry_vitals',
          }
        );
      }
    }, 200);

    return () => clearInterval(telemetryTimer);
  }, [
    monitored,
    activeTeamRole,
    activeKahootSession?.room.code,
    activeKahootSession?.teamName,
    activeKahootSession?.room.mode,
    activeKahootSession?.studentName,
  ]);

  // Track browser tab visibility (pause simulation when backgrounded or hidden)
  const [isDocumentVisible, setIsDocumentVisible] = useState<boolean>(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Compute whether the user is actively viewing and interacting with the main simulator screen
  const isSimulatorActive =
    isDocumentVisible &&
    currentPage === 'simulator' &&
    isVentilating &&
    !maneuverState.isFrozen &&
    !isPatientDeceased &&
    !isRolePortalOpen &&
    !isTeacherAdminOpen &&
    !isTeacherAuthOpen &&
    !isTutorialOpen &&
    !isFlashcardsOpen &&
    !isDebriefingOpen &&
    !isQuizOpen &&
    !isKahootPortalOpen &&
    !isKahootResultModalOpen &&
    !isCardiacArrestModalOpen &&
    !isPatientConfigOpen &&
    !isAlarmsModalOpen &&
    !isAudioSettingsOpen &&
    !isEducationalOpen &&
    !isMenuOpen;

  const isSimulatorActiveRef = useRef(isSimulatorActive);
  useEffect(() => {
    isSimulatorActiveRef.current = isSimulatorActive;
  }, [isSimulatorActive]);

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

  // Tablet & Responsive Screen Adaptation State
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [windowHeight, setWindowHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const [tabletView, setTabletView] = useState<'waveforms' | 'monitor' | 'split'>('split');

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTabletOrCompact = windowWidth < 1200;

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
      if (isSimulatorActiveRef.current && monitored.spo2 > 0) {
        audioEngine.playSpO2Pulse(monitored.spo2);
      }
    }, 850);

    return () => clearInterval(pulseTimer);
  }, [monitored.spo2]);



  // Main High-Frequency Physics Engine Loop (60 Hz for fluid curves, ~4 Hz for DOM telemetry to prevent tablet stutter)
  useEffect(() => {
    const dt = 0.0166; // 60fps time step
    let lastMonitoredUpdate = 0;

    const interval = setInterval(() => {
      if (!isSimulatorActiveRef.current) return;

      const { sample, monitored: newMonitored } = physicsEngine.step(
        dt,
        settingsRef.current,
        patientRef.current,
        maneuverStateRef.current
      );

      setCurrentSample(sample);

      // Throttle React DOM state update of numerical telemetry to ~4Hz (every 240ms) for high performance on tablets,
      // while updating immediately if a diagnostic maneuver (Insp/Exp Pause) is active
      const now = performance.now();
      if (
        now - lastMonitoredUpdate >= 240 ||
        maneuverStateRef.current.inspiratoryHoldActive ||
        maneuverStateRef.current.expiratoryHoldActive
      ) {
        lastMonitoredUpdate = now;
        setMonitored(newMonitored);
      }
    }, 16);

    return () => clearInterval(interval);
  }, []);

  // Alarm Evaluation Engine (1 Hz)
  useEffect(() => {
    const checkAlarms = () => {
      if (!isSimulatorActiveRef.current) {
        setActiveAlarms([]);
        audioEngine.stopAlarm();
        return;
      }
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
  }, [monitored, isSilenceActive, isAudioMuted, isVentilating]);

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
    if (activeKahootSession && !isFisioterapeutaRole(activeTeamRole, activeKahootSession.room.mode)) {
      audioEngine.playClick(600);
      setDeteriorationWarning(
        `🔒 Competência Exclusiva: Sua função é "${activeTeamRole}". Manobras de pausa inspiratória e medição de Pplat são restritas ao Fisioterapeuta Respiratório.`
      );
      return;
    }
    setManeuverState((prev) => ({
      ...prev,
      inspiratoryHoldActive: !prev.inspiratoryHoldActive,
      expiratoryHoldActive: false,
    }));
  };

  const handleStartInspHold = () => {
    if (activeKahootSession && !isFisioterapeutaRole(activeTeamRole, activeKahootSession.room.mode)) {
      audioEngine.playClick(600);
      setDeteriorationWarning(
        `🔒 Competência Exclusiva: Sua função é "${activeTeamRole}". Manobras de pausa inspiratória e medição de Pplat são restritas ao Fisioterapeuta Respiratório.`
      );
      return;
    }
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
    if (activeKahootSession && !isFisioterapeutaRole(activeTeamRole, activeKahootSession.room.mode)) {
      audioEngine.playClick(600);
      setDeteriorationWarning(
        `🔒 Competência Exclusiva: Sua função é "${activeTeamRole}". Manobras de pausa expiratória e medição de Auto-PEEP são restritas ao Fisioterapeuta Respiratório.`
      );
      return;
    }
    setManeuverState((prev) => ({
      ...prev,
      expiratoryHoldActive: !prev.expiratoryHoldActive,
      inspiratoryHoldActive: false,
    }));
  };

  const handleToggleO2Suction = () => {
    setManeuverState((prev) => {
      const isActivating = !prev.o2SuctionActive;
      if (isActivating) {
        audioEngine.playConfirmBeep();
        // Eliminate secretions and reduce airway resistance
        setPatient((pat) => {
          const hadSecretions = pat.secretionsSeverity !== 'none';
          const newResistance = hadSecretions ? Math.max(6, Math.round(pat.resistance * 0.7)) : pat.resistance;
          return {
            ...pat,
            secretionsSeverity: 'none',
            resistance: newResistance,
          };
        });
      }
      return {
        ...prev,
        o2SuctionActive: isActivating,
        o2SuctionTimeRemaining: isActivating ? 120 : 0,
      };
    });
  };

  const handleToggleNebulizer = () => {
    setManeuverState((prev) => ({
      ...prev,
      nebulizerActive: !prev.nebulizerActive,
      nebulizerTimeRemaining: !prev.nebulizerActive ? 600 : 0,
    }));
  };

  const handleToggleRecruitment = () => {
    if (activeKahootSession && !isFisioterapeutaRole(activeTeamRole, activeKahootSession.room.mode)) {
      audioEngine.playClick(600);
      setDeteriorationWarning(
        `🔒 Competência Exclusiva: Sua função é "${activeTeamRole}". Manobras de recrutamento alveolar são restritas ao Fisioterapeuta Respiratório em conjunto com a equipe médica.`
      );
      return;
    }
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
    physicsEngine.triggerManualBreath();
  };

  // Load a full clinical case
  const handleLoadCase = (selectedCase: ClinicalCase) => {
    setActiveClinicalCase(selectedCase);
    setPatient(selectedCase.patientProfile);
    setSettings(selectedCase.initialSettings);
    setDraftSettings(selectedCase.initialSettings);
    setCaseElapsedSeconds(0);
    setCaseInterventions([]);
    setViliExposureSeconds(0);
    setHighPlateauSeconds(0);
    setHasDeteriorated(false);
    setDeteriorationWarning(null);
    setDeteriorationSecondsCounter(0);
    setCurrentPhaseIndex(0);
    setIsCardiacArrestModalOpen(false);
    hasTriggeredPcrRef.current = false;
    setIsPatientDeceased(false);
    
    // Always return to the admission screen (Início do Caso) on case load/restart
    setCurrentPage('simulator');
    setIsVentilating(false);

    physicsEngine.reset(
      selectedCase.patientProfile.compliance,
      selectedCase.patientProfile.resistance,
      selectedCase.initialSettings.peep
    );
  };

  // Restart case/simulation and return to admission screen
  const handleRestartSimulation = useCallback(() => {
    audioEngine.stopFlatlineTone();
    audioEngine.stopAlarm();
    setIsCardiacArrestModalOpen(false);
    setIsDebriefingOpen(false);
    setIsPatientDeceased(false);
    hasTriggeredPcrRef.current = false;
    setCurrentPage('simulator');

    if (activeClinicalCase) {
      handleLoadCase(activeClinicalCase);
    } else {
      setIsVentilating(false);
      physicsEngine.reset();
    }
  }, [activeClinicalCase]);

  // Safety tracking, temporal phase progression and physiological dynamic deterioration
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isSimulatorActiveRef.current || !activeClinicalCase) return;

      setCaseElapsedSeconds((prevElapsed) => {
        const elapsedCaseSec = prevElapsed + 1;

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

        return elapsedCaseSec;
      });

      // VILI Tracking
      if (monitored.drivingPressure > pedagogicalSettings.dpSafetyThreshold) {
        setViliExposureSeconds((s) => s + 1);
      }
      if (monitored.plateauPressure > pedagogicalSettings.platSafetyThreshold) {
        setHighPlateauSeconds((s) => s + 1);
      }

      // Critical Cardiac Arrest (PCR) / Refractory Shock Trigger: SpO2 <= 35% OR Mean Arterial Pressure (PAM) <= 38 mmHg
      const isSevereHypoxia = monitored.spo2 > 0 && monitored.spo2 <= 35;
      const isSevereShock = monitored.meanArterialPressure > 0 && monitored.meanArterialPressure <= 38;
      const isCriticalEmergency = isSevereHypoxia || isSevereShock;

      if (
        !isPatientDeceased &&
        isCriticalEmergency &&
        !isCardiacArrestModalOpen &&
        !hasTriggeredPcrRef.current
      ) {
        hasTriggeredPcrRef.current = true;
        setIsCardiacArrestModalOpen(true);
      } else if (monitored.spo2 > 40 && monitored.meanArterialPressure > 45) {
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
    currentPhaseIndex,
    monitored.drivingPressure,
    monitored.plateauPressure,
    monitored.spo2,
    pedagogicalSettings,
    hasDeteriorated,
    isPatientDeceased,
    isCardiacArrestModalOpen,
  ]);

  // Debriefing Report Generator (After Action Review - AAR)
  const generateDebriefingReport = useCallback((deceased: boolean = false): CaseDebriefingReport => {
    const caseId = activeClinicalCase?.id || 'ventilacao-livre';
    const caseTitle = activeClinicalCase?.title || 'Sessão de Ventilação Prática / Treinamento Geral';
    const studentName = localStorage.getItem('simulador_student_name') || 'Estudante UTI';
    const durationSec = Math.max(5, caseElapsedSeconds);
    const currentGoals = activeClinicalCase?.goals || [];

    let goalsMet = 0;
    if (currentGoals.length > 0) {
      goalsMet = currentGoals.filter((g) => {
        try {
          return g.isMet(monitored, settings, patient);
        } catch {
          return false;
        }
      }).length;
    } else {
      // Protective ventilation metrics in free mode
      const isDpSafe = monitored.drivingPressure <= 15;
      const isPlatSafe = monitored.plateauPressure <= 30;
      const isVtSafe = monitored.vte > 0 && (monitored.vte / Math.max(1, patient.idealBodyWeightKg)) <= 8.0;
      const isSpo2Safe = monitored.spo2 >= 90;
      goalsMet = [isDpSafe, isPlatSafe, isVtSafe, isSpo2Safe].filter(Boolean).length;
    }

    const totalGoals = currentGoals.length > 0 ? currentGoals.length : 4;
    let baseScore = Math.round((goalsMet / Math.max(1, totalGoals)) * 75);
    const viliPenalty = Math.min(25, Math.floor(viliExposureSeconds / 4));
    const platPenalty = Math.min(20, Math.floor(highPlateauSeconds / 3));
    const deteriorationPenalty = hasDeteriorated ? 30 : 0;

    let finalScore = Math.max(15, Math.min(100, baseScore + 25 - viliPenalty - platPenalty - deteriorationPenalty));
    if (goalsMet === totalGoals && !hasDeteriorated && viliExposureSeconds < 15) {
      finalScore = 100;
    }

    if (deceased) {
      finalScore = 15;
    }

    const rating: CaseDebriefingReport['rating'] = deceased
      ? 'Risco Crítico / Iatrogênico'
      : finalScore >= 85
      ? 'Excelente (Padrão Ouro)'
      : finalScore >= 70
      ? 'Adequado / Seguro'
      : finalScore >= 50
      ? 'Risco Moderado'
      : 'Risco Crítico / Iatrogênico';

    const rep: CaseDebriefingReport = {
      id: `rep_${Date.now()}`,
      caseId,
      caseTitle,
      studentName,
      completedAt: new Date().toLocaleString('pt-BR'),
      durationSeconds: durationSec,
      score: finalScore,
      rating,
      goalsCompletedCount: goalsMet,
      totalGoalsCount: totalGoals,
      safetyMetrics: {
        timeUnderViliSeconds: viliExposureSeconds,
        timeHighPlateauSeconds: highPlateauSeconds,
        autoPeepRiskEvents: monitored.autoPeep > 3 ? 1 : 0,
        asynchronyEventsCount: activeAsynchrony ? 1 : 0,
        hadDeterioration: hasDeteriorated,
      },
      interventions: caseInterventions,
      guidelineFeedback: activeClinicalCase?.teachingPoints || [
        'Ventilação protetora com Vt de 4-8 mL/kg de peso predito previne volutrauma e barotrauma.',
        'Manter Driving Pressure ≤ 14-15 cmH₂O e Pressão de Platô ≤ 30 cmH₂O.',
        'Evitar hiperóxia mantendo FiO₂ titulada para alvos de SpO₂ de 92-96%.',
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
    caseElapsedSeconds,
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
      className={`flex flex-col fixed inset-0 h-dvh w-dvw overflow-hidden font-sans select-none touch-manipulation transition-colors ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#050505] text-zinc-100'
      }`}
    >
      {currentPage === 'clinical_cases' ? (
        <ClinicalCasesPage
          onBackToSimulator={() => {
            if (!isVentilating) {
              setIsRolePortalOpen(true);
            }
            setCurrentPage('simulator');
          }}
          onLoadCaseInSimulator={(selectedCase) => {
            handleLoadCase(selectedCase);
            setCurrentPage('simulator');
          }}
          currentMonitored={monitored}
          currentSettings={settings}
          currentPatient={patient}
        />
      ) : !isVentilating ? (
        activeKahootSession && activeKahootSession.room.mode === 'team' && activeTeamRole !== 'Fisioterapeuta Respiratório' && activeTeamRole !== 'Todos' ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#0a0c16] text-zinc-100">
            <div className="max-w-md w-full p-8 rounded-3xl border border-indigo-900/60 bg-[#0f1325] text-center space-y-6 shadow-2xl animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
                <Activity className="w-8 h-8 animate-pulse text-cyan-400" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
                  Sala de Espera da UTI • {activeTeamRole}
                </span>
                <h3 className="text-xl font-display font-black">
                  Aguardando Início da Ventilação
                </h3>
                <p className="text-xs font-sans text-zinc-300 leading-relaxed">
                  Você está logado na equipe <strong className="text-indigo-300">{activeKahootSession.teamName}</strong> como <strong className="text-cyan-300">{activeTeamRole}</strong>. O Fisioterapeuta Respiratório da equipe está configurando a admissão do paciente. A simulação iniciará automaticamente assim que a ventilação for acionada.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-indigo-900/40 flex items-center justify-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-mono text-amber-300 font-bold">
                  Sincronizado em tempo real com a equipe...
                </span>
              </div>
            </div>
          </div>
        ) : (
          <VentilatorAdmissionScreen
            currentCase={activeClinicalCase}
            patient={patient}
            initialSettings={settings}
            onStartVentilation={(configuredSettings) => {
              const safeSettings = { ...configuredSettings };
              if (!safeSettings.inspiratoryTimePCV || safeSettings.inspiratoryTimePCV <= 0) {
                if (safeSettings.mode === 'VCV' || safeSettings.mode === 'SIMV_VC') {
                  const calcFactor = safeSettings.flowWaveform === 'decelerating' ? 0.65 : 1.0;
                  const flow = safeSettings.inspiratoryFlow || 45;
                  const vt = safeSettings.tidalVolume || 420;
                  safeSettings.inspiratoryTimePCV = Number(((vt * 0.06) / (flow * calcFactor)).toFixed(2));
                } else {
                  safeSettings.inspiratoryTimePCV = 1.0;
                }
              }
              setSettings(safeSettings);
              setDraftSettings(safeSettings);
              setIsVentilating(true);
              setCaseElapsedSeconds(0);
              physicsEngine.reset(patient.compliance, patient.resistance, safeSettings.peep);
              audioEngine.playConfirmBeep();
              if (!educationalStorage.hasCompletedTour()) {
                setIsInteractiveTourOpen(true);
              }
            }}
            onOpenCasesList={() => setCurrentPage('clinical_cases')}
            onUpdatePatient={setPatient}
          />
        )
      ) : (
        <>
          {activeKahootSession && (
            <KahootTopBanner
              studentName={activeKahootSession.studentName}
              room={activeKahootSession.room}
              remainingSeconds={activeKahootSession.remainingSeconds}
              timeLimitSeconds={activeKahootSession.timeLimitSeconds}
              onFinishKahootSession={handleFinishKahootSession}
              teamName={activeKahootSession.teamName}
              teamRole={activeTeamRole}
            />
          )}

          {/* 1. Header Bar */}
          {!isHeaderCollapsed ? (
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
              onOpenMirrorGrid={() => setIsTeacherMirrorGridOpen(true)}
              onOpenClinicalCases={() => setCurrentPage('clinical_cases')}
              onOpenQuiz={() => setIsQuizOpen(true)}
              onOpenKahoot={() => setIsKahootPortalOpen(true)}
              onOpenEducational={() => setIsEducationalOpen(true)}
              onOpenGasometry={() => setIsGasometryOpen(true)}
              onOpenMissions={() => setIsMissionsOpen(true)}
              onOpenAsynchronies={() => setIsAsynchroniesOpen(true)}
              onOpenFlashcards={() => setIsFlashcardsOpen(true)}
              onOpenDebriefing={() => {
                generateDebriefingReport();
                setIsDebriefingOpen(true);
              }}
              isHeaderCollapsed={isHeaderCollapsed}
              onToggleHeaderCollapse={() => setIsHeaderCollapsed((prev) => !prev)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsHeaderCollapsed(false)}
              className="fixed top-1 left-1/2 -translate-x-1/2 z-50 p-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center opacity-85 hover:opacity-100 transition-all cursor-pointer border border-blue-400 animate-fadeIn"
              title="Expandir Painel Superior"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

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

      {/* Tablet & Compact Viewport Segmented Control */}
      {isTabletOrCompact && (
        <div
          className={`mx-2 mb-1 px-2.5 py-1 rounded-xl border flex items-center justify-between gap-2 shrink-0 select-none font-mono text-xs transition-colors ${
            isLight
              ? 'bg-white border-slate-200 text-slate-800 shadow-xs'
              : 'bg-[#0b0d16] border-zinc-800 text-zinc-200 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-cyan-500 hidden sm:inline">Exibição Tablet:</span>
            <div className={`flex items-center p-0.5 rounded-lg border ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#121626] border-zinc-700/60'}`}>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick(900);
                  setTabletView('waveforms');
                }}
                className={`px-2 py-0.5 rounded text-[10.5px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 touch-manipulation ${
                  tabletView === 'waveforms'
                    ? 'bg-cyan-500 text-black shadow-xs font-black'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>Gráficos & Dials</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick(900);
                  setTabletView('monitor');
                }}
                className={`px-2 py-0.5 rounded text-[10.5px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 touch-manipulation ${
                  tabletView === 'monitor'
                    ? 'bg-cyan-500 text-black shadow-xs font-black'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Heart className="w-3 h-3 text-rose-400" />
                <span>Painel Clínico</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick(900);
                  setTabletView('split');
                }}
                className={`px-2 py-0.5 rounded text-[10.5px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 touch-manipulation ${
                  tabletView === 'split'
                    ? 'bg-cyan-500 text-black shadow-xs font-black'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Dividido</span>
              </button>
            </div>
          </div>
          <span className="text-[10px] font-mono opacity-60 hidden sm:inline">Tablet Otimizado</span>
        </div>
      )}

      {/* 2. Main Studio Layout (Flexible Split View with Resizable Splitters) */}
      <main
        className={`flex-1 flex min-h-0 overflow-hidden p-2 gap-0 relative transition-colors ${
          isLight ? 'bg-slate-100' : 'bg-[#070709]'
        }`}
      >
        {/* Main Central/Left Workspace: Maximized Waveforms on Top + Mode & Parameters on Bottom */}
        {(!isTabletOrCompact || tabletView !== 'monitor') && (
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
              className={`group relative h-4 my-0.5 w-full cursor-row-resize flex items-center justify-center shrink-0 select-none touch-none z-20 transition-colors before:absolute before:inset-x-0 before:-inset-y-3 before:z-10 ${
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
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border shadow-sm flex items-center justify-center cursor-pointer transition-all hover:scale-110 z-30 touch-manipulation ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:text-cyan-700 hover:border-cyan-400'
                    : 'bg-[#121420] border-zinc-700 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500'
                }`}
                title={isParamPanelCollapsed ? 'Expandir Parâmetros' : 'Recolher Parâmetros'}
              >
                {isParamPanelCollapsed ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
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
                  height: activeKahootSession && isRoleActionPanelOpen
                    ? `${Math.min(Math.floor(windowHeight * 0.45), Math.max(280, paramPanelHeight + 180))}px`
                    : `${Math.min(Math.floor(windowHeight * 0.32), Math.max(145, paramPanelHeight))}px`,
                }}
                className="shrink-0 overflow-y-auto lg:overflow-hidden transition-all flex flex-col"
              >
                {/* Role Action & Collaboration Bar (Only active during Kahoot Cooperative Session) */}
                {activeKahootSession && (() => {
                  const isTeamSession = Boolean(
                    activeKahootSession.room.mode === 'team' || activeKahootSession.teamName
                  );
                  return (
                    <div className={`px-3 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
                      isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0a0d18] border-zinc-800'
                    }`}>
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {isTeamSession ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold">
                            <span className="text-[11px] opacity-80">🔒 Sua Função no Grupo:</span>
                            <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs uppercase shadow-sm">
                              {activeTeamRole}
                            </span>
                          </div>
                        ) : (
                          <>
                            <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 mr-1">
                              Função na UTI:
                            </span>
                            {[
                              { id: 'Fisioterapeuta Respiratório', label: '🫁 Fisio' },
                              { id: 'Médico Intensivista', label: '🩺 Médico' },
                              { id: 'Enfermeiro(a) UTI', label: '💊 Enfermagem' },
                              { id: 'Todos', label: '🤝 Todos' },
                            ].map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  setActiveTeamRole(r.id as TeamRole);
                                  setIsRoleActionPanelOpen(true);
                                }}
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                                  activeTeamRole === r.id
                                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                                    : isLight
                                    ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    : 'bg-[#121626] text-zinc-400 border-zinc-800 hover:text-white'
                                }`}
                              >
                                {r.label}
                              </button>
                            ))}
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsRoleActionPanelOpen((prev) => !prev)}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isRoleActionPanelOpen
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                            : isLight
                            ? 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300'
                            : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>{isRoleActionPanelOpen ? 'Ocultar Painel Multidisciplinar' : '⚡ Ações da Equipe UTI'}</span>
                      </button>
                    </div>
                  );
                })()}

                {activeKahootSession && isRoleActionPanelOpen && (
                  <div className="p-2 shrink-0 max-h-72 overflow-y-auto">
                    <RoleActionPanel
                      teamRole={activeTeamRole}
                      patient={patient}
                      settings={settings}
                      monitored={monitored}
                      onUpdatePatient={(upd) => setPatient((prev) => ({ ...prev, ...upd }))}
                      onUpdateSettings={(upd) => {
                        if (!isFisioterapeutaRole(activeTeamRole, activeKahootSession?.room.mode)) {
                          console.warn(
                            `[Kahoot Collaboration] ⛔ Blocked onUpdateSettings in RoleActionPanel by non-Fisio role "${activeTeamRole}". Only Fisioterapeuta can adjust ventilator parameters.`
                          );
                          return;
                        }
                        setSettings((prev) => ({ ...prev, ...upd }));
                        setDraftSettings((prev) => ({ ...prev, ...upd }));
                      }}
                      roomCode={activeKahootSession?.room.code}
                      teamName={activeKahootSession?.teamName}
                      isLight={isLight}
                    />
                  </div>
                )}

                {(activeTeamRole === 'Fisioterapeuta Respiratório' || activeTeamRole === 'Todos' || !activeKahootSession || activeKahootSession.room.mode === 'individual') && (
                  <div className="flex-1 min-h-[145px]">
                    <ParameterControls
                      settings={settings}
                      draftSettings={draftSettings}
                      onUpdateDraft={handleUpdateDraft}
                      hasChanges={hasChanges}
                      onConfirm={handleConfirmSettings}
                      onDiscard={handleDiscardSettings}
                      isReadOnly={false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Draggable Resizer Splitter between Graph Area and Clinical Data Panel */}
        {(!isTabletOrCompact || tabletView === 'split') && !isRightPanelCollapsed && (
          <div
            onPointerDown={handleSplitterPointerDown}
            onDoubleClick={() => setRightPanelWidth(330)}
            title="Arraste para ajustar a largura do painel de dados clínicos (duplo clique para restaurar 330px)"
            className={`group relative w-3.5 sm:w-4 mx-0.5 h-full cursor-col-resize flex items-center justify-center shrink-0 select-none touch-none z-20 transition-colors before:absolute before:inset-y-0 before:-inset-x-3 before:z-10 ${
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
              className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border shadow-md flex items-center justify-center cursor-pointer transition-all hover:scale-110 z-30 touch-manipulation ${
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
        )}

        {/* Right Column: Monitorization & Mechanics (User Resizable Width or Tablet Full Width) */}
        {(!isTabletOrCompact ? !isRightPanelCollapsed : (tabletView === 'monitor' || (tabletView === 'split' && !isRightPanelCollapsed))) && (
          <div
            id="tour-monitored"
            style={{
              width: isTabletOrCompact
                ? tabletView === 'monitor'
                  ? '100%'
                  : `${Math.min(rightPanelWidth, Math.max(220, Math.floor(windowWidth * 0.32)))}px`
                : `${rightPanelWidth}px`,
            }}
            className={`h-full min-h-0 overflow-hidden ${
              isTabletOrCompact && tabletView === 'monitor' ? 'flex-1 w-full' : 'shrink-0'
            }`}
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
        onResetSimulation={handleRestartSimulation}
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
        onOpenKahoot={() => {
          setIsRolePortalOpen(false);
          setIsKahootPortalOpen(true);
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
        onOpenFlashcards={() => {
          setIsRolePortalOpen(false);
          setIsFlashcardsOpen(true);
        }}
        onEnterSimulatorDirectly={() => setIsRolePortalOpen(false)}
      />

      <AsynchronyDatabaseModal
        isOpen={isAsynchroniesOpen}
        onClose={() => {
          setIsAsynchroniesOpen(false);
          if (!isVentilating) {
            setIsRolePortalOpen(true);
          }
        }}
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
        onOpenKahoot={() => setIsKahootPortalOpen(true)}
        onOpenDebriefing={() => {
          generateDebriefingReport();
          setIsDebriefingOpen(true);
        }}
        onResetSimulation={handleRestartSimulation}
      />

      <QuizModal
        isOpen={isQuizOpen}
        onClose={() => {
          setIsQuizOpen(false);
          if (!isVentilating) {
            setIsRolePortalOpen(true);
          }
        }}
        onOpenTeacherAdmin={handleOpenTeacherAdmin}
      />

      <ClinicalCaseModal
        isOpen={isClinicalCasesOpen}
        onClose={() => {
          setIsClinicalCasesOpen(false);
          if (!isVentilating) {
            setIsRolePortalOpen(true);
          }
        }}
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
        onClose={() => {
          setIsDebriefingOpen(false);
          if (isPatientDeceased) {
            handleRestartSimulation();
          }
        }}
        report={currentDebriefingReport}
        onRestartCase={handleRestartSimulation}
      />

      <FlashcardsModal
        isOpen={isFlashcardsOpen}
        onClose={() => {
          setIsFlashcardsOpen(false);
          if (!isVentilating) {
            setIsRolePortalOpen(true);
          }
        }}
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
        onClose={() => {
          setIsCardiacArrestModalOpen(false);
          if (isPatientDeceased) {
            handleRestartSimulation();
          }
        }}
        monitored={monitored}
        currentSettings={settings}
        onApplyRescueSettings={(rescueSettings) => {
          setSettings(rescueSettings);
          setDraftSettings(rescueSettings);
          setIsVentilating(true);
          setIsCardiacArrestModalOpen(false);
          // Rapid stabilization bounce on rescue
          setPatient((p) => ({
            ...p,
            shuntFraction: Math.max(10, Math.round((p.shuntFraction ?? 20) * 0.7)),
            compliance: Math.max(35, Math.round((p.compliance ?? 30) * 1.2)),
          }));
          audioEngine.playConfirmBeep();
        }}
        onPatientDeceased={() => {
          setIsPatientDeceased(true);
          setIsVentilating(false);
        }}
        onRestartCase={handleRestartSimulation}
        onOpenDebriefing={() => {
          hasTriggeredPcrRef.current = true;
          setIsPatientDeceased(true);
          maneuverStateRef.current.isFrozen = true;
          setIsVentilating(false);
          setIsCardiacArrestModalOpen(false);
          const rep = generateDebriefingReport(true);
          setCurrentDebriefingReport(rep);
          setIsDebriefingOpen(true);
        }}
      />

      <KahootPortalModal
        isOpen={isKahootPortalOpen}
        onClose={() => {
          setIsKahootPortalOpen(false);
          if (!isVentilating && !activeKahootSession) {
            setIsRolePortalOpen(true);
          }
        }}
        userRole={userRole}
        onStartKahootSession={handleStartKahootSession}
      />

      <TeacherAdminModal
        isOpen={isTeacherAdminOpen}
        onClose={() => setIsTeacherAdminOpen(false)}
        onOpenMirrorGrid={() => setIsTeacherMirrorGridOpen(true)}
        onLoadCaseInSimulator={(selectedCase) => {
          handleLoadCase(selectedCase);
          setIsTeacherAdminOpen(false);
          setCurrentPage('simulator');
        }}
        onPedagogicalSettingsChange={setPedagogicalSettings}
      />

      <TeacherMirrorGridModal
        isOpen={isTeacherMirrorGridOpen}
        onClose={() => setIsTeacherMirrorGridOpen(false)}
        currentSimulatorData={{
          settings,
          monitored,
          patient,
          caseTitle: activeClinicalCase?.title,
        }}
      />

      <KahootResultModal
        isOpen={isKahootResultModalOpen}
        result={kahootResult}
        onClose={() => setIsKahootResultModalOpen(false)}
        onRetry={() => {
          setIsKahootResultModalOpen(false);
          setIsKahootPortalOpen(true);
        }}
      />
    </div>
  );
}
