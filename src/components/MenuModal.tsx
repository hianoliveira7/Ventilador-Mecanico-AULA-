import React from 'react';
import { X, BookOpen, Stethoscope, Calculator, Bell, Sliders, Shield, Sun, Moon, GraduationCap, FileText, Target } from 'lucide-react';
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
}) => {
  const { theme, toggleTheme, isLight } = useTheme();

  if (!isOpen) return null;

  const handleToggleTheme = () => {
    audioEngine.playClick(1050);
    toggleTheme();
  };

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
          {/* Role Portal / Change Profile */}
          {onOpenRolePortal && (
            <button
              onClick={() => {
                onClose();
                onOpenRolePortal();
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                isLight
                  ? 'bg-cyan-50/80 hover:bg-cyan-100/90 border-cyan-300 text-cyan-950 shadow-sm'
                  : 'bg-[#10172e] hover:bg-[#182347] border-cyan-700/60 text-white'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  isLight ? 'bg-cyan-600 text-white' : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="block text-sm font-display font-bold">Portal de Acesso (Aluno / Professor)</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30">
                    Mudar Perfil
                  </span>
                </div>
                <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
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
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                  : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-display font-bold">Guia Interativo & Tour do Aluno</span>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
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
                  ? 'bg-indigo-50/70 hover:bg-indigo-100/80 border-indigo-200 text-slate-900'
                  : 'bg-[#18152b] hover:bg-[#231e3d] border-indigo-800/80 text-white'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20'
                }`}
              >
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-display font-bold">Painel Administrativo do Docente</span>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Cadastre novos casos fisiopatológicos e gerencie o banco de questões
                </span>
              </div>
            </button>
          )}

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={handleToggleTheme}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
              isLight
                ? 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg ${
                  isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20'
                }`}
              >
                {isLight ? <Moon className="w-5 h-5 text-indigo-600" /> : <Sun className="w-5 h-5" />}
              </div>
              <div className="text-left">
                <span className="block text-sm font-display font-bold">
                  {isLight ? 'Modo Escuro (Interface Noturna)' : 'Modo Claro (Interface Clínica Clara)'}
                </span>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  {isLight ? 'Ativar visual escuro padrão de monitor' : 'Ativar visual claro de alta luminosidade'}
                </span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border ${
                isLight
                  ? 'bg-amber-200/80 text-amber-900 border-amber-300'
                  : 'bg-zinc-800 text-amber-300 border-zinc-700'
              }`}
            >
              {isLight ? 'Claro Ativo' : 'Escuro Ativo'}
            </span>
          </button>

          {onOpenGasometry && (
            <button
              onClick={() => {
                onClose();
                onOpenGasometry();
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                  : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20'
                }`}
              >
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-display font-bold">Gasometria Arterial (Janela Flutuante)</span>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  pH, PaCO₂, PaO₂, HCO₃⁻, Base Excess e relação P/F
                </span>
              </div>
            </button>
          )}

          {onOpenMissions && (
            <button
              onClick={() => {
                onClose();
                onOpenMissions();
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                isLight
                  ? 'bg-amber-50/60 hover:bg-amber-100/80 border-amber-200 text-slate-900'
                  : 'bg-[#1d1810] hover:bg-[#282116] border-amber-800/80 text-white'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20'
                }`}
              >
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-display font-bold">Missões Clínicas & Metas (Janela Flutuante)</span>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Objetivos e metas de ventilação protetora do caso
                </span>
              </div>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onOpenClinicalCases();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20'
              }`}
            >
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Casos Clínicos & Quiz de Avaliação</span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Estudos de casos reais, metas de ventilação protetora e banco de questões
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenEducational();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20'
              }`}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Guia Educacional & Biblioteca</span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Conceitos de ventilação mecânica e gasometria
              </span>
            </div>
          </button>

          {onOpenQuiz && (
            <button
              onClick={() => {
                onClose();
                onOpenQuiz();
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                isLight
                  ? 'bg-emerald-50/60 hover:bg-emerald-100/80 border-emerald-300 text-slate-900'
                  : 'bg-[#101c18] hover:bg-[#162720] border-emerald-800/80 text-white'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-display font-bold text-emerald-700 dark:text-emerald-300">
                  Quiz Avaliativo de VM
                </span>
                <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Avaliação prática para estudantes de Fisioterapia e Medicina
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
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20'
              }`}
            >
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Calculadora de Peso Ideal & VT</span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Cálculo baseado na altura e gênero (mL/kg)
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenAlarms();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20'
              }`}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Gerenciador de Alarmes</span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Limites de pressão, volume minuto e apneia
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
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20'
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Perfil do Paciente & Mecânica</span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Complacência, resistência e drive respiratório
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
