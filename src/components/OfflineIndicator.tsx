import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-12 left-4 z-[90] flex items-center gap-2 rounded-xl bg-amber-500/95 border border-amber-300 px-3 py-1.5 text-xs font-mono font-bold text-slate-950 shadow-xl backdrop-blur-xs">
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Modo Offline — Simulador operando via cache local (PWA).</span>
    </div>
  );
};
