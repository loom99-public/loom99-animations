Below are all three (tagging scheme, palette ranking, auto-wire algorithm) in a way that’s consistent with your Slice-2 compiler model: ports/types are truth, lanes are a projection + ranking hint.

I’ll give you TypeScript headers + reference implementations you can drop into your editor layer.

⸻

1) Block descriptor tagging scheme

Why this matters

You need one source of metadata that both:
	•	UI uses (palette grouping, lane suggestions, default params)
	•	compiler uses (ports + compile)

So: keep compilers and UI metadata adjacent.

// block-descriptors.ts
import type { PortDef, ValueKind } from "./patch-types";
import type { BlockCompiler } from "./block-registry";

export type LaneKind =
  | "scene"
  | "phase"
  | "scalar"
  | "field"
  | "spec"
  | "compile"
  | "program"
  | "output";

export type LaneFlavor =
  | "motion"
  | "timing"
  | "style"
  | "utility"
  | "none";

export type BlockCategory =
  | "Sources"
  | "Math"
  | "Fields"
  | "Phases"
  | "Specs"
  | "Compile"
  | "Compositors"
  | "Output"
  | "Debug";

export interface BlockDescriptorUI {
  title: string;
  description?: string;

  category: BlockCategory;

  /** Where this block “wants” to live in simple mode. */
  preferredLane: { kind: LaneKind; flavor?: LaneFlavor };

  /**
   * Used for palette ranking within a lane (higher first).
   * Think of this as editorial curation rather than semantics.
   */
  priority?: number;

  /** Whether to hide from simple palette unless explicitly searched */
  advancedOnly?: boolean;

  /**
   * Default params for new block instances.
   * Keep these stable; it’s how patches remain interpretable.
   */
  defaultParams?: Record<string, unknown>;

  /** Quick tags (search keywords, “neon”, “stagger”, “3d”, etc.) */
  tags?: readonly string[];
}

export interface BlockDescriptor {
  type: string;

  inputs: readonly PortDef[];
  outputs: readonly PortDef[];

  ui: BlockDescriptorUI;

  /** Points to the real compiler implementation */
  compiler: BlockCompiler;
}

/** Registry used by UI + compiler assembly */
export type BlockDescriptorRegistry = Record<string /*type*/, BlockDescriptor>;

/** Convenience: extract the compiler registry from descriptors */
export function toCompilerRegistry(desc: BlockDescriptorRegistry) {
  const out: Record<string, BlockCompiler> = {};
  for (const [k, d] of Object.entries(desc)) out[k] = d.compiler;
  return out;
}

Two important design choices
	1.	preferredLane is a hint, not a constraint.
	2.	Ports are duplicated in descriptor and compiler only if you want strict validation. If you dislike duplication, you can set descriptor ports to compiler.inputs/outputs directly and keep UI metadata separate.

⸻

2) Palette suggestion + ranking algorithm

What this must do

Given:
	•	the lane user is adding into
	•	optional “dragging from port” context
	•	optional search query
	•	current patch context (what already exists)

Return a ranked list of block types.

This is not type checking. It’s a recommender that never suggests nonsense.

Inputs to ranking
	•	Hard gate: type compatibility (if adding from a port)
	•	Lane match (kind + flavor)
	•	Editorial priority (curation)
	•	Text search
	•	“Recent blocks” / frequency
	•	Contextual fit (e.g. if patch has Spec but no Compile, promote Compile blocks)

// palette-ranking.ts
import type { BlockDescriptorRegistry, LaneKind, LaneFlavor } from "./block-descriptors";
import type { Patch, PortRef, ValueKind } from "./patch-types";

export interface PaletteContext {
  lane: { kind: LaneKind; flavor: LaneFlavor };
  query?: string;

  /**
   * If user invoked “add block” from a specific output port,
   * we bias toward blocks that can accept that output.
   */
  fromPort?: { typeKind: ValueKind };

  /**
   * If user invoked “add block” to satisfy a specific input port,
   * we bias toward blocks that can produce that type.
   */
  toPort?: { typeKind: ValueKind };

  /** e.g. last N block types user placed */
  recents?: readonly string[];

