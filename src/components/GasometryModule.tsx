import React from 'react';
import { MonitoredData, PatientParameters } from '../types/ventilation';
import { FileText, ExternalLink, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  getPhGrade,
  getPaco2Grade,
  getPao2Grade,
  getHco3Grade,
  getBeGrade,
  getPfGrade,
} from '../utils/gasometryColors';

interface GasometryModuleProps {
  monitored: MonitoredData;
  patient?: PatientParameters;
  onOpenDetails?: () => void;
}

export const GasometryModule: React.FC<GasometryModuleProps> = ({
  monitored,
  patient,
  onOpenDetails,
}) => {
  const { isLight } = useTheme();

  const ph = monitored.ph ?? 7.40;
  const paco2 = monitored.paco2 ?? 40;
  const pao2 = monitored.pao2 ?? 90;
  const hco3 = monitored.hco3 ?? 24;
  const be = monitored.baseExcess ?? 0;
  const pf = monitored.pfRatio ?? 300;

  // Grade checks
  const phGrade = getPhGrade(ph);
  const paco2Grade = getPaco2Grade(paco2);
  const pao2Grade = getPao2Grade(pao2);
  const hco3Grade = getHco3Grade(hco3);
  const beGrade = getBeGrade(be);
  const pfGrade = getPfGrade(pf);

  // Diagnostic synthesis
  let diagnosis = 'Equilíbrio Ácido-Base Normal';
  let diagColorClass = isLight ? 'text-emerald-800' : 'text-emerald-400';
  let badgeBorderClass = isLight
    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
    : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60';

  if (ph < 7.35) {
    if (paco2 > 45) {
      diagnosis = ph < 7.25 ? 'Acidose Resp. Aguda Grave' : 'Acidose Respiratória Aguda';
      diagColorClass = isLight ? 'text-rose-800 font-bold' : 'text-rose-400 font-bold';
      badgeBorderClass = isLight
        ? 'bg-rose-50 text-rose-900 border-rose-300'
        : 'bg-rose-950/80 text-rose-300 border-rose-600/70';
    } else if (hco3 < 22) {
      diagnosis = 'Acidose Metabólica';
      diagColorClass = isLight ? 'text-amber-800 font-bold' : 'text-amber-400 font-bold';
      badgeBorderClass = isLight
        ? 'bg-amber-50 text-amber-900 border-amber-300'
        : 'bg-amber-950/80 text-amber-300 border-amber-600/70';
    } else {
      diagnosis = 'Acidose Mista';
      diagColorClass = isLight ? 'text-rose-800 font-bold' : 'text-rose-400 font-bold';
      badgeBorderClass = isLight
        ? 'bg-rose-50 text-rose-900 border-rose-300'
        : 'bg-rose-950/80 text-rose-300 border-rose-600/70';
    }
  } else if (ph > 7.45) {
    if (paco2 < 35) {
      diagnosis = 'Alcalose Respiratória';
      diagColorClass = isLight ? 'text-blue-900 font-bold' : 'text-blue-400 font-bold';
      badgeBorderClass = isLight
        ? 'bg-blue-50 text-blue-900 border-blue-300'
        : 'bg-blue-950/80 text-blue-300 border-blue-600/70';
    } else if (hco3 > 26) {
      diagnosis = 'Alcalose Metabólica';
      diagColorClass = isLight ? 'text-purple-900 font-bold' : 'text-purple-400 font-bold';
      badgeBorderClass = isLight
        ? 'bg-purple-50 text-purple-900 border-purple-300'
        : 'bg-purple-950/80 text-purple-300 border-purple-600/70';
    } else {
      diagnosis = 'Alcalose Mista';
      diagColorClass = isLight ? 'text-indigo-900 font-bold' : 'text-indigo-400 font-bold';
      badgeBorderClass = isLight
        ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
        : 'bg-indigo-950/80 text-indigo-300 border-indigo-600/70';
    }
  }

  // Value color helpers ensuring strong WCAG AA/AAA contrast in light mode
  const getValColor = (gradeColor: 'emerald' | 'amber' | 'rose') => {
    if (isLight) {
      if (gradeColor === 'emerald') return 'text-emerald-800';
      if (gradeColor === 'amber') return 'text-amber-800 font-bold';
      return 'text-rose-800 font-black';
    } else {
      if (gradeColor === 'emerald') return 'text-emerald-300';
      if (gradeColor === 'amber') return 'text-amber-300 font-bold';
      return 'text-rose-400 font-black';
    }
  };

  return (
    <div
      className={`rounded-xl border p-2.5 transition-all select-none ${
        isLight
          ? 'bg-white border-slate-300 shadow-sm hover:border-slate-400'
          : 'bg-[#090b12] border-zinc-800 hover:border-zinc-700/80'
      }`}
    >
      {/* 1. Header Bar: Title + Diagnostics Chip + Expand button */}
      <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-inherit">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-5 h-5 rounded-lg flex items-center justify-center ${
              isLight ? 'bg-rose-50 text-rose-700' : 'bg-rose-950/60 text-rose-400'
            }`}
          >
            <FileText className="w-3 h-3" />
          </div>
          <div>
            <span
              className={`text-[10px] font-mono font-black uppercase tracking-wider block leading-tight ${
                isLight ? 'text-slate-900' : 'text-zinc-100'
              }`}
            >
              Gasometria Arterial
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase truncate max-w-[125px] ${badgeBorderClass}`}
            title={diagnosis}
          >
            {diagnosis}
          </span>

          {onOpenDetails && (
            <button
              type="button"
              onClick={onOpenDetails}
              className={`p-1 rounded-lg border transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-[#151928] hover:bg-[#1f253d] text-zinc-300 border-zinc-700'
              }`}
              title="Abrir laudo completo de gasometria"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Numeric Gasometry Grid (3 columns x 2 rows) */}
      <div className="grid grid-cols-3 gap-1.5 my-2">
        {/* pH */}
        <div
          className={`p-1.5 rounded-lg border flex flex-col justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e111a] border-zinc-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              pH
            </span>
            <span className={`text-[7.5px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              7.35–7.45
            </span>
          </div>
          <span className={`font-mono text-base font-black tabular-nums my-0.5 ${getValColor(phGrade.color)}`}>
            {ph.toFixed(2)}
          </span>
          <span className={`text-[7.5px] font-mono truncate ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            {phGrade.statusLabel}
          </span>
        </div>

        {/* PaCO2 */}
        <div
          className={`p-1.5 rounded-lg border flex flex-col justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e111a] border-zinc-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              PaCO₂
            </span>
            <span className={`text-[7.5px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              mmHg
            </span>
          </div>
          <span className={`font-mono text-base font-black tabular-nums my-0.5 ${getValColor(paco2Grade.color)}`}>
            {paco2.toFixed(1)}
          </span>
          <span className={`text-[7.5px] font-mono truncate ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            {paco2Grade.statusLabel}
          </span>
        </div>

        {/* PaO2 */}
        <div
          className={`p-1.5 rounded-lg border flex flex-col justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e111a] border-zinc-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              PaO₂
            </span>
            <span className={`text-[7.5px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              mmHg
            </span>
          </div>
          <span className={`font-mono text-base font-black tabular-nums my-0.5 ${getValColor(pao2Grade.color)}`}>
            {pao2.toFixed(0)}
          </span>
          <span className={`text-[7.5px] font-mono truncate ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            {pao2Grade.statusLabel}
          </span>
        </div>

        {/* HCO3 */}
        <div
          className={`p-1.5 rounded-lg border flex flex-col justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e111a] border-zinc-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              HCO₃⁻
            </span>
            <span className={`text-[7.5px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              mEq/L
            </span>
          </div>
          <span className={`font-mono text-base font-black tabular-nums my-0.5 ${getValColor(hco3Grade.color)}`}>
            {hco3.toFixed(1)}
          </span>
          <span className={`text-[7.5px] font-mono truncate ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Ref: 22–26
          </span>
        </div>

        {/* Base Excess (BE) */}
        <div
          className={`p-1.5 rounded-lg border flex flex-col justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e111a] border-zinc-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              BE
            </span>
            <span className={`text-[7.5px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              mmol/L
            </span>
          </div>
          <span className={`font-mono text-base font-black tabular-nums my-0.5 ${getValColor(beGrade.color)}`}>
            {be > 0 ? `+${be.toFixed(1)}` : be.toFixed(1)}
          </span>
          <span className={`text-[7.5px] font-mono truncate ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Ref: ±2
          </span>
        </div>

        {/* P/F Ratio (PaO2/FiO2) */}
        <div
          className={`p-1.5 rounded-lg border flex flex-col justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e111a] border-zinc-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
              PaO₂/FiO₂
            </span>
            <span className={`text-[7.5px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              Índice P/F
            </span>
          </div>
          <span className={`font-mono text-base font-black tabular-nums my-0.5 ${getValColor(pfGrade.color)}`}>
            {pf.toFixed(0)}
          </span>
          <span className={`text-[7.5px] font-mono truncate ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            {pf >= 300 ? 'Normal (>300)' : pf >= 200 ? 'SDRA Leve' : 'SDRA Mod/Grave'}
          </span>
        </div>
      </div>

      {/* 3. Clinical Synthesis Strip */}
      <div
        className={`px-2 py-1 rounded-lg border flex items-center justify-between text-[8.5px] font-mono ${
          isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-[#121520] border-zinc-800'
        }`}
      >
        <span className={`truncate font-semibold ${diagColorClass}`}>
          {diagnosis} • {pao2Grade.statusLabel}
        </span>
        {onOpenDetails && (
          <button
            type="button"
            onClick={onOpenDetails}
            className={`cursor-pointer hover:underline font-bold shrink-0 ml-1 ${
              isLight ? 'text-cyan-800' : 'text-cyan-400'
            }`}
          >
            Ver Detalhes →
          </button>
        )}
      </div>
    </div>
  );
};
