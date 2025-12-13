/**
 * V4 Animation Framework - SVG Interpreter
 *
 * Converts RenderTree to SVG DOM elements.
 * Supports:
 * - Efficient DOM diffing via stable IDs
 * - Filter and mask definitions
 * - All render node types
 *
 * Usage:
 * 1. Create interpreter once: const interp = createSVGInterpreter(container)
 * 2. Render each frame: interp.render(renderTree)
 */

import type {
  RenderTree,
  RenderNode,
  PathNode,
  CircleNode,
  RectNode,
  TextNode,
  GroupNode,
  FilterNode,
  FilterDef,
  FilterEffect,
  MaskDef,
  Style,
} from './tree';

// =============================================================================
// SVG Namespace
// =============================================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

// =============================================================================
// Style Application
// =============================================================================

/**
 * Apply style properties to an SVG element.
 */
function applyStyle(element: SVGElement, style?: Style): void {
  if (!style) return;

  if (style.fill !== undefined) element.setAttribute('fill', style.fill);
  if (style.stroke !== undefined) element.setAttribute('stroke', style.stroke);
  if (style.strokeWidth !== undefined) element.setAttribute('stroke-width', String(style.strokeWidth));
  if (style.strokeLinecap !== undefined) element.setAttribute('stroke-linecap', style.strokeLinecap);
  if (style.strokeLinejoin !== undefined) element.setAttribute('stroke-linejoin', style.strokeLinejoin);
  if (style.strokeDasharray !== undefined) element.setAttribute('stroke-dasharray', style.strokeDasharray);
  if (style.strokeDashoffset !== undefined) element.setAttribute('stroke-dashoffset', String(style.strokeDashoffset));
  if (style.opacity !== undefined) element.setAttribute('opacity', String(style.opacity));
  if (style.fillOpacity !== undefined) element.setAttribute('fill-opacity', String(style.fillOpacity));
  if (style.strokeOpacity !== undefined) element.setAttribute('stroke-opacity', String(style.strokeOpacity));
  if (style.transform !== undefined) element.setAttribute('transform', style.transform);
  if (style.filter !== undefined) element.setAttribute('filter', style.filter);
  if (style.mask !== undefined) element.setAttribute('mask', style.mask);
  if (style.clipPath !== undefined) element.setAttribute('clip-path', style.clipPath);
}

// =============================================================================
// Filter Effect Rendering
// =============================================================================

/**
 * Create SVG element for a filter effect.
 */
function createFilterEffect(effect: FilterEffect): SVGElement {
  switch (effect.type) {
    case 'gaussianBlur': {
      const fe = document.createElementNS(SVG_NS, 'feGaussianBlur');
      fe.setAttribute('stdDeviation', String(effect.stdDeviation));
      if (effect.in) fe.setAttribute('in', effect.in);
      if (effect.result) fe.setAttribute('result', effect.result);
      return fe;
    }

    case 'dropShadow': {
      const fe = document.createElementNS(SVG_NS, 'feDropShadow');
      fe.setAttribute('dx', String(effect.dx));
      fe.setAttribute('dy', String(effect.dy));
      fe.setAttribute('stdDeviation', String(effect.stdDeviation));
      fe.setAttribute('flood-color', effect.color);
      return fe;
    }

    case 'colorMatrix': {
      const fe = document.createElementNS(SVG_NS, 'feColorMatrix');
      fe.setAttribute('type', 'matrix');
      fe.setAttribute('values', effect.values.join(' '));
      if (effect.in) fe.setAttribute('in', effect.in);
      if (effect.result) fe.setAttribute('result', effect.result);
      return fe;
    }

    case 'displacementMap': {
      const fe = document.createElementNS(SVG_NS, 'feDisplacementMap');
      fe.setAttribute('in', effect.in);
      fe.setAttribute('in2', effect.in2);
      fe.setAttribute('scale', String(effect.scale));
      if (effect.xChannelSelector) fe.setAttribute('xChannelSelector', effect.xChannelSelector);
      if (effect.yChannelSelector) fe.setAttribute('yChannelSelector', effect.yChannelSelector);
      return fe;
    }

    case 'merge': {
      const fe = document.createElementNS(SVG_NS, 'feMerge');
      for (const node of effect.nodes) {
        const mergeNode = document.createElementNS(SVG_NS, 'feMergeNode');
        mergeNode.setAttribute('in', node);
        fe.appendChild(mergeNode);
      }
      return fe;
    }

    case 'composite': {
      const fe = document.createElementNS(SVG_NS, 'feComposite');
      fe.setAttribute('in', effect.in);
      fe.setAttribute('in2', effect.in2);
      fe.setAttribute('operator', effect.operator);
      if (effect.result) fe.setAttribute('result', effect.result);
      return fe;
    }

    case 'offset': {
      const fe = document.createElementNS(SVG_NS, 'feOffset');
      fe.setAttribute('dx', String(effect.dx));
      fe.setAttribute('dy', String(effect.dy));
      if (effect.in) fe.setAttribute('in', effect.in);
      if (effect.result) fe.setAttribute('result', effect.result);
      return fe;
    }

    case 'flood': {
      const fe = document.createElementNS(SVG_NS, 'feFlood');
      fe.setAttribute('flood-color', effect.color);
      if (effect.opacity !== undefined) fe.setAttribute('flood-opacity', String(effect.opacity));
      if (effect.result) fe.setAttribute('result', effect.result);
      return fe;
    }

    case 'blend': {
      const fe = document.createElementNS(SVG_NS, 'feBlend');
      fe.setAttribute('mode', effect.mode);
      fe.setAttribute('in', effect.in);
      fe.setAttribute('in2', effect.in2);
      if (effect.result) fe.setAttribute('result', effect.result);
      return fe;
    }

    default:
      throw new Error(`Unknown filter effect type: ${(effect as FilterEffect).type}`);
  }
}

