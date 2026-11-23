import React, { useState, useEffect, useRef } from 'react';
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
  Pause,
  Play,
  Trophy,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Target,
  BookOpen,
  ShieldCheck,
  Tv,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface TopBarProps {
  mode: VentilationMode;
  patient: PatientParameters;
  activeAlarms: AlarmItem[];
  userRole?: 'student' | 'teacher' | null;
  simulationTimeSeconds?: number;
  blindMechanicsActive?: boolean;
  isVentilating?: boolean;
  onToggleStandby?: () => void;
  onOpenPatientConfig: () => void;
  onOpenAlarmsModal: () => void;
  onOpenAudioSettings: () => void;
  onOpenMenu?: () => void;
  onOpenRolePortal?: () => void;
  onOpenTutorial?: () => void;
  onOpenTeacherAdmin?: () => void;
  onOpenMirrorGrid?: () => void;
  onOpenClinicalCases?: () => void;
  onOpenQuiz?: () => void;
  onOpenKahoot?: () => void;
  onOpenEducational?: () => void;
  onOpenGasometry?: () => void;
  onOpenMissions?: () => void;
  onOpenAsynchronies?: () => void;
  onOpenFlashcards?: () => void;
  onOpenDebriefing?: () => void;
  isHeaderCollapsed?: boolean;
  onToggleHeaderCollapse?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  patient,
  activeAlarms,
  userRole,
  blindMechanicsActive = false,
  isVentilating = true,
  onToggleStandby,
  onOpenPatientConfig,
  onOpenAlarmsModal,
  onOpenAudioSettings,
  onOpenMenu,
  onOpenRolePortal,
  onOpenTutorial,
  onOpenTeacherAdmin,
  onOpenMirrorGrid,
  onOpenClinicalCases,
  onOpenQuiz,
  onOpenKahoot,
  onOpenEducational,
  onOpenMissions,
  onOpenAsynchronies,
  onOpenFlashcards,
  onOpenDebriefing,
  isHeaderCollapsed,
  onToggleHeaderCollapse,
}) => {
  const { toggleTheme, isLight } = useTheme();
  const topAlarm = activeAlarms.length > 0 ? activeAlarms[0] : null;

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isEstudosOpen, setIsEstudosOpen] = useState<boolean>(false);
  const estudosRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (estudosRef.current && !estudosRef.current.contains(e.target as Node)) {
        setIsEstudosOpen(false);
      }
    };
    if (isEstudosOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEstudosOpen]);

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
      className={`px-3 py-1.5 flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2 select-none shrink-0 shadow-sm border-b whitespace-nowrap relative z-30 transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#06070b] border-zinc-800/90 text-white'
      }`}
    >
      {/* Left: Brand Logo (as Home Button) */}
      <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={() => window.location.reload()}
          className={`font-display font-black tracking-wider text-xs leading-none transition-colors ${
            isLight ? 'text-slate-900 hover:text-cyan-700' : 'text-slate-100 hover:text-cyan-400'
          }`}
        >
          FISIO SIMULADOR
        </button>

        <div className={`h-4 w-px mx-1 hidden sm:block ${isLight ? 'bg-slate-300' : 'bg-zinc-800'}`} />

        {/* Header Collapse Toggle Button */}
        {onToggleHeaderCollapse && (
          <button
            onClick={onToggleHeaderCollapse}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-600 border-slate-300' : 'hover:bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            title={isHeaderCollapsed ? 'Expandir Cabeçalho' : 'Ocultar Cabeçalho'}
          >
            {isHeaderCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}
      </div>


      {/* Right: Essential Action Controls */}
      <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
        {/* Consolidated "Estudos" Dropdown */}
        <div className="relative" ref={estudosRef}>
          <button
            id="tour-cases-quiz"
            type="button"
            onClick={() => {
              audioEngine.playClick(950);
              setIsEstudosOpen((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer shadow-md shrink-0 active:scale-95 ${
              isEstudosOpen
                ? 'bg-blue-700 text-white border-blue-400 ring-2 ring-blue-400/50'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
            }`}
            title="Menu de Estudos & Configurações"
          >
            <GraduationCap className="w-4 h-4 text-white" />
            <span className="font-display font-black tracking-wide">Menu</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isEstudosOpen ? 'rotate-180' : ''}`} />
          </button>

          {isEstudosOpen && (
            <div
              className={`absolute right-0 top-full mt-2 w-64 rounded-2xl border shadow-2xl z-50 p-2 space-y-1 font-mono text-xs animate-fadeIn ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-800 shadow-xl'
                  : 'bg-[#0e1222] border-blue-700/80 text-zinc-100 shadow-2xl shadow-blue-950/80'
              }`}
            >
              <div className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase border-b mb-1 ${
                isLight ? 'text-blue-800 border-slate-200' : 'text-blue-400 border-blue-500/20'
              }`}>
                Portal de Estudos & Configurações
              </div>

              {onOpenKahoot && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEstudosOpen(false);
                    onOpenKahoot();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-blue-50 text-blue-900 font-bold' : 'hover:bg-blue-500/20 text-blue-400 font-bold'
                  }`}
                >
                  <Trophy className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-700' : 'text-blue-400'}`} />
                  <div>
                    <span className="block">Desafios Kahoot</span>
                  </div>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsEstudosOpen(false);
                  onOpenAlarmsModal();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                  isLight ? 'hover:bg-blue-50 text-blue-900 font-bold' : 'hover:bg-blue-500/20 text-blue-400 font-bold'
                }`}
              >
                <Bell className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-700' : 'text-blue-400'}`} />
                <div>
                  <span className="block">Configuração de Alarmes</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEstudosOpen(false);
                  onOpenAudioSettings();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                  isLight ? 'hover:bg-blue-50 text-blue-900 font-bold' : 'hover:bg-blue-500/20 text-blue-400 font-bold'
                }`}
              >
                <Volume2 className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-700' : 'text-blue-400'}`} />
                <div>
                  <span className="block">Configuração de Áudio</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Immersive iPad Header Collapse Button */}
        {onToggleHeaderCollapse && (
          <button
            type="button"
            onClick={onToggleHeaderCollapse}
            className={`p-1 sm:px-1.5 sm:py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-[#10121c] hover:bg-[#181b2a] text-zinc-300 border-zinc-800'
            }`}
            title="Ocultar Cabeçalho (Modo Imersivo iPad - 100% de área de tela)"
          >
            <Minimize className="w-3.5 h-3.5 text-amber-400" />
          </button>
        )}

        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          className={`p-1 sm:px-1.5 sm:py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer shadow-xs shrink-0 hidden sm:flex ${
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
          <div className="flex items-center gap-1.5">
            {onOpenMirrorGrid && (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick(950);
                  onOpenMirrorGrid();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer shadow-md shrink-0 ${
                  isLight
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500'
                    : 'bg-cyan-600/90 hover:bg-cyan-500 text-white border-cyan-400'
                }`}
                title="Modo Espelho / Projetor TV da Sala de Aula"
              >
                <Tv className="w-4 h-4 fill-current" />
                <span className="font-display font-black hidden xl:inline">Projetor / TV</span>
                <span className="font-display font-black xl:hidden">Projetor</span>
              </button>
            )}

            {onOpenTeacherAdmin && (
              <button
                onClick={() => {
                  audioEngine.playClick(950);
                  onOpenTeacherAdmin();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer shadow-md shrink-0 ${
                  isLight
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 ring-2 ring-amber-400/30'
                }`}
                title="Acessar Painel Administrativo do Docente (ADM, Kahoot, Turmas e Quizes)"
              >
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span className="font-display font-black hidden xl:inline">Painel ADM</span>
                <span className="font-display font-black xl:hidden">ADM</span>
              </button>
            )}
          </div>
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


        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={handleToggleTheme}
          className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5 ${
            isLight
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
              : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-zinc-700'
          }`}
          title={isLight ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
        >
          {isLight ? (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-700" />
              <span>Modo Escuro</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Claro</span>
            </>
          )}
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
