import React from 'react';
import { X, BookOpen, Stethoscope, Calculator, Bell, Sliders, Shield, Sun, Moon, GraduationCap, FileText, Target, Zap, Sparkles, Award, Trophy, RotateCcw, Volume2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'student' | 'teacher' | null;
  onOpenClinicalCases: () => void;
  onOpenEducational: () => void;
  onOpenCalculator: () => void;
  onOpenAlarms: () => void;
  onOpenAudio: () => void;
  onOpenPatient: () => void;
  onOpenQuiz?: () => void;
  onOpenGasometry?: () => void;
  onOpenMissions?: () => void;
  onOpenRolePortal?: () => void;
  onOpenTutorial?: () => void;
  onOpenTeacherAdmin?: () => void;
  onOpenAsynchronies?: () => void;
  onOpenFlashcards?: () => void;
  onOpenDebriefing?: () => void;
  onOpenKahoot?: () => void;
  onResetSimulation?: () => void;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  isOpen,
  onClose,
  userRole,
  onOpenClinicalCases,
  onOpenEducational,
  onOpenCalculator,
  onOpenAlarms,
  onOpenAudio,
  onOpenPatient,
  onOpenQuiz,
  onOpenGasometry,
  onOpenMissions,
  onOpenRolePortal,
  onOpenTutorial,
  onOpenTeacherAdmin,
  onOpenAsynchronies,
  onOpenFlashcards,
  onOpenDebriefing,
  onOpenKahoot,
  onResetSimulation,
}) => {
  const { isLight } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        className={`w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0e0f14] border-zinc-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#13151f] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sliders className={`w-5 h-5 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
            <span
              className={`font-display font-bold text-sm tracking-wide ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              MENU DE ESTUDO & CONFIGURAÇÕES
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-2 max-h-[80vh] overflow-y-auto">
          {/* Reiniciar Simulação / Admissão */}
          {onResetSimulation && (
            <button
              type="button"
              onClick={() => { onClose(); onResetSimulation(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-blue-800/60 bg-blue-950/20 hover:bg-blue-900/40 text-blue-100 text-left transition-all cursor-pointer group"
            >
              <div className="p-2.5 rounded-lg bg-blue-900/80 text-blue-300">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="block text-sm font-display font-bold text-blue-100">
                  Reiniciar Simulação
                </span>
                <span className="text-xs text-blue-300/70">
                  Retornar à admissão e zerar parâmetros
                </span>
              </div>
            </button>
          )}

          {/* Alarmes */}
          <button
            onClick={() => { onClose(); onOpenAlarms(); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-blue-800/60 bg-blue-950/20 hover:bg-blue-900/40 text-blue-100 text-left transition-all cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-blue-900/80 text-blue-300">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="block text-sm font-display font-bold text-blue-100">Configuração de Alarmes</span>
              <span className="text-xs text-blue-300/70">Ajustar limites de monitorização</span>
            </div>
          </button>

          {/* Áudio */}
          <button
            onClick={() => { onClose(); onOpenAudio(); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-blue-800/60 bg-blue-950/20 hover:bg-blue-900/40 text-blue-100 text-left transition-all cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-blue-900/80 text-blue-300">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="block text-sm font-display font-bold text-blue-100">Configuração de Áudio</span>
              <span className="text-xs text-blue-300/70">Volume e alertas sonoros</span>
            </div>
          </button>
          
          {/* ... (keep other buttons but apply blue theme) */}

          {/* Role Portal / Change Profile */}
          {onOpenRolePortal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRolePortal();
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                isLight
                  ? 'bg-blue-50/80 hover:bg-blue-100/90 border-blue-300 text-slate-900 shadow-sm'
                  : 'bg-blue-950/20 hover:bg-blue-900/40 border-blue-800/60 text-blue-100'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  isLight ? 'bg-blue-600 text-white' : 'bg-blue-900/80 text-blue-300'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="block text-sm font-display font-bold">Portal de Acesso (Aluno / Professor)</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                    Mudar Perfil
                  </span>
                </div>
                <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-blue-300/70'}`}>
                  Alternar entre modo estudante (desafios) e modo docente (gestão)
                </span>
              </div>
            </button>
          )}

          {/* Student Tutorial / Tour (Only for Students) */}
          {userRole !== 'teacher' && onOpenTutorial && (
            <button
              onClick={() => {
                onClose();
                onOpenTutorial();
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                isLight
                  ? 'bg-blue-50/50 hover:bg-blue-100/80 border-blue-200 text-slate-900'
                  : 'bg-blue-950/20 hover:bg-blue-900/40 border-blue-800/60 text-blue-100'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  isLight ? 'bg-blue-600 text-white' : 'bg-blue-900/80 text-blue-300'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-display font-bold">Guia Interativo & Tour do Aluno</span>
                <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-blue-300/70'}`}>
                  Passo a passo das curvas, parâmetros e manobras do ventilador
                </span>
              </div>
            </button>
          )}

          {/* Teacher Admin Panel (Only visible for teachers) */}
          {userRole === 'teacher' && onOpenTeacherAdmin && (
            <button
              onClick={() => {
                onClose();
                onOpenTeacherAdmin();
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                isLight
                  ? 'bg-blue-50/70 hover:bg-blue-100/90 border-blue-300 text-slate-900'
                  : 'bg-blue-950/20 hover:bg-blue-900/40 border-blue-800/60 text-blue-100'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  isLight ? 'bg-blue-600 text-white' : 'bg-blue-900/80 text-blue-300'
                }`}
              >
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-display font-bold">Painel Administrativo do Docente</span>
                <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-blue-300/70'}`}>
                  Cadastre novos casos fisiopatológicos e gerencie o banco de questões
                </span>
              </div>
            </button>
          )}


          <button
            onClick={() => {
              onClose();
              onOpenCalculator();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              isLight
                ? 'bg-blue-50/50 hover:bg-blue-100/80 border-blue-200 text-slate-900'
                : 'bg-blue-950/20 hover:bg-blue-900/40 border-blue-800/60 text-blue-100'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-blue-600 text-white' : 'bg-blue-900/80 text-blue-300'
              }`}
            >
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Calculadora de Peso Ideal & VT</span>
              <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-blue-300/70'}`}>
                Cálculo baseado na altura e gênero (mL/kg)
              </span>
            </div>
          </button>


          <button
            onClick={() => {
              onClose();
              onOpenPatient();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              isLight
                ? 'bg-blue-50/50 hover:bg-blue-100/80 border-blue-200 text-slate-900'
                : 'bg-blue-950/20 hover:bg-blue-900/40 border-blue-800/60 text-blue-100'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-blue-600 text-white' : 'bg-blue-900/80 text-blue-300'
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Perfil do Paciente & Mecânica</span>
              <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-blue-300/70'}`}>
                Complacência, resistência e drive respiratório
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
