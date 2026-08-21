import React, { useState } from 'react';
import { MonitoredData, PatientParameters } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import { Activity, Volume2, VolumeX, Check, Gauge, Sparkles } from 'lucide-react';

interface MonitorPanelProps {
  monitored: MonitoredData;
  patient: PatientParameters;
  onOpenGasometry: () => void;
}

export const MonitorPanel: React.FC<MonitorPanelProps> = ({
  monitored,
  patient,
  onOpenGasometry,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(70);
  const [activeSounds, setActiveSounds] = useState({
    inspiratoryFlow: true,
    exhalationValve: true,
    expiratoryFlow: true,
    alarmBeeps: true,
  });

  const toggleSound = () => {
    audioEngine.playClick(900);
    setSoundEnabled(!soundEnabled);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0e] rounded-2xl border border-zinc-800/90 shadow-2xl overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-3 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-display font-bold text-zinc-200 uppercase tracking-wider">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>MONITORIZAÇÃO</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ROW 1: PRIMARY PRESSURES */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0e0f14] rounded-xl p-2.5 border border-zinc-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-display font-bold text-cyan-400 uppercase">PICO</span>
            <span className="text-[9px] text-zinc-500 font-mono">cmH₂O</span>
            <span className="text-2xl font-bold font-mono text-cyan-300 mt-1">
              {monitored.peakPressure.toFixed(0)}
            </span>
          </div>

          <div className="bg-[#0e0f14] rounded-xl p-2.5 border border-zinc-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-display font-bold text-cyan-400 uppercase">PLATÔ</span>
            <span className="text-[9px] text-zinc-500 font-mono">cmH₂O</span>
            <span className="text-2xl font-bold font-mono text-cyan-300 mt-1">
              {monitored.isPlateauMeasured ? monitored.plateauPressure.toFixed(0) : '--'}
            </span>
          </div>

          <div className="bg-[#0e0f14] rounded-xl p-2.5 border border-zinc-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-display font-bold text-cyan-400 uppercase">MÉDIA</span>
            <span className="text-[9px] text-zinc-500 font-mono">cmH₂O</span>
            <span className="text-xl font-bold font-mono text-zinc-200 mt-1">
              {monitored.meanPressure.toFixed(1)}
            </span>
          </div>
        </div>

        {/* ROW 2: VT EXP, VE, FR TOTAL */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0e0f14] rounded-xl p-2.5 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-display font-bold text-orange-400 uppercase">Vᴛ EXP</span>
              <span className="text-[8px] text-orange-400 font-mono">mL</span>
            </div>
            <span className="text-2xl font-bold font-mono text-orange-300 mt-1">
              {monitored.vte}
            </span>
          </div>

          <div className="bg-[#0e0f14] rounded-xl p-2.5 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-display font-bold text-orange-400 uppercase">V̇E</span>
              <span className="text-[8px] text-orange-400 font-mono">L/min</span>
            </div>
            <span className="text-2xl font-bold font-mono text-orange-300 mt-1">
              {monitored.minuteVolume.toFixed(1)}
            </span>
          </div>

          <div className="bg-[#0e0f14] rounded-xl p-2.5 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-display font-bold text-emerald-400 uppercase">FR TOTAL</span>
              <span className="text-[8px] text-emerald-400 font-mono">rpm</span>
            </div>
            <span className="text-2xl font-bold font-mono text-emerald-300 mt-1">
              {monitored.totalRate}
            </span>
          </div>
        </div>

        {/* ROW 3: COMPLIANCE, RESISTANCE, I:E */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0e0f14] rounded-xl p-2.5 border border-zinc-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-display font-bold text-zinc-400 uppercase">COMPLACÊNCIA</span>
            <span className="text-[9px] text-zinc-500 font-mono">mL/cmH₂O</span>
            <span className="text-xl font-bold font-mono text-white mt-1">
              {monitored.isPlateauMeasured ? monitored.staticCompliance : '--'}
            </span>
          </div>

          <div className="bg-[#0e0f14] rounded-xl p-2.5 border border-zinc-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-display font-bold text-zinc-400 uppercase">RESISTÊNCIA</span>
            <span className="text-[9px] text-zinc-500 font-mono">cmH₂O/L/s</span>
            <span className="text-xl font-bold font-mono text-white mt-1">
              {monitored.isPlateauMeasured ? monitored.airwayResistance : '--'}
            </span>
          </div>

          <div className="bg-[#0e0f14] rounded-xl p-2.5 border border-zinc-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-display font-bold text-zinc-400 uppercase">I:E</span>
            <span className="text-[9px] text-zinc-500 font-mono">&nbsp;</span>
            <span className="text-base font-bold font-mono text-white mt-1">
              {monitored.ieRatioString}
            </span>
          </div>
        </div>

        {/* ROW 4: DRIVING PRESSURE & DP% */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0e0f14] rounded-xl p-3 border border-zinc-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-display font-bold text-zinc-400 uppercase">DRIVING PRESSURE</span>
            <span className="text-[9px] text-zinc-500 font-mono">cmH₂O</span>
            <span className="text-2xl font-bold font-mono text-white mt-1">
              {monitored.isPlateauMeasured ? monitored.drivingPressure.toFixed(0) : '--'}
            </span>
          </div>

          <div className="bg-[#0e0f14] rounded-xl p-3 border border-zinc-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-display font-bold text-zinc-400 uppercase">DP%</span>
            <span className="text-[9px] text-zinc-500 font-mono">%</span>
            <span className="text-2xl font-bold font-mono text-cyan-300 mt-1">
              {monitored.isPlateauMeasured ? 28 : '--'}
            </span>
          </div>
        </div>

        {/* SECTION: MECÂNICA PULMONAR */}
        <div className="bg-[#0e0f14] rounded-xl p-3 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold text-purple-400 uppercase tracking-wider">MECÂNICA PULMONAR</span>
            <button
              onClick={onOpenGasometry}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-[#161824] hover:bg-[#202334] text-zinc-300 border border-zinc-700 font-mono cursor-pointer transition-all"
            >
              DETALHES
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-[#07080d] p-1.5 rounded-lg border border-zinc-800">
              <span className="text-[9px] text-zinc-500 block font-mono">CST</span>
              <span className="text-xs font-bold font-mono text-purple-300">{monitored.isPlateauMeasured ? monitored.staticCompliance : '--'}</span>
              <span className="text-[7px] text-zinc-600 block">mL/cmH₂O</span>
            </div>
            <div className="bg-[#07080d] p-1.5 rounded-lg border border-zinc-800">
              <span className="text-[9px] text-zinc-500 block font-mono">RAW</span>
              <span className="text-xs font-bold font-mono text-purple-300">{monitored.isPlateauMeasured ? monitored.airwayResistance : '--'}</span>
              <span className="text-[7px] text-zinc-600 block">cmH₂O/L/s</span>
            </div>
            <div className="bg-[#07080d] p-1.5 rounded-lg border border-zinc-800">
              <span className="text-[9px] text-zinc-500 block font-mono">AUTO-PEEP</span>
              <span className="text-xs font-bold font-mono text-amber-300">{monitored.autoPeep.toFixed(0)}</span>
              <span className="text-[7px] text-zinc-600 block">cmH₂O</span>
            </div>
            <div className="bg-[#07080d] p-1.5 rounded-lg border border-zinc-800">
              <span className="text-[9px] text-zinc-500 block font-mono">ÍND. TOBIN</span>
              <span className="text-xs font-bold font-mono text-emerald-300">{monitored.rapidShallowBreathingIndex}</span>
              <span className="text-[7px] text-zinc-600 block">mL/L</span>
            </div>
          </div>
        </div>

        {/* SECTION: ÁUDIO DO VENTILADOR */}
        <div className="bg-[#0e0f14] rounded-xl p-3 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold text-zinc-200 uppercase tracking-wider">ÁUDIO DO VENTILADOR</span>
            <button
              onClick={toggleSound}
              className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                soundEnabled ? 'bg-cyan-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                  soundEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                <span>Volume</span>
                <span>{volume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
            <span className="text-[10px] font-mono text-zinc-400 block">Sons ativos:</span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-zinc-300">
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Fluxo inspiratório</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Válvula expiratória</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Fluxo expiratório</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Alarmes sonoros</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
