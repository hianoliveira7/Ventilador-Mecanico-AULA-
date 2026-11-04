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
  category: 'volutrauma' | 'barotrauma' | 'atelectrauma' | 'acidosis' | 'alkalosis' | 'asynchrony' | 'time_management' | 'clinical_management' | 'nursing_care';
  title: string;
  description: string;
  recommendation: string;
  penaltyPoints: number;
}

export interface RoleScoreBreakdown {
  physioScore: number;
  physioMaxScore: number;
  physioFeedback: string[];
  doctorScore: number;
  doctorMaxScore: number;
  doctorFeedback: string[];
  nurseScore: number;
  nurseMaxScore: number;
  nurseFeedback: string[];
  teamScore: number;
  teamMaxScore: number;
  teamFeedback: string[];
}

export interface StudentGameResult {
  id: string;
  studentName: string;
  teamName?: string;
  isTeamMode?: boolean;
  role?: string;
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
  roleBreakdown?: RoleScoreBreakdown;
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
  mode?: 'individual' | 'team';
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

  public async registerStudent(studentName: string, roomCode: string, teamRole: string = 'Fisioterapeuta Respiratório', teamName?: string) {
    const studentId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      await setDoc(doc(db, 'students', studentId), {
        id: studentId,
        studentName,
        teamName: teamName?.trim() || null,
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
        mode: room.mode || 'individual',
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
      const payload: Record<string, any> = {
        id: result.id,
        studentName: result.studentName,
        teamName: result.teamName || null,
        isTeamMode: Boolean(result.isTeamMode),
        role: result.role || null,
        roomCode: result.roomCode,
        caseId: result.caseId,
        caseTitle: result.caseTitle,
        score: result.score,
        maxScore: result.maxScore,
        completionTimeSeconds: result.completionTimeSeconds,
        timeLimitSeconds: result.timeLimitSeconds,
        gradePercentage: result.gradePercentage,
        rankBadge: result.rankBadge,
        mistakes: result.mistakes,
        strengths: result.strengths,
        submittedAt: result.submittedAt,
      };
      if (result.roleBreakdown) {
        payload.roleBreakdown = result.roleBreakdown;
      }
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

  // Evaluate mistakes and calculate score based on collaborative multi-professional simulation performance
  public evaluateStudentPerformance(
    studentName: string,
    roomCode: string,
    selectedCase: ClinicalCase,
    monitored: MonitoredData,
    settings: VentilatorSettings,
    patient: PatientParameters,
    elapsedSeconds: number,
    timeLimitSeconds: number,
    teamName?: string,
    isTeamMode?: boolean,
    studentRole?: string
  ): StudentGameResult {
    let score = 1000;
    const mistakes: StudentMistake[] = [];
    const strengths: string[] = [];

    // Role Score Tracking
    let physioScore = 350;
    const physioMaxScore = 350;
    const physioFeedback: string[] = [];

    let doctorScore = 250;
    const doctorMaxScore = 250;
    const doctorFeedback: string[] = [];

    let nurseScore = 250;
    const nurseMaxScore = 250;
    const nurseFeedback: string[] = [];

    let teamScore = 150;
    const teamMaxScore = 150;
    const teamFeedback: string[] = [];

    const vtPerKg = monitored.vte / Math.max(1, patient.idealBodyWeightKg);

    // ==========================================
    // 🫁 1. FISIOTERAPIA RESPIRATÓRIA (350 pts)
    // ==========================================
    // 1.1 Volutrauma check: Vt > 8.0 mL/kg
    if (vtPerKg > 8.0) {
      score -= 150;
      physioScore -= 120;
      mistakes.push({
        id: 'volutrauma',
        category: 'volutrauma',
        title: 'Volume Corrente Excessivo (Fisioterapia)',
        description: `O Vt ajustado foi de ${vtPerKg.toFixed(1)} mL/kg IBW, acima do limite protetor de 6.0 mL/kg.`,
        recommendation: 'A Fisioterapia deve calcular o Peso Predito (IBW) e ajustar o Vt entre 4 e 6 mL/kg na SDRA.',
        penaltyPoints: 150,
      });
      physioFeedback.push(`Volume corrente elevado (${vtPerKg.toFixed(1)} mL/kg IBW).`);
    } else if (vtPerKg <= 6.5) {
      strengths.push('🫁 Fisioterapia: Excelente ajuste de Volume Corrente Protetor (≤ 6.0 mL/kg IBW).');
      physioFeedback.push('Volume corrente rigorosamente protetor (≤ 6.0 mL/kg).');
    }

    // 1.2 Barotrauma & Driving Pressure: DP > 14 cmH2O
    if (monitored.drivingPressure > 14.5 && monitored.isPlateauMeasured) {
      score -= 150;
      physioScore -= 120;
      mistakes.push({
        id: 'driving_pressure',
        category: 'barotrauma',
        title: 'Driving Pressure Elevada (Fisioterapia)',
        description: `A Pressão de Distensão Alveolar atingiu ${monitored.drivingPressure.toFixed(0)} cmH₂O, elevando o risco de VILI.`,
        recommendation: 'A Fisioterapia deve reduzir o Volume Corrente ou titular a PEEP para otimizar complacência e manter ΔP ≤ 14 cmH₂O.',
        penaltyPoints: 150,
      });
      physioFeedback.push(`Driving Pressure excessiva (${monitored.drivingPressure.toFixed(1)} cmH₂O).`);
    } else if (monitored.isPlateauMeasured && monitored.drivingPressure <= 14) {
      strengths.push('🫁 Fisioterapia: Driving Pressure mantida em zona estritamente protetora (ΔP ≤ 14 cmH₂O).');
      physioFeedback.push('Driving Pressure protetora (ΔP ≤ 14 cmH₂O).');
    }

    // 1.3 Atelectrauma: Low PEEP in ARDS
    if (patient.pathology === 'sdra' && settings.peep < 8) {
      score -= 100;
      physioScore -= 80;
      mistakes.push({
        id: 'atelectrauma',
        category: 'atelectrauma',
        title: 'PEEP Insuficiente em SDRA (Fisioterapia)',
        description: `A PEEP de ${settings.peep} cmH₂O causou colapso e abertura cíclica dos alvéolos ao final da expiração.`,
        recommendation: 'A Fisioterapia deve manter PEEP adequada (10 a 14 cmH₂O) na SDRA.',
        penaltyPoints: 100,
      });
      physioFeedback.push('PEEP abaixo da zona ideal para SDRA (< 8 cmH₂O).');
    } else if (patient.pathology === 'sdra' && settings.peep >= 10) {
      strengths.push('🫁 Fisioterapia: PEEP adequadamente titulada para prevenção de atelectrauma.');
      physioFeedback.push('PEEP protetora bem titulada.');
    }

    // 1.4 Diagnostic hold maneuvers check
    if (!monitored.isPlateauMeasured) {
      score -= 70;
      physioScore -= 50;
      mistakes.push({
        id: 'no_pause',
        category: 'asynchrony',
        title: 'Ausência de Mensuração de Platô (Fisioterapia)',
        description: 'A Pausa Inspiratória não foi realizada para avaliar Pplat e complacência estática.',
        recommendation: 'A Fisioterapia deve acionar a Pausa Inspiratória para checar Pplat e Cstat periodicamente.',
        penaltyPoints: 70,
      });
      physioFeedback.push('Pausa inspiratória não mensurada durante a condução.');
    } else {
      strengths.push('🫁 Fisioterapia: Realizou pausa inspiratória e monitorização da mecânica pulmonar.');
      physioFeedback.push('Monitorização estática de platô realizada com sucesso.');
    }

    // ==========================================
    // 🩺 2. MEDICINA INTENSIVISTA (250 pts)
    // ==========================================
    // 2.1 Bronchospasm management
    if (patient.resistance > 16) {
      score -= 90;
      doctorScore -= 100;
      mistakes.push({
        id: 'bronchospasm_unmanaged',
        category: 'clinical_management',
        title: 'Broncoespasmo Não Tratado (Medicina)',
        description: `A resistência das vias aéreas permaneceu elevada (${patient.resistance} cmH₂O/(L/s)) aumentando PIP desnecessariamente.`,
        recommendation: 'O Médico da equipe deve prescrever broncodilatador inalatório (Salbutamol) no painel de ações.',
        penaltyPoints: 90,
      });
      doctorFeedback.push(`Resistência Raw elevada (${patient.resistance} cmH₂O/(L/s)) sem broncodilatador.`);
    } else {
      strengths.push('🩺 Medicina: Resistência de vias aéreas e broncoespasmo controlados com sucesso.');
      doctorFeedback.push('Vias aéreas livres de broncoespasmo severo.');
    }

    // 2.2 Sedation / Drive & Patient-Ventilator Harmony
    if (patient.spontaneousDrive && patient.spontaneousRate > 32) {
      score -= 80;
      doctorScore -= 100;
      mistakes.push({
        id: 'drive_unmanaged',
        category: 'asynchrony',
        title: 'Drive Respiratório / Agitação Excessiva (Medicina)',
        description: 'O paciente apresentou taquipneia espontânea descompensada e esforço muscular acentuado.',
        recommendation: 'O Médico deve titular o nível de sedação (RASS -3 ou -4) ou considerar bloqueio neuromuscular temporário.',
        penaltyPoints: 80,
      });
      doctorFeedback.push('Agitação e drive espontâneo descompassado sem titulação de sedação.');
    } else {
      strengths.push('🩺 Medicina: Nível de sedação e sincronia neuro-respiratória bem geridos.');
      doctorFeedback.push('Sedação e sincronia neuro-ventilatória adequadas.');
    }

    // 2.3 Critical mechanics stabilization
    if (patient.compliance < 15) {
      doctorScore -= 50;
      doctorFeedback.push('Complacência criticamente baixa; monitorar necessidade de descompressão/otimização.');
    } else {
      doctorFeedback.push('Mecânica e estabilidade torácica preservadas.');
    }

    // ==========================================
    // 💊 3. ENFERMAGEM UTI (250 pts)
    // ==========================================
    // 3.1 Airway Secretions Suctioning
    if (patient.secretionsSeverity === 'severe' || patient.secretionsSeverity === 'moderate') {
      score -= 100;
      nurseScore -= 120;
      mistakes.push({
        id: 'secretions_unmanaged',
        category: 'nursing_care',
        title: 'Secreções Traqueais Não Aspiradas (Enfermagem)',
        description: 'O acúmulo de secreções aumentou a resistência ao fluxo aéreo e gerou oscilações nas curvas de fluxo.',
        recommendation: 'A Enfermagem da equipe deve realizar a Aspiração Traqueal pelo painel multidisciplinar.',
        penaltyPoints: 100,
      });
      nurseFeedback.push('Secreções endotraqueais não aspiradas.');
    } else {
      strengths.push('💊 Enfermagem: Aspiração e higiene das vias aéreas mantidas em padrão de excelência.');
      nurseFeedback.push('Vias aéreas aspiradas e desobstruídas.');
    }

    // 3.2 Endotracheal Tube Cuff Seal
    if (patient.circuitLeakPercent && patient.circuitLeakPercent > 0) {
      score -= 100;
      nurseScore -= 120;
      mistakes.push({
        id: 'cuff_leak_unmanaged',
        category: 'nursing_care',
        title: 'Fuga de Ar no Cuff do Tubo (Enfermagem)',
        description: `O cuff desinflado causou perda de volume expirado de ${patient.circuitLeakPercent}% e queda de PEEP efetiva.`,
        recommendation: 'A Enfermagem deve inflar e calibrar a pressão do cuff para 20-30 cmH₂O para selar o circuito.',
        penaltyPoints: 100,
      });
      nurseFeedback.push(`Fuga de ar no cuff não corrigida (${patient.circuitLeakPercent}%).`);
    } else {
      strengths.push('💊 Enfermagem: Selamento do cuff calibrado perfeitamente (0% de fuga).');
      nurseFeedback.push('Cuff perfeitamente selado sem fuga de ar.');
    }

    // ==========================================
    // 🤝 4. SINERGIA DA EQUIPE & GASOMETRIA (150 pts)
    // ==========================================
    // 4.1 Gasometry Acidosis / Alkalosis check
    if (monitored.ph < 7.20) {
      score -= 100;
      teamScore -= 90;
      mistakes.push({
        id: 'severe_acidosis',
        category: 'acidosis',
        title: 'Acidose Respiratória Descompensada (Equipe)',
        description: `A PaCO₂ elevada (${monitored.paco2} mmHg) manteve o pH criticamente acidótico (${monitored.ph.toFixed(2)}).`,
        recommendation: 'A Equipe deve coordenar aumento de ventilação-minuto e lavagem de CO₂.',
        penaltyPoints: 100,
      });
      teamFeedback.push(`pH acidótico (${monitored.ph.toFixed(2)}) com hipercapnia.`);
    } else if (monitored.ph >= 7.30 && monitored.ph <= 7.45) {
      strengths.push('🤝 Equipe: Equilíbrio Ácido-Básico (pH 7.30-7.45) estabilizado com sucesso conjunto.');
      teamFeedback.push('Equilíbrio ácido-básico (pH) compensado.');
    }

    // 4.2 Oxygenation Target
    if (monitored.spo2 >= 92 && monitored.spo2 <= 98) {
      teamFeedback.push('Oxigenação (SpO₂) em faixa estritamente segura e normóxica.');
    } else if (monitored.spo2 < 88) {
      score -= 80;
      teamScore -= 60;
      mistakes.push({
        id: 'hypoxemia',
        category: 'clinical_management',
        title: 'Hipoxemia Refratária (Equipe)',
        description: `SpO₂ de ${monitored.spo2.toFixed(0)}% abaixo do limiar seguro de oxigenação.`,
        recommendation: 'A Equipe deve titular FiO₂/PEEP ou considerar posição prona na SDRA.',
        penaltyPoints: 80,
      });
      teamFeedback.push(`SpO₂ abaixo do alvo seguro (${monitored.spo2.toFixed(0)}%).`);
    }

    // 4.3 Speed & Time Bonus
    if (elapsedSeconds < timeLimitSeconds * 0.6) {
      score += 50;
      strengths.push('⚡ Equipe: Resolução rápida e ágil do caso no tempo estipulado.');
      teamFeedback.push('Tempo de resposta rápido e ágil.');
    } else if (elapsedSeconds > timeLimitSeconds) {
      score -= 60;
      mistakes.push({
        id: 'time_expired',
        category: 'time_management',
        title: 'Tempo Limite Excedido (Equipe)',
        description: 'O tempo limite configurado para o caso foi excedido.',
        recommendation: 'Pratiquem a comunicação ágil entre médico, fisio e enfermagem na UTI.',
        penaltyPoints: 60,
      });
      teamFeedback.push('Tempo limite de desafio excedido.');
    }

    // Ensure scores stay within physiological bounds
    physioScore = Math.max(30, Math.min(physioMaxScore, physioScore));
    doctorScore = Math.max(30, Math.min(doctorMaxScore, doctorScore));
    nurseScore = Math.max(30, Math.min(nurseMaxScore, nurseScore));
    teamScore = Math.max(20, Math.min(teamMaxScore, teamScore));

    score = Math.max(100, Math.min(1000, score));
    const gradePercentage = Math.round((score / 1000) * 100);

    let rankBadge = '🥉 Aprendiz de UTI';
    if (gradePercentage >= 90) rankBadge = '🥇 Equipe UTI Padrão Ouro';
    else if (gradePercentage >= 75) rankBadge = '🥈 Especialista em UTI';
    else if (gradePercentage >= 60) rankBadge = '🥉 Equipe em Formação';

    const cleanTeam = teamName?.trim();
    const result: StudentGameResult = {
      id: `result_${Date.now()}`,
      studentName: studentName.trim() || 'Aluno Anônimo',
      teamName: cleanTeam || undefined,
      isTeamMode: Boolean(isTeamMode || cleanTeam),
      role: studentRole,
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
      roleBreakdown: {
        physioScore,
        physioMaxScore,
        physioFeedback,
        doctorScore,
        doctorMaxScore,
        doctorFeedback,
        nurseScore,
        nurseMaxScore,
        nurseFeedback,
        teamScore,
        teamMaxScore,
        teamFeedback,
      },
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
        if (data && (data.studentName || data.teamName)) {
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

  public async publishRoomState(
    roomCode: string,
    state: any,
    teamName?: string,
    metadata?: { role?: string; author?: string; actionType?: string }
  ): Promise<number | null> {
    try {
      const normalized = roomCode.trim().toUpperCase();
      const teamSlug = teamName && teamName.trim()
        ? teamName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
        : null;

      const docRef = teamSlug
        ? doc(db, 'kahootRooms', normalized, 'teams', teamSlug)
        : doc(db, 'kahootRooms', normalized, 'state', 'current');

      const now = Date.now();
      const payload: Record<string, any> = {
        ...state,
        senderId: this.clientId,
        updatedAt: now,
        updatedBy: auth.currentUser?.uid || 'anonymous',
      };

      if (metadata?.role) payload.senderRole = metadata.role;
      if (metadata?.author) payload.senderAuthor = metadata.author;
      if (metadata?.actionType) payload.actionType = metadata.actionType;

      console.log(
        `[Kahoot Collab DB] 📡 publishRoomState [Room: ${normalized}${teamSlug ? ` | Team: ${teamSlug}` : ''}] action: "${metadata?.actionType || 'state_update'}" by "${metadata?.author || 'anonymous'}" (${metadata?.role || 'no-role'}) at t=${now}`
      );

      await setDoc(docRef, payload, { merge: true });
      return now;
    } catch (err) {
      console.warn('[Kahoot Collab DB] Could not publish room state to cloud:', err);
      return null;
    }
  }

  public subscribeRoomState(
    roomCode: string,
    callback: (state: any) => void,
    teamName?: string
  ): () => void {
    const normalized = roomCode.trim().toUpperCase();
    const teamSlug = teamName && teamName.trim()
      ? teamName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
      : null;

    const primaryDocRef = teamSlug
      ? doc(db, 'kahootRooms', normalized, 'teams', teamSlug)
      : doc(db, 'kahootRooms', normalized, 'state', 'current');

    console.log(
      `[Kahoot Collab DB] 🎧 Subscribing to room state [Room: ${normalized}${teamSlug ? ` | Team: ${teamSlug}` : ' (Main)'}]`
    );

    const unsubPrimary = onSnapshot(
      primaryDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Filter out our own writes to avoid self-echoes
          if (data && data.senderId === this.clientId) {
            return;
          }
          callback(data);
        }
      },
      (err) => {
        console.warn('[Kahoot Collab DB] Primary room state live sync error:', err);
      }
    );

    // If subscribed to a specific team, also listen to room-level doc for teacher global surprise events
    let unsubGlobal: (() => void) | null = null;
    if (teamSlug) {
      const globalDocRef = doc(db, 'kahootRooms', normalized, 'state', 'current');
      unsubGlobal = onSnapshot(
        globalDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data.surpriseEvent) {
              callback({ surpriseEvent: data.surpriseEvent });
            }
          }
        },
        (err) => {
          console.warn('[Kahoot Collab DB] Global room broadcast sync error:', err);
        }
      );
    }

    return () => {
      unsubPrimary();
      if (unsubGlobal) {
        unsubGlobal();
      }
    };
  }

  // Active Presence & Role Expiration Helpers
  public cleanStaleRoles(
    takenRolesDetails?: Record<string, { name: string; clientId: string; lastActive: number }>,
    legacyTakenRoles?: Record<string, string>,
    docUpdatedAt?: number
  ): Record<string, string> {
    const now = Date.now();
    const STALE_THRESHOLD_MS = 25000; // 25s heartbeat expiration
    const activeRoles: Record<string, string> = {};

    if (takenRolesDetails && typeof takenRolesDetails === 'object') {
      Object.entries(takenRolesDetails).forEach(([role, details]) => {
        if (details && details.name && details.lastActive) {
          if (now - details.lastActive <= STALE_THRESHOLD_MS) {
            activeRoles[role] = details.name;
          }
        }
      });
    }

    // Fallback for legacy format or docs updated recently
    if (Object.keys(activeRoles).length === 0 && legacyTakenRoles && typeof legacyTakenRoles === 'object') {
      // If doc was updated in the last 30s, trust legacy roles
      if (docUpdatedAt && now - docUpdatedAt <= 30000) {
        Object.entries(legacyTakenRoles).forEach(([role, name]) => {
          if (name && typeof name === 'string' && name.trim()) {
            activeRoles[role] = name.trim();
          }
        });
      }
    }

    return activeRoles;
  }

  public async pingRolePresence(
    roomCode: string,
    teamRole: string,
    studentName: string,
    teamName?: string,
    currentTakenDetails?: Record<string, { name: string; clientId: string; lastActive: number }>
  ): Promise<void> {
    if (!roomCode || !teamRole || !studentName) return;
    const now = Date.now();
    const updatedDetails = {
      ...(currentTakenDetails || {}),
      [teamRole]: {
        name: studentName.trim(),
        clientId: this.clientId,
        lastActive: now,
      },
    };

    // Keep legacy map synced
    const activeRolesMap: Record<string, string> = {};
    Object.entries(updatedDetails).forEach(([r, details]) => {
      if (details && details.name && now - details.lastActive <= 25000) {
        activeRolesMap[r] = details.name;
      }
    });

    await this.publishRoomState(
      roomCode,
      {
        takenRolesDetails: updatedDetails,
        takenRoles: activeRolesMap,
      },
      teamName,
      { role: teamRole, author: studentName, actionType: 'presence_ping' }
    );
  }

  public async releaseRolePresence(
    roomCode: string,
    teamRole: string,
    studentName: string,
    teamName?: string,
    currentTakenDetails?: Record<string, { name: string; clientId: string; lastActive: number }>
  ): Promise<void> {
    if (!roomCode) return;
    const normalized = roomCode.trim().toUpperCase();
    const teamSlug = teamName && teamName.trim()
      ? teamName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
      : null;

    const docRef = teamSlug
      ? doc(db, 'kahootRooms', normalized, 'teams', teamSlug)
      : doc(db, 'kahootRooms', normalized, 'state', 'current');

    const now = Date.now();
    const updatedDetails = { ...(currentTakenDetails || {}) };
    delete updatedDetails[teamRole];

    const activeRolesMap: Record<string, string> = {};
    Object.entries(updatedDetails).forEach(([r, details]) => {
      if (details && details.name && details.lastActive && now - details.lastActive <= 25000) {
        if (r !== teamRole) {
          activeRolesMap[r] = details.name;
        }
      }
    });

    console.log(`[Kahoot Presence] 🔓 Releasing role "${teamRole}" for student "${studentName}" in room ${normalized}`);

    try {
      await setDoc(
        docRef,
        {
          takenRolesDetails: updatedDetails,
          takenRoles: activeRolesMap,
          updatedAt: now,
          senderId: this.clientId,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not release role in Firestore:', err);
    }
  }

  public async clearAllTeamRoles(roomCode: string, teamName?: string): Promise<void> {
    if (!roomCode) return;
    const normalized = roomCode.trim().toUpperCase();
    const teamSlug = teamName && teamName.trim()
      ? teamName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
      : null;

    const docRef = teamSlug
      ? doc(db, 'kahootRooms', normalized, 'teams', teamSlug)
      : doc(db, 'kahootRooms', normalized, 'state', 'current');

    try {
      await setDoc(
        docRef,
        {
          takenRolesDetails: {},
          takenRoles: {},
          updatedAt: Date.now(),
          senderId: this.clientId,
        },
        { merge: true }
      );
      console.log(`[Kahoot Presence] 🧹 All occupied roles cleared for room ${normalized} team ${teamSlug || 'main'}`);
    } catch (err) {
      console.warn('Could not clear team roles:', err);
    }
  }
}

export const localDatabase = new LocalDatabaseService();
