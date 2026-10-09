import React from 'react';
import { Delete, ArrowRightLeft } from 'lucide-react';
import { Direction } from '../types/crossword';

interface VirtualKeyboardProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onToggleDirection: () => void;
  direction: Direction;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onKeyPress,
  onBackspace,
  onToggleDirection,
  direction,
}) => {
  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  return (
    <div className="bg-stone-100/90 backdrop-blur-sm border-t border-stone-200 p-2 sm:p-3 select-none flex flex-col gap-1.5 max-w-lg mx-auto w-full transition-all">
      <div className="flex justify-center gap-1 sm:gap-1.5">
        {row1.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key)}
            className="flex-1 max-w-9 h-10 sm:h-11 bg-white hover:bg-stone-200 active:bg-amber-100 active:scale-95 font-semibold text-stone-800 rounded-md border border-stone-300 shadow-xs flex items-center justify-center text-sm sm:text-base transition-all cursor-pointer"
          >
            {key}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-1 sm:gap-1.5">
        {row2.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key)}
            className="flex-1 max-w-9 h-10 sm:h-11 bg-white hover:bg-stone-200 active:bg-amber-100 active:scale-95 font-semibold text-stone-800 rounded-md border border-stone-300 shadow-xs flex items-center justify-center text-sm sm:text-base transition-all cursor-pointer"
          >
            {key}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={onToggleDirection}
          title="Cambiar dirección (Horizontal / Vertical)"
          className="flex-1 max-w-16 h-10 sm:h-11 bg-stone-200 hover:bg-stone-300 active:bg-stone-400 text-stone-700 font-medium rounded-md border border-stone-300 shadow-xs flex items-center justify-center gap-1 text-xs cursor-pointer px-1"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>{direction === 'across' ? 'Horiz' : 'Vert'}</span>
        </button>

        {row3.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key)}
            className="flex-1 max-w-9 h-10 sm:h-11 bg-white hover:bg-stone-200 active:bg-amber-100 active:scale-95 font-semibold text-stone-800 rounded-md border border-stone-300 shadow-xs flex items-center justify-center text-sm sm:text-base transition-all cursor-pointer"
          >
            {key}
          </button>
        ))}

        <button
          type="button"
          onClick={onBackspace}
          title="Borrar letra"
          className="flex-1 max-w-14 h-10 sm:h-11 bg-stone-200 hover:bg-stone-300 active:bg-stone-400 text-stone-700 rounded-md border border-stone-300 shadow-xs flex items-center justify-center cursor-pointer"
        >
          <Delete className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
