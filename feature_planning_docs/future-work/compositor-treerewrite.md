/**
 * TreeRewrite + Selection + Bounds utilities
 * -----------------------------------------
 * This is the “missing glue” that makes compositors actually implementable:
 * - resolve stable selections from ids/tags/structure
 * - wrap/replace nodes at stable paths
 * - compute/cached bounds per node (when possible)
 *
 * Design goals:
 * - Pure structural operations (no renderer required) for selection & rewriting.
 * - Bounds computation is delegated via a BoundsResolver (renderer/geom layer),
 *   but cached in GeometryCache with stable keys.
 */

/* ---------- Core types (match your kernel) ---------- */

export type NodeId = string;

export interface Vec2 { x: number; y: number; }
export interface Bounds { min: Vec2; max: Vec2; }

export type DrawNode = GroupNode | ShapeNode | EffectNode;

export interface BaseNode {
  id: NodeId;
  tags?: readonly string[];
  meta?: Record<string, unknown>;
}

export interface GroupNode extends BaseNode {
  kind: "group";
  children: readonly DrawNode[];
}

export interface ShapeNode extends BaseNode {
  kind: "shape";
  geom: unknown;
  style?: unknown;
}

export interface EffectNode extends BaseNode {
  kind: "effect";
  effect: unknown;
  child: DrawNode;
}

export type RenderTree = DrawNode;

export type NodePath = readonly number[]; // indices down children arrays

export type Selector =
  | { kind: "all" }
  | { kind: "byId"; ids: readonly NodeId[] }
  | { kind: "byTag"; tag: string }
  | { kind: "childrenOf"; id: NodeId }
  | { kind: "predicate"; test: (node: DrawNode) => boolean };

export interface Selection {
  ids: readonly NodeId[];
  paths: readonly NodePath[];
}

export interface GeometryCache {
  get<K extends object, V>(key: K, compute: () => V): V;
  invalidate(scope?: any): void;
}

/* ---------- Stable hashing for cache keys ---------- */

