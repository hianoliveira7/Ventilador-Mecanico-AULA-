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
  onOpenEducational?: () => void;
  onOpenTeacherAdmin?: () => void;
  onEnterSimulatorDirectly?: () => void;
  onOpenAsynchronies?: () => void;
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
  onOpenEducational,
  onOpenTeacherAdmin,
  onEnterSimulatorDirectly,
  onOpenAsynchronies,
}) => {
  const { isLight } = useTheme();
  const [isTeacherAuthOpen, setIsTeacherAuthOpen] = useState(false);
  const [pendingTeacherAction, setPendingTeacherAction] = useState<(() => void) | null>(null);
  
  // Student identification state
  const [studentName, setStudentName] = useState(() => {
    return localStorage.getItem('simulador_student_name') || '';
  });

  if (isOpen === false) return null;

  const handleChooseStudent = () => {
    audioEngine.playConfirmBeep();
    if (studentName.trim()) {
      localStorage.setItem('simulador_student_name', studentName.trim());
    }
    onSelectRole('student');
  };

  const handleRequestTeacher = (action?: () => void) => {
    audioEngine.playClick(850);
    if (currentRole === 'teacher') {
      onSelectRole('teacher');
      if (action) action();
    } else {
      setPendingTeacherAction(() => action || null);
      setIsTeacherAuthOpen(true);
    }
  };

  const handleEnterDirectly = () => {
    audioEngine.playConfirmBeep();
    if (onEnterSimulatorDirectly) {
      onEnterSimulatorDirectly();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
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
          className={`p-6 border-b text-center relative overflow-hidden ${
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
            <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight leading-tight">
              Portal de Acesso & Aprendizagem Clínica
            </h1>
            <p className="text-xs md:text-sm font-sans opacity-90 max-w-xl mx-auto">
              Identifique o seu perfil para acessar ferramentas personalizadas de estudo desafiador ou gestão pedagógica docente.
            </p>
          </div>
        </div>

        {/* Profiles Grid: Aluno vs Professor */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PROFILE 1: ALUNO / ESTUDANTE */}
          <div
            className={`rounded-3xl border p-6 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-xl ${
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
                Acesse simulações em tempo real, desafios gamificados e avaliação contínua. Digite sua identificação para registrar suas conquistas e ranking.
              </p>

              {/* Student Identification Input */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${
                isLight ? 'bg-cyan-50/60 border-cyan-200' : 'bg-[#090d18] border-cyan-900/60'
              }`}>
                <label className="text-xs font-mono font-bold uppercase text-cyan-400 block">
                  1. Sua Identificação (Nome ou Apelido):
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
                  ✓ Este nome será utilizado para gerar seu relatório e pontuação no Kahoot.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                handleChooseStudent();
                handleEnterDirectly();
              }}
              className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 cursor-pointer transition-all active:scale-[0.99]"
            >
              <span>CONFIRMAR & ENTRAR COMO ALUNO</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* PROFILE 2: PROFESSOR / DOCENTE */}
          <div
            className={`rounded-3xl border p-6 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-xl relative ${
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
                Gerencie o conteúdo pedagógico da plataforma. Crie salas de desafios Kahoot com PIN e tempo limite, cadastre novos casos clínicos e acompanhe o progresso das suas turmas.
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
                onClick={() => handleRequestTeacher(handleEnterDirectly)}
                className={`w-full py-2.5 px-4 rounded-xl border font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-[#15192b] hover:bg-[#1f253e] text-zinc-300 border-zinc-700'
                }`}
              >
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>2. IR DIRETO PARA O SIMULADOR</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div
          className={`px-6 py-3 border-t text-center text-[11px] font-mono flex items-center justify-between ${
            isLight ? 'bg-slate-100/80 border-slate-200 text-slate-600' : 'bg-[#0a0d17] border-zinc-800 text-zinc-400'
          }`}
        >
          <span>Você poderá alternar o perfil de Aluno / Professor a qualquer momento na barra superior.</span>
          <button
            type="button"
            onClick={handleEnterDirectly}
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
            handleEnterDirectly();
          }
        }}
      />
    </div>
  );
};
