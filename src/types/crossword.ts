export type Direction = 'across' | 'down';

export interface CrosswordClue {
  id: string;
  number: number;
  direction: Direction;
  clue: string;
  answer: string; // Uppercase, normalized
  row: number; // 0-indexed start
  col: number; // 0-indexed start
  length: number;
}

export interface CrosswordCell {
  row: number;
  col: number;
  solution: string; // 1 uppercase char or empty
  userChar: string; // User input
  number?: number; // Starting cell number
  acrossClueId?: string;
  downClueId?: string;
  isBlocked: boolean; // Black square
  isRevealed?: boolean;
  isWrong?: boolean;
}

export type DifficultyLevel = 'Fácil' | 'Medio' | 'Difícil';

export interface CrosswordPuzzle {
  id: string;
  title: string;
  theme: string;
  difficulty: DifficultyLevel;
  rows: number;
  cols: number;
  clues: CrosswordClue[];
  grid: CrosswordCell[][];
  createdAt: string;
  author: string;
  isCustom?: boolean;
  playCount: number;
  bestScore?: number;
}

export interface ScoreRecord {
  id: string;
  puzzleId: string;
  puzzleTitle: string;
  playerName: string;
  score: number;
  timeSeconds: number;
  hintsUsed: number;
  totalClues: number;
  solvedClues: number;
  accuracy: number; // Percentage
  completedAt: string;
  difficulty: DifficultyLevel;
}

export interface PuzzleProgress {
  puzzleId: string;
  userGrid: Record<string, string>; // "row-col" -> char
  timeSeconds: number;
  hintsUsed: number;
  isCompleted: boolean;
  lastPlayed: string;
}

export interface WordCluePair {
  answer: string;
  clue: string;
}
