import React from 'react';
import { MonitoredData, PatientParameters, VentilatorSettings } from '../types/ventilation';
import { FileText, ChevronRight } from 'lucide-react';
import {
  getPhGrade,
  getPaco2Grade,
  getPao2Grade,
  getHco3Grade,
  getSpo2Grade,
  getPfGrade,
} from '../utils/gasometryColors';
import { useTheme } from '../context/ThemeContext';

interface GasometryBarProps {
  monitored: MonitoredData;
  patient: PatientParameters;
  settings: VentilatorSettings;
  onOpenFullModal: () => void;
}

export const GasometryBar: React.FC<GasometryBarProps> = ({
  monitored,
  patient,
  settings,
  onOpenFullModal,
}) => {
  const { isLight } = useTheme();

  const currentPh = monitored?.ph ?? 7.40;
  const currentPaco2 = monitored?.paco2 ?? 40;
  const currentPao2 = monitored?.pao2 ?? 90;
  const currentHco3 = monitored?.hco3 ?? 24;
  const currentSpo2 = monitored?.spo2 ?? 98;
  const currentPf = monitored?.pfRatio ?? 300;

  const phG = getPhGrade(currentPh);
  const paco2G = getPaco2Grade(currentPaco2);
  const pao2G = getPao2Grade(currentPao2);
  const hco3G = getHco3Grade(currentHco3);
  const spo2G = getSpo2Grade(currentSpo2);
  const pfG = getPfGrade(currentPf);

  // Acid-base quick diagnosis
  let diagQuick = 'Equilíbrio Ácido-Base Normal';
  if (currentPh < 7.35) {
    diagQuick = currentPaco2 > 45 ? 'Acidose Respiratória' : 'Acidose Metabólica/Mista';
  } else if (currentPh > 7.45) {
    diagQuick = currentPaco2 < 35 ? 'Alcalose Resp. (Hiperventilação)' : 'Alcalose Metabólica';
  }

  return (
    <div
      onClick={onOpenFullModal}
      className={`border-t px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs select-none cursor-pointer transition-all ${
        isLight
          ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          : 'bg-[#090a0f] border-zinc-800/80 hover:bg-[#0e1017]'
      }`}
      title="Clique para abrir o laudo completo e interpretação de gasometria arterial"
    >
      {/* Left Label & Diagnosis */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1 text-[11px] font-display font-bold uppercase tracking-wider ${
            isLight ? 'text-cyan-700' : 'text-cyan-400'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Gasometria em Tempo Real:</span>
        </div>
        <span
          className={`font-mono px-2 py-0.5 rounded-sm border text-[11px] ${
            isLight
              ? 'text-slate-800 bg-white border-slate-300 shadow-sm'
              : 'text-zinc-300 bg-[#12131b] border-zinc-800'
          }`}
        >
          {diagQuick}
        </span>
      </div>

      {/* Center Values Strip */}
      <div className="flex items-center gap-3 font-mono text-[11px]">
        {/* pH */}
        <div className="flex items-baseline gap-1">
          <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>pH:</span>
          <span className={`font-bold ${phG.textClass}`}>{currentPh.toFixed(2)}</span>
        </div>

        {/* PaCO2 */}
        <div className="flex items-baseline gap-1">
          <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>PaCO₂:</span>
          <span className={`font-bold ${paco2G.textClass}`}>{currentPaco2}</span>
          <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>mmHg</span>
        </div>

        {/* PaO2 */}
        <div className="flex items-baseline gap-1">
          <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>PaO₂:</span>
          <span className={`font-bold ${pao2G.textClass}`}>{currentPao2}</span>
          <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>mmHg</span>
        </div>

        {/* HCO3 */}
        <div className="flex items-baseline gap-1">
          <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>HCO₃⁻:</span>
          <span className={`font-bold ${hco3G.textClass}`}>{currentHco3}</span>
        </div>

        {/* SpO2 */}
        <div className="flex items-baseline gap-1">
          <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>SpO₂:</span>
          <span className={`font-bold ${spo2G.textClass}`}>{currentSpo2}%</span>
        </div>

        {/* FiO2 */}
        <div className="flex items-baseline gap-1">
          <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>FiO₂:</span>
          <span className={`font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>{settings.fio2}%</span>
        </div>

        {/* P/F Ratio */}
        <div
          className={`flex items-baseline gap-1 px-2 py-0.5 rounded-sm border ${
            isLight
              ? 'bg-white border-slate-300 shadow-sm'
              : 'bg-[#12141c] border-zinc-800'
          }`}
        >
          <span className={isLight ? 'text-slate-500' : 'text-zinc-500'}>Índice P/F:</span>
          <span className={`font-bold ${pfG.textClass}`}>{monitored.pfRatio} mmHg</span>
        </div>
      </div>

      {/* Right Link */}
      <div
        className={`flex items-center gap-1 text-[10px] font-mono font-bold hover:underline ${
          isLight ? 'text-cyan-700' : 'text-cyan-400'
        }`}
      >
        <span>Ver Laudo Completo</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};
