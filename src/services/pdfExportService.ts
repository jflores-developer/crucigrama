import { jsPDF } from 'jspdf';
import { CrosswordPuzzle } from '../types/crossword';

export interface PdfExportOptions {
  includeSolutions?: boolean;
  blockedStyle?: 'inkSaver' | 'softGray' | 'classicDark';
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export function generateCrosswordPdf(
  puzzle: CrosswordPuzzle,
  options: PdfExportOptions = {}
): jsPDF {
  const {
    includeSolutions = false,
    blockedStyle = 'inkSaver', // Default to inkSaver to avoid printing black ink
    pageSize = 'a4',
  } = options;

  // Initialize jsPDF document in portrait mode (mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: pageSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // Header Title
  doc.setFont('times', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(20, 20, 20);
  doc.text(puzzle.title.toUpperCase(), margin, currentY);
  currentY += 6;

  // Subtitle / Metadata (No pills, clean editorial line)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const dateStr = new Date(puzzle.createdAt).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const metaText = `Temática: ${puzzle.theme}   ·   Dificultad: ${puzzle.difficulty}   ·   Dimensiones: ${puzzle.rows}x${puzzle.cols}   ·   ${dateStr}${includeSolutions ? '   ·   [HOJA DE SOLUCIONES]' : ''}`;
  doc.text(metaText, margin, currentY);
  currentY += 4;

  // Horizontal divider rule
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // Calculate grid dimension to fit nicely on upper half of page
  const maxGridWidth = pageWidth - (margin * 2);
  const maxGridHeight = 105; // mm allocated for grid
  const cellSizeByWidth = maxGridWidth / puzzle.cols;
  const cellSizeByHeight = maxGridHeight / puzzle.rows;
  const cellSize = Math.min(10.5, Math.min(cellSizeByWidth, cellSizeByHeight));

  const totalGridWidth = cellSize * puzzle.cols;
  const gridStartX = margin + (maxGridWidth - totalGridWidth) / 2;
  const gridStartY = currentY;

  // Draw Grid Cells
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const cell = puzzle.grid[r][c];
      const x = gridStartX + (c * cellSize);
      const y = gridStartY + (r * cellSize);

      if (cell.isBlocked) {
        if (blockedStyle === 'classicDark') {
          // Dark square
          doc.setFillColor(35, 35, 35);
          doc.rect(x, y, cellSize, cellSize, 'F');
        } else if (blockedStyle === 'softGray') {
          // Soft ink-saving 5% gray
          doc.setFillColor(243, 243, 243);
          doc.rect(x, y, cellSize, cellSize, 'F');
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.15);
          doc.rect(x, y, cellSize, cellSize, 'S');
        }
        // If 'inkSaver', we don't draw anything on blocked squares!
        // Leaves pure white paper: 0% ink wasted.
      } else {
        // Playable active letter cell
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, cellSize, cellSize, 'F');

        // Crisp cell border
        doc.setDrawColor(40, 40, 40);
        doc.setLineWidth(0.3);
        doc.rect(x, y, cellSize, cellSize, 'S');

        // Number in top-left
        if (cell.number) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(Math.max(5, cellSize * 0.7));
          doc.setTextColor(40, 40, 40);
          doc.text(String(cell.number), x + 0.8, y + (cellSize * 0.32));
        }

        // Solution letter if requested
        if (includeSolutions && cell.solution) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(Math.max(8, cellSize * 1.3));
          doc.setTextColor(20, 20, 20);
          doc.text(
            cell.solution,
            x + (cellSize / 2),
            y + (cellSize * 0.76),
            { align: 'center' }
          );
        }
      }
    }
  }

  currentY = gridStartY + (cellSize * puzzle.rows) + 8;

  // Clues Section: 2 Columns (Horizontales & Verticales)
  const colWidth = (pageWidth - (margin * 2) - 8) / 2;
  const col1X = margin;
  const col2X = margin + colWidth + 8;

  const acrossClues = puzzle.clues.filter(c => c.direction === 'across');
  const downClues = puzzle.clues.filter(c => c.direction === 'down');

  // Measure and render clues column
  const renderCluesColumn = (cluesList: typeof acrossClues, title: string, startX: number, startY: number): number => {
    let y = startY;

    // Header of column
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 30, 30);
    doc.text(title.toUpperCase(), startX, y);
    y += 1.5;

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(startX, y, startX + colWidth, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);

    for (const item of cluesList) {
      // Check for page overflow
      if (y > pageHeight - 14) {
        doc.addPage();
        y = margin;
      }

      const numPrefix = `${item.number}. `;
      const answerInfo = includeSolutions ? ` [${item.answer}]` : ` (${item.length})`;
      const fullText = `${numPrefix}${item.clue}${answerInfo}`;

      const lines = doc.splitTextToSize(fullText, colWidth);
      doc.text(lines, startX, y);
      y += (lines.length * 3.3) + 1.2;
    }

    return y;
  };

  const maxY1 = renderCluesColumn(acrossClues, 'Horizontales', col1X, currentY);
  const maxY2 = renderCluesColumn(downClues, 'Verticales', col2X, currentY);

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      'Crucigrama Pro  ·  Generador y archivo de crucigramas imprimibles',
      margin,
      pageHeight - 6
    );
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  return doc;
}
