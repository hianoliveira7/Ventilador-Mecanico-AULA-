import React, { useState, useEffect } from 'react';
import { localDatabase, KahootRoom, StudentGameResult } from '../services/localDatabase';
import { ClinicalCase } from '../types/ventilation';
import { useTheme } from '../context/ThemeContext';
import {
  Trophy,
  Play,
  Clock,
  UserCheck,
  Zap,
  PlusCircle,
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  History,
  Users,
  Trash2,
} from 'lucide-react';

interface KahootPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'student' | 'teacher' | null;
  onStartKahootSession: (
    studentName: string,
    room: KahootRoom,
    selectedCase: ClinicalCase,
    teamRole?: string,
    teamName?: string
  ) => void;
}

export const KahootPortalModal: React.FC<KahootPortalModalProps> = ({
  isOpen,
  onClose,
  userRole = 'student',
  onStartKahootSession,
}) => {
  const { isLight } = useTheme();
  const isTeacher = userRole === 'teacher';
  const [activeTab, setActiveTab] = useState<'student' | 'professor' | 'history'>('student');

  // Student Form
  const [studentName, setStudentName] = useState(() => {
    return localStorage.getItem('simulador_student_name') || '';
  });
  const [teamName, setTeamName] = useState(() => {
    return localStorage.getItem('simulador_team_name') || 'Equipe UTI Alfa';
  });
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [teamRole, setTeamRole] = useState('Fisioterapeuta Respiratório');
  const [errorMsg, setErrorMsg] = useState('');

  // Professor Form
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(5);
  const [professorName, setProfessorName] = useState('');
  const [newRoomMode, setNewRoomMode] = useState<'individual' | 'team'>('team');
  const [roomCreatedSuccess, setRoomCreatedSuccess] = useState('');

  const cases = localDatabase.getClinicalCases();
  const [rooms, setRooms] = useState<KahootRoom[]>(() => localDatabase.getRooms());
  const [results, setResults] = useState<StudentGameResult[]>(() => localDatabase.getResults());

  useEffect(() => {
    if (isOpen) {
      const savedName = localStorage.getItem('simulador_student_name');
      if (savedName) {
        setStudentName(savedName);
      }
      setRooms(localDatabase.getRooms());
      setResults(localDatabase.getResults());
      const unsubRooms = localDatabase.subscribeRooms((updated) => setRooms(updated));
      const unsubResults = localDatabase.subscribeResults((updated) => setResults(updated));
      return () => {
        unsubRooms();
        unsubResults();
      };
    }
  }, [isOpen]);

  const handleDeleteRoom = async (code: string) => {
    if (confirm(`Tem certeza que deseja excluir a sala "${code}"?`)) {
      const normalized = code.trim().toUpperCase();
      setRooms((prev) => prev.filter((r) => r.code.toUpperCase() !== normalized));
      await localDatabase.deleteRoom(code);
      setRoomCreatedSuccess(`Sala "${code}" removida com sucesso.`);
    }
  };

  const handleClearAllResults = async () => {
    if (confirm('ATENÇÃO: Deseja apagar todas as pontuações e registros de alunos do Kahoot? Esta ação não pode ser desfeita.')) {
      setResults([]);
      await localDatabase.clearResults();
      setRoomCreatedSuccess('Todas as pontuações foram resetadas com sucesso.');
    }
  };

  if (!isOpen) return null;

  const handleEnterRoom = async (roomToJoin?: KahootRoom) => {
    if (!studentName.trim()) {
      setErrorMsg('Por favor, informe seu nome antes de iniciar o desafio.');
      return;
    }

    let room = roomToJoin || localDatabase.getRoomByCode(inputRoomCode);
    if (!room && inputRoomCode.trim()) {
      room = await localDatabase.getRoomByCodeAsync(inputRoomCode);
    }

    if (!room) {
      setErrorMsg(`Código de sala "${inputRoomCode}" não encontrado. Verifique com seu professor.`);
      return;
    }

    const targetCase = cases.find((c) => c.id === room.caseId) || cases[0];
    setErrorMsg('');
    const effectiveTeamName = room.mode === 'team' || teamName.trim() ? (teamName.trim() || 'Equipe UTI Alfa') : undefined;
    await localDatabase.registerStudent(studentName, room.code, teamRole, effectiveTeamName);
    onStartKahootSession(studentName, room, targetCase, teamRole, effectiveTeamName);
    onClose();
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomCode.trim() || !newRoomTitle.trim() || !selectedCaseId) {
      setErrorMsg('Preencha todos os campos obrigatórios para criar a sala.');
      return;
    }

    const newRoom: KahootRoom = {
      code: newRoomCode.trim().toUpperCase(),
      title: newRoomTitle.trim(),
      caseId: selectedCaseId,
      timeLimitMinutes,
      createdAt: Date.now(),
      active: true,
      professorName: professorName.trim() || 'Prof. Orientador',
      mode: newRoomMode,
    };

    localDatabase.createRoom(newRoom);
    setRoomCreatedSuccess(`Sala "${newRoom.code}" criada com sucesso! Compartilhe o código com os alunos.`);
    setNewRoomCode('');
    setNewRoomTitle('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div
        className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0c16] border-indigo-900/60 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-indigo-600 text-white' : 'bg-[#0f1225] border-indigo-900/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shadow-md font-black">
              <Trophy className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg font-display font-black tracking-wide flex items-center gap-2">
                SIMULADOR KAHOOT VENTI
              </h2>
              <p className="text-xs opacity-85 font-mono">
                Modo Gamificado: Desafios com Tempo Limite, Pontuação e Análise de Erros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className={`flex border-b text-xs font-mono font-bold ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0b0e1b] border-indigo-950'
        }`}>
          <button
            onClick={() => { setActiveTab('student'); setErrorMsg(''); }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'student'
                ? isLight ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 font-black' : 'bg-[#12162b] text-indigo-300 border-b-2 border-indigo-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>ÁREA DO ALUNO (ENTRAR COM PIN)</span>
          </button>
          {isTeacher && (
            <button
              onClick={() => { setActiveTab('professor'); setErrorMsg(''); setRoomCreatedSuccess(''); }}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'professor'
                  ? isLight ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 font-black' : 'bg-[#12162b] text-indigo-300 border-b-2 border-indigo-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>PAINEL DO PROFESSOR (CRIAR SALA)</span>
            </button>
          )}
          <button
            onClick={() => { setActiveTab('history'); setErrorMsg(''); }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? isLight ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 font-black' : 'bg-[#12162b] text-indigo-300 border-b-2 border-indigo-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>RANKING & PLACAR DE LÍDERES</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: STUDENT ENTRY */}
          {activeTab === 'student' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${
                isLight ? 'bg-indigo-50/50 border-indigo-200' : 'bg-[#0f1325] border-indigo-900/40'
              }`}>
                <label className="block text-xs font-mono font-bold uppercase text-indigo-400 mb-1">
                  1. Seu Nome Completo ou Apelido:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Dra. Mariana Silva"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    localStorage.setItem('simulador_student_name', e.target.value);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#080a14] border-zinc-700 text-zinc-100'
                  }`}
                />
              </div>

                {/* Ocultar se não for modo Equipe */}
                {(rooms.find(r => r.code === inputRoomCode)?.mode === 'team') && (
                  <div className={`p-4 rounded-2xl border ${
                    isLight ? 'bg-purple-50/50 border-purple-200' : 'bg-[#150f25] border-purple-900/40'
                  }`}>
                    <label className="block text-xs font-mono font-bold uppercase text-purple-400 mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      2. Nome da Equipe / Grupo:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Equipe UTI Alfa"
                      value={teamName}
                      onChange={(e) => {
                        setTeamName(e.target.value);
                        localStorage.setItem('simulador_team_name', e.target.value);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#080a14] border-zinc-700 text-purple-200'
                      }`}
                    />
                  </div>
                )}

              <div className={`p-4 rounded-2xl border space-y-2 ${
                isLight ? 'bg-indigo-50/50 border-indigo-200' : 'bg-[#0f1325] border-indigo-900/40'
              }`}>
                <label className="block text-xs font-mono font-bold uppercase text-indigo-400">
                  2. Função na Equipe de UTI (Modo Cooperativo):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Fisioterapeuta Respiratório', label: '🫁 Fisioterapeuta' },
                    { id: 'Médico Intensivista', label: '🩺 Médico(a)' },
                    { id: 'Enfermeiro(a) UTI', label: '💊 Enfermeiro(a)' },
                  ].map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setTeamRole(role.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer text-center ${
                        teamRole === role.id
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                          : isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-[#0a0d18] border-zinc-700 text-zinc-300'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-2">
                  3. Digite o Código da Sala do Professor:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: UTI-DESAFIO"
                    value={inputRoomCode}
                    onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-mono text-base font-bold uppercase border tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#080a14] border-zinc-700 text-amber-300'
                    }`}
                  />
                  <button
                    onClick={() => handleEnterRoom()}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-mono font-bold text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>ENTRAR</span>
                  </button>
                </div>
              </div>

              {/* Preset Available Rooms */}
              <div className="pt-2">
                <span className="text-xs font-mono font-bold uppercase text-zinc-400 block mb-2">
                  Ou Escolha uma Sala Aberta / Desafio Ativo:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {rooms.map((room) => {
                    const c = cases.find((item) => item.id === room.caseId);
                    return (
                      <div
                        key={room.code}
                        onClick={() => {
                          setInputRoomCode(room.code);
                          handleEnterRoom(room);
                        }}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-md flex flex-col justify-between ${
                          isLight
                            ? 'bg-white border-slate-200 hover:border-indigo-400'
                            : 'bg-[#0e1122] border-indigo-900/50 hover:border-amber-400/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="px-2 py-0.5 bg-amber-400 text-slate-950 rounded-lg text-[10px] font-mono font-black uppercase">
                            {room.code}
                          </span>
                          <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {room.timeLimitMinutes} min
                          </span>
                        </div>
                        <h4 className="text-xs font-display font-bold mb-1 leading-snug">
                          {room.title}
                        </h4>
                        <p className="text-[10px] font-mono text-zinc-400">
                          {c ? c.title : 'Caso de Ventilação'} • {room.professorName}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFESSOR ROOM CREATOR */}
          {activeTab === 'professor' && (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              {roomCreatedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{roomCreatedSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                    Nome do Professor / Instrutor:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Prof. Dr. Marcelo"
                    value={professorName}
                    onChange={(e) => setProfessorName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                      isLight ? 'bg-white border-slate-300' : 'bg-[#080a14] border-zinc-700 text-zinc-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                    Código Único da Sala (PIN):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: VENT-2026"
                    value={newRoomCode}
                    onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase border focus:outline-none ${
                      isLight ? 'bg-white border-slate-300' : 'bg-[#080a14] border-zinc-700 text-amber-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-amber-400 mb-1">
                  Modo de Trabalho (Formato da Sala):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRoomMode('team')}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      newRoomMode === 'team'
                        ? 'bg-amber-400 border-amber-300 text-slate-950 font-black shadow-md'
                        : isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-[#080a14] border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>👥 TRABALHO EM EQUIPE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomMode('individual')}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      newRoomMode === 'individual'
                        ? 'bg-indigo-600 border-indigo-400 text-white font-black shadow-md'
                        : isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-[#080a14] border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>👤 INDIVIDUAL</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                    Selecione o Caso Clínico:
                  </label>
                  <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                      isLight ? 'bg-white border-slate-300' : 'bg-[#080a14] border-zinc-700 text-zinc-100'
                    }`}
                  >
                    <option value="">-- Escolha um caso --</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                    Tempo Limite por Aluno (Minutos):
                  </label>
                  <select
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                      isLight ? 'bg-white border-slate-300' : 'bg-[#080a14] border-zinc-700 text-zinc-100'
                    }`}
                  >
                    <option value={3}>3 Minutos (Rápido)</option>
                    <option value={5}>5 Minutos (Padrão)</option>
                    <option value={10}>10 Minutos (Detalhado)</option>
                    <option value={15}>15 Minutos (Avançado)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-mono font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>CRIAR SALA DE DESAFIO KAHOOT</span>
              </button>

              {/* Salas Cadastradas pelo Professor */}
              <div className="pt-4 border-t border-inherit space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-zinc-400">
                    Salas Cadastradas ({rooms.length}):
                  </span>
                </div>
                {rooms.length === 0 ? (
                  <p className="text-xs font-mono text-zinc-500 py-1">
                    Nenhuma sala ativa no momento.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rooms.map((r) => (
                      <div
                        key={r.code}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e1122] border-indigo-900/40'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-black text-[10px]">
                              {r.code}
                            </span>
                            <span className="text-xs font-display font-bold truncate">
                              {r.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400 block truncate">
                            {r.timeLimitMinutes} min • {r.professorName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(r.code)}
                          className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-lg border border-rose-900/40 cursor-pointer shrink-0 transition-colors"
                          title="Excluir Sala"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          )}

          {/* TAB 3: HISTORY & RESULTS DATABASE */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  Últimas Submissões Registradas no Banco de Dados:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-indigo-400">
                    Total: {results.length} respostas
                  </span>
                  {isTeacher && results.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllResults}
                      className="px-2.5 py-1 rounded-lg border border-rose-800/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Apagar todas as pontuações e notas do Kahoot"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Zerar Notas</span>
                    </button>
                  )}
                </div>
              </div>

              {results.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                  Nenhuma simulação concluída até o momento. Registre um aluno e conclua um desafio!
                </div>
              ) : (
                <div className="space-y-2">
                  {[...results]
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .map((res, index) => {
                      const rank = index + 1;
                      const rankBadgeColor =
                        rank === 1
                          ? 'bg-amber-400 text-slate-950 font-black border-amber-300'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-900 font-black border-slate-200'
                          : rank === 3
                          ? 'bg-amber-700 text-white font-black border-amber-600'
                          : isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-zinc-800 text-zinc-300 border-zinc-700';

                      return (
                        <div
                          key={`${res.id || 'res'}-${index}`}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                            rank === 1
                              ? isLight ? 'bg-amber-50/90 border-amber-400 shadow-md ring-1 ring-amber-400/50' : 'bg-[#1b170c] border-amber-500/80 shadow-lg'
                              : isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0e1122] border-indigo-900/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-mono text-xs ${rankBadgeColor}`}>
                              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}º`}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                {res.teamName ? (
                                  <>
                                    <span className="text-xs font-display font-black text-amber-300 flex items-center gap-1">
                                      <Users className="w-3.5 h-3.5 text-purple-400 inline" />
                                      GRUPO: {res.teamName}
                                    </span>
                                    <span className="text-[11px] font-mono text-zinc-300">
                                      ({res.studentName})
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs font-display font-black text-indigo-300">
                                    {res.studentName}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.2 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded text-[9px] font-mono font-bold">
                                  Sala: {res.roomCode}
                                </span>
                              </div>
                              <p className="text-[10px] font-mono text-zinc-400">
                                {res.caseTitle} • Concluído em {res.completionTimeSeconds}s
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold font-mono text-amber-400 block">
                              {res.score} / {res.maxScore} Pts ({res.gradePercentage}%)
                            </span>
                            <span className="text-[9px] font-mono text-emerald-400 font-bold block">
                              {res.rankBadge}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
