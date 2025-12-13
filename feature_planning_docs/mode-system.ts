// mode-system.ts
// “Header” for a deterministic, composable Mode System.
// Goal: Modes are *named bundles of Fields* (+ optional time/phase/render presets),
// with explicit randomness boundaries and perceptual “quotient” support.
// This file is kernel-agnostic but assumes your Field type:
//
//   type Field<A> = (seed: Seed, index: number, count: number, env: Env) => A
//
// You can import the kernel’s Field/Seed/Env types instead of redefining.

/////////////////////////////
// 0) Minimal deps (replace with your kernel imports)
/////////////////////////////

export type Seed = number;
export type Env = { viewport: { w: number; h: number } };

export type Field<A> = (seed: Seed, index: number, count: number, env: Env) => A;

export type Ease = (u01: number) => number;

export type Vec2 = { x: number; y: number };
export type Color =
  | { kind: "rgb"; r: number; g: number; b: number; a?: number }
  | { kind: "hsl"; h: number; s: number; l: number; a?: number };

/////////////////////////////
// 1) Core concept: a Mode is a named Field bundle (optionally with presets)
/////////////////////////////

/**
 * ModeKey identifies a perceptual equivalence class ("converge", "cascade", "diagonal").
 * Keep it stable for serialization and UI.
 */
export type ModeKey = string;

/** The “shape” of parameters the Mode controls: a typed record of Fields. */
export type ModeFields = Record<string, Field<any>>;

/**
 * A Mode is a *pure value*: name + fields + metadata.
 * The system compiles/merges modes; runtime never "branches on mode" imperatively.
 */
export interface Mode<F extends ModeFields = ModeFields> {
  key: ModeKey;
  label: string;

  /** Named bundle of Fields (the main payload). */
  fields: F;

  /** Optional: curated defaults for time/phase/render knobs (still pure data). */
  presets?: ModePresets;

  /** Optional: perceptual/UX metadata (quotients, grouping, tags). */
  meta?: ModeMeta;
}

export interface ModePresets {
  /** Example: recommended easing, durations, or phase timings for this mode. */
  time?: {
    ease?: Ease;
    durationScale?: number;
    staggerScale?: number;
  };

  /** Example: recommended look */
  style?: {
    intensity?: number;
    palette?: "warm" | "cool" | "mono" | string;
  };

  /** Example: renderer hints */
  render?: {
    glow?: number;
    blur?: number;
  };
}

export interface ModeMeta {
  /** UI grouping: "Origins", "Timing", "Style", etc. */
  group?: string;

  /** Tags for search/filter */
  tags?: readonly string[];

  /** Perceptual “axis” hints: e.g. direction, cohesion, energy */
  perceptualAxes?: Partial<Record<"direction" | "cohesion" | "energy", number>>;

  /** For quotienting: modes considered “equivalent enough” under some lens */
  quotientGroup?: string;

  /** Short help text */
  help?: string;
}

/////////////////////////////
// 2) Field bundle typing (canonical keys)
/////////////////////////////

/**
 * For consistency across archetypes, you’ll want canonical field keys.
 * You can share these across specs (Particles, LineDraw, RevealMask, etc).
 */
export type CanonicalFieldKey =
  | "origin"
  | "delay"
  | "duration"
  | "radius"
  | "color"
  | "opacity"
  | "behavior"
  | "strokeWidth"
  | "glowRadius"
  | "hueShift"
  | "mask"
  | "transform"
  | "target";

/**
 * A typed FieldBundle is a Mode with canonical keys.
 * You can also use strongly typed bundles per archetype (recommended).
 */
export type FieldBundle<K extends string = CanonicalFieldKey, V extends Record<K, any> = any> = Mode<{
  [P in K]?: Field<V[P]>;
}>;

/////////////////////////////
// 3) Composition: merging modes safely
/////////////////////////////

/**
 * Mode composition is the key: users stack modes.
 * We need deterministic, type-safe-ish merging rules.
 *
 * Think of this like CSS:
 * - Base mode provides defaults
 * - Overlays override specific fields
 * - Modulators combine fields (optional)
 */

