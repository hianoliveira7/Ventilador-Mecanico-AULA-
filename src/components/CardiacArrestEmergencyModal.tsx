import React, { useState, useEffect, useRef } from 'react';
import { VentilatorSettings, MonitoredData } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import {
  AlertOctagon,
  Flame,
  Clock,
  HeartCrack,
  CheckCircle2,
  XCircle,
  Sliders,
  Zap,
  RotateCcw,
  FileText,
  Activity,
  Wind,
} from 'lucide-react';

interface CardiacArrestEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  monitored: MonitoredData;
  currentSettings: VentilatorSettings;
  onApplyRescueSettings: (newSettings: VentilatorSettings) => void;
  onRestartCase: () => void;
  onOpenDebriefing: () => void;
}

export const CardiacArrestEmergencyModal: React.FC<CardiacArrestEmergencyModalProps> = ({
  isOpen,
  onClose,
  monitored,
  currentSettings,
  onApplyRescueSettings,
  onRestartCase,
  onOpenDebriefing,
}) => {
  if (!isOpen) return null;

  // 20-second countdown timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const [hasDied, setHasDied] = useState<boolean>(false);
  const [hasSucceeded, setHasSucceeded] = useState<boolean>(false);

  // Local draft rescue settings
  const [fio2, setFio2] = useState<number>(currentSettings.fio2 || 60);
  const [peep, setPeep] = useState<number>(currentSettings.peep || 10);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(currentSettings.respiratoryRate || 20);
  const [tidalVolume, setTidalVolume] = useState<number>(currentSettings.tidalVolume || 420);
  const [mode, setMode] = useState<string>(currentSettings.mode || 'VCV');

  const timerRef = useRef<number | null>(null);

  // Start 20-second countdown when opened
  useEffect(() => {
    setSecondsRemaining(20);
    setHasDied(false);
    setHasSucceeded(false);
    setFio2(currentSettings.fio2);
    setPeep(currentSettings.peep);
    setRespiratoryRate(currentSettings.respiratoryRate);
    setTidalVolume(currentSettings.tidalVolume);
    setMode(currentSettings.mode);

    audioEngine.triggerAlarmPattern('high');

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setHasDied(true);
          audioEngine.stopAlarm();
          audioEngine.playFlatlineTone();
          return 0;
        }
        // Pulse warning sound each second
        if (prev <= 6) {
          audioEngine.playErrorBeep();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioEngine.stopFlatlineTone();
    };
  }, [isOpen]);

  // Check if current parameters meet PCR standards:
  // 1. FiO2 == 100%
  // 2. FR between 10 and 12 rpm (ACLS / Parada)
  // 3. PEEP <= 5 cmH2O (Evitar barotrauma/atrapalhar retorno venoso durante RCP)
  const isFiO2Correct = fio2 >= 99;
  const isRRCorrect = respiratoryRate >= 8 && respiratoryRate <= 12;
  const isPeepCorrect = peep <= 5;
  const isPcrProtocolMet = isFiO2Correct && isRRCorrect && isPeepCorrect;

  const handleApplyInstantPcrProtocol = () => {
    setFio2(100);
    setPeep(5);
    setRespiratoryRate(10);
    setTidalVolume(Math.min(420, currentSettings.tidalVolume));
    setMode('VCV');

    const rescueSettings: VentilatorSettings = {
      ...currentSettings,
      mode: 'VCV',
      fio2: 100,
      peep: 5,
      respiratoryRate: 10,
      tidalVolume: Math.min(420, currentSettings.tidalVolume),
    };

    if (timerRef.current) clearInterval(timerRef.current);
    audioEngine.stopAlarm();
    audioEngine.playConfirmBeep();
    setHasSucceeded(true);
    onApplyRescueSettings(rescueSettings);
  };

  const handleManualConfirm = () => {
    if (isPcrProtocolMet) {
      const rescueSettings: VentilatorSettings = {
        ...currentSettings,
        mode: mode as any,
        fio2,
        peep,
        respiratoryRate,
        tidalVolume,
      };

      if (timerRef.current) clearInterval(timerRef.current);
      audioEngine.stopAlarm();
      audioEngine.playConfirmBeep();
      setHasSucceeded(true);
      onApplyRescueSettings(rescueSettings);
    } else {
      audioEngine.playErrorBeep();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in select-none">
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
                  🚨 PROTOCOLO DE PARADA CARDIORRESPIRATÓRIA (PCR)
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium">
                Deterioração crítica aguda: o paciente entrou em colapso respiratório e peri-parada!
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-zinc-100 font-sans">
          {/* STATE 1: PATIENT DECEASED */}
          {hasDied ? (
            <div className="p-6 rounded-2xl bg-rose-950/40 border-2 border-rose-700 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-rose-900/60 border border-rose-500 mx-auto flex items-center justify-center text-rose-300 animate-pulse">
                <HeartCrack className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-display font-black text-rose-400 uppercase tracking-wide">
                  💀 PACIENTE EVOLUIU A ÓBITO
                </h3>
                <p className="text-xs text-rose-200/90 max-w-lg mx-auto leading-relaxed">
                  O tempo limite de 20 segundos expirou sem a instituição adequada do protocolo ventilatório de reanimação (PCR). O paciente desenvolveu assistolia refratária decorrente de hipóxia celular e acidose metabólica/respiratória extrema.
                </p>
              </div>

              <div className="p-3 bg-black/60 rounded-xl border border-zinc-800 text-left space-y-1 text-xs font-mono text-zinc-300">
                <div className="flex justify-between text-zinc-400 text-[11px] pb-1 border-b border-zinc-800">
                  <span>MOMENTO DO COLAPSO:</span>
                  <span className="text-rose-400 font-bold">Assistolia Irreversível</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>SpO₂ Terminal:</span>
                  <span className="text-rose-400 font-bold">{monitored.spo2}%</span>
                </div>
                <div className="flex justify-between">
                  <span>pH Gasométrico:</span>
                  <span className="text-rose-400 font-bold">{monitored.ph.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Parâmetros de PCR Exigidos:</span>
                  <span className="text-amber-400">FiO₂ 100% • FR 10 rpm • PEEP ≤ 5 cmH₂O</span>
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
                  <span>Reiniciar Caso Clínico</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioEngine.stopFlatlineTone();
                    onClose();
                    onOpenDebriefing();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-mono font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ver Relatório de Debriefing / AAR</span>
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
                  ✅ RITMO E RETORNO DA CIRCULAÇÃO ESPONTÂNEA (RCE) OBTIDOS!
                </h3>
                <p className="text-xs text-emerald-200/90 max-w-lg mx-auto leading-relaxed">
                  Excelente conduta! Os parâmetros de ventilação na PCR foram ajustados a tempo (FiO₂ a 100%, frequência protetora de 10 rpm e PEEP despressurizada em ≤ 5 cmH₂O), permitindo retorno venoso adequado durante as compressões torácicas e oxigenação tecidual.
                </p>
              </div>

              <div className="p-3 bg-black/60 rounded-xl border border-zinc-800 text-left space-y-1 text-xs font-mono text-emerald-300">
                <div className="flex justify-between text-zinc-400 text-[11px] pb-1 border-b border-zinc-800">
                  <span>RESPOSTA HEMODINÂMICA:</span>
                  <span className="text-emerald-400 font-bold">RCE Confirmado</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>FiO₂ Aplicada:</span>
                  <span className="font-bold">100% (Hiperoxigenação de Resgate)</span>
                </div>
                <div className="flex justify-between">
                  <span>Frequência Ventilatória:</span>
                  <span className="font-bold">10 rpm (Prevenção de Hiperventilação Iatrogênica)</span>
                </div>
                <div className="flex justify-between">
                  <span>PEEP de Ressuscitação:</span>
                  <span className="font-bold">5 cmH₂O (Otimização do Débito Cardíaco)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/60 mx-auto"
              >
                <Activity className="w-4 h-4" />
                <span>Continuar Simulação com Estabilização</span>
              </button>
            </div>
          ) : (
            /* STATE 3: ACTIVE EMERGENCY COUNTDOWN & RESCUE CONTROLS */
            <>
              {/* Critical Gas & Vitals Warning */}
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-800/70 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-rose-300">
                  <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span className="font-bold">GASOMETRIA & SINAIS VITAIS CRÍTICOS:</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-rose-900/60 border border-rose-600 text-rose-200 font-bold">
                    SpO₂: {monitored.spo2}% (Crítica)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-900/60 border border-rose-600 text-rose-200 font-bold">
                    pH: {monitored.ph.toFixed(2)} (Acidose Extrema)
                  </span>
                </div>
              </div>

              {/* Protocol Requirements Checklist */}
              <div className="space-y-2">
                <span className="text-xs font-display font-bold text-amber-300 block uppercase tracking-wider">
                  Requisitos do Protocolo de PCR no Ventilador (ACLS):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${isFiO2Correct ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                    {isFiO2Correct ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>1. FiO₂ = 100%</span>
                  </div>
                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${isRRCorrect ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                    {isRRCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>2. FR: 10 a 12 rpm</span>
                  </div>
                  <div className={`p-2 rounded-xl border flex items-center gap-2 ${isPeepCorrect ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                    {isPeepCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>3. PEEP ≤ 5 cmH₂O</span>
                  </div>
                </div>
              </div>

              {/* Instant 1-Click Action Button */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-rose-950/50 to-indigo-950/50 border border-amber-600/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5 text-center sm:text-left">
                  <span className="text-xs font-display font-bold text-amber-300 block">
                    ⚡ Ação de Resgate Rápido (1-Clique):
                  </span>
                  <span className="text-[11px] text-zinc-300">
                    Aplica imediatamente FiO₂ 100%, FR 10 rpm, PEEP 5 cmH₂O e modo VCV.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleApplyInstantPcrProtocol}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-mono font-black text-xs shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-105"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>ATIVAR PROTOCOLO PCR IMEDIATO</span>
                </button>
              </div>

              {/* Manual Configuration Controls */}
              <div className="p-4 rounded-2xl bg-[#111422] border border-zinc-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <span className="font-display font-bold text-zinc-300 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Ajuste Manual dos Parâmetros</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Configure e confirme</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* FiO2 */}
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>FiO₂</span>
                      <span className={`font-bold ${fio2 >= 99 ? 'text-emerald-400' : 'text-rose-400'}`}>{fio2}%</span>
                    </div>
                    <input
                      type="range"
                      min={21}
                      max={100}
                      step={1}
                      value={fio2}
                      onChange={(e) => setFio2(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setFio2(100)}
                      className="w-full py-1 text-[10px] font-mono font-bold bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-200 rounded cursor-pointer"
                    >
                      Definir 100%
                    </button>
                  </div>

                  {/* FR */}
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>FR</span>
                      <span className={`font-bold ${respiratoryRate >= 8 && respiratoryRate <= 12 ? 'text-emerald-400' : 'text-rose-400'}`}>{respiratoryRate} rpm</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={35}
                      step={1}
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setRespiratoryRate(10)}
                      className="w-full py-1 text-[10px] font-mono font-bold bg-amber-950/60 hover:bg-amber-900 border border-amber-700/60 text-amber-200 rounded cursor-pointer"
                    >
                      Definir 10 rpm
                    </button>
                  </div>

                  {/* PEEP */}
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>PEEP</span>
                      <span className={`font-bold ${peep <= 5 ? 'text-emerald-400' : 'text-rose-400'}`}>{peep} cmH₂O</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={1}
                      value={peep}
                      onChange={(e) => setPeep(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setPeep(5)}
                      className="w-full py-1 text-[10px] font-mono font-bold bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 rounded cursor-pointer"
                    >
                      Definir 5 cmH₂O
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualConfirm}
                  disabled={!isPcrProtocolMet}
                  className={`w-full py-2.5 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    isPcrProtocolMet
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-950/50'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isPcrProtocolMet ? 'CONFIRMAR E APLICAR PARÂMETROS DE PCR' : 'Ajuste FiO₂=100%, FR=10 e PEEP≤5 para confirmar'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
