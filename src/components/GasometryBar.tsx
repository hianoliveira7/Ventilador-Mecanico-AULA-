import React from 'react';
import { MonitoredData, PatientParameters, VentilatorSettings } from '../types/ventilation';
import { FileText, ChevronRight, Activity, Droplets, HeartPulse } from 'lucide-react';

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
  // pH color status
  const phColor =
    monitored.ph >= 7.35 && monitored.ph <= 7.45
      ? 'text-emerald-400'
      : monitored.ph < 7.30 || monitored.ph > 7.50
      ? 'text-rose-400 font-bold'
      : 'text-amber-400';

  // PaO2 color
  const pao2Color =
    monitored.pao2 >= 80
      ? 'text-cyan-300'
      : monitored.pao2 >= 60
      ? 'text-amber-300'
      : 'text-rose-400 font-bold';

  // PaCO2 color
  const paco2Color =
    monitored.paco2 >= 35 && monitored.paco2 <= 45
      ? 'text-emerald-400'
      : monitored.paco2 < 30 || monitored.paco2 > 50
      ? 'text-rose-400 font-bold'
      : 'text-amber-400';

  // HCO3 color
  const hco3Color =
    monitored.hco3 >= 22 && monitored.hco3 <= 26
      ? 'text-emerald-400'
      : 'text-amber-400';

  // SpO2 color
  const spo2Color =
    monitored.spo2 >= 92
      ? 'text-emerald-400'
      : monitored.spo2 >= 88
      ? 'text-amber-400'
      : 'text-rose-400 font-bold';

  // P/F Ratio classification
  let pfLabel = 'P/F > 300 (Normal)';
  let pfColor = 'text-emerald-400';
  if (monitored.pfRatio < 100) {
    pfLabel = `P/F ${monitored.pfRatio} (SDRA Grave)`;
    pfColor = 'text-rose-400';
  } else if (monitored.pfRatio < 200) {
    pfLabel = `P/F ${monitored.pfRatio} (SDRA Mod)`;
    pfColor = 'text-amber-400';
  } else if (monitored.pfRatio < 300) {
    pfLabel = `P/F ${monitored.pfRatio} (SDRA Leve)`;
    pfColor = 'text-amber-300';
  }

  // Acid-base quick diagnosis
  let diagQuick = 'Equilíbrio Ácido-Base Normal';
  if (monitored.ph < 7.35) {
    diagQuick = monitored.paco2 > 45 ? 'Acidose Respiratória' : 'Acidose Metabólica/Mista';
  } else if (monitored.ph > 7.45) {
    diagQuick = monitored.paco2 < 35 ? 'Alcalose Resp. (Hiperventilação)' : 'Alcalose Metabólica';
  }

  return (
    <div
      onClick={onOpenFullModal}
      className="bg-[#090a0f] border-t border-zinc-800/80 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs select-none cursor-pointer hover:bg-[#0e1017] transition-all"
      title="Clique para abrir o laudo completo e interpretação de gasometria arterial"
    >
      {/* Left Label & Diagnosis */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-[11px] font-display font-bold text-cyan-400 uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>Gasometria em Tempo Real:</span>
        </div>
        <span className="font-mono text-zinc-300 bg-[#12131b] px-2 py-0.5 rounded-sm border border-zinc-800 text-[11px]">
          {diagQuick}
        </span>
      </div>

      {/* Center Values Strip */}
      <div className="flex items-center gap-3 font-mono text-[11px]">
        {/* pH */}
        <div className="flex items-baseline gap-1">
          <span className="text-zinc-500">pH:</span>
          <span className={`font-bold ${phColor}`}>{monitored.ph.toFixed(2)}</span>
        </div>

        {/* PaCO2 */}
        <div className="flex items-baseline gap-1">
          <span className="text-zinc-500">PaCO₂:</span>
          <span className={`font-bold ${paco2Color}`}>{monitored.paco2}</span>
          <span className="text-[9px] text-zinc-500">mmHg</span>
        </div>

        {/* PaO2 */}
        <div className="flex items-baseline gap-1">
          <span className="text-zinc-500">PaO₂:</span>
          <span className={`font-bold ${pao2Color}`}>{monitored.pao2}</span>
          <span className="text-[9px] text-zinc-500">mmHg</span>
        </div>

        {/* HCO3 */}
        <div className="flex items-baseline gap-1">
          <span className="text-zinc-500">HCO₃⁻:</span>
          <span className={`font-bold ${hco3Color}`}>{monitored.hco3}</span>
        </div>

        {/* SpO2 */}
        <div className="flex items-baseline gap-1">
          <span className="text-zinc-500">SpO₂:</span>
          <span className={`font-bold ${spo2Color}`}>{monitored.spo2}%</span>
        </div>

        {/* FiO2 */}
        <div className="flex items-baseline gap-1">
          <span className="text-zinc-500">FiO₂:</span>
          <span className="font-bold text-cyan-400">{settings.fio2}%</span>
        </div>

        {/* P/F Ratio */}
        <div className="flex items-baseline gap-1 bg-[#12141c] px-2 py-0.5 rounded-sm border border-zinc-800">
          <span className="text-zinc-500">Índice Horovitz:</span>
          <span className={`font-bold ${pfColor}`}>{pfLabel}</span>
        </div>
      </div>

      {/* Right Link */}
      <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono font-bold hover:underline">
        <span>Ver Laudo Completo</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};
