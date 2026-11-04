import React, { useState, useEffect } from 'react';
import {
  X,
  Tv,
  Maximize2,
  Minimize2,
  Trophy,
  Users,
  Activity,
  AlertOctagon,
  CheckCircle2,
  Zap,
  Search,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import { localDatabase, KahootRoom } from '../services/localDatabase';

interface TeacherMirrorGridModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeacherMirrorGridModal: React.FC<TeacherMirrorGridModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isLight } = useTheme();
  const [rooms, setRooms] = useState<KahootRoom[]>([]);
  const [roomStates, setRoomStates] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isHighContrast, setIsHighContrast] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch initial cloud rooms & room states
    localDatabase.fetchCloudRooms().then((fetchedRooms) => {
      if (fetchedRooms) setRooms(fetchedRooms);
    });

    // Subscribe to rooms updates
    const unsubRooms = localDatabase.subscribeRooms((updatedRooms) => {
      setRooms(updatedRooms);
    });

    return () => unsubRooms();
  }, [isOpen]);

  // Subscribe to live states of all active rooms
  useEffect(() => {
    if (!isOpen || rooms.length === 0) return;

    const unsubs = rooms.map((room) => {
      return localDatabase.subscribeRoomState(room.code, (state) => {
        if (state) {
          setRoomStates((prev) => ({
            ...prev,
            [room.code]: state,
          }));
        }
      });
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [isOpen, rooms]);

  if (!isOpen) return null;

  const filteredRooms = rooms.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.code.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      (r.professorName && r.professorName.toLowerCase().includes(q))
    );
  });

  const toggleFullscreen = () => {
    audioEngine.playClick(1000);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md animate-fadeIn select-none">
      <div
        className={`w-full h-full max-w-7xl rounded-3xl border-2 shadow-2xl overflow-hidden flex flex-col transition-all ${
          isHighContrast
            ? 'bg-[#000000] border-cyan-500 text-white'
            : isLight
            ? 'bg-slate-100 border-slate-300 text-slate-900'
            : 'bg-[#070912] border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Top Projection Bar */}
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 p-4 border-b border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 flex items-center justify-center">
              <Tv className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-cyan-400">
                  MODO ESPELHO DOCENTE • PROJETOR & TV DA SALA
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  TEMPO REAL (5Hz)
                </span>
              </div>
              <h2 className="text-lg font-display font-black text-white">
                Central Multidisciplinar de UTI — Monitoramento de Turmas ao Vivo
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por PIN ou Sala..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-black/60 border border-zinc-700 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 w-44"
              />
            </div>

            {/* High Contrast Data-Show Toggle */}
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick(900);
                setIsHighContrast(!isHighContrast);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                isHighContrast
                  ? 'bg-amber-400 text-black border-amber-300 shadow-md font-black'
                  : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
              }`}
              title="Alternar Modo Alto Contraste para Data-Show / Projetores"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Alto Contraste</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs border border-cyan-400 flex items-center gap-1.5 cursor-pointer shadow-md transition-transform active:scale-95"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFullscreen ? 'Sair' : 'Tela Cheia'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mirror Grid Display */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {filteredRooms.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-zinc-800 bg-black/40 text-zinc-400 space-y-3">
              <Trophy className="w-12 h-12 text-amber-500/50 animate-bounce" />
              <p className="font-mono text-sm">
                Nenhuma sala ativa cadastrada no momento. Crie uma sala no Painel ADM do Professor para iniciar a projeção ao vivo!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRooms.map((room) => {
                const state = roomStates[room.code] || {};
                const monitored = state.monitored;
                const settings = state.settings;
                const rolesDetails = state.takenRolesDetails || {};
                const activeRoleCount = Object.keys(rolesDetails).length;

                const isPcr = state.patientDeceased || (monitored && monitored.spo2 > 0 && monitored.spo2 <= 35);
                const isFinished = Boolean(state.teamResult || state.sessionStatus === 'completed');

                return (
                  <div
                    key={room.code}
                    className={`rounded-2xl border-2 p-4 flex flex-col justify-between gap-3 transition-all relative overflow-hidden ${
                      isPcr
                        ? 'bg-rose-950/70 border-rose-500 shadow-lg shadow-rose-950/80 animate-pulse'
                        : isFinished
                        ? 'bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-950/60'
                        : isHighContrast
                        ? 'bg-[#0a0d16] border-cyan-500/80 shadow-md shadow-cyan-950/40'
                        : 'bg-[#0f1322] border-zinc-800'
                    }`}
                  >
                    {/* Header: PIN & Room Title */}
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500 text-black font-mono font-black text-xs shadow-md">
                          PIN: {room.code}
                        </span>
                        <div>
                          <h3 className="font-display font-black text-sm text-white truncate max-w-[180px]">
                            {room.title}
                          </h3>
                          <span className="text-[10px] font-mono text-cyan-300 block">
                            Modo: {room.mode === 'team' ? 'Equipe UTI' : 'Individual'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-xs font-mono font-bold text-zinc-200">
                          {activeRoleCount}
                        </span>
                      </div>
                    </div>

                    {/* Team Members List */}
                    <div className="grid grid-cols-3 gap-1 font-mono text-[9.5px]">
                      <div className={`p-1.5 rounded-lg border text-center ${rolesDetails['Fisioterapeuta Respiratório'] ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold' : 'bg-black/40 border-zinc-800 text-zinc-500'}`}>
                        <span>🫁 Fisio</span>
                        <span className="block truncate opacity-80">{rolesDetails['Fisioterapeuta Respiratório']?.author || 'Vago'}</span>
                      </div>

                      <div className={`p-1.5 rounded-lg border text-center ${rolesDetails['Médico Intensivista'] ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold' : 'bg-black/40 border-zinc-800 text-zinc-500'}`}>
                        <span>🩺 Médico</span>
                        <span className="block truncate opacity-80">{rolesDetails['Médico Intensivista']?.author || 'Vago'}</span>
                      </div>

                      <div className={`p-1.5 rounded-lg border text-center ${rolesDetails['Enfermeiro(a) UTI'] ? 'bg-purple-950/80 border-purple-500 text-purple-300 font-bold' : 'bg-black/40 border-zinc-800 text-zinc-500'}`}>
                        <span>💊 Enferm.</span>
                        <span className="block truncate opacity-80">{rolesDetails['Enfermeiro(a) UTI']?.author || 'Vago'}</span>
                      </div>
                    </div>

                    {/* Vitals Telemetry Monitor Card */}
                    {monitored ? (
                      <div className="p-3 rounded-xl bg-black/80 border border-zinc-800 space-y-2">
                        <div className="grid grid-cols-3 gap-2 font-mono text-center">
                          {/* SpO2 */}
                          <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40">
                            <span className="text-[9px] text-cyan-400 block font-bold">SpO₂</span>
                            <span className={`text-xl font-black ${monitored.spo2 <= 88 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`}>
                              {monitored.spo2}%
                            </span>
                          </div>

                          {/* PIP */}
                          <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-500/40">
                            <span className="text-[9px] text-amber-400 block font-bold">PIP</span>
                            <span className="text-xl font-black text-amber-300">
                              {monitored.peakPressure}
                            </span>
                          </div>

                          {/* Vte */}
                          <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40">
                            <span className="text-[9px] text-emerald-400 block font-bold">Vte</span>
                            <span className="text-xl font-black text-emerald-300">
                              {monitored.vte}
                            </span>
                          </div>
                        </div>

                        {/* Secondary Vitals Row */}
                        <div className="flex items-center justify-between text-[10.5px] font-mono border-t border-zinc-800/80 pt-1.5 px-1 text-zinc-300">
                          <span>PaO₂: <strong className="text-cyan-300">{monitored.pao2}</strong></span>
                          <span>PaCO₂: <strong className="text-amber-300">{monitored.paco2}</strong></span>
                          <span>pH: <strong className="text-purple-300">{monitored.ph?.toFixed(2)}</strong></span>
                          <span>FC: <strong className="text-rose-400">{monitored.heartRate} bpm</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-black/40 border border-zinc-800 text-center font-mono text-xs text-zinc-500">
                        Aguardando início da transmissão de telemetria...
                      </div>
                    )}

                    {/* Ventilator Settings Preview */}
                    {settings && (
                      <div className="flex items-center justify-between text-[10px] font-mono bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 text-zinc-300">
                        <span>Modo: <strong className="text-cyan-400">{settings.mode}</strong></span>
                        <span>FiO₂: <strong className="text-cyan-400">{settings.fio2}%</strong></span>
                        <span>PEEP: <strong className="text-cyan-400">{settings.peep}</strong></span>
                        <span>Vt: <strong className="text-cyan-400">{settings.tidalVolume || '-'}</strong></span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 font-mono text-[10px]">
                      {isPcr ? (
                        <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold animate-pulse flex items-center gap-1">
                          <AlertOctagon className="w-3 h-3" /> 🚨 PARADA CARDIACA ATIVA
                        </span>
                      ) : isFinished ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> SESSÃO CONCLUÍDA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-bold flex items-center gap-1">
                          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" /> SIMULAÇÃO EM ANDAMENTO
                        </span>
                      )}

                      {state.senderAuthor && (
                        <span className="text-zinc-400 text-[9px]">
                          Última ação: {state.senderAuthor} ({state.senderRole})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
