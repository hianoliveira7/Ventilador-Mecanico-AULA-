import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import { localDatabase } from '../services/localDatabase';
import {
  Zap,
  X,
  AlertTriangle,
  Flame,
  Wind,
  Droplet,
  Heart,
  Sliders,
  CheckCircle2,
  Send,
  Activity,
  ShieldAlert,
} from 'lucide-react';

interface SurprisePreset {
  id: string;
  title: string;
  description: string;
  category: 'Brônquio' | 'Pleura' | 'Secreção' | 'Cuff' | 'Neuro/RASS' | 'Hemodinâmica';
  complianceOverride: number;
  resistanceOverride: number;
  secretionsOverride: 'none' | 'mild' | 'moderate' | 'severe';
  leakOverride: number;
  spontaneousDriveOverride: boolean;
  spontaneousRateOverride: number;
  mapOverride: number;
}

const SURPRISE_PRESETS: SurprisePreset[] = [
  {
    id: 'bronchospasm',
    title: '⚡ Broncoespasmo Agudo Súdito',
    description: 'O paciente apresentou broncoespasmo agudo grave: resistência das vias aéreas aumentou e a complacência caiu significativamente!',
    category: 'Brônquio',
    complianceOverride: 18,
    resistanceOverride: 26,
    secretionsOverride: 'mild',
    leakOverride: 0,
    spontaneousDriveOverride: true,
    spontaneousRateOverride: 28,
    mapOverride: 85,
  },
  {
    id: 'pneumothorax',
    title: '🫁 Pneumotórax Hipertensivo à Direita',
    description: 'Surgimento súbito de pneumotórax com colapso pulmonar, queda drástica de complacência, pico de PIP e instabilidade hemodinâmica!',
    category: 'Pleura',
    complianceOverride: 10,
    resistanceOverride: 18,
    secretionsOverride: 'none',
    leakOverride: 0,
    spontaneousDriveOverride: true,
    spontaneousRateOverride: 36,
    mapOverride: 52,
  },
  {
    id: 'secretions_block',
    title: '💦 Acúmulo Abundante de Secreção (Rolha)',
    description: 'Ocorreu acúmulo de secreção purulenta espessa no tubo endotraqueal, causando dente de serra no fluxo e aumento de Raw!',
    category: 'Secreção',
    complianceOverride: 22,
    resistanceOverride: 28,
    secretionsOverride: 'severe',
    leakOverride: 0,
    spontaneousDriveOverride: false,
    spontaneousRateOverride: 18,
    mapOverride: 88,
  },
  {
    id: 'cuff_leak',
    title: '🔌 Desinsuflação de Cuff do TOT (Fuga Aguda)',
    description: 'Desinsuflação acidental do cuff da cânula endotraqueal resultando em fuga massiva de volume inspiratório!',
    category: 'Cuff',
    complianceOverride: 25,
    resistanceOverride: 10,
    secretionsOverride: 'none',
    leakOverride: 45,
    spontaneousDriveOverride: false,
    spontaneousRateOverride: 16,
    mapOverride: 90,
  },
  {
    id: 'agitation_rass',
    title: '🧠 Despertar Agitado & Luta com o Ventilador',
    description: 'O paciente acordou agitado (RASS +2), gerando assincronia de duplo disparo e alta demanda muscular inspiratória!',
    category: 'Neuro/RASS',
    complianceOverride: 28,
    resistanceOverride: 12,
    secretionsOverride: 'none',
    leakOverride: 0,
    spontaneousDriveOverride: true,
    spontaneousRateOverride: 34,
    mapOverride: 110,
  },
  {
    id: 'septic_shock',
    title: '🩺 Choque Vasoplégico / Hipotensão Aguda',
    description: 'Deterioração hemodinâmica aguda com queda da Pressão Arterial Média (PAM < 55 mmHg) e taquicardia reflexa.',
    category: 'Hemodinâmica',
    complianceOverride: 25,
    resistanceOverride: 10,
    secretionsOverride: 'none',
    leakOverride: 0,
    spontaneousDriveOverride: false,
    spontaneousRateOverride: 22,
    mapOverride: 48,
  },
];

interface SurpriseEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  onEventDispatched?: (message: string) => void;
}

