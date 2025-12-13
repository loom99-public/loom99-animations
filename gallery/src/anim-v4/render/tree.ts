/**
 * V4 Animation Framework - RenderTree
 *
 * RenderTree is a backend-neutral representation of visual output.
 * Animations produce Signal<RenderTree>, which interpreters convert
 * to SVG, Canvas, or other backends.
 *
 * Benefits:
 * - Decouples animation logic from rendering
 * - Same animation can render to SVG, Canvas, or WebGL
 * - Enables visual diffing and testing
 * - Supports server-side rendering
 *
 * Design:
 * - Minimal set of node types (path, circle, rect, text, group, filter, mask)
 * - Add more node types as animations need them
 * - Stable IDs for efficient DOM updates
 */

// =============================================================================
// Style Types
// =============================================================================

/**
 * Color can be a CSS color string or structured color.
 */
export type Color = string;

/**
 * Transform represented as a transform matrix or CSS transform string.
 */
export type Transform = string;

/**
 * Common style properties shared by most nodes.
 */
export type Style = {
  readonly fill?: Color;
  readonly stroke?: Color;
  readonly strokeWidth?: number;
  readonly strokeLinecap?: 'butt' | 'round' | 'square';
  readonly strokeLinejoin?: 'miter' | 'round' | 'bevel';
  readonly strokeDasharray?: string;
  readonly strokeDashoffset?: number;
  readonly opacity?: number;
  readonly fillOpacity?: number;
  readonly strokeOpacity?: number;
  readonly transform?: Transform;
  readonly filter?: string;  // Reference to filter by ID (e.g., "url(#glow)")
  readonly mask?: string;    // Reference to mask by ID (e.g., "url(#revealMask)")
  readonly clipPath?: string; // Reference to clipPath by ID
};

// =============================================================================
// Filter Definitions
// =============================================================================

/**
 * Gaussian blur filter effect.
 */
export type GaussianBlurEffect = {
  readonly type: 'gaussianBlur';
  readonly stdDeviation: number;
  readonly in?: string;
  readonly result?: string;
};

/**
 * Drop shadow filter effect.
 */
export type DropShadowEffect = {
  readonly type: 'dropShadow';
  readonly dx: number;
  readonly dy: number;
  readonly stdDeviation: number;
  readonly color: Color;
};

/**
 * Color matrix effect (for glitch effects, etc.)
 */
export type ColorMatrixEffect = {
  readonly type: 'colorMatrix';
  readonly values: readonly number[];  // 20 values for the matrix
  readonly in?: string;
  readonly result?: string;
};

/**
 * Displacement map effect (for distortion).
 */
export type DisplacementMapEffect = {
  readonly type: 'displacementMap';
  readonly in: string;
  readonly in2: string;
  readonly scale: number;
  readonly xChannelSelector?: 'R' | 'G' | 'B' | 'A';
  readonly yChannelSelector?: 'R' | 'G' | 'B' | 'A';
};

/**
 * Merge effect (combine multiple effects).
 */
export type MergeEffect = {
  readonly type: 'merge';
  readonly nodes: readonly string[];
};

/**
 * Composite effect (combine with different operations).
 */
export type CompositeEffect = {
  readonly type: 'composite';
  readonly in: string;
  readonly in2: string;
  readonly operator: 'over' | 'in' | 'out' | 'atop' | 'xor' | 'arithmetic';
  readonly result?: string;
};

/**
 * Offset effect (shifts the input).
 */
export type OffsetEffect = {
  readonly type: 'offset';
  readonly dx: number;
  readonly dy: number;
  readonly in?: string;
  readonly result?: string;
};

/**
 * Flood effect (fills with a solid color).
 */
export type FloodEffect = {
  readonly type: 'flood';
  readonly color: Color;
  readonly opacity?: number;
  readonly result?: string;
};

/**
 * Blend effect (blends two inputs).
 */