/**
 * Create SVG filter element from definition.
 */
function createFilter(filterDef: FilterDef): SVGFilterElement {
  const filter = document.createElementNS(SVG_NS, 'filter') as SVGFilterElement;
  filter.setAttribute('id', filterDef.id);

  if (filterDef.x) filter.setAttribute('x', filterDef.x);
  if (filterDef.y) filter.setAttribute('y', filterDef.y);
  if (filterDef.width) filter.setAttribute('width', filterDef.width);
  if (filterDef.height) filter.setAttribute('height', filterDef.height);

  for (const effect of filterDef.effects) {
    filter.appendChild(createFilterEffect(effect));
  }

  return filter;
}

/**
 * Create SVG mask element from definition.
 */
function createMask(maskDef: MaskDef, createNodeFn: (node: RenderNode) => SVGElement): SVGMaskElement {
  const mask = document.createElementNS(SVG_NS, 'mask') as SVGMaskElement;
  mask.setAttribute('id', maskDef.id);

  if (maskDef.x !== undefined) mask.setAttribute('x', String(maskDef.x));
  if (maskDef.y !== undefined) mask.setAttribute('y', String(maskDef.y));
  if (maskDef.width !== undefined) mask.setAttribute('width', String(maskDef.width));
  if (maskDef.height !== undefined) mask.setAttribute('height', String(maskDef.height));

  for (const child of maskDef.children) {
    mask.appendChild(createNodeFn(child));
  }

  return mask;
}

// =============================================================================
// Node Rendering
// =============================================================================

/**
 * Create SVG element for a path node.
 */
function createPath(node: PathNode): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path') as SVGPathElement;
  path.setAttribute('id', node.id);
  path.setAttribute('d', node.d);
  applyStyle(path, node.style);
  return path;
}

/**
 * Create SVG element for a circle node.
 */
function createCircle(node: CircleNode): SVGCircleElement {
  const circle = document.createElementNS(SVG_NS, 'circle') as SVGCircleElement;
  circle.setAttribute('id', node.id);
  circle.setAttribute('cx', String(node.cx));
  circle.setAttribute('cy', String(node.cy));
  circle.setAttribute('r', String(node.r));
  applyStyle(circle, node.style);
  return circle;
}

/**
 * Create SVG element for a rect node.
 */
