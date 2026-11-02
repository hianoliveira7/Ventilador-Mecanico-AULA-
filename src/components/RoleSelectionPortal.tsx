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
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import { TeacherAuthModal } from './TeacherAuthModal';

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
  const { isLight } = useTheme();
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
        className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden my-auto transition-all relative ${
          isLight
            ? 'bg-gradient-to-b from-white to-slate-50 border-slate-300 text-slate-900'
            : 'bg-gradient-to-b from-[#0d111d] to-[#070913] border-zinc-700 text-zinc-100'
        }`}
      >
        {/* Top Close Button if onClose is available */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-4 right-4 z-20 p-2 rounded-full border transition-all cursor-pointer ${
              isLight
                ? 'bg-white/80 hover:bg-white text-slate-700 border-slate-200 shadow-sm'
                : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
            title="Fechar Portal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Top Hero Banner */}
        <div
          className={`p-5 sm:p-6 border-b text-center relative overflow-hidden ${
            isLight
              ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-700 text-white'
              : 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border-zinc-800'
          }`}
        >
          <div className="relative z-10 max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-mono font-bold tracking-wider uppercase">
              <Activity className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              <span>Simulador de Ventilação Mecânica em UTI</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-black tracking-tight leading-tight">
              {viewStep === 'student_hub' ? 'Central do Aluno: Para Onde Você Quer Ir?' : 'Portal de Acesso & Aprendizagem Clínica'}
            </h1>
            <p className="text-xs sm:text-sm font-sans opacity-90 max-w-xl mx-auto">
              {viewStep === 'student_hub'
                ? `Olá, ${studentName.trim() || 'Estudante'}! Selecione abaixo qual ambiente interativo deseja acessar:`
                : 'Identifique o seu perfil para acessar ferramentas personalizadas de estudo ou gestão pedagógica docente.'}
            </p>
          </div>
        </div>

        {/* STEP 1: PERFIL SELECTION */}
        {viewStep === 'profile' && (
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* PROFILE 1: ALUNO / ESTUDANTE */}
            <div
              className={`rounded-3xl border p-5 sm:p-6 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-xl ${
                isLight
                  ? 'bg-white border-cyan-300 shadow-md ring-2 ring-cyan-500/20'
                  : 'bg-[#101526] border-cyan-800/80 hover:border-cyan-600'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isLight ? 'bg-cyan-100 text-cyan-800' : 'bg-cyan-950/90 text-cyan-300 border border-cyan-700/60'
                      }`}
                    >
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-500 block">
                        Perfil Estudante
                      </span>
                      <h2 className="text-xl font-display font-black">Ambiente do Aluno</h2>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                      currentRole === 'student'
                        ? isLight
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'bg-cyan-500 text-slate-950 font-black border-cyan-400'
                        : isLight
                        ? 'bg-cyan-50 text-cyan-900 border-cyan-300'
                        : 'bg-cyan-950/60 text-cyan-300 border-cyan-800'
                    }`}
                  >
                    {currentRole === 'student' ? 'Perfil Ativo' : 'Acesso Livre'}
                  </span>
                </div>

                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Acesse salas do Kahoot, biblioteca de casos clínicos, banco de questões com gabarito ou a simulação no leito. Digite seu nome para salvar suas pontuações.
                </p>

                {/* Student Identification Input */}
                <div className={`p-3.5 rounded-2xl border space-y-2 ${
                  isLight ? 'bg-cyan-50/60 border-cyan-200' : 'bg-[#090d18] border-cyan-900/60'
                }`}>
                  <label className="text-xs font-mono font-bold uppercase text-cyan-400 block">
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
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-all outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                        : 'bg-[#121627] border-zinc-700 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                    }`}
                  />
                  <span className="text-[10px] font-mono text-cyan-500/80 block">
                    ✓ Seu nome será gravado nos relatórios de desempenho e ranking.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmStudentProfile}
                className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 cursor-pointer transition-all active:scale-[0.99]"
              >
                <span>CONFIRMAR & ESCOLHER AMBIENTE</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* PROFILE 2: PROFESSOR / DOCENTE */}
            <div
              className={`rounded-3xl border p-5 sm:p-6 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-xl relative ${
                isLight
                  ? 'bg-white border-indigo-300 shadow-md ring-2 ring-indigo-500/20'
                  : 'bg-[#101526] border-indigo-800/80 hover:border-indigo-600'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isLight ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-950/90 text-indigo-300 border border-indigo-700/60'
                      }`}
                    >
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-500 block">
                          Perfil Docente
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <Lock className="w-2.5 h-2.5" /> Requer Senha
                        </span>
                      </div>
                      <h2 className="text-xl font-display font-black">Ambiente do Professor</h2>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                      currentRole === 'teacher'
                        ? isLight
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-indigo-500 text-slate-950 font-black border-indigo-400'
                        : isLight
                        ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                        : 'bg-indigo-950/60 text-indigo-300 border-indigo-800'
                    }`}
                  >
                    {currentRole === 'teacher' ? 'Perfil Ativo' : 'Painel Protegido'}
                  </span>
                </div>

                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Gerencie salas de desafios Kahoot com PIN e tempo limite, cadastre novos casos clínicos e questões, e acompanhe o progresso das suas turmas.
                </p>

                <div className={`p-4 rounded-2xl border space-y-2 text-xs font-mono ${
                  isLight ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950' : 'bg-[#090d18] border-indigo-900/60 text-indigo-200'
                }`}>
                  <span className="font-bold block text-indigo-400">Recursos de Gestão Docente:</span>
                  <ul className="space-y-1 text-[11px] opacity-90">
                    <li>• Criação de Salas de Desafio Kahoot</li>
                    <li>• Cadastro de Questões e Casos Clínicos</li>
                    <li>• Monitoramento de Notas em Tempo Real</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 space-y-2">
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
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>1. ACESSAR PAINEL ADM (KAHOOT & ALUNOS)</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestTeacher(() => handleNavigateDestination(onEnterSimulatorDirectly))}
                  className={`w-full py-2.5 px-4 rounded-xl border font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-[#15192b] hover:bg-[#1f253e] text-zinc-300 border-zinc-700'
                  }`}
                >
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>2. IR DIRETO PARA A SIMULAÇÃO</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: STUDENT HUB (OPÇÃO DE ESCOLHA PARA O ALUNO) */}
        {viewStep === 'student_hub' && (
          <div className="p-5 sm:p-6 space-y-5 animate-fadeIn">
            {/* Return / Change Profile Header Bar */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewStep('profile')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Alternar Perfil / Trocar Nome</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  Aluno: {studentName.trim() || 'Estudante Venti'}
                </span>
              </div>
            </div>

            {/* Destination Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Option 1: Kahoot Venti */}
              <div
                onClick={() => handleNavigateDestination(onOpenKahoot)}
                className={`p-5 rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-gradient-to-br from-amber-50 to-amber-100/60 border-amber-300 hover:border-amber-500'
                    : 'bg-gradient-to-br from-[#1a1408] to-[#120f06] border-amber-900/60 hover:border-amber-500'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black shadow-md">
                      <Trophy className="w-5 h-5 animate-bounce" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-500/40">
                      Modo Desafio
                    </span>
                  </div>
                  <h3 className="text-base font-display font-black text-amber-400">
                    🏆 Simulador Kahoot Venti
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Entre em salas ativas com PIN de professor ou dispute o pódio do ranking de ventilação mecânica.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <span>Entrar no Kahoot</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Option 2: Casos Clínicos */}
              <div
                onClick={() => handleNavigateDestination(onOpenCases)}
                className={`p-5 rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-gradient-to-br from-indigo-50 to-indigo-100/60 border-indigo-300 hover:border-indigo-500'
                    : 'bg-gradient-to-br from-[#101428] to-[#0c0f20] border-indigo-900/60 hover:border-indigo-500'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-2xl bg-indigo-500 text-white font-black shadow-md">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40">
                      Biblioteca Real
                    </span>
                  </div>
                  <h3 className="text-base font-display font-black text-indigo-400">
                    📚 Casos Clínicos de UTI
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Escolha casos reais de SDRA, DPOC, Asma, Pneumotórax e Desmame Ventilatório.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <span>Ver Casos Clínicos</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Option 3: Banco de Quiz */}
              <div
                onClick={() => handleNavigateDestination(onOpenQuiz)}
                className={`p-5 rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-gradient-to-br from-purple-50 to-purple-100/60 border-purple-300 hover:border-purple-500'
                    : 'bg-gradient-to-br from-[#181126] to-[#120c1e] border-purple-900/60 hover:border-purple-500'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-2xl bg-purple-500 text-white font-black shadow-md">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                      Gabarito Comentado
                    </span>
                  </div>
                  <h3 className="text-base font-display font-black text-purple-400">
                    ❓ Banco de Quiz & Questões
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Testes práticos de múltipla escolha com justificativas pedagógicas detalhadas.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <span>Abrir Banco de Quiz</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Option 4: Banco de Assincronias */}
              <div
                onClick={() => handleNavigateDestination(onOpenAsynchronies)}
                className={`p-5 rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-gradient-to-br from-cyan-50 to-cyan-100/60 border-cyan-300 hover:border-cyan-500'
                    : 'bg-gradient-to-br from-[#0c1825] to-[#08121e] border-cyan-900/60 hover:border-cyan-500'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-2xl bg-cyan-500 text-slate-950 font-black shadow-md">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                      Curvas de Vias Aéreas
                    </span>
                  </div>
                  <h3 className="text-base font-display font-black text-cyan-400">
                    ⚡ Banco de Assincronias
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Treine identificação e correção de duplo disparo, auto-disparo, ciclagem e fome de fluxo.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <span>Treinar Assincronias</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Option 5: Flashcards */}
              <div
                onClick={() => handleNavigateDestination(onOpenFlashcards)}
                className={`p-5 rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 border-emerald-300 hover:border-emerald-500'
                    : 'bg-gradient-to-br from-[#0b1c16] to-[#07130e] border-emerald-900/60 hover:border-emerald-500'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black shadow-md">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                      Revisão Ativa
                    </span>
                  </div>
                  <h3 className="text-base font-display font-black text-emerald-400">
                    🎴 Flashcards de Ventilação
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Cards de memorização prática e aplicação direta de presets no simulador.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <span>Estudar Flashcards</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Option 6: Simulação e Admissão Direta */}
              <div
                onClick={() => handleNavigateDestination(onEnterSimulatorDirectly)}
                className={`p-5 rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between gap-3 ${
                  isLight
                    ? 'bg-gradient-to-br from-sky-50 to-sky-100/60 border-sky-300 hover:border-sky-500'
                    : 'bg-gradient-to-br from-[#0d1829] to-[#09101c] border-sky-900/60 hover:border-sky-500'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-2xl bg-sky-500 text-white font-black shadow-md">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40">
                      Leito de UTI
                    </span>
                  </div>
                  <h3 className="text-base font-display font-black text-sky-400">
                    🫁 Admissão & Simulador no Leito
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Vá para a tela de admissão para titular $V_t$, PEEP, $FiO_2$ e parâmetros no leito de UTI.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <span>Ir para o Leito de UTI</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div
          className={`px-6 py-3 border-t text-center text-[11px] font-mono flex items-center justify-between ${
            isLight ? 'bg-slate-100/80 border-slate-200 text-slate-600' : 'bg-[#0a0d17] border-zinc-800 text-zinc-400'
          }`}
        >
          <span>Você poderá alternar o perfil de Aluno / Professor ou alterar o ambiente no menu a qualquer momento.</span>
          <button
            type="button"
            onClick={() => handleNavigateDestination(onEnterSimulatorDirectly)}
            className="hover:underline text-cyan-500 font-bold cursor-pointer"
          >
            Pular e Ir para o Ventilador →
          </button>
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
