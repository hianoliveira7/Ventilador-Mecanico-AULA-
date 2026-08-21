import React from 'react';
import { PatientParameters, MonitoredData } from '../types/ventilation';

interface LungVisualizerProps {
  monitored: MonitoredData;
  patient: PatientParameters;
}

export const LungVisualizer: React.FC<LungVisualizerProps> = ({ monitored, patient }) => {
  const progress = Math.min(1.2, Math.max(0.8, 1 + (monitored.pressure / 40) * 0.15) || 1);

  return (
    <div className="bg-[#0e0f14] rounded-2xl p-3 border border-zinc-800/80 shadow-xl flex flex-col items-center justify-between relative overflow-hidden group h-full">
      <div className="flex items-center justify-between w-full mb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider">
            DINÂMICA PULMONAR & SpO₂
          </span>
        </div>
      </div>

      <div className="relative flex items-center justify-center my-auto">
        {/* Glow background */}
        <div className="absolute w-24 h-24 bg-cyan-500/10 rounded-full blur-xl animate-pulse" />

        {/* SVG Animated Lungs */}
        <div
          className="transition-transform duration-200 ease-out flex items-center justify-center py-1"
          style={{ transform: `scale(${progress})` }}
        >
          <svg className="w-20 h-20 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v6m0 0l-3 3m3-3l3 3" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 11c-4 1-6 4-6 8 0 2 2 3 4 3 2 0 3-2 5-3m1-8c4 1 6 4 6 8 0 2-2 3-4 3-2 0-3-2-5-3"
              fill="rgba(34, 211, 238, 0.15)"
            />
          </svg>
        </div>
      </div>

      {/* SpO2 Display underneath */}
      <div className="w-full bg-[#07080b] rounded-xl p-2 border border-zinc-800/80 flex items-center justify-between mt-auto">
        <span className="text-xs font-mono text-zinc-400">SpO₂ Monitorada</span>
        <div className="flex items-baseline gap-1">
          <span className={`text-lg font-mono font-black ${monitored.spo2 < 90 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {Math.round(monitored.spo2)}
          </span>
          <span className="text-xs font-mono text-zinc-500">%</span>
        </div>
      </div>
    </div>
  );
};
