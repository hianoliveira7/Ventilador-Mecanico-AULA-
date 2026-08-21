import React from 'react';
import { AlarmLimits, AlarmItem } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import {
  Bell,
  BellOff,
  SlidersHorizontal,
  X,
  AlertTriangle,
  History,
  ShieldCheck,
} from 'lucide-react';

interface AlarmManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  limits: AlarmLimits;
  onUpdateLimits: (newLimits: AlarmLimits) => void;
  activeAlarms: AlarmItem[];
  alarmHistory: AlarmItem[];
  isSilenceActive: boolean;
  onToggleSilence: () => void;
}

export const AlarmManagerModal: React.FC<AlarmManagerModalProps> = ({
  isOpen,
  onClose,
  limits,
  onUpdateLimits,
  activeAlarms,
  alarmHistory,
  isSilenceActive,
  onToggleSilence,
}) => {
  if (!isOpen) return null;

  const update = <K extends keyof AlarmLimits>(field: K, value: number) => {
    audioEngine.playClick(850);
    onUpdateLimits({ ...limits, [field]: value });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-[#0a0a0e] border border-zinc-800 rounded-sm w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-sm bg-[#241a0d] border border-amber-800/80 text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-zinc-100 flex items-center gap-2">
                Gerenciador de Alarmes & Limites de Segurança
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Ajuste os limites de pressão, volume e ventilação minuto.
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

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Active Alarms Banner (if any) */}
          {activeAlarms.length > 0 ? (
            <div className="bg-[#260e12] p-3 rounded-sm border border-rose-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-display font-bold text-rose-300">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Alarmes Ativos ({activeAlarms.length})</span>
                </span>
                <button
                  onClick={onToggleSilence}
                  className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-sm font-mono text-xs cursor-pointer border border-rose-600"
                >
                  {isSilenceActive ? 'Silenciado (120s)' : 'Silenciar Alarmes'}
                </button>
              </div>

              <div className="space-y-1">
                {activeAlarms.map((a) => (
                  <div
                    key={a.id}
                    className="p-2 bg-[#070709] rounded-sm border border-rose-900/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-rose-400 mr-2 font-mono">{a.title}</span>
                      <span className="text-zinc-300 text-[11px] font-sans">{a.description}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#0d1d16] border border-emerald-800/60 rounded-sm flex items-center gap-2 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-mono">Nenhum alarme disparado no momento. Todos os parâmetros dentro das faixas de segurança.</span>
            </div>
          )}

          {/* Alarm Limits Configuration Grid */}
          <div className="bg-[#0e0f14] p-3.5 rounded-sm border border-zinc-800/80 space-y-3">
            <span className="text-xs font-display font-bold text-zinc-300 uppercase tracking-wider block">
              Limites de Disparo de Alarme
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pressure Limits */}
              <div className="bg-[#070709] p-3 rounded-sm border border-zinc-800 space-y-3">
                <span className="text-xs font-display font-bold text-cyan-400 block">Pressão de Pico (Paw)</span>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-sans">Limite Superior (Pmax):</span>
                    <span className="font-bold text-zinc-100">{limits.pHighMax} cmH₂O</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={70}
                    step={1}
                    value={limits.pHighMax}
                    onChange={(e) => update('pHighMax', Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-sans">Limite Inferior / Desconexão (Pmin):</span>
                    <span className="font-bold text-zinc-100">{limits.pLowMin} cmH₂O</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={limits.pLowMin}
                    onChange={(e) => update('pLowMin', Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Minute Ventilation Limits */}
              <div className="bg-[#070709] p-3 rounded-sm border border-zinc-800 space-y-3">
                <span className="text-xs font-display font-bold text-orange-400 block">Ventilação Minuto (VM)</span>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-sans">Limite Superior (VM max):</span>
                    <span className="font-bold text-zinc-100">{limits.mvHighMax} L/min</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={30}
                    step={0.5}
                    value={limits.mvHighMax}
                    onChange={(e) => update('mvHighMax', Number(e.target.value))}
                    className="w-full accent-orange-400 h-1 bg-zinc-800 rounded-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-sans">Limite Inferior (VM min):</span>
                    <span className="font-bold text-zinc-100">{limits.mvLowMin} L/min</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={0.5}
                    value={limits.mvLowMin}
                    onChange={(e) => update('mvLowMin', Number(e.target.value))}
                    className="w-full accent-orange-400 h-1 bg-zinc-800 rounded-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Tidal Volume Limits */}
              <div className="bg-[#070709] p-3 rounded-sm border border-zinc-800 space-y-3">
                <span className="text-xs font-display font-bold text-emerald-400 block">Volume Expirado (Vte)</span>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-sans">Vte Alto (Max):</span>
                    <span className="font-bold text-zinc-100">{limits.vteHighMax} mL</span>
                  </div>
                  <input
                    type="range"
                    min={400}
                    max={1200}
                    step={25}
                    value={limits.vteHighMax}
                    onChange={(e) => update('vteHighMax', Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-sans">Vte Baixo (Min):</span>
                    <span className="font-bold text-zinc-100">{limits.vteLowMin} mL</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={400}
                    step={25}
                    value={limits.vteLowMin}
                    onChange={(e) => update('vteLowMin', Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Respiratory Rate & Apnea Limits */}
              <div className="bg-[#070709] p-3 rounded-sm border border-zinc-800 space-y-3">
                <span className="text-xs font-display font-bold text-purple-400 block">Tempo de Apneia & FR Máx</span>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-sans">Tempo de Apneia (Backup):</span>
                    <span className="font-bold text-zinc-100">{limits.apneaTimeMax} s</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    step={5}
                    value={limits.apneaTimeMax}
                    onChange={(e) => update('apneaTimeMax', Number(e.target.value))}
                    className="w-full accent-purple-400 h-1 bg-zinc-800 rounded-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-sans">Frequência Resp. Máxima (Taquipneia):</span>
                    <span className="font-bold text-zinc-100">{limits.rateHighMax} rpm</span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={50}
                    step={1}
                    value={limits.rateHighMax}
                    onChange={(e) => update('rateHighMax', Number(e.target.value))}
                    className="w-full accent-purple-400 h-1 bg-zinc-800 rounded-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Alarm Acoustic Test Panel */}
          <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-2">
            <span className="text-xs font-display font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Padrão Sonoro de Alarmes (Norma ISO 9703-2)</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  audioEngine.triggerAlarmPattern('high');
                  setTimeout(() => audioEngine.stopAlarm(), 2200);
                }}
                className="p-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-sm font-mono text-[10px] font-bold text-center transition-all cursor-pointer flex flex-col items-center gap-1"
              >
                <span>🚨 Alta Prioridade</span>
                <span className="text-[9px] text-zinc-400 font-sans font-normal">3 + 2 bipes (960Hz)</span>
              </button>

              <button
                onClick={() => {
                  audioEngine.triggerAlarmPattern('medium');
                  setTimeout(() => audioEngine.stopAlarm(), 1800);
                }}
                className="p-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800 text-amber-300 rounded-sm font-mono text-[10px] font-bold text-center transition-all cursor-pointer flex flex-col items-center gap-1"
              >
                <span>⚠️ Média Prioridade</span>
                <span className="text-[9px] text-zinc-400 font-sans font-normal">2 bipes (660Hz)</span>
              </button>

              <button
                onClick={() => {
                  audioEngine.triggerAlarmPattern('low');
                  setTimeout(() => audioEngine.stopAlarm(), 1500);
                }}
                className="p-2 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800 text-cyan-300 rounded-sm font-mono text-[10px] font-bold text-center transition-all cursor-pointer flex flex-col items-center gap-1"
              >
                <span>🔔 Baixa Prioridade</span>
                <span className="text-[9px] text-zinc-400 font-sans font-normal">1 bipe (480Hz)</span>
              </button>
            </div>
          </div>

          {/* Alarm History Log */}
          <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-2">
            <span className="text-xs font-display font-bold text-zinc-400 uppercase flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-zinc-400" />
              <span>Histórico de Eventos de Alarme</span>
            </span>

            {alarmHistory.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic font-mono">Nenhum evento registrado nesta sessão.</p>
            ) : (
              <div className="max-h-32 overflow-y-auto divide-y divide-zinc-800 text-[11px]">
                {alarmHistory.slice(-8).reverse().map((item, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between">
                    <span className="font-semibold text-zinc-300 font-sans">{item.title}</span>
                    <span className="text-zinc-500 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
