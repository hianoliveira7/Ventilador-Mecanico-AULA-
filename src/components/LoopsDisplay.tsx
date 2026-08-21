import React, { useEffect, useRef, useState } from 'react';
import { WaveformSample, LoopSample } from '../types/ventilation';
import { RefreshCw, Bookmark, Sparkles, Activity, Layers } from 'lucide-react';

interface LoopsDisplayProps {
  currentSample: WaveformSample | null;
  peepSet: number;
  viewMode?: 'waveforms' | 'loops' | 'split';
  onSelectViewMode?: (mode: 'waveforms' | 'loops' | 'split') => void;
}

export const LoopsDisplay: React.FC<LoopsDisplayProps> = ({
  currentSample,
  peepSet,
  viewMode = 'loops',
  onSelectViewMode,
}) => {
  const pvCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fvCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const loopBufferRef = useRef<LoopSample[]>([]);
  const [referenceLoop, setReferenceLoop] = useState<LoopSample[] | null>(null);
  const [activeTab, setActiveTab] = useState<'both' | 'pv' | 'fv'>('both');

  // Push new sample to current loop buffer
  useEffect(() => {
    if (!currentSample) return;

    // Detect breath boundary: when phase transitions from exp to insp
    if (currentSample.phase === 'insp' && loopBufferRef.current.length > 30) {
      if (loopBufferRef.current.length > 250) {
        loopBufferRef.current = loopBufferRef.current.slice(-150);
      }
    }

    loopBufferRef.current.push({
      pressure: currentSample.pressure,
      flow: currentSample.flow,
      volume: currentSample.volume,
    });

    if (loopBufferRef.current.length > 300) {
      loopBufferRef.current.shift();
    }
  }, [currentSample]);

  // Save current loop as reference
  const handleSaveReference = () => {
    if (loopBufferRef.current.length > 20) {
      setReferenceLoop([...loopBufferRef.current]);
    }
  };

  const handleClearReference = () => {
    setReferenceLoop(null);
  };

  // Helper to draw smooth spline through points
  const drawSmoothLoop = (
    pts: { x: number; y: number }[],
    ctx: CanvasRenderingContext2D,
    color: string,
    glowColor: string,
    isDashed: boolean = false
  ) => {
    if (pts.length < 2) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (!isDashed) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
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

  // Render P-V Loop Canvas (Pressure-Volume)
  const renderPVLoop = () => {
    const canvas = pvCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#07080d';
    ctx.fillRect(0, 0, width, height);

    // Rounded inner container
    if (typeof ctx.roundRect === 'function') {
      ctx.fillStyle = '#0a0c13';
      ctx.beginPath();
      ctx.roundRect(4, 4, width - 8, height - 8, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Coordinate space
    const padLeft = 46;
    const padBottom = 34;
    const padTop = 38;
    const padRight = 24;

    const graphW = width - padLeft - padRight;
    const graphH = height - padBottom - padTop;

    const pMax = 50;
    const vMax = 800;

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    // Vertical P grid
    for (let p = 0; p <= pMax; p += 10) {
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
    for (let v = 0; v <= vMax; v += 200) {
      const y = height - padBottom - (v / vMax) * graphH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.font = '9px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${v}`, 12, y + 3);
    }

    // Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, height - padBottom);
    ctx.lineTo(width - padRight, height - padBottom);
    ctx.stroke();

    // Rounded Title Badge
    ctx.save();
    const badgeW = 180;
    const badgeH = 22;
    if (typeof ctx.roundRect === 'function') {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(padLeft, 8, badgeW, badgeH, 11);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(padLeft + 10, 8 + badgeH / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText('Volume x Pressão (P-V)', padLeft + 20, 8 + 15);
    ctx.restore();

    // Draw Reference Loop (if saved)
    if (referenceLoop && referenceLoop.length > 5) {
      const refPts = referenceLoop.map((pt) => ({
        x: padLeft + (Math.max(0, pt.pressure) / pMax) * graphW,
        y: height - padBottom - (Math.max(0, pt.volume) / vMax) * graphH,
      }));
      drawSmoothLoop(refPts, ctx, 'rgba(148, 163, 184, 0.6)', 'rgba(0,0,0,0)', true);
    }

    // Draw Active P-V Loop with rounded continuous spline
    const pts = loopBufferRef.current;
    if (pts.length > 2) {
      const activePts = pts.map((pt) => ({
        x: padLeft + (Math.max(0, pt.pressure) / pMax) * graphW,
        y: height - padBottom - (Math.max(0, pt.volume) / vMax) * graphH,
      }));
      drawSmoothLoop(activePts, ctx, '#00e5ff', 'rgba(0, 229, 255, 0.6)');

      // Head cursor beacon
      const latest = activePts[activePts.length - 1];
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(latest.x, latest.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  // Render F-V Loop Canvas (Flow-Volume)
  const renderFVLoop = () => {
    const canvas = fvCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#07080d';
    ctx.fillRect(0, 0, width, height);

    // Rounded inner container
    if (typeof ctx.roundRect === 'function') {
      ctx.fillStyle = '#0a0c13';
      ctx.beginPath();
      ctx.roundRect(4, 4, width - 8, height - 8, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const padLeft = 46;
    const padBottom = 30;
    const padTop = 38;
    const padRight = 24;

    const graphW = width - padLeft - padRight;
    const graphH = height - padBottom - padTop;

    const vMax = 800;
    const fMax = 80;
    const zeroY = padTop + graphH / 2;

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    // Volume X grid
    for (let v = 0; v <= vMax; v += 200) {
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
    [-60, -30, 0, 30, 60].forEach((f) => {
      const y = zeroY - (f / fMax) * (graphH / 2);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.font = '9px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${f}`, 12, y + 3);
    });

    // Zero Flow Center Axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padLeft, zeroY);
    ctx.lineTo(width - padRight, zeroY);
    ctx.stroke();

    // Rounded Title Badge
    ctx.save();
    const badgeW = 180;
    const badgeH = 22;
    if (typeof ctx.roundRect === 'function') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.beginPath();
      ctx.roundRect(padLeft, 8, badgeW, badgeH, 11);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(padLeft + 10, 8 + badgeH / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText('Fluxo x Volume (F-V)', padLeft + 20, 8 + 15);
    ctx.restore();

    // Reference loop
    if (referenceLoop && referenceLoop.length > 5) {
      const refPts = referenceLoop.map((pt) => ({
        x: padLeft + (Math.max(0, pt.volume) / vMax) * graphW,
        y: zeroY - (pt.flow / fMax) * (graphH / 2),
      }));
      drawSmoothLoop(refPts, ctx, 'rgba(148, 163, 184, 0.6)', 'rgba(0,0,0,0)', true);
    }

    // Active F-V Loop with rounded continuous spline
    const pts = loopBufferRef.current;
    if (pts.length > 2) {
      const activePts = pts.map((pt) => ({
        x: padLeft + (Math.max(0, pt.volume) / vMax) * graphW,
        y: zeroY - (pt.flow / fMax) * (graphH / 2),
      }));
      drawSmoothLoop(activePts, ctx, '#10b981', 'rgba(16, 185, 129, 0.6)');

      // Head cursor beacon
      const latest = activePts[activePts.length - 1];
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(latest.x, latest.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderPVLoop();
      renderFVLoop();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  });

  return (
    <div className="relative flex flex-col h-full bg-[#08090f] rounded-2xl border border-zinc-800/80 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Top Rounded Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#0d0e17]/90 border-b border-zinc-800/80 select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-display font-bold tracking-wider text-xs uppercase">
              Alças e Loops Pulmonares
            </span>
          </div>

          {/* View Switcher if provided */}
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
        </div>

        <div className="flex items-center gap-2">
          {/* Reference buttons */}
          {referenceLoop ? (
            <button
              onClick={handleClearReference}
              className="text-[11px] px-3 py-1 rounded-full bg-[#181a26] hover:bg-[#222536] text-zinc-300 font-mono border border-zinc-700/60 cursor-pointer shadow-sm transition-all"
            >
              Limpar Referência
            </button>
          ) : (
            <button
              onClick={handleSaveReference}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-600/50 font-mono cursor-pointer shadow-sm transition-all"
            >
              <Bookmark className="w-3 h-3" /> Salvar Loop Ref.
            </button>
          )}

          {/* View Tab selector pills */}
          <div className="flex bg-[#12141e] p-0.5 rounded-full border border-zinc-800">
            <button
              onClick={() => setActiveTab('both')}
              className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full font-mono cursor-pointer transition-all ${
                activeTab === 'both' ? 'bg-[#222738] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Ambos
            </button>
            <button
              onClick={() => setActiveTab('pv')}
              className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full font-mono cursor-pointer transition-all ${
                activeTab === 'pv' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50' : 'text-zinc-400 hover:text-white'
              }`}
            >
              P x V
            </button>
            <button
              onClick={() => setActiveTab('fv')}
              className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full font-mono cursor-pointer transition-all ${
                activeTab === 'fv' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'text-zinc-400 hover:text-white'
              }`}
            >
              F x V
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area with Rounded Cards */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2.5 p-2.5 min-h-[360px] bg-[#07080d]">
        {(activeTab === 'both' || activeTab === 'pv') && (
          <div className="relative w-full h-full bg-[#0a0c13] rounded-xl border border-zinc-800/80 overflow-hidden flex flex-col shadow-inner">
            <canvas ref={pvCanvasRef} className="w-full h-full block cursor-crosshair" />
          </div>
        )}

        {(activeTab === 'both' || activeTab === 'fv') && (
          <div className="relative w-full h-full bg-[#0a0c13] rounded-xl border border-zinc-800/80 overflow-hidden flex flex-col shadow-inner">
            <canvas ref={fvCanvasRef} className="w-full h-full block cursor-crosshair" />
          </div>
        )}
      </div>
    </div>
  );
};
