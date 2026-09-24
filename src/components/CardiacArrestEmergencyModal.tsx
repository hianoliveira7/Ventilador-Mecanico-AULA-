import React, { useState, useEffect, useRef } from 'react';
import { VentilatorSettings, MonitoredData } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
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
  const [attemptError, setAttemptError] = useState<string | null>(null);

  // Local draft rescue settings - initialized from current settings
  const [fio2, setFio2] = useState<number>(currentSettings.fio2 || 60);
  const [peep, setPeep] = useState<number>(currentSettings.peep || 8);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(currentSettings.respiratoryRate || 18);
  const [tidalVolume, setTidalVolume] = useState<number>(currentSettings.tidalVolume || 420);
  const [mode, setMode] = useState<'VCV' | 'PCV'>(
    currentSettings.mode === 'PCV' ? 'PCV' : 'VCV'
  );

  const timerRef = useRef<number | null>(null);

  // Start 20-second countdown when opened
  useEffect(() => {
    setSecondsRemaining(20);
    setHasDied(false);
    setHasSucceeded(false);
    setAttemptError(null);
    setFio2(currentSettings.fio2 || 60);
    setPeep(currentSettings.peep || 8);
    setRespiratoryRate(currentSettings.respiratoryRate || 18);
    setTidalVolume(currentSettings.tidalVolume || 420);
    setMode(currentSettings.mode === 'PCV' ? 'PCV' : 'VCV');

    audioEngine.triggerAlarmPattern('high');

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setHasDied(true);
          audioEngine.stopAlarm();
          audioEngine.playFlatlineTone();
          return 0;
        }
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

  // Medical criteria validation for PCR resuscitation
  // 1. FiO2 == 100%
  // 2. FR between 8 and 12 rpm (ACLS guideline for cardiac arrest ventilation)
  // 3. PEEP <= 5 cmH2O (preserves venous return during chest compressions)
  const validatePcrSettings = (): { valid: boolean; reason?: string } => {
    if (fio2 < 99) {
      return { valid: false, reason: 'Fração Inspirada de Oxigênio (FiO₂) inadequada para a emergência de PCR.' };
    }
    if (respiratoryRate < 8 || respiratoryRate > 12) {
      return { valid: false, reason: 'Frequência ventilatória fora da faixa recomendada no protocolo de PCR.' };
    }
    if (peep > 5) {
      return { valid: false, reason: 'PEEP excessiva pode comprometer o retorno venoso e débito cardíaco na PCR.' };
    }
    return { valid: true };
  };

  const handleConfirmSettings = () => {
    const validation = validatePcrSettings();
    if (validation.valid) {
      const rescueSettings: VentilatorSettings = {
        ...currentSettings,
        mode,
        fio2,
        peep,
        respiratoryRate,
        tidalVolume,
      };

      if (timerRef.current) clearInterval(timerRef.current);
      audioEngine.stopAlarm();
      audioEngine.playConfirmBeep();
      setHasSucceeded(true);
      setAttemptError(null);
      onApplyRescueSettings(rescueSettings);
    } else {
      audioEngine.playErrorBeep();
      setAttemptError(validation.reason || 'Parâmetros ventilatórios inadequados para a PCR. Corrija antes de confirmar!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="w-full max-w-xl bg-[#090b10] border-2 border-rose-600 rounded-3xl shadow-2xl shadow-rose-950/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Critical Blinking Banner */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-700 to-red-800 p-4 sm:p-5 text-white flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-black/30 border border-white/20 animate-pulse text-amber-300">
              <AlertOctagon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm sm:text-base tracking-wider uppercase">
                  🚨 PARADA CARDIORRESPIRATÓRIA (PCR)
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium">
                Saturação em nível crítico (SpO₂ &lt; 35%): paciente em colapso e arresto circulatório!
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
                  💀 PACIENTE EVOLUIU A ÓBITO
                </h3>
                <p className="text-xs text-rose-200/90 max-w-lg mx-auto leading-relaxed">
                  O tempo de emergência de 20 segundos expirou sem a configuração adequada dos parâmetros de ventilação mecânica para o protocolo de PCR. O paciente evoluiu com anóxia tecidual e parada cardiorrespiratória irreversível.
                </p>
              </div>

              <div className="p-3 bg-black/60 rounded-xl border border-zinc-800 text-left space-y-1 text-xs font-mono text-zinc-300">
                <div className="flex justify-between text-zinc-400 text-[11px] pb-1 border-b border-zinc-800">
                  <span>DESFECHO CLÍNICO:</span>
                  <span className="text-rose-400 font-bold">Óbito por Anóxia & PCR Refratária</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>SpO₂ Terminal:</span>
                  <span className="text-rose-400 font-bold">{monitored.spo2}%</span>
                </div>
                <div className="flex justify-between">
                  <span>pH Gasométrico:</span>
                  <span className="text-rose-400 font-bold">{monitored.ph.toFixed(2)}</span>
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
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-mono font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
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
                  ✅ RETORNO DA CIRCULAÇÃO ESPONTÂNEA (RCE)!
                </h3>
                <p className="text-xs text-emerald-200/90 max-w-lg mx-auto leading-relaxed">
                  Excelente conduta emergencial! Os parâmetros de ventilação durante a PCR foram ajustados corretamente a tempo, garantindo oxigenação tecidual e minimizando a pressão intratorácica para o retorno venoso.
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
            /* STATE 3: ACTIVE EMERGENCY CONTROLS (No answer codes given) */
            <>
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-800/70 space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                    STATUS DO PACIENTE:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 font-bold border border-rose-600">
                    SpO₂: {monitored.spo2}%
                  </span>
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                  O paciente entrou em Parada Cardiorrespiratória (PCR). Configure rapidamente os parâmetros ventilatórios de emergência adequados para o manejo do paciente em PCR e confirme a aplicação antes que os 20 segundos se esgotem.
                </p>
              </div>

              {attemptError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600 text-rose-200 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{attemptError}</span>
                </div>
              )}

              {/* Ventilator Settings Form - Student must choose correct values */}
              <div className="p-4 rounded-2xl bg-[#111422] border border-zinc-800 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-display font-bold text-zinc-200 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Ajuste os Parâmetros Ventilatórios na PCR</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Insira e Confirme</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                  {/* Modo */}
                  <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <label className="text-[11px] text-zinc-400 block font-bold">Modo Ventilatório:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMode('VCV')}
                        className={`py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                          mode === 'VCV' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        VCV
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('PCV')}
                        className={`py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                          mode === 'PCV' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        PCV
                      </button>
                    </div>
                  </div>

                  {/* FiO2 */}
                  <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-bold">FiO₂ (%):</span>
                      <span className="font-bold text-cyan-400">{fio2}%</span>
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

                  {/* FR */}
                  <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-bold">FR (rpm):</span>
                      <span className="font-bold text-cyan-400">{respiratoryRate} rpm</span>
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

                  {/* PEEP */}
                  <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-bold">PEEP (cmH₂O):</span>
                      <span className="font-bold text-cyan-400">{peep} cmH₂O</span>
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

                <button
                  type="button"
                  onClick={handleConfirmSettings}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/60 transition-transform active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>APLICAR E CONFIRMAR PARÂMETROS DE RESGATE</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
