
Logo-07 3D Transforms Archetype Document

This document defines everything you need (beyond the kernel) to implement logo-07-3d-transforms-(procedural|varied) in the new kernel.

This animation is not morphing geometry. It's static geometry + 3D-ish transforms applied per-part over time:
	•	parts enter with perspective tilt (rotateX/rotateY), translateZ, and rotation
	•	they settle into identity (flat, z=0)
	•	hold
	•	exit with flip/tilt + z shove + fade

It includes:
	•	Spec
	•	Compiler (reference implementation shape)
	•	Renderer contract
	•	Geometry cache entries
	•	Reference helpers (small + essential)
	•	Mode hooks (procedural vs varied)

⸻

1) Archetype identity

Transform3DParts = animate a static scene graph by applying per-part 3D transform parameters over time.

Each part i has:
	•	static geometry node
	•	animated transform T3D(i,t) and opacity α(i,t)

No geometry deformation, no path morph.

⸻

2) Scene spec (immutable constraints)

export interface Transform3DPartDef {
  id: string;
  node: RenderNode;      // static geometry
  groupId?: number;
}

export interface Transform3DScene {
  id: "logo-07";
  parts: readonly Transform3DPartDef[];

  /** perspective distance in px (CSS perspective analog); default 800..1200 */
  perspectivePx?: number;

  /** center used as transform origin; defaults to scene bounds center */
  origin?: Vec2;
}


⸻

3) Fields (compile-time parameterization)

Fields use bulk form: Field<T> = (seed: Seed, n: number, ctx: CompileCtx) => readonly T[]

Fields are evaluated once (determinism boundary). They determine entrance/exit poses.

export interface Transform3DFields {
  // timing
  delay: Field<number>;
  duration: Field<number>;
  holdDuration: Field<number>;
  exitDuration: Field<number>;

  // entrance pose (per part)
  entryTranslate: Field<Vec2>;      // x/y px
  entryZ: Field<number>;           // px (positive toward camera)
  entryRotZDeg: Field<number>;      // degrees
  entryRotXDeg: Field<number>;      // degrees
  entryRotYDeg: Field<number>;      // degrees
  entryScale: Field<number>;        // e.g. 0.6..1.1

  // settling feel
  ease?: Field<"easeOutCubic" | "easeOutBack" | "easeOutQuint">;
  overshoot?: Field<number>;        // for easeOutBack if used

  // style
  opacity?: Field<number>;

  // exit pose (often derived, but can be explicit)
  exitZ: Field<number>;             // px
  exitRotXDeg: Field<number>;
  exitRotYDeg: Field<number>;
  exitRotZDeg: Field<number>;
  exitTranslate: Field<Vec2>;
}


⸻

4) Phase structure

Typical:
	•	entrance: per-part eased to identity
	•	hold
	•	exit: eased to exit pose + fade

export interface Transform3DPhases {
  machine: PhaseMachine; // entrance → hold → exit
}

Canonical defaults (similar to your other logos):
	•	entrance: 2500–3500ms
	•	hold: 2000ms
	•	exit: 250–600ms

⸻

5) Renderer contract

Renderer must support a 3D transform representation. You can implement it as:
	•	CSS-like rotateX/rotateY/translateZ if rendering to DOM/SVG
	•	projecting into 2D with a simple perspective and emitting a 2D matrix if Canvas
	•	passing to WebGL directly

Kernel-level contract stays abstract:

export interface Transform3D {
  translate: Vec2;
  z: number;
  rotXDeg: number;
  rotYDeg: number;
  rotZDeg: number;
  scale: number;

  /** origin for rotation (scene or part center) */
  origin: Vec2;

  /** perspective distance (camera) */
  perspectivePx: number;
}

export interface Transform3DRenderer {
  part(args: {
    id: string;
    content: RenderNode;
    transform3d: Transform3D;
    opacity: number;
  }): RenderNode;

  compose(rootId: string, nodes: readonly RenderNode[], width: number, height: number): RenderTree;
}

Invariant: identity pose is:
	•	translate=(0,0), z=0
	•	rotX=rotY=rotZ=0
	•	scale=1

⸻

6) Geometry cache requirements

You'll want per-part centers (transform origin), like getBBox().

Cache entries:
	1.	{ kind: "Bounds", sceneId } → scene center
	2.	{ kind: "PartBounds", sceneId, partId } → part center

⸻

7) Spec

export interface Transform3DSpec {
  scene: Transform3DScene;
  fields: Transform3DFields;
  phases: Transform3DPhases;
  renderer: Transform3DRenderer;
  geom: GeometryCache;
}


⸻

8) Compiler (reference implementation shape)

This is the standard "evaluate fields once, then per frame sample phase and lerp to identity/exit".

BULK FORM: All fields are evaluated once outside the map, producing arrays.

