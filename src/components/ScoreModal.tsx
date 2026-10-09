import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Clock, HelpCircle, CheckCircle, Share2, Save, ArrowRight } from 'lucide-react';
import { CrosswordPuzzle, ScoreRecord } from '../types/crossword';
import { StorageService } from '../services/storageService';

interface ScoreModalProps {
  puzzle: CrosswordPuzzle;
  timeSeconds: number;
  hintsUsed: number;
  totalClues: number;
  solvedClues: number;
  onClose: () => void;
  onGoToHistory: () => void;
  onPlayNext: () => void;
}

export const ScoreModal: React.FC<ScoreModalProps> = ({
  puzzle,
  timeSeconds,
  hintsUsed,
  totalClues,
  solvedClues,
  onClose,
  onGoToHistory,
  onPlayNext,
}) => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('crucigrama_player_name') || '';
  });
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trigger celebration confetti
  React.useEffect(() => {
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'],
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  }, []);

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Calculate score formula:
  // Base: 1000 points.
  // Hints penalty: -50 per hint.
  // Time penalty: -1 per 3 seconds after 1 minute.
  const timePenalty = Math.max(0, Math.floor((timeSeconds - 60) / 3));
  const hintPenalty = hintsUsed * 50;
  const rawScore = 1000 - hintPenalty - timePenalty;
  const finalScore = Math.max(100, rawScore);

  const accuracy = totalClues > 0 ? Math.round((solvedClues / totalClues) * 100) : 100;

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = playerName.trim() || 'Jugador Anónimo';
    localStorage.setItem('crucigrama_player_name', name);

    const record: ScoreRecord = {
      id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      puzzleId: puzzle.id,
      puzzleTitle: puzzle.title,
      playerName: name,
      score: finalScore,
      timeSeconds,
      hintsUsed,
      totalClues,
      solvedClues,
      accuracy,
      completedAt: new Date().toISOString(),
      difficulty: puzzle.difficulty,
    };

    await StorageService.saveScore(record);
    await StorageService.clearProgress(puzzle.id);
    setIsSaved(true);
  };

  const handleShare = () => {
    const text = `🎉 ¡Completé el crucigrama "${puzzle.title}" en ${formatTime(timeSeconds)} con ${finalScore} puntos y ${accuracy}% de precisión en Crucigrama Pro! 🧩`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
          <Trophy className="w-9 h-9" />
        </div>

        <h2 className="text-2xl font-serif font-bold text-stone-900 mb-1">
          ¡Crucigrama Completado!
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          {puzzle.title} · Nivel {puzzle.difficulty}
        </p>

        {/* Score grid summary */}
        <div className="grid grid-cols-3 gap-2 bg-stone-50 border border-stone-200 rounded-xl p-3 mb-5">
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-stone-400 font-medium uppercase flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" /> Puntaje
            </span>
            <span className="text-xl font-bold font-mono text-stone-900 mt-0.5">
              {finalScore}
            </span>
          </div>

          <div className="flex flex-col items-center border-x border-stone-200">
            <span className="text-[11px] text-stone-400 font-medium uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-500" /> Tiempo
            </span>
            <span className="text-xl font-bold font-mono text-stone-900 mt-0.5">
              {formatTime(timeSeconds)}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[11px] text-stone-400 font-medium uppercase flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-purple-500" /> Pistas
            </span>
            <span className="text-xl font-bold font-mono text-stone-900 mt-0.5">
              {hintsUsed}
            </span>
          </div>
        </div>

        {/* Save score form */}
        {!isSaved ? (
          <form onSubmit={handleSaveScore} className="mb-5 text-left">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Guardar en el historial de récords:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                maxLength={24}
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Tu nombre o apodo..."
                className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-center gap-1.5 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            ¡Puntaje registrado exitosamente en la base de datos!
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 py-2 px-3 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              {copied ? '¡Copiado!' : 'Compartir'}
            </button>

            <button
              type="button"
              onClick={onGoToHistory}
              className="flex-1 py-2 px-3 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Ver Récords
            </button>
          </div>

          <button
            type="button"
            onClick={onPlayNext}
            className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <span>Jugar otro crucigrama</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
