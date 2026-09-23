import React, { useState, useEffect } from 'react';
import { ClinicalCase, MonitoredData, VentilatorSettings, PatientParameters } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../context/ThemeContext';
import { educationalStorage } from '../services/educationalStorage';
import {
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Play,
  Award,
  Sparkles,
  Stethoscope,
  Activity,
  X,
  Target,
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
  const { isLight } = useTheme();
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const allCases = educationalStorage.getAllClinicalCases();
      setCases(allCases);
      if (allCases.length > 0) {
        setSelectedCaseId((prev) => (allCases.find((c) => c.id === prev) ? prev : allCases[0].id));
      }
    }
  }, [isOpen]);

  if (!isOpen || cases.length === 0) return null;

  const currentCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  // Evaluate goals for selected case against current live simulator state
  const isCurrentActiveCase = currentPatient.name === currentCase.patientProfile.name;
  const goalsStatus = currentCase.goals.map((g) => ({
    goal: g,
    isMet: isCurrentActiveCase && typeof g.isMet === 'function' ? g.isMet(currentMonitored, currentSettings, currentPatient) : false,
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
      <div className={`border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0e] border-zinc-800 text-zinc-100'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-[#0e1626] border-cyan-800/80 text-cyan-400'
            }`}>
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-display font-bold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-zinc-100'
              }`}>
                Casos Clínicos & Treinamento Prático
                <span className={`text-xs px-2 py-0.5 rounded-md font-mono border ${
                  isLight ? 'bg-cyan-100 border-cyan-300 text-cyan-800' : 'bg-[#0e1626] text-cyan-300 border-cyan-800'
                }`}>
                  {cases.length} Cenários
                </span>
              </h2>
              <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Diagnostique a mecânica respiratória, raciocine a fisiologia e cumpra as metas terapêuticas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-all cursor-pointer border ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200' : 'bg-[#161720] hover:bg-[#222432] text-zinc-400 hover:text-white border-zinc-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className={`flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x ${
          isLight ? 'divide-slate-200' : 'divide-zinc-800'
        }`}>
          {/* Left Cases List */}
          <div className="p-3 overflow-y-auto space-y-2 max-h-[75vh]">
            <span className={`text-[11px] font-display font-bold uppercase tracking-wider block px-1 ${
              isLight ? 'text-slate-500' : 'text-zinc-400'
            }`}>
              Lista de Cenários
            </span>

            {cases.map((c) => {
              const isSelected = c.id === selectedCaseId;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? isLight
                        ? 'bg-cyan-50 border-cyan-500 shadow-sm text-cyan-950 font-bold'
                        : 'bg-[#0e1626] border-cyan-500 shadow-md text-white'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      : 'bg-[#0e0f14] border-zinc-800/80 hover:bg-[#151620] text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border font-bold ${
                      isLight ? 'bg-white border-slate-300 text-cyan-800' : 'bg-[#070709] border-zinc-800 text-cyan-400'
                    }`}>
                      {c.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        c.difficulty === 'Iniciante'
                          ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                          : c.difficulty === 'Intermediário'
                          ? isLight ? 'text-amber-700' : 'text-amber-400'
                          : isLight ? 'text-purple-700' : 'text-purple-400'
                      }`}
                    >
                      {c.difficulty}
                    </span>
                  </div>
                  <h3 className="text-xs font-display leading-snug">{c.title}</h3>
                </div>
              );
            })}
          </div>

          {/* Right Case Details & Live Goals */}
          <div className="p-4 md:col-span-2 overflow-y-auto space-y-4 max-h-[75vh]">
            {/* Title & Badge */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className={`text-xs font-mono font-bold uppercase ${
                  isLight ? 'text-cyan-700' : 'text-cyan-400'
                }`}>
                  {currentCase.category} • Nível {currentCase.difficulty}
                </span>
                <h3 className={`text-lg font-display font-black mt-0.5 ${
                  isLight ? 'text-slate-900' : 'text-zinc-100'
                }`}>
                  {currentCase.title}
                </h3>
              </div>

              <button
                onClick={handleStartCase}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-display font-bold text-xs shadow-md cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Carregar no Simulador</span>
              </button>
            </div>

            {/* Patient Clinical History & Physical Exam */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
              }`}>
                <div className={`flex items-center gap-1 font-display font-bold ${
                  isLight ? 'text-slate-700' : 'text-zinc-400'
                }`}>
                  <Stethoscope className="w-3.5 h-3.5 text-cyan-500" />
                  <span>História Clínica</span>
                </div>
                <p className={`leading-relaxed font-sans ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                  {currentCase.clinicalHistory}
                </p>
              </div>

              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
              }`}>
                <div className={`flex items-center gap-1 font-display font-bold ${
                  isLight ? 'text-slate-700' : 'text-zinc-400'
                }`}>
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Exame Físico & Dados</span>
                </div>
                <p className={`leading-relaxed font-sans ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                  {currentCase.physicalExam}
                </p>
              </div>
            </div>

            {/* Initial Blood Gas Report */}
            {currentCase.initialGasometry && (
              <div className={`p-3 rounded-xl border space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
              }`}>
                <span className={`text-xs font-display font-bold uppercase block ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  Gasometria Arterial de Admissão
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
                  <div className={`p-1.5 rounded-lg border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#070709] border-zinc-800'
                  }`}>
                    <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>pH</span>
                    <span className="font-bold text-rose-500">{currentCase.initialGasometry.ph}</span>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#070709] border-zinc-800'
                  }`}>
                    <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>PaCO₂</span>
                    <span className="font-bold text-cyan-600">{currentCase.initialGasometry.paco2}</span>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#070709] border-zinc-800'
                  }`}>
                    <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>PaO₂</span>
                    <span className="font-bold text-amber-600">{currentCase.initialGasometry.pao2}</span>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#070709] border-zinc-800'
                  }`}>
                    <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>HCO₃⁻</span>
                    <span className="font-bold text-emerald-600">{currentCase.initialGasometry.hco3}</span>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#070709] border-zinc-800'
                  }`}>
                    <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>BE</span>
                    <span className="font-bold text-purple-600">{currentCase.initialGasometry.be}</span>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#070709] border-zinc-800'
                  }`}>
                    <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>SpO₂</span>
                    <span className="font-bold text-indigo-600">{currentCase.initialGasometry.sao2}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Checklist of Therapeutic Goals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-display font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isLight ? 'text-slate-800' : 'text-zinc-300'
                }`}>
                  <Target className="w-4 h-4 text-cyan-500" />
                  Metas Terapêuticas do Cenário ({metCount}/{currentCase.goals.length} atingidas)
                </span>
                {allGoalsMet && (
                  <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <Award className="w-3.5 h-3.5" /> Cenário Concluído com Sucesso!
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {goalsStatus.map(({ goal, isMet }) => (
                  <div
                    key={goal.id}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                      isMet
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                          : 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-[#0e0f14] border-zinc-800 text-zinc-300'
                    }`}
                  >
                    {isMet ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                    )}
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold font-sans">{goal.description}</p>
                      <p className={`text-[11px] font-mono ${
                        isMet
                          ? isLight ? 'text-emerald-800' : 'text-emerald-400'
                          : isLight ? 'text-slate-500' : 'text-zinc-400'
                      }`}>
                        {goal.targetFeedback}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Teaching Points */}
            <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
              isLight
                ? 'bg-purple-50 border-purple-200 text-purple-950'
                : 'bg-[#140f1e] border-purple-800/40 text-purple-200'
            }`}>
              <div className={`flex items-center gap-1 font-display font-bold ${
                isLight ? 'text-purple-800' : 'text-purple-300'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
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