export function hash32(s: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

export function selectionSignature(ids: readonly NodeId[]): string {
  // stable across runs; not cryptographic
  return String(hash32(ids.join("|")));
}

/* ---------- Tree traversal helpers ---------- */

export interface TraversalItem {
  node: DrawNode;
  path: NodePath;
  parent?: GroupNode | EffectNode;
  indexInParent?: number; // index in parent's child array (for group) or 0 for effect-child
}

export function* traverse(tree: DrawNode): Generator<TraversalItem> {
  function* rec(node: DrawNode, path: number[], parent?: GroupNode | EffectNode, indexInParent?: number) {
    yield { node, path, parent, indexInParent };
    if (node.kind === "group") {
      for (let i = 0; i < node.children.length; i++) {
        yield* rec(node.children[i]!, path.concat(i), node, i);
      }
    } else if (node.kind === "effect") {
      // treat effect child as a single branch at index 0 (stable)
      yield* rec(node.child, path.concat(0), node, 0);
    }
  }
  yield* rec(tree, []);
}

export function getAt(tree: DrawNode, path: NodePath): DrawNode {
  let cur: DrawNode = tree;
  for (let depth = 0; depth < path.length; depth++) {
    const idx = path[depth]!;
    if (cur.kind === "group") {
      cur = cur.children[idx]!;
    } else if (cur.kind === "effect") {
      if (idx !== 0) throw new Error(`Invalid path: effect child index must be 0, got ${idx}`);
      cur = cur.child;
    } else {
      throw new Error(`Invalid path: hit leaf at depth ${depth}`);
    }
    if (!cur) throw new Error(`Invalid path: missing node at depth ${depth}`);
  }
  return cur;
}

/**
 * Pure, persistent update: replace the node at path with `replacement`.
 * Returns a new tree (structural sharing where possible).
 */
export function replaceAt(tree: DrawNode, path: NodePath, replacement: DrawNode): DrawNode {
  if (path.length === 0) return replacement;

  const [head, ...tail] = path as number[];
  if (tree.kind === "group") {
    if (head < 0 || head >= tree.children.length) throw new Error("replaceAt: path out of range");
    const next = tree.children[head]!;
    const replacedChild = replaceAt(next, tail, replacement);
    if (replacedChild === next) return tree;

    const children = tree.children.slice();
    children[head] = replacedChild;
    return { ...tree, children };
  }

  if (tree.kind === "effect") {
    if (head !== 0) throw new Error("replaceAt: effect path head must be 0");
    const next = tree.child;
    const replacedChild = replaceAt(next, tail, replacement);
    if (replacedChild === next) return tree;
    return { ...tree, child: replacedChild };
  }

  throw new Error("replaceAt: path hits leaf before end");
}

/**
 * Wrap the node at `path` with wrapper(child) => newNode.
 * Wrapper receives the original node and returns its parent wrapper.
 */
export function wrapAt(tree: DrawNode, path: NodePath, wrapper: (child: DrawNode) => DrawNode): DrawNode {
  const child = getAt(tree, path);
  const wrapped = wrapper(child);
  return replaceAt(tree, path, wrapped);
}

/* ---------- Selection resolution ---------- */

export function select(tree: DrawNode, selector: Selector): Selection {
  // Collect matches in traversal order; stable and deterministic.
  const matches: { id: NodeId; path: NodePath }[] = [];

  if (selector.kind === "all") {
    for (const it of traverse(tree)) matches.push({ id: it.node.id, path: it.path });
    return finalizeSelection(matches);
  }

  if (selector.kind === "byId") {
    const want = new Set(selector.ids);
    for (const it of traverse(tree)) {
      if (want.has(it.node.id)) matches.push({ id: it.node.id, path: it.path });
    }
    // preserve order of selector.ids if requested by compositor spec (optional outside this util)
    return finalizeSelection(matches);
  }

  if (selector.kind === "byTag") {
    const tag = selector.tag;
    for (const it of traverse(tree)) {
      const tags = it.node.tags ?? [];
      if (tags.includes(tag)) matches.push({ id: it.node.id, path: it.path });
    }
    return finalizeSelection(matches);
  }

  if (selector.kind === "childrenOf") {
    // Find the first node with id, then return its immediate children (group children or effect child)
    const parent = findById(tree, selector.id);
    if (!parent) return { ids: [], paths: [] };

    if (parent.node.kind === "group") {
      const ids: NodeId[] = [];
      const paths: NodePath[] = [];
      for (let i = 0; i < parent.node.children.length; i++) {
        const child = parent.node.children[i]!;
        ids.push(child.id);
        paths.push(parent.path.concat(i));
      }
      return { ids, paths };
    }

    if (parent.node.kind === "effect") {
      return { ids: [parent.node.child.id], paths: [parent.path.concat(0)] };
    }

    return { ids: [], paths: [] };
  }

  // predicate
  for (const it of traverse(tree)) {
    if (selector.test(it.node)) matches.push({ id: it.node.id, path: it.path });
  }
  return finalizeSelection(matches);
}

function finalizeSelection(items: { id: NodeId; path: NodePath }[]): Selection {
  // De-dupe by id (first hit wins) to keep “one node, one slot”
  const seen = new Set<NodeId>();
  const ids: NodeId[] = [];
  const paths: NodePath[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    ids.push(it.id);
    paths.push(it.path);
  }
  return { ids, paths };
}

export function findById(tree: DrawNode, id: NodeId): { node: DrawNode; path: NodePath } | null {
  for (const it of traverse(tree)) {
    if (it.node.id === id) return { node: it.node, path: it.path };
  }
  return null;
}

/* ---------- Bounds resolution (renderer/geom-integrated) ---------- */

/**
 * BoundsResolver is the bridge between semantic render nodes and geometry.
 * - For shapes, the renderer/scene system should know how to compute bounds from `geom`.
 * - For effects, bounds usually flow through, but transforms may change them (optional).
 * - For groups, bounds is union of children.
 *
 * You can implement this resolver per renderer backend, or provide a generic one
 * for your own internal geometry types.
 */
export interface BoundsResolver {
  /** Return bounds for a shape node's geometry, or null if unknown. */
  boundsOfShape(shape: ShapeNode, cache: GeometryCache): Bounds | null;

  /**
   * If you want transforms (2D/3D) to affect bounds in compositors, implement this.
   * If not, just return child bounds (good enough for many origin policies).
   */
  boundsOfEffect?(effect: EffectNode, childBounds: Bounds, cache: GeometryCache): Bounds;

  /** Optional: union padding or inflation for glows/filters */
  inflate?(b: Bounds, node: DrawNode): Bounds;
}

export type BoundsKey =
  | { kind: "NodeBounds"; treeSig: string; nodeId: NodeId }
  | { kind: "TreeBounds"; treeSig: string };

/**
 * Compute bounds for a specific node id, cached by (tree signature, node id).
 * `treeSig` should change whenever the *geometry topology* changes.
 * (For most archetypes, scene id + seed + mode stack hash is enough.)
 */
export function boundsOfNode(
  tree: DrawNode,
  nodeId: NodeId,
  treeSig: string,
  cache: GeometryCache,
  resolver: BoundsResolver
): Bounds | null {
  const key: BoundsKey = { kind: "NodeBounds", treeSig, nodeId };
  return cache.get(key as any, () => {
    const found = findById(tree, nodeId);
    if (!found) return null;
    return computeBoundsAtPath(tree, found.path, treeSig, cache, resolver);
  });
}

/** Compute bounds of entire tree (cached) */
export function boundsOfTree(
  tree: DrawNode,
  treeSig: string,
  cache: GeometryCache,
  resolver: BoundsResolver
): Bounds | null {
  const key: BoundsKey = { kind: "TreeBounds", treeSig };
  return cache.get(key as any, () => computeBounds(tree, treeSig, cache, resolver));
}

/**
 * Compute bounds for node at path.
 * Uses structural recursion, caching sub-results per node id is handled by boundsOfNode().
 */
export function computeBoundsAtPath(
  tree: DrawNode,
  path: NodePath,
  treeSig: string,
  cache: GeometryCache,
  resolver: BoundsResolver
): Bounds | null {
  const node = getAt(tree, path);
  return computeBounds(node, treeSig, cache, resolver);
}

export function computeBounds(
  node: DrawNode,
  treeSig: string,
  cache: GeometryCache,
  resolver: BoundsResolver
): Bounds | null {
  if (node.kind === "shape") {
    const b = resolver.boundsOfShape(node, cache);
    return b ? (resolver.inflate ? resolver.inflate(b, node) : b) : null;
  }

  if (node.kind === "effect") {
    const childB = computeBounds(node.child, treeSig, cache, resolver);
    if (!childB) return null;
    const b = resolver.boundsOfEffect ? resolver.boundsOfEffect(node, childB, cache) : childB;
    return resolver.inflate ? resolver.inflate(b, node) : b;
  }

  // group
  let acc: Bounds | null = null;
  for (const ch of node.children) {
    const b = computeBounds(ch, treeSig, cache, resolver);
    if (!b) continue;
    acc = acc ? unionBounds(acc, b) : b;
  }
  return acc ? (resolver.inflate ? resolver.inflate(acc, node) : acc) : null;
}

export function unionBounds(a: Bounds, b: Bounds): Bounds {
  return {
    min: { x: Math.min(a.min.x, b.min.x), y: Math.min(a.min.y, b.min.y) },
    max: { x: Math.max(a.max.x, b.max.x), y: Math.max(a.max.y, b.max.y) },
  };
}

export function boundsCenter(b: Bounds): Vec2 {
  return { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2 };
}

/* ---------- Common origin policies (for compositors) ---------- */

export type OriginPolicy =
  | { kind: "sceneCenter" }
  | { kind: "nodeBoundsCenter" }
  | { kind: "explicit"; get: (node: DrawNode) => Vec2 }
  | { kind: "inherit" };

export interface OriginResolverCtx {
  tree: DrawNode;
  treeSig: string;
  cache: GeometryCache;
  bounds: BoundsResolver;
}

export function resolveOrigin(
  node: DrawNode,
  policy: OriginPolicy,
  ctx: OriginResolverCtx
): Vec2 {
  if (policy.kind === "explicit") return policy.get(node);

  if (policy.kind === "sceneCenter") {
    const b = boundsOfTree(ctx.tree, ctx.treeSig, ctx.cache, ctx.bounds);
    return b ? boundsCenter(b) : { x: 0, y: 0 };
  }

  if (policy.kind === "nodeBoundsCenter") {
    const b = boundsOfNode(ctx.tree, node.id, ctx.treeSig, ctx.cache, ctx.bounds);
    return b ? boundsCenter(b) : { x: 0, y: 0 };
  }

  // inherit: caller should pass down origin; here we default to sceneCenter
  const bb = boundsOfTree(ctx.tree, ctx.treeSig, ctx.cache, ctx.bounds);
  return bb ? boundsCenter(bb) : { x: 0, y: 0 };
}

/* ---------- Optional: stable order helpers ---------- */

export function orderSelectionById(sel: Selection): Selection {
  const items = sel.ids.map((id, i) => ({ id, path: sel.paths[i]! }));
  items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { ids: items.map(x => x.id), paths: items.map(x => x.path) };
}

/* ---------- Notes for integration ----------
 * 1) Provide TreeRewrite as an object:
 *    const TreeRewrite: TreeRewrite = { select, wrapAt, getAt, replaceAt, ... }
 *
 * 2) Your renderer should implement BoundsResolver for its geometry.
 *    For SVG-path geometry, bounds can come from cached parsed paths.
 *
 * 3) treeSig:
 *    - simplest: hash(sceneId + seed + modeStackSignature)
 *    - must change when the underlying geometry changes, not when only transforms/styles change.
 */