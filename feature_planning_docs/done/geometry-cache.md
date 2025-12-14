Great request. This is one of those pieces that quietly makes the entire kernel feel solid.

Below is a clean, kernel-level geometry cache that fits everything you’ve built so far:
	•	works for LineMorph, Particles, Reveal, Liquid
	•	respects determinism
	•	separates geometry derivation from animation
	•	avoids re-allocating heavy geometry every frame
	•	has clear invalidation rules
	•	small enough to actually implement

No UI, no renderer math, no SVG parsing logic inside — just the cache.

⸻

Geometry Cache — Kernel-Level Reference

Design intent (non-negotiable)

A geometry cache:
	1.	Caches expensive derived geometry
	2.	Is purely functional from inputs
	3.	Is keyed by stable semantic inputs
	4.	Is safe under scrubbing
	5.	Has explicit invalidation
	6.	Never stores animation state

If it stores anything time-dependent, it’s wrong.

⸻

What gets cached (and what does not)

✅ Cached
	•	Stroke segmentation
	•	Path normalization
	•	Point sampling
	•	Correspondence tables
	•	Target point arrays
	•	Bounding boxes
	•	Precomputed normals / tangents

❌ Not cached
	•	Morph progress
	•	Tail positions
	•	Offsets
	•	Phase state
	•	Anything involving t

⸻

Core abstraction

/**
 * A GeometryCache stores *derived geometry* indexed by stable keys.
 */
export interface GeometryCache {
  get<K extends GeometryKey, V extends GeometryValue>(
    key: K,
    compute: () => V
  ): V;

  invalidate(scope?: GeometryInvalidation): void;

  stats(): GeometryCacheStats;
}


⸻

Geometry keys (this is critical)

Keys must reflect semantic identity, not object identity.

export type GeometryKey =
  | {
      kind: "SceneStrokes";
      sceneId: string;
    }
  | {
      kind: "StrokeSegments";
      strokeId: string;
    }
  | {
      kind: "PathSample";
      strokeId: string;
      resolution: number;
    }
  | {
      kind: "Targets";
      sceneId: string;
      density: number;
    }
  | {
      kind: "Bounds";
      sceneId: string;
    }
  | {
      kind: "Custom";
      id: string;
      deps: readonly string[];
    };

Rule

If changing a value should change geometry → it must be reflected in the key.

⸻

Geometry values (opaque to the cache)

export type GeometryValue =
  | StrokeDef[]
  | StrokeSegments
  | Vec2[]
  | Bounds
  | unknown;

The cache does not inspect values.

⸻

Reference implementation (simple, correct)

export function createGeometryCache(): GeometryCache {
  const map = new Map<string, GeometryValue>();
  let hits = 0;
  let misses = 0;

  function keyToString(key: GeometryKey): string {
    return JSON.stringify(key);
  }

  return {
    get(key, compute) {
      const k = keyToString(key);
      const existing = map.get(k);
      if (existing !== undefined) {
        hits++;
        return existing as any;
      }

      misses++;
      const value = compute();
      map.set(k, value);
      return value;
    },

    invalidate(scope) {
      if (!scope) {
        map.clear();
        return;
      }

      for (const k of map.keys()) {
        if (scope.matches(k)) {
          map.delete(k);
        }
      }
    },

    stats() {
      return {
        size: map.size,
        hits,
        misses,
      };
    },
  };
}


⸻

Invalidation model (explicit, safe)

export type GeometryInvalidation =
  | { kind: "scene"; sceneId: string }
  | { kind: "stroke"; strokeId: string }
  | { kind: "all" }
  | {
      kind: "custom";
      matches: (keyString: string) => boolean;
    };

Example helpers:

export const Invalidate = {
  scene: (sceneId: string): GeometryInvalidation => ({
    kind: "custom",
    matches: (k) => k.includes(`"sceneId":"${sceneId}"`),
  }),

  stroke: (strokeId: string): GeometryInvalidation => ({
    kind: "custom",
    matches: (k) => k.includes(`"strokeId":"${strokeId}"`),
  }),

  all: (): GeometryInvalidation => ({
    kind: "all",
  }),
};


⸻

How this plugs into LineMorph (example)

const strokes = geomCache.get(
  { kind: "SceneStrokes", sceneId: scene.id },
  () => deriveStrokesFromSVG(scene)
);

const segments = geomCache.get(
  { kind: "StrokeSegments", strokeId: stroke.id },
  () => computeStrokeSegments(stroke)
);

Key point:
The compiler never knows this is cached.

⸻

How this plugs into Particles

const targets = geomCache.get(
  { kind: "Targets", sceneId: scene.id, density },
  () => sampleTargets(scene, density)
);

Particles + Liquid + Reveal all reuse this.

⸻

Determinism guarantee

Because:
	•	keys are pure data
	•	compute() is pure
	•	cache has no time awareness

Then:
	•	scrubbing is safe
	•	replay is identical
	•	caching cannot introduce nondeterminism

⸻

Memory strategy (intentionally dumb at first)

This cache is:
	•	unbounded
	•	in-memory
	•	simple

That is correct for now.

If you ever need eviction:
	•	add LRU
	•	add size caps
	•	add dispose(value) hook

But don’t start there.

⸻

Why this belongs in the kernel

Because geometry derivation:
	•	is expensive
	•	is shared across archetypes
	•	is independent of animation logic
	•	should be deterministic and centralized

This cache is the missing connective tissue between:
	•	Scene derivation
	•	Compilers
	•	Renderers

⸻

Final sanity check

If you ever feel tempted to cache:
	•	u
	•	t
	•	morph results
	•	animated geometry

Stop. That goes in the renderer or GPU.

⸻

If you want next, the natural follow-ups are:
	1.	Stroke segmentation + correspondence cache (LineMorph-specific)
	2.	Target sampling cache (Particles/Liquid)
	3.	Mask geometry cache (Reveal)

All three are small, clean extensions of this.