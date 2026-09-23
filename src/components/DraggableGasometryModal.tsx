import React from 'react';
import { MonitoredData, PatientParameters, VentilatorSettings } from '../types/ventilation';
import { DraggableWindow } from './DraggableWindow';
import { FileText, Zap, HeartPulse, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  getPhGrade,
  getPaco2Grade,
  getPao2Grade,
  getHco3Grade,
  getBeGrade,
  getSpo2Grade,
  getPfGrade,
} from '../utils/gasometryColors';
import { useTheme } from '../context/ThemeContext';

interface DraggableGasometryModalProps {
  isOpen: boolean;
  onClose: () => void;
  monitored: MonitoredData;
  patient: PatientParameters;
  settings?: VentilatorSettings;
}

export const DraggableGasometryModal: React.FC<DraggableGasometryModalProps> = ({
  isOpen,
  onClose,
  monitored,
  patient,
  settings,
}) => {
  const { isLight } = useTheme();

  if (!isOpen) return null;

  const currentPh = monitored?.ph ?? 7.40;
  const currentPaco2 = monitored?.paco2 ?? 40;
  const currentPao2 = monitored?.pao2 ?? 90;
  const currentHco3 = monitored?.hco3 ?? 24;
  const currentBe = monitored?.baseExcess ?? 0;
  const currentSpo2 = monitored?.spo2 ?? 98;
  const currentPf = monitored?.pfRatio ?? 300;
  const currentDeadSpace = patient?.deadSpaceFraction ?? 0.3;

  const phG = getPhGrade(currentPh);
  const paco2G = getPaco2Grade(currentPaco2);
  const pao2G = getPao2Grade(currentPao2);
  const hco3G = getHco3Grade(currentHco3);
  const beG = getBeGrade(currentBe);
  const spo2G = getSpo2Grade(currentSpo2);
  const pfG = getPfGrade(currentPf);

  // Clinical Diagnostic Synthesis
  let acidBaseStatus = 'Equilíbrio Ácido-Base Normal';
  let acidBaseColor = isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold';

  if (currentPh < 7.35) {
    if (currentPaco2 > 45) {
      acidBaseStatus = currentPh < 7.25 ? 'Acidose Respiratória Aguda Grave' : 'Acidose Respiratória Aguda';
      acidBaseColor = isLight ? 'text-rose-700 font-bold' : 'text-rose-400 font-bold';
    } else {
      acidBaseStatus = 'Acidose Metabólica / Mista';
      acidBaseColor = isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold';
    }
  } else if (currentPh > 7.45) {
    if (currentPaco2 < 35) {
      acidBaseStatus = 'Alcalose Respiratória (Hiperventilação)';
      acidBaseColor = isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold';
    } else {
      acidBaseStatus = 'Alcalose Metabólica';
      acidBaseColor = isLight ? 'text-purple-700 font-bold' : 'text-purple-400 font-bold';
    }
  }

  // Oxygenation status
  let oxStatus = 'Oxigenação Adequada';
  let oxBadge = isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50';

  if (currentPf < 100) {
    oxStatus = 'SDRA Grave (P/F < 100)';
    oxBadge = isLight ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse' : 'bg-rose-950/90 text-rose-200 border-rose-600/80 animate-pulse';
  } else if (currentPf < 200) {
    oxStatus = 'SDRA Moderada (P/F 100–200)';
    oxBadge = isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-950/80 text-rose-300 border-rose-700/60';
  } else if (currentPf < 300) {
    oxStatus = 'SDRA Leve (P/F 200–300)';
    oxBadge = isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950/80 text-amber-300 border-amber-700/60';
  }

  return (
    <DraggableWindow
      id="gasometry-window"
      title="Gasometria Arterial & Equilíbrio Ácido-Base"
      subtitle="Janela flutuante arrastável • Arraste pelo cabeçalho para posicionar"
      icon={<FileText className="w-4 h-4 text-cyan-500" />}
      isOpen={isOpen}
      onClose={onClose}
      initialX={Math.max(20, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 560)}
      initialY={75}
      width="w-[520px] max-w-[95vw]"
      maxHeight="max-h-[82vh]"
    >
      <div className="space-y-3 font-sans">
        {/* Top Summary Banner */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#12141c] border-zinc-800'
        }`}>
          <div>
            <span className={`text-[10px] font-mono block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              DIAGNÓSTICO GASOMÉTRICO
            </span>
            <span className={`text-xs font-display ${acidBaseColor}`}>
              {acidBaseStatus}
            </span>
          </div>

          <div className="text-right">
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border inline-block ${oxBadge}`}>
              {oxStatus}
            </span>
          </div>
        </div>

        {/* Primary Parameters Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* pH */}
          <div className={`p-2 rounded-xl border ${phG.bgClass} ${phG.borderClass}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono font-bold ${phG.textClass}`}>pH</span>
              <span className="text-[8px] font-mono text-zinc-500">7.35–7.45</span>
            </div>
            <div className={`text-xl font-black font-mono mt-0.5 ${phG.textClass}`}>
              {currentPh.toFixed(2)}
            </div>
            <span className={`text-[9px] font-mono block mt-0.5 truncate ${phG.textClass}`}>
              {phG.statusLabel}
            </span>
          </div>

          {/* PaCO2 */}
          <div className={`p-2 rounded-xl border ${paco2G.bgClass} ${paco2G.borderClass}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono font-bold ${paco2G.textClass}`}>PaCO₂</span>
              <span className="text-[8px] font-mono text-zinc-500">35–45</span>
            </div>
            <div className={`text-xl font-black font-mono mt-0.5 ${paco2G.textClass}`}>
              {currentPaco2.toFixed(1)} <span className="text-[10px] font-normal">mmHg</span>
            </div>
            <span className={`text-[9px] font-mono block mt-0.5 truncate ${paco2G.textClass}`}>
              {paco2G.statusLabel}
            </span>
          </div>

          {/* PaO2 */}
          <div className={`p-2 rounded-xl border ${pao2G.bgClass} ${pao2G.borderClass}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono font-bold ${pao2G.textClass}`}>PaO₂</span>
              <span className="text-[8px] font-mono text-zinc-500">80–100</span>
            </div>
            <div className={`text-xl font-black font-mono mt-0.5 ${pao2G.textClass}`}>
              {currentPao2.toFixed(1)} <span className="text-[10px] font-normal">mmHg</span>
            </div>
            <span className={`text-[9px] font-mono block mt-0.5 truncate ${pao2G.textClass}`}>
              {pao2G.statusLabel}
            </span>
          </div>

          {/* HCO3 */}
          <div className={`p-2 rounded-xl border ${hco3G.bgClass} ${hco3G.borderClass}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono font-bold ${hco3G.textClass}`}>HCO₃⁻</span>
              <span className="text-[8px] font-mono text-zinc-500">22–26</span>
            </div>
            <div className={`text-xl font-black font-mono mt-0.5 ${hco3G.textClass}`}>
              {currentHco3.toFixed(1)} <span className="text-[10px] font-normal">mEq/L</span>
            </div>
            <span className={`text-[9px] font-mono block mt-0.5 truncate ${hco3G.textClass}`}>
              {hco3G.statusLabel}
            </span>
          </div>

          {/* Base Excess */}
          <div className={`p-2 rounded-xl border ${beG.bgClass} ${beG.borderClass}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono font-bold ${beG.textClass}`}>Base Excess</span>
              <span className="text-[8px] font-mono text-zinc-500">-2 a +2</span>
            </div>
            <div className={`text-xl font-black font-mono mt-0.5 ${beG.textClass}`}>
              {currentBe > 0 ? `+${currentBe.toFixed(1)}` : currentBe.toFixed(1)}
            </div>
            <span className={`text-[9px] font-mono block mt-0.5 truncate ${beG.textClass}`}>
              {beG.statusLabel}
            </span>
          </div>

          {/* Relacao P/F */}
          <div className={`p-2 rounded-xl border ${pfG.bgClass} ${pfG.borderClass}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono font-bold ${pfG.textClass}`}>Relação P/F</span>
              <span className="text-[8px] font-mono text-zinc-500">&gt; 300</span>
            </div>
            <div className={`text-xl font-black font-mono mt-0.5 ${pfG.textClass}`}>
              {currentPf.toFixed(0)}
            </div>
            <span className={`text-[9px] font-mono block mt-0.5 truncate ${pfG.textClass}`}>
              {pfG.statusLabel}
            </span>
          </div>
        </div>

        {/* Secondary Parameters (EtCO2, AaDO2, SpO2) */}
        <div className={`p-2.5 rounded-xl border text-xs grid grid-cols-3 gap-2 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#12141c] border-zinc-800'
        }`}>
          <div>
            <span className={`text-[10px] font-mono block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              EtCO₂ (Capnometria)
            </span>
            <span className={`text-sm font-bold font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
              {monitored.etco2 ?? 36} mmHg
            </span>
            <span className="text-[9px] font-mono text-zinc-500 block">Vd/Vt: {(currentDeadSpace * 100).toFixed(0)}%</span>
          </div>

          <div>
            <span className={`text-[10px] font-mono block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Gradiente A-a DO₂
            </span>
            <span className={`text-sm font-bold font-mono ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
              {monitored.aaGradient ?? 12} mmHg
            </span>
            <span className="text-[9px] font-mono text-zinc-500 block">Ref: &lt; 15-20</span>
          </div>

          <div>
            <span className={`text-[10px] font-mono block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              SpO₂ Arterial
            </span>
            <span className={`text-sm font-bold font-mono ${spo2G.textClass}`}>
              {currentSpo2.toFixed(0)}%
            </span>
            <span className="text-[9px] font-mono text-zinc-500 block">FiO₂ atual: {settings?.fio2 ?? 21}%</span>
          </div>
        </div>

        {/* Clinical Suggestions */}
        <div className={`p-3 rounded-xl border text-[11px] leading-relaxed space-y-1 ${
          isLight ? 'bg-cyan-50/90 border-cyan-200 text-cyan-950' : 'bg-[#0d1420] border-cyan-800/50 text-cyan-200'
        }`}>
          <div className="flex items-center gap-1.5 font-bold font-display">
            <Zap className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span>Conduta Fisioterapêutica e Ventilatória Sugerida:</span>
          </div>
          {currentPh < 7.35 && currentPaco2 > 45 && (
            <p>
              • Retenção de CO₂ detectada. Para corrigir a acidose sem gerar barotrauma, aumente gradualmente o Volume Minuto (elevando a FR ou o Vt se a Driving Pressure &le; 15 cmH₂O permitir).
            </p>
          )}
          {currentPh > 7.45 && currentPaco2 < 35 && (
            <p>
              • Alcalose por hiperventilação. Reduza a Frequência Respiratória mandatória ou reduza o Volume Corrente/Pressão Inspiratória para evitar alcalemia sistêmica.
            </p>
          )}
          {currentPf < 200 && (
            <p>
              • Relação P/F comprometida (SDRA moderada/grave). Otimize a PEEP titulando-a para manter alvéolos recrutados sem ultrapassar Pplat 30 cmH₂O. Ajuste a FiO₂ para meta de SpO₂ 92–96%.
            </p>
          )}
          {currentPh >= 7.35 && currentPh <= 7.45 && currentPf >= 300 && (
            <p>
              • Gasometria em padrões ideais de proteção pulmonar e equilíbrio ácido-base. Mantenha os parâmetros atuais.
            </p>
          )}
        </div>
      </div>
    </DraggableWindow>
  );
};
