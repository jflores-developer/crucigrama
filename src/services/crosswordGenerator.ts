import { CrosswordPuzzle, CrosswordClue, CrosswordCell, Direction, DifficultyLevel, WordCluePair } from '../types/crossword';
import { GoogleGenAI } from '@google/genai';

// Dictionary of common false cognates, Anglicisms, or frequent typos in Spanish crossword generation
const SPANISH_SPELLCHECK_CORRECTIONS: Record<string, string> = {
  PENGUINO: 'PINGUINO',
  PENGUIN: 'PINGUINO',
  ZEBRA: 'CEBRA',
  PIRAMID: 'PIRAMIDE',
  VOLCANO: 'VOLCAN',
  OCEAN: 'OCEANO',
  TELEPHONE: 'TELEFONO',
  GUITAR: 'GUITARRA',
  ELEPHANT: 'ELEFANTE',
  TIGER: 'TIGRE',
  DOLPHIN: 'DELFIN',
  WHALE: 'BALLENA',
  ASTRONOMY: 'ASTRONOMIA',
  CHEMISTRY: 'QUIMICA',
  PHYSICS: 'FISICA',
  MATHEMATICS: 'MATEMATICAS',
  LITERATURE: 'LITERATURA',
  PHILOSOPHY: 'FILOSOFIA',
  GEOGRAPHY: 'GEOGRAFIA',
  HISTORY: 'HISTORIA',
  ARCHAEOLOGY: 'ARQUEOLOGIA',
  TECHNOLOGY: 'TECNOLOGIA',
  CHIMPANZEE: 'CHIMPANCE',
  CROCODILE: 'COCODRILO',
  GIRAFFE: 'JIRAFA',
  LEOPARD: 'LEOPARDO',
  RHINOCEROS: 'RINOCERONTE',
  HIPPPOPOTAMUS: 'HIPOPOTAMO',
};

// Normalizes Spanish text for crosswords (preserves Ñ, strips other accents and symbols, corrects typos)
export function normalizeSpanishWord(word: string): string {
  const cleaned = word
    .toUpperCase()
    .trim()
    .replace(/[ÁÀÄÂ]/g, 'A')
    .replace(/[ÉÈËÊ]/g, 'E')
    .replace(/[ÍÌÏÎ]/g, 'I')
    .replace(/[ÓÒÖÔ]/g, 'O')
    .replace(/[ÚÙÜÛ]/g, 'U')
    .replace(/[^A-ZÑ]/g, '');

  return SPANISH_SPELLCHECK_CORRECTIONS[cleaned] || cleaned;
}

interface PlacedWord {
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
}

/**
 * Procedural crossword layout generator that places words onto a grid with valid intersections.
 */
