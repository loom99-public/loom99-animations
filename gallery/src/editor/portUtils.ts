/**
 * Port Utilities
 *
 * Type compatibility checking and connection color assignment.
 */

import type { SlotType, Connection, Block, Slot, PortRef } from './types';

// =============================================================================
// Type Compatibility
// =============================================================================

/**
 * Check if two slot types are compatible for connection.
 * An output can connect to an input if the types match.
 *
 * Rules:
 * - Exact match always works
 * - Generic types (Field<T>, Signal<T>) match their specific versions
 */
export function areTypesCompatible(outputType: SlotType, inputType: SlotType): boolean {
  // Exact match
  if (outputType === inputType) return true;

  // Field compatibility: Field<Point> can connect to Field<*> inputs
  // For now, be lenient with Field types
  if (outputType.startsWith('Field<') && inputType.startsWith('Field<')) {
    return true; // TODO: tighten this with proper generics
  }

  // Signal compatibility
  if (outputType.startsWith('Signal<') && inputType.startsWith('Signal<')) {
    return true;
  }

  // Scalar compatibility
  if (outputType.startsWith('Scalar:') && inputType.startsWith('Scalar:')) {
    return true;
  }

  return false;
}

/**
 * Find all compatible ports for a given port.
 * @param port The source port
 * @param blocks All blocks in the patch
 * @param connections Existing connections
 * @returns List of compatible ports (on other blocks)
 */
export function findCompatiblePorts(
  port: PortRef,
  sourceSlot: Slot,
  blocks: Block[],
  connections: Connection[]
): Array<{ block: Block; slot: Slot; portRef: PortRef }> {
  const compatible: Array<{ block: Block; slot: Slot; portRef: PortRef }> = [];

  // Determine what we're looking for
  const lookingForDirection = port.direction === 'output' ? 'input' : 'output';

  for (const block of blocks) {
    // Skip same block
    if (block.id === port.blockId) continue;

    const slotsToCheck = lookingForDirection === 'input' ? block.inputs : block.outputs;

    for (const slot of slotsToCheck) {
      // Check type compatibility
      const isCompatible =
        port.direction === 'output'
          ? areTypesCompatible(sourceSlot.type, slot.type)
          : areTypesCompatible(slot.type, sourceSlot.type);

      if (!isCompatible) continue;

      // Check if already connected (inputs can only have one connection)
      if (lookingForDirection === 'input') {
        const existingConnection = connections.find(
          (c) => c.to.blockId === block.id && c.to.slotId === slot.id
        );
        if (existingConnection) continue; // Input already has a connection
      }

      // Check for cycles (would need graph traversal - simplified for now)
      // TODO: Implement proper cycle detection

      compatible.push({
        block,
        slot,
        portRef: {
          blockId: block.id,
          slotId: slot.id,
          direction: lookingForDirection,
        },
      });
    }
  }

  return compatible;
}

// =============================================================================
// Connection Colors
// =============================================================================

/**
 * Color palette for connection visualization.
 * Each unique connection gets a color to help users track wires visually.
 */
const CONNECTION_COLORS = [
  '#4ade80', // green
  '#60a5fa', // blue
  '#f472b6', // pink
  '#facc15', // yellow
  '#a78bfa', // purple
  '#fb923c', // orange
  '#2dd4bf', // teal
  '#e879f9', // fuchsia
  '#a3e635', // lime
  '#38bdf8', // sky
];

/**
 * Assign a color to a connection based on its index.
 * Colors cycle through the palette.
 */
export function getConnectionColor(connectionIndex: number): string {
  return CONNECTION_COLORS[connectionIndex % CONNECTION_COLORS.length]!;
}

/**
 * Build a map of port -> color for visual indication.
 * Connected ports share the same color.
 */
export function buildPortColorMap(
  connections: Connection[]
): Map<string, string> {
  const colorMap = new Map<string, string>();

  connections.forEach((conn, index) => {
    const color = getConnectionColor(index);
    const fromKey = `${conn.from.blockId}:${conn.from.slotId}`;
    const toKey = `${conn.to.blockId}:${conn.to.slotId}`;

    // Outputs can have multiple connections, so take the first color assigned
    if (!colorMap.has(fromKey)) {
      colorMap.set(fromKey, color);
    }
    // Inputs should only have one connection
    colorMap.set(toKey, color);
  });

  return colorMap;
}

/**
 * Get the color for a specific port.
 */
export function getPortColor(
  blockId: string,
  slotId: string,
  colorMap: Map<string, string>
): string | null {
  return colorMap.get(`${blockId}:${slotId}`) ?? null;
}

/**
 * Check if a port has any connections.
 */
export function isPortConnected(
  blockId: string,
  slotId: string,
  direction: 'input' | 'output',
  connections: Connection[]
): boolean {
  if (direction === 'output') {
    return connections.some(
      (c) => c.from.blockId === blockId && c.from.slotId === slotId
    );
  } else {
    return connections.some(
      (c) => c.to.blockId === blockId && c.to.slotId === slotId
    );
  }
}

/**
 * Get all connections for a specific port.
 */
export function getConnectionsForPort(
  blockId: string,
  slotId: string,
  direction: 'input' | 'output',
  connections: Connection[]
): Connection[] {
  if (direction === 'output') {
    return connections.filter(
      (c) => c.from.blockId === blockId && c.from.slotId === slotId
    );
  } else {
    return connections.filter(
      (c) => c.to.blockId === blockId && c.to.slotId === slotId
    );
  }
}
