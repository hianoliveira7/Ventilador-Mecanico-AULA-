import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WaveformSample, ManeuverState, MonitoredData } from '../types/ventilation';
import {
  Pause,
  Play,
  Activity,
  Clock,
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
  monitored?: MonitoredData;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  currentSample,
  maneuverState,
  onToggleFreeze,
  pMaxScale = 40,
  peepSet,
  viewMode = 'waveforms',
  onSelectViewMode,
  monitored,
}) => {
  const { isLight } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);

  // Dual Canvas References for High Performance Layering
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // High resolution buffer of historical samples
  const bufferRef = useRef<WaveformSample[]>([]);
  const sweepIndexRef = useRef<number>(0);
  // Time window (sweep duration in seconds)
  const [timeWindowSeconds, setTimeWindowSeconds] = useState<number>(15);
  const maxPoints = Math.max(150, Math.round(timeWindowSeconds * 50)); // High resolution buffer scaling with time window

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

  // Peak tracking for real-time header badges
  const peakInspFlowRef = useRef<number>(55);
  const peakExpFlowRef = useRef<number>(45);

  // Sync buffer on new sample
  useEffect(() => {
    if (!currentSample || maneuverState.isFrozen) return;

    if (currentSample.flow > peakInspFlowRef.current) {
      peakInspFlowRef.current = Math.round(currentSample.flow);
    }
    if (currentSample.flow < -peakExpFlowRef.current) {
      peakExpFlowRef.current = Math.round(Math.abs(currentSample.flow));
    }

    if (bufferRef.current.length < maxPoints) {
      bufferRef.current.push(currentSample);
    } else {
      bufferRef.current[sweepIndexRef.current] = currentSample;
    }

    sweepIndexRef.current = (sweepIndexRef.current + 1) % maxPoints;
  }, [currentSample, maneuverState.isFrozen]);

  // ============================================================================
  // LAYER 1: STATIC BACKGROUND CANVAS (ICU Subgrid, Eixos, Limites, Badges)
  // Only redraws on resize, theme toggle, or scale adjustments!
  // ============================================================================
  const renderBackground = useCallback(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, Math.round(rect.width));
    const height = Math.max(200, Math.round(rect.height));
    const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));

    dimensionsRef.current = { width, height, dpr };

    // HiDPI Retina sharp pixel backing
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Canvas Master Background (Deep Dark Medical Glass)
    ctx.fillStyle = isLight ? '#f1f5f9' : '#05070b';
    ctx.fillRect(0, 0, width, height);

    // Layout: 3 equal track channels with clean separation
    const trackGap = 6;
    const totalGap = trackGap * 2;
    const trackHeight = (height - totalGap) / 3;

    const t1Top = 0;
    const t1Bottom = trackHeight;
    const t2Top = trackHeight + trackGap;
    const t2Bottom = trackHeight * 2 + trackGap;
    const t3Top = trackHeight * 2 + totalGap;
    const t3Bottom = height;

    const padLeft = 48; // Left gutter for high-precision Y axis scale
    const padRight = 16;
    const chartW = width - padLeft - padRight;

    // Helper: Draw Track Card with Medical Subgrid
    const drawTrackCard = (top: number, bottom: number) => {
      const h = bottom - top;
      ctx.save();

      // Rounded Card Background
      ctx.fillStyle = isLight ? '#ffffff' : '#090c14';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(2, top + 1, width - 4, h - 2, 8);
        ctx.fill();
      } else {
        ctx.fillRect(2, top + 1, width - 4, h - 2);
      }

      // Subtle track border
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(2, top + 1, width - 4, h - 2, 8);
        ctx.stroke();
      }

      // Vertical time grid lines scaled to timeWindowSeconds
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const vSteps = timeWindowSeconds <= 10 ? timeWindowSeconds : timeWindowSeconds <= 20 ? timeWindowSeconds / 2 : 10;
      for (let i = 1; i < vSteps; i++) {
        const x = padLeft + (i * chartW) / vSteps;
        ctx.beginPath();
        ctx.moveTo(x, top + 4);
        ctx.lineTo(x, bottom - 4);
        ctx.stroke();
      }

      // Subgrid tick marks (ICU Matrix style)
      ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
      for (let s = 0.5; s < vSteps; s += 1.0) {
        const x = padLeft + (s * chartW) / vSteps;
        for (let y = top + 12; y < bottom - 10; y += 12) {
          ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        }
      }

      ctx.restore();
    };

    // Draw the 3 Track Panels
    drawTrackCard(t1Top, t1Bottom);
    drawTrackCard(t2Top, t2Bottom);
    drawTrackCard(t3Top, t3Bottom);

    // ==========================================
    // 1. PRESSURE TRACK BASELINES & Y-AXIS
    // ==========================================
    const pZeroY = t1Bottom - 18;
    const pScale = (trackHeight - 44) / pressureMax;
    const pPeepY = pZeroY - peepSet * pScale;

    // Track 1 Y-axis graduation scale
    ctx.font = 'bold 9.5px monospace';
    ctx.fillStyle = isLight ? '#0f172a' : 'rgba(203, 213, 225, 0.7)';
    ctx.textAlign = 'right';

    const pTicks = pressureMax <= 40 ? [0, 10, 20, 30, pressureMax] : [0, 20, 40, 60, pressureMax];
    pTicks.forEach((val) => {
      const y = pZeroY - val * pScale;
      // Tick mark
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(padLeft - 4, y);
      ctx.lineTo(padLeft, y);
      ctx.stroke();
      ctx.fillText(`${val}`, padLeft - 6, y + 3);
    });

    // Zero dashed line
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, pZeroY);
    ctx.lineTo(width - padRight, pZeroY);
    ctx.stroke();

    // PEEP line (cyan glow)
    ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.6)' : 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, pPeepY);
    ctx.lineTo(width - padRight, pPeepY);
    ctx.stroke();

    // PEEP Tag Badge on right
    ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`PEEP ${peepSet}`, width - padRight - 4, pPeepY - 3);

    // ==========================================
    // 2. FLOW TRACK BASELINES & Y-AXIS
    // ==========================================
    const fZeroY = t2Top + (t2Bottom - t2Top) / 2;
    const fScale = (trackHeight / 2 - 20) / flowMax;

    // Track 2 Y-axis graduation scale
    const fTicks = [-flowMax, -Math.round(flowMax / 2), 0, Math.round(flowMax / 2), flowMax];
    fTicks.forEach((val) => {
      const y = fZeroY - val * fScale;
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(padLeft - 4, y);
      ctx.lineTo(padLeft, y);
      ctx.stroke();
      ctx.fillText(`${val > 0 ? '+' : ''}${val}`, padLeft - 6, y + 3);
    });

    // Zero Flow Center Axis (Clean solid/dashed baseline)
    ctx.strokeStyle = isLight ? 'rgba(5, 150, 105, 0.35)' : 'rgba(16, 185, 129, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, fZeroY);
    ctx.lineTo(width - padRight, fZeroY);
    ctx.stroke();

    // ==========================================
    // 3. VOLUME TRACK BASELINES & Y-AXIS
    // ==========================================
    const vZeroY = t3Bottom - 18;
    const vScale = (trackHeight - 44) / volumeMax;

    // Track 3 Y-axis graduation scale
    const vTicks = [0, Math.round(volumeMax / 3), Math.round((volumeMax * 2) / 3), volumeMax];
    vTicks.forEach((val) => {
      const y = vZeroY - val * vScale;
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(padLeft - 4, y);
      ctx.lineTo(padLeft, y);
      ctx.stroke();
      ctx.fillText(`${val}`, padLeft - 6, y + 3);
    });

    // Volume baseline
    ctx.strokeStyle = isLight ? 'rgba(217, 119, 6, 0.35)' : 'rgba(245, 158, 11, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, vZeroY);
    ctx.lineTo(width - padRight, vZeroY);
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash

    // Helper: Draw Track Header Badge on top left
    const drawBadge = (
      label: string,
      x: number,
      y: number,
      color: string,
      bgColor: string,
      borderColor: string
    ) => {
      ctx.save();
      const badgeW = 104;
      const badgeH = 20;

      ctx.fillStyle = isLight ? '#f8fafc' : bgColor;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, badgeW, badgeH, 6);
        ctx.fill();
        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.1)' : borderColor;
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
      ctx.arc(x + 9, y + badgeH / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label text
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = isLight ? '#0f172a' : '#f1f5f9';
      ctx.fillText(label, x + 18, y + 14);

      ctx.restore();
    };

    // Draw Channel Indicator Badges
    drawBadge(
      'Paw (cmH₂O)',
      padLeft + 6,
      t1Top + 6,
      isLight ? '#0284c7' : '#00e5ff',
      'rgba(0, 229, 255, 0.1)',
      'rgba(0, 229, 255, 0.3)'
    );
    drawBadge(
      'Fluxo (L/min)',
      padLeft + 6,
      t2Top + 6,
      isLight ? '#059669' : '#10b981',
      'rgba(16, 185, 129, 0.1)',
      'rgba(16, 185, 129, 0.3)'
    );
    drawBadge(
      'Volume (mL)',
      padLeft + 6,
      t3Top + 6,
      isLight ? '#d97706' : '#f59e0b',
      'rgba(245, 158, 11, 0.1)',
      'rgba(245, 158, 11, 0.3)'
    );

    ctx.restore();
  }, [isLight, pressureMax, flowMax, volumeMax, peepSet, timeWindowSeconds]);

  // ============================================================================
  // LAYER 2: DYNAMIC FOREGROUND CANVAS (Catmull-Rom Waves, Glow, Sweep & Live Stats)
  // Runs 60fps/120fps with zero overhead on static background!
  // ============================================================================
  const renderForeground = useCallback(() => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, dpr } = dimensionsRef.current;

    // Retina buffer alignment
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear transparent foreground buffer
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

    const padLeft = 48;
    const padRight = 16;
    const chartW = width - padLeft - padRight;

    const pZeroY = t1Bottom - 18;
    const pScale = (trackHeight - 44) / pressureMax;

    const fZeroY = t2Top + (t2Bottom - t2Top) / 2;
    const fScale = (trackHeight / 2 - 20) / flowMax;

    const vZeroY = t3Bottom - 18;
    const vScale = (trackHeight - 44) / volumeMax;

    const buffer = bufferRef.current;
    const sweepIdx = sweepIndexRef.current;
    const isFrozen = maneuverState.isFrozen;

    // ============================================================================
    // REAL-TIME DIGITAL TELEMETRY CHIPS (TOP RIGHT OF EACH TRACK)
    // ============================================================================
    const drawTrackTelemetry = (
      items: { label: string; value: string; color: string }[],
      topY: number
    ) => {
      ctx.save();
      ctx.textAlign = 'right';
      ctx.font = 'bold 9.5px monospace';
      let currentRight = width - padRight;

      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        const text = `${item.label} ${item.value}`;
        const metrics = ctx.measureText(text);
        const chipW = metrics.width + 12;
        const chipH = 18;
        const chipX = currentRight - chipW;
        const chipY = topY + 6;

        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(12, 16, 26, 0.85)';
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(chipX, chipY, chipW, chipH, 5);
          ctx.fill();
          ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.fillStyle = item.color;
        ctx.fillText(text, currentRight - 6, chipY + 13);
        currentRight -= chipW + 6;
      }
      ctx.restore();
    };

    // 1. Paw Track Telemetry
    drawTrackTelemetry(
      [
        {
          label: 'PICO:',
          value: `${monitored?.peakPressure.toFixed(1) ?? '--'}`,
          color: isLight ? '#0369a1' : '#00e5ff',
        },
        {
          label: 'PLAT:',
          value: `${monitored?.isPlateauMeasured ? monitored.plateauPressure.toFixed(1) : '--'}`,
          color: isLight ? '#0284c7' : '#38bdf8',
        },
        {
          label: 'ATUAL:',
          value: `${currentSample?.pressure.toFixed(1) ?? '--'}`,
          color: isLight ? '#0f172a' : '#f8fafc',
        },
      ],
      t1Top
    );

    // 2. Flow Track Telemetry
    drawTrackTelemetry(
      [
        {
          label: 'INSP:',
          value: `+${peakInspFlowRef.current}`,
          color: isLight ? '#047857' : '#10b981',
        },
        {
          label: 'EXP:',
          value: `-${peakExpFlowRef.current}`,
          color: isLight ? '#059669' : '#34d399',
        },
        {
          label: 'FLUXO:',
          value: `${currentSample ? (currentSample.flow > 0 ? '+' : '') + currentSample.flow.toFixed(0) : '--'} L/m`,
          color: isLight ? '#0f172a' : '#f8fafc',
        },
      ],
      t2Top
    );

    // 3. Volume Track Telemetry
    drawTrackTelemetry(
      [
        {
          label: 'VTI:',
          value: `${monitored?.vti ?? '--'}`,
          color: isLight ? '#b45309' : '#f59e0b',
        },
        {
          label: 'VTE:',
          value: `${monitored?.vte ?? '--'}`,
          color: isLight ? '#c2410c' : '#fbbf24',
        },
        {
          label: 'VOL:',
          value: `${currentSample?.volume ?? '--'} mL`,
          color: isLight ? '#0f172a' : '#f8fafc',
        },
      ],
      t3Top
    );

    // ============================================================================
    // CATMULL-ROM SPLINE SMOOTH CURVE RENDERER WITH DUAL-PASS GLOW & VOLUMETRIC FILL
    // ============================================================================
    const drawSmoothWaveformChannel = (
      getY: (sample: WaveformSample) => number,
      strokeColor: string,
      glowColor: string,
      fillType: 'paw' | 'flow' | 'volume'
    ) => {
      if (buffer.length < 2) return;

      const segments = isFrozen
        ? [[0, buffer.length]]
        : [
            [0, Math.max(0, sweepIdx - 1)],
            [Math.min(buffer.length, sweepIdx + 10), buffer.length],
          ];

      for (const [start, end] of segments) {
        if (end - start < 2) continue;

        const points: { x: number; y: number }[] = [];
        for (let i = start; i < end; i++) {
          if (i >= buffer.length) break;
          const s = buffer[i];
          const px = padLeft + (i / maxPoints) * chartW;
          const py = getY(s);
          points.push({ x: px, y: py });
        }

        if (points.length < 2) continue;

        // ----------------------------------------------------
        // 1. VOLUMETRIC AREA FILL
        // ----------------------------------------------------
        ctx.save();
        if (fillType === 'paw') {
          const pawGrad = ctx.createLinearGradient(0, t1Top + 8, 0, pZeroY);
          pawGrad.addColorStop(0, isLight ? 'rgba(2, 132, 199, 0.22)' : 'rgba(0, 229, 255, 0.22)');
          pawGrad.addColorStop(1, isLight ? 'rgba(2, 132, 199, 0.01)' : 'rgba(0, 229, 255, 0.01)');

          ctx.beginPath();
          ctx.moveTo(points[0].x, pZeroY);
          for (let i = 0; i < points.length; i++) {
            ctx.lineTo(points[i].x, Math.min(pZeroY, points[i].y));
          }
          ctx.lineTo(points[points.length - 1].x, pZeroY);
          ctx.closePath();
          ctx.fillStyle = pawGrad;
          ctx.fill();
        } else if (fillType === 'flow') {
          // Dual-Phase Flow Fill: Inspiratory (above zero) fills down, Expiratory (below zero) fills up!
          const posGrad = ctx.createLinearGradient(0, t2Top + 8, 0, fZeroY);
          posGrad.addColorStop(0, isLight ? 'rgba(5, 150, 105, 0.22)' : 'rgba(16, 185, 129, 0.24)');
          posGrad.addColorStop(1, isLight ? 'rgba(5, 150, 105, 0.01)' : 'rgba(16, 185, 129, 0.01)');

          ctx.beginPath();
          ctx.moveTo(points[0].x, fZeroY);
          for (let i = 0; i < points.length; i++) {
            ctx.lineTo(points[i].x, Math.min(fZeroY, points[i].y));
          }
          ctx.lineTo(points[points.length - 1].x, fZeroY);
          ctx.closePath();
          ctx.fillStyle = posGrad;
          ctx.fill();

          const negGrad = ctx.createLinearGradient(0, fZeroY, 0, t2Bottom - 8);
          negGrad.addColorStop(0, isLight ? 'rgba(5, 150, 105, 0.01)' : 'rgba(16, 185, 129, 0.01)');
          negGrad.addColorStop(1, isLight ? 'rgba(5, 150, 105, 0.20)' : 'rgba(16, 185, 129, 0.22)');

          ctx.beginPath();
          ctx.moveTo(points[0].x, fZeroY);
          for (let i = 0; i < points.length; i++) {
            ctx.lineTo(points[i].x, Math.max(fZeroY, points[i].y));
          }
          ctx.lineTo(points[points.length - 1].x, fZeroY);
          ctx.closePath();
          ctx.fillStyle = negGrad;
          ctx.fill();
        } else if (fillType === 'volume') {
          const volGrad = ctx.createLinearGradient(0, t3Top + 8, 0, vZeroY);
          volGrad.addColorStop(0, isLight ? 'rgba(217, 119, 6, 0.22)' : 'rgba(245, 158, 11, 0.22)');
          volGrad.addColorStop(1, isLight ? 'rgba(217, 119, 6, 0.01)' : 'rgba(245, 158, 11, 0.01)');

          ctx.beginPath();
          ctx.moveTo(points[0].x, vZeroY);
          for (let i = 0; i < points.length; i++) {
            ctx.lineTo(points[i].x, Math.min(vZeroY, points[i].y));
          }
          ctx.lineTo(points[points.length - 1].x, vZeroY);
          ctx.closePath();
          ctx.fillStyle = volGrad;
          ctx.fill();
        }
        ctx.restore();

        // ----------------------------------------------------
        // 2. PASS 1: SOFT RADIANT GLOW
        // ----------------------------------------------------
        if (!isLight) {
          ctx.save();
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 3.6;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 9;

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
          ctx.restore();
        }

        // ----------------------------------------------------
        // 3. PASS 2: CRISP VIBRANT CORE LINE
        // ----------------------------------------------------
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

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
        ctx.restore();
      }
    };

    // 1. Draw Paw Waveform (Cyan)
    drawSmoothWaveformChannel(
      (s) => Math.max(t1Top + 6, Math.min(t1Bottom - 6, pZeroY - s.pressure * pScale)),
      isLight ? '#0284c7' : '#00e5ff',
      'rgba(0, 229, 255, 0.65)',
      'paw'
    );

    // 2. Draw Flow Waveform (Emerald)
    drawSmoothWaveformChannel(
      (s) => Math.max(t2Top + 6, Math.min(t2Bottom - 6, fZeroY - s.flow * fScale)),
      isLight ? '#059669' : '#10b981',
      'rgba(16, 185, 129, 0.65)',
      'flow'
    );

    // 3. Draw Volume Waveform (Amber)
    drawSmoothWaveformChannel(
      (s) => Math.max(t3Top + 6, Math.min(t3Bottom - 6, vZeroY - s.volume * vScale)),
      isLight ? '#d97706' : '#f59e0b',
      'rgba(245, 158, 11, 0.65)',
      'volume'
    );

    // ============================================================================
    // SWEEP ERASE BAR WITH NEON SCANNER TIP
    // ============================================================================
    if (!isFrozen) {
      const sweepX = padLeft + (sweepIdx / maxPoints) * chartW;

      // Fading comet-tail erase zone
      const eraseW = 34;
      const grad = ctx.createLinearGradient(sweepX - eraseW, 0, sweepX + 4, 0);
      if (isLight) {
        grad.addColorStop(0, 'rgba(241, 245, 249, 0)');
        grad.addColorStop(0.7, 'rgba(241, 245, 249, 0.95)');
        grad.addColorStop(1, '#f1f5f9');
      } else {
        grad.addColorStop(0, 'rgba(5, 7, 11, 0)');
        grad.addColorStop(0.7, 'rgba(5, 7, 11, 0.95)');
        grad.addColorStop(1, '#05070b');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(Math.max(padLeft, sweepX - eraseW), 0, eraseW + 4, height);

      // Neon vertical laser sweep line
      ctx.save();
      ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.9)' : 'rgba(0, 229, 255, 0.95)';
      if (!isLight) {
        ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
        ctx.shadowBlur = 10;
      }
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sweepX, 3);
      ctx.lineTo(sweepX, height - 3);
      ctx.stroke();

      // Glowing circular scanner tips
      ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
      ctx.beginPath();
      ctx.arc(sweepX, 8, 3, 0, Math.PI * 2);
      ctx.arc(sweepX, height - 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ============================================================================
    // MANEUVER HOLD BANNERS
    // ============================================================================
    if (maneuverState.inspiratoryHoldActive) {
      ctx.save();
      ctx.fillStyle = isLight ? 'rgba(2, 132, 199, 0.15)' : 'rgba(0, 229, 255, 0.18)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(width / 2 - 180, 8, 360, 28, 14);
        ctx.fill();
        ctx.strokeStyle = isLight ? '#0284c7' : '#00e5ff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏸ PAUSA INSPIRATÓRIA EM CURSO (Pplat & Complacência)', width / 2, 26);
      ctx.restore();
    } else if (maneuverState.expiratoryHoldActive) {
      ctx.save();
      ctx.fillStyle = isLight ? 'rgba(217, 119, 6, 0.15)' : 'rgba(251, 191, 36, 0.2)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(width / 2 - 180, 8, 360, 28, 14);
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

    // ============================================================================
    // FREEZE MODE INSPECTION HUD CALIPER
    // ============================================================================
    if (isFrozen) {
      ctx.save();
      ctx.fillStyle = isLight ? 'rgba(225, 29, 72, 0.12)' : 'rgba(239, 68, 68, 0.2)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(width / 2 - 190, 8, 380, 26, 13);
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.fillStyle = isLight ? '#e11d48' : '#f87171';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❄ CURVAS CONGELADAS (Mova o cursor para inspecionar)', width / 2, 25);
      ctx.restore();

      if (hoverData && hoverData.sample) {
        const hX = hoverData.x;
        const s = hoverData.sample;

        // Crosshair vertical laser guide
        ctx.save();
        ctx.strokeStyle = isLight ? '#475569' : '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(hX, 4);
        ctx.lineTo(hX, height - 4);
        ctx.stroke();
        ctx.restore();

        // Glowing dots on each curve intersection
        const yP = Math.max(t1Top + 6, Math.min(t1Bottom - 6, pZeroY - s.pressure * pScale));
        const yF = Math.max(t2Top + 6, Math.min(t2Bottom - 6, fZeroY - s.flow * fScale));
        const yV = Math.max(t3Top + 6, Math.min(t3Bottom - 6, vZeroY - s.volume * vScale));

        const drawIntersectPoint = (y: number, color: string) => {
          ctx.save();
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(hX, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };

        drawIntersectPoint(yP, isLight ? '#0284c7' : '#00e5ff');
        drawIntersectPoint(yF, isLight ? '#059669' : '#10b981');
        drawIntersectPoint(yV, isLight ? '#d97706' : '#f59e0b');

        // Floating HUD Card
        const tipW = 180;
        const tipH = 96;
        const tipX = Math.min(width - tipW - 20, Math.max(padLeft + 10, hX + 16));
        const tipY = 44;

        ctx.save();
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(12, 16, 26, 0.95)';
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(tipX, tipY, tipW, tipH, 10);
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

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
        ctx.textAlign = 'left';
        ctx.fillText(`Tempo: ${s.time.toFixed(2)} s`, tipX + 12, tipY + 20);

        ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
        ctx.fillText(`Paw:   ${s.pressure.toFixed(1)} cmH₂O`, tipX + 12, tipY + 40);

        ctx.fillStyle = isLight ? '#059669' : '#10b981';
        ctx.fillText(`Fluxo: ${s.flow.toFixed(1)} L/min`, tipX + 12, tipY + 60);

        ctx.fillStyle = isLight ? '#d97706' : '#f59e0b';
        ctx.fillText(`Vol:   ${s.volume} mL`, tipX + 12, tipY + 80);
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
    currentSample,
    monitored,
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
    const padLeft = 48;
    const chartW = rect.width - padLeft - 16;
    if (x < padLeft || x > rect.width - 16) return;

    const buffer = bufferRef.current;
    if (buffer.length === 0) return;

    const ratio = (x - padLeft) / chartW;
    const idx = Math.floor(ratio * buffer.length);
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
        className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b select-none ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d0e17]/90 border-zinc-800/80'
        }`}
      >
        {/* Left: Section Title & View Switcher */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${
              isLight
                ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-display font-bold tracking-wider text-[11px] uppercase">
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
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {/* Time Window Scale Pill (e.g. 6s, 10s, 15s, 30s, 60s) */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
              isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-[#141729] border-indigo-500/40 text-indigo-300'
            }`}
          >
            <Clock className="w-3 h-3 text-indigo-500" />
            <span className="text-[9.5px] font-mono font-bold">
              Tempo:
            </span>
            <select
              value={timeWindowSeconds}
              onChange={(e) => {
                const newSec = Number(e.target.value);
                setTimeWindowSeconds(newSec);
                bufferRef.current = [];
                sweepIndexRef.current = 0;
              }}
              className={`bg-transparent text-[10px] font-mono font-bold focus:outline-none cursor-pointer ${
                isLight ? 'text-indigo-950' : 'text-indigo-200'
              }`}
            >
              <option value={6} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                6s
              </option>
              <option value={10} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                10s
              </option>
              <option value={15} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                15s (Padrão)
              </option>
              <option value={30} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                30s (Ciclos)
              </option>
              <option value={60} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                60s (1 min)
              </option>
            </select>
          </div>

          {/* Pressure Max Pill */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#12141e] border-zinc-700/60'
            }`}
          >
            <span
              className={`text-[9.5px] font-mono font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}
            >
              P.Max:
            </span>
            <select
              value={pressureMax}
              onChange={(e) => setPressureMax(Number(e.target.value))}
              className={`bg-transparent text-[10px] font-mono focus:outline-none cursor-pointer ${
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
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#12141e] border-zinc-700/60'
            }`}
          >
            <span
              className={`text-[9.5px] font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}
            >
              F.Max:
            </span>
            <select
              value={flowMax}
              onChange={(e) => setFlowMax(Number(e.target.value))}
              className={`bg-transparent text-[10px] font-mono focus:outline-none cursor-pointer ${
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
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#12141e] border-zinc-700/60'
            }`}
          >
            <span
              className={`text-[9.5px] font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}
            >
              V.Max:
            </span>
            <select
              value={volumeMax}
              onChange={(e) => setVolumeMax(Number(e.target.value))}
              className={`bg-transparent text-[10px] font-mono focus:outline-none cursor-pointer ${
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

          {/* Freeze Button */}
          <button
            id="waveform-freeze-btn"
            onClick={onToggleFreeze}
            className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full font-bold font-mono text-[10px] transition-all cursor-pointer shadow-md ${
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
      <div ref={canvasAreaRef} className="relative flex-1 w-full h-full min-h-0 p-1">
        {/* Layer 1: Static Background Canvas (Grids, Lines, Scale Labels) */}
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] block rounded-xl pointer-events-none"
        />

        {/* Layer 2: Dynamic Real-time Spline Waves, Glowing Sweep Line & Badges */}
        <canvas
          ref={fgCanvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] block rounded-xl cursor-crosshair z-10"
        />
      </div>
    </div>
  );
};
