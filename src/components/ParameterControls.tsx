import React, { useState, useRef } from 'react';
import { VentilatorSettings, VentilationMode } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import { Sliders, Plus, Minus, Check } from 'lucide-react';

interface ParameterControlsProps {
  settings: VentilatorSettings;
  draftSettings: VentilatorSettings;
  onUpdateDraft: (newDraft: VentilatorSettings) => void;
  hasChanges: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
}

interface RotaryKnobItemProps {
  label: string;
  field: keyof VentilatorSettings;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color?: string;
  onUpdate: (field: keyof VentilatorSettings, val: number) => void;
}

const RotaryKnobItem: React.FC<RotaryKnobItemProps> = ({
  label,
  field,
  value,
  min,
  max,
  step,
  unit,
  color = 'text-cyan-400',
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempInputVal, setTempInputVal] = useState((value ?? min).toString());

  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(value ?? min);

  React.useEffect(() => {
    if (!isEditing) {
      setTempInputVal((value ?? min).toString());
    }
  }, [value, isEditing, min]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startVal.current = value ?? min;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaY = startY.current - moveEvent.clientY;
      const range = max - min;
      const deltaVal = (deltaY / 150) * range;
      let newVal = Math.round((startVal.current + deltaVal) / step) * step;
      newVal = Math.max(min, Math.min(max, newVal));
      onUpdate(field, Number(newVal.toFixed(2)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const safeVal = value ?? min;
  const percentage = Math.max(0, Math.min(100, ((safeVal - min) / (max - min)) * 100));
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-[#0e0f14] hover:bg-[#151722] rounded-xl p-3 border border-zinc-800/80 transition-all flex items-center justify-between group shadow-sm select-none">
      <div className="flex flex-col">
        <span className="text-[10px] font-display font-bold text-cyan-400 uppercase tracking-wider">
          {label} <span className="text-zinc-500">{unit}</span>
        </span>
        {isEditing ? (
          <div className="flex items-center gap-1 mt-1">
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
              className="w-20 bg-[#05060a] border border-cyan-500 text-white font-mono text-lg px-2 py-0.5 rounded outline-none"
            />
          </div>
        ) : (
          <span
            onClick={() => {
              setTempInputVal((value ?? min).toString());
              setIsEditing(true);
            }}
            className="text-2xl font-bold font-mono text-white mt-0.5 group-hover:text-cyan-300 transition-colors cursor-pointer"
            title="Clique para digitar valor exato"
          >
            {typeof safeVal === 'number' ? (safeVal % 1 !== 0 ? safeVal.toFixed(1) : safeVal) : safeVal}
          </span>
        )}
        <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
          {min} — {max} {unit}
        </span>
      </div>

      {/* Rotary Dial & Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const newVal = Math.max(min, Number((safeVal - step).toFixed(2)));
            onUpdate(field, newVal);
          }}
          className="w-7 h-7 rounded-lg bg-[#161824] hover:bg-[#222536] text-zinc-300 flex items-center justify-center cursor-pointer border border-zinc-700/60 active:scale-95 transition-transform"
          title="Diminuir"
        >
          <Minus className="w-3.5 h-3.5 pointer-events-none" />
        </button>

        <div
          onMouseDown={handleMouseDown}
          className="relative w-12 h-12 flex items-center justify-center cursor-grab active:cursor-grabbing group/knob"
          title="Arraste para cima/baixo para girar"
        >
          <svg className="w-12 h-12 transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r={radius}
              stroke="currentColor"
              strokeWidth="3.5"
              className="text-zinc-800"
              fill="transparent"
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              stroke="currentColor"
              strokeWidth="3.5"
              className={color}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-[#1c1f2e] border border-zinc-700 shadow-md flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const newVal = Math.min(max, Number((safeVal + step).toFixed(2)));
            onUpdate(field, newVal);
          }}
          className="w-7 h-7 rounded-lg bg-[#161824] hover:bg-[#222536] text-zinc-300 flex items-center justify-center cursor-pointer border border-zinc-700/60 active:scale-95 transition-transform"
          title="Aumentar"
        >
          <Plus className="w-3.5 h-3.5 pointer-events-none" />
        </button>
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
  const updateField = (field: keyof VentilatorSettings, val: number) => {
    audioEngine.playClick(900);
    onUpdateDraft({ ...draftSettings, [field]: val });
  };

  const updateMode = (mode: VentilationMode) => {
    audioEngine.playClick(1000);
    const updated = { ...draftSettings, mode };
    if (mode === 'PCV') {
      updated.inspiratoryPressure = updated.inspiratoryPressure || 15;
    } else if (mode === 'PSV') {
      updated.pressureSupport = updated.pressureSupport || 10;
    } else if (mode === 'SIMV_VC') {
      updated.simvRate = updated.simvRate || 8;
      updated.simvPs = updated.simvPs || 10;
      updated.inspiratoryPausePercent = updated.inspiratoryPausePercent ?? 10;
    } else if (mode === 'CPAP') {
      updated.pressureSupport = updated.pressureSupport || 5;
    } else if (mode === 'VCV') {
      updated.inspiratoryPausePercent = updated.inspiratoryPausePercent ?? 10;
    }
    onUpdateDraft(updated);
  };

  const modes: { label: string; value: VentilationMode }[] = [
    { label: 'VCV', value: 'VCV' },
    { label: 'PCV', value: 'PCV' },
    { label: 'PSV', value: 'PSV' },
    { label: 'SIMV-VC', value: 'SIMV_VC' },
    { label: 'CPAP', value: 'CPAP' },
  ];

  const mode = draftSettings.mode;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0e] rounded-2xl border border-zinc-800/90 shadow-2xl overflow-hidden select-none relative">
      {/* Header */}
      <div className="p-3 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-display font-bold text-cyan-400 uppercase tracking-wider">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>CONTROLES E MODO ({mode})</span>
        </div>
        {hasChanges && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-600/60 animate-pulse font-bold">
            Modificado
          </span>
        )}
      </div>

      {/* Mode Selector */}
      <div className="p-3 bg-[#0c0d12] border-b border-zinc-800/80">
        <span className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
          Modo Ventilatório
        </span>
        <div className="grid grid-cols-5 gap-1">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => updateMode(m.value)}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer border ${
                draftSettings.mode === m.value
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                  : 'bg-[#151722] text-zinc-400 border-zinc-800 hover:bg-[#1f2333] hover:text-zinc-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls List Dynamic per Mode */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {(mode === 'VCV' || mode === 'SIMV_VC') && (
          <RotaryKnobItem
            label="Volume Corrente (VT)"
            field="tidalVolume"
            value={draftSettings.tidalVolume}
            min={100}
            max={1000}
            step={25}
            unit="mL"
            color="text-cyan-400"
            onUpdate={updateField}
          />
        )}

        {mode === 'PCV' && (
          <RotaryKnobItem
            label="Pressão Inspiratória (Pinsp)"
            field="inspiratoryPressure"
            value={draftSettings.inspiratoryPressure ?? 15}
            min={5}
            max={40}
            step={1}
            unit="cmH₂O"
            color="text-cyan-400"
            onUpdate={updateField}
          />
        )}

        {(mode === 'PSV' || mode === 'CPAP') && (
          <RotaryKnobItem
            label="Pressão de Suporte (PS)"
            field="pressureSupport"
            value={draftSettings.pressureSupport ?? 10}
            min={0}
            max={30}
            step={1}
            unit="cmH₂O"
            color="text-cyan-400"
            onUpdate={updateField}
          />
        )}

        {mode === 'SIMV_VC' && (
          <RotaryKnobItem
            label="Frequência SIMV"
            field="simvRate"
            value={draftSettings.simvRate ?? 8}
            min={2}
            max={30}
            step={1}
            unit="rpm"
            color="text-emerald-400"
            onUpdate={updateField}
          />
        )}

        {mode === 'SIMV_VC' && (
          <RotaryKnobItem
            label="PS p/ Resp. Espontânea"
            field="simvPs"
            value={draftSettings.simvPs ?? 10}
            min={0}
            max={30}
            step={1}
            unit="cmH₂O"
            color="text-blue-400"
            onUpdate={updateField}
          />
        )}

        {mode !== 'PSV' && mode !== 'CPAP' && mode !== 'SIMV_VC' && (
          <RotaryKnobItem
            label="Frequência Respiratória"
            field="respiratoryRate"
            value={draftSettings.respiratoryRate}
            min={5}
            max={40}
            step={1}
            unit="rpm"
            color="text-emerald-400"
            onUpdate={updateField}
          />
        )}

        <RotaryKnobItem
          label="PEEP"
          field="peep"
          value={draftSettings.peep}
          min={0}
          max={20}
          step={1}
          unit="cmH₂O"
          color="text-cyan-400"
          onUpdate={updateField}
        />

        <RotaryKnobItem
          label="FiO₂"
          field="fio2"
          value={draftSettings.fio2}
          min={21}
          max={100}
          step={5}
          unit="%"
          color="text-amber-400"
          onUpdate={updateField}
        />

        {mode !== 'PSV' && mode !== 'CPAP' && (
          <RotaryKnobItem
            label="Tempo Inspiratório (Ti)"
            field="inspiratoryTimePCV"
            value={draftSettings.inspiratoryTimePCV}
            min={0.5}
            max={3.0}
            step={0.1}
            unit="s"
            color="text-purple-400"
            onUpdate={updateField}
          />
        )}

        {(mode === 'VCV' || mode === 'SIMV_VC') && (
          <RotaryKnobItem
            label="Pausa Inspiratória"
            field="inspiratoryPausePercent"
            value={draftSettings.inspiratoryPausePercent ?? 10}
            min={0}
            max={30}
            step={5}
            unit="%"
            color="text-indigo-400"
            onUpdate={updateField}
          />
        )}

        {/* Trigger / Sensibilidade (Disparo do Paciente) */}
        <div className="bg-[#12141c] p-2.5 rounded-xl border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider">
              Disparo (Trigger)
            </span>
            <div className="flex bg-[#0c0d12] p-0.5 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick(950);
                  onUpdateDraft({ ...draftSettings, triggerType: 'flow', triggerSensitivity: 2.0 });
                }}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                  draftSettings.triggerType === 'flow'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Fluxo (V̇)
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick(950);
                  onUpdateDraft({ ...draftSettings, triggerType: 'pressure', triggerSensitivity: 2.0 });
                }}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                  draftSettings.triggerType === 'pressure'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Pressão (P)
              </button>
            </div>
          </div>

          <RotaryKnobItem
            label={draftSettings.triggerType === 'flow' ? 'Sensibilidade a Fluxo' : 'Sensibilidade a Pressão'}
            field="triggerSensitivity"
            value={draftSettings.triggerSensitivity ?? 2.0}
            min={0.5}
            max={draftSettings.triggerType === 'flow' ? 10.0 : 5.0}
            step={0.5}
            unit={draftSettings.triggerType === 'flow' ? 'L/min' : 'cmH₂O'}
            color="text-amber-400"
            onUpdate={updateField}
          />
        </div>

        {(mode === 'PSV' || mode === 'CPAP') && (
          <RotaryKnobItem
            label="Ciclagem Expiratória (Esens)"
            field="expiratorySensitivity"
            value={draftSettings.expiratorySensitivity ?? 25}
            min={10}
            max={70}
            step={5}
            unit="%"
            color="text-teal-400"
            onUpdate={updateField}
          />
        )}
      </div>

      {/* Confirmation Footer when changes pending */}
      {hasChanges && (
        <div className="p-3 bg-[#131118] border-t border-amber-500/50 flex items-center gap-2 animate-fadeIn">
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>CONFIRMAR AJUSTES</span>
          </button>
          <button
            onClick={onDiscard}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs transition-all cursor-pointer"
          >
            Descartar
          </button>
        </div>
      )}
    </div>
  );
};
