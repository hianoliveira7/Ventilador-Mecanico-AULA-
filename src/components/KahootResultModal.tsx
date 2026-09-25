import React from 'react';
import { StudentGameResult } from '../services/localDatabase';
import { useTheme } from '../context/ThemeContext';
import {
  Trophy,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Zap,
  BookOpen,
  ArrowRight,
  X,
} from 'lucide-react';

interface KahootResultModalProps {
  isOpen: boolean;
  result: StudentGameResult | null;
  onClose: () => void;
  onRetry: () => void;
}

export const KahootResultModal: React.FC<KahootResultModalProps> = ({
  isOpen,
  result,
  onClose,
  onRetry,
}) => {
  const { isLight } = useTheme();

  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-4 animate-fadeIn">
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0c18] border-indigo-900/80 text-zinc-100'
        }`}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 p-6 text-white text-center relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-3xs" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-all text-white cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-slate-950 font-mono font-black text-xs uppercase rounded-full shadow-lg">
              <Trophy className="w-4 h-4" />
              <span>RESULTADO FINAL KAHOOT</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight drop-shadow-md">
              {result.studentName}
            </h2>

            <div className="text-3xl sm:text-4xl font-mono font-black text-amber-300 drop-shadow-md">
              {result.score} <span className="text-lg font-normal text-amber-100">/ {result.maxScore} Pts</span>
            </div>

            <div className="inline-block px-4 py-1.5 rounded-xl bg-black/40 border border-white/20 text-xs font-mono font-bold text-amber-200">
              {result.rankBadge} ({result.gradePercentage}%)
            </div>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className={`p-3 border-b grid grid-cols-3 gap-2 text-center text-xs font-mono ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f1224] border-indigo-950'
        }`}>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase">Código da Sala</span>
            <span className="font-bold text-amber-400">{result.roomCode}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase">Tempo Concluído</span>
            <span className="font-bold text-cyan-400 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> {result.completionTimeSeconds}s
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase">Erros Identificados</span>
            <span className={`font-bold ${result.mistakes.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {result.mistakes.length} falha(s)
            </span>
          </div>
        </div>

        {/* Scrollable Detailed Feedback & Mistake Breakdown */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Strengths Section */}
          {result.strengths.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Pontos Fortes Demonstrados na Condução:
              </span>
              <div className="space-y-1.5">
                {result.strengths.map((str, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs font-sans flex items-start gap-2 ${
                      isLight
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{str}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mistakes & Clinical Recommendations Section */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Erros Identificados & O que Fazer para Melhorar:
            </span>

            {result.mistakes.length === 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono text-center">
                🎉 Parabéns! Nenhuma conduta lesiva ou erro grave foi identificado no seu manejo!
              </div>
            ) : (
              <div className="space-y-3">
                {result.mistakes.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl border space-y-2 ${
                      isLight
                        ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                        : 'bg-[#150a12] border-rose-900/60 text-rose-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-rose-900/30 pb-1.5">
                      <div className="flex items-center gap-2 font-display font-bold text-xs text-rose-400">
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{m.title}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded font-mono font-bold text-[10px]">
                        -{m.penaltyPoints} Pts
                      </span>
                    </div>

                    <p className="text-xs font-sans leading-relaxed text-rose-200/90">
                      {m.description}
                    </p>

                    <div className={`p-2.5 rounded-xl border text-xs font-sans flex items-start gap-2 ${
                      isLight
                        ? 'bg-amber-100/60 border-amber-300 text-amber-950'
                        : 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                    }`}>
                      <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-mono text-[10px] text-amber-300 uppercase">
                          💡 O que fazer para melhorar na vida real:
                        </strong>
                        <span>{m.recommendation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Controls */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f1224] border-indigo-950'
        }`}>
          <button
            onClick={onRetry}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-mono font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>TENTAR NOVAMENTE</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>CONCLUIR & VOLTAR</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
