import React, { useState } from 'react';
import { calculateIBW } from '../services/physicsEngine';
import {
  Calculator,
  X,
  Scale,
  Sparkles,
  Table,
  Check,
  ChevronRight,
} from 'lucide-react';

interface ClinicalCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyVt?: (targetVt: number) => void;
}

export const ClinicalCalculatorModal: React.FC<ClinicalCalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyVt,
}) => {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-[#0a0a0e] border border-zinc-800 rounded-sm w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-sm bg-[#0d1d16] border border-emerald-800/80 text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-zinc-100 flex items-center gap-2">
                Calculadora Clínica de Ventilação Protetora
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Peso predito (IBW), volumes protetores e tabela ARDSNet PEEP/FiO₂.
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

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Top: IBW Inputs */}
          <div className="bg-[#0e0f14] p-4 rounded-sm border border-zinc-800/80 space-y-3">
            <span className="text-xs font-display font-bold text-zinc-300 uppercase tracking-wider block">
              1. Cálculo do Peso Predito (Ideal Body Weight)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              {/* Gender selector */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Sexo Biológico</label>
                <div className="grid grid-cols-2 gap-1 bg-[#070709] p-1 rounded-sm border border-zinc-800">
                  <button
                    onClick={() => setGender('male')}
                    className={`py-1 text-xs font-bold rounded-sm cursor-pointer ${
                      gender === 'male' ? 'bg-cyan-600 text-white' : 'text-zinc-400'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    onClick={() => setGender('female')}
                    className={`py-1 text-xs font-bold rounded-sm cursor-pointer ${
                      gender === 'female' ? 'bg-pink-600 text-white' : 'text-zinc-400'
                    }`}
                  >
                    Feminino
                  </button>
                </div>
              </div>

              {/* Height slider */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  Altura: <span className="font-mono font-bold text-white">{heightCm} cm</span>
                </label>
                <input
                  type="range"
                  min={140}
                  max={205}
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded-none cursor-pointer"
                />
              </div>

              {/* Result IBW */}
              <div className="bg-[#070709] p-3 rounded-sm border border-emerald-800/80 text-center">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Peso Predito (IBW)</span>
                <span className="text-2xl font-black font-mono text-emerald-400">{ibw} kg</span>
                <span className="text-[9px] text-zinc-500 font-mono block">
                  {gender === 'male' ? '50 + 0.91 × (Alt - 152.4)' : '45.5 + 0.91 × (Alt - 152.4)'}
                </span>
              </div>
            </div>
          </div>

          {/* Target Tidal Volumes Matrix */}
          <div className="bg-[#0e0f14] p-4 rounded-sm border border-zinc-800/80 space-y-3">
            <span className="text-xs font-display font-bold text-zinc-300 uppercase tracking-wider block">
              2. Metas de Volume Corrente (Vt) Baseadas no Peso Predito
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center">
              {vtTargets.map((t) => (
                <div
                  key={t.mlPerKg}
                  className={`p-3 rounded-sm border flex flex-col justify-between ${
                    t.isDefault
                      ? 'bg-[#0e1626] border-cyan-500 text-white shadow'
                      : 'bg-[#070709] border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-display font-bold block">{t.mlPerKg} mL/kg</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 my-1 block">
                      {t.vt} mL
                    </span>
                    <span className="text-[9px] text-zinc-400 block leading-tight font-mono">{t.desc}</span>
                  </div>

                  {onApplyVt && (
                    <button
                      onClick={() => {
                        onApplyVt(t.vt);
                        onClose();
                      }}
                      className="mt-2 text-[10px] font-mono font-bold py-1 px-2 rounded-sm bg-[#161720] hover:bg-[#222432] text-zinc-200 cursor-pointer border border-zinc-700"
                    >
                      Aplicar Vt
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ARDSNet Titration Table */}
          <div className="bg-[#0e0f14] p-4 rounded-sm border border-zinc-800/80 space-y-2">
            <span className="text-xs font-display font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Table className="w-4 h-4 text-cyan-400" />
              <span>3. Tabela ARDSNet PEEP / FiO₂ (Estratégia Low PEEP)</span>
            </span>

            <div className="overflow-x-auto">
              <div className="flex gap-1.5 py-1">
                {ardsNetLowPeep.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex-1 min-w-[55px] bg-[#070709] p-2 rounded-sm border border-zinc-800 text-center font-mono text-xs"
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
            <p className="text-[10px] text-zinc-500 font-mono">
              * Objetivo de oxigenação: PaO₂ entre 55 e 80 mmHg ou SpO₂ entre 88% e 95%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