function createRect(node: RectNode): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect') as SVGRectElement;
  rect.setAttribute('id', node.id);
  rect.setAttribute('x', String(node.x));
  rect.setAttribute('y', String(node.y));
  rect.setAttribute('width', String(node.width));
  rect.setAttribute('height', String(node.height));
  if (node.rx !== undefined) rect.setAttribute('rx', String(node.rx));
  if (node.ry !== undefined) rect.setAttribute('ry', String(node.ry));
  applyStyle(rect, node.style);
  return rect;
}

/**
 * Create SVG element for a text node.
 */
function createText(node: TextNode): SVGTextElement {
  const text = document.createElementNS(SVG_NS, 'text') as SVGTextElement;
  text.setAttribute('id', node.id);
  text.setAttribute('x', String(node.x));
  text.setAttribute('y', String(node.y));
  text.textContent = node.content;

  if (node.fontSize !== undefined) text.setAttribute('font-size', String(node.fontSize));
  if (node.fontFamily !== undefined) text.setAttribute('font-family', node.fontFamily);
  if (node.fontWeight !== undefined) text.setAttribute('font-weight', String(node.fontWeight));
  if (node.textAnchor !== undefined) text.setAttribute('text-anchor', node.textAnchor);
  if (node.dominantBaseline !== undefined) text.setAttribute('dominant-baseline', node.dominantBaseline);

  applyStyle(text, node.style);
  return text;
}

/**
 * Create SVG element for a group node.
 */
function createGroup(node: GroupNode, createNodeFn: (node: RenderNode) => SVGElement): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  group.setAttribute('id', node.id);
  applyStyle(group, node.style);

  for (const child of node.children) {
    group.appendChild(createNodeFn(child));
  }

  return group;
}

/**
 * Create SVG element for a filter node.
 * This creates both the filter definition and a group with the filter applied.
 */
function createFilterGroup(
  node: FilterNode,
  createNodeFn: (node: RenderNode) => SVGElement,
  defs: SVGDefsElement
): SVGGElement {
  // Add filter to defs if not already present
  const existingFilter = defs.querySelector(`#${node.filterDef.id}`);
  if (!existingFilter) {
    defs.appendChild(createFilter(node.filterDef));
  }

  // Create group with filter applied
  const group = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  group.setAttribute('id', node.id);
  group.setAttribute('filter', `url(#${node.filterDef.id})`);
  applyStyle(group, node.style);

  for (const child of node.children) {
    group.appendChild(createNodeFn(child));
  }

  return group;
}

/**
 * Create SVG element for any render node.
 */
function createNode(
  node: RenderNode,
  defs: SVGDefsElement
): SVGElement {
  const createNodeFn = (n: RenderNode) => createNode(n, defs);

  switch (node.type) {
    case 'path':
      return createPath(node);
    case 'circle':
      return createCircle(node);
    case 'rect':
      return createRect(node);
    case 'text':
      return createText(node);
    case 'group':
      return createGroup(node, createNodeFn);
    case 'filter':
      return createFilterGroup(node, createNodeFn, defs);
    default:
      throw new Error(`Unknown node type: ${(node as RenderNode).type}`);
  }
}

// =============================================================================
// Diffing and Updates
// =============================================================================

/**
 * Update an existing SVG element to match a node.
 */
function updateElement(element: SVGElement, node: RenderNode, _defs: SVGDefsElement): void {
  switch (node.type) {
    case 'path':
      element.setAttribute('d', node.d);
      break;
    case 'circle':
      element.setAttribute('cx', String(node.cx));
      element.setAttribute('cy', String(node.cy));
      element.setAttribute('r', String(node.r));
      break;
    case 'rect':
      element.setAttribute('x', String(node.x));
      element.setAttribute('y', String(node.y));
      element.setAttribute('width', String(node.width));
      element.setAttribute('height', String(node.height));
      if (node.rx !== undefined) element.setAttribute('rx', String(node.rx));
      if (node.ry !== undefined) element.setAttribute('ry', String(node.ry));
      break;
    case 'text':
      element.setAttribute('x', String(node.x));
      element.setAttribute('y', String(node.y));
      element.textContent = node.content;
      if (node.fontSize !== undefined) element.setAttribute('font-size', String(node.fontSize));
      break;
    case 'group':
    case 'filter':
      // Children handled separately
      break;
  }

  applyStyle(element, node.style);
}

