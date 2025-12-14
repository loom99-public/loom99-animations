/**
 * Inspector Component
 *
 * Property editor for selected block (right panel).
 * Also shows block definition preview when clicking unplaced blocks.
 */

import { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import type { EditorStore } from './store';
import type { PortRef, Block, Slot, BlockForm } from './types';
import { getBlockDefinition, getBlockTags, BLOCK_DEFINITIONS, type BlockDefinition, type BlockTags } from './blocks';
import { findCompatiblePorts, getConnectionsForPort, areTypesCompatible } from './portUtils';
import './Inspector.css';

interface InspectorProps {
  store: EditorStore;
}

function formatFormLabel(form: BlockForm): string {
  if (form === 'legacy-composite') return 'Legacy Composite';
  return form.charAt(0).toUpperCase() + form.slice(1);
}

function formatTagKey(key: string): string {
  if (key === 'legacyCategory') return 'Legacy';
  if (key === 'laneKind') return 'Lane';
  if (key === 'laneFlavor') return 'Flavor';
  if (key === 'subcategory') return 'Subcategory';
  if (key === 'form') return 'Form';
  return key.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase());
}

function TagPills({ tags, hideKeys = [] }: { tags: BlockTags; hideKeys?: string[] }) {
  const entries = Object.entries(tags).filter(([key]) => !hideKeys.includes(key));
  if (entries.length === 0) return null;

  return (
    <div className="tag-list">
      {entries.map(([key, value]) => (
        <span key={key} className="tag-pill">
          <span className="tag-key">{formatTagKey(key)}</span>
          {value !== true && (
            <span className="tag-value">
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/**
 * Port wiring panel - shows when a port is selected.
 * Lists compatible ports and allows creating connections.
 */
function PortWiringPanel({
  store,
  portRef,
  block,
  slot,
}: {
  store: EditorStore;
  portRef: PortRef;
  block: Block;
  slot: Slot;
}) {
  const [hoveredTarget, setHoveredTarget] = useState<PortRef | null>(null);

  // Find compatible ports on placed blocks
  const compatible = findCompatiblePorts(
    portRef,
    slot,
    store.blocks,
    store.connections
  );

  // Find compatible library blocks (not yet placed)
  const compatibleLibraryBlocks = useMemo(() => {
    const results: Array<{ definition: BlockDefinition; slot: Slot }> = [];
    const lookingForDirection = portRef.direction === 'output' ? 'input' : 'output';

    for (const def of BLOCK_DEFINITIONS) {
      const slotsToCheck = lookingForDirection === 'input' ? def.inputs : def.outputs;
      for (const targetSlot of slotsToCheck) {
        const isCompatible =
          portRef.direction === 'output'
            ? areTypesCompatible(slot.type, targetSlot.type)
            : areTypesCompatible(targetSlot.type, slot.type);
        if (isCompatible) {
          results.push({ definition: def, slot: targetSlot });
          break; // Only show each block once (first compatible slot)
        }
      }
    }
    return results;
  }, [portRef.direction, slot.type]);

  // Get existing connections for this port
  const existingConnections = getConnectionsForPort(
    portRef.blockId,
    portRef.slotId,
    portRef.direction,
    store.connections
  );

  const handleConnect = (target: { block: Block; slot: Slot; portRef: PortRef }) => {
    if (portRef.direction === 'output') {
      // This port is output, target is input
      store.connect(portRef.blockId, portRef.slotId, target.portRef.blockId, target.portRef.slotId);
    } else {
      // This port is input, target is output
      store.connect(target.portRef.blockId, target.portRef.slotId, portRef.blockId, portRef.slotId);
    }
    // Clear selection after connecting
    store.setSelectedPort(null);
  };

  /**
   * Add a library block to its suggested lane and connect to the selected port.
   */
  const handleAddAndConnect = (def: BlockDefinition, targetSlot: Slot) => {
    // Find the suggested lane
    const targetLane = store.lanes.find((lane) => lane.kind === def.laneKind);
    if (!targetLane) return;

    // Add the block
    const newBlockId = store.addBlock(def.type, targetLane.id, def.defaultParams);

    // Connect the ports
    if (portRef.direction === 'output') {
      // Selected port is output, new block's slot is input
      store.connect(portRef.blockId, portRef.slotId, newBlockId, targetSlot.id);
    } else {
      // Selected port is input, new block's slot is output
      store.connect(newBlockId, targetSlot.id, portRef.blockId, portRef.slotId);
    }

    // Clear selection
    store.setSelectedPort(null);
  };

  const handleDisconnect = (connectionId: string) => {
    store.disconnect(connectionId);
  };

  // Hover highlighting - set hovered port in store
  const handleTargetHover = (target: PortRef | null) => {
    setHoveredTarget(target);
    store.setHoveredPort(target);
  };

  const definition = getBlockDefinition(block.type);
  const blockColor = definition?.color ?? '#666';

  return (
    <div className="port-wiring-panel">
      <div className="wiring-panel-header" style={{ borderLeftColor: blockColor }}>
        <div className="wiring-panel-title">
          <span className="wiring-port-direction">
            {portRef.direction === 'input' ? '← Input' : 'Output →'}
          </span>
          <h3>{slot.label}</h3>
        </div>
      </div>

      <div className="wiring-panel-body">
        <div className="wiring-section">
          <div className="wiring-info">
            <div className="wiring-info-row">
              <span className="wiring-info-label">Block:</span>
              <span className="wiring-info-value">{block.label}</span>
            </div>
            <div className="wiring-info-row">
              <span className="wiring-info-label">Type:</span>
              <code className="wiring-info-value">{slot.type}</code>
            </div>
          </div>
        </div>

        {/* Existing connections */}
        {existingConnections.length > 0 && (
          <div className="wiring-section">
            <h4>Connected to</h4>
            <ul className="wiring-connection-list">
              {existingConnections.map((conn) => {
                const otherBlockId = portRef.direction === 'output' ? conn.to.blockId : conn.from.blockId;
                const otherSlotId = portRef.direction === 'output' ? conn.to.slotId : conn.from.slotId;
                const otherBlock = store.blocks.find((b) => b.id === otherBlockId);
                const otherSlots = portRef.direction === 'output' ? otherBlock?.inputs : otherBlock?.outputs;
                const otherSlot = otherSlots?.find((s) => s.id === otherSlotId);

                return (
                  <li key={conn.id} className="wiring-connection-item">
                    <span className="wiring-target-block">{otherBlock?.label ?? 'Unknown'}</span>
                    <span className="wiring-target-slot">{otherSlot?.label ?? otherSlotId}</span>
                    <button
                      className="wiring-disconnect-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisconnect(conn.id);
                      }}
                      title="Disconnect"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Compatible targets (placed blocks) */}
        <div className="wiring-section">
          <h4>
            {portRef.direction === 'output' ? 'Available inputs' : 'Available outputs'}
            <span className="wiring-count">{compatible.length}</span>
          </h4>
          {compatible.length === 0 ? (
            <p className="wiring-empty">No compatible ports found</p>
          ) : (
            <ul className="wiring-target-list">
              {compatible.map((target) => (
                <li
                  key={`${target.block.id}:${target.slot.id}`}
                  className={`wiring-target-item ${
                    hoveredTarget?.blockId === target.block.id &&
                    hoveredTarget?.slotId === target.slot.id
                      ? 'hovered'
                      : ''
                  }`}
                  onMouseEnter={() => handleTargetHover(target.portRef)}
                  onMouseLeave={() => handleTargetHover(null)}
                  onClick={() => handleConnect(target)}
                >
                  <span className="wiring-target-block">{target.block.label}</span>
                  <span className="wiring-target-slot">{target.slot.label}</span>
                  <code className="wiring-target-type">{target.slot.type}</code>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add new block (library blocks with compatible ports) */}
        {compatibleLibraryBlocks.length > 0 && (
          <div className="wiring-section">
            <h4>
              Add new block
              <span className="wiring-count">{compatibleLibraryBlocks.length}</span>
            </h4>
            <ul className="wiring-library-list">
              {compatibleLibraryBlocks.map(({ definition: def, slot: targetSlot }) => (
                <li
                  key={`${def.type}:${targetSlot.id}`}
                  className="wiring-library-item"
                  onDoubleClick={() => handleAddAndConnect(def, targetSlot)}
                  title="Double-click to add and connect"
                >
                  <div
                    className="wiring-library-color"
                    style={{ backgroundColor: def.color }}
                  />
                  <span className="wiring-library-block">{def.label}</span>
                  <span className="wiring-library-slot">{targetSlot.label}</span>
                  <code className="wiring-library-type">{targetSlot.type}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Preview display for a block definition (not yet placed).
 */
function DefinitionPreview({ definition }: { definition: BlockDefinition }) {
  const tags = getBlockTags(definition);

  return (
    <div className="inspector">
      <div className="inspector-header inspector-header-preview" style={{ borderLeftColor: definition.color }}>
        <h2>{definition.label}</h2>
        <div className="block-meta">
          <span className="block-preview-badge">Preview</span>
          <span className="block-tier-badge">{formatFormLabel(definition.form)}</span>
          <span className="block-subcategory-badge">{definition.subcategory}</span>
          {tags.legacyCategory && (
            <span className="block-legacy-badge">{String(tags.legacyCategory)}</span>
          )}
          <span
            className="block-category"
            style={{ backgroundColor: definition.color }}
          >
            {definition.category}
          </span>
        </div>
      </div>

      <div className="inspector-body">
        <div className="inspector-section">
          <h3>Description</h3>
          <p className="block-description">{definition.description}</p>
        </div>

        <div className="inspector-section">
          <h3>Type</h3>
          <code className="block-type-code">{definition.type}</code>
        </div>

        <div className="inspector-section">
          <h3>Tags</h3>
          <TagPills tags={tags} hideKeys={['form', 'subcategory']} />
        </div>

        {definition.inputs.length > 0 && (
          <div className="inspector-section">
            <h3>Inputs</h3>
            <ul className="slot-list">
              {definition.inputs.map((slot) => (
                <li key={slot.id}>
                  <span className="slot-label">{slot.label}</span>
                  <code className="slot-type">{slot.type}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        {definition.outputs.length > 0 && (
          <div className="inspector-section">
            <h3>Outputs</h3>
            <ul className="slot-list">
              {definition.outputs.map((slot) => (
                <li key={slot.id}>
                  <span className="slot-label">{slot.label}</span>
                  <code className="slot-type">{slot.type}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        {definition.paramSchema.length > 0 && (
          <div className="inspector-section">
            <h3>Parameters</h3>
            <ul className="param-schema-list">
              {definition.paramSchema.map((param) => (
                <li key={param.key}>
                  <span className="param-schema-key">{param.label}</span>
                  <span className="param-schema-type">{param.type}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="inspector-section">
          <p className="inspector-hint">Drag this block to the patch bay to use it</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Inspector displays and edits parameters of selected block.
 * Also shows port wiring panel when a port is selected.
 */
export const Inspector = observer(({ store }: InspectorProps) => {
  const block = store.selectedBlock;
  const previewedDefinition = store.previewedDefinition;
  const selectedPortInfo = store.selectedPortInfo;

  // Show port wiring panel if a port is selected
  if (selectedPortInfo) {
    return (
      <PortWiringPanel
        store={store}
        portRef={store.uiState.selectedPort!}
        block={selectedPortInfo.block}
        slot={selectedPortInfo.slot}
      />
    );
  }

  // Show previewed definition if no block is selected
  if (!block && previewedDefinition) {
    return <DefinitionPreview definition={previewedDefinition} />;
  }

  if (!block) {
    return (
      <div className="inspector">
        <div className="inspector-empty">
          <p>No block selected</p>
          <p className="inspector-hint">Click a block to see its details, or click a port to wire it</p>
        </div>
      </div>
    );
  }

  const definition = getBlockDefinition(block.type);
  const blockColor = definition?.color ?? '#666';
  const tags = definition ? getBlockTags(definition) : null;

  return (
    <div className="inspector">
      <div className="inspector-header" style={{ borderLeftColor: blockColor }}>
        <h2>{block.label}</h2>
        <div className="block-meta">
          <span className="block-id">{block.id}</span>
          {definition && (
            <>
              <span className="block-tier-badge">{formatFormLabel(definition.form)}</span>
              <span className="block-subcategory-badge">{definition.subcategory}</span>
            </>
          )}
          {tags?.legacyCategory && (
            <span className="block-legacy-badge">{String(tags.legacyCategory)}</span>
          )}
          <span
            className="block-category"
            style={{ backgroundColor: blockColor }}
          >
            {block.category}
          </span>
        </div>
      </div>

      <div className="inspector-body">
        {/* Block type and description */}
        <div className="inspector-section">
          <h3>Type</h3>
          <code className="block-type-code">{block.type}</code>
        </div>

        {tags && (
          <div className="inspector-section">
            <h3>Tags</h3>
            <TagPills tags={tags} hideKeys={['form', 'subcategory']} />
          </div>
        )}

        {block.description && (
          <div className="inspector-section">
            <h3>Description</h3>
            <p className="block-description">{block.description}</p>
          </div>
        )}

        {/* Parameters */}
        <div className="inspector-section">
          <h3>Parameters</h3>
          {Object.keys(block.params).length === 0 ? (
            <p className="inspector-hint">No parameters</p>
          ) : (
            <div className="param-list">
              {Object.entries(block.params).map(([key, value]) => {
                // Look up paramSchema for this key to determine input type
                const schema = definition?.paramSchema.find(s => s.key === key);
                const label = schema?.label ?? key;

                return (
                  <div key={key} className="param-item">
                    <label className="param-label">{label}</label>
                    <div className="param-value">
                      {schema?.type === 'select' && schema.options ? (
                        <select
                          value={String(value)}
                          onChange={(e) =>
                            store.updateBlockParams(block.id, {
                              [key]: e.target.value,
                            })
                          }
                        >
                          {schema.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : typeof value === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) =>
                            store.updateBlockParams(block.id, {
                              [key]: e.target.checked,
                            })
                          }
                        />
                      ) : typeof value === 'number' ? (
                        <input
                          type="number"
                          value={value}
                          step={schema?.step ?? (value < 1 ? 0.1 : 1)}
                          min={schema?.min}
                          max={schema?.max}
                          onChange={(e) =>
                            store.updateBlockParams(block.id, {
                              [key]: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(value)}
                          onChange={(e) =>
                            store.updateBlockParams(block.id, {
                              [key]: e.target.value,
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Slots info */}
        {block.inputs.length > 0 && (
          <div className="inspector-section">
            <h3>Inputs</h3>
            <ul className="slot-list">
              {block.inputs.map((slot) => (
                <li key={slot.id}>
                  <span className="slot-label">{slot.label}</span>
                  <code className="slot-type">{slot.type}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        {block.outputs.length > 0 && (
          <div className="inspector-section">
            <h3>Outputs</h3>
            <ul className="slot-list">
              {block.outputs.map((slot) => (
                <li key={slot.id}>
                  <span className="slot-label">{slot.label}</span>
                  <code className="slot-type">{slot.type}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Delete button */}
        <div className="inspector-section inspector-actions">
          <button
            className="delete-button"
            onClick={() => store.removeBlock(block.id)}
          >
            Delete Block
          </button>
        </div>
      </div>
    </div>
  );
});
