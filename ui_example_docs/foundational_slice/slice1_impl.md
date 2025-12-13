Got it — thank you for the correction 👍
That actually simplifies things and lets us stay perfectly aligned with your kernel.

Below is a deep dive Slice 1, rewritten to assume your kernel already exists. I will:
	•	Import types as-if they exist
	•	Focus only on runtime + renderer + player
	•	Give you real code, not pseudocode
	•	Explain why each piece exists and what invariants it enforces

This is the non-minimal, future-proof version of Slice 1.

⸻

Slice 1 (Deep Dive): Runtime + Renderer + Time + Hot Swap

This slice establishes the execution substrate for everything that follows.

After this slice:
	•	Any Program<RenderTree> can run
	•	Programs can be swapped live
	•	Time is scrub-safe
	•	Compositors will “just work”
	•	Export/lowering is architecturally possible

⸻

1. Runtime contract (what everything downstream relies on)

We assume you already have:

import {
  Program,
  ProgramFactory,
  RenderTree,
  RuntimeCtx,
  CompileCtx,
  Scene,
  Seed,
} from "@kernel";

Core invariant (important)

The runtime never knows what kind of animation it is running.
It only knows how to:

	•	call signal(t)
	•	render a RenderTree

This keeps archetypes, compositors, and exporters honest.

⸻

2. Player: single authoritative time + hot swap

Why this must exist
	•	Patch edits recompile constantly
	•	Time must not reset unless explicitly requested
	•	Scrubbing must not depend on RAF

Player implementation

// player.ts
import { Program, ProgramFactory, RenderTree, RuntimeCtx, CompileCtx, Scene, Seed } from "@kernel";

type PlayState = "playing" | "paused";

export class Player {
  private programFactory: ProgramFactory<RenderTree> | null = null;
  private program: Program<RenderTree> | null = null;

  private seed: Seed = 1;
  private scene: Scene | null = null;

  private compileCtx: CompileCtx;
  private runtimeCtx: RuntimeCtx;

  private playState: PlayState = "paused";
  private tMs = 0;
  private lastFrameMs = 0;
  private rafId: number | null = null;

  private onFrame: (tree: RenderTree) => void;

  constructor(opts: {
    compileCtx: CompileCtx;
    runtimeCtx: RuntimeCtx;
    onFrame: (tree: RenderTree) => void;
  }) {
    this.compileCtx = opts.compileCtx;
    this.runtimeCtx = opts.runtimeCtx;
    this.onFrame = opts.onFrame;
  }

  /* ------------------ Program lifecycle ------------------ */

  setFactory(factory: ProgramFactory<RenderTree>) {
    this.programFactory = factory;
    this.instantiateProgram();
  }

  setSeed(seed: Seed) {
    this.seed = seed;
    this.instantiateProgram();
  }

  setScene(scene: Scene) {
    this.scene = scene;
    this.instantiateProgram();
  }

  private instantiateProgram() {
    if (!this.programFactory || !this.scene) return;

    this.program = this.programFactory(
      this.seed,
      this.scene,
      this.compileCtx
    );

    // NOTE: we intentionally do NOT reset tMs
    // This preserves scrubbing + temporal continuity
  }

  /* ------------------ Playback control ------------------ */

  play() {
    if (this.playState === "playing") return;
    this.playState = "playing";
    this.lastFrameMs = performance.now();
    this.tick();
  }

  pause() {
    this.playState = "paused";
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  scrubTo(tMs: number) {
    this.tMs = Math.max(0, tMs);
    this.renderOnce();
  }

  destroy() {
    this.pause();
    this.program = null;
    this.programFactory = null;
  }

  /* ------------------ Frame loop ------------------ */

  private tick = () => {
    if (this.playState !== "playing") return;

    const now = performance.now();
    const dt = now - this.lastFrameMs;
    this.lastFrameMs = now;
    this.tMs += dt;

    this.renderOnce();

    this.rafId = requestAnimationFrame(this.tick);
  };

  private renderOnce() {
    if (!this.program) return;

    const tree = this.program.signal(this.tMs, this.runtimeCtx);
    this.onFrame(tree);
  }
}

Why this design matters
	•	ProgramFactory vs Program separation allows:
	•	recompile without restarting loop
	•	multiple seeds
	•	future “time travel” debugging
	•	Player never inspects RenderTree contents
	•	No mutable animation state leaks into runtime

⸻

3. SVG Renderer: semantic → DOM (with stable IDs)

Why this renderer design is critical
	•	Compositors rely on stable identity
	•	Deformations wrap subtrees
	•	Export/lowering needs semantic nodes preserved
	•	CSS export needs structure, not canvas pixels

Renderer assumptions

We assume these kernel types exist:

import {
  RenderTree,
  DrawNode,
  GroupNode,
  ShapeNode,
  EffectNode,
} from "@kernel";


⸻

4. Renderer skeleton (keyed, incremental)

This renderer:
	•	Maintains node.id → SVGElement
	•	Uses <g> wrappers for groups & effects
	•	Composes opacity + transforms by context, not mutation

// svgRenderer.ts
import { RenderTree, DrawNode } from "@kernel";

type SvgEl = SVGElement;

interface RenderCtx {
  opacity: number;
  transform: string; // accumulated SVG transform string
}

const ID_ATTR = "data-node-id";

export class SvgRenderer {
  private svg: SVGSVGElement;
  private nodeMap = new Map<string, SvgEl>();

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
  }

