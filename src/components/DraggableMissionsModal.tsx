import React from 'react';
import {
  ClinicalCase,
  MonitoredData,
  VentilatorSettings,
  PatientParameters,
} from '../types/ventilation';
import { DraggableWindow } from './DraggableWindow';
import {
  Target,
  CheckCircle2,
  AlertCircle,
  Award,
  Stethoscope,
  Lightbulb,
  FileText,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface DraggableMissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: ClinicalCase | null;
  monitoredData: MonitoredData;
  settings: VentilatorSettings;
  patient: PatientParameters;
  onOpenCases: () => void;
  currentPhaseIndex?: number;
  onNextPhase?: () => void;
  hasDeteriorated?: boolean;
  deteriorationWarning?: string | null;
  onOpenDebriefing?: () => void;
}

export const DraggableMissionsModal: React.FC<DraggableMissionsModalProps> = ({
  isOpen,
  onClose,
  currentCase,
  monitoredData,
  settings,
  patient,
  onOpenCases,
  currentPhaseIndex = 0,
  onNextPhase,
  hasDeteriorated = false,
  deteriorationWarning = null,
  onOpenDebriefing,
}) => {
  const { isLight } = useTheme();

  if (!isOpen) return null;

  if (!currentCase) {
    return (
      <DraggableWindow
        id="missions-window"
        title="Missões Clínicas & Metas Ventilatórias"
        subtitle="Janela flutuante arrastável"
        icon={<Target className="w-4 h-4 text-cyan-500" />}
        isOpen={isOpen}
        onClose={onClose}
        initialX={40}
        initialY={80}
        width="w-[480px] max-w-[95vw]"
      >
        <div className="text-center py-6 space-y-3 font-sans">
          <div
            className={`w-12 h-12 rounded-full border flex items-center justify-center mx-auto ${
              isLight
                ? 'bg-cyan-50 text-cyan-600 border-cyan-200'
                : 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60'
            }`}
          >
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h4 className={`text-sm font-display font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
              Nenhum Caso Clínico Selecionado
            </h4>
            <p className={`text-xs mt-1 font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Selecione um caso clínico para ativar as metas guiadas e evolução em fases.
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenCases();
            }}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Explorar Casos Clínicos</span>
          </button>
        </div>
      </DraggableWindow>
    );
  }

  // Handle phased cases vs standard cases
  const phases = currentCase.phases;
  const hasPhases = phases && phases.length > 0;
  const activePhase = hasPhases ? phases[currentPhaseIndex] || phases[0] : null;

  const currentGoals = activePhase ? activePhase.goals : currentCase.goals || [];

  // Evaluate goals
  const goalStatuses = currentGoals.map((goal) => {
    try {
      const met = goal.isMet(monitoredData, settings, patient);
      return { ...goal, met };
    } catch {
      return { ...goal, met: false };
    }
  });

  const completedCount = goalStatuses.filter((g) => g.met).length;
  const totalCount = goalStatuses.length;
  const progressPercent = Math.round((completedCount / Math.max(1, totalCount)) * 100);
  const allCompleted = completedCount === totalCount && totalCount > 0;
  const isFinalPhase = !hasPhases || currentPhaseIndex >= phases.length - 1;

  return (
    <DraggableWindow
      id="missions-window"
      title={`Missões: ${currentCase.title.split('(')[0]}`}
      subtitle="Janela flutuante arrastável • Acompanhe metas e evolução"
      icon={allCompleted ? <Award className="w-4 h-4 text-emerald-500" /> : <Target className="w-4 h-4 text-cyan-500" />}
      isOpen={isOpen}
      onClose={onClose}
      initialX={40}
      initialY={80}
      width="w-[520px] max-w-[95vw]"
      maxHeight="max-h-[85vh]"
    >
      <div className="space-y-3 font-sans">
        {/* Dynamic Phase Header if case has branching phases */}
        {hasPhases && activePhase && (
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              isLight ? 'bg-cyan-50/80 border-cyan-200 text-cyan-950' : 'bg-cyan-950/40 border-cyan-700/60 text-cyan-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-cyan-600 text-white uppercase">
                Fase {currentPhaseIndex + 1} de {phases.length}
              </span>
              <span className="font-display font-bold">{activePhase.name}</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {isFinalPhase ? 'Fase Final' : 'Cenário Evolutivo'}
            </span>
          </div>
        )}

        {/* Deterioration Alert if triggered */}
        {hasDeteriorated && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-600/80 text-rose-200 animate-pulse space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-display font-black text-xs">
                Deterioração Fisiológica / Evento Adverso!
              </span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-95">
              {deteriorationWarning ||
                'O paciente desenvolveu barotrauma / choque por manter ventilação com Driving Pressure ou Pressão de Platô excessivas por tempo prolongado.'}
            </p>
          </div>
        )}

        {/* Progress Card */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            allCompleted
              ? isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-emerald-950/60 border-emerald-600/80 text-emerald-200'
              : isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#12141c] border-zinc-800 text-zinc-200'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-display font-bold">
                {allCompleted
                  ? isFinalPhase
                    ? 'Parabéns! Caso concluído com sucesso!'
                    : 'Metas da fase atingidas! Pronto para avançar.'
                  : 'Objetivos de Proteção Pulmonar'}
              </span>
            </div>
            <span className={`text-[10px] font-mono block mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              {completedCount} de {totalCount} metas cumpridas ({progressPercent}%)
            </span>
          </div>

          <div className="w-24">
            <div
              className={`h-2 rounded-full overflow-hidden border ${
                isLight ? 'bg-slate-200 border-slate-300' : 'bg-zinc-800 border-zinc-700'
              }`}
            >
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  allCompleted ? 'bg-emerald-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-2">
          {goalStatuses.map((goal, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border transition-all ${
                goal.met
                  ? isLight
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                  : isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-[#12141c] border-zinc-800 text-zinc-300'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {goal.met ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                  ) : (
                    <AlertCircle className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-display font-bold ${
                        goal.met
                          ? isLight ? 'text-emerald-900' : 'text-emerald-300'
                          : isLight ? 'text-slate-800' : 'text-zinc-200'
                      }`}
                    >
                      {goal.description}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase shrink-0 ml-2 ${
                        goal.met
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                          : isLight
                          ? 'bg-slate-200 text-slate-600 border-slate-300'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {goal.met ? 'Atingido' : 'Pendente'}
                    </span>
                  </div>

                  {goal.hint && !goal.met && (
                    <div className="mt-1.5 flex items-start gap-1 text-[11px] text-amber-500">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="leading-snug">{goal.hint}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Phase Transition Button if all goals met and has next phase */}
        {allCompleted && hasPhases && !isFinalPhase && onNextPhase && (
          <div className="pt-1">
            <button
              onClick={() => {
                audioEngine.playConfirmBeep();
                onNextPhase();
              }}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 animate-bounce"
            >
              <Sparkles className="w-4 h-4" />
              <span>Avançar para Fase {currentPhaseIndex + 2}: {phases[currentPhaseIndex + 1]?.name}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          {onOpenDebriefing && (
            <button
              onClick={() => {
                audioEngine.playClick(850);
                onOpenDebriefing();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs shadow-sm transition-all cursor-pointer"
              title="Abrir After Action Review (Debriefing com linha do tempo e score)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ver Debriefing (AAR)</span>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onOpenCases();
            }}
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ml-auto ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60'
            }`}
          >
            Trocar Caso
          </button>
        </div>
      </div>
    </DraggableWindow>
  );
};
