export interface EducationalTopic {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string[];
  keyFormulas?: { label: string; formula: string; explanation: string }[];
  clinicalTips: string[];
  schematics?: string;
}

export const EDUCATIONAL_GUIDES: EducationalTopic[] = [
  {
    id: 'mecanica-pulmonar',
    title: 'Mecânica Respiratória & Equação do Movimento',
    category: 'Fundamentos',
    summary: 'A base matemática e física de toda a ventilação mecânica invasiva.',
    content: [
      'A Equação do Movimento descreve a pressão necessária para insuflar o sistema respiratório a cada instante de tempo:',
      'Paw(t) = Pelástica(t) + Presistiva(t) + PEEP = (V(t) / Crs) + (Raw × Fluxo(t)) + PEEP + Pmus(t)',
      'O componente elástico depende do volume insuflado e da complacência do sistema respiratório (Crs).',
      'O componente resistivo depende da velocidade do fluxo de gás e do diâmetro das vias aéreas e do tubo orotraqueal (Raw).',
      'Durante uma pausa inspiratória (fluxo = 0), a pressão resistiva cai instantaneamente a zero, revelando a Pressão de Platô (Pplat).',
    ],
    keyFormulas: [
      {
        label: 'Complacência Estática (Cstat)',
        formula: 'Cstat = Vt / (Pplat - PEEP)',
        explanation: 'Normal: 50 a 80 mL/cmH2O em adultos. Na SDRA reduz-se a < 30 mL/cmH2O.',
      },
      {
        label: 'Resistência de Vias Aéreas (Raw)',
        formula: 'Raw = (Ppeak - Pplat) / Fluxo (L/s)',
        explanation: 'Normal com TOT: 5 a 10 cmH2O/(L/s). No DPOC e broncoespasmo pode exceder 25 cmH2O/(L/s).',
      },
      {
        label: 'Driving Pressure (ΔP)',
        formula: 'ΔP = Pplat - PEEP = Vt / Cstat',
        explanation: 'Reflete o estresse e deformação alveolar. Meta clínica: ΔP ≤ 14 cmH2O.',
      },
      {
        label: 'Constante de Tempo (τ)',
        formula: 'τ = Raw × Crs (em segundos)',
        explanation: 'Tempo necessário para 63% do volume ser expirado. 3 a 5 τ são necessários para esvaziamento completo.',
      },
    ],
    clinicalTips: [
      'Se o Ppeak subir mas o Pplat permanecer normal, o problema é exclusivamente RESISTIVO (secreção no tubo, broncoespasmo, acotovelamento).',
      'Se tanto o Ppeak quanto o Pplat subirem proporcionalmente, o problema é COMPLACÊNCIA (SDRA, pneumotórax, edema pulmonar, derrame pleural).',
      'A pausa inspiratória deve durar entre 2 e 3 segundos para correta estabilização da pressão e leitura do Pplat.',
    ],
  },

  {
    id: 'curvas-ventilatorias',
    title: 'Interpretação das Curvas Gráficas (Curvas x Tempo)',
    category: 'Monitorização Gráfica',
    summary: 'Como extrair diagnósticos imediatos a partir das ondas de Pressão, Fluxo e Volume.',
    content: [
      '1. Curva de Pressão x Tempo (Paw): Mostra a evolução da pressão nas vias aéreas. No modo VCV com fluxo constante, a curva sobe linearmente com uma rampa reflexo da complacência. No modo PCV, a pressão atinge um patamar plano fixo.',
      '2. Curva de Fluxo x Tempo: O fluxo inspiratório pode ser quadrado (constante) ou desacelerado. O fluxo expiratório é sempre passivo e exponencial. Se a curva expiratória não tocar a linha zero antes da próxima inspiração, há AUTO-PEEP (aprisionamento aéreo)!',
      '3. Curva de Volume x Tempo: Mostra a insuflação e esvaziamento. Se o volume expiratório não voltar à linha de base zero, há FUGA no circuito (balonete desinsuflado ou fístula broncopleural).',
    ],
    keyFormulas: [
      {
        label: 'Ventilação Minuto (VM)',
        formula: 'VM = Vt × FR (L/min)',
        explanation: 'Normal: 5 a 8 L/min.',
      },
      {
        label: 'Relação I:E',
        formula: 'Ti / Te (ex: 1:2, 1:3)',
        explanation: 'Em doentes obstrutivos recomenda-se 1:3 a 1:4 para evitar hiperinsuflação dinâmica.',
      },
    ],
    clinicalTips: [
      'Presença de serrilhado nas ondas de fluxo indica presença de secreções no circuito ou na traqueia (indicação de aspiração).',
      'Deflexão negativa na curva de pressão antes do disparo indica esforço inspiratório do paciente.',
      'Curva de fluxo expiratório com pico baixo e cauda muito longa é o clássico padrão de alta resistência (DPOC/asma).',
    ],
  },

  {
    id: 'loops-respiratorios',
    title: 'Loops Pressão-Volume & Fluxo-Volume',
    category: 'Monitorização Gráfica',
    summary: 'Identificação de histerese pulmonar, hiperdistensão alveolar e limitação ao fluxo aéreo.',
    content: [
      'Loop Pressão x Volume (P-V): Traçado no sentido anti-horário em ventilação mecânica controlada. A área interna do loop reflete o trabalho respiratório resistivo e a histerese pulmonar.',
      'Ponto de Inflexão Inferior (LIP): Ponto na curva inspiratória onde a complacência aumenta subitamente, marcando a pressão de abertura alveolar (ideal para ajustar PEEP mínima).',
      'Ponto de Inflexão Superior (UIP) & Bico de Pato: Quando a curva inclina para a direita no final da inspiração (formato de bico de pato), indica hiperdistensão alveolar e perda de complacência.',
      'Loop Fluxo x Volume (F-V): No DPOC/asma, a alça expiratória perde a linearidade e exibe uma concavidade acentuada (scooping) demonstrando limitação ao fluxo aéreo por colapso precoce das vias aéreas.',
    ],
    clinicalTips: [
      'Se o loop P-V inclinar-se horizontalmente (deitado), significa queda de complacência (pulmão rígido).',
      'Se o loop Volume-Pressão não fechar no eixo Y de volume zero, há vazamento evidente no sistema.',
      'No esforço espontâneo, o loop P-V roda para a direita na fase inicial de disparo (trabalho imposto pelo paciente).',
    ],
  },

  {
    id: 'sdra-ventilacao-protetora',
    title: 'Protocolo de Ventilação Protetora na SDRA',
    category: 'Protocolos Clínicos',
    summary: 'Diretrizes internacionais de proteção pulmonar baseadas nas evidências do estudo ARDSNet.',
    content: [
      '1. Volume Corrente estritamente calculado pelo Peso Predito (IBW): Iniciar com 6 mL/kg e reduzir até 4 mL/kg se necessário para manter a Driving Pressure ≤ 14 cmH2O.',
      '2. Limites de Segurança de Pressão: Pressão de Platô (Pplat) ≤ 30 cmH2O e Driving Pressure (ΔP) ≤ 14-15 cmH2O.',
      '3. Titulação da PEEP: Utilizar a tabela de PEEP/FiO2 (ARDSNet) ou titulação decrescente de PEEP para encontrar a menor Driving Pressure (melhor Cstat).',
      '4. Hipercapnia Permissiva: Aceita-se pH entre 7.20 e 7.35 para priorizar a proteção mecânica do parênquima pulmonar.',
      '5. Posição Prona: Indicada precocemente na SDRA moderada a grave com relação P/F < 150 mmHg (mínimo 16 horas consecutivas).',
    ],
    keyFormulas: [
      {
        label: 'Peso Predito Masculino',
        formula: 'IBW = 50 + 0.91 × (Altura em cm - 152.4)',
        explanation: 'Exemplo: Homem de 175 cm -> IBW = 50 + 0.91*(22.6) = 70.5 kg.',
      },
      {
        label: 'Peso Predito Feminino',
        formula: 'IBW = 45.5 + 0.91 × (Altura em cm - 152.4)',
        explanation: 'Exemplo: Mulher de 160 cm -> IBW = 45.5 + 0.91*(7.6) = 52.4 kg.',
      },
      {
        label: 'Mechanical Power (Potência Mecânica)',
        formula: 'MP = 0.098 × FR × Vt(L) × [Ppeak - (ΔP / 2)]',
        explanation: 'Meta de segurança: MP < 17 a 20 J/min para mitigar VILI (Ventilator-Induced Lung Injury).',
      },
    ],
    clinicalTips: [
      'NUNCA ajuste o volume corrente com base no peso real ou no peso da balança em pacientes obesos!',
      'Um aumento de PEEP que aumente a Driving Pressure indica sobredistensão e recrutabilidade esgotada.',
      'Se a Driving Pressure diminuir após elevar a PEEP, ocorreu recrutamento alveolar efetivo!',
    ],
  },

  {
    id: 'assincronias',
    title: 'Guia de Diagnóstico de Assincronias Paciente-Ventilador',
    category: 'Sincronia Clínica',
    summary: 'Como identificar e corrigir as 6 principais assincronias em tempo real.',
    content: [
      '1. Disparo Ineficaz (Missed Trigger): O paciente tenta inspirar (deflexão negativa em Paw ou aumento transitório de fluxo), mas o ventilador não abre a válvula. Causa: Auto-PEEP alto, fraqueza muscular ou sensibilidade muito dura.',
      '2. Auto-Disparo (Auto-Triggering): O ventilador cicla sem esforço do paciente. Causa: sensibilidade muito sensível, condensado de água no circuito, vazamento ou oscilações cardíacas.',
      '3. Duplo Disparo (Double Triggering): Dois ciclos consecutivos sem tempo expiratório intermediário. Causa: tempo inspiratório do ventilador muito mais curto que o tempo neural do paciente (fome de volume/fluxo).',
      '4. Fome de Fluxo (Flow Starvation): A curva de pressão "afunda" ou fica com concavidade voltada para cima durante a inspiração em VCV. Solução: aumentar o fluxo inspiratório ou mudar para PCV.',
      '5. Ciclagem Prematura e Tardia: Ocorre no PSV quando o critério de término de fluxo (Esens %) não combina com a mecânica do paciente. No DPOC, use Esens mais alto (40-50%) para ciclar mais cedo.',
    ],
    clinicalTips: [
      'O disparo a fluxo (Flow Trigger 1.5 a 2.0 L/min) é geralmente mais sensível e gera menor trabalho respiratório do que o disparo a pressão.',
      'No paciente com DPOC, o Auto-PEEP gera uma carga de limiar que deve ser vencida antes do disparo; aplicar PEEP extrínseca em 70-80% do Auto-PEEP reduz esse trabalho.',
    ],
  },
];
