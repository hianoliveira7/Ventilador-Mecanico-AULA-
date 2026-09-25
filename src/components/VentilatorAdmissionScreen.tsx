import React, { useState } from 'react';
import {
  VentilatorSettings,
  PatientParameters,
  ClinicalCase,
  VentilationMode,
} from '../types/ventilation';
import { calculateIBW } from '../services/physicsEngine';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../context/ThemeContext';
import {
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  User,
  Stethoscope,
  Wind,
  Layers,
  Settings,
  ShieldAlert,
  ArrowRight,
  Flame,
  FileText,
  RotateCcw,
  Sliders,
  Info,
} from 'lucide-react';

interface VentilatorAdmissionScreenProps {
  currentCase: ClinicalCase | null;
  patient: PatientParameters;
  initialSettings: VentilatorSettings;
  onStartVentilation: (configuredSettings: VentilatorSettings) => void;
  onOpenCasesList?: () => void;
  onUpdatePatient?: (updated: PatientParameters) => void;
}

export const VentilatorAdmissionScreen: React.FC<VentilatorAdmissionScreenProps> = ({
  currentCase,
  patient,
  initialSettings,
  onStartVentilation,
  onOpenCasesList,
  onUpdatePatient,
}) => {
  const { isLight } = useTheme();

  // Local drafted settings for admission (FiO2 starts at 21% room air minimum)
  const [mode, setMode] = useState<VentilationMode>('VCV');
  const [fio2, setFio2] = useState<number>(() => Math.max(21, initialSettings.fio2 || 21));
  const [peep, setPeep] = useState<number>(0);
  const [tidalVolume, setTidalVolume] = useState<number>(0);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(0);
  const [inspiratoryFlow, setInspiratoryFlow] = useState<number>(0);
  const [flowWaveform, setFlowWaveform] = useState<'decelerating' | 'square'>('decelerating');
  const [inspiratoryPressure, setInspiratoryPressure] = useState<number>(0);
  const [inspiratoryTimePCV, setInspiratoryTimePCV] = useState<number>(0);
  const [pressureSupport, setPressureSupport] = useState<number>(0);
  const [triggerSensitivity, setTriggerSensitivity] = useState<number>(0);

  const ibw = calculateIBW(patient.heightCm, patient.gender);
  const vtPerKg = Number((tidalVolume / ibw).toFixed(1));

  // Calculate Ti in VCV mode from Vt and Flow
  const calcFactor = flowWaveform === 'decelerating' ? 0.65 : 1.0;
  const calculatedTiVCV =
    inspiratoryFlow > 0 && tidalVolume > 0
      ? Number(((tidalVolume * 0.06) / (inspiratoryFlow * calcFactor)).toFixed(2))
      : (inspiratoryTimePCV > 0 ? inspiratoryTimePCV : 0);

  // Synchronize inspiratoryTimePCV when flow, Vt, or waveform change
  const handleFlowChange = (newFlow: number) => {
    setInspiratoryFlow(newFlow);
    if (newFlow > 0 && tidalVolume > 0) {
      const ti = Number(((tidalVolume * 0.06) / (newFlow * calcFactor)).toFixed(2));
      setInspiratoryTimePCV(ti);
    }
  };

  const handleVtChange = (newVt: number) => {
    setTidalVolume(newVt);
    if (inspiratoryFlow > 0 && newVt > 0) {
      const ti = Number(((newVt * 0.06) / (inspiratoryFlow * calcFactor)).toFixed(2));
      setInspiratoryTimePCV(ti);
    }
  };

  const handleWaveformChange = (newWaveform: 'decelerating' | 'square') => {
    setFlowWaveform(newWaveform);
    const newFactor = newWaveform === 'decelerating' ? 0.65 : 1.0;
    if (inspiratoryFlow > 0 && tidalVolume > 0) {
      const ti = Number(((tidalVolume * 0.06) / (inspiratoryFlow * newFactor)).toFixed(2));
      setInspiratoryTimePCV(ti);
    }
  };

  const handleTiChangeInVCV = (newTi: number) => {
    setInspiratoryTimePCV(newTi);
    if (newTi > 0 && tidalVolume > 0) {
      const requiredFlow = Math.max(10, Math.min(120, Math.round((tidalVolume * 0.06) / (newTi * calcFactor))));
      setInspiratoryFlow(requiredFlow);
    }
  };

  // Determine safety color for Vt
  const vtStatusColor =
    vtPerKg < 4.0
      ? 'text-amber-400 border-amber-500/50 bg-amber-950/30'
      : vtPerKg <= 6.5
      ? 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30'
      : vtPerKg <= 8.0
      ? 'text-amber-400 border-amber-500/50 bg-amber-950/30'
      : 'text-rose-400 border-rose-500/50 bg-rose-950/30';

  const handleApplyPresetVt = (targetMlPerKg: number) => {
    audioEngine.playClick(880);
    const newVt = Math.round(ibw * targetMlPerKg);
    handleVtChange(newVt);
  };

  const handleConfirmAndStart = () => {
    audioEngine.playConfirmBeep();
    const currentCalcFactor = flowWaveform === 'decelerating' ? 0.65 : 1.0;
    const computedTi =
      inspiratoryFlow > 0 && tidalVolume > 0
        ? Number(((tidalVolume * 0.06) / (inspiratoryFlow * currentCalcFactor)).toFixed(2))
        : 1.0;

    const finalTi =
      mode === 'VCV' || mode === 'SIMV_VC'
        ? (computedTi > 0 ? computedTi : (inspiratoryTimePCV > 0 ? inspiratoryTimePCV : 1.0))
        : (inspiratoryTimePCV > 0 ? inspiratoryTimePCV : 1.0);

    const finalFlow =
      inspiratoryFlow > 0
        ? inspiratoryFlow
        : (tidalVolume > 0 && finalTi > 0
            ? Math.max(10, Math.min(120, Math.round((tidalVolume * 0.06) / (finalTi * currentCalcFactor))))
            : 45);

    const finalSettings: VentilatorSettings = {
      ...initialSettings,
      mode,
      fio2: Math.max(21, fio2),
      peep,
      tidalVolume,
      respiratoryRate,
      inspiratoryFlow: finalFlow,
      flowWaveform,
      inspiratoryPressure,
      inspiratoryTimePCV: finalTi,
      pressureSupport,
      triggerSensitivity: triggerSensitivity > 0 ? triggerSensitivity : 2.0,
    };
    onStartVentilation(finalSettings);
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col overflow-y-auto select-none ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#060709] text-zinc-100'
      }`}
    >
      {/* Top Admission Header Bar */}
      <header
        className={`px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md ${
          isLight
            ? 'bg-white/95 border-slate-200 shadow-sm'
            : 'bg-[#0b0d13]/95 border-zinc-800 shadow-xl'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-sm tracking-wide">
                ADMISSÃO & CONFIGURAÇÃO DO VENTILADOR MECÂNICO
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ⏸️ STANDBY
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Paciente recém-intubado. Programe os parâmetros iniciais antes de acionar a ventilação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onOpenCasesList && (
            <button
              onClick={onOpenCasesList}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isLight
                  ? 'bg-slate-50 border-slate-300 hover:bg-slate-200 text-slate-700'
                  : 'bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ver Outros Casos</span>
            </button>
          )}

          <button
            onClick={handleConfirmAndStart}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>INICIAR VENTILAÇÃO MECÂNICA</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-8 max-w-[1550px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Clinical Context, Anthropometry & IBW (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Patient Card & Clinical History */}
          <div
            className={`p-5 rounded-3xl border space-y-4 ${
              isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-[#0f1118] border-zinc-800 shadow-xl'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-cyan-400" />
                <h2 className="font-display font-black text-base">
                  {currentCase?.patientProfile.name || patient.name}
                </h2>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-bold">
                LEITO 04 - UTI ADULTO
              </span>
            </div>

            {/* Anthropometric Data & Weight Comparison */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div
                className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <span className="text-[10px] font-mono text-zinc-400 block">Gênero / Idade</span>
                <span className="font-bold text-xs">
                  {patient.gender === 'male' ? 'Masc' : 'Fem'} • {patient.age} anos
                </span>
              </div>
              <div
                className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <span className="text-[10px] font-mono text-zinc-400 block">Altura</span>
                <span className="font-bold text-xs font-mono text-cyan-400">{patient.heightCm} cm</span>
              </div>
              <div
                className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <span className="text-[10px] font-mono text-zinc-400 block">Peso Real na Balança</span>
                <span className="font-bold text-xs font-mono text-amber-400">{patient.actualWeightKg} kg</span>
              </div>
            </div>

            {/* Clinical Guidance: Student IBW Calculation Challenge */}
            <div className={`p-3.5 rounded-xl border space-y-2.5 ${
              isLight ? 'bg-indigo-50/80 border-indigo-200' : 'bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/40'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-indigo-300">
                  <Calculator className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-display font-bold">
                    DESAFIO: CÁLCULO DO PESO PREDITO (IBW)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-500/30">
                  Cálculo Obrigatório do Aluno
                </span>
              </div>
              
              <p className="text-[11.5px] leading-relaxed font-sans text-indigo-200/90">
                ⚠️ <strong>Atenção do Estudante:</strong> O ventilador não calculará o Peso Predito por você. Utilize os dados de antropometria do paciente para calcular o <strong>IBW</strong> e programe o Volume Corrente ($V_t$) de <strong>4 a 8 mL/kg</strong> de Peso Predito:
              </p>

              <div className="p-2.5 rounded-lg bg-black/40 border border-indigo-500/30 text-[10.5px] font-mono text-indigo-200 space-y-1">
                <div className="flex justify-between border-b border-indigo-500/20 pb-1">
                  <span>MASCULINO:</span>
                  <span className="text-indigo-300 font-bold">50 + 0.91 × (Altura em cm - 152.4)</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span>FEMININO:</span>
                  <span className="text-indigo-300 font-bold">45.5 + 0.91 × (Altura em cm - 152.4)</span>
                </div>
              </div>
            </div>

            {/* Clinical Case Summary */}
            {currentCase && (
              <div
                className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/40 border-zinc-800'
                }`}
              >
                <span className="font-display font-bold text-[11px] text-cyan-400 block">
                  História Clínica & Exame de Admissão
                </span>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  {currentCase.clinicalHistory || currentCase.description}
                </p>
                {currentCase.physicalExam && (
                  <p className={`text-[10px] italic border-t pt-1 ${isLight ? 'text-slate-500 border-slate-200' : 'text-zinc-400 border-zinc-800'}`}>
                    🩺 {currentCase.physicalExam}
                  </p>
                )}
              </div>
            )}

            {/* Pre-Use Checklist / Circuit Tests */}
            <div
              className={`p-3 rounded-xl border space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/40 border-zinc-800'
              }`}
            >
              <span className="font-display font-bold text-[11px] text-zinc-300 block">
                Auto-Teste do Ventilador & Circuito
              </span>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Circuito Duplo + Sensor de Fluxo
                  </span>
                  <span className="text-[10px] font-bold">CALIBRADO</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Teste de Estanqueidade / Fuga
                  </span>
                  <span className="text-[10px] font-bold">0.0 mL/min (OK)</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Filtro Barreira HME / Traqueias
                  </span>
                  <span className="text-[10px] font-bold">CONECTADO</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Initial Ventilator Prescription (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={`p-5 rounded-2xl border space-y-5 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f1118] border-zinc-800 shadow-lg'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h2 className="font-display font-bold text-sm">
                  PROGRAMAÇÃO DA PRESCRIÇÃO INICIAL
                </h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Ajuste os dials</span>
            </div>

            {/* Mode Selector Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-display font-bold text-zinc-300 block">
                1. Selecione o Modo Ventilatório Inicial
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['VCV', 'PCV', 'PSV', 'PRVC'] as VentilationMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      audioEngine.playClick(900);
                      setMode(m);
                    }}
                    className={`py-2 px-3 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer text-center ${
                      mode === m
                        ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-950/50 scale-[1.02]'
                        : isLight
                        ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Parameters Grid */}
            <div className="space-y-4 pt-1">
              {mode === 'VCV' || mode === 'PRVC' ? (
                /* VCV Parameter Controls */
                <div className="space-y-3.5">
                  {/* Tidal Volume with dynamic mL/kg */}
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-display font-bold block">
                          Volume Corrente ($V_t$)
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          Alvo protetor: 4 a 6 mL/kg de IBW
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-mono font-bold text-cyan-400">
                          {tidalVolume} <span className="text-xs text-zinc-400">mL</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleVtChange(Math.max(0, tidalVolume - 10))}
                        className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={800}
                        step={10}
                        value={tidalVolume}
                        onChange={(e) => handleVtChange(Number(e.target.value))}
                        className="flex-1 accent-cyan-400 h-2 bg-zinc-800 rounded-none cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => handleVtChange(Math.min(800, tidalVolume + 10))}
                        className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Flow, Calculated Ti & Flow Waveform in VCV */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div
                      className={`p-3.5 rounded-2xl border space-y-2 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-display font-bold">Fluxo Inspiratório (VCV)</span>
                        <div className="text-right">
                          <span className="font-mono font-bold text-cyan-400 text-sm block">
                            {inspiratoryFlow} <span className="text-[10px] text-zinc-400">L/min</span>
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold block">
                            T_i Resultante: {calculatedTiVCV > 0 ? `${calculatedTiVCV}s` : '--'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={inspiratoryFlow}
                        onChange={(e) => handleFlowChange(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-2 bg-zinc-800 cursor-pointer"
                      />
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/60">
                        <span>Ajuste rápido de Ti:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTiChangeInVCV(Math.max(0.4, Number((calculatedTiVCV - 0.1).toFixed(2))))}
                            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold cursor-pointer"
                          >
                            -0.1s
                          </button>
                          <span className="text-emerald-400 font-bold px-1">{calculatedTiVCV > 0 ? `${calculatedTiVCV}s` : '1.0s'}</span>
                          <button
                            type="button"
                            onClick={() => handleTiChangeInVCV(Math.min(3.0, Number((calculatedTiVCV + 0.1).toFixed(2))))}
                            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold cursor-pointer"
                          >
                            +0.1s
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl border space-y-2 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                      }`}
                    >
                      <span className="text-xs font-display font-bold block">Forma de Onda de Fluxo</span>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => handleWaveformChange('decelerating')}
                          className={`py-1.5 rounded-xl border transition-colors cursor-pointer ${
                            flowWaveform === 'decelerating'
                              ? 'bg-cyan-600 border-cyan-400 text-white font-bold shadow-md'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          Decrescente 📉
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWaveformChange('square')}
                          className={`py-1.5 rounded-xl border transition-colors cursor-pointer ${
                            flowWaveform === 'square'
                              ? 'bg-cyan-600 border-cyan-400 text-white font-bold shadow-md'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          Quadrada 🟩
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* PCV Parameter Controls */
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-display font-bold">Pressão Insp. (Pinsp)</span>
                        <span className="font-mono font-bold text-cyan-400 text-sm">
                          {inspiratoryPressure} <span className="text-[10px] text-zinc-400">cmH₂O</span>
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={35}
                        step={1}
                        value={inspiratoryPressure}
                        onChange={(e) => setInspiratoryPressure(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1.5 bg-zinc-800 cursor-pointer"
                      />
                    </div>

                    <div
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-display font-bold">Tempo Inspiratório (Tinsp)</span>
                        <span className="font-mono font-bold text-cyan-400 text-sm">
                          {inspiratoryTimePCV} <span className="text-[10px] text-zinc-400">s</span>
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2.5}
                        step={0.05}
                        value={inspiratoryTimePCV}
                        onChange={(e) => setInspiratoryTimePCV(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1.5 bg-zinc-800 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Common Baseline Parameters: RR, PEEP, FiO2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Respiratory Rate */}
                <div
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold">Freq. Resp. (FR)</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {respiratoryRate} <span className="text-[10px] text-zinc-400">rpm</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 cursor-pointer"
                  />
                  <span className="text-[9px] font-mono text-zinc-500 block">
                    Ventilação Minuto: ~{((tidalVolume * respiratoryRate) / 1000).toFixed(1)} L/min
                  </span>
                </div>

                {/* PEEP */}
                <div
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold">PEEP</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {peep} <span className="text-[10px] text-zinc-400">cmH₂O</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    step={1}
                    value={peep}
                    onChange={(e) => setPeep(Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1.5 bg-zinc-800 cursor-pointer"
                  />
                </div>

                {/* FiO2 */}
                <div
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold">FiO₂ (Ar Ar)</span>
                    <span className="font-mono font-bold text-rose-400 text-sm">
                      {fio2} <span className="text-[10px] text-zinc-400">%</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={21}
                    max={100}
                    step={1}
                    value={fio2}
                    onChange={(e) => setFio2(Math.max(21, Number(e.target.value)))}
                    className="w-full accent-rose-400 h-1.5 bg-zinc-800 cursor-pointer"
                  />
                  <span className="text-[9px] font-mono text-zinc-500 block">
                    Ar ambiente mínimo: 21% FiO₂
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation & Launch Action */}
            <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-xs font-mono font-bold text-emerald-400 block">
                  ✓ Configuração de Admissão Pronta
                </span>
                <span className="text-[11px] text-zinc-400">
                  Modo {mode} • Vt {tidalVolume} mL • FR {respiratoryRate} rpm • PEEP {peep} cmH₂O • FiO₂ {fio2}%
                </span>
              </div>

              <button
                type="button"
                onClick={handleConfirmAndStart}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono font-bold text-sm shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>INICIAR VENTILAÇÃO MECÂNICA</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
