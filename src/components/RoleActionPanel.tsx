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
  isLight = false,
}) => {
  const [activeTab, setActiveTab] = useState<'role_actions' | 'interprofessional_status'>('role_actions');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [rassLevel, setRassLevel] = useState<number>(patient.spontaneousDrive ? 0 : -4);
  const [isNmbActive, setIsNmbActive] = useState<boolean>(!patient.spontaneousDrive);
  const [isProned, setIsProned] = useState<boolean>(false);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const syncStateToCloud = async (patientUpdates: Partial<PatientParameters>, settingsUpdates?: Partial<VentilatorSettings>) => {
    if (roomCode) {
      await localDatabase.publishRoomState(roomCode, {
        patient: { ...patient, ...patientUpdates },
        ...(settingsUpdates ? { settings: { ...settings, ...settingsUpdates } } : {}),
      });
    }
  };

  const canEditPhysio = teamRole === 'Fisioterapeuta Respiratório' || teamRole === 'Todos';
  const canEditDoctor = teamRole === 'Médico Intensivista' || teamRole === 'Todos';
  const canEditNurse = teamRole === 'Enfermeiro(a) UTI' || teamRole === 'Todos';

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
  };

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

  return (
    <div className={`rounded-2xl border p-4 space-y-4 shadow-lg ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0b0e1a] border-zinc-800'}`}>
      <h3 className="text-sm font-bold">Painel de Ações - {teamRole}</h3>
      {actionFeedback && <div className="p-2 bg-emerald-600 text-white rounded">{actionFeedback}</div>}
      
      {/* Physio Actions */}
      {canEditPhysio && (
        <div className="p-3 bg-cyan-900/20 border border-cyan-800 rounded-xl">
           <p className="text-xs">Fisioterapeuta: Ajustes Ventilatórios</p>
           <button onClick={() => {}} className="text-xs bg-cyan-600 p-1 rounded">Ajustar Ventilador</button>
        </div>
      )}

      {/* Doctor Actions */}
      {canEditDoctor && (
        <div className="p-3 bg-indigo-900/20 border border-indigo-800 rounded-xl">
           <p className="text-xs">Médico: Prescrições</p>
           <button onClick={handleToggleNMB} className="text-xs bg-indigo-600 p-1 rounded">Bloqueio</button>
        </div>
      )}

      {/* Nurse Actions */}
      {canEditNurse && (
        <div className="p-3 bg-purple-900/20 border border-purple-800 rounded-xl">
           <p className="text-xs">Enfermeiro: Cuidados</p>
           <button onClick={handlePerformSuction} className="text-xs bg-purple-600 p-1 rounded">Aspiração</button>
        </div>
      )}
    </div>
  );
};
