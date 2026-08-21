import React, { useState } from 'react';
import { PatientParameters } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import { Sliders, RotateCcw } from 'lucide-react';

interface LungConfigCardProps {
  patient: PatientParameters;
  onUpdatePatient: (patient: PatientParameters) => void;
}

export const LungConfigCard: React.FC<LungConfigCardProps> = ({
  patient,
  onUpdatePatient,
}) => {
  const [advancedMode, setAdvancedMode] = useState<boolean>(true);

  const updatePatientField = <K extends keyof PatientParameters>(field: K, value: PatientParameters[K]) => {
    audioEngine.playClick(900);
    onUpdatePatient({ ...patient, [field]: value });
  };

  const handleReset = () => {
    audioEngine.playClick(600);
    onUpdatePatient({
      ...patient,
      compliance: 50,
      resistance: 6,
      secretionsSeverity: 'none',
    });
  };

  return (
    <div className="bg-[#0a0a0e] rounded-xl border border-zinc-800/90 shadow-xl overflow-hidden flex flex-col h-full select-none">
      <div className="p-2.5 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-display font-bold text-purple-400 uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5" />
          <span>CONFIGURAÇÃO PULMONAR</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-400">MODO AVANÇADO</span>
          <button
            onClick={() => {
              audioEngine.playClick(900);
              setAdvancedMode(!advancedMode);
            }}
            className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
              advancedMode ? 'bg-cyan-500' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                advancedMode ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-3">
          {/* Complacência (Cst) */}
          <div className="bg-[#0e0f14] rounded-lg p-2.5 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono font-bold text-purple-300">COMPLACÊNCIA (CST)</span>
              <span className="text-xs font-mono font-bold text-white">{patient.compliance} <span className="text-[9px] text-zinc-500">mL/cmH₂O</span></span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              step={2}
              value={patient.compliance}
              onChange={(e) => updatePatientField('compliance', Number(e.target.value))}
              className="w-full accent-purple-400 h-1.5 bg-[#1a1b24] rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Resistência (Raw) */}
          <div className="bg-[#0e0f14] rounded-lg p-2.5 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono font-bold text-purple-300">RESISTÊNCIA (RAW)</span>
              <span className="text-xs font-mono font-bold text-white">{patient.resistance} <span className="text-[9px] text-zinc-500">cmH₂O/L/s</span></span>
            </div>
            <input
              type="range"
              min={2}
              max={40}
              step={1}
              value={patient.resistance}
              onChange={(e) => updatePatientField('resistance', Number(e.target.value))}
              className="w-full accent-purple-400 h-1.5 bg-[#1a1b24] rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Auto-PEEP */}
          <div className="bg-[#0e0f14] rounded-lg p-2.5 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono font-bold text-amber-300">AUTO-PEEP</span>
              <span className="text-xs font-mono font-bold text-white">0 <span className="text-[9px] text-zinc-500">cmH₂O</span></span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={0}
              disabled
              className="w-full accent-amber-400 h-1.5 bg-[#1a1b24] rounded-lg appearance-none opacity-50 cursor-not-allowed"
            />
          </div>

          {/* Drive Respiratório */}
          <div className="bg-[#0e0f14] rounded-lg p-2.5 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono font-bold text-emerald-300">DRIVE RESPIRATÓRIO</span>
              <span className="text-xs font-mono font-bold text-white">50 <span className="text-[9px] text-zinc-500">%</span></span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={50}
              onChange={() => {}}
              className="w-full accent-emerald-400 h-1.5 bg-[#1a1b24] rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161824] hover:bg-[#202334] text-zinc-300 font-mono text-xs border border-zinc-700/60 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>RESTAURAR PADRÃO</span>
          </button>
        </div>
      </div>
    </div>
  );
};