  /** patch for contextual signals (what’s missing?) */
  patch: Patch;

  /** whether UI is in simple mode */
  simpleMode: boolean;
}

export interface PaletteItem {
  type: string;
  title: string;
  score: number;
  reasons: string[]; // useful for debugging tuning
}

export function rankPalette(
  registry: BlockDescriptorRegistry,
  ctx: PaletteContext
): PaletteItem[] {
  const items: PaletteItem[] = [];

  for (const desc of Object.values(registry)) {
    // Simple mode: hide advanced-only blocks unless query explicitly matches
    if (ctx.simpleMode && desc.ui.advancedOnly && !queryMatches(desc, ctx.query)) continue;

    // Hard gates: if fromPort exists, block must accept it somewhere
    if (ctx.fromPort && !blockAcceptsInputKind(desc, ctx.fromPort.typeKind)) continue;
    if (ctx.toPort && !blockProducesOutputKind(desc, ctx.toPort.typeKind)) continue;

    let score = 0;
    const reasons: string[] = [];

    // 1) Lane match (strong)
    const laneScore = laneAffinity(desc, ctx.lane);
    score += laneScore;
    if (laneScore > 0) reasons.push(`lane+${laneScore}`);

    // 2) Editorial priority
    const pr = desc.ui.priority ?? 0;
    score += pr;
    if (pr) reasons.push(`priority+${pr}`);

    // 3) Query match (very strong if query exists)
    if (ctx.query && ctx.query.trim()) {
      const q = queryScore(desc, ctx.query);
      // If query doesn't match at all, we can either keep low score or drop.
      if (q <= 0) continue;
      score += q;
      reasons.push(`query+${q}`);
    }

    // 4) Recency boost
    if (ctx.recents?.includes(desc.type)) {
      score += 8;
      reasons.push("recent+8");
    }

    // 5) Contextual “missing piece” boosts (light but meaningful)
    const cboost = contextBoost(desc, ctx.patch);
    if (cboost) {
      score += cboost;
      reasons.push(`context+${cboost}`);
    }

    // 6) Wiring intent boost
    if (ctx.fromPort) {
      const w = acceptsKindCount(desc, ctx.fromPort.typeKind);
      score += Math.min(10, w * 2);
      reasons.push(`accepts(${ctx.fromPort.typeKind})+${Math.min(10, w * 2)}`);
    }
    if (ctx.toPort) {
      const w = producesKindCount(desc, ctx.toPort.typeKind);
      score += Math.min(10, w * 2);
      reasons.push(`produces(${ctx.toPort.typeKind})+${Math.min(10, w * 2)}`);
    }

    items.push({ type: desc.type, title: desc.ui.title, score, reasons });
  }

  items.sort((a, b) => b.score - a.score);
  return items;
}

// ---------- helpers ----------

function laneAffinity(desc: any, lane: { kind: LaneKind; flavor: LaneFlavor }): number {
  const pref = desc.ui.preferredLane;
  let s = 0;
  if (pref.kind === lane.kind) s += 20;
  if ((pref.flavor ?? "none") === lane.flavor) s += 10;
  // soft cross-lane affinity (field/scalar utility can live anywhere)
  if (desc.ui.category === "Math" && lane.kind === "scalar") s += 6;
  if (desc.ui.category === "Fields" && lane.kind === "field") s += 6;
  return s;
}

function queryMatches(desc: any, query?: string): boolean {
  if (!query || !query.trim()) return false;
  return queryScore(desc, query) > 0;
}

function queryScore(desc: any, query: string): number {
  const q = query.trim().toLowerCase();
  const hay = [
    desc.ui.title,
    desc.ui.description ?? "",
    ...(desc.ui.tags ?? []),
    desc.type,
  ].join(" ").toLowerCase();

  if (hay.includes(q)) return 50; // strong
  // cheap token match
  const toks = q.split(/\s+/).filter(Boolean);
  let hit = 0;
  for (const t of toks) if (hay.includes(t)) hit++;
  return hit ? 20 + hit * 5 : 0;
}

