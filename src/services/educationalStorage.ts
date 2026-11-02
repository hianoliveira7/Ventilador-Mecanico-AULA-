import { ClinicalCase, PedagogicalSettings, FlashcardItem, CaseDebriefingReport } from '../types/ventilation';
import { CLINICAL_CASES } from '../data/clinicalCases';
import { DEFAULT_FLASHCARDS } from '../data/flashcardsData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';

export type UserRole = 'student' | 'teacher';

export const DEFAULT_PEDAGOGICAL_SETTINGS: PedagogicalSettings = {
  blindMechanicsEnabled: false,
  allowStudentRevealBlind: true,
  deteriorationEnabled: true,
  deteriorationTimeoutSeconds: 90,
  dpSafetyThreshold: 15,
  platSafetyThreshold: 30,
  admissionPhase2TimeSeconds: 90,
  admissionPhase3TimeSeconds: 200,
  autoOpenDebriefingOnFinish: true,
};

export interface QuizQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category?: string;
  difficulty?: 'Iniciante' | 'Intermediário' | 'Avançado';
  createdBy?: 'system' | 'teacher';
}

export const DEFAULT_QUIZ_QUESTIONS: QuizQuestionItem[] = [
  {
    id: 'q1',
    question: 'Qual é o principal parâmetro de segurança pulmonar que deve ser rigorosamente limitado na SDRA (Síndrome do Desconforto Respiratório Agudo)?',
    options: [
      'Volume Corrente calculado pelo peso real da balança',
      'Pressão de Platô (Pplat ≤ 30 cmH₂O) e Driving Pressure (ΔP ≤ 14 cmH₂O)',
      'Frequência Respiratória mantida sempre abaixo de 10 rpm',
      'FiO₂ fixa em 100% independentemente da saturação',
    ],
    correctIndex: 1,
    explanation: 'Na SDRA, limitar a Pressão de Platô (Pplat ≤ 30 cmH₂O) e a Driving Pressure (ΔP ≤ 14 cmH₂O) com Volume Corrente protetor baseado no Peso Predito (IBW 4-6 mL/kg) previne o barotrauma e volutrauma (VILI).',
    category: 'SDRA',
    difficulty: 'Iniciante',
    createdBy: 'system',
  },
  {
    id: 'q2',
    question: 'O que caracteriza a presença de "Auto-PEEP" (ou PEEPi) na curva de fluxo x tempo durante a ventilação mecânica?',
    options: [
      'O fluxo inspiratório atinge valores negativos',
      'A curva de fluxo expiratório não retorna à linha de base zero antes do início do próximo ciclo inspiratório',
      'A pressão de pico eleva-se acima de 60 cmH₂O',
      'O volume corrente expirado excede o volume inspirado',
    ],
    correctIndex: 1,
    explanation: 'O aprisionamento aéreo dinâmico (Auto-PEEP) ocorre quando o tempo expiratório é insuficiente para o esvaziamento completo do pulmão, fazendo com que a curva de fluxo expiratório ainda esteja em declínio quando um novo ciclo se inicia.',
    category: 'DPOC / Mecânica',
    difficulty: 'Intermediário',
    createdBy: 'system',
  },
  {
    id: 'q3',
    question: 'Em um paciente portador de DPOC grave exacerbado, qual conduta ventilatória é PRIORITÁRIA para evitar hiperinsuflação dinâmica?',
    options: [
      'Aumentar o tempo inspiratório e reduzir o fluxo para 20 L/min',
      'Aumentar a Frequência Respiratória para 35 rpm',
      'Garantir tempo expiratório prolongado (reduzindo FR e elevando o fluxo inspiratório para 60-80 L/min)',
      'Utilizar modo controlado a volume com pausa inspiratória longa de 3 segundos',
    ],
    correctIndex: 2,
    explanation: 'No DPOC, a constante de tempo é muito longa devido ao aumento da resistência (Raw). Para evitar auto-PEEP, é fundamental prolongar o tempo expiratório usando fluxos inspiratórios altos e frequências respiratórias moderadas.',
    category: 'DPOC',
    difficulty: 'Intermediário',
    createdBy: 'system',
  },
  {
    id: 'q4',
    question: 'O que o Índice de Tobin (RSBI = f / Vt em Litros) avalia na prática clínica de UTI?',
    options: [
      'A gravidade do shunt intrapulmonar',
      'A resistência exclusiva do tubo orotraqueal',
      'O risco de falha em testes de respiração espontânea (valores > 105 indicam fadiga e respiração rápida/superficial)',
      'A pressão arterial média do paciente',
    ],
    correctIndex: 2,
    explanation: 'O Índice de Tobin (RSBI = Frequência / Volume Corrente em litros) é um clássico preditor de desmame. Valores superiores a 105 indicam respiração rápida e superficial com risco iminente de falha no desmame.',
    category: 'Desmame',
    difficulty: 'Intermediário',
    createdBy: 'system',
  },
  {
    id: 'q5',
    question: 'Por que o cálculo do Volume Corrente em pacientes obesos mórbidos (IMC > 40) deve ser feito pelo PESO PREDITO (IBW) e não pelo peso real?',
    options: [
      'Porque o peso real corrompe o sensor de fluxo do ventilador',
      'Porque o parênquima pulmonar não aumenta de tamanho com o tecido adiposo; programar pelo peso real geraria volutrauma maciço',
      'Porque o peso predito garante FiO₂ de 100%',
      'Porque o peso real impede o uso de PEEP',
    ],
    correctIndex: 1,
    explanation: 'O pulmão do obeso tem o mesmo tamanho anatômico estimado pela altura e sexo (peso predito). Usar o peso de balança (peso real) causaria hiperdistensão e lesão pulmonar induzida pelo ventilador (VILI).',
    category: 'Obesidade',
    difficulty: 'Iniciante',
    createdBy: 'system',
  },
  {
    id: 'q6',
    question: 'Durante a ventilação no modo PCV (Pressão Controlada), se a complacência pulmonar do paciente cair pela metade subitamente, o que acontecerá com o Volume Corrente entregue?',
    options: [
      'O Volume Corrente permanecerá idêntico, pois a pressão é fixa',
      'O Volume Corrente cairá proporcionalmente pela metade',
      'A Pressão de Pico aumentará para o dobro do valor anterior',
      'O tempo inspiratório será automaticamente duplicado pelo ventilador',
    ],
    correctIndex: 1,
    explanation: 'Em PCV, a variável controlada é a pressão inspiratória (ΔP). Como Volume = Complacência × ΔP, se a complacência cai pela metade com a mesma pressão, o volume corrente entregue também reduzirá proporcionalmente.',
    category: 'Modos Ventilatórios',
    difficulty: 'Avançado',
    createdBy: 'system',
  },
];