export const SurpriseEventModal: React.FC<SurpriseEventModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  onEventDispatched,
}) => {
  const { isLight } = useTheme();

  const [selectedPresetId, setSelectedPresetId] = useState<string>('bronchospasm');
  const [title, setTitle] = useState<string>(SURPRISE_PRESETS[0].title);
  const [description, setDescription] = useState<string>(SURPRISE_PRESETS[0].description);
  const [compliance, setCompliance] = useState<number>(SURPRISE_PRESETS[0].complianceOverride);
  const [resistance, setResistance] = useState<number>(SURPRISE_PRESETS[0].resistanceOverride);
  const [secretions, setSecretions] = useState<'none' | 'mild' | 'moderate' | 'severe'>(
    SURPRISE_PRESETS[0].secretionsOverride
  );
  const [leak, setLeak] = useState<number>(SURPRISE_PRESETS[0].leakOverride);
  const [spontaneousDrive, setSpontaneousDrive] = useState<boolean>(
    SURPRISE_PRESETS[0].spontaneousDriveOverride
  );
  const [spontaneousRate, setSpontaneousRate] = useState<number>(
    SURPRISE_PRESETS[0].spontaneousRateOverride
  );
  const [mapVal, setMapVal] = useState<number>(SURPRISE_PRESETS[0].mapOverride);

  const [isSending, setIsSending] = useState<boolean>(false);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: SurprisePreset) => {
    audioEngine.playClick(900);
    setSelectedPresetId(preset.id);
    setTitle(preset.title);
    setDescription(preset.description);
    setCompliance(preset.complianceOverride);
    setResistance(preset.resistanceOverride);
    setSecretions(preset.secretionsOverride);
    setLeak(preset.leakOverride);
    setSpontaneousDrive(preset.spontaneousDriveOverride);
    setSpontaneousRate(preset.spontaneousRateOverride);
    setMapVal(preset.mapOverride);
  };

  const handleDispatchSurprise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSending(true);
    audioEngine.playConfirmBeep();

    const surprisePayload = {
      id: `surp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      complianceOverride: compliance,
      resistanceOverride: resistance,
      secretionsOverride: secretions,
      leakOverride: leak,
      spontaneousDriveOverride: spontaneousDrive,
      spontaneousRateOverride: spontaneousRate,
      mapOverride: mapVal,
      timestamp: Date.now(),
    };

    try {
      await localDatabase.publishRoomState(roomCode, {
        surpriseEvent: surprisePayload,
      });

      setSentSuccess(true);
      if (onEventDispatched) {
        onEventDispatched(`Evento "${title.trim()}" disparado para a sala "${roomCode}"!`);
      }
      setTimeout(() => {
        setSentSuccess(false);
        setIsSending(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.warn('Erro ao disparar evento surpresa:', err);
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all ${
          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0a0d18] border-amber-500/60 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isLight
              ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white'
              : 'bg-gradient-to-r from-[#1b1406] via-[#241a08] to-[#171224] border-amber-900/60 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 shadow-md font-black">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                  Painel de Injeção de Crises do Professor
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-black bg-amber-400 text-slate-950 uppercase">
                  SALA: {roomCode}
                </span>
              </div>
              <h3 className="text-base font-display font-black leading-tight">
                Disparar Evento Clínico Surpresa
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-amber-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleDispatchSurprise} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Preset Buttons Grid */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 block">
              1. Selecione um Modelo de Crise Surpresa ou Edite Abaixo:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SURPRISE_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      isSelected
                        ? isLight
                          ? 'bg-amber-100 border-amber-500 text-amber-950 font-bold shadow-md ring-2 ring-amber-400'
                          : 'bg-[#221808] border-amber-400 text-amber-200 font-bold shadow-lg ring-1 ring-amber-400/80'
                        : isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-[#101322] hover:bg-[#181d33] border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/20 text-amber-300 w-fit font-bold">
                      {preset.category}
                    </span>
                    <span className="text-xs font-display font-bold leading-tight truncate">
                      {preset.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Edit Event Details */}
          <div className={`p-4 rounded-2xl border space-y-3.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e1120] border-zinc-800'
          }`}>
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                Título do Alerta (Exibido aos Alunos):
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border outline-none ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#161a2e] border-zinc-700 text-amber-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                Descrição Clínica & Orientação de Emergência:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                required
                className={`w-full px-3 py-2 rounded-xl text-xs font-sans border outline-none leading-relaxed ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#161a2e] border-zinc-700 text-zinc-200'
                }`}
              />
            </div>

            {/* Custom Physiological Parameters Sliders */}
            <div className="pt-2 border-t border-inherit space-y-3">
              <span className="text-xs font-mono font-bold uppercase text-amber-400 block">
                Impacto Fisiológico Personalizado:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                {/* Compliance */}
                <div className={`p-3 rounded-xl border space-y-1 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#141829] border-zinc-800'
                }`}>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-bold">Complacência (Cst):</span>
                    <span className="text-cyan-400 font-bold">{compliance} mL/cmH₂O</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={60}
                    step={1}
                    value={compliance}
                    onChange={(e) => setCompliance(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-zinc-800 cursor-pointer"
                  />
                </div>

                {/* Resistance */}
                <div className={`p-3 rounded-xl border space-y-1 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#141829] border-zinc-800'
                }`}>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-bold">Resistência (Raw):</span>
                    <span className="text-amber-400 font-bold">{resistance} cmH₂O/(L/s)</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={35}
                    step={1}
                    value={resistance}
                    onChange={(e) => setResistance(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 cursor-pointer"
                  />
                </div>

                {/* Secretions */}
                <div className={`p-3 rounded-xl border space-y-1 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#141829] border-zinc-800'
                }`}>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-bold">Secreções:</span>
                    <span className="text-purple-400 font-bold uppercase">{secretions}</span>
                  </div>
                  <select
                    value={secretions}
                    onChange={(e) => setSecretions(e.target.value as any)}
                    className={`w-full py-1 px-2 rounded border text-xs outline-none ${
                      isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#1b2038] border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <option value="none">Nenhuma</option>
                    <option value="mild">Leve</option>
                    <option value="moderate">Moderada</option>
                    <option value="severe">Severa (Rolha de Secreção)</option>
                  </select>
                </div>

                {/* Circuit Leak */}
                <div className={`p-3 rounded-xl border space-y-1 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#141829] border-zinc-800'
                }`}>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-bold">Fuga de Cuff/Circuito:</span>
                    <span className="text-rose-400 font-bold">{leak}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={leak}
                    onChange={(e) => setLeak(Number(e.target.value))}
                    className="w-full accent-rose-400 h-1.5 bg-zinc-800 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Dispatch Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
              }`}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSending}
              className={`px-6 py-2.5 rounded-xl text-slate-950 font-mono font-black text-xs shadow-xl flex items-center gap-2 cursor-pointer transition-all ${
                sentSuccess
                  ? 'bg-emerald-400 text-slate-950 font-black'
                  : 'bg-amber-400 hover:bg-amber-300 active:scale-95 shadow-amber-500/20'
              }`}
            >
              {sentSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>EVENTO DISPARADO COM SUCESSO!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 fill-current" />
                  <span>DISPARAR SURPRESA PARA A SALA</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
