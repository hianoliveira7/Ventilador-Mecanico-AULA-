import React, { useState } from 'react';
import { MonitoredData, VentilationMode, PatientParameters } from '../types/ventilation';
import {
  Activity,
  ShieldCheck,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PulseOximeterModule } from './PulseOximeterModule';
import { GasometryModule } from './GasometryModule';

interface MonitorPanelProps {
  monitored: MonitoredData;
  mode: VentilationMode;
  patient: PatientParameters;
  onOpenGasometry?: () => void;
}

export const MonitorPanel: React.FC<MonitorPanelProps> = ({
  monitored,
  patient,
  onOpenGasometry,
}) => {
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<'vital' | 'mechanics'>('vital');

  // Fallbacks to prevent NaN - check both vte/vti/minuteVolume and old naming
  const currentPeak = monitored.peakPressure ?? 0;
  const currentPlat = monitored.plateauPressure ?? 0;
  const currentMean = monitored.meanPressure ?? 0;
  const currentPeep = monitored.peep ?? 0;
  const currentVte = monitored.vte ?? (monitored as any).expiratoryTidalVolume ?? 0;
  const currentVti = monitored.vti ?? (monitored as any).inspiratoryTidalVolume ?? currentVte;
  const currentVe = monitored.minuteVolume ?? (monitored as any).minuteVentilation ?? 0;
  const currentTotalRate = monitored.totalRate ?? (monitored as any).totalRespiratoryRate ?? 0;
  const currentDp = monitored.drivingPressure ?? 0;
  const currentAutoPeep = monitored.autoPeep ?? 0;

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
      ? isLight ? 'text-emerald-800 font-bold' : 'text-emerald-400 font-bold'
      : currentDp <= 16
      ? isLight ? 'text-amber-800 font-bold' : 'text-amber-400 font-bold'
      : isLight ? 'text-rose-800 font-bold' : 'text-rose-400 font-bold';

  const dpBadge =
    currentDp <= 14
      ? isLight ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold' : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
      : currentDp <= 16
      ? isLight ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold' : 'bg-amber-950/80 text-amber-300 border-amber-600/50'
      : isLight ? 'bg-rose-100 text-rose-950 border-rose-400 animate-pulse font-bold' : 'bg-rose-950/90 text-rose-200 border-rose-600/80 animate-pulse';

  return (
    <div
      className={`flex flex-col h-full rounded-2xl border shadow-xl overflow-hidden select-none transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0a0a0e] border-zinc-800/90'
      }`}
    >
      {/* Top Header */}
      <div
        className={`px-3 py-2 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 text-xs font-display font-black uppercase tracking-wider ${
            isLight ? 'text-slate-900' : 'text-zinc-200'
          }`}
        >
          <Activity className="w-4 h-4 text-cyan-500" />
          <span>PAINEL CLÍNICO</span>
        </div>
        {onOpenGasometry && (
          <button
            onClick={onOpenGasometry}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg font-mono font-bold cursor-pointer transition-all shadow-sm border ${
              isLight
                ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300'
                : 'bg-[#161824] hover:bg-[#202334] text-cyan-300 border-cyan-800/60'
            }`}
            title="Abrir Janela Flutuante de Gasometria"
          >
            <FileText className="w-3 h-3" />
            <span>GASO</span>
          </button>
        )}
      </div>

      {/* Tabs Selector for Clean Layout: Visão Rápida vs Mecânica Detalhada */}
      <div className={`p-1.5 border-b flex gap-1.5 shrink-0 ${isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-[#0b0c11] border-zinc-800'}`}>
        <button
          onClick={() => setActiveTab('vital')}
          className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
            activeTab === 'vital'
              ? isLight
                ? 'bg-white text-cyan-800 border-cyan-300 shadow-sm'
                : 'bg-[#161928] text-cyan-300 border-cyan-500/40 shadow-sm'
              : isLight
              ? 'bg-transparent text-slate-700 border-transparent hover:bg-slate-200/60 font-semibold'
              : 'bg-transparent text-zinc-400 border-transparent hover:bg-[#141620]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>VITAIS</span>
        </button>
        <button
          onClick={() => setActiveTab('mechanics')}
          className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
            activeTab === 'mechanics'
              ? isLight
                ? 'bg-white text-cyan-800 border-cyan-300 shadow-sm'
                : 'bg-[#161928] text-cyan-300 border-cyan-500/40 shadow-sm'
              : isLight
              ? 'bg-transparent text-slate-700 border-transparent hover:bg-slate-200/60 font-semibold'
              : 'bg-transparent text-zinc-400 border-transparent hover:bg-[#141620]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>MECÂNICA</span>
        </button>
      </div>

      {/* Scrollable Clinical Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Asynchrony or Adjustment Processing Alert Card */}
        {monitored.activeAsynchrony && monitored.activeAsynchrony !== 'none' ? (
          <div
            className={`p-2.5 rounded-xl border animate-pulse ${
              isLight
                ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-sm'
                : 'bg-rose-950/80 border-rose-600/70 text-rose-100 shadow-lg shadow-rose-950/40'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-display font-black text-rose-600">
                <Activity className="w-3.5 h-3.5 animate-spin" />
                <span>ASSINCRONIA DETECTADA</span>
              </div>
              <span className={`text-[9px] font-mono px-2 py-0.2 rounded font-bold uppercase ${
                isLight ? 'bg-rose-200 text-rose-900' : 'bg-rose-900/90 text-rose-200'
              }`}>
                {monitored.activeAsynchrony.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[10.5px] font-sans leading-tight opacity-95">
              {monitored.asynchronyDescription}
            </p>
          </div>
        ) : monitored.isEquilibrating ? (
          <div
            className={`p-2 rounded-xl border ${
              isLight
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-amber-950/50 border-amber-600/50 text-amber-200'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Processando Cinética de Trocas Gasosas</span>
              </span>
              <span>{monitored.equilibrationProgressPercent ?? 50}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${monitored.equilibrationProgressPercent ?? 50}%` }}
              />
            </div>
            <p className="text-[9.5px] font-mono mt-1 opacity-80">
              Aguarde o equilíbrio alveolar de PaCO₂/PaO₂ e a acomodação gradual do drive respiratório do paciente.
            </p>
          </div>
        ) : null}

        {activeTab === 'vital' ? (
          <>
            {/* Row 1: Pressures (Pico, Platô, Média) */}
            <div className="grid grid-cols-3 gap-1.5">
              {/* Peak Pressure */}
              <div
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>P. PICO</span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>cmH₂O</span>
                </div>
                <div className="flex items-baseline gap-0.5 my-0.5">
                  <span
                    className={`text-xl font-bold font-mono truncate ${
                      currentPeak > 35
                        ? isLight ? 'text-rose-800 font-black' : 'text-rose-400 font-black'
                        : isLight ? 'text-cyan-800' : 'text-cyan-300'
                    }`}
                  >
                    {currentPeak}
                  </span>
                </div>
                <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Lim: &le;35</span>
              </div>

              {/* Plateau Pressure */}
              <div
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>P. PLATÔ</span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>cmH₂O</span>
                </div>
                <div className="flex items-baseline gap-0.5 my-0.5">
                  <span
                    className={`text-xl font-bold font-mono truncate ${
                      monitored.isPlateauMeasured
                        ? currentPlat > 30
                          ? isLight ? 'text-rose-800 font-black' : 'text-rose-400 font-black'
                          : isLight ? 'text-cyan-800' : 'text-cyan-300'
                        : isLight ? 'text-slate-400' : 'text-zinc-600'
                    }`}
                  >
                    {monitored.isPlateauMeasured ? currentPlat : '--'}
                  </span>
                </div>
                <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Alvo: &le;30</span>
              </div>

              {/* Mean Pressure */}
              <div
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>P. MÉDIA</span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>cmH₂O</span>
                </div>
                <div className="flex items-baseline gap-0.5 my-0.5">
                  <span className={`text-xl font-bold font-mono truncate ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>
                    {currentMean}
                  </span>
                </div>
                <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>PEEP: {currentPeep}</span>
              </div>
            </div>

            {/* Row 2: Volumes & Rates (VTi, VTe, VM, FR TOT) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {/* Inspiratory Tidal Volume (VTi) */}
              <div
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>VTi INSP</span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>mL</span>
                </div>
                <div className="flex items-baseline gap-0.5 my-0.5">
                  <span className={`text-lg font-bold font-mono truncate ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                    {currentVti || currentVte}
                  </span>
                </div>
                <span className={`text-[7.5px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Entregue
                </span>
              </div>

              {/* Expiratory Tidal Volume (VTe) */}
              <div
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>VTe EXP</span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>mL</span>
                </div>
                <div className="flex items-baseline gap-0.5 my-0.5">
                  <span className={`text-lg font-bold font-mono truncate ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                    {currentVte}
                  </span>
                </div>
                <span className={`text-[7.5px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  {patient.idealBodyWeight > 0 ? `${(currentVte / patient.idealBodyWeight).toFixed(1)} mL/kg` : 'mL'}
                </span>
              </div>

              {/* Minute Ventilation (VM / VE) */}
              <div
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>VM (V̇E)</span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>L/min</span>
                </div>
                <div className="flex items-baseline gap-0.5 my-0.5">
                  <span className={`text-lg font-bold font-mono truncate ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                    {currentVe.toFixed(1)}
                  </span>
                </div>
                <span className={`text-[7.5px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Alvo: 5–8 L</span>
              </div>

              {/* Total Respiratory Rate */}
              <div
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>FR TOT</span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>rpm</span>
                </div>
                <div className="flex items-baseline gap-0.5 my-0.5">
                  <span
                    className={`text-lg font-bold font-mono truncate ${
                      currentTotalRate > 30
                        ? isLight ? 'text-rose-800 font-black' : 'text-rose-400 font-black'
                        : isLight ? 'text-emerald-800' : 'text-emerald-300'
                    }`}
                  >
                    {currentTotalRate}
                  </span>
                </div>
                <span className={`text-[7.5px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  {patient.spontaneousDrive ? 'Espontânea' : 'Controlada'}
                </span>
              </div>
            </div>

            {/* Row 3: Protective Ventilation Strip (Driving Pressure & Auto-PEEP) */}
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-300 shadow-sm' : 'bg-[#0e1017] border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${currentDp <= 15 ? 'text-emerald-600' : 'text-amber-600'}`} />
                <div>
                  <span className={`text-xs font-display font-bold block ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                    Driving Pressure (ΔP): {monitored.isPlateauMeasured ? `${monitored.drivingPressure.toFixed(0)} cmH₂O` : 'requer pausa'}
                  </span>
                  <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Auto-PEEP: {currentAutoPeep.toFixed(1)} cmH₂O • PEEP Tot: {(currentPeep + currentAutoPeep).toFixed(1)}
                  </span>
                </div>
              </div>

              <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${dpBadge}`}>
                {currentDp <= 15 ? 'PROTETORA' : 'AVALIE ΔP'}
              </span>
            </div>

            {/* Pulse Oximeter Module (directly below Driving Pressure) */}
            <div className="pt-0.5">
              <PulseOximeterModule monitored={monitored} patient={patient} />
            </div>

            {/* Arterial Gasometry Module (directly below Pulse Oximeter) */}
            <div className="pt-0.5">
              <GasometryModule
                monitored={monitored}
                patient={patient}
                onOpenDetails={onOpenGasometry}
              />
            </div>
          </>
        ) : (
          /* DETAILED MECHANICS TAB */
          <div className="space-y-2 animate-fadeIn">
            {/* Mechanics Grid 1: Compliance & Resistance */}
            <div className="grid grid-cols-2 gap-2">
              {/* Static Compliance */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                    COMPLACÊNCIA ESTÁTICA
                  </span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>mL/cm</span>
                </div>
                <div className="flex items-baseline gap-1 my-0.5">
                  <span className={`text-xl font-bold font-mono ${isLight ? 'text-purple-900' : 'text-purple-300'}`}>
                    {monitored.isPlateauMeasured ? monitored.staticCompliance : '--'}
                  </span>
                  <span className={`text-[9px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>mL/cmH₂O</span>
                </div>
                <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Ref: 50 – 80</span>
              </div>

              {/* Dynamic Compliance */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                    COMPLACÊNCIA DINÂMICA
                  </span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>mL/cm</span>
                </div>
                <div className="flex items-baseline gap-1 my-0.5">
                  <span className={`text-xl font-bold font-mono ${isLight ? 'text-purple-900' : 'text-purple-300'}`}>
                    {cdyn}
                  </span>
                  <span className={`text-[9px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>mL/cmH₂O</span>
                </div>
                <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Ref: 30 – 50</span>
              </div>
            </div>

            {/* Mechanics Grid 2: Airway Resistance & Time Constant */}
            <div className="grid grid-cols-2 gap-2">
              {/* Airway Resistance */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                    RESISTÊNCIA (Raw)
                  </span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>cm/L/s</span>
                </div>
                <div className="flex items-baseline gap-1 my-0.5">
                  <span
                    className={`text-xl font-bold font-mono ${
                      monitored.isPlateauMeasured
                        ? monitored.airwayResistance > 15
                          ? isLight ? 'text-rose-800 font-black' : 'text-rose-400 font-black'
                          : isLight ? 'text-cyan-800' : 'text-cyan-300'
                        : isLight ? 'text-slate-400' : 'text-zinc-600'
                    }`}
                  >
                    {monitored.isPlateauMeasured ? monitored.airwayResistance : '--'}
                  </span>
                  <span className={`text-[9px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>cmH₂O/L/s</span>
                </div>
                <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Normal: &le; 10-15</span>
              </div>

              {/* Time Constant Tau */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                    CONSTANTE DE TEMPO (τ)
                  </span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>seg</span>
                </div>
                <div className="flex items-baseline gap-1 my-0.5">
                  <span className={`text-xl font-bold font-mono ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>
                    {tau}
                  </span>
                  <span className={`text-[9px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>s</span>
                </div>
                <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>3τ = {(Number(tau) * 3).toFixed(2)}s exp</span>
              </div>
            </div>

            {/* Mechanics Grid 3: Driving Pressure & Auto-PEEP */}
            <div className="grid grid-cols-2 gap-2">
              {/* Driving Pressure */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                    DRIVING PRESSURE (ΔP)
                  </span>
                  <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${dpBadge}`}>
                    {currentDp <= 15 ? 'PROTETORA' : 'ELEVADA'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 my-0.5">
                  <span className={`text-2xl font-bold font-mono ${dpColor}`}>
                    {monitored.isPlateauMeasured ? monitored.drivingPressure.toFixed(0) : '--'}
                  </span>
                  <span className={`text-[9px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>cmH₂O</span>
                </div>
                <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Alvo: &le; 15 cmH₂O</span>
              </div>

              {/* Auto-PEEP */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                    AUTO-PEEP (PEEPi)
                  </span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>cmH₂O</span>
                </div>
                <div className="flex items-baseline gap-1 my-0.5">
                  <span
                    className={`text-2xl font-bold font-mono ${
                      currentAutoPeep > 3
                        ? isLight ? 'text-amber-800' : 'text-amber-400'
                        : isLight ? 'text-emerald-800' : 'text-emerald-400'
                    }`}
                  >
                    {currentAutoPeep.toFixed(1)}
                  </span>
                  <span className={`text-[9px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>cmH₂O</span>
                </div>
                <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  PEEP Tot: {(currentPeep + currentAutoPeep).toFixed(1)}
                </span>
              </div>
            </div>

            {/* Mechanics Grid 4: Tobin Index & Mechanical Power */}
            <div className="grid grid-cols-2 gap-2">
              {/* Tobin Index / RSBI */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                    ÍNDICE DE TOBIN (IRRS)
                  </span>
                </div>
                <div className="flex items-baseline gap-1 my-0.5">
                  <span
                    className={`text-lg font-bold font-mono ${
                      monitored.rapidShallowBreathingIndex > 105
                        ? isLight ? 'text-rose-800' : 'text-rose-400'
                        : isLight ? 'text-emerald-800' : 'text-emerald-300'
                    }`}
                  >
                    {monitored.rapidShallowBreathingIndex}
                  </span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    ciclos/min/L
                  </span>
                </div>
                <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Desmame: &lt; 105</span>
              </div>

              {/* Mechanical Power */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#07080d] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                    POTÊNCIA MECÂNICA
                  </span>
                </div>
                <div className="flex items-baseline gap-1 my-0.5">
                  <span
                    className={`text-lg font-bold font-mono ${
                      Number(mechanicalPower) > 17
                        ? isLight ? 'text-amber-800' : 'text-amber-400'
                        : isLight ? 'text-cyan-800' : 'text-cyan-300'
                    }`}
                  >
                    {mechanicalPower}
                  </span>
                  <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>J/min</span>
                </div>
                <span className={`text-[8px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Meta: &lt; 17 J/min</span>
              </div>
            </div>

            {/* Pulse Oximeter */}
            <div className="pt-0.5">
              <PulseOximeterModule monitored={monitored} patient={patient} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
