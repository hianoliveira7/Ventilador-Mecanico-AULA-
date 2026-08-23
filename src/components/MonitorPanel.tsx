import React from 'react';
import { MonitoredData, PatientParameters } from '../types/ventilation';
import { Activity, Gauge, FileText } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
  const { isLight } = useTheme();

  const currentPeep = monitored.peep ?? monitored.peepTotal ?? 5;
  const currentAutoPeep = monitored.autoPeep ?? 0;
  const currentPeak = monitored.peakPressure ?? 18;
  const currentMean = monitored.meanPressure ?? 8;
  const currentVte = monitored.vte ?? 400;
  const currentTotalRate = monitored.totalRate ?? 15;
  const currentDp = monitored.drivingPressure ?? 9;

  // Calculations for enhanced mechanics
  const ibw = patient.gender === 'male'
    ? 50 + 0.91 * (patient.height - 152.4)
    : 45.5 + 0.91 * (patient.height - 152.4);
  const vtPerKg = (currentVte / Math.max(1, ibw)).toFixed(1);

  // Dynamic compliance: Cdyn = Vt / (Ppeak - PEEP)
  const pDeltaPeak = Math.max(1, currentPeak - currentPeep);
  const cdyn = Math.round((currentVte / pDeltaPeak) * 10) / 10;

  // Time constant tau (seconds) = (Raw * Cst) / 1000
  const cstVal = monitored.staticCompliance > 0 ? monitored.staticCompliance : 45;
  const rawVal = monitored.airwayResistance > 0 ? monitored.airwayResistance : 10;
  const tau = ((rawVal * cstVal) / 1000).toFixed(2);

  // Mechanical Power estimate: MP = 0.098 * RR * Vt(L) * (Ppeak - 0.5 * DP)
  const vtL = currentVte / 1000;
  const dpVal = currentDp > 0 ? currentDp : 10;
  const mechanicalPower = (0.098 * currentTotalRate * vtL * (currentPeak - 0.5 * dpVal)).toFixed(1);

  // Driving pressure safety classification
  const dpColor =
    currentDp <= 14
      ? isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'
      : currentDp <= 16
      ? isLight ? 'text-amber-700 font-bold' : 'text-amber-400'
      : isLight ? 'text-rose-700 font-bold' : 'text-rose-400 font-bold';

  const dpBadge =
    currentDp <= 14
      ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
      : currentDp <= 16
      ? isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950/80 text-amber-300 border-amber-600/50'
      : isLight ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-bold' : 'bg-rose-950/90 text-rose-200 border-rose-600/80 animate-pulse';

  return (
    <div
      className={`flex flex-col h-full rounded-2xl border shadow-2xl overflow-hidden select-none transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0a0a0e] border-zinc-800/90'
      }`}
    >
      {/* Top Header */}
      <div
        className={`p-3 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 text-xs font-display font-black uppercase tracking-wider ${
            isLight ? 'text-slate-800' : 'text-zinc-200'
          }`}
        >
          <Activity className="w-4 h-4 text-cyan-500" />
          <span>MONITORIZAÇÃO & MECÂNICA</span>
        </div>
        <button
          onClick={onOpenGasometry}
          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg font-mono cursor-pointer transition-all shadow-sm border ${
            isLight
              ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300'
              : 'bg-[#161824] hover:bg-[#202334] text-cyan-300 border-cyan-800/60'
          }`}
        >
          <FileText className="w-3 h-3" />
          <span>GASOMETRIA</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ROW 1: PRIMARY PRESSURES */}
        <div className="grid grid-cols-3 gap-2">
          {/* Peak Pressure */}
          <div
            className={`rounded-xl p-2.5 border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-display font-bold uppercase ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>P. PICO</span>
              <span className="text-[8px] text-zinc-500 font-mono">cmH₂O</span>
            </div>
            <span className={`text-2xl font-bold font-mono mt-1 ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>
              {monitored.peakPressure.toFixed(0)}
            </span>
            <span className="text-[8px] font-mono text-zinc-500">Limite: &le; 35-40</span>
          </div>

          {/* Plateau Pressure */}
          <div
            className={`rounded-xl p-2.5 border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-display font-bold uppercase ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>P. PLATÔ</span>
              <span className="text-[8px] text-zinc-500 font-mono">cmH₂O</span>
            </div>
            <span className={`text-2xl font-bold font-mono mt-1 ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>
              {monitored.isPlateauMeasured ? monitored.plateauPressure.toFixed(0) : '--'}
            </span>
            <span className="text-[8px] font-mono text-zinc-500">Alvo: &le; 30</span>
          </div>

          {/* Mean Pressure */}
          <div
            className={`rounded-xl p-2.5 border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-display font-bold uppercase ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>P. MÉDIA</span>
              <span className="text-[8px] text-zinc-500 font-mono">cmH₂O</span>
            </div>
            <span className={`text-2xl font-bold font-mono mt-1 ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
              {currentMean.toFixed(1)}
            </span>
            <span className="text-[8px] font-mono text-zinc-500">PEEP: {currentPeep.toFixed(0)}</span>
          </div>
        </div>

        {/* ROW 2: VOLUMES & RATES */}
        <div className="grid grid-cols-3 gap-2">
          {/* Tidal Volume */}
          <div
            className={`rounded-xl p-2.5 border flex flex-col justify-between ${
              isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#0e0f14] border-zinc-800/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-display font-bold uppercase ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>Vᴛ EXP</span>
              <span className="text-[8px] text-amber-500 font-mono">mL</span>
            </div>
            <span className={`text-2xl font-bold font-mono mt-1 ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
              {monitored.vte}
            </span>
            <span className="text-[8px] font-mono text-zinc-500">{vtPerKg} mL/kg (IBW)</span>
          </div>

          {/* Minute Volume */}
          <div
            className={`rounded-xl p-2.5 border flex flex-col justify-between ${
              isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#0e0f14] border-zinc-800/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-display font-bold uppercase ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>V̇E TOTAL</span>
              <span className="text-[8px] text-amber-500 font-mono">L/min</span>
            </div>
            <span className={`text-2xl font-bold font-mono mt-1 ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
              {monitored.minuteVolume.toFixed(1)}
            </span>
            <span className="text-[8px] font-mono text-zinc-500">I:E {monitored.ieRatioString}</span>
          </div>

          {/* Total Respiratory Rate */}
          <div
            className={`rounded-xl p-2.5 border flex flex-col justify-between ${
              isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#0e0f14] border-zinc-800/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-display font-bold uppercase ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>FR TOTAL</span>
              <span className="text-[8px] text-emerald-500 font-mono">rpm</span>
            </div>
            <span className={`text-2xl font-bold font-mono mt-1 ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
              {monitored.totalRate}
            </span>
            <span className="text-[8px] font-mono text-zinc-500">{monitored.spontaneousRate > 0 ? `${monitored.spontaneousRate} esp.` : '0 esp.'}</span>
          </div>
        </div>

        {/* SECTION: MECÂNICA PULMONAR AVANÇADA */}
        <div
          className={`rounded-xl p-3 border space-y-2.5 shadow-md ${
            isLight ? 'bg-slate-50 border-purple-200' : 'bg-[#0e0f14] border-purple-900/40'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-1.5 ${isLight ? 'border-purple-200' : 'border-zinc-800/80'}`}>
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-purple-600" />
              <span className={`text-xs font-display font-bold uppercase tracking-wider ${isLight ? 'text-purple-900' : 'text-purple-300'}`}>
                Mecânica do Sistema Respiratório
              </span>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'text-purple-400/90 bg-purple-950/60 border-purple-800/40'
              }`}
            >
              Pausa Insp / Exp
            </span>
          </div>

          {/* Mechanics Grid 1: Compliance & Resistance */}
          <div className="grid grid-cols-2 gap-2">
            {/* Static Compliance */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#07080d] border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 font-mono font-bold">COMPLACÊNCIA ESTÁTICA (Cst)</span>
                <span className="text-[8px] text-zinc-400">mL/cmH₂O</span>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className={`text-xl font-bold font-mono ${isLight ? 'text-purple-800' : 'text-purple-300'}`}>
                  {monitored.isPlateauMeasured ? monitored.staticCompliance : '--'}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">mL/cmH₂O</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400">Normal: 50 – 80</span>
            </div>

            {/* Dynamic Compliance */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#07080d] border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 font-mono font-bold">COMPLACÊNCIA DINÂMICA (Cdyn)</span>
                <span className="text-[8px] text-zinc-400">mL/cmH₂O</span>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className={`text-xl font-bold font-mono ${isLight ? 'text-purple-800' : 'text-purple-300'}`}>
                  {cdyn}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">mL/cmH₂O</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400">Ref: 30 – 50</span>
            </div>
          </div>

          {/* Mechanics Grid 2: Raw & Time Constant */}
          <div className="grid grid-cols-2 gap-2">
            {/* Airway Resistance Raw */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#07080d] border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 font-mono font-bold">RESISTÊNCIA DAS VIAS (Raw)</span>
                <span className="text-[8px] text-zinc-400">cmH₂O/L/s</span>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className={`text-xl font-bold font-mono ${isLight ? 'text-purple-800' : 'text-purple-300'}`}>
                  {monitored.isPlateauMeasured ? monitored.airwayResistance : '--'}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">cmH₂O/L/s</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400">Normal com TOT: &le; 10-12</span>
            </div>

            {/* Time Constant Tau */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#07080d] border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 font-mono font-bold">CONSTANTE DE TEMPO (τ)</span>
                <span className="text-[8px] text-zinc-400">segundos</span>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className={`text-xl font-bold font-mono ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>
                  {tau}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">s (3τ = {(Number(tau) * 3).toFixed(2)}s)</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400">Tempo exp. seguro &ge; 3τ</span>
            </div>
          </div>

          {/* Mechanics Grid 3: Driving Pressure & DP% */}
          <div className="grid grid-cols-2 gap-2">
            {/* Driving Pressure */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#07080d] border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 font-mono font-bold">DRIVING PRESSURE (ΔP)</span>
                <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${dpBadge}`}>
                  {monitored.drivingPressure <= 15 ? 'PROTETORA' : 'ELEVADA'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className={`text-2xl font-bold font-mono ${dpColor}`}>
                  {monitored.isPlateauMeasured ? monitored.drivingPressure.toFixed(0) : '--'}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">cmH₂O</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400">Meta Segura: &le; 15 cmH₂O</span>
            </div>

            {/* Auto-PEEP */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#07080d] border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 font-mono font-bold">AUTO-PEEP (PEEPi)</span>
                <span className="text-[8px] text-zinc-400">cmH₂O</span>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span
                  className={`text-2xl font-bold font-mono ${
                    currentAutoPeep > 3
                      ? isLight ? 'text-amber-700' : 'text-amber-400'
                      : isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}
                >
                  {currentAutoPeep.toFixed(1)}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">cmH₂O</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400">Pausa Exp: PEEP Total {(currentPeep + currentAutoPeep).toFixed(1)}</span>
            </div>
          </div>

          {/* Mechanics Grid 4: Tobin Index & Mechanical Power */}
          <div className="grid grid-cols-2 gap-2">
            {/* Tobin Index / RSBI */}
            <div
              className={`p-2 rounded-lg border flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#07080d] border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 font-mono font-bold">ÍNDICE DE TOBIN (IRRS)</span>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span
                  className={`text-lg font-bold font-mono ${
                    monitored.rapidShallowBreathingIndex > 105
                      ? isLight ? 'text-rose-700' : 'text-rose-400'
                      : isLight ? 'text-emerald-700' : 'text-emerald-300'
                  }`}
                >
                  {monitored.rapidShallowBreathingIndex}
                </span>
                <span className="text-[8px] text-zinc-400 font-mono">ciclos/min/L</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400">Desmame apto: &lt; 105</span>
            </div>

            {/* Mechanical Power */}
            <div
              className={`p-2 rounded-lg border flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#07080d] border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 font-mono font-bold">POTÊNCIA MECÂNICA</span>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span
                  className={`text-lg font-bold font-mono ${
                    Number(mechanicalPower) > 17
                      ? isLight ? 'text-amber-700' : 'text-amber-400'
                      : isLight ? 'text-cyan-700' : 'text-cyan-300'
                  }`}
                >
                  {mechanicalPower}
                </span>
                <span className="text-[8px] text-zinc-400 font-mono">J/min</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400">Meta VILI: &lt; 17 J/min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
