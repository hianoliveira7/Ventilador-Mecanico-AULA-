import React from 'react';
import { X, BookOpen, Stethoscope, Calculator, Bell, Sliders, Shield, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

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
  const { theme, toggleTheme, isLight } = useTheme();

  if (!isOpen) return null;

  const handleToggleTheme = () => {
    audioEngine.playClick(1050);
    toggleTheme();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        className={`w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0e0f14] border-zinc-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#13151f] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sliders className={`w-5 h-5 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
            <span
              className={`font-display font-bold text-sm tracking-wide ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              MENU DE ESTUDO & CONFIGURAÇÕES
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-2 max-h-[80vh] overflow-y-auto">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={handleToggleTheme}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
              isLight
                ? 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg ${
                  isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20'
                }`}
              >
                {isLight ? <Moon className="w-5 h-5 text-indigo-600" /> : <Sun className="w-5 h-5" />}
              </div>
              <div className="text-left">
                <span className="block text-sm font-display font-bold">
                  {isLight ? 'Modo Escuro (Interface Noturna)' : 'Modo Claro (Interface Clínica Clara)'}
                </span>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  {isLight ? 'Ativar visual escuro padrão de monitor' : 'Ativar visual claro de alta luminosidade'}
                </span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border ${
                isLight
                  ? 'bg-amber-200/80 text-amber-900 border-amber-300'
                  : 'bg-zinc-800 text-amber-300 border-zinc-700'
              }`}
            >
              {isLight ? 'Claro Ativo' : 'Escuro Ativo'}
            </span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenClinicalCases();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20'
              }`}
            >
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Casos Clínicos & Cenários</span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                SDRA, DPOC, Asma, Pneumotórax, EAP
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenEducational();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20'
              }`}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Guia Educacional & Biblioteca</span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Conceitos de ventilação mecânica e gasometria
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenCalculator();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20'
              }`}
            >
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Calculadora de Peso Ideal & VT</span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Cálculo baseado na altura e gênero (mL/kg)
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenAlarms();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20'
              }`}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Gerenciador de Alarmes</span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Limites de pressão, volume minuto e apneia
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenPatient();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                : 'bg-[#151722] hover:bg-[#1d2133] border-zinc-800 text-white'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg ${
                isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20'
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-sm font-display font-bold">Perfil do Paciente & Mecânica</span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Complacência, resistência e drive respiratório
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
