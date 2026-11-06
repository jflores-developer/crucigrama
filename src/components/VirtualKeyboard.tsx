import React, { useCallback } from 'react';
import { Delete, ArrowRightLeft, CornerDownLeft, X, Pin, Anchor } from 'lucide-react';
import { Direction } from '../types/crossword';

interface VirtualKeyboardProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onToggleDirection: () => void;
  onNextClue?: () => void;
  onClose?: () => void;
  direction: Direction;
  dockMode?: 'inline' | 'fixed';
  onToggleDock?: () => void;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onKeyPress,
  onBackspace,
  onToggleDirection,
  onNextClue,
  onClose,
  direction,
  dockMode = 'inline',
  onToggleDock,
}) => {
  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  // Prevent default to avoid virtual focus loss or scrolling hiccups
  const handleKeyTrigger = useCallback(
    (e: React.MouseEvent | React.TouchEvent | React.PointerEvent, action: () => void) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    },
    []
  );

  return (
    <div
      className={`select-none w-full max-w-xl mx-auto transition-all touch-action-manipulation ${
        dockMode === 'inline'
          ? 'bg-stone-100/95 border border-stone-300 rounded-2xl shadow-sm p-1.5 sm:p-2.5 my-2'
          : 'bg-stone-100/98 backdrop-blur-md border-t border-stone-300 shadow-2xl p-1.5 sm:p-2.5 pb-safe'
      }`}
    >
      {/* Top mini helper bar on mobile */}
      <div className="flex items-center justify-between px-1 mb-1.5 text-[11px] text-stone-600">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
          <button
            type="button"
            onPointerDown={(e) => handleKeyTrigger(e, onToggleDirection)}
            className="flex items-center gap-1 text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer"
            title="Cambiar dirección (Horizontal / Vertical)"
          >
            <ArrowRightLeft className="w-3 h-3 text-amber-700" />
            <span>{direction === 'across' ? 'Horizontal →' : 'Vertical ↓'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {onToggleDock && (
            <button
              type="button"
              onPointerDown={(e) => handleKeyTrigger(e, onToggleDock)}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-stone-600 bg-stone-200/80 hover:bg-stone-300 active:bg-amber-200 rounded-md transition-colors cursor-pointer"
              title={
                dockMode === 'inline'
                  ? 'Fijar teclado al pie de la pantalla'
                  : 'Acoplar teclado directamente bajo el crucigrama'
              }
            >
              {dockMode === 'inline' ? (
                <>
                  <Anchor className="w-3 h-3 text-stone-500" />
                  <span className="hidden xs:inline">Fijar abajo</span>
                </>
              ) : (
                <>
                  <Pin className="w-3 h-3 text-amber-700" />
                  <span className="hidden xs:inline">Bajo el tablero</span>
                </>
              )}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onPointerDown={(e) => handleKeyTrigger(e, onClose)}
              className="p-1 text-stone-400 hover:text-stone-700 active:bg-stone-200 rounded-md transition-colors cursor-pointer"
              title="Ocultar teclado táctil"
              aria-label="Ocultar teclado"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 1 */}
      <div className="flex justify-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
        {row1.map(key => (
          <button
            key={key}
            type="button"
            onPointerDown={(e) => handleKeyTrigger(e, () => onKeyPress(key))}
            className="virtual-key flex-1 min-w-[26px] max-w-[46px] h-9.5 sm:h-11 bg-white hover:bg-stone-100 active:bg-amber-200 active:scale-95 font-bold text-stone-900 rounded-lg border border-stone-300 shadow-xs flex items-center justify-center text-sm sm:text-base transition-transform cursor-pointer"
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
            className="virtual-key flex-1 min-w-[26px] max-w-[46px] h-9.5 sm:h-11 bg-white hover:bg-stone-100 active:bg-amber-200 active:scale-95 font-bold text-stone-900 rounded-lg border border-stone-300 shadow-xs flex items-center justify-center text-sm sm:text-base transition-transform cursor-pointer"
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
          className="virtual-key flex-[1.3] min-w-[38px] max-w-[62px] h-9.5 sm:h-11 bg-stone-200 hover:bg-stone-300 active:bg-amber-300 active:scale-95 text-stone-800 font-bold rounded-lg border border-stone-300 shadow-xs flex items-center justify-center gap-1 text-[11px] sm:text-xs cursor-pointer px-1 transition-transform"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-stone-700" />
          <span className="hidden xs:inline">{direction === 'across' ? 'Horiz' : 'Vert'}</span>
        </button>

        {row3.map(key => (
          <button
            key={key}
            type="button"
            onPointerDown={(e) => handleKeyTrigger(e, () => onKeyPress(key))}
            className="virtual-key flex-1 min-w-[26px] max-w-[46px] h-9.5 sm:h-11 bg-white hover:bg-stone-100 active:bg-amber-200 active:scale-95 font-bold text-stone-900 rounded-lg border border-stone-300 shadow-xs flex items-center justify-center text-sm sm:text-base transition-transform cursor-pointer"
          >
            {key}
          </button>
        ))}

        <button
          type="button"
          onPointerDown={(e) => handleKeyTrigger(e, onBackspace)}
          title="Borrar letra"
          className="virtual-key flex-[1.2] min-w-[36px] max-w-[56px] h-9.5 sm:h-11 bg-stone-200 hover:bg-stone-300 active:bg-rose-200 active:scale-95 text-stone-800 rounded-lg border border-stone-300 shadow-xs flex items-center justify-center cursor-pointer transition-transform"
        >
          <Delete className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-stone-700" />
        </button>

        {onNextClue && (
          <button
            type="button"
            onPointerDown={(e) => handleKeyTrigger(e, onNextClue)}
            title="Siguiente pista"
            className="virtual-key flex-[1.1] min-w-[34px] max-w-[50px] h-9.5 sm:h-11 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 active:scale-95 text-white font-bold rounded-lg border border-amber-600 shadow-xs flex items-center justify-center cursor-pointer transition-transform"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};


