import React from 'react';
import { Trophy, Clock, CheckCircle, Zap } from 'lucide-react';
import { KahootRoom } from '../services/localDatabase';

interface KahootTopBannerProps {
  studentName: string;
  room: KahootRoom;
  remainingSeconds: number;
  timeLimitSeconds: number;
  onFinishKahootSession: () => void;
}

export const KahootTopBanner: React.FC<KahootTopBannerProps> = ({
  studentName,
  room,
  remainingSeconds,
  onFinishKahootSession,
}) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isWarningTime = remainingSeconds <= 60;

  return (
    <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white px-3 py-1.5 border-b border-indigo-700/60 flex items-center justify-between shadow-xl z-40 select-none shrink-0">
      {/* Student & Room Info */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-amber-400 text-slate-950 rounded-xl font-black shadow-md">
          <Trophy className="w-4 h-4 animate-bounce" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-display font-black text-amber-300">
              {studentName}
            </span>
            <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded text-[9px] font-mono font-bold">
              {room.code}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-300 hidden sm:inline">
            {room.title}
          </span>
        </div>
      </div>

      {/* Timer Countdown */}
      <div className="flex items-center gap-2">
        <div className={`px-3 py-1 rounded-xl font-mono font-black text-sm flex items-center gap-1.5 shadow-md border transition-all ${
          isWarningTime
            ? 'bg-rose-600 text-white border-rose-400 animate-pulse ring-2 ring-rose-400'
            : 'bg-indigo-950 text-cyan-300 border-indigo-700/80'
        }`}>
          <Clock className="w-4 h-4" />
          <span>{formattedTime}</span>
        </div>

        <button
          onClick={onFinishKahootSession}
          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
          <span className="hidden sm:inline">FINALIZAR & VER NOTA</span>
          <span className="sm:hidden">VER NOTA</span>
        </button>
      </div>
    </div>
  );
};
