// Service to manage Creator / Admin access control for the Generator

const LS_ADMIN_KEY = 'crucigrama_admin_passcode';
const LS_ADMIN_UNLOCKED = 'crucigrama_admin_session_unlocked';
const DEFAULT_PASSCODE = 'admin123';

export class AdminAuthService {
  /**
   * Retrieves the configured passcode (defaults to 'admin123' if not changed).
   */
  public static getPasscode(): string {
    if (typeof window === 'undefined') return DEFAULT_PASSCODE;
    try {
      const saved = localStorage.getItem(LS_ADMIN_KEY);
      return saved && saved.trim().length > 0 ? saved.trim() : DEFAULT_PASSCODE;
    } catch {
      return DEFAULT_PASSCODE;
    }
  }

  /**
   * Updates the admin passcode.
   */
  public static setPasscode(newCode: string): boolean {
    if (!newCode || newCode.trim().length < 3) return false;
    try {
      localStorage.setItem(LS_ADMIN_KEY, newCode.trim());
      // Keep session unlocked for current user
      sessionStorage.setItem(LS_ADMIN_UNLOCKED, 'true');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks whether the current user's session is unlocked.
   */
  public static isUnlocked(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      // Check query param first (for direct creator links: ?adminKey=xxx or ?key=xxx)
      const params = new URLSearchParams(window.location.search);
      const urlKey = params.get('adminKey') || params.get('key') || params.get('admin');
      if (urlKey && urlKey.trim() === this.getPasscode()) {
        sessionStorage.setItem(LS_ADMIN_UNLOCKED, 'true');
        return true;
      }

      // Check sessionStorage / localStorage
      return (
        sessionStorage.getItem(LS_ADMIN_UNLOCKED) === 'true' ||
        localStorage.getItem(LS_ADMIN_UNLOCKED) === 'true'
      );
    } catch {
      return false;
    }
  }

  /**
   * Attempts to verify input and unlock the generator.
   */
  public static verifyAndUnlock(input: string, remember = false): boolean {
    const cleanInput = input.trim();
    const correct = this.getPasscode();

    if (cleanInput === correct) {
      try {
        sessionStorage.setItem(LS_ADMIN_UNLOCKED, 'true');
        if (remember) {
          localStorage.setItem(LS_ADMIN_UNLOCKED, 'true');
        }
      } catch {
        // Fallback
      }
      return true;
    }
    return false;
  }

  /**
   * Locks the generator session.
   */
  public static lock(): void {
    try {
      sessionStorage.removeItem(LS_ADMIN_UNLOCKED);
      localStorage.removeItem(LS_ADMIN_UNLOCKED);
    } catch {
      // Ignore
    }
  }

  /**
   * Generates a shareable direct link that automatically unlocks the generator for chosen people.
   */
  public static getSecretAdminUrl(origin: string): string {
    const code = this.getPasscode();
    return `${origin}/?tab=generator&adminKey=${encodeURIComponent(code)}`;
  }
}
