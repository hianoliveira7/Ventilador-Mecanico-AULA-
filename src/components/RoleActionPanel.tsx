import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import { localDatabase } from '../services/localDatabase';
import { PatientParameters, VentilatorSettings, MonitoredData } from '../types/ventilation';
import {
  Stethoscope,
  Wind,
  Droplet,
  Syringe,
  Activity,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Maximize2,
  RotateCcw,
  Sliders,
  ChevronRight,
  Sparkles,
  Heart,
  Users,
} from 'lucide-react';

export type TeamRole = 'Fisioterapeuta Respiratório' | 'Médico Intensivista' | 'Enfermeiro(a) UTI' | 'Todos';

interface RoleActionPanelProps {
  teamRole: TeamRole;
  patient: PatientParameters;
  settings: VentilatorSettings;
  monitored: MonitoredData;
  onUpdatePatient: (updated: Partial<PatientParameters>) => void;
  onUpdateSettings: (updated: Partial<VentilatorSettings>) => void;
  roomCode?: string;
  teamName?: string;
  isLight?: boolean;
}

export const RoleActionPanel: React.FC<RoleActionPanelProps> = ({
  teamRole,
  patient,
  settings,
  monitored,
  onUpdatePatient,
  onUpdateSettings,
  roomCode,
  teamName,
  isLight = false,
}) => {
  const [activeTab, setActiveTab] = useState<'role_actions' | 'interprofessional_status'>('role_actions');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Doctor Controls State
  const [rassLevel, setRassLevel] = useState<number>(patient.spontaneousDrive ? 0 : -4);
  const [isNmbActive, setIsNmbActive] = useState<boolean>(!patient.spontaneousDrive);

  // Nurse Controls State
  const [isProned, setIsProned] = useState<boolean>(false);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const canEditPhysio = teamRole === 'Fisioterapeuta Respiratório' || teamRole === 'Todos';
  const canEditDoctor = teamRole === 'Médico Intensivista' || teamRole === 'Todos';
  const canEditNurse = teamRole === 'Enfermeiro(a) UTI' || teamRole === 'Todos';

  const syncStateToCloud = async (patientUpdates: Partial<PatientParameters>, settingsUpdates?: Partial<VentilatorSettings>) => {
    if (roomCode) {
      if (settingsUpdates && !canEditPhysio) {
        console.warn(`[Kahoot Collab] ⛔ RoleActionPanel blocked ventilator settings push by unauthorized role "${teamRole}".`);
      }
      const stateToPublish: Record<string, any> = {
        patient: { ...patient, ...patientUpdates },
      };
      if (settingsUpdates && canEditPhysio) {
        stateToPublish.settings = { ...settings, ...settingsUpdates };
      }
      await localDatabase.publishRoomState(roomCode, stateToPublish, teamName, {
        role: teamRole,
        actionType: 'role_action',
      });
    }
  };

  // 🩺 DOCTOR ACTIONS
  const handleApplySedationRASS = async (newRass: number) => {
    if (!canEditDoctor) {
      audioEngine.playClick(600);
      showFeedback(`🔒 Competência Exclusiva: Sua função é ${teamRole}. Apenas o Médico Intensivista pode prescrever sedação (RASS).`);
      return;
    }
    setRassLevel(newRass);
    audioEngine.playConfirmBeep();

    const isDeepSedation = newRass <= -3;
    const patientUpdates: Partial<PatientParameters> = {
      spontaneousDrive: !isDeepSedation && !isNmbActive,
      spontaneousRate: isDeepSedation || isNmbActive ? 0 : 16,
      spontaneousEffortPressure: isDeepSedation || isNmbActive ? 0 : -6,
    };

    onUpdatePatient(patientUpdates);
    await syncStateToCloud(patientUpdates);

    showFeedback(
      isDeepSedation
        ? `Sedação profunda aplicada (RASS ${newRass}): Drive espontâneo desativado, assincronia eliminada!`
        : `Nível de sedação ajustado (RASS ${newRass}): Respiração espontânea ativa.`
    );
  };

  const handleToggleNMB = async () => {
    if (!canEditDoctor) {
      audioEngine.playClick(600);
      showFeedback(`🔒 Competência Exclusiva: Sua função é ${teamRole}. Apenas o Médico Intensivista pode prescrever Bloqueador Neuromuscular (Cisatracúrio).`);
      return;
    }
    const nextState = !isNmbActive;
    setIsNmbActive(nextState);
    audioEngine.playConfirmBeep();

    const patientUpdates: Partial<PatientParameters> = {
      spontaneousDrive: !nextState && rassLevel > -3,
      spontaneousRate: nextState ? 0 : 18,
      spontaneousEffortPressure: nextState ? 0 : -6,
    };

    onUpdatePatient(patientUpdates);
    await syncStateToCloud(patientUpdates);

    showFeedback(
      nextState
        ? '⚡ Bloqueio Neuromuscular (Cisatracúrio) iniciado: Paralisia muscular completa, complacência estabilizada.'
        : 'Bloqueio Neuromuscular suspenso: Drive espontâneo restaurado conforme sedação.'
    );
  };

  const handleApplyBronchodilator = async () => {
    if (!canEditDoctor) {
      audioEngine.playClick(600);
      showFeedback(`🔒 Competência Exclusiva: Sua função é ${teamRole}. Apenas o Médico Intensivista pode prescrever Broncodilatadores.`);
      return;
    }
    audioEngine.playConfirmBeep();
    const newResistance = Math.max(6, Math.round(patient.resistance * 0.55));
    const patientUpdates: Partial<PatientParameters> = {
      resistance: newResistance,
    };

    onUpdatePatient(patientUpdates);
    await syncStateToCloud(patientUpdates);

    showFeedback(`💊 Broncodilatador Inalatório (Salbutamol 10 gotas) administrado! Resistência caiu de ${patient.resistance} para ${newResistance} cmH₂O/(L/s).`);
  };

  const handleDrainPneumothorax = async () => {
    if (!canEditDoctor) {
      audioEngine.playClick(600);
      showFeedback(`🔒 Competência Exclusiva: Sua função é ${teamRole}. Apenas o Médico Intensivista pode realizar Drenagem Torácica.`);
      return;
    }
    audioEngine.playConfirmBeep();
    const newCompliance = Math.min(50, Math.max(35, patient.compliance + 25));
    const newResistance = Math.max(6, patient.resistance - 6);
    const patientUpdates: Partial<PatientParameters> = {
      compliance: newCompliance,
      resistance: newResistance,
    };

    onUpdatePatient(patientUpdates);
    await syncStateToCloud(patientUpdates);

    showFeedback(`🫁 Drenagem de Tórax realizada com sucesso! Expansibilidade pulmonar restaurada, Complacência elevou para ${newCompliance} mL/cmH₂O.`);
  };

  // 💊 NURSE ACTIONS
  const handlePerformSuction = async () => {
    if (!canEditNurse) {
      audioEngine.playClick(600);
      showFeedback(`🔒 Competência Exclusiva: Sua função é ${teamRole}. Apenas a Enfermagem UTI pode realizar Aspiração Traqueal.`);
      return;
    }
    audioEngine.playConfirmBeep();
    const newResistance = Math.max(6, Math.round(patient.resistance * 0.7));
    const patientUpdates: Partial<PatientParameters> = {
      secretionsSeverity: 'none',
      resistance: newResistance,
    };

    onUpdatePatient(patientUpdates);
    await syncStateToCloud(patientUpdates);

    showFeedback(`💦 Aspiração endotraqueal concluída! Vias aéreas desobstruídas, dente de serra eliminado e Raw reduzida para ${newResistance} cmH₂O/(L/s).`);
  };

  const handleFixCuffLeak = async () => {
    if (!canEditNurse) {
      audioEngine.playClick(600);
      showFeedback(`🔒 Competência Exclusiva: Sua função é ${teamRole}. Apenas a Enfermagem UTI pode ajustar o Cuff do Tubo.`);
      return;
    }
    audioEngine.playConfirmBeep();
    const patientUpdates: Partial<PatientParameters> = {
      circuitLeakPercent: 0,
    };

    onUpdatePatient(patientUpdates);
    await syncStateToCloud(patientUpdates);

    showFeedback('🔌 Pressão do Cuff do TOT ajustada para 25 cmH₂O! Selamento completo do circuito, fuga de ar zerada.');
  };

  const handleTogglePronePosition = async () => {
    if (!canEditNurse) {
      audioEngine.playClick(600);
      showFeedback(`🔒 Competência Exclusiva: Sua função é ${teamRole}. Apenas a Enfermagem UTI pode manobrar a Posição Prona.`);
      return;
    }
    const nextProne = !isProned;
    setIsProned(nextProne);
    audioEngine.playConfirmBeep();

    const newShunt = nextProne ? Math.max(5, Math.round(patient.shuntFraction * 0.6)) : Math.min(50, Math.round(patient.shuntFraction * 1.6));
    const newCompliance = nextProne ? Math.min(60, patient.compliance + 6) : Math.max(10, patient.compliance - 6);

    const patientUpdates: Partial<PatientParameters> = {
      shuntFraction: newShunt,
      compliance: newCompliance,
    };

    onUpdatePatient(patientUpdates);
    await syncStateToCloud(patientUpdates);

    showFeedback(
      nextProne
        ? '🔄 Paciente colocado em Posição Prona! Otimização da relação V/Q dorsal, Shunt caiu para ' + newShunt + '% e PaO₂/FiO₂ melhorou.'
        : 'Paciente retornado à Posição Supina.'
    );
  };

  const handleHmeFilterHygiene = async () => {
    if (!canEditNurse) {
      audioEngine.playClick(600);
      showFeedback(`🔒 Competência Exclusiva: Sua função é ${teamRole}. Apenas a Enfermagem UTI pode higienizar o Filtro HME.`);
      return;
    }
    audioEngine.playConfirmBeep();
    showFeedback('🧼 Filtro HME e traqueias higienizadas: Condensado d\'água removido do circuito inspiratório.');
  };

  // Collaboration Score Calculation
  const isSecretionsResolved = !patient.secretionsSeverity || patient.secretionsSeverity === 'none';
  const isLeakResolved = !patient.circuitLeakPercent || patient.circuitLeakPercent === 0;
  const isResistanceNormal = patient.resistance <= 12;
  const isComplianceAdequate = patient.compliance >= 25;
  const isVentilationProtective = monitored.drivingPressure <= 14.5;

  const collaborationMetrics = [
    { label: 'Secreções Desobstruídas (Enfermagem)', isOk: isSecretionsResolved },
    { label: 'Cuff Selado / Sem Fuga (Enfermagem)', isOk: isLeakResolved },
    { label: 'Vias Aéreas Desobstruídas (Medicina)', isOk: isResistanceNormal },
    { label: 'Complacência Estável (Medicina/Fisioterapia)', isOk: isComplianceAdequate },
    { label: 'Ventilação Protetora ΔP ≤ 14 cmH₂O (Fisioterapia)', isOk: isVentilationProtective },
  ];

  const metCount = collaborationMetrics.filter((m) => m.isOk).length;
  const totalCount = collaborationMetrics.length;
  const collaborationScorePercent = Math.round((metCount / totalCount) * 100);

  return (
    <div
      className={`rounded-2xl border p-4 space-y-4 transition-all shadow-lg ${
        isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0b0e1a] border-zinc-800 text-zinc-100'
      }`}
    >
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 border-inherit">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                Atuação Multidisciplinar de UTI
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-black bg-amber-400 text-slate-950 uppercase">
                SUA FUNÇÃO: {teamRole}
              </span>
            </div>
            <h4 className="text-sm font-display font-bold leading-tight">
              Painel Integrado da Equipe Multidisciplinar
            </h4>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('role_actions')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
              activeTab === 'role_actions'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : isLight
                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                : 'bg-[#121629] text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            Ações da Categoria
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('interprofessional_status')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
              activeTab === 'interprofessional_status'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : isLight
                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                : 'bg-[#121629] text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Colaboração ({collaborationScorePercent}%)</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-md animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* TAB 1: ROLE ACTIONS */}
      {activeTab === 'role_actions' && (
        <div className="space-y-4 animate-fadeIn">
          {/* 🫁 FISIOTERAPEUTA RESPIRATÓRIO */}
          {canEditPhysio && (
            <div className={`p-3.5 rounded-2xl border space-y-3 ${
              isLight ? 'bg-cyan-50/70 border-cyan-200' : 'bg-[#0c1825] border-cyan-900/50'
            }`}>
              <div className="flex items-center justify-between border-b pb-2 border-cyan-800/30">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-cyan-400" />
                  <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                    🫁 Fisioterapeuta Respiratório: Ajustes Ventilatórios & Diagnóstico
                  </h5>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  canEditPhysio ? 'bg-cyan-950 text-cyan-300 border-cyan-700/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {canEditPhysio ? 'Controle Exclusivo' : '🔒 Visualização Leitura'}
                </span>
              </div>

              <p className="text-xs font-sans text-zinc-300 leading-relaxed">
                {canEditPhysio
                  ? 'Você é o especialista responsável por ajustar os parâmetros do ventilador mecânico (Vt, RR, PEEP, FiO₂, Ti, Flow, PS), prevenir VILI mantendo ΔP ≤ 14 cmH₂O e realizar manobras estáticas de mecânica.'
                  : '🔒 Os parâmetros do ventilador mecânico (Volume Corrente, PEEP, FiO₂, Frequência, etc.) são ajustados exclusivamente pelo Fisioterapeuta Respiratório da equipe. Você pode acompanhar as métricas em tempo real.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                <div className={`p-2.5 rounded-xl border text-center ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#111c2e] border-zinc-800'
                }`}>
                  <span className="text-[10px] text-zinc-400 block font-bold">Driving Pressure</span>
                  <span className={`text-base font-black ${
                    monitored.drivingPressure <= 14 ? 'text-emerald-400' : 'text-rose-400 animate-pulse'
                  }`}>
                    {monitored.drivingPressure.toFixed(1)} cmH₂O
                  </span>
                </div>

                <div className={`p-2.5 rounded-xl border text-center ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#111c2e] border-zinc-800'
                }`}>
                  <span className="text-[10px] text-zinc-400 block font-bold">Complacência Estática</span>
                  <span className="text-base font-black text-cyan-400">
                    {patient.compliance} mL/cmH₂O
                  </span>
                </div>

                <div className={`p-2.5 rounded-xl border text-center ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#111c2e] border-zinc-800'
                }`}>
                  <span className="text-[10px] text-zinc-400 block font-bold">Resistência Raw</span>
                  <span className="text-base font-black text-amber-400">
                    {patient.resistance} cmH₂O/(L/s)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 🩺 MÉDICO INTENSIVISTA */}
          {canEditDoctor && (
            <div className={`p-3.5 rounded-2xl border space-y-3 ${
              isLight ? 'bg-indigo-50/70 border-indigo-200' : 'bg-[#121428] border-indigo-900/50'
            }`}>
              <div className="flex items-center justify-between border-b pb-2 border-indigo-800/30">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-indigo-400" />
                  <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                    🩺 Médico Intensivista: Prescrições & Intervenções Médicas
                  </h5>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  canEditDoctor ? 'bg-indigo-950 text-indigo-300 border-indigo-700/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {canEditDoctor ? 'Prescrição Médica' : '🔒 Visualização Leitura'}
                </span>
              </div>

              {/* Doctor Action Controls */}
              {!canEditDoctor && (
                <div className="text-xs font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-700/50 rounded-xl p-2.5 flex items-center gap-2 shadow-xs">
                  <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>
                    🔒 Prescrições Médicas: Estas ações pertencem exclusivamente ao <strong>Médico Intensivista</strong> do seu grupo.
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Sedation RASS */}
                <div className={`p-3 rounded-xl border space-y-2 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#161a33] border-zinc-800'
                }`}>
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-indigo-300">Nível de Sedação (RASS):</span>
                    <span className="text-amber-400 font-black">{rassLevel} ({rassLevel <= -3 ? 'Profunda' : 'Leve/Agitado'})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[-5, -4, -3, -2, -1, 0, 1].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleApplySedationRASS(lvl)}
                        title={!canEditDoctor ? "🔒 Apenas o Médico Intensivista pode alterar o RASS" : `Ajustar RASS para ${lvl}`}
                        className={`flex-1 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                          rassLevel === lvl
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        } ${!canEditDoctor ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Neuromuscular Blockade */}
                <div className={`p-3 rounded-xl border space-y-2 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#161a33] border-zinc-800'
                }`}>
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-indigo-300">Bloqueio Neuromuscular:</span>
                    <span className={`font-black ${isNmbActive ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {isNmbActive ? 'ATIVO (Cisatracúrio)' : 'Inativo'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleNMB}
                    title={!canEditDoctor ? "🔒 Apenas o Médico Intensivista pode prescrever bloqueio neuromuscular" : undefined}
                    className={`w-full py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                      isNmbActive
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    } ${!canEditDoctor ? 'opacity-60 cursor-not-allowed border border-dashed border-indigo-700/60' : 'cursor-pointer'}`}
                  >
                    {!canEditDoctor && '🔒 '}
                    {isNmbActive ? '✓ Suspender Bloqueador Neuromuscular' : '⚡ Iniciar Cisatracúrio (Paralisia)'}
                  </button>
                </div>

                {/* Bronchodilator */}
                <div className={`p-3 rounded-xl border space-y-2 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#161a33] border-zinc-800'
                }`}>
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-indigo-300">Broncoespasmo / Raw Elevada:</span>
                    <span className="text-amber-400">{patient.resistance} cmH₂O/(L/s)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyBronchodilator}
                    title={!canEditDoctor ? "🔒 Apenas o Médico Intensivista pode prescrever broncodilatador" : undefined}
                    className={`w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                      !canEditDoctor ? 'opacity-60 cursor-not-allowed border border-dashed border-amber-600/60' : 'cursor-pointer'
                    }`}
                  >
                    {!canEditDoctor && '🔒'}
                    <Syringe className="w-3.5 h-3.5" />
                    <span>Prescrever Salbutamol Inalatório (-45% Raw)</span>
                  </button>
                </div>

                {/* Thoracostomy Pneumothorax */}
                <div className={`p-3 rounded-xl border space-y-2 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#161a33] border-zinc-800'
                }`}>
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-indigo-300">Drenagem de Tórax (Pneumotórax):</span>
                    <span className="text-cyan-400">{patient.compliance} mL/cmH₂O</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDrainPneumothorax}
                    title={!canEditDoctor ? "🔒 Procedimento invasivo exclusivo do Médico Intensivista" : undefined}
                    className={`w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                      !canEditDoctor ? 'opacity-60 cursor-not-allowed border border-dashed border-rose-600/60' : 'cursor-pointer'
                    }`}
                  >
                    {!canEditDoctor && '🔒'}
                    <Activity className="w-3.5 h-3.5" />
                    <span>Realizar Drenagem Torácica de Emergência</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 💊 ENFERMEIRO(A) UTI */}
          {canEditNurse && (
            <div className={`p-3.5 rounded-2xl border space-y-3 ${
              isLight ? 'bg-purple-50/70 border-purple-200' : 'bg-[#181126] border-purple-900/50'
            }`}>
            <div className="flex items-center justify-between border-b pb-2 border-purple-800/30">
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-purple-400" />
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
                  💊 Enfermeiro(a) UTI: Cuidados de Enfermagem & Segurança da Via Aérea
                </h5>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                canEditNurse ? 'bg-purple-950 text-purple-300 border-purple-700/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {canEditNurse ? 'Cuidados Críticos' : '🔒 Visualização Leitura'}
              </span>
            </div>

            {/* Nurse Action Controls */}
            {!canEditNurse && (
              <div className="text-xs font-mono text-purple-300 bg-purple-950/60 border border-purple-700/50 rounded-xl p-2.5 flex items-center gap-2 shadow-xs">
                <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  🔒 Cuidados Críticos de Enfermagem: Estas intervenções pertencem exclusivamente ao <strong>Enfermeiro(a) UTI</strong> do seu grupo.
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Endotracheal Suctioning */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#201833] border-zinc-800'
              }`}>
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-purple-300">Secreção Endotraqueal:</span>
                  <span className={`font-black ${
                    patient.secretionsSeverity && patient.secretionsSeverity !== 'none'
                      ? 'text-rose-400 animate-pulse'
                      : 'text-emerald-400'
                  }`}>
                    {patient.secretionsSeverity ? patient.secretionsSeverity.toUpperCase() : 'NENHUMA'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePerformSuction}
                  title={!canEditNurse ? "🔒 Procedimento restrito ao Enfermeiro(a) UTI da equipe" : undefined}
                  className={`w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                    !canEditNurse ? 'opacity-60 cursor-not-allowed border border-dashed border-purple-700/60' : 'cursor-pointer'
                  }`}
                >
                  {!canEditNurse && '🔒'}
                  <Droplet className="w-3.5 h-3.5" />
                  <span>Realizar Aspiração de Secreções</span>
                </button>
              </div>

              {/* TOT Cuff Pressure Seal */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#201833] border-zinc-800'
              }`}>
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-purple-300">Fuga de Cuff do Tubo:</span>
                  <span className={`font-black ${
                    patient.circuitLeakPercent && patient.circuitLeakPercent > 0
                      ? 'text-rose-400 animate-pulse'
                      : 'text-emerald-400'
                  }`}>
                    {patient.circuitLeakPercent || 0}% de Fuga
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleFixCuffLeak}
                  title={!canEditNurse ? "🔒 Calibração de balonete restrita ao Enfermeiro(a) UTI da equipe" : undefined}
                  className={`w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                    !canEditNurse ? 'opacity-60 cursor-not-allowed border border-dashed border-cyan-700/60' : 'cursor-pointer'
                  }`}
                >
                  {!canEditNurse && '🔒'}
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ajustar Pressão do Cuff (Selar Fuga)</span>
                </button>
              </div>

              {/* Prone Position Toggle */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#201833] border-zinc-800'
              }`}>
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-purple-300">Posição do Paciente:</span>
                  <span className={`font-black ${isProned ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {isProned ? 'PRONA (16h)' : 'Supina'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePronePosition}
                  title={!canEditNurse ? "🔒 Manobra de posicionamento restrita ao Enfermeiro(a) UTI da equipe" : undefined}
                  className={`w-full py-2 rounded-xl font-mono font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                    isProned
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  } ${!canEditNurse ? 'opacity-60 cursor-not-allowed border border-dashed border-purple-700/60' : 'cursor-pointer'}`}
                >
                  {!canEditNurse && '🔒'}
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isProned ? 'Retornar para Posição Supina' : '🔄 Colocar Paciente em Prona'}</span>
                </button>
              </div>

              {/* HME Hygiene */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#201833] border-zinc-800'
              }`}>
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-purple-300">Higienização do Circuito:</span>
                  <span className="text-emerald-400">Limpo</span>
                </div>
                <button
                  type="button"
                  onClick={handleHmeFilterHygiene}
                  title={!canEditNurse ? "🔒 Manutenção do circuito restrita ao Enfermeiro(a) UTI da equipe" : undefined}
                  className={`w-full py-2 rounded-xl font-mono font-bold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                  } ${!canEditNurse ? 'opacity-60 cursor-not-allowed border border-dashed border-zinc-700/60' : 'cursor-pointer'}`}
                >
                  {!canEditNurse && '🔒'}
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trocar Filtro HME / Drenar Condensado</span>
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERPROFESSIONAL COLLABORATION STATUS */}
      {activeTab === 'interprofessional_status' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Progress Overview Card */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isLight ? 'bg-emerald-50/80 border-emerald-200' : 'bg-[#0b1c16] border-emerald-900/60'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Índice de Colaboração Interprofissional
                </span>
                <h5 className="text-base font-display font-black text-emerald-300">
                  Estabilização Fisiológica Multidisciplinar
                </h5>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black font-display text-emerald-400">
                  {collaborationScorePercent}%
                </span>
                <span className="text-[10px] font-mono text-emerald-300/80 block">
                  {metCount} de {totalCount} metas atendidas
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden p-0.5 border border-emerald-800/40">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${collaborationScorePercent}%` }}
              />
            </div>
          </div>

          {/* Checklist of Interprofessional Tasks */}
          <div className="space-y-2">
            <h5 className="text-xs font-mono font-bold uppercase text-zinc-400">
              Checklist de Ações em Equipe (Equipe Multidisciplinar de UTI):
            </h5>
            <div className="space-y-2 font-mono text-xs">
              {collaborationMetrics.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    item.isOk
                      ? isLight
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-[#0a1a15] border-emerald-800/60 text-emerald-200'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                      : 'bg-[#101424] border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.isOk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="font-bold">{item.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.isOk
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {item.isOk ? 'RESOLVIDO' : 'PENDENTE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
