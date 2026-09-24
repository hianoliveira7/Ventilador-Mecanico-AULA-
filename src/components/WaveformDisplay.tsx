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

  // Dual Visible Canvas References: Static Background + Visible Front-Buffer
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Offscreen Canvas Back-Buffer for High-Performance Double Buffering (Zero Tearing / Zero Stutter)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // High resolution buffer of historical samples
  const bufferRef = useRef<WaveformSample[]>([]);
  const sweepIndexRef = useRef<number>(0);

  // Time window (sweep duration in seconds)
  const [timeWindowSeconds, setTimeWindowSeconds] = useState<number>(15);
  const maxPoints = Math.max(150, Math.round(timeWindowSeconds * 50));

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

  // Active adaptive scale tracking with auto-headroom to prevent cutting off curves
  const lastScalesRef = useRef<{ effPMax: number; effFMax: number; effVMax: number }>({
    effPMax: 40,
    effFMax: 80,
    effVMax: 800,
  });

  // Dynamic scale calculation with auto-headroom to ensure waveforms NEVER clip or cut off
  const getDynamicScales = useCallback(() => {
    const buf = bufferRef.current;
    const recent = buf.slice(-100);

    let maxP = Math.max(currentSample?.pressure ?? 0, monitored?.peakPressure ?? 0, 20);
    let maxF = Math.max(Math.abs(currentSample?.flow ?? 0), 40);
    let maxV = Math.max(currentSample?.volume ?? 0, monitored?.vti ?? 0, monitored?.vte ?? 0, 300);

    for (let i = 0; i < recent.length; i++) {
      const s = recent[i];
      if (s) {
        if (s.pressure > maxP) maxP = s.pressure;
        const absF = Math.abs(s.flow);
        if (absF > maxF) maxF = absF;
        if (s.volume > maxV) maxV = s.volume;
      }
    }

    // Eff P Max: minimum pressureMax setting, or rounded up with 22% headroom
    const baseP = pressureMax > 0 ? pressureMax : 40;
    const effPMax = Math.max(baseP, Math.ceil((maxP * 1.22) / 10) * 10);

    // Eff Flow Max: minimum flowMax setting, or rounded up with 22% headroom
    const baseF = flowMax > 0 ? flowMax : 80;
    const effFMax = Math.max(baseF, Math.ceil((maxF * 1.22) / 20) * 20);

    // Eff Volume Max: minimum volumeMax setting, or rounded up with 22% headroom
    const baseV = volumeMax > 0 ? volumeMax : 800;
    const effVMax = Math.max(baseV, Math.ceil((maxV * 1.22) / 100) * 100);

    return { effPMax, effFMax, effVMax };
  }, [currentSample, monitored, pressureMax, flowMax, volumeMax]);

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
  }, [currentSample, maneuverState.isFrozen, maxPoints]);

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

    // Initialize or resize offscreen back-buffer
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offscreen = offscreenCanvasRef.current;
    if (offscreen.width !== Math.round(width * dpr) || offscreen.height !== Math.round(height * dpr)) {
      offscreen.width = Math.round(width * dpr);
      offscreen.height = Math.round(height * dpr);
    }

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

    // ============================================================================
    // VIEW ROUTING: WAVEFORMS vs LOOPS vs SPLIT
    // ============================================================================
    if (viewMode === 'loops') {
      const panelGap = 8;
      const panelW = (width - panelGap) / 2;
      const p1Left = 0;
      const p2Left = panelW + panelGap;

      // Panel Backgrounds
      ctx.fillStyle = isLight ? '#ffffff' : '#090c14';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(p1Left + 2, 2, panelW - 4, height - 4, 8);
        ctx.fill();
        ctx.roundRect(p2Left + 2, 2, panelW - 4, height - 4, 8);
        ctx.fill();
      } else {
        ctx.fillRect(p1Left + 2, 2, panelW - 4, height - 4);
        ctx.fillRect(p2Left + 2, 2, panelW - 4, height - 4);
      }

      // Draw Grid & Axes for P-V Loop (Left)
      const lpPadL = p1Left + 42;
      const lpPadR = p1Left + panelW - 14;
      const lpPadB = height - 26;
      const lpPadT = 32;
      const lpW = lpPadR - lpPadL;
      const lpH = lpPadB - lpPadT;

      ctx.strokeStyle = isLight ? '#e2e8f0' : '#141a29';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const x = lpPadL + (i / 4) * lpW;
        ctx.beginPath();
        ctx.moveTo(x, lpPadT);
        ctx.lineTo(x, lpPadB);
        ctx.stroke();

        const y = lpPadT + (i / 4) * lpH;
        ctx.beginPath();
        ctx.moveTo(lpPadL, y);
        ctx.lineTo(lpPadR, y);
        ctx.stroke();
      }

      ctx.strokeStyle = isLight ? '#94a3b8' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lpPadL, lpPadT);
      ctx.lineTo(lpPadL, lpPadB);
      ctx.lineTo(lpPadR, lpPadB);
      ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = isLight ? '#64748b' : '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText('0', lpPadL - 4, lpPadB + 3);
      ctx.fillText(`${volumeMax / 2}`, lpPadL - 4, lpPadT + lpH / 2 + 3);
      ctx.fillText(`${volumeMax}`, lpPadL - 4, lpPadT + 3);

      ctx.textAlign = 'center';
      ctx.fillText('0', lpPadL, lpPadB + 14);
      ctx.fillText(`${pressureMax / 2}`, lpPadL + lpW / 2, lpPadB + 14);
      ctx.fillText(`${pressureMax}`, lpPadR, lpPadB + 14);

      // Draw Grid & Axes for F-V Loop (Right)
      const lfPadL = p2Left + 42;
      const lfPadR = p2Left + panelW - 14;
      const lfPadB = height - 26;
      const lfPadT = 32;
      const lfW = lfPadR - lfPadL;
      const lfH = lfPadB - lfPadT;
      const lfZeroY = lfPadT + lfH / 2;

      ctx.strokeStyle = isLight ? '#e2e8f0' : '#141a29';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const x = lfPadL + (i / 4) * lfW;
        ctx.beginPath();
        ctx.moveTo(x, lfPadT);
        ctx.lineTo(x, lfPadB);
        ctx.stroke();

        const y = lfPadT + (i / 4) * lfH;
        ctx.beginPath();
        ctx.moveTo(lfPadL, y);
        ctx.lineTo(lfPadR, y);
        ctx.stroke();
      }

      ctx.strokeStyle = isLight ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(lfPadL, lfZeroY);
      ctx.lineTo(lfPadR, lfZeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = isLight ? '#94a3b8' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lfPadL, lfPadT);
      ctx.lineTo(lfPadL, lfPadB);
      ctx.moveTo(lfPadL, lfZeroY);
      ctx.lineTo(lfPadR, lfZeroY);
      ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = isLight ? '#64748b' : '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(`+${flowMax}`, lfPadL - 4, lfPadT + 3);
      ctx.fillText('0', lfPadL - 4, lfZeroY + 3);
      ctx.fillText(`-${flowMax}`, lfPadL - 4, lfPadB + 3);

      ctx.textAlign = 'center';
      ctx.fillText('0', lfPadL, lfPadB + 14);
      ctx.fillText(`${volumeMax / 2}`, lfPadL + lfW / 2, lfPadB + 14);
      ctx.fillText(`${volumeMax}`, lfPadR, lfPadB + 14);

      // Headers
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
      ctx.textAlign = 'left';
      ctx.fillText('ALÇA PRESSÃO × VOLUME (P-V)', p1Left + 14, 22);

      ctx.fillStyle = isLight ? '#059669' : '#10b981';
      ctx.fillText('ALÇA FLUXO × VOLUME (F-V)', p2Left + 14, 22);

      ctx.restore();
      return;
    }

    // Default Waveform Tracks Layout
    const isSplit = viewMode === 'split';
    const numTracks = isSplit ? 2 : 3;
    const trackGap = 6;
    const totalGap = trackGap * (numTracks - 1);
    const availableHeight = height;
    const trackHeight = (availableHeight - totalGap) / numTracks;

    const t1Top = 0;
    const t1Bottom = trackHeight;
    const t2Top = trackHeight + trackGap;
    const t2Bottom = isSplit ? height : trackHeight * 2 + trackGap;
    const t3Top = isSplit ? height : trackHeight * 2 + totalGap;
    const t3Bottom = height;

    const padLeft = 52;
    const padRight = 16;
    const chartW = width - padLeft - padRight;

    // Use current adaptive scales with auto-headroom
    const scales = getDynamicScales();
    const effPMax = scales.effPMax;
    const effFMax = scales.effFMax;
    const effVMax = scales.effVMax;
    lastScalesRef.current = scales;

    const topSafety = 24;
    const bottomSafety = 12;
    const usableH = Math.max(30, trackHeight - topSafety - bottomSafety);

    const pZeroY = t1Bottom - bottomSafety;
    const fZeroY = t2Top + trackHeight / 2;
    const vZeroY = t3Bottom - bottomSafety;

    // Track Cards
    const drawTrackCard = (top: number, bottom: number) => {
      ctx.fillStyle = isLight ? '#ffffff' : '#090c14';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(2, top + 1, width - 4, bottom - top - 2, 8);
        ctx.fill();
      } else {
        ctx.fillRect(2, top + 1, width - 4, bottom - top - 2);
      }
    };

    drawTrackCard(t1Top, t1Bottom);
    drawTrackCard(t2Top, t2Bottom);
    if (!isSplit) {
      drawTrackCard(t3Top, t3Bottom);
    }

    // Grid Lines
    const drawGridLines = (top: number, bottom: number, zeroY: number, hasZeroLine: boolean = true) => {
      ctx.save();
      const numHoriz = 4;
      const rowStep = usableH / numHoriz;
      ctx.strokeStyle = isLight ? '#f1f5f9' : '#101522';
      ctx.lineWidth = 1;

      for (let r = 1; r <= numHoriz; r++) {
        const y = top + topSafety + (numHoriz - r) * rowStep;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();
      }

      const numVert = 10;
      const colStep = chartW / numVert;
      for (let c = 1; c < numVert; c++) {
        const x = padLeft + c * colStep;
        ctx.beginPath();
        ctx.moveTo(x, top + 4);
        ctx.lineTo(x, bottom - 4);
        ctx.stroke();
      }

      if (hasZeroLine) {
        ctx.strokeStyle = isLight ? 'rgba(100, 116, 139, 0.4)' : 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(padLeft, zeroY);
        ctx.lineTo(width - padRight, zeroY);
        ctx.stroke();
      }

      ctx.restore();
    };

    drawGridLines(t1Top, t1Bottom, pZeroY, true);
    drawGridLines(t2Top, t2Bottom, fZeroY, true);

    if (!isSplit) {
      drawGridLines(t3Top, t3Bottom, vZeroY, true);
    }

    // Y Axis Numerical Scale Labels
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = isLight ? '#64748b' : '#64748b';
    ctx.textAlign = 'right';

    ctx.fillText(`${effPMax}`, padLeft - 6, t1Top + topSafety + 5);
    ctx.fillText(`${Math.round(effPMax / 2)}`, padLeft - 6, t1Top + topSafety + usableH / 2 + 3);
    ctx.fillText('0', padLeft - 6, pZeroY + 3);

    ctx.fillText(`+${effFMax}`, padLeft - 6, t2Top + 18);
    ctx.fillText('0', padLeft - 6, fZeroY + 3);
    ctx.fillText(`-${effFMax}`, padLeft - 6, t2Bottom - 10);

    if (!isSplit) {
      ctx.fillText(`${effVMax}`, padLeft - 6, t3Top + topSafety + 5);
      ctx.fillText(`${Math.round(effVMax / 2)}`, padLeft - 6, t3Top + topSafety + usableH / 2 + 3);
      ctx.fillText('0', padLeft - 6, vZeroY + 3);
    }

    // Badges
    const drawBadge = (
      text: string,
      x: number,
      y: number,
      color: string,
      bgColor: string,
      borderColor: string
    ) => {
      ctx.save();
      ctx.font = 'bold 9.5px system-ui, sans-serif';
      const textMetrics = ctx.measureText(text);
      const bgW = textMetrics.width + 12;
      const bgH = 18;

      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;

      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, bgW, bgH, 4);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(x, y, bgW, bgH);
        ctx.strokeRect(x, y, bgW, bgH);
      }

      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(text, x + 6, y + 12.5);
      ctx.restore();
    };

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
    if (!isSplit) {
      drawBadge(
        'Volume (mL)',
        padLeft + 6,
        t3Top + 6,
        isLight ? '#d97706' : '#f59e0b',
        'rgba(245, 158, 11, 0.1)',
        'rgba(245, 158, 11, 0.3)'
      );
    }

    ctx.restore();
  }, [isLight, pressureMax, flowMax, volumeMax, peepSet, timeWindowSeconds, viewMode]);

  // ============================================================================
  // LAYER 2: DYNAMIC FOREGROUND CANVAS WITH TRUE DOUBLE BUFFERING
  // Renders to memory back-buffer and atomically blits to front canvas (Zero Stutter)
  // ============================================================================
  const renderForeground = useCallback(() => {
    const frontCanvas = fgCanvasRef.current;
    if (!frontCanvas) return;
    const frontCtx = frontCanvas.getContext('2d');
    if (!frontCtx) return;

    const { width, height, dpr } = dimensionsRef.current;

    // Ensure offscreen back-buffer exists and matches dimensions
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const backCanvas = offscreenCanvasRef.current;

    if (backCanvas.width !== Math.round(width * dpr) || backCanvas.height !== Math.round(height * dpr)) {
      backCanvas.width = Math.round(width * dpr);
      backCanvas.height = Math.round(height * dpr);
    }
    if (frontCanvas.width !== Math.round(width * dpr) || frontCanvas.height !== Math.round(height * dpr)) {
      frontCanvas.width = Math.round(width * dpr);
      frontCanvas.height = Math.round(height * dpr);
    }

    const backCtx = backCanvas.getContext('2d');
    if (!backCtx) return;

    // Prepare back-buffer for high-DPI rendering
    backCtx.save();
    backCtx.scale(dpr, dpr);
    backCtx.imageSmoothingEnabled = true;
    backCtx.imageSmoothingQuality = 'high';

    // Clear transparent offscreen back-buffer
    backCtx.clearRect(0, 0, width, height);

    const buffer = bufferRef.current;
    const sweepIdx = sweepIndexRef.current;
    const isFrozen = maneuverState.isFrozen;

    // ============================================================================
    // VIEW ROUTING: LOOPS VIEW vs WAVEFORMS vs SPLIT
    // ============================================================================
    if (viewMode === 'loops') {
      const panelGap = 8;
      const panelW = (width - panelGap) / 2;
      const p1Left = 0;
      const p2Left = panelW + panelGap;

      const lpPadL = p1Left + 42;
      const lpPadR = p1Left + panelW - 14;
      const lpPadB = height - 26;
      const lpPadT = 32;
      const lpW = lpPadR - lpPadL;
      const lpH = lpPadB - lpPadT;

      const lfPadL = p2Left + 42;
      const lfPadR = p2Left + panelW - 14;
      const lfPadB = height - 26;
      const lfPadT = 32;
      const lfW = lfPadR - lfPadL;
      const lfH = lfPadB - lfPadT;
      const lfZeroY = lfPadT + lfH / 2;

      const validSamples = buffer.filter(Boolean);
      const loopCount = Math.min(validSamples.length, 160);
      const recentSamples = validSamples.slice(-loopCount);

      if (recentSamples.length > 5) {
        // --- DRAW P-V LOOP ---
        const pvPoints = recentSamples.map((s) => ({
          x: Math.max(lpPadL, Math.min(lpPadR, lpPadL + (s.pressure / pressureMax) * lpW)),
          y: Math.max(lpPadT, Math.min(lpPadB, lpPadB - (s.volume / volumeMax) * lpH)),
        }));

        backCtx.save();
        backCtx.beginPath();
        backCtx.moveTo(pvPoints[0].x, pvPoints[0].y);
        for (let i = 1; i < pvPoints.length; i++) {
          backCtx.lineTo(pvPoints[i].x, pvPoints[i].y);
        }
        backCtx.closePath();
        backCtx.fillStyle = isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(0, 229, 255, 0.15)';
        backCtx.fill();

        backCtx.strokeStyle = isLight ? '#0284c7' : '#00e5ff';
        if (!isLight) {
          backCtx.shadowColor = 'rgba(0, 229, 255, 0.8)';
          backCtx.shadowBlur = 8;
        }
        backCtx.lineWidth = 2.4;
        backCtx.stroke();
        backCtx.shadowBlur = 0;

        const lastPv = pvPoints[pvPoints.length - 1];
        backCtx.fillStyle = '#ffffff';
        backCtx.beginPath();
        backCtx.arc(lastPv.x, lastPv.y, 4, 0, Math.PI * 2);
        backCtx.fill();

        if (monitored?.plateauPressure && monitored?.tidalVolume) {
          const peepX = lpPadL + (peepSet / pressureMax) * lpW;
          const platX = lpPadL + (monitored.plateauPressure / pressureMax) * lpW;
          const vtY = lpPadB - (monitored.tidalVolume / volumeMax) * lpH;
          backCtx.strokeStyle = isLight ? 'rgba(217, 119, 6, 0.7)' : 'rgba(251, 191, 36, 0.6)';
          backCtx.lineWidth = 1.5;
          backCtx.setLineDash([4, 4]);
          backCtx.beginPath();
          backCtx.moveTo(peepX, lpPadB);
          backCtx.lineTo(platX, vtY);
          backCtx.stroke();
          backCtx.setLineDash([]);
        }
        backCtx.restore();

        // --- DRAW F-V LOOP ---
        const fvPoints = recentSamples.map((s) => ({
          x: Math.max(lfPadL, Math.min(lfPadR, lfPadL + (s.volume / volumeMax) * lfW)),
          y: Math.max(lfPadT, Math.min(lfPadB, lfZeroY - (s.flow / flowMax) * (lfH / 2))),
        }));

        backCtx.save();
        backCtx.beginPath();
        backCtx.moveTo(fvPoints[0].x, fvPoints[0].y);
        for (let i = 1; i < fvPoints.length; i++) {
          backCtx.lineTo(fvPoints[i].x, fvPoints[i].y);
        }
        backCtx.closePath();
        backCtx.fillStyle = isLight ? 'rgba(5, 150, 105, 0.12)' : 'rgba(16, 185, 129, 0.15)';
        backCtx.fill();

        backCtx.strokeStyle = isLight ? '#059669' : '#10b981';
        if (!isLight) {
          backCtx.shadowColor = 'rgba(16, 185, 129, 0.8)';
          backCtx.shadowBlur = 8;
        }
        backCtx.lineWidth = 2.4;
        backCtx.stroke();
        backCtx.shadowBlur = 0;

        const lastFv = fvPoints[fvPoints.length - 1];
        backCtx.fillStyle = '#ffffff';
        backCtx.beginPath();
        backCtx.arc(lastFv.x, lastFv.y, 4, 0, Math.PI * 2);
        backCtx.fill();
        backCtx.restore();
      }

      // Telemetry chips on loops
      backCtx.save();
      backCtx.font = 'bold 9.5px monospace';
      backCtx.fillStyle = isLight ? '#0369a1' : '#00e5ff';
      backCtx.textAlign = 'right';
      backCtx.fillText(
        `C.Stat: ${monitored?.staticCompliance ? monitored.staticCompliance.toFixed(1) : '--'} mL/cmH₂O`,
        p1Left + panelW - 14,
        22
      );
      backCtx.fillStyle = isLight ? '#047857' : '#10b981';
      backCtx.fillText(
        `Raw: ${monitored?.airwayResistance ? monitored.airwayResistance.toFixed(1) : '--'} cmH₂O/L/s`,
        p2Left + panelW - 14,
        22
      );
      backCtx.restore();

      backCtx.restore();

      // ATOMIC BLIT: Transfer rendered back-buffer to front-buffer canvas
      frontCtx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
      frontCtx.drawImage(backCanvas, 0, 0);
      return;
    }

    const isSplit = viewMode === 'split';
    const numTracks = isSplit ? 2 : 3;
    const trackGap = 6;
    const totalGap = trackGap * (numTracks - 1);
    const availableHeight = height;
    const trackHeight = (availableHeight - totalGap) / numTracks;

    const t1Top = 0;
    const t1Bottom = trackHeight;
    const t2Top = trackHeight + trackGap;
    const t2Bottom = isSplit ? height : trackHeight * 2 + trackGap;
    const t3Top = isSplit ? height : trackHeight * 2 + totalGap;
    const t3Bottom = height;

    // Check if dynamic adaptive scales expanded, and re-render background if changed
    const scales = getDynamicScales();
    if (
      scales.effPMax !== lastScalesRef.current.effPMax ||
      scales.effFMax !== lastScalesRef.current.effFMax ||
      scales.effVMax !== lastScalesRef.current.effVMax
    ) {
      lastScalesRef.current = scales;
      renderBackground();
    }
    const { effPMax, effFMax, effVMax } = lastScalesRef.current;

    const padLeft = 52;
    const padRight = 16;
    const chartW = width - padLeft - padRight;

    const topSafety = 24;
    const bottomSafety = 12;
    const usableH = Math.max(30, trackHeight - topSafety - bottomSafety);

    const pZeroY = t1Bottom - bottomSafety;
    const pScale = usableH / effPMax;

    const fZeroY = t2Top + trackHeight / 2;
    const usableFHalf = Math.max(20, trackHeight / 2 - 18);
    const fScale = usableFHalf / effFMax;

    const vZeroY = t3Bottom - bottomSafety;
    const vScale = usableH / effVMax;

    // Real-Time Telemetry Badges in each track
    const drawTrackTelemetry = (
      items: { label: string; value: string; color: string }[],
      topY: number
    ) => {
      backCtx.save();
      backCtx.font = 'bold 9px monospace';
      let currentX = width - padRight - 8;

      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        const valWidth = backCtx.measureText(item.value).width;
        const lblWidth = backCtx.measureText(item.label + ' ').width;

        backCtx.textAlign = 'right';
        backCtx.fillStyle = item.color;
        backCtx.fillText(item.value, currentX, topY + 16);

        backCtx.fillStyle = isLight ? '#64748b' : '#64748b';
        backCtx.fillText(item.label, currentX - valWidth - 2, topY + 16);

        currentX -= valWidth + lblWidth + 14;
      }
      backCtx.restore();
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
    if (!isSplit) {
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
    }

    // Catmull-Rom Smooth Waveform Curve Renderer
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
            [Math.min(buffer.length, sweepIdx + 8), buffer.length],
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

        // Volumetric Area Fill
        backCtx.save();
        if (fillType === 'paw') {
          const pawGrad = backCtx.createLinearGradient(0, t1Top + 8, 0, pZeroY);
          pawGrad.addColorStop(0, isLight ? 'rgba(2, 132, 199, 0.22)' : 'rgba(0, 229, 255, 0.22)');
          pawGrad.addColorStop(1, isLight ? 'rgba(2, 132, 199, 0.01)' : 'rgba(0, 229, 255, 0.01)');

          backCtx.beginPath();
          backCtx.moveTo(points[0].x, pZeroY);
          for (let i = 0; i < points.length; i++) {
            backCtx.lineTo(points[i].x, Math.min(pZeroY, points[i].y));
          }
          backCtx.lineTo(points[points.length - 1].x, pZeroY);
          backCtx.closePath();
          backCtx.fillStyle = pawGrad;
          backCtx.fill();
        } else if (fillType === 'flow') {
          const posGrad = backCtx.createLinearGradient(0, t2Top + 8, 0, fZeroY);
          posGrad.addColorStop(0, isLight ? 'rgba(5, 150, 105, 0.22)' : 'rgba(16, 185, 129, 0.24)');
          posGrad.addColorStop(1, isLight ? 'rgba(5, 150, 105, 0.01)' : 'rgba(16, 185, 129, 0.01)');

          backCtx.beginPath();
          backCtx.moveTo(points[0].x, fZeroY);
          for (let i = 0; i < points.length; i++) {
            backCtx.lineTo(points[i].x, Math.min(fZeroY, points[i].y));
          }
          backCtx.lineTo(points[points.length - 1].x, fZeroY);
          backCtx.closePath();
          backCtx.fillStyle = posGrad;
          backCtx.fill();

          const negGrad = backCtx.createLinearGradient(0, fZeroY, 0, t2Bottom - 8);
          negGrad.addColorStop(0, isLight ? 'rgba(5, 150, 105, 0.01)' : 'rgba(16, 185, 129, 0.01)');
          negGrad.addColorStop(1, isLight ? 'rgba(5, 150, 105, 0.20)' : 'rgba(16, 185, 129, 0.22)');

          backCtx.beginPath();
          backCtx.moveTo(points[0].x, fZeroY);
          for (let i = 0; i < points.length; i++) {
            backCtx.lineTo(points[i].x, Math.max(fZeroY, points[i].y));
          }
          backCtx.lineTo(points[points.length - 1].x, fZeroY);
          backCtx.closePath();
          backCtx.fillStyle = negGrad;
          backCtx.fill();
        } else if (fillType === 'volume') {
          const volGrad = backCtx.createLinearGradient(0, t3Top + 8, 0, vZeroY);
          volGrad.addColorStop(0, isLight ? 'rgba(217, 119, 6, 0.22)' : 'rgba(245, 158, 11, 0.22)');
          volGrad.addColorStop(1, isLight ? 'rgba(217, 119, 6, 0.01)' : 'rgba(245, 158, 11, 0.01)');

          backCtx.beginPath();
          backCtx.moveTo(points[0].x, vZeroY);
          for (let i = 0; i < points.length; i++) {
            backCtx.lineTo(points[i].x, Math.min(vZeroY, points[i].y));
          }
          backCtx.lineTo(points[points.length - 1].x, vZeroY);
          backCtx.closePath();
          backCtx.fillStyle = volGrad;
          backCtx.fill();
        }
        backCtx.restore();

        // Pass 1: Soft Glow
        if (!isLight) {
          backCtx.save();
          backCtx.strokeStyle = glowColor;
          backCtx.lineWidth = 3.6;
          backCtx.lineCap = 'round';
          backCtx.lineJoin = 'round';
          backCtx.shadowColor = glowColor;
          backCtx.shadowBlur = 9;

          backCtx.beginPath();
          backCtx.moveTo(points[0].x, points[0].y);
          for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const midX = (p0.x + p1.x) / 2;
            const midY = (p0.y + p1.y) / 2;
            backCtx.quadraticCurveTo(p0.x, p0.y, midX, midY);
          }
          backCtx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
          backCtx.stroke();
          backCtx.restore();
        }

        // Pass 2: Crisp Core Line
        backCtx.save();
        backCtx.strokeStyle = strokeColor;
        backCtx.lineWidth = 2.2;
        backCtx.lineCap = 'round';
        backCtx.lineJoin = 'round';

        backCtx.beginPath();
        backCtx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[i];
          const p1 = points[i + 1];
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;
          backCtx.quadraticCurveTo(p0.x, p0.y, midX, midY);
        }
        backCtx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        backCtx.stroke();
        backCtx.restore();
      }
    };

    // 1. Draw Paw Waveform (Cyan) with track boundary clipping
    backCtx.save();
    backCtx.beginPath();
    backCtx.rect(padLeft, t1Top + 2, chartW, (t1Bottom - t1Top) - 4);
    backCtx.clip();
    drawSmoothWaveformChannel(
      (s) => pZeroY - s.pressure * pScale,
      isLight ? '#0284c7' : '#00e5ff',
      'rgba(0, 229, 255, 0.65)',
      'paw'
    );
    backCtx.restore();

    // 2. Draw Flow Waveform (Emerald) with track boundary clipping
    backCtx.save();
    backCtx.beginPath();
    backCtx.rect(padLeft, t2Top + 2, chartW, (t2Bottom - t2Top) - 4);
    backCtx.clip();
    drawSmoothWaveformChannel(
      (s) => fZeroY - s.flow * fScale,
      isLight ? '#059669' : '#10b981',
      'rgba(16, 185, 129, 0.65)',
      'flow'
    );
    backCtx.restore();

    // 3. Draw Volume Waveform (Amber) with track boundary clipping
    if (!isSplit) {
      backCtx.save();
      backCtx.beginPath();
      backCtx.rect(padLeft, t3Top + 2, chartW, (t3Bottom - t3Top) - 4);
      backCtx.clip();
      drawSmoothWaveformChannel(
        (s) => vZeroY - s.volume * vScale,
        isLight ? '#d97706' : '#f59e0b',
        'rgba(245, 158, 11, 0.65)',
        'volume'
      );
      backCtx.restore();
    }

    // Sweep Erase Bar with Neon Scanner Tip
    if (!isFrozen) {
      const sweepX = padLeft + (sweepIdx / maxPoints) * chartW;
      const eraseW = 34;
      const grad = backCtx.createLinearGradient(sweepX - eraseW, 0, sweepX + 4, 0);
      if (isLight) {
        grad.addColorStop(0, 'rgba(241, 245, 249, 0)');
        grad.addColorStop(0.7, 'rgba(241, 245, 249, 0.95)');
        grad.addColorStop(1, '#f1f5f9');
      } else {
        grad.addColorStop(0, 'rgba(5, 7, 11, 0)');
        grad.addColorStop(0.7, 'rgba(5, 7, 11, 0.95)');
        grad.addColorStop(1, '#05070b');
      }

      backCtx.fillStyle = grad;
      backCtx.fillRect(Math.max(padLeft, sweepX - eraseW), 0, eraseW + 4, height);

      backCtx.save();
      backCtx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.9)' : 'rgba(0, 229, 255, 0.95)';
      if (!isLight) {
        backCtx.shadowColor = 'rgba(0, 229, 255, 0.9)';
        backCtx.shadowBlur = 10;
      }
      backCtx.lineWidth = 2;
      backCtx.lineCap = 'round';
      backCtx.beginPath();
      backCtx.moveTo(sweepX, 3);
      backCtx.lineTo(sweepX, height - 3);
      backCtx.stroke();

      backCtx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
      backCtx.beginPath();
      backCtx.arc(sweepX, 8, 3, 0, Math.PI * 2);
      backCtx.arc(sweepX, height - 8, 3, 0, Math.PI * 2);
      backCtx.fill();
      backCtx.restore();
    }

    // Maneuver Hold Banners
    if (maneuverState.inspiratoryHoldActive) {
      backCtx.save();
      backCtx.fillStyle = isLight ? 'rgba(2, 132, 199, 0.15)' : 'rgba(0, 229, 255, 0.18)';
      if (typeof backCtx.roundRect === 'function') {
        backCtx.beginPath();
        backCtx.roundRect(width / 2 - 180, 8, 360, 28, 14);
        backCtx.fill();
        backCtx.strokeStyle = isLight ? '#0284c7' : '#00e5ff';
        backCtx.lineWidth = 1.2;
        backCtx.stroke();
      }
      backCtx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
      backCtx.font = 'bold 12px system-ui, sans-serif';
      backCtx.textAlign = 'center';
      backCtx.fillText('⏸ PAUSA INSPIRATÓRIA EM CURSO (Pplat & Complacência)', width / 2, 26);
      backCtx.restore();
    } else if (maneuverState.expiratoryHoldActive) {
      backCtx.save();
      backCtx.fillStyle = isLight ? 'rgba(217, 119, 6, 0.15)' : 'rgba(251, 191, 36, 0.2)';
      if (typeof backCtx.roundRect === 'function') {
        backCtx.beginPath();
        backCtx.roundRect(width / 2 - 180, 8, 360, 28, 14);
        backCtx.fill();
        backCtx.strokeStyle = isLight ? '#d97706' : '#f59e0b';
        backCtx.lineWidth = 1.2;
        backCtx.stroke();
      }
      backCtx.fillStyle = isLight ? '#d97706' : '#f59e0b';
      backCtx.font = 'bold 12px system-ui, sans-serif';
      backCtx.textAlign = 'center';
      backCtx.fillText('⏸ PAUSA EXPIRATÓRIA EM CURSO (Auto-PEEP & PEEP Total)', width / 2, 26);
      backCtx.restore();
    }

    // Freeze Mode Caliper Cursor Inspection
    if (isFrozen && hoverData && hoverData.sample) {
      const s = hoverData.sample;
      const hX = hoverData.x;

      backCtx.save();
      backCtx.strokeStyle = isLight ? '#475569' : '#ffffff';
      backCtx.lineWidth = 1.2;
      backCtx.setLineDash([4, 4]);
      backCtx.beginPath();
      backCtx.moveTo(hX, 4);
      backCtx.lineTo(hX, height - 4);
      backCtx.stroke();
      backCtx.restore();

      const yP = Math.max(t1Top + 6, Math.min(t1Bottom - 6, pZeroY - s.pressure * pScale));
      const yF = Math.max(t2Top + 6, Math.min(t2Bottom - 6, fZeroY - s.flow * fScale));
      const yV = Math.max(t3Top + 6, Math.min(t3Bottom - 6, vZeroY - s.volume * vScale));

      const drawIntersectPoint = (y: number, color: string) => {
        backCtx.save();
        backCtx.fillStyle = color;
        backCtx.shadowColor = color;
        backCtx.shadowBlur = 8;
        backCtx.beginPath();
        backCtx.arc(hX, y, 4, 0, Math.PI * 2);
        backCtx.fill();
        backCtx.restore();
      };

      drawIntersectPoint(yP, isLight ? '#0284c7' : '#00e5ff');
      drawIntersectPoint(yF, isLight ? '#059669' : '#10b981');
      if (!isSplit) {
        drawIntersectPoint(yV, isLight ? '#d97706' : '#f59e0b');
      }

      const tipW = 180;
      const tipH = 96;
      const tipX = Math.min(width - tipW - 20, Math.max(padLeft + 10, hX + 16));
      const tipY = 44;

      backCtx.save();
      backCtx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(12, 16, 26, 0.95)';
      if (typeof backCtx.roundRect === 'function') {
        backCtx.beginPath();
        backCtx.roundRect(tipX, tipY, tipW, tipH, 10);
        backCtx.fill();
        backCtx.strokeStyle = isLight ? '#0284c7' : '#00e5ff';
        backCtx.lineWidth = 1.5;
        if (!isLight) {
          backCtx.shadowColor = 'rgba(0, 229, 255, 0.4)';
          backCtx.shadowBlur = 10;
        }
        backCtx.stroke();
      } else {
        backCtx.fillRect(tipX, tipY, tipW, tipH);
      }

      backCtx.font = 'bold 10px monospace';
      backCtx.fillStyle = isLight ? '#475569' : '#94a3b8';
      backCtx.textAlign = 'left';
      backCtx.fillText(`Tempo: ${s.time.toFixed(2)} s`, tipX + 12, tipY + 20);

      backCtx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
      backCtx.fillText(`Paw:   ${s.pressure.toFixed(1)} cmH₂O`, tipX + 12, tipY + 40);

      backCtx.fillStyle = isLight ? '#059669' : '#10b981';
      backCtx.fillText(`Fluxo: ${s.flow.toFixed(1)} L/min`, tipX + 12, tipY + 60);

      backCtx.fillStyle = isLight ? '#d97706' : '#f59e0b';
      backCtx.fillText(`Vol:   ${s.volume} mL`, tipX + 12, tipY + 80);
      backCtx.restore();
    }

    backCtx.restore();

    // ============================================================================
    // ATOMIC BLIT: TRANSFER COMPLETED BACK-BUFFER TO VISIBLE FRONT CANVAS
    // ============================================================================
    frontCtx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
    frontCtx.drawImage(backCanvas, 0, 0);
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
    peepSet,
    viewMode,
    maxPoints,
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

  // High-Performance Continuous RequestAnimationFrame Loop with Double Buffering
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
    const idx = Math.min(buffer.length - 1, Math.max(0, Math.round(ratio * (buffer.length - 1))));
    setHoverData({ x, sample: buffer[idx] });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col w-full h-full rounded-2xl border shadow-xl overflow-hidden select-none transition-colors duration-200 ${
        isLight
          ? 'bg-slate-50 border-slate-300 shadow-slate-200/80'
          : 'bg-[#05070b] border-[#182032] shadow-black/80'
      }`}
    >
      {/* Waveform Screen Header & Utility Bar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b z-20 shrink-0 ${
          isLight
            ? 'bg-white/90 border-slate-200 backdrop-blur-md'
            : 'bg-[#090c14]/90 border-[#141a29] backdrop-blur-md'
        }`}
      >
        {/* Left: View Mode Switcher Pills */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-[11px] font-bold font-mono tracking-wider text-cyan-400 mr-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className={isLight ? 'text-slate-800 font-black' : 'text-white font-black'}>
              TRAÇADOS EM TEMPO REAL
            </span>
          </div>

          <div
            className={`flex items-center p-0.5 rounded-lg border ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#101422] border-zinc-700/60'
            }`}
          >
            <button
              onClick={() => onSelectViewMode?.('waveforms')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                viewMode === 'waveforms'
                  ? 'bg-cyan-500 text-black shadow-sm font-black'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Curvas
            </button>
            <button
              onClick={() => onSelectViewMode?.('loops')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                viewMode === 'loops'
                  ? 'bg-cyan-500 text-black shadow-sm font-black'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Alças (Loops)
            </button>
            <button
              onClick={() => onSelectViewMode?.('split')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-cyan-500 text-black shadow-sm font-black'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dividido
            </button>
          </div>
        </div>

        {/* Right Controls: Sweep Speed, Scale Selectors & Freeze Button */}
        <div className="flex items-center gap-2">
          {/* Sweep Time Window Selector */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#12141e] border-zinc-700/60'
            }`}
          >
            <Clock className="w-3 h-3 text-cyan-400" />
            <select
              value={timeWindowSeconds}
              onChange={(e) => setTimeWindowSeconds(Number(e.target.value))}
              className={`bg-transparent text-[10px] font-mono focus:outline-none cursor-pointer ${
                isLight ? 'text-slate-800' : 'text-zinc-200'
              }`}
            >
              <option value={10} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                10s (Varredura Rápida)
              </option>
              <option value={15} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                15s (Padrão UTI)
              </option>
              <option value={20} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                20s (Varredura Lenta)
              </option>
              <option value={30} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                30s (Longa Duração)
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
              <option value={0} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                Auto Adaptativo
              </option>
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
              <option value={0} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                Auto Adaptativo
              </option>
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
              <option value={0} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0e0f14] text-zinc-200'}>
                Auto Adaptativo
              </option>
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

      {/* Main Dual-Layer Canvas Display Area with Double Buffering */}
      <div ref={canvasAreaRef} className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        {/* Layer 1: Static Background Canvas (Grids, Lines, Scale Labels) */}
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 w-full h-full block pointer-events-none"
        />

        {/* Layer 2: Dynamic Real-time Front-Buffer (Atomically blitted from Offscreen Back-Buffer) */}
        <canvas
          ref={fgCanvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="absolute inset-0 w-full h-full block cursor-crosshair z-10"
        />
      </div>
    </div>
  );
};
