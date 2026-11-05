import React, { useRef, useEffect } from 'react';
import { CrosswordPuzzle, Direction, CrosswordClue } from '../types/crossword';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface CrosswordBoardProps {
  puzzle: CrosswordPuzzle;
  userGrid: Record<string, string>; // "r-c" -> letter
  revealedCells: Record<string, boolean>; // "r-c" -> true
  wrongCells: Record<string, boolean>; // "r-c" -> true
  selectedCell: { row: number; col: number } | null;
  direction: Direction;
  activeClue: CrosswordClue | null;
  onSelectCell: (row: number, col: number) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  gridStyle?: 'eco' | 'classic';
  onToggleGridStyle?: () => void;
}

export const CrosswordBoard: React.FC<CrosswordBoardProps> = ({
  puzzle,
  userGrid,
  revealedCells,
  wrongCells,
  selectedCell,
  direction,
  activeClue,
  onSelectCell,
  onKeyDown,
  zoom,
  onZoomChange,
  gridStyle = 'eco',
  onToggleGridStyle,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);

  // Keep focus in board when cell changes
  useEffect(() => {
    if (boardRef.current && document.activeElement !== boardRef.current) {
      // boardRef.current.focus({ preventScroll: true });
    }
  }, [selectedCell]);

  const rows = puzzle.rows;
  const cols = puzzle.cols;

  // Determine if a cell is part of the currently active clue
  const isCellInActiveClue = (r: number, c: number): boolean => {
    if (!activeClue) return false;
    if (activeClue.direction === 'across') {
      return (
        r === activeClue.row &&
        c >= activeClue.col &&
        c < activeClue.col + activeClue.length
      );
    } else {
      return (
        c === activeClue.col &&
        r >= activeClue.row &&
        r < activeClue.row + activeClue.length
      );
    }
  };

  // Base cell pixel size responsive to viewport
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
  const maxBoardWidth = typeof window !== 'undefined' 
    ? Math.min(window.innerWidth - (isSmallScreen ? 32 : 80), 520) 
    : 440;
  const computedBase = Math.floor(maxBoardWidth / Math.max(rows, cols));
  // Keep cells touch-friendly: minimum 26px up to 44px
  const baseSize = Math.max(26, Math.min(44, computedBase));
  const cellSize = Math.round(baseSize * zoom);

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Board zoom & style toolbar */}

      <div className="flex items-center justify-between w-full max-w-lg mb-2 px-1 text-xs text-stone-500 no-print">
        <span className="font-mono">
          {rows}×{cols} casillas · {puzzle.clues.length} pistas
        </span>
        <div className="flex items-center gap-1.5">
          {onToggleGridStyle && (
            <button
              type="button"
              onClick={onToggleGridStyle}
              title={
                gridStyle === 'eco'
                  ? 'Modo Ahorro de Tinta activado (casillas sin tinta negra). Clic para modo clásico.'
                  : 'Modo Clásico activado. Clic para cambiar a Ahorro de Tinta.'
              }
              className={`px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                gridStyle === 'eco'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              <span className="text-[11px] font-sans">
                {gridStyle === 'eco' ? '🌱 Ahorro de Tinta' : '⬛ Clásico'}
              </span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(0.75, Number((zoom - 0.1).toFixed(2))))}
              title="Reducir tamaño"
              className="p-1 text-stone-600 hover:text-stone-900 hover:bg-white rounded transition cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 font-mono text-[11px] text-stone-700 min-w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(1.4, Number((zoom + 0.1).toFixed(2))))}
              title="Aumentar tamaño"
              className="p-1 text-stone-600 hover:text-stone-900 hover:bg-white rounded transition cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onZoomChange(1.0)}
              title="Restablecer vista"
              className="p-1 text-stone-600 hover:text-stone-900 hover:bg-white rounded transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid container */}
      <div
        ref={boardRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={`outline-hidden overflow-auto max-w-full p-2 sm:p-3 rounded-2xl transition-colors duration-150 flex justify-center items-center touch-action-manipulation scrollbar-thin ${
          gridStyle === 'eco'
            ? 'bg-stone-100/70 border border-stone-200 shadow-xs print:bg-transparent print:border-0 print:p-0'
            : 'bg-stone-200/90 border border-stone-300 shadow-inner'
        }`}
      >
        <div
          role="grid"
          aria-label="Cuadrícula del crucigrama"
          className={`grid gap-[1px] transition-all select-none ${
            gridStyle === 'eco'
              ? 'bg-transparent border-0 print:border-0'
              : 'bg-stone-800 border-2 border-stone-800 shadow-md rounded-xs'
          }`}

          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          }}
        >
          {puzzle.grid.map((rowArr, r) =>
            rowArr.map((cell, c) => {
              const cellKey = `${r}-${c}`;
              const isBlocked = cell.isBlocked;
              const isSelected = selectedCell?.row === r && selectedCell?.col === c;
              const isInClue = !isBlocked && isCellInActiveClue(r, c);
              const userVal = userGrid[cellKey] || '';
              const isRevealed = !!revealedCells[cellKey];
              const isWrong = !!wrongCells[cellKey];

              if (isBlocked) {
                if (gridStyle === 'eco') {
                  // Eco ink-saver: Invisible/transparent empty cell with NO borders or ink!
                  return (
                    <div
                      key={cellKey}
                      className="w-full h-full bg-transparent pointer-events-none opacity-0 select-none print:hidden"
                      aria-hidden="true"
                    />
                  );
                }

                // Classic dark square
                return (
                  <div
                    key={cellKey}
                    className="bg-stone-900 w-full h-full print:bg-transparent print:border-0"
                    aria-hidden="true"
                  />
                );
              }

              // Dynamic styling based on state
              let cellBg = 'bg-white hover:bg-amber-50/60';
              if (isSelected) {
                cellBg = 'bg-amber-300 ring-2 ring-amber-500 ring-inset z-10';
              } else if (isInClue) {
                cellBg = 'bg-amber-100/90';
              }

              if (isWrong) {
                cellBg = 'bg-rose-100 text-rose-800 ring-1 ring-rose-400';
              } else if (isRevealed) {
                cellBg = isSelected ? 'bg-amber-300' : 'bg-blue-50 text-blue-900';
              }

              return (
                <div
                  key={cellKey}
                  role="gridcell"
                  tabIndex={-1}
                  onClick={() => onSelectCell(r, c)}
                  className={`relative flex items-center justify-center cursor-pointer transition-colors duration-75 border border-stone-800 shadow-xs print:border-stone-900 print:shadow-none ${cellBg}`}
                  style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                >
                  {/* Clue starting number */}
                  {cell.number && (
                    <span
                      className="absolute top-0.5 left-1 font-sans text-stone-700 font-bold leading-none select-none pointer-events-none"
                      style={{ fontSize: `${Math.max(9, Math.round(cellSize * 0.28))}px` }}
                    >
                      {cell.number}
                    </span>
                  )}

                  {/* Letter entered */}
                  <span
                    className={`font-mono font-bold leading-none select-none pointer-events-none ${
                      isRevealed
                        ? 'text-blue-700 italic'
                        : isWrong
                        ? 'text-rose-600 line-through'
                        : 'text-stone-900'
                    }`}
                    style={{
                      fontSize: `${Math.max(14, Math.round(cellSize * 0.58))}px`,
                      paddingTop: cell.number ? `${Math.round(cellSize * 0.12)}px` : '0',
                    }}
                  >
                    {userVal}
                  </span>

                  {/* Direction indicator pip on active cell */}
                  {isSelected && (
                    <div
                      className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-600 pointer-events-none no-print"
                      title={direction === 'across' ? 'Horizontal' : 'Vertical'}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
