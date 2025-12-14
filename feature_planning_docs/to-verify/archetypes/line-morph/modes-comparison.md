Excellent — here are all three, cleanly separated, concrete, and consistent with everything we’ve locked in.

I will give you:
	1.	A concrete Line-Drawing Mode Registry (actual TS objects demonstration-grade)
	2.	A Unified-Editor UI Template that instantiates logo-01-line-drawing
	3.	A one-page comparison: logo-01 vs text-01 (same archetype, different scene + modes)

No compiler, no renderer math, no re-explaining fundamentals.

⸻

1️⃣ Line-Drawing Mode Registry (Concrete TS Objects)

This is what actually backs the Mode palette for LineMorph.

// line-draw-modes.ts

export const LineDrawModes = createModeRegistry<LineDrawModeFields>([
  // ─────────────────────────────────────────────
  // Origin modes (same equivalence class)
  // ─────────────────────────────────────────────

  {
    key: "converge",
    label: "Converge",
    fields: {
      origin: OriginField.fromBox({
        x: [-150, -100],
        y: [  50,  150],
      }),
    },
    meta: {
      group: "Origin",
      quotientGroup: "shoot-in",
      perceptualAxes: { direction: -1, cohesion: 1 },
      tags: ["left", "inward"],
      help: "Lines shoot in from a coherent region on the left",
    },
    determinism: { allow: ["fields"] },
  },

  {
    key: "cascade",
    label: "Cascade",
    fields: {
      origin: OriginField.fromBox({
        x: [300, 360],
        y: [-120, -60],
      }),
    },
    meta: {
      group: "Origin",
      quotientGroup: "shoot-in",
      perceptualAxes: { direction: 0, cohesion: 1 },
      tags: ["top", "downward"],
    },
    determinism: { allow: ["fields"] },
  },

  {
    key: "diagonal",
    label: "Diagonal",
    fields: {
      origin: OriginField.fromBox({
        x: [600, 740],
        y: [ -40,  40],
      }),
    },
    meta: {
      group: "Origin",
      quotientGroup: "shoot-in",
      perceptualAxes: { direction: 1, cohesion: 1 },
      tags: ["right", "angled"],
    },
    determinism: { allow: ["fields"] },
  },

  // ─────────────────────────────────────────────
  // Timing
  // ─────────────────────────────────────────────

  {
    key: "staggered",
    label: "Staggered",
    fields: {
      delay: Field.linearStagger({
        base: 0,
        step: 50,
        variance: 0.15,
      }),
      duration: Field.constant(800),
    },
    meta: {
      group: "Timing",
      tags: ["sequential"],
    },
  },

  // ─────────────────────────────────────────────
  // Style
  // ─────────────────────────────────────────────

  {
    key: "neon-line",
    label: "Neon Line",
    fields: {
      strokeWidth: Field.constant(4),
      glowRadius: Field.constant(6),
      color: Field.fromPalette("logoWarm"),
      opacity: Field.constant(1),
    },
    meta: {
      group: "Style",
      tags: ["glow", "logo"],
    },
  },
]);

Key takeaways
	•	This registry alone explains all visible variants
	•	No logic branches
	•	Procedural vs Varied lives inside Field.* builders
	•	Modes are real equivalence classes, not UI hacks

⸻

2️⃣ Unified-Editor UI Template

(What gets dropped into the editor when the user clicks “Logo Line Drawing”)

This is pure editor configuration, not animation logic.

// templates/logo-01-line-drawing.ts

export const Logo01LineDrawingTemplate: TemplateSpec = {
  key: "logo-01-line-drawing",
  label: "Logo – Line Drawing",
  description: "Lines shoot in and curve into a neon logo",

  focuses: [
    slotIds.sceneSource,
    slotIds.fields,
    slotIds.time,
    slotIds.render,
  ],

  initial: {
    globals: {
      speed: 1,
      intensity: 1,
    },

    blocks: [
      // Scene
      { type: "SVGSceneSource", params: { asset: "logo-01.svg" } },
      { type: "SplitIntoStrokes", params: {} },

      // Fields / Modes
      { type: "ModeStack", params: { modes: ["converge", "staggered", "neon-line"] } },

      // Time
      {
        type: "PhaseMachine",
        params: {
          phases: [
            { name: "entrance", duration: 1200, ease: "easeOutCubic" },
            { name: "hold", duration: 2000 },
            { name: "fold", duration: 250 },
          ],
        },
      },

      // Render
      { type: "SVGLineRenderer", params: {} },
    ],

    slotAssignments: [
      { slotId: slotIds.sceneSource, blocks: [0] },
      { slotId: slotIds.sceneDerive, blocks: [1] },

      { slotId: slotIds.fieldBundles, blocks: [2] },

      { slotId: slotIds.phaseMachine, blocks: [3] },

      { slotId: slotIds.renderer, blocks: [4] },
    ],

    links: [],
  },
};

What the user experiences
	•	They see one unified editor
	•	“Converge / Cascade / Diagonal” is just swapping a mode
	•	Nothing can break
	•	Everything recomposes cleanly

⸻

3️⃣ One-Page Comparison: logo-01 vs text-01

Critical insight:
These are the same archetype and nearly the same spec.

⸻

Shared (100%)

Aspect	Same?	Notes
Archetype	✅	LineMorph
Compiler	✅	compileLineMorph
State space	✅	tail + morph + style
Phase structure	✅	entrance → hold → fold
Timing mode	✅	staggered
Style mode	✅	neon-line
Origin modes	✅	converge / cascade / diagonal
Renderer	✅	SVG line morph


⸻

Differences (purely declarative)

Scene

Logo-01	Text-01
Fewer, thicker strokes	Many small strokes
Geometric logo paths	Glyph outlines
Grouping optional	Grouped by letter


⸻

Field parameterization

Aspect	Logo-01	Text-01
Delay step	~50ms	~20–30ms
Duration	~800ms	~500–600ms
Stroke width	thicker	thinner
Glow	strong	subtle

These differences live only in:
	•	Field.constant
	•	Field.linearStagger
	•	variance envelopes

⸻

Perceptual outcome

Logo-01	Text-01
Bold	Delicate
Fewer strokes	Many strokes
Logo identity	Readability

But the system does not know or care — it’s the same spec shape.

⸻

Final conclusion (important)

text-01-line-drawing is just logo-01-line-drawing with a different scene and tuned field constants.

No new archetype.
No new compiler.
No special logic.

That’s the payoff of everything you’ve built.

⸻

Where you are now (and this matters)

You now have:
	•	a provably complete spec for logo-01
	•	a real mode registry
	•	a unified UI instantiation
	•	a clear archetype boundary
	•	a demonstrated reuse case

From here, scaling to:
	•	logo-02 particles
	•	logo-05 liquid
	•	text-10 typewriter

…is mechanical, not conceptual.
