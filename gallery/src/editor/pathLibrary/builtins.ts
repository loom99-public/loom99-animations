/**
 * Built-in Path Definitions
 *
 * Converts existing hardcoded paths to PathEntry format.
 */

import { LOGO_PATHS, TEXT_PATHS, HEART_PATHS, pathPointsToSVGPath } from '../../data/pathData';
import type { PathEntry } from './types';
import type { LineData } from '../../data/pathData';

/**
 * Generate a simple SVG thumbnail from LineData[]
 */
function generateThumbnail(data: LineData[], viewBox: string = '0 0 600 200'): string {
  const paths = data.map((line, i) => {
    const d = pathPointsToSVGPath(line.points);
    return `<path d="M${line.startX} ${line.startY} ${d}" stroke="${line.color}" fill="none" stroke-width="3" stroke-linecap="round"/>`;
  }).join('\n');

  return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

/**
 * Create a PathEntry from LineData[]
 */
function createBuiltinEntry(
  id: string,
  name: string,
  data: LineData[],
  viewBox: string,
  description: string
): PathEntry {
  return {
    id: `builtin:${id}`,
    name,
    source: 'builtin',
    data,
    thumbnail: generateThumbnail(data, viewBox),
    createdAt: 0, // Built-ins have no creation time
    meta: {
      viewBox,
      description,
    },
  };
}

/**
 * Get all built-in path entries
 */
export function getBuiltinPaths(): PathEntry[] {
  return [
    createBuiltinEntry(
      'logo',
      'Loom99 Logo',
      LOGO_PATHS,
      '0 0 600 200',
      'The loom99 animated logo with neon colors'
    ),
    createBuiltinEntry(
      'text',
      'Do More Now',
      TEXT_PATHS,
      '0 0 800 300',
      'Motivational text "DO MORE NOW" in warm colors'
    ),
    createBuiltinEntry(
      'heart',
      'Heart',
      HEART_PATHS,
      '0 0 400 400',
      'Concentric heart shapes in red tones'
    ),
  ];
}

/**
 * Get a specific built-in by ID
 */
export function getBuiltinById(id: string): PathEntry | null {
  const builtins = getBuiltinPaths();
  return builtins.find(b => b.id === id) ?? null;
}
