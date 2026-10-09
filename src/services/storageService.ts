import { CrosswordPuzzle, ScoreRecord, PuzzleProgress } from '../types/crossword';
import { THEMATIC_PACKS, generateCrosswordLayout } from './crosswordGenerator';

const DB_NAME = 'CrucigramaProDB';
const DB_VERSION = 1;
const STORE_PUZZLES = 'puzzles';
const STORE_SCORES = 'scores';
const STORE_PROGRESS = 'progress';

// Helper to open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_PUZZLES)) {
        const puzzleStore = db.createObjectStore(STORE_PUZZLES, { keyPath: 'id' });
        puzzleStore.createIndex('createdAt', 'createdAt', { unique: false });
        puzzleStore.createIndex('theme', 'theme', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SCORES)) {
        const scoreStore = db.createObjectStore(STORE_SCORES, { keyPath: 'id' });
        scoreStore.createIndex('puzzleId', 'puzzleId', { unique: false });
        scoreStore.createIndex('score', 'score', { unique: false });
        scoreStore.createIndex('completedAt', 'completedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
        db.createObjectStore(STORE_PROGRESS, { keyPath: 'puzzleId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Fallback to localStorage if IndexedDB is blocked in some environments
const LS_PUZZLES_KEY = 'crucigrama_puzzles_v1';
const LS_SCORES_KEY = 'crucigrama_scores_v1';
const LS_PROGRESS_KEY = 'crucigrama_progress_v1';

function getLocalStorage<T>(key: string, defaultVal: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocalStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

export class StorageService {
  private static isInitialized = false;

  public static async init(): Promise<void> {
    if (this.isInitialized) return;

    // Check if we need to pre-seed default past crosswords
    const existing = await this.getAllPuzzles();
    if (existing.length === 0) {
      await this.seedInitialPuzzles();
    } else {
      // Orthography migration: verify and repair any typo in saved seed puzzles
      const seedNaturaleza = existing.find(p => p.id === 'seed_naturaleza-fauna');
      if (seedNaturaleza && seedNaturaleza.clues.some(c => c.answer === 'PENGUINO')) {
        const pack = THEMATIC_PACKS.find(p => p.id === 'naturaleza-fauna');
        if (pack) {
          const corrected = generateCrosswordLayout(
            pack.pairs,
            pack.title,
            pack.theme,
            pack.difficulty
          );
          corrected.id = 'seed_naturaleza-fauna';
          corrected.author = 'Editorial Crucigramas';
          corrected.createdAt = seedNaturaleza.createdAt;
          corrected.playCount = seedNaturaleza.playCount || 0;
          corrected.bestScore = seedNaturaleza.bestScore;
          await this.savePuzzle(corrected);
        }
      }

      // Ensure newly added curated packs are added to the library
      for (const pack of THEMATIC_PACKS) {
        const exists = existing.some(p => p.id === `seed_${pack.id}`);
        if (!exists) {
          try {
            const puzzle = generateCrosswordLayout(
              pack.pairs,
              pack.title,
              pack.theme,
              pack.difficulty
            );
            puzzle.id = `seed_${pack.id}`;
            puzzle.author = 'Editorial Crucigramas';
            puzzle.createdAt = new Date().toISOString();
            await this.savePuzzle(puzzle);
          } catch (e) {
            console.warn('Error seeding new pack:', pack.id, e);
          }
        }
      }
    }

    this.isInitialized = true;
  }

  private static async seedInitialPuzzles(): Promise<void> {
    const seeds: CrosswordPuzzle[] = [];

    // Pre-seed sample historical puzzles from THEMATIC_PACKS
    for (const pack of THEMATIC_PACKS) {
      try {
        const puzzle = generateCrosswordLayout(
          pack.pairs,
          pack.title,
          pack.theme,
          pack.difficulty
        );
        // Tag with deterministic ID and author
        puzzle.id = `seed_${pack.id}`;
        puzzle.author = 'Editorial Crucigramas';
        puzzle.createdAt = new Date(Date.now() - Math.floor(Math.random() * 86400000 * 14)).toISOString();
        seeds.push(puzzle);
      } catch (err) {
        console.error('Error seeding pack:', pack.id, err);
      }
    }

    for (const p of seeds) {
      await this.savePuzzle(p);
    }

    // Add some realistic initial scores to populate historical records
    const sampleScores: ScoreRecord[] = [
      {
        id: 'score_demo_1',
        puzzleId: seeds[0]?.id || 'seed_geografia-mundo',
        puzzleTitle: seeds[0]?.title || 'Geografía y Capitales del Mundo',
        playerName: 'Elena M.',
        score: 950,
        timeSeconds: 184,
        hintsUsed: 0,
        totalClues: seeds[0]?.clues.length || 10,
        solvedClues: seeds[0]?.clues.length || 10,
        accuracy: 100,
        completedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        difficulty: 'Fácil',
      },
      {
        id: 'score_demo_2',
        puzzleId: seeds[0]?.id || 'seed_geografia-mundo',
        puzzleTitle: seeds[0]?.title || 'Geografía y Capitales del Mundo',
        playerName: 'Carlos Ruiz',
        score: 820,
        timeSeconds: 245,
        hintsUsed: 1,
        totalClues: seeds[0]?.clues.length || 10,
        solvedClues: seeds[0]?.clues.length || 10,
        accuracy: 94,
        completedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        difficulty: 'Fácil',
      },
      {
        id: 'score_demo_3',
        puzzleId: seeds[1]?.id || 'seed_historia-universal',
        puzzleTitle: seeds[1]?.title || 'Historia Universal y Civilizaciones',
        playerName: 'Mateo V.',
        score: 1120,
        timeSeconds: 310,
        hintsUsed: 0,
        totalClues: seeds[1]?.clues.length || 10,
        solvedClues: seeds[1]?.clues.length || 10,
        accuracy: 100,
        completedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        difficulty: 'Medio',
      },
      {
        id: 'score_demo_4',
        puzzleId: seeds[3]?.id || 'seed_cine-series',
        puzzleTitle: seeds[3]?.title || 'Cine Clásico y Premios Óscar',
        playerName: 'Lucía Gómez',
        score: 910,
        timeSeconds: 198,
        hintsUsed: 1,
        totalClues: seeds[3]?.clues.length || 10,
        solvedClues: seeds[3]?.clues.length || 10,
        accuracy: 95,
        completedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        difficulty: 'Fácil',
      },
    ];

    for (const sc of sampleScores) {
      await this.saveScore(sc);
    }
  }

  // PUZZLES
  public static async getAllPuzzles(): Promise<CrosswordPuzzle[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_PUZZLES, 'readonly');
        const store = tx.objectStore(STORE_PUZZLES);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result as CrosswordPuzzle[];
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          resolve(list);
        };
        req.onerror = () => {
          resolve(getLocalStorage<CrosswordPuzzle[]>(LS_PUZZLES_KEY, []));
        };
      });
    } catch {
      return getLocalStorage<CrosswordPuzzle[]>(LS_PUZZLES_KEY, []);
    }
  }

  public static async getPuzzleById(id: string): Promise<CrosswordPuzzle | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_PUZZLES, 'readonly');
        const store = tx.objectStore(STORE_PUZZLES);
        const req = store.get(id);
        req.onsuccess = () => resolve((req.result as CrosswordPuzzle) || null);
        req.onerror = () => {
          const list = getLocalStorage<CrosswordPuzzle[]>(LS_PUZZLES_KEY, []);
          resolve(list.find(p => p.id === id) || null);
        };
      });
    } catch {
      const list = getLocalStorage<CrosswordPuzzle[]>(LS_PUZZLES_KEY, []);
      return list.find(p => p.id === id) || null;
    }
  }

  public static async savePuzzle(puzzle: CrosswordPuzzle): Promise<void> {
    // Save to IndexedDB
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PUZZLES, 'readwrite');
        const store = tx.objectStore(STORE_PUZZLES);
        const req = store.put(puzzle);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IDB put error, using LS:', e);
    }

    // Mirror to localStorage
    const list = getLocalStorage<CrosswordPuzzle[]>(LS_PUZZLES_KEY, []);
    const idx = list.findIndex(p => p.id === puzzle.id);
    if (idx >= 0) {
      list[idx] = puzzle;
    } else {
      list.unshift(puzzle);
    }
    setLocalStorage(LS_PUZZLES_KEY, list);
  }

  public static async deletePuzzle(id: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PUZZLES, 'readwrite');
        const store = tx.objectStore(STORE_PUZZLES);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IDB delete error:', e);
    }

    const list = getLocalStorage<CrosswordPuzzle[]>(LS_PUZZLES_KEY, []).filter(p => p.id !== id);
    setLocalStorage(LS_PUZZLES_KEY, list);
  }

  // SCORES
  public static async getScores(puzzleId?: string): Promise<ScoreRecord[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_SCORES, 'readonly');
        const store = tx.objectStore(STORE_SCORES);
        const req = store.getAll();
        req.onsuccess = () => {
          let list = req.result as ScoreRecord[];
          if (puzzleId) {
            list = list.filter(s => s.puzzleId === puzzleId);
          }
          list.sort((a, b) => b.score - a.score || a.timeSeconds - b.timeSeconds);
          resolve(list);
        };
        req.onerror = () => {
          const list = getLocalStorage<ScoreRecord[]>(LS_SCORES_KEY, []);
          resolve(puzzleId ? list.filter(s => s.puzzleId === puzzleId) : list);
        };
      });
    } catch {
      const list = getLocalStorage<ScoreRecord[]>(LS_SCORES_KEY, []);
      return puzzleId ? list.filter(s => s.puzzleId === puzzleId) : list;
    }
  }

  public static async saveScore(scoreRecord: ScoreRecord): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SCORES, 'readwrite');
        const store = tx.objectStore(STORE_SCORES);
        const req = store.put(scoreRecord);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IDB saveScore error:', e);
    }

    const list = getLocalStorage<ScoreRecord[]>(LS_SCORES_KEY, []);
    list.unshift(scoreRecord);
    setLocalStorage(LS_SCORES_KEY, list);

    // Update puzzle play count and best score
    const puzzle = await this.getPuzzleById(scoreRecord.puzzleId);
    if (puzzle) {
      puzzle.playCount = (puzzle.playCount || 0) + 1;
      if (!puzzle.bestScore || scoreRecord.score > puzzle.bestScore) {
        puzzle.bestScore = scoreRecord.score;
      }
      await this.savePuzzle(puzzle);
    }
  }

  // PROGRESS
  public static async getProgress(puzzleId: string): Promise<PuzzleProgress | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_PROGRESS);
        const req = store.get(puzzleId);
        req.onsuccess = () => resolve((req.result as PuzzleProgress) || null);
        req.onerror = () => {
          const dict = getLocalStorage<Record<string, PuzzleProgress>>(LS_PROGRESS_KEY, {});
          resolve(dict[puzzleId] || null);
        };
      });
    } catch {
      const dict = getLocalStorage<Record<string, PuzzleProgress>>(LS_PROGRESS_KEY, {});
      return dict[puzzleId] || null;
    }
  }

  public static async saveProgress(progress: PuzzleProgress): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_PROGRESS);
        store.put(progress);
        tx.oncomplete = () => resolve();
      });
    } catch (e) {
      console.warn('IDB saveProgress error:', e);
    }

    const dict = getLocalStorage<Record<string, PuzzleProgress>>(LS_PROGRESS_KEY, {});
    dict[progress.puzzleId] = progress;
    setLocalStorage(LS_PROGRESS_KEY, dict);
  }

  public static async clearProgress(puzzleId: string): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_PROGRESS, 'readwrite');
      tx.objectStore(STORE_PROGRESS).delete(puzzleId);
    } catch (e) {
      console.warn('IDB clearProgress error:', e);
    }
    const dict = getLocalStorage<Record<string, PuzzleProgress>>(LS_PROGRESS_KEY, {});
    delete dict[puzzleId];
    setLocalStorage(LS_PROGRESS_KEY, dict);
  }

  // Export / Import
  public static async exportBackupJSON(): Promise<string> {
    const puzzles = await this.getAllPuzzles();
    const scores = await this.getScores();
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      puzzles,
      scores,
    }, null, 2);
  }

  public static async importBackupJSON(jsonStr: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.puzzles)) {
        for (const p of data.puzzles) {
          await this.savePuzzle(p);
        }
      }
      if (Array.isArray(data.scores)) {
        for (const s of data.scores) {
          await this.saveScore(s);
        }
      }
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  }
}
