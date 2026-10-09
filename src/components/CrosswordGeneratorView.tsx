import React, { useState } from 'react';
import { CrosswordPuzzle, DifficultyLevel, WordCluePair } from '../types/crossword';
import {
  generateCrosswordLayout,
  generateCrosswordFromTopicWithAI,
  THEMATIC_PACKS,
  ThematicPack,
  normalizeSpanishWord,
} from '../services/crosswordGenerator';
import { StorageService } from '../services/storageService';
import {
  Sparkles,
  Play,
  Code2,
  FileDown,
  Layers,
  Edit3,
  Dices,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Grid3X3,
  Search,
  Check,
  RotateCw,
  Sliders,
  ExternalLink,
  Lock,
  KeyRound,
  ShieldCheck,
  Share2,
  X,
} from 'lucide-react';
import { AdminAuthService } from '../services/adminAuthService';

interface CrosswordGeneratorViewProps {
  puzzles: CrosswordPuzzle[];
  activePuzzle: CrosswordPuzzle | null;
  onStartPuzzle: (puzzle: CrosswordPuzzle) => void;
  onOpenEmbedModal: (puzzleId: string) => void;
  onOpenPdfModal: (puzzle: CrosswordPuzzle) => void;
  onPuzzleCreated: (puzzle: CrosswordPuzzle) => void;
  onLockGenerator?: () => void;
}

type GeneratorMode = 'ai' | 'packs' | 'random' | 'manual';

