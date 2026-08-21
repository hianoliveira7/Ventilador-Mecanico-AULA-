import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  X,
  Wind,
  Heart,
  Bell,
  Sliders,
  Play,
  CheckCircle2,
  Activity,
  Droplets,
  Syringe,
  Building2,
  Sparkles,
} from 'lucide-react';
import { audioEngine, AudioSettings } from '../services/audioEngine';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spo2: number;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  spo2,
}) => {
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(audioEngine.getSettings());
  const [isMuted, setIsMuted] = useState<boolean>(audioEngine.getMuted());
  const [contextState, setContextState] = useState<string>(audioEngine.getContextState());
  const [activeTestSound, setActiveTestSound] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAudioSettings(audioEngine.getSettings());
      setIsMuted(audioEngine.getMuted());
      setContextState(audioEngine.getContextState());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = (partial: Partial<AudioSettings>) => {
    audioEngine.updateSettings(partial);
    setAudioSettings(audioEngine.getSettings());
    audioEngine.playClick(950);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioEngine.setMuted(next);
  };

  const handleUnlockAudio = async () => {
    await audioEngine.resumeAudio();
    setContextState(audioEngine.getContextState());
  };

  const playPreview = (type: string, fn: () => void) => {
    handleUnlockAudio();
    setActiveTestSound(type);
    fn();
    setTimeout(() => {
      setActiveTestSound(null);
    }, 1800);
  };

  const applyPreset = (preset: 'full-icu' | 'vent-only' | 'vent-monitor' | 'quiet') => {
    handleUnlockAudio();
    if (preset === 'full-icu') {
      handleUpdate({
        soundEnabled: true,
        breathSoundsEnabled: true,
        pulseOxToneEnabled: true,
        icuAmbianceEnabled: true,
        infusionPumpEnabled: true,
        humidifierBubblerEnabled: true,
        alarmsEnabled: true,
        breathVolume: 0.9,
        pulseOxVolume: 0.65,
        ambianceVolume: 0.45,
      });
      if (isMuted) handleToggleMute();
    } else if (preset === 'vent-only') {
      handleUpdate({
        soundEnabled: true,
        breathSoundsEnabled: true,
        pulseOxToneEnabled: false,
        icuAmbianceEnabled: false,
        infusionPumpEnabled: false,
        humidifierBubblerEnabled: true,
        alarmsEnabled: true,
        breathVolume: 1.0,
      });
      if (isMuted) handleToggleMute();
    } else if (preset === 'vent-monitor') {
      handleUpdate({
        soundEnabled: true,
        breathSoundsEnabled: true,
        pulseOxToneEnabled: true,
        icuAmbianceEnabled: false,
        infusionPumpEnabled: false,
        humidifierBubblerEnabled: true,
        alarmsEnabled: true,
        breathVolume: 0.9,
        pulseOxVolume: 0.7,
      });
      if (isMuted) handleToggleMute();
    } else if (preset === 'quiet') {
      handleUpdate({
        breathSoundsEnabled: false,
        pulseOxToneEnabled: false,
        icuAmbianceEnabled: false,
        infusionPumpEnabled: false,
        humidifierBubblerEnabled: false,
        alarmsEnabled: true, // keep alarms for clinical safety
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-[#0a0a0e] border border-zinc-800 rounded-sm w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-3.5 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-sm bg-[#0e1626] border border-cyan-800/80 text-cyan-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-display font-bold text-zinc-100 flex items-center gap-2">
                Central de Acústica e Sons Reais da UTI
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Síntese procedural: Pneumática, oxímetro, bombas de infusão, gases medicinais e alarmes ISO.
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

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 font-sans text-xs">
          {/* Audio Engine Status Banner */}
          <div className="bg-[#070709] p-3 rounded-sm border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  contextState === 'running' && !isMuted && audioSettings.soundEnabled
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-amber-400'
                }`}
              />
              <div>
                <span className="font-bold text-zinc-200 block font-mono">
                  Sintetizador Web Audio API:{' '}
                  <span
                    className={
                      contextState === 'running' ? 'text-emerald-400' : 'text-amber-400'
                    }
                  >
                    {contextState === 'running' ? 'ATIVO & SINTETIZANDO' : 'AGUARDANDO INTERAÇÃO'}
                  </span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Áudio sintetizado matematicamente em tempo real (resposta precisa de milissegundos).
                </span>
              </div>
            </div>

            <button
              onClick={handleUnlockAudio}
              className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs rounded-sm shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ativar / Testar Áudio</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-2">
            <span className="font-display font-bold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Perfis de Ambiência Pré-definidos</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => applyPreset('full-icu')}
                className="p-2 bg-[#121824] hover:bg-[#1a2336] border border-cyan-800/60 hover:border-cyan-500 text-cyan-300 rounded-sm text-center transition-all cursor-pointer flex flex-col items-center gap-1"
              >
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-[11px]">🏥 UTI Completa</span>
                <span className="text-[9px] text-zinc-400">Todos os sons hospitalares</span>
              </button>

              <button
                onClick={() => applyPreset('vent-monitor')}
                className="p-2 bg-[#14121c] hover:bg-[#201c2e] border border-purple-800/60 hover:border-purple-500 text-purple-300 rounded-sm text-center transition-all cursor-pointer flex flex-col items-center gap-1"
              >
                <Heart className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-[11px]">💓 Vent + Monitor</span>
                <span className="text-[9px] text-zinc-400">Respiração e SpO₂</span>
              </button>

              <button
                onClick={() => applyPreset('vent-only')}
                className="p-2 bg-[#0e161c] hover:bg-[#16222c] border border-teal-800/60 hover:border-teal-500 text-teal-300 rounded-sm text-center transition-all cursor-pointer flex flex-col items-center gap-1"
              >
                <Wind className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-[11px]">🌬️ Só Ventilador</span>
                <span className="text-[9px] text-zinc-400">Apenas pneumática pura</span>
              </button>

              <button
                onClick={() => applyPreset('quiet')}
                className="p-2 bg-[#151518] hover:bg-[#202025] border border-zinc-700/60 hover:border-zinc-500 text-zinc-300 rounded-sm text-center transition-all cursor-pointer flex flex-col items-center gap-1"
              >
                <VolumeX className="w-4 h-4 text-zinc-400" />
                <span className="font-bold text-[11px]">🔕 Silencioso</span>
                <span className="text-[9px] text-zinc-400">Apenas alarmes ativos</span>
              </button>
            </div>
          </div>

          {/* Master Volume & Quick Mute */}
          <div className="bg-[#0e0f14] p-3.5 rounded-sm border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Volume Principal</span>
              </span>
              <button
                onClick={handleToggleMute}
                className={`px-2.5 py-1 rounded-sm text-xs font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : 'bg-[#161720] text-zinc-300 border-zinc-700 hover:bg-[#222432]'
                }`}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMuted ? 'Mudo (Desativado)' : 'Ativo'}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <VolumeX className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={audioSettings.masterVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  audioEngine.setMasterVolume(val);
                  setAudioSettings((prev) => ({ ...prev, masterVolume: val }));
                  audioEngine.playRotaryTick();
                }}
                className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-none cursor-pointer"
              />
              <span className="font-mono font-bold text-cyan-400 w-10 text-right">
                {Math.round(audioSettings.masterVolume * 100)}%
              </span>
            </div>
          </div>

          {/* Sound Modules Grid */}
          <div className="space-y-2">
            <span className="font-display font-bold text-zinc-400 uppercase tracking-wider text-[10px] block px-1">
              Canais Acústicos Detalhados
            </span>

            {/* 1. Ventilator Pneumatics & Servo-valve */}
            <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-sm bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
                    <Wind className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-200 block">
                      1. Ruído Ventilatório Pneumático (Servo-Válvula)
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Clique mecânico da válvula de entrada, fluxo contínuo e descompressão exalatória.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      playPreview('breath', () => {
                        audioEngine.playBreathInspSound(0.9, 60, 8);
                        setTimeout(() => audioEngine.playBreathExpSound(1.2, 8), 950);
                      })
                    }
                    className="px-2 py-1 bg-[#161720] hover:bg-[#222432] text-zinc-300 border border-zinc-700 rounded-sm font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                    title="Ouvir ciclo completo de respiração"
                  >
                    <Play className="w-2.5 h-2.5 text-cyan-400" />
                    <span>Ouvir</span>
                  </button>
                  <button
                    onClick={() =>
                      handleUpdate({ breathSoundsEnabled: !audioSettings.breathSoundsEnabled })
                    }
                    className={`px-3 py-1 rounded-sm font-mono font-bold text-xs border transition-all cursor-pointer ${
                      audioSettings.breathSoundsEnabled
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {audioSettings.breathSoundsEnabled ? 'LIGADO' : 'DESLIGADO'}
                  </button>
                </div>
              </div>

              {audioSettings.breathSoundsEnabled && (
                <div className="flex items-center gap-3 pt-1 border-t border-zinc-800/40">
                  <span className="text-[10px] text-zinc-400 font-mono w-24">Volume Respiração:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioSettings.breathVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleUpdate({ breathVolume: val });
                    }}
                    className="w-full accent-cyan-400 h-1 bg-zinc-800 cursor-pointer"
                  />
                  <span className="font-mono text-cyan-400 text-[10px] w-8 text-right">
                    {Math.round(audioSettings.breathVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* 2. Pulse Oximeter Tone (SpO2 Beep) */}
            <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-sm bg-purple-950/60 border border-purple-800/40 text-purple-400">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-200 block">
                      2. Monitor Multiparâmetro / Oxímetro (SpO₂)
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Tom harmônico duplo com frequência modulada por saturação ({spo2}% SpO₂).
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      playPreview('spo2', () => {
                        audioEngine.playSpO2Pulse(spo2);
                      })
                    }
                    className="px-2 py-1 bg-[#161720] hover:bg-[#222432] text-zinc-300 border border-zinc-700 rounded-sm font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                    title="Ouvir bip do oxímetro"
                  >
                    <Play className="w-2.5 h-2.5 text-purple-400" />
                    <span>Ouvir</span>
                  </button>
                  <button
                    onClick={() =>
                      handleUpdate({ pulseOxToneEnabled: !audioSettings.pulseOxToneEnabled })
                    }
                    className={`px-3 py-1 rounded-sm font-mono font-bold text-xs border transition-all cursor-pointer ${
                      audioSettings.pulseOxToneEnabled
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {audioSettings.pulseOxToneEnabled ? 'LIGADO' : 'DESLIGADO'}
                  </button>
                </div>
              </div>

              {audioSettings.pulseOxToneEnabled && (
                <div className="flex items-center gap-3 pt-1 border-t border-zinc-800/40">
                  <span className="text-[10px] text-zinc-400 font-mono w-24">Volume Oxímetro:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioSettings.pulseOxVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleUpdate({ pulseOxVolume: val });
                    }}
                    className="w-full accent-purple-400 h-1 bg-zinc-800 cursor-pointer"
                  />
                  <span className="font-mono text-purple-400 text-[10px] w-8 text-right">
                    {Math.round(audioSettings.pulseOxVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* 3. ICU Ambiance & Medical Gas Lines */}
            <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-sm bg-blue-950/60 border border-blue-800/40 text-blue-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-200 block">
                      3. Ambiência da UTI & Linhas de Gases Medicinais
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Fluxo de ar laminar, zumbido elétrico 60Hz e ecos distantes de leitos adjacentes.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      playPreview('distant', () => {
                        audioEngine.playDistantIcuBeep();
                      })
                    }
                    className="px-2 py-1 bg-[#161720] hover:bg-[#222432] text-zinc-300 border border-zinc-700 rounded-sm font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                    title="Ouvir eco distante de leito"
                  >
                    <Play className="w-2.5 h-2.5 text-blue-400" />
                    <span>Ouvir</span>
                  </button>
                  <button
                    onClick={() =>
                      handleUpdate({ icuAmbianceEnabled: !audioSettings.icuAmbianceEnabled })
                    }
                    className={`px-3 py-1 rounded-sm font-mono font-bold text-xs border transition-all cursor-pointer ${
                      audioSettings.icuAmbianceEnabled
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {audioSettings.icuAmbianceEnabled ? 'LIGADO' : 'DESLIGADO'}
                  </button>
                </div>
              </div>

              {audioSettings.icuAmbianceEnabled && (
                <div className="flex items-center gap-3 pt-1 border-t border-zinc-800/40">
                  <span className="text-[10px] text-zinc-400 font-mono w-24">Volume Ambiência:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioSettings.ambianceVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleUpdate({ ambianceVolume: val });
                    }}
                    className="w-full accent-blue-400 h-1 bg-zinc-800 cursor-pointer"
                  />
                  <span className="font-mono text-blue-400 text-[10px] w-8 text-right">
                    {Math.round(audioSettings.ambianceVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* 4. Infusion Pump & Circuit Bubbler Sub-controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Infusion pump */}
              <div className="bg-[#0e0f14] p-2.5 rounded-sm border border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Syringe className="w-3.5 h-3.5 text-amber-400" />
                  <div>
                    <span className="font-bold text-zinc-200 block text-[11px]">Bomba de Infusão</span>
                    <span className="text-[9px] text-zinc-400 font-mono">Chirps clínicos periódicos</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      playPreview('pump', () => {
                        audioEngine.playInfusionPumpChime();
                      })
                    }
                    className="p-1 bg-[#161720] hover:bg-[#222432] text-zinc-300 border border-zinc-700 rounded-sm cursor-pointer"
                    title="Testar som da bomba de infusão"
                  >
                    <Play className="w-2.5 h-2.5 text-amber-400" />
                  </button>
                  <button
                    onClick={() =>
                      handleUpdate({ infusionPumpEnabled: !audioSettings.infusionPumpEnabled })
                    }
                    className={`px-2 py-0.5 rounded-sm font-mono font-bold text-[10px] border transition-all cursor-pointer ${
                      audioSettings.infusionPumpEnabled
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {audioSettings.infusionPumpEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Circuit bubbler */}
              <div className="bg-[#0e0f14] p-2.5 rounded-sm border border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-teal-400" />
                  <div>
                    <span className="font-bold text-zinc-200 block text-[11px]">Umidificador Aquecido</span>
                    <span className="text-[9px] text-zinc-400 font-mono">Microborbulhas no circuito</span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleUpdate({
                      humidifierBubblerEnabled: !audioSettings.humidifierBubblerEnabled,
                    })
                  }
                  className={`px-2 py-0.5 rounded-sm font-mono font-bold text-[10px] border transition-all cursor-pointer ${
                    audioSettings.humidifierBubblerEnabled
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}
                >
                  {audioSettings.humidifierBubblerEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Acoustic Test Board */}
          <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-2">
            <span className="font-display font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
              Testes Acústicos Fisiológicos e Clínicos
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() =>
                  playPreview('high-alarm', () => {
                    audioEngine.triggerAlarmPattern('high');
                    setTimeout(() => audioEngine.stopAlarm(), 2200);
                  })
                }
                className="p-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-sm font-mono text-[10px] font-bold text-center transition-all cursor-pointer flex flex-col items-center gap-1"
              >
                <Bell className="w-3.5 h-3.5 text-rose-400" />
                <span>Alarme Alto (960Hz)</span>
                <span className="text-[8px] text-zinc-400 font-sans font-normal">3 + 2 bipes ISO</span>
              </button>

              <button
                onClick={() =>
                  playPreview('wheeze', () => {
                    audioEngine.playBreathInspSound(0.8, 60, 22);
                    setTimeout(() => audioEngine.playBreathExpSound(1.4, 22), 850);
                  })
                }
                className="p-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800 text-amber-300 rounded-sm font-mono text-[10px] font-bold text-center transition-all cursor-pointer flex flex-col items-center gap-1"
              >
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                <span>Sibilo Exalatório</span>
                <span className="text-[8px] text-zinc-400 font-sans font-normal">Alta Resistência (DPOC)</span>
              </button>

              <button
                onClick={() =>
                  playPreview('spo2-hypox', () => {
                    audioEngine.playSpO2Pulse(74);
                  })
                }
                className="p-2 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800 text-purple-300 rounded-sm font-mono text-[10px] font-bold text-center transition-all cursor-pointer flex flex-col items-center gap-1"
              >
                <Heart className="w-3.5 h-3.5 text-purple-400" />
                <span>SpO₂ Baixo (74%)</span>
                <span className="text-[8px] text-zinc-400 font-sans font-normal">Grave Hipoxemia</span>
              </button>

              <button
                onClick={() =>
                  playPreview('trigger', () => {
                    audioEngine.playTriggerSound();
                  })
                }
                className="p-2 bg-teal-950/40 hover:bg-teal-900/60 border border-teal-800 text-teal-300 rounded-sm font-mono text-[10px] font-bold text-center transition-all cursor-pointer flex flex-col items-center gap-1"
              >
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                <span>Trigger Paciente</span>
                <span className="text-[8px] text-zinc-400 font-sans font-normal">Chirp de Esforço</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0e0f14] border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-mono">
            Motor Acústico Hospitalar VR-COMAM v3.0 • Síntese em Tempo Real
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs rounded-sm transition-all cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