export type BlendEffect = {
  readonly type: 'blend';
  readonly mode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';
  readonly in: string;
  readonly in2: string;
  readonly result?: string;
};

/**
 * Union of all filter effect types.
 */
export type FilterEffect =
  | GaussianBlurEffect
  | DropShadowEffect
  | ColorMatrixEffect
  | DisplacementMapEffect
  | MergeEffect
  | CompositeEffect
  | OffsetEffect
  | FloodEffect
  | BlendEffect;

/**
 * Complete filter definition.
 */
export type FilterDef = {
  readonly id: string;
  readonly effects: readonly FilterEffect[];
  readonly x?: string;
  readonly y?: string;
  readonly width?: string;
  readonly height?: string;
};

// =============================================================================
// Mask Definitions
// =============================================================================

/**
 * Mask definition using child nodes to define the mask shape.
 */
export type MaskDef = {
  readonly id: string;
  readonly children: readonly RenderNode[];
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
};

// =============================================================================
// Render Node Types
// =============================================================================

/**
 * Base properties shared by all nodes.
 */
type NodeBase = {
  readonly id: string;
  readonly style?: Style;
};

/**
 * Path node - the most versatile primitive.
 * Can represent any shape via SVG path data.
 */
export type PathNode = NodeBase & {
  readonly type: 'path';
  readonly d: string;  // SVG path data
};

/**
 * Circle node.
 */
export type CircleNode = NodeBase & {
  readonly type: 'circle';
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
};

/**
 * Rectangle node.
 */
export type RectNode = NodeBase & {
  readonly type: 'rect';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rx?: number;  // Corner radius
  readonly ry?: number;
};

/**
 * Text node.
 */
export type TextNode = NodeBase & {
  readonly type: 'text';
  readonly x: number;
  readonly y: number;
  readonly content: string;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly fontWeight?: string | number;
  readonly textAnchor?: 'start' | 'middle' | 'end';
  readonly dominantBaseline?: 'auto' | 'middle' | 'hanging' | 'alphabetic';
};

/**
 * Group node - container for other nodes.
 */
export type GroupNode = NodeBase & {
  readonly type: 'group';
  readonly children: readonly RenderNode[];
};

/**
 * Filter reference node - applies a filter to children.
 */
export type FilterNode = NodeBase & {
  readonly type: 'filter';
  readonly filterDef: FilterDef;
  readonly children: readonly RenderNode[];
};

/**
 * Union of all render node types.
 */
export type RenderNode =
  | PathNode
  | CircleNode
  | RectNode
  | TextNode
  | GroupNode
  | FilterNode;

// =============================================================================
// RenderTree - The Complete Output
// =============================================================================

/**
 * Complete render tree representing a frame of animation.
 */
export type RenderTree = {
  readonly width: number;
  readonly height: number;
  readonly viewBox?: {
    readonly minX: number;
    readonly minY: number;
    readonly width: number;
    readonly height: number;
  };
  readonly defs?: {
    readonly filters?: readonly FilterDef[];
    readonly masks?: readonly MaskDef[];
  };
  readonly root: RenderNode;
  readonly backgroundColor?: Color;
};

// =============================================================================
// Node Constructors
// =============================================================================

/**
 * Create a path node.
 */
export function path(
  id: string,
  d: string,
  style?: Style
): PathNode {
  return { type: 'path', id, d, style };
}

/**
 * Create a circle node.
 */
export function circle(
  id: string,
  cx: number,
  cy: number,
  r: number,
  style?: Style
): CircleNode {
  return { type: 'circle', id, cx, cy, r, style };
}

/**
 * Create a rectangle node.
 */
export function rect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style?: Style
): RectNode {
  return { type: 'rect', id, x, y, width, height, style };
}

/**
 * Create a text node.
 */
export function text(
  id: string,
  x: number,
  y: number,
  content: string,
  style?: Style,
  options?: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    textAnchor?: 'start' | 'middle' | 'end';
    dominantBaseline?: 'auto' | 'middle' | 'hanging' | 'alphabetic';
  }
): TextNode {
  return {
    type: 'text',
    id,
    x,
    y,
    content,
    style,
    ...options,
  };
}