export const CrosswordGeneratorView: React.FC<CrosswordGeneratorViewProps> = ({
  puzzles,
  activePuzzle,
  onStartPuzzle,
  onOpenEmbedModal,
  onOpenPdfModal,
  onPuzzleCreated,
  onLockGenerator,
}) => {
  // Mode selection
  const [mode, setMode] = useState<GeneratorMode>('ai');

  // Creator security management state
  const [showKeyManager, setShowKeyManager] = useState(false);
  const [newPasscodeInput, setNewPasscodeInput] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState<string | null>(null);
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);

  // AI & Thematic generation state
  const [topic, setTopic] = useState('Inteligencia Artificial y Futuro');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medio');
  const [wordCount, setWordCount] = useState<number>(14);
  const [selectedPackId, setSelectedPackId] = useState(THEMATIC_PACKS[0].id);

  // Manual mode state
  const [customTitle, setCustomTitle] = useState('Mi Crucigrama Personalizado');
  const [customTheme, setCustomTheme] = useState('General');
  const [manualPairs, setManualPairs] = useState<WordCluePair[]>([
    { answer: 'SOL', clue: 'Estrella luminosa centro de nuestro sistema planetario.' },
    { answer: 'LUNA', clue: 'Satélite natural de la Tierra que ilumina la noche.' },
    { answer: 'MAR', clue: 'Masa de agua salada que cubre la mayor parte de la Tierra.' },
    { answer: 'ARBOL', clue: 'Planta perenne de tronco leñoso que produce oxígeno.' },
    { answer: 'CIELO', clue: 'Espacio visible sobre la tierra donde se ven las nubes.' },
    { answer: 'TIERRA', clue: 'Planeta que habitamos en el sistema solar.' },
  ]);

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Target preview puzzle (defaults to activePuzzle or first puzzle if available)
  const [currentPreviewPuzzle, setCurrentPreviewPuzzle] = useState<CrosswordPuzzle | null>(
    activePuzzle || (puzzles.length > 0 ? puzzles[0] : null)
  );

  // Library quick picker state
  const [libraryFilter, setLibraryFilter] = useState('');
  const [copiedQuickId, setCopiedQuickId] = useState<string | null>(null);

  // Add pair for manual mode
  const handleAddManualPair = () => {
    setManualPairs(prev => [...prev, { answer: '', clue: '' }]);
  };

  // Remove pair
  const handleRemoveManualPair = (idx: number) => {
    setManualPairs(prev => prev.filter((_, i) => i !== idx));
  };

  // Update manual pair
  const handleUpdateManualPair = (idx: number, field: 'answer' | 'clue', val: string) => {
    setManualPairs(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Core generation function
  const handleGenerate = async (targetMode?: GeneratorMode) => {
    const activeMode = targetMode || mode;
    setErrorMsg(null);
    setLoading(true);

    try {
      let generated: CrosswordPuzzle;

      if (activeMode === 'ai') {
        if (!topic.trim()) {
          throw new Error('Por favor escribe un tema o temática para el crucigrama.');
        }
        generated = await generateCrosswordFromTopicWithAI(topic.trim(), difficulty, wordCount);
      } else if (activeMode === 'packs') {
        const pack = THEMATIC_PACKS.find(p => p.id === selectedPackId) || THEMATIC_PACKS[0];
        // Select slice matching desired word count if applicable
        const pairsToUse = pack.pairs.slice(0, Math.min(pack.pairs.length, wordCount + 4));
        generated = generateCrosswordLayout(
          pairsToUse,
          pack.title,
          pack.theme,
          pack.difficulty
        );
      } else if (activeMode === 'random') {
        // Pick a random pack or mix of themes
        const randomPack = THEMATIC_PACKS[Math.floor(Math.random() * THEMATIC_PACKS.length)];
        const shuffledPairs = [...randomPack.pairs].sort(() => 0.5 - Math.random());
        const targetPairs = shuffledPairs.slice(0, Math.min(shuffledPairs.length, wordCount + 2));
        generated = generateCrosswordLayout(
          targetPairs,
          `Crucigrama: ${randomPack.title}`,
          randomPack.theme,
          randomPack.difficulty
        );
      } else {
        // Manual mode
        const cleanedPairs = manualPairs
          .map(p => ({
            answer: normalizeSpanishWord(p.answer),
            clue: p.clue.trim(),
          }))
          .filter(p => p.answer.length >= 3 && p.clue.length > 0);

        if (cleanedPairs.length < 3) {
          throw new Error('Debes incluir al menos 3 pares válidos de palabra (mínimo 3 letras) y definición.');
        }

        generated = generateCrosswordLayout(
          cleanedPairs,
          customTitle.trim() || 'Crucigrama Personalizado',
          customTheme.trim() || 'Personalizado',
          difficulty
        );
        generated.isCustom = true;
      }

      // Automatically persist new puzzle to IndexedDB/Storage
      await StorageService.savePuzzle(generated);
      onPuzzleCreated(generated);
      setCurrentPreviewPuzzle(generated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al generar el crucigrama.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Immediate start action
  const handleStartActive = async () => {
    if (!currentPreviewPuzzle) return;
    try {
      await StorageService.savePuzzle(currentPreviewPuzzle);
      onStartPuzzle(currentPreviewPuzzle);
    } catch (err) {
      console.error('Error starting puzzle:', err);
      onStartPuzzle(currentPreviewPuzzle);
    }
  };

  // Immediate embed action
  const handleEmbedActive = async () => {
    if (!currentPreviewPuzzle) return;
    try {
      await StorageService.savePuzzle(currentPreviewPuzzle);
      onOpenEmbedModal(currentPreviewPuzzle.id);
    } catch (err) {
      console.error('Error embedding puzzle:', err);
      onOpenEmbedModal(currentPreviewPuzzle.id);
    }
  };

  // Quick copy snippet
  const handleQuickCopySnippet = (puzzle: CrosswordPuzzle) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const embedUrl = `${origin}/?embed=true&puzzle=${puzzle.id}`;
    const snippet = `<iframe src="${embedUrl}" width="100%" height="720" frameborder="0" style="border:0;max-width:100%;border-radius:12px;overflow:hidden;" allow="clipboard-write" allowfullscreen title="Crucigrama: ${puzzle.title}"></iframe>`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(snippet);
      setCopiedQuickId(puzzle.id);
      setTimeout(() => setCopiedQuickId(null), 2000);
    }
  };

  // Filtered catalog
  const filteredLibrary = puzzles.filter(p => {
    const q = libraryFilter.toLowerCase().trim();
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || p.theme.toLowerCase().includes(q);
  });

  const handleSaveNewPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasscodeInput || newPasscodeInput.trim().length < 3) {
      alert('La clave debe tener al menos 3 caracteres.');
      return;
    }
    const success = AdminAuthService.setPasscode(newPasscodeInput);
    if (success) {
      setPasscodeSuccess('¡Clave de creador actualizada correctamente!');
      setTimeout(() => setPasscodeSuccess(null), 3000);
      setNewPasscodeInput('');
    }
  };

  const handleCopySecretAdminLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const secretUrl = AdminAuthService.getSecretAdminUrl(origin);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(secretUrl);
      setCopiedAdminLink(true);
      setTimeout(() => setCopiedAdminLink(false), 2500);
    }
  };

  const handleLockSession = () => {
    AdminAuthService.lock();
    if (onLockGenerator) {
      onLockGenerator();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generador de Crucigramas en Español</span>
            </div>

            {/* Creator Security Status badge & button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowKeyManager(true)}
                className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-xs"
                title="Configurar clave de creador o copiar enlace secreto"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Control de Acceso Creador</span>
              </button>

              <button
                type="button"
                onClick={handleLockSession}
                className="px-3 py-1 rounded-xl bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                title="Bloquear el generador para visitantes"
              >
                <Lock className="w-3.5 h-3.5 text-stone-400" />
                <span>Bloquear</span>
              </button>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-white mb-2">
            Diseña, Inicia o Incrusta tu Crucigrama
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed mb-5">
            Genera crucigramas únicos con Inteligencia Artificial, elige entre paquetes temáticos 
            o diseña cuadrículas personalizadas. Puedes <strong className="text-amber-300 font-semibold">iniciar la partida de inmediato</strong> o <strong className="text-amber-300 font-semibold">obtener el código para incrustarlo</strong> en cualquier sitio web, blog o CMS de forma independiente.
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-300 font-medium">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>+1000 Palabras RAE</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <Grid3X3 className="w-3.5 h-3.5 text-amber-400" />
              <span>12 a 20 Palabras Conectadas</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>100% Incrustable con iframe</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Acceso Protegido por Clave</span>
            </div>
          </div>
        </div>
      </div>

      {/* Creator Access Key Management Modal */}
      {showKeyManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 my-auto animate-in fade-in zoom-in-95 duration-150 space-y-4 text-stone-900">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">
                    Gestión de Acceso al Generador
                  </h3>
                  <p className="text-xs text-stone-500">
                    Solo quien tú elijas puede acceder a crear o modificar crucigramas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyManager(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Secret Direct Link Option */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Enlace Secreto para Colaboradores:</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopySecretAdminLink}
                  className="text-xs text-blue-700 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-1"
                >
                  {copiedAdminLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                  <span>{copiedAdminLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
                </button>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Envía este enlace solo a las personas que quieras autorizar. Al abrirlo, el generador se desbloqueará automáticamente sin que tengan que escribir la clave.
              </p>
            </div>

            {/* Change Passcode Form */}
            <form onSubmit={handleSaveNewPasscode} className="border border-stone-200 rounded-xl p-3.5 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cambiar Clave de Acceso del Creador:</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  Actual: {AdminAuthService.getPasscode()}
                </span>
              </div>

              <div>
                <input
                  type="text"
                  value={newPasscodeInput}
                  onChange={e => setNewPasscodeInput(e.target.value)}
                  placeholder="Introduce nueva clave (ej: minuevaclave2026)"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {passcodeSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{passcodeSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 active:scale-99 text-white font-semibold text-xs rounded-lg transition cursor-pointer shadow-2xs"
              >
                Guardar Nueva Clave
              </button>
            </form>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleLockSession}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Bloquear y Cerrar Sesión de Creador</span>
              </button>

              <button
                type="button"
                onClick={() => setShowKeyManager(false)}
                className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workbench: Generator Controls on Left/Top, Active Preview on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 Cols): Creation Controls */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Sliders className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-stone-900 text-base sm:text-lg">
                  Configuración del Generador
                </h2>
                <p className="text-xs text-stone-500">
                  Elige el método de creación que prefieras para tu crucigrama.
                </p>
              </div>
            </div>

            {/* Quick 1-click random button */}
            <button
              type="button"
              onClick={() => {
                setMode('random');
                handleGenerate('random');
              }}
              disabled={loading}
              title="Generar crucigrama sorpresa al azar en 1 clic"
              className="text-xs font-semibold px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Sorpresa Rápida</span>
            </button>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-stone-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('ai')}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'ai'
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Por Tema con IA</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('packs')}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'packs'
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Paquetes</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('random')}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'random'
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Dices className="w-3.5 h-3.5 text-emerald-600" />
              <span>Variado al Azar</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'manual'
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-purple-600" />
              <span>Manual</span>
            </button>
          </div>

          {/* Mode Configuration Body */}
          <div className="space-y-4 pt-1">
            {/* MODE: AI */}
            {mode === 'ai' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    ¿Sobre qué temática quieres tu crucigrama?
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="Ej: Mitología Griega, Rock Clásico, Sistema Solar, Biología..."
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Thematic Suggestions Chips */}
                <div>
                  <span className="text-[11px] font-medium text-stone-500 mb-1.5 block">
                    Ideas populares en español:
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {[
                      'Mitología Griega',
                      'Cultura Maya y Azteca',
                      'Grandes Científicos',
                      'Arte y Pintores',
                      'Gastronomía Mexicana',
                      'Cine de los 90',
                      'Historia de Roma',
                      'Planeta y Océanos',
                      'Literatura Universal',
                      'Inteligencia Artificial',
                    ].map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setTopic(sug)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg transition cursor-pointer border ${
                          topic === sug
                            ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                            : 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODE: THEMATIC PACKS */}
            {mode === 'packs' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-stone-700">
                  Selecciona una temática curada del catálogo (+1000 palabras clasificadas):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {THEMATIC_PACKS.map(pack => (
                    <div
                      key={pack.id}
                      onClick={() => setSelectedPackId(pack.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedPackId === pack.id
                          ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-400'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-stone-900 line-clamp-1">{pack.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-700 shrink-0 font-medium ml-1">
                          {pack.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 line-clamp-1">{pack.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono mt-1.5 pt-1 border-t border-stone-100">
                        <span>Tema: {pack.theme}</span>
                        <span>{pack.pairs.length} palabras</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODE: RANDOM SURPRISE */}
            {mode === 'random' && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-900">
                <div className="flex items-center gap-2 font-semibold text-emerald-800">
                  <Dices className="w-4 h-4 text-emerald-600" />
                  <span>Modo Variado Automático</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  El sistema seleccionará de forma inteligente entre más de 1000 palabras de ciencia, historia, geografía, cine, arte, literatura y naturaleza, ensamblando una cuadrícula única, divertida y perfectamente balanceada de 12 a 20 palabras.
                </p>
              </div>
            )}

            {/* MODE: MANUAL BUILDER */}
            {mode === 'manual' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Título del crucigrama
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Temática
                    </label>
                    <input
                      type="text"
                      value={customTheme}
                      onChange={e => setCustomTheme(e.target.value)}
                      className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="border border-stone-200 rounded-xl p-3 bg-stone-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-stone-700">
                      Palabras y Definiciones ({manualPairs.length}):
                    </span>
                    <button
                      type="button"
                      onClick={handleAddManualPair}
                      className="text-xs text-amber-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir palabra</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {manualPairs.map((pair, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="PALABRA"
                          maxLength={14}
                          value={pair.answer}
                          onChange={e => handleUpdateManualPair(idx, 'answer', e.target.value.toUpperCase())}
                          className="w-28 px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold uppercase text-stone-900"
                        />
                        <input
                          type="text"
                          placeholder="Definición o pista..."
                          value={pair.clue}
                          onChange={e => handleUpdateManualPair(idx, 'clue', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveManualPair(idx)}
                          disabled={manualPairs.length <= 3}
                          className="p-1.5 text-stone-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Common options: Difficulty & Target word count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nivel de Dificultad
                </label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
                >
                  <option value="Fácil">Fácil (Palabras comunes y directas)</option>
                  <option value="Medio">Medio (Equilibrado para todo público)</option>
                  <option value="Difícil">Difícil (Definiciones ingeniosas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Palabras objetivo (12 a 20)
                </label>
                <select
                  value={wordCount}
                  onChange={e => setWordCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
                >
                  <option value={12}>12 palabras (Rápido y dinámico)</option>
                  <option value={14}>14 palabras (Recomendado estándar)</option>
                  <option value={16}>16 palabras (Desafío medio)</option>
                  <option value={18}>18 palabras (Extenso)</option>
                  <option value={20}>20 palabras (Cuadrícula completa)</option>
                </select>
              </div>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Main Generate Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleGenerate()}
                className="w-full py-3 px-5 bg-stone-900 hover:bg-stone-800 active:scale-99 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Calculando intersecciones y diseñando cuadrícula...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Generar Nuevo Crucigrama</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): Active Preview & Immediate Actions ("Iniciar" e "Incrustar") */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-stone-900 text-base sm:text-lg">
                  Crucigrama Seleccionado
                </h2>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Listo
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Inicia la partida ahora o incrusta el código en tu web.
              </p>
            </div>
          </div>

          {currentPreviewPuzzle ? (
            <div className="space-y-4">
              {/* Card info */}
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif font-bold text-stone-900 text-base">
                      {currentPreviewPuzzle.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-stone-600 mt-0.5">
                      <span className="font-medium text-amber-900">{currentPreviewPuzzle.theme}</span>
                      <span>·</span>
                      <span>Nivel {currentPreviewPuzzle.difficulty}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-amber-200/60 text-xs">
                  <div className="bg-white/80 rounded-lg p-1.5 border border-amber-200/40">
                    <div className="text-[10px] text-stone-500">Palabras</div>
                    <div className="font-bold text-stone-900">{currentPreviewPuzzle.clues.length}</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-1.5 border border-amber-200/40">
                    <div className="text-[10px] text-stone-500">Cuadrícula</div>
                    <div className="font-bold text-stone-900">{currentPreviewPuzzle.rows}×{currentPreviewPuzzle.cols}</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-1.5 border border-amber-200/40">
                    <div className="text-[10px] text-stone-500">Tipo</div>
                    <div className="font-bold text-stone-900">{currentPreviewPuzzle.isCustom ? 'Personal' : 'Temático'}</div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (The core requirement: Iniciar o Incrustar) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                  <span>¿Qué deseas hacer con este crucigrama?</span>
                </div>

                {/* Primary Button 1: INICIAR CRUCIGRAMA */}
                <button
                  type="button"
                  onClick={handleStartActive}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:scale-99 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar y Jugar Crucigrama</span>
                </button>

                {/* Primary Button 2: INCRUSTAR CRUCIGRAMA */}
                <button
                  type="button"
                  onClick={handleEmbedActive}
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 active:scale-99 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span>Incrustar en Sitio Web (Widget Iframe)</span>
                </button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenPdfModal(currentPreviewPuzzle)}
                    className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border border-stone-200"
                  >
                    <FileDown className="w-3.5 h-3.5 text-stone-500" />
                    <span>Exportar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickCopySnippet(currentPreviewPuzzle)}
                    className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border border-stone-200"
                  >
                    {copiedQuickId === currentPreviewPuzzle.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Code2 className="w-3.5 h-3.5 text-stone-500" />
                        <span>Copiar Snippet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Grid Preview Display */}
              <div className="border border-stone-200 rounded-xl p-3 bg-stone-900 text-stone-200">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-stone-300 font-mono text-[11px]">Vista esquemática de cuadrícula:</span>
                  <span className="text-stone-400 text-[10px]">{currentPreviewPuzzle.rows} filas × {currentPreviewPuzzle.cols} columnas</span>
                </div>

                <div className="flex justify-center p-2 bg-stone-950 rounded-lg overflow-x-auto max-h-52">
                  <div
                    className="grid gap-[1px]"
                    style={{
                      gridTemplateColumns: `repeat(${currentPreviewPuzzle.cols}, 14px)`,
                      gridTemplateRows: `repeat(${currentPreviewPuzzle.rows}, 14px)`,
                    }}
                  >
                    {currentPreviewPuzzle.grid.map((r, rowIdx) =>
                      r.map((c, colIdx) => (
                        <div
                          key={`${rowIdx}-${colIdx}`}
                          className={`w-3.5 h-3.5 flex items-center justify-center text-[7px] font-mono font-bold leading-none select-none ${
                            c.isBlocked ? 'bg-stone-900' : 'bg-stone-100 text-stone-900'
                          }`}
                        >
                          {!c.isBlocked && c.solution}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sample clues snippet */}
                <div className="mt-2.5 pt-2 border-t border-stone-800 text-[11px] text-stone-400">
                  <span className="font-semibold text-stone-300">Pistas de muestra:</span>
                  <ul className="mt-1 space-y-1 max-h-24 overflow-y-auto pr-1">
                    {currentPreviewPuzzle.clues.slice(0, 5).map(clue => (
                      <li key={clue.id} className="truncate">
                        <strong className="text-amber-400">{clue.number}. {clue.direction === 'across' ? 'Horiz.' : 'Vert.'}:</strong> {clue.clue}
                      </li>
                    ))}
                    {currentPreviewPuzzle.clues.length > 5 && (
                      <li className="text-stone-500 italic text-[10px]">
                        + {currentPreviewPuzzle.clues.length - 5} pistas más en el crucigrama completo
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-stone-400 text-xs">
              <Grid3X3 className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p>Genera un crucigrama o selecciona uno para ver la vista previa y acciones.</p>
            </div>
          )}
        </div>
      </div>

      {/* QUICK PICKER FROM LIBRARY: "O elige e inicia/incrusta uno de la biblioteca directamente" */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h2 className="font-serif font-bold text-stone-900 text-base sm:text-lg flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-stone-700" />
              <span>O Elige e Inicia / Incrusta un Crucigrama de la Biblioteca</span>
            </h2>
            <p className="text-xs text-stone-500">
              Crucigramas listos para jugar o incrustar directamente sin necesidad de generar uno nuevo.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={libraryFilter}
              onChange={e => setLibraryFilter(e.target.value)}
              placeholder="Filtrar por título o temática..."
              className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>

        {/* Grid cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
          {filteredLibrary.map(puzzle => {
            const isSelected = currentPreviewPuzzle?.id === puzzle.id;
            return (
              <div
                key={puzzle.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/50 shadow-xs ring-1 ring-amber-400'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/30'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h3 className="font-serif font-bold text-stone-900 text-xs sm:text-sm line-clamp-1">
                      {puzzle.title}
                    </h3>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 shrink-0">
                      {puzzle.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-stone-500 mb-2">
                    <span className="text-amber-800 font-medium">{puzzle.theme}</span>
                    <span>·</span>
                    <span>{puzzle.clues.length} palabras</span>
                    <span>·</span>
                    <span className="font-mono">{puzzle.rows}×{puzzle.cols}</span>
                  </div>
                </div>

                {/* Direct Action buttons for this specific crossword */}
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100 mt-1">
                  {/* Select for preview */}
                  <button
                    type="button"
                    onClick={() => setCurrentPreviewPuzzle(puzzle)}
                    className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-medium transition cursor-pointer"
                  >
                    Ver en Generador
                  </button>

                  {/* Direct Start */}
                  <button
                    type="button"
                    onClick={() => onStartPuzzle(puzzle)}
                    title="Iniciar este crucigrama directamente"
                    className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Iniciar</span>
                  </button>

                  {/* Direct Embed */}
                  <button
                    type="button"
                    onClick={() => onOpenEmbedModal(puzzle.id)}
                    title="Obtener código para incrustar este crucigrama"
                    className="py-1.5 px-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Code2 className="w-3 h-3" />
                    <span>Incrustar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
