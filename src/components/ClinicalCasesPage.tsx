import React, { useState, useEffect } from 'react';
import {
  ClinicalCase,
  MonitoredData,
  VentilatorSettings,
  PatientParameters,
} from '../types/ventilation';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../context/ThemeContext';
import { educationalStorage, QuizQuestionItem } from '../services/educationalStorage';
import {
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Play,
  Award,
  Sparkles,
  Stethoscope,
  Activity,
  ArrowLeft,
  ChevronRight,
  Sliders,
  User,
  Heart,
  Droplet,
  Flame,
  HelpCircle,
  FileText,
  Target,
  ShieldAlert,
  Wind,
  BookOpenCheck,
  RefreshCw,
  Lightbulb,
  Check,
  X,
  GraduationCap,
} from 'lucide-react';

interface ClinicalCasesPageProps {
  onBackToSimulator: () => void;
  onLoadCaseInSimulator: (selectedCase: ClinicalCase) => void;
  currentMonitored: MonitoredData;
  currentSettings: VentilatorSettings;
  currentPatient: PatientParameters;
  initialTab?: 'cases' | 'quiz';
}

export const ClinicalCasesPage: React.FC<ClinicalCasesPageProps> = ({
  onBackToSimulator,
  onLoadCaseInSimulator,
  currentMonitored,
  currentSettings,
  currentPatient,
  initialTab = 'cases',
}) => {
  const { isLight } = useTheme();

  // Active Tab: 'cases' or 'quiz'
  const [activeTab, setActiveTab] = useState<'cases' | 'quiz'>(initialTab);

  // --- Clinical Cases State ---
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // --- Quiz State ---
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionItem[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizCategoryFilter, setQuizCategoryFilter] = useState<string>('all');

  useEffect(() => {
    const allCases = educationalStorage.getAllClinicalCases();
    setCases(allCases);
    if (allCases.length > 0) {
      setSelectedCaseId((prev) => (allCases.find((c) => c.id === prev) ? prev : allCases[0].id));
    }

    const allQuiz = educationalStorage.getAllQuizQuestions();
    setQuizQuestions(allQuiz);
  }, []);

  // Filtered Cases
  const caseCategories = ['all', ...Array.from(new Set(cases.map((c) => c.category)))];
  const filteredCases =
    selectedCategory === 'all'
      ? cases
      : cases.filter((c) => c.category === selectedCategory);
  const currentCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  // Filtered Quiz Questions
  const filteredQuestions =
    quizCategoryFilter === 'all'
      ? quizQuestions
      : quizQuestions.filter((q) => q.category === quizCategoryFilter);

  const currentQ = filteredQuestions[currentQuizIndex] || filteredQuestions[0];

  // Goals evaluation for active case in simulator
  const isCurrentActiveCase = currentCase && currentPatient.name === currentCase.patientProfile.name;
  const goalsStatus = currentCase
    ? currentCase.goals.map((g) => ({
        goal: g,
        isMet:
          isCurrentActiveCase && typeof g.isMet === 'function'
            ? g.isMet(currentMonitored, currentSettings, currentPatient)
            : false,
      }))
    : [];

  const allGoalsMet = isCurrentActiveCase && goalsStatus.length > 0 && goalsStatus.every((g) => g.isMet);
  const metCount = goalsStatus.filter((g) => g.isMet).length;

  const handleStartCase = () => {
    if (!currentCase) return;
    audioEngine.playConfirmBeep();
    onLoadCaseInSimulator(currentCase);
  };

  // Quiz Handlers
  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
    audioEngine.playClick(650);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !currentQ) return;
    setIsAnswerSubmitted(true);
    if (selectedOption === currentQ.correctIndex) {
      audioEngine.playConfirmBeep();
      setQuizScore((prev) => prev + 1);
    } else {
      audioEngine.triggerAlarmPattern('medium');
    }
  };

  const handleNextQuestion = () => {
    audioEngine.playClick(750);
    if (currentQuizIndex < filteredQuestions.length - 1) {
      setCurrentQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    audioEngine.playConfirmBeep();
    const allQuiz = educationalStorage.getAllQuizQuestions();
    setQuizQuestions(allQuiz);
    setCurrentQuizIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setQuizScore(0);
    setQuizFinished(false);
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 select-none ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#06080e] text-zinc-100'
      }`}
    >
      {/* 1. Global Navigation Top Header */}
      <header
        className={`sticky top-0 z-30 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 shadow-md backdrop-blur-md transition-colors ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-900'
            : 'bg-[#0a0d14]/95 border-zinc-800 text-zinc-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer shadow-sm ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
            }`}
            title="Voltar ao Ventilador Mecânico"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-500" />
            <span>Voltar ao Ventilador</span>
          </button>

          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl border ${
              isLight
                ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                : 'bg-cyan-950/80 border-cyan-700/50 text-cyan-400'
            }`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-display font-black leading-tight flex items-center gap-2">
                Centro de Estudo & Avaliação do Aluno
              </h1>
              <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Treinamento prático de tomada de decisão e fixação de conceitos
              </p>
            </div>
          </div>
        </div>

        {/* 2 Main Selection Buttons: Casos Clínicos & Quiz de Avaliação */}
        <div className={`flex items-center p-1 rounded-2xl border ${
          isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#10131d] border-zinc-800'
        }`}>
          <button
            onClick={() => {
              setActiveTab('cases');
              audioEngine.playClick(800);
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
              activeTab === 'cases'
                ? isLight
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                : isLight
                ? 'text-slate-700 hover:text-slate-900'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Casos Clínicos ({cases.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('quiz');
              audioEngine.playClick(850);
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
              activeTab === 'quiz'
                ? isLight
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                : isLight
                ? 'text-slate-700 hover:text-slate-900'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpenCheck className="w-4 h-4" />
            <span>Quiz de Fixação ({quizQuestions.length})</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* TAB 1: CASOS CLÍNICOS                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'cases' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Cases List & Category Filters */}
          <div className="lg:col-span-4 space-y-4">
            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1.5">
              {caseCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                    selectedCategory === cat
                      ? isLight
                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : isLight
                      ? 'bg-white hover:bg-slate-200 text-slate-600 border-slate-300'
                      : 'bg-[#0e111a] hover:bg-[#161a27] text-zinc-400 border-zinc-800'
                  }`}
                >
                  {cat === 'all' ? 'Todos os Casos' : cat}
                </button>
              ))}
            </div>

            {/* Cases Card List */}
            <div className="space-y-2.5 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
              {filteredCases.map((c) => {
                const isSelected = c.id === selectedCaseId;
                const isSimulated = currentPatient.name === c.patientProfile.name;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCaseId(c.id);
                      audioEngine.playClick(600);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? isLight
                          ? 'bg-white border-cyan-500 shadow-md ring-2 ring-cyan-400/20'
                          : 'bg-[#0f1422] border-cyan-500 shadow-lg ring-1 ring-cyan-500/40'
                        : isLight
                        ? 'bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-[#0a0d15] hover:bg-[#121624] border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                            c.difficulty === 'Fácil'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : c.difficulty === 'Médio'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}>
                            {c.difficulty}
                          </span>
                          <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-400'}`}>
                            {c.category}
                          </span>
                        </div>
                        <h2 className={`text-sm font-display font-bold ${
                          isSelected ? (isLight ? 'text-cyan-900' : 'text-cyan-200') : (isLight ? 'text-slate-800' : 'text-zinc-200')
                        }`}>
                          {c.title}
                        </h2>
                      </div>
                      <ChevronRight className={`w-4 h-4 mt-1 transition-transform ${
                        isSelected ? 'text-cyan-500 translate-x-0.5' : 'text-zinc-600'
                      }`} />
                    </div>

                    <p className={`text-xs mt-1.5 line-clamp-2 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      {c.clinicalHistory}
                    </p>

                    {isSimulated && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-bold">
                        <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                        <span>Atualmente em simulação no ventilador</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Case Details & Launch Button */}
          {currentCase && (
            <div className={`lg:col-span-8 rounded-2xl border p-5 sm:p-6 space-y-6 shadow-xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0d15] border-zinc-800'
            }`}>
              {/* Header Info */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4 border-zinc-200 dark:border-zinc-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-500 uppercase tracking-wider">
                      {currentCase.category} • Nível {currentCase.difficulty}
                    </span>
                    {isCurrentActiveCase && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        Ativo no Simulador
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-display font-black text-slate-900 dark:text-white">
                    {currentCase.title}
                  </h2>
                </div>

                <button
                  onClick={handleStartCase}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs transition-all cursor-pointer shadow-lg shadow-cyan-600/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Carregar no Ventilador</span>
                </button>
              </div>

              {/* Patient Demographics & Profile */}
              <div className={`p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#101420] border-zinc-800 text-zinc-300'
              }`}>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Paciente</span>
                  <strong>{currentCase.patientProfile.name}</strong> ({currentCase.patientProfile.age}a, {currentCase.patientProfile.gender === 'male' ? 'Masc' : 'Fem'})
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Altura / Peso</span>
                  <strong>{currentCase.patientProfile.heightCm} cm</strong> / <strong>{currentCase.patientProfile.weightKg} kg</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Mecânica Pulmonar</span>
                  <span>Cst: <strong>{currentCase.patientProfile.compliance}</strong> | Raw: <strong>{currentCase.patientProfile.resistance}</strong></span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Vias Aéreas</span>
                  <span>Tubo TOT <strong>{currentCase.patientProfile.tubeDiameter}mm</strong></span>
                </div>
              </div>

              {/* History & Physical Exam */}
              <div className="space-y-3">
                <h3 className="text-sm font-display font-bold flex items-center gap-2 text-cyan-400">
                  <FileText className="w-4 h-4" />
                  <span>História Clínica & Diagnóstico</span>
                </h3>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  {currentCase.clinicalHistory}
                </p>

                {currentCase.physicalExam && (
                  <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#0d101a] border-zinc-800/80 text-zinc-300'
                  }`}>
                    <strong className="text-[11px] uppercase tracking-wider text-cyan-500 font-mono block">
                      Exame Físico & Sinais Vitais
                    </strong>
                    <p>{currentCase.physicalExam}</p>
                  </div>
                )}
              </div>

              {/* Initial Gasometry & Therapeutic Goals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Initial Gasometry */}
                {currentCase.initialGasometry && (
                  <div className={`p-4 rounded-xl border space-y-2 ${
                    isLight ? 'bg-rose-50/50 border-rose-200' : 'bg-[#150e18] border-rose-900/40'
                  }`}>
                    <h4 className="text-xs font-display font-bold flex items-center gap-1.5 text-rose-500">
                      <Droplet className="w-4 h-4" />
                      <span>Gasometria Arterial de Entrada</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">pH</span>
                        <strong className="text-rose-400">{currentCase.initialGasometry.pH.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">PaCO₂</span>
                        <strong className="text-rose-400">{currentCase.initialGasometry.paco2} mmHg</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">PaO₂</span>
                        <strong className="text-rose-400">{currentCase.initialGasometry.pao2} mmHg</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">HCO₃⁻</span>
                        <strong className="text-rose-400">{currentCase.initialGasometry.hco3} mEq/L</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">SatO₂</span>
                        <strong className="text-rose-400">{currentCase.initialGasometry.sato2}%</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">PaO₂/FiO₂</span>
                        <strong className="text-rose-400">{currentCase.initialGasometry.pao2Fio2Ratio}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Goals */}
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#0d1614] border-emerald-900/40'
                }`}>
                  <h4 className="text-xs font-display font-bold flex items-center justify-between text-emerald-500">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-4 h-4" />
                      <span>Metas de Ventilação Protetora</span>
                    </span>
                    {isCurrentActiveCase && (
                      <span className="text-[10px] font-mono">
                        {metCount}/{goalsStatus.length} alcançadas
                      </span>
                    )}
                  </h4>
                  <div className="space-y-1.5">
                    {currentCase.goals.map((g, idx) => {
                      const status = goalsStatus[idx];
                      return (
                        <div key={idx} className="flex items-start gap-2 text-xs font-mono">
                          {isCurrentActiveCase ? (
                            status?.isMet ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            )
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          )}
                          <span className={status?.isMet ? 'text-emerald-300 font-bold' : isLight ? 'text-slate-700' : 'text-zinc-300'}>
                            {g.description}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Key Learning Points */}
              {currentCase.keyLearningPoints && currentCase.keyLearningPoints.length > 0 && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isLight ? 'bg-cyan-50/50 border-cyan-200' : 'bg-[#0c121e] border-cyan-900/40'
                }`}>
                  <h4 className="text-xs font-display font-bold flex items-center gap-1.5 text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Pontos-Chave de Aprendizado</span>
                  </h4>
                  <ul className="space-y-1 text-xs list-disc list-inside text-zinc-300 dark:text-zinc-300">
                    {currentCase.keyLearningPoints.map((pt, idx) => (
                      <li key={idx} className={isLight ? 'text-slate-700' : 'text-zinc-300'}>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUIZ DE AVALIAÇÃO & FIXAÇÃO                                         */}
      {/* ========================================================================= */}
      {activeTab === 'quiz' && (
        <div className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Quiz Top Status & Category Filter */}
          <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-md ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0a0d15] border-zinc-800'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl border ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/60 border-emerald-600/50 text-emerald-400'
              }`}>
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  Quiz Interativo de Fisioterapia & Terapia Intensiva
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  {filteredQuestions.length} questões disponíveis no banco
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRestartQuiz}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          {!quizFinished && currentQ ? (
            <div className={`p-6 rounded-2xl border space-y-5 shadow-xl ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0d15] border-zinc-800 text-zinc-100'
            }`}>
              {/* Progress & Category */}
              <div className="flex items-center justify-between text-xs font-mono border-b pb-3 border-zinc-200 dark:border-zinc-800">
                <span className="font-bold text-emerald-500 uppercase tracking-wider">
                  Questão {currentQuizIndex + 1} de {filteredQuestions.length} • {currentQ.category}
                </span>
                <span className={isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'}>
                  Acertos: <strong className="text-emerald-400">{quizScore}</strong>
                </span>
              </div>

              {/* Question Text */}
              <div className={`p-4 rounded-xl border text-sm font-display font-bold leading-relaxed ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0f1422] border-zinc-800 text-zinc-100'
              }`}>
                {currentQ.question}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((opt, idx) => {
                  let btnStyle = isLight
                    ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                    : 'bg-[#0e111a] border-zinc-800 hover:bg-[#151926] text-zinc-300';

                  if (selectedOption === idx) {
                    btnStyle = isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                      : 'bg-emerald-950/70 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50';
                  }

                  if (isAnswerSubmitted) {
                    if (idx === currentQ.correctIndex) {
                      btnStyle = isLight
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-900 font-bold'
                        : 'bg-emerald-950/90 border-emerald-400 text-emerald-200 font-bold';
                    } else if (selectedOption === idx && idx !== currentQ.correctIndex) {
                      btnStyle = isLight
                        ? 'bg-rose-100 border-rose-400 text-rose-900 font-bold'
                        : 'bg-rose-950/90 border-rose-500 text-rose-200';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswerSubmitted}
                      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer text-xs font-sans flex items-start gap-3 ${btnStyle}`}
                    >
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5 ${
                        isLight ? 'border-slate-400 text-slate-600' : 'border-zinc-600 text-zinc-400'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Rationale & Explanation */}
              {isAnswerSubmitted && (
                <div className={`p-4 rounded-xl border space-y-1.5 animate-fade-in ${
                  isLight
                    ? 'bg-cyan-50/80 border-cyan-300 text-cyan-950'
                    : 'bg-[#0f1926] border-cyan-700/60 text-cyan-100'
                }`}>
                  <div className={`flex items-center gap-1.5 text-xs font-display font-bold ${
                    isLight ? 'text-cyan-800' : 'text-cyan-300'
                  }`}>
                    <Lightbulb className="w-4 h-4 text-cyan-400" />
                    <span>Racional Clínico & Evidências</span>
                  </div>
                  <p className={`text-xs leading-relaxed font-sans ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                    {currentQ.explanation}
                  </p>
                </div>
              )}

              {/* Submit / Next Question */}
              <div className="flex items-center justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
                {!isAnswerSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                    className={`px-5 py-2.5 rounded-xl font-mono font-bold text-xs transition-all ${
                      selectedOption !== null
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-600/30'
                        : isLight
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    Confirmar Resposta
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs transition-all cursor-pointer shadow-lg shadow-cyan-600/30"
                  >
                    <span>{currentQuizIndex < filteredQuestions.length - 1 ? 'Próxima Questão' : 'Ver Resultado'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Quiz Completed View */
            <div className={`p-8 rounded-2xl border text-center space-y-5 shadow-xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0d15] border-zinc-800'
            }`}>
              <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center mx-auto text-3xl font-mono font-bold ${
                isLight
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
              }`}>
                {Math.round((quizScore / (filteredQuestions.length || 1)) * 100)}%
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-display font-black text-slate-900 dark:text-white">
                  Avaliação Concluída com Sucesso!
                </h3>
                <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Você acertou {quizScore} de {filteredQuestions.length} questões propostas.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleRestartQuiz}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-2 shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refazer Quiz</span>
                </button>

                <button
                  onClick={() => setActiveTab('cases')}
                  className={`px-5 py-2.5 rounded-xl border font-mono font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-2 ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                  }`}
                >
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  <span>Ir para Casos Clínicos</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
