import React from 'react';
import { PatientParameters } from '../types/ventilation';
import { calculateIBW } from '../services/physicsEngine';
import { audioEngine } from '../services/audioEngine';
import {
  X,
  Gauge,
  Heart,
  Activity,
  Sliders,
  Sparkles,
  Wind,
  CheckCircle2,
  AlertTriangle,
  User,
  Scale,
  Zap,
} from 'lucide-react';

interface PatientConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientParameters;
  onUpdatePatient: (updated: PatientParameters) => void;
}

export const PatientConfigModal: React.FC<PatientConfigModalProps> = ({
  isOpen,
  onClose,
  patient,
  onUpdatePatient,
}) => {
  if (!isOpen) return null;

  const update = <K extends keyof PatientParameters>(field: K, value: PatientParameters[K]) => {
    audioEngine.playClick(850);
    const updated = { ...patient, [field]: value };
    if (field === 'heightCm' || field === 'gender') {
      updated.idealBodyWeightKg = calculateIBW(
        field === 'heightCm' ? (value as number) : updated.heightCm,
        field === 'gender' ? (value as 'male' | 'female') : updated.gender
      );
    }
    onUpdatePatient(updated);
  };

  // Quick Archetype Presets
  const applyPreset = (presetName: string) => {
    audioEngine.playConfirmBeep();
    let updated = { ...patient };
    switch (presetName) {
      case 'normal':
        updated = {
          ...updated,
          name: 'Pulmão Normal',
          compliance: 60,
          resistance: 5,
          spontaneousDrive: false,
          shuntFraction: 5,
          deadSpaceFraction: 0.28,
          secretionsSeverity: 'none',
          circuitLeakPercent: 0,
        };
        break;
      case 'sdra':
        updated = {
          ...updated,
          name: 'SDRA Grave (Baby Lung)',
          compliance: 20,
          resistance: 6,
          spontaneousDrive: false,
          shuntFraction: 38,
          deadSpaceFraction: 0.55,
          secretionsSeverity: 'none',
          circuitLeakPercent: 0,
        };
        break;
      case 'dpoc':
        updated = {
          ...updated,
          name: 'DPOC (Hiperinsuflação)',
          compliance: 75,
          resistance: 26,
          spontaneousDrive: true,
          spontaneousRate: 22,
          spontaneousEffortPressure: -6,
          shuntFraction: 14,
          deadSpaceFraction: 0.58,
          secretionsSeverity: 'mild',
        };
        break;
      case 'asma':
        updated = {
          ...updated,
          name: 'Asma Quase-Fatal',
          compliance: 55,
          resistance: 35,
          spontaneousDrive: false,
          shuntFraction: 12,
          deadSpaceFraction: 0.50,
          secretionsSeverity: 'mild',
        };
        break;
      case 'pneumotorax':
        updated = {
          ...updated,
          name: 'Pneumotórax Hipertensivo',
          compliance: 14,
          resistance: 9,
          shuntFraction: 45,
          spontaneousDrive: false,
        };
        break;
      case 'edema':
        updated = {
          ...updated,
          name: 'Edema Agudo de Pulmão',
          compliance: 24,
          resistance: 13,
          shuntFraction: 32,
          spontaneousDrive: true,
          spontaneousRate: 24,
          spontaneousEffortPressure: -8,
        };
        break;
      case 'obeso':
        updated = {
          ...updated,
          name: 'Paciente Obeso (IMC > 40)',
          actualWeightKg: 135,
          compliance: 26,
          resistance: 10,
          shuntFraction: 22,
          deadSpaceFraction: 0.42,
          spontaneousDrive: false,
        };
        break;
    }
    onUpdatePatient(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-[#0a0a0e] border border-zinc-800 rounded-sm w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3.5 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-sm bg-[#0e1626] border border-cyan-800/80 text-cyan-400">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-display font-bold text-zinc-100 flex items-center gap-2">
                CONFIGURAÇÃO PULMONAR & FISIOLOGIA DO PACIENTE
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Ajuste direto da mecânica pulmonar, complacência, resistência de via aérea, drive e trocas gasosas.
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

        {/* Modal Body (Scrollable) */}
        <div className="p-4 overflow-y-auto space-y-4 font-sans text-xs">
          {/* Quick Presets */}
          <div className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-2">
            <span className="font-display font-bold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Modelos Fisiopatológicos Imediatos</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[11px]">
              <button
                onClick={() => applyPreset('normal')}
                className="p-2 bg-[#121824] hover:bg-[#1a2336] border border-cyan-800/60 text-cyan-300 rounded-sm text-left transition-all cursor-pointer font-bold"
              >
                1. Pulmão Normal
                <span className="block font-normal text-[9px] text-zinc-400">C: 60 • Raw: 5</span>
              </button>
              <button
                onClick={() => applyPreset('sdra')}
                className="p-2 bg-[#221216] hover:bg-[#30161d] border border-rose-800/60 text-rose-300 rounded-sm text-left transition-all cursor-pointer font-bold"
              >
                2. SDRA Grave
                <span className="block font-normal text-[9px] text-zinc-400">C: 20 • Shunt 38%</span>
              </button>
              <button
                onClick={() => applyPreset('dpoc')}
                className="p-2 bg-[#221c10] hover:bg-[#332714] border border-amber-800/60 text-amber-300 rounded-sm text-left transition-all cursor-pointer font-bold"
              >
                3. DPOC Exacerbado
                <span className="block font-normal text-[9px] text-zinc-400">Raw: 26 • AutoPEEP</span>
              </button>
              <button
                onClick={() => applyPreset('asma')}
                className="p-2 bg-[#221422] hover:bg-[#331c33] border border-purple-800/60 text-purple-300 rounded-sm text-left transition-all cursor-pointer font-bold"
              >
                4. Asma Quase-Fatal
                <span className="block font-normal text-[9px] text-zinc-400">Raw: 35 cmH2O/L/s</span>
              </button>
              <button
                onClick={() => applyPreset('pneumotorax')}
                className="p-2 bg-[#241212] hover:bg-[#361818] border border-red-800/60 text-red-300 rounded-sm text-left transition-all cursor-pointer font-bold"
              >
                5. Pneumotórax
                <span className="block font-normal text-[9px] text-zinc-400">C: 14 • PIP alto</span>
              </button>
              <button
                onClick={() => applyPreset('edema')}
                className="p-2 bg-[#121c22] hover:bg-[#182732] border border-teal-800/60 text-teal-300 rounded-sm text-left transition-all cursor-pointer font-bold"
              >
                6. Edema Pulmonar
                <span className="block font-normal text-[9px] text-zinc-400">C: 24 • Shunt 32%</span>
              </button>
              <button
                onClick={() => applyPreset('obeso')}
                className="p-2 bg-[#181622] hover:bg-[#242032] border border-indigo-800/60 text-indigo-300 rounded-sm text-left transition-all cursor-pointer font-bold"
              >
                7. Paciente Obeso
                <span className="block font-normal text-[9px] text-zinc-400">IMC 44 • C: 26</span>
              </button>
            </div>
          </div>

          {/* Section 1: Mecânica Respiratória Primária (Cst e Raw) */}
          <div className="bg-[#0e0f14] p-3.5 rounded-sm border border-zinc-800/80 space-y-3">
            <span className="font-display font-bold text-cyan-400 uppercase tracking-wider text-[11px] block">
              1. Mecânica do Sistema Respiratório (Complacência & Resistência)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Compliance Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200 text-xs">
                    Complacência Estática ($C_{'{'}st{'}'}$)
                  </span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">
                    {patient.compliance}{' '}
                    <span className="text-[10px] text-zinc-500">mL/cmH₂O</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={1}
                  value={patient.compliance}
                  onChange={(e) => update('compliance', Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>10 (SDRA/Pneumotórax)</span>
                  <span className="text-emerald-400">Normal (50-70)</span>
                  <span>120 (Enfisema)</span>
                </div>
              </div>

              {/* Resistance Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200 text-xs">
                    Resistência de Vias Aéreas ($R_{'{'}aw{'}'}$)
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {patient.resistance}{' '}
                    <span className="text-[10px] text-zinc-500">cmH₂O/(L/s)</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={50}
                  step={1}
                  value={patient.resistance}
                  onChange={(e) => update('resistance', Number(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span className="text-emerald-400">Normal (4-8)</span>
                  <span>DPOC (15-25)</span>
                  <span>Asma Grave (&gt;30)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Drive Respiratório & Esforço do Paciente */}
          <div className="bg-[#0e0f14] p-3.5 rounded-sm border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-purple-400 uppercase tracking-wider text-[11px]">
                2. Drive Respiratório & Esforço Muscular Espontâneo ($P_{'{'}mus{'}'}$)
              </span>
              <button
                onClick={() => update('spontaneousDrive', !patient.spontaneousDrive)}
                className={`px-2.5 py-1 rounded-sm font-mono font-bold text-xs border transition-all cursor-pointer ${
                  patient.spontaneousDrive
                    ? 'bg-purple-950 text-purple-300 border-purple-700'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}
              >
                {patient.spontaneousDrive ? '✓ DRIVE ATIVO' : '✕ SEDADO / BLOQUEADO'}
              </button>
            </div>

            {patient.spontaneousDrive && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Spontaneous Rate */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Frequência Espontânea Própria</span>
                    <span className="font-mono font-bold text-purple-300">
                      {patient.spontaneousRate} rpm
                    </span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={45}
                    step={1}
                    value={patient.spontaneousRate}
                    onChange={(e) => update('spontaneousRate', Number(e.target.value))}
                    className="w-full accent-purple-400 h-1.5 bg-zinc-800 cursor-pointer"
                  />
                </div>

                {/* Spontaneous Effort Pressure (Pmus) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Intensidade do Esforço ($P_{'{'}mus{'}'}$)</span>
                    <span className="font-mono font-bold text-purple-300">
                      {patient.spontaneousEffortPressure} cmH₂O
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-25}
                    max={-1}
                    step={1}
                    value={patient.spontaneousEffortPressure}
                    onChange={(e) => update('spontaneousEffortPressure', Number(e.target.value))}
                    className="w-full accent-purple-400 h-1.5 bg-zinc-800 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Antropometria e Cálculo de Peso Predito (IBW) */}
          <div className="bg-[#0e0f14] p-3.5 rounded-sm border border-zinc-800/80 space-y-3">
            <span className="font-display font-bold text-emerald-400 uppercase tracking-wider text-[11px] block">
              3. Dados Antropométricos & Peso Predito (IBW Formula)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Gender */}
              <div className="space-y-1">
                <span className="text-zinc-400 text-[10px] block">Gênero Biológico</span>
                <div className="grid grid-cols-2 gap-1 font-mono">
                  <button
                    onClick={() => update('gender', 'male')}
                    className={`py-1 rounded-sm border text-center font-bold ${
                      patient.gender === 'male'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    onClick={() => update('gender', 'female')}
                    className={`py-1 rounded-sm border text-center font-bold ${
                      patient.gender === 'female'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    Feminino
                  </button>
                </div>
              </div>

              {/* Height */}
              <div className="space-y-1">
                <span className="text-zinc-400 text-[10px] block">Altura (cm)</span>
                <input
                  type="number"
                  min={130}
                  max={220}
                  value={patient.heightCm}
                  onChange={(e) => update('heightCm', Number(e.target.value))}
                  className="w-full bg-[#161720] border border-zinc-700 rounded-sm p-1 text-white font-mono font-bold text-center"
                />
              </div>

              {/* Actual Weight */}
              <div className="space-y-1">
                <span className="text-zinc-400 text-[10px] block">Peso Real na Balança (kg)</span>
                <input
                  type="number"
                  min={30}
                  max={250}
                  value={patient.actualWeightKg}
                  onChange={(e) => update('actualWeightKg', Number(e.target.value))}
                  className="w-full bg-[#161720] border border-zinc-700 rounded-sm p-1 text-white font-mono font-bold text-center"
                />
              </div>

              {/* Computed IBW Card */}
              <div className="bg-[#091812] border border-emerald-700/60 p-1.5 rounded-sm flex flex-col justify-center text-center">
                <span className="text-[10px] text-emerald-400 font-bold uppercase font-mono">
                  Peso Predito (IBW)
                </span>
                <span className="text-lg font-black font-mono text-emerald-300">
                  {patient.idealBodyWeightKg} kg
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Troca Gasosa (Shunt e Espaço Morto) */}
          <div className="bg-[#0e0f14] p-3.5 rounded-sm border border-zinc-800/80 space-y-3">
            <span className="font-display font-bold text-orange-400 uppercase tracking-wider text-[11px] block">
              4. Troca Gasosa, Shunt e Espaço Morto Alveolar
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shunt Fraction */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Shunt Intrapulmonar ($Q_s/Q_t$)</span>
                  <span className="font-mono font-bold text-orange-300">
                    {patient.shuntFraction}%
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={60}
                  step={1}
                  value={patient.shuntFraction}
                  onChange={(e) => update('shuntFraction', Number(e.target.value))}
                  className="w-full accent-orange-400 h-1.5 bg-zinc-800 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span className="text-emerald-400">Normal (3-5%)</span>
                  <span>SDRA / Pneumonia (25-50%)</span>
                </div>
              </div>

              {/* Dead Space Fraction */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Espaço Morto Fisiológico ($V_d/V_t$)</span>
                  <span className="font-mono font-bold text-orange-300">
                    {(patient.deadSpaceFraction * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.15}
                  max={0.75}
                  step={0.01}
                  value={patient.deadSpaceFraction}
                  onChange={(e) => update('deadSpaceFraction', Number(e.target.value))}
                  className="w-full accent-orange-400 h-1.5 bg-zinc-800 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span className="text-emerald-400">Normal (25-35%)</span>
                  <span>TEP / SDRA / DPOC (50-70%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0e0f14] border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-mono">
            Todas as alterações são aplicadas em tempo real ao motor de equações diferenciais.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs rounded-sm transition-all cursor-pointer"
          >
            Concluir & Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
