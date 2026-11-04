import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Square, GripHorizontal } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface DraggableWindowProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  initialX?: number;
  initialY?: number;
  width?: string;
  maxHeight?: string;
  children: React.ReactNode;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  title,
  subtitle,
  icon,
  isOpen,
  onClose,
  initialX = 120,
  initialY = 70,
  width = 'w-[520px] max-w-[94vw]',
  maxHeight = 'max-h-[82vh]',
  children,
}) => {
  const { isLight } = useTheme();
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: initialX,
    posY: initialY,
  });

  const windowRef = useRef<HTMLDivElement | null>(null);

  // Auto-center or adjust position if window is off-screen on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = Math.max(10, window.innerWidth - 300);
        const maxY = Math.max(10, window.innerHeight - 100);
        return {
          x: Math.min(prev.x, maxX),
          y: Math.min(prev.y, maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag from header, not buttons
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const deltaX = moveEvt.clientX - dragStartRef.current.startX;
      const deltaY = moveEvt.clientY - dragStartRef.current.startY;

      const newX = Math.max(10, Math.min(window.innerWidth - 200, dragStartRef.current.posX + deltaX));
      const newY = Math.max(50, Math.min(window.innerHeight - 80, dragStartRef.current.posY + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      ref={windowRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`fixed z-40 ${width} rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-shadow select-none animate-fadeIn ${
        isDragging ? 'shadow-cyan-500/20 ring-2 ring-cyan-500/50 cursor-grabbing' : ''
      } ${
        isLight
          ? 'bg-white/95 backdrop-blur-md border-slate-300 text-slate-900 shadow-slate-400/40'
          : 'bg-[#0d0f17]/95 backdrop-blur-md border-zinc-700/80 text-zinc-100 shadow-black/80'
      }`}
    >
      {/* Draggable Header */}
      <div
        onPointerDown={handlePointerDown}
        className={`px-3.5 py-2.5 border-b flex items-center justify-between cursor-grab active:cursor-grabbing select-none transition-colors ${
          isLight
            ? 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-200'
            : 'bg-[#131520]/90 hover:bg-[#1a1c2b] border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className={`w-4 h-4 shrink-0 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
          {icon && <div className="shrink-0">{icon}</div>}
          <div className="min-w-0 flex flex-col">
            <span className={`text-xs font-display font-bold truncate ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
              {title}
            </span>
            {subtitle && (
              <span className={`text-[10px] font-mono truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Window controls: Minimize & Close */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={() => {
              audioEngine.playClick(900);
              setIsMinimized(!isMinimized);
            }}
            className={`p-1 rounded-lg border transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-200/80 hover:bg-slate-300 text-slate-600 border-slate-300'
                : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700/60'
            }`}
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? <Square className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </button>
          <button
            onClick={() => {
              audioEngine.playClick(800);
              onClose();
            }}
            className={`p-1 rounded-lg border transition-all cursor-pointer ${
              isLight
                ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 border-rose-300'
                : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-800/60'
            }`}
            title="Fechar Janela"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <div className={`overflow-y-auto ${maxHeight} p-3.5`}>
          {children}
        </div>
      )}
    </div>
  );
};
