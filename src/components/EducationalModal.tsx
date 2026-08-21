import React, { useState } from 'react';
import { EDUCATIONAL_GUIDES, EducationalTopic } from '../data/educationalGuides';
import {
  BookOpen,
  X,
  Sparkles,
  HelpCircle,
  Calculator,
  Lightbulb,
  CheckCircle,
} from 'lucide-react';

interface EducationalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EducationalModal: React.FC<EducationalModalProps> = ({ isOpen, onClose }) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(EDUCATIONAL_GUIDES[0].id);

  if (!isOpen) return null;

  const currentTopic = EDUCATIONAL_GUIDES.find((t) => t.id === selectedTopicId) || EDUCATIONAL_GUIDES[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-[#0a0a0e] border border-zinc-800 rounded-sm w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0e0f14] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-sm bg-[#181126] border border-purple-800/80 text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-zinc-100 flex items-center gap-2">
                Guia Didático & Fisiopatologia Respiratória
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Conceitos essenciais de mecânica pulmonar, curvas gráficas, loops e assincronias.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-sm bg-[#161720] hover:bg-[#222432] text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
          {/* Topics List */}
          <div className="p-3 overflow-y-auto space-y-1.5 max-h-[75vh]">
            <span className="text-[11px] font-display font-bold text-zinc-400 uppercase tracking-wider block px-1 mb-2">
              Tópicos de Ensino
            </span>

            {EDUCATIONAL_GUIDES.map((t) => {
              const isSelected = t.id === selectedTopicId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopicId(t.id)}
                  className={`w-full text-left p-2.5 rounded-sm border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1a132c] border-purple-500 text-white shadow-md'
                      : 'bg-[#0e0f14] border-zinc-800/80 hover:bg-[#151620] text-zinc-300'
                  }`}
                >
                  <span className="text-[10px] font-mono text-purple-400 font-bold block mb-0.5">
                    {t.category}
                  </span>
                  <h3 className="text-xs font-display font-bold leading-snug">{t.title}</h3>
                </button>
              );
            })}
          </div>

          {/* Topic Detail View */}
          <div className="p-4 md:col-span-2 overflow-y-auto space-y-4 max-h-[75vh]">
            <div>
              <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                {currentTopic.category}
              </span>
              <h3 className="text-lg font-display font-black text-zinc-100 mt-0.5">{currentTopic.title}</h3>
              <p className="text-xs text-zinc-300 mt-1 italic font-sans">{currentTopic.summary}</p>
            </div>

            {/* Main Explanations */}
            <div className="bg-[#0e0f14] p-3.5 rounded-sm border border-zinc-800/80 space-y-2.5 text-xs text-zinc-200 leading-relaxed font-sans">
              {currentTopic.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {/* Key Formulas (if available) */}
            {currentTopic.keyFormulas && currentTopic.keyFormulas.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-display font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Fórmulas Matemáticas Essenciais</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentTopic.keyFormulas.map((f, i) => (
                    <div
                      key={i}
                      className="bg-[#0e0f14] p-3 rounded-sm border border-zinc-800/80 space-y-1"
                    >
                      <span className="text-[11px] font-display font-bold text-zinc-400 block">{f.label}</span>
                      <div className="text-xs font-mono font-bold text-emerald-300 bg-[#070709] p-1.5 rounded-sm border border-zinc-800/90">
                        {f.formula}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 font-mono">{f.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical Tips */}
            <div className="bg-[#1a140a] p-3.5 rounded-sm border border-amber-800/40 space-y-2 text-xs text-amber-200">
              <div className="flex items-center gap-1.5 font-display font-bold text-amber-300">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Pérolas Clínicas & Tomada de Decisão na UTI</span>
              </div>
              <ul className="space-y-1.5 text-[11px] opacity-90 font-sans">
                {currentTopic.clinicalTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
