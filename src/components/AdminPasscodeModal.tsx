import React, { useState } from 'react';
import { AdminAuthService } from '../services/adminAuthService';
import { Lock, KeyRound, Eye, EyeOff, AlertCircle, X, Check, ShieldCheck } from 'lucide-react';

interface AdminPasscodeModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminPasscodeModal: React.FC<AdminPasscodeModalProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const ok = AdminAuthService.verifyAndUnlock(passcode, remember);
    if (ok) {
      onSuccess();
    } else {
      setErrorMsg('Clave incorrecta. Solo los creadores autorizados pueden acceder al generador.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-5 sm:p-6 my-auto animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-stone-900 text-base">
                Acceso de Creador
              </h3>
              <p className="text-xs text-stone-500">
                Sección restringida del Generador
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative banner */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-600 leading-relaxed space-y-1">
          <p className="text-stone-800 font-medium">
            Toda la gente que entra puede <strong>jugar libremente</strong> los crucigramas.
          </p>
          <p className="text-stone-500 text-[11px]">
            Para diseñar nuevos crucigramas, generar con IA o cambiar la biblioteca, ingresa la clave de creador.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Clave de Acceso:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                placeholder="Introduce tu clave..."
                className="w-full pl-9 pr-9 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
              />
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="p-1 text-stone-400 hover:text-stone-700 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Recordar en este navegador</span>
            </label>
            <span className="text-[10px] text-stone-400">
              Clave inicial: <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700 font-mono">admin123</code>
            </span>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-3 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Volver a Jugar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 active:scale-99 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Entrar al Generador</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