export function generateCrosswordLayout(
  pairs: WordCluePair[],
  title: string,
  theme: string,
  difficulty: DifficultyLevel = 'Medio',
  maxGridDimension = 14
): CrosswordPuzzle {
  // 1. Clean and filter pairs
  const validPairs = pairs
    .map(p => ({
      answer: normalizeSpanishWord(p.answer),
      clue: p.clue.trim(),
    }))
    .filter(p => p.answer.length >= 3 && p.answer.length <= maxGridDimension && p.clue.length > 0);

  // Remove duplicate answers
  const uniquePairs: WordCluePair[] = [];
  const seenAnswers = new Set<string>();
  for (const p of validPairs) {
    if (!seenAnswers.has(p.answer)) {
      seenAnswers.add(p.answer);
      uniquePairs.push(p);
    }
  }

  // Sort by length descending (longer words provide more crossing opportunities)
  uniquePairs.sort((a, b) => b.answer.length - a.answer.length);

  if (uniquePairs.length === 0) {
    throw new Error('No hay palabras válidas para generar el crucigrama.');
  }

  // Best layout holder across multiple randomized runs
  let bestPlacedWords: PlacedWord[] = [];
  let bestEvaluation = -Infinity;

  const ATTEMPTS = 25; // More attempts to find the tightest, densest interconnection

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    // Shuffle candidates to explore varied layouts, prioritizing longer words
    const candidates = [...uniquePairs];
    if (attempt > 0) {
      const topWords = candidates.slice(0, 3);
      const rest = candidates.slice(3);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      candidates.splice(0, candidates.length, ...topWords, ...rest);
    }

    const placed: PlacedWord[] = [];
    const gridSize = 40; // Virtual scratchpad grid
    const grid: (string | null)[][] = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill(null)
    );

    // Place first word in center horizontally
    const first = candidates[0];
    const firstRow = Math.floor(gridSize / 2);
    const firstCol = Math.floor((gridSize - first.answer.length) / 2);

    for (let c = 0; c < first.answer.length; c++) {
      grid[firstRow][firstCol + c] = first.answer[c];
    }
    placed.push({
      answer: first.answer,
      clue: first.clue,
      row: firstRow,
      col: firstCol,
      direction: 'across',
    });

    // Try placing subsequent words
    for (let i = 1; i < candidates.length; i++) {
      const word = candidates[i];
      let bestPlacement: { row: number; col: number; dir: Direction; score: number } | null = null;

      // Check intersections with all placed words
      for (const p of placed) {
        const targetDir: Direction = p.direction === 'across' ? 'down' : 'across';

        for (let wIdx = 0; wIdx < word.answer.length; wIdx++) {
          const char = word.answer[wIdx];

          for (let pIdx = 0; pIdx < p.answer.length; pIdx++) {
            if (p.answer[pIdx] === char) {
              // Potential intersection!
              let candRow = 0;
              let candCol = 0;

              if (targetDir === 'down') {
                candRow = p.row - wIdx;
                candCol = p.col + pIdx;
              } else {
                candRow = p.row + pIdx;
                candCol = p.col - wIdx;
              }

              if (canPlaceWord(grid, word.answer, candRow, candCol, targetDir, gridSize)) {
                // Score placement: strongly favor multi-intersections and compactness to minimize dead space
                const intersections = countIntersections(grid, word.answer, candRow, candCol, targetDir);
                const distFromCenter = Math.abs(candRow - gridSize / 2) + Math.abs(candCol - gridSize / 2);
                const score = (intersections * 35) - (distFromCenter * 1.5);

                if (!bestPlacement || score > bestPlacement.score) {
                  bestPlacement = { row: candRow, col: candCol, dir: targetDir, score };
                }
              }
            }
          }
        }
      }

      if (bestPlacement) {
        // Place on scratchpad
        for (let k = 0; k < word.answer.length; k++) {
          const r = bestPlacement.dir === 'across' ? bestPlacement.row : bestPlacement.row + k;
          const c = bestPlacement.dir === 'across' ? bestPlacement.col + k : bestPlacement.col;
          grid[r][c] = word.answer[k];
        }
        placed.push({
          answer: word.answer,
          clue: word.clue,
          row: bestPlacement.row,
          col: bestPlacement.col,
          direction: bestPlacement.dir,
        });
      }
    }

    // Evaluate this attempt: calculate bounding box area and total intersections
    if (placed.length >= 3) {
      let curMinR = Infinity, curMaxR = -Infinity;
      let curMinC = Infinity, curMaxC = -Infinity;
      let totalLetterCells = 0;

      for (const pw of placed) {
        totalLetterCells += pw.answer.length;
        curMinR = Math.min(curMinR, pw.row);
        curMinC = Math.min(curMinC, pw.col);
        if (pw.direction === 'across') {
          curMaxR = Math.max(curMaxR, pw.row);
          curMaxC = Math.max(curMaxC, pw.col + pw.answer.length - 1);
        } else {
          curMaxR = Math.max(curMaxR, pw.row + pw.answer.length - 1);
          curMaxC = Math.max(curMaxC, pw.col);
        }
      }

      const area = (curMaxR - curMinR + 1) * (curMaxC - curMinC + 1);
      const density = totalLetterCells / Math.max(1, area);
      // Evaluation formula: weight placed words heavily, reward density, penalize area
      const evaluation = (placed.length * 100) + (density * 150) - (area * 0.4);

      if (evaluation > bestEvaluation) {
        bestPlacedWords = placed;
        bestEvaluation = evaluation;
      }
    }
  }

  // If even after attempts we placed too few, ensure we at least have words
  if (bestPlacedWords.length < 3 && uniquePairs.length >= 3) {
    // Fallback: place horizontally/vertically with manual spacing if layout was tight
    bestPlacedWords = fallbackLayout(uniquePairs.slice(0, Math.min(10, uniquePairs.length)));
  }

  // Crop to bounding box
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;

  for (const pw of bestPlacedWords) {
    minRow = Math.min(minRow, pw.row);
    minCol = Math.min(minCol, pw.col);
    if (pw.direction === 'across') {
      maxRow = Math.max(maxRow, pw.row);
      maxCol = Math.max(maxCol, pw.col + pw.answer.length - 1);
    } else {
      maxRow = Math.max(maxRow, pw.row + pw.answer.length - 1);
      maxCol = Math.max(maxCol, pw.col);
    }
  }

  const rows = maxRow - minRow + 1;
  const cols = maxCol - minCol + 1;

  // Build final grid
  const finalGrid: CrosswordCell[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r,
      col: c,
      solution: '',
      userChar: '',
      isBlocked: true,
    }))
  );

  // Offset placed words to 0-indexed bounds
  const adjustedWords: PlacedWord[] = bestPlacedWords.map(pw => ({
    ...pw,
    row: pw.row - minRow,
    col: pw.col - minCol,
  }));

  // Fill solutions
  for (const pw of adjustedWords) {
    for (let k = 0; k < pw.answer.length; k++) {
      const r = pw.direction === 'across' ? pw.row : pw.row + k;
      const c = pw.direction === 'across' ? pw.col + k : pw.col;
      finalGrid[r][c].solution = pw.answer[k];
      finalGrid[r][c].isBlocked = false;
    }
  }

  // Assign clue numbers sequentially by scanning row-by-row, col-by-col
  let clueNumberCounter = 1;
  const clues: CrosswordClue[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = finalGrid[r][c];
      if (cell.isBlocked) continue;

      const acrossWord = adjustedWords.find(w => w.direction === 'across' && w.row === r && w.col === c);
      const downWord = adjustedWords.find(w => w.direction === 'down' && w.row === r && w.col === c);

      if (acrossWord || downWord) {
        cell.number = clueNumberCounter;

        if (acrossWord) {
          const clueId = `across-${clueNumberCounter}`;
          clues.push({
            id: clueId,
            number: clueNumberCounter,
            direction: 'across',
            clue: acrossWord.clue,
            answer: acrossWord.answer,
            row: r,
            col: c,
            length: acrossWord.answer.length,
          });

          // Tag cells with acrossClueId
          for (let k = 0; k < acrossWord.answer.length; k++) {
            finalGrid[r][c + k].acrossClueId = clueId;
          }
        }

        if (downWord) {
          const clueId = `down-${clueNumberCounter}`;
          clues.push({
            id: clueId,
            number: clueNumberCounter,
            direction: 'down',
            clue: downWord.clue,
            answer: downWord.answer,
            row: r,
            col: c,
            length: downWord.answer.length,
          });

          // Tag cells with downClueId
          for (let k = 0; k < downWord.answer.length; k++) {
            finalGrid[r + k][c].downClueId = clueId;
          }
        }

        clueNumberCounter++;
      }
    }
  }

  const id = `cw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    title: title.trim() || 'Crucigrama Temático',
    theme: theme.trim() || 'Cultura General',
    difficulty,
    rows,
    cols,
    clues,
    grid: finalGrid,
    createdAt: new Date().toISOString(),
    author: 'Generador Crucigrama Pro',
    playCount: 0,
  };
}

function canPlaceWord(
  grid: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: Direction,
  gridSize: number
): boolean {
  const len = word.length;

  if (direction === 'across') {
    if (startRow < 1 || startRow >= gridSize - 1 || startCol < 1 || startCol + len >= gridSize - 1) {
      return false;
    }
    // Check cell before and after
    if (grid[startRow][startCol - 1] !== null || grid[startRow][startCol + len] !== null) {
      return false;
    }

    let hasIntersection = false;

    for (let c = 0; c < len; c++) {
      const currR = startRow;
      const currC = startCol + c;
      const existing = grid[currR][currC];

      if (existing !== null) {
        if (existing !== word[c]) return false; // Mismatch
        hasIntersection = true;
      } else {
        // Parallel neighbor check: cell above and cell below must be empty if this cell is not an intersection
        if (grid[currR - 1][currC] !== null || grid[currR + 1][currC] !== null) {
          return false;
        }
      }
    }

    return hasIntersection;
  } else {
    // 'down'
    if (startRow < 1 || startRow + len >= gridSize - 1 || startCol < 1 || startCol >= gridSize - 1) {
      return false;
    }
    // Check cell above and below
    if (grid[startRow - 1][startCol] !== null || grid[startRow + len][startCol] !== null) {
      return false;
    }

    let hasIntersection = false;

    for (let r = 0; r < len; r++) {
      const currR = startRow + r;
      const currC = startCol;
      const existing = grid[currR][currC];

      if (existing !== null) {
        if (existing !== word[r]) return false; // Mismatch
        hasIntersection = true;
      } else {
        // Parallel neighbor check: cell left and right must be empty
        if (grid[currR][currC - 1] !== null || grid[currR][currC + 1] !== null) {
          return false;
        }
      }
    }

    return hasIntersection;
  }
}

function countIntersections(
  grid: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: Direction
): number {
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? startRow : startRow + i;
    const c = direction === 'across' ? startCol + i : startCol;
    if (grid[r][c] === word[i]) {
      count++;
    }
  }
  return count;
}

function fallbackLayout(pairs: WordCluePair[]): PlacedWord[] {
  // Simple interleaved placement
  const placed: PlacedWord[] = [];
  let r = 0;
  let c = 0;

  for (let i = 0; i < pairs.length; i++) {
    const dir: Direction = i % 2 === 0 ? 'across' : 'down';
    placed.push({
      answer: pairs[i].answer,
      clue: pairs[i].clue,
      row: r,
      col: c,
      direction: dir,
    });
    if (dir === 'across') {
      r += 2;
    } else {
      c += 2;
    }
  }

  return placed;
}

/**
 * AI-powered crossword generation with Gemini API or curated fallback packs.
 */
export async function generateCrosswordFromTopicWithAI(
  topic: string,
  difficulty: DifficultyLevel = 'Medio',
  wordCount = 10
): Promise<CrosswordPuzzle> {
  const apiKey = process.env.GEMINI_API_KEY || (typeof window !== 'undefined' ? (window as unknown as { GEMINI_API_KEY?: string }).GEMINI_API_KEY : '');

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Eres un lexicógrafo y redactor experto en crucigramas en español normativo (según el Diccionario de la RAE).
Genera un conjunto de ${wordCount + 4} palabras y definiciones temáticas sobre: "${topic}".
Nivel de dificultad: ${difficulty}.

REGLAS DE ORTOGRAFÍA Y VOCABULARIO EN ESPAÑOL ESTRICTAS:
1. ORTOGRAFÍA ESPAÑOLA RIGUROSA: Cada palabra DEBE tener la ortografía exacta en español (por ejemplo: "PINGUINO" o "PINGÜINO", NUNCA "PENGUINO"; "CEBRA", NUNCA "ZEBRA"; "VOLCAN", NUNCA "VOLCANO"; "DELFIN", NUNCA "DOLPHIN"; "BALLENA", NUNCA "WHALE").
2. No usar falsos amigos ni palabras en inglés o con ortografía mixta. Solo términos válidos en español.
3. Las palabras deben ser sustantivos, verbos en infinitivo o adjetivos precisos en español.
4. Longitud de cada palabra: entre 3 y 11 letras.
5. Las pistas/definiciones deben ser interesantes, concisas, culturalmente correctas e ingeniosas.
6. Devuelve EXCLUSIVAMENTE un arreglo JSON con objetos con las claves "answer" y "clue". Sin markdown ni explicaciones adicionales.

Ejemplo de formato:
[
  {"answer": "MADRID", "clue": "Capital y ciudad más poblada de España."},
  {"answer": "ROMA", "clue": "Ciudad de las siete colinas y capital de Italia."}
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      });

      const text = response.text?.trim() || '';
      const pairs: WordCluePair[] = JSON.parse(text);

      if (Array.isArray(pairs) && pairs.length >= 4) {
        return generateCrosswordLayout(pairs, `Crucigrama: ${topic}`, topic, difficulty);
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to curated generators:', err);
    }
  }

  // Fallback to thematic match or procedural generator
  const pack = getThematicPack(topic);
  return generateCrosswordLayout(pack.pairs, pack.title, pack.theme, difficulty);
}

// Built-in Curated Spanish Thematic Packs
export interface ThematicPack {
  id: string;
  title: string;
  theme: string;
  difficulty: DifficultyLevel;
  description: string;
  pairs: WordCluePair[];
}

export const THEMATIC_PACKS: ThematicPack[] = [
  {
    id: 'geografia-mundo',
    title: 'Geografía y Capitales del Mundo',
    theme: 'Geografía',
    difficulty: 'Fácil',
    description: 'Ríos, capitales, continentes, cordilleras y maravillas del planeta.',
    pairs: [
      { answer: 'PARIS', clue: 'Capital de Francia, conocida como la Ciudad de la Luz.' },
      { answer: 'ANDES', clue: 'La cordillera continental más larga del planeta.' },
      { answer: 'AMAZONAS', clue: 'El río más caudaloso y largo del mundo.' },
      { answer: 'SAHARA', clue: 'El desierto cálido más grande del mundo en África.' },
      { answer: 'ROMA', clue: 'Capital de Italia, hogar del Coliseo y el Vaticano.' },
      { answer: 'ASIA', clue: 'El continente más grande y poblado de la Tierra.' },
      { answer: 'TOKIO', clue: 'Capital de Japón y la metrópolis más poblada del mundo.' },
      { answer: 'PACIFICO', clue: 'El océano más extenso y profundo del planeta.' },
      { answer: 'NILO', clue: 'Río africano vital para la civilización del Antiguo Egipto.' },
      { answer: 'MADRID', clue: 'Capital de España y centro de la península ibérica.' },
      { answer: 'EVEREST', clue: 'La montaña más alta de la superficie terrestre.' },
      { answer: 'BERLIN', clue: 'Capital alemana famosa por su muro histórico.' },
      { answer: 'LONDRES', clue: 'Capital británica a orillas del río Támesis.' },
      { answer: 'DANUBIO', clue: 'Segundo río más largo de Europa que atraviesa cuatro capitales.' },
      { answer: 'OCEANIA', clue: 'Continente insular compuesto por Australia y miles de islas.' },
      { answer: 'BRASILIA', clue: 'Capital federal de Brasil diseñada por Oscar Niemeyer.' },
      { answer: 'CARIBE', clue: 'Mar tropical americano de aguas cálidas y arrecifes.' },
      { answer: 'CANAL', clue: 'Vía artificial de navegación marítima como la de Panamá o Suez.' },
      { answer: 'ALPES', clue: 'Cadena montañosa más importante de Europa central.' },
      { answer: 'VOLCAN', clue: 'Abertura geológica en la corteza terrestre que expulsa lava.' },
      { answer: 'ISLA', clue: 'Porción de tierra completamente rodeada de agua.' },
      { answer: 'ESTRECHO', clue: 'Paso angosto de agua que comunica dos mares, como Gibraltar.' },
    ],
  },
  {
    id: 'historia-universal',
    title: 'Historia Universal y Civilizaciones',
    theme: 'Historia',
    difficulty: 'Medio',
    description: 'Hitos, imperios, revoluciones y personajes de la humanidad.',
    pairs: [
      { answer: 'FARAON', clue: 'Título de los monarcas soberanos del Antiguo Egipto.' },
      { answer: 'IMPERIO', clue: 'Organización política en la que un estado domina sobre otros.' },
      { answer: 'GRECIA', clue: 'Cuna de la democracia occidental y la filosofía clásica.' },
      { answer: 'REVOLUCION', clue: 'Cambio social y político radical, como la francesa de 1789.' },
      { answer: 'CESAR', clue: 'Cayo Julio, famoso general y dictador de la República Romana.' },
      { answer: 'MAYAS', clue: 'Civilización mesoamericana famosa por su calendario y pirámides.' },
      { answer: 'ESPARTA', clue: 'Ciudad-estado griega célebre por su férrea disciplina militar.' },
      { answer: 'PIRAMIDE', clue: 'Monumento funerario monumental característico de Guiza.' },
      { answer: 'COLON', clue: 'Navegante genovés que llegó a América en el año 1492.' },
      { answer: 'VIKINGOS', clue: 'Guerreros y navegantes escandinavos de la época medieval.' },
      { answer: 'ATENAS', clue: 'Ciudad griega donde floreció la democracia con Pericles.' },
      { answer: 'CASTILLO', clue: 'Fortaleza medieval fortificada residencia de reyes y nobles.' },
      { answer: 'SAMURAI', clue: 'Guerrero perteneciente a la aristocracia militar del Japón feudal.' },
      { answer: 'GLADIADOR', clue: 'Luchador que combatía en los anfiteatros de la antigua Roma.' },
      { answer: 'TRATADO', clue: 'Acuerdo oficial y vinculante suscrito entre naciones.' },
      { answer: 'DINASTIA', clue: 'Serie de soberanos pertenecientes a una misma familia gobernante.' },
      { answer: 'CRUSADA', clue: 'Expedición militar medieval de reinos cristianos hacia Tierra Santa.' },
      { answer: 'CORONA', clue: 'Símbolo supremo de dignidad y autoridad monárquica.' },
      { answer: 'SENADO', clue: 'Asamblea legislativa fundamental de la República Romana.' },
      { answer: 'MONARCA', clue: 'Jefe de Estado que ostenta el poder de forma hereditaria o vitalicia.' },
    ],
  },
  {
    id: 'ciencia-universo',
    title: 'Ciencia, Astronomía y el Cosmos',
    theme: 'Ciencia',
    difficulty: 'Medio',
    description: 'Física, química, biología, átomos y los misterios cósmicos.',
    pairs: [
      { answer: 'ATOMO', clue: 'Unidad básica de la materia compuesta por protones y electrones.' },
      { answer: 'GALAXIA', clue: 'Enorme conjunto de estrellas, polvo cósmico y materia oscura.' },
      { answer: 'GRAVEDAD', clue: 'Fuerza natural que atrae los cuerpos hacia el centro terrestre.' },
      { answer: 'EINSTEIN', clue: 'Físico teórico alemán autor de la teoría de la relatividad.' },
      { answer: 'OXIGENO', clue: 'Elemento químico gaseoso esencial para la respiración aeróbica.' },
      { answer: 'PLANETA', clue: 'Cuerpo celeste que orbita alrededor de una estrella como el Sol.' },
      { answer: 'TELESCOPIO', clue: 'Instrumento óptico para observar objetos cósmicos lejanos.' },
      { answer: 'NEBULOSA', clue: 'Nube gigante de polvo y gas estelar en el espacio exterior.' },
      { answer: 'GENETICA', clue: 'Rama de la biología que estudia la herencia y el ADN.' },
      { answer: 'ENERGIA', clue: 'Capacidad que tiene la materia de producir trabajo o calor.' },
      { answer: 'FOTON', clue: 'Partícula elemental mediadora de la luz y la radiación electromagnética.' },
      { answer: 'COMETA', clue: 'Astro con núcleo de hielo y roca que desarrolla una brillante cola.' },
      { answer: 'MOLECULA', clue: 'Grupo estable de átomos unidos por enlaces químicos definidos.' },
      { answer: 'VACUNA', clue: 'Preparación biológica que genera inmunidad adquirida ante virus.' },
      { answer: 'ORBITA', clue: 'Trayectoria curva que describe un cuerpo celeste en el espacio.' },
      { answer: 'CARBONO', clue: 'Elemento químico base indispensable de toda la química orgánica.' },
      { answer: 'ESTRELLA', clue: 'Esfera masiva de plasma autogravitante que genera luz y calor.' },
      { answer: 'QUIMICA', clue: 'Ciencia que estudia la composición y transformaciones de la materia.' },
      { answer: 'CLON', clue: 'Organismo idéntico genéticamente a otro obtenido asexualmente.' },
      { answer: 'SUPERNOVA', clue: 'Explosión estelar titánica que marca el fin de una estrella masiva.' },
    ],
  },
  {
    id: 'cine-series',
    title: 'Cine Clásico, Directores y Premios Óscar',
    theme: 'Cine',
    difficulty: 'Fácil',
    description: 'Películas legendarias, directores, rodajes y el séptimo arte.',
    pairs: [
      { answer: 'DIRECTOR', clue: 'Persona encargada de supervisar y dirigir la filmación.' },
      { answer: 'OSCAR', clue: 'La estatuilla dorada más codiciada de la Academia de Cine.' },
      { answer: 'GUION', clue: 'Texto en el que se expone el argumento y diálogos de un film.' },
      { answer: 'TITANIC', clue: 'Película romántica de 1997 dirigida por James Cameron.' },
      { answer: 'ACTOR', clue: 'Intérprete que da vida a un personaje en una película.' },
      { answer: 'CAMARA', clue: 'Dispositivo fundamental utilizado para registrar las imágenes.' },
      { answer: 'GENERO', clue: 'Categoría cinematográfica como drama, terror o comedia.' },
      { answer: 'ESTRENO', clue: 'Primera exhibición pública de una obra cinematográfica.' },
      { answer: 'SONIDO', clue: 'Banda sonora o efectos de audio que acompañan a la cinta.' },
      { answer: 'RODAJE', clue: 'Fase de la producción fílmica en la que se filman las escenas.' },
      { answer: 'MONTAJE', clue: 'Proceso de edición y ensamble secuencial de los planos filmados.' },
      { answer: 'PLANO', clue: 'Toma continua registrada por la cámara sin cortes.' },
      { answer: 'EFECTOS', clue: 'Trucos visuales o digitales utilizados para crear ilusiones en pantalla.' },
      { answer: 'TRAILER', clue: 'Video promocional con extractos de una película de próximo estreno.' },
      { answer: 'BUTACA', clue: 'Asiento acolchado individual en la sala de proyección cinematográfica.' },
      { answer: 'HOLLYWOOD', clue: 'Célebre distrito angelino símbolo mundial de la industria fílmica.' },
      { answer: 'FESTIVAL', clue: 'Certamen donde se presentan y premian filmes, como Cannes o Venecia.' },
      { answer: 'SECULA', clue: 'Obra cinematográfica que continúa la historia de una anterior.' },
    ],
  },
  {
    id: 'naturaleza-fauna',
    title: 'Reino Animal, Selvas y Biodiversidad',
    theme: 'Naturaleza',
    difficulty: 'Fácil',
    description: 'Mamíferos, aves, hábitats acuáticos y fauna silvestre.',
    pairs: [
      { answer: 'BALLENA', clue: 'El mamífero acuático más gigante que habita los mares.' },
      { answer: 'SELVA', clue: 'Bosque tropical denso y húmedo con altísima biodiversidad.' },
      { answer: 'AGUILA', clue: 'Ave rapaz de vuelo majestuoso y aguda visión depredadora.' },
      { answer: 'DELFIN', clue: 'Cetáceo marino célebre por su inteligencia y sociabilidad.' },
      { answer: 'CORAL', clue: 'Arrecife submarino formado por colonias de invertebrados.' },
      { answer: 'JAGUAR', clue: 'El felino más grande y poderoso del continente americano.' },
      { answer: 'PINGUINO', clue: 'Ave no voladora adaptada al buceo y al frío antártico.' },
      { answer: 'BOSQUE', clue: 'Ecosistema dominado por árboles y densa vegetación.' },
      { answer: 'CAMALEON', clue: 'Reptil famoso por cambiar el color de su piel para camuflarse.' },
      { answer: 'VOLCAN', clue: 'Estructura geológica por la que emergen magma y gases.' },
      { answer: 'LEOPARDO', clue: 'Felino manchado ágil y excelente trepador de árboles en África y Asia.' },
      { answer: 'CONDOR', clue: 'Ave voladora de enorme envergadura reina de las cumbres andinas.' },
      { answer: 'CANGURO', clue: 'Marsupial saltador australiano provisto de bolsa marsupial.' },
      { answer: 'TORTUGA', clue: 'Reptil acorazado con caparazón óseo de gran longevidad.' },
      { answer: 'ARRECIFE', clue: 'Barrera rocosa marina viva donde bullen peces tropicales.' },
      { answer: 'MANGLAR', clue: 'Humedal costero con árboles de raíces aéreas tolerantes a la sal.' },
      { answer: 'ELEFANTE', clue: 'El animal terrestre más corpulento con trompa prensil y colmillos.' },
      { answer: 'ORQUIDEA', clue: 'Flor exótica de extraordinaria simetría y variados colores.' },
      { answer: 'HALCON', clue: 'Ave de presa veloz célebre por sus picados a gran velocidad.' },
      { answer: 'SERPIENTE', clue: 'Reptil ápodo y alargado con escamas y lengua bífida.' },
    ],
  },
  {
    id: 'literatura-letras',
    title: 'Literatura Española e Iberoamericana',
    theme: 'Literatura',
    difficulty: 'Difícil',
    description: 'Novelas inmortales, poetas, recursos retóricos y autores célebres.',
    pairs: [
      { answer: 'QUIJOTE', clue: 'El ingenioso hidalgo de la Mancha creado por Cervantes.' },
      { answer: 'POESIA', clue: 'Manifestación de la belleza mediante la palabra rimada o libre.' },
      { answer: 'NOVELA', clue: 'Obra literaria en prosa que narra una acción fingida en todo o parte.' },
      { answer: 'BORGES', clue: 'Maestro argentino del cuento fantástico y autor de El Aleph.' },
      { answer: 'VERSO', clue: 'Cada una de las líneas que componen un poema.' },
      { answer: 'MACONDO', clue: 'Pueblo mítico creado por Gabriel García Márquez en Cien años de soledad.' },
      { answer: 'DRAMA', clue: 'Género teatral que representa situaciones de conflicto humano.' },
      { answer: 'PROSA', clue: 'Estructura o forma natural del lenguaje para expresarse sin verso.' },
      { answer: 'METAFORA', clue: 'Figura retórica que traslada el sentido de una palabra a otra.' },
      { answer: 'AUTOR', clue: 'Creador intelectual o escritor de una obra artística.' },
      { answer: 'SONETO', clue: 'Composición poética clásica formada por catorce versos endecasílabos.' },
      { answer: 'ENSAYO', clue: 'Texto expositivo y argumentativo sobre un tema filosófico o cultural.' },
      { answer: 'BIBLIOTECA', clue: 'Lugar donde se conserva, clasifica y consulta un fondo de libros.' },
      { answer: 'CRONICA', clue: 'Narración de hechos históricos según el orden en que ocurrieron.' },
      { answer: 'PROLOGO', clue: 'Texto preliminar que precede a una obra literaria para presentarla.' },
      { answer: 'RIMA', clue: 'Semejanza acústica entre las terminaciones de dos versos poéticos.' },
      { answer: 'FABULA', clue: 'Relato breve de ficción protagonizado por animales con moraleja.' },
      { answer: 'CAPITULO', clue: 'División principal en la que se fragmenta el texto de una novela.' },
      { answer: 'POEMA', clue: 'Obra poética concluida escrita habitualmente en verso.' },
      { answer: 'NERUDA', clue: 'Poeta chileno galardonado con el Premio Nobel en 1971.' },
    ],
  },
  {
    id: 'gastronomia-mundial',
    title: 'Cocina, Sabores y Gastronomía Mundial',
    theme: 'Gastronomía',
    difficulty: 'Fácil',
    description: 'Platos tradicionales, especias, ingredientes y artes culinarias.',
    pairs: [
      { answer: 'PAELLA', clue: 'Famoso plato español de arroz originario de la Comunidad Valenciana.' },
      { answer: 'PIZZA', clue: 'Masa horneada italiana cubierta con salsa de tomate y queso.' },
      { answer: 'SUSHI', clue: 'Especialidad gastronómica japonesa con base de arroz avinagrado.' },
      { answer: 'TACOS', clue: 'Platillo tradicional mexicano servido en tortillas de maíz.' },
      { answer: 'QUESO', clue: 'Producto lácteo obtenido por maduración de la cuajada de leche.' },
      { answer: 'CHOCOLATE', clue: 'Dulce elaborado a base de pasta y manteca de cacao.' },
      { answer: 'ACEITE', clue: 'Líquido graso, especialmente el de oliva virgen extra.' },
      { answer: 'ESPECIAS', clue: 'Sustancias aromáticas vegetales usadas para sazonar guisos.' },
      { answer: 'POSTRE', clue: 'Plato dulce que se sirve habitualmente al concluir la comida.' },
      { answer: 'HORNO', clue: 'Electrodoméstico o cámara caliente utilizada para cocer alimentos.' },
      { answer: 'CEVICHE', clue: 'Plato peruano de pescado crudo marinado en zumo de cítricos.' },
      { answer: 'AREPA', clue: 'Torta de masa de maíz molido tradicional de Venezuela y Colombia.' },
      { answer: 'ENCHILADA', clue: 'Tortilla enrollada rellena de carne o queso y bañada en salsa picante.' },
      { answer: 'BAGUETTE', clue: 'Barra de pan alargada y crujiente de origen francés.' },
      { answer: 'RAMEN', clue: 'Sopa japonesa de fideos de trigo servida con caldo, carne y huevo.' },
      { answer: 'RISOTTO', clue: 'Cremoso plato de arroz tradicional del norte de Italia.' },
      { answer: 'OREGANO', clue: 'Hierba aromática mediterránea muy empleada en pizzas y pastas.' },
      { answer: 'CARAMELO', clue: 'Azúcar derretido por cocción que toma color dorado y textura dulce.' },
      { answer: 'PARRILLA', clue: 'Rejilla metálica sobre brasas para asar carnes o pescados.' },
      { answer: 'CANELA', clue: 'Especia dulce obtenida de la corteza desecada de un árbol tropical.' },
    ],
  },
  {
    id: 'deportes-juegos',
    title: 'Deportes, Campeonatos y Juegos Olímpicos',
    theme: 'Deportes',
    difficulty: 'Fácil',
    description: 'Disciplinas olímpicas, balones, torneos y atletas destacados.',
    pairs: [
      { answer: 'FUTBOL', clue: 'El deporte de once contra once más popular del mundo.' },
      { answer: 'MEDALLA', clue: 'Presea de oro, plata o bronce otorgada a los mejores atletas.' },
      { answer: 'BALON', clue: 'Esfera reglamentaria utilizada en numerosos deportes de equipo.' },
      { answer: 'TENIS', clue: 'Deporte de raqueta disputado en pistas de hierba, tierra o dura.' },
      { answer: 'ATLETA', clue: 'Persona que practica deporte con alto rendimiento físico.' },
      { answer: 'CARRERA', clue: 'Competición de velocidad entre corredores o vehículos.' },
      { answer: 'ESTADIO', clue: 'Recinto con graderíos donde se celebran espectáculos deportivos.' },
      { answer: 'GOL', clue: 'Máximo objetivo y tanto anotado en un partido de balompié.' },
      { answer: 'CAMPEON', clue: 'Persona o equipo vencedor de un torneo o campeonato.' },
      { answer: 'ARBITRO', clue: 'Juez encargado de vigilar y hacer cumplir las reglas del juego.' },
      { answer: 'NATACION', clue: 'Deporte acuático que consiste en desplazarse en el agua sin tocar fondo.' },
      { answer: 'BASKET', clue: 'Deporte donde se encesta un balón en una canasta elevada.' },
      { answer: 'CICLISMO', clue: 'Deporte practicado sobre bicicleta en ruta, pista o montaña.' },
      { answer: 'VOLEIBOL', clue: 'Juego de dos equipos que pasan el balón con las manos sobre una red.' },
      { answer: 'MARATON', clue: 'Prueba mítica atlética de fondo de 42,195 kilómetros.' },
      { answer: 'GIMNASIA', clue: 'Disciplina deportiva basada en ejercicios de fuerza, equilibrio y flexibilidad.' },
      { answer: 'RAQUETA', clue: 'Instrumento provisto de red tensada con mango usado en el tenis.' },
      { answer: 'TROFEO', clue: 'Copa o galardón entregado como premio de una victoria.' },
      { answer: 'ESQUINA', clue: 'Tiro de córner concedido en el fútbol cuando el balón sale por la línea de meta.' },
      { answer: 'BOXEO', clue: 'Deporte de combate donde dos púgiles pelean con guantes reglamentarios.' },
    ],
  },
  {
    id: 'mitologia-leyendas',
    title: 'Mitología, Dioses y Leyendas Antiguas',
    theme: 'Mitología',
    difficulty: 'Medio',
    description: 'Dioses del Olimpo, monstruos míticos, héroes y sagas nórdicas.',
    pairs: [
      { answer: 'ZEUS', clue: 'Rey supremo de los dioses del Olimpo y señor del trueno.' },
      { answer: 'THOR', clue: 'Dios nórdico del trueno que empuña el martillo mágico Mjolnir.' },
      { answer: 'OLIMPO', clue: 'Monte mítico residencia sagrada de las divinidades griegas.' },
      { answer: 'CENTAURO', clue: 'Ser mitológico con torso humano y cuerpo de caballo.' },
      { answer: 'SIRENA', clue: 'Criatura mítica marina con cuerpo de pez y voz seductora.' },
      { answer: 'MINOTAURO', clue: 'Monstruo con cabeza de toro recluido en el laberinto de Creta.' },
      { answer: 'DRAGON', clue: 'Reptil alado mitológico capaz de volar y escupir fuego.' },
      { answer: 'HADES', clue: 'Dios griego del inframundo y soberano del reino de los muertos.' },
      { answer: 'PEGASO', clue: 'Caballo alado nacido de la sangre derramada de Medusa.' },
      { answer: 'MEDUSA', clue: 'Gorgona cuya mirada directa convertía en piedra a los hombres.' },
      { answer: 'FENIX', clue: 'Ave fabulosa que renace gloriosamente de sus propias cenizas.' },
      { answer: 'TITAN', clue: 'Cada uno de los gigantescos dioses que precedieron a los olímpicos.' },
      { answer: 'ODIN', clue: 'Padre de todos los dioses y rey de Asgard en la mitología nórdica.' },
      { answer: 'APOLO', clue: 'Dios griego de la luz solar, las artes, la música y la profecía.' },
      { answer: 'POSEIDON', clue: 'Dios de los mares, tormentas y terremotos armado con su tridente.' },
      { answer: 'HEROE', clue: 'Personaje de valor legendario y hazañas extraordinarias como Hércules.' },
      { answer: 'LABERINTO', clue: 'Compleja red de pasillos engañosos diseñada por Dédalo.' },
      { answer: 'ESFINGE', clue: 'Monstruo alado con cuerpo de león y rostro de mujer que proponía enigmas.' },
      { answer: 'VALHALA', clue: 'Majestuoso salón celestial donde van los guerreros nórdicos caídos.' },
      { answer: 'CERBERO', clue: 'Perro mítico de tres cabezas que custodiaba las puertas del inframundo.' },
    ],
  },
  {
    id: 'musica-arte',
    title: 'Música, Pintura y Bellas Artes',
    theme: 'Arte',
    difficulty: 'Medio',
    description: 'Instrumentos, armonías, lienzos, esculturas y maestros universales.',
    pairs: [
      { answer: 'GUITARRA', clue: 'Instrumento de cuerda pulsada con mástil y caja de resonancia.' },
      { answer: 'PIANO', clue: 'Instrumento de teclado y cuerdas percutidas inventado por Cristofori.' },
      { answer: 'MOZART', clue: 'Genial compositor austríaco del clasicismo musical universal.' },
      { answer: 'OLEO', clue: 'Técnica pictórica que mezcla pigmentos molidos con aceites secantes.' },
      { answer: 'ESCULTURA', clue: 'Arte de modelar, tallar o esculpir figuras en piedra, barro o bronce.' },
      { answer: 'SINFONIA', clue: 'Composición musical orquestal de grandes proporciones en varios movimientos.' },
      { answer: 'RITMO', clue: 'Orden acompasado en la sucesión de notas, golpes o compases musicales.' },
      { answer: 'JAZZ', clue: 'Género musical afroamericano caracterizado por la improvisación.' },
      { answer: 'FLAUTA', clue: 'Instrumento de viento madera tubular provisto de orificios digitables.' },
      { answer: 'VIOLIN', clue: 'Instrumento agudo de cuatro cuerdas frotadas con arco.' },
      { answer: 'LIENZO', clue: 'Tela preparada sobre bastidor sobre la que pinta el artista.' },
      { answer: 'RETRATO', clue: 'Pintura o representación fiel de la figura y rostro de una persona.' },
      { answer: 'PINCEL', clue: 'Herramienta de pelo sujeta a un mango empleada para aplicar color.' },
      { answer: 'PARTITURA', clue: 'Documento escrito donde se plasman las notas de una obra musical.' },
      { answer: 'OPERA', clue: 'Obra teatral dramática cantada por completo con acompañamiento orquestal.' },
      { answer: 'MURAL', clue: 'Pintura monumental ejecutada directamente sobre una pared o muro.' },
      { answer: 'ARMONIA', clue: 'Combinación simultánea y acorde de diferentes notas musicales.' },
      { answer: 'COMPAS', clue: 'Unidad métrica que divide el tiempo en partes iguales en la música.' },
      { answer: 'MUSEO', clue: 'Institución pública dedicada a conservar y exhibir obras artísticas.' },
      { answer: 'BATUTA', clue: 'Varita delgada empleada por el director de orquesta para marcar el compás.' },
    ],
  },
  {
    id: 'mexico-latam',
    title: 'Cultura Mexicana y Tradiciones de América Latina',
    theme: 'Tradiciones',
    difficulty: 'Fácil',
    description: 'Símbolos prehispánicos, música folclórica, gastronomía y festividades.',
    pairs: [
      { answer: 'PIRAMIDES', clue: 'Monumentales estructuras ceremoniales de Teotihuacán y Chichén Itzá.' },
      { answer: 'MARIACHI', clue: 'Conjunto musical típico mexicano con trompetas, violines y guitarrones.' },
      { answer: 'AZTECA', clue: 'Pueblo guerrero que fundó la majestuosa ciudad de Tenochtitlan.' },
      { answer: 'TEQUILA', clue: 'Bebida destilada mexicana obtenida de la fermentación del agave azul.' },
      { answer: 'GUACAMOLE', clue: 'Salsa mexicana cremosa a base de aguacate machacado, cebolla y limón.' },
      { answer: 'CENOTE', clue: 'Hoyo o pozo natural de agua dulce sagrado en la península de Yucatán.' },
      { answer: 'MAYA', clue: 'Civilización precolombina destacada por su astronomía, arte y escritura.' },
      { answer: 'ALEBRIJE', clue: 'Artesanía mexicana fantástica de madera o papel maché con figuras quiméricas.' },
      { answer: 'ZOCALO', clue: 'Plaza principal o plaza mayor en las ciudades mexicanas.' },
      { answer: 'CHILE', clue: 'Fruto picante indispensable en la sazón y gastronomía latinoamericana.' },
      { answer: 'NOPAL', clue: 'Cactácea emblemática de México presente en el escudo nacional.' },
      { answer: 'CATRINA', clue: 'Figura esquelética elegante creada por Posada símbolo del Día de Muertos.' },
      { answer: 'HUAPANGO', clue: 'Ritmo y baile tradicional mexicano de las regiones de la Huasteca.' },
      { answer: 'SERAPE', clue: 'Prenda tradicional mexicana de lana o algodón similar a una manta o poncho.' },
      { answer: 'TAMAL', clue: 'Masa de maíz rellena envuelta en hojas de maíz o plátano y cocida al vapor.' },
      { answer: 'AGAVE', clue: 'Planta suculenta de hojas espinosas de la que se extrae mezcal y tequila.' },
      { answer: 'PIÑATA', clue: 'Olla de barro o cartón decorada llena de dulces rota en los festejos.' },
      { answer: 'FIESTA', clue: 'Celebración festiva popular con música, baile y comida tradicional.' },
      { answer: 'REBOZO', clue: 'Prenda femenina alargada de tela usada como chal tradicional.' },
      { answer: 'MOLCAJETE', clue: 'Mortero tradicional de piedra volcánica empleado para triturar salsas.' },
    ],
  },
  {
    id: 'tecnologia-futuro',
    title: 'Tecnología, Algoritmos e Internet',
    theme: 'Tecnología',
    difficulty: 'Medio',
    description: 'Inteligencia artificial, computación, redes, satélites y era digital.',
    pairs: [
      { answer: 'ROBOTICA', clue: 'Técnica y ciencia que diseña y construye robots automáticos.' },
      { answer: 'CODIGO', clue: 'Conjunto de instrucciones comprensibles escritas para un programa.' },
      { answer: 'CHIP', clue: 'Circuito integrado de silicio miniaturizado que procesa datos.' },
      { answer: 'SATELITE', clue: 'Artefacto espacial puesto en órbita para telecomunicaciones.' },
      { answer: 'ALGORITMO', clue: 'Conjunto ordenado de pasos lógicos finitos para resolver un problema.' },
      { answer: 'NUBE', clue: 'Almacenamiento y procesamiento de datos en servidores remotos.' },
      { answer: 'PIXEL', clue: 'Unidad mínima homogénea de color que compone una imagen digital.' },
      { answer: 'INTERNET', clue: 'Red informática descentralizada de alcance planetario.' },
      { answer: 'DATOS', clue: 'Unidades de información cuantitativa o cualitativa procesadas.' },
      { answer: 'SERVIDOR', clue: 'Computadora central que provee servicios y recursos a otras en red.' },
      { answer: 'PANTALLA', clue: 'Superficie electrónica donde se visualizan imágenes e interfaces.' },
      { answer: 'FIBRA', clue: 'Filamento de vidrio que transmite datos a la velocidad de la luz.' },
      { answer: 'MEMORIA', clue: 'Componente que almacena instrucciones y datos temporales o fijos.' },
      { answer: 'VIRUS', clue: 'Programa malicioso que se reproduce alterando el funcionamiento del sistema.' },
      { answer: 'SENSOR', clue: 'Dispositivo capaz de detectar magnitudes físicas como luz o calor.' },
      { answer: 'BIT', clue: 'Unidad elemental de información binaria que toma valores de cero o uno.' },
      { answer: 'REDES', clue: 'Conjunto de nodos y dispositivos interconectados para compartir datos.' },
      { answer: 'CURSOR', clue: 'Indicador visual móvil en la pantalla controlado por el ratón o teclado.' },
      { answer: 'MODEM', clue: 'Dispositivo que modula y demodula señales para conectarse a la red.' },
      { answer: 'ENLACE', clue: 'Hipervínculo que conecta un documento digital con otro en la web.' },
    ],
  },
  {
    id: 'anatomia-salud',
    title: 'Anatomía Humana, Salud y Bienestar',
    theme: 'Anatomía',
    difficulty: 'Medio',
    description: 'Órganos, sistemas vitales, neuronas, huesos y fisiología humana.',
    pairs: [
      { answer: 'CORAZON', clue: 'Órgano muscular central que bombea la sangre a todo el organismo.' },
      { answer: 'CEREBRO', clue: 'Centro supremo de control del sistema nervioso y del pensamiento.' },
      { answer: 'NEURONA', clue: 'Célula fundamental del tejido nervioso que transmite impulsos eléctricos.' },
      { answer: 'PULMON', clue: 'Órgano esponjoso responsable del intercambio gaseoso y la respiración.' },
      { answer: 'CELULA', clue: 'Unidad morfológica y funcional fundamental de todos los seres vivos.' },
      { answer: 'SANGRE', clue: 'Líquido rojo que transporta oxígeno, nutrientes y células de defensa.' },
      { answer: 'ARTERIA', clue: 'Vaso sanguíneo que conduce la sangre oxigenada desde el corazón.' },
      { answer: 'HUESO', clue: 'Pieza dura y resistente que conforma el esqueleto de los vertebrados.' },
      { answer: 'MUSCULO', clue: 'Tejido contráctil que produce el movimiento del cuerpo.' },
      { answer: 'RETINA', clue: 'Capa sensible a la luz en el fondo del ojo que capta las imágenes.' },
      { answer: 'CRANEO', clue: 'Estructura ósea que encierra y protege el encéfalo en la cabeza.' },
      { answer: 'HIGADO', clue: 'Órgano glandular voluminoso que metaboliza toxinas y produce bilis.' },
      { answer: 'PIEL', clue: 'El órgano más extenso del cuerpo humano que actúa como barrera protectora.' },
      { answer: 'DIENTE', clue: 'Cuerpo duro engastado en las mandíbulas utilizado para masticar.' },
      { answer: 'NERVIO', clue: 'Cordón de fibras que transmite sensaciones y respuestas motoras.' },
      { answer: 'ESQUELETO', clue: 'armazón ósea interna que sostiene el cuerpo y protege órganos vitales.' },
      { answer: 'VENA', clue: 'Vaso que transporta la sangre desoxigenada de retorno hacia el corazón.' },
      { answer: 'ESTOMAGO', clue: 'Porción dilatada del tubo digestivo donde se procesan los alimentos.' },
      { answer: 'RIÑON', clue: 'Órgano par que filtra la sangre y elimina desechos mediante la orina.' },
      { answer: 'TIROIDES', clue: 'Glándula endocrina situada en el cuello que regula el metabolismo.' },
    ],
  },
  {
    id: 'clima-planeta',
    title: 'Planeta Tierra, Climas y Fenómenos Naturales',
    theme: 'Naturaleza',
    difficulty: 'Fácil',
    description: 'Vientos, huracanes, glaciares, auroras y maravillas climáticas.',
    pairs: [
      { answer: 'TORNADO', clue: 'Columna de aire de alta velocidad angular en contacto con la tierra.' },
      { answer: 'GLACIAR', clue: 'Masa gruesa de hielo perenne que fluye lentamente por gravedad.' },
      { answer: 'HURACAN', clue: 'Ciclón tropical gigante con vientos huracanados y lluvias torrenciales.' },
      { answer: 'TSUNAMI', clue: 'Ola gigante causada por un terremoto o erupción volcánica submarina.' },
      { answer: 'CORDILLERA', clue: 'Sucesión continua de montañas enlazadas entre sí.' },
      { answer: 'GOLFO', clue: 'Gran porción de mar internada en la tierra entre dos cabos.' },
      { answer: 'DESIERTO', clue: 'Región árida con precipitaciones escasas y vegetación xerófila.' },
      { answer: 'AURORA', clue: 'Brillo o luminiscencia nocturna polar causada por viento solar.' },
      { answer: 'RELAMPAGO', clue: 'Resplandor vivísimo e instantáneo producido por una descarga eléctrica.' },
      { answer: 'BRISA', clue: 'Viento suave, fresco y apacible que sopla habitualmente en la costa.' },
      { answer: 'NIEVE', clue: 'Precipitación en forma de copos blancos de cristales de hielo.' },
      { answer: 'NIEBLA', clue: 'Nube baja en contacto con el suelo que reduce la visibilidad.' },
      { answer: 'ARCOIRIS', clue: 'Arco de colores en el cielo producido por la refracción de la luz en la lluvia.' },
      { answer: 'MONZON', clue: 'Viento estacional periódico del sur de Asia que trae copiosas lluvias.' },
      { answer: 'GEYSER', clue: 'Fuente termal que emite periódicamente una columna de agua hirviendo.' },
      { answer: 'CAÑON', clue: 'Garganta profunda de paredes escarpadas excavada por un río.' },
      { answer: 'ESTEPA', clue: 'Planicie extensa de vegetación herbácea propia de climas secos.' },
      { answer: 'GRANIZO', clue: 'Precipitación en forma de bolas o trozos de hielo duro.' },
      { answer: 'TERREMOTO', clue: 'Sacudida brusca de la corteza terrestre por liberación de energía sísmica.' },
      { answer: 'CLIMA', clue: 'Conjunto de condiciones meteorológicas medias características de una zona.' },
    ],
  },
];

export function getThematicPack(query: string): ThematicPack {
  const q = query.toLowerCase();
  const match = THEMATIC_PACKS.find(
    p => p.theme.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.id.includes(q)
  );
  if (match) return match;
  // Return random
  const idx = Math.floor(Math.random() * THEMATIC_PACKS.length);
  return THEMATIC_PACKS[idx];
}
