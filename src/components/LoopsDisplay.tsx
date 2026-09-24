import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WaveformSample, LoopSample, MonitoredData, PatientParameters } from '../types/ventilation';
import { Bookmark, Sparkles, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface LoopsDisplayProps {
  currentSample: WaveformSample | null;
  peepSet: number;
  viewMode?: 'waveforms' | 'loops' | 'split';
  onSelectViewMode?: (mode: 'waveforms' | 'loops' | 'split') => void;
  monitored?: MonitoredData;
  patient?: PatientParameters;
  isFrozen?: boolean;
}

export const LoopsDisplay: React.FC<LoopsDisplayProps> = ({
  currentSample,
  peepSet,
  viewMode = 'loops',
  onSelectViewMode,
  monitored,
  patient,
  isFrozen = false,
}) => {
  const { isLight } = useTheme();

  // Canvases for P-V Loop
  const pvBgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pvFgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvases for F-V Loop
  const fvBgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fvFgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active loop accumulation for the current breath cycle
  const currentBreathLoopRef = useRef<LoopSample[]>([]);
  // Last completed breath loop (full closed cycle)
  const [lastCompletedLoop, setLastCompletedLoop] = useState<LoopSample[]>([]);
  // Saved reference loop for before/after comparison
  const [referenceLoop, setReferenceLoop] = useState<LoopSample[] | null>(null);

  const prevPhaseRef = useRef<string>('insp');
  const [activeTab, setActiveTab] = useState<'both' | 'pv' | 'fv'>('both');

  // Dynamic adaptive scale ranges
  const getScales = useCallback(() => {
    const pPeak = Math.max(monitored?.peakPressure || 30, currentSample?.pressure || 0);
    const pMax = pPeak > 72 ? 100 : pPeak > 52 ? 80 : pPeak > 38 ? 60 : 50;

    const vt = Math.max(monitored?.vti || 450, monitored?.vte || 450, currentSample?.volume || 0);
    const vMax = vt > 950 ? 1400 : vt > 720 ? 1100 : vt > 520 ? 800 : 650;

    const peakFlow = Math.max(Math.abs(currentSample?.flow || 0), 60);
    const fMax = peakFlow > 95 ? 140 : peakFlow > 75 ? 110 : 90;

    return { pMax, vMax, fMax };
  }, [
    monitored?.peakPressure,
    monitored?.vti,
    monitored?.vte,
    currentSample?.pressure,
    currentSample?.volume,
    currentSample?.flow,
  ]);

  // Real-time loop point accumulation with cycle-boundary detection
  useEffect(() => {
    if (!currentSample || isFrozen) return;

    const currentPhase = currentSample.phase;
    const prevPhase = prevPhaseRef.current;

    // Detect new breath start: transition from exp to insp
    if (prevPhase === 'exp' && currentPhase === 'insp') {
      if (currentBreathLoopRef.current.length > 12) {
        // Save the completed cycle
        const completed = [...currentBreathLoopRef.current];
        // Ensure closed loop back to baseline
        if (completed.length > 0) {
          completed.push({
            pressure: peepSet,
            flow: 0,
            volume: 0,
          });
        }
        setLastCompletedLoop(completed);
      }
      currentBreathLoopRef.current = [];
    }

    prevPhaseRef.current = currentPhase;

    currentBreathLoopRef.current.push({
      pressure: currentSample.pressure,
      flow: currentSample.flow,
      volume: Math.max(0, currentSample.volume),
    });

    // Guard against excessive buffer if frequency is low
    if (currentBreathLoopRef.current.length > 1200) {
      currentBreathLoopRef.current.shift();
    }
  }, [currentSample, peepSet, isFrozen]);

  // Save current completed loop as reference
  const handleSaveReference = () => {
    audioEngine.playConfirmBeep();
    if (lastCompletedLoop.length > 10) {
      setReferenceLoop([...lastCompletedLoop]);
    } else if (currentBreathLoopRef.current.length > 10) {
      setReferenceLoop([...currentBreathLoopRef.current]);
    }
  };

  const handleClearReference = () => {
    audioEngine.playClick(900);
    setReferenceLoop(null);
  };

  // Helper to draw smooth spline through points
  const drawSmoothLoop = (
    pts: { x: number; y: number }[],
    ctx: CanvasRenderingContext2D,
    color: string,
    glowColor: string,
    lineWidth: number = 2.4,
    isDashed: boolean = false
  ) => {
    if (pts.length < 2) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (!isDashed) {
      if (!isLight) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 6;
      }
    } else {
      ctx.setLineDash([4, 4]);
    }

    ctx.beginPath();
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
    ctx.restore();
  };

  // ============================================================================
  // P-V LOOP BACKGROUND CANVAS (Grid, Axes, Scales, Titles)
  // ============================================================================
  const renderPVBackground = useCallback(() => {
    const canvas = pvBgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = rect.width || 400;
    const height = rect.height || 360;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = isLight ? '#f8fafc' : '#07080d';
    ctx.fillRect(0, 0, width, height);

    if (typeof ctx.roundRect === 'function') {
      ctx.fillStyle = isLight ? '#ffffff' : '#0a0c13';
      ctx.beginPath();
      ctx.roundRect(4, 4, width - 8, height - 8, 12);
      ctx.fill();
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const padLeft = 46;
    const padBottom = 34;
    const padTop = 38;
    const padRight = 24;

    const graphW = width - padLeft - padRight;
    const graphH = height - padBottom - padTop;

    const { pMax, vMax } = getScales();
    const pStep = pMax >= 80 ? 20 : 10;
    const vStep = vMax >= 1000 ? 250 : 200;

    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    // Vertical P grid
    for (let p = 0; p <= pMax; p += pStep) {
      const x = padLeft + (p / pMax) * graphW;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();

      ctx.font = '9px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${p}`, x - 5, height - padBottom + 16);
    }

    // Horizontal Vol grid
    for (let v = 0; v <= vMax; v += vStep) {
      const y = height - padBottom - (v / vMax) * graphH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.font = '9px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${v}`, 10, y + 3);
    }

    // Axes
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, height - padBottom);
    ctx.lineTo(width - padRight, height - padBottom);
    ctx.stroke();

    // Axis Labels
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
    ctx.fillText('Pressão (Paw - cmH₂O) →', width - padRight - 130, height - 10);
    ctx.save();
    ctx.translate(14, padTop + 70);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = isLight ? '#d97706' : '#f59e0b';
    ctx.fillText('Volume (mL) →', 0, 0);
    ctx.restore();

    // Title Badge
    ctx.save();
    const badgeW = 185;
    const badgeH = 22;
    if (typeof ctx.roundRect === 'function') {
      ctx.fillStyle = isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(0, 229, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(padLeft, 8, badgeW, badgeH, 11);
      ctx.fill();
      ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.35)' : 'rgba(0, 229, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = isLight ? '#0284c7' : '#00e5ff';
    ctx.beginPath();
    ctx.arc(padLeft + 10, 8 + badgeH / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = isLight ? '#0f172a' : '#f1f5f9';
    ctx.fillText('Volume x Pressão (P-V)', padLeft + 20, 8 + 15);
    ctx.restore();

    ctx.restore();
  }, [isLight, getScales]);

  // ============================================================================
  // P-V LOOP FOREGROUND CANVAS (Active Loop, Last Breath, Cst Slope Line)
  // ============================================================================
  const renderPVForeground = useCallback(() => {
    const canvas = pvFgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = rect.width || 400;
    const height = rect.height || 360;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padLeft = 46;
    const padBottom = 34;
    const padTop = 38;
    const padRight = 24;

    const graphW = width - padLeft - padRight;
    const graphH = height - padBottom - padTop;

    const { pMax, vMax } = getScales();

    // Clip rendering strictly to graph boundary box so curves never exceed limits
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, graphW, graphH);
    ctx.clip();

    // 1. Draw Saved Reference Loop (if saved by user)
    if (referenceLoop && referenceLoop.length > 5) {
      const refPts = referenceLoop.map((pt) => ({
        x: padLeft + (Math.max(0, pt.pressure) / pMax) * graphW,
        y: height - padBottom - (Math.max(0, pt.volume) / vMax) * graphH,
      }));
      drawSmoothLoop(
        refPts,
        ctx,
        isLight ? 'rgba(100, 116, 139, 0.7)' : 'rgba(148, 163, 184, 0.55)',
        'rgba(0,0,0,0)',
        1.8,
        true
      );
    }

    // 2. Draw Last Completed Breath Loop (Full, stable, closed loop)
    if (lastCompletedLoop.length > 5) {
      const closedPts = lastCompletedLoop.map((pt) => ({
        x: padLeft + (Math.max(0, pt.pressure) / pMax) * graphW,
        y: height - padBottom - (Math.max(0, pt.volume) / vMax) * graphH,
      }));
      drawSmoothLoop(
        closedPts,
        ctx,
        isLight ? 'rgba(2, 132, 199, 0.45)' : 'rgba(0, 229, 255, 0.35)',
        'rgba(0, 229, 255, 0.2)',
        2.2,
        false
      );
    }

    // 3. Draw Active Breath Loop being traced in real-time
    const activePtsRaw = currentBreathLoopRef.current;
    if (activePtsRaw.length > 1) {
      const activePts = activePtsRaw.map((pt) => ({
        x: padLeft + (Math.max(0, pt.pressure) / pMax) * graphW,
        y: height - padBottom - (Math.max(0, pt.volume) / vMax) * graphH,
      }));

      drawSmoothLoop(
        activePts,
        ctx,
        isLight ? '#0284c7' : '#00e5ff',
        'rgba(0, 229, 255, 0.8)',
        2.6,
        false
      );

      // Tracing Head Cursor Beacon
      const latest = activePts[activePts.length - 1];
      ctx.save();
      ctx.fillStyle = isLight ? '#0284c7' : '#ffffff';
      if (!isLight) {
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.arc(latest.x, latest.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Static Compliance Slope Line (Cst = DeltaV / DeltaP)
    if (monitored && monitored.staticCompliance > 5 && monitored.vte > 50) {
      const pStart = peepSet + (monitored.autoPeep || 0);
      const vStart = 0;
      const pEnd = monitored.plateauPressure || (peepSet + 15);
      const vEnd = monitored.vte || 450;

      const x0 = padLeft + (pStart / pMax) * graphW;
      const y0 = height - padBottom - (vStart / vMax) * graphH;
      const x1 = padLeft + (pEnd / pMax) * graphW;
      const y1 = height - padBottom - (vEnd / vMax) * graphH;

      ctx.save();
      ctx.strokeStyle = isLight ? 'rgba(217, 119, 6, 0.75)' : 'rgba(245, 158, 11, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Mark Cst End Anchor point
      ctx.fillStyle = isLight ? '#d97706' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(x1, y1, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Cst Slope Annotation Label
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = isLight ? '#b45309' : '#f59e0b';
      ctx.fillText(`Cst = ${monitored.staticCompliance.toFixed(0)} mL/cmH₂O`, x1 + 6, y1 - 4);
      ctx.restore();
    }

    // Restore clip boundary
    ctx.restore();

    // 5. Overdistension / Low Compliance Warning Banner on Canvas
    if (patient && patient.compliance < 30) {
      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('▼ Baixa Complacência (SDRA/Restritivo) - Alça inclinada para a direita', padLeft + 10, padTop + 18);
      ctx.restore();
    } else if (patient && patient.resistance > 16) {
      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('▲ Alta Resistência (Obstrutivo) - Alça alargada (Histerese Aumentada)', padLeft + 10, padTop + 18);
      ctx.restore();
    }

    ctx.restore();
  }, [isLight, referenceLoop, lastCompletedLoop, peepSet, monitored, patient, getScales]);

  // ============================================================================
  // F-V LOOP BACKGROUND CANVAS (Grid, Axes, Flow=0 Center Line)
  // ============================================================================
  const renderFVBackground = useCallback(() => {
    const canvas = fvBgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = rect.width || 400;
    const height = rect.height || 360;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = isLight ? '#f8fafc' : '#07080d';
    ctx.fillRect(0, 0, width, height);

    if (typeof ctx.roundRect === 'function') {
      ctx.fillStyle = isLight ? '#ffffff' : '#0a0c13';
      ctx.beginPath();
      ctx.roundRect(4, 4, width - 8, height - 8, 12);
      ctx.fill();
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const padLeft = 46;
    const padBottom = 30;
    const padTop = 38;
    const padRight = 24;

    const graphW = width - padLeft - padRight;
    const graphH = height - padBottom - padTop;

    const { vMax, fMax } = getScales();
    const vStep = vMax >= 1000 ? 250 : 200;
    const zeroY = padTop + graphH / 2;

    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    // Volume X grid
    for (let v = 0; v <= vMax; v += vStep) {
      const x = padLeft + (v / vMax) * graphW;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();

      ctx.font = '9px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${v}`, x - 5, height - padBottom + 16);
    }

    // Flow Y grid
    const fHalf = Math.round(fMax / 2);
    [-fMax, -fHalf, 0, fHalf, fMax].forEach((f) => {
      const y = zeroY - (f / fMax) * (graphH / 2);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.font = '9px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${f}`, 10, y + 3);
    });

    // Zero Flow Center Axis
    ctx.strokeStyle = isLight ? 'rgba(5, 150, 105, 0.45)' : 'rgba(16, 185, 129, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padLeft, zeroY);
    ctx.lineTo(width - padRight, zeroY);
    ctx.stroke();

    // Axis Labels
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = isLight ? '#d97706' : '#f59e0b';
    ctx.fillText('Volume (mL) →', width - padRight - 85, height - 10);
    ctx.save();
    ctx.translate(14, padTop + 70);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = isLight ? '#059669' : '#10b981';
    ctx.fillText('Fluxo (L/min) →', 0, 0);
    ctx.restore();

    // Title Badge
    ctx.save();
    const badgeW = 185;
    const badgeH = 22;
    if (typeof ctx.roundRect === 'function') {
      ctx.fillStyle = isLight ? 'rgba(5, 150, 105, 0.12)' : 'rgba(16, 185, 129, 0.12)';
      ctx.beginPath();
      ctx.roundRect(padLeft, 8, badgeW, badgeH, 11);
      ctx.fill();
      ctx.strokeStyle = isLight ? 'rgba(5, 150, 105, 0.35)' : 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = isLight ? '#059669' : '#10b981';
    ctx.beginPath();
    ctx.arc(padLeft + 10, 8 + badgeH / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = isLight ? '#0f172a' : '#f1f5f9';
    ctx.fillText('Fluxo x Volume (F-V)', padLeft + 20, 8 + 15);
    ctx.restore();

    // Inspiratory (+) & Expiratory (-) Region indicators
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = isLight ? '#059669' : '#10b981';
    ctx.fillText('+ INSPIRAÇÃO', padLeft + 10, zeroY - 8);
    ctx.fillStyle = isLight ? '#d97706' : '#f59e0b';
    ctx.fillText('- EXPIRAÇÃO', padLeft + 10, zeroY + 14);

    ctx.restore();
  }, [isLight, getScales]);

  // ============================================================================
  // F-V LOOP FOREGROUND CANVAS (Active Loop, Completed Loop, Scooping/Air-Trapping)
  // ============================================================================
  const renderFVForeground = useCallback(() => {
    const canvas = fvFgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = rect.width || 400;
    const height = rect.height || 360;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padLeft = 46;
    const padBottom = 30;
    const padTop = 38;
    const padRight = 24;

    const graphW = width - padLeft - padRight;
    const graphH = height - padBottom - padTop;

    const { vMax, fMax } = getScales();
    const zeroY = padTop + graphH / 2;

    // Clip rendering strictly to graph boundary box so curves never exceed limits
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, graphW, graphH);
    ctx.clip();

    // 1. Saved Reference Loop
    if (referenceLoop && referenceLoop.length > 5) {
      const refPts = referenceLoop.map((pt) => ({
        x: padLeft + (Math.max(0, pt.volume) / vMax) * graphW,
        y: zeroY - (pt.flow / fMax) * (graphH / 2),
      }));
      drawSmoothLoop(
        refPts,
        ctx,
        isLight ? 'rgba(100, 116, 139, 0.7)' : 'rgba(148, 163, 184, 0.55)',
        'rgba(0,0,0,0)',
        1.8,
        true
      );
    }

    // 2. Last Completed Breath Loop
    if (lastCompletedLoop.length > 5) {
      const closedPts = lastCompletedLoop.map((pt) => ({
        x: padLeft + (Math.max(0, pt.volume) / vMax) * graphW,
        y: zeroY - (pt.flow / fMax) * (graphH / 2),
      }));
      drawSmoothLoop(
        closedPts,
        ctx,
        isLight ? 'rgba(5, 150, 105, 0.45)' : 'rgba(16, 185, 129, 0.35)',
        'rgba(16, 185, 129, 0.2)',
        2.2,
        false
      );
    }

    // 3. Active Breath Loop
    const activePtsRaw = currentBreathLoopRef.current;
    if (activePtsRaw.length > 1) {
      const activePts = activePtsRaw.map((pt) => ({
        x: padLeft + (Math.max(0, pt.volume) / vMax) * graphW,
        y: zeroY - (pt.flow / fMax) * (graphH / 2),
      }));

      drawSmoothLoop(
        activePts,
        ctx,
        isLight ? '#059669' : '#10b981',
        'rgba(16, 185, 129, 0.8)',
        2.6,
        false
      );

      // Head cursor beacon
      const latest = activePts[activePts.length - 1];
      ctx.save();
      ctx.fillStyle = isLight ? '#059669' : '#ffffff';
      if (!isLight) {
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.arc(latest.x, latest.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Restore clip boundary
    ctx.restore();

    // 4. Clinical Annotations (Air-Trapping / Auto-PEEP & Obstructive Scooping)
    if (monitored && monitored.autoPeep > 1.8) {
      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`⚠️ Auto-PEEP: ${monitored.autoPeep.toFixed(1)} cmH₂O (Aprisionamento - Fluxo exp. não zera)`, padLeft + 10, height - padBottom - 8);
      ctx.restore();
    } else if (patient && patient.resistance > 16) {
      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('⚠️ Concavidade Expiratória ("Scooping") típica de Obstrução / Asma / DPOC', padLeft + 10, height - padBottom - 8);
      ctx.restore();
    }

    ctx.restore();
  }, [isLight, referenceLoop, lastCompletedLoop, monitored, patient, getScales]);

  // Background repaints on theme or tab change
  useEffect(() => {
    renderPVBackground();
    renderFVBackground();
  }, [renderPVBackground, renderFVBackground, activeTab]);

  // Animation Loop for Foreground Canvases
  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderPVForeground();
      renderFVForeground();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderPVForeground, renderFVForeground]);

  return (
    <div
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
        {/* Title & View Switcher */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${
              isLight
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-amber-950/60 border-amber-500/30 text-amber-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-display font-bold tracking-wider text-[11px] uppercase">
              Alças e Loops Pulmonares
            </span>
          </div>

          {/* View Switcher if provided */}
          {onSelectViewMode && (
            <div
              className={`flex items-center p-0.5 rounded-full border ${
                isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#12141e] border-zinc-800'
              }`}
            >
              <button
                onClick={() => onSelectViewMode('waveforms')}
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer ${
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
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer ${
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
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer ${
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
        </div>

        {/* Real-time Clinical Mechanics Pill Overlays */}
        {monitored && (
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-[10px]">
            <div className={`px-2 py-0.5 rounded-md border ${isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-800' : 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'}`}>
              <span className="opacity-70">Cst:</span> <b>{monitored.staticCompliance.toFixed(0)}</b> mL/cmH₂O
            </div>
            <div className={`px-2 py-0.5 rounded-md border ${isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-950/40 border-amber-800/60 text-amber-300'}`}>
              <span className="opacity-70">Raw:</span> <b>{monitored.airwayResistance.toFixed(1)}</b> cmH₂O/(L/s)
            </div>
            <div className={`px-2 py-0.5 rounded-md border ${isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-zinc-800/60 border-zinc-700 text-zinc-300'}`}>
              <span className="opacity-70">PIP:</span> <b>{monitored.peakPressure.toFixed(0)}</b>
            </div>
            {monitored.autoPeep > 1.0 && (
              <div className="px-2 py-0.5 rounded-md border bg-rose-950/50 border-rose-600 text-rose-300 animate-pulse font-bold">
                Auto-PEEP: {monitored.autoPeep.toFixed(1)}
              </div>
            )}
          </div>
        )}

        {/* Reference & Tab Buttons */}
        <div className="flex items-center gap-2">
          {referenceLoop ? (
            <button
              onClick={handleClearReference}
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono border cursor-pointer shadow-xs transition-all ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-[#181a26] hover:bg-[#222536] text-zinc-300 border-zinc-700/60'
              }`}
            >
              Limpar Ref.
            </button>
          ) : (
            <button
              onClick={handleSaveReference}
              className={`flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border font-mono cursor-pointer shadow-xs transition-all ${
                isLight
                  ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300'
                  : 'bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border-cyan-600/50'
              }`}
              title="Salva o ciclo atual como referência tracejada para comparar alterações"
            >
              <Bookmark className="w-3 h-3" /> Salvar Ref.
            </button>
          )}

          {/* View Tab selector */}
          <div
            className={`flex p-0.5 rounded-full border ${
              isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#12141e] border-zinc-800'
            }`}
          >
            <button
              onClick={() => setActiveTab('both')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono cursor-pointer transition-all ${
                activeTab === 'both'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'bg-[#222738] text-white shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Ambos
            </button>
            <button
              onClick={() => setActiveTab('pv')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono cursor-pointer transition-all ${
                activeTab === 'pv'
                  ? isLight
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              P x V
            </button>
            <button
              onClick={() => setActiveTab('fv')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono cursor-pointer transition-all ${
                activeTab === 'fv'
                  ? isLight
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              F x V
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area with Responsive Cards */}
      <div
        className={`flex-1 grid grid-cols-1 ${activeTab === 'both' ? 'md:grid-cols-2' : 'grid-cols-1'} gap-2 p-2 min-h-0 h-full overflow-hidden ${
          isLight ? 'bg-slate-100' : 'bg-[#07080d]'
        }`}
      >
        {(activeTab === 'both' || activeTab === 'pv') && (
          <div
            className={`relative w-full h-full rounded-xl border overflow-hidden flex flex-col shadow-inner ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0c13] border-zinc-800/80'
            }`}
          >
            {/* P-V Background Canvas Layer */}
            <canvas ref={pvBgCanvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />
            {/* P-V Dynamic Foreground Canvas Layer */}
            <canvas ref={pvFgCanvasRef} className="absolute inset-0 w-full h-full block cursor-crosshair z-10" />
          </div>
        )}

        {(activeTab === 'both' || activeTab === 'fv') && (
          <div
            className={`relative w-full h-full rounded-xl border overflow-hidden flex flex-col shadow-inner ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0c13] border-zinc-800/80'
            }`}
          >
            {/* F-V Background Canvas Layer */}
            <canvas ref={fvBgCanvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />
            {/* F-V Dynamic Foreground Canvas Layer */}
            <canvas ref={fvFgCanvasRef} className="absolute inset-0 w-full h-full block cursor-crosshair z-10" />
          </div>
        )}
      </div>
    </div>
  );
};
