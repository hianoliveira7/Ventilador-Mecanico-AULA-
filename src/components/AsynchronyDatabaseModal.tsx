import React, { useState } from 'react';
import {
  Activity,
  Zap,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Play,
  HelpCircle,
  X,
  Sparkles,
  ChevronRight,
  BookOpen,
  SlidersHorizontal,
  Info,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { ASYNCHRONIES_DATABASE, AsynchronyPreset } from '../data/asynchroniesData';
import { VentilatorSettings, PatientParameters } from '../types/ventilation';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface AsynchronyDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadAsynchronyScenario: (patient: PatientParameters, settings: VentilatorSettings, title: string) => void;
}

export const AsynchronyDatabaseModal: React.FC<AsynchronyDatabaseModalProps> = ({
  isOpen,
  onClose,
  onLoadAsynchronyScenario,
}) => {
  const { isLight } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeAsynchrony, setActiveAsynchrony] = useState<AsynchronyPreset>(ASYNCHRONIES_DATABASE[0]);

  if (!isOpen) return null;

  const categories = ['Todos', 'Disparo', 'Fluxo', 'Ciclagem', 'Misto'];

  const filteredAsynchronies = ASYNCHRONIES_DATABASE.filter((item) => {
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectAsynchrony = (item: AsynchronyPreset) => {
    audioEngine.playClick(900);
    setActiveAsynchrony(item);
  };

  const handleSimulate = (item: AsynchronyPreset) => {
    audioEngine.playConfirmBeep();
    onLoadAsynchronyScenario(item.patientPreset, item.ventilatorPreset, item.title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-5xl h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all relative ${
          isLight
            ? 'bg-gradient-to-b from-white to-slate-50 border-slate-300 text-slate-900'
            : 'bg-gradient-to-b from-[#0d101c] to-[#060812] border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 relative overflow-hidden ${
            isLight
              ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-700 text-white'
              : 'bg-gradient-to-r from-cyan-950/90 via-slate-900 to-indigo-950/90 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner">
              <Zap className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-200 border border-white/15">
                <Activity className="w-3 h-3 text-cyan-300" />
                <span>Banco de Dados Clínico</span>
              </div>
              <h2 className="text-lg sm:text-xl font-display font-black tracking-tight">
                Biblioteca de Assincronias Paciente-Ventilador
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer border border-white/20"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div
          className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-[#101424] border-zinc-800'
          }`}
        >
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  audioEngine.playClick(1000);
                  setSelectedCategory(cat);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-white border-cyan-400 shadow-sm'
                    : isLight
                    ? 'bg-white hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-[#161a2e] hover:bg-[#1e243e] text-zinc-300 border-zinc-700/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou sintoma..."
              className={`w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded-xl border outline-none transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  : 'bg-[#15192b] border-zinc-700 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
              }`}
            />
          </div>
        </div>

        {/* Main 2-Column Content Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-0">
          {/* Left Column: List of Asynchronies (5 cols) */}
          <div
            className={`md:col-span-5 border-r overflow-y-auto p-3 space-y-2.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#090b14] border-zinc-800'
            }`}
          >
            {filteredAsynchronies.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs font-mono">
                Nenhuma assincronia encontrada com esse termo.
              </div>
            ) : (
              filteredAsynchronies.map((item) => {
                const isSelected = activeAsynchrony.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectAsynchrony(item)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                      isSelected
                        ? isLight
                          ? 'bg-white border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                          : 'bg-[#12172b] border-cyan-500 shadow-lg ring-1 ring-cyan-500/40'
                        : isLight
                        ? 'bg-white hover:bg-slate-100 border-slate-200'
                        : 'bg-[#0f1322] hover:bg-[#151a2e] border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold uppercase tracking-wider ${
                          item.category === 'Disparo'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            : item.category === 'Fluxo'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : item.category === 'Ciclagem'
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                            : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {item.category}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 font-bold">{item.difficulty}</span>
                    </div>

                    <div>
                      <h4
                        className={`text-xs font-display font-bold leading-snug ${
                          isSelected ? (isLight ? 'text-cyan-800' : 'text-cyan-300') : ''
                        }`}
                      >
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {item.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/40 text-[10px] font-mono">
                      <span className="text-zinc-500">{item.patientPreset.name}</span>
                      <span className="text-cyan-400 font-bold flex items-center gap-0.5">
                        Ver Detalhes <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed View of Selected Asynchrony (7 cols) */}
          <div className="md:col-span-7 overflow-y-auto p-4 sm:p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Header Badge & Title */}
              <div className="space-y-2 border-b pb-4 border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold uppercase">
                    {activeAsynchrony.badge}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 font-semibold">
                    Categoria: {activeAsynchrony.category}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-display font-black tracking-tight text-cyan-400">
                  {activeAsynchrony.title}
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{activeAsynchrony.description}</p>
              </div>

              {/* Fisiopatologia */}
              <div
                className={`p-3.5 rounded-2xl border space-y-1.5 ${
                  isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-mono font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Causa Fisiopatológica & Mecânica:</span>
                </div>
                <p className="text-xs leading-relaxed font-sans">{activeAsynchrony.physiologicalCause}</p>
              </div>

              {/* O que observar nas Curvas */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  <span>Sinais Característicos nas Curvas:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
                  <div
                    className={`p-3 rounded-xl border ${
                      isLight ? 'bg-white border-slate-200' : 'bg-[#121626] border-zinc-800'
                    }`}
                  >
                    <span className="font-mono font-bold text-cyan-400 block mb-1">Pressão x Tempo:</span>
                    <span className="text-zinc-300 text-[11px] leading-relaxed">
                      {activeAsynchrony.waveformCharacteristics.pressure}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isLight ? 'bg-white border-slate-200' : 'bg-[#121626] border-zinc-800'
                    }`}
                  >
                    <span className="font-mono font-bold text-emerald-400 block mb-1">Fluxo x Tempo:</span>
                    <span className="text-zinc-300 text-[11px] leading-relaxed">
                      {activeAsynchrony.waveformCharacteristics.flow}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isLight ? 'bg-white border-slate-200' : 'bg-[#121626] border-zinc-800'
                    }`}
                  >
                    <span className="font-mono font-bold text-amber-400 block mb-1">Volume x Tempo:</span>
                    <span className="text-zinc-300 text-[11px] leading-relaxed">
                      {activeAsynchrony.waveformCharacteristics.volume}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isLight ? 'bg-white border-slate-200' : 'bg-[#121626] border-zinc-800'
                    }`}
                  >
                    <span className="font-mono font-bold text-purple-400 block mb-1">Loops P-V / F-V:</span>
                    <span className="text-zinc-300 text-[11px] leading-relaxed">
                      {activeAsynchrony.waveformCharacteristics.loops}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guia de Solução */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Passo a Passo de Resolução no Ventilador:</span>
                </h4>
                <ul className="space-y-1.5 text-xs font-sans">
                  {activeAsynchrony.solutionSteps.map((step, idx) => (
                    <li
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                        isLight ? 'bg-emerald-50/50 border-emerald-200 text-slate-800' : 'bg-emerald-950/20 border-emerald-900/50 text-zinc-200'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed text-[11.5px]">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] font-mono text-zinc-400">
                Paciente: <strong className="text-zinc-200">{activeAsynchrony.patientPreset.name}</strong>
              </div>

              <button
                onClick={() => handleSimulate(activeAsynchrony)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 cursor-pointer active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Simular esta Assincronia no Ventilador</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
