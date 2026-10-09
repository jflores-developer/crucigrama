import React, { useState, useEffect } from 'react';
import { ScoreRecord, CrosswordPuzzle } from '../types/crossword';
import { StorageService } from '../services/storageService';
import { Trophy, Clock, Search, Download, Upload, Trash2, Award, Calendar, RefreshCw } from 'lucide-react';

interface ScoreHistoryViewProps {
  puzzles: CrosswordPuzzle[];
  onPlayPuzzle: (puzzleId: string) => void;
}

export const ScoreHistoryView: React.FC<ScoreHistoryViewProps> = ({ puzzles, onPlayPuzzle }) => {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'date'>('score');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const loadScores = async () => {
    setLoading(true);
    const list = await StorageService.getScores(selectedPuzzleId === 'all' ? undefined : selectedPuzzleId);
    setScores(list);
    setLoading(false);
  };

  useEffect(() => {
    loadScores();
  }, [selectedPuzzleId]);

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // Filter & sort scores
  const filteredScores = scores
    .filter(s => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.playerName.toLowerCase().includes(term) ||
        s.puzzleTitle.toLowerCase().includes(term) ||
        s.difficulty.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'time') return a.timeSeconds - b.timeSeconds;
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });

  // Analytics
  const totalGames = scores.length;
  const highestScore = scores.reduce((max, s) => Math.max(max, s.score), 0);
  const avgTime = totalGames > 0 ? Math.round(scores.reduce((sum, s) => sum + s.timeSeconds, 0) / totalGames) : 0;
  const avgAccuracy = totalGames > 0 ? Math.round(scores.reduce((sum, s) => sum + (s.accuracy || 100), 0) / totalGames) : 0;

  // Export JSON backup
  const handleExport = async () => {
    const json = await StorageService.exportBackupJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crucigramas_respaldo_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const success = await StorageService.importBackupJSON(text);
    if (success) {
      setImportStatus('¡Datos restaurados con éxito!');
      await loadScores();
    } else {
      setImportStatus('Error al importar el archivo JSON.');
    }
    setTimeout(() => setImportStatus(null), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Historial de Puntajes y Récords
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Registro histórico persistente de todas las partidas jugadas en la base de datos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={loadScores}
            title="Refrescar lista"
            className="p-2 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded-lg text-xs flex items-center justify-center transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Exportar BD</span>
          </button>

          <label className="px-3 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-stone-500" />
            <span>Importar</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium text-center">
          {importStatus}
        </div>
      )}

      {/* Metric summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
            Partidas Registradas
          </span>
          <span className="text-2xl font-bold font-mono text-stone-900 mt-1">
            {totalGames}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" /> Récord Máximo
          </span>
          <span className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {highestScore} pts
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" /> Tiempo Promedio
          </span>
          <span className="text-2xl font-bold font-mono text-stone-900 mt-1">
            {formatTime(avgTime)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col">
          <span className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
            Precisión Media
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {avgAccuracy}%
          </span>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filtrar por jugador, crucigrama o dificultad..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-amber-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedPuzzleId}
            onChange={e => setSelectedPuzzleId(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-xs focus:outline-hidden focus:border-amber-500"
          >
            <option value="all">Todos los crucigramas</option>
            {puzzles.map(p => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setSortBy('score')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition cursor-pointer ${
                sortBy === 'score' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              Puntaje
            </button>
            <button
              type="button"
              onClick={() => setSortBy('time')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition cursor-pointer ${
                sortBy === 'time' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              Tiempo
            </button>
            <button
              type="button"
              onClick={() => setSortBy('date')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition cursor-pointer ${
                sortBy === 'date' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              Recientes
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-stone-500">Cargando base de datos...</div>
        ) : filteredScores.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-stone-700">No hay registros aún</p>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
              Juega y completa cualquier crucigrama para que tu puntaje aparezca automáticamente en la tabla de récords.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4"># Pos</th>
                  <th className="py-3 px-4">Jugador</th>
                  <th className="py-3 px-4">Crucigrama</th>
                  <th className="py-3 px-4 text-center">Dificultad</th>
                  <th className="py-3 px-4 text-right">Puntaje</th>
                  <th className="py-3 px-4 text-center">Tiempo</th>
                  <th className="py-3 px-4 text-center">Pistas</th>
                  <th className="py-3 px-4 text-right">Fecha</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredScores.map((score, index) => {
                  let rankBadge = (
                    <span className="font-mono text-stone-500 font-medium">#{index + 1}</span>
                  );
                  if (index === 0) rankBadge = <span className="text-base" title="Primer lugar">🥇</span>;
                  if (index === 1) rankBadge = <span className="text-base" title="Segundo lugar">🥈</span>;
                  if (index === 2) rankBadge = <span className="text-base" title="Tercer lugar">🥉</span>;

                  return (
                    <tr key={score.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3 px-4 text-center w-12">{rankBadge}</td>
                      <td className="py-3 px-4 font-semibold text-stone-900">
                        {score.playerName}
                      </td>
                      <td className="py-3 px-4 text-stone-700 max-w-[200px] truncate">
                        {score.puzzleTitle}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[11px] text-stone-500 font-medium">
                          {score.difficulty}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700 text-sm">
                        {score.score}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-stone-600">
                        {formatTime(score.timeSeconds)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-stone-500">
                        {score.hintsUsed}
                      </td>
                      <td className="py-3 px-4 text-right text-stone-400 font-mono text-[11px]">
                        {formatDate(score.completedAt)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onPlayPuzzle(score.puzzleId)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-medium text-[11px] transition cursor-pointer"
                        >
                          Jugar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
