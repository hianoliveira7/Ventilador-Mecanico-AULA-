import React from 'react';
import { PatientParameters, VentilatorSettings, MonitoredData } from '../types/ventilation';
import { ICUNeurologicalState, ICUHemodynamicsState } from '../types/icu';
import { useTheme } from '../context/ThemeContext';
import {
  Activity,
  Droplets,
  Stethoscope,
  Sparkles,
  FileText,
  Bed,
} from 'lucide-react';

interface ICUPatientBedViewProps {
  patient: PatientParameters;
  settings: VentilatorSettings;
  monitoredData: MonitoredData;
  neurology: ICUNeurologicalState;
  hemodynamics: ICUHemodynamicsState;
  onOpenInfusionPumps?: () => void;
  onOpenMonitor?: () => void;
  onOpenInterventions?: () => void;
}

export const ICUPatientBedView: React.FC<ICUPatientBedViewProps> = ({
  patient,
  settings,
  monitoredData,
  neurology,
  hemodynamics,
  onOpenInfusionPumps,
  onOpenMonitor,
  onOpenInterventions,
}) => {
  const { isLight } = useTheme();

  // Synchronized chest expansion state with ventilator inspiration
  const isInspiring = monitoredData.peakPressure > (monitoredData.peep + 2);

  // Patient facial status based on RASS score & SpO2 cyanosis
  const rass = neurology.rassScore;
  const isDeeplySedated = rass <= -3;
  const isHypoxemic = hemodynamics.spo2 < 90;

  return (
    <div className="rounded-2xl border border-[#27535e] bg-gradient-to-br from-[#0e2229] via-[#142e37] to-[#0a181e] text-slate-100 flex flex-col overflow-hidden shadow-2xl select-none font-sans relative">
      {/* Top Header Bar */}
      <div className="px-4 py-2.5 bg-[#122b33]/90 border-b border-[#234b54] flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-[#bceae3] tracking-wider">UTI • LEITO 04 ADULTO</span>
          <span className="text-[#3d727d]">|</span>
          <span className="text-slate-300">
            {patient.name} ({patient.gender === 'male' ? 'M' : 'F'}, {patient.age}a)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
              rass <= -4
                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                : rass >= 1
                ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}
          >
            RASS {rass > 0 ? `+${rass}` : rass} ({neurology.rassDescription || 'Sedado'})
          </span>
        </div>
      </div>

      {/* Main Image Viewport using the User-Provided Custom ICU Illustration Image */}
      <div className="relative w-full h-[280px] sm:h-[340px] bg-[#0c1a20] overflow-hidden flex items-center justify-center border-b border-[#214752] group">
        {/* User-Uploaded Custom ICU Bed Image Asset */}
        <img
          src="/assets/aistudio/images_d541df58.jpeg"
          alt="Simulador de Leito de UTI - Leito 04"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-101"
        />

        {/* Interactive Hotspot 1: Wall-Mounted Infusion Pumps (Top Left) */}
        <button
          type="button"
          onClick={onOpenInfusionPumps}
          className="absolute top-[8%] left-[4%] w-[22%] h-[40%] rounded-xl border-2 border-dashed border-cyan-400/40 hover:border-cyan-300 bg-cyan-950/20 hover:bg-cyan-900/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group/btn shadow-lg"
          title="Clique para abrir e titular as Bombas de Infusão (BICs)"
        >
          <div className="px-2 py-1 rounded bg-black/80 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/50 flex items-center gap-1 opacity-0 group-hover/btn:opacity-100 transition-opacity">
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span>Titular BICs</span>
          </div>
        </button>

        {/* Interactive Hotspot 2: Patient & Bed (Center) */}
        <button
          type="button"
          onClick={onOpenInterventions}
          className="absolute top-[30%] left-[28%] w-[42%] h-[48%] rounded-2xl border-2 border-dashed border-emerald-400/30 hover:border-emerald-300 bg-emerald-950/10 hover:bg-emerald-900/30 transition-all cursor-pointer flex items-center justify-center group/btn shadow-lg"
          title="Clique para realizar Ausculta Pulmonar, Aspiração ou Condutas no Leito"
        >
          <div className="px-2.5 py-1 rounded-lg bg-black/80 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/50 flex items-center gap-1.5 opacity-0 group-hover/btn:opacity-100 transition-opacity">
            <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ausculta &amp; Condutas no Leito</span>
          </div>
        </button>

        {/* Interactive Hotspot 3: Healthcare Professional (Right) */}
        <button
          type="button"
          onClick={onOpenInterventions}
          className="absolute top-[20%] right-[22%] w-[20%] h-[68%] rounded-2xl border-2 border-dashed border-amber-400/30 hover:border-amber-300 bg-amber-950/10 hover:bg-amber-900/30 transition-all cursor-pointer flex items-center justify-center group/btn shadow-lg"
          title="Clique para interagir com a Equipe Multidisciplinar da UTI"
        >
          <div className="px-2 py-1 rounded-lg bg-black/80 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/50 flex items-center gap-1 opacity-0 group-hover/btn:opacity-100 transition-opacity">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Equipe UTI</span>
          </div>
        </button>

        {/* Breath Expansion Badge Overlay */}
        <div className="absolute right-3 bottom-3 px-3 py-1.5 rounded-xl bg-black/85 border border-[#2d5f6b] text-xs font-mono text-[#7ee1d6] flex items-center gap-2 shadow-2xl backdrop-blur-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${isInspiring ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`} />
          <span>{isInspiring ? 'INSPIRAÇÃO (EXPANSÃO TORÁCICA)' : 'EXPIRAÇÃO (RECUO)'}</span>
        </div>
      </div>

      {/* Clinical Summary Bar & Action Navigation */}
      <div className="p-3 sm:p-4 bg-[#0d1d22] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-2 text-xs w-full sm:w-auto flex-1 font-mono">
          <div className="p-2 rounded-lg bg-[#142a30] border border-[#234b54]">
            <span className="text-[10px] text-slate-400 uppercase block">Estado Neurológico</span>
            <span className="font-bold text-white text-xs block truncate">
              {neurology.isParalyzed ? 'Bloqueado (Curarizado)' : isDeeplySedated ? 'Sedação Profunda' : 'Alerta / Interativo'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#142a30] border border-[#234b54]">
            <span className="text-[10px] text-slate-400 uppercase block">Drive Respiratório</span>
            <span className={`font-bold text-xs block ${neurology.patientDriveActive ? 'text-amber-300' : 'text-[#7ee1d6]'}`}>
              {neurology.patientDriveActive ? 'Esforço Espontâneo Assíncrono' : 'Drive Suprimido (Controlado)'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#142a30] border border-[#234b54]">
            <span className="text-[10px] text-slate-400 uppercase block">Dispositivo de Via Aérea</span>
            <span className="font-bold text-white text-xs block truncate">
              TOT #{patient.endotrachealTubeSize || 8.0} • Fixado em 22cm
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenInfusionPumps && (
            <button
              type="button"
              onClick={onOpenInfusionPumps}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>BICs</span>
            </button>
          )}

          {onOpenInterventions && (
            <button
              type="button"
              onClick={onOpenInterventions}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Ausculta &amp; Condutas</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
