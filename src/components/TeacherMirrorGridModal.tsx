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
  currentSimulatorData?: {
    settings: any;
    monitored: any;
    patient: any;
    caseTitle?: string;
  };
}

export const TeacherMirrorGridModal: React.FC<TeacherMirrorGridModalProps> = ({
  isOpen,
  onClose,
  currentSimulatorData,
}) => {
  const { isLight } = useTheme();
  const [rooms, setRooms] = useState<KahootRoom[]>([]);
  const [roomStates, setRoomStates] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isHighContrast, setIsHighContrast] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showDemoMock, setShowDemoMock] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load immediately from local cache
    const initialRooms = localDatabase.getRooms();
    if (initialRooms && initialRooms.length > 0) {
      setRooms(initialRooms);
    }

    // Fetch cloud rooms
    localDatabase.fetchCloudRooms().then((fetchedRooms) => {
      if (fetchedRooms && fetchedRooms.length > 0) {
        setRooms(fetchedRooms);
      }
    });

    // Subscribe to rooms updates
    const unsubRooms = localDatabase.subscribeRooms((updatedRooms) => {
      if (updatedRooms && updatedRooms.length > 0) {
        setRooms(updatedRooms);
      }
    });

    return () => unsubRooms();
  }, [isOpen]);

  // Subscribe to live states of all active rooms (both room-level and team subcollections)
  useEffect(() => {
    if (!isOpen || rooms.length === 0) return;

    const unsubs: (() => void)[] = [];

    rooms.forEach((room) => {
      // 1. Subscribe to standard room state
      const unsubRoom = localDatabase.subscribeRoomState(room.code, (state) => {
        if (state) {
          setRoomStates((prev) => ({
            ...prev,
            [room.code]: {
              ...(prev[room.code] || {}),
              ...state,
            },
          }));
        }
      });
      unsubs.push(unsubRoom);

      // 2. Also listen to known team names or common team subcollections
      const commonTeams = ['Equipe Alfa', 'Equipe Beta', 'Equipe Gamma', 'Equipe UTI', 'Equipe 1', 'Equipe 2'];
      commonTeams.forEach((tName) => {
        const unsubTeam = localDatabase.subscribeRoomState(
          room.code,
          (state) => {
            if (state && (state.monitored || state.settings || state.takenRolesDetails)) {
              setRoomStates((prev) => ({
                ...prev,
                [room.code]: {
                  ...(prev[room.code] || {}),
                  ...state,
                },
              }));
            }
          },
          tName
        );
        unsubs.push(unsubTeam);
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
            ? 'bg-[#0f1117] border-amber-400 text-white'
            : isLight
            ? 'bg-slate-100 border-slate-300 text-slate-900'
            : 'bg-[#070912] border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Top Projection Bar */}
        <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          isHighContrast
            ? 'bg-slate-900 border-amber-400/50 text-white'
            : 'bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-cyan-500/40 text-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl flex items-center justify-center ${
              isHighContrast
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
            }`}>
              <Tv className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-black uppercase tracking-widest ${
                  isHighContrast ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  MODO ESPELHO DOCENTE • PROJETOR & TV DA SALA
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  TEMPO REAL (5Hz)
                </span>
              </div>
              <h2 className="text-lg font-display font-black text-white">
                Grade de Telemetria Multidisciplinar — Monitoramento de Turmas ao Vivo
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
              title="Alternar Modo Alto Contraste para Data-Show / Projetores fracos"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isHighContrast ? 'Contraste Data-Show: ON' : 'Contraste Data-Show: OFF'}</span>
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
        <div className={`p-4 overflow-y-auto flex-1 space-y-4 ${
          isHighContrast ? 'bg-[#090b10]' : ''
        }`}>
          {filteredRooms.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-zinc-800 bg-black/40 text-zinc-400 space-y-3">
              <Trophy className="w-12 h-12 text-amber-500/50 animate-bounce" />
              <p className="font-mono text-sm max-w-md">
                Nenhuma sala ativa encontrada no momento.
              </p>
              <button
                type="button"
                onClick={() => {
                  const sampleRoom: KahootRoom = {
                    code: 'DEMO-UTI',
                    title: 'Turma A • Admissão SDRA Grave',
                    caseId: 'admissao-uti-zero-sdra',
                    timeLimitMinutes: 10,
                    createdAt: Date.now(),
                    active: true,
                    professorName: 'Prof. Orientador',
                    mode: 'team',
                  };
                  localDatabase.createRoom(sampleRoom);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs cursor-pointer shadow-md"
              >
                + Gerar Sala de Demonstração para Projeção
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRooms.map((room) => {
                const state = roomStates[room.code] || {};
                // If cloud state has monitored vitals, use them; otherwise if current simulator is active and matches, mirror it
                const monitored = state.monitored || (currentSimulatorData?.monitored);
                const settings = state.settings || (currentSimulatorData?.settings);
                const rolesDetails = state.takenRolesDetails || {};
                const activeRoleCount = Object.keys(rolesDetails).length;

                const isPcr = state.patientDeceased || (monitored && monitored.spo2 > 0 && monitored.spo2 <= 35);
                const isFinished = Boolean(state.teamResult || state.sessionStatus === 'completed');

                return (
                  <div
                    key={room.code}
                    className={`rounded-2xl border-2 p-4 flex flex-col justify-between gap-3 transition-all relative overflow-hidden ${
                      isPcr
                        ? 'bg-rose-950/80 border-rose-500 shadow-xl shadow-rose-950/90 animate-pulse'
                        : isFinished
                        ? 'bg-emerald-950/70 border-emerald-500 shadow-xl shadow-emerald-950/70'
                        : isHighContrast
                        ? 'bg-[#121622] border-amber-400/80 shadow-lg shadow-black/80'
                        : 'bg-[#0f1322] border-zinc-800'
                    }`}
                  >
                    {/* Header: PIN & Room Title */}
                    <div className="flex items-center justify-between border-b border-zinc-700/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs shadow-md ${
                          isHighContrast ? 'bg-amber-400 text-slate-950' : 'bg-cyan-500 text-black'
                        }`}>
                          PIN: {room.code}
                        </span>
                        <div>
                          <h3 className="font-display font-black text-sm text-white truncate max-w-[180px]">
                            {room.title}
                          </h3>
                          <span className={`text-[10px] font-mono block ${
                            isHighContrast ? 'text-amber-300 font-bold' : 'text-cyan-300'
                          }`}>
                            Modo: {room.mode === 'team' ? 'Equipe UTI' : 'Individual'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 border border-zinc-700">
                        <Users className="w-3.5 h-3.5 text-zinc-300" />
                        <span className="text-xs font-mono font-black text-white">
                          {activeRoleCount} alunos
                        </span>
                      </div>
                    </div>

                    {/* Team Members List */}
                    <div className="grid grid-cols-3 gap-1 font-mono text-[9.5px]">
                      <div className={`p-1.5 rounded-lg border text-center ${rolesDetails['Fisioterapeuta Respiratório'] ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 font-bold' : 'bg-black/50 border-zinc-800 text-zinc-500'}`}>
                        <span className="block font-bold">🫁 Fisio</span>
                        <span className="block truncate text-[10px]">{rolesDetails['Fisioterapeuta Respiratório']?.author || (activeRoleCount > 0 ? 'Vago' : 'Conectando...')}</span>
                      </div>

                      <div className={`p-1.5 rounded-lg border text-center ${rolesDetails['Médico Intensivista'] ? 'bg-indigo-950/90 border-indigo-400 text-indigo-200 font-bold' : 'bg-black/50 border-zinc-800 text-zinc-500'}`}>
                        <span className="block font-bold">🩺 Médico</span>
                        <span className="block truncate text-[10px]">{rolesDetails['Médico Intensivista']?.author || (activeRoleCount > 0 ? 'Vago' : 'Conectando...')}</span>
                      </div>

                      <div className={`p-1.5 rounded-lg border text-center ${rolesDetails['Enfermeiro(a) UTI'] ? 'bg-purple-950/90 border-purple-400 text-purple-200 font-bold' : 'bg-black/50 border-zinc-800 text-zinc-500'}`}>
                        <span className="block font-bold">💊 Enferm.</span>
                        <span className="block truncate text-[10px]">{rolesDetails['Enfermeiro(a) UTI']?.author || (activeRoleCount > 0 ? 'Vago' : 'Conectando...')}</span>
                      </div>
                    </div>

                    {/* Vitals Telemetry Monitor Card */}
                    {monitored ? (
                      <div className={`p-3 rounded-xl border space-y-2 ${
                        isHighContrast ? 'bg-black border-zinc-700' : 'bg-black/80 border-zinc-800'
                      }`}>
                        <div className="grid grid-cols-3 gap-2 font-mono text-center">
                          {/* SpO2 */}
                          <div className={`p-2 rounded-lg border ${
                            monitored.spo2 <= 88
                              ? 'bg-rose-950 border-rose-500'
                              : isHighContrast
                              ? 'bg-slate-900 border-cyan-400'
                              : 'bg-cyan-950/60 border-cyan-500/50'
                          }`}>
                            <span className="text-[10px] text-cyan-400 block font-black">SpO₂</span>
                            <span className={`text-2xl font-black ${
                              monitored.spo2 <= 88 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'
                            }`}>
                              {monitored.spo2}%
                            </span>
                          </div>

                          {/* PIP */}
                          <div className={`p-2 rounded-lg border ${
                            isHighContrast ? 'bg-slate-900 border-amber-400' : 'bg-amber-950/60 border-amber-500/50'
                          }`}>
                            <span className="text-[10px] text-amber-400 block font-black">PIP (Pico)</span>
                            <span className="text-2xl font-black text-amber-300">
                              {monitored.peakPressure}
                            </span>
                          </div>

                          {/* Vte */}
                          <div className={`p-2 rounded-lg border ${
                            isHighContrast ? 'bg-slate-900 border-emerald-400' : 'bg-emerald-950/60 border-emerald-500/50'
                          }`}>
                            <span className="text-[10px] text-emerald-400 block font-black">Vte (mL)</span>
                            <span className="text-2xl font-black text-emerald-300">
                              {monitored.vte}
                            </span>
                          </div>
                        </div>

                        {/* Secondary Vitals Row */}
                        <div className="flex items-center justify-between text-xs font-mono border-t border-zinc-800 pt-2 px-1 text-zinc-200 font-bold">
                          <span>PaO₂: <strong className="text-cyan-300">{monitored.pao2}</strong></span>
                          <span>PaCO₂: <strong className="text-amber-300">{monitored.paco2}</strong></span>
                          <span>pH: <strong className="text-purple-300">{typeof monitored.ph === 'number' ? monitored.ph.toFixed(2) : monitored.ph}</strong></span>
                          <span>FC: <strong className="text-rose-400">{monitored.heartRate} bpm</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-black/60 border border-zinc-800 text-center font-mono text-xs text-zinc-400 space-y-1">
                        <Activity className="w-4 h-4 mx-auto text-cyan-400 animate-pulse" />
                        <span className="block font-bold">Aguardando entrada da equipe ou início de ventilação</span>
                        <span className="text-[10px] opacity-75">Os monitores aparecem aqui automaticamente assim que os alunos conectam</span>
                      </div>
                    )}

                    {/* Ventilator Settings Preview */}
                    {settings && (
                      <div className="flex items-center justify-between text-[11px] font-mono bg-zinc-900 p-2 rounded-xl border border-zinc-800 text-zinc-200">
                        <span>Modo: <strong className="text-cyan-400">{settings.mode}</strong></span>
                        <span>FiO₂: <strong className="text-cyan-400">{settings.fio2}%</strong></span>
                        <span>PEEP: <strong className="text-cyan-400">{settings.peep}</strong></span>
                        <span>Vt: <strong className="text-cyan-400">{settings.tidalVolume || '-'}</strong></span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 font-mono text-[10px]">
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
                          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" /> TRANSMISSÃO ATIVA
                        </span>
                      )}

                      {state.senderAuthor && (
                        <span className="text-zinc-400 text-[9px] truncate max-w-[130px]">
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
