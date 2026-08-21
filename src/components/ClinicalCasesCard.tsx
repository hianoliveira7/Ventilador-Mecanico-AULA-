import React from 'react';
import { ClinicalCase, PatientParameters, MonitoredData, VentilatorSettings } from '../types/ventilation';
import { CLINICAL_CASES } from '../data/clinicalCases';
import { audioEngine } from '../services/audioEngine';
import { Stethoscope, CheckCircle2 } from 'lucide-react';

interface ClinicalCasesCardProps {
  currentPatient: PatientParameters;
  onLoadCase: (clinicalCase: ClinicalCase) => void;
  onOpenManageCases: () => void;
}

export const ClinicalCasesCard: React.FC<ClinicalCasesCardProps> = ({
  currentPatient,
  onLoadCase,
  onOpenManageCases,
}) => {
  return (
    <div className="bg-[#0a0a0e] rounded-xl border border-zinc-800/90 shadow-xl overflow-hidden flex flex-col mt-2 select-none">
      <div className="p-2.5 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-display font-bold text-cyan-400 uppercase tracking-wider">
          <Stethoscope className="w-3.5 h-3.5" />
          <span>CASOS CLÍNICOS</span>
        </div>
      </div>

      <div className="p-2 space-y-1.5 max-h-[220px] overflow-y-auto">
        {CLINICAL_CASES.slice(0, 6).map((c) => {
          const isActive = currentPatient.name.toLowerCase().includes(c.title.toLowerCase().split(' ')[0]) ||
                           currentPatient.name === c.patientProfile.name;
          return (
            <div
              key={c.id}
              onClick={() => {
                audioEngine.playConfirmBeep();
                onLoadCase(c);
              }}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg border cursor-pointer transition-all ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 shadow-sm'
                  : 'bg-[#101118] border-zinc-800/70 hover:bg-[#161824] text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}`} />
                <span className="text-xs font-display font-bold truncate max-w-[160px]">{c.title}</span>
              </div>
              {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            </div>
          );
        })}
      </div>

      <div className="p-2 bg-[#0e0f14] border-t border-zinc-800">
        <button
          onClick={() => {
            audioEngine.playClick(900);
            onOpenManageCases();
          }}
          className="w-full py-1.5 rounded-lg bg-[#161824] hover:bg-[#202334] text-zinc-300 font-mono font-bold text-[11px] border border-zinc-700/60 transition-all cursor-pointer text-center"
        >
          GERENCIAR CASOS
        </button>
      </div>
    </div>
  );
};
