import React, { useState } from 'react';
import { PatientParameters, VentilatorSettings, MonitoredData } from '../types/ventilation';
import { ICUHemodynamicsState, ICUNeurologicalState, ICUInfusionPumpsState } from '../types/icu';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../context/ThemeContext';
import {
  Stethoscope,
  Droplets,
  Syringe,
  Wind,
  CheckCircle2,
  X,
  Volume2,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface ICUBedsideInterventionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientParameters;
  settings: VentilatorSettings;
  monitoredData: MonitoredData;
  hemodynamics: ICUHemodynamicsState;
  neurology: ICUNeurologicalState;
  onUpdatePatient: (updated: Partial<PatientParameters>) => void;
  onUpdatePumps: (updater: (prev: ICUInfusionPumpsState) => ICUInfusionPumpsState) => void;
  onDrawBloodGas?: () => void;
}

export const ICUBedsideInterventionsModal: React.FC<ICUBedsideInterventionsModalProps> = ({
  isOpen,
  onClose,
  patient,
  settings,
  monitoredData,
  hemodynamics,
  neurology,
  onUpdatePatient,
  onUpdatePumps,
  onDrawBloodGas,
}) => {
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<'ausculta' | 'aspiracao' | 'bolus' | 'fluido'>('ausculta');
  const [selectedFocus, setSelectedFocus] = useState<'apice_d' | 'apice_e' | 'base_d' | 'base_e'>('base_d');
  const [isPlayingAuscultation, setIsPlayingAuscultation] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Determine auscultation sound type based on patient pathology
  const pathology = patient.pathology?.toLowerCase() || '';
  let auscultationType: 'vesicular' | 'wheezing' | 'crackles' | 'diminished' = 'vesicular';
  let auscultationLabel = 'Murmúrio Vesicular Fisiológico Universalmente Audível';

  if (pathology.includes('dpoc') || pathology.includes('asma') || pathology.includes('broncoespasmo')) {
    auscultationType = 'wheezing';
    auscultationLabel = 'Sibilos Expiratórios Difusos Polifônicos com Tempo Expiratório Prolongado';
  } else if (pathology.includes('sdra') || pathology.includes('sara') || pathology.includes('pneumonia') || pathology.includes('edema')) {
    auscultationType = 'crackles';
    auscultationLabel = 'Estertores Crepitantes Finos Tele-Inspiratórios em Terço Médio e Bases';
  } else if (patient.resistance > 18) {
    auscultationType = 'wheezing';
    auscultationLabel = 'Roncos e Sibilos Transmitidos por Resistência Alta de Vias Aéreas';
  }

  const handlePlayAuscultation = (focus: 'apice_d' | 'apice_e' | 'base_d' | 'base_e') => {
    setSelectedFocus(focus);
    setIsPlayingAuscultation(true);
    audioEngine.playAuscultationSound(auscultationType, 3.8);
    setTimeout(() => setIsPlayingAuscultation(false), 3800);
  };

  const handleSuctionAirways = () => {
    audioEngine.playConfirmBeep();
    // Suctioning clears secretions: reduces airway resistance
    const newResistance = Math.max(6, Math.min(10, patient.resistance * 0.65));
    onUpdatePatient({ resistance: Number(newResistance.toFixed(1)) });
    setActionSuccessMsg('Aspiração de TOT realizada com sucesso! Secreção mucóide aspirada. Resistência de vias aéreas reduzida.');
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleBolusSedation = (drug: 'propofol' | 'fentanyl') => {
    audioEngine.playConfirmBeep();
    if (drug === 'propofol') {
      onUpdatePumps((prev) => ({
        ...prev,
        propofolMcgKgMin: Math.min(80, prev.propofolMcgKgMin + 15),
      }));
      setActionSuccessMsg('Bolus de Propofol 30mg administrado. Sedação aprofundada, relaxamento do paciente e redução da luta com o ventilador.');
    } else {
      onUpdatePumps((prev) => ({
        ...prev,
        fentanylMcgPerHour: Math.min(350, prev.fentanylMcgPerHour + 50),
      }));
      setActionSuccessMsg('Bolus de Fentanil 50 mcg administrado. Otimização da analgesia e alívio do desconforto do tubo traqueal.');
    }
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleFluidBolus = () => {
    audioEngine.playConfirmBeep();
    onUpdatePatient({
      // Fluid challenges increase intravascular volume
    });
    onUpdatePumps((prev) => ({
      ...prev,
      crystalloidRateMlPerHour: prev.crystalloidRateMlPerHour + 500,
    }));
    setActionSuccessMsg('Desafio Volêmico: Infusão de 500 mL de Ringer Lactato em curso. Otimização de pré-carga ventricular e melhora da PAM.');
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-fadeIn font-sans">
      <div
        className={`w-full max-w-2xl rounded-2xl border flex flex-col overflow-hidden shadow-2xl transition-all ${
          isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#0a0d16] border-slate-800 text-slate-100'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between gap-3 text-xs font-mono font-bold ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0f1322] border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-display tracking-wider text-slate-900 dark:text-white">
              CONDUTAS &amp; INTERVENÇÕES NO LEITO DE UTI
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-[#07090e] border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 font-mono text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ausculta')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'ausculta'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Ausculta Pulmonar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('aspiracao')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'aspiracao'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Aspirar TOT</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bolus')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'bolus'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Syringe className="w-3.5 h-3.5 text-purple-400" />
            <span>Bolus de Sedação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fluido')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'fluido'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <span>Expansão Volêmica</span>
          </button>
        </div>

        {/* Feedback message banner */}
        {actionSuccessMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
          {/* TAB 1: AUSCULTA PULMONAR INTERATIVA */}
          {activeTab === 'ausculta' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Thorax Map Target Points */}
                <div className="relative w-52 h-52 bg-slate-900 rounded-xl border border-slate-800 p-2 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 160 160" className="w-full h-full opacity-80">
                    {/* Thorax silhouette */}
                    <path
                      d="M 40 30 Q 80 20 120 30 Q 140 70 135 130 Q 80 145 25 130 Q 20 70 40 30 Z"
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="2"
                    />
                    {/* Sternum */}
                    <line x1="80" y1="35" x2="80" y2="105" stroke="#64748b" strokeWidth="2" strokeDasharray="3 2" />
                  </svg>

                  {/* 4 Interactive Stethoscope Target Buttons */}
                  <button
                    type="button"
                    onClick={() => handlePlayAuscultation('apice_d')}
                    className={`absolute top-10 left-11 p-2 rounded-full border cursor-pointer transition-all hover:scale-110 shadow-lg ${
                      selectedFocus === 'apice_d'
                        ? 'bg-cyan-500 text-white border-cyan-300 ring-4 ring-cyan-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                    title="Auscultar Ápice Direito"
                  >
                    <Stethoscope className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlayAuscultation('apice_e')}
                    className={`absolute top-10 right-11 p-2 rounded-full border cursor-pointer transition-all hover:scale-110 shadow-lg ${
                      selectedFocus === 'apice_e'
                        ? 'bg-cyan-500 text-white border-cyan-300 ring-4 ring-cyan-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                    title="Auscultar Ápice Esquerdo"
                  >
                    <Stethoscope className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlayAuscultation('base_d')}
                    className={`absolute bottom-11 left-12 p-2 rounded-full border cursor-pointer transition-all hover:scale-110 shadow-lg ${
                      selectedFocus === 'base_d'
                        ? 'bg-cyan-500 text-white border-cyan-300 ring-4 ring-cyan-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                    title="Auscultar Base Direita"
                  >
                    <Stethoscope className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlayAuscultation('base_e')}
                    className={`absolute bottom-11 right-12 p-2 rounded-full border cursor-pointer transition-all hover:scale-110 shadow-lg ${
                      selectedFocus === 'base_e'
                        ? 'bg-cyan-500 text-white border-cyan-300 ring-4 ring-cyan-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                    title="Auscultar Base Esquerda"
                  >
                    <Stethoscope className="w-4 h-4" />
                  </button>
                </div>

                {/* Auscultation Info & Audio Controls */}
                <div className="flex-1 space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Foco Selecionado</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedFocus === 'apice_d' ? 'Ápice Pulmonar Direito' : selectedFocus === 'apice_e' ? 'Ápice Pulmonar Esquerdo' : selectedFocus === 'base_d' ? 'Base Pulmonar Direita' : 'Base Pulmonar Esquerda'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0d1220] border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] text-cyan-400 font-bold block">Achados Estetacústicos:</span>
                    <p className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                      {auscultationLabel}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlayAuscultation(selectedFocus)}
                    disabled={isPlayingAuscultation}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-50"
                  >
                    <Volume2 className={`w-4 h-4 ${isPlayingAuscultation ? 'animate-bounce' : ''}`} />
                    <span>{isPlayingAuscultation ? 'Ouvindo Ruídos Respiratórios...' : 'Ouvir Som da Ausculta (3.5s)'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ASPIRAÇÃO DE VIAS AÉREAS */}
          {activeTab === 'aspiracao' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800 space-y-2">
                <h4 className="font-bold text-cyan-300 text-sm flex items-center gap-2">
                  <Wind className="w-4 h-4" />
                  Aspiração Traqueal em Sistema Fechado (Trach Care)
                </h4>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Indicada para desobstrução de secreções na cânula orotraqueal, redução do pico de pressão inspiratória (P_pico) e normalização da resistência de vias aéreas (Raw).
                </p>
                <div className="pt-2 text-[11px] text-cyan-200">
                  <span>Resistência Atual: <strong>{patient.resistance} cmH₂O/L/s</strong> • Pressão de Pico: <strong>{monitoredData.peakPressure} cmH₂O</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSuctionAirways}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <Wind className="w-4 h-4" />
                <span>Realizar Aspiração Traqueal Imediata</span>
              </button>
            </div>
          )}

          {/* TAB 3: BOLUS DE SEDAÇÃO / ANALGESIA */}
          {activeTab === 'bolus' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800 space-y-1.5">
                <h4 className="font-bold text-purple-300 text-sm flex items-center gap-2">
                  <Syringe className="w-4 h-4" />
                  Sedoanalgesia de Resgate
                </h4>
                <p className="text-slate-300 font-sans leading-relaxed">
                  Utilizada quando o paciente apresenta dor pelo tubo, agitação psicomotora, assincronia de esforço ineficaz ou duplo disparo por drive excessivo.
                </p>
                <span className="text-[11px] text-purple-200 block pt-1">
                  RASS Atual: <strong>{neurology.rassScore > 0 ? `+${neurology.rassScore}` : neurology.rassScore} ({neurology.rassDescription})</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleBolusSedation('propofol')}
                  className="p-3.5 rounded-xl border border-blue-600 bg-blue-950/60 hover:bg-blue-900 text-white font-bold text-left cursor-pointer transition-all flex flex-col justify-between gap-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Bolus Propofol 30mg</span>
                    <span className="text-[10px] text-cyan-400">Hipnótico</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-sans">
                    Aprofunda sedação imediatamente e cessa esforço respiratório agressivo.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBolusSedation('fentanyl')}
                  className="p-3.5 rounded-xl border border-purple-600 bg-purple-950/60 hover:bg-purple-900 text-white font-bold text-left cursor-pointer transition-all flex flex-col justify-between gap-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Bolus Fentanil 50mcg</span>
                    <span className="text-[10px] text-purple-300">Opioide</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-sans">
                    Alivia dor do TOT, reduz taquicardia reflexa e normaliza frequência cardíaca.
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: EXPANSÃO VOLÊMICA */}
          {activeTab === 'fluido' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800 space-y-1.5">
                <h4 className="font-bold text-blue-300 text-sm flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  Ressuscitação Volêmica com Cristaloides
                </h4>
                <p className="text-slate-300 font-sans leading-relaxed">
                  Indicada para pacientes com hipotensão arterial induzida por altos níveis de PEEP ou choque séptico com volemia insuficiente.
                </p>
                <div className="pt-1 text-[11px] text-blue-200">
                  <span>PAM Atual: <strong>{hemodynamics.meanArterialPressure} mmHg</strong> • PVC Atual: <strong>{hemodynamics.centralVenousPressure} cmH₂O</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFluidBolus}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <Droplets className="w-4 h-4" />
                <span>Infundir 500 mL de Ringer Lactato em Bolus Rápido</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