/** How to merge two fields for the same key. */
export type FieldMerge<A> =
  | { kind: "override" } // take the latter field
  | { kind: "add"; clamp?: { min?: number; max?: number } } // numeric add
  | { kind: "mul"; clamp?: { min?: number; max?: number } } // numeric multiply
  | { kind: "lerp"; t: number } // blend two numeric fields
  | { kind: "custom"; merge: (a: Field<A>, b: Field<A>) => Field<A> };

export interface ModeMergePolicy {
  /**
   * Default merge behavior when two modes define the same field key.
   * Usually "override" for non-numeric, and "mul/add" for intensities.
   */
  defaultFieldMerge: FieldMerge<any>;

  /**
   * Per-key overrides (e.g. delay might add, color might override).
   */
  perKey?: Partial<Record<string, FieldMerge<any>>>;

  /**
   * How to merge presets/meta (usually shallow override).
   */
  mergePresets?: "override" | "shallow" | "none";
  mergeMeta?: "override" | "shallow" | "none";
}

/** Result of composing multiple modes into one. */
export interface ComposedMode<F extends ModeFields = ModeFields> extends Mode<F> {
  /** Provenance for debugging/UI */
  lineage: readonly ModeKey[];
}

/**
 * Compose modes: deterministic merge of field bundles + optional presets/meta.
 * Implementation can be short; feel free to keep it as a header if you prefer.
 */
export function composeModes<F extends ModeFields>(
  modes: readonly Mode<F>[],
  policy: ModeMergePolicy
): ComposedMode<F> {
  if (modes.length === 0) throw new Error("composeModes: no modes");

  const lineage = modes.map((m) => m.key);
  const base = modes[0]!;

  const mergedFields: Record<string, Field<any>> = { ...base.fields };

  for (let i = 1; i < modes.length; i++) {
    const m = modes[i]!;
    for (const k of Object.keys(m.fields)) {
      const nextField = (m.fields as any)[k] as Field<any> | undefined;
      if (!nextField) continue;

      const prevField = mergedFields[k];
      if (!prevField) {
        mergedFields[k] = nextField;
        continue;
      }

      const mergeRule = policy.perKey?.[k] ?? policy.defaultFieldMerge;
      mergedFields[k] = mergeFields(prevField, nextField, mergeRule);
    }
  }

  const presets = mergePresets(base.presets, modes, policy.mergePresets ?? "shallow");
  const meta = mergeMeta(base.meta, modes, policy.mergeMeta ?? "shallow");

  return {
    key: lineage.join("+"),
    label: lineage.join(" + "),
    fields: mergedFields as F,
    presets,
    meta,
    lineage,
  };
}

function mergeFields<A>(a: Field<A>, b: Field<A>, rule: FieldMerge<A>): Field<A> {
  switch (rule.kind) {
    case "override":
      return b;

    case "add":
      return ((seed, i, n, env) => {
        const x = (a as any)(seed, i, n, env) as number;
        const y = (b as any)(seed, i, n, env) as number;
        const v = x + y;
        return clampMaybe(v, rule.clamp) as any;
      }) as any;

    case "mul":
      return ((seed, i, n, env) => {
        const x = (a as any)(seed, i, n, env) as number;
        const y = (b as any)(seed, i, n, env) as number;
        const v = x * y;
        return clampMaybe(v, rule.clamp) as any;
      }) as any;

    case "lerp":
      return ((seed, i, n, env) => {
        const x = (a as any)(seed, i, n, env) as number;
        const y = (b as any)(seed, i, n, env) as number;
        return (x + (y - x) * rule.t) as any;
      }) as any;

    case "custom":
      return rule.merge(a, b);
  }
}

function clampMaybe(x: number, clamp?: { min?: number; max?: number }): number {
  if (!clamp) return x;
  const lo = clamp.min ?? -Infinity;
  const hi = clamp.max ?? Infinity;
  return Math.max(lo, Math.min(hi, x));
}

function mergePresets(
  base: ModePresets | undefined,
  modes: readonly Mode<any>[],
  how: "override" | "shallow" | "none"
): ModePresets | undefined {
  if (how === "none") return base;
  if (how === "override") return modes[modes.length - 1]!.presets ?? base;

  // shallow
  let out: ModePresets | undefined = base ? { ...base } : undefined;
  for (const m of modes) {
    if (!m.presets) continue;
    out = out ? { ...out } : {};
    out.time = { ...(out.time ?? {}), ...(m.presets.time ?? {}) };
    out.style = { ...(out.style ?? {}), ...(m.presets.style ?? {}) };
    out.render = { ...(out.render ?? {}), ...(m.presets.render ?? {}) };
  }
  return out;
}

