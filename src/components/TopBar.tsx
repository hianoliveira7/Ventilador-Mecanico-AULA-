import React, { useState, useEffect } from 'react';
import { VentilationMode, PatientParameters, AlarmItem } from '../types/ventilation';
import {
  Bell,
  Volume2,
  VolumeX,
  User,
  Menu,
  Sun,
  Moon,
  Activity,
  AlertTriangle,
  GraduationCap,
  UserCheck,
  Sparkles,
  SlidersHorizontal,
  FolderOpen,
  BookOpenCheck,
  Maximize,
  Minimize,
  Zap,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface TopBarProps {
  mode: VentilationMode;
  patient: PatientParameters;
  activeAlarms: AlarmItem[];
  userRole?: 'student' | 'teacher' | null;
  simulationTimeSeconds?: number;
  onOpenPatientConfig: () => void;
  onOpenAlarmsModal: () => void;
  onOpenAudioSettings: () => void;
  onOpenMenu?: () => void;
  onOpenRolePortal?: () => void;
  onOpenTutorial?: () => void;
  onOpenTeacherAdmin?: () => void;
  onOpenClinicalCases?: () => void;
  onOpenQuiz?: () => void;
  onOpenEducational?: () => void;
  onOpenGasometry?: () => void;
  onOpenMissions?: () => void;
  onOpenAsynchronies?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  patient,
  activeAlarms,
  userRole,
  onOpenPatientConfig,
  onOpenAlarmsModal,
  onOpenAudioSettings,
  onOpenMenu,
  onOpenRolePortal,
  onOpenTutorial,
  onOpenTeacherAdmin,
  onOpenClinicalCases,
  onOpenAsynchronies,
}) => {
  const { toggleTheme, isLight } = useTheme();
  const topAlarm = activeAlarms.length > 0 ? activeAlarms[0] : null;

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    audioEngine.playClick(1000);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Erro ao ativar Tela Cheia:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleToggleTheme = () => {
    audioEngine.playClick(1100);
    toggleTheme();
  };

  return (
    <header
      id="tour-topbar"
      className={`px-3 py-1.5 flex items-center justify-between select-none shrink-0 shadow-sm border-b transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#06070b] border-zinc-800/90 text-white'
      }`}
    >
      {/* Left: Brand Logo, Mode & Role Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-display font-black text-xs shadow-xs ${
              isLight
                ? 'bg-cyan-600 text-white'
                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
            }`}
          >
            VM
          </div>
          <div className="hidden md:flex flex-col">
            <span
              className={`font-display font-black tracking-wider text-xs leading-none ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}
            >
              FISIO SIMULADOR
            </span>
            <span
              className={`font-mono text-[8px] tracking-wider uppercase font-semibold ${
                isLight ? 'text-cyan-700' : 'text-cyan-400'
              }`}
            >
              Ventilação UTI
            </span>
          </div>
        </div>

        <div className={`h-4 w-px mx-0.5 hidden sm:block ${isLight ? 'bg-slate-300' : 'bg-zinc-800'}`} />

        {/* Role Switcher Chip */}
        {onOpenRolePortal && (
          <button
            onClick={onOpenRolePortal}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
              userRole === 'teacher'
                ? isLight
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300'
                  : 'bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border-indigo-700/60'
                : isLight
                ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border-cyan-300'
                : 'bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border-cyan-700/60'
            }`}
            title="Alternar entre Aluno e Professor"
          >
            {userRole === 'teacher' ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Professor</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-3.5 h-3.5 text-cyan-500" />
                <span className="hidden sm:inline">Aluno</span>
              </>
            )}
          </button>
        )}

        {/* Current Mode Badge */}
        <div className="flex items-center shrink-0">
          <span
            className={`px-2 py-0.5 rounded-md font-mono font-black text-[10px] sm:text-[11px] tracking-wider shadow-xs border ${
              isLight
                ? 'bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-[#121626] text-cyan-300 border-zinc-700'
            }`}
          >
            {mode.replace('_', '-')}
          </span>
        </div>
      </div>

      {/* Center: Clean Patient & Clinical Status Pill */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Patient Quick Chip */}
        <button
          onClick={onOpenPatientConfig}
          className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border transition-all cursor-pointer text-left shrink-0 ${
            isLight
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800'
              : 'bg-[#0f111a] hover:bg-[#161a29] border-zinc-800 text-zinc-200'
          }`}
          title="Clique para configurar parâmetros do paciente"
        >
          <User className={`w-3.5 h-3.5 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
          <span className="text-[10px] sm:text-[11px] font-display font-bold truncate max-w-[90px] sm:max-w-[140px]">
            {patient.name}
          </span>
          <span
            className={`hidden md:inline-block text-[9px] font-mono px-1 py-0.2 rounded border ${
              isLight
                ? 'bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
          >
            {patient.gender === 'male' ? 'M' : 'F'}, {patient.height}cm
          </span>
        </button>

        {/* Ventilation Safety Status Pill */}
        {topAlarm ? (
          <button
            onClick={onOpenAlarmsModal}
            className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-rose-600 text-white font-mono font-bold text-[10px] sm:text-[11px] cursor-pointer shadow-xs animate-pulse border border-rose-500 shrink-0"
            title="Alarme ativo! Clique para ver detalhes"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="truncate max-w-[100px] sm:max-w-[160px]">{topAlarm.title}</span>
          </button>
        ) : (
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-lg border shrink-0 ${
              isLight
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <span className="text-[10px] font-display font-bold">Ventilação Estável</span>
          </div>
        )}
      </div>

      {/* Right: Essential Action Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
        {/* Clinical Cases & Quiz Page Button */}
        {onOpenClinicalCases && (
          <button
            id="tour-cases-quiz"
            onClick={onOpenClinicalCases}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
              isLight
                ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border-cyan-300'
                : 'bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border-cyan-700/60'
            }`}
            title="Abrir Página de Casos Clínicos & Quiz de Avaliação"
          >
            <BookOpenCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-display font-black hidden md:inline">Casos & Quiz</span>
          </button>
        )}

        {/* Asynchronies Database Button */}
        {onOpenAsynchronies && (
          <button
            onClick={onOpenAsynchronies}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
              isLight
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
                : 'bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 border-amber-700/60'
            }`}
            title="Abrir Banco de Dados de Assincronias Paciente-Ventilador"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-display font-black hidden lg:inline">Assincronias</span>
          </button>
        )}

        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          className={`p-1 sm:px-2 sm:py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
            isFullscreen
              ? 'bg-cyan-600 text-white border-cyan-500'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : 'bg-[#10121c] hover:bg-[#181b2a] text-zinc-300 border-zinc-800'
          }`}
          title={isFullscreen ? 'Sair do Modo Tela Cheia' : 'Ativar Modo Tela Cheia'}
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5 text-cyan-400" />}
        </button>

        {/* Context Button based on Role */}
        {userRole === 'teacher' ? (
          onOpenTeacherAdmin && (
            <button
              onClick={onOpenTeacherAdmin}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
                isLight
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                  : 'bg-indigo-600/80 hover:bg-indigo-500 text-white border-indigo-500'
              }`}
              title="Painel Administrativo do Docente"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Admin</span>
            </button>
          )
        ) : (
          onOpenTutorial && (
            <button
              onClick={onOpenTutorial}
              className={`p-1 sm:px-2 sm:py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-[#10121c] hover:bg-[#181b2a] text-zinc-300 border-zinc-800'
              }`}
              title="Guia Passo a Passo & Tutorial do Aluno"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            </button>
          )
        )}

        {/* Alarms Button with Counter */}
        <button
          onClick={onOpenAlarmsModal}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer shadow-xs shrink-0 ${
            activeAlarms.length > 0
              ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : 'bg-[#10121c] hover:bg-[#181b2a] text-zinc-300 border-zinc-800'
          }`}
          title="Ver e configurar alarmes"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px] font-mono font-bold">
            {activeAlarms.length > 0 ? `${activeAlarms.length}` : ''}
          </span>
        </button>

        {/* Audio Settings / Volume Toggle */}
        <button
          onClick={onOpenAudioSettings}
          className={`p-1 sm:p-1.5 rounded-lg border transition-all cursor-pointer shadow-xs shrink-0 ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : 'bg-[#10121c] hover:bg-[#181b2a] text-zinc-300 border-zinc-800'
          }`}
          title="Configurações de Áudio e Volume"
        >
          <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={handleToggleTheme}
          className={`p-1 sm:p-1.5 rounded-lg border transition-all cursor-pointer shadow-xs shrink-0 ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-amber-700 border-slate-300'
              : 'bg-[#10121c] hover:bg-[#181b2a] text-amber-300 border-zinc-800'
          }`}
          title={isLight ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
        >
          {isLight ? <Moon className="w-3.5 h-3.5 text-indigo-700" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
        </button>

        {/* Hamburger Menu */}
        <button
          onClick={onOpenMenu}
          className={`p-1 sm:p-1.5 rounded-lg border transition-all cursor-pointer shadow-xs shrink-0 ${
            isLight
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
          }`}
          title="Abrir Menu Principal"
        >
          <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </header>
  );
};