const STORAGE_KEYS = {
  USER_ROLE: 'vm_sim_user_role',
  ACTIVE_QUIZ_QUESTIONS: 'vm_sim_active_quiz_questions',
  CUSTOM_QUIZ_QUESTIONS: 'vm_sim_custom_quiz_questions',
  DELETED_QUIZ_IDS: 'vm_sim_deleted_quiz_ids',
  ACTIVE_CLINICAL_CASES: 'vm_sim_active_clinical_cases',
  CUSTOM_CLINICAL_CASES: 'vm_sim_custom_clinical_cases',
  TUTORIAL_SEEN: 'vm_sim_tutorial_completed',
  TEACHER_PASSWORD: 'vm_sim_teacher_password',
  PEDAGOGICAL_SETTINGS: 'vm_sim_pedagogical_settings',
  ACTIVE_FLASHCARDS: 'vm_sim_active_flashcards',
  DEBRIEFING_REPORTS: 'vm_sim_debriefing_reports',
};

const DEFAULT_TEACHER_PASSWORD = '14253697';

// Event Subscribers for Real-Time Sync
type PedagogicalSettingsListener = (settings: PedagogicalSettings) => void;
type DebriefingReportsListener = (reports: CaseDebriefingReport[]) => void;
type QuizQuestionsListener = (questions: QuizQuestionItem[]) => void;
type ClinicalCasesListener = (cases: ClinicalCase[]) => void;

