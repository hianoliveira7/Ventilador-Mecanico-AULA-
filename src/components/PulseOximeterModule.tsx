import React, { useEffect, useRef } from 'react';
import { MonitoredData, PatientParameters } from '../types/ventilation';
import { Activity, Heart, Waves } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PulseOximeterModuleProps {
  monitored: MonitoredData;
  patient: PatientParameters;
}

export const PulseOximeterModule: React.FC<PulseOximeterModuleProps> = ({ monitored, patient }) => {
  const { isLight } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<number>(0);

  const spo2Val = Math.round(monitored.spo2 ?? 98);
  const heartRate = Math.round(72 + (patient.spontaneousDrive ? 12 : 0) + (spo2Val < 90 ? (90 - spo2Val) * 2.5 : 0));

  // Clinical status badge & colors
  let statusText = 'Normoxemia';
  let statusBg = isLight
    ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold'
    : 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300 font-bold';
  let spo2ColorClass = isLight ? 'text-emerald-800' : 'text-emerald-400';

  if (spo2Val < 88) {
    statusText = 'Hipoxemia Grave';
    statusBg = isLight
      ? 'bg-rose-100 border-rose-400 text-rose-950 animate-pulse font-bold'
      : 'bg-rose-950/90 border-rose-600/80 text-rose-200 animate-pulse font-bold';
    spo2ColorClass = isLight ? 'text-rose-800' : 'text-rose-400';
  } else if (spo2Val < 92) {
    statusText = 'Hipoxemia Moderada';
    statusBg = isLight
      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
      : 'bg-amber-950/80 border-amber-600/60 text-amber-300 font-bold';
    spo2ColorClass = isLight ? 'text-amber-800' : 'text-amber-400';
  } else if (spo2Val < 94) {
    statusText = 'SpO₂ Limítrofe';
    statusBg = isLight
      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
      : 'bg-amber-950/60 border-amber-700/50 text-amber-200 font-bold';
    spo2ColorClass = isLight ? 'text-amber-800' : 'text-amber-300';
  }

  // Draw real-time Plethysmography Pulse Waveform on Canvas with Retina sharpness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = rect.width || 260;
      const h = rect.height || 36;

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.fillStyle = isLight ? '#f8fafc' : '#07090f';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = isLight ? 'rgba(203, 213, 225, 0.6)' : 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 0; x < w; x += 18) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();

      // Pleth waveform calculation
      phaseRef.current = (phaseRef.current + 0.055) % (Math.PI * 2);

      const pointsCount = 40;
      const step = w / pointsCount;
      const pts: { x: number; y: number }[] = [];

      for (let i = 0; i <= pointsCount; i++) {
        const x = i * step;
        const normX = (i / pointsCount) * Math.PI * 6 + phaseRef.current * 2;
        // Asymmetric pulse wave with dicrotic notch
        const wave = Math.sin(normX) + 0.38 * Math.sin(2 * normX + 0.5) + 0.14 * Math.sin(3 * normX);
        const y = h / 2 - (wave * (h * 0.34));
        pts.push({ x, y });
      }

      ctx.beginPath();
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = spo2Val < 90 ? '#e11d48' : spo2Val < 94 ? '#d97706' : (isLight ? '#059669' : '#10b981');
      if (!isLight) {
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 5;
      }

      if (pts.length > 1) {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[i];
          const p1 = pts[i + 1];
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [spo2Val, isLight]);

  return (
    <div
      className={`rounded-xl p-2.5 border shadow-sm select-none transition-colors ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#090b12] border-zinc-800'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between pb-1.5 border-b ${isLight ? 'border-slate-200' : 'border-zinc-800/60'}`}>
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-500" />
          <span className={`text-[10px] font-display font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
            OXIMETRIA DE PULSO
          </span>
        </div>
        <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border ${statusBg}`}>
          {statusText}
        </span>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-12 gap-2 my-2 items-center">
        {/* Big SpO2 Value */}
        <div
          className={`col-span-6 rounded-lg p-2 border flex flex-col items-center justify-center relative shadow-inner ${
            isLight ? 'bg-white border-slate-300' : 'bg-[#06070c] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-1 text-[9px] font-mono">
            <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>SpO₂</span>
            <span className={`text-[8px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>(Sat)</span>
          </div>
          <div className="flex items-baseline">
            <span className={`text-3xl font-mono font-black tracking-tight ${spo2ColorClass}`}>
              {spo2Val}
            </span>
            <span className={`text-xs font-mono ml-1 font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>%</span>
          </div>
          <span className={`text-[8.5px] font-mono font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Meta: 92–96%
          </span>
        </div>

        {/* Pulse Rate & Perfusion Index */}
        <div className="col-span-6 flex flex-col gap-1.5">
          {/* Heart Rate / FC */}
          <div
            className={`rounded-lg px-2 py-1 border flex items-center justify-between ${
              isLight ? 'bg-white border-slate-300' : 'bg-[#06070c] border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-500 animate-pulse" />
              <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                FC (Pulso)
              </span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className={`text-sm font-mono font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                {heartRate}
              </span>
              <span className={`text-[8px] font-mono font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                bpm
              </span>
            </div>
          </div>

          {/* Perfusion Index PI */}
          <div
            className={`rounded-lg px-2 py-1 border flex items-center justify-between ${
              isLight ? 'bg-white border-slate-300' : 'bg-[#06070c] border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-1">
              <Waves className="w-3 h-3 text-cyan-500" />
              <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Índice Perf.
              </span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className={`text-sm font-mono font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>
                4.2
              </span>
              <span className={`text-[8px] font-mono font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plethysmography Canvas Waveform */}
      <div className={`rounded-lg border overflow-hidden relative ${isLight ? 'border-slate-300' : 'border-zinc-800'}`}>
        <div className={`absolute top-1 left-2 z-10 text-[8px] font-mono font-bold tracking-wider ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
          PLETISMOGRAFIA
        </div>
        <canvas ref={canvasRef} className="w-full h-9 block" />
      </div>
    </div>
  );
};
