import React from 'react';
import { MonitoredData, PatientParameters, VentilatorSettings } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import { FileText, HeartPulse, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  getPhGrade,
  getPaco2Grade,
  getPao2Grade,
  getHco3Grade,
  getBeGrade,
  getSpo2Grade,
  getPfGrade,
} from '../utils/gasometryColors';
import { useTheme } from '../context/ThemeContext';

interface GasometryCardProps {
  monitored: MonitoredData;
  patient: PatientParameters;
  settings?: VentilatorSettings;
  onOpenModal: () => void;
}

export const GasometryCard: React.FC<GasometryCardProps> = ({
  monitored,
  patient,
  settings,
  onOpenModal,
}) => {
  const { isLight } = useTheme();

  const currentPh = monitored?.ph ?? 7.40;
  const currentPaco2 = monitored?.paco2 ?? 40;
  const currentPao2 = monitored?.pao2 ?? 90;
  const currentHco3 = monitored?.hco3 ?? 24;
  const currentBe = monitored?.baseExcess ?? 0;
  const currentSpo2 = monitored?.spo2 ?? 98;
  const currentPf = monitored?.pfRatio ?? 300;

  const phG = getPhGrade(currentPh);
  const paco2G = getPaco2Grade(currentPaco2);
  const pao2G = getPao2Grade(currentPao2);
  const hco3G = getHco3Grade(currentHco3);
  const beG = getBeGrade(currentBe);
  const spo2G = getSpo2Grade(currentSpo2);
  const pfG = getPfGrade(currentPf);

  const hasAnyCritical =
    phG.color === 'rose' || paco2G.color === 'rose' || pao2G.color === 'rose' || spo2G.color === 'rose' || pfG.color === 'rose';
  const hasAnyWarning =
    phG.color === 'amber' || paco2G.color === 'amber' || pao2G.color === 'amber' || hco3G.color === 'amber' || pfG.color === 'amber';

  let statusBadge = (
    <span
      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
        isLight
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
          : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
      }`}
    >
      <CheckCircle2 className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
      Normal
    </span>
  );

  if (hasAnyCritical) {
    statusBadge = (
      <span
        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border animate-pulse ${
          isLight
            ? 'bg-rose-100 text-rose-800 border-rose-300'
            : 'bg-rose-950/90 text-rose-200 border-rose-600/80'
        }`}
      >
        <AlertCircle className={`w-3 h-3 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
        Alterações Críticas
      </span>
    );
  } else if (hasAnyWarning) {
    statusBadge = (
      <span
        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
          isLight
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-amber-950/80 text-amber-300 border-amber-600/60'
        }`}
      >
        <AlertCircle className={`w-3 h-3 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
        Atenção / Limítrofe
      </span>
    );
  }

  return (
    <div
      className={`rounded-xl border shadow-xl overflow-hidden flex flex-col select-none transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0a0a0e] border-zinc-800/90'
      }`}
    >
      {/* Header with Title, Status Badge and Full Report Action */}
      <div
        className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 flex-wrap ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider ${
              isLight ? 'text-cyan-800' : 'text-cyan-400'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>GASOMETRIA ARTERIAL</span>
          </div>
          {statusBadge}
        </div>

        {/* Action Button to Open Full Gasometry Modal */}
        <button
          onClick={() => {
            audioEngine.playClick(900);
            onOpenModal();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
            isLight
              ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300'
              : 'bg-[#161824] hover:bg-[#222538] text-cyan-300 hover:text-cyan-200 border-cyan-800/70'
          }`}
        >
          <FileText className="w-3 h-3 text-cyan-500" />
          <span>LAUDO COMPLETO & CONDUTAS</span>
        </button>
      </div>

      {/* Main Gasometry Parameter Grid (Single High-Density Row) */}
      <div className="p-2">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center">
          {/* pH */}
          <div
            className={`p-1.5 rounded-lg border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            } ${phG.bgClass}`}
          >
            <span className="text-[9px] font-display font-bold text-zinc-500 uppercase">pH</span>
            <span className={`text-base font-mono font-bold my-0.5 ${phG.textClass}`}>
              {currentPh.toFixed(2)}
            </span>
            <span className="text-[8px] font-mono text-zinc-400">7.35-7.45</span>
          </div>

          {/* PaCO2 */}
          <div
            className={`p-1.5 rounded-lg border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            } ${paco2G.bgClass}`}
          >
            <span className="text-[9px] font-display font-bold text-zinc-500 uppercase">PaCO₂</span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className={`text-base font-mono font-bold my-0.5 ${paco2G.textClass}`}>
                {currentPaco2}
              </span>
              <span className="text-[8px] text-zinc-400 font-mono">mmHg</span>
            </div>
            <span className="text-[8px] font-mono text-zinc-400">35-45</span>
          </div>

          {/* PaO2 */}
          <div
            className={`p-1.5 rounded-lg border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            } ${pao2G.bgClass}`}
          >
            <span className="text-[9px] font-display font-bold text-zinc-500 uppercase">PaO₂</span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className={`text-base font-mono font-bold my-0.5 ${pao2G.textClass}`}>
                {currentPao2}
              </span>
              <span className="text-[8px] text-zinc-400 font-mono">mmHg</span>
            </div>
            <span className="text-[8px] font-mono text-zinc-400">80-100</span>
          </div>

          {/* HCO3 */}
          <div
            className={`p-1.5 rounded-lg border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            } ${hco3G.bgClass}`}
          >
            <span className="text-[9px] font-display font-bold text-zinc-500 uppercase">HCO₃⁻</span>
            <span className={`text-base font-mono font-bold my-0.5 ${hco3G.textClass}`}>
              {currentHco3}
            </span>
            <span className="text-[8px] font-mono text-zinc-400">22-26</span>
          </div>

          {/* Base Excess */}
          <div
            className={`p-1.5 rounded-lg border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            } ${beG.bgClass}`}
          >
            <span className="text-[9px] font-display font-bold text-zinc-500 uppercase">BE</span>
            <span className={`text-base font-mono font-bold my-0.5 ${beG.textClass}`}>
              {currentBe > 0 ? `+${currentBe.toFixed(1)}` : currentBe.toFixed(1)}
            </span>
            <span className="text-[8px] font-mono text-zinc-400">±2</span>
          </div>

          {/* SpO2 */}
          <div
            className={`p-1.5 rounded-lg border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            } ${spo2G.bgClass}`}
          >
            <span className="text-[9px] font-display font-bold text-zinc-500 uppercase">SpO₂</span>
            <span className={`text-base font-mono font-bold my-0.5 ${spo2G.textClass}`}>
              {currentSpo2}%
            </span>
            <span className="text-[8px] font-mono text-zinc-400">&ge; 94%</span>
          </div>

          {/* FiO2 */}
          <div
            className={`p-1.5 rounded-lg border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            }`}
          >
            <span className="text-[9px] font-display font-bold text-zinc-500 uppercase">FiO₂</span>
            <span className={`text-base font-mono font-bold my-0.5 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
              {settings?.fio2 ?? 40}%
            </span>
            <span className="text-[8px] font-mono text-zinc-400">Ofertada</span>
          </div>

          {/* P/F Ratio (Horovitz) */}
          <div
            className={`p-1.5 rounded-lg border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            } ${pfG.bgClass}`}
          >
            <span className="text-[9px] font-display font-bold text-zinc-500 uppercase">P/F</span>
            <span className={`text-base font-mono font-bold my-0.5 ${pfG.textClass}`}>
              {currentPf}
            </span>
            <span className="text-[8px] font-mono text-zinc-400">&gt; 300</span>
          </div>
        </div>
      </div>
    </div>
  );
};
