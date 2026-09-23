import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VentilatorSettings, VentilationMode } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import { Plus, Minus, Check, X, Wind, Gauge, SlidersHorizontal, Settings2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ParameterControlsProps {
  settings: VentilatorSettings;
  draftSettings: VentilatorSettings;
  onUpdateDraft: (newDraft: VentilatorSettings) => void;
  hasChanges: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
}

interface QuickPresets {
  [key: string]: number[];
}

const PARAM_PRESETS: QuickPresets = {
  tidalVolume: [300, 350, 400, 450, 500, 550, 600],
  inspiratoryPressure: [10, 12, 15, 18, 20, 25],
  pressureSupport: [5, 8, 10, 12, 14, 16],
  peep: [5, 8, 10, 12, 14, 16],
  fio2: [21, 30, 40, 50, 60, 80, 100],
  respiratoryRate: [10, 12, 14, 16, 18, 20, 24],
  simvRate: [6, 8, 10, 12, 14],
  inspiratoryTimePCV: [0.7, 0.8, 0.9, 1.0, 1.1, 1.2],
  inspiratoryPausePercent: [0, 5, 10, 15, 20],
  expiratorySensitivity: [15, 20, 25, 30, 35, 40],
  simvPs: [5, 8, 10, 12, 15],
};

interface TouchParamTileProps {
  title: string;
  acronym: string;
  field: keyof VentilatorSettings;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  themeColor: 'cyan' | 'emerald' | 'amber' | 'purple' | 'blue' | 'teal';
  activeVal?: number;
  onUpdate: (field: keyof VentilatorSettings, val: number) => void;
  onConfirm?: () => void;
  onDiscardParam?: () => void;
}

const TouchParamTile: React.FC<TouchParamTileProps> = ({
  title,
  acronym,
  field,
  value,
  min,
  max,
  step,
  unit,
  themeColor,
  activeVal,
  onUpdate,
}) => {
  const { isLight } = useTheme();
  const [showPresets, setShowPresets] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const safeVal = value ?? min;
  const isChanged = activeVal !== undefined && Math.abs(activeVal - safeVal) > 0.001;

  // Close quick presets on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    if (showPresets) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPresets]);

  // Auto-repeat on press and hold
  const holdIntervalRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);

  const doStep = useCallback(
    (direction: 'up' | 'down') => {
      audioEngine.playKnobTick();
      const delta = direction === 'up' ? step : -step;
      const nextVal = Math.max(min, Math.min(max, Number((safeVal + delta).toFixed(2))));
      onUpdate(field, nextVal);
    },
    [field, min, max, step, safeVal, onUpdate]
  );

  const startHolding = (direction: 'up' | 'down') => {
    doStep(direction);
    stopHolding();
    holdTimeoutRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => {
        doStep(direction);
      }, 90);
    }, 320);
  };

  const stopHolding = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  // Color schemes for categories
  const colorMap = {
    cyan: {
      badgeBg: isLight ? 'bg-cyan-100 text-cyan-900 border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      valueText: isLight ? 'text-cyan-950 font-black' : 'text-cyan-300 font-black',
      sliderAccent: 'accent-cyan-500',
    },
    emerald: {
      badgeBg: isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      valueText: isLight ? 'text-emerald-950 font-black' : 'text-emerald-300 font-black',
      sliderAccent: 'accent-emerald-500',
    },
    amber: {
      badgeBg: isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      valueText: isLight ? 'text-amber-950 font-black' : 'text-amber-300 font-black',
      sliderAccent: 'accent-amber-500',
    },
    purple: {
      badgeBg: isLight ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      valueText: isLight ? 'text-purple-950 font-black' : 'text-purple-300 font-black',
      sliderAccent: 'accent-purple-500',
    },
    blue: {
      badgeBg: isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      valueText: isLight ? 'text-blue-950 font-black' : 'text-blue-300 font-black',
      sliderAccent: 'accent-blue-500',
    },
    teal: {
      badgeBg: isLight ? 'bg-teal-100 text-teal-900 border-teal-300' : 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      valueText: isLight ? 'text-teal-950 font-black' : 'text-teal-300 font-black',
      sliderAccent: 'accent-teal-500',
    },
  };

  const scheme = colorMap[themeColor];
  const presets = PARAM_PRESETS[field as string] || [];

  return (
    <div
      ref={popoverRef}
      className={`relative flex-1 min-w-[160px] sm:min-w-[170px] md:min-w-[180px] shrink-0 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between gap-1.5 min-h-[115px] select-none transition-all duration-150 border snap-start ${
        isChanged
          ? isLight
            ? 'bg-amber-50/90 border-amber-500 shadow-md ring-1 ring-amber-400/60'
            : 'bg-[#1b150b] border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/70'
          : isLight
          ? 'bg-white hover:bg-slate-50 border-slate-300 shadow-xs'
          : 'bg-[#0b0e1a] hover:bg-[#111527] border-zinc-800 shadow-inner'
      }`}
    >
      {/* 1. Header Row: Acronym Badge + Title */}
      <div className="flex items-center justify-between gap-1.5 leading-none">
        <span
          className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black border uppercase tracking-wider shadow-xs ${scheme.badgeBg}`}
        >
          {acronym}
        </span>
        <span
          className={`text-xs font-display font-bold truncate ${
            isLight ? 'text-slate-700' : 'text-zinc-300'
          }`}
          title={title}
        >
          {title}
        </span>
      </div>

      {/* 2. Value Readout with - and + Steppers */}
      <div className="flex items-center justify-between gap-1.5 my-0.5">
        {/* Minus Button */}
        <button
          type="button"
          onPointerDown={() => startHolding('down')}
          onPointerUp={stopHolding}
          onPointerLeave={stopHolding}
          disabled={safeVal <= min}
          className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl flex items-center justify-center cursor-pointer border active:scale-90 transition-all shrink-0 ${
            safeVal <= min
              ? isLight
                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                : 'bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 border-slate-300 shadow-xs font-black'
              : 'bg-[#181d30] hover:bg-[#232a45] active:bg-[#2c3558] text-white border-zinc-700/90 shadow-xs font-black'
          }`}
          title="Diminuir"
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Value Display */}
        <div
          onClick={() => {
            if (presets.length > 0) {
              audioEngine.playClick(1000);
              setShowPresets((p) => !p);
            }
          }}
          className={`flex-1 min-w-0 flex items-baseline justify-center gap-1 cursor-pointer rounded-lg py-0.5 px-1 border transition-all ${
            isLight
              ? 'hover:bg-slate-100 border-transparent hover:border-slate-300'
              : 'hover:bg-[#15192c] border-transparent hover:border-zinc-700'
          }`}
          title="Clique para abrir atalhos rápidos de valores"
        >
          <span className={`text-xl sm:text-2xl font-mono font-black tabular-nums tracking-tight ${scheme.valueText}`}>
            {step < 1 ? safeVal.toFixed(1) : Math.round(safeVal)}
          </span>
          <span className={`text-[10px] sm:text-xs font-mono font-bold shrink-0 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            {unit}
          </span>
        </div>

        {/* Plus Button */}
        <button
          type="button"
          onPointerDown={() => startHolding('up')}
          onPointerUp={stopHolding}
          onPointerLeave={stopHolding}
          disabled={safeVal >= max}
          className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl flex items-center justify-center cursor-pointer border active:scale-90 transition-all shrink-0 ${
            safeVal >= max
              ? isLight
                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                : 'bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 border-slate-300 shadow-xs font-black'
              : 'bg-[#181d30] hover:bg-[#232a45] active:bg-[#2c3558] text-white border-zinc-700/90 shadow-xs font-black'
          }`}
          title="Aumentar"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Quick Presets Popover */}
        {showPresets && presets.length > 0 && (
          <div
            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-2xl border shadow-2xl z-50 min-w-[160px] flex flex-wrap gap-1 justify-center animate-fadeIn ${
              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
            }`}
          >
            <div
              className={`w-full text-[9.5px] font-mono font-bold uppercase pb-1 text-center border-b mb-1 ${
                isLight ? 'border-slate-200 text-slate-500' : 'border-zinc-800 text-zinc-400'
              }`}
            >
              Atalhos Rápidos ({acronym})
            </div>
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  audioEngine.playKnobTick();
                  onUpdate(field, preset);
                  setShowPresets(false);
                }}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-all border ${
                  safeVal === preset
                    ? isLight
                      ? 'bg-cyan-700 text-white border-cyan-700 font-black'
                      : 'bg-cyan-500 text-black border-cyan-400 font-black shadow-md'
                    : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-[#1c223a] hover:bg-[#283052] text-zinc-200 border-zinc-700'
                }`}
              >
                {preset} {unit}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Touch Scrubber Slider */}
      <div className="flex items-center gap-2 mt-0.5">
        <span className={`text-[9.5px] font-mono font-bold shrink-0 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
          {min}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeVal}
          onChange={(e) => {
            audioEngine.playKnobTick();
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) onUpdate(field, val);
          }}
          className={`w-full h-2 rounded-full appearance-none cursor-pointer relative z-10 transition-all ${
            isLight ? 'bg-slate-200' : 'bg-zinc-800'
          } ${scheme.sliderAccent}`}
        />
        <span className={`text-[9.5px] font-mono font-bold shrink-0 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
          {max}
        </span>
      </div>
    </div>
  );
};

