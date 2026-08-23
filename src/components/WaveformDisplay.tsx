import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WaveformSample, ManeuverState } from '../types/ventilation';
import {
  Pause,
  Play,
  Activity,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
  const { isLight } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);

  // Dual Canvas References for High Performance Layering
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Buffer of historical samples for rendering the sweep or scrolling line
  const bufferRef = useRef<WaveformSample[]>([]);
  const sweepIndexRef = useRef<number>(0);
  const maxPoints = 500; // Resolution across canvas width

  const [pressureMax, setPressureMax] = useState<number>(pMaxScale);
  const [flowMax, setFlowMax] = useState<number>(80);
  const [volumeMax, setVolumeMax] = useState<number>(800);

  // Store layout dimensions
  const dimensionsRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 800,
    height: 400,
    dpr: window.devicePixelRatio || 1,
  });

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

  // ============================================================================
  // LAYER 1: STATIC BACKGROUND CANVAS (Grid, Eixos, Limites, Track Cards, Badges)
  // Only redraws on resize, theme toggle, or scale adjustments!
  // ============================================================================
  const renderBackground = useCallback(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 400;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    dimensionsRef.current = { width, height, dpr };

    // HiDPI Retina sharp pixel backing
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Canvas Background
    ctx.fillStyle = isLight ? '#f8fafc' : '#07080d';
    ctx.fillRect(0, 0, width, height);

    // Layout: 3 equal track channels with rounded separation
    const trackGap = 6;
    const totalGap = trackGap * 2;
    const trackHeight = (height - totalGap) / 3;

    const t1Top = 0;
    const t1Bottom = trackHeight;
    const t2Top = trackHeight + trackGap;
    const t2Bottom = trackHeight * 2 + trackGap;
    const t3Top = trackHeight * 2 + totalGap;
    const t3Bottom = height;

    // Helper: Draw Track Card
    const drawTrackCard = (top: number, bottom: number) => {
      const h = bottom - top;
      ctx.save();

      // Rounded Card Background
      ctx.fillStyle = isLight ? '#ffffff' : '#0a0c13';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(4, top + 2, width - 8, h - 4, 12);
        ctx.fill();
      } else {
        ctx.fillRect(4, top + 2, width - 8, h - 4);
      }

      // Soft ambient gradient
      const bgGrad = ctx.createLinearGradient(0, top, 0, bottom);
      if (isLight) {
        bgGrad.addColorStop(0, 'rgba(241, 245, 249, 0.6)');
        bgGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
      } else {
        bgGrad.addColorStop(0, 'rgba(18, 22, 34, 0.45)');
        bgGrad.addColorStop(1, 'rgba(8, 10, 16, 0.6)');
      }
      ctx.fillStyle = bgGrad;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(4, top + 2, width - 8, h - 4, 12);
        ctx.fill();
      }

      // Subtle track border
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(4, top + 2, width - 8, h - 4, 12);
        ctx.stroke();
      }

      // Grid lines (Vertical 1-sec markers)
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.03)';
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

    // Draw the 3 Track Cards
    drawTrackCard(t1Top, t1Bottom);
    drawTrackCard(t2Top, t2Bottom);
    drawTrackCard(t3Top, t3Bottom);

    // 1. Pressure Baselines
    const pZeroY = t1Bottom - 16;
    const pScale = (trackHeight - 38) / pressureMax;
    const pPeepY = pZeroY - peepSet * pScale;

    // Zero dashed line
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(12, pZeroY);
    ctx.lineTo(width - 12, pZeroY);
    ctx.stroke();

    // PEEP line (cyan subtle glow)
    ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.5)' : 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(12, pPeepY);
    ctx.lineTo(width - 12, pPeepY);
    ctx.stroke();

    // 2. Flow Baseline (Center of Track 2)
    const fZeroY = t2Top + (t2Bottom - t2Top) / 2;
    ctx.strokeStyle = isLight ? 'rgba(5, 150, 105, 0.4)' : 'rgba(16, 185, 129, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(12, fZeroY);
    ctx.lineTo(width - 12, fZeroY);
    ctx.stroke();

    // 3. Volume Baseline (Bottom of Track 3)
    const vZeroY = t3Bottom - 16;
    ctx.strokeStyle = isLight ? 'rgba(217, 119, 6, 0.4)' : 'rgba(245, 158, 11, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(12, vZeroY);
    ctx.lineTo(width - 12, vZeroY);
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash

    // Helper: Draw Track Badge
    const drawBadge = (
      label: string,
      x: number,
      y: number,
      color: string,
      bgColor: string,
      borderColor: string
    ) => {
      ctx.save();
      const badgeW = 108;
      const badgeH = 22;

      ctx.fillStyle = isLight ? '#f8fafc' : bgColor;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, badgeW, badgeH, 11);
        ctx.fill();
        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillRect(x, y, badgeW, badgeH);
      }

      // Glowing dot indicator
      ctx.fillStyle = color;
      if (!isLight) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      ctx.arc(x + 10, y + badgeH / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label text
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = isLight ? '#0f172a' : '#f1f5f9';
      ctx.fillText(label, x + 20, y + 15);

      ctx.restore();
    };

    // Draw Channel Indicator Badges
    drawBadge(
      'Paw (cmH₂O)',
      16,
      t1Top + 8,
      isLight ? '#0284c7' : '#00e5ff',
      'rgba(0, 229, 255, 0.12)',
      'rgba(0, 229, 255, 0.35)'
    );
    drawBadge(
      'Fluxo (L/min)',
      16,
      t2Top + 8,
      isLight ? '#059669' : '#10b981',
      'rgba(16, 185, 129, 0.12)',
      'rgba(16, 185, 129, 0.35)'
    );
    drawBadge(
      'Volume (mL)',
      16,
      t3Top + 8,
      isLight ? '#d97706' : '#f59e0b',
      'rgba(245, 158, 11, 0.12)',
      'rgba(245, 158, 11, 0.35)'
    );

    // Numerical scale markers
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = isLight ? '#64748b' : 'rgba(148, 163, 184, 0.6)';

    // Track 1 labels
    ctx.fillText(`${pressureMax}`, width - 36, t1Top + 18);
    ctx.fillText(`0`, width - 20, pZeroY - 2);
    ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
    ctx.fillText(`PEEP ${peepSet}`, width - 68, pPeepY - 4);

    // Track 2 labels
    ctx.fillStyle = isLight ? '#64748b' : 'rgba(148, 163, 184, 0.6)';
    ctx.fillText(`+${flowMax}`, width - 42, t2Top + 18);
    ctx.fillText(`0`, width - 20, fZeroY - 2);
    ctx.fillText(`-${flowMax}`, width - 42, t2Bottom - 8);

    // Track 3 labels
    ctx.fillText(`${volumeMax}`, width - 40, t3Top + 18);
    ctx.fillText(`0`, width - 20, vZeroY - 2);

    ctx.restore();
  }, [isLight, pressureMax, flowMax, volumeMax, peepSet]);

  // ============================================================================
  // LAYER 2: DYNAMIC FOREGROUND CANVAS (Curvas Suaves, Sweep Line, Caliper, Banner)
  // Runs 60fps/120fps with zero overhead on static elements!
  // ============================================================================
  const renderForeground = useCallback(() => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, dpr } = dimensionsRef.current;

    // Retina buffer alignment
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear only foreground transparent buffer
    ctx.clearRect(0, 0, width, height);

    const trackGap = 6;
    const totalGap = trackGap * 2;
    const trackHeight = (height - totalGap) / 3;

    const t1Top = 0;
    const t1Bottom = trackHeight;
    const t2Top = trackHeight + trackGap;
    const t2Bottom = trackHeight * 2 + trackGap;
    const t3Top = trackHeight * 2 + totalGap;
    const t3Bottom = height;

    const pZeroY = t1Bottom - 16;
    const pScale = (trackHeight - 38) / pressureMax;

    const fZeroY = t2Top + (t2Bottom - t2Top) / 2;
    const fScale = (trackHeight / 2 - 16) / flowMax;

    const vZeroY = t3Bottom - 16;
    const vScale = (trackHeight - 38) / volumeMax;

    const buffer = bufferRef.current;
    const sweepIdx = sweepIndexRef.current;
    const isFrozen = maneuverState.isFrozen;

    // High-Fidelity Spline Curve Smoothing with Quadratic Midpoint Bezier Algorithm
    const drawSmoothSplineTrack = (
      getY: (sample: WaveformSample) => number,
      color: string,
      glowColor: string,
      fillGrad?: { zeroY: number; topColor: string; bottomColor: string }
    ) => {
      if (buffer.length < 2) return;

      ctx.save();
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      if (!isLight) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 7;
      }

      // In non-frozen mode: draw smooth continuous segments avoiding the sweep head
      const segments = isFrozen
        ? [[0, buffer.length]]
        : [
            [0, Math.max(0, sweepIdx - 1)],
            [Math.min(buffer.length, sweepIdx + 8), buffer.length],
          ];

      for (const [start, end] of segments) {
        if (end - start < 2) continue;

        const points: { x: number; y: number }[] = [];
        for (let i = start; i < end; i++) {
          if (i >= buffer.length) break;
          const s = buffer[i];
          const px = (i / maxPoints) * width;
          const py = getY(s);
          points.push({ x: px, y: py });
        }

        if (points.length < 2) continue;

        // 1. Draw smooth bezier curve stroke
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

        // 2. Soft Volumetric Gradient Fill Under Curve
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

    // 1. Draw Paw Curve (Cyan)
    drawSmoothSplineTrack(
      (s) => Math.max(t1Top + 6, Math.min(t1Bottom - 6, pZeroY - s.pressure * pScale)),
      isLight ? '#0284c7' : '#00e5ff',
      isLight ? 'rgba(2, 132, 199, 0.4)' : 'rgba(0, 229, 255, 0.7)',
      {
        zeroY: pZeroY,
        topColor: isLight ? 'rgba(2, 132, 199, 0.18)' : 'rgba(0, 229, 255, 0.14)',
        bottomColor: isLight ? 'rgba(2, 132, 199, 0.01)' : 'rgba(0, 229, 255, 0.01)',
      }
    );

    // 2. Draw Flow Curve (Emerald)
    drawSmoothSplineTrack(
      (s) => Math.max(t2Top + 6, Math.min(t2Bottom - 6, fZeroY - s.flow * fScale)),
      isLight ? '#059669' : '#10b981',
      isLight ? 'rgba(5, 150, 105, 0.4)' : 'rgba(16, 185, 129, 0.7)',
      {
        zeroY: fZeroY,
        topColor: isLight ? 'rgba(5, 150, 105, 0.16)' : 'rgba(16, 185, 129, 0.12)',
        bottomColor: isLight ? 'rgba(5, 150, 105, 0.01)' : 'rgba(16, 185, 129, 0.01)',
      }
    );

    // 3. Draw Volume Curve (Amber)
    drawSmoothSplineTrack(
      (s) => Math.max(t3Top + 6, Math.min(t3Bottom - 6, vZeroY - s.volume * vScale)),
      isLight ? '#d97706' : '#f59e0b',
      isLight ? 'rgba(217, 119, 6, 0.4)' : 'rgba(245, 158, 11, 0.7)',
      {
        zeroY: vZeroY,
        topColor: isLight ? 'rgba(217, 119, 6, 0.18)' : 'rgba(245, 158, 11, 0.14)',
        bottomColor: isLight ? 'rgba(217, 119, 6, 0.01)' : 'rgba(245, 158, 11, 0.01)',
      }
    );

    // Spontaneous Trigger Markers
    for (let i = 0; i < buffer.length; i++) {
      const s = buffer[i];
      if (s.isTriggered && i % 8 === 0) {
        const x = (i / maxPoints) * width;
        const y = pZeroY - s.pressure * pScale;
        ctx.save();
        ctx.fillStyle = isLight ? '#d97706' : '#fbbf24';
        if (!isLight) {
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(x, y + 8, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = isLight ? '#b45309' : '#fbbf24';
        ctx.fillText('Trig', x - 9, y + 20);
        ctx.restore();
      }
    }

    // Sweep Erase Bar with Rounded Glowing Tip
    if (!isFrozen) {
      const sweepX = (sweepIdx / maxPoints) * width;
      const grad = ctx.createLinearGradient(sweepX - 28, 0, sweepX + 4, 0);
      if (isLight) {
        grad.addColorStop(0, 'rgba(248, 250, 252, 0)');
        grad.addColorStop(0.75, 'rgba(248, 250, 252, 0.95)');
        grad.addColorStop(1, '#f8fafc');
      } else {
        grad.addColorStop(0, 'rgba(7, 8, 13, 0)');
        grad.addColorStop(0.75, 'rgba(7, 8, 13, 0.95)');
        grad.addColorStop(1, '#07080d');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(Math.max(0, sweepX - 28), 0, 32, height);

      // Glowing neon sweep line
      ctx.save();
      ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.85)' : 'rgba(0, 229, 255, 0.8)';
      if (!isLight) {
        ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
        ctx.shadowBlur = 10;
      }
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sweepX, 4);
      ctx.lineTo(sweepX, height - 4);
      ctx.stroke();

      // Glowing circular head
      ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
      ctx.beginPath();
      ctx.arc(sweepX, 10, 3, 0, Math.PI * 2);
      ctx.arc(sweepX, height - 10, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Hold Maneuver Overlays (Insp Hold / Exp Hold)
    if (maneuverState.inspiratoryHoldActive) {
      ctx.save();
      ctx.fillStyle = isLight ? 'rgba(2, 132, 199, 0.14)' : 'rgba(0, 229, 255, 0.16)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(140, 8, width - 280, 28, 14);
        ctx.fill();
        ctx.strokeStyle = isLight ? '#0284c7' : '#00e5ff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏸ PAUSA INSPIRATÓRIA EM CURSO (Medição de Pplat & Cst)', width / 2, 26);
      ctx.restore();
    } else if (maneuverState.expiratoryHoldActive) {
      ctx.save();
      ctx.fillStyle = isLight ? 'rgba(217, 119, 6, 0.14)' : 'rgba(251, 191, 36, 0.18)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(140, 8, width - 280, 28, 14);
        ctx.fill();
        ctx.strokeStyle = isLight ? '#d97706' : '#fbbf24';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.fillStyle = isLight ? '#d97706' : '#fbbf24';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏸ PAUSA EXPIRATÓRIA EM CURSO (Medição de Auto-PEEP)', width / 2, 26);
      ctx.restore();
    }

    // Freeze Mode Caliper Overlay & Inspector
    if (isFrozen) {
      ctx.save();
      ctx.fillStyle = isLight ? 'rgba(225, 29, 72, 0.12)' : 'rgba(239, 68, 68, 0.2)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(130, 8, width - 260, 28, 14);
        ctx.fill();
        ctx.strokeStyle = isLight ? 'rgba(225, 29, 72, 0.6)' : 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.fillStyle = isLight ? '#e11d48' : '#f87171';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❄ CURVAS CONGELADAS (Passe o mouse para inspecionar valores)', width / 2, 26);
      ctx.restore();

      if (hoverData && hoverData.sample) {
        const hX = hoverData.x;
        const s = hoverData.sample;

        // Crosshair vertical line
        ctx.save();
        ctx.strokeStyle = isLight ? '#334155' : '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(hX, 4);
        ctx.lineTo(hX, height - 4);
        ctx.stroke();
        ctx.restore();

        // Rounded Inspection Tooltip
        const tipW = 175;
        const tipH = 96;
        const tipX = Math.min(width - tipW - 16, Math.max(16, hX + 16));
        const tipY = 48;

        ctx.save();
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(12, 14, 22, 0.95)';
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(tipX, tipY, tipW, tipH, 14);
          ctx.fill();
          ctx.strokeStyle = isLight ? '#0284c7' : '#00e5ff';
          ctx.lineWidth = 1.5;
          if (!isLight) {
            ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
            ctx.shadowBlur = 10;
          }
          ctx.stroke();
        } else {
          ctx.fillRect(tipX, tipY, tipW, tipH);
        }

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
        ctx.fillText(`Tempo: ${s.time.toFixed(2)} s`, tipX + 12, tipY + 22);

        ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
        ctx.fillText(`Paw:   ${s.pressure.toFixed(1)} cmH₂O`, tipX + 12, tipY + 42);

        ctx.fillStyle = isLight ? '#059669' : '#10b981';
        ctx.fillText(`Fluxo: ${s.flow.toFixed(1)} L/min`, tipX + 12, tipY + 62);

        ctx.fillStyle = isLight ? '#d97706' : '#f59e0b';
        ctx.fillText(`Vol:   ${s.volume} mL`, tipX + 12, tipY + 82);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [
    isLight,
    maneuverState.isFrozen,
    maneuverState.inspiratoryHoldActive,
    maneuverState.expiratoryHoldActive,
    pressureMax,
    flowMax,
    volumeMax,
    hoverData,
  ]);

  // ResizeObserver for dynamic Retina sharp canvas sizing
  useEffect(() => {
    const area = canvasAreaRef.current;
    if (!area) return;

    const handleResize = () => {
      renderBackground();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(area);
    handleResize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [renderBackground]);

  // Trigger background repaint on dependency change
  useEffect(() => {
    renderBackground();
  }, [renderBackground]);

  // Continuous Foreground 60/120fps Animation Loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderForeground();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderForeground]);

  // Mouse hover for Caliper in Freeze mode
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maneuverState.isFrozen || !fgCanvasRef.current) return;
    const rect = fgCanvasRef.current.getBoundingClientRect();
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
      className={`relative flex flex-col h-full rounded-2xl border overflow-hidden transition-colors ${
        isLight
          ? 'bg-white border-slate-200 shadow-md'
          : 'bg-[#08090f] border-zinc-800/80 shadow-2xl backdrop-blur-md'
      }`}
    >
      {/* Top Rounded Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b select-none ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d0e17]/90 border-zinc-800/80'
        }`}
      >
        {/* Left: Section Title & View Switcher */}
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              isLight
                ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-display font-bold tracking-wider text-xs uppercase">
              Curvas Ventilatórias
            </span>
          </div>

          {/* View Switcher Pill Tabs */}
          {onSelectViewMode && (
            <div
              className={`flex items-center p-0.5 rounded-full border ${
                isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#12141e] border-zinc-800'
              }`}
            >
              <button
                onClick={() => onSelectViewMode('waveforms')}
                className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  viewMode === 'waveforms'
                    ? isLight
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-cyan-500 text-black shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Curvas
              </button>
              <button
                onClick={() => onSelectViewMode('loops')}
                className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  viewMode === 'loops'
                    ? isLight
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-cyan-500 text-black shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Alças (Loops)
              </button>
              <button
                onClick={() => onSelectViewMode('split')}
                className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  viewMode === 'split'
                    ? isLight
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-cyan-500 text-black shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Misto
              </button>
            </div>
          )}

          {maneuverState.isFrozen && (
            <span className="bg-rose-500/20 text-rose-700 border border-rose-400 px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] flex items-center gap-1 shadow-sm animate-pulse">
              <Pause className="w-3 h-3" /> CONGELADO
            </span>
          )}
        </div>

        {/* Right: Scales Selector Pills & Freeze Button */}
        <div className="flex items-center gap-2">
          {/* Pressure Max Pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border transition-all ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#12141e] border-zinc-700/60'
            }`}
          >
            <span
              className={`text-[10px] font-mono font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}
            >
              P.Max:
            </span>
            <select
              value={pressureMax}
              onChange={(e) => setPressureMax(Number(e.target.value))}
              className={`bg-transparent text-[11px] font-mono focus:outline-none cursor-pointer ${
                isLight ? 'text-slate-800' : 'text-zinc-200'
              }`}
            >
              <option value={30} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                30 cmH₂O
              </option>
              <option value={40} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                40 cmH₂O
              </option>
              <option value={60} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                60 cmH₂O
              </option>
              <option value={80} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                80 cmH₂O
              </option>
            </select>
          </div>

          {/* Flow Max Pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border transition-all ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#12141e] border-zinc-700/60'
            }`}
          >
            <span
              className={`text-[10px] font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}
            >
              F.Max:
            </span>
            <select
              value={flowMax}
              onChange={(e) => setFlowMax(Number(e.target.value))}
              className={`bg-transparent text-[11px] font-mono focus:outline-none cursor-pointer ${
                isLight ? 'text-slate-800' : 'text-zinc-200'
              }`}
            >
              <option value={60} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                ±60 L/min
              </option>
              <option value={80} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                ±80 L/min
              </option>
              <option value={120} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                ±120 L/min
              </option>
            </select>
          </div>

          {/* Volume Max Pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border transition-all ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#12141e] border-zinc-700/60'
            }`}
          >
            <span
              className={`text-[10px] font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}
            >
              V.Max:
            </span>
            <select
              value={volumeMax}
              onChange={(e) => setVolumeMax(Number(e.target.value))}
              className={`bg-transparent text-[11px] font-mono focus:outline-none cursor-pointer ${
                isLight ? 'text-slate-800' : 'text-zinc-200'
              }`}
            >
              <option value={600} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                600 mL
              </option>
              <option value={800} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                800 mL
              </option>
              <option value={1200} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
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
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
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

      {/* Main Dual-Layer Canvas Display Area */}
      <div ref={canvasAreaRef} className="relative flex-1 w-full h-full min-h-[360px] p-1.5">
        {/* Layer 1: Static Background Canvas (Grids, Lines, Labels) */}
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] block rounded-xl pointer-events-none"
        />

        {/* Layer 2: Dynamic Real-time Spline Waves & Sweep Line */}
        <canvas
          ref={fgCanvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="absolute inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] block rounded-xl cursor-crosshair z-10"
        />
      </div>
    </div>
  );
};
