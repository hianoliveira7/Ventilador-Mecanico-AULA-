import React, { useState } from 'react';
import {
  GraduationCap,
  UserCheck,
  Target,
  BookOpen,
  HelpCircle,
  Activity,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  PlusCircle,
  FileSpreadsheet,
  X,
  Lock,
  ShieldCheck,
  KeyRound,
  Zap,
  Trophy,
  Layers,
  ArrowLeft,
  Stethoscope,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import { TeacherAuthModal } from './TeacherAuthModal';
import { PWAInstallButton } from './PWAInstallButton';

interface RoleSelectionPortalProps {
  isOpen?: boolean;
  currentRole?: 'student' | 'teacher' | null;
  onSelectRole: (role: 'student' | 'teacher') => void;
  onClose?: () => void;
  onOpenTutorial?: () => void;
  onOpenMissions?: () => void;
  onOpenCases?: () => void;
  onOpenQuiz?: () => void;
  onOpenKahoot?: () => void;
  onOpenEducational?: () => void;
  onOpenTeacherAdmin?: () => void;
  onEnterSimulatorDirectly?: () => void;
  onOpenAsynchronies?: () => void;
  onOpenFlashcards?: () => void;
}

export const RoleSelectionPortal: React.FC<RoleSelectionPortalProps> = ({
  isOpen = true,
  currentRole,
  onSelectRole,
  onClose,
  onOpenTutorial,
  onOpenMissions,
  onOpenCases,
  onOpenQuiz,
  onOpenKahoot,
  onOpenEducational,
  onOpenTeacherAdmin,
  onEnterSimulatorDirectly,
  onOpenAsynchronies,
  onOpenFlashcards,
}) => {
  const { isLight, toggleTheme } = useTheme();
  const [isTeacherAuthOpen, setIsTeacherAuthOpen] = useState(false);
  const [pendingTeacherAction, setPendingTeacherAction] = useState<(() => void) | null>(null);

  // Portal view step: 'profile' (choose Aluno/Docente) or 'student_hub' (choose destination)
  const [viewStep, setViewStep] = useState<'profile' | 'student_hub'>('profile');

  // Student identification state
  const [studentName, setStudentName] = useState(() => {
    return localStorage.getItem('simulador_student_name') || '';
  });

  if (isOpen === false) return null;

  const handleConfirmStudentProfile = () => {
    audioEngine.playConfirmBeep();
    if (studentName.trim()) {
      localStorage.setItem('simulador_student_name', studentName.trim());
    }
    onSelectRole('student');
    setViewStep('student_hub');
  };

  const handleRequestTeacher = (action?: () => void) => {
    audioEngine.playClick(850);
    setPendingTeacherAction(() => action || null);
    setIsTeacherAuthOpen(true);
  };

  const handleNavigateDestination = (destinationAction?: () => void) => {
    audioEngine.playConfirmBeep();
    if (destinationAction) {
      destinationAction();
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div
        className={`w-full max-w-4xl rounded-2xl border shadow-xl overflow-hidden my-auto transition-all relative ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#0c0e15] border-slate-800 text-slate-100'
        }`}
      >
        {/* Top Theme Toggle, PWA Install & Close Buttons */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <PWAInstallButton variant="portal" />
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick(1100);
              toggleTheme();
            }}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title={isLight ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>Modo Escuro</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span>Modo Claro</span>
              </>
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
              title="Fechar Portal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Top Hero Banner - Clinical Editorial Minimalist Style */}
        <div
          className={`p-6 sm:p-7 border-b relative overflow-hidden ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-[#0b0e17] border-zinc-800 text-zinc-100'
          }`}
        >
          <div className="max-w-2xl mx-auto space-y-2.5 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-mono font-bold tracking-wider uppercase">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Simulador de Ventilação Mecânica em UTI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight leading-tight">
              {viewStep === 'student_hub' ? 'Central do Aluno' : 'Portal de Acesso Clínico'}
            </h1>
            <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'}`}>
              Selecione seu perfil de acesso para iniciar a simulação ou treinamento.
            </p>
          </div>
        </div>

        {/* STEP 1: PERFIL SELECTION */}
        {viewStep === 'profile' && (
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* PROFILE 1: ALUNO / ESTUDANTE */}
            <div
              className={`rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all hover:border-slate-400 dark:hover:border-slate-600 ${
                isLight
                  ? 'bg-slate-50/60 border-slate-200 shadow-sm'
                  : 'bg-[#10131c] border-slate-800/90'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-700 shadow-xs'
                          : 'bg-slate-800/80 border-slate-700 text-slate-200'
                      }`}
                    >
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Modo Aprendizado
                      </span>
                      <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">Ambiente do Aluno</h2>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                      currentRole === 'student'
                        ? isLight
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-900 border-slate-100 font-bold'
                        : isLight
                        ? 'bg-white text-slate-600 border-slate-200'
                        : 'bg-slate-800/60 text-slate-300 border-slate-700'
                    }`}
                  >
                    {currentRole === 'student' ? 'Perfil Ativo' : 'Acesso Livre'}
                  </span>
                </div>

                <p className={`text-xs ${isLight ? 'text-slate-600 font-normal' : 'text-slate-400'}`}>
                  Treinamento interativo com simulações no leito, casos clínicos de UTI, Kahoot e banco de assincronias.
                </p>

                {/* Student Identification Input */}
                <div className={`p-3.5 rounded-xl border space-y-2 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#0b0d14] border-slate-800'
                }`}>
                  <label className="text-[11px] font-mono font-semibold uppercase text-slate-600 dark:text-slate-400 block">
                    Sua Identificação (Nome ou Apelido):
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      localStorage.setItem('simulador_student_name', e.target.value);
                    }}
                    placeholder="Ex: Dra. Mariana Alencar"
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono transition-all outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                        : 'bg-[#131622] border-slate-700 text-slate-100 focus:border-blue-500 focus:bg-[#161a29]'
                    }`}
                  />
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
                    Gravado para relatórios e pontuação em desafios.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmStudentProfile}
                className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] shadow-sm"
              >
                <span>CONFIRMAR & ESCOLHER MÓDULO</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* PROFILE 2: PROFESSOR / DOCENTE */}
            <div
              className={`rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all hover:border-slate-400 dark:hover:border-slate-600 relative ${
                isLight
                  ? 'bg-slate-50/60 border-slate-200 shadow-sm'
                  : 'bg-[#10131c] border-slate-800/90'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-700 shadow-xs'
                          : 'bg-slate-800/80 border-slate-700 text-slate-200'
                      }`}
                    >
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Modo Instrução
                      </span>
                      <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">Ambiente do Professor</h2>
                    </div>
                  </div>
                  {currentRole === 'teacher' && (
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                        isLight
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-900 border-slate-100 font-bold'
                      }`}
                    >
                      Perfil Ativo
                    </span>
                  )}
                </div>

                <p className={`text-xs ${isLight ? 'text-slate-600 font-normal' : 'text-slate-400'}`}>
                  Ferramentas pedagógicas para condução de aulas práticas, projeção em sala e gestão de turmas.
                </p>

                <div className={`p-3.5 rounded-xl border space-y-2 text-xs font-mono ${
                  isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#0b0d14] border-slate-800 text-slate-300'
                }`}>
                  <span className="font-semibold block text-slate-900 dark:text-slate-200">Recursos de Gestão:</span>
                  <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <li>• Criação de Salas de Desafio Kahoot</li>
                    <li>• Cadastro de Casos Clínicos e Questões</li>
                    <li>• Modo Espelho / Projetor TV para sala de aula</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() =>
                    handleRequestTeacher(() => {
                      if (onOpenTeacherAdmin) {
                        onOpenTeacherAdmin();
                      } else if (onClose) {
                        onClose();
                      }
                    })
                  }
                  className={`w-full py-3 px-4 rounded-xl border font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] shadow-sm ${
                    isLight
                      ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                      : 'bg-slate-100 hover:bg-white text-slate-900 border-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>ACESSAR PAINEL DOCENTE</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: STUDENT HUB (OPÇÃO DE ESCOLHA PARA O ALUNO) */}
        {viewStep === 'student_hub' && (
          <div className="p-5 sm:p-6 space-y-5 animate-fadeIn">
            {/* Return / Change Profile Header Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewStep('profile')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Alternar Perfil</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  Estudante: <strong className="text-slate-900 dark:text-white font-bold">{studentName.trim() || 'Estudante'}</strong>
                </span>
              </div>
            </div>

            {/* Destination Grid - Sober, Clean Clinical Bento Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Option 1: Admissão & Leito de UTI (Primary) */}
              <div
                onClick={() => handleNavigateDestination(onEnterSimulatorDirectly)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-blue-500 hover:shadow-md flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-[#10131c] border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/60">
                      Simulação Prática
                    </span>
                  </div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    Admissão & Simulador no Leito
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Titule Vt, PEEP, FiO₂ e parâmetros respiratórios no leito de UTI com curvas em tempo real.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <span>Iniciar no Leito</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Option 2: Casos Clínicos */}
              <div
                onClick={() => handleNavigateDestination(onOpenCases)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-[#10131c] border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                      Casos Reais
                    </span>
                  </div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    Casos Clínicos de UTI
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Casos de SDRA, DPOC exacerbado, Asma grave, Pneumotórax e protocolo de desmame.
                  </p>
                </div>

                <button
                  type="button"
                  className={`w-full py-2 rounded-lg border font-mono font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  <span>Abrir Casos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Option 3: Kahoot Venti */}
              <div
                onClick={() => handleNavigateDestination(onOpenKahoot)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-[#10131c] border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                      Interativo
                    </span>
                  </div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    Simulador Kahoot Venti
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Entre em salas ativas com PIN de professor ou dispute desafios de ventilação mecânica.
                  </p>
                </div>

                <button
                  type="button"
                  className={`w-full py-2 rounded-lg border font-mono font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  <span>Acessar Kahoot</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Option 4: Banco de Assincronias */}
              <div
                onClick={() => handleNavigateDestination(onOpenAsynchronies)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-[#10131c] border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                      Gráficos
                    </span>
                  </div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    Banco de Assincronias
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Identificação e correção de duplo disparo, auto-disparo, ciclagem prematura e fome de fluxo.
                  </p>
                </div>

                <button
                  type="button"
                  className={`w-full py-2 rounded-lg border font-mono font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  <span>Treinar Curvas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Option 5: Banco de Quiz */}
              <div
                onClick={() => handleNavigateDestination(onOpenQuiz)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-[#10131c] border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                      Avaliativo
                    </span>
                  </div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    Banco de Quiz & Questões
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Questões de múltipla escolha com gabarito comentado e justificativas fisiológicas.
                  </p>
                </div>

                <button
                  type="button"
                  className={`w-full py-2 rounded-lg border font-mono font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  <span>Abrir Quiz</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Option 6: Flashcards */}
              <div
                onClick={() => handleNavigateDestination(onOpenFlashcards)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-[#10131c] border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                      Memorização
                    </span>
                  </div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    Flashcards de Ventilação
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Cards de fixação rápida com conceitos-chave, fórmulas de ventilação mecânica e presets.
                  </p>
                </div>

                <button
                  type="button"
                  className={`w-full py-2 rounded-lg border font-mono font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  <span>Ver Cards</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discreet Author Footer */}
        <div className={`px-5 py-2 text-center text-[11px] font-mono border-t ${
          isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-[#080a10] border-zinc-800 text-zinc-500'
        }`}>
          App desenvolvido por <span className={isLight ? 'text-slate-700 font-semibold' : 'text-zinc-400 font-semibold'}>Hian Oliveira</span>
        </div>
      </div>

      {/* Teacher Password Validation Modal */}
      <TeacherAuthModal
        isOpen={isTeacherAuthOpen}
        onClose={() => {
          setIsTeacherAuthOpen(false);
          setPendingTeacherAction(null);
        }}
        onSuccess={() => {
          setIsTeacherAuthOpen(false);
          onSelectRole('teacher');
          if (pendingTeacherAction) {
            pendingTeacherAction();
            setPendingTeacherAction(null);
          } else {
            handleNavigateDestination(onEnterSimulatorDirectly);
          }
        }}
      />
    </div>
  );
};
