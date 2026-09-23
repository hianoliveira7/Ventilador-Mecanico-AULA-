import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  X,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Info,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import { educationalStorage } from '../services/educationalStorage';

interface TeacherAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Autenticação Docente Requerida',
  subtitle = 'Área restrita a professores e instrutores de UTI para gestão de casos e questões.',
}) => {
  const { isLight } = useTheme();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setIsSuccess(false);
      setIsShaking(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setError('Por favor, digite a senha de acesso docente.');
      triggerShake();
      audioEngine.playErrorBeep();
      return;
    }

    const isValid = educationalStorage.verifyTeacherPassword(password);

    if (isValid) {
      setError(null);
      setIsSuccess(true);
      audioEngine.playConfirmBeep();
      educationalStorage.setUserRole('teacher');
      setTimeout(() => {
        onSuccess();
      }, 400);
    } else {
      setAttempts((prev) => prev + 1);
      setError('Senha incorreta. Verifique a senha ou utilize a senha padrão inicial (docente123).');
      triggerShake();
      audioEngine.playErrorBeep();
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 relative ${
          isShaking ? 'animate-bounce ring-2 ring-rose-500' : ''
        } ${
          isLight
            ? 'bg-gradient-to-b from-white to-slate-50 border-indigo-200 text-slate-900 shadow-indigo-500/10'
            : 'bg-gradient-to-b from-[#0f1322] to-[#090c17] border-indigo-800/80 text-white shadow-2xl'
        }`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 z-20 p-2 rounded-full border transition-all cursor-pointer ${
            isLight
              ? 'bg-white/80 hover:bg-slate-100 text-slate-600 border-slate-200 shadow-sm'
              : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
          }`}
          title="Fechar e cancelar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header / Icon */}
        <div
          className={`p-6 border-b text-center relative overflow-hidden ${
            isLight
              ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white'
              : 'bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border-indigo-900/60'
          }`}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 shadow-inner mb-3">
            {isSuccess ? (
              <CheckCircle2 className="w-9 h-9 text-emerald-300 animate-pulse" />
            ) : (
              <ShieldCheck className="w-9 h-9 text-indigo-300" />
            )}
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-200 border border-white/15">
              <Lock className="w-3 h-3" />
              <span>Acesso Restrito ao Corpo Docente</span>
            </div>
            <h2 className="text-xl font-display font-black tracking-tight">{title}</h2>
            <p className="text-xs text-indigo-100/80 max-w-sm mx-auto leading-relaxed">{subtitle}</p>
          </div>
        </div>

        {/* Body & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
              Digite a Senha de Instrutor:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Senha de acesso..."
                className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm font-mono tracking-wide transition-all outline-none ${
                  error
                    ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/5'
                    : isSuccess
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5'
                    : isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    : 'bg-[#151928] border-zinc-700 text-white focus:bg-[#1b2034] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors cursor-pointer ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-500 hover:text-zinc-200'
                }`}
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-mono animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success message */}
            {isSuccess && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Credenciais validadas! Entrando no painel docente...</span>
              </div>
            )}
          </div>

          {/* Quick Helper Badge with default password */}
          <div
            className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs ${
              isLight
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                : 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200'
            }`}
          >
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <span className="font-semibold block">Dica de Acesso Inicial:</span>
              <p className="font-mono text-[11px]">
                A senha padrão inicial do sistema é{' '}
                <strong className="underline underline-offset-2 px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                  docente123
                </strong>
                . Você pode alterar para uma senha personalizada dentro do painel a qualquer momento.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={isSuccess}
              className={`w-full py-3 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all ${
                isSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white shadow-indigo-600/25'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{isSuccess ? 'Autenticado com Sucesso' : 'Desbloquear & Acessar Painel'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`w-full py-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-[#121624] hover:bg-[#1a1f33] text-zinc-300 border-zinc-800'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-cyan-500" />
              <span>Voltar / Continuar como Aluno</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
