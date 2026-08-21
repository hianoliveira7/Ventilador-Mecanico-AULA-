import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Play, User, Activity } from 'lucide-react';
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
import { EducationalModal } from './components/EducationalModal';
import { GasometryModal } from './components/GasometryModal';
import { PatientConfigModal } from './components/PatientConfigModal';
import { AlarmManagerModal } from './components/AlarmManagerModal';
import { ClinicalCalculatorModal } from './components/ClinicalCalculatorModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { GasometryCard } from './components/GasometryCard';
import { LungVisualizer } from './components/LungVisualizer';
import { MenuModal } from './components/MenuModal';

export default function App() {
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
    setSettings(updater);
  };

  const hasChanges = false; // Always false since we apply in real-time now

  const handleConfirmSettings = () => {
    audioEngine.playClick(1000);
    setSettings(draftSettings);
  };

  const handleDiscardSettings = () => {
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
  const [viewMode, setViewMode] = useState<'waveforms' | 'loops' | 'split'>('waveforms');
  const [isClinicalCasesOpen, setIsClinicalCasesOpen] = useState<boolean>(false);
  const [isEducationalOpen, setIsEducationalOpen] = useState<boolean>(false);
  const [isGasometryOpen, setIsGasometryOpen] = useState<boolean>(false);
  const [isPatientConfigOpen, setIsPatientConfigOpen] = useState<boolean>(false);
  const [isAlarmsModalOpen, setIsAlarmsModalOpen] = useState<boolean>(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [audioContextState, setAudioContextState] = useState<string>(audioEngine.getContextState());

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
      if (!maneuverStateRef.current.isFrozen && monitored.spo2 > 0) {
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
      if (maneuverStateRef.current.isFrozen) return;

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
    setPatient(selectedCase.patientProfile);
    setSettings(selectedCase.initialSettings);
    setDraftSettings(selectedCase.initialSettings);
    physicsEngine.reset();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans select-none">
      {/* 1. Header Bar */}
      <TopBar
        mode={settings.mode}
        patient={patient}
        activeAlarms={activeAlarms}
        simulationTimeSeconds={0}
        onOpenPatientConfig={() => setIsPatientConfigOpen(true)}
        onOpenAlarmsModal={() => setIsAlarmsModalOpen(true)}
        onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
      />

      {/* Audio Unlock / Activation Banner if browser suspended AudioContext */}
      {(audioContextState !== 'running' || isAudioMuted) && (
        <div
          id="audio-activation-banner"
          onClick={() => {
            if (isAudioMuted) {
              handleToggleAudioMute();
            }
            audioEngine.resumeAudio();
          }}
          className="bg-[#0e1626] border-b border-cyan-500/40 px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-[#131f36] transition-all text-xs z-30"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-sm bg-cyan-950 border border-cyan-700/60 text-cyan-400 animate-pulse">
              <Volume2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-mono text-cyan-200 text-[11px]">
              <strong className="text-white font-bold">
                {isAudioMuted ? 'ÁUDIO MUTADO:' : 'ATIVAR ÁUDIO DA UTI:'}
              </strong>{' '}
              {isAudioMuted
                ? 'Clique para desmutar os alarmes e ruídos ventilatórios.'
                : 'O navegador requer 1 clique para liberar os sons pneumáticos, oxímetro e alarmes.'}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isAudioMuted) {
                handleToggleAudioMute();
              }
              audioEngine.resumeAudio();
            }}
            className="px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-[11px] rounded-sm shadow transition-all flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isAudioMuted ? 'Desmutar' : 'Ligar Áudio'}</span>
          </button>
        </div>
      )}

      {/* Patient Clinical Status Banner */}
      <div className="bg-[#0b0d14] border-b border-zinc-800/80 px-4 py-2 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700/50">
            <User className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">
              Resposta Clínica / Status do Paciente
            </span>
            <span className="text-sm font-display text-zinc-200 mt-0.5">
              {monitored.patientInteractionMessage || 'Analisando estado clínico...'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">SpO₂</span>
            <span className={`text-base font-bold font-mono ${monitored.spo2 < 90 ? 'text-red-400' : 'text-cyan-400'}`}>{monitored.spo2}%</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">EtCO₂</span>
            <span className={`text-base font-bold font-mono ${monitored.etco2 > 50 || monitored.etco2 < 30 ? 'text-amber-400' : 'text-emerald-400'}`}>{monitored.etco2}</span>
          </div>
        </div>
      </div>

      {/* 2. Main 3-Column Studio Layout (Clean & Uncluttered) */}
      <main className="flex-1 grid grid-cols-12 gap-2 p-2 min-h-0 overflow-hidden bg-[#070709]">
        {/* Left Column: Parameter Setting Controls & Lung Visualizer */}
        <div className="col-span-12 lg:col-span-3 h-full min-h-0 flex flex-col gap-2">
          <div className="flex-[3] min-h-0 overflow-hidden flex flex-col">
            <ParameterControls
              settings={settings}
              draftSettings={draftSettings}
              onUpdateDraft={handleUpdateDraft}
              hasChanges={hasChanges}
              onConfirm={handleConfirmSettings}
              onDiscard={handleDiscardSettings}
            />
          </div>
          <div className="flex-[1] min-h-[140px] shrink-0">
            <LungVisualizer monitored={monitored} patient={patient} />
          </div>
        </div>

        {/* Center Column: Respiratory Curves & Gasometry Card */}
        <div className="col-span-12 lg:col-span-6 h-full min-h-0 flex flex-col gap-2">
          {/* Top Waveforms Area */}
          <div className="flex-[3] min-h-0">
            {viewMode === 'waveforms' && (
              <div className="h-full">
                <WaveformDisplay
                  currentSample={currentSample}
                  maneuverState={maneuverState}
                  onToggleFreeze={handleToggleFreeze}
                  peepSet={settings.peep}
                  viewMode={viewMode}
                  onSelectViewMode={setViewMode}
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
                  />
                </div>
                <div className="min-h-0">
                  <LoopsDisplay
                    currentSample={currentSample}
                    peepSet={settings.peep}
                    viewMode={viewMode}
                    onSelectViewMode={setViewMode}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Center Area: Gasometry Card */}
          <div className="flex-[1] min-h-[140px]">
            <GasometryCard
              monitored={monitored}
              patient={patient}
              onOpenModal={() => setIsGasometryOpen(true)}
            />
          </div>
        </div>

        {/* Right Column: Monitorization & Pulmonary Mechanics */}
        <div className="col-span-12 lg:col-span-3 h-full min-h-0">
          <MonitorPanel
            monitored={monitored}
            patient={patient}
            onOpenGasometry={() => setIsGasometryOpen(true)}
          />
        </div>
      </main>

      {/* 4. Bottom Diagnostic Maneuvers Toolbar */}
      <ManeuverBar
        maneuverState={maneuverState}
        patient={patient}
        viewMode={viewMode}
        onToggleInspHold={handleToggleInspHold}
        onToggleExpHold={handleToggleExpHold}
        onToggleO2Suction={handleToggleO2Suction}
        onToggleNebulizer={handleToggleNebulizer}
        onToggleRecruitment={handleToggleRecruitment}
        onToggleSpontaneousDrive={handleToggleSpontaneousDrive}
        onManualBreath={handleManualBreath}
        onToggleFreeze={handleToggleFreeze}
        onChangeViewMode={setViewMode}
        onOpenPatientConfig={() => setIsPatientConfigOpen(true)}
        onOpenSettings={() => setIsAlarmsModalOpen(true)}
        onOpenReport={() => setIsGasometryOpen(true)}
        onOpenHelp={() => setIsEducationalOpen(true)}
        onResetSimulation={() => physicsEngine.reset()}
      />

      {/* Modals & Dialogs */}
      <MenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpenClinicalCases={() => setIsClinicalCasesOpen(true)}
        onOpenEducational={() => setIsEducationalOpen(true)}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenAlarms={() => setIsAlarmsModalOpen(true)}
        onOpenAudio={() => setIsAudioSettingsOpen(true)}
        onOpenPatient={() => setIsPatientConfigOpen(true)}
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

      <GasometryModal
        isOpen={isGasometryOpen}
        onClose={() => setIsGasometryOpen(false)}
        monitored={monitored}
        patient={patient}
        settings={settings}
      />

      <PatientConfigModal
        isOpen={isPatientConfigOpen}
        onClose={() => setIsPatientConfigOpen(false)}
        patient={patient}
        onUpdatePatient={setPatient}
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
      />

      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        spo2={monitored.spo2}
      />
    </div>
  );
}