const pedagogicalListeners: Set<PedagogicalSettingsListener> = new Set();
const debriefingListeners: Set<DebriefingReportsListener> = new Set();
const quizListeners: Set<QuizQuestionsListener> = new Set();
const caseListeners: Set<ClinicalCasesListener> = new Set();

let isSyncInitialized = false;

function notifyPedagogicalListeners(settings: PedagogicalSettings) {
  pedagogicalListeners.forEach((cb) => {
    try {
      cb(settings);
    } catch (e) {
      console.error('Error in pedagogical settings listener', e);
    }
  });
}

function notifyDebriefingListeners(reports: CaseDebriefingReport[]) {
  debriefingListeners.forEach((cb) => {
    try {
      cb(reports);
    } catch (e) {
      console.error('Error in debriefing reports listener', e);
    }
  });
}

function notifyQuizListeners(questions: QuizQuestionItem[]) {
  quizListeners.forEach((cb) => {
    try {
      cb(questions);
    } catch (e) {
      console.error('Error in quiz questions listener', e);
    }
  });
}

function notifyCaseListeners(cases: ClinicalCase[]) {
  caseListeners.forEach((cb) => {
    try {
      cb(cases);
    } catch (e) {
      console.error('Error in clinical cases listener', e);
    }
  });
}

