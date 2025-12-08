/**
 * Animation metadata
 * Maps to actual animation HTML files in the animations/ directory
 */

import type { AnimationMeta } from './types';
import { techniques } from './techniques';

export const animations: AnimationMeta[] = [
  // Technique 01 - Line Drawing
  {
    id: 'logo-01-line-drawing',
    title: 'Original',
    description: 'Lines shoot in and curve into the loom99 logo shape',
    technique: '01',
    target: 'logo',
    variant: 'original',
    filePath: 'logo/logo-01-line-drawing.html',
  },
  {
    id: 'logo-01-line-drawing-varied',
    title: 'Varied',
    description: 'Randomized line drawing with varied timing and easing',
    technique: '01',
    target: 'logo',
    variant: 'varied',
    filePath: 'logo/logo-01-line-drawing-varied.html',
  },
  {
    id: 'logo-01-line-drawing-procedural',
    title: 'Procedural',
    description: 'Fully procedural line drawing with dynamic parameters',
    technique: '01',
    target: 'logo',
    variant: 'procedural',
    filePath: 'logo/logo-01-line-drawing-procedural.html',
  },
  {
    id: 'text-01-line-drawing',
    title: 'Original',
    description: 'Lines shoot in and curve into text "Do More Now"',
    technique: '01',
    target: 'text',
    variant: 'original',
    filePath: 'text/text-01-line-drawing.html',
    supportsDynamicText: true,
  },
  {
    id: 'text-01-line-drawing-varied',
    title: 'Varied',
    description: 'Randomized line drawing for custom text',
    technique: '01',
    target: 'text',
    variant: 'varied',
    filePath: 'text/text-01-line-drawing-varied.html',
    supportsDynamicText: true,
  },
  {
    id: 'text-01-line-drawing-procedural',
    title: 'Procedural',
    description: 'Fully procedural line drawing with dynamic text support',
    technique: '01',
    target: 'text',
    variant: 'procedural',
    filePath: 'text/text-01-line-drawing-procedural.html',
    supportsDynamicText: true,
  },

  // TODO: Add remaining techniques (02-10)
  // This is a starter file - full metadata will be added in Phase 2
];

export { techniques };