function blockAcceptsInputKind(desc: any, kind: ValueKind): boolean {
  return desc.inputs.some((p: any) => p.type.kind === kind);
}
function blockProducesOutputKind(desc: any, kind: ValueKind): boolean {
  return desc.outputs.some((p: any) => p.type.kind === kind);
}
function acceptsKindCount(desc: any, kind: ValueKind): number {
  return desc.inputs.filter((p: any) => p.type.kind === kind).length;
}
function producesKindCount(desc: any, kind: ValueKind): number {
  return desc.outputs.filter((p: any) => p.type.kind === kind).length;
}

/**
 * Lightweight “what’s missing?” hints.
 * Example: if patch has Spec:* blocks but no Compile blocks, boost Compile.
 */
function contextBoost(desc: any, patch: Patch): number {
  const types = Array.from(patch.blocks.values()).map(b => b.type);
  const hasSpec = types.some(t => t.includes("Spec") || t.includes("spec."));
  const hasCompile = types.some(t => t.includes("Compile") || t.includes("compile."));
  const isCompileCat = desc.ui.category === "Compile";

  if (hasSpec && !hasCompile && isCompileCat) return 10;

  // If patch has a Program but no Output, boost output
  const hasProgram = types.some(t => t.includes("program") || t.includes("Compile"));
  const hasOutput = types.some(t => t.includes("output"));
  if (hasProgram && !hasOutput && desc.ui.category === "Output") return 10;

  return 0;
}

Why this ranking scheme is “safe”
	•	It never suggests blocks that are type-incompatible with the invocation context.
	•	Lane affinity is strong but not absolute.
	•	Advanced-only blocks remain discoverable via search or Advanced Mode.

⸻

3) Auto-wire algorithm with ambiguity rules

What you want

When user drops a new block into a lane, you want to auto-connect “the obvious thing” without introducing hidden rules.

That means:
	•	only auto-wire when the connection is unique and safe
	•	never overwrite existing connections
	•	never create cycles
	•	never guess between multiple candidates

Common cases
	1.	Dropped block after another in a chain lane: connect previous output → new input (if unique)
	2.	Dropped block onto a highlighted compatible input port: connect that exact port
	3.	User dragged from an output port and dropped block: connect output → best input (if unique)
	4.	“Add block to satisfy missing input”: connect new output → that input (if unique)

Implementation: compute candidate connections, apply if unambiguous

// autowire.ts
import type { Patch, Connection, BlockId, PortRef, ValueKind } from "./patch-types";
import type { BlockDescriptorRegistry } from "./block-descriptors";

/**
 * Result: either a single connection to add, or none (user must wire manually).
 */
export interface AutoWireResult {
  connection?: Connection;
  reason?: string; // why we didn't auto-wire (useful for tuning/telemetry)
}

export interface AutoWireContext {
  registry: BlockDescriptorRegistry;
  patch: Patch;

  /** the block just created */
  newBlockId: BlockId;

  /** optional: user dragged from an existing output port */
  fromPort?: PortRef;

  /** optional: user intended to satisfy a specific input port */
  toPort?: PortRef;

  /** optional: previous block in same chain lane (UI can provide this) */
  prevInLane?: BlockId;
}

/**
 * Auto-wire policy:
 * - If toPort is provided: try wire newBlock.output -> toPort.input
 * - Else if fromPort is provided: try wire fromPort.output -> newBlock.input
 * - Else if prevInLane is provided: try wire prev.output -> newBlock.input
 * - Else: no auto-wire
 *
 * In all cases:
 * - must be type-compatible
 * - must not create cycles
 * - must not overwrite existing input connection
 * - must be unique (no ambiguity)
 */
