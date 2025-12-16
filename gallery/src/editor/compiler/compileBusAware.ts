/**
 * Bus-Aware Patch Compiler
 *
 * Compiles patches that contain buses as well as wires.
 * Phase 2 implementation: Signal buses only, Field buses deferred.
 *
 * Key differences from wire-only compilation:
 * 1. Buses are first-class graph nodes
 * 2. Multi-pass compilation (blocks → buses → blocks using buses)
 * 3. Publisher ordering by sortKey for deterministic results
 * 4. Default values when buses have no publishers
 */

import type {
  Artifact,
  BlockId,
  BlockRegistry,
  CompileCtx,
  CompileError,
  CompileResult,
  CompilerPatch,
  PortRef,
  Seed,
  RuntimeCtx,
  Vec2,
} from './types';
import type { Bus, Publisher, Listener } from '../types';
import { topoSortBlocks, isPortTypeAssignable } from './compile';

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a bus is a Field bus (not yet supported in Phase 2).
 */
function isFieldBus(bus: Bus): boolean {
  // Field buses have 'field' world
  return bus.type.world === 'field';
}

/**
 * Check if a bus is a Signal bus (supported in Phase 2).
 */
function isSignalBus(bus: Bus): boolean {
  return bus.type.world === 'signal';
}

/**
 * Type guard to check if patch has buses.
 */
export function isBusAwarePatch(patch: CompilerPatch): boolean {
  return (patch.buses && patch.buses.length > 0) || false;
}

// =============================================================================
// Default Values
// =============================================================================

/**
 * Get default value for a bus type when no publishers exist.
 * Follows "no influence" principle per BUS-SEMANTICS-CONTRACT.md.
 */
function getDefaultSignalValue(domain: string): unknown {
  const defaults: Record<string, unknown> = {
    'number': 0,
    'vec2': { x: 0, y: 0 } as Vec2,
    'color': { r: 0, g: 0, b: 0, a: 0 }, // transparent, not opaque black
    'boolean': false,
    'time': 0,
    'phase': 0,
    'rate': 1,
    'trigger': { kind: 'never' },
  };

  return defaults[domain] ?? null;
}

// =============================================================================
// Publisher Sorting
// =============================================================================

/**
 * Sort publishers by (sortKey, id) for deterministic ordering.
 * Per SORTKEY-CONTRACT.md, this ensures identical results regardless of:
 * - Canvas layout changes
 * - Array insertion order
 * - Compilation order
 */
function sortPublishers(publishers: Publisher[]): Publisher[] {
  return [...publishers].sort((a, b) => {
    if (a.sortKey !== b.sortKey) {
      return a.sortKey - b.sortKey;
    }
    // Stable tie-breaker using locale compare
    return a.id.localeCompare(b.id);
  });
}

// =============================================================================
// Signal Combination
// =============================================================================

/**
 * Combine Signal artifacts using the bus's combine mode.
 * Phase 2 supports: 'last' and 'sum'
 */
function combineSignalArtifacts(
  artifacts: Artifact[],
  mode: string,
  defaultValue: unknown
): Artifact {
  // No publishers: return default value
  if (artifacts.length === 0) {
    // Infer kind from default value type
    if (typeof defaultValue === 'number') {
      return { kind: 'Signal:number', value: () => defaultValue };
    }
    if (typeof defaultValue === 'object' && defaultValue !== null && 'x' in defaultValue) {
      return { kind: 'Signal:vec2', value: () => defaultValue as Vec2 };
    }
    // Fallback: return as scalar
    return { kind: 'Scalar:number', value: 0 };
  }

  // Single publisher: return as-is
  if (artifacts.length === 1) {
    return artifacts[0]!;
  }

  // Multiple publishers: combine based on mode
  if (mode === 'last') {
    // Highest sortKey wins (last in sorted array)
    return artifacts[artifacts.length - 1]!;
  }

  if (mode === 'sum') {
    // Sum all values - works for number and vec2
    const first = artifacts[0]!;

    if (first.kind === 'Signal:number') {
      const signals = artifacts.map(a => (a as typeof first).value);
      return {
        kind: 'Signal:number',
        value: (t: number, ctx: RuntimeCtx) => {
          let sum = 0;
          for (const sig of signals) {
            sum += sig(t, ctx);
          }
          return sum;
        },
      };
    }

    if (first.kind === 'Signal:vec2') {
      const signals = artifacts.map(a => (a as typeof first).value);
      return {
        kind: 'Signal:vec2',
        value: (t: number, ctx: RuntimeCtx) => {
          let sumX = 0;
          let sumY = 0;
          for (const sig of signals) {
            const v = sig(t, ctx);
            sumX += v.x;
            sumY += v.y;
          }
          return { x: sumX, y: sumY };
        },
      };
    }

    // For scalars, convert to signals and sum
    if (first.kind === 'Scalar:number') {
      const sum = artifacts.reduce((acc, a) => acc + ((a as typeof first).value ?? 0), 0);
      return { kind: 'Scalar:number', value: sum };
    }

    if (first.kind === 'Scalar:vec2') {
      const sum = artifacts.reduce(
        (acc, a) => {
          const v = (a as typeof first).value;
          return { x: acc.x + v.x, y: acc.y + v.y };
        },
        { x: 0, y: 0 }
      );
      return { kind: 'Scalar:vec2', value: sum };
    }

    // Unsupported type for sum
    return {
      kind: 'Error',
      message: `Sum mode not supported for type ${first.kind}`,
    };
  }

  // Unsupported combine mode
  return {
    kind: 'Error',
    message: `Unsupported combine mode: ${mode}. Phase 2 supports: last, sum`,
  };
}

