/**
 * Path data extracted from original HTML animations
 * Used by line drawing animations for both logo and text targets
 */

export interface PathPoint {
  x: number;
  y: number;
  type?: 'L' | 'Q' | 'A';
  // For quadratic curves
  cx?: number;
  cy?: number;
  // For arcs
  rx?: number;
  ry?: number;
  rotation?: number;
  largeArc?: 0 | 1;
  sweep?: 0 | 1;
}

export interface LineData {
  startX: number;
  startY: number;
  points: PathPoint[];
  color: string;
  delay: number;
  duration: number;
  foldDuration?: number;
}

// Color constants
export const CYAN = '#00d4ff';
export const PURPLE = '#7b2ff7';
export const PINK = '#ff2d75';
export const RED = '#ff2d75';
export const ORANGE = '#ff8c42';
export const YELLOW = '#ffd93d';

/**
 * Logo path data - loom99 logo
 */
export const LOGO_PATHS: LineData[] = [
  // L - from top left, shoots in
  {
    startX: -100,
    startY: 100,
    points: [
      { x: 40, y: 40 },
      { x: 40, y: 160 },
      { x: 100, y: 160 },
    ],
    color: CYAN,
    delay: 0,
    duration: 400,
    foldDuration: 180,
  },
  // O (first) - from left, swoops into circle
  {
    startX: -100,
    startY: 100,
    points: [
      { x: 150, y: 60 },
      { type: 'A', rx: 40, ry: 40, rotation: 0, largeArc: 1, sweep: 1, x: 150, y: 140 },
      { type: 'A', rx: 40, ry: 40, rotation: 0, largeArc: 1, sweep: 1, x: 150, y: 60 },
    ],
    color: PURPLE,
    delay: 80,
    duration: 400,
    foldDuration: 180,
  },
  // O (second) - from top, drops and curves
  {
    startX: 240,
    startY: -50,
    points: [
      { x: 240, y: 60 },
      { type: 'A', rx: 40, ry: 40, rotation: 0, largeArc: 1, sweep: 1, x: 240, y: 140 },
      { type: 'A', rx: 40, ry: 40, rotation: 0, largeArc: 1, sweep: 1, x: 240, y: 60 },
    ],
    color: PURPLE,
    delay: 160,
    duration: 400,
    foldDuration: 180,
  },
  // M - from top right, sweeps down
  {
    startX: 350,
    startY: -50,
    points: [
      { x: 300, y: 160 },
      { x: 300, y: 40 },
      { x: 350, y: 100 },
      { x: 400, y: 40 },
      { x: 400, y: 160 },
    ],
    color: PINK,
    delay: 240,
    duration: 400,
    foldDuration: 180,
  },
  // 9 (first) - from right, spirals in - curved flowing design
  {
    startX: 700,
    startY: 100,
    points: [
      { x: 460, y: 70 },
      { type: 'Q', cx: 460, cy: 45, x: 480, y: 45 },
      { type: 'Q', cx: 500, cy: 45, x: 500, y: 70 },
      { type: 'Q', cx: 500, cy: 95, x: 480, y: 95 },
      { type: 'Q', cx: 460, cy: 95, x: 460, y: 70 },
      { x: 500, y: 70 },
      { type: 'Q', cx: 500, cy: 110, x: 485, y: 135 },
      { type: 'Q', cx: 470, cy: 160, x: 445, y: 165 },
    ],
    color: CYAN,
    delay: 320,
    duration: 400,
    foldDuration: 180,
  },
  // 9 (second) - from bottom right, shoots up - curved flowing design
  {
    startX: 650,
    startY: 250,
    points: [
      { x: 540, y: 70 },
      { type: 'Q', cx: 540, cy: 45, x: 560, y: 45 },
      { type: 'Q', cx: 580, cy: 45, x: 580, y: 70 },
      { type: 'Q', cx: 580, cy: 95, x: 560, y: 95 },
      { type: 'Q', cx: 540, cy: 95, x: 540, y: 70 },
      { x: 580, y: 70 },
      { type: 'Q', cx: 580, cy: 110, x: 565, y: 135 },
      { type: 'Q', cx: 550, cy: 160, x: 525, y: 165 },
    ],
    color: CYAN,
    delay: 400,
    duration: 400,
    foldDuration: 180,
  },
];

/**
 * Text path data - "DO MORE NOW" text
 */
