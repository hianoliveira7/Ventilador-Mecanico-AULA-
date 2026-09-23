import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Activity,
  Sliders,
  Gauge,
  Stethoscope,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../context/ThemeContext';

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  position: 'bottom' | 'top' | 'left' | 'right' | 'center';
  badge: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-welcome',
    title: 'Bem-vindo ao Simulador VM - FISIO',
    description:
      'Esta é uma estação de alta fidelidade para aprendizado prático de Ventilação Mecânica Invasiva e Gasometria Arterial. Vamos fazer um tour guiado de 1 minuto para você conhecer os principais módulos.',
    icon: Sparkles,
    position: 'center',
    badge: 'Introdução',
  },
  {
    targetId: 'tour-topbar',
    title: 'Barra Superior & Modos do Sistema',
    description:
      'Aqui você visualiza o modo ativo, dados do paciente atual (peso predito, sexo), status de alarmes com som de UTI e atalhos para os Casos Clínicos & Quizzes de avaliação.',
    icon: Stethoscope,
    position: 'bottom',
    badge: 'Barra Superior',
  },
  {
    targetId: 'tour-waveforms',
    title: 'Curvas & Gráficos em Tempo Real',
    description:
      'Acompanhe as curvas contínuas de Pressão x Tempo, Fluxo x Tempo e Volume x Tempo, além dos Loops P-V e F-V com física pulmonar realista e detecção de assincronias paciente-ventilador.',
    icon: Activity,
    position: 'right',
    badge: 'Gráficos',
  },
  {
    targetId: 'tour-monitored',
    title: 'Painel de Monitorização Clínica',
    description:
      'Veja os parâmetros calculados respiração a respiração: Pressão de Pico, Pressão de Platô, Complacência Estática (Cst), Resistência (Raw), Driving Pressure, Gasometria e Troca Gasosa.',
    icon: Gauge,
    position: 'left',
    badge: 'Mecânica & Gasometria',
  },
  {
    targetId: 'tour-parameters',
    title: 'Ajuste de Parâmetros Ventilatórios',
    description:
      'Altere o Modo (VCV, PCV, PSV/CPAP, PRVC), Volume Corrente (Vt), Pressão Inspiratória, PEEP, FiO₂, Frequência e Sensibilidade do disparo. Clique no botão de confirmação para aplicar as mudanças com transição fisiológica suave.',
    icon: Sliders,
    position: 'top',
    badge: 'Controles',
  },
  {
    targetId: 'tour-maneuvers',
    title: 'Manobras Diagnósticas & Ações Rápidas',
    description:
      'Execute Pausa Inspiratória manual/automática para medir Platô, Pausa Expiratória para Auto-PEEP, Manobra de Recrutamento Alveolar, acione o Drive Espontâneo do paciente ou abra a Calculadora Clínica e Gasometria.',
    icon: Activity,
    position: 'top',
    badge: 'Manobras',
  },
  {
    targetId: 'tour-cases-quiz',
    title: 'Casos Clínicos & Quiz de Avaliação',
    description:
      'Acesse a página integrada com dezenas de casos clínicos reais (SDRA, DPOC, Asma, TCE) e o Quiz de fixação com explicações baseadas em evidências para testar seu raciocínio clínico!',
    icon: BookOpen,
    position: 'bottom',
    badge: 'Estudo & Avaliação',
  },
];

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { isLight } = useTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStepIndex];

  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return;

    if (step.position === 'center' || step.targetId === 'tour-welcome') {
      setTargetRect(null);
      return;
    }

    const element = document.getElementById(step.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect);
    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [updateTargetRect]);

  if (!isOpen) return null;

  const handleNext = () => {
    audioEngine.playClick(800);
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      audioEngine.playConfirmBeep();
      if (onComplete) onComplete();
      onClose();
    }
  };

  const handlePrev = () => {
    audioEngine.playClick(600);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    audioEngine.playClick(400);
    if (onComplete) onComplete();
    onClose();
  };

  const Icon = step.icon;

  // Calculate tooltip placement styles
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '460px',
      };
    }

    const margin = 16;
    const tooltipWidth = 420;

    switch (step.position) {
      case 'bottom':
        return {
          top: `${Math.min(window.innerHeight - 300, targetRect.bottom + margin)}px`,
          left: `${Math.max(margin, Math.min(window.innerWidth - tooltipWidth - margin, targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2)))}px`,
          width: `${tooltipWidth}px`,
        };
      case 'top':
        return {
          bottom: `${Math.min(window.innerHeight - 20, window.innerHeight - targetRect.top + margin)}px`,
          left: `${Math.max(margin, Math.min(window.innerWidth - tooltipWidth - margin, targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2)))}px`,
          width: `${tooltipWidth}px`,
        };
      case 'left':
        return {
          top: `${Math.max(margin, Math.min(window.innerHeight - 320, targetRect.top + 20))}px`,
          right: `${Math.max(margin, window.innerWidth - targetRect.left + margin)}px`,
          width: `${tooltipWidth}px`,
        };
      case 'right':
        return {
          top: `${Math.max(margin, Math.min(window.innerHeight - 320, targetRect.top + 20))}px`,
          left: `${Math.max(margin, targetRect.right + margin)}px`,
          width: `${tooltipWidth}px`,
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '460px',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto overflow-hidden animate-fade-in">
      {/* Dark overlay backdrop with cutout for targeted element */}
      <svg className="w-full h-full absolute inset-0 pointer-events-none">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.78)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Illuminated target border highlight */}
      {targetRect && (
        <div
          style={{
            position: 'absolute',
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
          className="rounded-2xl border-2 border-cyan-400 pointer-events-none shadow-[0_0_25px_rgba(6,182,212,0.6)] animate-pulse"
        />
      )}

      {/* Floating Interactive Tooltip / Modal Card */}
      <div
        style={getTooltipStyle()}
        className={`fixed z-50 rounded-2xl border shadow-2xl p-5 flex flex-col transition-all duration-300 ${
          isLight
            ? 'bg-white border-cyan-300 text-slate-900 shadow-cyan-950/20'
            : 'bg-[#0c1017] border-cyan-500/50 text-zinc-100 shadow-black/80'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl border ${
              isLight
                ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                : 'bg-cyan-950/80 border-cyan-600/50 text-cyan-300'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${
                isLight ? 'text-cyan-700' : 'text-cyan-400'
              }`}>
                {step.badge} • Passo {currentStepIndex + 1} de {TOUR_STEPS.length}
              </span>
              <h3 className={`text-sm font-display font-black leading-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {step.title}
              </h3>
            </div>
          </div>

          <button
            onClick={handleSkip}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
            }`}
            title="Fechar / Pular Tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <p className={`text-xs leading-relaxed font-sans mb-4 ${
          isLight ? 'text-slate-700' : 'text-zinc-300'
        }`}>
          {step.description}
        </p>

        {/* Step Progress Indicators */}
        <div className="flex items-center gap-1.5 mb-4">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? 'w-6 bg-cyan-500'
                  : idx < currentStepIndex
                  ? 'w-2 bg-emerald-500'
                  : isLight
                  ? 'w-2 bg-slate-300'
                  : 'w-2 bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-200/20">
          <button
            onClick={handleSkip}
            className={`text-[11px] font-mono transition-all cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:text-slate-800'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Pular tour
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-lg shadow-cyan-600/30"
            >
              <span>{currentStepIndex < TOUR_STEPS.length - 1 ? 'Próximo' : 'Concluir Tour'}</span>
              {currentStepIndex < TOUR_STEPS.length - 1 ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
