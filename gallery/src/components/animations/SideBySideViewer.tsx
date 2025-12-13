/**
 * SideBySideViewer - Generic side-by-side comparison of HTML and V4 Pure animations
 *
 * Supports all animation techniques:
 * - 01: Line Drawing (SVG-based)
 * - 02: Particles (Canvas-based for HTML, SVG for V4)
 * - 03: Path Morph (SVG-based)
 * - 04: Glitch (Canvas-based)
 * - 05: Liquid (SVG with goo filter)
 * - 06: Kinetic (SVG with transforms)
 * - 07: 3D Transforms (SVG with CSS 3D)
 * - 08: Reveal Mask (SVG with mask)
 * - 09: Wave Ripple (SVG with transforms)
 * - 10: Typewriter (Canvas text)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { HtmlAnimatedLine } from '../../animations/HtmlAnimatedLine';
import { createOriginalHtmlLines, createVariedHtmlLines, renderVariedHtmlLines } from '../../animations/HtmlVariedAnimation';
import {
  // Line Morph
  compileOriginalLineDrawing,
  compileVariedLineDrawing,
  compileProceduralLineDrawing,
  createLineMorphPhaseMachine,
  getProgramDuration,
  // Particles
  compileOriginalParticles,
  compileVariedParticles,
  compileProceduralParticles,
  createParticlesPhaseMachine,
  getParticlesProgramDuration,
  // Path Morph
  compileOriginalPathMorph,
  compileVariedPathMorph,
  compileProceduralPathMorph,
  createPathMorphPhaseMachine,
  getPathMorphProgramDuration,
  // Glitch
  compileOriginalGlitch,
  compileVariedGlitch,
  compileProceduralGlitch,
  createGlitchPhaseMachine,
  getGlitchProgramDuration,
  getGlitchScene,
  // Liquid
  compileLiquid,
  createLiquidPhaseMachine,
  getLiquidProgramDuration,
  getLiquidScene,
  getLiquidViewport,
  createLiquidModeSystem,
  createProceduralLiquidModeSystem,
  createVariedLiquidModeSystem,
} from '../../anim-v4';
import type { RenderTree } from '../../anim-v4';
import { createSVGInterpreter, type SVGInterpreter } from '../../anim-v4/render/svg';
import { LOGO_PATHS, TEXT_PATHS, pathPointsToSVGPath } from '../../data/pathData';
import type { LineData } from '../../data/pathData';
import './SideBySideViewer.css';

export type TechniqueType = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10';

export interface SideBySideViewerProps {
  technique: string;
  target: 'logo' | 'text';
  variant: 'original' | 'varied' | 'procedural';
}

// =============================================================================
// Shared Utilities
// =============================================================================

function getViewBox(target: 'logo' | 'text'): string {
  return target === 'logo' ? '0 0 600 200' : '0 0 700 280';
}

function getDimensions(target: 'logo' | 'text'): { width: number; height: number } {
  return target === 'logo' ? { width: 600, height: 200 } : { width: 700, height: 280 };
}

function getEnv(target: 'logo' | 'text') {
  return target === 'logo'
    ? { viewport: { w: 600, h: 200 } }
    : { viewport: { w: 700, h: 280 } };
}

const DEFAULT_CONTEXT = {
  env: { viewport: { width: 600, height: 200 } },
  input: {
    pointer: { x: 0, y: 0, down: false },
    scrollY: 0,
    keysDown: new Set<string>(),
  },
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// Create seeded random
function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// =============================================================================
// Logo/Text Path Data
// =============================================================================

const LOGO_PATH_DATA = [
  { d: 'M 40 40 L 40 160 L 100 160', color: '#00d4ff' },
  { d: 'M 110 100 A 40 40 0 1 1 190 100 A 40 40 0 1 1 110 100', color: '#7b2ff7', cx: 150, cy: 100, r: 40 },
  { d: 'M 200 100 A 40 40 0 1 1 280 100 A 40 40 0 1 1 200 100', color: '#7b2ff7', cx: 240, cy: 100, r: 40 },
  { d: 'M 300 160 L 300 40 L 350 100 L 400 40 L 400 160', color: '#ff2d75' },
  { d: 'M 460 70 C 460 45, 500 45, 500 70 C 500 95, 460 95, 460 70 M 500 70 C 500 95, 495 130, 475 155 C 460 175, 440 170, 435 160', color: '#00d4ff' },
  { d: 'M 540 70 C 540 45, 580 45, 580 70 C 580 95, 540 95, 540 70 M 580 70 C 580 95, 575 130, 555 155 C 540 175, 520 170, 515 160', color: '#00d4ff' },
];

// =============================================================================
// HTML Particle Animation (for technique 02)
// =============================================================================

interface HtmlParticle {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  exitX: number;
  exitY: number;
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
  entranceDuration: number;
  exitDuration: number;
  delay: number;
}

type StartPattern = 'center-explosion' | 'top-rain' | 'side-converge';

function samplePathPoints(paths: LineData[], spacing: number = 4): { x: number; y: number; color: string }[] {
  const points: { x: number; y: number; color: string }[] = [];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '800');
  svg.setAttribute('height', '400');
  svg.style.position = 'absolute';
  svg.style.visibility = 'hidden';
  document.body.appendChild(svg);

  try {
    paths.forEach((lineData) => {
      const pathD = pathPointsToSVGPath(lineData.points);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathD);
      svg.appendChild(path);
      const totalLength = path.getTotalLength();
      for (let i = 0; i < totalLength; i += spacing) {
        const point = path.getPointAtLength(i);
        points.push({ x: point.x, y: point.y, color: lineData.color });
      }
    });
  } finally {
    document.body.removeChild(svg);
  }
  return points;
}

function createHtmlParticles(
  target: 'logo' | 'text',
  seed: number,
  variant: 'original' | 'varied' | 'procedural'
): { particles: HtmlParticle[]; duration: number } {
  const paths = target === 'logo' ? LOGO_PATHS : TEXT_PATHS;
  const { width, height } = getDimensions(target);
  const centerX = width / 2;
  const centerY = height / 2;

  const random = createSeededRandom(seed);
  const range = (min: number, max: number) => min + random() * (max - min);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  const varyPercent = (base: number, percent: number) => base * range(1 - percent, 1 + percent);

  const patterns: StartPattern[] = ['center-explosion', 'top-rain', 'side-converge'];
  const startPattern: StartPattern = variant === 'original'
    ? 'center-explosion'
    : pick(patterns);

  const sizeVariance = variant === 'original' ? 0 : variant === 'varied' ? 0.3 : 0.5;
  const spacingVariance = variant === 'original' ? 0 : variant === 'varied' ? 0.15 : 0.3;
  const durationVariance = variant === 'original' ? 0 : variant === 'varied' ? 0.2 : 0.4;

  const baseSpacing = 8;
  const spacing = variant === 'original' ? baseSpacing : varyPercent(baseSpacing, spacingVariance);
  const points = samplePathPoints(paths, spacing);

  const baseDuration = 2000;
  const duration = variant === 'original' ? baseDuration : varyPercent(baseDuration, durationVariance);

  const hueShift = variant === 'original' ? 0 : range(-10, 10);
  const shiftColor = (color: string): string => {
    if (hueShift === 0) return color;
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0;
      const l = (max + min) / 2;
      const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
      if (max !== min) {
        if (max === r) h = ((g - b) / (max - min)) % 6;
        else if (max === g) h = (b - r) / (max - min) + 2;
        else h = (r - g) / (max - min) + 4;
        h *= 60;
        if (h < 0) h += 360;
      }
      return { h, s: s * 100, l: l * 100 };
    };
    const { h, s, l } = hexToHsl(color);
    return `hsl(${(h + hueShift + 360) % 360}, ${s}%, ${l}%)`;
  };

  const particles = points.map((point) => {
    let startX: number, startY: number;

    if (startPattern === 'center-explosion') {
      const angle = random() * Math.PI * 2;
      const distance = 200 + random() * 200;
      startX = centerX + Math.cos(angle) * distance;
      startY = centerY + Math.sin(angle) * distance;
    } else if (startPattern === 'top-rain') {
      startX = range(0, width);
      startY = range(-300, -50);
    } else {
      const side = random() > 0.5 ? 'left' : 'right';
      startX = side === 'left' ? range(-300, -50) : range(width + 50, width + 300);
      startY = range(0, height);
    }

    const exitAngle = random() * Math.PI * 2;
    const exitDistance = 200 + random() * 200;

    return {
      startX, startY,
      targetX: point.x, targetY: point.y,
      exitX: point.x + Math.cos(exitAngle) * exitDistance,
      exitY: point.y + Math.sin(exitAngle) * exitDistance,
      x: startX, y: startY,
      color: shiftColor(point.color),
      size: variant === 'original' ? 2.5 : varyPercent(2.5, sizeVariance),
      opacity: 0,
      entranceDuration: duration,
      exitDuration: 250,
      delay: 0,
    };
  });

  return { particles, duration };
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: HtmlParticle[], width: number, height: number): void {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);
  particles.forEach((p) => {
    if (p.opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function updateHtmlParticles(particles: HtmlParticle[], elapsedMs: number, entranceMs: number, holdMs: number, exitMs: number): void {
  const holdStart = entranceMs;
  const exitStart = holdStart + holdMs;

  particles.forEach((p) => {
    if (elapsedMs < holdStart) {
      const adjustedElapsed = Math.max(0, elapsedMs - p.delay);
      const progress = Math.min(1, adjustedElapsed / p.entranceDuration);
      const eased = easeOutCubic(progress);
      p.x = p.startX + (p.targetX - p.startX) * eased;
      p.y = p.startY + (p.targetY - p.startY) * eased;
      p.opacity = Math.min(1, progress * 2);
    } else if (elapsedMs < exitStart) {
      p.x = p.targetX;
      p.y = p.targetY;
      p.opacity = 1;
    } else {
      const exitElapsed = elapsedMs - exitStart;
      const progress = Math.min(1, exitElapsed / p.exitDuration);
      const eased = easeInCubic(progress);
      p.x = p.targetX + (p.exitX - p.targetX) * eased;
      p.y = p.targetY + (p.exitY - p.targetY) * eased;
      p.opacity = 1 - eased;
    }
  });
}

// =============================================================================
// HTML Path Morph Animation (for technique 03)
// =============================================================================

interface HtmlMorphPath {
  id: string;
  targetD: string;
  startD: string;
  color: string;
  delay: number;
  duration: number;
  startOpacity: number;
  targetOpacity: number;
  startScale: number;
  targetScale: number;
  overallOpacity: number;
  centerX: number;
  centerY: number;
}

type StartShapeKind = 'circle' | 'square' | 'triangle' | 'star' | 'polygon';

function generateStartShape(
  kind: StartShapeKind,
  centerX: number,
  centerY: number,
  size: number,
  rot: number = 0,
  sides: number = 5
): string {
  switch (kind) {
    case 'circle': {
      const r = Math.max(1, size);
      return `M ${centerX - r} ${centerY} A ${r} ${r} 0 1 1 ${centerX + r} ${centerY} A ${r} ${r} 0 1 1 ${centerX - r} ${centerY}`;
    }
    case 'square': {
      const half = size;
      const corners = [
        { x: -half, y: -half },
        { x: half, y: -half },
        { x: half, y: half },
        { x: -half, y: half },
      ];
      const rotated = corners.map(c => ({
        x: centerX + c.x * Math.cos(rot) - c.y * Math.sin(rot),
        y: centerY + c.x * Math.sin(rot) + c.y * Math.cos(rot),
      }));
      return `M ${rotated[0].x} ${rotated[0].y} L ${rotated[1].x} ${rotated[1].y} L ${rotated[2].x} ${rotated[2].y} L ${rotated[3].x} ${rotated[3].y} Z`;
    }
    case 'triangle':
    case 'polygon': {
      const numSides = kind === 'triangle' ? 3 : sides;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < numSides; i++) {
        const angle = (i / numSides) * Math.PI * 2 - Math.PI / 2 + rot;
        points.push({
          x: centerX + Math.cos(angle) * size,
          y: centerY + Math.sin(angle) * size,
        });
      }
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }
      return d + ' Z';
    }
    case 'star': {
      const innerRadius = size * 0.4;
      const vertices: { x: number; y: number }[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 - Math.PI / 2 + rot;
        const r = i % 2 === 0 ? size : innerRadius;
        vertices.push({
          x: centerX + Math.cos(angle) * r,
          y: centerY + Math.sin(angle) * r,
        });
      }
      let d = `M ${vertices[0].x} ${vertices[0].y}`;
      for (let i = 1; i < vertices.length; i++) {
        d += ` L ${vertices[i].x} ${vertices[i].y}`;
      }
      return d + ' Z';
    }
    default:
      return generateStartShape('circle', centerX, centerY, size, rot);
  }
}

function computePathBounds(d: string): { centerX: number; centerY: number; size: number } {
  const numbers = d.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (numbers.length < 2) return { centerX: 300, centerY: 100, size: 30 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < numbers.length - 1; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1];
    if (isNaN(x) || isNaN(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!isFinite(minX)) return { centerX: 300, centerY: 100, size: 30 };

  const w = maxX - minX;
  const h = maxY - minY;
  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    size: 0.35 * Math.min(w, h),
  };
}

function createHtmlMorphPaths(
  target: 'logo' | 'text',
  seed: number,
  variant: 'original' | 'varied' | 'procedural'
): HtmlMorphPath[] {
  const paths = target === 'logo' ? LOGO_PATHS : TEXT_PATHS;

  const random = createSeededRandom(seed);
  const range = (min: number, max: number) => min + random() * (max - min);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(random() * arr.length)];

  const kinds: StartShapeKind[] = ['circle', 'square', 'triangle', 'star', 'polygon'];

  return paths.map((lineData, i) => {
    const targetD = pathPointsToSVGPath(lineData.points);
    const bounds = computePathBounds(targetD);

    const kind: StartShapeKind = variant === 'original'
      ? kinds[i % 3]
      : pick(kinds);

    const sizeVar = variant === 'original' ? 1 : range(0.8, 1.2);
    const rot = variant === 'original' ? 0 : random() * Math.PI * 2;
    const sides = kind === 'polygon' ? 3 + Math.floor(random() * 6) : 5;

    const startD = generateStartShape(kind, bounds.centerX, bounds.centerY, bounds.size * sizeVar, rot, sides);

    const baseDelay = (i / paths.length) * 500;
    const delayVar = variant === 'original' ? 0 : (random() - 0.5) * 200;
    const baseDuration = variant === 'original' ? 1200 : variant === 'varied' ? range(800, 2000) : range(600, 2400);

    return {
      id: `morph-path-${i}`,
      targetD,
      startD,
      color: lineData.color,
      delay: Math.max(0, baseDelay + delayVar),
      duration: baseDuration,
      startOpacity: 1,
      targetOpacity: 0,
      startScale: 1,
      targetScale: 0.8,
      overallOpacity: 1,
      centerX: bounds.centerX,
      centerY: bounds.centerY,
    };
  });
}

function updateHtmlMorphPaths(
  paths: HtmlMorphPath[],
  elapsedMs: number,
  entranceMs: number,
  holdMs: number,
  exitMs: number
): void {
  const holdStart = entranceMs;
  const exitStart = holdStart + holdMs;

  paths.forEach((p) => {
    if (elapsedMs < holdStart) {
      const adjustedElapsed = Math.max(0, elapsedMs - p.delay);
      const progress = Math.min(1, adjustedElapsed / p.duration);
      const eased = easeOutCubic(progress);

      // Crossfade: start shape fades out, target shape fades in
      p.startOpacity = 1 - eased;
      p.targetOpacity = eased;

      // Scale effects: start shrinks, target grows
      p.startScale = 1 - eased * 0.3;
      p.targetScale = 0.7 + eased * 0.3;

      p.overallOpacity = 1;
    } else if (elapsedMs < exitStart) {
      p.startOpacity = 0;
      p.targetOpacity = 1;
      p.startScale = 0.7;
      p.targetScale = 1;
      p.overallOpacity = 1;
    } else {
      const exitElapsed = elapsedMs - exitStart;
      const progress = Math.min(1, exitElapsed / exitMs);
      const eased = easeInCubic(progress);

      p.startOpacity = 0;
      p.targetOpacity = 1;
      p.startScale = 0.7;
      p.targetScale = 1;
      p.overallOpacity = 1 - eased;
    }
  });
}

function renderHtmlMorphPaths(svg: SVGSVGElement, paths: HtmlMorphPath[]): void {
  Array.from(svg.children).forEach(child => {
    if (child.tagName.toLowerCase() !== 'defs') {
      svg.removeChild(child);
    }
  });

  paths.forEach((p) => {
    // Create group for transforms
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('opacity', String(p.overallOpacity));

    // Render start shape (fading out)
    if (p.startOpacity > 0.01) {
      const startPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      startPath.setAttribute('d', p.startD);
      startPath.setAttribute('stroke', p.color);
      startPath.setAttribute('stroke-width', '4');
      startPath.setAttribute('fill', 'none');
      startPath.setAttribute('stroke-linecap', 'round');
      startPath.setAttribute('stroke-linejoin', 'round');
      startPath.setAttribute('opacity', String(p.startOpacity));
      startPath.setAttribute('transform', `translate(${p.centerX}, ${p.centerY}) scale(${p.startScale}) translate(${-p.centerX}, ${-p.centerY})`);
      startPath.setAttribute('filter', 'url(#morphGlow)');
      g.appendChild(startPath);
    }

    // Render target shape (fading in)
    if (p.targetOpacity > 0.01) {
      const targetPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      targetPath.setAttribute('d', p.targetD);
      targetPath.setAttribute('stroke', p.color);
      targetPath.setAttribute('stroke-width', '4');
      targetPath.setAttribute('fill', 'none');
      targetPath.setAttribute('stroke-linecap', 'round');
      targetPath.setAttribute('stroke-linejoin', 'round');
      targetPath.setAttribute('opacity', String(p.targetOpacity));
      targetPath.setAttribute('transform', `translate(${p.centerX}, ${p.centerY}) scale(${p.targetScale}) translate(${-p.centerX}, ${-p.centerY})`);
      targetPath.setAttribute('filter', 'url(#morphGlow)');
      g.appendChild(targetPath);
    }

    svg.appendChild(g);
  });
}

function createMorphDefs(svg: SVGSVGElement): void {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.setAttribute('id', 'morphGlow');
  filter.setAttribute('x', '-50%');
  filter.setAttribute('y', '-50%');
  filter.setAttribute('width', '200%');
  filter.setAttribute('height', '200%');

  const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
  blur.setAttribute('stdDeviation', '3');
  blur.setAttribute('result', 'blur');
  filter.appendChild(blur);

  const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
  const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  mergeNode1.setAttribute('in', 'blur');
  const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  mergeNode2.setAttribute('in', 'SourceGraphic');
  merge.appendChild(mergeNode1);
  merge.appendChild(mergeNode2);
  filter.appendChild(merge);

  defs.appendChild(filter);
  svg.appendChild(defs);
}

// =============================================================================
// Technique 04: Glitch Animation
// =============================================================================

interface GlitchState {
  glitchIntensity: number;
  jitterX: number;
  jitterY: number;
  rgbOffsets: { r: { x: number; y: number }; g: { x: number; y: number }; b: { x: number; y: number } };
  scanlineOpacity: number;
  corruptionBars: { y: number; height: number; opacity: number }[];
  logoOpacity: number;
}

function createGlitchState(): GlitchState {
  return {
    glitchIntensity: 1,
    jitterX: 0,
    jitterY: 0,
    rgbOffsets: { r: { x: 0, y: 0 }, g: { x: 0, y: 0 }, b: { x: 0, y: 0 } },
    scanlineOpacity: 0,
    corruptionBars: Array(5).fill(null).map(() => ({ y: 0, height: 3, opacity: 0 })),
    logoOpacity: 1,
  };
}

function updateGlitchState(
  state: GlitchState,
  elapsedMs: number,
  seed: number,
  variant: 'original' | 'varied' | 'procedural'
): void {
  const ENTRANCE_GLITCH_DURATION = 1200;
  const ENTRANCE_TOTAL_DURATION = 2000;
  const HOLD_DURATION = 2000;
  const EXIT_DURATION = 250;

  const holdStart = ENTRANCE_TOTAL_DURATION;
  const exitStart = holdStart + HOLD_DURATION;

  const random = createSeededRandom(seed + Math.floor(elapsedMs / 16));

  const intensityMult = variant === 'original' ? 1 : variant === 'varied' ? 1.2 : 1.5;

  if (elapsedMs < ENTRANCE_GLITCH_DURATION) {
    const intensity = (1 - (elapsedMs / ENTRANCE_GLITCH_DURATION)) * intensityMult;
    state.glitchIntensity = intensity;

    state.jitterX = (random() - 0.5) * 12 * intensity;
    state.jitterY = (random() - 0.5) * 12 * intensity;

    state.rgbOffsets = {
      r: { x: (random() - 0.5) * 30 * intensity, y: (random() - 0.5) * 30 * intensity },
      g: { x: (random() - 0.5) * 30 * intensity, y: (random() - 0.5) * 30 * intensity },
      b: { x: (random() - 0.5) * 30 * intensity, y: (random() - 0.5) * 30 * intensity },
    };

    state.scanlineOpacity = intensity * 0.8;

    state.corruptionBars.forEach(bar => {
      if (random() > 0.7) {
        bar.y = random() * 100;
        bar.height = 2 + random() * 6;
        bar.opacity = intensity * 0.9;
      } else {
        bar.opacity = 0;
      }
    });

    state.logoOpacity = 1;
  } else if (elapsedMs < holdStart) {
    const stabilize = (elapsedMs - ENTRANCE_GLITCH_DURATION) / (ENTRANCE_TOTAL_DURATION - ENTRANCE_GLITCH_DURATION);
    const intensity = (1 - stabilize) * 0.5 * intensityMult;
    state.glitchIntensity = intensity;

    state.jitterX = (random() - 0.5) * 3 * (1 - stabilize);
    state.jitterY = (random() - 0.5) * 3 * (1 - stabilize);

    state.rgbOffsets = {
      r: { x: (random() - 0.5) * 8 * (1 - stabilize), y: (random() - 0.5) * 8 * (1 - stabilize) },
      g: { x: (random() - 0.5) * 8 * (1 - stabilize), y: (random() - 0.5) * 8 * (1 - stabilize) },
      b: { x: (random() - 0.5) * 8 * (1 - stabilize), y: (random() - 0.5) * 8 * (1 - stabilize) },
    };

    state.scanlineOpacity = (1 - stabilize) * 0.4;
    state.corruptionBars.forEach(bar => { bar.opacity = (1 - stabilize) * 0.5; });
    state.logoOpacity = 1;
  } else if (elapsedMs < exitStart) {
    state.glitchIntensity = 0;
    state.jitterX = 0;
    state.jitterY = 0;
    state.rgbOffsets = { r: { x: 0, y: 0 }, g: { x: 0, y: 0 }, b: { x: 0, y: 0 } };
    state.scanlineOpacity = 0;
    state.corruptionBars.forEach(bar => { bar.opacity = 0; });
    state.logoOpacity = 1;
  } else {
    const exitElapsed = elapsedMs - exitStart;
    const progress = Math.min(1, exitElapsed / EXIT_DURATION);
    const intensity = (1 - progress) * 1.8 * intensityMult;
    state.glitchIntensity = intensity;

    state.jitterX = (random() - 0.5) * 25 * (1 - progress);
    state.jitterY = (random() - 0.5) * 25 * (1 - progress);

    state.rgbOffsets = {
      r: { x: (random() - 0.5) * 60 * (1 - progress), y: (random() - 0.5) * 60 * (1 - progress) },
      g: { x: (random() - 0.5) * 60 * (1 - progress), y: (random() - 0.5) * 60 * (1 - progress) },
      b: { x: (random() - 0.5) * 60 * (1 - progress), y: (random() - 0.5) * 60 * (1 - progress) },
    };

    state.scanlineOpacity = 1 - progress;
    state.corruptionBars.forEach(bar => {
      bar.y = random() * 100;
      bar.height = 3 + random() * 10;
      bar.opacity = 1 - progress;
    });
    state.logoOpacity = 1 - progress;
  }
}

function drawGlitch(ctx: CanvasRenderingContext2D, state: GlitchState, width: number, height: number): void {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(state.jitterX, state.jitterY);

  // Draw main logo
  ctx.globalAlpha = state.logoOpacity;
  drawLogoOnCanvas(ctx, width, height, 'url(#logoGradient)');

  // Draw RGB separated layers
  if (state.glitchIntensity > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Red channel
    ctx.save();
    ctx.translate(state.rgbOffsets.r.x, state.rgbOffsets.r.y);
    ctx.globalAlpha = state.glitchIntensity * 0.7;
    drawLogoOnCanvas(ctx, width, height, '#ff0000');
    ctx.restore();

    // Green channel
    ctx.save();
    ctx.translate(state.rgbOffsets.g.x, state.rgbOffsets.g.y);
    ctx.globalAlpha = state.glitchIntensity * 0.7;
    drawLogoOnCanvas(ctx, width, height, '#00ff00');
    ctx.restore();

    // Blue channel
    ctx.save();
    ctx.translate(state.rgbOffsets.b.x, state.rgbOffsets.b.y);
    ctx.globalAlpha = state.glitchIntensity * 0.7;
    drawLogoOnCanvas(ctx, width, height, '#0000ff');
    ctx.restore();

    ctx.restore();
  }

  ctx.restore();

  // Scanlines
  if (state.scanlineOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = state.scanlineOpacity;
    for (let y = 0; y < height; y += 4) {
      ctx.fillStyle = 'rgba(0, 255, 100, 0.05)';
      ctx.fillRect(0, y + 2, width, 2);
    }
    ctx.restore();
  }

  // Corruption bars
  state.corruptionBars.forEach(bar => {
    if (bar.opacity > 0.01) {
      ctx.save();
      ctx.globalAlpha = bar.opacity * 0.7;
      ctx.fillStyle = 'rgba(255, 0, 100, 0.7)';
      ctx.globalCompositeOperation = 'screen';
      ctx.fillRect(0, (bar.y / 100) * height, width, bar.height);
      ctx.restore();
    }
  });
}

function drawLogoOnCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, color: string): void {
  const scale = width / 600;

  ctx.save();
  ctx.scale(scale, scale);
  ctx.strokeStyle = color.startsWith('url') ? '#7b2ff7' : color;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // L
  ctx.beginPath();
  ctx.moveTo(40, 40);
  ctx.lineTo(40, 160);
  ctx.lineTo(100, 160);
  ctx.stroke();

  // O's
  ctx.beginPath();
  ctx.arc(150, 100, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(240, 100, 40, 0, Math.PI * 2);
  ctx.stroke();

  // M
  ctx.beginPath();
  ctx.moveTo(300, 160);
  ctx.lineTo(300, 40);
  ctx.lineTo(350, 100);
  ctx.lineTo(400, 40);
  ctx.lineTo(400, 160);
  ctx.stroke();

  // 9's (simplified)
  ctx.beginPath();
  ctx.arc(480, 70, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(500, 70);
  ctx.bezierCurveTo(500, 95, 495, 130, 475, 155);
  ctx.bezierCurveTo(460, 175, 440, 170, 435, 160);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(560, 70, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(580, 70);
  ctx.bezierCurveTo(580, 95, 575, 130, 555, 155);
  ctx.bezierCurveTo(540, 175, 520, 170, 515, 160);
  ctx.stroke();

  ctx.restore();
}

// =============================================================================
// Technique 05: Liquid Animation
// =============================================================================

interface LiquidBlob {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetR: number;
  x: number;
  y: number;
  r: number;
  hue: number;
  delay: number;
  duration: number;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleAmplitude: number;
  opacity: number;
  scaleY: number;
}

function createLiquidBlobs(target: 'logo' | 'text', seed: number, variant: 'original' | 'varied' | 'procedural'): LiquidBlob[] {
  const random = createSeededRandom(seed);
  const { width } = getDimensions(target);
  const blobs: LiquidBlob[] = [];

  const durationMult = variant === 'original' ? 1 : variant === 'varied' ? random() * 0.4 + 0.8 : random() * 0.6 + 0.7;

  const createBlob = (x: number, y: number, r: number, hue: number): LiquidBlob => ({
    startX: 300 + (random() - 0.5) * 150,
    startY: -50,
    targetX: x,
    targetY: y,
    targetR: r * (variant === 'original' ? 1 : 0.8 + random() * 0.4),
    x: 0,
    y: 0,
    r: 8,
    hue: hue + (variant === 'original' ? 0 : (random() - 0.5) * 20),
    delay: random() * 500,
    duration: (1500 + random() * 600) * durationMult,
    wobblePhase: random() * Math.PI * 2,
    wobbleSpeed: 0.8 + random() * 0.4,
    wobbleAmplitude: 3 + random() * 4,
    opacity: 1,
    scaleY: 1,
  });

  if (target === 'logo') {
    // L
    [[40, 60, 12], [40, 100, 12], [40, 140, 12], [70, 160, 12], [100, 160, 12]].forEach(([x, y, r]) => {
      blobs.push(createBlob(x, y, r, 190));
    });

    // O's
    for (let angle = 0; angle < 360; angle += 25) {
      const rad = angle * Math.PI / 180;
      blobs.push(createBlob(150 + Math.cos(rad) * 40, 100 + Math.sin(rad) * 40, 11, 280));
      blobs.push(createBlob(240 + Math.cos(rad) * 40, 100 + Math.sin(rad) * 40, 11, 280));
    }

    // M
    [[300, 60, 12], [300, 100, 12], [300, 140, 12],
     [325, 80, 10], [350, 100, 10], [375, 80, 10],
     [400, 60, 12], [400, 100, 12], [400, 140, 12]].forEach(([x, y, r]) => {
      blobs.push(createBlob(x, y, r, 330));
    });

    // 9's
    for (let angle = 0; angle < 360; angle += 35) {
      const rad = angle * Math.PI / 180;
      blobs.push(createBlob(480 + Math.cos(rad) * 20, 70 + Math.sin(rad) * 20, 9, 190));
      blobs.push(createBlob(560 + Math.cos(rad) * 20, 70 + Math.sin(rad) * 20, 9, 190));
    }
    [[490, 95, 9], [480, 115, 9], [465, 135, 9], [450, 155, 9], [440, 165, 8]].forEach(([x, y, r]) => {
      blobs.push(createBlob(x, y, r, 190));
    });
    [[570, 95, 9], [560, 115, 9], [545, 135, 9], [530, 155, 9], [520, 165, 8]].forEach(([x, y, r]) => {
      blobs.push(createBlob(x, y, r, 190));
    });
  } else {
    // Text mode - simplified blob pattern
    const textWidth = width * 0.8;
    const startX = width * 0.1;
    for (let i = 0; i < 60; i++) {
      const x = startX + (i % 12) * (textWidth / 12);
      const y = 80 + Math.floor(i / 12) * 30;
      blobs.push(createBlob(x, y, 10 + random() * 5, 190 + random() * 140));
    }
  }

  return blobs;
}

function updateLiquidBlobs(blobs: LiquidBlob[], elapsedMs: number): void {
  const ENTRANCE_DURATION = 3000;
  const HOLD_DURATION = 2000;
  const EXIT_DURATION = 250;
  const exitStart = ENTRANCE_DURATION + HOLD_DURATION;

  blobs.forEach((blob) => {
    if (elapsedMs < ENTRANCE_DURATION) {
      if (elapsedMs < blob.delay) {
        blob.r = 0;
        return;
      }

      const localTime = elapsedMs - blob.delay;
      const progress = Math.min(1, localTime / blob.duration);

      if (progress < 0.7) {
        const t = progress / 0.7;
        const dropEase = easeInCubic(t);
        const spreadEase = easeOutCubic(t);

        blob.y = blob.startY + (blob.targetY - blob.startY) * dropEase;
        blob.x = blob.startX + (blob.targetX - blob.startX) * spreadEase;
        blob.r = 8 + (blob.targetR - 8) * spreadEase;

        const wobble = Math.sin(localTime / 100 * blob.wobbleSpeed + blob.wobblePhase) * blob.wobbleAmplitude * (1 - spreadEase);
        blob.x += wobble;
      } else {
        const t = (progress - 0.7) / 0.3;
        const settleEase = easeInOutSine(t);

        blob.x = blob.x + (blob.targetX - blob.x) * settleEase;
        blob.y = blob.y + (blob.targetY - blob.y) * settleEase;
        blob.r = blob.r + (blob.targetR - blob.r) * settleEase;

        const wobble = Math.sin(localTime / 100 * blob.wobbleSpeed + blob.wobblePhase) * blob.wobbleAmplitude * (1 - t) * 0.5;
        blob.x += wobble;
      }
      blob.opacity = 1;
      blob.scaleY = 1;
    } else if (elapsedMs < exitStart) {
      blob.x = blob.targetX;
      blob.y = blob.targetY;
      blob.r = blob.targetR;
      blob.opacity = 1;
      blob.scaleY = 1;
    } else {
      const exitElapsed = elapsedMs - exitStart;
      const progress = Math.min(1, exitElapsed / EXIT_DURATION);

      blob.y = blob.targetY + 3 * exitElapsed * 0.5;
      const wobble = Math.sin(exitElapsed / 30 + blob.wobblePhase) * 5;
      blob.x = blob.targetX + wobble;
      blob.r = blob.targetR * (1 - progress);
      blob.scaleY = 1 + progress * 0.5;
      blob.opacity = 1 - progress;
    }
  });
}

function drawLiquidBlobs(ctx: CanvasRenderingContext2D, blobs: LiquidBlob[], width: number, height: number): void {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  blobs.forEach((blob) => {
    if (blob.r <= 0 || blob.opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = blob.opacity;
    ctx.fillStyle = `hsl(${blob.hue}, 80%, 60%)`;
    ctx.translate(blob.x, blob.y);
    ctx.scale(1, blob.scaleY);
    ctx.beginPath();
    ctx.arc(0, 0, blob.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// =============================================================================
// Technique 06: Kinetic Animation
// =============================================================================

interface KineticPart {
  element: typeof LOGO_PATH_DATA[0];
  centerX: number;
  centerY: number;
  startX: number;
  startY: number;
  startRotation: number;
  delay: number;
  exitAngle: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
}

function createKineticParts(seed: number, variant: 'original' | 'varied' | 'procedural'): KineticPart[] {
  const random = createSeededRandom(seed);
  const parts: KineticPart[] = [];

  LOGO_PATH_DATA.forEach((element, index) => {
    const angle = (index / LOGO_PATH_DATA.length) * Math.PI * 2;
    const distance = 400 * (variant === 'original' ? 1 : 0.8 + random() * 0.4);

    // Calculate center from path bounds
    let cx = 300, cy = 100;
    if (element.cx !== undefined && element.cy !== undefined) {
      cx = element.cx;
      cy = element.cy;
    } else {
      const bounds = computePathBounds(element.d);
      cx = bounds.centerX;
      cy = bounds.centerY;
    }

    parts.push({
      element,
      centerX: cx,
      centerY: cy,
      startX: Math.cos(angle) * distance,
      startY: Math.sin(angle) * distance,
      startRotation: (random() - 0.5) * 720 * (variant === 'original' ? 1 : 1 + random()),
      delay: index * (variant === 'original' ? 120 : 80 + random() * 80),
      exitAngle: angle + Math.PI,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 0,
      opacity: 0,
    });
  });

  return parts;
}

function updateKineticParts(parts: KineticPart[], elapsedMs: number): void {
  const ENTRANCE_DURATION = 1200;
  const TOTAL_ENTRANCE = 2500;
  const HOLD_DURATION = 2000;
  const EXIT_DURATION = 250;
  const exitStart = TOTAL_ENTRANCE + HOLD_DURATION;

  parts.forEach((part) => {
    if (elapsedMs < TOTAL_ENTRANCE) {
      if (elapsedMs < part.delay) {
        part.opacity = 0;
        return;
      }

      const localTime = elapsedMs - part.delay;
      const progress = Math.min(1, localTime / ENTRANCE_DURATION);
      const eased = easeOutBack(progress);

      part.x = part.startX * (1 - eased);
      part.y = part.startY * (1 - eased);
      part.rotation = part.startRotation * (1 - eased);
      part.scale = eased;
      part.opacity = Math.min(1, progress * 2);
    } else if (elapsedMs < exitStart) {
      part.x = 0;
      part.y = 0;
      part.rotation = 0;
      part.scale = 1;
      part.opacity = 1;
    } else {
      const exitElapsed = elapsedMs - exitStart;
      const progress = Math.min(1, exitElapsed / EXIT_DURATION);
      const eased = easeInCubic(progress);

      const distance = 500;
      part.x = Math.cos(part.exitAngle) * distance * eased;
      part.y = Math.sin(part.exitAngle) * distance * eased;
      part.rotation = (Math.random() - 0.5) * 360 * eased;
      part.scale = 1;
      part.opacity = 1 - eased;
    }
  });
}

function drawKineticParts(ctx: CanvasRenderingContext2D, parts: KineticPart[], width: number, height: number): void {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  const scale = width / 600;
  ctx.save();
  ctx.scale(scale, scale);

  parts.forEach((part) => {
    if (part.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = part.opacity;
    ctx.translate(part.centerX + part.x, part.centerY + part.y);
    ctx.rotate(part.rotation * Math.PI / 180);
    ctx.scale(part.scale, part.scale);
    ctx.translate(-part.centerX, -part.centerY);

    ctx.strokeStyle = part.element.color;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 8;
    ctx.shadowColor = part.element.color;

    const path = new Path2D(part.element.d);
    ctx.stroke(path);

    ctx.restore();
  });

  ctx.restore();
}

// =============================================================================
// Technique 07: 3D Transforms Animation
// =============================================================================

interface Transform3DState {
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  translateZ: number;
  scale: number;
  opacity: number;
}

function update3DTransformState(
  elapsedMs: number,
  variant: 'original' | 'varied' | 'procedural'
): Transform3DState {
  const ENTRANCE_DURATION = 2500;
  const HOLD_DURATION = 2000;
  const EXIT_DURATION = 250;
  const exitStart = ENTRANCE_DURATION + HOLD_DURATION;

  const intensity = variant === 'original' ? 1 : variant === 'varied' ? 1.2 : 1.5;

  if (elapsedMs < ENTRANCE_DURATION) {
    const progress = Math.min(1, elapsedMs / ENTRANCE_DURATION);
    const eased = easeInOutQuart(progress);

    return {
      rotateY: 360 * (1 - eased) * intensity,
      rotateX: 45 * Math.sin(progress * Math.PI) * intensity,
      rotateZ: 20 * Math.sin(progress * Math.PI * 2) * intensity,
      translateZ: -200 * (1 - eased),
      scale: 0.5 + 0.5 * eased,
      opacity: eased,
    };
  } else if (elapsedMs < exitStart) {
    return {
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      translateZ: 0,
      scale: 1,
      opacity: 1,
    };
  } else {
    const exitElapsed = elapsedMs - exitStart;
    const progress = Math.min(1, exitElapsed / EXIT_DURATION);
    const eased = easeInCubic(progress);

    return {
      rotateY: 360 * eased * intensity,
      rotateX: -60 * eased * intensity,
      rotateZ: 30 * eased * intensity,
      translateZ: -300 * eased,
      scale: 1 - 0.5 * eased,
      opacity: 1 - eased,
    };
  }
}

function draw3DTransform(ctx: CanvasRenderingContext2D, state: Transform3DState, width: number, height: number): void {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = state.opacity;
  ctx.translate(width / 2, height / 2);

  // Simulate 3D with 2D transforms (simplified)
  const scaleX = state.scale * Math.cos(state.rotateY * Math.PI / 180);
  const scaleY = state.scale * Math.cos(state.rotateX * Math.PI / 180);
  const skewFactor = Math.sin(state.rotateZ * Math.PI / 180) * 0.2;

  ctx.transform(scaleX, skewFactor, -skewFactor, scaleY, 0, 0);
  ctx.translate(-width / 2, -height / 2);

  // Draw logo
  const scale = width / 600;
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#7b2ff7';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#7b2ff7';

  // L
  ctx.beginPath();
  ctx.moveTo(40, 40);
  ctx.lineTo(40, 160);
  ctx.lineTo(100, 160);
  ctx.stroke();

  // O's
  ctx.beginPath();
  ctx.arc(150, 100, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(240, 100, 40, 0, Math.PI * 2);
  ctx.stroke();

  // M
  ctx.beginPath();
  ctx.moveTo(300, 160);
  ctx.lineTo(300, 40);
  ctx.lineTo(350, 100);
  ctx.lineTo(400, 40);
  ctx.lineTo(400, 160);
  ctx.stroke();

  // 9's
  ctx.beginPath();
  ctx.arc(480, 70, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(500, 70);
  ctx.bezierCurveTo(500, 95, 495, 130, 475, 155);
  ctx.bezierCurveTo(460, 175, 440, 170, 435, 160);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(560, 70, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(580, 70);
  ctx.bezierCurveTo(580, 95, 575, 130, 555, 155);
  ctx.bezierCurveTo(540, 175, 520, 170, 515, 160);
  ctx.stroke();

  ctx.restore();
}

// =============================================================================
// Technique 08: Reveal Mask Animation
// =============================================================================

interface RevealMaskState {
  maskX: number;
  glowLineX: number;
  glowOpacity: number;
}

function updateRevealMaskState(elapsedMs: number, variant: 'original' | 'varied' | 'procedural'): RevealMaskState {
  const ENTRANCE_DURATION = 1800 * (variant === 'original' ? 1 : variant === 'varied' ? 0.9 : 0.7);
  const HOLD_DURATION = 2000;
  const EXIT_DURATION = 250;
  const exitStart = ENTRANCE_DURATION + HOLD_DURATION;

  if (elapsedMs < ENTRANCE_DURATION) {
    const progress = Math.min(1, elapsedMs / ENTRANCE_DURATION);
    const eased = easeInOutQuart(progress);

    return {
      maskX: eased,
      glowLineX: eased,
      glowOpacity: Math.sin(progress * Math.PI) * 0.8,
    };
  } else if (elapsedMs < exitStart) {
    return {
      maskX: 1,
      glowLineX: 1,
      glowOpacity: 0,
    };
  } else {
    const exitElapsed = elapsedMs - exitStart;
    const progress = Math.min(1, exitElapsed / EXIT_DURATION);
    const eased = easeInCubic(progress);

    return {
      maskX: 1 - eased,
      glowLineX: 1 - eased,
      glowOpacity: (1 - progress) * 0.8,
    };
  }
}

function drawRevealMask(ctx: CanvasRenderingContext2D, state: RevealMaskState, width: number, height: number): void {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  const revealX = state.maskX * width;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, revealX, height);
  ctx.clip();

  // Draw logo
  const scale = width / 600;
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#7b2ff7';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#7b2ff7';

  LOGO_PATH_DATA.forEach((element) => {
    const path = new Path2D(element.d);
    ctx.strokeStyle = element.color;
    ctx.shadowColor = element.color;
    ctx.stroke(path);
  });

  ctx.restore();

  // Glow line at edge
  if (state.glowOpacity > 0.01) {
    const gradient = ctx.createLinearGradient(revealX - 20, 0, revealX + 20, 0);
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0)');
    gradient.addColorStop(0.5, `rgba(123, 47, 247, ${state.glowOpacity})`);
    gradient.addColorStop(1, 'rgba(255, 45, 117, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(revealX - 20, 0, 40, height);
  }
}

// =============================================================================
// Technique 09: Wave Ripple Animation
// =============================================================================

interface WaveRipplePart {
  element: typeof LOGO_PATH_DATA[0];
  centerX: number;
  centerY: number;
  translateY: number;
  scale: number;
  rotation: number;
  opacity: number;
}

function createWaveRippleParts(): WaveRipplePart[] {
  return LOGO_PATH_DATA.map((element) => {
    let cx = 300, cy = 100;
    if (element.cx !== undefined && element.cy !== undefined) {
      cx = element.cx;
      cy = element.cy;
    } else {
      const bounds = computePathBounds(element.d);
      cx = bounds.centerX;
      cy = bounds.centerY;
    }

    return {
      element,
      centerX: cx,
      centerY: cy,
      translateY: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
  });
}

function updateWaveRippleParts(parts: WaveRipplePart[], elapsedMs: number, variant: 'original' | 'varied' | 'procedural'): void {
  const ENTRANCE_DURATION = 3000;
  const HOLD_DURATION = 2000;
  const EXIT_DURATION = 250;
  const waveCount = 3;
  const exitStart = ENTRANCE_DURATION + HOLD_DURATION;

  const intensity = variant === 'original' ? 1 : variant === 'varied' ? 1.3 : 1.6;

  parts.forEach((part, index) => {
    if (elapsedMs < ENTRANCE_DURATION) {
      const time = elapsedMs / 1000;
      const wavePhase = (index / parts.length) * Math.PI * 2 * waveCount;
      const decay = Math.max(0, 1 - elapsedMs / ENTRANCE_DURATION);

      part.translateY = Math.sin(time * 4 + wavePhase) * 35 * decay * intensity;
      part.scale = 1 + Math.sin(time * 3 + wavePhase) * 0.25 * decay * intensity;
      part.rotation = Math.sin(time * 2.5 + wavePhase) * 15 * decay * intensity;
      part.opacity = 1;
    } else if (elapsedMs < exitStart) {
      part.translateY = 0;
      part.scale = 1;
      part.rotation = 0;
      part.opacity = 1;
    } else {
      const exitElapsed = elapsedMs - exitStart;
      const progress = Math.min(1, exitElapsed / EXIT_DURATION);
      const wavePhase = (index / parts.length) * Math.PI * 2;
      const waveOffset = Math.sin(wavePhase + progress * Math.PI * 6) * 40 * (1 - progress);

      const svgCenterX = 300;
      const svgCenterY = 100;
      const dx = svgCenterX - part.centerX;
      const dy = svgCenterY - part.centerY;

      part.translateY = dy * progress + waveOffset;
      part.scale = 1 - progress;
      part.rotation = progress * 180 * (index % 2 === 0 ? 1 : -1);
      part.opacity = 1 - progress;
    }
  });
}

function drawWaveRippleParts(ctx: CanvasRenderingContext2D, parts: WaveRipplePart[], width: number, height: number): void {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  const scale = width / 600;
  ctx.save();
  ctx.scale(scale, scale);

  parts.forEach((part) => {
    if (part.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = part.opacity;
    ctx.translate(part.centerX, part.centerY + part.translateY);
    ctx.rotate(part.rotation * Math.PI / 180);
    ctx.scale(part.scale, part.scale);
    ctx.translate(-part.centerX, -part.centerY);

    ctx.strokeStyle = part.element.color;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = part.element.color;

    const path = new Path2D(part.element.d);
    ctx.stroke(path);

    ctx.restore();
  });

  ctx.restore();
}

// =============================================================================
// Technique 10: Typewriter Animation
// =============================================================================

interface TypewriterState {
  visibleChars: number;
  cursorVisible: boolean;
  cursorX: number;
  charOpacities: number[];
  charScales: number[];
}

function updateTypewriterState(elapsedMs: number, text: string, variant: 'original' | 'varied' | 'procedural'): TypewriterState {
  const CHAR_DELAY = variant === 'original' ? 120 : variant === 'varied' ? 100 : 80;
  const ENTRANCE_DURATION = text.length * CHAR_DELAY + 500;
  const HOLD_DURATION = 2000;
  const EXIT_DURATION = 250;
  const exitStart = ENTRANCE_DURATION + HOLD_DURATION;

  const charOpacities = Array(text.length).fill(0);
  const charScales = Array(text.length).fill(1);
  let visibleChars = 0;
  let cursorX = 0;

  if (elapsedMs < 500) {
    return {
      visibleChars: 0,
      cursorVisible: true,
      cursorX: 0,
      charOpacities,
      charScales,
    };
  } else if (elapsedMs < ENTRANCE_DURATION) {
    const typingTime = elapsedMs - 500;
    visibleChars = Math.min(text.length, Math.floor(typingTime / CHAR_DELAY) + 1);

    for (let i = 0; i < visibleChars; i++) {
      const charTime = typingTime - i * CHAR_DELAY;
      if (charTime < 300) {
        // Pop animation
        const t = charTime / 300;
        charScales[i] = 1 + 0.3 * (1 - t) * Math.sin(t * Math.PI);
      }
      charOpacities[i] = 1;
    }
    cursorX = visibleChars;
  } else if (elapsedMs < exitStart) {
    visibleChars = text.length;
    charOpacities.fill(1);
    cursorX = text.length;
  } else {
    const exitElapsed = elapsedMs - exitStart;
    const EXIT_CHAR_DELAY = 25;
    const charsToRemove = Math.min(text.length, Math.floor(exitElapsed / EXIT_CHAR_DELAY) + 1);
    visibleChars = text.length;

    for (let i = 0; i < text.length; i++) {
      const removeIndex = text.length - 1 - i;
      if (i < charsToRemove) {
        charOpacities[removeIndex] = Math.max(0, 1 - (exitElapsed - i * EXIT_CHAR_DELAY) / 100);
        charScales[removeIndex] = 0.5 + 0.5 * charOpacities[removeIndex];
      } else {
        charOpacities[removeIndex] = 1;
      }
    }
    cursorX = Math.max(0, text.length - charsToRemove);
  }

  const cursorBlink = Math.floor(elapsedMs / 350) % 2 === 0;

  return {
    visibleChars,
    cursorVisible: cursorBlink,
    cursorX,
    charOpacities,
    charScales,
  };
}

function drawTypewriter(ctx: CanvasRenderingContext2D, state: TypewriterState, text: string, width: number, height: number): void {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  const fontSize = Math.min(width / 6, 100);
  ctx.font = `900 ${fontSize}px 'Courier New', monospace`;
  ctx.textBaseline = 'middle';

  const charWidth = fontSize * 0.6;
  const startX = (width - text.length * charWidth) / 2;
  const y = height / 2;

  // Create gradient for text
  const gradient = ctx.createLinearGradient(startX, 0, startX + text.length * charWidth, 0);
  gradient.addColorStop(0, '#00d4ff');
  gradient.addColorStop(0.5, '#7b2ff7');
  gradient.addColorStop(1, '#ff2d75');

  for (let i = 0; i < text.length; i++) {
    if (state.charOpacities[i] <= 0) continue;

    ctx.save();
    ctx.globalAlpha = state.charOpacities[i];
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 25;
    ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';

    const x = startX + i * charWidth;
    ctx.translate(x + charWidth / 2, y);
    ctx.scale(state.charScales[i], state.charScales[i]);
    ctx.fillText(text[i], -charWidth / 2, 0);
    ctx.restore();
  }

  // Cursor
  if (state.cursorVisible) {
    const cursorX = startX + state.cursorX * charWidth + 4;
    const cursorGradient = ctx.createLinearGradient(cursorX, y - fontSize / 2, cursorX, y + fontSize / 2);
    cursorGradient.addColorStop(0, '#00d4ff');
    cursorGradient.addColorStop(0.5, '#7b2ff7');
    cursorGradient.addColorStop(1, '#ff2d75');

    ctx.fillStyle = cursorGradient;
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0, 212, 255, 0.8)';
    ctx.fillRect(cursorX, y - fontSize / 2, 6, fontSize);
  }
}

// =============================================================================
// Component
// =============================================================================

export function SideBySideViewer({ technique, target, variant }: SideBySideViewerProps) {
  // Refs for line drawing (technique 01) and path morph (technique 03)
  const htmlSvgRef = useRef<SVGSVGElement>(null);
  const htmlLinesRef = useRef<HtmlAnimatedLine[]>([]);
  const htmlMorphPathsRef = useRef<HtmlMorphPath[]>([]);

  // Refs for canvas-based techniques
  const htmlCanvasRef = useRef<HTMLCanvasElement>(null);
  const htmlParticlesRef = useRef<HtmlParticle[]>([]);
  const htmlGlitchStateRef = useRef<GlitchState>(createGlitchState());
  const htmlLiquidBlobsRef = useRef<LiquidBlob[]>([]);
  const htmlKineticPartsRef = useRef<KineticPart[]>([]);
  const htmlWaveRipplePartsRef = useRef<WaveRipplePart[]>([]);

  // Shared refs
  const v4ContainerRef = useRef<HTMLDivElement>(null);
  const v4ProgramRef = useRef<{ signal: (t: number, ctx: typeof DEFAULT_CONTEXT) => RenderTree } | null>(null);
  const v4InterpreterRef = useRef<SVGInterpreter | null>(null);
  const isMountedRef = useRef(true);
  const isPlayingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const seedRef = useRef(Math.floor(Math.random() * 1000000));

  const [scrubPosition, setScrubPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(1000);
  const [isPlaying, setIsPlaying] = useState(false);

  const { width: canvasWidth, height: canvasHeight } = getDimensions(target);

  // Phase durations for particles (entrance is variable, stored in ref)
  const htmlParticleEntranceRef = useRef(2000);
  const particleHoldMs = 2000;
  const particleExitMs = 250;

  // Durations for other techniques
  const glitchTotalDuration = 2000 + 2000 + 250;
  const liquidTotalDuration = 3000 + 2000 + 250;
  const kineticTotalDuration = 2500 + 2000 + 250;
  const transform3dTotalDuration = 2500 + 2000 + 250;
  const revealMaskTotalDuration = 1800 + 2000 + 250;
  const waveRippleTotalDuration = 3000 + 2000 + 250;
  const typewriterTotalDuration = 6 * 120 + 500 + 2000 + 250;

  const createDefs = (svg: SVGSVGElement) => {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'logoGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('style', 'stop-color:#00d4ff;stop-opacity:1');
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '50%');
    stop2.setAttribute('style', 'stop-color:#7b2ff7;stop-opacity:1');
    const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('style', 'stop-color:#ff2d75;stop-opacity:1');
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    gradient.appendChild(stop3);
    defs.appendChild(gradient);
    svg.appendChild(defs);
  };

  // Phase durations for path morph
  const morphEntranceRef = useRef(2000);
  const morphHoldMs = 2000;
  const morphExitMs = 500;

  // Check if technique has V4 implementation
  const hasV4Implementation = technique === '01' || technique === '02' || technique === '03' || technique === '04' || technique === '05';

  const updateAnimations = useCallback((elapsedMs: number) => {
    const seed = seedRef.current;

    if (technique === '01') {
      // Line drawing
      htmlLinesRef.current.forEach(line => line.updateEntrance(elapsedMs));
    } else if (technique === '02') {
      // Particles
      const canvas = htmlCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          updateHtmlParticles(htmlParticlesRef.current, elapsedMs, htmlParticleEntranceRef.current, particleHoldMs, particleExitMs);
          drawParticles(ctx, htmlParticlesRef.current, canvasWidth, canvasHeight);
        }
      }
    } else if (technique === '03') {
      // Path morph
      const htmlSvg = htmlSvgRef.current;
      if (htmlSvg) {
        updateHtmlMorphPaths(htmlMorphPathsRef.current, elapsedMs, morphEntranceRef.current, morphHoldMs, morphExitMs);
        renderHtmlMorphPaths(htmlSvg, htmlMorphPathsRef.current);
      }
    } else if (technique === '04') {
      // Glitch
      const canvas = htmlCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          updateGlitchState(htmlGlitchStateRef.current, elapsedMs, seed, variant);
          drawGlitch(ctx, htmlGlitchStateRef.current, canvasWidth, canvasHeight);
        }
      }
    } else if (technique === '05') {
      // Liquid
      const canvas = htmlCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          updateLiquidBlobs(htmlLiquidBlobsRef.current, elapsedMs);
          drawLiquidBlobs(ctx, htmlLiquidBlobsRef.current, canvasWidth, canvasHeight);
        }
      }
    } else if (technique === '06') {
      // Kinetic
      const canvas = htmlCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          updateKineticParts(htmlKineticPartsRef.current, elapsedMs);
          drawKineticParts(ctx, htmlKineticPartsRef.current, canvasWidth, canvasHeight);
        }
      }
    } else if (technique === '07') {
      // 3D Transforms
      const canvas = htmlCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const state = update3DTransformState(elapsedMs, variant);
          draw3DTransform(ctx, state, canvasWidth, canvasHeight);
        }
      }
    } else if (technique === '08') {
      // Reveal Mask
      const canvas = htmlCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const state = updateRevealMaskState(elapsedMs, variant);
          drawRevealMask(ctx, state, canvasWidth, canvasHeight);
        }
      }
    } else if (technique === '09') {
      // Wave Ripple
      const canvas = htmlCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          updateWaveRippleParts(htmlWaveRipplePartsRef.current, elapsedMs, variant);
          drawWaveRippleParts(ctx, htmlWaveRipplePartsRef.current, canvasWidth, canvasHeight);
        }
      }
    } else if (technique === '10') {
      // Typewriter
      const canvas = htmlCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const text = target === 'logo' ? 'loom99' : 'DO MORE NOW';
          const state = updateTypewriterState(elapsedMs, text, variant);
          drawTypewriter(ctx, state, text, canvasWidth, canvasHeight);
        }
      }
    }

    // V4 animation (only for implemented techniques)
    if (hasV4Implementation) {
      const program = v4ProgramRef.current;
      const interpreter = v4InterpreterRef.current;
      if (program && interpreter) {
        const elapsedSec = elapsedMs / 1000;
        const renderTree = program.signal(elapsedSec, DEFAULT_CONTEXT);
        interpreter.render(renderTree);
      }
    }
  }, [technique, canvasWidth, canvasHeight, variant, target, hasV4Implementation]);

  useEffect(() => {
    isMountedRef.current = true;
    const v4Container = v4ContainerRef.current;
    if (!v4Container) return;

    // Clear V4 container
    while (v4Container.firstChild) v4Container.removeChild(v4Container.firstChild);

    const seed = seedRef.current;
    const env = getEnv(target);

    if (technique === '01') {
      // Line drawing setup
      const htmlSvg = htmlSvgRef.current;
      if (!htmlSvg) return;

      while (htmlSvg.firstChild) htmlSvg.removeChild(htmlSvg.firstChild);
      createDefs(htmlSvg);

      let htmlLines: HtmlAnimatedLine[];
      if (variant === 'original') {
        htmlLines = createOriginalHtmlLines(target);
        htmlLines.forEach(line => line.render(htmlSvg));
      } else {
        htmlLines = createVariedHtmlLines(seed, target);
        renderVariedHtmlLines(htmlLines, htmlSvg);
      }
      htmlLinesRef.current = htmlLines;

      // V4 Line Morph
      const program = variant === 'original'
        ? compileOriginalLineDrawing(seed, target, env)
        : variant === 'varied'
          ? compileVariedLineDrawing(seed, target, env)
          : compileProceduralLineDrawing(seed, target, env);
      v4ProgramRef.current = program;

      const maxHtmlDuration = Math.max(...htmlLines.map(l => l.getTotalDuration()));
      const phaseMachine = createLineMorphPhaseMachine(
        variant === 'original' ? 1.5 : variant === 'varied' ? 1.5 : 1.2, 2.0, 0.25
      );
      const v4DurationMs = getProgramDuration(phaseMachine) * 1000;
      setTotalDuration(Math.max(maxHtmlDuration, v4DurationMs));
    } else if (technique === '02') {
      // Particles setup
      const { particles, duration: htmlEntranceDuration } = createHtmlParticles(target, seed, variant);
      htmlParticlesRef.current = particles;
      htmlParticleEntranceRef.current = htmlEntranceDuration;

      // V4 Particles
      const program = variant === 'original'
        ? compileOriginalParticles(seed, target)
        : variant === 'varied'
          ? compileVariedParticles(seed, target)
          : compileProceduralParticles(seed, target);
      v4ProgramRef.current = program;

      const phaseMachine = createParticlesPhaseMachine(2.5, 2.0, 0.5);
      const v4DurationMs = getParticlesProgramDuration(phaseMachine) * 1000;
      const htmlDurationMs = htmlEntranceDuration + particleHoldMs + particleExitMs;
      setTotalDuration(Math.max(htmlDurationMs, v4DurationMs));
    } else if (technique === '03') {
      // Path morph setup
      const htmlSvg = htmlSvgRef.current;
      if (!htmlSvg) return;

      while (htmlSvg.firstChild) htmlSvg.removeChild(htmlSvg.firstChild);
      createMorphDefs(htmlSvg);

      const morphPaths = createHtmlMorphPaths(target, seed, variant);
      htmlMorphPathsRef.current = morphPaths;

      const maxEntranceDuration = Math.max(...morphPaths.map(p => p.delay + p.duration));
      morphEntranceRef.current = maxEntranceDuration;

      // V4 Path Morph
      const program = variant === 'original'
        ? compileOriginalPathMorph(seed, target, env)
        : variant === 'varied'
          ? compileVariedPathMorph(seed, target, env)
          : compileProceduralPathMorph(seed, target, env);
      v4ProgramRef.current = program;

      const phaseMachine = createPathMorphPhaseMachine(
        variant === 'original' ? 2.0 : variant === 'varied' ? 2.5 : 3.0,
        2.0,
        0.5
      );
      const v4DurationMs = getPathMorphProgramDuration(phaseMachine) * 1000;
      const htmlDurationMs = maxEntranceDuration + morphHoldMs + morphExitMs;
      setTotalDuration(Math.max(htmlDurationMs, v4DurationMs));
    } else if (technique === '04') {
      // Glitch setup (HTML)
      htmlGlitchStateRef.current = createGlitchState();

      // V4 Glitch
      const glitchScene = getGlitchScene(target);
      const program = variant === 'original'
        ? compileOriginalGlitch(glitchScene, seed, env)
        : variant === 'varied'
          ? compileVariedGlitch(glitchScene, seed, env)
          : compileProceduralGlitch(glitchScene, seed, env);
      v4ProgramRef.current = program;

      const phaseMachine = createGlitchPhaseMachine(
        variant === 'procedural' ? 1.2 : 0.8,
        variant === 'procedural' ? 1.5 : 1.0,
        2.0,
        0.25
      );
      const v4DurationMs = getGlitchProgramDuration(phaseMachine) * 1000;
      setTotalDuration(Math.max(glitchTotalDuration, v4DurationMs));
    } else if (technique === '05') {
      // Liquid setup (HTML)
      htmlLiquidBlobsRef.current = createLiquidBlobs(target, seed, variant);

      // V4 Liquid
      const liquidScene = getLiquidScene(target);
      const liquidViewport = getLiquidViewport(target);
      const liquidEnv = { viewport: { w: liquidViewport.w, h: liquidViewport.h } };

      const modeSystem = variant === 'original'
        ? createLiquidModeSystem({ origin: 'leftBand', goo: 'soft', behavior: 'wobble' })
        : variant === 'varied'
          ? createVariedLiquidModeSystem()
          : createProceduralLiquidModeSystem();

      const program = compileLiquid(liquidScene, modeSystem, seed, liquidEnv, {
        entranceDuration: variant === 'procedural' ? 2.5 : 2.0,
        holdDuration: 1.5,
        exitDuration: 0.5,
        backgroundColor: '#0a0a0f',
      });
      v4ProgramRef.current = program;

      const phaseMachine = createLiquidPhaseMachine(
        variant === 'procedural' ? 2.5 : 2.0,
        1.5,
        0.5
      );
      const v4DurationMs = getLiquidProgramDuration(phaseMachine) * 1000;
      setTotalDuration(Math.max(liquidTotalDuration, v4DurationMs));
    } else if (technique === '06') {
      // Kinetic setup
      htmlKineticPartsRef.current = createKineticParts(seed, variant);
      setTotalDuration(kineticTotalDuration);
    } else if (technique === '07') {
      // 3D Transforms setup
      setTotalDuration(transform3dTotalDuration);
    } else if (technique === '08') {
      // Reveal Mask setup
      setTotalDuration(revealMaskTotalDuration);
    } else if (technique === '09') {
      // Wave Ripple setup
      htmlWaveRipplePartsRef.current = createWaveRippleParts();
      setTotalDuration(waveRippleTotalDuration);
    } else if (technique === '10') {
      // Typewriter setup
      setTotalDuration(typewriterTotalDuration);
    }

    // Create V4 interpreter or stub
    if (hasV4Implementation) {
      const interpreter = createSVGInterpreter(v4Container);
      v4InterpreterRef.current = interpreter;
      const v4Svg = interpreter.getSVG();
      v4Svg.setAttribute('viewBox', getViewBox(target));
      v4Svg.classList.add('animation-svg');
    } else {
      // Create stub for V4
      const stubDiv = document.createElement('div');
      stubDiv.className = 'v4-stub';
      stubDiv.innerHTML = `
        <div class="v4-stub-content">
          <div class="v4-stub-icon">🚧</div>
          <div class="v4-stub-text">V4 Not Implemented</div>
          <div class="v4-stub-technique">Technique ${technique}</div>
        </div>
      `;
      v4Container.appendChild(stubDiv);
    }

    updateAnimations(0);

    return () => {
      isMountedRef.current = false;
      isPlayingRef.current = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [technique, target, variant, updateAnimations, hasV4Implementation, glitchTotalDuration, liquidTotalDuration, kineticTotalDuration, transform3dTotalDuration, revealMaskTotalDuration, waveRippleTotalDuration, typewriterTotalDuration]);

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value);
    setScrubPosition(newPosition);
    updateAnimations(newPosition);
  };

  const handleScrubInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value) || 0;
    const clamped = Math.max(0, Math.min(totalDuration, newPosition));
    setScrubPosition(clamped);
    updateAnimations(clamped);
  };

  const stopAnimation = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const startAnimation = (fromPosition: number = 0) => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setIsPlaying(true);

    let loopStartTime = performance.now() - fromPosition;
    const seed = seedRef.current;

    const animate = (timestamp: number) => {
      if (!isMountedRef.current || !isPlayingRef.current) return;

      let elapsed = timestamp - loopStartTime;

      if (elapsed >= totalDuration) {
        // Reset for loop
        if (technique === '01') {
          htmlLinesRef.current.forEach(line => line.reset());
        } else if (technique === '02') {
          const { particles } = createHtmlParticles(target, seed, variant);
          htmlParticlesRef.current = particles;
        } else if (technique === '03') {
          const morphPaths = createHtmlMorphPaths(target, seed, variant);
          htmlMorphPathsRef.current = morphPaths;
        } else if (technique === '04') {
          htmlGlitchStateRef.current = createGlitchState();
        } else if (technique === '05') {
          htmlLiquidBlobsRef.current = createLiquidBlobs(target, seed, variant);
        } else if (technique === '06') {
          htmlKineticPartsRef.current = createKineticParts(seed, variant);
        } else if (technique === '09') {
          htmlWaveRipplePartsRef.current = createWaveRippleParts();
        }
        loopStartTime = timestamp;
        elapsed = 0;
      }

      setScrubPosition(elapsed);
      updateAnimations(elapsed);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleTogglePlayback = () => {
    if (isPlayingRef.current) {
      stopAnimation();
    } else {
      startAnimation(scrubPosition);
    }
  };

  const viewBox = getViewBox(target);

  // Determine if we need SVG or Canvas for HTML side
  const usesSvg = technique === '01' || technique === '03';

  return (
    <div className="side-by-side-viewer">
      <div className="animations-container" onClick={handleTogglePlayback}>
        <div className="animation-panel">
          <div className="panel-label">HTML Original {isPlaying ? '⏸' : '▶'}</div>
          {usesSvg ? (
            <svg ref={htmlSvgRef} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" className="animation-svg" />
          ) : (
            <canvas
              ref={htmlCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="animation-canvas"
              style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
            />
          )}
        </div>
        <div className="animation-panel">
          <div className="panel-label">V4 Pure {isPlaying ? '⏸' : '▶'}</div>
          <div ref={v4ContainerRef} className="v4-svg-container" />
        </div>
      </div>

      <div className="shared-controls">
        <input
          type="range"
          min="0"
          max={totalDuration}
          step="1"
          value={scrubPosition}
          onChange={handleScrubChange}
          className="scrub-slider"
          disabled={isPlaying}
        />
        <div className="scrub-info">
          <span>
            <input
              type="number"
              min="0"
              max={totalDuration}
              step="1"
              value={Math.round(scrubPosition)}
              onChange={handleScrubInputChange}
              className="scrub-input"
              disabled={isPlaying}
            />
            ms / {Math.round(totalDuration)}ms
          </span>
          <span className="scrub-seed">seed: {seedRef.current}</span>
          <span className="scrub-percent">
            ({Math.round((scrubPosition / totalDuration) * 100)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
