import React, { useState } from 'react';
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
} from 'lucide-react';

interface KahootPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'student' | 'teacher' | null;
  onStartKahootSession: (
    studentName: string,
    room: KahootRoom,
    selectedCase: ClinicalCase
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
  const [studentName, setStudentName] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Professor Form
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(5);
  const [professorName, setProfessorName] = useState('');
  const [roomCreatedSuccess, setRoomCreatedSuccess] = useState('');

  if (!isOpen) return null;

  const cases = localDatabase.getClinicalCases();
  const rooms = localDatabase.getRooms();
  const results = localDatabase.getResults();

  const handleEnterRoom = async (roomToJoin?: KahootRoom) => {
    if (!studentName.trim()) {
      setErrorMsg('Por favor, informe seu nome antes de iniciar o desafio.');
      return;
    }

    const room = roomToJoin || localDatabase.getRoomByCode(inputRoomCode);
    if (!room) {
      setErrorMsg(`Código de sala "${inputRoomCode}" não encontrado. Verifique com seu professor.`);
      return;
    }

    const targetCase = cases.find((c) => c.id === room.caseId) || cases[0];
    setErrorMsg('');
    await localDatabase.registerStudent(studentName, room.code);
    onStartKahootSession(studentName, room, targetCase);
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
                  onChange={(e) => setStudentName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#080a14] border-zinc-700 text-zinc-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-2">
                  2. Digite o Código da Sala do Professor:
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
                <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                  Título do Desafio / Turma:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Prova Prática: Admissão de SDRA em VCV"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                    isLight ? 'bg-white border-slate-300' : 'bg-[#080a14] border-zinc-700 text-zinc-100'
                  }`}
                />
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
                <span className="text-[10px] font-mono text-indigo-400">
                  Total: {results.length} respostas
                </span>
              </div>

              {results.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                  Nenhuma simulação concluída até o momento. Registre um aluno e conclua um desafio!
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((res) => (
                    <div
                      key={res.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0e1122] border-indigo-900/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-display font-black text-indigo-300">
                            {res.studentName}
                          </span>
                          <span className="px-1.5 py-0.2 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded text-[9px] font-mono font-bold">
                            Sala: {res.roomCode}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-zinc-400">
                          {res.caseTitle} • Concluído em {res.completionTimeSeconds}s
                        </p>
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
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