// =============================================================================
// SVG Interpreter
// =============================================================================

export type SVGInterpreter = {
  /**
   * Render a RenderTree to the SVG.
   */
  render(tree: RenderTree): void;

  /**
   * Get the SVG element.
   */
  getSVG(): SVGSVGElement;

  /**
   * Clear and reset the SVG.
   */
  clear(): void;
};

/**
 * Create an SVG interpreter that renders to a container.
 */
export function createSVGInterpreter(container: HTMLElement): SVGInterpreter {
  // Create SVG element
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  container.appendChild(svg);

  // Create defs for filters, masks, etc.
  const defs = document.createElementNS(SVG_NS, 'defs') as SVGDefsElement;
  svg.appendChild(defs);

  // Cache of elements by ID for efficient updates
  const elementCache = new Map<string, SVGElement>();

  // Cache of known def IDs to avoid recreating Sets every frame
  const knownDefIds = new Set<string>();

  /**
   * Collect all node IDs in a tree.
   */
  function collectIds(node: RenderNode, ids: Set<string>): void {
    ids.add(node.id);
    if (node.type === 'group' || node.type === 'filter') {
      for (const child of node.children) {
        collectIds(child, ids);
      }
    }
  }

  /**
   * Recursively render or update nodes.
   */
  function renderNode(node: RenderNode, parent: SVGElement): void {
    const existingElement = elementCache.get(node.id);

    if (existingElement) {
      // Update existing element
      updateElement(existingElement, node, defs);

      // Update children for group/filter nodes - diff by ID
      if ((node.type === 'group' || node.type === 'filter') && existingElement instanceof SVGGElement) {
        for (const child of node.children) {
          renderNode(child, existingElement);
        }
      }
    } else {
      // Create new element
      const element = createNode(node, defs);
      parent.appendChild(element);
      elementCache.set(node.id, element);

      // Cache children too
      if (node.type === 'group' || node.type === 'filter') {
        cacheChildren(element, node.children);
      }
    }
  }

  /**
   * Cache child elements.
   */
  function cacheChildren(parent: SVGElement, children: readonly RenderNode[]): void {
    const childElements = Array.from(parent.children) as SVGElement[];
    for (let i = 0; i < children.length && i < childElements.length; i++) {
      const child = children[i];
      const element = childElements[i];
      elementCache.set(child.id, element);

      if (child.type === 'group' || child.type === 'filter') {
        cacheChildren(element, child.children);
      }
    }
  }

  return {
    render(tree: RenderTree): void {
      // Update SVG dimensions
      svg.setAttribute('width', String(tree.width));
      svg.setAttribute('height', String(tree.height));

      if (tree.viewBox) {
        const { minX, minY, width, height } = tree.viewBox;
        svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
      }

      // Update defs (filters, masks) - only add missing, track for cleanup
      if (tree.defs) {
        const currentDefIds = new Set<string>();

        // Add missing filters
        if (tree.defs.filters) {
          for (const filterDef of tree.defs.filters) {
            currentDefIds.add(filterDef.id);
            if (!knownDefIds.has(filterDef.id)) {
              defs.appendChild(createFilter(filterDef));
              knownDefIds.add(filterDef.id);
            }
          }
        }

        // Add missing masks
        if (tree.defs.masks) {
          for (const maskDef of tree.defs.masks) {
            currentDefIds.add(maskDef.id);
            if (!knownDefIds.has(maskDef.id)) {
              defs.appendChild(createMask(maskDef, (n) => createNode(n, defs)));
              knownDefIds.add(maskDef.id);
            }
          }
        }

        // Remove stale defs (only if we have more cached than current)
        if (knownDefIds.size > currentDefIds.size) {
          for (const id of knownDefIds) {
            if (!currentDefIds.has(id)) {
              const element = defs.querySelector(`#${id}`);
              if (element) element.remove();
              knownDefIds.delete(id);
            }
          }
        }
      }

      // Set background if specified
      if (tree.backgroundColor) {
        svg.style.backgroundColor = tree.backgroundColor;
      }

      // Find or create root container
      let rootContainer = svg.querySelector(':scope > g[data-root="true"]') as SVGGElement | null;
      if (!rootContainer) {
        rootContainer = document.createElementNS(SVG_NS, 'g') as SVGGElement;
        rootContainer.setAttribute('data-root', 'true');
        svg.appendChild(rootContainer);
      }

      // Track which IDs are in the new tree
      const activeIds = new Set<string>();
      collectIds(tree.root, activeIds);

      // Update or create elements
      renderNode(tree.root, rootContainer);

      // Remove elements no longer in tree
      for (const [id, element] of elementCache.entries()) {
        if (!activeIds.has(id)) {
          element.remove();
          elementCache.delete(id);
        }
      }
    },

    getSVG(): SVGSVGElement {
      return svg;
    },

    clear(): void {
      defs.innerHTML = '';
      const rootContainer = svg.querySelector(':scope > g[data-root="true"]');
      if (rootContainer) {
        rootContainer.innerHTML = '';
      }
      elementCache.clear();
      knownDefIds.clear();
    },
  };
}

