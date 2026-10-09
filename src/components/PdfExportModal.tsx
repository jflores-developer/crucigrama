import React, { useState } from 'react';
import { CrosswordPuzzle } from '../types/crossword';
import { generateCrosswordPdf, PdfExportOptions } from '../services/pdfExportService';
import { X, FileText, Download, Printer, Check, Leaf, Eye } from 'lucide-react';

interface PdfExportModalProps {
  puzzle: CrosswordPuzzle;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ puzzle, onClose }) => {
  const [includeSolutions, setIncludeSolutions] = useState(false);
  const [blockedStyle, setBlockedStyle] = useState<PdfExportOptions['blockedStyle']>('inkSaver');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [isGenerating, setIsGenerating] = useState(false);

  // Trigger PDF download
  const handleDownload = () => {
    setIsGenerating(true);
    try {
      const doc = generateCrosswordPdf(puzzle, {
        includeSolutions,
        blockedStyle,
        pageSize,
      });
      const cleanTitle = puzzle.title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_');
      const suffix = includeSolutions ? '_soluciones' : '';
      doc.save(`Crucigrama_${cleanTitle}${suffix}.pdf`);
    } catch (e) {
      console.error('Error generating PDF:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Open PDF in new tab for direct print
  const handlePrintPreview = () => {
    setIsGenerating(true);
    try {
      const doc = generateCrosswordPdf(puzzle, {
        includeSolutions,
        blockedStyle,
        pageSize,
      });
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.error('Error previewing PDF:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full p-5 sm:p-6 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-stone-900 text-base sm:text-lg">
                Exportar Crucigrama a PDF
              </h3>
              <p className="text-xs text-stone-500">
                {puzzle.title} · {puzzle.clues.length} pistas
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

        {/* Options */}
        <div className="space-y-4 my-4">
          {/* Include solutions toggle */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Tipo de hoja a exportar:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIncludeSolutions(false)}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                  !includeSolutions
                    ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-400 text-stone-900 font-semibold'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600 bg-white'
                }`}
              >
                <span>Crucigrama en Blanco</span>
                <span className="text-[11px] font-normal text-stone-500">
                  Listo para imprimir y resolver con lápiz
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeSolutions(true)}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                  includeSolutions
                    ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-400 text-stone-900 font-semibold'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600 bg-white'
                }`}
              >
                <span>Hoja de Respuestas</span>
                <span className="text-[11px] font-normal text-stone-500">
                  Con las letras y soluciones completas
                </span>
              </button>
            </div>
          </div>

          {/* Ink Saving / Blocked square style */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                Estilo de casillas inactivas (Ahorro de tinta):
              </label>
              <span className="text-[10px] text-emerald-700 font-medium">Recomendado para imprimir</span>
            </div>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                  blockedStyle === 'inkSaver'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-400'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <input
                  type="radio"
                  name="blockedStyle"
                  checked={blockedStyle === 'inkSaver'}
                  onChange={() => setBlockedStyle('inkSaver')}
                  className="mt-0.5 text-emerald-600"
                />
                <div className="text-xs">
                  <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                    <span>Ahorro Máximo de Tinta (Blancas / Abiertas)</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-mono">
                      0% tinta en huecos
                    </span>
                  </div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Solo imprime los bordes de las casillas con letras. Los espacios bloqueados quedan completamente en blanco.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                  blockedStyle === 'softGray'
                    ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-400'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <input
                  type="radio"
                  name="blockedStyle"
                  checked={blockedStyle === 'softGray'}
                  onChange={() => setBlockedStyle('softGray')}
                  className="mt-0.5 text-amber-600"
                />
                <div className="text-xs">
                  <div className="font-semibold text-stone-900">Gris Suave Ecológico</div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Relleno muy tenue (5% de opacidad) que distingue los huecos sin agotar el cartucho de tinta.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                  blockedStyle === 'classicDark'
                    ? 'border-stone-500 bg-stone-50 ring-1 ring-stone-400'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <input
                  type="radio"
                  name="blockedStyle"
                  checked={blockedStyle === 'classicDark'}
                  onChange={() => setBlockedStyle('classicDark')}
                  className="mt-0.5 text-stone-800"
                />
                <div className="text-xs">
                  <div className="font-semibold text-stone-900">Negro Clásico</div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Casillas oscuras tradicionales estilo crucigrama anglosajón.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Page size */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Formato de página:
            </label>
            <select
              value={pageSize}
              onChange={e => setPageSize(e.target.value as 'a4' | 'letter')}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
            >
              <option value="a4">A4 (210 x 297 mm - Estándar internacional)</option>
              <option value="letter">Carta / Letter (8.5 x 11 pulgadas)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={handlePrintPreview}
            disabled={isGenerating}
            className="py-2.5 px-4 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-stone-500" />
            <span>Vista Previa / Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating}
            className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Documento PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
