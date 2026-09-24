import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Pencil,
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
  RotateCcw,
  Stethoscope,
  Wind,
  Droplet,
  Flame,
  Zap,
  KeyRound,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Printer,
  FileText,
  Sliders,
  Settings,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';
import { educationalStorage, QuizQuestionItem } from '../services/educationalStorage';
import { ClinicalCase, VentilationMode, PedagogicalSettings, CaseDebriefingReport } from '../types/ventilation';

interface TeacherAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCaseInSimulator?: (clinicalCase: ClinicalCase) => void;
  onPedagogicalSettingsChange?: (settings: PedagogicalSettings) => void;
}

export const TeacherAdminModal: React.FC<TeacherAdminModalProps> = ({
  isOpen,
  onClose,
  onLoadCaseInSimulator,
  onPedagogicalSettingsChange,
}) => {
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<'quiz' | 'cases' | 'new_quiz' | 'new_case' | 'pedagogy' | 'reports' | 'password'>('quiz');

  // Quiz Questions state
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [reports, setReports] = useState<CaseDebriefingReport[]>([]);
  const [pedagogicalSettings, setPedagogicalSettings] = useState<PedagogicalSettings>(educationalStorage.getPedagogicalSettings());
  const [notification, setNotification] = useState<string | null>(null);

  // Password Management state
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

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

  // Form for Clinical Case (Create or Edit)
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseCategory, setCaseCategory] = useState('SDRA');
  const [caseDifficulty, setCaseDifficulty] = useState<'Iniciante' | 'Intermediário' | 'Avançado'>('Intermediário');
  const [caseDescription, setCaseDescription] = useState('');
  const [caseHistory, setCaseHistory] = useState('');
  const [casePhysicalExam, setCasePhysicalExam] = useState('Tórax simétrico, sedado e adaptado à ventilação mecânica, hemodinamicamente estável com suporte habitual.');

  // Patient Profile & Detailed Physiology
  const [patientName, setPatientName] = useState('Novo Paciente UTI');
  const [patientAge, setPatientAge] = useState(55);
  const [patientGender, setPatientGender] = useState<'male' | 'female'>('male');
  const [patientHeight, setPatientHeight] = useState(170);
  const [patientWeight, setPatientWeight] = useState(70);

  // Respiratory Mechanics
  const [patientCompliance, setPatientCompliance] = useState(25); // Cst (mL/cmH2O)
  const [patientResistance, setPatientResistance] = useState(10); // Raw (cmH2O/L/s)
  const [recruitmentPotential, setRecruitmentPotential] = useState<'none' | 'low' | 'moderate' | 'high'>('high');

  // Gas Exchange & Metabolism
  const [shuntFraction, setShuntFraction] = useState(25); // Qs/Qt %
  const [deadSpaceFraction, setDeadSpaceFraction] = useState(45); // Vd/Vt % (0.45)
  const [baselineBicarbonate, setBaselineBicarbonate] = useState(24); // mEq/L
  const [metabolicRateVCO2, setMetabolicRateVCO2] = useState(200); // mL/min
  const [hemoglobin, setHemoglobin] = useState(12.0); // g/dL
  const [bodyTemperature, setBodyTemperature] = useState(37.0); // °C

  // Spontaneous Drive
  const [hasSpontaneousDrive, setHasSpontaneousDrive] = useState(false);
  const [spontaneousRate, setSpontaneousRate] = useState(18); // rpm
  const [spontaneousEffortPressure, setSpontaneousEffortPressure] = useState(-5); // cmH2O negative
  const [spontaneousDutyCycle, setSpontaneousDutyCycle] = useState(0.33);

  // Airway & Asynchrony triggers
  const [secretionsSeverity, setSecretionsSeverity] = useState<'none' | 'mild' | 'severe'>('none');
  const [circuitLeakPercent, setCircuitLeakPercent] = useState(0);
  const [endotrachealTubeSize, setEndotrachealTubeSize] = useState(8.0);

  // Initial Ventilator Settings
  const [initialMode, setInitialMode] = useState<VentilationMode>('VCV');
  const [initialFiO2, setInitialFiO2] = useState(60);
  const [initialPEEP, setInitialPEEP] = useState(10);
  const [initialRR, setInitialRR] = useState(16);
  const [initialVt, setInitialVt] = useState(420);
  const [initialPinsp, setInitialPinsp] = useState(18);

  // Initial ABG
  const [abgPH, setAbgPH] = useState(7.30);
  const [abgPaCO2, setAbgPaCO2] = useState(52);
  const [abgPaO2, setAbgPaO2] = useState(68);
  const [abgHCO3, setAbgHCO3] = useState(24);
  const [abgSpO2, setAbgSpO2] = useState(91);

  // Clinical Goals & Tips
  const [goalDescription1, setGoalDescription1] = useState('Manter Volume Protetor ≤ 6 mL/kg e Pplatô ≤ 30 cmH₂O');
  const [goalDescription2, setGoalDescription2] = useState('Normalizar oxigenação (PaO₂/FiO₂ > 200) com PEEP adequada');
  const [teachingPointsText, setTeachingPointsText] = useState('Avaliar o Peso Predito (IBW) para cálculo de volume protetor.\nMonitorar rigorosamente a Driving Pressure (ΔP ≤ 14 cmH₂O).');

  // Dynamic Worsening Progression Configuration
  const [enableDynamicWorsening, setEnableDynamicWorsening] = useState<boolean>(false);
  const [worseningPhaseTitle, setWorseningPhaseTitle] = useState('Fase 2: Deterioração Pulmonar & Queda de Complacência');
  const [worseningDescription, setWorseningDescription] = useState('O paciente apresentou piora inflamatória aguda: complacência caiu e o shunt aumentou. Reavalie a Driving Pressure imediatamente!');
  const [worsenedCompliance, setWorsenedCompliance] = useState<number>(18);
  const [worsenedResistance, setWorsenedResistance] = useState<number>(12);
  const [worsenedShuntFraction, setWorsenedShuntFraction] = useState<number>(38);
  const [worsenedDeadSpaceFraction, setWorsenedDeadSpaceFraction] = useState<number>(55);

  const calculatedIBW = Math.round(
    patientGender === 'male'
      ? 50 + 0.91 * (patientHeight - 152.4)
      : 45.5 + 0.91 * (patientHeight - 152.4)
  );

  const loadData = () => {
    setQuestions(educationalStorage.getAllQuizQuestions());
    setCases(educationalStorage.getAllClinicalCases());
    setReports(educationalStorage.getAllDebriefingReports());
    setPedagogicalSettings(educationalStorage.getPedagogicalSettings());
  };

  const handleUpdatePedagogicalSettings = (updated: Partial<PedagogicalSettings>) => {
    const saved = educationalStorage.savePedagogicalSettings(updated);
    setPedagogicalSettings(saved);
    if (onPedagogicalSettingsChange) {
      onPedagogicalSettingsChange(saved);
    }
    audioEngine.playConfirmBeep();
    showFeedback('Configurações pedagógicas atualizadas com sucesso!');
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
    if (confirm('Tem certeza que deseja excluir esta questão do banco de questões?')) {
      educationalStorage.deleteQuizQuestion(id);
      audioEngine.playClick(750);
      showFeedback('Questão removida do banco com sucesso.');
      loadData();
    }
  };

  const handleResetDefaultQuestions = () => {
    if (confirm('Deseja restaurar todas as questões padrão do sistema? Suas questões personalizadas serão mantidas no banco ativo.')) {
      educationalStorage.resetQuizQuestionsToDefault();
      audioEngine.playConfirmBeep();
      showFeedback('Questões padrão restauradas.');
      loadData();
    }
  };

  const handleStartNewCase = () => {
    setEditingCaseId(null);
    setCaseTitle('');
    setCaseCategory('SDRA');
    setCaseDifficulty('Intermediário');
    setCaseDescription('');
    setCaseHistory('');
    setCasePhysicalExam('Tórax simétrico, sedado e adaptado à ventilação mecânica, hemodinamicamente estável com suporte habitual.');
    setPatientName('Novo Paciente UTI');
    setPatientAge(55);
    setPatientGender('male');
    setPatientHeight(170);
    setPatientWeight(70);
    setPatientCompliance(25);
    setPatientResistance(10);
    setRecruitmentPotential('high');
    setShuntFraction(25);
    setDeadSpaceFraction(45);
    setBaselineBicarbonate(24);
    setMetabolicRateVCO2(200);
    setHemoglobin(12.0);
    setBodyTemperature(37.0);
    setHasSpontaneousDrive(false);
    setSpontaneousRate(18);
    setSpontaneousEffortPressure(-5);
    setSpontaneousDutyCycle(0.33);
    setSecretionsSeverity('none');
    setCircuitLeakPercent(0);
    setEndotrachealTubeSize(8.0);
    setInitialMode('VCV');
    setInitialFiO2(60);
    setInitialPEEP(10);
    setInitialRR(16);
    setInitialVt(420);
    setInitialPinsp(18);
    setAbgPH(7.30);
    setAbgPaCO2(52);
    setAbgPaO2(68);
    setAbgHCO3(24);
    setAbgSpO2(91);
    setGoalDescription1('Manter Volume Protetor ≤ 6 mL/kg e Pplatô ≤ 30 cmH₂O');
    setGoalDescription2('Normalizar oxigenação (PaO₂/FiO₂ > 200) com PEEP adequada');
    setTeachingPointsText('Avaliar o Peso Predito (IBW) para cálculo de volume protetor.\nMonitorar rigorosamente a Driving Pressure (ΔP ≤ 14 cmH₂O).');
    
    // Reset Dynamic Worsening
    setEnableDynamicWorsening(false);
    setWorseningPhaseTitle('Fase 2: Deterioração Pulmonar & Queda de Complacência');
    setWorseningDescription('O paciente apresentou piora inflamatória aguda: complacência caiu e o shunt aumentou. Reavalie a Driving Pressure imediatamente!');
    setWorsenedCompliance(18);
    setWorsenedResistance(12);
    setWorsenedShuntFraction(38);
    setWorsenedDeadSpaceFraction(55);

    setActiveTab('new_case');
  };

  const handleStartEditCase = (c: ClinicalCase) => {
    setEditingCaseId(c.id);
    setCaseTitle(c.title);
    setCaseCategory(c.category);
    setCaseDifficulty(c.difficulty);
    setCaseDescription(c.description);
    setCaseHistory(c.clinicalHistory || c.description);
    setCasePhysicalExam(c.physicalExam || '');
    setPatientName(c.patientProfile.name);
    setPatientAge(c.patientProfile.age);
    setPatientGender(c.patientProfile.gender);
    setPatientHeight(c.patientProfile.heightCm);
    setPatientWeight(c.patientProfile.actualWeightKg);
    setPatientCompliance(c.patientProfile.compliance);
    setPatientResistance(c.patientProfile.resistance);
    setRecruitmentPotential(c.patientProfile.recruitmentPotential || 'high');
    setShuntFraction(c.patientProfile.shuntFraction ?? 20);
    setDeadSpaceFraction(Math.round((c.patientProfile.deadSpaceFraction ?? 0.4) * 100));
    setBaselineBicarbonate(c.patientProfile.baselineBicarbonate ?? 24);
    setMetabolicRateVCO2(c.patientProfile.metabolicRateVCO2 ?? 200);
    setHemoglobin(c.patientProfile.hemoglobin ?? 12.0);
    setBodyTemperature(c.patientProfile.bodyTemperature ?? 37.0);
    setHasSpontaneousDrive(c.patientProfile.spontaneousDrive ?? false);
    setSpontaneousRate(c.patientProfile.spontaneousRate ?? 18);
    setSpontaneousEffortPressure(c.patientProfile.spontaneousEffortPressure ?? -5);
    setSpontaneousDutyCycle(c.patientProfile.spontaneousDutyCycle ?? 0.33);
    setSecretionsSeverity(c.patientProfile.secretionsSeverity ?? 'none');
    setCircuitLeakPercent(c.patientProfile.circuitLeakPercent ?? 0);
    setEndotrachealTubeSize(c.patientProfile.endotrachealTubeSize ?? 8.0);
    setInitialMode(c.initialSettings.mode || 'VCV');
    setInitialFiO2(c.initialSettings.fio2 || 60);
    setInitialPEEP(c.initialSettings.peep || 10);
    setInitialRR(c.initialSettings.respiratoryRate || 16);
    setInitialVt(c.initialSettings.tidalVolume || 420);
    setInitialPinsp(c.initialSettings.inspiratoryPressure || 18);
    setAbgPH(c.initialABG?.ph ?? 7.30);
    setAbgPaCO2(c.initialABG?.paco2 ?? 52);
    setAbgPaO2(c.initialABG?.pao2 ?? 68);
    setAbgHCO3(c.initialABG?.hco3 ?? 24);
    setAbgSpO2(c.initialABG?.spo2 ?? 91);
    setGoalDescription1(c.goals?.[0]?.description || 'Manter Volume Protetor ≤ 6 mL/kg e Pplatô ≤ 30 cmH₂O');
    setGoalDescription2(c.goals?.[1]?.description || 'Normalizar oxigenação (PaO₂/FiO₂ > 200) com PEEP adequada');
    setTeachingPointsText(c.teachingPoints ? c.teachingPoints.join('\n') : '');

    // Dynamic Worsening Load
    if (c.phases && c.phases.length > 1) {
      setEnableDynamicWorsening(true);
      setWorseningPhaseTitle(c.phases[1].name || 'Fase 2: Deterioração Pulmonar & Queda de Complacência');
      setWorseningDescription(c.phases[1].description || '');
      setWorsenedCompliance(c.phases[1].patientOverrides?.compliance ?? 18);
      setWorsenedResistance(c.phases[1].patientOverrides?.resistance ?? 12);
      setWorsenedShuntFraction(c.phases[1].patientOverrides?.shuntFraction ?? 38);
      setWorsenedDeadSpaceFraction(Math.round((c.phases[1].patientOverrides?.deadSpaceFraction ?? 0.55) * 100));
    } else {
      setEnableDynamicWorsening(false);
      setWorseningPhaseTitle('Fase 2: Deterioração Pulmonar & Queda de Complacência');
      setWorseningDescription('O paciente apresentou piora inflamatória aguda: complacência caiu e o shunt aumentou. Reavalie a Driving Pressure imediatamente!');
      setWorsenedCompliance(18);
      setWorsenedResistance(12);
      setWorsenedShuntFraction(38);
      setWorsenedDeadSpaceFraction(55);
    }

    setActiveTab('new_case');
    audioEngine.playClick(900);
  };

  const handleSaveCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseTitle.trim() || !caseDescription.trim()) {
      showFeedback('Preencha o título e a descrição do caso clínico.');
      return;
    }

    const targetId = editingCaseId || `teacher_case_${Date.now()}`;
    const existingCase = cases.find((c) => c.id === targetId);

    // Build progressive phases if dynamic worsening is enabled
    const configuredPhases = enableDynamicWorsening
      ? [
          {
            id: `phase-1-${targetId}`,
            name: 'Fase 1: Admissão & Estabilização Inicial',
            description: caseDescription.trim(),
            goals: [
              {
                id: `goal-1-${targetId}`,
                description: goalDescription1 || 'Manter ventilação protetora',
                isMet: (monitored: any) => monitored.drivingPressure <= 15 && monitored.drivingPressure > 0,
                targetFeedback: 'Estabilização inicial adequada.',
              },
            ],
          },
          {
            id: `phase-2-${targetId}`,
            name: worseningPhaseTitle.trim() || 'Fase 2: Deterioração Fisiopatológica Aguda',
            description: worseningDescription.trim() || 'O paciente apresentou piora aguda da mecânica pulmonar.',
            patientOverrides: {
              compliance: worsenedCompliance,
              resistance: worsenedResistance,
              shuntFraction: worsenedShuntFraction,
              deadSpaceFraction: Number((worsenedDeadSpaceFraction / 100).toFixed(2)),
            },
            goals: [
              {
                id: `goal-2-${targetId}`,
                description: 'Controlar Driving Pressure ≤ 14 cmH₂O e desmamar FiO₂',
                isMet: (monitored: any) => monitored.drivingPressure <= 14.5 && monitored.drivingPressure > 0,
                targetFeedback: 'Driving pressure controlada com sucesso apesar da piora mecânica.',
              },
            ],
          },
        ]
      : existingCase?.phases;

    const savedCase: ClinicalCase = {
      id: targetId,
      title: caseTitle.trim(),
      category: caseCategory as any,
      difficulty: caseDifficulty,
      description: caseDescription.trim(),
      clinicalHistory: caseHistory.trim() || caseDescription.trim(),
      physicalExam: casePhysicalExam.trim(),
      phases: configuredPhases,
      patientProfile: {
        name: patientName.trim() || 'Paciente Cadastrado',
        age: patientAge,
        gender: patientGender,
        heightCm: patientHeight,
        actualWeightKg: patientWeight,
        idealBodyWeightKg: calculatedIBW,
        compliance: patientCompliance,
        resistance: patientResistance,
        pathology: caseCategory.toLowerCase() as any,
        baselineBicarbonate: baselineBicarbonate,
        spontaneousDrive: hasSpontaneousDrive,
        spontaneousRate: hasSpontaneousDrive ? spontaneousRate : 0,
        spontaneousEffortPressure: hasSpontaneousDrive ? spontaneousEffortPressure : 0,
        spontaneousDutyCycle: spontaneousDutyCycle,
        metabolicRateVCO2: metabolicRateVCO2,
        metabolicRateVO2: Math.round(metabolicRateVCO2 * 1.25),
        deadSpaceFraction: deadSpaceFraction / 100,
        shuntFraction: shuntFraction,
        hemoglobin: hemoglobin,
        bodyTemperature: bodyTemperature,
        secretionsSeverity: secretionsSeverity,
        circuitLeakPercent: circuitLeakPercent,
        endotrachealTubeSize: endotrachealTubeSize,
      },
      initialSettings: {
        mode: initialMode,
        fio2: initialFiO2,
        peep: initialPEEP,
        triggerType: 'flow',
        triggerSensitivity: 2.0,
        tidalVolume: initialMode === 'VCV' ? initialVt : Math.round(calculatedIBW * 6),
        respiratoryRate: initialRR,
        flowWaveform: 'decelerating',
        inspiratoryFlow: 60,
        inspiratoryPausePercent: 10,
        inspiratoryPressure: initialPinsp,
        inspiratoryTimePCV: 0.9,
        pressureRiseTime: 0.1,
        pressureSupport: 10,
        expiratorySensitivity: 25,
        backupApneaTime: 20,
        pHigh: 22,
        pLow: 0,
        tHigh: 3.5,
        tLow: 0.6,
        simvRate: 12,
        simvPs: 10,
      },
      initialABG: {
        ph: abgPH,
        paco2: abgPaCO2,
        pao2: abgPaO2,
        hco3: abgHCO3,
        spo2: abgSpO2,
        fio2: initialFiO2,
      },
      goals: [
        {
          id: `goal-1-${Date.now()}`,
          description: goalDescription1,
          isMet: (monitored, settings, patient) => {
            const vtPerKg = settings.tidalVolume / (patient.idealBodyWeightKg || calculatedIBW);
            return vtPerKg <= 6.5 && (monitored.plateauPressure <= 30 || monitored.peakPressure <= 32);
          },
          targetFeedback: 'Ventilação protetora mantida com sucesso.',
        },
        {
          id: `goal-2-${Date.now()}`,
          description: goalDescription2,
          isMet: (monitored) => monitored.spo2 >= 92 && monitored.drivingPressure <= 15,
          targetFeedback: 'Oxigenação segura sem elevar excessivamente a driving pressure.',
        },
      ],
      teachingPoints: teachingPointsText.split('\n').filter((l) => l.trim() !== ''),
    };

    if (editingCaseId) {
      educationalStorage.updateClinicalCase(savedCase);
      showFeedback(`Caso clínico "${savedCase.title}" atualizado com sucesso!`);
    } else {
      educationalStorage.addClinicalCase(savedCase);
      showFeedback(`Novo Caso Clínico "${savedCase.title}" cadastrado com sucesso!`);
    }

    audioEngine.playConfirmBeep();
    setEditingCaseId(null);
    setActiveTab('cases');
    loadData();
  };

  const handleDeleteCase = (c: ClinicalCase) => {
    if (confirm(`Tem certeza que deseja excluir o caso clínico "${c.title}"?`)) {
      educationalStorage.deleteClinicalCase(c.id);
      audioEngine.playClick(750);
      showFeedback(`Caso clínico "${c.title}" excluído com sucesso.`);
      loadData();
    }
  };

  const handleResetDefaultCases = () => {
    if (confirm('Deseja restaurar todos os casos clínicos padrão do sistema? Seus casos criados ou modificados serão redefinidos para os padrões originais.')) {
      educationalStorage.resetClinicalCasesToDefault();
      audioEngine.playConfirmBeep();
      showFeedback('Casos clínicos padrão restaurados.');
      loadData();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      <div
        className={`w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all ${
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
              <span>Biblioteca de Casos ({cases.length})</span>
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
              <span>+ Nova Questão</span>
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
              <span>+ Novo Caso Clínico</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pedagogy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'pedagogy'
                  ? isLight
                    ? 'bg-white text-indigo-900 border-indigo-300 shadow-sm'
                    : 'bg-[#181d33] text-indigo-300 border-indigo-500 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-200/60 border-transparent'
                  : 'text-zinc-400 hover:bg-[#141829] border-transparent'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Controles Pedagógicos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'reports'
                  ? isLight
                    ? 'bg-white text-indigo-900 border-indigo-300 shadow-sm'
                    : 'bg-[#181d33] text-indigo-300 border-indigo-500 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-200/60 border-transparent'
                  : 'text-zinc-400 hover:bg-[#141829] border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Relatórios da Turma ({reports.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setPassError(null);
                setPassSuccess(null);
                setCurrentPassInput('');
                setNewPassInput('');
                setConfirmPassInput('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'password'
                  ? isLight
                    ? 'bg-white text-indigo-900 border-indigo-300 shadow-sm'
                    : 'bg-[#181d33] text-indigo-300 border-indigo-500 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-200/60 border-transparent'
                  : 'text-zinc-400 hover:bg-[#141829] border-transparent'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Alterar Senha</span>
            </button>
          </div>

          {activeTab === 'quiz' && (
            <button
              type="button"
              onClick={handleResetDefaultQuestions}
              className={`text-[10.5px] font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                isLight ? 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300' : 'bg-[#151928] text-zinc-400 border-zinc-700 hover:text-white'
              }`}
              title="Restaurar questões de fábrica"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Restaurar Padrões</span>
            </button>
          )}
        </div>

        {/* Feedback Toast */}
        {notification && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-mono font-bold flex items-center justify-between shrink-0 shadow-md animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-white hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {/* TAB 1: LIST QUIZ QUESTIONS (With Full Deletion) */}
          {activeTab === 'quiz' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-display font-bold">Questões de Avaliação Cadastradas ({questions.length})</h4>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Você pode gerenciar, adicionar e excluir qualquer questão deste banco de dados.
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
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
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

                      {/* Deletion Button for ANY question */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className={`p-1.5 rounded-lg border text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-all ${
                          isLight ? 'border-rose-200 bg-rose-50' : 'border-rose-900/50 bg-rose-950/30'
                        }`}
                        title="Excluir questão do Quiz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                    Alternativas de Resposta (Selecione a letra para marcar a correta):
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
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-display font-bold">Casos Clínicos e Cenários Cadastrados ({cases.length})</h4>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Gerencie, edite ou exclua qualquer caso clínico disponível para os estudantes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaultCases}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 border-zinc-700'
                    }`}
                    title="Restaurar banco original de casos"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Restaurar Padrão</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartNewCase}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Caso Clínico</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cases.map((c) => {
                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                        isLight ? 'bg-slate-50 border-slate-200 shadow-xs' : 'bg-[#0f1220] border-zinc-800 shadow-md'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            {c.category} • {c.difficulty}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditCase(c)}
                              className={`p-1.5 rounded-lg border text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer ${
                                isLight
                                  ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
                                  : 'bg-indigo-950/40 hover:bg-indigo-900/60 border-indigo-800/50'
                              }`}
                              title={`Editar caso clínico "${c.title}"`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCase(c)}
                              className={`p-1.5 rounded-lg border text-rose-500 hover:text-rose-400 transition-colors cursor-pointer ${
                                isLight
                                  ? 'bg-rose-50 hover:bg-rose-100 border-rose-200'
                                  : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/50'
                              }`}
                              title={`Excluir caso clínico "${c.title}"`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h5 className="text-xs font-display font-bold leading-snug">{c.title}</h5>
                        <p className={`text-[11px] leading-relaxed line-clamp-3 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          {c.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-inherit flex items-center justify-between gap-2">
                        <span className={`text-[9.5px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                          Cst: {c.patientProfile.compliance} • Raw: {c.patientProfile.resistance} • Shunt: {c.patientProfile.shuntFraction ?? 10}%
                        </span>

                        {onLoadCaseInSimulator && (
                          <button
                            type="button"
                            onClick={() => {
                              onLoadCaseInSimulator(c);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-[10px] cursor-pointer shrink-0"
                          >
                            Simulador →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: CREATE / EDIT CLINICAL CASE WITH COMPLETE PHYSIOLOGY CONTROLS */}
          {activeTab === 'new_case' && (
            <form onSubmit={handleSaveCase} className="space-y-5 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-display font-bold flex items-center gap-2">
                    {editingCaseId ? (
                      <>
                        <Pencil className="w-4 h-4 text-indigo-400" />
                        <span>Editar Caso Clínico ({caseTitle || 'Sem título'})</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>Cadastrar Novo Caso Clínico</span>
                      </>
                    )}
                  </h4>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Configure a fisiopatologia completa: Mecânica (Cst, Raw), Troca Gasosa (Shunt, Espaço Morto), Drive Respiratório e Gasometria.
                  </p>
                </div>

                {editingCaseId && (
                  <button
                    type="button"
                    onClick={handleStartNewCase}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold cursor-pointer ${
                      isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                    }`}
                  >
                    + Criar Novo em vez de Editar
                  </button>
                )}
              </div>

              {/* 1. Informações Básicas do Caso */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101424] border-zinc-800'}`}>
                <span className="text-xs font-mono font-bold text-indigo-400 block uppercase tracking-wider">
                  1. Identificação do Cenário
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-mono font-bold block mb-1">Título do Caso *</label>
                    <input
                      type="text"
                      value={caseTitle}
                      onChange={(e) => setCaseTitle(e.target.value)}
                      placeholder="Ex: SDRA Moderada secundária a Sepse Abdominal"
                      required
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Categoria / Tema</label>
                    <input
                      type="text"
                      value={caseCategory}
                      onChange={(e) => setCaseCategory(e.target.value)}
                      placeholder="Ex: SDRA, DPOC, Asma, Pós-Op"
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Nível de Dificuldade</label>
                    <select
                      value={caseDifficulty}
                      onChange={(e) => setCaseDifficulty(e.target.value as any)}
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    >
                      <option value="Iniciante">Iniciante</option>
                      <option value="Intermediário">Intermediário</option>
                      <option value="Avançado">Avançado</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Nome do Paciente</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Ex: Carlos E., 55 anos"
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold block mb-1">Descrição Breve do Desafio *</label>
                  <textarea
                    rows={2}
                    value={caseDescription}
                    onChange={(e) => setCaseDescription(e.target.value)}
                    placeholder="Descreva o desafio clínico que o aluno deve solucionar..."
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-xs leading-relaxed outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* 2. Antropometria & Peso Predito (IBW) */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101424] border-zinc-800'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    2. Antropometria & Biometria do Paciente
                  </span>
                  <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    IBW (Peso Predito): {calculatedIBW} kg
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Gênero</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value as any)}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    >
                      <option value="male">Masculino</option>
                      <option value="female">Feminino</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      value={patientHeight}
                      onChange={(e) => setPatientHeight(Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Idade (anos)</label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Peso Real (kg)</label>
                    <input
                      type="number"
                      value={patientWeight}
                      onChange={(e) => setPatientWeight(Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Mecânica Pulmonar Fisiológica (Cst, Raw, Recrutamento) */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101424] border-zinc-800'}`}>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block">
                  3. Mecânica Respiratória do Paciente
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
                      <span>Complacência Estática (Cst)</span>
                      <span className="text-amber-400">{patientCompliance} mL/cmH₂O</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={patientCompliance}
                      onChange={(e) => setPatientCompliance(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <span className="text-[9.5px] font-mono text-zinc-500 block">Normal: 50-80 | SDRA: 15-30</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
                      <span>Resistência Vias Aéreas (Raw)</span>
                      <span className="text-emerald-400">{patientResistance} cmH₂O/L/s</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="40"
                      step="1"
                      value={patientResistance}
                      onChange={(e) => setPatientResistance(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-[9.5px] font-mono text-zinc-500 block">Normal: 4-8 | DPOC/Asma: 15-35</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Potencial de Recrutamento</label>
                    <select
                      value={recruitmentPotential}
                      onChange={(e) => setRecruitmentPotential(e.target.value as any)}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    >
                      <option value="high">Alto (Responde bem a PEEP)</option>
                      <option value="moderate">Moderado</option>
                      <option value="low">Baixo</option>
                      <option value="none">Nenhum (Fibrose/Enfisema)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Troca Gasosa (Shunt Intrapulmonar & Espaço Morto) */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101424] border-zinc-800'}`}>
                <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider block">
                  4. Troca Gasosa & Oxigenação
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
                      <span>Shunt Intrapulmonar (Qs/Qt)</span>
                      <span className="text-rose-400">{shuntFraction}%</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="60"
                      step="1"
                      value={shuntFraction}
                      onChange={(e) => setShuntFraction(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <span className="text-[9.5px] font-mono text-zinc-500 block">Normal: 3-5% | SDRA Grave: &gt; 30%</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
                      <span>Espaço Morto Alveolar (Vd/Vt)</span>
                      <span className="text-amber-400">{deadSpaceFraction}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="75"
                      step="1"
                      value={deadSpaceFraction}
                      onChange={(e) => setDeadSpaceFraction(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <span className="text-[9.5px] font-mono text-zinc-500 block">Normal: 25-35% | DPOC/TEP: 50-70%</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
                      <span>Bicarbonato Basal (HCO₃⁻)</span>
                      <span className="text-purple-400">{baselineBicarbonate} mEq/L</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="42"
                      step="1"
                      value={baselineBicarbonate}
                      onChange={(e) => setBaselineBicarbonate(Number(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <span className="text-[9.5px] font-mono text-zinc-500 block">Normal: 22-26 | DPOC Crônico: 30-38</span>
                  </div>
                </div>
              </div>

              {/* 5. Drive Respiratório Espontâneo & Esforço Muscular */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101424] border-zinc-800'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    5. Drive Respiratório Espontâneo & Esforço Muscular
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasSpontaneousDrive}
                      onChange={(e) => setHasSpontaneousDrive(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <span className="text-xs font-mono font-bold text-emerald-400">Ativar Drive do Paciente</span>
                  </label>
                </div>

                {hasSpontaneousDrive && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-inherit">
                    <div>
                      <label className="text-[11px] font-mono font-bold block mb-1">FR Espontânea (rpm)</label>
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={spontaneousRate}
                        onChange={(e) => setSpontaneousRate(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono font-bold block mb-1">Pmus Esforço (cmH₂O neg.)</label>
                      <input
                        type="number"
                        min="-30"
                        max="-1"
                        value={spontaneousEffortPressure}
                        onChange={(e) => setSpontaneousEffortPressure(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono font-bold block mb-1">Secreções em Vias Aéreas</label>
                      <select
                        value={secretionsSeverity}
                        onChange={(e) => setSecretionsSeverity(e.target.value as any)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                        }`}
                      >
                        <option value="none">Nenhuma</option>
                        <option value="mild">Leve (discreto serrilhado)</option>
                        <option value="severe">Grave (alto ruído de fluxo)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Parâmetros Iniciais do Ventilador & Gasometria */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101424] border-zinc-800'}`}>
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                  6. Ajustes Iniciais de Entrada no Ventilador
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="text-[10px] font-mono font-bold block mb-1">Modo</label>
                    <select
                      value={initialMode}
                      onChange={(e) => setInitialMode(e.target.value as any)}
                      className={`w-full px-2 py-1 rounded-lg border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    >
                      <option value="VCV">VCV</option>
                      <option value="PCV">PCV</option>
                      <option value="PSV">PSV</option>
                      <option value="APRV">APRV</option>
                      <option value="SIMV_VC">SIMV-VC</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold block mb-1">FiO₂ (%)</label>
                    <input
                      type="number"
                      value={initialFiO2}
                      onChange={(e) => setInitialFiO2(Number(e.target.value))}
                      className={`w-full px-2 py-1 rounded-lg border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold block mb-1">PEEP (cmH₂O)</label>
                    <input
                      type="number"
                      value={initialPEEP}
                      onChange={(e) => setInitialPEEP(Number(e.target.value))}
                      className={`w-full px-2 py-1 rounded-lg border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold block mb-1">FR (rpm)</label>
                    <input
                      type="number"
                      value={initialRR}
                      onChange={(e) => setInitialRR(Number(e.target.value))}
                      className={`w-full px-2 py-1 rounded-lg border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold block mb-1">Vt (mL) / Pinsp</label>
                    <input
                      type="number"
                      value={initialVt}
                      onChange={(e) => setInitialVt(Number(e.target.value))}
                      className={`w-full px-2 py-1 rounded-lg border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 7. Metas e Desafios Pedagógicos */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101424] border-zinc-800'}`}>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block">
                  7. Metas Terapêuticas & Pontos de Ensino
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Meta 1 (Proteção Pulmonar)</label>
                    <input
                      type="text"
                      value={goalDescription1}
                      onChange={(e) => setGoalDescription1(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold block mb-1">Meta 2 (Oxigenação / Mecânica)</label>
                    <input
                      type="text"
                      value={goalDescription2}
                      onChange={(e) => setGoalDescription2(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold block mb-1">Dicas & Pontos Chave (um por linha)</label>
                  <textarea
                    rows={2}
                    value={teachingPointsText}
                    onChange={(e) => setTeachingPointsText(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-xl border text-xs leading-relaxed outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* 8. Evolução Temporal / Piora Fisiopatológica Dinâmica */}
              <div className={`p-4 rounded-xl border space-y-3.5 ${isLight ? 'bg-rose-50/60 border-rose-200' : 'bg-rose-950/20 border-rose-900/60'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider block">
                      8. Evolução Temporal & Piora Dinâmica da Fisiopatologia
                    </span>
                    <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      Permite que a gravidade do paciente piore automaticamente após a admissão (queda de complacência, aumento de shunt).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableDynamicWorsening}
                      onChange={(e) => setEnableDynamicWorsening(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                {enableDynamicWorsening && (
                  <div className="pt-2 border-t border-rose-800/40 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-mono font-bold block mb-1">Título da Fase de Piora</label>
                        <input
                          type="text"
                          value={worseningPhaseTitle}
                          onChange={(e) => setWorseningPhaseTitle(e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono font-bold block mb-1">Mensagem de Alerta da Deterioração</label>
                        <input
                          type="text"
                          value={worseningDescription}
                          onChange={(e) => setWorseningDescription(e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#101424] border-zinc-800'}`}>
                        <span className="text-[10px] font-mono text-zinc-400 block mb-1">Complacência ($C_{'{'}st{'}'}$) Piorada</span>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={worsenedCompliance}
                            onChange={(e) => setWorsenedCompliance(Number(e.target.value))}
                            className="w-16 px-1 py-0.5 rounded text-center font-mono font-bold text-xs bg-zinc-800 text-cyan-400 border border-zinc-700"
                          />
                          <span className="text-[9px] text-zinc-500">mL/cm</span>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#101424] border-zinc-800'}`}>
                        <span className="text-[10px] font-mono text-zinc-400 block mb-1">Resistência ($R_{'{'}aw{'}'}$) Piorada</span>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={worsenedResistance}
                            onChange={(e) => setWorsenedResistance(Number(e.target.value))}
                            className="w-16 px-1 py-0.5 rounded text-center font-mono font-bold text-xs bg-zinc-800 text-amber-400 border border-zinc-700"
                          />
                          <span className="text-[9px] text-zinc-500">cmH₂O/L/s</span>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#101424] border-zinc-800'}`}>
                        <span className="text-[10px] font-mono text-zinc-400 block mb-1">Shunt ($Q_s/Q_t$) Piorado</span>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={worsenedShuntFraction}
                            onChange={(e) => setWorsenedShuntFraction(Number(e.target.value))}
                            className="w-16 px-1 py-0.5 rounded text-center font-mono font-bold text-xs bg-zinc-800 text-rose-400 border border-zinc-700"
                          />
                          <span className="text-[9px] text-zinc-500">%</span>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#101424] border-zinc-800'}`}>
                        <span className="text-[10px] font-mono text-zinc-400 block mb-1">Espaço Morto ($V_d/V_t$)</span>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={worsenedDeadSpaceFraction}
                            onChange={(e) => setWorsenedDeadSpaceFraction(Number(e.target.value))}
                            className="w-16 px-1 py-0.5 rounded text-center font-mono font-bold text-xs bg-zinc-800 text-purple-400 border border-zinc-700"
                          />
                          <span className="text-[9px] text-zinc-500">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
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
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingCaseId ? 'Salvar Alterações do Caso Clínico' : 'Cadastrar Caso Clínico Completo'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: PASSWORD / SECURITY SETTINGS */}
          {activeTab === 'password' && (
            <div className="p-6 max-w-xl mx-auto space-y-6 animate-fadeIn">
              <div
                className={`p-5 rounded-2xl border text-center relative overflow-hidden ${
                  isLight
                    ? 'bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border-indigo-200'
                    : 'bg-gradient-to-r from-[#14182b] via-[#1a1835] to-[#14182b] border-indigo-800/80'
                }`}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 mb-2 border border-indigo-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-display font-black text-indigo-400">
                  Gerenciamento de Senha Docente
                </h3>
                <p className={`text-xs mt-1 max-w-md mx-auto ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Proteja a área restrita do professor. Altere a senha para garantir que apenas instrutores autorizados gerenciem as questões e os casos clínicos.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPassError(null);
                  setPassSuccess(null);

                  if (!currentPassInput.trim()) {
                    setPassError('Digite a senha atual.');
                    audioEngine.playErrorBeep();
                    return;
                  }

                  if (!educationalStorage.verifyTeacherPassword(currentPassInput)) {
                    setPassError('A senha atual informada está incorreta.');
                    audioEngine.playErrorBeep();
                    return;
                  }

                  if (!newPassInput.trim() || newPassInput.trim().length < 3) {
                    setPassError('A nova senha deve possuir pelo menos 3 caracteres.');
                    audioEngine.playErrorBeep();
                    return;
                  }

                  if (newPassInput !== confirmPassInput) {
                    setPassError('A confirmação da nova senha não confere com a nova senha digitada.');
                    audioEngine.playErrorBeep();
                    return;
                  }

                  const ok = educationalStorage.setTeacherPassword(newPassInput);
                  if (ok) {
                    setPassSuccess('Senha do docente alterada com sucesso!');
                    audioEngine.playConfirmBeep();
                    setCurrentPassInput('');
                    setNewPassInput('');
                    setConfirmPassInput('');
                  } else {
                    setPassError('Erro ao salvar a nova senha.');
                    audioEngine.playErrorBeep();
                  }
                }}
                className="space-y-4"
              >
                {/* Feedback Alerts */}
                {passError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passError}</span>
                  </div>
                )}

                {passSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{passSuccess}</span>
                  </div>
                )}

                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider block">
                    Senha Atual:
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassInput}
                      onChange={(e) => setCurrentPassInput(e.target.value)}
                      placeholder="Digite a senha atual (padrão: docente123)..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none pr-10 ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider block">
                    Nova Senha:
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassInput}
                      onChange={(e) => setNewPassInput(e.target.value)}
                      placeholder="Digite a nova senha desejada..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none pr-10 ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider block">
                    Confirmar Nova Senha:
                  </label>
                  <input
                    type="password"
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    placeholder="Repita a nova senha..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                    }`}
                  />
                </div>

                {/* Actions */}
                <div className="pt-3 flex items-center justify-between gap-3 border-t border-inherit">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Deseja realmente restaurar a senha padrão de fábrica (docente123)?')) {
                        educationalStorage.resetTeacherPassword();
                        setPassSuccess('Senha restaurada com sucesso para: docente123');
                        audioEngine.playConfirmBeep();
                      }
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-[#121626] hover:bg-[#1a2036] text-zinc-400 border-zinc-700'
                    }`}
                  >
                    Restaurar Padrão (docente123)
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/25 transition-all"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Salvar Nova Senha</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 6: PEDAGOGICAL CONTROLS & BLIND ASSESSMENT */}
          {activeTab === 'pedagogy' && (
            <div className="space-y-5 animate-fadeIn max-w-3xl">
              <div>
                <h4 className="text-sm font-display font-bold flex items-center gap-2 text-cyan-400">
                  <Sliders className="w-4 h-4" />
                  <span>Controles Pedagógicos & Modos de Avaliação</span>
                </h4>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Configure o nível de desafio dos alunos, o comportamento da simulação cega e os gatilhos de deterioração clínica.
                </p>
              </div>

              {/* 1. Avaliação Cega de Mecânica */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-950/20 border-amber-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-display font-bold">
                        Modo "Avaliação Cega de Mecânica" (Blind Mechanics)
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-amber-950' : 'text-amber-200/90'}`}>
                      Oculta complacência estática (Cst), resistência de vias aéreas (Raw), Auto-PEEP e constante de tempo do painel lateral. O aluno deve obrigatoriamente executar as manobras de pausa inspiratória e expiratória para obter a Pplatô e calcular os parâmetros.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdatePedagogicalSettings({
                        blindMechanicsEnabled: !pedagogicalSettings.blindMechanicsEnabled,
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                      pedagogicalSettings.blindMechanicsEnabled
                        ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                        : isLight
                        ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        : 'bg-[#151928] border-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {pedagogicalSettings.blindMechanicsEnabled ? 'ATIVADO' : 'DESATIVADO'}
                  </button>
                </div>

                <div className="pt-2 border-t border-amber-600/30 flex items-center justify-between text-xs">
                  <span className="opacity-90">Permitir que o estudante visualize o botão "Gabarito" durante a prova:</span>
                  <input
                    type="checkbox"
                    checked={pedagogicalSettings.allowStudentRevealBlind}
                    onChange={(e) =>
                      handleUpdatePedagogicalSettings({
                        allowStudentRevealBlind: e.target.checked,
                      })
                    }
                    className="accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>

              {/* 2. Deterioração Fisiológica Dinâmica & Progressão Temporal */}
              <div
                className={`p-4 rounded-2xl border space-y-3.5 ${
                  isLight ? 'bg-rose-50/70 border-rose-200' : 'bg-rose-950/20 border-rose-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-display font-bold">
                        Deterioração Temporal & Eventos Adversos Fisiológicos
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-rose-950' : 'text-rose-200/90'}`}>
                      Se o aluno submeter o paciente a Driving Pressure acima de {pedagogicalSettings.dpSafetyThreshold || 15} cmH₂O ou Pplatô acima de 30 cmH₂O de forma contínua, o simulador evolui para barotrauma (pneumotórax, choque e perda de complacência). Além disso, nos casos com fases (como Admissão do Zero), a gravidade progride dinamicamente no tempo.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdatePedagogicalSettings({
                        deteriorationEnabled: !pedagogicalSettings.deteriorationEnabled,
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                      pedagogicalSettings.deteriorationEnabled
                        ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                        : isLight
                        ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        : 'bg-[#151928] border-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {pedagogicalSettings.deteriorationEnabled ? 'ATIVADO' : 'DESATIVADO'}
                  </button>
                </div>

                {pedagogicalSettings.deteriorationEnabled && (
                  <div className="pt-2 border-t border-rose-600/30 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                          ⏱️ Tolerância sob Ventilação Lesiva antes de Barotrauma:
                        </label>
                        <select
                          value={pedagogicalSettings.deteriorationTimeoutSeconds || 90}
                          onChange={(e) =>
                            handleUpdatePedagogicalSettings({
                              deteriorationTimeoutSeconds: Number(e.target.value),
                            })
                          }
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121626] border-zinc-700 text-white'
                          }`}
                        >
                          <option value={30}>30 segundos (Ultra Rápido - Alta Pressão)</option>
                          <option value={45}>45 segundos (Muito Rápido)</option>
                          <option value={60}>60 segundos (Rápido - 1 minuto)</option>
                          <option value={90}>90 segundos (Padrão Recomendado)</option>
                          <option value={120}>120 segundos (Moderado - 2 minutos)</option>
                          <option value={180}>180 segundos (Lento - 3 minutos)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                          🛡️ Limite Crítico de Driving Pressure (ΔP):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={12}
                            max={22}
                            value={pedagogicalSettings.dpSafetyThreshold || 15}
                            onChange={(e) =>
                              handleUpdatePedagogicalSettings({
                                dpSafetyThreshold: Number(e.target.value),
                              })
                            }
                            className="flex-1 accent-rose-500 cursor-pointer"
                          />
                          <span className="font-mono font-bold text-rose-400 text-xs">
                            {pedagogicalSettings.dpSafetyThreshold || 15} cmH₂O
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Temporal Phase Progression for Admission Cases */}
                    <div className={`p-3 rounded-xl border space-y-2.5 ${isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-amber-950/20 border-amber-800/40'}`}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-display font-bold text-[11px] text-amber-400 uppercase tracking-wider">
                          Gatilhos Temporais de Admissão & Fases Fisiológicas
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10.5px] font-mono mb-1 text-zinc-300">
                            Tempo para Fase 2 (Piora Inflamatória & Queda de Cst):
                          </label>
                          <select
                            value={pedagogicalSettings.admissionPhase2TimeSeconds || 90}
                            onChange={(e) =>
                              handleUpdatePedagogicalSettings({
                                admissionPhase2TimeSeconds: Number(e.target.value),
                              })
                            }
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none ${
                              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                            }`}
                          >
                            <option value={30}>30 segundos (Rápido)</option>
                            <option value={45}>45 segundos</option>
                            <option value={60}>60 segundos (1 min)</option>
                            <option value={90}>90 segundos (Padrão)</option>
                            <option value={120}>120 segundos (2 min)</option>
                            <option value={180}>180 segundos (3 min)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-mono mb-1 text-zinc-300">
                            Tempo para Fase 3 (Estabilização Alveolar & Resgate):
                          </label>
                          <select
                            value={pedagogicalSettings.admissionPhase3TimeSeconds || 200}
                            onChange={(e) =>
                              handleUpdatePedagogicalSettings({
                                admissionPhase3TimeSeconds: Number(e.target.value),
                              })
                            }
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none ${
                              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#151928] border-zinc-700 text-white'
                            }`}
                          >
                            <option value={90}>90 segundos (1.5 min)</option>
                            <option value={120}>120 segundos (2 min)</option>
                            <option value={150}>150 segundos (2.5 min)</option>
                            <option value={200}>200 segundos (~3.3 min - Padrão)</option>
                            <option value={300}>300 segundos (5 min)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Debriefing Pós-Caso Automatizado */}
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isLight ? 'bg-purple-50/70 border-purple-200' : 'bg-purple-950/20 border-purple-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-display font-bold">
                      Abertura Automática do Relatório de Debriefing (AAR)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={pedagogicalSettings.autoOpenDebriefingOnFinish}
                    onChange={(e) =>
                      handleUpdatePedagogicalSettings({
                        autoOpenDebriefingOnFinish: e.target.checked,
                      })
                    }
                    className="accent-purple-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <p className={`text-xs ${isLight ? 'text-purple-950' : 'text-purple-200/90'}`}>
                  Exibe a janela com a linha do tempo das ações do estudante, índice de VILI e nota assim que todas as metas forem atingidas.
                </p>
              </div>
            </div>
          )}

          {/* TAB 7: REPORTS / AFTER ACTION REVIEWS (DEBRIEFING) */}
          {activeTab === 'reports' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-display font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span>Relatórios de Avaliação & Debriefing da Turma ({reports.length})</span>
                  </h4>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Histórico detalhado de desempenho dos alunos em cada caso clínico resolvido.
                  </p>
                </div>

                {reports.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Deseja limpar todos os relatórios de debriefing salvos?')) {
                        educationalStorage.clearDebriefingReports();
                        loadData();
                        showFeedback('Histórico de relatórios limpo com sucesso.');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-rose-700/60 text-rose-400 hover:bg-rose-950/40 text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Histórico</span>
                  </button>
                )}
              </div>

              {reports.length === 0 ? (
                <div
                  className={`p-8 rounded-2xl border text-center font-mono text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-[#0f1422] border-zinc-800 text-zinc-400'
                  }`}
                >
                  <FileText className="w-8 h-8 mx-auto text-zinc-600 mb-2 opacity-50" />
                  Nenhum relatório de caso registrado ainda. Conforme os alunos resolverem os casos clínicos, os relatórios aparecerão aqui automaticamente.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reports.map((rep) => (
                    <div
                      key={rep.id}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0f1422] border-zinc-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-display font-black text-cyan-400">
                            {rep.caseTitle}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase bg-cyan-500/10 border-cyan-500/30 text-cyan-300">
                            Score: {rep.score}/100
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                          <span>{rep.completedAt}</span>
                          <span>•</span>
                          <span>Duração: {Math.floor(rep.durationSeconds / 60)}m {rep.durationSeconds % 60}s</span>
                          <span>•</span>
                          <span>{rep.interventions.length} intervenções</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          {rep.rating}
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
