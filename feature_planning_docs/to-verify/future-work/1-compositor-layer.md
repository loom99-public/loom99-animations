Below is a canonical Compositor Kernel Interface that makes compositors (including Transform3D) fully first-class, maximally pure, and stackable.

It’s written as a single coherent “header” you can drop into your kernel. It assumes you already have the core ideas: Program, PhaseMachine, Field<T> (bulk), GeometryCache, Seed, CompileCtx, Env.

⸻

Compositor Kernel Interface

1) Render tree model

Key idea: compositors operate on a render tree that can carry semantic nodes (effects/transforms) without committing to SVG/Canvas/WebGL.

// ---------- Primitives ----------
export type NodeId = string;

export interface Vec2 { x: number; y: number; }
export interface Bounds { min: Vec2; max: Vec2; }

export type Color = { r: number; g: number; b: number; a?: number } | string;

// ---------- Program ----------
export interface Program<T> {
  signal: (tMs: number, rt: RuntimeCtx) => T;
  event: (ev: KernelEvent) => KernelEvent[]; // optional; can be []
}

export interface RuntimeCtx {
  viewport: { w: number; h: number; dpr: number };
  reducedMotion?: boolean;
}

// ---------- Field (bulk, compile-time) ----------
export type Seed = number;

export interface CompileCtx {
  env: Env;
  geom: GeometryCache;
  // optional: current scene bounds / selection cache etc.
}

export type Field<T> = (seed: Seed, n: number, ctx: CompileCtx) => readonly T[];

// ---------- Geometry Cache ----------
export interface GeometryCache {
  get<K extends object, V>(key: K, compute: () => V): V;
  invalidate(scope?: any): void;
}

// ---------- Phase Machine ----------
export interface PhaseSample {
  phase: string;
  u: number;     // normalized in-phase progress
  uRaw: number;
  tLocal: number;
}

export interface PhaseMachine {
  sample(tMs: number): PhaseSample;
}

export interface Env {
  now?: () => number;
  // any compile-time global knobs, feature flags, etc.
}

// ---------- Render Tree ----------
export type RenderTree = DrawNode;

export type DrawNode =
  | GroupNode
  | ShapeNode
  | EffectNode;

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
  // renderer-specific payload (path, circle, mesh, text, etc.)
  geom: unknown;
  style?: Style;
}

export interface Style {
  opacity?: number;
  fill?: Color | { kind: "none" };
  stroke?: Color;
  strokeWidth?: number;
  lineCap?: "round" | "butt" | "square";
  lineJoin?: "round" | "miter" | "bevel";
  // plus any stable style fields you want
}

// Effect nodes are *semantic* and renderer-resolved.
export interface EffectNode extends BaseNode {
  kind: "effect";
  effect: Effect;
  child: DrawNode;
}

export type Effect =
  | Transform2DEffect
  | Transform3DEffect
  | OpacityMulEffect
  | ColorMatrixEffect
  | MaskEffect
  | GlowEffect
  | CustomEffect;

export interface Transform2DEffect {
  kind: "transform2d";
  transform: Transform2D;
}
export interface Transform3DEffect {
  kind: "transform3d";
  transform: Transform3D;
}
export interface OpacityMulEffect {
  kind: "opacityMul";
  mul: number;
}
export interface ColorMatrixEffect {
  kind: "colorMatrix";
  matrix: readonly number[]; // 20 values typical
}
export interface MaskEffect {
  kind: "mask";
  mask: MaskShape;
  softnessPx?: number;
}
export interface GlowEffect {
  kind: "glow";
  radiusPx: number;
  color?: Color;
}
export interface CustomEffect {
  kind: "custom";
  name: string;
  payload: unknown;
}

export interface Transform2D {
  // keep it abstract; renderer can interpret
  translate?: Vec2;
  rotateDeg?: number;
  scale?: number | Vec2;
  origin?: Vec2;
}

export interface Transform3D {
  translate?: Vec2;
  z?: number;
  rotXDeg?: number;
  rotYDeg?: number;
  rotZDeg?: number;
  scale?: number | Vec2;
  origin?: Vec2;
  perspectivePx?: number;
}

export type MaskShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "polygon"; pts: readonly Vec2[] };


⸻

2) Selection API (what a compositor targets)

Selections must be stable and ideally based on node ids/tags, not object identity.

export type Selector =
  | { kind: "all" }
  | { kind: "byId"; ids: readonly NodeId[] }
  | { kind: "byTag"; tag: string }
  | { kind: "childrenOf"; id: NodeId }
  | { kind: "predicate"; test: (node: DrawNode) => boolean };

