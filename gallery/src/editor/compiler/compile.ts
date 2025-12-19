/**
 * Patch → Program Compiler
 *
 * Compiles a visual patch graph into a runnable V4 Program<RenderTree>.
 *
 * Architecture:
 * 1. Validate block types exist in registry
 * 2. Build connection indices, detect multiple writers
 * 3. Type-check connections against declared port types
 * 4. Topological sort blocks by dependency
 * 5. Compile blocks in order, producing Artifacts per output port
 * 6. Resolve and return final RenderTreeProgram output
 */

import type {
  Artifact,
  BlockId,
  BlockRegistry,
  CompileCtx,
  CompileError,
  CompileResult,
  CompilerConnection,
  CompilerPatch,
  DrawNode,
  PortRef,
  PortType,
  Program,
  RenderTree,
  RuntimeCtx,
  Seed,
  ValueKind,
} from './types';
import { compileBusAwarePatch, isBusAwarePatch } from './compileBusAware';

// =============================================================================
// Main Compiler Entry Point
// =============================================================================

export function compilePatch(
  patch: CompilerPatch,
  registry: BlockRegistry,
  seed: Seed,
  ctx: CompileCtx
): CompileResult {
  // Route to bus-aware compiler if patch has buses
  if (isBusAwarePatch(patch)) {
    return compileBusAwarePatch(patch, registry, seed, ctx);
  }

  // Wire-only compilation (Phase 1 logic)
  return compilePatchWireOnly(patch, registry, seed, ctx);
}

/**
 * Wire-only compilation (original Phase 1 implementation).
 * Used for backward compatibility with non-bus patches.
 */
