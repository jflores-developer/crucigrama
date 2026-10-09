import React, { useState } from 'react';
import { CrosswordPuzzle, DifficultyLevel } from '../types/crossword';
import { PdfExportModal } from './PdfExportModal';
import { Search, Play, Trophy, Code2, Printer, Trash2, Calendar, Grid3X3, Sparkles, FileDown } from 'lucide-react';

interface PastPuzzlesArchiveProps {
  puzzles: CrosswordPuzzle[];
  onSelectPuzzle: (puzzleId: string) => void;
  onOpenEmbedModal: (puzzleId: string) => void;
  onDeletePuzzle: (puzzleId: string) => void;
  onGoToGenerator: () => void;
}

export const PastPuzzlesArchive: React.FC<PastPuzzlesArchiveProps> = ({
  puzzles,
  onSelectPuzzle,
  onOpenEmbedModal,
  onDeletePuzzle,
  onGoToGenerator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [pdfTargetPuzzle, setPdfTargetPuzzle] = useState<CrosswordPuzzle | null>(null);

  // Extract unique themes
  const themes = Array.from(new Set(puzzles.map(p => p.theme)));

  const filteredPuzzles = puzzles.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.theme.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiff = selectedDifficulty === 'all' || p.difficulty === selectedDifficulty;
    const matchesTheme = selectedTheme === 'all' || p.theme === selectedTheme;
    return matchesSearch && matchesDiff && matchesTheme;
  });

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const handlePrint = (puzzle: CrosswordPuzzle) => {
    onSelectPuzzle(puzzle.id);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">
            <Grid3X3 className="w-6 h-6 text-stone-700" />
            Biblioteca de Crucigramas Anteriores
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Explora y juega cualquiera de los crucigramas generados previamente y del catálogo clásico.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToGenerator}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generar Nuevo Crucigrama</span>
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, temática o palabra clave..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-amber-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedTheme}
            onChange={e => setSelectedTheme(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-xs focus:outline-hidden focus:border-amber-500"
          >
            <option value="all">Todas las temáticas</option>
            {themes.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-xs focus:outline-hidden focus:border-amber-500"
          >
            <option value="all">Cualquier dificultad</option>
            <option value="Fácil">Fácil</option>
            <option value="Medio">Medio</option>
            <option value="Difícil">Difícil</option>
          </select>
        </div>
      </div>

      {/* Puzzles Grid */}
      {filteredPuzzles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Grid3X3 className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-700">No se encontraron crucigramas</p>
          <p className="text-xs text-stone-400 mt-1">Prueba cambiando los filtros o genera un nuevo crucigrama con IA.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPuzzles.map(puzzle => {
            const isSeed = puzzle.id.startsWith('seed_');

            return (
              <div
                key={puzzle.id}
                className="bg-white rounded-xl border border-stone-200 hover:border-amber-300 hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 text-xs text-stone-500">
                    <span className="font-medium text-stone-600 uppercase tracking-wider text-[10px]">
                      {puzzle.theme}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar className="w-3 h-3 text-stone-400" />
                      {formatDate(puzzle.createdAt)}
                    </span>
                  </div>

                  <h3 className="text-base font-serif font-bold text-stone-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                    {puzzle.title}
                  </h3>

                  <div className="flex items-center gap-2 mt-2 text-xs text-stone-500">
                    <span>Nivel {puzzle.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{puzzle.rows}×{puzzle.cols}</span>
                    <span aria-hidden="true">·</span>
                    <span>{puzzle.clues.length} definiciones</span>
                  </div>

                  {/* Play count & High score info */}
                  <div className="flex items-center gap-4 mt-3 py-2 px-3 bg-stone-50 rounded-lg text-xs">
                    <div className="flex items-center gap-1 text-stone-600">
                      <Play className="w-3.5 h-3.5 text-stone-400" />
                      <span>{puzzle.playCount || 0} jugadas</span>
                    </div>
                    {puzzle.bestScore ? (
                      <div className="flex items-center gap-1 text-amber-700 font-medium">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-mono font-bold">{puzzle.bestScore} pts</span>
                      </div>
                    ) : (
                      <span className="text-stone-400 italic text-[11px]">Sin récord aún</span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => onSelectPuzzle(puzzle.id)}
                    className="flex-1 py-2 px-3 bg-stone-900 hover:bg-stone-800 active:scale-98 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Jugar ahora</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenEmbedModal(puzzle.id)}
                    title="Obtener código para incrustar en tu página web"
                    className="p-2 border border-stone-200 hover:bg-stone-100 text-stone-600 rounded-lg text-xs transition cursor-pointer"
                  >
                    <Code2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfTargetPuzzle(puzzle)}
                    title="Exportar crucigrama a PDF para imprimir"
                    className="p-2 border border-stone-200 hover:bg-stone-100 text-stone-600 rounded-lg text-xs transition cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>

                  {!isSeed && (
                    <button
                      type="button"
                      onClick={() => onDeletePuzzle(puzzle.id)}
                      title="Eliminar este crucigrama"
                      className="p-2 border border-stone-200 hover:bg-rose-50 hover:text-rose-600 text-stone-400 rounded-lg text-xs transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Export Modal */}
      {pdfTargetPuzzle && (
        <PdfExportModal
          puzzle={pdfTargetPuzzle}
          onClose={() => setPdfTargetPuzzle(null)}
        />
      )}
    </div>
  );
};