// Resolved selection: stable list of node references + paths
export interface Selection {
  ids: readonly NodeId[];         // stable order
  paths: readonly NodePath[];     // where in tree each node lives
}

export type NodePath = readonly number[]; // indices down children arrays

Purity note: a predicate is allowed, but for exportability/caching you’ll prefer tags/ids.

⸻

3) The Compositor interface (first-class citizen)

A compositor is just a Program→Program transform with compile-time evaluation of fields.

export interface Compositor<Spec> {
  id: string;

  /** compile-time application: returns a new Program */
  apply(input: Program<RenderTree>, spec: Spec, ctx: ComposeCtx): Program<RenderTree>;
}

export interface ComposeCtx {
  seed: Seed;
  compile: CompileCtx; // includes geom cache + env
}


⸻

4) A canonical “TreeRewrite” contract

Most compositors are “rewrite the tree by wrapping selected nodes in EffectNodes”.

So we standardize a safe rewrite helper:

export interface TreeRewrite {
  select(tree: RenderTree, selector: Selector, geom: GeometryCache): Selection;
  wrapAt(tree: RenderTree, path: NodePath, wrapper: (child: DrawNode) => DrawNode): RenderTree;
  getAt(tree: RenderTree, path: NodePath): DrawNode;
}

(Implementation is straightforward structural recursion; keep it in kernel utilities.)

⸻

5) Canonical Compositor Spec shape

This is the pattern that makes compositors consistent:

export interface CompositorSpecBase {
  selector: Selector;

  /** Optional stable ordering override (default: selection order) */
  order?: "selection" | "byId";
}

Compositors then add their own fields + phase policies.

⸻

Transform3D as a Compositor (canonical spec + reference apply)

Spec

export interface Transform3DCompositorSpec extends CompositorSpecBase {
  phases: PhaseMachine;

  /** Per-selected-node timing */
  delay: Field<number>;
  duration: Field<number>;

  /** Entry pose per node (values interpreted as "start", easing to identity) */
  entry: Field<Transform3D>;

  /** Optional exit pose per node (identity easing to exit) */
  exit?: Field<Transform3D>;

  /** Easing policies */
  easeIn?: (u: number) => number;   // default easeOutCubic for entrance
  easeOut?: (u: number) => number;  // default easeInCubic for exit

  /** If true, apply during hold as identity (default true) */
  identityOnHold?: boolean;

  /** Default perspective if not set per entry/exit */
  perspectivePx?: number;

  /** Optional opacity multiplier per node */
  opacityMul?: Field<number>;
}

Reference compositor implementation

export const Transform3DCompositor: Compositor<Transform3DCompositorSpec> = {
  id: "compositor.transform3d",

  apply(input, spec, cx) {
    const { seed, compile } = cx;
    const treeUtil = compile.envTreeRewrite as unknown as TreeRewrite; // or inject directly

    return {
      signal: (tMs, rt) => {
        const baseTree = input.signal(tMs, rt);

        const sel = treeUtil.select(baseTree, spec.selector, compile.geom);
        const n = sel.ids.length;

        // compile-time-ish fields evaluated per frame would be wrong;
        // so we evaluate lazily but deterministically keyed by selection signature.
        // simplest: evaluate per signal, but cache by (seed, selection ids hash).
        // For the header, we do "evaluate once per call" and you can cache it later.

        const delays = spec.delay(seed, n, compile);
        const durs = spec.duration(seed, n, compile);
        const entries = spec.entry(seed, n, compile);
        const exits = spec.exit ? spec.exit(seed, n, compile) : undefined;
        const opm = spec.opacityMul ? spec.opacityMul(seed, n, compile) : undefined;

        const ps = spec.phases.sample(tMs);

        // Compute per-node effect and wrap
        let out = baseTree;

        for (let k = 0; k < n; k++) {
          const path = sel.paths[k]!;
          const delay = delays[k] ?? 0;
          const dur = Math.max(1e-6, durs[k] ?? 1);
          const localT = ps.tLocal - delay;
          const uLocal = clamp01(localT / dur);

          const easeIn = spec.easeIn ?? easeOutCubic;
          const easeOut = spec.easeOut ?? easeInCubic;

          // phase policy: entrance → hold → exit (by name)
          const phase = ps.phase;

          let T: Transform3D | null = null;
          let opacityMul = opm ? (opm[k] ?? 1) : 1;

          if (phase === "entrance") {
            const u = easeIn(uLocal);
            // interpolate entry → identity
            T = blendTransform3D(entries[k]!, identity3D(spec.perspectivePx), u);
          } else if (phase === "hold") {
            if (spec.identityOnHold !== false) {
              T = identity3D(spec.perspectivePx);
            } else {
              T = null;
            }
          } else if (phase === "exit") {
            const u = easeOut(clamp01(ps.u));
            const exitT = exits ? exits[k]! : entries[k]!;
            // interpolate identity → exit
            T = blendTransform3D(identity3D(spec.perspectivePx), exitT, u);
            opacityMul *= (1 - u); // common default; override via another compositor if desired
          }

          if (T) {
            out = treeUtil.wrapAt(out, path, (child) => ({
              id: `${sel.ids[k]}:t3d`,
              kind: "effect",
              effect: { kind: "transform3d", transform: T },
              child,
            }));
          }

          if (opacityMul !== 1) {
            out = treeUtil.wrapAt(out, path, (child) => ({
              id: `${sel.ids[k]}:opmul`,
              kind: "effect",
              effect: { kind: "opacityMul", mul: opacityMul },
              child,
            }));
          }
        }

        return out;
      },

      event: (ev) => input.event(ev),
    };
  },
};