  render(tree: RenderTree) {
    const rootCtx: RenderCtx = {
      opacity: 1,
      transform: "",
    };

    let root = this.nodeMap.get("__root__") as SVGGElement | undefined;
    if (!root) {
      root = document.createElementNS("http://www.w3.org/2000/svg", "g");
      root.setAttribute(ID_ATTR, "__root__");
      this.svg.appendChild(root);
      this.nodeMap.set("__root__", root);
    }

    this.renderNode(root, tree, rootCtx);
    this.cleanup();
  }

  private renderNode(parent: SVGGElement, node: DrawNode, ctx: RenderCtx) {
    let el = this.nodeMap.get(node.id);

    if (!el) {
      el = this.createElement(node);
      el.setAttribute(ID_ATTR, node.id);
      this.nodeMap.set(node.id, el);
      parent.appendChild(el);
    } else if (el.parentNode !== parent) {
      parent.appendChild(el);
    }

    (el as any).__used = true;

    const nextCtx = this.applyNode(el, node, ctx);

    if (node.kind === "group") {
      this.renderChildren(el as SVGGElement, node.children, nextCtx);
    } else if (node.kind === "effect") {
      this.renderChildren(el as SVGGElement, [node.child], nextCtx);
    }
  }

  private renderChildren(
    parent: SVGGElement,
    children: readonly DrawNode[],
    ctx: RenderCtx
  ) {
    for (const child of children) {
      this.renderNode(parent, child, ctx);
    }
  }

  private applyNode(el: SvgEl, node: DrawNode, ctx: RenderCtx): RenderCtx {
    let opacity = ctx.opacity;
    let transform = ctx.transform;

    if (node.kind === "effect") {
      if (node.effect.kind === "opacityMul") {
        opacity *= node.effect.mul;
      }
      if (node.effect.kind === "transform2d") {
        transform += " " + transform2dToSvg(node.effect.transform);
      }
    }

    if (node.kind !== "shape") {
      el.setAttribute("opacity", String(opacity));
      el.setAttribute("transform", transform);
    } else {
      el.setAttribute("opacity", String(opacity * (node.style?.opacity ?? 1)));
      applyShape(el, node);
    }

    return { opacity, transform };
  }

  private createElement(node: DrawNode): SvgEl {
    const ns = "http://www.w3.org/2000/svg";

    if (node.kind === "group" || node.kind === "effect") {
      return document.createElementNS(ns, "g");
    }

    if (node.geom.kind === "svgPath") {
      return document.createElementNS(ns, "path");
    }

    if (node.geom.kind === "circle") {
      return document.createElementNS(ns, "circle");
    }

    throw new Error("Unknown node kind");
  }

  private cleanup() {
    for (const [id, el] of this.nodeMap) {
      if (id === "__root__") continue;
      if ((el as any).__used) {
        (el as any).__used = false;
        continue;
      }
      if (!el.isConnected) {
        this.nodeMap.delete(id);
      }
    }
  }
}


⸻

5. Why this renderer unlocks everything later

Compositors
	•	Insert effect nodes
	•	Renderer already handles them

Deformations
	•	Insert semantic effect: deform
	•	Lower later, renderer stays unchanged

CSS export
	•	Walk RenderTree
	•	Sample signal(t)
	•	Convert to keyframes

Performance
	•	Incremental reconciliation
	•	Stable node identity
	•	No geometry mutation at runtime

⸻

6. Proof program (to validate slice 1)

You can now test Slice 1 with a hardcoded program:

const demoProgram: Program<RenderTree> = {
  signal(tMs) {
    const t = tMs / 1000;
    return {
      kind: "effect",
      id: "pulse",
      effect: { kind: "opacityMul", mul: 0.5 + 0.5 * Math.sin(t) },
      child: {
        kind: "shape",
        id: "line",
        geom: { kind: "svgPath", d: "M 100 100 L 300 100" },
        style: { stroke: "white", strokeWidth: 4 },
      },
    };
  },
  event() {
    return [];
  },
};

Wire it through Player + SvgRenderer and you should see motion immediately.

⸻

7. Definition of done (Slice 1)

You can:
	•	Run a Program<RenderTree>
	•	Scrub time
	•	Hot-swap program factories
	•	Render effects compositionally
	•	Preserve node identity