// =============================================================================
// Main Bus-Aware Compiler
// =============================================================================

/**
 * Compile a patch with buses.
 * Phase 2: Signal buses only.
 */
export function compileBusAwarePatch(
  patch: CompilerPatch,
  registry: BlockRegistry,
  seed: Seed,
  ctx: CompileCtx
): CompileResult {
  const errors: CompileError[] = [];
  const buses = patch.buses ?? [];
  const publishers = patch.publishers ?? [];
  const listeners = patch.listeners ?? [];

  // =============================================================================
  // 0. Empty patch check
  // =============================================================================
  if (patch.blocks.size === 0 && buses.length === 0) {
    return {
      ok: false,
      errors: [{ code: 'EmptyPatch', message: 'Patch is empty - add some blocks to compile.' }],
    };
  }

  // =============================================================================
  // 1. Validate: Only Signal buses, no Field buses yet
  // =============================================================================
  for (const bus of buses) {
    if (isFieldBus(bus)) {
      errors.push({
        code: 'FieldBusNotSupported',
        message: `Field buses not yet supported. Use Signal buses. Bus "${bus.name}" has type ${bus.type.world}:${bus.type.domain}.`,
        where: { busId: bus.id },
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  // =============================================================================
  // 2. Validate combine modes
  // =============================================================================
  for (const bus of buses) {
    if (bus.combineMode !== 'last' && bus.combineMode !== 'sum') {
      errors.push({
        code: 'UnsupportedCombineMode',
        message: `Combine mode "${bus.combineMode}" not yet supported. Phase 2 supports: last, sum.`,
        where: { busId: bus.id },
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  // =============================================================================
  // 3. Validate block types exist in registry
  // =============================================================================
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

  // =============================================================================
  // 4. Build wire connection indices
  // =============================================================================
  const incoming = indexIncoming(patch.connections);

  // Check for multiple writers (wires only - buses allow multiple publishers)
  for (const [toKey, conns] of incoming.entries()) {
    if (conns.length > 1) {
      errors.push({
        code: 'MultipleWriters',
        message: `Input port has multiple incoming wire connections: ${toKey}`,
        where: { connection: conns[0] },
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  // =============================================================================
  // 5. Topological sort blocks (wire dependencies only)
  // =============================================================================
  const order = topoSortBlocks(patch, errors);
  if (errors.length) return { ok: false, errors };

  // =============================================================================
  // 6. Compile blocks in topo order
  // =============================================================================
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

    // Resolve inputs (from wires AND buses)
    const inputs: Record<string, Artifact> = {};

    for (const p of compiler.inputs) {
      // First check for wire connection
      const wireConn = incoming.get(keyOf(blockId, p.name))?.[0];

      if (wireConn) {
        // Wire takes precedence over bus
        const srcKey = keyOf(wireConn.from.blockId, wireConn.from.port);
        const src = compiledPortMap.get(srcKey);
        inputs[p.name] = src ?? {
          kind: 'Error',
          message: `Missing upstream artifact for ${srcKey}`,
          where: { blockId: wireConn.from.blockId, port: wireConn.from.port },
        };
      } else {
        // Check for bus listener
        const busListener = listeners.find(
          l => l.enabled && l.to.blockId === blockId && l.to.port === p.name
        );

        if (busListener) {
          // Input comes from a bus - get the bus value
          const busArtifact = getBusValue(busListener.busId, buses, publishers, compiledPortMap, errors);
          inputs[p.name] = busArtifact;
        } else if (p.required) {
          // No connection at all for required input
          inputs[p.name] = {
            kind: 'Error',
            message: `Missing required input ${blockId}.${p.name}`,
            where: { blockId, port: p.name },
          };
        } else {
          // Optional input with no connection
          inputs[p.name] = {
            kind: 'Error',
            message: `Unwired optional input ${blockId}.${p.name}`,
            where: { blockId, port: p.name },
          };
        }
      }
    }

    // Check for required input errors
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

    // Compile the block
    const outs = compiler.compile({ id: blockId, params: block.params, inputs, ctx });

    // Validate and store outputs
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
      compiledPortMap.set(keyOf(blockId, outDef.name), produced);
    }

    if (errors.length) return { ok: false, errors };
  }

  // =============================================================================
  // 7. Resolve final output port
  // =============================================================================
  const outputRef = patch.output ?? inferOutputPort(patch, registry, compiledPortMap);
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

  if (outArt.kind !== 'RenderTreeProgram') {
    errors.push({
      code: 'OutputWrongType',
      message: `Patch output must be RenderTreeProgram, got ${outArt.kind}`,
      where: { blockId: outputRef.blockId, port: outputRef.port },
    });
    return { ok: false, errors };
  }

  return { ok: true, program: outArt.value, errors: [], compiledPortMap };
}

// =============================================================================
// Bus Value Resolution
// =============================================================================

/**
 * Get the compiled value of a bus by combining all its publishers.
 */
function getBusValue(
  busId: string,
  buses: Bus[],
  publishers: Publisher[],
  compiledPortMap: Map<string, Artifact>,
  errors: CompileError[]
): Artifact {
  const bus = buses.find(b => b.id === busId);
  if (!bus) {
    return {
      kind: 'Error',
      message: `Bus ${busId} not found`,
      where: { busId },
    };
  }

  // Get enabled publishers for this bus
  const busPublishers = publishers.filter(p => p.busId === busId && p.enabled);

  // Sort by (sortKey, id) for deterministic ordering
  const sortedPublishers = sortPublishers(busPublishers);

  // Collect artifacts from publishers
  const artifacts: Artifact[] = [];
  for (const pub of sortedPublishers) {
    const key = keyOf(pub.from.blockId, pub.from.port);
    const artifact = compiledPortMap.get(key);

    if (!artifact) {
      errors.push({
        code: 'BusEvaluationError',
        message: `Publisher ${pub.id} references missing artifact ${key}`,
        where: { busId, blockId: pub.from.blockId, port: pub.from.port },
      });
      continue;
    }

    if (artifact.kind === 'Error') {
      errors.push({
        code: 'BusEvaluationError',
        message: `Publisher ${pub.id} has error artifact: ${artifact.message}`,
        where: { busId, blockId: pub.from.blockId, port: pub.from.port },
      });
      continue;
    }

    artifacts.push(artifact);
  }

  // Combine artifacts using bus's combine mode
  return combineSignalArtifacts(artifacts, bus.combineMode, bus.defaultValue);
}

// =============================================================================
// Helpers
// =============================================================================

function keyOf(blockId: string, port: string): string {
  return `${blockId}:${port}`;
}

function indexIncoming(
  conns: readonly any[]
): Map<string, any[]> {
  const m = new Map<string, any[]>();
  for (const c of conns) {
    const k = keyOf(c.to.blockId, c.to.port);
    const arr = m.get(k) ?? [];
    arr.push(c);
    m.set(k, arr);
  }
  return m;
}

function inferOutputPort(
  patch: CompilerPatch,
  registry: BlockRegistry,
  compiled: Map<string, Artifact>
): PortRef | null {
  const produced: PortRef[] = [];

  // Map of all ports that feed something
  const fed = new Set<string>();
  for (const c of patch.connections) fed.add(keyOf(c.from.blockId, c.from.port));

  for (const [blockId, block] of patch.blocks.entries()) {
    const comp = registry[block.type];
    if (!comp) continue;
    for (const out of comp.outputs) {
      if (out.type.kind !== 'RenderTreeProgram') continue;
      const k = keyOf(blockId, out.name);
      if (!compiled.has(k)) continue;
      if (fed.has(k)) continue;
      produced.push({ blockId, port: out.name });
    }
  }

  if (produced.length === 1) return produced[0]!;
  return null;
}
