import React, { useState, useEffect } from 'react';
import { X, HelpCircle, CheckCircle, Award, RefreshCw, BookOpen, Lightbulb, Sparkles } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../context/ThemeContext';
import { educationalStorage, QuizQuestionItem } from '../services/educationalStorage';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTeacherAdmin?: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({ isOpen, onClose, onOpenTeacherAdmin }) => {
  const { isLight } = useTheme();
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const allQ = educationalStorage.getAllQuizQuestions();
      setQuestions(allQ);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setQuizFinished(false);
    }
  }, [isOpen]);

  if (!isOpen || questions.length === 0) return null;

  const currentQ = questions[currentIndex] || questions[0];

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;
    setIsAnswerSubmitted(true);
    if (selectedOption === currentQ.correctIndex) {
      audioEngine.playConfirmBeep();
      setScore((prev) => prev + 1);
    } else {
      audioEngine.triggerAlarmPattern('medium');
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    const allQ = educationalStorage.getAllQuizQuestions();
    setQuestions(allQ);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setQuizFinished(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className={`border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0e] border-zinc-800 text-zinc-100'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-[#181126] border-purple-800/80 text-purple-400'
            }`}>
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-display font-bold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-zinc-100'
              }`}>
                Quiz de Fixação & Avaliação de Alunos
              </h2>
              <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Teste seus conhecimentos sobre ventilação mecânica invasiva e gasometria.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300' : 'bg-[#161720] hover:bg-[#222432] text-zinc-400 hover:text-white border-zinc-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {!quizFinished ? (
            <>
              {/* Question progress */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className={`font-bold uppercase tracking-wider ${
                  isLight ? 'text-emerald-700' : 'text-purple-400'
                }`}>
                  Questão {currentIndex + 1} de {questions.length}
                </span>
                <span className={isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'}>
                  Pontuação: {score} acertos
                </span>
              </div>

              {/* Question Text */}
              <div className={`p-4 rounded-xl border text-sm font-display font-bold leading-relaxed ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0e0f14] border-zinc-800 text-zinc-100'
              }`}>
                {currentQ.question}
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentQ.options.map((opt, idx) => {
                  let btnStyle = isLight
                    ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                    : 'bg-[#0e0f14] border-zinc-800 hover:bg-[#151620] text-zinc-300';
                  
                  if (selectedOption === idx) {
                    btnStyle = isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                      : 'bg-purple-950/60 border-purple-500 text-purple-200';
                  }
                  if (isAnswerSubmitted) {
                    if (idx === currentQ.correctIndex) {
                      btnStyle = isLight
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-900 font-bold'
                        : 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold';
                    } else if (selectedOption === idx && idx !== currentQ.correctIndex) {
                      btnStyle = isLight
                        ? 'bg-rose-100 border-rose-400 text-rose-900 font-bold'
                        : 'bg-rose-950/80 border-rose-500 text-rose-200';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswerSubmitted}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer text-xs font-sans flex items-start gap-3 ${btnStyle}`}
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

              {/* Explanation (after submission) */}
              {isAnswerSubmitted && (
                <div className={`p-4 rounded-xl border space-y-1.5 animate-fade-in ${
                  isLight
                    ? 'bg-cyan-50/80 border-cyan-300 text-cyan-950'
                    : 'bg-[#12141c] border-zinc-700/80 text-zinc-300'
                }`}>
                  <div className={`flex items-center gap-1.5 text-xs font-display font-bold ${
                    isLight ? 'text-cyan-800' : 'text-cyan-300'
                  }`}>
                    <Lightbulb className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                    <span>Explicação Baseada em Evidências</span>
                  </div>
                  <p className={`text-xs leading-relaxed font-sans ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                    {currentQ.explanation}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto text-2xl font-bold font-mono ${
                isLight
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
              }`}>
                {Math.round((score / questions.length) * 100)}%
              </div>
              <div className="space-y-1">
                <h3 className={`text-lg font-display font-black ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                  Avaliação Concluída!
                </h3>
                <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Você acertou {score} de {questions.length} questões propostas.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRestartQuiz}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-2 shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refazer Quiz</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e0f14] border-zinc-800'
        }`}>
          <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
            VM - FISIO • Módulo de Ensino Médico & Fisioterapia
          </span>
          {!quizFinished && (
            <div>
              {!isAnswerSubmitted ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null}
                  className={`px-4 py-2 rounded-xl font-mono font-bold text-xs transition-all ${
                    selectedOption !== null
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md'
                      : isLight ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  Confirmar Resposta
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs transition-all cursor-pointer shadow-md"
                >
                  {currentIndex < questions.length - 1 ? 'Próxima Questão' : 'Ver Resultado Final'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
