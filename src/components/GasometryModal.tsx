import React from 'react';
import { MonitoredData, PatientParameters, VentilatorSettings } from '../types/ventilation';
import { FileText, X, Zap } from 'lucide-react';
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
  let acidBaseColor = isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400';

  if (currentPh < 7.35) {
    if (currentPaco2 > 45) {
      acidBaseStatus = currentPh < 7.25 ? 'Acidose Respiratória Aguda Grave' : 'Acidose Respiratória Aguda';
      acidBaseColor = isLight ? 'text-rose-700 font-bold' : 'text-rose-400';
    } else {
      acidBaseStatus = 'Acidose Metabólica / Mista';
      acidBaseColor = isLight ? 'text-rose-700 font-bold' : 'text-rose-400';
    }
  } else if (currentPh > 7.45) {
    if (currentPaco2 < 35) {
      acidBaseStatus = 'Alcalose Respiratória (Hiperventilação)';
      acidBaseColor = isLight ? 'text-amber-700 font-bold' : 'text-amber-400';
    } else {
      acidBaseStatus = 'Alcalose Metabólica';
      acidBaseColor = isLight ? 'text-amber-700 font-bold' : 'text-amber-400';
    }
  }

  // Oxygenation status (Berlin Definition)
  let oxygenationStatus = 'Oxigenação Adequada (Normoxemia)';
  let oxygenationColor = isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400';
  if (currentPf < 100) {
    oxygenationStatus = 'Hipoxemia Grave (Critério SDRA Grave: P/F < 100)';
    oxygenationColor = isLight ? 'text-rose-700 font-bold' : 'text-rose-500';
  } else if (currentPf < 200) {
    oxygenationStatus = 'Hipoxemia Moderada (Critério SDRA Moderada: P/F 100-200)';
    oxygenationColor = isLight ? 'text-rose-700 font-bold' : 'text-rose-400';
  } else if (currentPf < 300) {
    oxygenationStatus = 'Hipoxemia Leve (Critério SDRA Leve: P/F 200-300)';
    oxygenationColor = isLight ? 'text-amber-700 font-bold' : 'text-amber-400';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
      <div
        className={`border rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0a0a0e] border-zinc-800'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-[#0e1626] border-cyan-800/80 text-cyan-400'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2
                className={`text-base font-display font-bold flex items-center gap-2 ${
                  isLight ? 'text-slate-900' : 'text-zinc-100'
                }`}
              >
                Laudo de Gasometria Arterial
              </h2>
              <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Amostra de sangue arterial em tempo real ({patient.name})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                : 'bg-[#161720] hover:bg-[#222432] text-zinc-400 hover:text-white border-zinc-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Summary Status Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
              }`}
            >
              <span className={`text-[10px] font-display font-bold uppercase ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Diagnóstico Ácido-Base
              </span>
              <p className={`text-sm font-bold font-mono ${acidBaseColor}`}>{acidBaseStatus}</p>
            </div>

            <div
              className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
              }`}
            >
              <span className={`text-[10px] font-display font-bold uppercase ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Status de Oxigenação (Horovitz)
              </span>
              <p className={`text-sm font-bold font-mono ${oxygenationColor}`}>{oxygenationStatus}</p>
            </div>
          </div>

          {/* Blood Gas Values Table */}
          <div
            className={`rounded-xl border overflow-hidden ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800/80'
            }`}
          >
            <div
              className={`px-3 py-2 border-b text-xs font-display font-bold uppercase tracking-wider flex items-center justify-between ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#12131a] border-zinc-800 text-zinc-300'
              }`}
            >
              <span>Parâmetros Medidos com Classificação</span>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-emerald-600 font-bold"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/> Normal</span>
                <span className="flex items-center gap-1 text-amber-600 font-bold"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/> Atenção</span>
                <span className="flex items-center gap-1 text-rose-600 font-bold"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/> Crítico</span>
              </div>
            </div>

            <div className={`divide-y text-xs ${isLight ? 'divide-slate-200' : 'divide-zinc-800/80'}`}>
              <div className="grid grid-cols-3 p-2.5">
                <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>FiO₂ (Fração Inspirada de O₂)</span>
                <span className={`font-mono font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                  {settings.fio2}% ({settings.fio2 > 60 ? 'Hiperóxia' : 'O₂ Ofertado'})
                </span>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Parâmetro ventilatório atual</span>
              </div>

              <div className={`grid grid-cols-3 p-2.5 ${phG.bgClass}`}>
                <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>pH</span>
                <span className={`font-mono font-bold ${phG.textClass}`}>{currentPh.toFixed(2)} ({phG.statusLabel})</span>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Ref: 7.35 – 7.45</span>
              </div>

              <div className={`grid grid-cols-3 p-2.5 ${paco2G.bgClass}`}>
                <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>PaCO₂ (Pressão Parcial de CO₂)</span>
                <span className={`font-mono font-bold ${paco2G.textClass}`}>{currentPaco2} mmHg ({paco2G.statusLabel})</span>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Ref: 35 – 45 mmHg</span>
              </div>

              <div className={`grid grid-cols-3 p-2.5 ${pao2G.bgClass}`}>
                <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>PaO₂ (Pressão Parcial de O₂)</span>
                <span className={`font-mono font-bold ${pao2G.textClass}`}>{currentPao2} mmHg ({pao2G.statusLabel})</span>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Ref: 80 – 100 mmHg</span>
              </div>

              <div className={`grid grid-cols-3 p-2.5 ${hco3G.bgClass}`}>
                <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>HCO₃⁻ (Bicarbonato)</span>
                <span className={`font-mono font-bold ${hco3G.textClass}`}>{currentHco3} mEq/L ({hco3G.statusLabel})</span>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Ref: 22 – 26 mEq/L</span>
              </div>

              <div className={`grid grid-cols-3 p-2.5 ${beG.bgClass}`}>
                <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>Base Excess (BE)</span>
                <span className={`font-mono font-bold ${beG.textClass}`}>{currentBe > 0 ? `+${currentBe.toFixed(1)}` : currentBe.toFixed(1)} mEq/L</span>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Ref: -2.0 a +2.0</span>
              </div>

              <div className={`grid grid-cols-3 p-2.5 ${spo2G.bgClass}`}>
                <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>SpO₂ / SaO₂ (Saturação de O₂)</span>
                <span className={`font-mono font-bold ${spo2G.textClass}`}>{currentSpo2}% ({spo2G.statusLabel})</span>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Ref: &ge; 94% (ou 88-92% em DPOC retentor)</span>
              </div>

              <div className={`grid grid-cols-3 p-2.5 ${pfG.bgClass}`}>
                <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>Relação PaO₂ / FiO₂ (Índice Horovitz)</span>
                <span className={`font-mono font-bold ${pfG.textClass}`}>{currentPf} mmHg ({pfG.statusLabel})</span>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Ref: &gt; 300 mmHg</span>
              </div>

              <div className="grid grid-cols-3 p-2.5">
                <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>Gradiente Alvéolo-Arterial (A-a DO₂)</span>
                <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>{monitored?.aaGradient ?? 10} mmHg</span>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>PAO₂ calculada: {monitored?.alveolarPaO2 ?? 100} mmHg</span>
              </div>

              <div className="grid grid-cols-3 p-2.5">
                <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>EtCO₂ (Capnometria)</span>
                <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>{monitored?.etco2 ?? 35} mmHg</span>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>Espaço Morto Estimado (Vd/Vt): {(currentDeadSpace * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Clinical Interpretation & Management Notes */}
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-1.5 font-sans ${
              isLight
                ? 'bg-cyan-50 border-cyan-200 text-cyan-950'
                : 'bg-[#0a121e] border-cyan-900/50 text-cyan-200'
            }`}
          >
            <div className={`flex items-center gap-1.5 font-display font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>
              <Zap className="w-4 h-4 text-cyan-500" />
              <span>Conduta Fisioterapêutica e Ventilatória Sugerida</span>
            </div>
            {monitored.ph < 7.35 && monitored.paco2 > 45 && (
              <p>
                • O paciente apresenta retenção aguda de CO₂ (Acidose Respiratória). Se a Driving Pressure (&le;15) e o Pplat (&le;30) permitirem, considere aumentar a Ventilação Minuto (ajustando FR ou Vt). Em DPOC crônico, aceite hipercapnia permissiva se pH &ge; 7.20.
              </p>
            )}
            {monitored.ph > 7.45 && monitored.paco2 < 35 && (
              <p>
                • Paciente hiperventilando (Alcalose Respiratória). Reduza a frequência respiratória mandatória ou reduza o volume corrente/pressão de suporte para evitar alcalose e vasoconstrição cerebral.
              </p>
            )}
            {monitored.pfRatio < 200 && (
              <p>
                • Shunt intrapulmonar elevado e hipoxemia moderada/grave. Considere titulação de PEEP pelo método decremental ou tabela PEEP/FiO₂, posição prona se SDRA grave (P/F &lt; 150), e otimize FiO₂ para evitar toxicidade por hiperóxia prolongada.
              </p>
            )}
            {monitored.ph >= 7.35 && monitored.ph <= 7.45 && monitored.pfRatio >= 300 && (
              <p>• Troca gasosa e equilíbrio ácido-base perfeitamente ajustados e dentro dos parâmetros ideais de proteção pulmonar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
