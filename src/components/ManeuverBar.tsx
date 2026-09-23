import React from 'react';
import { ManeuverState, PatientParameters } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import {
  Pause,
  Play,
  Flame,
  Wind,
  Heart,
  Zap,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ManeuverBarProps {
  maneuverState: ManeuverState;
  patient: PatientParameters;
  viewMode?: 'waveforms' | 'loops' | 'split';
  onToggleInspHold?: () => void;
  onStartInspHold?: () => void;
  onEndInspHold?: () => void;
  onToggleExpHold: () => void;
  onToggleO2Suction: () => void;
  onToggleNebulizer?: () => void;
  onToggleRecruitment: () => void;
  onToggleSpontaneousDrive: () => void;
  onManualBreath: () => void;
  onToggleFreeze: () => void;
  onChangeViewMode?: (mode: 'waveforms' | 'loops' | 'split') => void;
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
}) => {
  const { isLight } = useTheme();

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

  return (
    <div
      id="tour-maneuvers"
      className={`border-t px-2.5 py-1.5 flex items-center justify-between gap-2 select-none shadow-2xl relative z-40 transition-colors shrink-0 overflow-x-auto scrollbar-none ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#07080d] border-zinc-800/90 text-zinc-100'
      }`}
    >
      {/* Left / Center: Clinical Diagnostic Maneuvers (Single Line) */}
      <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto scrollbar-none">
        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 hidden sm:inline ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
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
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] sm:text-xs transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap active:scale-95 ${
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
            {maneuverState.inspiratoryHoldActive ? '⏸️ Pausa Insp.' : 'Pausa Insp.'}
          </span>
        </button>

        {/* Expiratory Pause */}
        <button
          id="exp-hold-btn"
          onClick={() => {
            audioEngine.playClick(900);
            onToggleExpHold();
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] sm:text-xs transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap ${
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
          <span>Pausa Exp.</span>
        </button>

        {/* O2 100% */}
        <button
          onClick={() => {
            audioEngine.playClick(850);
            onToggleO2Suction();
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] sm:text-xs transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap ${
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
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] sm:text-xs transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap ${
            maneuverState.recruitmentManeuverActive
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950 ring-1 ring-indigo-300 animate-pulse'
              : isLight
              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300'
              : 'bg-[#12141e] hover:bg-[#1a1d2d] text-indigo-300 border border-indigo-900/50'
          }`}
        >
          <Wind className="w-3.5 h-3.5" />
          <span>{maneuverState.recruitmentManeuverActive ? `Recrut. (${maneuverState.recruitmentTimeRemaining}s)` : 'Recrutamento'}</span>
        </button>

        {/* Manual Breath */}
        <button
          onClick={() => {
            audioEngine.playClick(1100);
            onManualBreath();
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] sm:text-xs cursor-pointer transition-all shadow-xs shrink-0 whitespace-nowrap ${
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
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] sm:text-xs transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap ${
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
          <span>Drive Esp.: {patient.spontaneousDrive ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Right: Simulation Control (Pause / Resume Button Only) */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <button
          onClick={() => {
            audioEngine.playClick(800);
            onToggleFreeze();
          }}
          className={`flex items-center gap-1 px-3 py-1 rounded-lg font-mono font-bold text-[11px] sm:text-xs transition-all cursor-pointer shadow-sm shrink-0 whitespace-nowrap ${
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
      </div>
    </div>
  );
};
