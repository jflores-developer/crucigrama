import React, { useState, useEffect } from 'react';
import { CrosswordPuzzle } from './types/crossword';
import { StorageService } from './services/storageService';
import { AdminAuthService } from './services/adminAuthService';
import { CrosswordGame } from './components/CrosswordGame';
import { CrosswordGeneratorView } from './components/CrosswordGeneratorView';
import { PastPuzzlesArchive } from './components/PastPuzzlesArchive';
import { ScoreHistoryView } from './components/ScoreHistoryView';
import { CrosswordGeneratorModal } from './components/CrosswordGeneratorModal';
import { AdminPasscodeModal } from './components/AdminPasscodeModal';
import { EmbedCodeModal } from './components/EmbedCodeModal';
import { PdfExportModal } from './components/PdfExportModal';
import {
  Grid3X3,
  Trophy,
  Sparkles,
  Code2,
  BookOpen,
  Gamepad2,
  Layers,
  Share2,
  FileDown,
  Lock,
} from 'lucide-react';

export default function App() {
  const [puzzles, setPuzzles] = useState<CrosswordPuzzle[]>([]);
  const [activePuzzle, setActivePuzzle] = useState<CrosswordPuzzle | null>(null);
  
  // Access control state: only authorized users can access the generator
  const [isGeneratorUnlocked, setIsGeneratorUnlocked] = useState(AdminAuthService.isUnlocked());
  const [showAdminPasscodeModal, setShowAdminPasscodeModal] = useState(false);

  // Tab state
  const [currentTab, setCurrentTab] = useState<'generator' | 'play' | 'library' | 'scores'>('play');
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [embedTargetPuzzleId, setEmbedTargetPuzzleId] = useState<string | null>(null);

  // Initialize DB & handle URL params on mount
  useEffect(() => {
    async function setup() {
      setIsLoading(true);
      await StorageService.init();
      const all = await StorageService.getAllPuzzles();
      setPuzzles(all);

      // Check whether session is unlocked (or via ?adminKey= in URL)
      const unlocked = AdminAuthService.isUnlocked();
      setIsGeneratorUnlocked(unlocked);

      // Check if running in embedded mode or query parameters
      const params = new URLSearchParams(window.location.search);
      const isEmbedParam =
        params.get('embed') === 'true' ||
        params.get('embedded') === 'true' ||
        window.location.hash === '#embed';

      // Explicitly require embed param or hash for standalone iframe player
      setIsEmbedded(isEmbedParam);

      // Check if a full portable puzzle payload (pdata) was passed in URL:
      const pdataParam = params.get('pdata');
      if (pdataParam) {
        try {
          const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(pdataParam))));
          const compact = JSON.parse(jsonStr);
          const reconstructedClues = compact.k.map((c: any) => ({
            id: `${c.d === 'a' ? 'across' : 'down'}-${c.n}`,
            number: c.n,
            direction: c.d === 'a' ? 'across' : 'down',
            clue: c.c,
            answer: c.a,
            row: c.r,
            col: c.o,
            length: c.l,
          }));

          const rCount = compact.r;
          const cCount = compact.c;
          const grid = Array.from({ length: rCount }, (_, r) =>
            Array.from({ length: cCount }, (_, col) => ({
              row: r,
              col,
              solution: '',
              userChar: '',
              isBlocked: true,
            }))
          );

          for (const cl of reconstructedClues) {
            for (let i = 0; i < cl.length; i++) {
              const r = cl.direction === 'across' ? cl.row : cl.row + i;
              const c = cl.direction === 'across' ? cl.col + i : cl.col;
              grid[r][c].solution = cl.answer[i];
              grid[r][c].isBlocked = false;
              if (i === 0) (grid[r][c] as any).number = cl.number;
              if (cl.direction === 'across') (grid[r][c] as any).acrossClueId = cl.id;
              else (grid[r][c] as any).downClueId = cl.id;
            }
          }

          const decodedPuzzle: CrosswordPuzzle = {
            id: compact.i || `cw_${Date.now()}`,
            title: compact.t,
            theme: compact.m,
            difficulty: compact.d,
            rows: rCount,
            cols: cCount,
            clues: reconstructedClues,
            grid: grid as any,
            createdAt: new Date().toISOString(),
            author: 'Crucigrama Pro',
            playCount: 0,
            isCustom: true,
          };

          await StorageService.savePuzzle(decodedPuzzle);
          setPuzzles(prev => [decodedPuzzle, ...prev.filter(p => p.id !== decodedPuzzle.id)]);
          setActivePuzzle(decodedPuzzle);
          if (isEmbedParam || params.get('play') === 'true') {
            setCurrentTab('play');
          }
          setIsLoading(false);
          return;
        } catch (err) {
          console.warn('Error reading pdata from URL:', err);
        }
      }

      // If a specific puzzle ID was provided in URL:
      const targetId = params.get('puzzle');
      if (targetId) {
        const found = all.find(p => p.id === targetId);
        if (found) {
          setActivePuzzle(found);
          // If explicitly requested to play or in embedded player mode
          if (isEmbedParam || params.get('play') === 'true') {
            setCurrentTab('play');
          }
          setIsLoading(false);
          return;
        }
      }

      // Default active puzzle available for preview or play
      if (all.length > 0) {
        setActivePuzzle(all[0]);
      }

      // Tab routing:
      // If the authorized creator opens the app, default to 'generator'!
      // If unauthorized public visitor opens the app, default to 'play' (or requested tab)!
      const requestedTab = params.get('tab');
      if (requestedTab === 'generator') {
        if (unlocked) {
          setCurrentTab('generator');
        } else {
          setCurrentTab('play');
          setShowAdminPasscodeModal(true);
        }
      } else if (requestedTab === 'library' || requestedTab === 'scores') {
        setCurrentTab(requestedTab);
      } else if (requestedTab === 'play') {
        setCurrentTab('play');
      } else {
        // Default on startup: if creator is unlocked, show generator; if public visitor, show play!
        setCurrentTab(unlocked ? 'generator' : 'play');
      }

      setIsLoading(false);
    }

    setup();
  }, []);

  // Reload puzzles from DB
  const refreshPuzzles = async (selectId?: string) => {
    const list = await StorageService.getAllPuzzles();
    setPuzzles(list);
    if (selectId) {
      const match = list.find(p => p.id === selectId);
      if (match) setActivePuzzle(match);
    } else if (!activePuzzle && list.length > 0) {
      setActivePuzzle(list[0]);
    }
  };

  // Switch to specific puzzle
  const handleSelectPuzzle = (puzzleId: string) => {
    const match = puzzles.find(p => p.id === puzzleId);
    if (match) {
      setActivePuzzle(match);
      setCurrentTab('play');
      // Update browser history query without reload if not embedded
      if (!isEmbedded) {
        const url = new URL(window.location.href);
        url.searchParams.set('puzzle', puzzleId);
        window.history.replaceState({}, '', url.toString());
      }
    }
  };

  // Open embed modal for puzzle
  const handleOpenEmbedModal = (puzzleId: string) => {
    setEmbedTargetPuzzleId(puzzleId);
    setShowEmbedModal(true);
  };

  // Delete custom puzzle
  const handleDeletePuzzle = async (puzzleId: string) => {
    if (window.confirm('¿Deseas eliminar este crucigrama de la base de datos?')) {
      await StorageService.deletePuzzle(puzzleId);
      const updated = puzzles.filter(p => p.id !== puzzleId);
      setPuzzles(updated);
      if (activePuzzle?.id === puzzleId) {
        setActivePuzzle(updated[0] || null);
      }
    }
  };

  // On new puzzle created
  const handlePuzzleCreated = (newPuzzle: CrosswordPuzzle) => {
    setPuzzles(prev => [newPuzzle, ...prev.filter(p => p.id !== newPuzzle.id)]);
    setActivePuzzle(newPuzzle);
    setShowGeneratorModal(false);
  };

  // Creator access requests
  const handleRequestGeneratorAccess = () => {
    if (isGeneratorUnlocked) {
      setCurrentTab('generator');
    } else {
      setShowAdminPasscodeModal(true);
    }
  };

  // If loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 text-stone-600 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium tracking-wide">Cargando Crucigrama Pro...</p>
        </div>
      </div>
    );
  }

  // EMBEDDED MODE: Render clean player directly for iframe embeds (no generator access!)
  if (isEmbedded && activePuzzle) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased p-1 sm:p-2">
        <CrosswordGame
          puzzle={activePuzzle}
          isEmbedded={true}
          onGoToHistory={() => {
            // In embedded mode, open full app in new tab for leaderboard
            window.open(window.location.href.replace(/([?&])embed=[^&]+(&|$)/, '$1'), '_blank');
          }}
          onGoToLibrary={() => {
            // Pick next random puzzle
            const nextIdx = (puzzles.findIndex(p => p.id === activePuzzle.id) + 1) % puzzles.length;
            setActivePuzzle(puzzles[nextIdx]);
          }}
          onGenerateNew={() => {
            // Open full app
            window.open(window.location.origin, '_blank');
          }}
        />
      </div>
    );
  }

  // STANDARD FULL APPLICATION SHELL
  const puzzleForEmbedModal =
    puzzles.find(p => p.id === embedTargetPuzzleId) || activePuzzle || puzzles[0];

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans flex flex-col selection:bg-amber-200">
      {/* Editorial Top App Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setCurrentTab('play')}
          >
            <div className="w-10 h-10 bg-stone-900 text-amber-400 rounded-xl flex items-center justify-center shadow-xs">
              <Grid3X3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-black text-lg tracking-tight text-stone-900">
                  CRUCIGRAMA PRO
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-1.5 py-0.5 rounded">
                  ESPAÑOL
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden sm:block">
                Crucigramas interactivos, modo incrustable y biblioteca
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Functional interactive buttons) */}
          <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            {/* Play Tab (Available to everyone) */}
            <button
              type="button"
              onClick={() => setCurrentTab('play')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'play'
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Jugar</span>
            </button>

            {/* Library Tab (Available to everyone) */}
            <button
              type="button"
              onClick={() => setCurrentTab('library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'library'
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-600" />
              <span>Biblioteca ({puzzles.length})</span>
            </button>

            {/* Leaderboard Tab (Available to everyone) */}
            <button
              type="button"
              onClick={() => setCurrentTab('scores')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'scores'
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Récords</span>
            </button>

            {/* Generator Tab (Protected: only whoever creator chooses can access) */}
            <button
              type="button"
              onClick={handleRequestGeneratorAccess}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'generator'
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
                  : isGeneratorUnlocked
                  ? 'text-stone-600 hover:text-stone-900'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title={isGeneratorUnlocked ? 'Generador de crucigramas activo' : 'Acceso restringido para creadores (requiere clave)'}
            >
              {isGeneratorUnlocked ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Generador</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Generador</span>
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-medium">PIN</span>
                </>
              )}
            </button>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {activePuzzle && (
              <button
                type="button"
                onClick={() => setShowPdfModal(true)}
                title="Exportar crucigrama a PDF (Listo para imprimir o soluciones)"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-stone-500" />
                <span>Exportar PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (activePuzzle) handleOpenEmbedModal(activePuzzle.id);
              }}
              title="Obtener código para incrustar este crucigrama en Google Sites o web"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-stone-500" />
              <span>Incrustar</span>
            </button>

            <button
              type="button"
              onClick={handleRequestGeneratorAccess}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              {isGeneratorUnlocked ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generador</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Crear Crucigrama</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {/* GENERATOR TAB: Strictly guarded for authorized users only */}
        {currentTab === 'generator' && isGeneratorUnlocked && (
          <CrosswordGeneratorView
            puzzles={puzzles}
            activePuzzle={activePuzzle}
            onStartPuzzle={(puzzle) => {
              setActivePuzzle(puzzle);
              setCurrentTab('play');
            }}
            onOpenEmbedModal={(puzzleId) => handleOpenEmbedModal(puzzleId)}
            onOpenPdfModal={(puzzle) => {
              setActivePuzzle(puzzle);
              setShowPdfModal(true);
            }}
            onPuzzleCreated={handlePuzzleCreated}
            onLockGenerator={() => {
              setIsGeneratorUnlocked(false);
              setCurrentTab('play');
            }}
          />
        )}

        {/* LOCKED GENERATOR FALLBACK IF USER NOT AUTHORIZED */}
        {currentTab === 'generator' && !isGeneratorUnlocked && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center max-w-md mx-auto my-12 space-y-4 shadow-sm animate-in fade-in">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-700">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-stone-900 text-lg">
                Generador Protegido para Creadores
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Los visitantes pueden jugar libremente todos los crucigramas. Para acceder al generador e introducir nuevos crucigramas, ingresa tu clave.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCurrentTab('play')}
                className="py-2 px-4 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Jugar Crucigramas
              </button>
              <button
                type="button"
                onClick={() => setShowAdminPasscodeModal(true)}
                className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Ingresar Clave
              </button>
            </div>
          </div>
        )}

        {/* PLAY TAB (Available to all visitors) */}
        {currentTab === 'play' && activePuzzle && (
          <CrosswordGame
            puzzle={activePuzzle}
            isEmbedded={false}
            onGoToHistory={() => setCurrentTab('scores')}
            onGoToLibrary={() => setCurrentTab('library')}
            onGenerateNew={handleRequestGeneratorAccess}
          />
        )}

        {currentTab === 'play' && !activePuzzle && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center max-w-md mx-auto my-12 space-y-3">
            <Grid3X3 className="w-10 h-10 text-amber-600 mx-auto" />
            <h3 className="font-serif font-bold text-stone-900 text-lg">No hay ningún crucigrama activo</h3>
            <p className="text-xs text-stone-500">
              Selecciona uno de la biblioteca para comenzar a jugar.
            </p>
            <button
              type="button"
              onClick={() => setCurrentTab('library')}
              className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Ir a la Biblioteca
            </button>
          </div>
        )}

        {/* LIBRARY TAB (Available to all visitors) */}
        {currentTab === 'library' && (
          <PastPuzzlesArchive
            puzzles={puzzles}
            onSelectPuzzle={handleSelectPuzzle}
            onOpenEmbedModal={handleOpenEmbedModal}
            onDeletePuzzle={handleDeletePuzzle}
            onGoToGenerator={handleRequestGeneratorAccess}
          />
        )}

        {/* SCORES TAB (Available to all visitors) */}
        {currentTab === 'scores' && (
          <ScoreHistoryView
            puzzles={puzzles}
            onPlayPuzzle={handleSelectPuzzle}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-6 text-stone-500 text-xs no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-stone-700">Crucigrama Pro</span>
            <span>·</span>
            <span>Crucigramas interactivos en español</span>
            <span>·</span>
            <span>Acceso abierto para jugadores</span>
          </div>

          <div className="flex items-center gap-4 text-stone-500">
            <button
              type="button"
              onClick={() => {
                if (activePuzzle) handleOpenEmbedModal(activePuzzle.id);
              }}
              className="hover:text-stone-900 transition cursor-pointer flex items-center gap-1"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Incrustar Widget</span>
            </button>
            <button
              type="button"
              onClick={handleRequestGeneratorAccess}
              className="hover:text-stone-900 transition cursor-pointer flex items-center gap-1"
            >
              <Lock className="w-3 h-3 text-stone-400" />
              <span>Acceso Creador</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('library')}
              className="hover:text-stone-900 transition cursor-pointer"
            >
              Biblioteca
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('scores')}
              className="hover:text-stone-900 transition cursor-pointer"
            >
              Récords
            </button>
          </div>
        </div>
      </footer>

      {/* Passcode Unlock Modal */}
      {showAdminPasscodeModal && (
        <AdminPasscodeModal
          onSuccess={() => {
            setIsGeneratorUnlocked(true);
            setShowAdminPasscodeModal(false);
            setCurrentTab('generator');
          }}
          onCancel={() => setShowAdminPasscodeModal(false)}
        />
      )}

      {/* Generator Modal (if triggered via game shortcut when unlocked) */}
      {showGeneratorModal && (
        <CrosswordGeneratorModal
          onClose={() => setShowGeneratorModal(false)}
          onPuzzleCreated={handlePuzzleCreated}
        />
      )}

      {/* Embed Code Modal */}
      {showEmbedModal && puzzleForEmbedModal && (
        <EmbedCodeModal
          puzzle={puzzleForEmbedModal}
          onClose={() => setShowEmbedModal(false)}
        />
      )}

      {/* PDF Export Modal */}
      {showPdfModal && activePuzzle && (
        <PdfExportModal
          puzzle={activePuzzle}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}