export const TEXT_PATHS: LineData[] = [
  // ===== DO =====
  // D - vertical
  {
    startX: -150,
    startY: 70,
    points: [
      { x: 100, y: 20 },
      { x: 100, y: 100 },
    ],
    color: RED,
    delay: 0,
    duration: 400,
    foldDuration: 180,
  },
  // D - curve
  {
    startX: 350,
    startY: 70,
    points: [
      { x: 100, y: 20 },
      { type: 'Q', cx: 160, cy: 20, x: 160, y: 60 },
      { type: 'Q', cx: 160, cy: 100, x: 100, y: 100 },
    ],
    color: RED,
    delay: 20,
    duration: 400,
    foldDuration: 180,
  },
  // O - left arc
  {
    startX: -150,
    startY: 70,
    points: [
      { x: 200, y: 60 },
      { type: 'Q', cx: 200, cy: 20, x: 240, y: 20 },
      { type: 'Q', cx: 280, cy: 20, x: 280, y: 60 },
    ],
    color: RED,
    delay: 40,
    duration: 400,
    foldDuration: 180,
  },
  // O - right arc
  {
    startX: 500,
    startY: 70,
    points: [
      { x: 280, y: 60 },
      { type: 'Q', cx: 280, cy: 100, x: 240, y: 100 },
      { type: 'Q', cx: 200, cy: 100, x: 200, y: 60 },
    ],
    color: RED,
    delay: 50,
    duration: 400,
    foldDuration: 180,
  },

  // ===== MORE =====
  // M - left vertical
  {
    startX: -150,
    startY: 170,
    points: [
      { x: 80, y: 200 },
      { x: 80, y: 140 },
    ],
    color: ORANGE,
    delay: 450,
    duration: 400,
    foldDuration: 180,
  },
  // M - left diagonal
  {
    startX: -120,
    startY: 140,
    points: [
      { x: 80, y: 140 },
      { x: 110, y: 180 },
    ],
    color: ORANGE,
    delay: 460,
    duration: 400,
    foldDuration: 180,
  },
  // M - right diagonal
  {
    startX: 400,
    startY: 140,
    points: [
      { x: 110, y: 180 },
      { x: 140, y: 140 },
    ],
    color: ORANGE,
    delay: 470,
    duration: 400,
    foldDuration: 180,
  },
  // M - right vertical
  {
    startX: 400,
    startY: 170,
    points: [
      { x: 140, y: 140 },
      { x: 140, y: 200 },
    ],
    color: ORANGE,
    delay: 480,
    duration: 400,
    foldDuration: 180,
  },
  // O - left arc
  {
    startX: -100,
    startY: 170,
    points: [
      { x: 175, y: 170 },
      { type: 'Q', cx: 175, cy: 140, x: 200, y: 140 },
      { type: 'Q', cx: 225, cy: 140, x: 225, y: 170 },
    ],
    color: ORANGE,
    delay: 490,
    duration: 400,
    foldDuration: 180,
  },
  // O - right arc
  {
    startX: 400,
    startY: 170,
    points: [
      { x: 225, y: 170 },
      { type: 'Q', cx: 225, cy: 200, x: 200, y: 200 },
      { type: 'Q', cx: 175, cy: 200, x: 175, y: 170 },
    ],
    color: ORANGE,
    delay: 500,
    duration: 400,
    foldDuration: 180,
  },
  // R - vertical
  {
    startX: -150,
    startY: 170,
    points: [
      { x: 260, y: 140 },
      { x: 260, y: 200 },
    ],
    color: ORANGE,
    delay: 510,
    duration: 400,
    foldDuration: 180,
  },
  // R - top curve
  {
    startX: 400,
    startY: 155,
    points: [
      { x: 260, y: 140 },
      { type: 'Q', cx: 300, cy: 140, x: 300, y: 160 },
      { type: 'Q', cx: 300, cy: 175, x: 260, y: 175 },
    ],
    color: ORANGE,
    delay: 520,
    duration: 400,
    foldDuration: 180,
  },
  // R - leg
  {
    startX: 400,
    startY: 190,
    points: [
      { x: 270, y: 175 },
      { x: 300, y: 200 },
    ],
    color: ORANGE,
    delay: 530,
    duration: 400,
    foldDuration: 180,
  },
  // E - vertical
  {
    startX: -150,
    startY: 170,
    points: [
      { x: 330, y: 140 },
      { x: 330, y: 200 },
    ],
    color: ORANGE,
    delay: 540,
    duration: 400,
    foldDuration: 180,
  },
  // E - top horizontal
  {
    startX: 500,
    startY: 140,
    points: [
      { x: 330, y: 140 },
      { x: 370, y: 140 },
    ],
    color: ORANGE,
    delay: 550,
    duration: 400,
    foldDuration: 180,
  },
  // E - middle horizontal
  {
    startX: 500,
    startY: 170,
    points: [
      { x: 330, y: 170 },
      { x: 360, y: 170 },
    ],
    color: ORANGE,
    delay: 560,
    duration: 400,
    foldDuration: 180,
  },
  // E - bottom horizontal
  {
    startX: 500,
    startY: 200,
    points: [
      { x: 330, y: 200 },
      { x: 370, y: 200 },
    ],
    color: ORANGE,
    delay: 570,
    duration: 400,
    foldDuration: 180,
  },

  // ===== NOW =====
  // N - left vertical
  {
    startX: -150,
    startY: 240,
    points: [
      { x: 80, y: 220 },
      { x: 80, y: 280 },
    ],
    color: YELLOW,
    delay: 1020,
    duration: 400,
    foldDuration: 180,
  },
  // N - diagonal
  {
    startX: -100,
    startY: 240,
    points: [
      { x: 80, y: 220 },
      { x: 140, y: 280 },
    ],
    color: YELLOW,
    delay: 1030,
    duration: 400,
    foldDuration: 180,
  },
  // N - right vertical
  {
    startX: 800,
    startY: 240,
    points: [
      { x: 140, y: 220 },
      { x: 140, y: 280 },
    ],
    color: YELLOW,
    delay: 1040,
    duration: 400,
    foldDuration: 180,
  },
  // O - left arc
  {
    startX: -150,
    startY: 250,
    points: [
      { x: 180, y: 250 },
      { type: 'Q', cx: 180, cy: 220, x: 215, y: 220 },
      { type: 'Q', cx: 250, cy: 220, x: 250, y: 250 },
    ],
    color: YELLOW,
    delay: 1050,
    duration: 400,
    foldDuration: 180,
  },
  // O - right arc
  {
    startX: 800,
    startY: 250,
    points: [
      { x: 250, y: 250 },
      { type: 'Q', cx: 250, cy: 280, x: 215, y: 280 },
      { type: 'Q', cx: 180, cy: 280, x: 180, y: 250 },
    ],
    color: YELLOW,
    delay: 1060,
    duration: 400,
    foldDuration: 180,
  },
  // W - left vertical
  {
    startX: -150,
    startY: 240,
    points: [
      { x: 290, y: 220 },
      { x: 290, y: 280 },
    ],
    color: YELLOW,
    delay: 1070,
    duration: 400,
    foldDuration: 180,
  },
  // W - left diagonal
  {
    startX: -100,
    startY: 280,
    points: [
      { x: 290, y: 280 },
      { x: 310, y: 240 },
    ],
    color: YELLOW,
    delay: 1080,
    duration: 400,
    foldDuration: 180,
  },
  // W - middle diagonal
  {
    startX: 800,
    startY: 240,
    points: [
      { x: 310, y: 240 },
      { x: 330, y: 280 },
    ],
    color: YELLOW,
    delay: 1090,
    duration: 400,
    foldDuration: 180,
  },
  // W - right diagonal
  {
    startX: -100,
    startY: 280,
    points: [
      { x: 330, y: 280 },
      { x: 350, y: 240 },
    ],
    color: YELLOW,
    delay: 1100,
    duration: 400,
    foldDuration: 180,
  },
  // W - right vertical
  {
    startX: 800,
    startY: 240,
    points: [
      { x: 350, y: 240 },
      { x: 350, y: 280 },
    ],
    color: YELLOW,
    delay: 1110,
    duration: 400,
    foldDuration: 180,
  },
];

/**
 * Convert path points to SVG path string
 */
export function pathPointsToSVGPath(points: PathPoint[]): string {
  if (points.length === 0) return '';

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    if (point.type === 'Q' && point.cx !== undefined && point.cy !== undefined) {
      d += ` Q ${point.cx} ${point.cy} ${point.x} ${point.y}`;
    } else if (point.type === 'A') {
      d += ` A ${point.rx} ${point.ry} ${point.rotation} ${point.largeArc} ${point.sweep} ${point.x} ${point.y}`;
    } else {
      d += ` L ${point.x} ${point.y}`;
    }
  }

  return d;
}
