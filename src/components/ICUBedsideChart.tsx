import React, { useState } from 'react';
import { ICUBloodGasState, ICUBedsideChart as ICUBedsideChartType } from '../types/icu';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import {
  FileText,
  Activity,
  Droplets,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Clock,
  Printer,
} from 'lucide-react';

interface ICUBedsideChartProps {
  bloodGas: ICUBloodGasState;
  chart: ICUBedsideChartType;
  patientName: string;
  pathology?: string;
}

export const ICUBedsideChart: React.FC<ICUBedsideChartProps> = ({
  bloodGas,
  chart,
  patientName,
  pathology = 'sdra',
}) => {
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<'gasometria' | 'raiox' | 'balanco'>('gasometria');
  const [sampleTime, setSampleTime] = useState<string>('Agora');
  const [isSampling, setIsSampling] = useState<boolean>(false);

  const handleDrawBloodGas = () => {
    audioEngine.playConfirmBeep();
    setIsSampling(true);
    setTimeout(() => {
      setIsSampling(false);
      const now = new Date();
      setSampleTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
    }, 600);
  };

  // Automatic Acid-Base & Oxygenation Interpretation
  const getAcidBaseDiagnosis = () => {
    let acidBase = 'Equilíbrio Ácido-Básico Normal';
    if (bloodGas.ph < 7.35) {
      if (bloodGas.paco2 > 45) {
        acidBase = bloodGas.hco3 < 22 ? 'Acidose Mista (Respiratória + Metabólica)' : 'Acidose Respiratória Aguda Descompensada';
      } else {
        acidBase = 'Acidose Metabólica Pura (Hiperlactatemia)';
      }
    } else if (bloodGas.ph > 7.45) {
      if (bloodGas.paco2 < 35) {
        acidBase = 'Alcalose Respiratória (Hiperventilação Alveolar)';
      } else {
        acidBase = 'Alcalose Metabólica';
      }
    }

    let oxygenation = 'Oxigenação Adequada';
    if (bloodGas.pao2Fio2Ratio < 100) {
      oxygenation = 'Hipoxemia Grave (Critério de Berlim: SARA Grave, P/F < 100)';
    } else if (bloodGas.pao2Fio2Ratio < 200) {
      oxygenation = 'Hipoxemia Moderada (Critério de Berlim: SARA Moderada, P/F 100-200)';
    } else if (bloodGas.pao2Fio2Ratio < 300) {
      oxygenation = 'Hipoxemia Leve (Critério de Berlim: SARA Leve, P/F 200-300)';
    } else if (bloodGas.pao2 > 160) {
      oxygenation = 'Hiperóxia Desnecessária (Risco de toxicidade por oxigênio e atelectasias de absorção)';
    }

    return { acidBase, oxygenation };
  };

  const { acidBase, oxygenation } = getAcidBaseDiagnosis();

  return (
    <div className="rounded-xl border border-slate-800 bg-[#07090f] text-slate-100 flex flex-col overflow-hidden shadow-xl select-none font-sans">
      {/* Header Bar */}
      <div className="px-4 py-2.5 bg-[#0d111c] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-slate-200 tracking-wider">
            PRONTUÁRIO DIGITAL DO LEITO • {patientName.toUpperCase()}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-[11px]">
            {chart.admissionDiagnosis} • Dia {chart.icuDay} de UTI
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center p-0.5 rounded-lg bg-[#06080e] border border-slate-800 gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('gasometria')}
            className={`px-3 py-1.5 rounded-md font-bold cursor-pointer transition-all ${
              activeTab === 'gasometria'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Gasometria Arterial
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('raiox')}
            className={`px-3 py-1.5 rounded-md font-bold cursor-pointer transition-all ${
              activeTab === 'raiox'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Raio-X de Tórax
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('balanco')}
            className={`px-3 py-1.5 rounded-md font-bold cursor-pointer transition-all ${
              activeTab === 'balanco'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Balanço Hídrico (24h)
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-4 sm:p-5">
        {/* TAB 1: GASOMETRIA ARTERIAL DINÂMICA (ESTILO RADIOMETER ABL90) */}
        {activeTab === 'gasometria' && (
          <div className="space-y-4 font-mono">
            {/* Top Bar: Action to draw sample & timestamp */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#0d1220] border border-slate-800">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300 font-bold">Última Coleta Gasométrica:</span>
                <span className="text-cyan-300 font-bold">{sampleTime}</span>
                <span className="text-slate-500">• Linha Arterial PAI (Artéria Radial E)</span>
              </div>

              <button
                type="button"
                onClick={handleDrawBloodGas}
                disabled={isSampling}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isSampling ? 'animate-spin' : ''}`} />
                <span>{isSampling ? 'Processando Amostra...' : 'Colher Nova Gasometria'}</span>
              </button>
            </div>

            {/* Diagnostic Interpretation Banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div
                className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                  bloodGas.ph < 7.35 || bloodGas.ph > 7.45
                    ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                    : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                }`}
              >
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Laudo Ácido-Básico</span>
                  <span className="font-bold">{acidBase}</span>
                </div>
              </div>

              <div
                className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                  bloodGas.pao2Fio2Ratio < 200
                    ? 'bg-amber-950/60 border-amber-800 text-amber-200'
                    : 'bg-blue-950/60 border-blue-800 text-blue-200'
                }`}
              >
                <Activity className="w-5 h-5 shrink-0 text-cyan-400" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Laudo de Oxigenação</span>
                  <span className="font-bold">{oxygenation}</span>
                </div>
              </div>
            </div>

            {/* Blood Gas Values Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-center">
              {/* pH */}
              <div className="p-3 rounded-lg bg-[#0c101c] border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">pH</span>
                <span className={`text-2xl font-black tabular-nums my-1 ${
                  bloodGas.ph < 7.35 ? 'text-rose-400' : bloodGas.ph > 7.45 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {bloodGas.ph}
                </span>
                <span className="text-[9px] text-slate-500">7.35 - 7.45</span>
              </div>

              {/* PaCO2 */}
              <div className="p-3 rounded-lg bg-[#0c101c] border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">PaCO₂</span>
                <span className={`text-2xl font-black tabular-nums my-1 ${
                  bloodGas.paco2 > 45 ? 'text-rose-400' : bloodGas.paco2 < 35 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {bloodGas.paco2}
                </span>
                <span className="text-[9px] text-slate-500">35 - 45 mmHg</span>
              </div>

              {/* PaO2 */}
              <div className="p-3 rounded-lg bg-[#0c101c] border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">PaO₂</span>
                <span className="text-2xl font-black text-cyan-300 tabular-nums my-1">
                  {bloodGas.pao2}
                </span>
                <span className="text-[9px] text-slate-500">80 - 100 mmHg</span>
              </div>

              {/* HCO3 */}
              <div className="p-3 rounded-lg bg-[#0c101c] border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">HCO₃⁻</span>
                <span className="text-2xl font-black text-slate-200 tabular-nums my-1">
                  {bloodGas.hco3}
                </span>
                <span className="text-[9px] text-slate-500">22 - 26 mEq/L</span>
              </div>

              {/* BE */}
              <div className="p-3 rounded-lg bg-[#0c101c] border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Base Excess</span>
                <span className="text-2xl font-black text-slate-200 tabular-nums my-1">
                  {bloodGas.baseExcess > 0 ? `+${bloodGas.baseExcess}` : bloodGas.baseExcess}
                </span>
                <span className="text-[9px] text-slate-500">-2 a +2 mmol/L</span>
              </div>

              {/* SaO2 */}
              <div className="p-3 rounded-lg bg-[#0c101c] border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">SaO₂</span>
                <span className="text-2xl font-black text-cyan-400 tabular-nums my-1">
                  {bloodGas.sao2}%
                </span>
                <span className="text-[9px] text-slate-500">&gt; 92%</span>
              </div>

              {/* P/F Ratio */}
              <div className="p-3 rounded-lg bg-[#0c101c] border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">PaO₂ / FiO₂</span>
                <span className={`text-2xl font-black tabular-nums my-1 ${
                  bloodGas.pao2Fio2Ratio < 150 ? 'text-rose-400' : bloodGas.pao2Fio2Ratio < 250 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {bloodGas.pao2Fio2Ratio}
                </span>
                <span className="text-[9px] text-slate-500">Normal &gt; 300</span>
              </div>

              {/* Lactato */}
              <div className="p-3 rounded-lg bg-[#0c101c] border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Lactato</span>
                <span className={`text-2xl font-black tabular-nums my-1 ${
                  bloodGas.lactate > 2.0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {bloodGas.lactate}
                </span>
                <span className="text-[9px] text-slate-500">&lt; 2.0 mmol/L</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RAIO-X DE TÓRAX NO LEITO */}
        {activeTab === 'raiox' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 font-mono">
            <div className="md:col-span-5 bg-black rounded-xl p-4 flex flex-col items-center justify-center border border-zinc-800 min-h-[260px]">
              {/* Schematic Anatomical Chest X-Ray SVG */}
              <svg viewBox="0 0 200 240" className="w-full h-56 opacity-90">
                {/* Rib cage outlines */}
                <ellipse cx="100" cy="120" rx="75" ry="95" fill="none" stroke="#334155" strokeWidth="2" />
                {/* Clavicles */}
                <path d="M 40 40 Q 100 50 160 40" stroke="#64748b" strokeWidth="3" fill="none" />
                {/* Trachea & Endotracheal Tube (Bright Cyan) */}
                <line x1="100" y1="20" x2="100" y2="88" stroke="#38bdf8" strokeWidth="3.5" strokeDasharray="3,2" />
                {/* Carina Marker */}
                <path d="M 85 105 L 100 90 L 115 105" stroke="#94a3b8" strokeWidth="2.5" fill="none" />
                {/* Lungs and Infiltrates */}
                <path d="M 50 60 C 40 100 45 180 85 190 C 95 190 95 120 95 70 Z" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                <path d="M 150 60 C 160 100 155 180 115 190 C 105 190 105 120 105 70 Z" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                {/* Infiltrate opacity (Bilateral ground glass in ARDS) */}
                <ellipse cx="70" cy="140" rx="20" ry="30" fill="rgba(255,255,255,0.28)" />
                <ellipse cx="130" cy="140" rx="22" ry="30" fill="rgba(255,255,255,0.28)" />
                {/* Cardiac silhouette */}
                <path d="M 85 120 C 70 150 90 185 125 185 C 135 185 130 140 100 120 Z" fill="#1e293b" />
                {/* Diaphragms */}
                <path d="M 40 195 Q 70 180 95 195" stroke="#64748b" strokeWidth="2" fill="none" />
                <path d="M 105 195 Q 130 180 160 195" stroke="#64748b" strokeWidth="2" fill="none" />
              </svg>
              <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400 mt-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Tubo Endotraqueal: 3.5 cm acima da carina</span>
              </div>
            </div>

            <div className="md:col-span-7 space-y-3 text-xs font-mono">
              <h4 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                Laudo Radiológico Digital no Leito
              </h4>
              <p className="p-3.5 rounded-lg bg-[#0c101c] border border-slate-800 text-slate-300 leading-relaxed">
                {chart.chestXRaySummary}
              </p>
              <div className="p-3 rounded-lg border border-slate-800 bg-[#0e1322] space-y-1.5 text-slate-300">
                <span className="font-bold text-white block">Lista de Checagem do Fisioterapeuta / Intensivista:</span>
                <span>• <strong>Posicionamento do TOT</strong>: Adequado no terço médio da traqueia (sem intubação seletiva no brônquio principal direito).</span>
                <br />
                <span>• <strong>Padrão Radiológico</strong>: Infiltrado interstício-alveolar bilateral difuso compatível com Síndrome do Desconforto Respiratório Agudo (SDRA).</span>
                <br />
                <span>• <strong>Complicações Barotraumáticas</strong>: Ausência de pneumotórax ou enfisema subcutâneo.</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BALANÇO HÍDRICO (24h) */}
        {activeTab === 'balanco' && (
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-lg bg-[#0c101c] border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold block">Entradas Totais (24h)</span>
                <span className="text-2xl font-black text-blue-400 tabular-nums my-1 block">
                  +{chart.fluidBalance24h.intakeMl} mL
                </span>
                <span className="text-[10px] text-slate-500">Cristaloides + BICs + Dieta Enteral</span>
              </div>

              <div className="p-4 rounded-lg bg-[#0c101c] border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold block">Saídas Totais (24h)</span>
                <span className="text-2xl font-black text-amber-400 tabular-nums my-1 block">
                  -{chart.fluidBalance24h.outputMl} mL
                </span>
                <span className="text-[10px] text-slate-500">Diurese (SVD: 0.8 mL/kg/h)</span>
              </div>

              <div className="p-4 rounded-lg bg-[#0c101c] border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold block">Balanço Hídrico Cumulativo</span>
                <span className={`text-2xl font-black tabular-nums my-1 block ${
                  chart.fluidBalance24h.cumulativeNetMl > 500 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  +{chart.fluidBalance24h.cumulativeNetMl} mL
                </span>
                <span className="text-[10px] text-slate-500">Meta: Balanço neutro a levemente positivo</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0c101c] border border-slate-800 space-y-2">
              <span className="font-bold text-white block">Evolução Clínica e Cuidados da Equipe Multidisciplinar:</span>
              <ul className="space-y-1 text-slate-300">
                {chart.nursingNotes.map((note, idx) => (
                  <li key={idx}>• {note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
