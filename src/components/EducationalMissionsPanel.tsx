import React, { useState } from 'react';
import { ClinicalCase, MonitoredData, VentilatorSettings, PatientParameters } from '../types/ventilation';
import { Target, CheckCircle2, AlertCircle, Award, RefreshCw, ChevronRight } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../context/ThemeContext';

interface EducationalMissionsPanelProps {
  currentCase: ClinicalCase | null;
  monitoredData: MonitoredData;
  settings: VentilatorSettings;
  patient: PatientParameters;
  onOpenCases: () => void;
}

export const EducationalMissionsPanel: React.FC<EducationalMissionsPanelProps> = ({
  currentCase,
  monitoredData,
  settings,
  patient,
  onOpenCases,
}) => {
  const { isLight } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!currentCase || !currentCase.goals || currentCase.goals.length === 0) {
    return (
      <div className={`rounded-xl border shadow-xl p-3 mt-2 flex items-center justify-between transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0a0a0e] border-zinc-800/90'
      }`}>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-500" />
          <div>
            <span className={`text-xs font-display font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
              Modo Prático Livre
            </span>
            <span className={`block text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Nenhum caso clínico guiado ativo no momento.
            </span>
          </div>
        </div>
        <button
          onClick={onOpenCases}
          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-[11px] transition-all cursor-pointer shadow-sm"
        >
          Selecionar Caso
        </button>
      </div>
    );
  }

  // Evaluate each goal
  const goalStatuses = currentCase.goals.map((goal) => {
    try {
      const met = goal.isMet(monitoredData, settings, patient);
      return { ...goal, met };
    } catch {
      return { ...goal, met: false };
    }
  });

  const completedCount = goalStatuses.filter((g) => g.met).length;
  const totalCount = goalStatuses.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const allCompleted = completedCount === totalCount;

  return (
    <div
      className={`rounded-xl border shadow-xl overflow-hidden mt-2 transition-all ${
        allCompleted
          ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
          : isLight
          ? 'bg-white border-slate-200'
          : 'bg-[#0a0a0e] border-zinc-800/90'
      }`}
    >
      {/* Header */}
      <div
        className={`p-2.5 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg ${
              allCompleted
                ? isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                : isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/20 text-cyan-400'
            }`}
          >
            {allCompleted ? <Award className="w-4 h-4" /> : <Target className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-display font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-900' : 'text-zinc-100'
              }`}>
                Missões Clínicas: {currentCase.title.split('(')[0]}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  allCompleted
                    ? 'bg-emerald-600 text-white'
                    : isLight
                    ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                }`}
              >
                {completedCount} / {totalCount} Concluídas
              </span>
            </div>
            <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Ajuste o ventilador para cumprir as metas terapêuticas baseadas em evidências.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCases}
            className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[10px] border transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-[#161824] hover:bg-[#202334] text-zinc-300 border-zinc-700/60'
            }`}
          >
            Trocar Caso
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={`w-full h-1.5 overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-zinc-900'}`}>
        <div
          className={`h-full transition-all duration-500 ${allCompleted ? 'bg-emerald-500' : 'bg-cyan-500'}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Goals List */}
      {!isCollapsed && (
        <div className={`p-3 space-y-2 ${isLight ? 'bg-slate-50/50' : 'bg-[#0a0a0e]/60'}`}>
          {goalStatuses.map((goal, idx) => (
            <div
              key={goal.id || idx}
              className={`p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                goal.met
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                  : isLight
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-[#12131c] border-zinc-800/80 text-zinc-300'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {goal.met ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-mono font-bold ${
                    isLight ? 'border-slate-300 text-slate-500' : 'border-zinc-600 text-zinc-500'
                  }`}>
                    {idx + 1}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <p className="text-xs font-display font-bold leading-snug">{goal.description}</p>
                <p className={`text-[10px] font-mono leading-relaxed ${
                  goal.met
                    ? isLight ? 'text-emerald-700 font-bold' : 'text-emerald-300/80 font-bold'
                    : isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  💡 {goal.targetFeedback}
                </p>
              </div>
            </div>
          ))}

          {allCompleted && (
            <div className={`p-3 rounded-lg border text-center space-y-1 animate-pulse ${
              isLight
                ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
            }`}>
              <span className="text-xs font-display font-bold block">
                🎉 PARABÉNS! CASO CLÍNICO RESOLVIDO COM SUCESSO!
              </span>
              <p className={`text-[10px] font-mono ${isLight ? 'text-emerald-800' : 'text-emerald-400/80'}`}>
                O paciente encontra-se estável, sob ventilação protetora e com trocas gasosas adequadas.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
