import React from 'react';
import { VentilationMode, PatientParameters, AlarmItem } from '../types/ventilation';
import {
  Bell,
  Volume2,
  VolumeX,
  User,
  Activity,
  ShieldCheck,
  Menu,
  Clock,
} from 'lucide-react';

interface TopBarProps {
  mode: VentilationMode;
  patient: PatientParameters;
  activeAlarms: AlarmItem[];
  simulationTimeSeconds: number;
  onOpenPatientConfig: () => void;
  onOpenAlarmsModal: () => void;
  onOpenAudioSettings: () => void;
  onOpenMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  patient,
  activeAlarms,
  simulationTimeSeconds,
  onOpenPatientConfig,
  onOpenAlarmsModal,
  onOpenAudioSettings,
  onOpenMenu,
}) => {
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const topAlarm = activeAlarms.length > 0 ? activeAlarms[0] : null;

  return (
    <header className="bg-[#050508] border-b border-zinc-800/90 px-4 py-2 flex items-center justify-between select-none shrink-0 shadow-lg">
      {/* Left: Brand & Mode */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-display font-black text-cyan-400 tracking-wider text-sm leading-none">
            VR COMAM
          </span>
          <span className="font-mono text-[9px] text-zinc-400 tracking-widest uppercase">
            SIMULADOR
          </span>
        </div>

        <div className="h-6 w-px bg-zinc-800 mx-1" />

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-zinc-400 uppercase">MODO</span>
          <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-500/60 font-mono font-black text-xs tracking-wider shadow-sm">
            {mode.replace('_', '-')}
          </span>
        </div>
      </div>

      {/* Center Status: Patient & Ventilation Status & Audio & Alarms & Time */}
      <div className="flex items-center gap-6">
        {/* Patient */}
        <button
          onClick={onOpenPatientConfig}
          className="flex items-center gap-2 hover:bg-zinc-800/50 px-2 py-1 rounded-lg transition-all cursor-pointer"
        >
          <User className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-mono text-zinc-400 leading-tight">PACIENTE</span>
            <span className="text-xs font-display font-bold text-zinc-200">{patient.name}</span>
          </div>
        </button>

        <div className="h-5 w-px bg-zinc-800" />

        {/* Ventilation Stable / Alarm Status */}
        {topAlarm ? (
          <div
            onClick={onOpenAlarmsModal}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-950/80 border border-rose-600/80 text-rose-200 cursor-pointer animate-pulse"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-mono font-bold">{topAlarm.title}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            <div className="flex flex-col">
              <span className="text-xs font-display font-bold text-emerald-300 tracking-wide">
                VENTILAÇÃO ESTÁVEL
              </span>
              <span className="text-[9px] font-mono text-zinc-400">Sem alarmes ativos</span>
            </div>
          </div>
        )}

        <div className="h-5 w-px bg-zinc-800" />

        {/* Audio */}
        <button
          onClick={onOpenAudioSettings}
          className="flex items-center gap-2 hover:bg-zinc-800/50 px-2 py-1 rounded-lg transition-all cursor-pointer"
        >
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-mono text-zinc-400 leading-tight">SOM</span>
            <span className="text-xs font-display font-bold text-zinc-200">Ligado</span>
          </div>
        </button>

        <div className="h-5 w-px bg-zinc-800" />

        {/* Alarms Count */}
        <button
          onClick={onOpenAlarmsModal}
          className="flex items-center gap-2 hover:bg-zinc-800/50 px-2 py-1 rounded-lg transition-all cursor-pointer"
        >
          <Bell className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-mono text-zinc-400 leading-tight">ALARMES</span>
            <span className="text-xs font-display font-bold text-zinc-200">
              {activeAlarms.length} ativos
            </span>
          </div>
        </button>

        <div className="h-5 w-px bg-zinc-800" />

        {/* Time Elapsed */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-mono text-zinc-400 leading-tight">TEMPO</span>
            <span className="text-xs font-mono font-bold text-zinc-200">
              {formatTime(simulationTimeSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Hamburger Menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMenu}
          className="p-2 rounded-xl bg-[#0f1018] hover:bg-[#181a26] text-zinc-300 border border-zinc-800 transition-all cursor-pointer"
          title="Menu"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
