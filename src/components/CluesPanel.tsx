import React, { useState } from 'react';
import { CrosswordClue } from '../types/crossword';
import { Search, CheckCircle2, AlignLeft, AlignJustify } from 'lucide-react';

interface CluesPanelProps {
  clues: CrosswordClue[];
  activeClue: CrosswordClue | null;
  completedClueIds: Set<string>;
  onSelectClue: (clue: CrosswordClue) => void;
  compact?: boolean;
}

export const CluesPanel: React.FC<CluesPanelProps> = ({
  clues,
  activeClue,
  completedClueIds,
  onSelectClue,
  compact = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'across' | 'down'>('all');

  const acrossClues = clues.filter(c => c.direction === 'across');
  const downClues = clues.filter(c => c.direction === 'down');

  const filterClues = (list: CrosswordClue[]) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      c =>
        c.number.toString().includes(term) ||
        c.clue.toLowerCase().includes(term) ||
        c.answer.toLowerCase().includes(term)
    );
  };

  const renderClueList = (list: CrosswordClue[], title: string, icon: React.ReactNode) => {
    const filtered = filterClues(list);

    return (
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 pb-1.5 mb-2 border-b border-stone-200">
          <span className="text-stone-500">{icon}</span>
          <h3 className="font-serif font-bold text-stone-800 text-sm tracking-wide uppercase">
            {title} ({filtered.length})
          </h3>
        </div>

        <div className="space-y-1 overflow-y-auto max-h-[360px] lg:max-h-[460px] pr-1.5 scrollbar-thin">
          {filtered.length === 0 ? (
            <p className="text-xs text-stone-400 italic py-2">No hay pistas que coincidan</p>
          ) : (
            filtered.map(clue => {
              const isActive = activeClue?.id === clue.id;
              const isCompleted = completedClueIds.has(clue.id);

              return (
                <div
                  key={clue.id}
                  onClick={() => onSelectClue(clue)}
                  role="button"
                  tabIndex={0}
                  className={`group text-left px-2.5 py-1.5 rounded-lg text-xs leading-relaxed transition-all cursor-pointer flex items-start gap-2 ${
                    isActive
                      ? 'bg-amber-100 text-amber-950 font-medium shadow-xs border border-amber-300'
                      : isCompleted
                      ? 'bg-stone-100/60 text-stone-400 line-through hover:bg-stone-100'
                      : 'hover:bg-stone-100 text-stone-700'
                  }`}
                >
                  <span
                    className={`font-mono font-bold shrink-0 mt-0.5 ${
                      isActive ? 'text-amber-800' : isCompleted ? 'text-stone-400' : 'text-stone-900'
                    }`}
                  >
                    {clue.number}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="break-words">{clue.clue}</span>
                    <span className="ml-1 text-[10px] text-stone-400 font-mono no-underline inline-block">
                      ({clue.length})
                    </span>
                  </div>
                  {isCompleted && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 no-underline" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl border border-stone-200 shadow-sm p-3 sm:p-4 flex flex-col ${compact ? 'w-full' : 'w-full max-w-xl'}`}>
      {/* Search & Tabs bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between pb-3 mb-3 border-b border-stone-100">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar en definiciones..."
            className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:border-amber-400 focus:bg-white transition-colors"
          />
        </div>

        {compact && (
          <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('across')}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'across' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              Horiz.
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('down')}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'down' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              Vert.
            </button>
          </div>
        )}
      </div>

      {/* Clues body */}
      {compact ? (
        <div className="flex flex-col gap-4">
          {(activeTab === 'all' || activeTab === 'across') &&
            renderClueList(acrossClues, 'Horizontales', <AlignLeft className="w-3.5 h-3.5" />)}
          {(activeTab === 'all' || activeTab === 'down') &&
            renderClueList(downClues, 'Verticales', <AlignJustify className="w-3.5 h-3.5" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderClueList(acrossClues, 'Horizontales', <AlignLeft className="w-3.5 h-3.5" />)}
          {renderClueList(downClues, 'Verticales', <AlignJustify className="w-3.5 h-3.5" />)}
        </div>
      )}
    </div>
  );
};
