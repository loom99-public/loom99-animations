/**
 * SVGExporter - Export animations to static SVG files
 */

import { Track } from './Track';
import { Animation } from './Animation';

export class SVGExporter {
  /**
   * Export a single track as SMIL animation
   */
  static exportTrack(track: Track<any>, attributeName: string, elementId?: string): string {
    return track.toSMIL(attributeName, elementId);
  }

  /**
   * Export complete animation to SVG string
   */
  static exportAnimation(animation: Animation, options?: {
    viewBox?: string;
    width?: number;
    height?: number;
    includeCSS?: boolean;
  }): string {
    const {
      viewBox = '0 0 800 600',
      width,
      height,
      includeCSS = false,
    } = options || {};

    const elements = animation.getElements();
    const svgElements = elements.map((el) => el.toSVGString());

    const sizeAttrs = [];
    if (width) sizeAttrs.push(`width="${width}"`);
    if (height) sizeAttrs.push(`height="${height}"`);

    const cssSection = includeCSS
      ? `<defs>
    <style>
      /* Add custom styles here */
    </style>
  </defs>
  `
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ${sizeAttrs.join(' ')}>
  ${cssSection}${svgElements.join('\n  ')}
</svg>`;
  }

  /**
   * Download SVG as file
   */
  static downloadSVG(svgContent: string, filename: string = 'animation.svg'): void {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Copy SVG to clipboard
   */
  static async copySVGToClipboard(svgContent: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(svgContent);
    } catch (err) {
      console.error('Failed to copy SVG to clipboard:', err);
      throw err;
    }
  }

  /**
   * Generate inline SVG data URI
   */
  static toDataURI(svgContent: string): string {
    const encoded = encodeURIComponent(svgContent)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
    return `data:image/svg+xml,${encoded}`;
  }

  /**
   * Generate base64 data URI
   */
  static toBase64DataURI(svgContent: string): string {
    const base64 = btoa(svgContent);
    return `data:image/svg+xml;base64,${base64}`;
  }
}
