import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Activity,
  SlidersHorizontal,
  Target,
  FileText,
  Clock,
  Sparkles,
  HelpCircle,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface StudentTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMissions?: () => void;
  onOpenMissions?: () => void;
  onOpenCases?: () => void;
  onStartTour?: () => void;
}

interface TutorialStep {
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  bulletPoints: { title: string; desc: string }[];
  clinicalTip: string;
}

export const StudentTutorialModal: React.FC<StudentTutorialModalProps> = ({
  isOpen,
  onClose,
  onStartMissions,
  onOpenMissions,
  onOpenCases,
  onStartTour,
}) => {
  const { isLight } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps: TutorialStep[] = [
    {
      title: 'Bem-vindo ao Treinamento em Ventilação Mecânica',
      subtitle: 'Ambiente de Simulação Realista e Raciocínio Clínico',
      badge: 'Introdução',
      icon: GraduationCap,
      description:
        'Este simulador reproduz o comportamento fisiológico e mecânico de pacientes de UTI acoplados a ventiladores mecânicos modernos. Aqui você não receberá receitas prontas: você será desafiado a raciocinar sobre a fisiopatologia e realizar os ajustes adequados.',
      bulletPoints: [
        {
          title: 'Curvas em Tempo Real',
          desc: 'Pressão nas Vias Aéreas (Paw), Fluxo (L/min) e Volume (mL) sincronizados com a mecânica pulmonar.',
        },
        {
          title: 'Mecânica e Vagas Gasométricas',
          desc: 'Complacência, Resistência, Driving Pressure, Auto-PEEP e Gasometria Arterial completa.',
        },
        {
          title: 'Desafios Baseados em Evidência',
          desc: 'Aplicação prática de ventilação protetora (SDRA, DPOC, Asma, Pós-Operatório e Desmame).',
        },
      ],
      clinicalTip:
        'Dica de Estudo: Sempre observe a relação entre o ajuste do ventilador e a resposta no gráfico antes de confirmar novas configurações.',
    },
    {
      title: 'Barra Inferior: Ajuste de Parâmetros e Modos',
      subtitle: 'Como manipular os Touch Tiles do Ventilador',
      badge: 'Controles',
      icon: SlidersHorizontal,
      description:
        'Na barra inferior estão os modos ventilatórios (VCV, PCV, PSV, SIMV-VC, CPAP) e os cartões táteis de parâmetros (VT, PEEP, FR, Pinsp, FiO2, Ti, Disparo).',
      bulletPoints: [
        {
          title: 'Botões [+] e [-] com Auto-Repetição',
          desc: 'Toque para alterar passo a passo, ou mantenha pressionado para aceleração contínua.',
        },
        {
          title: 'Atalhos Rápidos com 1 Toque',
          desc: 'Toque no número central para abrir valores clínicos comuns (ex: VT 400, 450, 500 mL) ou dê duplo-clique para digitar.',
        },
        {
          title: 'Confirmação de Segurança ("PROPOSTO")',
          desc: 'Parâmetros modificados ficam em âmbar. Clique no botão verde "Confirmar Parâmetros" para aplicá-los ao paciente.',
        },
      ],
      clinicalTip:
        'Segurança Clínica: No modo VCV calcule sempre o VT pelo Peso Predito (IBW) de 4 a 8 mL/kg, nunca pelo peso da balança.',
    },
    {
      title: 'Gráficos de Curvas e Escalas de Tempo',
      subtitle: 'Interpretação e Ajuste de Janela Temporal (6s a 60s)',
      badge: 'Gráficos',
      icon: Clock,
      description:
        'O visor principal exibe as ondas de Pressão, Fluxo e Volume em alta resolução com subgrade calibrada de UTI.',
      bulletPoints: [
        {
          title: 'Ajuste de Tempo no Gráfico',
          desc: 'Use os botões 6s, 10s, 15s, 30s ou 60s no topo do gráfico para visualizar ciclos rápidos ou tendências respiratórias.',
        },
        {
          title: 'Congelar Gráfico (Freeze)',
          desc: 'Pressione "Congelar" para pausar as curvas e passar o cursor para inspecionar pontos exatos de pressão e tempo.',
        },
        {
          title: 'Redimensionar Espaço',
          desc: 'Arraste a barra divisória entre o gráfico e os parâmetros para deixar o visor do tamanho que preferir.',
        },
      ],
      clinicalTip:
        'Auto-PEEP: Se a curva de fluxo expiratório não chegar ao zero antes da próxima inspiração, há aprisionamento de ar dinâmico!',
    },
    {
      title: 'Painel Clínico: Vitais, Volumes e Gasometria',
      subtitle: 'Monitorização Contínua do Estado do Paciente',
      badge: 'Monitorização',
      icon: Activity,
      description:
        'O painel lateral direito exibe os dados vitais em tempo real, divididos entre a aba de Vitais Rápidos e Mecânica Detalhada.',
      bulletPoints: [
        {
          title: 'Volumes Inspiratórios e Expiratórios (VTi / VTe)',
          desc: 'Acompanhe o volume entregue e o volume expirado, além do Volume Minuto (VM) em L/min.',
        },
        {
          title: 'Módulo de Gasometria Arterial',
          desc: 'Diretamente sob a oximetria de pulso: pH, PaCO2, PaO2, HCO3, Base Excess e relação PaO2/FiO2 com diagnóstico automatizado.',
        },
        {
          title: 'Oximetria e Curva Pletismográfica',
          desc: 'SpO2 em tempo real com curva de pulso vascular e cálculo do Índice de Perfusão (PI%).',
        },
      ],
      clinicalTip:
        'Meta Protetora: Mantenha Driving Pressure (ΔP = Pplatô - PEEP) ≤ 14 cmH₂O e Pressão de Platô ≤ 30 cmH₂O.',
    },
    {
      title: 'Missões Clínicas Desafiadoras & Quiz',
      subtitle: 'Como vencer os desafios de raciocínio clínico',
      badge: 'Desafios',
      icon: Target,
      description:
        'As missões foram desenhadas para desafiar o seu raciocínio. Elas indicam a situação crítica do paciente e a meta esperada, cabendo a você descobrir a melhor estratégia.',
      bulletPoints: [
        {
          title: 'Feedback Dinâmico',
          desc: 'Cada ajuste feito no ventilador atualiza em tempo real a gasometria e a mecânica do paciente.',
        },
        {
          title: 'Quiz de Avaliação',
          desc: 'Teste seu domínio teórico com perguntas objetivas e justificativas clínicas detalhadas.',
        },
        {
          title: 'Casos Criados pelo Professor',
          desc: 'Seus docentes podem criar novos casos e questões personalizadas para a sua turma!',
        },
      ],
      clinicalTip:
        'Objetivo Final: Desenvolver autonomia clínica e segurança antes de tocar em um paciente real de UTI.',
    },
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    audioEngine.playClick(900);
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onClose();
      if (onStartTour) {
        onStartTour();
      } else if (onStartMissions) {
        onStartMissions();
      } else if (onOpenCases) {
        onOpenCases();
      }
    }
  };

  const handlePrev = () => {
    audioEngine.playClick(750);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0d101d] border-zinc-700 text-zinc-100'
        }`}
      >
        {/* Top Header */}
        <div
          className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121626] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl flex items-center justify-center ${
                isLight ? 'bg-cyan-100 text-cyan-800' : 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60'
              }`}
            >
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-500">
                  Tutorial do Estudante
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    isLight ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-[#181d33] text-zinc-300 border-zinc-700'
                  }`}
                >
                  Passo {currentStep + 1} de {steps.length}
                </span>
              </div>
              <h3 className="text-base font-display font-black leading-tight mt-0.5">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-[#151928] hover:bg-[#20253d] text-zinc-300 border-zinc-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 ${
              isLight ? 'bg-cyan-50/60 border-cyan-200' : 'bg-cyan-950/20 border-cyan-800/40'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl ${
                isLight ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-black font-bold'
              }`}
            >
              <step.icon className="w-6 h-6" />
            </div>
            <div>
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wide block ${isLight ? 'text-cyan-800' : 'text-cyan-400'}`}>
                {step.subtitle}
              </span>
              <p className={`text-xs leading-relaxed mt-0.5 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                {step.description}
              </p>
            </div>
          </div>

          {/* Bullet Points Grid */}
          <div className="space-y-2">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Pontos Principais:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {step.bulletPoints.map((bp, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#0e111d] border-zinc-800'
                  }`}
                >
                  <span className={`text-xs font-display font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                    {bp.title}
                  </span>
                  <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    {bp.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Tip Box */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isLight
                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                : 'bg-amber-950/30 border-amber-700/50 text-amber-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs font-mono font-medium leading-relaxed">
              {step.clinicalTip}
            </p>
          </div>
        </div>

        {/* Footer Navigation */}
        <div
          className={`p-3.5 border-t flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101423] border-zinc-800'
          }`}
        >
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  audioEngine.playClick(800);
                  setCurrentStep(idx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? 'w-6 bg-cyan-500'
                    : isLight
                    ? 'w-2 bg-slate-300 hover:bg-slate-400'
                    : 'w-2 bg-zinc-700 hover:bg-zinc-600'
                }`}
                title={`Ir para passo ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    : 'bg-[#151928] hover:bg-[#1e2338] text-zinc-300 border-zinc-700'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <span>{currentStep === steps.length - 1 ? 'Iniciar Desafios' : 'Próximo'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
