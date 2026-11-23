import React, { useEffect, useRef, useState } from 'react';
import { ICUHemodynamicsState } from '../types/icu';
import { MonitoredData, VentilatorSettings } from '../types/ventilation';
import { useTheme } from '../context/ThemeContext';
import {
  Heart,
  Activity,
  Waves,
  Thermometer,
  AlertTriangle,
  Volume2,
  VolumeX,
  Snowflake,
  ShieldAlert,
  Play,
  RotateCcw,
  Wind,
} from 'lucide-react';

interface ICUVitalSignsMonitorProps {
  hemodynamics: ICUHemodynamicsState;
  monitoredData?: MonitoredData;
  settings?: VentilatorSettings;
  isCompact?: boolean;
}

export const ICUVitalSignsMonitor: React.FC<ICUVitalSignsMonitorProps> = ({
  hemodynamics,
  monitoredData,
  settings,
  isCompact = false,
}) => {
  const { isLight } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Audio & Monitor state
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isFrozen, setIsFrozen] = useState(false);
  const [alarmSilenceSeconds, setAlarmSilenceSeconds] = useState<number>(0);

  // Sweep coordinates state
  const xPosRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const lastYRef = useRef<{ ecg: number; pai: number; spo2: number; etco2: number }>({
    ecg: 0,
    pai: 0,
    spo2: 0,
    etco2: 0,
  });

  // Alarm Silence Countdown Timer
  useEffect(() => {
    if (alarmSilenceSeconds <= 0) return;
    const timer = setInterval(() => {
      setAlarmSilenceSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [alarmSilenceSeconds]);

  // Canvas Oscilloscope Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    let height = (canvas.height = canvas.parentElement?.clientHeight || (isCompact ? 280 : 360));

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
        // Reset black background on resize
        ctx.fillStyle = '#06080e';
        ctx.fillRect(0, 0, width, height);
      }
    };
    window.addEventListener('resize', handleResize);

    // Initial fill
    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, 0, width, height);

    const sweepSpeed = 2.4; // px per frame
    const eraseWidth = 20; // width of blackout erase head

    const render = () => {
      if (isFrozen) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const hr = Math.max(30, Math.min(200, hemodynamics.heartRate || 75));
      const bpmIntervalSec = 60 / hr;
      // Advance cardiac cycle phase
      phaseRef.current = (phaseRef.current + (1 / 60) / bpmIntervalSec) % 1.0;
      const phase = phaseRef.current;

      const currentX = xPosRef.current;
      const nextX = (currentX + sweepSpeed) % width;

      // 1. Blackout erase head in front of the cursor
      ctx.fillStyle = '#06080e';
      ctx.fillRect(currentX, 0, eraseWidth, height);

      // Section geometry: 4 stacked channels
      const channelHeight = height / 4;

      // ==========================================
      // CHANNEL 1: ECG (Lead DII) - Emerald Neon
      // ==========================================
      const yMidECG = channelHeight * 0.55;
      let ecgVal = 0;
      if (phase >= 0.08 && phase < 0.16) {
        // P Wave
        ecgVal = Math.sin(((phase - 0.08) / 0.08) * Math.PI) * 0.22;
      } else if (phase >= 0.19 && phase < 0.21) {
        // Q Wave
        ecgVal = -0.16;
      } else if (phase >= 0.21 && phase < 0.25) {
        // R Wave Spike
        ecgVal = 1.0;
      } else if (phase >= 0.25 && phase < 0.28) {
        // S Wave
        ecgVal = -0.32;
      } else if (phase >= 0.38 && phase < 0.58) {
        // T Wave
        ecgVal = Math.sin(((phase - 0.38) / 0.20) * Math.PI) * 0.32;
      }
      const yECG = yMidECG - ecgVal * (channelHeight * 0.44);

      // ==========================================
      // CHANNEL 2: Invasive Arterial Pressure (PAI) - Red/Crimson
      // ==========================================
      const yMidPAI = channelHeight * 1.65;
      let paiVal = 0;
      if (phase >= 0.23 && phase < 0.52) {
        // Rapid systolic upstroke
        const t = (phase - 0.23) / 0.29;
        paiVal = Math.sin(t * Math.PI * 0.88);
        if (t > 0.65) {
          // Dicrotic Notch (aortic valve closure)
          paiVal += Math.sin((t - 0.65) * Math.PI * 3.8) * 0.14;
        }
      } else if (phase >= 0.52) {
        // Diastolic runoff
        const t = (phase - 0.52) / 0.48;
        paiVal = 0.22 * Math.exp(-t * 2.3);
      }
      const yPAI = yMidPAI - paiVal * (channelHeight * 0.48);

      // ==========================================
      // CHANNEL 3: SpO2 Plethysmogram - Cyan
      // ==========================================
      const yMidSpO2 = channelHeight * 2.68;
      let plethVal = 0;
      if (phase >= 0.26 && phase < 0.62) {
        const t = (phase - 0.26) / 0.36;
        plethVal = Math.sin(t * Math.PI);
        if (t > 0.54) {
          plethVal += Math.sin((t - 0.54) * Math.PI * 3.5) * 0.12;
        }
      } else if (phase >= 0.62) {
        const t = (phase - 0.62) / 0.38;
        plethVal = 0.16 * Math.exp(-t * 2.1);
      }
      const ySpO2 = yMidSpO2 - plethVal * (channelHeight * 0.44);

      // ==========================================
      // CHANNEL 4: EtCO2 Capnogram - Amber Gold
      // ==========================================
      const yMidEtCO2 = channelHeight * 3.75;
      // Respiration cycle: approximately 1 breath every 4.5 cardiac beats
      const respPhase = (phaseRef.current * 0.22) % 1.0;
      let etco2Val = 0;
      if (respPhase < 0.48) {
        // Expiratory Alveolar Plateau
        etco2Val = 0.78 + respPhase * 0.18;
      } else if (respPhase < 0.54) {
        // Sudden inspiratory drop
        etco2Val = Math.max(0, 0.85 - ((respPhase - 0.48) / 0.06) * 0.85);
      } else {
        // Inspiratory baseline (0 mmHg CO2)
        etco2Val = 0;
      }
      const yEtCO2 = yMidEtCO2 - etco2Val * (channelHeight * 0.40);

      // Draw continuous anti-aliased vector line segments
      if (currentX < nextX) {
        // 1. ECG
        ctx.beginPath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.9;
        ctx.moveTo(currentX, lastYRef.current.ecg || yECG);
        ctx.lineTo(nextX, yECG);
        ctx.stroke();

        // 2. PAI
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.0;
        ctx.moveTo(currentX, lastYRef.current.pai || yPAI);
        ctx.lineTo(nextX, yPAI);
        ctx.stroke();

        // 3. SpO2
        ctx.beginPath();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.9;
        ctx.moveTo(currentX, lastYRef.current.spo2 || ySpO2);
        ctx.lineTo(nextX, ySpO2);
        ctx.stroke();

        // 4. EtCO2
        ctx.beginPath();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.0;
        ctx.moveTo(currentX, lastYRef.current.etco2 || yEtCO2);
        ctx.lineTo(nextX, yEtCO2);
        ctx.stroke();
      }

      // Cache last values
      lastYRef.current = {
        ecg: yECG,
        pai: yPAI,
        spo2: ySpO2,
        etco2: yEtCO2,
      };

      xPosRef.current = nextX;
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [hemodynamics.heartRate, isFrozen, isCompact]);

  // Critical Hemodynamic Alarm States
  const isMapCritical = hemodynamics.meanArterialPressure < 65;
  const isHypoxemic = hemodynamics.spo2 < 90;
  const isAlarmActive = (isMapCritical || isHypoxemic) && alarmSilenceSeconds === 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-[#06080e] text-slate-100 flex flex-col overflow-hidden shadow-xl select-none font-sans">
      {/* Top Monitor Bezel Bar */}
      <div className="px-3 py-2 bg-[#0d111c] border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold tracking-wider text-slate-200">
            INTELLIVUE ICU • LEITO 04 ADULTO
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-[11px]">
            {hemodynamics.cardiacRhythm} • Derivação DII
          </span>
        </div>

        {/* Monitor Tool Controls */}
        <div className="flex items-center gap-2">
          {alarmSilenceSeconds > 0 ? (
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1">
              <VolumeX className="w-3 h-3" />
              <span>Silenciado ({alarmSilenceSeconds}s)</span>
            </span>
          ) : isAlarmActive ? (
            <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[11px] animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>ALARME ATIVO</span>
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => setAlarmSilenceSeconds(120)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Silenciar alarmes por 120 segundos"
          >
            <VolumeX className="w-3 h-3" />
            <span className="hidden sm:inline">Silenciar (2 min)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFrozen((prev) => !prev)}
            className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
              isFrozen
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Congelar traçados para medição"
          >
            <Snowflake className="w-3 h-3" />
            <span className="hidden sm:inline">{isFrozen ? 'Descongelar' : 'Congelar'}</span>
          </button>
        </div>
      </div>

      {/* Main Monitor Display Grid: Left Oscilloscope Canvas (75%) + Right Medical Numerics (25%) */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[300px] bg-[#06080e]">
        {/* Left: 4-Channel Oscilloscope Canvas */}
        <div className="md:col-span-8 lg:col-span-9 relative border-b md:border-b-0 md:border-r border-slate-800/80 p-2 flex flex-col justify-between">
          {/* Channel Label Watermarks */}
          <div className="absolute top-3 left-4 text-[10px] font-mono font-bold text-emerald-400 tracking-wider pointer-events-none z-10 flex items-center gap-2">
            <span>ECG II (1 mV/cm)</span>
            <span className="text-slate-500">· 25 mm/s</span>
          </div>
          <div className="absolute top-[27%] left-4 text-[10px] font-mono font-bold text-red-400 tracking-wider pointer-events-none z-10 flex items-center gap-2">
            <span>PAI (ART RADIAL)</span>
            <span className="text-slate-500">· Escala 0-200 mmHg</span>
          </div>
          <div className="absolute top-[52%] left-4 text-[10px] font-mono font-bold text-cyan-400 tracking-wider pointer-events-none z-10 flex items-center gap-2">
            <span>PLETH SpO₂</span>
            <span className="text-slate-500">· PI: 3.2%</span>
          </div>
          <div className="absolute top-[77%] left-4 text-[10px] font-mono font-bold text-amber-400 tracking-wider pointer-events-none z-10 flex items-center gap-2">
            <span>CAPNO EtCO₂</span>
            <span className="text-slate-500">· 0-50 mmHg</span>
          </div>

          <div className="w-full h-full min-h-[280px]">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
        </div>

        {/* Right: Real-time Multi-parameter Clinical Numeric Boxes */}
        <div className="md:col-span-4 lg:col-span-3 p-3 flex flex-col justify-between gap-2.5 bg-[#0a0d16]">
          {/* 1. FC / ECG (Emerald Green) */}
          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-emerald-900/50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-bold">
                <Heart className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>FC (bpm)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 block">Alarme: 50-120</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-mono font-black text-emerald-400 leading-none">
                {hemodynamics.heartRate}
              </span>
            </div>
          </div>

          {/* 2. PAI: PAS / PAD e PAM (Crimson Red) */}
          <div
            className={`p-2.5 rounded-lg border transition-all ${
              isMapCritical
                ? 'bg-red-950/60 border-red-500 animate-pulse'
                : 'bg-[#0e1422] border-red-900/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-red-400 font-bold">
                <Activity className="w-3.5 h-3.5" />
                <span>PAI (mmHg)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                PAM Alvo ≥ 65
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div>
                <span className="text-2xl font-mono font-black text-red-400 leading-none">
                  {hemodynamics.systolicBP}/{hemodynamics.diastolicBP}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono text-slate-400 block leading-none">PAM</span>
                <span
                  className={`text-xl font-mono font-black leading-none ${
                    isMapCritical ? 'text-red-300' : 'text-amber-300'
                  }`}
                >
                  ({hemodynamics.meanArterialPressure})
                </span>
              </div>
            </div>
          </div>

          {/* 3. SpO2 Plethysmograph (Cyan) */}
          <div
            className={`p-2.5 rounded-lg border transition-all ${
              isHypoxemic
                ? 'bg-cyan-950/60 border-red-500 animate-pulse'
                : 'bg-[#0e1422] border-cyan-900/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Waves className="w-3.5 h-3.5" />
                <span>SpO₂ (%)</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-600">Alarme: &lt;92</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-3xl font-mono font-black text-cyan-400 leading-none">
                {hemodynamics.spo2}%
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                PI: 3.2%
              </span>
            </div>
          </div>

          {/* 4. EtCO2 (Amber) */}
          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-amber-900/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-amber-400 block">EtCO₂ (mmHg)</span>
              <span className="text-[10px] font-mono text-amber-600 block">Capnometria contínua</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-mono font-black text-amber-400 leading-none">
                {hemodynamics.etco2}
              </span>
            </div>
          </div>

          {/* 5. Hemodinâmica Invasiva Adicional: PVC, DC, IC, Temp */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-mono">
            <div className="p-1.5 rounded bg-[#101424] border border-slate-800">
              <span className="text-[9px] uppercase text-slate-400 block">PVC</span>
              <span className="font-bold text-blue-400 text-sm">
                {hemodynamics.centralVenousPressure} <span className="text-[8px]">cmH₂O</span>
              </span>
            </div>
            <div className="p-1.5 rounded bg-[#101424] border border-slate-800">
              <span className="text-[9px] uppercase text-slate-400 block">DC / IC</span>
              <span className="font-bold text-purple-400 text-sm">
                {hemodynamics.cardiacOutput} <span className="text-[8px]">L/min</span>
              </span>
            </div>
            <div className="p-1.5 rounded bg-[#101424] border border-slate-800">
              <span className="text-[9px] uppercase text-slate-400 block">Temp</span>
              <span className="font-bold text-yellow-400 text-sm">
                {hemodynamics.temperatureC}°C
              </span>
            </div>
          </div>

          {/* 6. Integrated Ventilator Telemetry Box */}
          {monitoredData && (
            <div className="p-2.5 rounded-lg bg-[#0a1526] border border-blue-900/60 font-mono">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1 text-blue-400 font-bold">
                  <Wind className="w-3.5 h-3.5" />
                  <span>VENTILADOR ({settings?.mode || 'VM'})</span>
                </div>
                <span className="text-[10px] text-blue-300 font-bold">PEEP {monitoredData.peep}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="bg-[#0e1f38] p-1 rounded border border-blue-900/40">
                  <span className="text-[8px] text-slate-400 block">P.PICO</span>
                  <span className="text-xs font-bold text-amber-300">{monitoredData.peakPressure}</span>
                </div>
                <div className="bg-[#0e1f38] p-1 rounded border border-blue-900/40">
                  <span className="text-[8px] text-slate-400 block">VTE</span>
                  <span className="text-xs font-bold text-cyan-300">{monitoredData.vte}</span>
                </div>
                <div className="bg-[#0e1f38] p-1 rounded border border-blue-900/40">
                  <span className="text-[8px] text-slate-400 block">VM</span>
                  <span className="text-xs font-bold text-emerald-300">{monitoredData.minuteVolume}</span>
                </div>
                <div className="bg-[#0e1f38] p-1 rounded border border-blue-900/40">
                  <span className="text-[8px] text-slate-400 block">FR TOT</span>
                  <span className="text-xs font-bold text-purple-300">{monitoredData.totalRate}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
