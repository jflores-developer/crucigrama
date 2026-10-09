import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CrosswordPuzzle, CrosswordClue, Direction } from '../types/crossword';
import { CrosswordBoard } from './CrosswordBoard';
import { CluesPanel } from './CluesPanel';
import { VirtualKeyboard } from './VirtualKeyboard';
import { ScoreModal } from './ScoreModal';
import { PdfExportModal } from './PdfExportModal';
import { StorageService } from '../services/storageService';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Eye,
  Keyboard,
  Maximize2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Printer,
  FileDown,
} from 'lucide-react';

interface CrosswordGameProps {
  puzzle: CrosswordPuzzle;
  isEmbedded?: boolean;
  onGoToHistory: () => void;
  onGoToLibrary: () => void;
  onGenerateNew: () => void;
}

export const CrosswordGame: React.FC<CrosswordGameProps> = ({
  puzzle,
  isEmbedded = false,
  onGoToHistory,
  onGoToLibrary,
  onGenerateNew,
}) => {
  // State
  const [userGrid, setUserGrid] = useState<Record<string, string>>({});
  const [revealedCells, setRevealedCells] = useState<Record<string, boolean>>({});
  const [wrongCells, setWrongCells] = useState<Record<string, boolean>>({});
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [direction, setDirection] = useState<Direction>('across');
  const [zoom, setZoom] = useState(1.0);
  const [gridStyle, setGridStyle] = useState<'eco' | 'classic'>('eco');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Stats & Timer
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);

  // Status message alert
  const [notification, setNotification] = useState<{ text: string; type: 'info' | 'success' | 'warn' } | null>(null);
  const notifyTimeoutRef = useRef<number | null>(null);

  const showNotice = (text: string, type: 'info' | 'success' | 'warn' = 'info') => {
    if (notifyTimeoutRef.current) clearTimeout(notifyTimeoutRef.current);
    setNotification({ text, type });
    notifyTimeoutRef.current = window.setTimeout(() => setNotification(null), 3000);
  };

  // 1. Initial setup: restore progress or set first word
  useEffect(() => {
    let isSubscribed = true;

    async function loadSavedState() {
      const saved = await StorageService.getProgress(puzzle.id);
      if (saved && isSubscribed) {
        setUserGrid(saved.userGrid || {});
        setTimeSeconds(saved.timeSeconds || 0);
        setHintsUsed(saved.hintsUsed || 0);
      }

      // Default select first available cell of clue 1
      if (puzzle.clues.length > 0) {
        const firstClue = puzzle.clues[0];
        setSelectedCell({ row: firstClue.row, col: firstClue.col });
        setDirection(firstClue.direction);
      }
    }

    loadSavedState();

    return () => {
      isSubscribed = false;
    };
  }, [puzzle.id]);

  // 2. Timer tick
  useEffect(() => {
    if (!isRunning || isCompleted) return;
    const interval = setInterval(() => {
      setTimeSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isCompleted]);

  // 3. Auto-save progress
  useEffect(() => {
    if (isCompleted || Object.keys(userGrid).length === 0) return;
    const debounce = setTimeout(() => {
      StorageService.saveProgress({
        puzzleId: puzzle.id,
        userGrid,
        timeSeconds,
        hintsUsed,
        isCompleted: false,
        lastPlayed: new Date().toISOString(),
      });
    }, 1500);
    return () => clearTimeout(debounce);
  }, [userGrid, timeSeconds, hintsUsed, puzzle.id, isCompleted]);

  // Get active clue based on selected cell & direction
  const getActiveClue = useCallback((): CrosswordClue | null => {
    if (!selectedCell) return null;
    const cell = puzzle.grid[selectedCell.row]?.[selectedCell.col];
    if (!cell || cell.isBlocked) return null;

    if (direction === 'across' && cell.acrossClueId) {
      return puzzle.clues.find(c => c.id === cell.acrossClueId) || null;
    }
    if (direction === 'down' && cell.downClueId) {
      return puzzle.clues.find(c => c.id === cell.downClueId) || null;
    }

    // Fallback: if current direction has no clue at this cell, check the other direction
    if (direction === 'across' && cell.downClueId) {
      return puzzle.clues.find(c => c.id === cell.downClueId) || null;
    }
    if (direction === 'down' && cell.acrossClueId) {
      return puzzle.clues.find(c => c.id === cell.acrossClueId) || null;
    }

    return null;
  }, [selectedCell, direction, puzzle]);

  const activeClue = getActiveClue();

  // Find completed clues (all cells filled correctly)
  const completedClueIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const clue of puzzle.clues) {
      let isDone = true;
      for (let k = 0; k < clue.length; k++) {
        const r = clue.direction === 'across' ? clue.row : clue.row + k;
        const c = clue.direction === 'across' ? clue.col + k : clue.col;
        const entered = userGrid[`${r}-${c}`] || '';
        const expected = puzzle.grid[r][c].solution;
        if (entered !== expected) {
          isDone = false;
          break;
        }
      }
      if (isDone) set.add(clue.id);
    }
    return set;
  }, [puzzle, userGrid]);

  // Check overall puzzle completion
  const checkPuzzleCompletion = useCallback(
    (currentGrid: Record<string, string>) => {
      if (isCompleted) return;

      let allFilled = true;
      let allCorrect = true;

      for (let r = 0; r < puzzle.rows; r++) {
        for (let c = 0; c < puzzle.cols; c++) {
          const cell = puzzle.grid[r][c];
          if (!cell.isBlocked) {
            const entered = currentGrid[`${r}-${c}`] || '';
            if (!entered) {
              allFilled = false;
            }
            if (entered !== cell.solution) {
              allCorrect = false;
            }
          }
        }
      }

      if (allFilled && allCorrect) {
        setIsCompleted(true);
        setIsRunning(false);
        setShowScoreModal(true);
      }
    },
    [puzzle, isCompleted]
  );

  // Navigate to next cell in active clue
  const advanceToNextCell = useCallback(
    (currRow: number, currCol: number) => {
      if (!activeClue) return;

      let nextR = currRow;
      let nextC = currCol;

      if (direction === 'across') {
        nextC += 1;
        // Check if inside clue
        if (nextC < activeClue.col + activeClue.length) {
          setSelectedCell({ row: nextR, col: nextC });
          return;
        }
      } else {
        nextR += 1;
        if (nextR < activeClue.row + activeClue.length) {
          setSelectedCell({ row: nextR, col: nextC });
          return;
        }
      }

      // If at end of clue, jump to next clue
      jumpToNextClue(1);
    },
    [activeClue, direction]
  );

  // Jump to next or previous clue
  const jumpToNextClue = useCallback(
    (delta: 1 | -1) => {
      const idx = puzzle.clues.findIndex(c => c.id === activeClue?.id);
      if (idx === -1) {
        if (puzzle.clues.length > 0) {
          const first = puzzle.clues[0];
          setSelectedCell({ row: first.row, col: first.col });
          setDirection(first.direction);
        }
        return;
      }

      let nextIdx = (idx + delta + puzzle.clues.length) % puzzle.clues.length;
      const targetClue = puzzle.clues[nextIdx];
      setSelectedCell({ row: targetClue.row, col: targetClue.col });
      setDirection(targetClue.direction);
    },
    [puzzle.clues, activeClue]
  );

  // Handle cell selection
  const handleSelectCell = (row: number, col: number) => {
    const cell = puzzle.grid[row]?.[col];
    if (!cell || cell.isBlocked) return;

    if (selectedCell?.row === row && selectedCell?.col === col) {
      // Clicked same cell -> toggle direction if cell has both
      if (cell.acrossClueId && cell.downClueId) {
        setDirection(d => (d === 'across' ? 'down' : 'across'));
      }
    } else {
      setSelectedCell({ row, col });
      // If cell only has clue in one direction, automatically switch to it
      if (cell.acrossClueId && !cell.downClueId) {
        setDirection('across');
      } else if (!cell.acrossClueId && cell.downClueId) {
        setDirection('down');
      }
    }
  };

  // Keyboard navigation & typing
  const handleInputChar = useCallback(
    (char: string) => {
      if (!selectedCell || isCompleted) return;
      const { row, col } = selectedCell;
      const cellKey = `${row}-${col}`;

      const newGrid = { ...userGrid, [cellKey]: char };
      setUserGrid(newGrid);

      // Clear any wrong flag on this cell
      if (wrongCells[cellKey]) {
        setWrongCells(prev => {
          const c = { ...prev };
          delete c[cellKey];
          return c;
        });
      }

      checkPuzzleCompletion(newGrid);
      advanceToNextCell(row, col);
    },
    [selectedCell, isCompleted, userGrid, wrongCells, checkPuzzleCompletion, advanceToNextCell]
  );

  const handleBackspace = useCallback(() => {
    if (!selectedCell || isCompleted) return;
    const { row, col } = selectedCell;
    const cellKey = `${row}-${col}`;

    if (userGrid[cellKey]) {
      // Erase current cell
      const newGrid = { ...userGrid };
      delete newGrid[cellKey];
      setUserGrid(newGrid);
    } else {
      // Move backwards in current clue
      if (!activeClue) return;
      let prevR = row;
      let prevC = col;

      if (direction === 'across' && prevC > activeClue.col) {
        prevC -= 1;
      } else if (direction === 'down' && prevR > activeClue.row) {
        prevR -= 1;
      }

      if (prevR !== row || prevC !== col) {
        setSelectedCell({ row: prevR, col: prevC });
        const prevKey = `${prevR}-${prevC}`;
        const newGrid = { ...userGrid };
        delete newGrid[prevKey];
        setUserGrid(newGrid);
      }
    }
  }, [selectedCell, isCompleted, userGrid, activeClue, direction]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextCol = Math.min(puzzle.cols - 1, selectedCell.col + 1);
      if (!puzzle.grid[selectedCell.row][nextCol].isBlocked) {
        setSelectedCell({ row: selectedCell.row, col: nextCol });
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevCol = Math.max(0, selectedCell.col - 1);
      if (!puzzle.grid[selectedCell.row][prevCol].isBlocked) {
        setSelectedCell({ row: selectedCell.row, col: prevCol });
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = Math.min(puzzle.rows - 1, selectedCell.row + 1);
      if (!puzzle.grid[nextRow][selectedCell.col].isBlocked) {
        setSelectedCell({ row: nextRow, col: selectedCell.col });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = Math.max(0, selectedCell.row - 1);
      if (!puzzle.grid[prevRow][selectedCell.col].isBlocked) {
        setSelectedCell({ row: prevRow, col: selectedCell.col });
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      setDirection(d => (d === 'across' ? 'down' : 'across'));
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      jumpToNextClue(e.shiftKey ? -1 : 1);
    } else if (/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ]$/.test(e.key)) {
      e.preventDefault();
      let char = e.key.toUpperCase();
      // Normalize Spanish
      if (char === 'Á') char = 'A';
      if (char === 'É') char = 'E';
      if (char === 'Í') char = 'I';
      if (char === 'Ó') char = 'O';
      if (char === 'Ú' || char === 'Ü') char = 'U';
      handleInputChar(char);
    }
  };

  // Clue select from CluesPanel
  const handleSelectClue = (clue: CrosswordClue) => {
    setSelectedCell({ row: clue.row, col: clue.col });
    setDirection(clue.direction);
  };

  // HINTS & CHECKS
  // Check active cell
  const handleCheckCell = () => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const cellKey = `${row}-${col}`;
    const userChar = userGrid[cellKey];
    const solution = puzzle.grid[row][col].solution;

    if (!userChar) {
      showNotice('La casilla está vacía.', 'info');
      return;
    }

    if (userChar === solution) {
      showNotice('¡Letra correcta!', 'success');
    } else {
      setWrongCells(prev => ({ ...prev, [cellKey]: true }));
      showNotice('Letra incorrecta.', 'warn');
    }
  };

  // Check active word
  const handleCheckWord = () => {
    if (!activeClue) return;
    let errors = 0;
    const newWrong = { ...wrongCells };

    for (let k = 0; k < activeClue.length; k++) {
      const r = activeClue.direction === 'across' ? activeClue.row : activeClue.row + k;
      const c = activeClue.direction === 'across' ? activeClue.col + k : activeClue.col;
      const key = `${r}-${c}`;
      const entered = userGrid[key];
      const sol = puzzle.grid[r][c].solution;

      if (entered && entered !== sol) {
        newWrong[key] = true;
        errors++;
      }
    }

    setWrongCells(newWrong);
    if (errors === 0) {
      showNotice('¡Palabra revisada sin errores!', 'success');
    } else {
      showNotice(`Se encontraron ${errors} letras incorrectas.`, 'warn');
    }
  };

  // Reveal active cell
  const handleRevealCell = () => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const key = `${row}-${col}`;
    const sol = puzzle.grid[row][col].solution;

    const newGrid = { ...userGrid, [key]: sol };
    setUserGrid(newGrid);
    setRevealedCells(prev => ({ ...prev, [key]: true }));
    setHintsUsed(h => h + 1);

    showNotice(`Letra revelada: ${sol}`, 'info');
    checkPuzzleCompletion(newGrid);
  };

  // Reveal active word
  const handleRevealWord = () => {
    if (!activeClue) return;
    const newGrid = { ...userGrid };
    const newRevealed = { ...revealedCells };

    for (let k = 0; k < activeClue.length; k++) {
      const r = activeClue.direction === 'across' ? activeClue.row : activeClue.row + k;
      const c = activeClue.direction === 'across' ? activeClue.col + k : activeClue.col;
      const key = `${r}-${c}`;
      newGrid[key] = puzzle.grid[r][c].solution;
      newRevealed[key] = true;
    }

    setUserGrid(newGrid);
    setRevealedCells(newRevealed);
    setHintsUsed(h => h + activeClue.length);

    showNotice(`Palabra "${activeClue.answer}" revelada.`, 'info');
    checkPuzzleCompletion(newGrid);
  };

  // Reset puzzle
  const handleResetPuzzle = async () => {
    if (window.confirm('¿Seguro que deseas reiniciar el crucigrama? Se borrarán tus respuestas.')) {
      setUserGrid({});
      setRevealedCells({});
      setWrongCells({});
      setTimeSeconds(0);
      setHintsUsed(0);
      setIsCompleted(false);
      await StorageService.clearProgress(puzzle.id);
      showNotice('Crucigrama reiniciado.', 'info');
    }
  };

  // Calculate percentage progress
  let totalActiveCells = 0;
  let filledActiveCells = 0;
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      if (!puzzle.grid[r][c].isBlocked) {
        totalActiveCells++;
        if (userGrid[`${r}-${c}`]) filledActiveCells++;
      }
    }
  }
  const progressPercent = totalActiveCells > 0 ? Math.round((filledActiveCells / totalActiveCells) * 100) : 0;

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full max-w-7xl mx-auto flex flex-col ${isEmbedded ? 'p-2 sm:p-3' : 'p-3 sm:p-5'}`}>
      {/* Top Header & Navigation Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-3 sm:p-4 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base sm:text-xl font-serif font-bold text-stone-900 line-clamp-1">
              {puzzle.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
              <span>{puzzle.theme}</span>
              <span aria-hidden="true">·</span>
              <span>Nivel {puzzle.difficulty}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{puzzle.rows}×{puzzle.cols}</span>
            </div>
          </div>
        </div>

        {/* Timer, Progress and In-Game controls */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {/* Timer */}
          <div className="flex items-center gap-1.5 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-mono font-bold text-stone-800">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span>{formatTime(timeSeconds)}</span>
            <button
              type="button"
              onClick={() => setIsRunning(r => !r)}
              title={isRunning ? 'Pausar tiempo' : 'Reanudar tiempo'}
              className="ml-1 p-0.5 text-stone-500 hover:text-stone-900 cursor-pointer"
            >
              {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-stone-700" />}
            </button>
          </div>

          {/* Progress bar */}
          <div className="hidden sm:flex flex-col gap-1 w-28">
            <div className="flex justify-between text-[10px] text-stone-500 font-mono">
              <span>Progreso</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Tools Menu */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setShowKeyboard(k => !k)}
              title="Teclado en pantalla (Móvil / Táctil)"
              className={`p-2 rounded-lg border transition cursor-pointer ${
                showKeyboard
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-600'
              }`}
            >
              <Keyboard className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              title="Exportar crucigrama a PDF (con opciones para imprimir o guardar soluciones)"
              className="px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden md:inline">PDF</span>
            </button>

            <button
              type="button"
              onClick={handleCheckWord}
              title="Comprobar palabra actual"
              className="px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Comprobar</span>
            </button>

            <button
              type="button"
              onClick={handleRevealCell}
              title="Revelar letra actual (-50 pts)"
              className="px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Pista</span>
            </button>

            <button
              type="button"
              onClick={handleResetPuzzle}
              title="Reiniciar respuestas"
              className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-500 hover:text-stone-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {isEmbedded && (
              <a
                href={window.location.href.replace(/([?&])embed=[^&]+(&|$)/, '$1').replace(/\?$/, '')}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir a pantalla completa"
                className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-600 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          className={`mb-3 py-2 px-4 rounded-xl text-xs font-medium text-center transition-all animate-in fade-in duration-150 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : notification.type === 'warn'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}
        >
          {notification.text}
        </div>
      )}

      {/* Active Clue Prominent Bar (Always visible right above the grid for great UX) */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 mb-3 shadow-xs flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => jumpToNextClue(-1)}
          title="Pista anterior"
          className="p-1.5 hover:bg-amber-200/60 rounded-lg text-amber-900 transition cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 text-center min-w-0">
          {activeClue ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
              <span className="font-mono font-bold text-xs sm:text-sm text-amber-900 whitespace-nowrap">
                {activeClue.number} {activeClue.direction === 'across' ? 'HORIZONTAL' : 'VERTICAL'}:
              </span>
              <span className="font-medium text-stone-900 text-xs sm:text-sm line-clamp-2">
                {activeClue.clue}
              </span>
              <span className="text-[11px] font-mono text-amber-800 shrink-0">
                ({activeClue.length} letras)
              </span>
            </div>
          ) : (
            <span className="text-xs text-stone-500 italic">
              Haz clic en cualquier casilla para empezar a resolver
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => jumpToNextClue(1)}
          title="Pista siguiente"
          className="p-1.5 hover:bg-amber-200/60 rounded-lg text-amber-900 transition cursor-pointer shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Main Game Arena: Grid + Clues Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Crossword Board column */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <CrosswordBoard
            puzzle={puzzle}
            userGrid={userGrid}
            revealedCells={revealedCells}
            wrongCells={wrongCells}
            selectedCell={selectedCell}
            direction={direction}
            activeClue={activeClue}
            onSelectCell={handleSelectCell}
            onKeyDown={handleKeyDown}
            zoom={zoom}
            onZoomChange={setZoom}
            gridStyle={gridStyle}
            onToggleGridStyle={() => setGridStyle(s => (s === 'eco' ? 'classic' : 'eco'))}
          />

          {/* Quick instructions badge */}
          <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-2">
            <span>Escribe para rellenar</span>
            <span>·</span>
            <span>Espacio: Cambiar H/V</span>
            <span>·</span>
            <span>Tab: Siguiente pista</span>
          </div>
        </div>

        {/* Clues Panel column */}
        <div className="lg:col-span-5 flex flex-col">
          <CluesPanel
            clues={puzzle.clues}
            activeClue={activeClue}
            completedClueIds={completedClueIds}
            onSelectClue={handleSelectClue}
            compact={isEmbedded}
          />
        </div>
      </div>

      {/* Virtual Keyboard (Toggled or on small screen) */}
      {showKeyboard && (
        <div className="fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom duration-200">
          <VirtualKeyboard
            onKeyPress={handleInputChar}
            onBackspace={handleBackspace}
            onToggleDirection={() => setDirection(d => (d === 'across' ? 'down' : 'across'))}
            direction={direction}
          />
        </div>
      )}

      {/* Completion & Score Modal */}
      {showScoreModal && (
        <ScoreModal
          puzzle={puzzle}
          timeSeconds={timeSeconds}
          hintsUsed={hintsUsed}
          totalClues={puzzle.clues.length}
          solvedClues={completedClueIds.size}
          onClose={() => setShowScoreModal(false)}
          onGoToHistory={onGoToHistory}
          onPlayNext={onGoToLibrary}
        />
      )}

      {/* PDF Export Modal */}
      {showPdfModal && (
        <PdfExportModal
          puzzle={puzzle}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
};
