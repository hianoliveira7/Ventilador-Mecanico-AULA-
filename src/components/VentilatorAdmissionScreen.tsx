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
  FileText,
  Sliders,
  ShieldAlert,
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
  const [validationError, setValidationError] = useState<string[] | null>(null);

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

  const getMissingParameters = (): string[] => {
    const missing: string[] = [];

    if (mode === 'VCV') {
      if (tidalVolume <= 0) missing.push('Volume Corrente (Vt)');
      if (respiratoryRate <= 0) missing.push('Frequência Respiratória (FR)');
      if (peep <= 0) missing.push('PEEP');
      if (inspiratoryFlow <= 0 && calculatedTiVCV <= 0) missing.push('Fluxo Inspiratório');
    } else if (mode === 'PCV') {
      if (inspiratoryPressure <= 0) missing.push('Pressão Inspiratória (Pinsp)');
      if (respiratoryRate <= 0) missing.push('Frequência Respiratória (FR)');
      if (inspiratoryTimePCV <= 0) missing.push('Tempo Inspiratório (Tinsp)');
      if (peep <= 0) missing.push('PEEP');
    } else if (mode === 'PRVC') {
      if (tidalVolume <= 0) missing.push('Volume Corrente Alvo (Vt)');
      if (respiratoryRate <= 0) missing.push('Frequência Respiratória (FR)');
      if (inspiratoryTimePCV <= 0) missing.push('Tempo Inspiratório (Tinsp)');
      if (peep <= 0) missing.push('PEEP');
    } else if (mode === 'PSV') {
      if (pressureSupport <= 0) missing.push('Pressão de Suporte (ΔPS)');
      if (respiratoryRate <= 0) missing.push('Frequência Resp. Backup (FR)');
      if (peep <= 0) missing.push('PEEP');
    }

    if (fio2 < 21) missing.push('FiO₂ (Mínimo 21%)');

    return missing;
  };

  const handleConfirmAndStart = () => {
    const missing = getMissingParameters();
    if (missing.length > 0) {
      audioEngine.playErrorBeep();
      setValidationError(missing);
      const section = document.getElementById('admission-params-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    setValidationError(null);
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

  const missingList = getMissingParameters();
  const isMissingParams = missingList.length > 0;

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
            ? 'bg-white/95 border-slate-200 shadow-sm text-slate-900'
            : 'bg-[#0b0d13]/95 border-zinc-800 shadow-xl text-zinc-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border animate-pulse ${
            isLight
              ? 'bg-amber-100 border-amber-300 text-amber-800 font-bold'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-display font-black text-sm tracking-wide ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                ADMISSÃO & CONFIGURAÇÃO DO VENTILADOR MECÂNICO
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                isLight
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                ⏸️ STANDBY
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'}`}>
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
                  ? 'bg-white border-slate-300 hover:bg-slate-200 text-slate-800 shadow-xs'
                  : 'bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ver Outros Casos</span>
            </button>
          )}

          <button
            onClick={handleConfirmAndStart}
            className={`px-5 py-2.5 rounded-xl font-mono font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all ${
              isMissingParams
                ? isLight
                  ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-rose-200 animate-pulse'
                  : 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-rose-950/40 animate-pulse'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-950/40 hover:scale-105'
            }`}
          >
            {isMissingParams ? (
              <>
                <AlertTriangle className={`w-4 h-4 ${isLight ? 'text-white' : 'text-amber-200'}`} />
                <span>INICIAR VENTILAÇÃO ({missingList.length} PENDENTES)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>INICIAR VENTILAÇÃO MECÂNICA</span>
              </>
            )}
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
              isLight ? 'bg-white border-slate-300 shadow-md text-slate-900' : 'bg-[#0f1118] border-zinc-800 shadow-xl text-zinc-100'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
              <div className="flex items-center gap-2.5">
                <User className={`w-5 h-5 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
                <h2 className={`font-display font-black text-base ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                  {currentCase?.patientProfile.name || patient.name}
                </h2>
              </div>
              <span className={`text-xs font-mono px-2.5 py-1 rounded-lg border font-bold ${
                isLight ? 'bg-cyan-100 border-cyan-300 text-cyan-900' : 'bg-cyan-950/60 border-cyan-800/60 text-cyan-300'
              }`}>
                LEITO 04 - UTI ADULTO
              </span>
            </div>

            {/* Anthropometric Data & Weight Comparison */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div
                className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <span className={`text-[10px] font-mono block ${isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'}`}>Gênero / Idade</span>
                <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                  {patient.gender === 'male' ? 'Masc' : 'Fem'} • {patient.age} anos
                </span>
              </div>
              <div
                className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <span className={`text-[10px] font-mono block ${isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'}`}>Altura</span>
                <span className={`font-bold text-xs font-mono ${isLight ? 'text-cyan-800 font-black' : 'text-cyan-400'}`}>{patient.heightCm} cm</span>
              </div>
              <div
                className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <span className={`text-[10px] font-mono block ${isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'}`}>Peso Real</span>
                <span className={`font-bold text-xs font-mono ${isLight ? 'text-amber-800 font-black' : 'text-amber-400'}`}>{patient.actualWeightKg} kg</span>
              </div>
            </div>

            {/* Clinical Guidance: Student IBW Calculation Challenge */}
            <div className={`p-3.5 rounded-xl border space-y-2.5 ${
              isLight ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-xs' : 'bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/40 text-indigo-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 ${isLight ? 'text-indigo-950 font-black' : 'text-indigo-300'}`}>
                  <Calculator className={`w-4 h-4 ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`} />
                  <span className="text-xs font-display font-bold">
                    DESAFIO: CÁLCULO DO PESO PREDITO (IBW)
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  isLight ? 'bg-indigo-200/80 text-indigo-950 border-indigo-400 font-bold' : 'bg-indigo-900/60 text-indigo-200 border-indigo-500/30'
                }`}>
                  Cálculo Obrigatório do Aluno
                </span>
              </div>
              
              <p className={`text-[11.5px] leading-relaxed font-sans ${isLight ? 'text-indigo-950 font-medium' : 'text-indigo-200/90'}`}>
                ⚠️ <strong>Atenção do Estudante:</strong> O ventilador não calculará o Peso Predito por você. Utilize os dados de antropometria do paciente para calcular o <strong>IBW</strong> e programe o Volume Corrente ($V_t$) de <strong>4 a 8 mL/kg</strong> de Peso Predito:
              </p>

              <div className={`p-2.5 rounded-lg border text-[10.5px] font-mono space-y-1 ${
                isLight ? 'bg-white border-indigo-200 text-indigo-950 shadow-xs' : 'bg-black/40 border-indigo-500/30 text-indigo-200'
              }`}>
                <div className={`flex justify-between border-b pb-1 ${isLight ? 'border-indigo-200 font-semibold' : 'border-indigo-500/20'}`}>
                  <span className="font-bold">MASCULINO:</span>
                  <span className={`font-bold ${isLight ? 'text-indigo-800' : 'text-indigo-300'}`}>50 + 0.91 × (Altura em cm - 152.4)</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="font-bold">FEMININO:</span>
                  <span className={`font-bold ${isLight ? 'text-indigo-800' : 'text-indigo-300'}`}>45.5 + 0.91 × (Altura em cm - 152.4)</span>
                </div>
              </div>
            </div>

            {/* Clinical Case Summary */}
            {currentCase && (
              <div
                className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-300 shadow-xs text-slate-900' : 'bg-zinc-900/40 border-zinc-800 text-zinc-100'
                }`}
              >
                <span className={`font-display font-bold text-[11px] block ${isLight ? 'text-cyan-800 font-black' : 'text-cyan-400'}`}>
                  História Clínica & Exame de Admissão
                </span>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-900 font-medium' : 'text-zinc-300'}`}>
                  {currentCase.clinicalHistory || currentCase.description}
                </p>
                {currentCase.physicalExam && (
                  <p className={`text-[10px] italic border-t pt-1 ${isLight ? 'text-slate-700 border-slate-300 font-semibold' : 'text-zinc-400 border-zinc-800'}`}>
                    🩺 {currentCase.physicalExam}
                  </p>
                )}
              </div>
            )}

            {/* Pre-Use Checklist / Circuit Tests */}
            <div
              className={`p-3 rounded-xl border space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-300 shadow-xs text-slate-900' : 'bg-zinc-900/40 border-zinc-800 text-zinc-100'
              }`}
            >
              <span className={`font-display font-bold text-[11px] block ${isLight ? 'text-slate-900 font-black' : 'text-zinc-300'}`}>
                Auto-Teste do Ventilador & Circuito
              </span>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className={`flex items-center justify-between ${isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Circuito Duplo + Sensor de Fluxo
                  </span>
                  <span className="text-[10px] font-bold">CALIBRADO</span>
                </div>
                <div className={`flex items-center justify-between ${isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Teste de Estanqueidade / Fuga
                  </span>
                  <span className="text-[10px] font-bold">0.0 mL/min (OK)</span>
                </div>
                <div className={`flex items-center justify-between ${isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>
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
        <div id="admission-params-section" className="lg:col-span-7 space-y-4">
          <div
            className={`p-5 rounded-2xl border space-y-5 ${
              isLight ? 'bg-white border-slate-300 shadow-sm text-slate-900' : 'bg-[#0f1118] border-zinc-800 shadow-lg text-zinc-100'
            }`}
          >
            <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
              <div className="flex items-center gap-2">
                <Sliders className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                <h2 className={`font-display font-bold text-sm ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                  PROGRAMAÇÃO DA PRESCRIÇÃO INICIAL
                </h2>
              </div>
            </div>

            {/* Validation Error Warning Banner */}
            {validationError && validationError.length > 0 && (
              <div className={`p-4 rounded-2xl border-2 space-y-2.5 animate-pulse shadow-xl ${
                isLight
                  ? 'bg-rose-50 border-rose-500 text-rose-950 shadow-rose-100'
                  : 'bg-rose-950/95 border-2 border-rose-500 text-rose-100 shadow-rose-950/70'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-5 h-5 shrink-0 ${isLight ? 'text-rose-700' : 'text-rose-400'}`} />
                    <span className={`font-display font-black text-xs sm:text-sm tracking-wide ${isLight ? 'text-rose-950' : 'text-rose-200'}`}>
                      ⛔ VENTILAÇÃO BLOQUEADA: PARÂMETROS OBRIGATÓRIOS AUSENTES
                    </span>
                  </div>
                </div>
                <p className={`text-xs leading-relaxed font-sans ${isLight ? 'text-rose-900 font-medium' : 'text-rose-200/90'}`}>
                  Para a segurança do paciente recém-intubado, é <strong>estritamente obrigatório</strong> programar todos os parâmetros iniciais no ventilador antes de acionar a ventilação mecânica.
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className={`text-[11px] font-mono font-bold ${isLight ? 'text-rose-900' : 'text-rose-300'}`}>Faltam ajustar:</span>
                  {validationError.map((item, idx) => (
                    <span
                      key={idx}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border shadow-xs ${
                        isLight
                          ? 'bg-rose-200 border-rose-400 text-rose-950'
                          : 'bg-rose-900/90 border-rose-400/60 text-rose-100'
                      }`}
                    >
                      ⚠️ {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Mode Selector Tabs */}
            <div className="space-y-1.5">
              <label className={`text-xs font-display font-bold block ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
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
                      setValidationError(null);
                    }}
                    className={`py-2 px-3 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer text-center ${
                      mode === m
                        ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-950/50 scale-[1.02]'
                        : isLight
                        ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 shadow-xs'
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
                    className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                      tidalVolume <= 0
                        ? isLight
                          ? 'border-rose-400 bg-rose-50 shadow-md'
                          : 'border-rose-500/80 bg-rose-950/20 shadow-md shadow-rose-950/40'
                        : isLight ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-display font-bold block ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                            Volume Corrente ($V_t$)
                          </span>
                          {tidalVolume <= 0 && (
                            <span className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold animate-pulse ${
                              isLight ? 'bg-rose-200 text-rose-950 border-rose-400' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}>
                              ⚠️ OBRIGATÓRIO (Definir Vt)
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-mono ${isLight ? 'text-slate-600 font-semibold' : 'text-zinc-400'}`}>
                          Faixa protetora recomendada: 4 a 8 mL/kg de IBW
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-mono font-bold ${
                          tidalVolume <= 0
                            ? isLight ? 'text-rose-700 animate-pulse font-black' : 'text-rose-400 animate-pulse'
                            : isLight ? 'text-cyan-800 font-black' : 'text-cyan-400'
                        }`}>
                          {tidalVolume} <span className={`text-xs ${isLight ? 'text-slate-600 font-semibold' : 'text-zinc-400'}`}>mL</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleVtChange(Math.max(0, tidalVolume - 10))}
                        className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center cursor-pointer ${
                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                        }`}
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
                        className={`flex-1 accent-cyan-600 h-2 cursor-pointer ${isLight ? 'bg-slate-300' : 'bg-zinc-800'}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleVtChange(Math.min(800, tidalVolume + 10))}
                        className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center cursor-pointer ${
                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Flow, Calculated Ti & Flow Waveform in VCV */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div
                      className={`p-3.5 rounded-2xl border space-y-2 transition-all ${
                        inspiratoryFlow <= 0 && calculatedTiVCV <= 0
                          ? isLight
                            ? 'border-rose-400 bg-rose-50 shadow-md'
                            : 'border-rose-500/80 bg-rose-950/20 shadow-md'
                          : isLight ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-display font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Fluxo Inspiratório (VCV)</span>
                          {inspiratoryFlow <= 0 && (
                            <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>⚠️ OBRIGATÓRIO</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold text-sm block ${isLight ? 'text-cyan-800 font-black' : 'text-cyan-400'}`}>
                            {inspiratoryFlow} <span className={`text-[10px] ${isLight ? 'text-slate-600 font-semibold' : 'text-zinc-400'}`}>L/min</span>
                          </span>
                          <span className={`text-[10px] font-mono font-semibold block ${isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>
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
                        className={`w-full accent-cyan-600 h-2 cursor-pointer ${isLight ? 'bg-slate-300' : 'bg-zinc-800'}`}
                      />
                      <div className={`flex items-center justify-between text-[10px] font-mono pt-1 border-t ${
                        isLight ? 'text-slate-600 border-slate-200 font-medium' : 'text-zinc-400 border-zinc-800/60'
                      }`}>
                        <span>Ajuste rápido de Ti:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTiChangeInVCV(Math.max(0.4, Number((calculatedTiVCV - 0.1).toFixed(2))))}
                            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                            }`}
                          >
                            -0.1s
                          </button>
                          <span className={`font-bold px-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{calculatedTiVCV > 0 ? `${calculatedTiVCV}s` : '1.0s'}</span>
                          <button
                            type="button"
                            onClick={() => handleTiChangeInVCV(Math.min(3.0, Number((calculatedTiVCV + 0.1).toFixed(2))))}
                            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                            }`}
                          >
                            +0.1s
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl border space-y-2 ${
                        isLight ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                      }`}
                    >
                      <span className={`text-xs font-display font-bold block ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Forma de Onda de Fluxo</span>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => handleWaveformChange('decelerating')}
                          className={`py-1.5 rounded-xl border transition-colors cursor-pointer ${
                            flowWaveform === 'decelerating'
                              ? 'bg-cyan-600 border-cyan-400 text-white font-bold shadow-md'
                              : isLight
                              ? 'bg-slate-200 border-slate-300 text-slate-800 font-semibold hover:bg-slate-300'
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
                              : isLight
                              ? 'bg-slate-200 border-slate-300 text-slate-800 font-semibold hover:bg-slate-300'
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
                      className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                        inspiratoryPressure <= 0
                          ? isLight
                            ? 'border-rose-400 bg-rose-50 shadow-md'
                            : 'border-rose-500/80 bg-rose-950/20 shadow-md'
                          : isLight ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-display font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Pressão Insp. (Pinsp)</span>
                          {inspiratoryPressure <= 0 && (
                            <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>⚠️ OBRIGATÓRIO</span>
                          )}
                        </div>
                        <span className={`font-mono font-bold text-sm ${isLight ? 'text-cyan-800 font-black' : 'text-cyan-400'}`}>
                          {inspiratoryPressure} <span className={`text-[10px] ${isLight ? 'text-slate-600 font-semibold' : 'text-zinc-400'}`}>cmH₂O</span>
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={35}
                        step={1}
                        value={inspiratoryPressure}
                        onChange={(e) => setInspiratoryPressure(Number(e.target.value))}
                        className={`w-full accent-cyan-600 h-1.5 cursor-pointer ${isLight ? 'bg-slate-300' : 'bg-zinc-800'}`}
                      />
                    </div>

                    <div
                      className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                        inspiratoryTimePCV <= 0
                          ? isLight
                            ? 'border-rose-400 bg-rose-50 shadow-md'
                            : 'border-rose-500/80 bg-rose-950/20 shadow-md'
                          : isLight ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-display font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Tempo Inspiratório (Tinsp)</span>
                          {inspiratoryTimePCV <= 0 && (
                            <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>⚠️ OBRIGATÓRIO</span>
                          )}
                        </div>
                        <span className={`font-mono font-bold text-sm ${isLight ? 'text-cyan-800 font-black' : 'text-cyan-400'}`}>
                          {inspiratoryTimePCV} <span className={`text-[10px] ${isLight ? 'text-slate-600 font-semibold' : 'text-zinc-400'}`}>s</span>
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2.5}
                        step={0.05}
                        value={inspiratoryTimePCV}
                        onChange={(e) => setInspiratoryTimePCV(Number(e.target.value))}
                        className={`w-full accent-cyan-600 h-1.5 cursor-pointer ${isLight ? 'bg-slate-300' : 'bg-zinc-800'}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Common Baseline Parameters: RR, PEEP, FiO2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Respiratory Rate */}
                <div
                  className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                    respiratoryRate <= 0
                      ? isLight
                        ? 'border-rose-400 bg-rose-50 shadow-md'
                        : 'border-rose-500/80 bg-rose-950/20 shadow-md'
                      : isLight ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-display font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>Freq. Resp. (FR)</span>
                      {respiratoryRate <= 0 && (
                        <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>⚠️ OBRIG.</span>
                      )}
                    </div>
                    <span className={`font-mono font-bold text-sm ${isLight ? 'text-amber-800 font-black' : 'text-amber-400'}`}>
                      {respiratoryRate} <span className={`text-[10px] ${isLight ? 'text-slate-600 font-semibold' : 'text-zinc-400'}`}>rpm</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                    className={`w-full accent-amber-500 h-1.5 cursor-pointer ${isLight ? 'bg-slate-300' : 'bg-zinc-800'}`}
                  />
                  <span className={`text-[9px] font-mono block ${isLight ? 'text-slate-600 font-semibold' : 'text-zinc-500'}`}>
                    Ventilação Minuto: ~{((tidalVolume * respiratoryRate) / 1000).toFixed(1)} L/min
                  </span>
                </div>

                {/* PEEP */}
                <div
                  className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                    peep <= 0
                      ? isLight
                        ? 'border-rose-400 bg-rose-50 shadow-md'
                        : 'border-rose-500/80 bg-rose-950/20 shadow-md'
                      : isLight ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-display font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>PEEP</span>
                      {peep <= 0 && (
                        <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>⚠️ OBRIG.</span>
                      )}
                    </div>
                    <span className={`font-mono font-bold text-sm ${isLight ? 'text-emerald-700 font-black' : 'text-emerald-400'}`}>
                      {peep} <span className={`text-[10px] ${isLight ? 'text-slate-600 font-semibold' : 'text-zinc-400'}`}>cmH₂O</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    step={1}
                    value={peep}
                    onChange={(e) => setPeep(Number(e.target.value))}
                    className={`w-full accent-emerald-600 h-1.5 cursor-pointer ${isLight ? 'bg-slate-300' : 'bg-zinc-800'}`}
                  />
                </div>

                {/* FiO2 */}
                <div
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    isLight ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-display font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>FiO₂ (Ar Ar)</span>
                    <span className={`font-mono font-bold text-sm ${isLight ? 'text-rose-700 font-black' : 'text-rose-400'}`}>
                      {fio2} <span className={`text-[10px] ${isLight ? 'text-slate-600 font-semibold' : 'text-zinc-400'}`}>%</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={21}
                    max={100}
                    step={1}
                    value={fio2}
                    onChange={(e) => setFio2(Math.max(21, Number(e.target.value)))}
                    className={`w-full accent-rose-600 h-1.5 cursor-pointer ${isLight ? 'bg-slate-300' : 'bg-zinc-800'}`}
                  />
                  <span className={`text-[9px] font-mono block ${isLight ? 'text-slate-600 font-semibold' : 'text-zinc-500'}`}>
                    Ar ambiente mínimo: 21% FiO₂
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation & Launch Action */}
            <div className={`pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="space-y-0.5 text-center sm:text-left">
                {isMissingParams ? (
                  <span className={`text-xs font-mono font-bold block animate-pulse ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                    ⚠️ Parâmetros de admissão incompletos ({missingList.length} ausentes)
                  </span>
                ) : (
                  <span className={`text-xs font-mono font-bold block ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    ✓ Configuração de Admissão Pronta
                  </span>
                )}
                <span className={`text-[11px] ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'}`}>
                  Modo {mode} • Vt {tidalVolume} mL • FR {respiratoryRate} rpm • PEEP {peep} cmH₂O • FiO₂ {fio2}%
                </span>
              </div>

              <button
                type="button"
                onClick={handleConfirmAndStart}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-mono font-bold text-sm shadow-xl flex items-center justify-center gap-2.5 cursor-pointer transition-all ${
                  isMissingParams
                    ? isLight
                      ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-rose-200 animate-pulse'
                      : 'bg-gradient-to-r from-amber-600 via-rose-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white shadow-rose-950/60 animate-pulse'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-950/60 hover:scale-[1.02]'
                }`}
              >
                {isMissingParams ? (
                  <>
                    <AlertTriangle className={`w-5 h-5 ${isLight ? 'text-white' : 'text-amber-200'}`} />
                    <span>INICIAR VENTILAÇÃO ({missingList.length} PENDENTES)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>INICIAR VENTILAÇÃO MECÂNICA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