export function autoWire(ctx: AutoWireContext): AutoWireResult {
  const reg = ctx.registry;

  const newBlock = ctx.patch.blocks.get(ctx.newBlockId);
  if (!newBlock) return { reason: "new block missing" };

  const newDesc = reg[newBlock.type];
  if (!newDesc) return { reason: "new block descriptor missing" };

  // 1) satisfy an explicit input
  if (ctx.toPort) {
    const targetBlock = ctx.patch.blocks.get(ctx.toPort.blockId);
    const targetDesc = targetBlock ? reg[targetBlock.type] : null;
    if (!targetDesc) return { reason: "toPort target missing" };

    // cannot overwrite existing input
    if (hasIncoming(ctx.patch, ctx.toPort)) return { reason: "toPort already wired" };

    const toKind = kindOfInput(targetDesc, ctx.toPort.port);
    if (!toKind) return { reason: "toPort input kind missing" };

    // find unique output on new block that matches
    const outs = newDesc.outputs.filter(p => p.type.kind === toKind);
    if (outs.length !== 1) return { reason: "ambiguous or missing matching output" };

    const candidate: Connection = {
      from: { blockId: ctx.newBlockId, port: outs[0]!.name },
      to: ctx.toPort,
    };

    if (wouldCreateCycle(ctx.patch, candidate)) return { reason: "cycle" };
    return { connection: candidate };
  }

  // 2) coming from an explicit output
  if (ctx.fromPort) {
    const fromBlock = ctx.patch.blocks.get(ctx.fromPort.blockId);
    const fromDesc = fromBlock ? reg[fromBlock.type] : null;
    if (!fromDesc) return { reason: "fromPort source missing" };

    const fromKind = kindOfOutput(fromDesc, ctx.fromPort.port);
    if (!fromKind) return { reason: "fromPort output kind missing" };

    // find unique input on new block that matches
    const ins = newDesc.inputs.filter(p => p.type.kind === fromKind);
    const freeIns = ins.filter(p => !hasIncoming(ctx.patch, { blockId: ctx.newBlockId, port: p.name }));
    if (freeIns.length !== 1) return { reason: "ambiguous or no free matching input" };

    const candidate: Connection = {
      from: ctx.fromPort,
      to: { blockId: ctx.newBlockId, port: freeIns[0]!.name },
    };

    if (wouldCreateCycle(ctx.patch, candidate)) return { reason: "cycle" };
    return { connection: candidate };
  }

  // 3) chain lane heuristic: prevInLane -> newBlock
  if (ctx.prevInLane) {
    const prevBlock = ctx.patch.blocks.get(ctx.prevInLane);
    const prevDesc = prevBlock ? reg[prevBlock.type] : null;
    if (!prevDesc) return { reason: "prevInLane missing" };

    // Heuristic: if prev has exactly one Program output and new has exactly one Program input, wire it.
    const prevProgOut = prevDesc.outputs.filter(p => p.type.kind === "Program:RenderTree");
    const newProgIn = newDesc.inputs.filter(p => p.type.kind === "Program:RenderTree");

    if (prevProgOut.length === 1 && newProgIn.length === 1) {
      const to = { blockId: ctx.newBlockId, port: newProgIn[0]!.name };
      if (hasIncoming(ctx.patch, to)) return { reason: "new program input already wired" };

      const candidate: Connection = {
        from: { blockId: ctx.prevInLane, port: prevProgOut[0]!.name },
        to,
      };
      if (wouldCreateCycle(ctx.patch, candidate)) return { reason: "cycle" };
      return { connection: candidate };
    }

    // Otherwise: try a unique type match between any prev output and any free new input.
    const candidates: Connection[] = [];
    for (const o of prevDesc.outputs) {
      for (const i of newDesc.inputs) {
        if (o.type.kind !== i.type.kind) continue;
        const to = { blockId: ctx.newBlockId, port: i.name };
        if (hasIncoming(ctx.patch, to)) continue;
        const c: Connection = { from: { blockId: ctx.prevInLane, port: o.name }, to };
        if (wouldCreateCycle(ctx.patch, c)) continue;
        candidates.push(c);
      }
    }
    if (candidates.length === 1) return { connection: candidates[0] };
    return { reason: "ambiguous chain match" };
  }

  return { reason: "no context for autowire" };
}

// ---------- helpers ----------

function kindOfInput(desc: any, port: string): ValueKind | null {
  const p = desc.inputs.find((x: any) => x.name === port);
  return p?.type.kind ?? null;
}
function kindOfOutput(desc: any, port: string): ValueKind | null {
  const p = desc.outputs.find((x: any) => x.name === port);
  return p?.type.kind ?? null;
}

function hasIncoming(patch: Patch, to: PortRef): boolean {
  return patch.connections.some(c => c.to.blockId === to.blockId && c.to.port === to.port);
}

