import React, { useState } from 'react';
import { AsynchronyPreset } from '../data/asynchroniesData';
import { VentilatorSettings, PatientParameters, MonitoredData } from '../types/ventilation';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Award,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface AsynchronyResolutionBannerProps {
  asynchrony: AsynchronyPreset;
  currentSettings: VentilatorSettings;
  currentPatient: PatientParameters;
  currentMonitored: MonitoredData;
  onOpenDatabase: () => void;
  onClose: () => void;
}

export const AsynchronyResolutionBanner: React.FC<AsynchronyResolutionBannerProps> = ({
  asynchrony,
  currentSettings,
  currentPatient,
  currentMonitored,
  onOpenDatabase,
  onClose,
}) => {
  const { isLight } = useTheme();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showTips, setShowTips] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    solved: boolean;
    title: string;
    message: string;
    actionAdvice: string;
  } | null>(null);

  // Clinical Resolution Verification Engine
  const handleVerifyResolution = () => {
    audioEngine.playClick(1000);
    const id = asynchrony.id;
    let isSolved = false;
    let title = '';
    let message = '';
    let actionAdvice = '';

    switch (id) {
      case 'esforco-ineficaz': {
        const peepOk = currentSettings.peep >= 6;
        const triggerOk = currentSettings.triggerSensitivity <= 2.2;
        const flowOk = currentSettings.inspiratoryFlow >= 55 || currentSettings.flowWaveform === 'decelerating';

        if (peepOk && triggerOk) {
          isSolved = true;
          title = 'Esforço Ineficaz Resolvido!';
          message = 'Você equilibrou a PEEP com a Auto-PEEP do paciente e otimizou a sensibilidade do disparo. O trabalho de disparo foi reduzido e todos os esforços musculares agora disparam o ventilador.';
          actionAdvice = 'Excelente condução! O paciente não sofre mais com fadiga por esforços frustrados.';
        } else if (!peepOk) {
          title = 'Auto-PEEP ainda não neutralizada';
          message = `A PEEP extrínseca atual (${currentSettings.peep} cmH₂O) ainda está muito baixa para neutralizar a Auto-PEEP medida (~${currentMonitored.autoPeep.toFixed(1)} cmH₂O).`;
          actionAdvice = 'Titule a PEEP para 6 a 8 cmH₂O (cerca de 75-80% da Auto-PEEP) para aliviar a carga limiar dos músculos.';
        } else {
          title = 'Sensibilidade do Disparo Insensível';
          message = `O limiar de disparo está ajustado em ${currentSettings.triggerSensitivity} L/min, exigindo esforço muscular desnecessário.`;
          actionAdvice = 'Ajuste a sensibilidade a fluxo para 1.5 a 2.0 L/min para facilitar a decolagem do ciclo.';
        }
        break;
      }

      case 'duplo-disparo': {
        const vtPerKg = currentSettings.tidalVolume / (currentPatient.idealBodyWeightKg || 57);
        const vtOk = vtPerKg >= 5.8 && currentSettings.tidalVolume >= 340;
        const tiProlonged =
          (currentSettings.inspiratoryTimePCV || 0) >= 0.85 ||
          currentSettings.inspiratoryFlow <= 65 ||
          (currentSettings.inspiratoryPausePercent || 0) >= 10 ||
          currentSettings.mode === 'PCV' ||
          currentSettings.mode === 'PSV';

        if (vtOk && tiProlonged) {
          isSolved = true;
          title = 'Duplo Disparo Eliminado!';
          message = 'Você adequou o volume corrente e prolongou o tempo inspiratório mecânico, harmonizando o ciclo do ventilador com o tempo neural do paciente.';
          actionAdvice = 'Volume empilhado e risco de volutrauma foram extintos com sucesso!';
        } else if (!vtOk) {
          title = 'Volume Corrente Subdimensionado';
          message = `O Vt atual (${currentSettings.tidalVolume} mL, ~${vtPerKg.toFixed(1)} mL/kg) é muito baixo para o drive inspiratório da paciente, mantendo a fome de ar.`;
          actionAdvice = 'Aumente o Vt para a faixa de 360 - 400 mL (6 a 7 mL/kg de peso predito).';
        } else {
          title = 'Tempo Inspiratório Muito Curto';
          message = `O fluxo de ${currentSettings.inspiratoryFlow} L/min termina a inspiração mecânica muito rápido, antes do término da contração do diafragma da paciente.`;
          actionAdvice = 'Reduza o fluxo para 50-60 L/min ou aplique uma pausa inspiratória de 10% para prolongar o Ti mecânico.';
        }
        break;
      }

      case 'sede-de-fluxo': {
        const flowOk = currentSettings.inspiratoryFlow >= 60;
        const modeChanged = currentSettings.mode === 'PCV' || currentSettings.mode === 'PSV';

        if (flowOk || modeChanged) {
          isSolved = true;
          title = 'Sede de Fluxo Resolvida!';
          message = modeChanged
            ? 'A troca para modo pressórico (PCV/PSV) garante fluxo livre desacelerado que atende instantaneamente à demanda do paciente.'
            : 'Ao aumentar o fluxo inspiratório para mais de 60 L/min, você eliminou a concavidade e supriu o pico de demanda do paciente.';
          actionAdvice = 'Curva de pressão com morfologia anatômica restabelecida!';
        } else {
          title = 'Fluxo Inspiratório Ainda Insuficiente';
          message = `O fluxo fixado em ${currentSettings.inspiratoryFlow} L/min não atende ao drive vigoroso do paciente, gerando desabamento na curva de pressão.`;
          actionAdvice = 'Aumente o fluxo para 65 - 75 L/min em VCV ou alterne para modo PCV/PSV.';
        }
        break;
      }

      case 'auto-disparo': {
        const triggerDesensitized = currentSettings.triggerSensitivity >= 2.5;
        const leakFixed = (currentPatient.circuitLeakPercent || 0) <= 2;

        if (triggerDesensitized || leakFixed) {
          isSolved = true;
          title = 'Auto-Disparo Controlado!';
          message = 'Você eliminou os disparos espúrios provocados por ruído ou vazamento no circuito respiratório.';
          actionAdvice = 'Frequência do ventilador agora espelha o esforço biológico real do paciente.';
        } else {
          title = 'Gatilho Excessivamente Sensível';
          message = `Sensibilidade em ${currentSettings.triggerSensitivity} L/min com vazamento ou ruído no circuito está acionando ciclos involuntários.`;
          actionAdvice = 'Diminua a sensibilidade (ex: 3.0 L/min) ou selecione disparo por pressão (-2.0 cmH₂O).';
        }
        break;
      }

      case 'ciclagem-prematura': {
        const tiOk = (currentSettings.inspiratoryTimePCV || 0) >= 0.85 || currentSettings.expiratorySensitivity <= 25;
        if (tiOk) {
          isSolved = true;
          title = 'Ciclagem Prematura Corrigida!';
          message = 'O tempo inspiratório foi estendido, permitindo que a inspiração mecânica acompanhe todo o tempo inspiratório neural.';
          actionAdvice = 'Eliminou-se a espícula de pressão e o esforço expiratório reverso.';
        } else {
          title = 'Ciclagem Ainda Precoce';
          message = 'O ventilador continua interrompendo o fluxo antes do término da fase inspiratória do paciente.';
          actionAdvice = 'Aumente o tempo inspiratório (Ti) ou reduza a sensibilidade expiratória (Esens) para 20-25%.';
        }
        break;
      }

      case 'ciclagem-tardia': {
        const esensRaised = currentSettings.expiratorySensitivity >= 35;
        const tiReduced = (currentSettings.inspiratoryTimePCV || 1.0) <= 1.2;
        const modeResolved = currentSettings.mode === 'PSV' ? esensRaised : tiReduced;

        if (modeResolved || esensRaised || tiReduced) {
          isSolved = true;
          title = 'Ciclagem Tardia Resolvida!';
          message = 'Ao antecipar a ciclagem expiratória, você evitou que o paciente contraia a musculatura expiratória contra a válvula ainda aberta.';
          actionAdvice = 'Fim da sobreposição de esforço e redução da hiperinsuflação dinâmica.';
        } else {
          title = 'Ventilador Continua Insuflando Demais';
          message = `A sensibilidade expiratória em ${currentSettings.expiratorySensitivity}% mantém o fluxo inspiratório aberto mesmo após o paciente desejar expirar.`;
          actionAdvice = 'Aumente a sensibilidade expiratória (Esens) para 35% a 50% ou ajuste o tempo inspiratório.';
        }
        break;
      }

      case 'peep-inadequada': {
        if (currentSettings.peep >= 10) {
          isSolved = true;
          title = 'PEEP Adequada & Alvéolos Recrutados!';
          message = 'A PEEP titulada estabilizou o tecido pulmonar, prevenindo o atelectrauma cíclico e melhorando a oxigenação arterial.';
          actionAdvice = 'A complacência pulmonar e a oxigenação se elevaram satisfatoriamente.';
        } else {
          title = 'PEEP Insuficiente para SDRA';
          message = `PEEP em ${currentSettings.peep} cmH₂O mantém colapso alveolar cíclico ao final de cada expiração.`;
          actionAdvice = 'Titule a PEEP para 10 a 14 cmH₂O para manter alvéolos abertos e estabilizar a PaO₂.';
        }
        break;
      }

      case 'hiperinsuflacao-asma': {
        const rrLowered = currentSettings.respiratoryRate <= 14;
        const flowHigh = currentSettings.inspiratoryFlow >= 65;

        if (rrLowered && flowHigh) {
          isSolved = true;
          title = 'Hiperinsuflação Controlada!';
          message = 'Com frequência respiratória mais baixa e fluxo inspiratório rápido, você maximizou o tempo expiratório (Te), permitindo esvaziamento pulmonar completo.';
          actionAdvice = 'Fluxo expiratório agora zera antes do próximo ciclo, eliminando o risco de colapso hemodinâmico.';
        } else if (!rrLowered) {
          title = 'Frequência Respiratória Muito Alta';
          message = `FR em ${currentSettings.respiratoryRate} rpm não deixa tempo suficiente para a expiração de um pulmão obstrutivo.`;
          actionAdvice = 'Reduza a FR para 10 - 14 rpm para garantir tempo expiratório (Te > 3.5s).';
        } else {
          title = 'Aumente a Velocidade do Fluxo Inspiratório';
          message = 'Fluxo inspiratório moderado consome tempo precioso da fase inspiratória.';
          actionAdvice = 'Eleve o fluxo para 65 - 75 L/min para encurtar o tempo inspiratório e doar tempo para expirar.';
        }
        break;
      }

      default: {
        isSolved = true;
        title = 'Conduta Avaliada!';
        message = 'Os parâmetros ventilatórios foram reajustados para proteção pulmonar e sincronização clínica.';
        actionAdvice = 'Continue monitorando as curvas e loops para confirmar a resposta fisiológica.';
      }
    }

    if (isSolved) {
      audioEngine.playConfirmBeep();
    } else {
      audioEngine.playErrorBeep();
    }

    setVerificationResult({
      solved: isSolved,
      title,
      message,
      actionAdvice,
    });
  };

  return (
    <div className="relative z-30 mb-1.5 transition-all">
      <div
        className={`rounded-2xl border shadow-xl backdrop-blur-md overflow-hidden transition-all ${
          verificationResult?.solved
            ? 'bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-emerald-900/90 border-emerald-500/80 text-white'
            : isLight
            ? 'bg-gradient-to-r from-amber-50 via-white to-sky-50 border-amber-300 text-slate-900'
            : 'bg-gradient-to-r from-[#17120a] via-[#0d101a] to-[#0d1624] border-amber-500/50 text-zinc-100'
        }`}
      >
        {/* Top Header Bar of the Banner */}
        <div className="px-3.5 py-2 flex items-center justify-between gap-3 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                verificationResult?.solved
                  ? 'bg-emerald-500 text-white animate-bounce'
                  : 'bg-amber-500 text-slate-950 animate-pulse'
              }`}
            >
              {verificationResult?.solved ? <Award className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            </div>

            <div className="truncate">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full uppercase border ${
                    verificationResult?.solved
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  }`}
                >
                  {verificationResult?.solved ? 'Resolvido' : `Desafio: ${asynchrony.category}`}
                </span>
                <span className="text-[10px] font-mono opacity-70">
                  Dificuldade: <strong>{asynchrony.difficulty}</strong>
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-display font-black truncate">
                {asynchrony.title}
              </h3>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleVerifyResolution}
              className={`px-3 py-1 rounded-xl font-mono font-bold text-[11px] flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 ${
                verificationResult?.solved
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-2 ring-emerald-300'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 ring-1 ring-amber-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verificar Resolução</span>
            </button>

            <button
              onClick={onOpenDatabase}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-mono font-bold cursor-pointer transition-all ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
              }`}
              title="Trocar ou escolher outra assincronia do banco"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              <span>Trocar</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1 rounded-lg border cursor-pointer transition-all ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
              title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className={`p-1 rounded-lg border cursor-pointer transition-all hover:bg-rose-500 hover:text-white ${
                isLight
                  ? 'bg-white text-slate-600 border-slate-300'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
              }`}
              title="Encerrar Desafio de Assincronia"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Body */}
        {isExpanded && (
          <div className="p-3 text-xs space-y-2.5">
            {/* Feedback result banner if checked */}
            {verificationResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 animate-fade-in ${
                  verificationResult.solved
                    ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-100'
                    : 'bg-rose-950/50 border-rose-500/60 text-rose-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    verificationResult.solved ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                  }`}
                >
                  {verificationResult.solved ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-display font-black text-xs sm:text-sm">
                    {verificationResult.title}
                  </div>
                  <p className="text-[11.5px] leading-relaxed opacity-95">
                    {verificationResult.message}
                  </p>
                  <div
                    className={`mt-1 text-[11px] font-mono font-bold flex items-center gap-1.5 ${
                      verificationResult.solved ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    <span>👉 {verificationResult.actionAdvice}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnostic Guide and Objective */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div
                className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'
                }`}
              >
                <span className="font-mono font-bold uppercase text-amber-500 block mb-0.5">
                  👁️ O que você observa nas curvas:
                </span>
                <p className="opacity-90 leading-relaxed">
                  {asynchrony.waveformCharacteristics.pressure}
                </p>
              </div>

              <div
                className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono font-bold uppercase text-cyan-400 block">
                    🎯 Objetivo de Resolução do Aluno:
                  </span>
                  <button
                    onClick={() => setShowTips(!showTips)}
                    className="text-[10px] font-mono font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    {showTips ? 'Ocultar Dicas' : 'Ver Passo a Passo'}
                  </button>
                </div>
                <p className="opacity-90 leading-relaxed">
                  {asynchrony.successCondition}
                </p>
              </div>
            </div>

            {/* Step by step tips reveal */}
            {showTips && (
              <div
                className={`p-2.5 rounded-xl border animate-fadeIn ${
                  isLight ? 'bg-indigo-50/70 border-indigo-200 text-slate-800' : 'bg-indigo-950/30 border-indigo-800/40 text-indigo-200'
                }`}
              >
                <div className="font-mono font-bold text-[10px] uppercase tracking-wider text-indigo-400 mb-1.5 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Conduta Recomendada para Ajuste:</span>
                </div>
                <ul className="space-y-1 text-[11px] list-disc list-inside">
                  {asynchrony.solutionSteps.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