// =============================================================================
// Static Rendering (for SSR or testing)
// =============================================================================

/**
 * Render a RenderTree to an SVG string.
 */
export function renderToString(tree: RenderTree): string {
  const parts: string[] = [];

  // SVG opening tag
  parts.push(`<svg xmlns="${SVG_NS}" width="${tree.width}" height="${tree.height}"`);
  if (tree.viewBox) {
    const { minX, minY, width, height } = tree.viewBox;
    parts.push(` viewBox="${minX} ${minY} ${width} ${height}"`);
  }
  parts.push('>');

  // Defs
  if (tree.defs) {
    parts.push('<defs>');
    if (tree.defs.filters) {
      for (const filterDef of tree.defs.filters) {
        parts.push(renderFilterToString(filterDef));
      }
    }
    if (tree.defs.masks) {
      for (const maskDef of tree.defs.masks) {
        parts.push(renderMaskToString(maskDef));
      }
    }
    parts.push('</defs>');
  }

  // Root node
  parts.push(renderNodeToString(tree.root));

  parts.push('</svg>');

  return parts.join('');
}

function renderFilterToString(filterDef: FilterDef): string {
  const attrs = [`id="${filterDef.id}"`];
  if (filterDef.x) attrs.push(`x="${filterDef.x}"`);
  if (filterDef.y) attrs.push(`y="${filterDef.y}"`);
  if (filterDef.width) attrs.push(`width="${filterDef.width}"`);
  if (filterDef.height) attrs.push(`height="${filterDef.height}"`);

  const effectStrings = filterDef.effects.map(renderEffectToString);
  return `<filter ${attrs.join(' ')}>${effectStrings.join('')}</filter>`;
}

function renderEffectToString(effect: FilterEffect): string {
  switch (effect.type) {
    case 'gaussianBlur':
      return `<feGaussianBlur stdDeviation="${effect.stdDeviation}"${effect.in ? ` in="${effect.in}"` : ''}${effect.result ? ` result="${effect.result}"` : ''}/>`;
    case 'dropShadow':
      return `<feDropShadow dx="${effect.dx}" dy="${effect.dy}" stdDeviation="${effect.stdDeviation}" flood-color="${effect.color}"/>`;
    case 'colorMatrix':
      return `<feColorMatrix type="matrix" values="${effect.values.join(' ')}"${effect.in ? ` in="${effect.in}"` : ''}${effect.result ? ` result="${effect.result}"` : ''}/>`;
    case 'merge':
      return `<feMerge>${effect.nodes.map(n => `<feMergeNode in="${n}"/>`).join('')}</feMerge>`;
    case 'composite':
      return `<feComposite in="${effect.in}" in2="${effect.in2}" operator="${effect.operator}"${effect.result ? ` result="${effect.result}"` : ''}/>`;
    case 'offset':
      return `<feOffset dx="${effect.dx}" dy="${effect.dy}"${effect.in ? ` in="${effect.in}"` : ''}${effect.result ? ` result="${effect.result}"` : ''}/>`;
    case 'flood':
      return `<feFlood flood-color="${effect.color}"${effect.opacity !== undefined ? ` flood-opacity="${effect.opacity}"` : ''}${effect.result ? ` result="${effect.result}"` : ''}/>`;
    case 'blend':
      return `<feBlend mode="${effect.mode}" in="${effect.in}" in2="${effect.in2}"${effect.result ? ` result="${effect.result}"` : ''}/>`;
    default:
      return '';
  }
}