export const educationalStorage = {
  // Subscription API for React UI reactive updates
  subscribePedagogicalSettings: (callback: PedagogicalSettingsListener) => {
    pedagogicalListeners.add(callback);
    return () => {
      pedagogicalListeners.delete(callback);
    };
  },

  subscribeDebriefingReports: (callback: DebriefingReportsListener) => {
    debriefingListeners.add(callback);
    return () => {
      debriefingListeners.delete(callback);
    };
  },

  subscribeQuizQuestions: (callback: QuizQuestionsListener) => {
    quizListeners.add(callback);
    return () => {
      quizListeners.delete(callback);
    };
  },

  subscribeClinicalCases: (callback: ClinicalCasesListener) => {
    caseListeners.add(callback);
    return () => {
      caseListeners.delete(callback);
    };
  },

  // Teacher Authentication & Password Management
  getTeacherPassword: (): string => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TEACHER_PASSWORD);
      return stored && stored.trim() ? stored : DEFAULT_TEACHER_PASSWORD;
    } catch {
      return DEFAULT_TEACHER_PASSWORD;
    }
  },

  verifyTeacherPassword: (attempt: string): boolean => {
    try {
      const current = educationalStorage.getTeacherPassword();
      return attempt.trim() === current.trim();
    } catch {
      return attempt.trim() === DEFAULT_TEACHER_PASSWORD;
    }
  },

  setTeacherPassword: (newPassword: string): boolean => {
    try {
      if (!newPassword || newPassword.trim().length < 3) return false;
      localStorage.setItem(STORAGE_KEYS.TEACHER_PASSWORD, newPassword.trim());
      return true;
    } catch {
      return false;
    }
  },

  resetTeacherPassword: (): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEACHER_PASSWORD, DEFAULT_TEACHER_PASSWORD);
    } catch {
      // Ignore
    }
  },

  getUserRole: (): 'student' | 'teacher' | null => {
    try {
      const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
      if (role === 'student' || role === 'teacher') return role;
      return null;
    } catch {
      return null;
    }
  },

  setUserRole: (role: 'student' | 'teacher') => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    } catch {
      // Ignore
    }
  },

  clearUserRole: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    } catch {
      // Ignore
    }
  },

  hasSeenTutorial: (): boolean => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN) === 'true';
    } catch {
      return false;
    }
  },

  setTutorialSeen: (seen: boolean = true) => {
    try {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, seen ? 'true' : 'false');
    } catch {
      // Ignore
    }
  },

  // Quiz Questions management
  getAllQuizQuestions: (): QuizQuestionItem[] => {
    try {
      const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_QUIZ_IDS);
      const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

      const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_QUIZ_QUESTIONS);
      let list: QuizQuestionItem[] = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed;
        }
      }
      if (list.length === 0) {
        const oldCustomRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_QUIZ_QUESTIONS);
        const oldCustom: QuizQuestionItem[] = oldCustomRaw ? JSON.parse(oldCustomRaw) : [];
        list = [...DEFAULT_QUIZ_QUESTIONS, ...oldCustom];
      }
      const filtered = list.filter((q) => !deletedIds.includes(q.id));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ_QUESTIONS, JSON.stringify(filtered));
      return filtered;
    } catch {
      return DEFAULT_QUIZ_QUESTIONS.filter((q) => {
        try {
          const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_QUIZ_IDS);
          const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
          return !deletedIds.includes(q.id);
        } catch {
          return true;
        }
      });
    }
  },

  addQuizQuestion: (question: Omit<QuizQuestionItem, 'id' | 'createdBy'>): QuizQuestionItem => {
    const newItem: QuizQuestionItem = {
      ...question,
      id: `teacher_q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdBy: 'teacher',
    };
    try {
      const currentList = educationalStorage.getAllQuizQuestions();
      const updatedList = [newItem, ...currentList];
      localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ_QUESTIONS, JSON.stringify(updatedList));
      notifyQuizListeners(updatedList);

      // Sync write to Firestore
      const path = `quizQuestions/${newItem.id}`;
      setDoc(doc(db, 'quizQuestions', newItem.id), {
        id: newItem.id,
        question: newItem.question,
        options: newItem.options,
        correctIndex: newItem.correctIndex,
        explanation: newItem.explanation,
        category: newItem.category || 'Geral',
        difficulty: newItem.difficulty || 'Intermediário',
        createdBy: newItem.createdBy,
        createdAt: Date.now(),
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, path));
    } catch (e) {
      console.error('Failed to save quiz question locally', e);
    }
    return newItem;
  },

  deleteQuizQuestion: (id: string): boolean => {
    try {
      const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_QUIZ_IDS);
      const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem(STORAGE_KEYS.DELETED_QUIZ_IDS, JSON.stringify(deletedIds));
      }

      const currentList = educationalStorage.getAllQuizQuestions();
      const filtered = currentList.filter((q) => q.id !== id);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ_QUESTIONS, JSON.stringify(filtered));
      notifyQuizListeners(filtered);

      // Sync delete to Firestore
      const path = `quizQuestions/${id}`;
      deleteDoc(doc(db, 'quizQuestions', id)).catch((err) =>
        handleFirestoreError(err, OperationType.DELETE, path)
      );
      return true;
    } catch (e) {
      console.error('Failed to delete quiz question locally', e);
      return false;
    }
  },

  updateQuizQuestion: (question: QuizQuestionItem): boolean => {
    try {
      const currentList = educationalStorage.getAllQuizQuestions();
      const updatedList = currentList.map((q) => (q.id === question.id ? question : q));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ_QUESTIONS, JSON.stringify(updatedList));
      notifyQuizListeners(updatedList);

      // Sync update to Firestore
      const path = `quizQuestions/${question.id}`;
      setDoc(
        doc(db, 'quizQuestions', question.id),
        {
          id: question.id,
          question: question.question,
          options: question.options,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          category: question.category || 'Geral',
          difficulty: question.difficulty || 'Intermediário',
          createdBy: question.createdBy || 'teacher',
          updatedAt: Date.now(),
        },
        { merge: true }
      ).catch((err) => handleFirestoreError(err, OperationType.UPDATE, path));
      return true;
    } catch (e) {
      console.error('Failed to update quiz question locally', e);
      return false;
    }
  },

  resetQuizQuestionsToDefault: (): QuizQuestionItem[] => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ_QUESTIONS, JSON.stringify(DEFAULT_QUIZ_QUESTIONS));
      notifyQuizListeners(DEFAULT_QUIZ_QUESTIONS);
      return DEFAULT_QUIZ_QUESTIONS;
    } catch {
      return DEFAULT_QUIZ_QUESTIONS;
    }
  },

  // Clinical Cases management
  getAllClinicalCases: (): ClinicalCase[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLINICAL_CASES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      const oldCustomRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CLINICAL_CASES);
      const oldCustom: ClinicalCase[] = oldCustomRaw ? JSON.parse(oldCustomRaw) : [];
      const initialList = [...CLINICAL_CASES, ...oldCustom];
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLINICAL_CASES, JSON.stringify(initialList));
      return initialList;
    } catch {
      return CLINICAL_CASES;
    }
  },

  addClinicalCase: (customCase: ClinicalCase): ClinicalCase => {
    try {
      const currentList = educationalStorage.getAllClinicalCases();
      const updatedList = [customCase, ...currentList.filter((c) => c.id !== customCase.id)];
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLINICAL_CASES, JSON.stringify(updatedList));
      notifyCaseListeners(updatedList);

      // Sync to Firestore
      const path = `cases/${customCase.id}`;
      setDoc(doc(db, 'cases', customCase.id), {
        id: customCase.id,
        title: customCase.title,
        category: customCase.category,
        description: customCase.description || customCase.clinicalHistory,
        difficulty: customCase.difficulty,
        createdAt: Date.now(),
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, path));
    } catch (e) {
      console.error('Failed to save clinical case', e);
    }
    return customCase;
  },

  updateClinicalCase: (updatedCase: ClinicalCase): boolean => {
    try {
      const currentList = educationalStorage.getAllClinicalCases();
      const updatedList = currentList.map((c) => (c.id === updatedCase.id ? updatedCase : c));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLINICAL_CASES, JSON.stringify(updatedList));
      notifyCaseListeners(updatedList);

      // Sync to Firestore
      const path = `cases/${updatedCase.id}`;
      setDoc(
        doc(db, 'cases', updatedCase.id),
        {
          id: updatedCase.id,
          title: updatedCase.title,
          category: updatedCase.category,
          description: updatedCase.description || updatedCase.clinicalHistory,
          difficulty: updatedCase.difficulty,
          createdAt: Date.now(),
        },
        { merge: true }
      ).catch((err) => handleFirestoreError(err, OperationType.UPDATE, path));
      return true;
    } catch (e) {
      console.error('Failed to update clinical case', e);
      return false;
    }
  },

  deleteClinicalCase: (id: string): boolean => {
    try {
      const currentList = educationalStorage.getAllClinicalCases();
      const filtered = currentList.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLINICAL_CASES, JSON.stringify(filtered));
      notifyCaseListeners(filtered);

      // Sync to Firestore
      const path = `cases/${id}`;
      deleteDoc(doc(db, 'cases', id)).catch((err) => handleFirestoreError(err, OperationType.DELETE, path));
      return true;
    } catch (e) {
      console.error('Failed to delete clinical case', e);
      return false;
    }
  },

  resetClinicalCasesToDefault: (): ClinicalCase[] => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLINICAL_CASES, JSON.stringify(CLINICAL_CASES));
      notifyCaseListeners(CLINICAL_CASES);
      return CLINICAL_CASES;
    } catch {
      return CLINICAL_CASES;
    }
  },

  // Interactive Tour completion flag
  hasCompletedTour: (): boolean => {
    try {
      return localStorage.getItem('vm_fisio_tour_completed') === 'true';
    } catch {
      return false;
    }
  },

  setTourCompleted: (completed = true): void => {
    try {
      localStorage.setItem('vm_fisio_tour_completed', completed ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to set tour completion flag', e);
    }
  },

  // Pedagogical & Teacher Evaluation Settings
  getPedagogicalSettings: (): PedagogicalSettings => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PEDAGOGICAL_SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_PEDAGOGICAL_SETTINGS, ...parsed };
      }
      return DEFAULT_PEDAGOGICAL_SETTINGS;
    } catch {
      return DEFAULT_PEDAGOGICAL_SETTINGS;
    }
  },

  savePedagogicalSettings: (settings: Partial<PedagogicalSettings>): PedagogicalSettings => {
    try {
      const current = educationalStorage.getPedagogicalSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEYS.PEDAGOGICAL_SETTINGS, JSON.stringify(updated));
      notifyPedagogicalListeners(updated);

      // Sync write to Firestore
      const path = 'pedagogicalSettings/default';
      setDoc(
        doc(db, 'pedagogicalSettings', 'default'),
        {
          id: 'default',
          ...updated,
          updatedAt: Date.now(),
        },
        { merge: true }
      ).catch((err) => handleFirestoreError(err, OperationType.WRITE, path));

      return updated;
    } catch (e) {
      console.error('Failed to save pedagogical settings', e);
      return DEFAULT_PEDAGOGICAL_SETTINGS;
    }
  },

  // Flashcards Management
  getAllFlashcards: (): FlashcardItem[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_FLASHCARDS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FLASHCARDS, JSON.stringify(DEFAULT_FLASHCARDS));
      return DEFAULT_FLASHCARDS;
    } catch {
      return DEFAULT_FLASHCARDS;
    }
  },

  addFlashcard: (card: Omit<FlashcardItem, 'id' | 'createdBy'>): FlashcardItem => {
    const newCard: FlashcardItem = {
      ...card,
      id: `teacher_fc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdBy: 'teacher',
    };
    try {
      const current = educationalStorage.getAllFlashcards();
      const updated = [newCard, ...current];
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FLASHCARDS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to add flashcard', e);
    }
    return newCard;
  },

  deleteFlashcard: (id: string): boolean => {
    try {
      const current = educationalStorage.getAllFlashcards();
      const filtered = current.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FLASHCARDS, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('Failed to delete flashcard', e);
      return false;
    }
  },

  resetFlashcardsToDefault: (): FlashcardItem[] => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FLASHCARDS, JSON.stringify(DEFAULT_FLASHCARDS));
      return DEFAULT_FLASHCARDS;
    } catch {
      return DEFAULT_FLASHCARDS;
    }
  },

  // Debriefing Reports (After Action Review)
  getAllDebriefingReports: (): CaseDebriefingReport[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DEBRIEFING_REPORTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  },

  saveDebriefingReport: (report: CaseDebriefingReport): void => {
    try {
      const current = educationalStorage.getAllDebriefingReports();
      const updated = [report, ...current.filter((r) => r.id !== report.id)].slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.DEBRIEFING_REPORTS, JSON.stringify(updated));
      notifyDebriefingListeners(updated);

      // Persist to Firestore results collection
      const path = `results/${report.id}`;
      setDoc(
        doc(db, 'results', report.id),
        {
          id: report.id,
          studentName: report.studentName || 'Estudante',
          caseId: report.caseId || 'custom',
          caseTitle: report.caseTitle || 'Simulação Clínica',
          score: report.score || 0,
          gradePercentage: report.score || 0,
          completionTimeSeconds: report.durationSeconds || 0,
          submittedAt: Date.now(),
        },
        { merge: true }
      ).catch((err) => handleFirestoreError(err, OperationType.WRITE, path));
    } catch (e) {
      console.error('Failed to save debriefing report', e);
    }
  },

  clearDebriefingReports: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.DEBRIEFING_REPORTS);
      notifyDebriefingListeners([]);
    } catch (e) {
      console.error('Failed to clear debriefing reports', e);
    }
  },

  deleteDebriefingReport: (id: string): boolean => {
    try {
      const current = educationalStorage.getAllDebriefingReports();
      const filtered = current.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEYS.DEBRIEFING_REPORTS, JSON.stringify(filtered));
      notifyDebriefingListeners(filtered);

      // Sync delete to Firestore
      const path = `results/${id}`;
      deleteDoc(doc(db, 'results', id)).catch((err) =>
        handleFirestoreError(err, OperationType.DELETE, path)
      );
      return true;
    } catch (e) {
      console.error('Failed to delete debriefing report', e);
      return false;
    }
  },

  // Synchronize Firestore data once on boot
  syncFromFirestore: async (): Promise<void> => {
    try {
      // 1. Sync Pedagogical Settings
      const pathSettings = 'pedagogicalSettings/default';
      try {
        const docSnap = await getDoc(doc(db, 'pedagogicalSettings', 'default'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const mergedSettings = { ...DEFAULT_PEDAGOGICAL_SETTINGS, ...data };
          localStorage.setItem(STORAGE_KEYS.PEDAGOGICAL_SETTINGS, JSON.stringify(mergedSettings));
          notifyPedagogicalListeners(mergedSettings);
        }
      } catch (err) {
        console.warn('Could not sync pedagogicalSettings from Firestore:', err);
      }

      // 2. Sync Debriefing Results
      const pathResults = 'results';
      try {
        const querySnap = await getDocs(collection(db, 'results'));
        if (!querySnap.empty) {
          const remoteReports: CaseDebriefingReport[] = [];
          querySnap.forEach((docItem) => {
            const data = docItem.data();
            remoteReports.push({
              id: docItem.id,
              studentName: data.studentName || 'Estudante',
              caseId: data.caseId || 'custom',
              caseTitle: data.caseTitle || 'Simulação Clínica',
              score: data.score || 0,
              durationSeconds: data.completionTimeSeconds || 0,
              completedAt: data.submittedAt ? new Date(data.submittedAt).toISOString() : new Date().toISOString(),
              rating: 'Adequado / Seguro',
              goalsCompletedCount: 0,
              totalGoalsCount: 0,
              safetyMetrics: {
                timeUnderViliSeconds: 0,
                timeHighPlateauSeconds: 0,
                autoPeepRiskEvents: 0,
                asynchronyEventsCount: 0,
                hadDeterioration: false,
              },
              interventions: [],
              guidelineFeedback: [],
              recommendations: [],
            });
          });
          if (remoteReports.length > 0) {
            const local = educationalStorage.getAllDebriefingReports();
            const mergedMap = new Map<string, CaseDebriefingReport>();
            local.forEach((r) => mergedMap.set(r.id, r));
            remoteReports.forEach((r) => mergedMap.set(r.id, r));
            const mergedList = Array.from(mergedMap.values()).slice(0, 50);
            localStorage.setItem(STORAGE_KEYS.DEBRIEFING_REPORTS, JSON.stringify(mergedList));
            notifyDebriefingListeners(mergedList);
          }
        }
      } catch (err) {
        console.warn('Could not sync results from Firestore:', err);
      }
    } catch (e) {
      console.error('Firestore initial sync failed', e);
    }
  },

  // Initialize Real-Time Bidirectional Sync with Firestore
  initBidirectionalSync: (): () => void => {
    if (isSyncInitialized) return () => {};
    isSyncInitialized = true;

    // 1. Real-Time Listener for Pedagogical Settings
    const unsubPedagogical = onSnapshot(
      doc(db, 'pedagogicalSettings', 'default'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const merged = { ...DEFAULT_PEDAGOGICAL_SETTINGS, ...data };
          localStorage.setItem(STORAGE_KEYS.PEDAGOGICAL_SETTINGS, JSON.stringify(merged));
          notifyPedagogicalListeners(merged);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'pedagogicalSettings/default');
      }
    );

    // 2. Real-Time Listener for Debriefing Reports / Student Results
    const unsubResults = onSnapshot(
      collection(db, 'results'),
      (querySnap) => {
        const clearedAtStr = localStorage.getItem('simulador_venti_results_cleared_at_v2');
        const clearedAt = clearedAtStr ? Number(clearedAtStr) : 0;
        const deletedIdsStr = localStorage.getItem('simulador_venti_deleted_result_ids_v2');
        const deletedIds: string[] = deletedIdsStr ? JSON.parse(deletedIdsStr) : [];

        const remoteReports: CaseDebriefingReport[] = [];
        querySnap.forEach((docItem) => {
          if (deletedIds.includes(docItem.id)) {
            deleteDoc(docItem.ref).catch(() => {});
            return;
          }
          const data = docItem.data();
          if (data.submittedAt && data.submittedAt <= clearedAt) {
            deleteDoc(docItem.ref).catch(() => {});
            return;
          }
          remoteReports.push({
            id: docItem.id,
            studentName: data.studentName || 'Estudante',
            caseId: data.caseId || 'custom',
            caseTitle: data.caseTitle || 'Simulação Clínica',
            score: data.score || 0,
            durationSeconds: data.completionTimeSeconds || 0,
            completedAt: data.submittedAt ? new Date(data.submittedAt).toISOString() : new Date().toISOString(),
            rating: 'Adequado / Seguro',
            goalsCompletedCount: 0,
            totalGoalsCount: 0,
            safetyMetrics: {
              timeUnderViliSeconds: 0,
              timeHighPlateauSeconds: 0,
              autoPeepRiskEvents: 0,
              asynchronyEventsCount: 0,
              hadDeterioration: false,
            },
            interventions: [],
            guidelineFeedback: [],
            recommendations: [],
          });
        });

        localStorage.setItem(STORAGE_KEYS.DEBRIEFING_REPORTS, JSON.stringify(remoteReports));
        notifyDebriefingListeners(remoteReports);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'results');
      }
    );

    // 3. Real-Time Listener for Quiz Questions
    const unsubQuiz = onSnapshot(
      collection(db, 'quizQuestions'),
      (querySnap) => {
        const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_QUIZ_IDS);
        const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        const remoteQuestions: QuizQuestionItem[] = [];
        querySnap.forEach((docItem) => {
          if (deletedIds.includes(docItem.id)) {
            deleteDoc(docItem.ref).catch(() => {});
            return;
          }
          const data = docItem.data();
          if (data && data.question) {
            remoteQuestions.push({
              id: docItem.id,
              question: data.question,
              options: Array.isArray(data.options) ? data.options : [],
              correctIndex: typeof data.correctIndex === 'number' ? data.correctIndex : 0,
              explanation: data.explanation || '',
              category: data.category || 'Geral',
              difficulty: data.difficulty || 'Intermediário',
              createdBy: data.createdBy || 'teacher',
            });
          }
        });

        const local = educationalStorage.getAllQuizQuestions().filter((q) => !deletedIds.includes(q.id));
        const mergedMap = new Map<string, QuizQuestionItem>();
        local.forEach((q) => mergedMap.set(q.id, q));
        remoteQuestions.forEach((q) => mergedMap.set(q.id, q));
        const mergedList = Array.from(mergedMap.values()).filter((q) => !deletedIds.includes(q.id));
        localStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ_QUESTIONS, JSON.stringify(mergedList));
        notifyQuizListeners(mergedList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'quizQuestions');
      }
    );

    // Cleanup function
    return () => {
      unsubPedagogical();
      unsubResults();
      unsubQuiz();
      isSyncInitialized = false;
    };
  },
};
