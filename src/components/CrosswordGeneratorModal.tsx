import React, { useState } from 'react';
import { CrosswordPuzzle, DifficultyLevel, WordCluePair } from '../types/crossword';
import {
  generateCrosswordLayout,
  generateCrosswordFromTopicWithAI,
  THEMATIC_PACKS,
  normalizeSpanishWord,
} from '../services/crosswordGenerator';
import { StorageService } from '../services/storageService';
import {
  X,
  Sparkles,
  Layers,
  Edit3,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Grid,
} from 'lucide-react';

interface CrosswordGeneratorModalProps {
  onClose: () => void;
  onPuzzleCreated: (puzzle: CrosswordPuzzle) => void;
}

type GeneratorMode = 'ai' | 'packs' | 'manual';

export const CrosswordGeneratorModal: React.FC<CrosswordGeneratorModalProps> = ({
  onClose,
  onPuzzleCreated,
}) => {
  const [mode, setMode] = useState<GeneratorMode>('ai');
  const [topic, setTopic] = useState('Inteligencia Artificial y Futuro');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medio');
  const [wordCount, setWordCount] = useState(10);
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
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewPuzzle, setPreviewPuzzle] = useState<CrosswordPuzzle | null>(null);

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

  // Generate action
  const handleGenerate = async () => {
    setErrorMsg(null);
    setLoading(true);
    setPreviewPuzzle(null);

    try {
      let puzzle: CrosswordPuzzle;

      if (mode === 'ai') {
        if (!topic.trim()) {
          throw new Error('Por favor escribe un tema o temática para el crucigrama.');
        }
        puzzle = await generateCrosswordFromTopicWithAI(topic.trim(), difficulty, wordCount);
      } else if (mode === 'packs') {
        const pack = THEMATIC_PACKS.find(p => p.id === selectedPackId) || THEMATIC_PACKS[0];
        puzzle = generateCrosswordLayout(
          pack.pairs,
          pack.title,
          pack.theme,
          difficulty
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
          throw new Error('Debes incluir al menos 3 pares válidos de palabra (min. 3 letras) y definición.');
        }

        puzzle = generateCrosswordLayout(
          cleanedPairs,
          customTitle.trim() || 'Crucigrama Personalizado',
          customTheme.trim() || 'Personalizado',
          difficulty
        );
        puzzle.isCustom = true;
      }

      setPreviewPuzzle(puzzle);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al generar el crucigrama.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Save to DB and play
  const handleSaveAndPlay = async () => {
    if (!previewPuzzle) return;
    try {
      await StorageService.savePuzzle(previewPuzzle);
      onPuzzleCreated(previewPuzzle);
    } catch (err) {
      console.error('Error saving puzzle:', err);
      setErrorMsg('No se pudo guardar en la base de datos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-3xl w-full p-5 sm:p-6 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-stone-900 text-base sm:text-lg">
                Generador de Crucigramas
              </h3>
              <p className="text-xs text-stone-500">
                Diseña crucigramas a medida con Inteligencia Artificial o de forma manual.
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

        {/* Mode selector segmented tabs */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl my-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('ai'); setPreviewPuzzle(null); }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'ai' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Por Temática con IA</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('packs'); setPreviewPuzzle(null); }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'packs' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Paquetes Temáticos</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('manual'); setPreviewPuzzle(null); }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'manual' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-purple-600" />
            <span>Constructor Manual</span>
          </button>
        </div>

        {/* Configuration body per mode */}
        <div className="space-y-4">
          {mode === 'ai' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ¿Sobre qué tema quieres el crucigrama?
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Ej: Mitología Griega, Rock en Español, Sistema Solar, Biología Celular..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Quick ideas chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                <span className="text-[11px] font-medium">Sugerencias variadas:</span>
                {[
                  'Mitología Griega',
                  'Grandes Científicos',
                  'Cultura Maya y Azteca',
                  'Arte y Pintores',
                  'Tecnología e IA',
                  'Anatomía Humana',
                  'Cine de los 90',
                  'Música y Rock',
                  'Gastronomía Mexicana',
                  'Climas del Mundo',
                  'Historia de Roma',
                ].map(sug => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setTopic(sug)}
                    className="text-[11px] bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-0.5 rounded-md transition cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Dificultad
                  </label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="Fácil">Fácil (Palabras cortas y directas)</option>
                    <option value="Medio">Medio (Equilibrado)</option>
                    <option value="Difícil">Difícil (Definiciones ingeniosas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Cantidad de palabras objetivo
                  </label>
                  <select
                    value={wordCount}
                    onChange={e => setWordCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value={8}>8 palabras (Rápido)</option>
                    <option value={10}>10 palabras (Estándar)</option>
                    <option value={12}>12 palabras (Medio)</option>
                    <option value={15}>15 palabras (Extenso)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {mode === 'packs' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-stone-700">
                Selecciona una temática curada:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {THEMATIC_PACKS.map(pack => (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPackId(pack.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedPackId === pack.id
                        ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-400'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-stone-900">{pack.title}</span>
                      <span className="text-[10px] text-stone-500">{pack.difficulty}</span>
                    </div>
                    <p className="text-[11px] text-stone-500 line-clamp-1">{pack.description}</p>
                    <span className="text-[10px] text-stone-400 font-mono mt-1 block">
                      {pack.pairs.length} palabras preparadas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
                        placeholder="Pista o definición..."
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

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action to compute layout */}
          <div className="pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Calculando cuadrícula e intersecciones...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Generar Cuadrícula de Crucigrama</span>
                </>
              )}
            </button>
          </div>

          {/* Live Preview Area if generated */}
          {previewPuzzle && (
            <div className="mt-4 p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-stone-900 text-sm">
                    {previewPuzzle.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                    <span>{previewPuzzle.rows}×{previewPuzzle.cols} celdas</span>
                    <span>·</span>
                    <span>{previewPuzzle.clues.length} pistas conectadas</span>
                    <span>·</span>
                    <span>Dificultad {previewPuzzle.difficulty}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-100 px-2.5 py-1 rounded-md">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Crucigrama válido</span>
                </div>
              </div>

              {/* Mini visual preview of grid */}
              <div className="flex justify-center p-2 bg-stone-800 rounded-lg overflow-x-auto max-h-44">
                <div
                  className="grid gap-[1px]"
                  style={{
                    gridTemplateColumns: `repeat(${previewPuzzle.cols}, 14px)`,
                    gridTemplateRows: `repeat(${previewPuzzle.rows}, 14px)`,
                  }}
                >
                  {previewPuzzle.grid.map((r, rowIdx) =>
                    r.map((c, colIdx) => (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        className={`w-3.5 h-3.5 flex items-center justify-center text-[7px] font-mono font-bold leading-none ${
                          c.isBlocked ? 'bg-stone-900' : 'bg-white text-stone-900'
                        }`}
                      >
                        {!c.isBlocked && c.solution}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Confirm and start playing */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveAndPlay}
                  className="py-2 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Guardar en Base de Datos y Empezar a Jugar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
