import React from 'react';
import { X, BookOpen, Stethoscope, Calculator, Bell, Sliders, Shield } from 'lucide-react';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenClinicalCases: () => void;
  onOpenEducational: () => void;
  onOpenCalculator: () => void;
  onOpenAlarms: () => void;
  onOpenAudio: () => void;
  onOpenPatient: () => void;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  isOpen,
  onClose,
  onOpenClinicalCases,
  onOpenEducational,
  onOpenCalculator,
  onOpenAlarms,
  onOpenAudio,
  onOpenPatient,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#0e0f14] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#13151f] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span className="font-display font-bold text-white text-sm tracking-wide">
              MENU DE ESTUDO & CONFIGURAÇÕES
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => {
              onClose();
              onOpenClinicalCases();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#151722] hover:bg-[#1d2133] border border-zinc-800 text-left transition-all cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold text-white">Casos Clínicos & Cenários</span>
              <span className="text-xs text-zinc-400">SDRA, DPOC, Asma, Pneumotórax, EAP</span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenEducational();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#151722] hover:bg-[#1d2133] border border-zinc-800 text-left transition-all cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold text-white">Guia Educacional & Biblioteca</span>
              <span className="text-xs text-zinc-400">Conceitos de ventilação mecânica e gasometria</span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenCalculator();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#151722] hover:bg-[#1d2133] border border-zinc-800 text-left transition-all cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold text-white">Calculadora de Peso Ideal & VT</span>
              <span className="text-xs text-zinc-400">Cálculo baseado na altura e gênero (mL/kg)</span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenAlarms();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#151722] hover:bg-[#1d2133] border border-zinc-800 text-left transition-all cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold text-white">Gerenciador de Alarmes</span>
              <span className="text-xs text-zinc-400">Limites de pressão, volume minuto e apneia</span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenPatient();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#151722] hover:bg-[#1d2133] border border-zinc-800 text-left transition-all cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold text-white">Perfil do Paciente & Mecânica</span>
              <span className="text-xs text-zinc-400">Complacência, resistência e drive respiratório</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