// ----- helpers -----
export function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }
export function easeInCubic(t: number) { return t * t * t; }
export function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

export function identity3D(perspectivePx?: number): Transform3D {
  return { translate: { x: 0, y: 0 }, z: 0, rotXDeg: 0, rotYDeg: 0, rotZDeg: 0, scale: 1, perspectivePx };
}

/**
 * Blend fields that exist in either transform.
 * Missing fields fall back to identity-ish defaults.
 */
export function blendTransform3D(a: Transform3D, b: Transform3D, t: number): Transform3D {
  const A = { ...identity3D(a.perspectivePx), ...a };
  const B = { ...identity3D(b.perspectivePx), ...b };
  return {
    translate: {
      x: lerpNum(A.translate?.x ?? 0, B.translate?.x ?? 0, t),
      y: lerpNum(A.translate?.y ?? 0, B.translate?.y ?? 0, t),
    },
    z: lerpNum(A.z ?? 0, B.z ?? 0, t),
    rotXDeg: lerpNum(A.rotXDeg ?? 0, B.rotXDeg ?? 0, t),
    rotYDeg: lerpNum(A.rotYDeg ?? 0, B.rotYDeg ?? 0, t),
    rotZDeg: lerpNum(A.rotZDeg ?? 0, B.rotZDeg ?? 0, t),
    scale: typeof A.scale === "number" && typeof B.scale === "number"
      ? lerpNum(A.scale, B.scale, t)
      : 1,
    origin: B.origin ?? A.origin,
    perspectivePx: B.perspectivePx ?? A.perspectivePx,
  };
}

export function lerpNum(a: number, b: number, t: number) { return a + (b - a) * t; }

This makes Transform3D a true compositor:
	•	applies to any program output
	•	selection controls scope
	•	origin/perspective are just transform fields (renderer decides how to interpret)

⸻

6) Compositor stacks (first-class)

Compositors should be stackable without special casing:

export type AnyCompositor = Compositor<any>;

export interface StackItem<S> {
  compositor: Compositor<S>;
  spec: S;
}

export function composeProgram(
  base: Program<RenderTree>,
  items: readonly StackItem<any>[],
  ctx: ComposeCtx
): Program<RenderTree> {
  return items.reduce((p, it) => it.compositor.apply(p, it.spec, ctx), base);
}

This is your “compositors are first-class citizens” moment.

⸻

7) Philosophical purity guarantees

This interface preserves your core invariants:
	•	Determinism boundary: Fields are compile-time (bulk) and can be cached by selection signature.
	•	Scrubbability: signal(t) depends only on t + fixed compiled params.
	•	Orthogonality: compositors don’t need to know the archetype.
	•	Projection-friendly: renderers can interpret effect nodes differently (SVG/CSS export can keep only supported effects).

⸻

8) The one missing piece you’ll want next

A tiny standard facility to make selection + bounds stable and cacheable:
	•	SelectionSignature = hash(ids[])
	•	BoundsOfNode(node) cached by (sceneId,nodeId) (or computed via renderer geometry if available)

If you want, I’ll write the “TreeRewrite + Selection + Bounds” utilities next as a single header so the compositor interface becomes immediately implementable.