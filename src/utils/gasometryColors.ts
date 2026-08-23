export interface GasoGrade {
  color: 'emerald' | 'amber' | 'rose';
  textClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  statusLabel: string;
}

export function getPhGrade(ph: number): GasoGrade {
  if (ph >= 7.35 && ph <= 7.45) {
    return {
      color: 'emerald',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/40',
      borderClass: 'border-emerald-700/60',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60',
      statusLabel: 'Normal',
    };
  }
  if ((ph >= 7.30 && ph < 7.35) || (ph > 7.45 && ph <= 7.50)) {
    return {
      color: 'amber',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-950/40',
      borderClass: 'border-amber-700/60',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
      statusLabel: ph < 7.35 ? 'Acidemia Leve' : 'Alcalemia Leve',
    };
  }
  return {
    color: 'rose',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-950/60',
    borderClass: 'border-rose-600/80',
    badgeClass: 'bg-rose-950/90 text-rose-200 border-rose-500/80 font-black animate-pulse',
    statusLabel: ph < 7.30 ? 'Acidemia Grave' : 'Alcalemia Grave',
  };
}

export function getPaco2Grade(paco2: number): GasoGrade {
  if (paco2 >= 35 && paco2 <= 45) {
    return {
      color: 'emerald',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/40',
      borderClass: 'border-emerald-700/60',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60',
      statusLabel: 'Normocapnia',
    };
  }
  if ((paco2 >= 30 && paco2 < 35) || (paco2 > 45 && paco2 <= 52)) {
    return {
      color: 'amber',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-950/40',
      borderClass: 'border-amber-700/60',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
      statusLabel: paco2 > 45 ? 'Hipercapnia Leve' : 'Hipocapnia Leve',
    };
  }
  return {
    color: 'rose',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-950/60',
    borderClass: 'border-rose-600/80',
    badgeClass: 'bg-rose-950/90 text-rose-200 border-rose-500/80 font-black animate-pulse',
    statusLabel: paco2 > 52 ? 'Hipercapnia Grave' : 'Hipocapnia Severa',
  };
}

export function getPao2Grade(pao2: number): GasoGrade {
  if (pao2 >= 80) {
    return {
      color: 'emerald',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/40',
      borderClass: 'border-emerald-700/60',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60',
      statusLabel: 'Normoxemia',
    };
  }
  if (pao2 >= 60 && pao2 < 80) {
    return {
      color: 'amber',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-950/40',
      borderClass: 'border-amber-700/60',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
      statusLabel: 'Hipoxemia Leve',
    };
  }
  return {
    color: 'rose',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-950/60',
    borderClass: 'border-rose-600/80',
    badgeClass: 'bg-rose-950/90 text-rose-200 border-rose-500/80 font-black animate-pulse',
    statusLabel: 'Hipoxemia Grave',
  };
}

export function getHco3Grade(hco3: number): GasoGrade {
  if (hco3 >= 22 && hco3 <= 26) {
    return {
      color: 'emerald',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/40',
      borderClass: 'border-emerald-700/60',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60',
      statusLabel: 'Normal',
    };
  }
  if ((hco3 >= 18 && hco3 < 22) || (hco3 > 26 && hco3 <= 30)) {
    return {
      color: 'amber',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-950/40',
      borderClass: 'border-amber-700/60',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
      statusLabel: hco3 < 22 ? 'Reduzido (Leve)' : 'Elevado (Leve)',
    };
  }
  return {
    color: 'rose',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-950/60',
    borderClass: 'border-rose-600/80',
    badgeClass: 'bg-rose-950/90 text-rose-200 border-rose-500/80 font-black',
    statusLabel: hco3 < 18 ? 'Consumido (Acidose Metab.)' : 'Excesso Severo (Alcalose Metab.)',
  };
}

export function getBeGrade(be: number): GasoGrade {
  if (be >= -2.0 && be <= 2.0) {
    return {
      color: 'emerald',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/40',
      borderClass: 'border-emerald-700/60',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60',
      statusLabel: 'Normal',
    };
  }
  if ((be >= -4.5 && be < -2.0) || (be > 2.0 && be <= 4.5)) {
    return {
      color: 'amber',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-950/40',
      borderClass: 'border-amber-700/60',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
      statusLabel: be < 0 ? 'Déficit Leve' : 'Excesso Leve',
    };
  }
  return {
    color: 'rose',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-950/60',
    borderClass: 'border-rose-600/80',
    badgeClass: 'bg-rose-950/90 text-rose-200 border-rose-500/80 font-black',
    statusLabel: be < 0 ? 'Déficit Grave de Base' : 'Excesso Grave de Base',
  };
}

export function getSpo2Grade(spo2: number): GasoGrade {
  if (spo2 >= 94) {
    return {
      color: 'emerald',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/40',
      borderClass: 'border-emerald-700/60',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60',
      statusLabel: 'Adequada (≥94%)',
    };
  }
  if (spo2 >= 90 && spo2 < 94) {
    return {
      color: 'amber',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-950/40',
      borderClass: 'border-amber-700/60',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
      statusLabel: 'Limítrofe (90-93%)',
    };
  }
  return {
    color: 'rose',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-950/60',
    borderClass: 'border-rose-600/80',
    badgeClass: 'bg-rose-950/90 text-rose-200 border-rose-500/80 font-black animate-pulse',
    statusLabel: 'Crítica (<90%)',
  };
}

export function getPfGrade(pfRatio: number): GasoGrade {
  if (pfRatio >= 300) {
    return {
      color: 'emerald',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/40',
      borderClass: 'border-emerald-700/60',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60',
      statusLabel: 'P/F Normal (>300)',
    };
  }
  if (pfRatio >= 200 && pfRatio < 300) {
    return {
      color: 'amber',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-950/40',
      borderClass: 'border-amber-700/60',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
      statusLabel: 'SDRA Leve (200-300)',
    };
  }
  return {
    color: 'rose',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-950/60',
    borderClass: 'border-rose-600/80',
    badgeClass: 'bg-rose-950/90 text-rose-200 border-rose-500/80 font-black animate-pulse',
    statusLabel: pfRatio < 100 ? 'SDRA Grave (<100)' : 'SDRA Moderada (100-200)',
  };
}
