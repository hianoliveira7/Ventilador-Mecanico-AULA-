import { ClinicalCase, PatientParameters, VentilatorSettings, MonitoredData } from '../types/ventilation';
import { CLINICAL_CASES } from '../data/clinicalCases';
import { doc, setDoc, getDoc, getDocs, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { educationalStorage, QuizQuestionItem } from './educationalStorage';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  
  if (errMessage.includes('unavailable') || errMessage.includes('offline') || errMessage.includes('Could not reach')) {
    console.warn('Firestore operating in offline mode (local cache active):', errMessage);
    return;
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export interface StudentMistake {
  id: string;
  category: 'volutrauma' | 'barotrauma' | 'atelectrauma' | 'acidosis' | 'alkalosis' | 'asynchrony' | 'time_management';
  title: string;
  description: string;
  recommendation: string;
  penaltyPoints: number;
}

export interface StudentGameResult {
  id: string;
  studentName: string;
  roomCode: string;
  caseId: string;
  caseTitle: string;
  score: number;
  maxScore: number;
  completionTimeSeconds: number;
  timeLimitSeconds: number;
  gradePercentage: number;
  rankBadge: string;
  mistakes: StudentMistake[];
  strengths: string[];
  submittedAt: number;
}

export interface KahootRoom {
  code: string;
  title: string;
  caseId: string;
  timeLimitMinutes: number;
  createdAt: number;
  active: boolean;
  professorName: string;
}

const STORAGE_KEYS = {
  CASES: 'simulador_venti_cases_v2',
  QUIZZES: 'simulador_venti_quizzes_v2',
  ROOMS: 'simulador_venti_rooms_v2',
  DELETED_ROOMS: 'simulador_venti_deleted_rooms_v2',
  RESULTS: 'simulador_venti_results_v2',
  CLEARED_RESULTS_AT: 'simulador_venti_results_cleared_at_v2',
  DELETED_RESULT_IDS: 'simulador_venti_deleted_result_ids_v2',
  PROFILES: 'simulador_venti_profiles_v2',
};

// Default preset rooms for quick Kahoot play
const DEFAULT_ROOMS: KahootRoom[] = [
  {
    code: 'UTI-DESAFIO',
    title: 'Desafio UTI: Admissão Imediata em SDRA',
    caseId: 'admissao-uti-zero-sdra',
    timeLimitMinutes: 5,
    createdAt: 1700000000000,
    active: true,
    professorName: 'Prof. Dra. Camila Alencar',
  },
  {
    code: 'DPOC-AGUDO',
    title: 'Desafio DPOC: Broncoespasmo e Auto-PEEP',
    caseId: 'dpoc-descompensado-auto-peep',
    timeLimitMinutes: 7,
    createdAt: 1700000000000,
    active: true,
    professorName: 'Prof. Dr. Marcelo Vasconcelos',
  },
];

type RoomListener = (rooms: KahootRoom[]) => void;
type ResultListener = (results: StudentGameResult[]) => void;

class LocalDatabaseService {
  private roomListeners: Set<RoomListener> = new Set();
  private resultListeners: Set<ResultListener> = new Set();
  private isListening = false;

  public subscribeRooms(cb: RoomListener) {
    this.roomListeners.add(cb);
    return () => this.roomListeners.delete(cb);
  }

  public subscribeResults(cb: ResultListener) {
    this.resultListeners.add(cb);
    return () => this.resultListeners.delete(cb);
  }

  private notifyRoomListeners(rooms: KahootRoom[]) {
    this.roomListeners.forEach((cb) => {
      try {
        cb(rooms);
      } catch (e) {
        console.error(e);
      }
    });
  }

  private notifyResultListeners(results: StudentGameResult[]) {
    this.resultListeners.forEach((cb) => {
      try {
        cb(results);
      } catch (e) {
        console.error(e);
      }
    });
  }

  // Deletion tracking helpers
  public getDeletedRoomCodes(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_ROOMS);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr.map((s: string) => s.toUpperCase()) : []);
    } catch {
      return new Set();
    }
  }

  public addDeletedRoomCode(code: string) {
    if (typeof window === 'undefined') return;
    try {
      const set = this.getDeletedRoomCodes();
      set.add(code.trim().toUpperCase());
      localStorage.setItem(STORAGE_KEYS.DELETED_ROOMS, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.error(e);
    }
  }

  public removeDeletedRoomCode(code: string) {
    if (typeof window === 'undefined') return;
    try {
      const set = this.getDeletedRoomCodes();
      set.delete(code.trim().toUpperCase());
      localStorage.setItem(STORAGE_KEYS.DELETED_ROOMS, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.error(e);
    }
  }

  public getClearedResultsTimestamp(): number {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CLEARED_RESULTS_AT);
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  }

  public setClearedResultsTimestamp(ts: number) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.CLEARED_RESULTS_AT, String(ts));
    } catch (e) {
      console.error(e);
    }
  }

  public getDeletedResultIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_RESULT_IDS);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  public addDeletedResultId(id: string) {
    if (typeof window === 'undefined') return;
    try {
      const set = this.getDeletedResultIds();
      set.add(id);
      localStorage.setItem(STORAGE_KEYS.DELETED_RESULT_IDS, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.error(e);
    }
  }

  // Initialize default database records and real-time Firestore synchronization
  public init() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.CASES)) {
      localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(CLINICAL_CASES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROOMS)) {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(DEFAULT_ROOMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RESULTS)) {
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify([]));
    }

    if (!this.isListening) {
      this.isListening = true;
      this.startRealtimeSync();
    }
  }

  private startRealtimeSync() {
    // Listen to Kahoot Rooms collection in real-time
    onSnapshot(
      collection(db, 'kahootRooms'),
      (snapshot) => {
        const deletedRooms = this.getDeletedRoomCodes();
        const remoteRooms: KahootRoom[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as KahootRoom;
          if (data && data.code) {
            const norm = data.code.trim().toUpperCase();
            if (deletedRooms.has(norm)) {
              // Stale document in cloud that was deleted locally - clean it up
              deleteDoc(docSnap.ref).catch(() => {});
              return;
            }
            remoteRooms.push(data);
          }
        });

        const filteredRooms = remoteRooms.filter((r) => !deletedRooms.has(r.code.trim().toUpperCase()));
        localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(filteredRooms));
        this.notifyRoomListeners(filteredRooms);
      },
      (err) => console.warn('Kahoot rooms live sync error:', err)
    );

    // Listen to Results collection in real-time
    onSnapshot(
      collection(db, 'results'),
      (snapshot) => {
        const clearedAt = this.getClearedResultsTimestamp();
        const deletedIds = this.getDeletedResultIds();
        const remoteResults: StudentGameResult[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as StudentGameResult;
          if (data && data.studentName) {
            if (data.submittedAt && data.submittedAt <= clearedAt) {
              // Result submitted before scores reset - purge from cloud
              deleteDoc(docSnap.ref).catch(() => {});
              return;
            }
            if (deletedIds.has(docSnap.id)) {
              deleteDoc(docSnap.ref).catch(() => {});
              return;
            }
            remoteResults.push(data);
          }
        });

        const filteredResults = remoteResults.filter((r) => {
          if (r.submittedAt && r.submittedAt <= clearedAt) return false;
          if (deletedIds.has(r.id)) return false;
          return true;
        });

        const sorted = filteredResults.sort(
          (a, b) => (b.submittedAt || 0) - (a.submittedAt || 0)
        );
        localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(sorted));
        this.notifyResultListeners(sorted);
      },
      (err) => console.warn('Student results live sync error:', err)
    );
  }

  // Clinical Cases
  public getClinicalCases(): ClinicalCase[] {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CASES);
      return data ? JSON.parse(data) : CLINICAL_CASES;
    } catch (e) {
      return CLINICAL_CASES;
    }
  }

  public async saveClinicalCase(newCase: ClinicalCase) {
    const cases = this.getClinicalCases();
    const existingIdx = cases.findIndex((c) => c.id === newCase.id);
    if (existingIdx >= 0) {
      cases[existingIdx] = newCase;
    } else {
      cases.push(newCase);
    }
    localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(cases));

    try {
      const payload = {
        id: newCase.id,
        title: newCase.title,
        category: newCase.category,
        description: newCase.description,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'cases', newCase.id), payload);
      await setDoc(doc(db, 'clinicalCases', newCase.id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `cases/${newCase.id}`);
    }
  }

  public async registerStudent(studentName: string, roomCode: string, teamRole: string = 'Fisioterapeuta Respiratório') {
    const studentId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      await setDoc(doc(db, 'students', studentId), {
        id: studentId,
        studentName,
        roomCode,
        teamRole,
        joinedAt: Date.now(),
      });
    } catch (err) {
      console.warn('Student registration cached locally:', err);
    }
    return studentId;
  }

  // Quizzes
  public getQuizzes(): QuizQuestionItem[] {
    return educationalStorage.getAllQuizQuestions();
  }

  public saveQuizQuestion(question: QuizQuestionItem) {
    educationalStorage.addQuizQuestion(question);
  }

  // Kahoot Rooms
  public getRooms(): KahootRoom[] {
    this.init();
    try {
      const deletedRooms = this.getDeletedRoomCodes();
      const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
      const list: KahootRoom[] = data ? JSON.parse(data) : DEFAULT_ROOMS;
      return list.filter((r) => !deletedRooms.has(r.code.toUpperCase()));
    } catch (e) {
      return DEFAULT_ROOMS.filter((r) => !this.getDeletedRoomCodes().has(r.code.toUpperCase()));
    }
  }

  public async createRoom(room: KahootRoom) {
    const normalized = room.code.trim().toUpperCase();
    this.removeDeletedRoomCode(normalized);
    const rooms = this.getRooms().filter((r) => r.code.toUpperCase() !== normalized);
    rooms.unshift(room);
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    this.notifyRoomListeners(rooms);

    try {
      await setDoc(doc(db, 'kahootRooms', normalized), {
        code: normalized,
        title: room.title,
        caseId: room.caseId,
        timeLimitMinutes: room.timeLimitMinutes,
        active: room.active,
        professorName: room.professorName,
        createdAt: room.createdAt || Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `kahootRooms/${normalized}`);
    }
  }

  public getRoomByCode(code: string): KahootRoom | null {
    const rooms = this.getRooms();
    return rooms.find((r) => r.code.toUpperCase() === code.trim().toUpperCase()) || null;
  }

  public async getRoomByCodeAsync(code: string): Promise<KahootRoom | null> {
    const normalized = code.trim().toUpperCase();
    if (this.getDeletedRoomCodes().has(normalized)) return null;
    const localRoom = this.getRoomByCode(normalized);
    if (localRoom) return localRoom;

    try {
      const docSnap = await getDoc(doc(db, 'kahootRooms', normalized));
      if (docSnap.exists()) {
        const roomData = docSnap.data() as KahootRoom;
        if (roomData && roomData.code && !this.getDeletedRoomCodes().has(normalized)) {
          const rooms = this.getRooms();
          if (!rooms.some((r) => r.code.toUpperCase() === normalized)) {
            rooms.unshift(roomData);
            localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
            this.notifyRoomListeners(rooms);
          }
          return roomData;
        }
      }
    } catch (err) {
      console.warn('Could not fetch room from cloud:', err);
    }
    return null;
  }

  // Student Game Results
  public getResults(): StudentGameResult[] {
    this.init();
    try {
      const clearedAt = this.getClearedResultsTimestamp();
      const deletedIds = this.getDeletedResultIds();
      const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
      const list: StudentGameResult[] = data ? JSON.parse(data) : [];
      return list.filter((r) => {
        if (r.submittedAt && r.submittedAt <= clearedAt) return false;
        if (deletedIds.has(r.id)) return false;
        return true;
      });
    } catch (e) {
      return [];
    }
  }

  public async saveResult(result: StudentGameResult) {
    const results = this.getResults().filter((r) => r.id !== result.id);
    results.unshift(result);
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
    this.notifyResultListeners(results);

    try {
      const payload = {
        id: result.id,
        studentName: result.studentName,
        roomCode: result.roomCode,
        caseId: result.caseId,
        caseTitle: result.caseTitle,
        score: result.score,
        maxScore: result.maxScore,
        completionTimeSeconds: result.completionTimeSeconds,
        timeLimitSeconds: result.timeLimitSeconds,
        gradePercentage: result.gradePercentage,
        rankBadge: result.rankBadge,
        submittedAt: result.submittedAt,
      };
      await setDoc(doc(db, 'results', result.id), payload);
      await setDoc(doc(db, 'studentGameResults', result.id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `results/${result.id}`);
    }
  }

  public async fetchCloudRooms(): Promise<KahootRoom[]> {
    try {
      const path = 'kahootRooms';
      const snap = await getDocs(collection(db, path));
      const deletedRooms = this.getDeletedRoomCodes();
      const cloudRooms: KahootRoom[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as KahootRoom;
        if (data && data.code) {
          const norm = data.code.trim().toUpperCase();
          if (!deletedRooms.has(norm)) {
            cloudRooms.push(data);
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(cloudRooms));
      this.notifyRoomListeners(cloudRooms);
      return cloudRooms;
    } catch (err) {
      console.warn('Using local cache for rooms:', err);
    }
    return this.getRooms();
  }

  // Evaluate mistakes and calculate score based on simulation performance
  public evaluateStudentPerformance(
    studentName: string,
    roomCode: string,
    selectedCase: ClinicalCase,
    monitored: MonitoredData,
    settings: VentilatorSettings,
    patient: PatientParameters,
    elapsedSeconds: number,
    timeLimitSeconds: number
  ): StudentGameResult {
    let score = 1000;
    const mistakes: StudentMistake[] = [];
    const strengths: string[] = [];

    const vtPerKg = monitored.vte / Math.max(1, patient.idealBodyWeightKg);

    // 1. Volutrauma check: Vt > 8.0 mL/kg
    if (vtPerKg > 8.0) {
      score -= 180;
      mistakes.push({
        id: 'volutrauma',
        category: 'volutrauma',
        title: 'Volume Corrente Excessivo (Volutrauma)',
        description: `O Vt ajustado foi de ${vtPerKg.toFixed(1)} mL/kg IBW, acima do limite protetor de 6.0 mL/kg.`,
        recommendation: 'Calcule o Peso Predito (IBW) e ajuste o Vt inicial entre 4 e 6 mL/kg na SDRA.',
        penaltyPoints: 180,
      });
    } else if (vtPerKg <= 6.5) {
      strengths.push('Excelente ajuste de Volume Corrente Protetor (≤ 6.0 mL/kg IBW).');
    }

    // 2. Barotrauma & Driving Pressure: DP > 14 cmH2O
    if (monitored.drivingPressure > 14.5 && monitored.isPlateauMeasured) {
      score -= 200;
      mistakes.push({
        id: 'driving_pressure',
        category: 'barotrauma',
        title: 'Driving Pressure Elevada (ΔP > 14 cmH₂O)',
        description: `A Pressão de Distensão Alveolar atingiu ${monitored.drivingPressure.toFixed(0)} cmH₂O, aumentando o risco de Lesão Pulmonar Induzida pela Ventilação (VILI).`,
        recommendation: 'Reduza o Volume Corrente ou titule a PEEP para otimizar a complacência e manter ΔP ≤ 14 cmH₂O.',
        penaltyPoints: 200,
      });
    } else if (monitored.isPlateauMeasured && monitored.drivingPressure <= 14) {
      strengths.push('Driving Pressure mantida em zona estritamente protetora (ΔP ≤ 14 cmH₂O).');
    }

    // 3. Atelectrauma: Low PEEP in ARDS
    if (patient.pathology === 'sdra' && settings.peep < 8) {
      score -= 150;
      mistakes.push({
        id: 'atelectrauma',
        category: 'atelectrauma',
        title: 'PEEP Insuficiente em SDRA (Atelectrauma)',
        description: `A PEEP de ${settings.peep} cmH₂O causou colapso e abertura cíclica dos alvéolos ao final da expiração.`,
        recommendation: 'Em pacientes com SDRA, utilize PEEP adequada (mínimo de 10 a 14 cmH₂O) conforme a tabela PEEP/FiO₂.',
        penaltyPoints: 150,
      });
    } else if (patient.pathology === 'sdra' && settings.peep >= 10) {
      strengths.push('PEEP adequadamente titulada para prevenção de atelectrauma.');
    }

    // 4. Gasometry Acidosis / Alkalosis check
    if (monitored.ph < 7.20) {
      score -= 120;
      mistakes.push({
        id: 'severe_acidosis',
        category: 'acidosis',
        title: 'Acidose Respiratória Descompensada (pH < 7.20)',
        description: `A PaCO₂ elevada (${monitored.paco2} mmHg) manteve o pH criticamente acidótico (${monitored.ph.toFixed(2)}).`,
        recommendation: 'Aumente a Frequência Respiratória para lavar PaCO₂ ou corrija o espaço morto.',
        penaltyPoints: 120,
      });
    } else if (monitored.ph >= 7.30 && monitored.ph <= 7.45) {
      strengths.push('Equilíbrio Ácido-Básico (pH) corrigido com sucesso.');
    }

    // 5. Diagnostic maneuvers check
    if (!monitored.isPlateauMeasured) {
      score -= 100;
      mistakes.push({
        id: 'no_pause',
        category: 'asynchrony',
        title: 'Ausência de Mensuração de Pressão de Platô',
        description: 'A Pausa Inspiratória não foi realizada para avaliar Pplat e Cstat.',
        recommendation: 'Mantenha pressionado o botão "Pausa Insp." para monitorar a Pressão de Platô periodicamente.',
        penaltyPoints: 100,
      });
    } else {
      strengths.push('Realizou manobras de pausa inspiratória para monitoramento rigoroso.');
    }

    // 6. Speed & Time Bonus
    if (elapsedSeconds < timeLimitSeconds * 0.6) {
      score += 100; // Fast resolution bonus
      strengths.push('Resolução rápida e ágil do caso no tempo estipulado.');
    } else if (elapsedSeconds > timeLimitSeconds) {
      score -= 80;
      mistakes.push({
        id: 'time_expired',
        category: 'time_management',
        title: 'Excesso de Tempo',
        description: 'O tempo limite configurado para o caso foi excedido.',
        recommendation: 'Pratique a tomada de decisão rápida na admissão inicial do paciente.',
        penaltyPoints: 80,
      });
    }

    score = Math.max(100, Math.min(1000, score));
    const gradePercentage = Math.round((score / 1000) * 100);

    let rankBadge = '🥉 Aprendiz de UTI';
    if (gradePercentage >= 90) rankBadge = '🥇 Mestre em Ventilação Protetora';
    else if (gradePercentage >= 75) rankBadge = '🥈 Especialista em UTI';
    else if (gradePercentage >= 60) rankBadge = '🥉 Residente em Formação';

    const result: StudentGameResult = {
      id: `result_${Date.now()}`,
      studentName: studentName.trim() || 'Aluno Anônimo',
      roomCode: roomCode.toUpperCase(),
      caseId: selectedCase.id,
      caseTitle: selectedCase.title,
      score,
      maxScore: 1000,
      completionTimeSeconds: Math.round(elapsedSeconds),
      timeLimitSeconds,
      gradePercentage,
      rankBadge,
      mistakes,
      strengths,
      submittedAt: Date.now(),
    };

    this.saveResult(result);
    return result;
  }

  public async deleteRoom(code: string) {
    const normalized = code.trim().toUpperCase();
    this.addDeletedRoomCode(normalized);
    const rooms = this.getRooms().filter((r) => r.code.toUpperCase() !== normalized);
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    this.notifyRoomListeners(rooms);
    try {
      await deleteDoc(doc(db, 'kahootRooms', normalized));
      await deleteDoc(doc(db, 'kahootRooms', normalized, 'state', 'current')).catch(() => {});
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `kahootRooms/${normalized}`);
    }
  }

  public toggleRoomActive(code: string) {
    const rooms = this.getRooms().map((r) => {
      if (r.code === code) {
        return { ...r, active: !r.active };
      }
      return r;
    });
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    this.notifyRoomListeners(rooms);
  }

  public async deleteResult(id: string) {
    this.addDeletedResultId(id);
    const results = this.getResults().filter((res) => res.id !== id);
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
    this.notifyResultListeners(results);
    try {
      await deleteDoc(doc(db, 'results', id)).catch(() => {});
      await deleteDoc(doc(db, 'studentGameResults', id)).catch(() => {});
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `results/${id}`);
    }
  }

  public async clearResults() {
    const clearedAt = Date.now();
    this.setClearedResultsTimestamp(clearedAt);
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify([]));
    educationalStorage.clearDebriefingReports();
    this.notifyResultListeners([]);

    try {
      const snap = await getDocs(collection(db, 'results'));
      const batchPromises: Promise<void>[] = [];
      snap.forEach((docSnap) => {
        batchPromises.push(deleteDoc(docSnap.ref));
      });
      const snap2 = await getDocs(collection(db, 'studentGameResults'));
      snap2.forEach((docSnap) => {
        batchPromises.push(deleteDoc(docSnap.ref));
      });
      await Promise.all(batchPromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'results/clear');
    }
  }

  public async fetchCloudResults(): Promise<StudentGameResult[]> {
    try {
      const snap = await getDocs(collection(db, 'results'));
      const clearedAt = this.getClearedResultsTimestamp();
      const deletedIds = this.getDeletedResultIds();
      const cloudResults: StudentGameResult[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as StudentGameResult;
        if (data && data.studentName) {
          if (data.submittedAt && data.submittedAt <= clearedAt) return;
          if (deletedIds.has(docSnap.id)) return;
          cloudResults.push(data);
        }
      });
      const sorted = cloudResults.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(sorted));
      this.notifyResultListeners(sorted);
      return sorted;
    } catch (err) {
      console.warn('Using local cache for results:', err);
    }
    return this.getResults();
  }

  private clientId: string = typeof window !== 'undefined'
    ? (sessionStorage.getItem('sim_client_id') || (() => {
        const id = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('sim_client_id', id);
        return id;
      })())
    : `client_${Date.now()}`;

  public getClientId(): string {
    return this.clientId;
  }

  public async publishRoomState(roomCode: string, state: any) {
    try {
      const normalized = roomCode.trim().toUpperCase();
      await setDoc(doc(db, 'kahootRooms', normalized, 'state', 'current'), {
        ...state,
        senderId: this.clientId,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid || 'anonymous',
      }, { merge: true });
    } catch (err) {
      console.warn('Could not publish room state to cloud:', err);
    }
  }

  public subscribeRoomState(roomCode: string, callback: (state: any) => void): () => void {
    const normalized = roomCode.trim().toUpperCase();
    const unsub = onSnapshot(
      doc(db, 'kahootRooms', normalized, 'state', 'current'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Avoid echoing back our own writes
          if (data && data.senderId === this.clientId) {
            return;
          }
          callback(data);
        }
      },
      (err) => {
        console.warn('Room state live sync error:', err);
      }
    );
    return unsub;
  }
}

export const localDatabase = new LocalDatabaseService();
