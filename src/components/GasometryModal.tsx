import React from 'react';
import { MonitoredData, PatientParameters, VentilatorSettings } from '../types/ventilation';
import { FileText, X, AlertTriangle, CheckCircle2, HeartPulse, Activity, Zap } from 'lucide-react';

interface GasometryModalProps {
  isOpen: boolean;
  onClose: () => void;
  monitored: MonitoredData;
  patient: PatientParameters;
  settings: VentilatorSettings;
}

export const GasometryModal: React.FC<GasometryModalProps> = ({
  isOpen,
  onClose,
  monitored,
  patient,
  settings,
}) => {
  if (!isOpen) return null;

  // Clinical Diagnostic Synthesis
  let acidBaseStatus = 'Equilíbrio Ácido-Base Normal';
  let acidBaseColor = 'text-emerald-400';

  if (monitored.ph < 7.35) {
    if (monitored.paco2 > 45) {
      acidBaseStatus = monitored.ph < 7.25 ? 'Acidose Respiratória Aguda Grave' : 'Acidose Respiratória Aguda';
      acidBaseColor = 'text-red-400';
    } else {
      acidBaseStatus = 'Acidose Metabólica / Mista';
      acidBaseColor = 'text-red-400';
    }
  } else if (monitored.ph > 7.45) {
    if (monitored.paco2 < 35) {
      acidBaseStatus = 'Alcalose Respiratória (Hiperventilação)';
      acidBaseColor = 'text-amber-400';
    } else {
      acidBaseStatus = 'Alcalose Metabólica';
      acidBaseColor = 'text-amber-400';
    }
  }

  // Oxygenation status (Berlin Definition)
  let oxygenationStatus = 'Oxigenação Normal';
  let oxygenationColor = 'text-emerald-400';
  if (monitored.pfRatio < 100) {
    oxygenationStatus = 'Hipoxemia Grave (Critério SDRA Grave: P/F < 100)';
    oxygenationColor = 'text-red-500';
  } else if (monitored.pfRatio < 200) {
    oxygenationStatus = 'Hipoxemia Moderada (Critério SDRA Moderada: P/F 100-200)';
    oxygenationColor = 'text-amber-400';
  } else if (monitored.pfRatio < 300) {
    oxygenationStatus = 'Hipoxemia Leve (Critério SDRA Leve: P/F 200-300)';
    oxygenationColor = 'text-amber-300';
  }

  // Value colors
  const phColor =
    monitored.ph >= 7.35 && monitored.ph <= 7.45
      ? 'text-emerald-400'
      : monitored.ph < 7.30 || monitored.ph > 7.50
      ? 'text-rose-400 font-bold'
      : 'text-amber-400';

  const paco2Color =
    monitored.paco2 >= 35 && monitored.paco2 <= 45
      ? 'text-emerald-400'
      : monitored.paco2 < 30 || monitored.paco2 > 50
      ? 'text-rose-400 font-bold'
      : 'text-amber-400';

  const pao2Color =
    monitored.pao2 >= 80
      ? 'text-cyan-300'
      : monitored.pao2 >= 60
      ? 'text-amber-300'
      : 'text-rose-400 font-bold';

  const hco3Color =
    monitored.hco3 >= 22 && monitored.hco3 <= 26
      ? 'text-emerald-400'
      : 'text-amber-400';

  const beColor =
    monitored.baseExcess >= -2 && monitored.baseExcess <= 2
      ? 'text-emerald-400'
      : 'text-amber-400';

  const spo2Color =
    monitored.spo2 >= 92
      ? 'text-emerald-400'
      : monitored.spo2 >= 88
      ? 'text-amber-400'
      : 'text-rose-400 font-bold';

  const pfColor =
    monitored.pfRatio >= 300
      ? 'text-emerald-400'
      : monitored.pfRatio < 100
      ? 'text-rose-400 font-bold'
      : 'text-amber-400';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-[#0a0a0e] border border-zinc-800 rounded-sm w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-sm bg-[#0e1626] border border-cyan-800/80 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-zinc-100 flex items-center gap-2">
                Laudo de Gasometria Arterial
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Amostra de sangue arterial em tempo real ({patient.name})
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
          {/* Summary Status Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-1">
              <span className="text-[10px] font-display font-bold text-zinc-400 uppercase">
                Diagnóstico Ácido-Base
              </span>
              <p className={`text-sm font-bold font-mono ${acidBaseColor}`}>{acidBaseStatus}</p>
            </div>

            <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-1">
              <span className="text-[10px] font-display font-bold text-zinc-400 uppercase">
                Status de Oxigenação (Horovitz)
              </span>
              <p className={`text-sm font-bold font-mono ${oxygenationColor}`}>{oxygenationStatus}</p>
            </div>
          </div>

          {/* Blood Gas Values Table */}
          <div className="bg-[#0e0f14] rounded-sm border border-zinc-800/80 overflow-hidden">
            <div className="px-3 py-2 bg-[#12131a] border-b border-zinc-800 text-xs font-display font-bold text-zinc-300 uppercase tracking-wider">
              Parâmetros Medidos
            </div>

            <div className="divide-y divide-zinc-800/80 text-xs">
              <div className="grid grid-cols-3 p-2.5">
                <span className="text-zinc-400 font-semibold">FiO₂ (Fração Inspirada de O₂)</span>
                <span className="font-mono font-bold text-cyan-400">{settings.fio2}% ({settings.fio2 > 60 ? 'Hiperóxia' : 'O₂ Ofertado'})</span>
                <span className="text-zinc-500 text-[11px] font-mono">Parâmetro atual</span>
              </div>

              <div className="grid grid-cols-3 p-2.5">
                <span className="text-zinc-400 font-semibold">pH</span>
                <span className={`font-mono font-bold ${phColor}`}>{monitored.ph.toFixed(2)}</span>
                <span className="text-zinc-500 text-[11px] font-mono">Ref: 7.35 – 7.45</span>
              </div>

              <div className="grid grid-cols-3 p-2.5">
                <span className="text-zinc-400 font-semibold">PaCO₂ (Pressão Parcial de CO₂)</span>
                <span className={`font-mono font-bold ${paco2Color}`}>{monitored.paco2} mmHg</span>
                <span className="text-zinc-500 text-[11px] font-mono">Ref: 35 – 45 mmHg</span>
              </div>

              <div className="grid grid-cols-3 p-2.5">
                <span className="text-zinc-400 font-semibold">PaO₂ (Pressão Parcial de O₂)</span>
                <span className={`font-mono font-bold ${pao2Color}`}>{monitored.pao2} mmHg</span>
                <span className="text-zinc-500 text-[11px] font-mono">Ref: 80 – 100 mmHg</span>
              </div>

              <div className="grid grid-cols-3 p-2.5">
                <span className="text-zinc-400 font-semibold">HCO₃⁻ (Bicarbonato)</span>
                <span className={`font-mono font-bold ${hco3Color}`}>{monitored.hco3} mEq/L</span>
                <span className="text-zinc-500 text-[11px] font-mono">Ref: 22 – 26 mEq/L</span>
              </div>

              <div className="grid grid-cols-3 p-2.5">
                <span className="text-zinc-400 font-semibold">Base Excess (BE)</span>
                <span className={`font-mono font-bold ${beColor}`}>{monitored.baseExcess} mEq/L</span>
                <span className="text-zinc-500 text-[11px] font-mono">Ref: -2.0 a +2.0</span>
              </div>

              <div className="grid grid-cols-3 p-2.5">
                <span className="text-zinc-400 font-semibold">SpO₂ / SaO₂ (Saturação de O₂)</span>
                <span className={`font-mono font-bold ${spo2Color}`}>{monitored.spo2}%</span>
                <span className="text-zinc-500 text-[11px] font-mono">Ref: &gt; 92% (ou &gt; 88% em DPOC)</span>
              </div>

              <div className="grid grid-cols-3 p-2.5">
                <span className="text-zinc-400 font-semibold">Relação PaO₂ / FiO₂</span>
                <span className={`font-mono font-bold ${pfColor}`}>{monitored.pfRatio} mmHg</span>
                <span className="text-zinc-500 text-[11px] font-mono">Ref: &gt; 300 mmHg</span>
              </div>

              <div className="grid grid-cols-3 p-2.5">
                <span className="text-zinc-400 font-semibold">Gradiente Alvéolo-Arterial (A-a DO₂)</span>
                <span className="font-mono font-bold text-zinc-100">{monitored.aaGradient} mmHg</span>
                <span className="text-zinc-500 text-[11px] font-mono">PAO₂: {monitored.alveolarPaO2} mmHg</span>
              </div>

              <div className="grid grid-cols-3 p-2.5">
                <span className="text-zinc-400 font-semibold">EtCO₂ (Capnometria)</span>
                <span className="font-mono font-bold text-emerald-300">{monitored.etco2} mmHg</span>
                <span className="text-zinc-500 text-[11px] font-mono">Espaço Morto Vd/Vt: {(patient.deadSpaceFraction * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Clinical Interpretation & Management Notes */}
          <div className="bg-[#0a121e] p-3.5 rounded-sm border border-cyan-900/50 text-xs text-cyan-200 space-y-1.5 font-sans">
            <div className="flex items-center gap-1.5 font-display font-bold text-cyan-300">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Conduta Ventilatória Sugerida</span>
            </div>
            {monitored.ph < 7.35 && monitored.paco2 > 45 && (
              <p>
                • O paciente apresenta retenção de CO₂. Se a Driving Pressure e o Pplat permitirem, considere aumentar a Ventilação Minuto (aumentando FR ou Vt dentro dos limites protetores). Em DPOC, aceite hipercapnia se pH &gt; 7.20.
              </p>
            )}
            {monitored.ph > 7.45 && monitored.paco2 < 35 && (
              <p>
                • Paciente hiperventilando. Reduza a frequência respiratória ou o volume corrente para evitar alcalose hipocápnica e vasoconstrição cerebral.
              </p>
            )}
            {monitored.pfRatio < 200 && (
              <p>
                • Shunt intrapulmonar elevado. Titule a PEEP para recrutamento alveolar e otimize a FiO₂ evitando toxicidade hiperóxica prolongada.
              </p>
            )}
            {monitored.ph >= 7.35 && monitored.ph <= 7.45 && monitored.pfRatio >= 300 && (
              <p>• Troca gasosa e equilíbrio ácido-base perfeitamente ajustados aos parâmetros atuais.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
