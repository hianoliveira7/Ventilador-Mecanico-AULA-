import React from 'react';
import { ManeuverState, PatientParameters } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import {
  Pause,
  Play,
  Flame,
  Wind,
  Droplets,
  Heart,
  Grid,
  Zap,
  RotateCw,
  Activity,
  User,
  Sliders,
  FileText,
  HelpCircle,
  Square,
  RotateCcw,
} from 'lucide-react';

interface ManeuverBarProps {
  maneuverState: ManeuverState;
  patient: PatientParameters;
  viewMode: 'waveforms' | 'loops' | 'split';
  onToggleInspHold: () => void;
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
  onResetSimulation?: () => void;
}

export const ManeuverBar: React.FC<ManeuverBarProps> = ({
  maneuverState,
  patient,
  viewMode,
  onToggleInspHold,
  onToggleExpHold,
  onToggleO2Suction,
  onToggleNebulizer,
  onToggleRecruitment,
  onToggleSpontaneousDrive,
  onManualBreath,
  onToggleFreeze,
  onChangeViewMode,
  onOpenPatientConfig,
  onOpenSettings,
  onOpenReport,
  onOpenHelp,
  onResetSimulation,
}) => {
  return (
    <div className="bg-[#07080d] border-t border-zinc-800/90 px-3 py-2 flex flex-wrap items-center justify-between gap-3 select-none shadow-2xl">
      {/* Left: Professional Screenshot Navigation Tabs */}
      <div className="flex items-center gap-1 bg-[#0d0e17] p-1 rounded-xl border border-zinc-800">
        <button
          onClick={() => audioEngine.playClick(900)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-display font-bold text-xs tracking-wider shadow-sm cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>VENTILADOR</span>
        </button>

        <button
          onClick={() => {
            audioEngine.playClick(900);
            onOpenPatientConfig?.();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-300 font-display font-bold text-xs tracking-wider transition-all cursor-pointer"
        >
          <User className="w-3.5 h-3.5 text-cyan-400" />
          <span>PACIENTE</span>
        </button>

        <button
          onClick={() => {
            audioEngine.playClick(900);
            onOpenSettings?.();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-300 font-display font-bold text-xs tracking-wider transition-all cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>CONFIGURAÇÕES</span>
        </button>

        <button
          onClick={() => {
            audioEngine.playClick(900);
            onOpenReport?.();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-300 font-display font-bold text-xs tracking-wider transition-all cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>RELATÓRIO</span>
        </button>

        <button
          onClick={() => {
            audioEngine.playClick(900);
            onOpenHelp?.();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-300 font-display font-bold text-xs tracking-wider transition-all cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>AJUDA</span>
        </button>
      </div>

      {/* Center: Clinical Maneuvers & Quick Actions */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          id="insp-hold-btn"
          onClick={() => {
            audioEngine.playClick(1000);
            onToggleInspHold();
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer ${
            maneuverState.inspiratoryHoldActive
              ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/40 ring-1 ring-cyan-200 animate-pulse'
              : 'bg-[#12141e] hover:bg-[#1a1d2d] text-cyan-300 border border-cyan-800/50'
          }`}
          title="Manter para medir Pplat e Cst"
        >
          <Pause className="w-3 h-3" />
          <span>Pausa Insp.</span>
        </button>

        <button
          id="exp-hold-btn"
          onClick={() => {
            audioEngine.playClick(900);
            onToggleExpHold();
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer ${
            maneuverState.expiratoryHoldActive
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/40 ring-1 ring-amber-200 animate-pulse'
              : 'bg-[#12141e] hover:bg-[#1a1d2d] text-amber-300 border border-amber-800/50'
          }`}
          title="Manter para medir Auto-PEEP"
        >
          <Pause className="w-3 h-3" />
          <span>Pausa Exp.</span>
        </button>

        <button
          onClick={() => {
            audioEngine.playClick(850);
            onToggleO2Suction();
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer ${
            maneuverState.o2SuctionActive
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950 ring-1 ring-rose-300'
              : 'bg-[#12141e] hover:bg-[#1a1d2d] text-rose-300 border border-rose-900/50'
          }`}
        >
          <Flame className="w-3 h-3" />
          <span>{maneuverState.o2SuctionActive ? `O₂ (${maneuverState.o2SuctionTimeRemaining}s)` : 'O₂ 100%'}</span>
        </button>

        <button
          onClick={() => {
            audioEngine.playClick(950);
            onToggleRecruitment();
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer ${
            maneuverState.recruitmentManeuverActive
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950 ring-1 ring-indigo-300 animate-pulse'
              : 'bg-[#12141e] hover:bg-[#1a1d2d] text-indigo-300 border border-indigo-900/50'
          }`}
        >
          <Wind className="w-3 h-3" />
          <span>{maneuverState.recruitmentManeuverActive ? `Recrut. (${maneuverState.recruitmentTimeRemaining}s)` : 'Recrutamento'}</span>
        </button>

        <button
          onClick={() => {
            audioEngine.playClick(1100);
            onManualBreath();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#12141e] hover:bg-[#1a1d2d] text-amber-300 border border-amber-800/50 font-mono font-bold text-xs cursor-pointer transition-all"
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Insp. Manual</span>
        </button>
      </div>

      {/* Right: Simulation Control Buttons (Pause & Stop Simulation) */}
      <div className="flex items-center gap-2">
        {/* Pause / Freeze Button */}
        <button
          onClick={() => {
            audioEngine.playClick(800);
            onToggleFreeze();
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer shadow-md ${
            maneuverState.isFrozen
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-300'
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

        {/* Stop Simulation Button */}
        <button
          onClick={() => {
            audioEngine.playClick(500);
            onResetSimulation?.();
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/60 font-mono font-bold text-xs transition-all cursor-pointer shadow-md shadow-rose-950/50"
          title="Reiniciar Simulação"
        >
          <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
          <span>PARAR SIMULAÇÃO</span>
        </button>
      </div>
    </div>
  );
};

