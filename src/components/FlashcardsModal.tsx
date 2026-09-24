import React, { useState, useEffect, useRef } from 'react';
import { FlashcardItem } from '../types/ventilation';
import { educationalStorage } from '../services/educationalStorage';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../context/ThemeContext';
import {
  Zap,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Award,
  ChevronRight,
  RotateCcw,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Info,
  Stethoscope,
  Activity,
} from 'lucide-react';

interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPresetToSimulator?: (preset: FlashcardItem['waveformPreset']) => void;
}

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({
  isOpen,
  onClose,
  onApplyPresetToSimulator,
}) => {
  const { isLight } = useTheme();
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const all = educationalStorage.getAllFlashcards();
      setCards(all);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setCompleted(false);
    }
  }, [isOpen]);

  const filteredCards =
    categoryFilter === 'all'
      ? cards
      : cards.filter((c) => c.category === categoryFilter);

  const currentCard = filteredCards[currentIndex] || filteredCards[0];

  // Draw realistic synthetic waveforms matching the current card's asynchrony
  useEffect(() => {
    if (!currentCard || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = isLight ? '#f8fafc' : '#070a12';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = isLight ? '#e2e8f0' : '#141a29';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Two tracks: Pressure (top half) and Flow (bottom half)
    const midY = height / 2;
    ctx.strokeStyle = isLight ? '#cbd5e1' : '#222b40';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Labels
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
    ctx.fillText('PRESSÃO (Paw) [cmH₂O]', 10, 16);

    ctx.fillStyle = isLight ? '#059669' : '#34d399';
    ctx.fillText('FLUXO (Flow) [L/min]', 10, midY + 16);

    // Baseline zero for flow
    const flowZeroY = midY + (height - midY) / 2;
    ctx.strokeStyle = isLight ? '#94a3b8' : '#334155';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, flowZeroY);
    ctx.lineTo(width, flowZeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw simulated waveforms based on current card
    const numPoints = width;
    const pPoints: { x: number; y: number }[] = [];
    const fPoints: { x: number; y: number }[] = [];

    const pBaseY = midY - 15;
    const pScale = (midY - 30) / 45; // 45 cmH2O max
    const fScale = (height - midY - 30) / 120; // 120 L/min max

    const cardId = currentCard.id;

    for (let x = 0; x < numPoints; x++) {
      const t = (x / width) * 4; // 4 seconds total
      let pVal = 5; // PEEP 5
      let fVal = 0;

      // Repeat cycles every 2 seconds
      const cycleT = t % 2.0;

      if (cardId.includes('esforco-ineficaz')) {
        // Obstructive with ineffective effort at cycleT = 1.4s
        if (cycleT < 0.8) {
          pVal = 5 + 18 * Math.sin((cycleT / 0.8) * Math.PI);
          fVal = 50 * (1 - cycleT / 0.8);
        } else {
          // Exp
          const expT = cycleT - 0.8;
          fVal = -45 * Math.exp(-expT / 0.7);
          // Ineffective effort trigger deflection at expT ~ 0.5s
          if (expT > 0.4 && expT < 0.7) {
            pVal = 5 - 3.5 * Math.sin(((expT - 0.4) / 0.3) * Math.PI);
            fVal += 22 * Math.sin(((expT - 0.4) / 0.3) * Math.PI);
          }
        }
      } else if (cardId.includes('duplo-disparo')) {
        // Two consecutive inspiratory cycles without expiration
        if (cycleT < 0.5) {
          pVal = 8 + 22 * (cycleT / 0.5);
          fVal = 60 * (1 - cycleT / 0.5);
        } else if (cycleT < 0.6) {
          pVal = 20;
          fVal = -15; // brief dip
        } else if (cycleT < 1.1) {
          // Second trigger stacked
          const c2 = cycleT - 0.6;
          pVal = 20 + 18 * (c2 / 0.5);
          fVal = 55 * (1 - c2 / 0.5);
        } else {
          const expT = cycleT - 1.1;
          fVal = -60 * Math.exp(-expT / 0.35);
          pVal = 8;
        }
      } else if (cardId.includes('fome-de-fluxo')) {
        // Flow starvation: scooped pressure curve
        if (cycleT < 0.9) {
          const u = cycleT / 0.9;
          // Scoop dip in middle
          pVal = 6 + 20 * u - 10 * Math.sin(u * Math.PI);
          fVal = 32; // Square fixed low flow
        } else {
          const expT = cycleT - 0.9;
          fVal = -40 * Math.exp(-expT / 0.4);
          pVal = 6;
        }
      } else if (cardId.includes('mecanica-resistiva')) {
        // High peak, low plateau
        if (cycleT < 0.7) {
          pVal = 5 + 40; // High PIP
          fVal = 60;
        } else if (cycleT < 0.9) {
          // Plateau
          pVal = 5 + 15;
          fVal = 0;
        } else {
          const expT = cycleT - 0.9;
          fVal = -50 * Math.exp(-expT / 0.4);
          pVal = 5;
        }
      } else if (cardId.includes('auto-peep')) {
        // Auto-PEEP: expiratory flow doesn't reach zero before next cycle
        if (cycleT < 0.7) {
          pVal = 5 + 24 * Math.sin((cycleT / 0.7) * Math.PI);
          fVal = 55 * (1 - cycleT / 0.7);
        } else {
          const expT = cycleT - 0.7;
          fVal = -45 * Math.exp(-expT / 1.5) - 15; // Cut off!
          pVal = 5;
        }
      } else {
        // Standard premature cycling or generic
        if (cycleT < 0.4) {
          pVal = 6 + 18 * (cycleT / 0.4);
          fVal = 50 * (1 - cycleT / 0.4);
        } else {
          const expT = cycleT - 0.4;
          fVal = -40 * Math.exp(-expT / 0.35);
          pVal = 6;
        }
      }

      const py = pBaseY - pVal * pScale;
      const fy = flowZeroY - fVal * fScale;

      pPoints.push({ x, y: py });
      fPoints.push({ x, y: fy });
    }

    // Draw Pressure Waveform
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isLight ? '#0284c7' : '#38bdf8';
    ctx.beginPath();
    pPoints.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Draw Flow Waveform
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isLight ? '#059669' : '#34d399';
    ctx.beginPath();
    fPoints.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Draw Annotations (Setas e Destaques Didáticos)
    if (currentCard.annotations && currentCard.annotations.length > 0) {
      currentCard.annotations.forEach((ann) => {
        const ax = (ann.xPercent / 100) * width;
        const trackBaseY = ann.track === 'pressure' ? 0 : midY;
        const trackHeight = midY;
        const ay = trackBaseY + (ann.yPercent / 100) * trackHeight;

        // Draw pulsing highlight ring
        ctx.strokeStyle = '#f43f5e';
        ctx.fillStyle = '#f43f5e';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(ax, ay, 5, 0, Math.PI * 2);
        ctx.fill();

        // Arrow and text callout
        ctx.beginPath();
        ctx.arc(ax, ay, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Label box
        ctx.font = 'bold 9.5px monospace';
        const textWidth = ctx.measureText(ann.text).width;
        const boxX = Math.min(width - textWidth - 14, Math.max(10, ax - textWidth / 2));
        const boxY = ann.yPercent > 50 ? ay - 24 : ay + 14;

        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 20, 32, 0.95)';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1;
        ctx.fillRect(boxX - 4, boxY - 10, textWidth + 8, 16);
        ctx.strokeRect(boxX - 4, boxY - 10, textWidth + 8, 16);

        ctx.fillStyle = isLight ? '#9f1239' : '#fda4af';
        ctx.fillText(ann.text, boxX, boxY + 2);
      });
    }
  }, [currentCard, isLight]);

  if (!isOpen) return null;

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
    audioEngine.playClick(700);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !currentCard) return;
    setIsAnswerSubmitted(true);
    if (selectedOption === currentCard.correctIndex) {
      audioEngine.playConfirmBeep();
      setScore((prev) => prev + 1);
    } else {
      audioEngine.triggerAlarmPattern('medium');
    }
  };

  const handleNext = () => {
    audioEngine.playClick(800);
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    audioEngine.playConfirmBeep();
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setCompleted(false);
  };

  const categories = ['all', ...Array.from(new Set(cards.map((c) => c.category)))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5 animate-fade-in overflow-y-auto">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0d16] border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Top Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f131f] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Treino Rápido • Reconhecimento de Curvas
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  Card {currentIndex + 1} de {filteredCards.length}
                </span>
              </div>
              <h2 className="text-base font-display font-black mt-0.5">
                {currentCard ? currentCard.title : 'Reconhecimento de Assincronias'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Category selector */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentIndex(0);
                setSelectedOption(null);
                setIsAnswerSubmitted(false);
              }}
              className={`text-xs font-mono px-2 py-1 rounded-xl border focus:outline-none cursor-pointer ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#151928] border-zinc-700 text-zinc-200'
              }`}
            >
              <option value="all">Todas Categorias</option>
              <option value="Disparo">Disparo</option>
              <option value="Fluxo">Fluxo</option>
              <option value="Ciclagem">Ciclagem</option>
              <option value="Mecânica">Mecânica</option>
            </select>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isLight ? 'text-slate-400 hover:text-slate-800 border-slate-300' : 'text-zinc-400 hover:text-white border-zinc-700/60'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 font-sans text-sm">
          {!completed && currentCard ? (
            <>
              {/* Canvas Waveform Display with Annotations */}
              <div className="rounded-2xl border overflow-hidden shadow-inner relative">
                <canvas
                  ref={canvasRef}
                  width={750}
                  height={220}
                  className="w-full h-[220px] block"
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-black/60 text-white backdrop-blur-xs border border-white/10">
                    {currentCard.category} • Dificuldade: {currentCard.difficulty}
                  </span>
                </div>
              </div>

              {/* Clinical Context Pill */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#0f1422] border-zinc-800 text-zinc-300'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-cyan-400 font-display">Cenário Clínico: </strong>
                  {currentCard.clinicalContext}
                </p>
              </div>

              {/* Question */}
              <div className="space-y-1">
                <h3 className="font-display font-bold text-base leading-snug">
                  {currentCard.question}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentCard.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentCard.correctIndex;

                  let btnStyle = isLight
                    ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                    : 'bg-[#0f1422] border-zinc-800 hover:bg-[#161d31] text-zinc-200';

                  if (isAnswerSubmitted) {
                    if (isCorrect) {
                      btnStyle = isLight
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold'
                        : 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-bold';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = isLight
                        ? 'bg-rose-100 border-rose-400 text-rose-950 font-bold'
                        : 'bg-rose-950/70 border-rose-500 text-rose-200 font-bold';
                    }
                  } else if (isSelected) {
                    btnStyle = isLight
                      ? 'bg-cyan-100 border-cyan-400 text-cyan-950 font-bold ring-2 ring-cyan-400/40'
                      : 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-bold ring-2 ring-cyan-500/40';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswerSubmitted}
                      className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${btnStyle}`}
                    >
                      <span className="w-5 h-5 rounded-full border flex items-center justify-center font-mono text-xs shrink-0 mt-0.5">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 leading-relaxed text-xs">{opt}</span>
                      {isAnswerSubmitted && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      {isAnswerSubmitted && isSelected && !isCorrect && (
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback and Immediate Action once submitted */}
              {isAnswerSubmitted && (
                <div
                  className={`p-4 rounded-xl border space-y-2.5 animate-fadeIn text-xs ${
                    selectedOption === currentCard.correctIndex
                      ? isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                      : isLight ? 'bg-rose-50 border-rose-300 text-rose-950' : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-display font-black text-sm">
                      {selectedOption === currentCard.correctIndex
                        ? 'Correto! Excelente raciocínio gráfico.'
                        : 'Incorreto. Veja a justificativa abaixo:'}
                    </span>
                  </div>

                  <p className="leading-relaxed opacity-90">{currentCard.explanation}</p>

                  <div className="pt-1.5 border-t border-current/20">
                    <strong className="font-display">Conduta Imediata no Ventilador: </strong>
                    <span>{currentCard.immediateAction}</span>
                  </div>

                  {onApplyPresetToSimulator && (
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          onApplyPresetToSimulator(currentCard.waveformPreset);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-[11px] shadow-sm cursor-pointer transition-all inline-flex items-center gap-1.5"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Carregar este Traçado no Ventilador Real</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Completed view */
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-display font-black">
                  Treino de Reconhecimento Concluído!
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  Você acertou {score} de {filteredCards.length} traçados de curvas (
                  {Math.round((score / Math.max(1, filteredCards.length)) * 100)}%).
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-xl border border-zinc-700 font-mono text-xs font-bold hover:bg-zinc-800 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Repetir Treino</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Voltar ao Ventilador
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {!completed && currentCard && (
          <div
            className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f131f] border-zinc-800'
            }`}
          >
            <span className="text-xs font-mono text-zinc-400">
              Pontuação atual: {score} acertos
            </span>

            <div className="flex items-center gap-2">
              {!isAnswerSubmitted ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null}
                  className={`px-5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all shadow-md cursor-pointer ${
                    selectedOption !== null
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                  }`}
                >
                  Confirmar Resposta
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1"
                >
                  <span>{currentIndex < filteredCards.length - 1 ? 'Próxima Curva' : 'Ver Resultado'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
