import React, { useState } from 'react';
import { CrosswordPuzzle } from '../types/crossword';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  Code2,
  Globe,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface EmbedCodeModalProps {
  puzzle: CrosswordPuzzle;
  onClose: () => void;
}

export const EmbedCodeModal: React.FC<EmbedCodeModalProps> = ({ puzzle, onClose }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [embedWidth, setEmbedWidth] = useState('100%');
  const [embedHeight, setEmbedHeight] = useState('720');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showGoogleSitesGuide, setShowGoogleSitesGuide] = useState(true);

  // Origins: Dev vs Public Shared App URL
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isDevOrigin = currentOrigin.includes('ais-dev-');
  const publicOrigin = currentOrigin.replace('ais-dev-', 'ais-pre-');
  const [urlMode, setUrlMode] = useState<'public' | 'current'>(isDevOrigin ? 'public' : 'current');

  const selectedOrigin = urlMode === 'public' && isDevOrigin ? publicOrigin : currentOrigin;

  // Build portable payload for custom or dynamically generated puzzles
  let urlParams = `embed=true&puzzle=${encodeURIComponent(puzzle.id)}`;
  if (puzzle.isCustom || !puzzle.id.startsWith('seed_')) {
    try {
      const compact = {
        i: puzzle.id,
        t: puzzle.title,
        m: puzzle.theme,
        d: puzzle.difficulty,
        r: puzzle.rows,
        c: puzzle.cols,
        k: puzzle.clues.map(c => ({
          n: c.number,
          d: c.direction === 'across' ? 'a' : 'd',
          c: c.clue,
          a: c.answer,
          r: c.row,
          o: c.col,
          l: c.length,
        })),
      };
      const pdata = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(compact)))));
      urlParams += `&pdata=${pdata}`;
    } catch {
      // Fallback to simple ID
    }
  }

  const embedUrl = `${selectedOrigin}/?${urlParams}`;

  const iframeSnippet = `<iframe
  src="${embedUrl}"
  width="${embedWidth}"
  height="${embedHeight}"
  frameborder="0"
  style="border: 0; max-width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
  allow="clipboard-write"
  allowfullscreen
  title="Crucigrama: ${puzzle.title}"
></iframe>`;

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(iframeSnippet);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleCopyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(embedUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const getPreviewWidth = () => {
    if (previewDevice === 'mobile') return '375px';
    if (previewDevice === 'tablet') return '600px';
    return '100%';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-3xl w-full p-5 sm:p-6 my-auto animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-stone-900 text-base sm:text-lg">
                Incrustar Crucigrama en Google Sites o Web
              </h3>
              <p className="text-xs text-stone-500">
                {puzzle.title} · Nivel {puzzle.difficulty}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CRITICAL TROUBLESHOOTING ALERT FOR GOOGLE SITES CARITA TRISTE */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <span className="text-sm">⚠️</span>
            <span>¿Te aparece una carita triste o error en Google Sites?</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-900">
            La <strong>carita triste</strong> ocurre cuando se pega el enlace de desarrollo (<code>ais-dev-...</code>), el cual está protegido por Google y no permite marcos externos.
          </p>
          <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-[11px] space-y-1 text-stone-800">
            <p className="font-semibold text-amber-950">Cómo solucionarlo en 2 pasos:</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>
                En la esquina superior de <strong>Google AI Studio</strong>, haz clic en el botón azul <strong>«Share» (Compartir)</strong> para publicar la versión pública.
              </li>
              <li>
                Copia la <strong>URL Pública (ais-pre-...)</strong> que te preparamos aquí abajo y pégala en Google Sites en <strong>Insertar &gt; Incorporar código</strong> o <strong>Por URL</strong>.
              </li>
            </ol>
          </div>
        </div>

        {/* Domain origin selector if in dev mode */}
        {isDevOrigin && (
          <div className="flex items-center justify-between bg-stone-100 p-2 rounded-xl text-xs">
            <span className="text-stone-600 font-medium">Servidor para incrustación:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUrlMode('public')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  urlMode === 'public'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white text-stone-700 hover:bg-stone-200'
                }`}
              >
                URL Pública (ais-pre) ★ Recomendada
              </button>
              <button
                type="button"
                onClick={() => setUrlMode('current')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                  urlMode === 'current'
                    ? 'bg-stone-800 text-white shadow-2xs'
                    : 'bg-white text-stone-700 hover:bg-stone-200'
                }`}
              >
                URL Actual (ais-dev)
              </button>
            </div>
          </div>
        )}

        {/* Step-by-Step for Google Sites Collapsible Guide */}
        <div className="border border-blue-200 bg-blue-50/70 rounded-xl p-3 text-xs text-blue-900">
          <button
            type="button"
            onClick={() => setShowGoogleSitesGuide(v => !v)}
            className="w-full flex items-center justify-between font-semibold text-blue-800 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Instrucciones paso a paso para Google Sites</span>
            </div>
            {showGoogleSitesGuide ? (
              <ChevronUp className="w-4 h-4 text-blue-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-blue-500" />
            )}
          </button>

          {showGoogleSitesGuide && (
            <div className="mt-2.5 pt-2 border-t border-blue-200/80 space-y-2 text-[11px] text-blue-800 leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-800">
                <div className="bg-white/90 p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                  <div className="font-bold text-blue-900 flex items-center gap-1 mb-1">
                    <Code2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Opción A: «Incorporar código» (Más fiable)</span>
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
                    <li>En Google Sites, haz clic en <strong>Insertar &gt; Insertar</strong> (icono <code>&lt;/&gt;</code>).</li>
                    <li>Elige la pestaña <strong>Incorporar código</strong>.</li>
                    <li>Copia el <strong>Código HTML iframe</strong> de abajo, pégalo y haz clic en <strong>Siguiente &gt; Insertar</strong>.</li>
                  </ol>
                </div>

                <div className="bg-white/90 p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                  <div className="font-bold text-blue-900 flex items-center gap-1 mb-1">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Opción B: «Por URL»</span>
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
                    <li>En Google Sites, haz clic en <strong>Insertar &gt; Insertar</strong> (icono <code>&lt;/&gt;</code>).</li>
                    <li>Elige la pestaña <strong>Por URL</strong>.</li>
                    <li>Pega la <strong>URL Directa</strong> de abajo y pulsa <strong>Insertar</strong>.</li>
                  </ol>
                </div>
              </div>
              <p className="text-[10px] text-blue-700 italic">
                * Consejo: Tras insertarlo en Google Sites, arrastra los puntos azules de los bordes del bloque para ajustar la altura y ancho a tu gusto.
              </p>
            </div>
          )}
        </div>

        {/* Direct URL Row */}
        <div className="border border-stone-200 rounded-xl p-3 bg-stone-50 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-stone-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <span>URL Directa {urlMode === 'public' ? '(Pública)' : '(Dev)'}:</span>
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold cursor-pointer text-xs"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? '¡URL Copiada!' : 'Copiar URL'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={embedUrl}
              onFocus={e => e.target.select()}
              className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-700 select-all"
            />
          </div>
        </div>

        {/* Configuration row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Altura recomendada (px)
            </label>
            <input
              type="number"
              min="500"
              max="1200"
              step="20"
              value={embedHeight}
              onChange={e => setEmbedHeight(e.target.value)}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Ancho del iframe
            </label>
            <select
              value={embedWidth}
              onChange={e => setEmbedWidth(e.target.value)}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
            >
              <option value="100%">100% (Responsive adaptativo recomendado)</option>
              <option value="800px">800px (Desktop fijo)</option>
              <option value="600px">600px (Columna media)</option>
              <option value="400px">400px (Sidebar / Móvil)</option>
            </select>
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="relative">
          <div className="flex items-center justify-between pb-1 text-xs text-stone-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Código HTML Iframe (Para «Incorporar código» en Google Sites):</span>
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold cursor-pointer text-xs"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? '¡Código Copiado!' : 'Copiar código HTML'}</span>
            </button>
          </div>
          <pre className="p-3 bg-stone-900 text-stone-100 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-28 border border-stone-800">
            {iframeSnippet}
          </pre>
        </div>

        {/* Live preview selector */}
        <div className="border border-stone-200 rounded-xl p-3 bg-stone-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-700">Vista previa simulada:</span>
            <div className="flex items-center gap-1 bg-white border border-stone-200 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                title="Escritorio"
                className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-stone-200 text-stone-900' : 'text-stone-500'}`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                title="Tablet"
                className={`p-1 rounded ${previewDevice === 'tablet' ? 'bg-stone-200 text-stone-900' : 'text-stone-500'}`}
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                title="Móvil"
                className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-stone-200 text-stone-900' : 'text-stone-500'}`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex justify-center bg-stone-200/50 p-2 rounded-lg overflow-hidden">
            <div
              className="bg-white rounded-lg shadow-sm border border-stone-300 overflow-hidden transition-all duration-200"
              style={{ width: getPreviewWidth(), height: '260px' }}
            >
              <iframe
                src={`${currentOrigin}/?${urlParams}`}
                title="Vista previa crucigrama"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-1">
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 hover:underline font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir en ventana independiente</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