function mergeMeta(
  base: ModeMeta | undefined,
  modes: readonly Mode<any>[],
  how: "override" | "shallow" | "none"
): ModeMeta | undefined {
  if (how === "none") return base;
  if (how === "override") return modes[modes.length - 1]!.meta ?? base;

  let out: ModeMeta | undefined = base ? { ...base } : undefined;
  for (const m of modes) {
    if (!m.meta) continue;
    out = out ? { ...out } : {};
    out.group = m.meta.group ?? out.group;
    out.quotientGroup = m.meta.quotientGroup ?? out.quotientGroup;
    out.help = m.meta.help ?? out.help;
    out.tags = mergeTags(out.tags, m.meta.tags);
    out.perceptualAxes = { ...(out.perceptualAxes ?? {}), ...(m.meta.perceptualAxes ?? {}) };
  }
  return out;
}

function mergeTags(a?: readonly string[], b?: readonly string[]): readonly string[] | undefined {
  if (!a && !b) return undefined;
  const s = new Set<string>();
  for (const x of a ?? []) s.add(x);
  for (const x of b ?? []) s.add(x);
  return [...s];
}

/////////////////////////////
// 4) Determinism boundary (“what randomness is allowed to affect”)
/////////////////////////////

/**
 * Your earlier key insight: seed affects which trajectory/fields are chosen,
 * but should not leak into traversal (clock) unless explicitly allowed.
 *
 * ModeSystem encodes that as an explicit policy.
 */
export type RandomnessDomain = "fields" | "clock" | "phases" | "render" | "events";

export interface DeterminismBoundary {
  /**
   * Allowed domains for seeded randomness within this mode.
   * Example: "varied" might allow fields+render; "procedural" might allow fields only.
   */
  allow: readonly RandomnessDomain[];

  /** Optional note for UI */
  note?: string;
}

/**
 * Attach a determinism boundary to a mode. (Pure metadata; your builders enforce it.)
 */
export interface ModeWithDeterminism<F extends ModeFields = ModeFields> extends Mode<F> {
  determinism?: DeterminismBoundary;
}

/////////////////////////////
// 5) Mode registries (for UI + templates)
/////////////////////////////

export interface ModeRegistry<F extends ModeFields = ModeFields> {
  /**
   * Human-facing catalog: used by the editor’s palette.
   * Keys must be stable across versions for serialization.
   */
  all(): readonly ModeWithDeterminism<F>[];

  /** Lookup by key */
  get(key: ModeKey): ModeWithDeterminism<F> | undefined;

  /**
   * Optional: search by tags/group/label (useful for “drag and drop” palette).
   */
  search?(q: string): readonly ModeWithDeterminism<F>[];
}

export function createModeRegistry<F extends ModeFields>(
  modes: readonly ModeWithDeterminism<F>[]
): ModeRegistry<F> {
  const map = new Map<ModeKey, ModeWithDeterminism<F>>();
  for (const m of modes) map.set(m.key, m);

  return {
    all: () => modes,
    get: (k) => map.get(k),
    search: (q) => {
      const qq = q.toLowerCase();
      return modes.filter((m) => {
        if (m.label.toLowerCase().includes(qq)) return true;
        if (m.key.toLowerCase().includes(qq)) return true;
        const tags = m.meta?.tags ?? [];
        return tags.some((t) => t.toLowerCase().includes(qq));
      });
    },
  };
}

/////////////////////////////
// 6) “Quotient” support: canonicalization & snapping
/////////////////////////////

/**
 * Users may edit a continuous parameter space, but modes represent perceptual equivalence classes.
 * Canonicalization is the act of snapping arbitrary params to a canonical representative.
 *
 * Example: any origin direction angle within a wedge snaps to "left / top / right".
 */
export interface Canonicalizer<P> {
  /** Map continuous params to a canonical mode key (equivalence class representative). */
  classify(params: P): ModeKey;