export const ParameterControls: React.FC<ParameterControlsProps> = ({
  settings,
  draftSettings,
  onUpdateDraft,
  hasChanges,
  onConfirm,
  onDiscard,
}) => {
  const { isLight } = useTheme();
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const mode = draftSettings.mode;

  const handleModeChange = (newMode: VentilationMode) => {
    audioEngine.playClick(1000);
    const updated: VentilatorSettings = {
      ...draftSettings,
      mode: newMode,
    };

    if (newMode === 'VCV') {
      updated.tidalVolume = updated.tidalVolume || 420;
      updated.inspiratoryFlow = updated.inspiratoryFlow || 60;
      updated.flowWaveform = updated.flowWaveform || 'decelerating';
    } else if (newMode === 'PCV') {
      updated.inspiratoryPressure = updated.inspiratoryPressure || 15;
      updated.inspiratoryTimePCV = updated.inspiratoryTimePCV || 1.0;
    } else if (newMode === 'PSV') {
      updated.pressureSupport = updated.pressureSupport || 12;
      updated.expiratorySensitivity = updated.expiratorySensitivity || 25;
    } else if (newMode === 'SIMV_VC') {
      updated.simvRate = updated.simvRate || 10;
      updated.simvPs = updated.simvPs || 10;
      updated.tidalVolume = updated.tidalVolume || 450;
    }

    onUpdateDraft(updated);
  };

  const updateField = (field: keyof VentilatorSettings, val: number) => {
    onUpdateDraft({
      ...draftSettings,
      [field]: val,
    });
  };

  const modes: { id: VentilationMode; label: string; sub: string }[] = [
    { id: 'VCV', label: 'VCV', sub: 'Vol. Controlado' },
    { id: 'PCV', label: 'PCV', sub: 'Pressão Control.' },
    { id: 'PSV', label: 'PSV', sub: 'Suporte Espontâneo' },
    { id: 'APRV', label: 'APRV', sub: 'Liberação Pressão' },
    { id: 'SIMV_VC', label: 'SIMV-VC', sub: 'Intermitente Sinc.' },
    { id: 'CPAP', label: 'CPAP', sub: 'Pressão Contínua' },
  ];

  return (
    <div
      className={`rounded-2xl border shadow-xl flex flex-col h-full overflow-hidden select-none transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#070912] border-zinc-800'
      }`}
    >
      {/* 1. TOP HEADER: High-Visibility Compact Mode Selector Tabs + Master Actions */}
      <div
        className={`px-2.5 py-1.5 border-b flex items-center justify-between gap-2 shrink-0 overflow-x-auto scrollbar-none ${
          isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-[#0d101d] border-zinc-800'
        }`}
      >
        {/* Left: Mode Buttons Bar (Compact pill buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 mr-0.5 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-500" />
            <span
              className={`text-[10px] sm:text-xs font-display font-black uppercase tracking-wider shrink-0 ${
                isLight ? 'text-slate-800' : 'text-zinc-200'
              }`}
            >
              MODO:
            </span>
          </div>

          <div
            className={`flex items-center p-0.5 sm:p-1 rounded-xl border gap-0.5 sm:gap-1 shrink-0 ${
              isLight ? 'bg-slate-200/90 border-slate-300' : 'bg-[#141829] border-zinc-700/70'
            }`}
          >
            {modes.map((m) => {
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeChange(m.id)}
                  className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0 relative ${
                    isActive
                      ? isLight
                        ? 'bg-white text-slate-900 border border-slate-300 shadow-xs font-black ring-1 ring-cyan-500/40'
                        : 'bg-gradient-to-r from-cyan-500 to-sky-500 text-black border border-cyan-300 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : isLight
                      ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold'
                      : 'text-zinc-300 hover:text-white hover:bg-[#1f253e] font-bold'
                  }`}
                  title={`${m.label} - ${m.sub}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive
                        ? isLight
                          ? 'bg-cyan-600'
                          : 'bg-black'
                        : 'bg-zinc-500/50'
                    }`}
                  />
                  <span className="text-[11px] sm:text-xs font-mono font-black">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Advanced Toggle & Confirmation / Discard Dock */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {/* Advanced Parameters Expander Toggle */}
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick(900);
              setShowAdvanced((prev) => !prev);
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-1 ${
              showAdvanced
                ? isLight
                  ? 'bg-cyan-50 text-cyan-900 border-cyan-400 ring-1 ring-cyan-400'
                  : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/80'
                : isLight
                ? 'bg-white hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-[#15192b] hover:bg-[#1f253d] text-zinc-300 border-zinc-700'
            }`}
            title="Exibir ou ocultar parâmetros avançados"
          >
            <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Avançados</span>
          </button>

          {/* Master Confirm Button */}
          <button
            type="button"
            disabled={!hasChanges}
            onClick={() => {
              if (hasChanges) {
                audioEngine.playConfirmBeep();
                onConfirm();
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold transition-all flex items-center gap-1 border cursor-pointer ${
              hasChanges
                ? isLight
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm animate-pulse font-black'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.7)] animate-pulse font-black'
                : isLight
                ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-default font-semibold'
                : 'bg-[#121422] text-zinc-500 border-zinc-800 cursor-default opacity-70'
            }`}
          >
            <Check className={`w-3.5 h-3.5 stroke-[3] ${hasChanges ? 'animate-bounce' : ''}`} />
            <span>{hasChanges ? 'CONFIRMAR' : 'ATIVOS'}</span>
          </button>
        </div>
      </div>

      {/* 2. PARAMETERS DOCK: Horizontal Scrollable Touch Row for Tablet & Desktop */}
      <div className="p-2.5 sm:p-3 flex items-stretch gap-2.5 sm:gap-3.5 overflow-x-auto flex-1 min-h-0 scrollbar-thin snap-x">
        {/* 1. Primary Volume / Pressure Controls */}
        {(mode === 'VCV' || mode === 'SIMV_VC') && (
          <TouchParamTile
            title="Volume Corrente"
            acronym="VT"
            field="tidalVolume"
            value={draftSettings.tidalVolume}
            activeVal={settings.tidalVolume}
            min={100}
            max={1000}
            step={25}
            unit="mL"
            themeColor="cyan"
            onUpdate={updateField}
          />
        )}

        {mode === 'PCV' && (
          <TouchParamTile
            title="Pressão Insp."
            acronym="Pinsp"
            field="inspiratoryPressure"
            value={draftSettings.inspiratoryPressure ?? 15}
            activeVal={settings.inspiratoryPressure}
            min={5}
            max={40}
            step={1}
            unit="cmH₂O"
            themeColor="cyan"
            onUpdate={updateField}
          />
        )}

        {(mode === 'PSV' || mode === 'CPAP') && (
          <TouchParamTile
            title="Pressão Suporte"
            acronym="PS"
            field="pressureSupport"
            value={draftSettings.pressureSupport ?? 10}
            activeVal={settings.pressureSupport}
            min={0}
            max={30}
            step={1}
            unit="cmH₂O"
            themeColor="cyan"
            onUpdate={updateField}
          />
        )}

        {/* 2. Respiratory Rate / Frequency */}
        {mode === 'SIMV_VC' && (
          <TouchParamTile
            title="Freq. SIMV"
            acronym="fSIMV"
            field="simvRate"
            value={draftSettings.simvRate ?? 8}
            activeVal={settings.simvRate}
            min={2}
            max={30}
            step={1}
            unit="rpm"
            themeColor="emerald"
            onUpdate={updateField}
          />
        )}

        {mode !== 'PSV' && mode !== 'CPAP' && mode !== 'SIMV_VC' && (
          <TouchParamTile
            title="Frequência Resp."
            acronym="FR"
            field="respiratoryRate"
            value={draftSettings.respiratoryRate}
            activeVal={settings.respiratoryRate}
            min={5}
            max={40}
            step={1}
            unit="rpm"
            themeColor="emerald"
            onUpdate={updateField}
          />
        )}

        {/* 3. Inspiratory Time (Ti) */}
        {mode !== 'PSV' && mode !== 'CPAP' && (
          <TouchParamTile
            title="Tempo Insp."
            acronym="Ti"
            field="inspiratoryTimePCV"
            value={draftSettings.inspiratoryTimePCV}
            activeVal={settings.inspiratoryTimePCV}
            min={0.5}
            max={3.0}
            step={0.1}
            unit="s"
            themeColor="purple"
            onUpdate={updateField}
          />
        )}

        {/* 4. PEEP */}
        <TouchParamTile
          title="PEEP / CPAP"
          acronym="PEEP"
          field="peep"
          value={draftSettings.peep}
          activeVal={settings.peep}
          min={0}
          max={24}
          step={1}
          unit="cmH₂O"
          themeColor="blue"
          onUpdate={updateField}
        />

        {/* 5. FiO2 */}
        <TouchParamTile
          title="Fração Oxigênio"
          acronym="FiO₂"
          field="fio2"
          value={draftSettings.fio2}
          activeVal={settings.fio2}
          min={21}
          max={100}
          step={5}
          unit="%"
          themeColor="amber"
          onUpdate={updateField}
        />

        {/* 6. Disparo & Sensibilidade Card */}
        <div
          className={`flex-1 min-w-[160px] sm:min-w-[170px] md:min-w-[180px] shrink-0 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between gap-1.5 min-h-[115px] select-none transition-all duration-150 border snap-start ${
            isLight
              ? 'bg-white hover:bg-slate-50 border-slate-300 shadow-xs'
              : 'bg-[#0b0e1a] hover:bg-[#111527] border-zinc-800 shadow-inner'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5 leading-none">
            <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black border uppercase tracking-wider bg-amber-500/20 text-amber-300 border-amber-500/40">
              DISPARO
            </span>
            <span className={`text-xs font-display font-bold truncate ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              Sensibilidade
            </span>
          </div>

          {/* Trigger Type Toggle */}
          <div
            className={`flex p-0.5 rounded-lg border my-0.5 ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#060812] border-zinc-800'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick(950);
                onUpdateDraft({ ...draftSettings, triggerType: 'flow', triggerSensitivity: 2.0 });
              }}
              className={`flex-1 py-1 text-[9.5px] sm:text-[10px] font-mono font-bold rounded-md flex items-center justify-center gap-1 cursor-pointer transition-all ${
                draftSettings.triggerType === 'flow'
                  ? isLight
                    ? 'bg-cyan-700 text-white shadow-xs font-black'
                    : 'bg-cyan-500 text-black shadow-xs font-black'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-900 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>FLUXO</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick(950);
                onUpdateDraft({ ...draftSettings, triggerType: 'pressure', triggerSensitivity: 2.0 });
              }}
              className={`flex-1 py-1 text-[9.5px] sm:text-[10px] font-mono font-bold rounded-md flex items-center justify-center gap-1 cursor-pointer transition-all ${
                draftSettings.triggerType === 'pressure'
                  ? isLight
                    ? 'bg-cyan-700 text-white shadow-xs font-black'
                    : 'bg-cyan-500 text-black shadow-xs font-black'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-900 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>PRESSÃO</span>
            </button>
          </div>

          {/* Value Steppers */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => {
                audioEngine.playKnobTick();
                const stepVal = 0.5;
                const nextVal = Math.max(0.5, Number(((draftSettings.triggerSensitivity ?? 2.0) - stepVal).toFixed(1)));
                updateField('triggerSensitivity', nextVal);
              }}
              className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl flex items-center justify-center border cursor-pointer active:scale-90 transition-all shrink-0 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300 shadow-xs font-black'
                  : 'bg-[#181d30] hover:bg-[#232a45] text-white border-zinc-700 font-black'
              }`}
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="flex items-baseline justify-center gap-1">
              <span className={`text-xl sm:text-2xl font-mono font-black tabular-nums ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                {(draftSettings.triggerSensitivity ?? 2.0).toFixed(1)}
              </span>
              <span className={`text-[10px] sm:text-xs font-mono font-bold ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {draftSettings.triggerType === 'flow' ? 'L/min' : 'cmH₂O'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                audioEngine.playKnobTick();
                const stepVal = 0.5;
                const maxVal = draftSettings.triggerType === 'flow' ? 10.0 : 5.0;
                const nextVal = Math.min(maxVal, Number(((draftSettings.triggerSensitivity ?? 2.0) + stepVal).toFixed(1)));
                updateField('triggerSensitivity', nextVal);
              }}
              className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl flex items-center justify-center border cursor-pointer active:scale-90 transition-all shrink-0 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300 shadow-xs font-black'
                  : 'bg-[#181d30] hover:bg-[#232a45] text-white border-zinc-700 font-black'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* 7. Secondary / Advanced Parameters (Waveform, Pause, Esens) when showAdvanced is active */}
        {showAdvanced && (
          <>
            {/* Waveform Selector */}
            {(mode === 'VCV' || mode === 'SIMV_VC') && (
              <div
                className={`flex-1 min-w-[160px] sm:min-w-[170px] shrink-0 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between gap-1.5 min-h-[115px] border animate-fadeIn ${
                  isLight ? 'bg-white border-slate-300 shadow-xs' : 'bg-[#0b0e1a] border-zinc-800 shadow-inner'
                }`}
              >
                <div className="flex items-center justify-between leading-none mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-black border uppercase tracking-wider bg-purple-500/20 text-purple-300 border-purple-500/40">
                    ONDA FLUXO
                  </span>
                  <span className={`text-xs font-mono font-bold ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    VCV
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 my-1">
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playClick(950);
                      onUpdateDraft({ ...draftSettings, flowWaveform: 'square' });
                    }}
                    className={`py-1.5 px-1 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                      draftSettings.flowWaveform === 'square'
                        ? isLight
                          ? 'bg-cyan-50 border-cyan-600 text-cyan-950 ring-1 ring-cyan-600 shadow-sm'
                          : 'bg-cyan-950/70 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-[#151928] hover:bg-[#1f253d] border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <svg className="w-8 h-4" viewBox="0 0 40 20" fill="none">
                      <path d="M 2 18 L 8 18 L 8 4 L 32 4 L 32 18 L 38 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[9px] font-mono font-bold uppercase mt-0.5">Quadrada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playClick(950);
                      onUpdateDraft({ ...draftSettings, flowWaveform: 'decelerating' });
                    }}
                    className={`py-1.5 px-1 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                      draftSettings.flowWaveform === 'decelerating'
                        ? isLight
                          ? 'bg-cyan-50 border-cyan-600 text-cyan-950 ring-1 ring-cyan-600 shadow-sm'
                          : 'bg-cyan-950/70 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-[#151928] hover:bg-[#1f253d] border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <svg className="w-8 h-4" viewBox="0 0 40 20" fill="none">
                      <path d="M 2 18 L 8 18 L 8 4 L 32 18 L 38 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[9px] font-mono font-bold uppercase mt-0.5">Decresc.</span>
                  </button>
                </div>
              </div>
            )}

            {/* Inspiratory Pause % */}
            {(mode === 'VCV' || mode === 'SIMV_VC') && (
              <TouchParamTile
                title="Pausa Insp."
                acronym="Pausa"
                field="inspiratoryPausePercent"
                value={draftSettings.inspiratoryPausePercent ?? 10}
                activeVal={settings.inspiratoryPausePercent}
                min={0}
                max={30}
                step={5}
                unit="%"
                themeColor="purple"
                onUpdate={updateField}
              />
            )}

            {/* Expiratory Sensitivity % */}
            {(mode === 'PSV' || mode === 'CPAP') && (
              <TouchParamTile
                title="Sensib. Expiratória"
                acronym="Esens"
                field="expiratorySensitivity"
                value={draftSettings.expiratorySensitivity ?? 25}
                activeVal={settings.expiratorySensitivity}
                min={10}
                max={70}
                step={5}
                unit="%"
                themeColor="teal"
                onUpdate={updateField}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
