import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VentilatorSettings, VentilationMode } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import { Plus, Minus, Check, X, Wind, Gauge, SlidersHorizontal, Clock } from 'lucide-react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [tempInputVal, setTempInputVal] = useState((value ?? min).toString());
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const safeVal = value ?? min;
  const isChanged = activeVal !== undefined && Math.abs(activeVal - safeVal) > 0.001;

  useEffect(() => {
    if (!isEditing) {
      setTempInputVal(safeVal.toString());
    }
  }, [safeVal, isEditing]);

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

  // Color schemes for clinical categories
  const colorMap = {
    cyan: {
      lightValue: 'text-cyan-800',
      darkValue: 'text-cyan-300',
      accentBg: isLight ? 'bg-cyan-700' : 'bg-cyan-500',
      borderGlow: 'border-cyan-500/40',
      trackFill: isLight ? 'from-cyan-600 to-cyan-800' : 'from-cyan-500 to-cyan-300',
    },
    emerald: {
      lightValue: 'text-emerald-800',
      darkValue: 'text-emerald-300',
      accentBg: isLight ? 'bg-emerald-700' : 'bg-emerald-500',
      borderGlow: 'border-emerald-500/40',
      trackFill: isLight ? 'from-emerald-600 to-emerald-800' : 'from-emerald-500 to-emerald-300',
    },
    amber: {
      lightValue: 'text-amber-800',
      darkValue: 'text-amber-300',
      accentBg: isLight ? 'bg-amber-600' : 'bg-amber-500',
      borderGlow: 'border-amber-500/40',
      trackFill: isLight ? 'from-amber-600 to-amber-700' : 'from-amber-500 to-amber-300',
    },
    purple: {
      lightValue: 'text-purple-900',
      darkValue: 'text-purple-300',
      accentBg: isLight ? 'bg-purple-700' : 'bg-purple-500',
      borderGlow: 'border-purple-500/40',
      trackFill: isLight ? 'from-purple-600 to-purple-800' : 'from-purple-500 to-purple-300',
    },
    blue: {
      lightValue: 'text-blue-900',
      darkValue: 'text-blue-300',
      accentBg: isLight ? 'bg-blue-700' : 'bg-blue-500',
      borderGlow: 'border-blue-500/40',
      trackFill: isLight ? 'from-blue-600 to-blue-800' : 'from-blue-500 to-blue-300',
    },
    teal: {
      lightValue: 'text-teal-900',
      darkValue: 'text-teal-300',
      accentBg: isLight ? 'bg-teal-700' : 'bg-teal-500',
      borderGlow: 'border-teal-500/40',
      trackFill: isLight ? 'from-teal-600 to-teal-800' : 'from-teal-500 to-teal-300',
    },
  };

  const scheme = colorMap[themeColor];
  const valueColor = isLight ? scheme.lightValue : scheme.darkValue;

  // Percentage for medical range gauge
  const rangePercent = Math.max(0, Math.min(100, ((safeVal - min) / (max - min)) * 100));

  const presets = PARAM_PRESETS[field as string] || [];

  return (
    <div
      ref={popoverRef}
      className={`relative flex-1 min-w-[135px] max-w-[185px] shrink-0 rounded-xl p-2 flex flex-col justify-between select-none transition-all duration-150 border ${
        isChanged
          ? isLight
            ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-400/40'
            : 'bg-[#15120e] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/60'
          : isLight
          ? 'bg-white hover:bg-slate-50 border-slate-300 shadow-sm'
          : 'bg-[#0c0e17] hover:bg-[#111422] border-zinc-800/90 shadow-inner'
      }`}
    >
      {/* 1. Header: Acronym, Title & Unit */}
      <div className="flex items-center justify-between gap-1 leading-none">
        <div className="flex items-baseline gap-1 truncate">
          <span
            className={`font-mono font-black text-xs tracking-tight ${
              isChanged
                ? isLight ? 'text-amber-900' : 'text-amber-300 font-extrabold'
                : isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {acronym}
          </span>
          <span
            className={`text-[9px] font-sans font-medium truncate ${
              isLight ? 'text-slate-600' : 'text-zinc-400'
            }`}
            title={title}
          >
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isChanged && (
            <span
              className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded border uppercase ${
                isLight
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-amber-950 text-amber-300 border-amber-600/70'
              }`}
              title={`Valor ativo anterior: ${activeVal}`}
            >
              Proposto
            </span>
          )}
          <span
            className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded ${
              isLight
                ? 'bg-slate-100 text-slate-700'
                : 'bg-[#151928] text-zinc-300'
            }`}
          >
            {unit}
          </span>
        </div>
      </div>

      {/* 2. Hero Digital Readout with Flanking Tactile Touch Steppers */}
      <div className="flex items-center justify-between gap-1 my-1">
        {/* Minus Button */}
        <button
          type="button"
          onPointerDown={() => startHolding('down')}
          onPointerUp={stopHolding}
          onPointerLeave={stopHolding}
          disabled={safeVal <= min}
          className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border active:scale-90 transition-all shrink-0 ${
            safeVal <= min
              ? isLight
                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 border-slate-300 shadow-sm font-bold'
              : 'bg-[#191d2d] hover:bg-[#23293f] active:bg-[#2a314c] text-zinc-100 border-zinc-700/80 shadow-sm font-bold'
          }`}
          title="Diminuir (mantenha pressionado para aceleração)"
        >
          <Minus className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        {/* Center Value */}
        <div className="flex-1 text-center min-w-0 px-1 relative">
          {isEditing ? (
            <input
              type="number"
              step={step}
              autoFocus
              value={tempInputVal}
              onChange={(e) => setTempInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const parsed = parseFloat(tempInputVal);
                  if (!isNaN(parsed)) {
                    onUpdate(field, Math.max(min, Math.min(max, parsed)));
                  }
                  setIsEditing(false);
                } else if (e.key === 'Escape') {
                  setIsEditing(false);
                }
              }}
              onBlur={() => {
                const parsed = parseFloat(tempInputVal);
                if (!isNaN(parsed)) {
                  onUpdate(field, Math.max(min, Math.min(max, parsed)));
                }
                setIsEditing(false);
              }}
              className={`w-full font-mono text-base font-black text-center rounded-md outline-none border ${
                isLight
                  ? 'bg-white border-cyan-600 text-slate-950 shadow-inner'
                  : 'bg-[#06080e] border-cyan-500 text-white shadow-inner'
              }`}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowPresets((prev) => !prev)}
              onDoubleClick={() => {
                setTempInputVal(safeVal.toString());
                setIsEditing(true);
              }}
              className="group w-full block cursor-pointer transition-transform active:scale-95"
              title="Clique para atalhos rápidos ou duplo clique para digitar valor"
            >
              <span
                className={`font-mono text-2xl font-black tabular-nums tracking-tight block truncate ${valueColor}`}
              >
                {typeof safeVal === 'number'
                  ? safeVal % 1 !== 0
                    ? safeVal.toFixed(1)
                    : safeVal
                  : safeVal}
              </span>
            </button>
          )}

          {/* Quick Presets Popover */}
          {showPresets && presets.length > 0 && (
            <div
              className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 p-1.5 rounded-xl border shadow-xl z-50 min-w-[140px] flex flex-wrap gap-1 justify-center animate-fadeIn ${
                isLight ? 'bg-white border-slate-300' : 'bg-[#111422] border-zinc-700'
              }`}
            >
              <div
                className={`w-full text-[8.5px] font-mono font-bold uppercase pb-1 text-center border-b mb-0.5 ${
                  isLight ? 'border-slate-200 text-slate-600' : 'border-zinc-800 text-zinc-400'
                }`}
              >
                Atalhos Rápidos
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
                  className={`px-1.5 py-0.5 text-[9.5px] font-mono font-bold rounded cursor-pointer transition-all border ${
                    safeVal === preset
                      ? isLight
                        ? 'bg-cyan-700 text-white border-cyan-700'
                        : 'bg-cyan-500 text-black border-cyan-400 font-black'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                      : 'bg-[#1a1f33] hover:bg-[#252c48] text-zinc-200 border-zinc-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Plus Button */}
        <button
          type="button"
          onPointerDown={() => startHolding('up')}
          onPointerUp={stopHolding}
          onPointerLeave={stopHolding}
          disabled={safeVal >= max}
          className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border active:scale-90 transition-all shrink-0 ${
            safeVal >= max
              ? isLight
                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 border-slate-300 shadow-sm font-bold'
              : 'bg-[#191d2d] hover:bg-[#23293f] active:bg-[#2a314c] text-zinc-100 border-zinc-700/80 shadow-sm font-bold'
          }`}
          title="Aumentar (mantenha pressionado para aceleração)"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      </div>

      {/* 3. Physiological Range Gauge / Interactive Scrubber */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <span
          className={`text-[8.5px] font-mono font-bold shrink-0 ${
            isLight ? 'text-slate-600' : 'text-zinc-400'
          }`}
        >
          {min}
        </span>

        <div className="flex-1 relative flex items-center">
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
            className={`w-full h-1.5 rounded-full appearance-none cursor-pointer relative z-10 transition-all ${
              isLight
                ? 'bg-slate-200 accent-cyan-700'
                : 'bg-zinc-800 accent-cyan-400'
            }`}
          />
        </div>

        <span
          className={`text-[8.5px] font-mono font-bold shrink-0 ${
            isLight ? 'text-slate-600' : 'text-zinc-400'
          }`}
        >
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

  const mode = draftSettings.mode;

  const handleModeChange = (newMode: VentilationMode) => {
    audioEngine.playClick(850);
    const updated: VentilatorSettings = {
      ...draftSettings,
      mode: newMode,
    };

    if (newMode === 'VCV') {
      updated.tidalVolume = updated.tidalVolume || 450;
      updated.flowWaveform = updated.flowWaveform || 'square';
      updated.inspiratoryPausePercent = updated.inspiratoryPausePercent ?? 10;
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

  const modes: { id: VentilationMode; label: string; desc: string }[] = [
    { id: 'VCV', label: 'VCV', desc: 'Volume Controlado' },
    { id: 'PCV', label: 'PCV', desc: 'Pressão Controlada' },
    { id: 'PSV', label: 'PSV', desc: 'Pressão de Suporte' },
    { id: 'SIMV_VC', label: 'SIMV-VC', desc: 'Sincronizada Intermitente' },
    { id: 'CPAP', label: 'CPAP', desc: 'Pressão Contínua' },
  ];

  return (
    <div
      className={`rounded-2xl border shadow-xl flex flex-col h-full overflow-hidden select-none transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#080910] border-zinc-800'
      }`}
    >
      {/* Top Header of Bottom Bar: Mode Selector & Confirmation/Discard Actions */}
      <div
        className={`px-3 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0b0d17] border-zinc-800'
        }`}
      >
        {/* Left: Mode Buttons (Medical Segmented Tab Bar) */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <div className="flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-500" />
            <span
              className={`text-[10px] font-display font-black uppercase tracking-wider shrink-0 ${
                isLight ? 'text-slate-800' : 'text-zinc-300'
              }`}
            >
              MODO:
            </span>
          </div>

          <div
            className={`flex items-center p-0.5 rounded-xl border ${
              isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-[#121524] border-zinc-700/60'
            }`}
          >
            {modes.map((m) => {
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeChange(m.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? isLight
                        ? 'bg-white text-cyan-900 border border-slate-300 shadow-sm font-black'
                        : 'bg-cyan-500 text-black border border-cyan-400 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : isLight
                      ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#191d30]'
                  }`}
                  title={m.desc}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive
                        ? isLight ? 'bg-cyan-700' : 'bg-black'
                        : isLight ? 'bg-slate-400' : 'bg-zinc-600'
                    }`}
                  />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Confirmation Dock with Clinical Safety Alerts */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {hasChanges && (
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick(750);
                onDiscard();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
              title="Cancelar modificações e voltar aos parâmetros originais"
            >
              <X className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>
          )}

          <button
            type="button"
            disabled={!hasChanges}
            onClick={() => {
              audioEngine.playConfirmBeep();
              onConfirm();
            }}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              hasChanges
                ? isLight
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-md animate-pulse font-black'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.5)] animate-pulse font-black'
                : isLight
                ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed font-medium'
                : 'bg-[#12141f] text-zinc-500 border-zinc-800 cursor-not-allowed opacity-60'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{hasChanges ? 'CONFIRMAR PARÂMETROS' : 'PARÂMETROS ATIVOS'}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Parameters List (Direct Touch Tiles arranged in one continuous, ergonomic row) */}
      <div className="p-2 flex items-stretch gap-2 overflow-x-auto flex-1 min-h-0">
        {/* 1. Primary Volume / Pressure controls */}
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

        {/* 2. Frequency / Rate */}
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
          title="Pressão Exp. Final"
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
          title="Fração de Oxigênio"
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

        {/* 6. Ergonomic Trigger / Disparo Tile */}
        <div
          className={`flex-1 min-w-[155px] max-w-[200px] shrink-0 rounded-xl p-2 flex flex-col justify-between select-none transition-all duration-150 border ${
            isLight
              ? 'bg-white hover:bg-slate-50 border-slate-300 shadow-sm'
              : 'bg-[#0c0e17] hover:bg-[#111422] border-zinc-800/90 shadow-inner'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-1 leading-none">
            <span
              className={`font-mono font-black text-xs tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              DISPARO
            </span>
            <span className={`text-[9px] font-sans font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Sensibilidade
            </span>
          </div>

          {/* Trigger Type Segmented Toggle */}
          <div
            className={`flex p-0.5 rounded-lg border my-0.5 ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#070810] border-zinc-800'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick(950);
                onUpdateDraft({ ...draftSettings, triggerType: 'flow', triggerSensitivity: 2.0 });
              }}
              className={`flex-1 py-0.5 text-[8.5px] font-mono font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-all ${
                draftSettings.triggerType === 'flow'
                  ? isLight
                    ? 'bg-cyan-700 text-white shadow-sm font-black'
                    : 'bg-cyan-500 text-black shadow-sm font-black'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-900 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wind className="w-2.5 h-2.5" />
              <span>FLUXO</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick(950);
                onUpdateDraft({ ...draftSettings, triggerType: 'pressure', triggerSensitivity: 2.0 });
              }}
              className={`flex-1 py-0.5 text-[8.5px] font-mono font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-all ${
                draftSettings.triggerType === 'pressure'
                  ? isLight
                    ? 'bg-cyan-700 text-white shadow-sm font-black'
                    : 'bg-cyan-500 text-black shadow-sm font-black'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-900 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Gauge className="w-2.5 h-2.5" />
              <span>PRESSÃO</span>
            </button>
          </div>

          {/* Steppers & Sensitivity Value */}
          <div className="flex items-center justify-between gap-1 my-0.5">
            <button
              type="button"
              onClick={() => {
                audioEngine.playKnobTick();
                const stepVal = 0.5;
                const nextVal = Math.max(0.5, Number(((draftSettings.triggerSensitivity ?? 2.0) - stepVal).toFixed(1)));
                updateField('triggerSensitivity', nextVal);
              }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center border cursor-pointer active:scale-90 transition-all shrink-0 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300 shadow-sm font-bold'
                  : 'bg-[#191d2d] hover:bg-[#23293f] text-zinc-100 border-zinc-700 font-bold'
              }`}
              title="Diminuir sensibilidade"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
            </button>

            <div className="flex items-baseline justify-center gap-0.5 min-w-0">
              <span className={`text-xl font-mono font-black tabular-nums ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                {(draftSettings.triggerSensitivity ?? 2.0).toFixed(1)}
              </span>
              <span className={`text-[8.5px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
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
              className={`w-7 h-7 rounded-lg flex items-center justify-center border cursor-pointer active:scale-90 transition-all shrink-0 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300 shadow-sm font-bold'
                  : 'bg-[#191d2d] hover:bg-[#23293f] text-zinc-100 border-zinc-700 font-bold'
              }`}
              title="Aumentar sensibilidade"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          {/* Quick Info bar */}
          <div
            className={`flex items-center justify-between text-[8px] font-mono font-bold ${
              isLight ? 'text-slate-600' : 'text-zinc-400'
            }`}
          >
            <span>Faixa</span>
            <span>{draftSettings.triggerType === 'flow' ? '0.5 – 10 L/m' : '0.5 – 5 cm'}</span>
          </div>
        </div>

        {/* 7. Graphical Flow Waveform Tile (VCV & SIMV) with Authentic Waveform Glyphs */}
        {(mode === 'VCV' || mode === 'SIMV_VC') && (
          <div
            className={`flex-1 min-w-[145px] max-w-[185px] shrink-0 rounded-xl p-2 flex flex-col justify-between select-none transition-all duration-150 border ${
              isLight
                ? 'bg-white hover:bg-slate-50 border-slate-300 shadow-sm'
                : 'bg-[#0c0e17] hover:bg-[#111422] border-zinc-800/90 shadow-inner'
            }`}
          >
            <div className="flex items-center justify-between leading-none">
              <span
                className={`font-mono font-black text-xs tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                ONDA DE FLUXO
              </span>
              <span className={`text-[8.5px] font-mono font-bold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                VCV
              </span>
            </div>

            {/* Visual Waveform Selectors with Realistic Clinical Glyphs */}
            <div className="grid grid-cols-2 gap-1.5 my-1">
              {/* Square wave button */}
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick(950);
                  onUpdateDraft({ ...draftSettings, flowWaveform: 'square' });
                }}
                className={`py-1 px-1.5 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${
                  draftSettings.flowWaveform === 'square'
                    ? isLight
                      ? 'bg-cyan-50 border-cyan-600 text-cyan-950 ring-1 ring-cyan-600 shadow-sm'
                      : 'bg-cyan-950/60 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-[#151928] hover:bg-[#1f253d] border-zinc-700 text-zinc-400'
                }`}
              >
                {/* SVG Square Flow Graphic */}
                <svg className="w-8 h-4 my-0.5" viewBox="0 0 40 20" fill="none">
                  <path
                    d="M 2 18 L 8 18 L 8 4 L 32 4 L 32 18 L 38 18"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-[8.5px] font-mono font-bold uppercase">Quadrada</span>
              </button>

              {/* Decelerating Ramp wave button */}
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick(950);
                  onUpdateDraft({ ...draftSettings, flowWaveform: 'decelerating' });
                }}
                className={`py-1 px-1.5 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${
                  draftSettings.flowWaveform === 'decelerating'
                    ? isLight
                      ? 'bg-cyan-50 border-cyan-600 text-cyan-950 ring-1 ring-cyan-600 shadow-sm'
                      : 'bg-cyan-950/60 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-[#151928] hover:bg-[#1f253d] border-zinc-700 text-zinc-400'
                }`}
              >
                {/* SVG Decelerating Flow Graphic */}
                <svg className="w-8 h-4 my-0.5" viewBox="0 0 40 20" fill="none">
                  <path
                    d="M 2 18 L 8 18 L 8 4 L 32 18 L 38 18"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-[8.5px] font-mono font-bold uppercase">Decresc.</span>
              </button>
            </div>

            <span
              className={`text-[8px] font-mono text-center font-bold ${
                isLight ? 'text-slate-600' : 'text-zinc-400'
              }`}
            >
              {draftSettings.flowWaveform === 'square' ? 'Fluxo Constante' : 'Rampa Desacelerada'}
            </span>
          </div>
        )}

        {/* 8. Inspiratory Pause (Pausa Insp %) */}
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

        {/* 9. Expiratory Sensitivity (Esens %) - PSV & CPAP */}
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

        {/* 10. SIMV PS - SIMV_VC */}
        {mode === 'SIMV_VC' && (
          <TouchParamTile
            title="Pressão Suporte"
            acronym="PS"
            field="simvPs"
            value={draftSettings.simvPs ?? 10}
            activeVal={settings.simvPs}
            min={0}
            max={30}
            step={1}
            unit="cmH₂O"
            themeColor="blue"
            onUpdate={updateField}
          />
        )}
      </div>
    </div>
  );
};
