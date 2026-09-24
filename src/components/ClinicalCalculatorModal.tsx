import React, { useState } from 'react';
import { calculateIBW } from '../services/physicsEngine';
import { FormulaOverlayType } from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import {
  Calculator,
  X,
  Scale,
  Sparkles,
  Table,
  Check,
  ChevronRight,
  Layers,
  Activity,
  ArrowRight,
} from 'lucide-react';

interface ClinicalCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyVt?: (targetVt: number) => void;
  onSelectFormulaOverlay?: (overlay: FormulaOverlayType) => void;
}

export const ClinicalCalculatorModal: React.FC<ClinicalCalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyVt,
  onSelectFormulaOverlay,
}) => {
  const [tab, setTab] = useState<'ibw_peep' | 'formulas'>('ibw_peep');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [heightCm, setHeightCm] = useState<number>(170);

  if (!isOpen) return null;

  const ibw = calculateIBW(heightCm, gender);

  const vtTargets = [
    { mlPerKg: 4, vt: Math.round(ibw * 4), desc: 'SDRA Grave / Pulmão Ultra-protetor' },
    { mlPerKg: 5, vt: Math.round(ibw * 5), desc: 'SDRA Moderada / DPOC' },
    { mlPerKg: 6, vt: Math.round(ibw * 6), desc: 'Padrão Ouro Protetor (ARDSNet)', isDefault: true },
    { mlPerKg: 7, vt: Math.round(ibw * 7), desc: 'Pulmão Saudável / Pós-Operatório' },
    { mlPerKg: 8, vt: Math.round(ibw * 8), desc: 'Limite Máximo Seguro' },
  ];

  // ARDSNet PEEP-FiO2 table
  const ardsNetLowPeep = [
    { fio2: 30, peep: 5 },
    { fio2: 40, peep: 5 },
    { fio2: 40, peep: 8 },
    { fio2: 50, peep: 8 },
    { fio2: 50, peep: 10 },
    { fio2: 60, peep: 10 },
    { fio2: 70, peep: 10 },
    { fio2: 70, peep: 12 },
    { fio2: 80, peep: 14 },
    { fio2: 90, peep: 14 },
    { fio2: 90, peep: 16 },
    { fio2: 100, peep: 18 },
    { fio2: 100, peep: 22 },
  ];

  const handleHighlightFormula = (type: FormulaOverlayType) => {
    audioEngine.playConfirmBeep();
    if (onSelectFormulaOverlay) {
      onSelectFormulaOverlay(type);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-[#0a0a0e] border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0d1d16] border border-emerald-800/80 text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-zinc-100 flex items-center gap-2">
                Calculadora Clínica & Visualizador de Fórmulas
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Peso predito (IBW), ventilação protetora e equivalência gráfica nas curvas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <button
                onClick={() => setTab('ibw_peep')}
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                  tab === 'ibw_peep'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Peso & PEEP
              </button>
              <button
                onClick={() => setTab('formulas')}
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  tab === 'formulas'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Fórmulas Gráficas</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#161720] hover:bg-[#222432] text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {tab === 'ibw_peep' ? (
            <>
              {/* Top: IBW Inputs */}
              <div className="bg-[#0e0f14] p-4 rounded-xl border border-zinc-800/80 space-y-3">
                <span className="text-xs font-display font-bold text-zinc-300 uppercase tracking-wider block">
                  1. Cálculo do Peso Predito (Ideal Body Weight)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* Gender selector */}
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Sexo Biológico</label>
                    <div className="grid grid-cols-2 gap-1 bg-[#070709] p-1 rounded-lg border border-zinc-800">
                      <button
                        onClick={() => setGender('male')}
                        className={`py-1 text-xs font-bold rounded-md cursor-pointer ${
                          gender === 'male' ? 'bg-cyan-600 text-white' : 'text-zinc-400'
                        }`}
                      >
                        Masculino
                      </button>
                      <button
                        onClick={() => setGender('female')}
                        className={`py-1 text-xs font-bold rounded-md cursor-pointer ${
                          gender === 'female' ? 'bg-cyan-600 text-white' : 'text-zinc-400'
                        }`}
                      >
                        Feminino
                      </button>
                    </div>
                  </div>

                  {/* Height input */}
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      Altura: <span className="font-mono font-bold text-cyan-400">{heightCm} cm</span>
                    </label>
                    <input
                      type="range"
                      min={140}
                      max={205}
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  {/* IBW Result */}
                  <div className="bg-[#070709] p-3 rounded-xl border border-zinc-800/80 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                      PESO PREDITO (IBW)
                    </span>
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      {ibw.toFixed(1)} <span className="text-xs text-zinc-400">kg</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle: Vt Targets Table */}
              <div className="bg-[#0e0f14] p-4 rounded-xl border border-zinc-800/80 space-y-3">
                <span className="text-xs font-display font-bold text-zinc-300 uppercase tracking-wider block">
                  2. Volumes Correntes Protetores (mL/kg IBW)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {vtTargets.map((t) => (
                    <div
                      key={t.mlPerKg}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                        t.isDefault
                          ? 'bg-[#102018] border-emerald-500/80 ring-1 ring-emerald-500/40'
                          : 'bg-[#070709] border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-zinc-300">
                            {t.mlPerKg} mL/kg
                          </span>
                          {t.isDefault && (
                            <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              Padrão
                            </span>
                          )}
                        </div>
                        <div className="my-1.5">
                          <span className="text-2xl font-bold font-mono text-emerald-400">
                            {t.vt}
                          </span>
                          <span className="text-[10px] text-zinc-400 ml-1">mL</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">{t.desc}</p>
                      </div>

                      {onApplyVt && (
                        <button
                          onClick={() => {
                            audioEngine.playConfirmBeep();
                            onApplyVt(t.vt);
                            onClose();
                          }}
                          className="mt-3 w-full py-1 text-[11px] font-mono font-bold rounded-lg bg-[#141622] hover:bg-[#1e2238] text-cyan-300 border border-cyan-800/60 transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>Aplicar</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom: ARDSNet Table */}
              <div className="bg-[#0e0f14] p-4 rounded-xl border border-zinc-800/80 space-y-3">
                <span className="text-xs font-display font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-cyan-400" />
                  <span>3. Tabela ARDSNet PEEP / FiO₂ (Estratégia Low PEEP)</span>
                </span>
                <div className="overflow-x-auto">
                  <div className="flex gap-1.5 py-1">
                    {ardsNetLowPeep.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex-1 min-w-[55px] bg-[#070709] p-2 rounded-lg border border-zinc-800 text-center font-mono text-xs"
                      >
                        <span className="text-[10px] text-zinc-400 block">FiO₂</span>
                        <span className="font-bold text-cyan-400 block">{item.fio2}%</span>
                        <div className="my-1 border-t border-zinc-800" />
                        <span className="text-[10px] text-zinc-400 block">PEEP</span>
                        <span className="font-bold text-emerald-400 block">{item.peep}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* FORMULAS GRAPHICAL VISUALIZER TAB */
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-700/50 flex items-start gap-2.5 text-xs text-cyan-200">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Visualização Espacial Direta: </strong>
                  Selecione uma das equações abaixo para destacar suas variáveis fisiológicas (componente resistivo, elástico e PEEP basal) diretamente com sombreamento colorido nas curvas de pressão do ventilador.
                </p>
              </div>

              {/* Formula Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Equação do Movimento */}
                <div className="p-3.5 rounded-xl bg-[#0e0f14] border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold text-amber-400">
                      1. Equação do Movimento Respiratório
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Fundamental
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/60 font-mono text-xs text-zinc-200 text-center border border-zinc-800">
                    Paw = Presistiva + Pelástica + PEEP
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Mostra como a pressão total na via aérea divide-se entre vencer o atrito resistivo (tubo + brônquios) e distender o parênquima elástico pulmonar.
                  </p>
                  <button
                    onClick={() => handleHighlightFormula('equation_of_motion')}
                    className="w-full py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Destacar Eq. do Movimento na Curva</span>
                  </button>
                </div>

                {/* 2. Complacência Estática */}
                <div className="p-3.5 rounded-xl bg-[#0e0f14] border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold text-cyan-400">
                      2. Complacência Estática & Driving Pressure
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Alvéolo
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/60 font-mono text-xs text-zinc-200 text-center border border-zinc-800">
                    Cest = Vt / (Pplatô - PEEP) = Vt / ΔP
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Reflete a distensibilidade alveolar. Destaca no canal de pressão a faixa de Driving Pressure (alvo &le; 14-15 cmH₂O) associada à deformação elástica.
                  </p>
                  <button
                    onClick={() => handleHighlightFormula('compliance')}
                    className="w-full py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Destacar Complacência (ΔP) na Curva</span>
                  </button>
                </div>

                {/* 3. Resistência de Vias Aéreas */}
                <div className="p-3.5 rounded-xl bg-[#0e0f14] border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold text-rose-400">
                      3. Resistência de Vias Aéreas (Raw)
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Atrito
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/60 font-mono text-xs text-zinc-200 text-center border border-zinc-800">
                    Raw = (Ppico - Pplatô) / Fluxo (L/s)
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Mede o atrito do fluxo de gás. Destaca a queda de pressão entre a Pressão de Pico e a Pressão de Platô (normal &le; 10 cmH₂O/L/s).
                  </p>
                  <button
                    onClick={() => handleHighlightFormula('resistance')}
                    className="w-full py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Destacar Resistência (Raw) na Curva</span>
                  </button>
                </div>

                {/* 4. Mechanical Power */}
                <div className="p-3.5 rounded-xl bg-[#0e0f14] border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold text-purple-400">
                      4. Potência Mecânica (Mechanical Power)
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Energia
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/60 font-mono text-xs text-zinc-200 text-center border border-zinc-800">
                    MP = 0,098 × FR × Vt × (Ppico - 0,5 × ΔP)
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Energia mecânica total transferida pelo ventilador ao parênquima por minuto. Valores acima de 17-20 J/min associam-se a VILI.
                  </p>
                  <button
                    onClick={() => handleHighlightFormula('mechanical_power')}
                    className="w-full py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Destacar Mechanical Power na Curva</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
