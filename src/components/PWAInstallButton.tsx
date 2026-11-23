import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, CheckCircle2, X, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { isLight } = useTheme();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    audioEngine.playClick(950);
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-1 text-[10px] font-mono underline decoration-dotted underline-offset-2 transition-opacity opacity-70 hover:opacity-100 cursor-pointer ${
          isLight ? 'text-slate-500 hover:text-cyan-700' : 'text-zinc-500 hover:text-cyan-400'
        }`}
        title="Instalar versão offline (PWA)"
      >
        <span>{isIOS ? 'Instalar no iOS' : 'Instalar versão offline'}</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn text-left"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 font-sans ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#0e121e] border-cyan-500/40 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-black">
                    Instalar VM - FISIO (PWA)
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-500 font-bold">
                    Modo Aplicativo & Uso Offline
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isLight ? 'text-slate-600' : 'text-zinc-300'}>
                  Para instalar o simulador no seu <strong>iPhone</strong> ou <strong>iPad</strong> pelo Safari:
                </p>
                <div
                  className={`p-3.5 rounded-xl border space-y-2.5 font-mono ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080a12] border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      Toque no botão <strong>Compartilhar</strong>{' '}
                      <Share className="w-3.5 h-3.5 text-cyan-400 inline" /> na barra do Safari.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>{' '}
                      <PlusSquare className="w-3.5 h-3.5 text-cyan-400 inline" />.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span>
                      Confirme em <strong>Adicionar</strong> no canto superior direito.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs leading-relaxed">
                <p className={isLight ? 'text-slate-600' : 'text-zinc-300'}>
                  Para instalar o simulador diretamente no seu computador, tablet ou celular Android:
                </p>
                <div
                  className={`p-3.5 rounded-xl border space-y-2.5 font-mono ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080a12] border-zinc-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>No Chrome / Edge (Desktop):</strong> Clique no ícone de instalação{' '}
                      <Download className="w-3.5 h-3.5 text-cyan-400 inline" /> no canto direito da barra de endereço.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>No Android (Chrome):</strong> Toque no menu <strong>⋮</strong> do navegador e selecione{' '}
                      <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <ExternalLink className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Caso esteja visualizando dentro de uma janela incorporada, abra o app em uma nova guia para liberar a instalação nativa do navegador.
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs transition-all cursor-pointer shadow-md"
            >
              Entendi, Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
