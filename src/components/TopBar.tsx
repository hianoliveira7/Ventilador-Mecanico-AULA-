import React from 'react';
import { VentilationMode, PatientParameters, AlarmItem } from '../types/ventilation';
import {
  Bell,
  Volume2,
  User,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface TopBarProps {
  mode: VentilationMode;
  patient: PatientParameters;
  activeAlarms: AlarmItem[];
  simulationTimeSeconds?: number;
  onOpenPatientConfig: () => void;
  onOpenAlarmsModal: () => void;
  onOpenAudioSettings: () => void;
  onOpenMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  patient,
  activeAlarms,
  onOpenPatientConfig,
  onOpenAlarmsModal,
  onOpenAudioSettings,
  onOpenMenu,
}) => {
  const { theme, toggleTheme, isLight } = useTheme();
  const topAlarm = activeAlarms.length > 0 ? activeAlarms[0] : null;

  const handleToggleTheme = () => {
    audioEngine.playClick(1100);
    toggleTheme();
  };

  return (
    <header
      className={`px-4 py-2 flex items-center justify-between select-none shrink-0 shadow-md transition-colors ${
        isLight
          ? 'bg-white border-b border-slate-200 text-slate-900'
          : 'bg-[#050508] border-b border-zinc-800/90 text-white'
      }`}
    >
      {/* Left: Brand & Mode */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span
            className={`font-display font-black tracking-wider text-sm leading-none ${
              isLight ? 'text-cyan-700' : 'text-cyan-400'
            }`}
          >
            VM - FISIO
          </span>
          <span
            className={`font-mono text-[9px] tracking-widest uppercase ${
              isLight ? 'text-slate-500' : 'text-zinc-400'
            }`}
          >
            SIMULADOR
          </span>
        </div>

        <div className={`h-6 w-px mx-1 ${isLight ? 'bg-slate-200' : 'bg-zinc-800'}`} />

        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            MODO
          </span>
          <span
            className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs tracking-wider shadow-sm ${
              isLight
                ? 'bg-cyan-50 text-cyan-800 border border-cyan-300'
                : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/60'
            }`}
          >
            {mode.replace('_', '-')}
          </span>
        </div>
      </div>

      {/* Center Status: Patient & Ventilation Status & Audio & Alarms */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Patient */}
        <button
          onClick={onOpenPatientConfig}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all cursor-pointer ${
            isLight ? 'hover:bg-slate-100' : 'hover:bg-zinc-800/50'
          }`}
        >
          <User className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
          <div className="flex flex-col text-left">
            <span className={`text-[10px] font-mono leading-tight ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              PACIENTE
            </span>
            <span className={`text-xs font-display font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
              {patient.name}
            </span>
          </div>
        </button>

        <div className={`h-5 w-px ${isLight ? 'bg-slate-200' : 'bg-zinc-800'}`} />

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
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <div className="flex flex-col">
              <span
                className={`text-xs font-display font-bold tracking-wide ${
                  isLight ? 'text-emerald-700' : 'text-emerald-300'
                }`}
              >
                VENTILAÇÃO ESTÁVEL
              </span>
              <span className={`text-[9px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Sem alarmes ativos
              </span>
            </div>
          </div>
        )}

        <div className={`h-5 w-px ${isLight ? 'bg-slate-200' : 'bg-zinc-800'}`} />

        {/* Audio */}
        <button
          onClick={onOpenAudioSettings}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all cursor-pointer ${
            isLight ? 'hover:bg-slate-100' : 'hover:bg-zinc-800/50'
          }`}
        >
          <Volume2 className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
          <div className="flex flex-col text-left">
            <span className={`text-[10px] font-mono leading-tight ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              SOM
            </span>
            <span className={`text-xs font-display font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
              Ligado
            </span>
          </div>
        </button>

        <div className={`h-5 w-px ${isLight ? 'bg-slate-200' : 'bg-zinc-800'}`} />

        {/* Alarms Count */}
        <button
          onClick={onOpenAlarmsModal}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all cursor-pointer ${
            isLight ? 'hover:bg-slate-100' : 'hover:bg-zinc-800/50'
          }`}
        >
          <Bell className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
          <div className="flex flex-col text-left">
            <span className={`text-[10px] font-mono leading-tight ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              ALARMES
            </span>
            <span className={`text-xs font-display font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
              {activeAlarms.length} ativos
            </span>
          </div>
        </button>
      </div>

      {/* Right: Theme Toggle & Hamburger Menu */}
      <div className="flex items-center gap-2">
        {/* Quick Theme Switcher Button */}
        <button
          onClick={handleToggleTheme}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-amber-700 border-slate-300 shadow-sm'
              : 'bg-[#0f1018] hover:bg-[#181a26] text-amber-300 border-zinc-800 shadow-sm'
          }`}
          title={isLight ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
        >
          {isLight ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
          <span className="text-xs font-mono font-bold hidden md:inline">
            {isLight ? 'Modo Escuro' : 'Modo Claro'}
          </span>
        </button>

        <button
          onClick={onOpenMenu}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-[#0f1018] hover:bg-[#181a26] text-zinc-300 border-zinc-800'
          }`}
          title="Menu Principal"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

