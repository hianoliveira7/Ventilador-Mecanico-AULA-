import React, { useState, useEffect, useRef } from 'react';
import { VentilatorSettings, MonitoredData } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import { localDatabase } from '../services/localDatabase';
import {
  AlertOctagon,
  Clock,
  HeartCrack,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
  Activity,
  Sliders,
  Syringe,
  Heart,
  Wind,
  ShieldCheck,
} from 'lucide-react';

interface CardiacArrestEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  monitored: MonitoredData;
  currentSettings: VentilatorSettings;
  onApplyRescueSettings: (newSettings: VentilatorSettings) => void;
  onRestartCase: () => void;
  onOpenDebriefing: () => void;
  onPatientDeceased?: () => void;
  teamRole?: string;
  roomCode?: string;
  teamName?: string;
  studentName?: string;
}

export const CardiacArrestEmergencyModal: React.FC<CardiacArrestEmergencyModalProps> = ({
  isOpen,
  onClose,
  monitored,
  currentSettings,
  onApplyRescueSettings,
  onRestartCase,
  onOpenDebriefing,
  onPatientDeceased,
  teamRole = 'Todos',
  roomCode,
  teamName,
  studentName,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const [hasDied, setHasDied] = useState<boolean>(false);
  const [hasSucceeded, setHasSucceeded] = useState<boolean>(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [waitingForTeam, setWaitingForTeam] = useState<boolean>(false);

  // Role Specific Actions State
  const [fio2, setFio2] = useState<number>(currentSettings.fio2 || 60);
  const [peep, setPeep] = useState<number>(currentSettings.peep || 8);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(currentSettings.respiratoryRate || 18);
  const [tidalVolume, setTidalVolume] = useState<number>(currentSettings.tidalVolume || 420);
  const [mode, setMode] = useState<'VCV' | 'PCV'>(currentSettings.mode === 'PCV' ? 'PCV' : 'VCV');

  const [doctorEpiGiven, setDoctorEpiGiven] = useState<boolean>(false);
  const [nurseCompressionsStarted, setNurseCompressionsStarted] = useState<boolean>(false);
  const [pcrRolesReady, setPcrRolesReady] = useState<Record<string, boolean>>({});

  const isTeamMode = Boolean(roomCode && teamName);
  const isPhysio = teamRole === 'Fisioterapeuta Respiratório' || teamRole === 'Todos';
  const isDoctor = teamRole === 'Médico Intensivista' || teamRole === 'Todos';
  const isNurse = teamRole === 'Enfermeiro(a) UTI' || teamRole === 'Todos';

  const timerRef = useRef<number | null>(null);
  const prevIsOpenRef = useRef<boolean>(false);

  // Real-time synchronization of PCR roles readiness & patient deceased state
  useEffect(() => {
    if (!isOpen || !roomCode) return;
    const unsub = localDatabase.subscribeRoomState(roomCode, (state) => {
      if (!state) return;
      if (state.patientDeceased && !hasDied) {
        setHasDied(true);
        audioEngine.stopAlarm();
        audioEngine.playFlatlineTone();
      }
      if (state.pcrRolesReady) {
        setPcrRolesReady(state.pcrRolesReady);
        const physioOk = !isPhysio || state.pcrRolesReady.physio;
        const doctorOk = !isDoctor || state.pcrRolesReady.doctor;
        const nurseOk = !isNurse || state.pcrRolesReady.nurse;
        if (physioOk && doctorOk && nurseOk && !hasSucceeded && !hasDied) {
          if (timerRef.current) clearInterval(timerRef.current);
          audioEngine.stopAlarm();
          audioEngine.playConfirmBeep();
          setHasSucceeded(true);
          setWaitingForTeam(false);
          const rescueSettings: VentilatorSettings = {
            ...currentSettings,
            mode,
            fio2,
            peep,
            respiratoryRate,
            tidalVolume,
          };
          onApplyRescueSettings(rescueSettings);
        }
      }
    }, teamName);

    return () => unsub();
  }, [isOpen, roomCode, teamName, isPhysio, isDoctor, isNurse, hasDied, hasSucceeded, mode, fio2, peep, respiratoryRate, tidalVolume, currentSettings, onApplyRescueSettings]);

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      audioEngine.stopFlatlineTone();
      return;
    }

    if (!prevIsOpenRef.current) {
      prevIsOpenRef.current = true;
      setSecondsRemaining(20);
      setHasDied(false);
      setHasSucceeded(false);
      setAttemptError(null);
      setWaitingForTeam(false);
      setDoctorEpiGiven(false);
      setNurseCompressionsStarted(false);
      setPcrRolesReady({});

      audioEngine.triggerAlarmPattern('high');

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            return 0;
          }
          if (prev <= 6) {
            audioEngine.playErrorBeep();
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioEngine.stopFlatlineTone();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && secondsRemaining === 0 && !hasDied && !hasSucceeded) {
      if (timerRef.current) clearInterval(timerRef.current);
      setHasDied(true);
      audioEngine.stopAlarm();
      audioEngine.playFlatlineTone();
      onPatientDeceased?.();
      if (isTeamMode && roomCode && teamName) {
        localDatabase.publishRoomState(
          roomCode,
          { patientDeceased: true },
          teamName,
          { role: teamRole, author: studentName, actionType: 'pcr_deceased' }
        );
      }
    }
  }, [isOpen, secondsRemaining, hasDied, hasSucceeded, onPatientDeceased, isTeamMode, roomCode, teamName, teamRole, studentName]);

  if (!isOpen) return null;

  const validatePcrSettings = (): { valid: boolean; reason?: string } => {
    if (isPhysio) {
      if (fio2 < 99) {
        return { valid: false, reason: '🫁 Fisioterapia: FiO₂ deve ser ajustada para 100% na PCR.' };
      }
      if (respiratoryRate < 8 || respiratoryRate > 12) {
        return { valid: false, reason: '🫁 Fisioterapia: Frequência respiratória deve ser 8-12 rpm (ACLS).' };
      }
      if (peep > 5) {
        return { valid: false, reason: '🫁 Fisioterapia: PEEP deve ser ≤ 5 cmH₂O para preservar retorno venoso.' };
      }
    }
    if (isDoctor && !doctorEpiGiven) {
      return { valid: false, reason: '🩺 Medicina: É necessário administrar Adrenalina 1mg IV (Protocolo ACLS).' };
    }
    if (isNurse && !nurseCompressionsStarted) {
      return { valid: false, reason: '💊 Enfermagem: É necessário iniciar Compressões Torácicas de Alta Qualidade (100-120 bpm).' };
    }
    return { valid: true };
  };

  const handleConfirmAction = async () => {
    const validation = validatePcrSettings();
    if (!validation.valid) {
      audioEngine.playErrorBeep();
      setAttemptError(validation.reason || 'Conduta de PCR incompleta. Verifique as exigências da sua função!');
      return;
    }

    audioEngine.playConfirmBeep();
    setAttemptError(null);

    const newReady = {
      physio: isPhysio ? true : pcrRolesReady.physio || false,
      doctor: isDoctor ? true : pcrRolesReady.doctor || false,
      nurse: isNurse ? true : pcrRolesReady.nurse || false,
    };

    setPcrRolesReady(newReady);

    const physioOk = !isPhysio || newReady.physio;
    const doctorOk = !isDoctor || newReady.doctor;
    const nurseOk = !isNurse || newReady.nurse;

    if (isTeamMode && roomCode && teamName) {
      await localDatabase.publishRoomState(
        roomCode,
        { pcrRolesReady: newReady },
        teamName,
        { role: teamRole, author: studentName, actionType: 'pcr_role_ready' }
      );
    }

    if (physioOk && doctorOk && nurseOk) {
      if (timerRef.current) clearInterval(timerRef.current);
      audioEngine.stopAlarm();
      audioEngine.playConfirmBeep();
      setHasSucceeded(true);
      setWaitingForTeam(false);
      const rescueSettings: VentilatorSettings = {
        ...currentSettings,
        mode,
        fio2,
        peep,
        respiratoryRate,
        tidalVolume,
      };
      onApplyRescueSettings(rescueSettings);
    } else {
      setWaitingForTeam(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="w-full max-w-2xl bg-[#090b10] border-2 border-rose-600 rounded-3xl shadow-2xl shadow-rose-950/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Critical Blinking Banner */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-700 to-red-800 p-4 sm:p-5 text-white flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-black/30 border border-white/20 animate-pulse text-amber-300">
              <AlertOctagon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm sm:text-base tracking-wider uppercase">
                  🚨 PARADA CARDIORRESPIRATÓRIA (PCR) • PAPEL: {teamRole}
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium">
                Saturação crítica e colapso circulatório! A equipe interprofissional deve atuar em conjunto.
              </p>
            </div>
          </div>

          {!hasDied && !hasSucceeded && (
            <div className="flex flex-col items-center justify-center bg-black/40 border border-white/20 px-3.5 py-1.5 rounded-2xl shrink-0">
              <div className="flex items-center gap-1 text-amber-300">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-[10px] font-mono font-bold uppercase">Tempo Restante</span>
              </div>
              <span className={`font-mono font-black text-2xl ${secondsRemaining <= 7 ? 'text-red-400 animate-ping' : 'text-white'}`}>
                {secondsRemaining}s
              </span>
            </div>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-zinc-100 font-sans">
          {/* STATE 1: PATIENT DECEASED */}
          {hasDied ? (
            <div className="p-6 rounded-2xl bg-rose-950/40 border-2 border-rose-700 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-rose-900/60 border border-rose-500 mx-auto flex items-center justify-center text-rose-300 animate-pulse">
                <HeartCrack className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-display font-black text-rose-400 uppercase tracking-wide">
                  💀 PACIENTE EVOLUIU A ÓBITO (EQUIPE)
                </h3>
                <p className="text-xs text-rose-200/90 max-w-lg mx-auto leading-relaxed">
                  O tempo limite de 20 segundos expirou sem que todos os membros da equipe (Fisioterapeuta, Médico e Enfermeiro) concluíssem suas condutas de resgate adequadas. O óbito foi declarado para toda a equipe simultaneamente.
                </p>
              </div>

              <div className="p-3 bg-black/60 rounded-xl border border-zinc-800 text-left space-y-1 text-xs font-mono text-zinc-300">
                <div className="flex justify-between text-zinc-400 text-[11px] pb-1 border-b border-zinc-800">
                  <span>DESFECHO CLÍNICO:</span>
                  <span className="text-rose-400 font-bold">Óbito por PCR Refratária (Falha na Sincronia da Equipe)</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>SpO₂ Terminal:</span>
                  <span className="text-rose-400 font-bold">{monitored.spo2}%</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.stopFlatlineTone();
                    onClose();
                    onRestartCase();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reiniciar Simulação</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioEngine.stopFlatlineTone();
                    onClose();
                    onOpenDebriefing();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-colors"
                >
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Relatório de Debriefing</span>
                </button>
              </div>
            </div>
          ) : hasSucceeded ? (
            /* STATE 2: RESUSCITATION SUCCESS */
            <div className="p-6 rounded-2xl bg-emerald-950/40 border-2 border-emerald-600 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-900/60 border border-emerald-400 mx-auto flex items-center justify-center text-emerald-300">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-display font-black text-emerald-400 uppercase tracking-wide">
                  ✅ RCE: RETORNO DA CIRCULAÇÃO ESPONTÂNEA ALCANÇADO!
                </h3>
                <p className="text-xs text-emerald-200/90 max-w-lg mx-auto leading-relaxed">
                  Trabalho em equipe exemplar! Fisioterapia, Medicina e Enfermagem ajustaram suas condutas de resgate corretamente. O paciente retornou à circulação espontânea (RCE).
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/60 mx-auto"
              >
                <Activity className="w-4 h-4" />
                <span>Continuar Simulação</span>
              </button>
            </div>
          ) : (
            /* STATE 3: ROLE-SPECIFIC EMERGENCY CONTROLS & TEAM WAITING */
            <>
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-800/70 space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                    STATUS DA EQUIPE MULTIDISCIPLINAR:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 font-bold border border-rose-600">
                    SpO₂: {monitored.spo2}%
                  </span>
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                  Cada profissional deve realizar sua conduta obrigatória na PCR. A simulação só retornará (RCE) se <strong>todos</strong> os membros ativos da equipe (Fisioterapeuta, Médico e Enfermeiro) concluírem seus ajustes corretamente!
                </p>

                {/* Team Status Checklist */}
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                  <div className={`p-2 rounded-xl border text-center ${pcrRolesReady.physio ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}>
                    <span className="block font-bold">🫁 Fisioterapeuta</span>
                    <span>{pcrRolesReady.physio ? '✓ Pronto' : 'Pendente'}</span>
                  </div>
                  <div className={`p-2 rounded-xl border text-center ${pcrRolesReady.doctor ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}>
                    <span className="block font-bold">🩺 Médico(a)</span>
                    <span>{pcrRolesReady.doctor ? '✓ Pronto' : 'Pendente'}</span>
                  </div>
                  <div className={`p-2 rounded-xl border text-center ${pcrRolesReady.nurse ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}>
                    <span className="block font-bold">💊 Enfermeiro(a)</span>
                    <span>{pcrRolesReady.nurse ? '✓ Pronto' : 'Pendente'}</span>
                  </div>
                </div>
              </div>

              {attemptError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600 text-rose-200 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{attemptError}</span>
                </div>
              )}

              {waitingForTeam && !hasSucceeded && (
                <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-600 text-amber-200 text-xs font-mono flex items-center gap-2 animate-pulse">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
                  <span>Sua conduta foi aplicada! ⚠️ Aguardando os demais membros da equipe concluírem suas tarefas para o retorno da circulação (RCE)...</span>
                </div>
              )}

              <div className="space-y-4">
                {/* 🫁 FISIOTERAPEUTA CONTROLS */}
                {isPhysio && (
                  <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-900/60 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2">
                      <span className="font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                        <Wind className="w-4 h-4" />
                        <span>Sua Conduta (Fisioterapeuta): Parâmetros Ventilatórios de PCR</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-200">Exclusivo Fisio</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                      <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400 font-bold">FiO₂ (%):</span>
                          <span className="font-bold text-cyan-400">{fio2}% (Meta: 100%)</span>
                        </div>
                        <input
                          type="range"
                          min={21}
                          max={100}
                          step={1}
                          value={fio2}
                          onChange={(e) => setFio2(Number(e.target.value))}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400 font-bold">FR (rpm):</span>
                          <span className="font-bold text-cyan-400">{respiratoryRate} rpm (Meta: 8-12)</span>
                        </div>
                        <input
                          type="range"
                          min={6}
                          max={35}
                          step={1}
                          value={respiratoryRate}
                          onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1 sm:col-span-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400 font-bold">PEEP (cmH₂O):</span>
                          <span className="font-bold text-cyan-400">{peep} cmH₂O (Meta: ≤ 5)</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={20}
                          step={1}
                          value={peep}
                          onChange={(e) => setPeep(Number(e.target.value))}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 🩺 MÉDICO CONTROLS */}
                {isDoctor && (
                  <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/60 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-indigo-900/50 pb-2">
                      <span className="font-mono font-bold text-indigo-300 flex items-center gap-1.5">
                        <Syringe className="w-4 h-4" />
                        <span>Sua Conduta (Médico Intensivista): Protocolo ACLS</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200">Exclusivo Médico</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDoctorEpiGiven(!doctorEpiGiven)}
                      className={`w-full py-3 rounded-xl font-mono font-bold text-xs border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        doctorEpiGiven
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                          : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white shadow-md'
                      }`}
                    >
                      <Syringe className="w-4 h-4" />
                      <span>{doctorEpiGiven ? '✓ Adrenalina 1mg IV Administrada (ACLS)' : 'Administrar Adrenalina 1mg IV (Protocolo ACLS)'}</span>
                    </button>
                  </div>
                )}

                {/* 💊 ENFERMEIRO CONTROLS */}
                {isNurse && (
                  <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-900/60 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-purple-900/50 pb-2">
                      <span className="font-mono font-bold text-purple-300 flex items-center gap-1.5">
                        <Heart className="w-4 h-4" />
                        <span>Sua Conduta (Enfermeiro(a) UTI): Suporte Avançado de Vida</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 text-purple-200">Exclusivo Enfermagem</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNurseCompressionsStarted(!nurseCompressionsStarted)}
                      className={`w-full py-3 rounded-xl font-mono font-bold text-xs border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        nurseCompressionsStarted
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                          : 'bg-purple-600 hover:bg-purple-500 border-purple-400 text-white shadow-md'
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                      <span>{nurseCompressionsStarted ? '✓ Compressões Torácicas de Alta Qualidade Ativas (100-120/min)' : 'Iniciar Compressões Torácicas (100-120 bpm) & Acesso IV'}</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConfirmAction}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/60 transition-transform active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CONFIRMAR MINHA CONDUTA DE RESGATE NA PCR</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
