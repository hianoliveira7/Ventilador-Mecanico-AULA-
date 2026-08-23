import React, { useEffect, useRef } from 'react';
import { PatientParameters, MonitoredData } from '../types/ventilation';
import { Activity, Heart, Waves } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LungVisualizerProps {
  monitored: MonitoredData;
  patient: PatientParameters;
}

export const LungVisualizer: React.FC<LungVisualizerProps> = ({ monitored, patient }) => {
  const { isLight } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<number>(0);

  const spo2Val = Math.round(monitored.spo2);
  const heartRate = Math.round(72 + (patient.spontaneousDrive ? 12 : 0) + (spo2Val < 90 ? (90 - spo2Val) * 2.5 : 0));
  
  // Status & color scheme
  let statusText = 'Normoxemia Estável';
  let statusBg = isLight
    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
    : 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300';
  let spo2ColorClass = isLight ? 'text-emerald-700' : 'text-emerald-400';

  if (spo2Val < 88) {
    statusText = 'Hipoxemia Grave / Crítica';
    statusBg = isLight
      ? 'bg-rose-100 border-rose-300 text-rose-800 animate-pulse font-bold'
      : 'bg-rose-950/90 border-rose-600/80 text-rose-200 animate-pulse';
    spo2ColorClass = isLight ? 'text-rose-700' : 'text-rose-400';
  } else if (spo2Val < 92) {
    statusText = 'Hipoxemia Moderada';
    statusBg = isLight
      ? 'bg-amber-100 border-amber-300 text-amber-800'
      : 'bg-amber-950/80 border-amber-600/60 text-amber-300';
    spo2ColorClass = isLight ? 'text-amber-700' : 'text-amber-400';
  } else if (spo2Val < 94) {
    statusText = 'SpO₂ Limítrofe';
    statusBg = isLight
      ? 'bg-amber-100 border-amber-300 text-amber-800'
      : 'bg-amber-950/60 border-amber-700/50 text-amber-200';
    spo2ColorClass = isLight ? 'text-amber-700' : 'text-amber-300';
  }

  // Draw real-time Plethysmography Pulse Waveform on Canvas with Retina sharpness and bezier smoothing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = rect.width || 280;
      const h = rect.height || 48;

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.fillStyle = isLight ? '#f8fafc' : '#06080e';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = isLight ? 'rgba(203, 213, 225, 0.6)' : 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 0; x < w; x += 16) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();

      // Pleth waveform calculation
      phaseRef.current = (phaseRef.current + 0.05) % (Math.PI * 2);

      const pointsCount = 45;
      const step = w / pointsCount;
      const pts: { x: number; y: number }[] = [];

      for (let i = 0; i <= pointsCount; i++) {
        const x = i * step;
        const normX = (i / pointsCount) * Math.PI * 6 + phaseRef.current * 2;
        // Asymmetric pulse wave with dicrotic notch
        const wave = Math.sin(normX) + 0.4 * Math.sin(2 * normX + 0.5) + 0.15 * Math.sin(3 * normX);
        const y = h / 2 - (wave * (h * 0.32));
        pts.push({ x, y });
      }

      ctx.beginPath();
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = spo2Val < 90 ? '#e11d48' : spo2Val < 94 ? '#d97706' : (isLight ? '#059669' : '#10b981');
      if (!isLight) {
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 6;
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
      className={`rounded-2xl p-3 border shadow-xl flex flex-col justify-between h-full select-none relative overflow-hidden transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0a0c14] border-zinc-800/90'
      }`}
    >
      {/* Top Header */}
      <div className={`flex items-center justify-between pb-1.5 border-b ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-600" />
          <span className={`text-[10px] font-display font-black uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
            OXIMETRIA DE PULSO
          </span>
        </div>
        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border ${statusBg}`}>
          {statusText}
        </span>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-12 gap-2 my-auto items-center py-1">
        {/* Big SpO2 Value */}
        <div
          className={`col-span-6 rounded-xl p-2 border flex flex-col items-center justify-center relative shadow-inner ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#07080d] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 mb-0.5">
            <span>SpO₂</span>
            <span className="text-[8px]">(Saturação)</span>
          </div>
          <div className="flex items-baseline">
            <span className={`text-4xl font-mono font-black tracking-tight ${spo2ColorClass}`}>
              {spo2Val}
            </span>
            <span className="text-sm font-mono text-zinc-500 ml-1 font-bold">%</span>
          </div>
          <span className="text-[8px] font-mono text-zinc-500 mt-0.5">Alvo: 92 – 96%</span>
        </div>

        {/* Pulse Rate & Perfusion Index */}
        <div className="col-span-6 flex flex-col gap-1.5">
          {/* Heart Rate / FC */}
          <div
            className={`rounded-xl px-2.5 py-1.5 border flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#07080d] border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Heart className={`w-3.5 h-3.5 ${spo2Val < 90 ? 'text-rose-500 animate-ping' : 'text-rose-500 animate-pulse'}`} />
              <span className="text-[9px] font-mono text-zinc-500">PULSO (FC)</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className={`text-base font-mono font-black ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>{heartRate}</span>
              <span className="text-[8px] font-mono text-zinc-500">bpm</span>
            </div>
          </div>

          {/* Perfusion Index */}
          <div
            className={`rounded-xl px-2.5 py-1.5 border flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#07080d] border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-cyan-600" />
              <span className="text-[9px] font-mono text-zinc-500">ÍNDICE PERF.</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className={`text-xs font-mono font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>2.8%</span>
              <span className="text-[8px] font-mono text-emerald-600 font-bold">ÓTIMO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plethysmographic Waveform Canvas */}
      <div className={`mt-1 pt-1 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
        <div className="flex items-center justify-between text-[8px] font-mono text-zinc-500 mb-0.5">
          <span>CURVA PLETISMOGRÁFICA (PLETH)</span>
          <span className={isLight ? 'text-cyan-700 font-bold' : 'text-cyan-400'}>PULSO SINCRONIZADO</span>
        </div>
        <div className={`h-9 w-full rounded-lg overflow-hidden border ${isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800/90 bg-[#06080e]'}`}>
          <canvas ref={canvasRef} width={240} height={36} className="w-full h-full block" />
        </div>
      </div>
    </div>
  );
};
