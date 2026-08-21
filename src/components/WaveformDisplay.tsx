import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WaveformSample, ManeuverState } from '../types/ventilation';
import {
  Pause,
  Play,
  Activity,
  Maximize2,
  Gauge,
  Wind,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface WaveformDisplayProps {
  currentSample: WaveformSample | null;
  maneuverState: ManeuverState;
  onToggleFreeze: () => void;
  pMaxScale?: number; // 30, 40, 60, 80
  peepSet: number;
  viewMode?: 'waveforms' | 'loops' | 'split';
  onSelectViewMode?: (mode: 'waveforms' | 'loops' | 'split') => void;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  currentSample,
  maneuverState,
  onToggleFreeze,
  pMaxScale = 40,
  peepSet,
  viewMode = 'waveforms',
  onSelectViewMode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Buffer of historical samples for rendering the sweep or scrolling line
  const bufferRef = useRef<WaveformSample[]>([]);
  const sweepIndexRef = useRef<number>(0);
  const maxPoints = 500; // Resolution across canvas width

  const [pressureMax, setPressureMax] = useState<number>(pMaxScale);
  const [flowMax, setFlowMax] = useState<number>(80);
  const [volumeMax, setVolumeMax] = useState<number>(800);

  // Cursor inspection in Freeze mode
  const [hoverData, setHoverData] = useState<{
    x: number;
    sample: WaveformSample | null;
  } | null>(null);

  // Sync buffer on new sample
  useEffect(() => {
    if (!currentSample || maneuverState.isFrozen) return;

    if (bufferRef.current.length < maxPoints) {
      bufferRef.current.push(currentSample);
    } else {
      bufferRef.current[sweepIndexRef.current] = currentSample;
    }

    sweepIndexRef.current = (sweepIndexRef.current + 1) % maxPoints;
  }, [currentSample, maneuverState.isFrozen]);

  // Main Canvas Render Loop with High-DPI support and Bezier Spline Curve Smoothing
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get display dimensions
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    // Adjust internal canvas buffer size for high-DPI retina sharpness
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background - Elegant Dark Medical Glass Canvas
    ctx.fillStyle = '#07080d';
    ctx.fillRect(0, 0, width, height);

    // Layout: 3 equal track channels with rounded visual separation
    const trackGap = 6;
    const totalGap = trackGap * 2;
    const trackHeight = (height - totalGap) / 3;

    // Track 1: Pressure (0 to trackHeight)
    // Track 2: Flow (trackHeight + trackGap to trackHeight * 2 + trackGap)
    // Track 3: Volume (trackHeight * 2 + totalGap to height)
    const t1Top = 0;
    const t1Bottom = trackHeight;
    const t2Top = trackHeight + trackGap;
    const t2Bottom = trackHeight * 2 + trackGap;
    const t3Top = trackHeight * 2 + totalGap;
    const t3Bottom = height;

    // Function to draw sleek rounded track background cards
    const drawTrackCard = (top: number, bottom: number, accentColor: string) => {
      const h = bottom - top;
      ctx.save();
      // Rounded Card Background
      ctx.fillStyle = '#0a0c13';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(4, top + 2, width - 8, h - 4, 12);
        ctx.fill();
      } else {
        ctx.fillRect(4, top + 2, width - 8, h - 4);
      }

      // Soft ambient gradient
      const bgGrad = ctx.createLinearGradient(0, top, 0, bottom);
      bgGrad.addColorStop(0, 'rgba(18, 22, 34, 0.45)');
      bgGrad.addColorStop(1, 'rgba(8, 10, 16, 0.6)');
      ctx.fillStyle = bgGrad;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(4, top + 2, width - 8, h - 4, 12);
        ctx.fill();
      }

      // Subtle track border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(4, top + 2, width - 8, h - 4, 12);
        ctx.stroke();
      }

      // Soft rounded grid lines (Vertical 1-sec markers)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const vSteps = 10;
      for (let i = 1; i < vSteps; i++) {
        const x = (i * width) / vSteps;
        ctx.beginPath();
        ctx.moveTo(x, top + 4);
        ctx.lineTo(x, bottom - 4);
        ctx.stroke();
      }

      ctx.restore();
    };

    // Draw 3 Track Cards
    drawTrackCard(t1Top, t1Bottom, '#00e5ff');
    drawTrackCard(t2Top, t2Bottom, '#10b981');
    drawTrackCard(t3Top, t3Bottom, '#f59e0b');

    // Zero Baselines & Scaled Positions
    // 1. Pressure Baseline
    const pZeroY = t1Bottom - 16;
    const pScale = (trackHeight - 38) / pressureMax;
    const pPeepY = pZeroY - peepSet * pScale;

    // Zero dashed line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(12, pZeroY);
    ctx.lineTo(width - 12, pZeroY);
    ctx.stroke();

    // PEEP line (cyan subtle glow)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(12, pPeepY);
    ctx.lineTo(width - 12, pPeepY);
    ctx.stroke();

    // 2. Flow Baseline (Zero is at vertical center of Track 2)
    const fZeroY = t2Top + (t2Bottom - t2Top) / 2;
    const fScale = (trackHeight / 2 - 16) / flowMax;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(12, fZeroY);
    ctx.lineTo(width - 12, fZeroY);
    ctx.stroke();

    // 3. Volume Baseline (Zero is at bottom of Track 3)
    const vZeroY = t3Bottom - 16;
    const vScale = (trackHeight - 38) / volumeMax;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(12, vZeroY);
    ctx.lineTo(width - 12, vZeroY);
    ctx.stroke();

    ctx.setLineDash([]); // Reset line dash

    // Helper to draw rounded pill badge on canvas
    const drawBadge = (
      label: string,
      sub: string,
      x: number,
      y: number,
      color: string,
      bgColor: string,
      borderColor: string
    ) => {
      ctx.save();
      const badgeW = 104;
      const badgeH = 22;

      // Rounded background pill
      ctx.fillStyle = bgColor;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, badgeW, badgeH, 11);
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillRect(x, y, badgeW, badgeH);
      }

      // Glowing dot
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x + 10, y + badgeH / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label text
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(label, x + 20, y + 15);

      ctx.restore();
    };

    // Draw Channel Indicator Badges
    drawBadge(
      'Paw (cmH₂O)',
      `PEEP ${peepSet}`,
      16,
      t1Top + 8,
      '#00e5ff',
      'rgba(0, 229, 255, 0.12)',
      'rgba(0, 229, 255, 0.35)'
    );
    drawBadge(
      'Fluxo (L/min)',
      `±${flowMax}`,
      16,
      t2Top + 8,
      '#10b981',
      'rgba(16, 185, 129, 0.12)',
      'rgba(16, 185, 129, 0.35)'
    );
    drawBadge(
      'Volume (mL)',
      `${volumeMax}`,
      16,
      t3Top + 8,
      '#f59e0b',
      'rgba(245, 158, 11, 0.12)',
      'rgba(245, 158, 11, 0.35)'
    );

    // Dynamic Scale Numerical Markers
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';

    // Track 1 Scale labels
    ctx.fillText(`${pressureMax}`, width - 36, t1Top + 18);
    ctx.fillText(`0`, width - 20, pZeroY - 2);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`PEEP ${peepSet}`, width - 68, pPeepY - 4);

    // Track 2 Scale labels
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.fillText(`+${flowMax}`, width - 42, t2Top + 18);
    ctx.fillText(`0`, width - 20, fZeroY - 2);
    ctx.fillText(`-${flowMax}`, width - 42, t2Bottom - 8);

    // Track 3 Scale labels
    ctx.fillText(`${volumeMax}`, width - 40, t3Top + 18);
    ctx.fillText(`0`, width - 20, vZeroY - 2);

    const buffer = bufferRef.current;
    if (buffer.length < 2) {
      ctx.restore();
      return;
    }

    const sweepIdx = sweepIndexRef.current;
    const isFrozen = maneuverState.isFrozen;

    // Spline-Smooth Waveform Drawer with Rounded Quadratic Bezier Interpolation
    const drawSmoothSplineTrack = (
      getY: (sample: WaveformSample) => number,
      color: string,
      glowColor: string,
      fillGrad?: { zeroY: number; topColor: string; bottomColor: string }
    ) => {
      ctx.save();
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;

      // In non-frozen mode: draw two smooth continuous segments around sweep erase bar
      const segments = isFrozen
        ? [[0, buffer.length]]
        : [
            [0, Math.max(0, sweepIdx - 1)],
            [Math.min(buffer.length, sweepIdx + 8), buffer.length],
          ];

      for (const [start, end] of segments) {
        if (end - start < 2) continue;

        // Build array of transformed (x, y) coordinates
        const points: { x: number; y: number }[] = [];
        for (let i = start; i < end; i++) {
          if (i >= buffer.length) break;
          const s = buffer[i];
          const px = (i / maxPoints) * width;
          const py = getY(s);
          points.push({ x: px, y: py });
        }

        if (points.length < 2) continue;

        // 1. Draw smooth bezier curve path
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[i];
          const p1 = points[i + 1];
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();

        // 2. Optional Soft Rounded Gradient Fill Under the Curve
        if (fillGrad && points.length > 2) {
          ctx.save();
          ctx.shadowBlur = 0;
          const firstX = points[0].x;
          const lastX = points[points.length - 1].x;

          ctx.beginPath();
          ctx.moveTo(firstX, points[0].y);

          for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const midX = (p0.x + p1.x) / 2;
            const midY = (p0.y + p1.y) / 2;
            ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
          }
          ctx.lineTo(lastX, points[points.length - 1].y);
          ctx.lineTo(lastX, fillGrad.zeroY);
          ctx.lineTo(firstX, fillGrad.zeroY);
          ctx.closePath();

          const areaGrad = ctx.createLinearGradient(0, getY(buffer[start]), 0, fillGrad.zeroY);
          areaGrad.addColorStop(0, fillGrad.topColor);
          areaGrad.addColorStop(1, fillGrad.bottomColor);
          ctx.fillStyle = areaGrad;
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();
    };

    // 1. Draw Paw Curve (Sleek Cyan with soft smooth neon curve)
    drawSmoothSplineTrack(
      (s) => Math.max(t1Top + 6, Math.min(t1Bottom - 6, pZeroY - s.pressure * pScale)),
      '#00e5ff',
      'rgba(0, 229, 255, 0.7)',
      {
        zeroY: pZeroY,
        topColor: 'rgba(0, 229, 255, 0.14)',
        bottomColor: 'rgba(0, 229, 255, 0.01)',
      }
    );

    // 2. Draw Flow Curve (Sleek Emerald with bidirectional smooth curves)
    drawSmoothSplineTrack(
      (s) => Math.max(t2Top + 6, Math.min(t2Bottom - 6, fZeroY - s.flow * fScale)),
      '#10b981',
      'rgba(16, 185, 129, 0.7)',
      {
        zeroY: fZeroY,
        topColor: 'rgba(16, 185, 129, 0.12)',
        bottomColor: 'rgba(16, 185, 129, 0.01)',
      }
    );

    // 3. Draw Volume Curve (Sleek Warm Amber with smooth rise and exhalation decay)
    drawSmoothSplineTrack(
      (s) => Math.max(t3Top + 6, Math.min(t3Bottom - 6, vZeroY - s.volume * vScale)),
      '#f59e0b',
      'rgba(245, 158, 11, 0.7)',
      {
        zeroY: vZeroY,
        topColor: 'rgba(245, 158, 11, 0.14)',
        bottomColor: 'rgba(245, 158, 11, 0.01)',
      }
    );

    // Spontaneous Trigger Markers (Gentle glowing amber circular beacon)
    for (let i = 0; i < buffer.length; i++) {
      const s = buffer[i];
      if (s.isTriggered && i % 8 === 0) {
        const x = (i / maxPoints) * width;
        const y = pZeroY - s.pressure * pScale;
        ctx.save();
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y + 8, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('Trig', x - 9, y + 20);
        ctx.restore();
      }
    }

    // Sweep Erase Bar with Rounded Glowing Tip
    if (!isFrozen) {
      const sweepX = (sweepIdx / maxPoints) * width;
      const grad = ctx.createLinearGradient(sweepX - 28, 0, sweepX + 4, 0);
      grad.addColorStop(0, 'rgba(7, 8, 13, 0)');
      grad.addColorStop(0.75, 'rgba(7, 8, 13, 0.95)');
      grad.addColorStop(1, '#07080d');

      ctx.fillStyle = grad;
      ctx.fillRect(Math.max(0, sweepX - 28), 0, 32, height);

      // Glowing neon sweep line
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
      ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sweepX, 4);
      ctx.lineTo(sweepX, height - 4);
      ctx.stroke();

      // Glowing circular head
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(sweepX, 10, 3, 0, Math.PI * 2);
      ctx.arc(sweepX, height - 10, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Hold Maneuver Overlays (Insp Hold / Exp Hold) with Rounded Banner
    if (maneuverState.inspiratoryHoldActive) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.16)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(140, 8, width - 280, 28, 14);
        ctx.fill();
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏸ PAUSA INSPIRATÓRIA EM CURSO (Medição de Pplat & Cst)', width / 2, 26);
      ctx.restore();
    } else if (maneuverState.expiratoryHoldActive) {
      ctx.save();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(140, 8, width - 280, 28, 14);
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏸ PAUSA EXPIRATÓRIA EM CURSO (Medição de Auto-PEEP)', width / 2, 26);
      ctx.restore();
    }

    // Freeze Mode Caliper Overlay & Inspector
    if (isFrozen) {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(130, 8, width - 260, 28, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❄ CURVAS CONGELADAS (Passe o mouse para inspecionar valores)', width / 2, 26);
      ctx.restore();

      if (hoverData && hoverData.sample) {
        const hX = hoverData.x;
        const s = hoverData.sample;

        // Crosshair vertical line
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(hX, 4);
        ctx.lineTo(hX, height - 4);
        ctx.stroke();
        ctx.restore();

        // Rounded Glassmorphic Inspection Tooltip
        const tipW = 175;
        const tipH = 96;
        const tipX = Math.min(width - tipW - 16, Math.max(16, hX + 16));
        const tipY = 48;

        ctx.save();
        ctx.fillStyle = 'rgba(12, 14, 22, 0.95)';
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(tipX, tipY, tipW, tipH, 14);
          ctx.fill();
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
          ctx.shadowBlur = 10;
          ctx.stroke();
        } else {
          ctx.fillRect(tipX, tipY, tipW, tipH);
        }

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Tempo: ${s.time.toFixed(2)} s`, tipX + 12, tipY + 22);

        ctx.fillStyle = '#00e5ff';
        ctx.fillText(`Paw:   ${s.pressure.toFixed(1)} cmH₂O`, tipX + 12, tipY + 42);

        ctx.fillStyle = '#10b981';
        ctx.fillText(`Fluxo: ${s.flow.toFixed(1)} L/min`, tipX + 12, tipY + 62);

        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`Vol:   ${s.volume} mL`, tipX + 12, tipY + 82);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [
    maneuverState.isFrozen,
    maneuverState.inspiratoryHoldActive,
    maneuverState.expiratoryHoldActive,
    pressureMax,
    flowMax,
    volumeMax,
    peepSet,
    hoverData,
  ]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderCanvas();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas]);

  // Mouse hover for Caliper in Freeze mode
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maneuverState.isFrozen || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const buffer = bufferRef.current;
    if (buffer.length === 0) return;

    const idx = Math.floor((x / rect.width) * buffer.length);
    const sample = buffer[Math.min(buffer.length - 1, Math.max(0, idx))];
    setHoverData({ x, sample });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-full bg-[#08090f] rounded-2xl border border-zinc-800/80 shadow-2xl overflow-hidden backdrop-blur-md"
    >
      {/* Top Rounded Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#0d0e17]/90 border-b border-zinc-800/80 select-none">
        {/* Left: Section Title & View Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span className="font-display font-bold tracking-wider text-xs uppercase">
              Curvas Ventilatórias
            </span>
          </div>

          {/* View Switcher Pill Tabs if supported */}
          {onSelectViewMode && (
            <div className="flex items-center bg-[#12141e] p-0.5 rounded-full border border-zinc-800">
              <button
                onClick={() => onSelectViewMode('waveforms')}
                className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  viewMode === 'waveforms'
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Curvas
              </button>
              <button
                onClick={() => onSelectViewMode('loops')}
                className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  viewMode === 'loops'
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Alças (Loops)
              </button>
              <button
                onClick={() => onSelectViewMode('split')}
                className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Misto
              </button>
            </div>
          )}

          {maneuverState.isFrozen && (
            <span className="bg-rose-950/80 text-rose-300 border border-rose-500/60 px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] flex items-center gap-1 shadow-sm animate-pulse">
              <Pause className="w-3 h-3" /> CONGELADO
            </span>
          )}
        </div>

        {/* Right: Scales Selector Pills & Freeze Button */}
        <div className="flex items-center gap-2">
          {/* Pressure Max Pill */}
          <div className="flex items-center gap-1 bg-[#12141e] px-2.5 py-0.5 rounded-full border border-zinc-700/60 hover:border-cyan-500/50 transition-all">
            <span className="text-[10px] text-cyan-400 font-mono font-bold">P.Max:</span>
            <select
              value={pressureMax}
              onChange={(e) => setPressureMax(Number(e.target.value))}
              className="bg-transparent text-zinc-200 text-[11px] font-mono focus:outline-none cursor-pointer"
            >
              <option value={30} className="bg-[#0e0f14] text-zinc-200">
                30 cmH₂O
              </option>
              <option value={40} className="bg-[#0e0f14] text-zinc-200">
                40 cmH₂O
              </option>
              <option value={60} className="bg-[#0e0f14] text-zinc-200">
                60 cmH₂O
              </option>
              <option value={80} className="bg-[#0e0f14] text-zinc-200">
                80 cmH₂O
              </option>
            </select>
          </div>

          {/* Flow Max Pill */}
          <div className="flex items-center gap-1 bg-[#12141e] px-2.5 py-0.5 rounded-full border border-zinc-700/60 hover:border-emerald-500/50 transition-all">
            <span className="text-[10px] text-emerald-400 font-mono font-bold">F.Max:</span>
            <select
              value={flowMax}
              onChange={(e) => setFlowMax(Number(e.target.value))}
              className="bg-transparent text-zinc-200 text-[11px] font-mono focus:outline-none cursor-pointer"
            >
              <option value={60} className="bg-[#0e0f14] text-zinc-200">
                ±60 L/min
              </option>
              <option value={80} className="bg-[#0e0f14] text-zinc-200">
                ±80 L/min
              </option>
              <option value={120} className="bg-[#0e0f14] text-zinc-200">
                ±120 L/min
              </option>
            </select>
          </div>

          {/* Volume Max Pill */}
          <div className="flex items-center gap-1 bg-[#12141e] px-2.5 py-0.5 rounded-full border border-zinc-700/60 hover:border-amber-500/50 transition-all">
            <span className="text-[10px] text-amber-400 font-mono font-bold">V.Max:</span>
            <select
              value={volumeMax}
              onChange={(e) => setVolumeMax(Number(e.target.value))}
              className="bg-transparent text-zinc-200 text-[11px] font-mono focus:outline-none cursor-pointer"
            >
              <option value={600} className="bg-[#0e0f14] text-zinc-200">
                600 mL
              </option>
              <option value={800} className="bg-[#0e0f14] text-zinc-200">
                800 mL
              </option>
              <option value={1200} className="bg-[#0e0f14] text-zinc-200">
                1200 mL
              </option>
            </select>
          </div>

          {/* Freeze Button Pill */}
          <button
            id="waveform-freeze-btn"
            onClick={onToggleFreeze}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full font-bold font-mono text-[11px] transition-all cursor-pointer shadow-md ${
              maneuverState.isFrozen
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950 ring-2 ring-rose-300/60'
                : 'bg-[#181a26] hover:bg-[#222536] text-zinc-200 border border-zinc-700/70'
            }`}
          >
            {maneuverState.isFrozen ? (
              <>
                <Play className="w-3 h-3 fill-current" /> Retomar
              </>
            ) : (
              <>
                <Pause className="w-3 h-3" /> Congelar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Canvas Display Area */}
      <div className="relative flex-1 w-full h-full min-h-[360px] p-1.5">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block rounded-xl cursor-crosshair"
        />
      </div>
    </div>
  );
};