  /** Optionally, produce canonical params (snapped) for UI display */
  canonicalize?(params: P): P;

  /** Optional distance metric for “nearest mode” UI hints */
  distance?(a: P, b: P): number;
}

/**
 * A mode family: a set of modes that are known to be “the same kind of thing”
 * under a quotient lens (e.g. direction-based origin modes).
 */
export interface ModeFamily<F extends ModeFields = ModeFields, P = any> {
  key: string;
  label: string;
  modes: readonly ModeWithDeterminism<F>[];
  canonicalizer?: Canonicalizer<P>;
}

/////////////////////////////
// 7) Archetype-specific mode typing (recommended pattern)
/////////////////////////////

/**
 * You’ll get the most leverage by defining strongly typed mode bundles per archetype.
 * Example: Particles modes only define startPosition/delay/duration/radius/color/behavior.
 */

export type ParticlesModeFields = {
  startPosition?: Field<Vec2>;
  delay?: Field<number>;
  duration?: Field<number>;
  radius?: Field<number>;
  color?: Field<Color>;
  opacity?: Field<number>;
  behavior?: Field<
    | { kind: "none" }
    | { kind: "spiral"; turns: number; radius: number }
    | { kind: "wave"; amplitude: number; frequency: number }
    | { kind: "jitter"; strength: number }
  >;
};

export type ParticlesMode = ModeWithDeterminism<ParticlesModeFields>;

export type LineDrawModeFields = {
  origin?: Field<Vec2>;
  delay?: Field<number>;
  duration?: Field<number>;
  strokeWidth?: Field<number>;
  glowRadius?: Field<number>;
  color?: Field<Color>;
};

export type LineDrawMode = ModeWithDeterminism<LineDrawModeFields>;

/////////////////////////////
// 8) Suggested default merge policy
/////////////////////////////

/**
 * A sane default for most “mode stacking”:
 * - numeric intensities multiply (so global intensity scales effects)
 * - timing offsets add (stacking stagger)
 * - everything else overrides (last wins)
 */
export const DefaultModeMergePolicy: ModeMergePolicy = {
  defaultFieldMerge: { kind: "override" },
  perKey: {
    // timing tends to add
    delay: { kind: "add", clamp: { min: 0 } },
    duration: { kind: "mul", clamp: { min: 0.01 } }, // scale durations
    // style intensities often multiply
    glowRadius: { kind: "mul", clamp: { min: 0 } },
    strokeWidth: { kind: "mul", clamp: { min: 0 } },
    opacity: { kind: "mul", clamp: { min: 0, max: 1 } },
  },
  mergePresets: "shallow",
  mergeMeta: "shallow",
};

/////////////////////////////
// 9) Minimal “Mode System” facade (what the rest of the app uses)
/////////////////////////////

export interface ModeSystem<F extends ModeFields = ModeFields> {
  registry: ModeRegistry<F>;

  /**
   * Given a list of mode keys (stack), produce the composed mode bundle.
   * This is what your editor stores: just the ordered list of mode keys.
   */
  resolve(stack: readonly ModeKey[]): ComposedMode<F>;

  /**
   * Convenience: resolve a stack and extract a specific field (or fallback).
   */
  field<A>(stack: readonly ModeKey[], key: string, fallback: Field<A>): Field<A>;

  /** Merge policy (exposed for debugging/experimentation) */
  policy: ModeMergePolicy;
}

export function createModeSystem<F extends ModeFields>(
  registry: ModeRegistry<F>,
  policy: ModeMergePolicy = DefaultModeMergePolicy
): ModeSystem<F> {
  return {
    registry,
    policy,

    resolve: (stack) => {
      const modes = stack
        .map((k) => registry.get(k))
        .filter((m): m is ModeWithDeterminism<F> => !!m);

      if (modes.length === 0) throw new Error("ModeSystem.resolve: empty/unknown mode stack");
      return composeModes(modes as any, policy) as ComposedMode<F>;
    },

    field: (stack, key, fallback) => {
      const composed = (stack.length ? (registry as any) : null)
        ? (createModeSystem(registry as any, policy).resolve(stack) as any)
        : null;

      const f = composed?.fields?.[key] as Field<any> | undefined;
      return (f ?? fallback) as any;
    },
  };
}

