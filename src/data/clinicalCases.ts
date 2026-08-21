import { ClinicalCase } from '../types/ventilation';

export const CLINICAL_CASES: ClinicalCase[] = [
  // 1. Pulmão Normal
  {
    id: 'pulmao-normal',
    title: 'Pulmão normal',
    category: 'Normal',
    difficulty: 'Iniciante',
    description:
      'Paciente intubado para proteção de via aérea após rebaixamento do nível de consciência por TCE leve ou pós-anestésico. Parâmetros pulmonares normais, sem patologia parenquimatosa ou obstrutiva.',
    patientProfile: {
      name: 'Lucas Silveira (Normal)',
      age: 32,
      gender: 'male',
      heightCm: 175,
      actualWeightKg: 72,
      idealBodyWeightKg: 70.5,
      compliance: 60, // Normal: 50-70 mL/cmH2O
      resistance: 5, // Normal: 4-8 cmH2O/L/s
      spontaneousDrive: true,
      spontaneousRate: 14,
      spontaneousEffortPressure: -4,
      spontaneousDutyCycle: 0.33,
      metabolicRateVCO2: 200,
      metabolicRateVO2: 250,
      deadSpaceFraction: 0.28,
      shuntFraction: 4,
      hemoglobin: 14.0,
      bodyTemperature: 36.8,
      secretionsSeverity: 'none',
      circuitLeakPercent: 0,
    },
    initialSettings: {
      mode: 'VCV',
      fio2: 30,
      peep: 5,
      triggerType: 'flow',
      triggerSensitivity: 2.0,
      tidalVolume: 420, // 6 mL/kg
      respiratoryRate: 14,
      flowWaveform: 'decelerating',
      inspiratoryFlow: 55,
      inspiratoryPausePercent: 10,
      inspiratoryPressure: 14,
      inspiratoryTimePCV: 0.9,
      pressureRiseTime: 0.1,
      pressureSupport: 8,
      expiratorySensitivity: 25,
      backupApneaTime: 20,
      pHigh: 18,
      pLow: 0,
      tHigh: 3.5,
      tLow: 0.6,
      simvRate: 12,
      simvPs: 8,
    },
    clinicalHistory:
      'Masculino, 32 anos, vítima de trauma cranioencefálico leve/moderado em Glasgow 8, intubado preventivamente. Sem antecedentes de asma, tabagismo ou cardiopatia. Radiografia de tórax limpa.',
    physicalExam:
      'IOT nº 8.0 fixado a 22 cm. Murmúrio vesicular universalmente audível sem ruídos adventícios. Tórax simétrico, expansibilidade preservada.',
    initialABG: {
      ph: 7.41,
      paco2: 39,
      pao2: 98,
      hco3: 24.2,
      spo2: 99,
      fio2: 30,
    },
    goals: [
      {
        id: 'norm-vt',
        description: 'Manter Volume Corrente protetor de 6 a 8 mL/kg de Peso Predito (420 a 560 mL)',
        isMet: (_, settings, patient) => {
          const vtPerKg = settings.tidalVolume / patient.idealBodyWeightKg;
          return vtPerKg >= 5.8 && vtPerKg <= 8.2;
        },
        targetFeedback: 'Ventilação protetora de rotina em pulmões normais previne lesão pulmonar induzida pelo ventilador (VILI).',
      },
      {
        id: 'norm-dp',
        description: 'Manter Driving Pressure fisiológica (ΔP ≤ 10 cmH₂O)',
        isMet: (monitored) => monitored.drivingPressure <= 11 && monitored.drivingPressure > 0,
        targetFeedback: 'Com complacência normal (~60 mL/cmH2O), a Driving Pressure se mantém muito baixa e segura.',
      },
      {
        id: 'norm-gaso',
        description: 'Preservar normocapnia (PaCO₂ 35-45 mmHg) e oxigenação segura (FiO₂ ≤ 40%)',
        isMet: (monitored, settings) =>
          monitored.paco2 >= 35 && monitored.paco2 <= 45 && settings.fio2 <= 40,
        targetFeedback: 'Excelente equilíbrio ácido-base e oxigenação preservados.',
      },
    ],
    teachingPoints: [
      'Mesmo em pulmões normais, a ventilação mecânica deve seguir princípios protetores (Vt 6-8 mL/kg peso predito, PEEP fisiológica 5 cmH2O).',
      'A resistência normal de vias aéreas intubadas é de 4 a 8 cmH2O/L/s, e a complacência estática situa-se entre 50 e 70 mL/cmH2O.',
      'Evite hiperventilação iatrogênica em pacientes neurológicos estáveis para não causar vasoconstrição cerebral excessiva.',
    ],
  },

  // 2. SDRA (Baixa complacência severa)
  {
    id: 'sdra-grave',
    title: 'SDRA moderado',
    category: 'SDRA',
    difficulty: 'Intermediário',
    description:
      'Paciente em choque séptico de foco pulmonar com Síndrome do Desconforto Respiratório Agudo (SDRA grave). Pulmão de bebê ("baby lung") com complacência estática criticamente baixa (20 mL/cmH₂O) e elevado risco de volutrauma.',
    patientProfile: {
      name: 'João Carlos Silva (SDRA)',
      age: 54,
      gender: 'male',
      heightCm: 175,
      actualWeightKg: 85,
      idealBodyWeightKg: 70.5,
      compliance: 20, // mL/cmH2O (muito baixa)
      resistance: 6, // normal
      spontaneousDrive: false,
      spontaneousRate: 0,
      spontaneousEffortPressure: 0,
      spontaneousDutyCycle: 0.33,
      metabolicRateVCO2: 240,
      metabolicRateVO2: 300,
      deadSpaceFraction: 0.55,
      shuntFraction: 38,
      hemoglobin: 11.2,
      bodyTemperature: 38.2,
      secretionsSeverity: 'none',
      circuitLeakPercent: 0,
    },
    initialSettings: {
      mode: 'VCV',
      fio2: 80,
      peep: 6,
      triggerType: 'flow',
      triggerSensitivity: 2.0,
      tidalVolume: 560, // 8 mL/kg (INADEQUADO para SDRA!)
      respiratoryRate: 24,
      flowWaveform: 'square',
      inspiratoryFlow: 50,
      inspiratoryPausePercent: 0,
      inspiratoryPressure: 22,
      inspiratoryTimePCV: 0.9,
      pressureRiseTime: 0.1,
      pressureSupport: 10,
      expiratorySensitivity: 25,
      backupApneaTime: 20,
      pHigh: 26,
      pLow: 0,
      tHigh: 4.0,
      tLow: 0.5,
      simvRate: 14,
      simvPs: 10,
    },
    clinicalHistory:
      'Masculino, 54 anos, admitido na UTI com pneumonia multilobar, febre alta, refratariedade e necessidade de IOT. Rx de tórax e TC demonstram infiltrados alveolares bilaterais difusos (PaO2/FiO2 = 110 mmHg).',
    physicalExam:
      'IOT com tubo orotraqueal nº 8.0 fixado a 22 cm na rima labial. Sedado em RASS -5 sob curarização. Ausculta com estertores crepitantes difusos bilaterais, extremidades mal perfundidas.',
    initialABG: {
      ph: 7.22,
      paco2: 56,
      pao2: 62,
      hco3: 22.4,
      spo2: 89,
      fio2: 80,
    },
    goals: [
      {
        id: 'protective-vt',
        description: 'Ajustar Volume Corrente ultraprotetor (4 a 6 mL/kg de Peso Predito = 280 a 420 mL)',
        isMet: (_, settings, patient) => {
          if (settings.mode === 'VCV') {
            const vtPerKg = settings.tidalVolume / patient.idealBodyWeightKg;
            return vtPerKg >= 4.0 && vtPerKg <= 6.2;
          }
          return true;
        },
        targetFeedback: 'Mantenha o Vt em 4-6 mL/kg IBW (ideal ~420 mL) para prevenir volutrauma e barotrauma.',
      },
      {
        id: 'driving-pressure',
        description: 'Manter Driving Pressure (ΔP = Pplat - PEEP) ≤ 14 cmH₂O',
        isMet: (monitored) => monitored.drivingPressure <= 14.5 && monitored.drivingPressure > 0,
        targetFeedback: 'A Driving Pressure reflete a deformação cíclica alveolar (strain). Mantenha ≤ 14 cmH2O.',
      },
      {
        id: 'safe-pplat',
        description: 'Manter Pressão de Platô (Pplat) ≤ 30 cmH₂O',
        isMet: (monitored) => monitored.plateauPressure <= 30.5,
        targetFeedback: 'Pplat > 30 cmH2O está associada a hiperdistensão alveolar grave.',
      },
      {
        id: 'peep-titration',
        description: 'Titular PEEP adequada para SDRA (10 a 16 cmH₂O) e diminuir FiO₂ com segurança',
        isMet: (_, settings) => settings.peep >= 10 && settings.peep <= 16,
        targetFeedback: 'PEEP entre 10 e 16 cmH2O recruta alvéolos colapsados e reduz o shunt intrapulmonar.',
      },
      {
        id: 'adequate-oxygenation',
        description: 'Atingir PaO₂ ≥ 65 mmHg e SpO₂ ≥ 92%',
        isMet: (monitored) => monitored.pao2 >= 65 && monitored.spo2 >= 91,
        targetFeedback: 'Oxigenação adequada mantida com relação P/F em melhora.',
      },
    ],
    teachingPoints: [
      'Na SDRA, o cálculo do Vt deve ser SEMPRE baseado no PESO PREDITO (IBW), nunca no peso real.',
      'A Driving Pressure (ΔP = Pplat - PEEP) é o marcador prognóstico de mecânica pulmonar mais fortemente correlacionado com a sobrevida.',
      'A hipercapnia permissiva (pH ≥ 7.20) é tolerada em prol da proteção pulmonar.',
      'O uso de fluxo desacelerado na VCV ou modo PCV pode homogeneizar a distribuição do gás em alvéolos com diferentes constantes de tempo.',
    ],
  },

  // 3. DPOC (Alta resistência + Auto-PEEP)
  {
    id: 'dpoc-exacerbado',
    title: 'DPOC estável',
    category: 'DPOC',
    difficulty: 'Intermediário',
    description:
      'Paciente portador de DPOC grave GOLD IV intubado por fadiga muscular respiratória. Apresenta severo broncoespasmo (Raw = 26 cmH₂O/L/s), tempo expiratório insuficiente e aprisionamento aéreo (Auto-PEEP).',
    patientProfile: {
      name: 'Maria Helena Antunes (DPOC)',
      age: 68,
      gender: 'female',
      heightCm: 160,
      actualWeightKg: 58,
      idealBodyWeightKg: 52.4,
      compliance: 75, // Alta complacência enfisematosa
      resistance: 26, // cmH2O/L/s (Severa obstrução)
      spontaneousDrive: true,
      spontaneousRate: 22,
      spontaneousEffortPressure: -6,
      spontaneousDutyCycle: 0.35,
      metabolicRateVCO2: 210,
      metabolicRateVO2: 260,
      deadSpaceFraction: 0.58,
      shuntFraction: 14,
      hemoglobin: 14.5,
      bodyTemperature: 37.0,
      secretionsSeverity: 'mild',
      circuitLeakPercent: 0,
    },
    initialSettings: {
      mode: 'VCV',
      fio2: 40,
      peep: 3,
      triggerType: 'flow',
      triggerSensitivity: 2.0,
      tidalVolume: 480,
      respiratoryRate: 22, // Frequência muito alta -> Te curto!
      flowWaveform: 'square',
      inspiratoryFlow: 45, // Baixo fluxo insp -> Ti longo!
      inspiratoryPausePercent: 10,
      inspiratoryPressure: 18,
      inspiratoryTimePCV: 1.2,
      pressureRiseTime: 0.1,
      pressureSupport: 12,
      expiratorySensitivity: 25,
      backupApneaTime: 20,
      pHigh: 24,
      pLow: 0,
      tHigh: 3.5,
      tLow: 0.6,
      simvRate: 14,
      simvPs: 10,
    },
    clinicalHistory:
      'Feminina, 68 anos, tabagista 50 anos/maço, trazida ao PS por piora progressiva da dispneia e secreção purulenta. Evoluiu com sonolência e acidose hipercápnica grave.',
    physicalExam:
      'IOT com TOT 7.5. Ausculta pulmonar com sibilos expiratórios difusos, roncos e tempo expiratório acentuadamente prolongado. Curva de fluxo não retorna ao zero na expiração!',
    initialABG: {
      ph: 7.18,
      paco2: 78,
      pao2: 58,
      hco3: 32,
      spo2: 88,
      fio2: 40,
    },
    goals: [
      {
        id: 'increase-te',
        description: 'Aumentar o Tempo Expiratório (reduzir FR para 10-14 rpm e aumentar fluxo insp para 60-80 L/min)',
        isMet: (_, settings) => settings.respiratoryRate <= 15 && settings.inspiratoryFlow >= 60,
        targetFeedback: 'Aumentar a velocidade do fluxo inspiratório encurta o Ti e garante maior tempo para a expiração passiva.',
      },
      {
        id: 'reduce-autopeep',
        description: 'Reduzir o Auto-PEEP para ≤ 4.0 cmH₂O',
        isMet: (monitored) => monitored.autoPeep <= 4.0,
        targetFeedback: 'A curva de fluxo expiratório deve tocar a linha de base antes do próximo ciclo iniciar.',
      },
      {
        id: 'ie-ratio-prolonged',
        description: 'Obter Relação I:E de pelo menos 1:3 ou 1:4',
        isMet: (monitored) => {
          const ratio = monitored.expiratoryTime / Math.max(monitored.inspiratoryTime, 0.1);
          return ratio >= 3.0;
        },
        targetFeedback: 'Na obstrução ao fluxo aéreo, uma relação I:E de 1:3 a 1:4 é essencial para esvaziamento pulmonar.',
      },
      {
        id: 'safe-ph',
        description: 'Corrigir acidose perigosa mantendo pH ≥ 7.28 sem hiperventilação iatrogênica',
        isMet: (monitored) => monitored.ph >= 7.28 && monitored.ph <= 7.46,
        targetFeedback: 'Em DPOC retentor crônico, não tente normalizar o PaCO2 para 40 mmHg, pois isso causa alcalose metabólica severa.',
      },
    ],
    teachingPoints: [
      'A constante de tempo tau (τ = Raw × Crs) no DPOC é muito longa devido à alta resistência e complacência.',
      'Se o tempo expiratório for menor que 3 a 5 constantes de tempo, haverá aprisionamento aéreo (Auto-PEEP / PEEPi).',
      'O Auto-PEEP aumenta o trabalho inspiratório e pode causar instabilidade hemodinâmica por diminuição do retorno venoso.',
      'Ajustar PEEP extrínseca em cerca de 70-80% do Auto-PEEP no modo assistido/espontâneo auxilia a abertura da via aérea e o disparo.',
    ],
  },

  // 4. Asma Grave (Broncoespasmo Extremo)
  {
    id: 'asma-grave',
    title: 'Asma grave',
    category: 'Obstrutiva',
    difficulty: 'Avançado',
    description:
      'Crise asmática refratária com broncoespasmo extremo (Raw = 35 cmH₂O/L/s). Pico de pressão alarmante com pressão de platô normal (gradiente PIP - Pplat elevado), alto risco de barotrauma e parada cardiorrespiratória por auto-PEEP.',
    patientProfile: {
      name: 'Juliana Costa (Asma Grave)',
      age: 24,
      gender: 'female',
      heightCm: 168,
      actualWeightKg: 60,
      idealBodyWeightKg: 59.6,
      compliance: 55, // Complacência parenquimatosa normal
      resistance: 35, // cmH2O/L/s (Broncoespasmo extremo!)
      spontaneousDrive: false, // Sedada profundamente
      spontaneousRate: 0,
      spontaneousEffortPressure: 0,
      spontaneousDutyCycle: 0.33,
      metabolicRateVCO2: 220,
      metabolicRateVO2: 260,
      deadSpaceFraction: 0.50,
      shuntFraction: 12,
      hemoglobin: 13.5,
      bodyTemperature: 37.2,
      secretionsSeverity: 'mild',
      circuitLeakPercent: 0,
    },
    initialSettings: {
      mode: 'VCV',
      fio2: 60,
      peep: 4,
      triggerType: 'flow',
      triggerSensitivity: 2.0,
      tidalVolume: 480, // Volume alto demais para asma grave
      respiratoryRate: 20, // FR alta -> Te insuficiente!
      flowWaveform: 'square',
      inspiratoryFlow: 40, // Fluxo baixo -> Ti longo!
      inspiratoryPausePercent: 0,
      inspiratoryPressure: 24,
      inspiratoryTimePCV: 1.1,
      pressureRiseTime: 0.1,
      pressureSupport: 10,
      expiratorySensitivity: 25,
      backupApneaTime: 20,
      pHigh: 28,
      pLow: 0,
      tHigh: 3.5,
      tLow: 0.6,
      simvRate: 12,
      simvPs: 10,
    },
    clinicalHistory:
      'Feminina, 24 anos, asmática grave, trazida ao pronto-socorro em parada respiratória iminente após crise súbita refratária a broncodilatadores e corticoterapia.',
    physicalExam:
      'IOT nº 7.5. Tórax hiperinsuflado em barril com "tórax silencioso" e sibilos inspiratórios/expiratórios escassos devido ao fluxo crítico. Pressão de pico no ventilador = 45 cmH₂O!',
    initialABG: {
      ph: 7.12,
      paco2: 84,
      pao2: 68,
      hco3: 27.0,
      spo2: 90,
      fio2: 60,
    },
    goals: [
      {
        id: 'asma-fr',
        description: 'Reduzir Frequência Respiratória para 8 a 12 rpm para maximizar o tempo expiratório',
        isMet: (_, settings) => settings.respiratoryRate <= 12,
        targetFeedback: 'A redução radical da FR é a principal medida para esvaziar o aprisionamento aéreo dinâmico.',
      },
      {
        id: 'asma-flow',
        description: 'Aumentar Fluxo Inspiratório para 70 a 90 L/min (encurtando o Ti)',
        isMet: (_, settings) => settings.inspiratoryFlow >= 70,
        targetFeedback: 'Fluxos inspiratórios altos encurtam o tempo inspiratório e cedem preciosos segundos para a expiração.',
      },
      {
        id: 'asma-pplat',
        description: 'Manter Pressão de Platô (Pplat) ≤ 30 cmH₂O através de pausa inspiratória',
        isMet: (monitored) => monitored.plateauPressure <= 30,
        targetFeedback: 'Na asma, o PIP alto é resistivo; a Pplat baixa indica que os alvéolos não estão em risco imediato de ruptura.',
      },
      {
        id: 'asma-vt',
        description: 'Ajustar Volume Corrente em 6 mL/kg (360 mL) com hipercapnia permissiva',
        isMet: (_, settings) => settings.tidalVolume <= 380 && settings.tidalVolume >= 300,
        targetFeedback: 'Tolere a hipercapnia enquanto o pH estiver ≥ 7.20.',
      },
    ],
    teachingPoints: [
      'Na crise de asma grave intubada, o diferencial entre Pressão de Pico e Platô (PIP - Pplat = Raw × Fluxo) é gigantesco.',
      'O principal perigo não é o PIP resistivo, mas o auto-PEEP silencioso que pode levar ao tamponamento cardíaco por choque obstrutivo.',
      'A hipoventilação controlada (FR baixa, Vt baixo, fluxo alto) é a pedra fundamental do manejo ventilatório.',
    ],
  },

  // 5. Pneumotórax Hipertensivo
  {
    id: 'pneumotorax',
    title: 'Pneumotórax',
    category: 'Emergência',
    difficulty: 'Avançado',
    description:
      'Paciente em ventilação mecânica que desenvolve pneumotórax sob tensão súbito. Queda catastrófica da complacência estática (14 mL/cmH₂O), pico súbito de pressão de vias aéreas, dessaturação e instabilidade hemodinâmica por compressão do retorno venoso.',
    patientProfile: {
      name: 'Carlos Eduardo Ramos (Pneumotórax)',
      age: 48,
      gender: 'male',
      heightCm: 180,
      actualWeightKg: 78,
      idealBodyWeightKg: 75.0,
      compliance: 14, // Complacência cai subitamente para 14!
      resistance: 9,
      spontaneousDrive: false,
      spontaneousRate: 0,
      spontaneousEffortPressure: 0,
      spontaneousDutyCycle: 0.33,
      metabolicRateVCO2: 240,
      metabolicRateVO2: 300,
      deadSpaceFraction: 0.60,
      shuntFraction: 45, // Grande shunt e colapso
      hemoglobin: 12.0,
      bodyTemperature: 37.0,
      secretionsSeverity: 'none',
      circuitLeakPercent: 0,
    },
    initialSettings: {
      mode: 'VCV',
      fio2: 100,
      peep: 5,
      triggerType: 'flow',
      triggerSensitivity: 2.0,
      tidalVolume: 500,
      respiratoryRate: 20,
      flowWaveform: 'square',
      inspiratoryFlow: 50,
      inspiratoryPausePercent: 0,
      inspiratoryPressure: 28,
      inspiratoryTimePCV: 0.9,
      pressureRiseTime: 0.1,
      pressureSupport: 10,
      expiratorySensitivity: 25,
      backupApneaTime: 20,
      pHigh: 30,
      pLow: 0,
      tHigh: 3.5,
      tLow: 0.6,
      simvRate: 14,
      simvPs: 10,
    },
    clinicalHistory:
      'Masculino, 48 anos, pós-punção de acesso venoso central subclávio direito, evolui subitamente durante a ventilação com alarme de Pressão Alta disparando continuamente e queda da SpO₂ de 98% para 82%.',
    physicalExam:
      'Assimetria torácica, hemitórax direito hipertimpânico com abolição completa do murmúrio vesicular. Desvio de traqueia para a esquerda e estase jugular evidente. PA 80/40 mmHg.',
    initialABG: {
      ph: 7.15,
      paco2: 65,
      pao2: 52,
      hco3: 21.0,
      spo2: 82,
      fio2: 100,
    },
    goals: [
      {
        id: 'pntx-limit-p',
        description: 'Reduzir PIP e Vt imediatamente (Vt ≤ 300-350 mL ou mudar para PCV com baixa pressão) para evitar expansão do barotrauma',
        isMet: (_, settings) => settings.tidalVolume <= 360 || (settings.mode === 'PCV' && settings.inspiratoryPressure <= 16),
        targetFeedback: 'Reduzir a pressão positiva nos pulmões enquanto a descompressão torácica de emergência é realizada.',
      },
      {
        id: 'pntx-peep-safe',
        description: 'Evitar PEEP excessiva (manter PEEP ≤ 5 cmH₂O) para minimizar a fuga aérea pleural',
        isMet: (_, settings) => settings.peep <= 6,
        targetFeedback: 'PEEP elevada em pneumotórax não drenado agrava o colapso hemodinâmico e a fístula broncopleural.',
      },
      {
        id: 'pntx-pplat-monitor',
        description: 'Realizar pausa inspiratória e monitorar queda de Pplat após ajuste',
        isMet: (monitored) => monitored.plateauPressure < 35,
        targetFeedback: 'A descompressão por toracocentese/drenagem torácica é mandatória para restabelecer a complacência.',
      },
    ],
    teachingPoints: [
      'Pneumotórax hipertensivo em ventilação mecânica é uma emergência médica com risco iminente de PCR em AESP.',
      'Ocorre elevação abrupta tanto da Pressão de Pico (PIP) quanto da Pressão de Platô (Pplat), com redução drástica da complacência estática.',
      'O diagnóstico é clínico e a descompressão com agulha (2º espaço intercostal na linha hemiclavicular ou 5º espaço na linha axilar anterior) deve preceder o Raio-X.',
    ],
  },

  // 6. Edema Agudo de Pulmão (EAP Cardiogênico)
  {
    id: 'edema-agudo-pulmao',
    title: 'Edema agudo pulmonar',
    category: 'Emergência',
    difficulty: 'Intermediário',
    description:
      'Insuficiência cardíaca descompensada com inundação alveolar bilateral. Baixa complacência (24 mL/cmH₂O), shunt intrapulmonar massivo e aumento da pós-carga ventricular esquerda. Resposta espetacular à titulação de PEEP.',
    patientProfile: {
      name: 'Antônio Ferreira (EAP Cardiogênico)',
      age: 72,
      gender: 'male',
      heightCm: 170,
      actualWeightKg: 80,
      idealBodyWeightKg: 66.0,
      compliance: 24,
      resistance: 13,
      spontaneousDrive: true,
      spontaneousRate: 26,
      spontaneousEffortPressure: -8,
      spontaneousDutyCycle: 0.35,
      metabolicRateVCO2: 220,
      metabolicRateVO2: 280,
      deadSpaceFraction: 0.45,
      shuntFraction: 32,
      hemoglobin: 12.8,
      bodyTemperature: 36.8,
      secretionsSeverity: 'mild',
      circuitLeakPercent: 0,
    },
    initialSettings: {
      mode: 'VCV',
      fio2: 100,
      peep: 4,
      triggerType: 'flow',
      triggerSensitivity: 2.0,
      tidalVolume: 500,
      respiratoryRate: 20,
      flowWaveform: 'decelerating',
      inspiratoryFlow: 50,
      inspiratoryPausePercent: 0,
      inspiratoryPressure: 18,
      inspiratoryTimePCV: 1.0,
      pressureRiseTime: 0.1,
      pressureSupport: 10,
      expiratorySensitivity: 25,
      backupApneaTime: 20,
      pHigh: 24,
      pLow: 0,
      tHigh: 3.5,
      tLow: 0.6,
      simvRate: 14,
      simvPs: 10,
    },
    clinicalHistory:
      'Masculino, 72 anos, hipertenso e coronariopata, intubado de emergência com estertores até ápices e expectoração rósea espumosa abundante.',
    physicalExam:
      'IOT 8.0, secreção rósea no tubo, taquicárdico (FC 115 bpm), PA 170/100 mmHg, SpO2 84% com PEEP de 4 cmH2O.',
    initialABG: {
      ph: 7.25,
      paco2: 52,
      pao2: 55,
      hco3: 21,
      spo2: 84,
      fio2: 100,
    },
    goals: [
      {
        id: 'eap-peep',
        description: 'Aumentar PEEP para 10 a 14 cmH₂O para recrutamento alveolar e redução de pré/pós-carga',
        isMet: (_, settings) => settings.peep >= 10 && settings.peep <= 14,
        targetFeedback: 'A PEEP elevada empurra o líquido extravasado para o interstício e alivia a sobrecarga de VE.',
      },
      {
        id: 'eap-fio2-wean',
        description: 'Desmamar FiO₂ com segurança para ≤ 60% mantendo SpO₂ ≥ 93%',
        isMet: (monitored, settings) => settings.fio2 <= 60 && monitored.spo2 >= 92,
        targetFeedback: 'Com a melhora do shunt após o ajuste de PEEP, reduza a FiO2 para evitar toxicidade por oxigênio.',
      },
      {
        id: 'eap-driving-p',
        description: 'Manter Driving Pressure ≤ 14 cmH₂O',
        isMet: (monitored) => monitored.drivingPressure <= 14,
        targetFeedback: 'Excelente preservação da mecânica pulmonar protetora.',
      },
    ],
    teachingPoints: [
      'No EAP cardiogênico, a pressão positiva intratorácica reduz o retorno venoso (pré-carga) e a pós-carga do ventrículo esquerdo.',
      'A PEEP atua redistribuindo a água alveolar e recrutando áreas dependentes do pulmão.',
      'Assim que a oxigenação se estabilizar, proceda com o desmame da FiO2 para níveis seguros.',
    ],
  },

  // 7. Pós-Operatório Abdominal
  {
    id: 'pos-operatorio-abdominal',
    title: '7. Pós-Operatório Abdominal (Restrição Toracoabdominal & Atelectasias)',
    category: 'Restritiva',
    difficulty: 'Intermediário',
    description:
      'Paciente em pós-operatório imediato de laparotomia exploradora por peritonite. Incisão abdominal alta dolorosa com compressão diafragmática, complacência toracoabdominal reduzida (32 mL/cmH₂O) e atelectasias de base.',
    patientProfile: {
      name: 'Marcos Vinicius Abreu (PO Abdominal)',
      age: 52,
      gender: 'male',
      heightCm: 172,
      actualWeightKg: 75,
      idealBodyWeightKg: 67.8,
      compliance: 32, // Redução por restrição de parede/abdome
      resistance: 7, // Resistência normal
      spontaneousDrive: true,
      spontaneousRate: 18,
      spontaneousEffortPressure: -5,
      spontaneousDutyCycle: 0.33,
      metabolicRateVCO2: 210,
      metabolicRateVO2: 260,
      deadSpaceFraction: 0.38,
      shuntFraction: 20, // Atelectasias basais
      hemoglobin: 11.5,
      bodyTemperature: 37.3,
      secretionsSeverity: 'none',
      circuitLeakPercent: 0,
    },
    initialSettings: {
      mode: 'VCV',
      fio2: 50,
      peep: 5,
      triggerType: 'flow',
      triggerSensitivity: 2.0,
      tidalVolume: 520, // Volume excessivo para complacência reduzida
      respiratoryRate: 16,
      flowWaveform: 'decelerating',
      inspiratoryFlow: 50,
      inspiratoryPausePercent: 10,
      inspiratoryPressure: 18,
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
    clinicalHistory:
      'Masculino, 52 anos, PO imediato de laparotomia mediana xifopúbica por apendicite perfurada com peritonite difusa. Curativo compressivo volumoso e dor à palpação abdominal.',
    physicalExam:
      'IOT nº 8.0 fixado a 22 cm. Ausculta com murmúrio diminuído em bases pulmonares bilateralmente. Abdome tenso e distendido.',
    initialABG: {
      ph: 7.32,
      paco2: 47,
      pao2: 70,
      hco3: 23.5,
      spo2: 93,
      fio2: 50,
    },
    goals: [
      {
        id: 'po-vt-ibw',
        description: 'Ajustar Volume Corrente protetor de 6 mL/kg IBW (400 mL)',
        isMet: (_, settings, patient) => {
          const vtKg = settings.tidalVolume / patient.idealBodyWeightKg;
          return vtKg >= 5.5 && vtKg <= 6.5;
        },
        targetFeedback: 'Manter o Vt protetor reduz as pressões de via aérea e minimiza a dor toracoabdominal.',
      },
      {
        id: 'po-peep-recruitment',
        description: 'Otimizar PEEP para 8 a 10 cmH₂O para prevenir atelectasias de base pós-cirúrgicas',
        isMet: (_, settings) => settings.peep >= 8 && settings.peep <= 10,
        targetFeedback: 'A PEEP de 8-10 cmH2O compensa a elevação das cúpulas diafragmáticas e recruta as bases.',
      },
      {
        id: 'po-dp',
        description: 'Manter Driving Pressure ≤ 14 cmH₂O',
        isMet: (monitored) => monitored.drivingPressure <= 14,
        targetFeedback: 'Excelente estabilização da mecânica ventilatória protetora.',
      },
    ],
    teachingPoints: [
      'Incisões abdominais altas e distensão intra-abdominal reduzem a complacência da parede torácica ($C_w$), diminuindo a complacência do sistema respiratório ($C_{rs}$).',
      'A PEEP adequada (8-10 cmH2O) é essencial para combater o colapso alveolar precoce nas bases pulmonares dependentes.',
      'Analgesia efetiva pós-operatória melhora a complacência e viabiliza um desmame precoce da ventilação mecânica.',
    ],
  },

  // 8. Paciente Obeso (Restrição de Parede Torácica & IMC > 40)
  {
    id: 'paciente-obeso',
    title: '8. Paciente Obeso Mórbido (Restrição Torácica Extrínseca & Risco de Colapso)',
    category: 'Restritiva',
    difficulty: 'Intermediário',
    description:
      'Paciente com obesidade grau III (IMC 44 kg/m²; Peso real = 135 kg vs Peso predito = 68 kg). Severa sobrecarga de peso sobre a caixa torácica e diafragma com complacência muito reduzida (26 mL/cmH₂O), fechamento precoce de vias aéreas e risco de hiperdistensão se o Vt for baseado no peso real.',
    patientProfile: {
      name: 'Geraldo Fonseca (Obeso Mórbido IMC 44)',
      age: 46,
      gender: 'male',
      heightCm: 172,
      actualWeightKg: 135, // Peso real elevado!
      idealBodyWeightKg: 67.8, // Peso predito real!
      compliance: 26, // Baixa complacência por sobrecarga torácica/abdominal
      resistance: 10, // Aumento resistivo por colapso parcial de via aérea
      spontaneousDrive: false,
      spontaneousRate: 0,
      spontaneousEffortPressure: 0,
      spontaneousDutyCycle: 0.33,
      metabolicRateVCO2: 280, // Metabolismo elevado por grande massa corporal
      metabolicRateVO2: 340,
      deadSpaceFraction: 0.42,
      shuntFraction: 22, // Microatelectasias compressivas
      hemoglobin: 14.8,
      bodyTemperature: 36.9,
      secretionsSeverity: 'none',
      circuitLeakPercent: 0,
    },
    initialSettings: {
      mode: 'VCV',
      fio2: 60,
      peep: 6,
      triggerType: 'flow',
      triggerSensitivity: 2.0,
      tidalVolume: 800, // ERRO GRAVE: Vt ajustado no peso real de 135 kg!
      respiratoryRate: 16,
      flowWaveform: 'decelerating',
      inspiratoryFlow: 55,
      inspiratoryPausePercent: 10,
      inspiratoryPressure: 26,
      inspiratoryTimePCV: 0.9,
      pressureRiseTime: 0.1,
      pressureSupport: 10,
      expiratorySensitivity: 25,
      backupApneaTime: 20,
      pHigh: 28,
      pLow: 0,
      tHigh: 3.5,
      tLow: 0.6,
      simvRate: 12,
      simvPs: 10,
    },
    clinicalHistory:
      'Masculino, 46 anos, IMC 44 kg/m² (135 kg, 172 cm), intubado por insuficiência respiratória aguda. O médico plantonista anterior programou o ventilador com Vt de 800 mL baseado no peso balança (real), gerando pressões de pico de 38 cmH₂O!',
    physicalExam:
      'IOT nº 8.5. Panículo adiposo exuberante na parede torácica e abdome volumoso em avental. Murmúrio vesicular diminuído difusamente pelo espessamento tecidual.',
    initialABG: {
      ph: 7.28,
      paco2: 50,
      pao2: 72,
      hco3: 23.0,
      spo2: 92,
      fio2: 60,
    },
    goals: [
      {
        id: 'obeso-correct-vt',
        description: 'Corrigir IMEDIATAMENTE o Volume Corrente para 6 mL/kg do PESO PREDITO (68 kg = ~410 mL)',
        isMet: (_, settings, patient) => {
          const vtPerKg = settings.tidalVolume / patient.idealBodyWeightKg;
          return vtPerKg >= 5.5 && vtPerKg <= 6.8;
        },
        targetFeedback: 'Nunca ajuste o Vt pelo peso real no paciente obeso! Os pulmões não aumentam de tamanho com a adiposidade.',
      },
      {
        id: 'obeso-peep-titration',
        description: 'Aumentar PEEP para 10 a 14 cmH₂O para vencer o peso da caixa torácica e abrir as vias aéreas',
        isMet: (_, settings) => settings.peep >= 10 && settings.peep <= 14,
        targetFeedback: 'PEEPs fisiológicas normais (5 cmH2O) não sustentam a abertura alveolar contra o peso do tórax obeso.',
      },
      {
        id: 'obeso-driving-pressure',
        description: 'Reduzir Driving Pressure para ≤ 14 cmH₂O',
        isMet: (monitored) => monitored.drivingPressure <= 14.5 && monitored.drivingPressure > 0,
        targetFeedback: 'A correção do Vt reduz o strain mecânico alveolar e normaliza a Driving Pressure.',
      },
    ],
    teachingPoints: [
      'O peso predito (IBW) depende exclusivamente da ALTURA e do SEXO biológico, pois o parênquima pulmonar não hipertrofia com o tecido adiposo.',
      'Programar Vt pelo peso real em obesos acarreta volutrauma e barotrauma massivos.',
      'A pressão pleural basal no obeso é naturalmente positiva; por isso, níveis maiores de PEEP (10-14 cmH2O) e posicionamento em proclive (posição de rampa ou Fowler 30-45°) são essenciais.',
    ],
  },
];