function compilePatchWireOnly(
  patch: CompilerPatch,
  registry: BlockRegistry,
  _seed: Seed,
  ctx: CompileCtx
): CompileResult {
  const errors: CompileError[] = [];

  // 0) Handle empty patch gracefully - nothing to compile
  if (patch.blocks.size === 0) {
    return {
      ok: false,
      errors: [{ code: 'EmptyPatch', message: 'Patch is empty - add some blocks to compile.' }],
    };
  }

  // 1) Validate block types exist in registry
  for (const [id, b] of patch.blocks.entries()) {
    if (!registry[b.type]) {
      errors.push({
        code: 'CompilerMissing',
        message: `No compiler registered for block type "${b.type}"`,
        where: { blockId: id },
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  // 2) Build connection indices (detect multiple writers to same input)
  const incoming = indexIncoming(patch.connections);

  for (const [toKey, conns] of incoming.entries()) {
    if (conns.length > 1) {
      errors.push({
        code: 'MultipleWriters',
        message: `Input port has multiple incoming connections: ${toKey}`,
        where: { connection: conns[0] },
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  // 3) Type-check connections against declared port types
  for (const c of patch.connections) {
    const fromBlock = patch.blocks.get(c.from.blockId);
    const toBlock = patch.blocks.get(c.to.blockId);

    if (!fromBlock) {
      errors.push({
        code: 'BlockMissing',
        message: `Missing from-block ${c.from.blockId}`,
        where: { connection: c },
      });
      continue;
    }
    if (!toBlock) {
      errors.push({
        code: 'BlockMissing',
        message: `Missing to-block ${c.to.blockId}`,
        where: { connection: c },
      });
      continue;
    }

    const fromComp = registry[fromBlock.type]!;
    const toComp = registry[toBlock.type]!;

    const fromPort = fromComp.outputs.find((p) => p.name === c.from.port);
    const toPort = toComp.inputs.find((p) => p.name === c.to.port);

    if (!fromPort) {
      errors.push({
        code: 'PortMissing',
        message: `Missing output port ${c.from.blockId}.${c.from.port}`,
        where: { connection: c },
      });
      continue;
    }
    if (!toPort) {
      errors.push({
        code: 'PortMissing',
        message: `Missing input port ${c.to.blockId}.${c.to.port}`,
        where: { connection: c },
      });
      continue;
    }

    if (!isPortTypeAssignable(fromPort.type, toPort.type)) {
      errors.push({
        code: 'PortTypeMismatch',
        message: `Type mismatch: ${c.from.blockId}.${c.from.port} (${fromPort.type.kind}) → ${c.to.blockId}.${c.to.port} (${toPort.type.kind})`,
        where: { connection: c },
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  // 4) Topological order by blocks (dependency graph from connections)
  const order = topoSortBlocks(patch, errors);
  if (errors.length) return { ok: false, errors };

  // 5) Compile blocks in topo order to artifacts per output port
  const compiledPortMap = new Map<string, Artifact>();

  for (const blockId of order) {
    const block = patch.blocks.get(blockId);
    if (!block) {
      errors.push({
        code: 'BlockMissing',
        message: `Block not found: ${blockId}`,
        where: { blockId },
      });
      continue;
    }

    const compiler = registry[block.type];
    if (!compiler) {
      errors.push({
        code: 'CompilerMissing',
        message: `Compiler missing for: ${block.type}`,
        where: { blockId },
      });
      continue;
    }

    // Resolve inputs
    const inputs: Record<string, Artifact> = {};
    for (const p of compiler.inputs) {
      const conn = incoming.get(keyOf(blockId, p.name))?.[0];
      if (conn) {
        const srcKey = keyOf(conn.from.blockId, conn.from.port);
        const src = compiledPortMap.get(srcKey);
        inputs[p.name] = src ?? {
          kind: 'Error',
          message: `Missing upstream artifact for ${srcKey}`,
          where: { blockId: conn.from.blockId, port: conn.from.port },
        };
      } else {
        // No connection: either optional or provide default scalar constant from params.
        if (p.required) {
          inputs[p.name] = {
            kind: 'Error',
            message: `Missing required input ${blockId}.${p.name}`,
            where: { blockId, port: p.name },
          };
        } else {
          // Optional inputs get a placeholder Error - block compiler handles defaults
          inputs[p.name] = {
            kind: 'Error',
            message: `Unwired optional input ${blockId}.${p.name}`,
            where: { blockId, port: p.name },
          };
        }
      }
    }

    // If any required input is an Error, record it
    for (const [name, art] of Object.entries(inputs)) {
      if (art.kind === 'Error') {
        const def = compiler.inputs.find((x) => x.name === name);
        if (def?.required) {
          errors.push({
            code: 'UpstreamError',
            message: art.message,
            where: { blockId, port: name },
          });
        }
      }
    }
    if (errors.length) return { ok: false, errors };

    const outs = compiler.compile({ id: blockId, params: block.params, inputs, ctx });

    // Validate outputs and store
    for (const outDef of compiler.outputs) {
      const produced = outs[outDef.name];
      if (!produced) {
        errors.push({
          code: 'PortMissing',
          message: `Compiler did not produce required output port ${blockId}.${outDef.name}`,
          where: { blockId, port: outDef.name },
        });
        continue;
      }
      if (produced.kind === 'Error') {
        errors.push({
          code: 'UpstreamError',
          message: produced.message,
          where: produced.where ?? { blockId, port: outDef.name },
        });
        continue;
      }
      if (!isKindAssignable(produced.kind, outDef.type.kind)) {
        errors.push({
          code: 'PortTypeMismatch',
          message: `Compiler produced wrong kind for ${blockId}.${outDef.name}: got ${produced.kind}, expected ${outDef.type.kind}`,
          where: { blockId, port: outDef.name },
        });
        continue;
      }
      compiledPortMap.set(keyOf(blockId, outDef.name), produced);
    }

    if (errors.length) return { ok: false, errors };
  }

  // 6) Resolve final output port
  const outputRef = patch.output ?? inferOutputPort(patch, registry, compiledPortMap, errors);
  if (!outputRef) {
    errors.push({
      code: 'OutputMissing',
      message: 'No output port specified and could not infer one.',
    });
    return { ok: false, errors };
  }

  const outArt = compiledPortMap.get(keyOf(outputRef.blockId, outputRef.port));
  if (!outArt) {
    errors.push({
      code: 'OutputMissing',
      message: `Output artifact not found for ${outputRef.blockId}.${outputRef.port}`,
    });
    return { ok: false, errors };
  }

  // Accept both RenderTreeProgram and RenderTree (wrap RenderTree into a Program)
  if (outArt.kind === 'RenderTreeProgram') {
    return { ok: true, program: outArt.value, errors: [], compiledPortMap };
  }

  if (outArt.kind === 'RenderTree') {
    // Wrap RenderTree function into a Program structure
    const renderFn = outArt.value as (tMs: number, ctx: RuntimeCtx) => DrawNode;
    const program: Program<RenderTree> = {
      signal: renderFn,
      event: () => [],
    };
    return { ok: true, program, errors: [], compiledPortMap };
  }

  errors.push({
    code: 'OutputWrongType',
    message: `Patch output must be RenderTreeProgram or RenderTree, got ${outArt.kind}`,
    where: { blockId: outputRef.blockId, port: outputRef.port },
  });
  return { ok: false, errors };
}

// =============================================================================
// Port Compatibility
// =============================================================================

export function isPortTypeAssignable(from: PortType, to: PortType): boolean {
  // Exact match
  if (from.kind === to.kind) return true;

  // Compatible type sets - types within a set can be connected
  const compatibleSets: string[][] = [
    ['Field:Point', 'Field:vec2'],
    ['ElementCount', 'Scalar:number'],
    ['Render', 'RenderTree', 'RenderTreeProgram'], // All render types are compatible
    ['Signal:number', 'Signal:Unit'],
  ];

  for (const set of compatibleSets) {
    if (set.includes(from.kind) && set.includes(to.kind)) return true;
  }

  // One-way compatibility: TargetScene can feed into Field:vec2 or Field:Point
  // (the receiving block handles extraction)
  if (from.kind === 'TargetScene' && (to.kind === 'Field:vec2' || to.kind === 'Field:Point')) {
    return true;
  }

  return false;
}

function isKindAssignable(fromKind: Artifact['kind'], toKind: ValueKind): boolean {
  if (fromKind === toKind) return true;

  // Same compatible sets as port types
  const compatibleSets: string[][] = [
    ['Field:Point', 'Field:vec2'],
    ['ElementCount', 'Scalar:number'],
    ['Render', 'RenderTree', 'RenderTreeProgram'], // All render types are compatible
    ['Signal:number', 'Signal:Unit'],
  ];

  for (const set of compatibleSets) {
    if (set.includes(fromKind) && set.includes(toKind)) return true;
  }

  return false;
}

// =============================================================================
// Connection Indexing
// =============================================================================

function indexIncoming(
  conns: readonly CompilerConnection[]
): Map<string, CompilerConnection[]> {
  const m = new Map<string, CompilerConnection[]>();
  for (const c of conns) {
    const k = keyOf(c.to.blockId, c.to.port);
    const arr = m.get(k) ?? [];
    arr.push(c);
    m.set(k, arr);
  }
  return m;
}

function keyOf(blockId: string, port: string): string {
  return `${blockId}:${port}`;
}

// =============================================================================
// Topological Sort (block-level)
// =============================================================================

/**
 * topoSortBlocks sorts blocks so that upstream dependencies compile first.
 * Dependency graph edges: from c.from.blockId -> c.to.blockId
 *
 * - Detects cycles and emits CycleDetected error.
 * - Includes isolated blocks (no edges) in stable order.
 */
export function topoSortBlocks(
  patch: CompilerPatch,
  errors: CompileError[]
): readonly BlockId[] {
  const ids = Array.from(patch.blocks.keys());

  // Build adjacency + indegree
  const adj = new Map<BlockId, Set<BlockId>>();
  const indeg = new Map<BlockId, number>();

  for (const id of ids) {
    adj.set(id, new Set());
    indeg.set(id, 0);
  }

  for (const c of patch.connections) {
    const a = c.from.blockId;
    const b = c.to.blockId;
    if (!adj.has(a) || !adj.has(b)) continue;
    if (!adj.get(a)!.has(b)) {
      adj.get(a)!.add(b);
      indeg.set(b, (indeg.get(b) ?? 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: BlockId[] = [];
  for (const id of ids) {
    if ((indeg.get(id) ?? 0) === 0) queue.push(id);
  }

  // Stable order: sort by id
  queue.sort();

  const out: BlockId[] = [];
  while (queue.length) {
    const x = queue.shift()!;
    out.push(x);
    for (const y of adj.get(x) ?? []) {
      indeg.set(y, (indeg.get(y) ?? 0) - 1);
      if ((indeg.get(y) ?? 0) === 0) queue.push(y);
    }
    queue.sort();
  }

  if (out.length !== ids.length) {
    errors.push({ code: 'CycleDetected', message: 'Cycle detected in patch graph.' });
    return [];
  }

  return out;
}

// =============================================================================
// Output Inference
// =============================================================================

function inferOutputPort(
  patch: CompilerPatch,
  registry: BlockRegistry,
  compiled: Map<string, Artifact>,
  _errors: CompileError[]
): PortRef | null {
  // Heuristic: find all produced RenderTreeProgram or RenderTree ports that are NOT used as a source.
  // If exactly one, pick it.
  const produced: PortRef[] = [];

  // Map of all ports that feed something
  const fed = new Set<string>();
  for (const c of patch.connections) fed.add(keyOf(c.from.blockId, c.from.port));

  for (const [blockId, block] of patch.blocks.entries()) {
    const comp = registry[block.type];
    if (!comp) continue;
    for (const out of comp.outputs) {
      // Accept all render output types: Render, RenderTree, RenderTreeProgram
      const renderTypes = ['Render', 'RenderTree', 'RenderTreeProgram'];
      if (!renderTypes.includes(out.type.kind)) continue;
      const k = keyOf(blockId, out.name);
      if (!compiled.has(k)) continue;
      if (fed.has(k)) continue;
      produced.push({ blockId, port: out.name });
    }
  }

  if (produced.length === 1) return produced[0]!;
  return null;
}
