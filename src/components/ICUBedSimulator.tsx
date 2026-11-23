import React, { useState, useEffect } from 'react';
import { PatientParameters, VentilatorSettings, MonitoredData } from '../types/ventilation';
import { ICUInfusionPumpsState, ICUSimulationState } from '../types/icu';
import { ICUPhysiologyEngine, DEFAULT_ICU_PUMPS, DEFAULT_ICU_CHART } from '../services/icuPhysiologyEngine';
import { ICUPatientBedView } from './ICUPatientBedView';
import { ICUVitalSignsMonitor } from './ICUVitalSignsMonitor';
import { ICUInfusionPumps } from './ICUInfusionPumps';
import { ICUBedsideChart } from './ICUBedsideChart';
import { ICUBedsideInterventionsModal } from './ICUBedsideInterventionsModal';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import {
  Activity,
  Syringe,
  FileText,
  LayoutDashboard,
  Wind,
  ArrowLeft,
  Stethoscope,
  Droplets,
  Zap,
} from 'lucide-react';

interface ICUBedSimulatorProps {
  patient: PatientParameters;
  settings: VentilatorSettings;
  monitoredData: MonitoredData;
  renderVentilatorContent: () => React.ReactNode;
  onExitToVentilatorOnly: () => void;
  onOpenRecruitmentManeuver?: () => void;
  onUpdatePatient?: (updated: Partial<PatientParameters>) => void;
  onUpdateMonitoredHemodynamics?: (hemo: Partial<MonitoredData>) => void;
}