function renderMaskToString(maskDef: MaskDef): string {
  const attrs = [`id="${maskDef.id}"`];
  if (maskDef.x !== undefined) attrs.push(`x="${maskDef.x}"`);
  if (maskDef.y !== undefined) attrs.push(`y="${maskDef.y}"`);
  if (maskDef.width !== undefined) attrs.push(`width="${maskDef.width}"`);
  if (maskDef.height !== undefined) attrs.push(`height="${maskDef.height}"`);

  const childStrings = maskDef.children.map(renderNodeToString);
  return `<mask ${attrs.join(' ')}>${childStrings.join('')}</mask>`;
}

function renderStyleToString(style?: Style): string {
  if (!style) return '';
  const attrs: string[] = [];

  if (style.fill !== undefined) attrs.push(`fill="${style.fill}"`);
  if (style.stroke !== undefined) attrs.push(`stroke="${style.stroke}"`);
  if (style.strokeWidth !== undefined) attrs.push(`stroke-width="${style.strokeWidth}"`);
  if (style.strokeLinecap !== undefined) attrs.push(`stroke-linecap="${style.strokeLinecap}"`);
  if (style.strokeLinejoin !== undefined) attrs.push(`stroke-linejoin="${style.strokeLinejoin}"`);
  if (style.strokeDasharray !== undefined) attrs.push(`stroke-dasharray="${style.strokeDasharray}"`);
  if (style.strokeDashoffset !== undefined) attrs.push(`stroke-dashoffset="${style.strokeDashoffset}"`);
  if (style.opacity !== undefined) attrs.push(`opacity="${style.opacity}"`);
  if (style.fillOpacity !== undefined) attrs.push(`fill-opacity="${style.fillOpacity}"`);
  if (style.strokeOpacity !== undefined) attrs.push(`stroke-opacity="${style.strokeOpacity}"`);
  if (style.transform !== undefined) attrs.push(`transform="${style.transform}"`);
  if (style.filter !== undefined) attrs.push(`filter="${style.filter}"`);
  if (style.mask !== undefined) attrs.push(`mask="${style.mask}"`);
  if (style.clipPath !== undefined) attrs.push(`clip-path="${style.clipPath}"`);

  return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
}

function renderNodeToString(node: RenderNode): string {
  const styleStr = renderStyleToString(node.style);

  switch (node.type) {
    case 'path':
      return `<path id="${node.id}" d="${node.d}"${styleStr}/>`;
    case 'circle':
      return `<circle id="${node.id}" cx="${node.cx}" cy="${node.cy}" r="${node.r}"${styleStr}/>`;
    case 'rect': {
      const rx = node.rx !== undefined ? ` rx="${node.rx}"` : '';
      const ry = node.ry !== undefined ? ` ry="${node.ry}"` : '';
      return `<rect id="${node.id}" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"${rx}${ry}${styleStr}/>`;
    }
    case 'text': {
      const attrs: string[] = [`id="${node.id}"`, `x="${node.x}"`, `y="${node.y}"`];
      if (node.fontSize !== undefined) attrs.push(`font-size="${node.fontSize}"`);
      if (node.fontFamily !== undefined) attrs.push(`font-family="${node.fontFamily}"`);
      if (node.fontWeight !== undefined) attrs.push(`font-weight="${node.fontWeight}"`);
      if (node.textAnchor !== undefined) attrs.push(`text-anchor="${node.textAnchor}"`);
      if (node.dominantBaseline !== undefined) attrs.push(`dominant-baseline="${node.dominantBaseline}"`);
      return `<text ${attrs.join(' ')}${styleStr}>${escapeXml(node.content)}</text>`;
    }
    case 'group':
      return `<g id="${node.id}"${styleStr}>${node.children.map(renderNodeToString).join('')}</g>`;
    case 'filter':
      return `<g id="${node.id}" filter="url(#${node.filterDef.id})"${styleStr}>${node.children.map(renderNodeToString).join('')}</g>`;
    default:
      return '';
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
