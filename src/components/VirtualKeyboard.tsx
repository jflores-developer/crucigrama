import React, { useCallback } from 'react';
import { Delete, ArrowRightLeft, CornerDownLeft, X } from 'lucide-react';
import { Direction } from '../types/crossword';

interface VirtualKeyboardProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onToggleDirection: () => void;
  onNextClue?: () => void;
  onClose?: () => void;
  direction: Direction;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onKeyPress,
  onBackspace,
  onToggleDirection,
  onNextClue,
  onClose,
  direction,
}) => {
  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  // Prevent default to avoid virtual focus loss or scrolling hiccups
  const handleKeyTrigger = useCallback(
    (e: React.MouseEvent | React.TouchEvent, action: () => void) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    },
    []
  );

  return (
    <div className="bg-stone-100/98 backdrop-blur-md border-t border-stone-300 shadow-2xl p-1.5 sm:p-2.5 pb-safe select-none max-w-xl mx-auto w-full transition-all touch-action-manipulation">
      {/* Top mini helper bar on mobile */}
      <div className="flex items-center justify-between px-1 mb-1 text-[11px] text-stone-500">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
          <span className="text-stone-700">Teclado táctil</span>
          <span className="text-stone-400">·</span>
          <span className="font-semibold text-amber-900">
            {direction === 'across' ? 'Modo Horizontal →' : 'Modo Vertical ↓'}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onPointerDown={(e) => handleKeyTrigger(e, onClose)}
            className="p-1 text-stone-400 hover:text-stone-700 active:bg-stone-200 rounded-md transition-colors"
            title="Ocultar teclado"
            aria-label="Ocultar teclado"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Row 1 */}
      <div className="flex justify-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
        {row1.map(key => (
          <button
            key={key}
            type="button"
            onPointerDown={(e) => handleKeyTrigger(e, () => onKeyPress(key))}
            className="virtual-key flex-1 min-w-[28px] max-w-[46px] h-11 sm:h-12 bg-white hover:bg-stone-100 active:bg-amber-200 active:scale-95 font-bold text-stone-900 rounded-lg border border-stone-300 shadow-xs flex items-center justify-center text-base sm:text-lg transition-transform cursor-pointer"
          >
            {key}
          </button>
        ))}
      </div>

      {/* Row 2 */}
      <div className="flex justify-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
        {row2.map(key => (
          <button
            key={key}
            type="button"
            onPointerDown={(e) => handleKeyTrigger(e, () => onKeyPress(key))}
            className="virtual-key flex-1 min-w-[28px] max-w-[46px] h-11 sm:h-12 bg-white hover:bg-stone-100 active:bg-amber-200 active:scale-95 font-bold text-stone-900 rounded-lg border border-stone-300 shadow-xs flex items-center justify-center text-base sm:text-lg transition-transform cursor-pointer"
          >
            {key}
          </button>
        ))}
      </div>

      {/* Row 3 with Direction Switch & Backspace */}
      <div className="flex justify-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onPointerDown={(e) => handleKeyTrigger(e, onToggleDirection)}
          title="Cambiar dirección (Horizontal / Vertical)"
          className="virtual-key flex-[1.4] min-w-[44px] max-w-[70px] h-11 sm:h-12 bg-stone-200 hover:bg-stone-300 active:bg-amber-300 active:scale-95 text-stone-800 font-bold rounded-lg border border-stone-300 shadow-xs flex items-center justify-center gap-1 text-[11px] sm:text-xs cursor-pointer px-1 transition-transform"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-stone-700" />
          <span>{direction === 'across' ? 'Horiz' : 'Vert'}</span>
        </button>

        {row3.map(key => (
          <button
            key={key}
            type="button"
            onPointerDown={(e) => handleKeyTrigger(e, () => onKeyPress(key))}
            className="virtual-key flex-1 min-w-[28px] max-w-[46px] h-11 sm:h-12 bg-white hover:bg-stone-100 active:bg-amber-200 active:scale-95 font-bold text-stone-900 rounded-lg border border-stone-300 shadow-xs flex items-center justify-center text-base sm:text-lg transition-transform cursor-pointer"
          >
            {key}
          </button>
        ))}

        <button
          type="button"
          onPointerDown={(e) => handleKeyTrigger(e, onBackspace)}
          title="Borrar letra"
          className="virtual-key flex-[1.2] min-w-[40px] max-w-[62px] h-11 sm:h-12 bg-stone-200 hover:bg-stone-300 active:bg-rose-200 active:scale-95 text-stone-800 rounded-lg border border-stone-300 shadow-xs flex items-center justify-center cursor-pointer transition-transform"
        >
          <Delete className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700" />
        </button>

        {onNextClue && (
          <button
            type="button"
            onPointerDown={(e) => handleKeyTrigger(e, onNextClue)}
            title="Siguiente pista"
            className="virtual-key flex-[1.1] min-w-[36px] max-w-[56px] h-11 sm:h-12 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 active:scale-95 text-white font-bold rounded-lg border border-amber-600 shadow-xs flex items-center justify-center cursor-pointer transition-transform"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