export function compileTransform3D(
  spec: Transform3DSpec,
  seed: Seed,
  ctx: CompileCtx
): Program<RenderTree> {
  const { scene, fields, phases, renderer } = spec;
  const n = scene.parts.length;

  const sceneCenter = scene.origin ?? spec.geom.get(
    { kind: "Bounds", sceneId: scene.id } as any,
    () => computeSceneBounds(scene)
  ).center;

  const perspectivePx = scene.perspectivePx ?? 1000;

  // BULK EVALUATION: Evaluate all fields once
  const delays = fields.delay(seed, n, ctx);
  const durations = fields.duration(seed, n, ctx);
  const entryTranslates = fields.entryTranslate(seed, n, ctx);
  const entryZs = fields.entryZ(seed, n, ctx);
  const entryRotZs = fields.entryRotZDeg(seed, n, ctx);
  const entryRotXs = fields.entryRotXDeg(seed, n, ctx);
  const entryRotYs = fields.entryRotYDeg(seed, n, ctx);
  const entryScales = fields.entryScale(seed, n, ctx);
  const exitTranslates = fields.exitTranslate(seed, n, ctx);
  const exitZs = fields.exitZ(seed, n, ctx);
  const exitRotXs = fields.exitRotXDeg(seed, n, ctx);
  const exitRotYs = fields.exitRotYDeg(seed, n, ctx);
  const exitRotZs = fields.exitRotZDeg(seed, n, ctx);
  const opacities = fields.opacity ? fields.opacity(seed, n, ctx) : Array(n).fill(1);
  const easeKinds = fields.ease ? fields.ease(seed, n, ctx) : Array(n).fill("easeOutCubic");
  const overshoots = fields.overshoot ? fields.overshoot(seed, n, ctx) : Array(n).fill(1.6);

  // Now map over parts, indexing into the evaluated arrays
  const params = scene.parts.map((part, i) => {
    const origin = spec.geom.get(
      { kind: "PartBounds", sceneId: scene.id, partId: part.id } as any,
      () => computePartBounds(part.node)
    ).center;

    return {
      id: part.id,
      content: part.node,
      origin: origin ?? sceneCenter,
      delay: delays[i]!,
      duration: durations[i]!,
      entry: {
        entryTranslate: entryTranslates[i]!,
        entryZ: entryZs[i]!,
        entryRotX: entryRotXs[i]!,
        entryRotY: entryRotYs[i]!,
        entryRotZ: entryRotZs[i]!,
        entryScale: entryScales[i]!,
      },
      exit: {
        exitTranslate: exitTranslates[i]!,
        exitZ: exitZs[i]!,
        exitRotX: exitRotXs[i]!,
        exitRotY: exitRotYs[i]!,
        exitRotZ: exitRotZs[i]!,
      },
      opacityBase: opacities[i]!,
      easeKind: easeKinds[i]!,
      overshoot: overshoots[i]!,
    };
  });

  return {
    signal: (t, signalCtx) => {
      const ps = PhaseMachines.sample(phases.machine, t);

      const nodes = params.map((p) => {
        if (ps.phase === "entrance") {
          const localT = ps.localTime - p.delay;
          const u = p.duration <= 0 ? 1 : clamp01(localT / p.duration);
          const eased = applyEase(p.easeKind, u, p.overshoot);

          const transform3d: Transform3D = {
            translate: {
              x: p.entry.entryTranslate.x * (1 - eased),
              y: p.entry.entryTranslate.y * (1 - eased),
            },
            z: p.entry.entryZ * (1 - eased),
            rotXDeg: p.entry.entryRotX * (1 - eased),
            rotYDeg: p.entry.entryRotY * (1 - eased),
            rotZDeg: p.entry.entryRotZ * (1 - eased),
            scale: p.entry.entryScale + (1 - p.entry.entryScale) * eased,
            origin: p.origin,
            perspectivePx,
          };

          // opacity ramps quickly
          const opacity = p.opacityBase * Math.min(1, u * 2);

          return renderer.part({ id: p.id, content: p.content, transform3d, opacity });
        }

        if (ps.phase === "hold") {
          const transform3d: Transform3D = {
            translate: { x: 0, y: 0 },
            z: 0,
            rotXDeg: 0,
            rotYDeg: 0,
            rotZDeg: 0,
            scale: 1,
            origin: p.origin,
            perspectivePx,
          };
          return renderer.part({ id: p.id, content: p.content, transform3d, opacity: p.opacityBase });
        }

        // exit
        const u = clamp01(ps.progress);
        const eased = easeInCubic(u);

        const transform3d: Transform3D = {
          translate: {
            x: p.exit.exitTranslate.x * eased,
            y: p.exit.exitTranslate.y * eased,
          },
          z: p.exit.exitZ * eased,
          rotXDeg: p.exit.exitRotX * eased,
          rotYDeg: p.exit.exitRotY * eased,
          rotZDeg: p.exit.exitRotZ * eased,
          scale: 1,
          origin: p.origin,
          perspectivePx,
        };

        const opacity = p.opacityBase * (1 - eased);

        return renderer.part({ id: p.id, content: p.content, transform3d, opacity });
      });

      return renderer.compose(scene.id, nodes, ctx.viewport.width, ctx.viewport.height);
    },

    event: () => [],
  };
}


⸻

9) Reference helpers (small, required)

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function easeInCubic(t: number): number {
  return t * t * t;
}
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
export function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}
export function easeOutBack(t: number, overshoot: number): number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function applyEase(kind: "easeOutCubic" | "easeOutBack" | "easeOutQuint", u: number, overshoot: number) {
  if (kind === "easeOutBack") return easeOutBack(u, overshoot);
  if (kind === "easeOutQuint") return easeOutQuint(u);
  return easeOutCubic(u);
}


⸻

10) Mode hooks (procedural vs varied)

Entry pose families
	•	tiltLeft: rotY negative, translateX negative, z positive
	•	tiltRight: rotY positive
	•	flipTop: rotX negative, translateY negative
	•	scatter3D: random rotX/rotY/rotZ, translate, z

Timing modes
	•	staggered3D: delay as linear stagger + jitter
	•	scatterDelay: random 0..800ms

Depth feel modes
	•	deep: higher entryZ + stronger tilt
	•	shallow: lower entryZ + mild tilt

Exit modes
	•	shatter: large z + rotations + translate away
	•	sink: z negative + fade

Procedural vs Varied
	•	procedural: coherent direction, bounded tilt
	•	varied: per-part direction changes, wider tilt/z envelopes

None of this changes the compiler. Only fields/modes.

