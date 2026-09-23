import React, { useState, useRef, useEffect } from 'react';
import { ManeuverState, PatientParameters } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import {
  Pause,
  Play,
  Flame,
  Wind,
  Heart,
  Zap,
  User,
  Sliders,
  HelpCircle,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Volume2,
  Calculator,
  Layers,
  HeartPulse,
  GraduationCap,
  Target,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ManeuverBarProps {
  maneuverState: ManeuverState;
  patient: PatientParameters;
  viewMode: 'waveforms' | 'loops' | 'split';
  onToggleInspHold?: () => void;
  onStartInspHold?: () => void;
  onEndInspHold?: () => void;
  onToggleExpHold: () => void;
  onToggleO2Suction: () => void;
  onToggleNebulizer: () => void;
  onToggleRecruitment: () => void;
  onToggleSpontaneousDrive: () => void;
  onManualBreath: () => void;
  onToggleFreeze: () => void;
  onChangeViewMode: (mode: 'waveforms' | 'loops' | 'split') => void;
  onOpenPatientConfig?: () => void;
  onOpenSettings?: () => void;
  onOpenReport?: () => void;
  onOpenHelp?: () => void;
  onOpenClinicalCases?: () => void;
  onOpenCalculator?: () => void;
  onOpenAudio?: () => void;
  onOpenQuiz?: () => void;
  onOpenMissions?: () => void;
  onResetSimulation?: () => void;
}

export const ManeuverBar: React.FC<ManeuverBarProps> = ({
  maneuverState,
  patient,
  onToggleInspHold,
  onStartInspHold,
  onEndInspHold,
  onToggleExpHold,
  onToggleO2Suction,
  onToggleRecruitment,
  onToggleSpontaneousDrive,
  onManualBreath,
  onToggleFreeze,
  onOpenPatientConfig,
  onOpenSettings,
  onOpenReport,
  onOpenHelp,
  onOpenClinicalCases,
  onOpenCalculator,
  onOpenAudio,
  onOpenQuiz,
  onOpenMissions,
  onResetSimulation,
}) => {
  const { isLight } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const handleInspHoldDown = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    audioEngine.playClick(1000);
    if (onStartInspHold) {
      onStartInspHold();
    } else if (onToggleInspHold) {
      onToggleInspHold();
    }
  };

  const handleInspHoldUp = () => {
    if (onEndInspHold) {
      onEndInspHold();
    } else if (onToggleInspHold && maneuverState.inspiratoryHoldActive) {
      onToggleInspHold();
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <div
      id="tour-maneuvers"
      className={`border-t px-3 py-2 flex flex-wrap items-center justify-between gap-3 select-none shadow-2xl relative z-40 transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#07080d] border-zinc-800/90 text-zinc-100'
      }`}
    >
      {/* Left / Center: Clinical Diagnostic Maneuvers & Mode Switchers */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
          MANOBRAS:
        </span>

        {/* Inspiratory Pause (Hold to Pause) */}
        <button
          id="insp-hold-btn"
          type="button"
          onPointerDown={handleInspHoldDown}
          onPointerUp={handleInspHoldUp}
          onPointerLeave={handleInspHoldUp}
          onPointerCancel={handleInspHoldUp}
          onTouchStart={handleInspHoldDown}
          onTouchEnd={handleInspHoldUp}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95 ${
            maneuverState.inspiratoryHoldActive
              ? isLight
                ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-400 animate-pulse'
                : 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/40 ring-1 ring-cyan-200 animate-pulse'
              : isLight
              ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300'
              : 'bg-[#12141e] hover:bg-[#1a1d2d] text-cyan-300 border border-cyan-800/50'
          }`}
          title="Mantenha pressionado durante a inspiração para pausar e medir Pplat e Cst"
        >
          <Pause className="w-3.5 h-3.5" />
          <span>
            {maneuverState.inspiratoryHoldActive ? '⏸️ Pausa Insp. ATIVA' : 'Pausa Insp. (Manter)'}
          </span>
        </button>

        {/* Expiratory Pause */}
        <button
          id="exp-hold-btn"
          onClick={() => {
            audioEngine.playClick(900);
            onToggleExpHold();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer shadow-sm ${
            maneuverState.expiratoryHoldActive
              ? isLight
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400 animate-pulse'
                : 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/40 ring-1 ring-amber-200 animate-pulse'
              : isLight
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-[#12141e] hover:bg-[#1a1d2d] text-amber-300 border border-amber-800/50'
          }`}
          title="Manter para medir Auto-PEEP"
        >
          <Pause className="w-3.5 h-3.5" />
          <span>Pausa Exp. (PEEPi)</span>
        </button>

        {/* O2 100% */}
        <button
          onClick={() => {
            audioEngine.playClick(850);
            onToggleO2Suction();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer shadow-sm ${
            maneuverState.o2SuctionActive
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950 ring-1 ring-rose-300'
              : isLight
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
              : 'bg-[#12141e] hover:bg-[#1a1d2d] text-rose-300 border border-rose-900/50'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>{maneuverState.o2SuctionActive ? `O₂ 100% (${maneuverState.o2SuctionTimeRemaining}s)` : 'O₂ 100%'}</span>
        </button>

        {/* Recruitment Maneuver */}
        <button
          onClick={() => {
            audioEngine.playClick(950);
            onToggleRecruitment();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer shadow-sm ${
            maneuverState.recruitmentManeuverActive
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950 ring-1 ring-indigo-300 animate-pulse'
              : isLight
              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300'
              : 'bg-[#12141e] hover:bg-[#1a1d2d] text-indigo-300 border border-indigo-900/50'
          }`}
        >
          <Wind className="w-3.5 h-3.5" />
          <span>{maneuverState.recruitmentManeuverActive ? `Recrutamento (${maneuverState.recruitmentTimeRemaining}s)` : 'Recrutamento'}</span>
        </button>

        {/* Manual Breath */}
        <button
          onClick={() => {
            audioEngine.playClick(1100);
            onManualBreath();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs cursor-pointer transition-all shadow-sm ${
            isLight
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-[#12141e] hover:bg-[#1a1d2d] text-amber-300 border border-amber-800/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Insp. Manual</span>
        </button>

        {/* Spontaneous Drive Toggle */}
        <button
          onClick={() => {
            audioEngine.playClick(900);
            onToggleSpontaneousDrive();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer shadow-sm ${
            patient.spontaneousDrive
              ? isLight
                ? 'bg-emerald-100 border border-emerald-400 text-emerald-800 font-bold'
                : 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
              : isLight
              ? 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
              : 'bg-[#12141e] text-zinc-400 border border-zinc-800'
          }`}
          title="Ativar/Desativar esforço do paciente"
        >
          <Heart className={`w-3.5 h-3.5 ${patient.spontaneousDrive ? 'text-emerald-500 animate-pulse' : 'text-zinc-400'}`} />
          <span>Drive Espontâneo: {patient.spontaneousDrive ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Right: Simulation Control & Dropdown Next to Pause */}
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        {/* Pause / Resume Button */}
        <button
          onClick={() => {
            audioEngine.playClick(800);
            onToggleFreeze();
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer shadow-md ${
            maneuverState.isFrozen
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-300'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
              : 'bg-[#181a26] hover:bg-[#222536] text-zinc-200 border border-zinc-700/70'
          }`}
        >
          {maneuverState.isFrozen ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current" /> RETOMAR
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" /> PAUSAR
            </>
          )}
        </button>

        {/* Dropdown Toggle Button (Next to Pause Button) */}
        <button
          onClick={() => {
            audioEngine.playClick(900);
            setIsDropdownOpen(!isDropdownOpen);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer shadow-md ${
            isDropdownOpen
              ? 'bg-cyan-600 text-white ring-2 ring-cyan-300'
              : isLight
              ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300'
              : 'bg-[#12141e] hover:bg-[#1a1d2d] text-cyan-300 border border-cyan-700/60'
          }`}
          title="Abrir opções e painéis do simulador"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-500" />
          <span>OPÇÕES & TELAS</span>
          {isDropdownOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Dropdown Popup Menu (Opens upwards) */}
        {isDropdownOpen && (
          <div
            className={`absolute bottom-full right-0 mb-2 w-64 border rounded-2xl shadow-2xl p-2 space-y-1 z-50 animate-fadeIn backdrop-blur-md transition-colors ${
              isLight
                ? 'bg-white/95 border-slate-300 text-slate-800'
                : 'bg-[#0a0c14]/95 border-zinc-700/80 text-zinc-200'
            }`}
          >
            <div
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border-b pb-1.5 mb-1 ${
                isLight ? 'text-slate-500 border-slate-200' : 'text-zinc-400 border-zinc-800/80'
              }`}
            >
              PAINÉIS DO SIMULADOR
            </div>

            {/* Patient Config */}
            <button
              onClick={() => {
                audioEngine.playClick(900);
                setIsDropdownOpen(false);
                onOpenPatientConfig?.();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-display font-medium text-xs transition-all cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800/70 text-zinc-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg border ${
                  isLight ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-cyan-950 text-cyan-400 border-cyan-700/50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Paciente</span>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Patologia, peso, complacência
                </span>
              </div>
            </button>

            {/* Clinical Cases */}
            <button
              onClick={() => {
                audioEngine.playClick(900);
                setIsDropdownOpen(false);
                onOpenClinicalCases?.();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-display font-medium text-xs transition-all cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800/70 text-zinc-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg border ${
                  isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-950 text-indigo-400 border-indigo-700/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Casos Clínicos da UTI</span>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  SDRA, DPOC, Asma, TCE, Desmame
                </span>
              </div>
            </button>

            {/* Gasometry */}
            <button
              onClick={() => {
                audioEngine.playClick(900);
                setIsDropdownOpen(false);
                onOpenReport?.();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-display font-medium text-xs transition-all cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800/70 text-zinc-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg border ${
                  isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-950 text-rose-400 border-rose-700/50'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Gasometria Arterial</span>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Laudo completo e condutas
                </span>
              </div>
            </button>

            {/* Alarms */}
            <button
              onClick={() => {
                audioEngine.playClick(900);
                setIsDropdownOpen(false);
                onOpenSettings?.();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-display font-medium text-xs transition-all cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800/70 text-zinc-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg border ${
                  isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-950 text-amber-400 border-amber-700/50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Limites de Alarme</span>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Pico, Vte, PEEPi, Apneia
                </span>
              </div>
            </button>

            {/* Calculator */}
            <button
              onClick={() => {
                audioEngine.playClick(900);
                setIsDropdownOpen(false);
                onOpenCalculator?.();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-display font-medium text-xs transition-all cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800/70 text-zinc-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg border ${
                  isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950 text-emerald-400 border-emerald-700/50'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Calculadora de Vt/kg</span>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Peso predito e ventilação protetora
                </span>
              </div>
            </button>

            {/* Educational Help */}
            <button
              onClick={() => {
                audioEngine.playClick(900);
                setIsDropdownOpen(false);
                onOpenHelp?.();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-display font-medium text-xs transition-all cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800/70 text-zinc-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg border ${
                  isLight ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-950 text-purple-400 border-purple-700/50'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Guia de Fisioterapia & VM</span>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Teoria, fórmulas e diretrizes
                </span>
              </div>
            </button>

            {/* Missions Pop-up Button */}
            {onOpenMissions && (
              <button
                onClick={() => {
                  audioEngine.playClick(950);
                  setIsDropdownOpen(false);
                  onOpenMissions();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-display font-medium text-xs transition-all cursor-pointer ${
                  isLight ? 'hover:bg-amber-50 text-slate-800' : 'hover:bg-amber-950/40 text-zinc-200'
                }`}
              >
                <div
                  className={`p-1 rounded-lg border ${
                    isLight ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-amber-950 text-amber-400 border-amber-700/50'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className={`font-bold ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>Missões & Metas Clínicas</span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Janela flutuante de metas do caso
                  </span>
                </div>
              </button>
            )}

            {/* Quiz Button */}
            {onOpenQuiz && (
              <button
                onClick={() => {
                  audioEngine.playClick(950);
                  setIsDropdownOpen(false);
                  onOpenQuiz();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-display font-medium text-xs transition-all cursor-pointer ${
                  isLight ? 'hover:bg-emerald-50 text-slate-800' : 'hover:bg-emerald-950/40 text-zinc-200'
                }`}
              >
                <div
                  className={`p-1 rounded-lg border ${
                    isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-emerald-950 text-emerald-400 border-emerald-700/50'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className={`font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>Quiz de Fixação VM</span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    5 questões com feedback imediato
                  </span>
                </div>
              </button>
            )}

            {/* Audio Settings */}
            <button
              onClick={() => {
                audioEngine.playClick(900);
                setIsDropdownOpen(false);
                onOpenAudio?.();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-display font-medium text-xs transition-all cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-zinc-800/70 text-zinc-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg border ${
                  isLight ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-cyan-950 text-cyan-400 border-cyan-700/50'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Áudio da UTI</span>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Volume dos sons e alarmes
                </span>
              </div>
            </button>

            {/* Reset / Standard */}
            <div className={`border-t pt-1 mt-1 ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
              <button
                onClick={() => {
                  audioEngine.playClick(700);
                  setIsDropdownOpen(false);
                  onResetSimulation?.();
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-left font-mono text-[11px] transition-all cursor-pointer ${
                  isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Ciclos da Simulação</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
