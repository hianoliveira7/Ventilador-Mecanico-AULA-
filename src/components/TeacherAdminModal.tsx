import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  BookOpen,
  HelpCircle,
  FilePlus,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
  Layers,
  Activity,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import { educationalStorage, QuizQuestionItem } from '../services/educationalStorage';
import { ClinicalCase } from '../types/ventilation';

interface TeacherAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCaseInSimulator?: (clinicalCase: ClinicalCase) => void;
}

export const TeacherAdminModal: React.FC<TeacherAdminModalProps> = ({
  isOpen,
  onClose,
  onLoadCaseInSimulator,
}) => {
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<'quiz' | 'cases' | 'new_quiz' | 'new_case'>('quiz');

  // Quiz Questions state
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Form for New Quiz Question
  const [qQuestion, setQQuestion] = useState('');
  const [qOption0, setQOption0] = useState('');
  const [qOption1, setQOption1] = useState('');
  const [qOption2, setQOption2] = useState('');
  const [qOption3, setQOption3] = useState('');
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  const [qCategory, setQCategory] = useState('Geral');
  const [qDifficulty, setQDifficulty] = useState<'Iniciante' | 'Intermediário' | 'Avançado'>('Intermediário');

  // Form for New Clinical Case
  const [caseTitle, setCaseTitle] = useState('');
  const [caseCategory, setCaseCategory] = useState('SDRA');
  const [caseDifficulty, setCaseDifficulty] = useState<'Iniciante' | 'Intermediário' | 'Avançado'>('Intermediário');
  const [caseDescription, setCaseDescription] = useState('');
  const [caseHistory, setCaseHistory] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState(55);
  const [patientWeight, setPatientWeight] = useState(70);
  const [patientHeight, setPatientHeight] = useState(170);
  const [patientCompliance, setPatientCompliance] = useState(25);
  const [patientResistance, setPatientResistance] = useState(10);
  const [goalDescription1, setGoalDescription1] = useState('Manter Volume Protetor ≤ 6 mL/kg e Pplatô ≤ 30 cmH₂O');
  const [goalDescription2, setGoalDescription2] = useState('Normalizar oxigenação (PaO₂/FiO₂ > 200) com PEEP adequada');

  const loadData = () => {
    setQuestions(educationalStorage.getAllQuizQuestions());
    setCases(educationalStorage.getAllClinicalCases());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSaveQuizQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qQuestion.trim() || !qOption0.trim() || !qOption1.trim()) {
      showFeedback('Preencha o enunciado e pelo menos as alternativas A e B.');
      return;
    }

    const options = [qOption0, qOption1, qOption2, qOption3].filter((opt) => opt.trim() !== '');

    educationalStorage.addQuizQuestion({
      question: qQuestion.trim(),
      options,
      correctIndex: Math.min(qCorrectIndex, options.length - 1),
      explanation: qExplanation.trim() || 'Resposta correta com base nas diretrizes de ventilação mecânica.',
      category: qCategory,
      difficulty: qDifficulty,
    });

    audioEngine.playConfirmBeep();
    showFeedback('Nova questão de Quiz cadastrada com sucesso!');
    // Reset form
    setQQuestion('');
    setQOption0('');
    setQOption1('');
    setQOption2('');
    setQOption3('');
    setQExplanation('');
    setActiveTab('quiz');
    loadData();
  };

  const handleDeleteQuestion = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta questão?')) {
      educationalStorage.deleteQuizQuestion(id);
      audioEngine.playClick(750);
      showFeedback('Questão removida do banco.');
      loadData();
    }
  };

  const handleSaveCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseTitle.trim() || !caseDescription.trim()) {
      showFeedback('Preencha o título e a descrição do caso clínico.');
      return;
    }

    const ibw = Math.round(50 + 0.91 * (patientHeight - 152.4));

    const newCase: ClinicalCase = {
      id: `teacher_case_${Date.now()}`,
      title: caseTitle.trim(),
      category: caseCategory,
      difficulty: caseDifficulty,
      description: caseDescription.trim(),
      clinicalHistory: caseHistory.trim() || caseDescription.trim(),
      physicalExam: 'Tórax simétrico, padrão respiratório acompanhado em ventilação mecânica, hemodinâmica estável.',
      patientProfile: {
        name: patientName.trim() || 'Paciente Cadastrado',
        age: patientAge,
        gender: 'male',
        heightCm: patientHeight,
        actualWeightKg: patientWeight,
        idealBodyWeightKg: ibw,
        compliance: patientCompliance,
        resistance: patientResistance,
        pathology: caseCategory.toLowerCase() as any,
        baselineBicarbonate: 24,
        spontaneousDrive: false,
        spontaneousRate: 0,
        spontaneousEffortPressure: 0,
        spontaneousDutyCycle: 0.33,
        metabolicRateVCO2: 200,
        metabolicRateVO2: 250,
        deadSpaceFraction: 0.35,
        shuntFraction: 15,
        hemoglobin: 12.0,
        bodyTemperature: 37.0,
        secretionsSeverity: 'none',
        circuitLeakPercent: 0,
      },
      initialSettings: {
        mode: 'VCV',
        fio2: 50,
        peep: 8,
        triggerType: 'flow',
        triggerSensitivity: 2.0,
        tidalVolume: Math.round(ibw * 6),
        respiratoryRate: 16,
        flowWaveform: 'decelerating',
        inspiratoryFlow: 60,
        inspiratoryPausePercent: 10,
        inspiratoryPressure: 18,
        inspiratoryTimePCV: 0.9,
        pressureRiseTime: 0.1,
        pressureSupport: 10,
        expiratorySensitivity: 25,
        backupApneaTime: 20,
        pHigh: 20,
        pLow: 0,
        tHigh: 3.5,
        tLow: 0.6,
        simvRate: 12,
        simvPs: 10,
      },
      initialABG: {
        ph: 7.32,
        paco2: 50,
        pao2: 68,
        hco3: 24,
        spo2: 91,
        fio2: 50,
      },
      goals: [
        {
          id: 'goal-1',
          description: goalDescription1,
          isMet: (monitored, settings, patient) => {
            const vtPerKg = settings.tidalVolume / (patient.idealBodyWeightKg || 70);
            return vtPerKg <= 6.5 && (monitored.plateauPressure <= 30 || monitored.peakPressure <= 32);
          },
          targetFeedback: 'Ventilação protetora mantida com sucesso.',
        },
        {
          id: 'goal-2',
          description: goalDescription2,
          isMet: (monitored) => monitored.spo2 >= 92 && monitored.drivingPressure <= 15,
          targetFeedback: 'Oxigenação segura sem elevar excessivamente a driving pressure.',
        },
      ],
      teachingPoints: [
        'Avaliar sempre o Peso Predito (IBW) para cálculo de volume corrente protetor.',
        'Monitorar Driving Pressure e manter Pplatô rigorosamente ≤ 30 cmH2O.',
      ],
    };

    educationalStorage.addClinicalCase(newCase);
    audioEngine.playConfirmBeep();
    showFeedback('Novo Caso Clínico cadastrado com sucesso!');
    // Reset
    setCaseTitle('');
    setCaseDescription('');
    setCaseHistory('');
    setActiveTab('cases');
    loadData();
  };

  const handleDeleteCase = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este caso clínico?')) {
      educationalStorage.deleteClinicalCase(id);
      audioEngine.playClick(750);
      showFeedback('Caso clínico removido.');
      loadData();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0b0e18] border-zinc-700 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101424] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl flex items-center justify-center ${
                isLight ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60'
              }`}
            >
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-500">
                  Painel Administrativo do Docente
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    isLight ? 'bg-indigo-50 text-indigo-900 border-indigo-200' : 'bg-[#171c33] text-indigo-300 border-indigo-800'
                  }`}
                >
                  Modo Professor
                </span>
              </div>
              <h3 className="text-base font-display font-black leading-tight mt-0.5">
                Gestão de Conteúdo Pedagógico (Quiz & Casos Clínicos)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-[#151928] hover:bg-[#20253d] text-zinc-300 border-zinc-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div
          className={`px-4 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
            isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-[#0e1220] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'quiz'
                  ? isLight
                    ? 'bg-white text-indigo-900 border-indigo-300 shadow-sm'
                    : 'bg-[#181d33] text-indigo-300 border-indigo-500 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-200/60 border-transparent'
                  : 'text-zinc-400 hover:bg-[#141829] border-transparent'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Banco de Quiz ({questions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('new_quiz')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'new_quiz'
                  ? isLight
                    ? 'bg-white text-indigo-900 border-indigo-300 shadow-sm'
                    : 'bg-[#181d33] text-indigo-300 border-indigo-500 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-200/60 border-transparent'
                  : 'text-zinc-400 hover:bg-[#141829] border-transparent'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Questão</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cases')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'cases'
                  ? isLight
                    ? 'bg-white text-indigo-900 border-indigo-300 shadow-sm'
                    : 'bg-[#181d33] text-indigo-300 border-indigo-500 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-200/60 border-transparent'
                  : 'text-zinc-400 hover:bg-[#141829] border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Casos Clínicos ({cases.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('new_case')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'new_case'
                  ? isLight
                    ? 'bg-white text-indigo-900 border-indigo-300 shadow-sm'
                    : 'bg-[#181d33] text-indigo-300 border-indigo-500 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-200/60 border-transparent'
                  : 'text-zinc-400 hover:bg-[#141829] border-transparent'
              }`}
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Novo Caso Clínico</span>
            </button>
          </div>

          {notification && (
            <span className="text-xs font-mono font-bold text-emerald-500 animate-fadeIn">
              ✓ {notification}
            </span>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* TAB 1: LIST QUIZ QUESTIONS */}
          {activeTab === 'quiz' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-display font-bold">Questões de Avaliação Cadastradas</h4>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Questões que aparecem no Quiz para os alunos responderem e testarem seus conhecimentos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('new_quiz')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Questão</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f1220] border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            #{idx + 1} {q.category || 'Geral'}
                          </span>
                          <span
                            className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${
                              q.createdBy === 'teacher'
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {q.createdBy === 'teacher' ? 'Criada pelo Professor' : 'Padrão do Sistema'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold leading-snug pt-1">{q.question}</p>
                      </div>

                      {q.createdBy === 'teacher' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className={`p-1.5 rounded-lg border text-rose-500 hover:bg-rose-500/10 cursor-pointer ${
                            isLight ? 'border-rose-200' : 'border-rose-900/50'
                          }`}
                          title="Excluir questão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-inherit">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 border ${
                            oIdx === q.correctIndex
                              ? isLight
                                ? 'bg-emerald-50 text-emerald-950 border-emerald-300 font-bold'
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-600 font-bold'
                              : isLight
                              ? 'bg-white text-slate-700 border-slate-200'
                              : 'bg-[#151928] text-zinc-400 border-zinc-800'
                          }`}
                        >
                          <span className="font-bold">{String.fromCharCode(65 + oIdx)})</span>
                          <span className="truncate">{opt}</span>
                          {oIdx === q.correctIndex && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-auto" />}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p className={`text-[10px] font-mono mt-2 pt-1 border-t border-inherit ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        <strong>Justificativa Clínica:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE NEW QUIZ QUESTION */}
          {activeTab === 'new_quiz' && (
            <form onSubmit={handleSaveQuizQuestion} className="space-y-4 max-w-2xl mx-auto">
              <div>
                <h4 className="text-sm font-display font-bold">Cadastrar Nova Questão de Quiz</h4>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Insira o enunciado da questão, as 4 opções e marque qual alternativa é a correta.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono font-bold block mb-1">Categoria / Tema</label>
                    <input
                      type="text"
                      value={qCategory}
                      onChange={(e) => setQCategory(e.target.value)}
                      placeholder="Ex: SDRA, DPOC, Assincronias, Desmame"
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono font-bold block mb-1">Nível de Dificuldade</label>
                    <select
                      value={qDifficulty}
                      onChange={(e) => setQDifficulty(e.target.value as any)}
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                      }`}
                    >
                      <option value="Iniciante">Iniciante</option>
                      <option value="Intermediário">Intermediário</option>
                      <option value="Avançado">Avançado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold block mb-1">Enunciado da Questão *</label>
                  <textarea
                    rows={3}
                    value={qQuestion}
                    onChange={(e) => setQQuestion(e.target.value)}
                    placeholder="Digite a pergunta clínica clara e objetiva..."
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-xs leading-relaxed outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold block">
                    Alternativas de Resposta (Selecione o botão de opção correspondente à correta):
                  </label>

                  {[
                    { val: qOption0, set: setQOption0, letter: 'A', idx: 0 },
                    { val: qOption1, set: setQOption1, letter: 'B', idx: 1 },
                    { val: qOption2, set: setQOption2, letter: 'C', idx: 2 },
                    { val: qOption3, set: setQOption3, letter: 'D', idx: 3 },
                  ].map((item) => (
                    <div key={item.idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQCorrectIndex(item.idx)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs border cursor-pointer transition-all ${
                          qCorrectIndex === item.idx
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-black'
                            : isLight
                            ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                            : 'bg-[#151928] text-zinc-400 border-zinc-700 hover:bg-[#1f253d]'
                        }`}
                        title="Marcar como alternativa correta"
                      >
                        {item.letter}
                      </button>
                      <input
                        type="text"
                        value={item.val}
                        onChange={(e) => item.set(e.target.value)}
                        placeholder={`Alternativa ${item.letter}...`}
                        className={`flex-1 px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                        }`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-mono font-bold block mb-1">
                    Justificativa Clínica / Explicação da Resposta
                  </label>
                  <textarea
                    rows={2}
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                    placeholder="Explicação pedagógica exibida ao aluno após ele responder a questão..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs leading-relaxed outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setActiveTab('quiz')}
                  className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
                    isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-[#151928] text-zinc-300 border-zinc-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Questão</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LIST CLINICAL CASES */}
          {activeTab === 'cases' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-display font-bold">Casos Clínicos e Cenários Cadastrados</h4>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Casos disponíveis na biblioteca de estudo para treinamento dos alunos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('new_case')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Caso Clínico</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cases.map((c) => {
                  const isCustom = c.id.startsWith('teacher_');
                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f1220] border-zinc-800'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            {c.category} • {c.difficulty}
                          </span>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCase(c.id)}
                              className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                              title="Excluir caso clínico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <h5 className="text-xs font-display font-bold">{c.title}</h5>
                        <p className={`text-[11px] leading-relaxed line-clamp-3 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          {c.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-inherit flex items-center justify-between">
                        <span className={`text-[9px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                          IBW: {c.patientProfile.idealBodyWeightKg} kg • Crs: {c.patientProfile.compliance}
                        </span>

                        {onLoadCaseInSimulator && (
                          <button
                            type="button"
                            onClick={() => {
                              onLoadCaseInSimulator(c);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-[10px] cursor-pointer"
                          >
                            Carregar no Simulador →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: CREATE NEW CLINICAL CASE */}
          {activeTab === 'new_case' && (
            <form onSubmit={handleSaveCase} className="space-y-4 max-w-2xl mx-auto">
              <div>
                <h4 className="text-sm font-display font-bold">Cadastrar Novo Caso Clínico / Missão</h4>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Crie um cenário clínico com metas e desafios para os alunos resolverem no simulador.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-mono font-bold block mb-1">Título do Caso *</label>
                    <input
                      type="text"
                      value={caseTitle}
                      onChange={(e) => setCaseTitle(e.target.value)}
                      placeholder="Ex: SDRA por Pneumonia Grave"
                      required
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono font-bold block mb-1">Dificuldade</label>
                    <select
                      value={caseDifficulty}
                      onChange={(e) => setCaseDifficulty(e.target.value as any)}
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                      }`}
                    >
                      <option value="Iniciante">Iniciante</option>
                      <option value="Intermediário">Intermediário</option>
                      <option value="Avançado">Avançado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Nome Paciente</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Ex: João M."
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      value={patientHeight}
                      onChange={(e) => setPatientHeight(Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Complacência (Crs)</label>
                    <input
                      type="number"
                      value={patientCompliance}
                      onChange={(e) => setPatientCompliance(Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Resistência (Raw)</label>
                    <input
                      type="number"
                      value={patientResistance}
                      onChange={(e) => setPatientResistance(Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold block mb-1">Descrição e Desafio Clínico *</label>
                  <textarea
                    rows={3}
                    value={caseDescription}
                    onChange={(e) => setCaseDescription(e.target.value)}
                    placeholder="Descreva o quadro do paciente e o desafio fisiopatológico a ser resolvido..."
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-xs leading-relaxed outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Meta / Objetivo 1</label>
                    <input
                      type="text"
                      value={goalDescription1}
                      onChange={(e) => setGoalDescription1(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Meta / Objetivo 2</label>
                    <input
                      type="text"
                      value={goalDescription2}
                      onChange={(e) => setGoalDescription2(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setActiveTab('cases')}
                  className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
                    isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-[#151928] text-zinc-300 border-zinc-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Caso Clínico</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