/**
 * Create a group node.
 */
export function group(
  id: string,
  children: readonly RenderNode[],
  style?: Style
): GroupNode {
  return { type: 'group', id, children, style };
}

/**
 * Create a filter node.
 */
export function filter(
  id: string,
  filterDef: FilterDef,
  children: readonly RenderNode[],
  style?: Style
): FilterNode {
  return { type: 'filter', id, filterDef, children, style };
}

// =============================================================================
// Filter Constructors
// =============================================================================

/**
 * Create a glow filter (blur + composite).
 * @param _color - Reserved for future colored glow support
 */
export function glowFilter(
  id: string,
  radius: number,
  _color: Color = 'white'
): FilterDef {
  return {
    id,
    effects: [
      { type: 'gaussianBlur', stdDeviation: radius, result: 'blur' },
      { type: 'merge', nodes: ['blur', 'SourceGraphic'] },
    ],
    x: '-50%',
    y: '-50%',
    width: '200%',
    height: '200%',
  };
}

/**
 * Create a drop shadow filter.
 */
export function dropShadowFilter(
  id: string,
  dx: number,
  dy: number,
  blur: number,
  color: Color = 'rgba(0,0,0,0.5)'
): FilterDef {
  return {
    id,
    effects: [
      { type: 'dropShadow', dx, dy, stdDeviation: blur, color },
    ],
  };
}

/**
 * Create a "goo" filter for liquid/blob effects.
 */
export function gooFilter(
  id: string,
  blur: number,
  contrast: number = 20
): FilterDef {
  // The goo effect uses blur + color matrix to create blobby merging
  const matrix = [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, contrast, -contrast / 2,
  ];

  return {
    id,
    effects: [
      { type: 'gaussianBlur', stdDeviation: blur, result: 'blur' },
      { type: 'colorMatrix', values: matrix },
    ],
  };
}

// =============================================================================
// RenderTree Constructors
// =============================================================================

/**
 * Create a render tree with a single root node.
 */
export function renderTree(
  width: number,
  height: number,
  root: RenderNode,
  options?: {
    defs?: RenderTree['defs'];
    viewBox?: RenderTree['viewBox'];
    backgroundColor?: Color;
  }
): RenderTree {
  return {
    width,
    height,
    root,
    ...options,
  };
}

// =============================================================================
// Tree Manipulation
// =============================================================================

/**
 * Map over all nodes in a tree.
 */
export function mapNodes(
  tree: RenderTree,
  fn: (node: RenderNode) => RenderNode
): RenderTree {
  const mapNode = (node: RenderNode): RenderNode => {
    const mapped = fn(node);
    if (mapped.type === 'group') {
      return { ...mapped, children: mapped.children.map(mapNode) };
    }
    if (mapped.type === 'filter') {
      return { ...mapped, children: mapped.children.map(mapNode) };
    }
    return mapped;
  };

  return {
    ...tree,
    root: mapNode(tree.root),
  };
}

/**
 * Find a node by ID.
 */
export function findNode(
  tree: RenderTree,
  id: string
): RenderNode | undefined {
  const search = (node: RenderNode): RenderNode | undefined => {
    if (node.id === id) return node;
    if (node.type === 'group' || node.type === 'filter') {
      for (const child of node.children) {
        const found = search(child);
        if (found) return found;
      }
    }
    return undefined;
  };
  return search(tree.root);
}

/**
 * Flatten tree to array of all nodes.
 */
export function flattenNodes(tree: RenderTree): readonly RenderNode[] {
  const result: RenderNode[] = [];

  const collect = (node: RenderNode): void => {
    result.push(node);
    if (node.type === 'group' || node.type === 'filter') {
      node.children.forEach(collect);
    }
  };

  collect(tree.root);
  return result;
}