export const ICUBedSimulator: React.FC<ICUBedSimulatorProps> = ({
  patient,
  settings,
  monitoredData,
  renderVentilatorContent,
  onExitToVentilatorOnly,
  onOpenRecruitmentManeuver,
  onUpdatePatient,
  onUpdateMonitoredHemodynamics,
}) => {
  const { isLight } = useTheme();

  // Active ICU sub-view
  const [icuTab, setIcuTab] = useState<'cockpit' | 'ventilator' | 'monitor' | 'pumps' | 'chart'>('cockpit');

  // Interventions Modal state
  const [isInterventionsModalOpen, setIsInterventionsModalOpen] = useState(false);

  // Infusion Pumps State
  const [pumps, setPumps] = useState<ICUInfusionPumpsState>(DEFAULT_ICU_PUMPS);

  // Full dynamic ICU state (Cardiopulmonary coupling)
  const [icuState, setIcuState] = useState<ICUSimulationState>(() =>
    ICUPhysiologyEngine.calculateState(patient, settings, monitoredData, DEFAULT_ICU_PUMPS, DEFAULT_ICU_CHART)
  );

  // Recalculate cardiopulmonary coupling whenever settings, monitored data, or pump titrations change
  useEffect(() => {
    const nextState = ICUPhysiologyEngine.calculateState(
      patient,
      settings,
      monitoredData,
      pumps,
      icuState.chart
    );
    setIcuState(nextState);

    // Sync vital signs back to the master monitored state into ONE single source of truth
    if (onUpdateMonitoredHemodynamics) {
      onUpdateMonitoredHemodynamics({
        heartRate: nextState.hemodynamics.heartRate,
        systolicBP: nextState.hemodynamics.systolicBP,
        diastolicBP: nextState.hemodynamics.diastolicBP,
        meanArterialPressure: nextState.hemodynamics.meanArterialPressure,
        spo2: nextState.hemodynamics.spo2,
        etco2: nextState.hemodynamics.etco2,
        strokeVolume: nextState.hemodynamics.strokeVolume,
        cardiacOutput: nextState.hemodynamics.cardiacOutput,
        cardiacIndex: nextState.hemodynamics.cardiacIndex,
      });
    }
  }, [patient, settings, monitoredData, pumps]);

  const hemodynamics = icuState.hemodynamics;
  const neurology = icuState.neurology;

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden bg-slate-100 dark:bg-[#07090f] text-slate-900 dark:text-slate-100 select-none">
      {/* 1. Master ICU Bed Header */}
      <header
        className={`px-3 sm:px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 z-30 transition-colors shadow-xs ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0a0d17] border-slate-800'
        }`}
      >
        {/* Left: Bed Identification & Quick Exit */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick(900);
              onExitToVentilatorOnly();
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Focar exclusivamente na interface do Ventilador Mecânico Isolado"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ventilador Isolado</span>
          </button>

          <div className="flex items-center gap-2 border-l pl-2.5 border-slate-200 dark:border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="text-xs font-display font-black text-slate-900 dark:text-white">
                  LEITO 04 UTI
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  • {patient.name} ({patient.actualWeightKg}kg / IBW {patient.idealBodyWeightKg}kg)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Cockpit Action Buttons & Navigation Tabs */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick(900);
              setIsInterventionsModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:scale-102"
            title="Ausculta pulmonar, aspiração traqueal, sedoanalgesia e ressuscitação volêmica"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Condutas no Leito</span>
          </button>

          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick(1000);
                setIcuTab('cockpit');
              }}
              className={`px-2.5 py-1.5 rounded-md font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                icuTab === 'cockpit'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Cockpit Leito</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick(1000);
                setIcuTab('ventilator');
              }}
              className={`px-2.5 py-1.5 rounded-md font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                icuTab === 'ventilator'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ventilador</span>
              <span className="sm:hidden">VM</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick(1000);
                setIcuTab('monitor');
              }}
              className={`px-2.5 py-1.5 rounded-md font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                icuTab === 'monitor'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Monitor</span>
              <span className="sm:hidden">Mon</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick(1000);
                setIcuTab('pumps');
              }}
              className={`px-2.5 py-1.5 rounded-md font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                icuTab === 'pumps'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Syringe className="w-3.5 h-3.5 text-cyan-400" />
              <span>BICs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick(1000);
                setIcuTab('chart');
              }}
              className={`px-2.5 py-1.5 rounded-md font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                icuTab === 'chart'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Gasometria &amp; RX</span>
              <span className="md:hidden">Prontuário</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace Container */}
      <main className="flex-1 w-full h-full min-h-0 flex flex-col overflow-hidden relative">
        {/* VIEW 1: COCKPIT DO LEITO (UNIFIED NON-REPETITIVE DASHBOARD) */}
        {icuTab === 'cockpit' && (
          <div className="flex-1 w-full h-full min-h-0 flex flex-col overflow-y-auto p-2 sm:p-3 gap-3">
            <div className="max-w-[1920px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
              {/* Left Column (5 cols): Interactive Bed View + Quick BICs Titration */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <ICUPatientBedView
                  patient={patient}
                  settings={settings}
                  monitoredData={monitoredData}
                  neurology={neurology}
                  hemodynamics={hemodynamics}
                  onOpenInfusionPumps={() => setIcuTab('pumps')}
                  onOpenMonitor={() => setIcuTab('monitor')}
                  onOpenInterventions={() => setIsInterventionsModalOpen(true)}
                />

                {/* Quick Infusion Pump Station for fast titration right from Cockpit */}
                <div className={`p-3 rounded-2xl border flex flex-col gap-2 font-mono text-xs shadow-md ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#0a0d16] border-slate-800'
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 font-bold text-cyan-500">
                      <Droplets className="w-4 h-4 text-cyan-400" />
                      <span>RACK DE INFUSÃO CONTÍNUA (BICs)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIcuTab('pumps')}
                      className="text-[10px] text-blue-500 hover:underline font-bold"
                    >
                      Abrir Rack Completo →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {/* Norepinephrine Quick Bar */}
                    <div className="p-2 rounded-xl bg-red-950/20 border border-red-800/40 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-red-400">Noradrenalina</span>
                        <span className="font-bold text-white">{pumps.norepinephrineMcgKgMin.toFixed(2)} mcg/kg/min</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2.0"
                        step="0.05"
                        value={pumps.norepinephrineMcgKgMin}
                        onChange={(e) => setPumps((p) => ({ ...p, norepinephrineMcgKgMin: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                      />
                    </div>

                    {/* Propofol Quick Bar */}
                    <div className="p-2 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-purple-400">Propofol</span>
                        <span className="font-bold text-white">{pumps.propofolMcgKgMin.toFixed(0)} mcg/kg/min</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        step="5"
                        value={pumps.propofolMcgKgMin}
                        onChange={(e) => setPumps((p) => ({ ...p, propofolMcgKgMin: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (7 cols): ONE Unified Cardiopulmonary Monitor */}
              <div className="lg:col-span-7 flex flex-col min-h-[360px]">
                <ICUVitalSignsMonitor
                  hemodynamics={hemodynamics}
                  monitoredData={monitoredData}
                  settings={settings}
                />
              </div>
            </div>

            {/* Bottom Row: Full Ventilator Workspace with synchronized mechanics */}
            <div className={`p-2 sm:p-3 rounded-2xl border space-y-2 font-mono text-xs ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#090b13] border-slate-800'
            }`}>
              <div className="flex items-center justify-between border-b pb-1.5 border-slate-200 dark:border-slate-800">
                <span className="font-bold text-blue-500 flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-blue-400" />
                  VENTILADOR MECÂNICO DO LEITO ({settings.mode} • PEEP {settings.peep} cmH₂O • FiO₂ {settings.fio2}%)
                </span>
                <button
                  type="button"
                  onClick={() => setIcuTab('ventilator')}
                  className="text-[11px] text-blue-500 hover:underline font-bold"
                >
                  Focar no Ventilador Inteiro →
                </button>
              </div>

              <div className="w-full min-h-[300px]">
                {renderVentilatorContent()}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: FULL VENTILATOR */}
        {icuTab === 'ventilator' && (
          <div className="flex-1 w-full h-full min-h-0 flex flex-col overflow-hidden">
            {renderVentilatorContent()}
          </div>
        )}

        {/* VIEW 3: FULL MULTI-PARAMETER MONITOR */}
        {icuTab === 'monitor' && (
          <div className="flex-1 w-full h-full min-h-0 p-3 sm:p-5 overflow-y-auto max-w-[1600px] mx-auto flex flex-col gap-4">
            <ICUVitalSignsMonitor
              hemodynamics={hemodynamics}
              monitoredData={monitoredData}
              settings={settings}
            />
          </div>
        )}

        {/* VIEW 4: FULL INFUSION PUMPS RACK */}
        {icuTab === 'pumps' && (
          <div className="flex-1 w-full h-full min-h-0 p-3 sm:p-5 overflow-y-auto max-w-[1600px] mx-auto flex flex-col gap-4">
            <ICUInfusionPumps
              pumps={pumps}
              neurology={neurology}
              patientWeightKg={patient.actualWeightKg}
              onUpdatePumps={setPumps}
            />
          </div>
        )}

        {/* VIEW 5: FULL BEDSIDE CHART & GASOMETRY */}
        {icuTab === 'chart' && (
          <div className="flex-1 w-full h-full min-h-0 p-3 sm:p-5 overflow-y-auto max-w-[1600px] mx-auto flex flex-col gap-4">
            <ICUBedsideChart
              bloodGas={icuState.bloodGas}
              chart={icuState.chart}
              patientName={patient.name}
              pathology={patient.pathology}
            />
          </div>
        )}
      </main>

      {/* Bedside Interventions Modal */}
      <ICUBedsideInterventionsModal
        isOpen={isInterventionsModalOpen}
        onClose={() => setIsInterventionsModalOpen(false)}
        patient={patient}
        settings={settings}
        monitoredData={monitoredData}
        hemodynamics={hemodynamics}
        neurology={neurology}
        onUpdatePatient={(upd) => onUpdatePatient?.(upd)}
        onUpdatePumps={setPumps}
      />
    </div>
  );
};