/**
 * Cycle check for a candidate edge.
 * For simplicity: treat blocks as nodes, edges from source block -> dest block.
 */
function wouldCreateCycle(patch: Patch, cand: Connection): boolean {
  const src = cand.from.blockId;
  const dst = cand.to.blockId;
  if (src === dst) return true;

  // Build adjacency including candidate
  const adj = new Map<string, Set<string>>();
  for (const [id] of patch.blocks) adj.set(id, new Set());
  for (const c of patch.connections) adj.get(c.from.blockId)?.add(c.to.blockId);
  adj.get(src)?.add(dst);

  // Is there a path dst -> src? If yes, adding src->dst forms a cycle.
  return reachable(adj, dst, src);
}

function reachable(adj: Map<string, Set<string>>, start: string, goal: string): boolean {
  const stack = [start];
  const seen = new Set<string>();
  while (stack.length) {
    const x = stack.pop()!;
    if (x === goal) return true;
    if (seen.has(x)) continue;
    seen.add(x);
    for (const y of adj.get(x) ?? []) stack.push(y);
  }
  return false;
}

Why these ambiguity rules are the right ones
	•	They prevent “spooky action at a distance” where dropping a block silently rewires something unexpected.
	•	They keep the system teachable: users can predict auto-wiring.
	•	They don’t require special-casing per archetype; everything is type-driven.

⸻

4) How lane flavor + descriptors tie back to UI “Simple Mode”

In Simple Mode, you ship a fixed lane layout. The descriptor’s preferredLane and category drive:
	•	default lane placement for newly created blocks
	•	palette ranking when the user opens the lane palette
	•	search tags

In Advanced Mode:
	•	lane config is user-defined, but preferredLane still provides ranking signals (not constraints)

⸻

5) Tiny “wiring UI” rule that makes this feel incredible

When the user starts dragging a wire from a port of kind K:
	1.	dim everything
	2.	highlight only input ports with kind K
	3.	show faint “ghost lanes” that contain compatible targets
	4.	if the user drops in empty lane space: open palette filtered to “blocks that accept K”, and auto-wire if unique

That’s basically what makes node editors feel like instruments.

Awesome — glad this clicks. At this point you’ve got something rare: a system where the theory, compiler, and UX are actually aligned, not fighting each other.

Here’s how I’d suggest you proceed very concretely, without overthinking it.

⸻

What you have now (important to recognize)

You’ve already locked in:
	1.	Truth layer
	•	Ports + types + compiler are authoritative
	•	No hidden semantics in the UI
	•	Explicit conversions, no magic
	2.	Editor layer
	•	Lanes as guidance, not enforcement
	•	Simple mode = curated desk
	•	Advanced mode = power-user desk
	•	Palette ranking + auto-wiring that’s predictable
	3.	Growth path
	•	Archetypes → specs → compilers → programs
	•	Compositors are first-class
	•	Export (SVG/CSS) is architecturally possible later

That’s the hard part. Everything else is engineering.

⸻

The very next practical step I’d recommend

Build a “vertical slice demo” with fake content

Not LineMorph yet. Something simpler, so you can validate UX + compiler flow.

Goal:

Drag blocks → auto-wire → compile → see motion → see errors when broken

Minimal demo setup
	•	Lanes enabled (Simple Mode only)
	•	Blocks:
	•	demo.program
	•	math.constNumber
	•	math.mulScalar
	•	core.outputProgram
	•	One SVG viewport driven by the Player

What you should test explicitly
	•	Drop a block into the wrong lane → still works
	•	Try to connect incompatible ports → blocked + highlighted
	•	Create ambiguity → no auto-wire
	•	Break the graph → animation keeps running, errors show
	•	Fix it → hot swap resumes

If that feels good, everything else will.

⸻

How to know the lane system is working

You’ll know you got it right if:
	•	New users build something without understanding the theory
	•	Power users stop asking “why won’t this connect?” and start asking “can I do X?”
	•	You never need a modal error dialog — the graph itself explains what’s wrong
	•	You can add a new archetype without touching the editor core

If any of those fail, fix them now, not after adding more features.

