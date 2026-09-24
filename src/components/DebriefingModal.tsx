import React from 'react';
import {
  CaseDebriefingReport,
  CaseIntervention,
} from '../types/ventilation';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import {
  Award,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  X,
  TrendingDown,
  TrendingUp,
  Activity,
  Zap,
  Target,
  Share2,
  RotateCcw,
} from 'lucide-react';

interface DebriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CaseDebriefingReport | null;
  onRestartCase?: () => void;
}

export const DebriefingModal: React.FC<DebriefingModalProps> = ({
  isOpen,
  onClose,
  report,
  onRestartCase,
}) => {
  const { isLight } = useTheme();

  if (!isOpen || !report) return null;

  const scoreColor =
    report.score >= 85
      ? 'text-emerald-500'
      : report.score >= 70
      ? 'text-cyan-500'
      : report.score >= 50
      ? 'text-amber-500'
      : 'text-rose-500';

  const scoreBadge =
    report.score >= 85
      ? isLight ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
      : report.score >= 70
      ? isLight ? 'bg-cyan-100 text-cyan-950 border-cyan-300' : 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
      : report.score >= 50
      ? isLight ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
      : isLight ? 'bg-rose-100 text-rose-950 border-rose-300' : 'bg-rose-950/80 text-rose-300 border-rose-700/60';

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handlePrint = () => {
    audioEngine.playClick(900);
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 animate-fade-in overflow-y-auto print:p-0 print:bg-white">
      <div
        className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors print:max-h-none print:shadow-none print:border-none ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0d16] border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f131f] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                report.score >= 70
                  ? isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                  : isLight ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
              }`}
            >
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  After Action Review • Debriefing Clínico
                </span>
                <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
                  {report.completedAt}
                </span>
              </div>
              <h2 className="text-lg font-display font-black leading-tight mt-0.5">
                {report.caseTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-[#151928] hover:bg-[#1e2439] text-zinc-300 border-zinc-700/60'
              }`}
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100 border-slate-300' : 'text-zinc-400 hover:text-white hover:bg-zinc-800 border-zinc-700/60'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 font-sans text-sm">
          {/* Top Score and Rating Banner */}
          <div
            className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-4 items-center ${
              isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#0f1422] border-zinc-800/90'
            }`}
          >
            {/* Score circle */}
            <div className="flex items-center gap-3.5">
              <div
                className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center shrink-0 shadow-inner ${
                  isLight ? 'bg-white border-slate-300' : 'bg-[#080a10] border-zinc-800'
                }`}
              >
                <span className={`text-2xl font-black font-display leading-none ${scoreColor}`}>
                  {report.score}
                </span>
                <span className="text-[9px] font-mono text-zinc-400 mt-0.5">/ 100</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                  Classificação Geral
                </span>
                <span className={`inline-block text-xs font-display font-black px-2 py-0.5 rounded-lg border mt-0.5 ${scoreBadge}`}>
                  {report.rating}
                </span>
              </div>
            </div>

            {/* Metas Cumpridas */}
            <div className="sm:border-l sm:pl-4 border-zinc-700/30">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Metas Ventilatórias
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold font-display">
                  {report.goalsCompletedCount} / {report.totalGoalsCount}
                </span>
                <span className="text-xs font-mono text-zinc-400">atingidas</span>
              </div>
              <div className="w-full bg-zinc-700/30 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.round(
                      (report.goalsCompletedCount / Math.max(1, report.totalGoalsCount)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Tempo de Manejo */}
            <div className="sm:border-l sm:pl-4 border-zinc-700/30">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Tempo Total do Caso
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 text-xl font-bold font-mono">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>{formatSeconds(report.durationSeconds)}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 mt-1 block">
                {report.interventions.length} intervenções registradas
              </span>
            </div>
          </div>

          {/* Patient Safety Indices (Índices de Segurança do Paciente) */}
          <div>
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Índices de Segurança do Paciente & Proteção Pulmonar</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* VILI / Driving Pressure Exposure */}
              <div
                className={`p-3 rounded-xl border ${
                  report.safetyMetrics.timeUnderViliSeconds > 30
                    ? isLight ? 'bg-rose-50 border-rose-300' : 'bg-rose-950/30 border-rose-800/60'
                    : isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f1422] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">
                    Exposição a VILI (ΔP &gt; 15)
                  </span>
                  {report.safetyMetrics.timeUnderViliSeconds > 30 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>
                <div className="text-lg font-mono font-bold mt-1">
                  {formatSeconds(report.safetyMetrics.timeUnderViliSeconds)}
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {report.safetyMetrics.timeUnderViliSeconds === 0
                    ? 'Excelente: sem risco de volutrauma.'
                    : report.safetyMetrics.timeUnderViliSeconds < 45
                    ? 'Exposição breve durante titulação.'
                    : 'Atenção: tempo excessivo sob estresse mecânico alveolar.'}
                </p>
              </div>

              {/* Platô Máximo */}
              <div
                className={`p-3 rounded-xl border ${
                  report.safetyMetrics.timeHighPlateauSeconds > 20
                    ? isLight ? 'bg-rose-50 border-rose-300' : 'bg-rose-950/30 border-rose-800/60'
                    : isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f1422] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">
                    Hiperpressão (Pplat &gt; 30)
                  </span>
                  {report.safetyMetrics.timeHighPlateauSeconds > 20 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>
                <div className="text-lg font-mono font-bold mt-1">
                  {formatSeconds(report.safetyMetrics.timeHighPlateauSeconds)}
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {report.safetyMetrics.timeHighPlateauSeconds === 0
                    ? 'Alveolos protegidos dentro do limite fisiológico.'
                    : 'Risco de barotrauma por distensão excessiva.'}
                </p>
              </div>

              {/* Auto-PEEP & Assincronias */}
              <div
                className={`p-3 rounded-xl border ${
                  report.safetyMetrics.asynchronyEventsCount > 0 || report.safetyMetrics.autoPeepRiskEvents > 0
                    ? isLight ? 'bg-amber-50 border-amber-300' : 'bg-amber-950/30 border-amber-800/60'
                    : isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f1422] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">
                    Assincronias & Aprisionamento
                  </span>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-lg font-mono font-bold mt-1">
                  {report.safetyMetrics.asynchronyEventsCount} assincronias
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {report.safetyMetrics.autoPeepRiskEvents > 0
                    ? `${report.safetyMetrics.autoPeepRiskEvents} episódios de Auto-PEEP detectados.`
                    : 'Ventilação bem sincronizada com o paciente.'}
                </p>
              </div>
            </div>
          </div>

          {/* Linha do Tempo das Intervenções (Timeline) */}
          <div>
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-500" />
              <span>Linha do Tempo das Intervenções Clínicas do Aluno</span>
            </h3>

            {report.interventions.length === 0 ? (
              <div className={`p-4 rounded-xl border text-center font-mono text-xs ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-[#0e121d] border-zinc-800 text-zinc-400'
              }`}>
                Nenhuma alteração de parâmetro realizada durante a sessão.
              </div>
            ) : (
              <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-cyan-500/30">
                {report.interventions.map((item, idx) => (
                  <div key={item.id || idx} className="relative group">
                    {/* Timeline dot */}
                    <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-500 ring-4 ring-cyan-500/20 shadow-xs" />

                    <div
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0f1422] border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-cyan-400">
                          {item.timeString}
                        </span>
                        <span className="font-display font-bold">
                          {item.parameterChanged}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono">
                        <span className="line-through text-zinc-500">{String(item.oldValue)}</span>
                        <span className="text-zinc-400">→</span>
                        <span className="font-bold text-emerald-400">{String(item.newValue)}</span>
                      </div>
                      {item.clinicalImpactNotes && (
                        <p className="mt-1 text-[10px] text-zinc-400 italic">
                          {item.clinicalImpactNotes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feedback Baseado em Diretrizes (Diretrizes Brasileiras / ARDSNet) */}
          <div>
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Feedback Educacional & Diretrizes Clínicas</span>
            </h3>

            <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
              isLight ? 'bg-purple-50/60 border-purple-200 text-purple-950' : 'bg-[#141224] border-purple-900/50 text-purple-200'
            }`}>
              {report.guidelineFeedback.map((fb, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-bold text-purple-400 shrink-0">•</span>
                  <p className="leading-relaxed">{fb}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`px-5 py-3.5 border-t flex flex-wrap items-center justify-between gap-2 shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f131f] border-zinc-800'
          }`}
        >
          <div className="text-[11px] font-mono text-zinc-400">
            Relatório gerado automaticamente pelo simulador.
          </div>

          <div className="flex items-center gap-2">
            {onRestartCase && (
              <button
                onClick={() => {
                  onClose();
                  onRestartCase();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Caso</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold shadow-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Concluir Debriefing</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
