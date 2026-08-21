import React, { useState } from 'react';
import { ClinicalCase, MonitoredData, VentilatorSettings, PatientParameters } from '../types/ventilation';
import { CLINICAL_CASES } from '../data/clinicalCases';
import { audioEngine } from '../services/audioEngine';
import {
  FolderOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Award,
  Sparkles,
  BookOpen,
  Stethoscope,
  Activity,
  X,
} from 'lucide-react';

interface ClinicalCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCase: (selectedCase: ClinicalCase) => void;
  currentMonitored: MonitoredData;
  currentSettings: VentilatorSettings;
  currentPatient: PatientParameters;
}

export const ClinicalCaseModal: React.FC<ClinicalCaseModalProps> = ({
  isOpen,
  onClose,
  onLoadCase,
  currentMonitored,
  currentSettings,
  currentPatient,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(CLINICAL_CASES[0].id);

  if (!isOpen) return null;

  const currentCase = CLINICAL_CASES.find((c) => c.id === selectedCaseId) || CLINICAL_CASES[0];

  // Evaluate goals for selected case against current live simulator state
  const isCurrentActiveCase = currentPatient.name === currentCase.patientProfile.name;
  const goalsStatus = currentCase.goals.map((g) => ({
    goal: g,
    isMet: isCurrentActiveCase ? g.isMet(currentMonitored, currentSettings, currentPatient) : false,
  }));

  const allGoalsMet = isCurrentActiveCase && goalsStatus.every((g) => g.isMet);
  const metCount = goalsStatus.filter((g) => g.isMet).length;

  const handleStartCase = () => {
    audioEngine.playConfirmBeep();
    onLoadCase(currentCase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-[#0a0a0e] border border-zinc-800 rounded-sm w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-sm bg-[#0e1626] border border-cyan-800/80 text-cyan-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-zinc-100 flex items-center gap-2">
                Casos Clínicos & Treinamento Prático
                <span className="text-xs bg-[#0e1626] text-cyan-300 px-2 py-0.5 rounded-sm border border-cyan-800 font-mono">
                  {CLINICAL_CASES.length} Cenários
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Selecione um caso real de UTI, ajuste o ventilador e cumpra as metas terapêuticas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-sm bg-[#161720] hover:bg-[#222432] text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
          {/* Left Cases List */}
          <div className="p-3 overflow-y-auto space-y-2 max-h-[75vh]">
            <span className="text-[11px] font-display font-bold text-zinc-400 uppercase tracking-wider block px-1">
              Lista de Cenários
            </span>

            {CLINICAL_CASES.map((c) => {
              const isSelected = c.id === selectedCaseId;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`p-3 rounded-sm border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#0e1626] border-cyan-500 shadow-md text-white'
                      : 'bg-[#0e0f14] border-zinc-800/80 hover:bg-[#151620] text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#070709] border border-zinc-800 text-cyan-400 font-bold">
                      {c.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        c.difficulty === 'Iniciante'
                          ? 'text-emerald-400'
                          : c.difficulty === 'Intermediário'
                          ? 'text-amber-400'
                          : 'text-purple-400'
                      }`}
                    >
                      {c.difficulty}
                    </span>
                  </div>
                  <h3 className="text-xs font-display font-bold leading-snug">{c.title}</h3>
                </div>
              );
            })}
          </div>

          {/* Right Case Details & Live Goals */}
          <div className="p-4 md:col-span-2 overflow-y-auto space-y-4 max-h-[75vh]">
            {/* Title & Badge */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                  {currentCase.category} • Nível {currentCase.difficulty}
                </span>
                <h3 className="text-lg font-display font-black text-zinc-100 mt-0.5">{currentCase.title}</h3>
              </div>

              <button
                onClick={handleStartCase}
                className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-display font-bold text-xs shadow-md shadow-cyan-950 cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Carregar no Simulador</span>
              </button>
            </div>

            {/* Patient Clinical History & Physical Exam */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center gap-1 text-zinc-400 font-display font-bold">
                  <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
                  <span>História Clínica</span>
                </div>
                <p className="text-zinc-300 leading-relaxed font-sans">{currentCase.clinicalHistory}</p>
              </div>

              <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center gap-1 text-zinc-400 font-display font-bold">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exame Físico & Dados</span>
                </div>
                <p className="text-zinc-300 leading-relaxed font-sans">{currentCase.physicalExam}</p>
              </div>
            </div>

            {/* Initial Blood Gas Report */}
            <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-2">
              <span className="text-xs font-display font-bold text-zinc-400 uppercase block">
                Gasometria Arterial de Admissão
              </span>
              <div className="grid grid-cols-6 gap-2 text-center text-xs font-mono">
                <div className="bg-[#070709] p-1.5 rounded-sm border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">pH</span>
                  <span className="font-bold text-zinc-100">{currentCase.initialABG.ph.toFixed(2)}</span>
                </div>
                <div className="bg-[#070709] p-1.5 rounded-sm border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">PaCO₂</span>
                  <span className="font-bold text-zinc-100">{currentCase.initialABG.paco2}</span>
                </div>
                <div className="bg-[#070709] p-1.5 rounded-sm border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">PaO₂</span>
                  <span className="font-bold text-zinc-100">{currentCase.initialABG.pao2}</span>
                </div>
                <div className="bg-[#070709] p-1.5 rounded-sm border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">HCO₃</span>
                  <span className="font-bold text-zinc-100">{currentCase.initialABG.hco3}</span>
                </div>
                <div className="bg-[#070709] p-1.5 rounded-sm border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">SpO₂</span>
                  <span className="font-bold text-rose-400">{currentCase.initialABG.spo2}%</span>
                </div>
                <div className="bg-[#070709] p-1.5 rounded-sm border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">FiO₂</span>
                  <span className="font-bold text-cyan-400">{currentCase.initialABG.fio2}%</span>
                </div>
              </div>
            </div>

            {/* Checklist of Therapeutic Goals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-zinc-300 uppercase tracking-wider">
                  Metas Terapêuticas do Cenário ({metCount}/{currentCase.goals.length} atingidas)
                </span>
                {allGoalsMet && (
                  <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-sm border border-emerald-800">
                    <Award className="w-3.5 h-3.5" /> Cenário Concluído com Sucesso!
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {goalsStatus.map(({ goal, isMet }) => (
                  <div
                    key={goal.id}
                    className={`p-3 rounded-sm border flex items-start gap-2.5 transition-all ${
                      isMet
                        ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                        : 'bg-[#0e0f14] border-zinc-800 text-zinc-300'
                    }`}
                  >
                    {isMet ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold font-sans">{goal.description}</p>
                      <p className="text-[11px] opacity-75 font-mono">{goal.targetFeedback}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Teaching Points */}
            <div className="bg-[#140f1e] p-3 rounded-sm border border-purple-800/40 space-y-1.5 text-xs text-purple-200">
              <div className="flex items-center gap-1 font-display font-bold text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Pontos Didáticos & Evidência Científica</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] opacity-90 font-sans">
                {currentCase.teachingPoints.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
