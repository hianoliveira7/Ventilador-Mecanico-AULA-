import React from 'react';
import { MonitoredData, PatientParameters } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import { FileText, HeartPulse } from 'lucide-react';

interface GasometryCardProps {
  monitored: MonitoredData;
  patient: PatientParameters;
  onOpenModal: () => void;
}

export const GasometryCard: React.FC<GasometryCardProps> = ({
  monitored,
  patient,
  onOpenModal,
}) => {
  return (
    <div className="bg-[#0a0a0e] rounded-xl border border-zinc-800/90 shadow-xl overflow-hidden flex flex-col h-full select-none">
      <div className="p-2.5 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-display font-bold text-cyan-400 uppercase tracking-wider">
          <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
          <span>CASOMETRIA ARTERIAL</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-bold">
          Atualizada ao vivo
        </span>
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="bg-[#0e0f14] p-2 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-400 block font-mono font-bold">pH</span>
            <span className="text-base font-bold font-mono text-white">{monitored.ph.toFixed(2)}</span>
          </div>
          <div className="bg-[#0e0f14] p-2 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-400 block font-mono font-bold">PaCO₂</span>
            <span className="text-base font-bold font-mono text-white">{monitored.paco2} <span className="text-[9px] text-zinc-500">mmHg</span></span>
          </div>
          <div className="bg-[#0e0f14] p-2 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-400 block font-mono font-bold">PaO₂</span>
            <span className="text-base font-bold font-mono text-white">{monitored.pao2} <span className="text-[9px] text-zinc-500">mmHg</span></span>
          </div>
          <div className="bg-[#0e0f14] p-2 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-400 block font-mono font-bold">HCO₃⁻</span>
            <span className="text-base font-bold font-mono text-white">{monitored.hco3} <span className="text-[9px] text-zinc-500">mEq/L</span></span>
          </div>
          <div className="bg-[#0e0f14] p-2 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-400 block font-mono font-bold">SaO₂</span>
            <span className="text-base font-bold font-mono text-cyan-300">{monitored.spo2} <span className="text-[9px] text-zinc-500">%</span></span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-[#0e0f14] p-1.5 rounded-lg border border-zinc-800/80">
            <span className="text-[9px] text-zinc-400 block font-mono">BE</span>
            <span className="text-sm font-bold font-mono text-zinc-200">{monitored.baseExcess > 0 ? `+${monitored.baseExcess.toFixed(1)}` : monitored.baseExcess.toFixed(1)} <span className="text-[8px] text-zinc-500">mEq/L</span></span>
          </div>
          <div className="bg-[#0e0f14] p-1.5 rounded-lg border border-zinc-800/80">
            <span className="text-[9px] text-zinc-400 block font-mono">FiO₂</span>
            <span className="text-sm font-bold font-mono text-zinc-200">40 <span className="text-[8px] text-zinc-500">%</span></span>
          </div>
          <div className="bg-[#0e0f14] p-1.5 rounded-lg border border-zinc-800/80">
            <span className="text-[9px] text-zinc-400 block font-mono">PaO₂/FiO₂</span>
            <span className="text-sm font-bold font-mono text-cyan-300">{monitored.pfRatio}</span>
          </div>
          <div className="bg-[#0e0f14] p-1.5 rounded-lg border border-zinc-800/80">
            <span className="text-[9px] text-zinc-400 block font-mono">Temp.</span>
            <span className="text-sm font-bold font-mono text-zinc-200">37.0 <span className="text-[8px] text-zinc-500">°C</span></span>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => {
              audioEngine.playClick(900);
              onOpenModal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161824] hover:bg-[#202334] text-cyan-300 font-mono text-xs border border-cyan-800/60 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>DETALHES DA GASO</span>
          </button>
        </div>
      </div>
    </div>
  );
};
