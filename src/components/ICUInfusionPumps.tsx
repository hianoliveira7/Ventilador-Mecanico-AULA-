import React, { useState } from 'react';
import { ICUInfusionPumpsState, ICUNeurologicalState } from '../types/icu';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import {
  Syringe,
  Droplets,
  Shield,
  AlertTriangle,
  Play,
  Pause,
  Zap,
  RotateCcw,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';

interface ICUInfusionPumpsProps {
  pumps: ICUInfusionPumpsState;
  neurology: ICUNeurologicalState;
  patientWeightKg: number;
  onUpdatePumps: (newPumps: ICUInfusionPumpsState) => void;
}

export const ICUInfusionPumps: React.FC<ICUInfusionPumpsProps> = ({
  pumps,
  neurology,
  patientWeightKg,
  onUpdatePumps,
}) => {
  const { isLight } = useTheme();

  const handleUpdate = (field: keyof ICUInfusionPumpsState, delta: number, min = 0, max = 999) => {
    audioEngine.playKnobTick();
    const current = pumps[field];
    const updated = Math.max(min, Math.min(max, Number((current + delta).toFixed(2))));
    onUpdatePumps({
      ...pumps,
      [field]: updated,
    });
  };

  // Preset scenarios for fast clinical simulation
  const applyPreset = (preset: 'deep_sedation' | 'light_sedation' | 'paralyzed' | 'septic_shock') => {
    audioEngine.playConfirmBeep();
    if (preset === 'deep_sedation') {
      onUpdatePumps({
        ...pumps,
        fentanylMcgPerHour: 150,
        propofolMcgKgMin: 45,
        cisatracuriumMgPerHour: 0,
      });
    } else if (preset === 'light_sedation') {
      onUpdatePumps({
        ...pumps,
        fentanylMcgPerHour: 50,
        propofolMcgKgMin: 15,
        cisatracuriumMgPerHour: 0,
      });
    } else if (preset === 'paralyzed') {
      onUpdatePumps({
        ...pumps,
        fentanylMcgPerHour: 200,
        propofolMcgKgMin: 55,
        cisatracuriumMgPerHour: 10,
      });
    } else if (preset === 'septic_shock') {
      onUpdatePumps({
        ...pumps,
        norepinephrineMcgKgMin: 0.45,
        dobutamineMcgKgMin: 5.0,
      });
    }
  };

  // Concentration conversions to mL/h for standard ICU solutions:
  // Fentanyl (50 mcg/mL): dose mcg/h / 50
  const fentanylMlPerHour = (pumps.fentanylMcgPerHour / 50).toFixed(1);
  // Propofol 1% (10 mg/mL = 10000 mcg/mL): dose mcg/kg/min * weight * 60 / 10000
  const propofolMlPerHour = ((pumps.propofolMcgKgMin * patientWeightKg * 60) / 10000).toFixed(1);
  // Cisatracurium (2 mg/mL): dose mg/h / 2
  const cisatraMlPerHour = (pumps.cisatracuriumMgPerHour / 2).toFixed(1);
  // Noradrenaline 64 mcg/mL: dose mcg/kg/min * weight * 60 / 64
  const noraMlPerHour = ((pumps.norepinephrineMcgKgMin * patientWeightKg * 60) / 64).toFixed(1);
  // Dobutamine 1000 mcg/mL: dose mcg/kg/min * weight * 60 / 1000
  const dobutaMlPerHour = ((pumps.dobutamineMcgKgMin * patientWeightKg * 60) / 1000).toFixed(1);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#07090f] text-slate-100 flex flex-col overflow-hidden shadow-xl select-none font-sans">
      {/* Header Bar */}
      <div className="px-4 py-2.5 bg-[#0d111c] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Syringe className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-200 tracking-wider">
            TORRE DE BOMBAS DE INFUSÃO (BICs) • RACK B.BRAUN SPACE
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-[11px]">
            Peso: {patientWeightKg} kg
          </span>
        </div>

        {/* Dynamic RASS Score Indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded text-xs font-bold font-mono flex items-center gap-1.5 ${
              neurology.isParalyzed
                ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                : neurology.rassScore <= -4
                ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                : neurology.rassScore >= 1
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Escala RASS: {neurology.rassScore > 0 ? `+${neurology.rassScore}` : neurology.rassScore} ({neurology.rassDescription})</span>
          </span>
        </div>
      </div>

      {/* Clinical Warning Banner if Under-sedated or Agitated */}
      {neurology.agitationAlert && (
        <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-700/60 text-rose-200 text-xs font-mono flex items-center justify-between gap-2 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{neurology.agitationAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => applyPreset('deep_sedation')}
            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] cursor-pointer"
          >
            Aprofundar Sedação
          </button>
        </div>
      )}

      {/* Clinical Presets Bar */}
      <div className="px-4 py-2 bg-[#090c15] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <span className="text-[11px] text-slate-400">Prescrições Rápidas:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset('deep_sedation')}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer transition-colors"
          >
            Sedação Profunda (RASS -4)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('light_sedation')}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer transition-colors"
          >
            Desmame / Despertar Diário (RASS -1)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('paralyzed')}
            className="px-2 py-1 rounded bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 text-[11px] cursor-pointer transition-colors"
          >
            Curarização (SDRA Grave / Sincronia)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('septic_shock')}
            className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] cursor-pointer transition-colors"
          >
            Choque Séptico (Nora + Dobuta)
          </button>
        </div>
      </div>

      {/* Modular Pumps Rack: 4 Stacked Channel Units */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* PUMP 1: FENTANIL (Analgesia Opioide) */}
        <div className="rounded-lg border border-slate-700 bg-[#0e1322] p-3 flex flex-col justify-between gap-2.5 shadow-sm">
          {/* Pump Top Status Strip */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${pumps.fentanylMcgPerHour > 0 ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              <span className="text-[11px] font-bold text-slate-300">BIC 01 • FENTANIL</span>
            </div>
            <span className="text-[10px] text-slate-400">50 mcg/mL</span>
          </div>

          {/* LCD Digital Display Screen */}
          <div className="p-2.5 rounded bg-[#06101e] border border-cyan-900/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-cyan-400 uppercase block">Dose Analgésica</span>
              <span className="text-2xl font-black text-cyan-300 leading-none">
                {pumps.fentanylMcgPerHour} <span className="text-xs font-normal text-slate-400">mcg/h</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block">Vazão</span>
              <span className="text-sm font-bold text-white">
                {fentanylMlPerHour} <span className="text-[10px] text-slate-400">mL/h</span>
              </span>
            </div>
          </div>

          {/* Titration Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleUpdate('fentanylMcgPerHour', -25, 0, 400)}
              className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Minus className="w-3 h-3" /> 25 mcg
            </button>
            <button
              type="button"
              onClick={() => handleUpdate('fentanylMcgPerHour', +25, 0, 400)}
              className="py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> 25 mcg
            </button>
          </div>
        </div>

        {/* PUMP 2: PROPOFOL 1% (Sedação Hipnótica) */}
        <div className="rounded-lg border border-slate-700 bg-[#0e1322] p-3 flex flex-col justify-between gap-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${pumps.propofolMcgKgMin > 0 ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              <span className="text-[11px] font-bold text-slate-300">BIC 02 • PROPOFOL 1%</span>
            </div>
            <span className="text-[10px] text-slate-400">10 mg/mL</span>
          </div>

          <div className="p-2.5 rounded bg-[#06101e] border border-cyan-900/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-cyan-400 uppercase block">Dose Sedação</span>
              <span className="text-2xl font-black text-cyan-300 leading-none">
                {pumps.propofolMcgKgMin} <span className="text-[10px] font-normal text-slate-400">mcg/kg/min</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block">Vazão</span>
              <span className="text-sm font-bold text-white">
                {propofolMlPerHour} <span className="text-[10px] text-slate-400">mL/h</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleUpdate('propofolMcgKgMin', -5, 0, 80)}
              className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Minus className="w-3 h-3" /> 5 mcg
            </button>
            <button
              type="button"
              onClick={() => handleUpdate('propofolMcgKgMin', +5, 0, 80)}
              className="py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> 5 mcg
            </button>
          </div>
        </div>

        {/* PUMP 3: CISATRACÚRIO (Bloqueador Neuromuscular) */}
        <div className={`rounded-lg border p-3 flex flex-col justify-between gap-2.5 shadow-sm transition-colors ${
          pumps.cisatracuriumMgPerHour > 0
            ? 'border-purple-600 bg-[#160f26]'
            : 'border-slate-700 bg-[#0e1322]'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${pumps.cisatracuriumMgPerHour > 0 ? 'bg-purple-400 animate-ping' : 'bg-slate-600'}`} />
              <span className="text-[11px] font-bold text-purple-300">BIC 03 • CISATRACÚRIO</span>
            </div>
            <span className="text-[10px] text-purple-400">2 mg/mL</span>
          </div>

          <div className="p-2.5 rounded bg-[#10071c] border border-purple-900/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-purple-400 uppercase block">Curarização (BNM)</span>
              <span className="text-2xl font-black text-purple-300 leading-none">
                {pumps.cisatracuriumMgPerHour} <span className="text-xs font-normal text-slate-400">mg/h</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block">Status TOF</span>
              <span className="text-sm font-bold text-purple-200">
                {pumps.cisatracuriumMgPerHour >= 4 ? '0/4 (Paralisado)' : '4/4 (Sem BNM)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleUpdate('cisatracuriumMgPerHour', -2, 0, 30)}
              className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Minus className="w-3 h-3" /> 2 mg
            </button>
            <button
              type="button"
              onClick={() => handleUpdate('cisatracuriumMgPerHour', +2, 0, 30)}
              className="py-1 rounded bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> 2 mg
            </button>
          </div>
        </div>

        {/* PUMP 4: NORADRENALINA (Vasopressor) */}
        <div className={`rounded-lg border p-3 flex flex-col justify-between gap-2.5 shadow-sm transition-colors ${
          pumps.norepinephrineMcgKgMin > 0.3
            ? 'border-rose-600 bg-[#220c13]'
            : 'border-slate-700 bg-[#0e1322]'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${pumps.norepinephrineMcgKgMin > 0 ? 'bg-rose-400 animate-ping' : 'bg-slate-600'}`} />
              <span className="text-[11px] font-bold text-rose-300">BIC 04 • NORADRENALINA</span>
            </div>
            <span className="text-[10px] text-rose-400">64 mcg/mL</span>
          </div>

          <div className="p-2.5 rounded bg-[#180509] border border-rose-900/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-rose-400 uppercase block">Dose Vasopressora</span>
              <span className="text-2xl font-black text-rose-400 leading-none">
                {pumps.norepinephrineMcgKgMin} <span className="text-[10px] font-normal text-slate-400">mcg/kg/min</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block">Vazão</span>
              <span className="text-sm font-bold text-white">
                {noraMlPerHour} <span className="text-[10px] text-slate-400">mL/h</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleUpdate('norepinephrineMcgKgMin', -0.05, 0, 2.5)}
              className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Minus className="w-3 h-3" /> 0.05
            </button>
            <button
              type="button"
              onClick={() => handleUpdate('norepinephrineMcgKgMin', +0.05, 0, 2.5)}
              className="py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> 0.05
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
