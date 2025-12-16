/**
 * PatchBay Component
 *
 * Visual representation of the lane-based patch bay.
 * Displays lanes with blocks and connections.
 * Lanes are drop targets for blocks from the library.
 *
 * Per lanes-overview.md:
 * - Lanes represent value domains (not timeline tracks)
 * - Chain lanes: left-to-right pipeline
 * - Patchbay lanes: fan-out sources
 */

import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { EditorStore } from './store';
import type { Lane, LaneKind, Block, Slot, PortRef, Listener } from './types';
import { getBlockDefinition } from './blocks';
import { LayoutSelector } from './LayoutSelector';
import {
  buildPortColorMap,
  getPortColor,
  isPortConnected,
  areTypesCompatible,
  describeSlotType,
  formatTypeDescriptor,
} from './portUtils';
import { BusPicker } from './BusPicker';
import { PublishMenu } from './PublishMenu';
import './PatchBay.css';

interface PatchBayProps {
  store: EditorStore;
}

/**
 * Lane colors by kind for visual identification.
 */
const LANE_KIND_COLORS: Record<LaneKind, string> = {
  Scene: '#4a9eff',     // Blue - what exists
  Phase: '#22c55e',     // Green - timing
  Fields: '#a855f7',    // Purple - per-element
  Scalars: '#f59e0b',   // Amber - constants
  Spec: '#ec4899',      // Pink - intent
  Program: '#ef4444',   // Red - behavior
  Output: '#6366f1',    // Indigo - export
};

/**
 * Port component - renders an input or output connection point.
 */
function Port({
  slot,
  blockId,
  direction,
  connectionColor,
  isConnected,
  isHovered,
  isSelected,
  isCompatible,
  onHover,
  onClick,
  onContextMenu,
  onBindingSlotClick,
  busSubscription,
  onSendAffordanceClick,
  busPublications,
}: {
  slot: Slot;
  blockId: string;
  direction: 'input' | 'output';
  connectionColor: string | null;
  isConnected: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isCompatible: boolean;
  onHover: (port: PortRef | null) => void;
  onClick: (port: PortRef) => void;
  onContextMenu: (e: React.MouseEvent, port: PortRef) => void;
  onBindingSlotClick?: (e: React.MouseEvent, port: PortRef) => void;
  busSubscription?: { busName: string; listenerId: string } | null;
  onSendAffordanceClick?: (e: React.MouseEvent, port: PortRef) => void;
  busPublications?: Array<{ publisherId: string; busId: string; busName: string }>;
}) {
  const portRef: PortRef = { blockId, slotId: slot.id, direction };
  const typeDescriptor = describeSlotType(slot.type);
  const worldGlyph: Record<string, string | null> = {
    signal: 'S',
    field: 'F',
    scalar: 'C',
    event: 'E',
    scene: 'SC',
    program: 'P',
    render: 'R',
    filter: 'FX',
    stroke: 'ST',
    unknown: null,
  };
  const worldBadge = worldGlyph[typeDescriptor.world] ?? null;
  const domainBadge = typeDescriptor.domain;

  const handleMouseEnter = () => onHover(portRef);
  const handleMouseLeave = () => onHover(null);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(portRef);
  };
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, portRef);
  };

  const handleBindingSlotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBindingSlotClick?.(e, portRef);
  };

  const handleSendAffordanceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSendAffordanceClick?.(e, portRef);
  };

  const handlePublicationBadgeClick = (e: React.MouseEvent, busId: string) => {
    e.stopPropagation();
    // Select the bus in Bus Board (handled by store)
    const store = (window as any).__editorStore__;
    if (store) {
      store.selectBus(busId);
    }
  };

  // Determine port styling
  let portStyle: React.CSSProperties = {};
  if (connectionColor) {
    portStyle.backgroundColor = connectionColor;
    portStyle.borderColor = connectionColor;
  }
  if (isCompatible && !isConnected) {
    portStyle.boxShadow = '0 0 8px 2px rgba(74, 222, 128, 0.6)';
  }

  const className = [
    'port',
    direction,
    isConnected ? 'connected' : '',
    isHovered ? 'hovered' : '',
    isSelected ? 'selected' : '',
    isCompatible ? 'compatible' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="port-container">
      {/* Bus binding slot for input ports */}
      {direction === 'input' && (
        <div
          className={`bus-binding-slot ${busSubscription ? 'subscribed' : ''}`}
          onClick={handleBindingSlotClick}
          title={busSubscription ? `Subscribed to: ${busSubscription.busName}` : 'Click to bind to bus'}
        >
          <span className="bus-binding-dot">●</span>
        </div>
      )}

      {/* Port */}
      <div
        className={className}
        style={portStyle}
        title={`${slot.label} (${slot.type}) · ${formatTypeDescriptor(typeDescriptor)}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <span className="port-badges">
          {worldBadge && <span className={`port-badge world ${typeDescriptor.world}`}>{worldBadge}</span>}
          {domainBadge && <span className="port-badge domain">{domainBadge}</span>}
        </span>
        <span className="port-label">{slot.label}</span>
      </div>

      {/* Bus subscription badge (input ports) */}
      {direction === 'input' && busSubscription && (
        <div className="bus-subscription-badge" title={`Subscribed to: ${busSubscription.busName} [identity]`}>
          <span className="bus-subscription-arrow">←</span>
          <span className="bus-subscription-name">{busSubscription.busName}</span>
          <span className="bus-subscription-transform">[identity]</span>
        </div>
      )}

      {/* Bus-send affordance (output ports) */}
      {direction === 'output' && (
        <div
          className={`bus-send-affordance ${busPublications && busPublications.length > 0 ? 'publishing' : ''}`}
          onClick={handleSendAffordanceClick}
          title={busPublications && busPublications.length > 0 ? 'Publishing to bus(es)' : 'Click to publish to bus'}
        >
          <span className="bus-send-dot">+</span>
        </div>
      )}

      {/* Bus publication badges (output ports) */}
      {direction === 'output' && busPublications && busPublications.length > 0 && (
        <div className="bus-publication-badges">
          {busPublications.map((pub) => (
            <div
              key={pub.publisherId}
              className="bus-publication-badge"
              onClick={(e) => handlePublicationBadgeClick(e, pub.busId)}
              title={`Publishing to: ${pub.busName}`}
            >
              <span className="bus-publication-arrow">→</span>
              <span className="bus-publication-name">{pub.busName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Draggable block in a lane.
 * Can be reordered within lane, moved to another lane, or dragged to trash.
 * Shows input/output ports for wiring.
 */
function DraggablePatchBlock({
  block,
  laneId,
  index,
  laneColor,
  isSelected,
  onSelect,
  store,
  portColorMap,
  onInputBindingSlotClick,
  getInputBusSubscription,
  onOutputSendAffordanceClick,
  getOutputBusPublications,
}: {
  block: Block;
  laneId: string;
  index: number;
  laneColor: string;
  isSelected: boolean;
  onSelect: () => void;
  store: EditorStore;
  portColorMap: Map<string, string>;
  onInputBindingSlotClick: (e: React.MouseEvent, port: PortRef) => void;
  getInputBusSubscription: (blockId: string, slotId: string) => { busName: string; listenerId: string } | null;
  onOutputSendAffordanceClick: (e: React.MouseEvent, port: PortRef) => void;
  getOutputBusPublications: (blockId: string, slotId: string) => Array<{ publisherId: string; busId: string; busName: string }>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `patch-block-${block.id}`,
    data: {
      type: 'patch-block',
      blockId: block.id,
      sourceLaneId: laneId,
      sourceIndex: index,
    },
  });

  const { setNodeRef: setDropRef, isOver: isOverDropTarget } = useDroppable({
    id: `patch-target-${block.id}`,
    data: {
      type: 'patch-target',
      blockId: block.id,
      laneId,
      index,
    },
  });

  const setRefs = (node: HTMLElement | null) => {
    setNodeRef(node);
    setDropRef(node);
  };

  const definition = getBlockDefinition(block.type);
  const blockColor = definition?.color ?? laneColor;

  // Get hovered/selected port state
  const hoveredPort = store.uiState.hoveredPort;
  const selectedPort = store.uiState.selectedPort;
  const connections = store.connections;

  // Check if we need to highlight compatible ports
  const sourcePort = hoveredPort ?? selectedPort;
  const sourceSlot = sourcePort
    ? (() => {
        const sourceBlock = store.blocks.find((b) => b.id === sourcePort.blockId);
        if (!sourceBlock) return null;
        const slots =
          sourcePort.direction === 'input' ? sourceBlock.inputs : sourceBlock.outputs;
        return slots.find((s) => s.id === sourcePort.slotId) ?? null;
      })()
    : null;

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : undefined,
      }
    : undefined;

  const hasInputs = block.inputs.length > 0;
  const hasOutputs = block.outputs.length > 0;

  return (
    <div
      ref={setRefs}
      style={{
        ...style,
        '--block-color': blockColor,
      } as React.CSSProperties}
      className={`block ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isOverDropTarget ? 'drop-target' : ''} ${hasInputs ? 'has-inputs' : ''} ${hasOutputs ? 'has-outputs' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Input ports (left side) */}
      {hasInputs && (
        <div className="block-ports inputs">
          {block.inputs.map((slot) => {
            const portConnColor = getPortColor(block.id, slot.id, portColorMap);
            const connected = isPortConnected(block.id, slot.id, 'input', connections);
            const isThisHovered =
              hoveredPort?.blockId === block.id &&
              hoveredPort?.slotId === slot.id &&
              hoveredPort?.direction === 'input';
            const isThisSelected =
              selectedPort?.blockId === block.id &&
              selectedPort?.slotId === slot.id &&
              selectedPort?.direction === 'input';

            // Check if compatible with source port (and source is on different block)
            let compatible = false;
            if (sourcePort && sourceSlot && sourcePort.blockId !== block.id) {
              // Source is output, we're checking this input
              if (sourcePort.direction === 'output') {
                compatible = areTypesCompatible(sourceSlot.type, slot.type);
              }
            }

            const busSubscription = getInputBusSubscription(block.id, slot.id);

            return (
              <Port
                key={slot.id}
                slot={slot}
                blockId={block.id}
                direction="input"
                connectionColor={portConnColor}
                isConnected={connected}
                isHovered={isThisHovered}
                isSelected={isThisSelected}
                isCompatible={compatible}
                onHover={(p) => store.setHoveredPort(p)}
                onClick={(p) => store.setSelectedPort(p)}
                onContextMenu={(e, p) => store.openContextMenu(e.clientX, e.clientY, p)}
                onBindingSlotClick={onInputBindingSlotClick}
                busSubscription={busSubscription}
              />
            );
          })}
        </div>
      )}

      {/* Drag handle */}
      <div
        className="block-drag-handle"
        style={{ backgroundColor: blockColor }}
        {...listeners}
        {...attributes}
      >
        <span className="block-grip">⋮⋮</span>
      </div>

      <div className="block-content">
        <div className="block-label">{block.label}</div>
        <div className="block-type">{block.type}</div>
      </div>

      {/* Output ports (right side) */}
      {hasOutputs && (
        <div className="block-ports outputs">
          {block.outputs.map((slot) => {
            const portConnColor = getPortColor(block.id, slot.id, portColorMap);
            const connected = isPortConnected(block.id, slot.id, 'output', connections);
            const isThisHovered =
              hoveredPort?.blockId === block.id &&
              hoveredPort?.slotId === slot.id &&
              hoveredPort?.direction === 'output';
            const isThisSelected =
              selectedPort?.blockId === block.id &&
              selectedPort?.slotId === slot.id &&
              selectedPort?.direction === 'output';

            // Check if compatible with source port (and source is on different block)
            let compatible = false;
            if (sourcePort && sourceSlot && sourcePort.blockId !== block.id) {
              // Source is input, we're checking this output
              if (sourcePort.direction === 'input') {
                compatible = areTypesCompatible(slot.type, sourceSlot.type);
              }
            }

            const busPublications = getOutputBusPublications(block.id, slot.id);

            return (
              <Port
                key={slot.id}
                slot={slot}
                blockId={block.id}
                direction="output"
                connectionColor={portConnColor}
                isConnected={connected}
                isHovered={isThisHovered}
                isSelected={isThisSelected}
                isCompatible={compatible}
                onHover={(p) => store.setHoveredPort(p)}
                onClick={(p) => store.setSelectedPort(p)}
                onContextMenu={(e, p) => store.openContextMenu(e.clientX, e.clientY, p)}
                onSendAffordanceClick={onOutputSendAffordanceClick}
                busPublications={busPublications}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Get type hint text for a lane (shows what types flow in/out).
 */
function getLaneTypeHint(kind: LaneKind): string {
  const hints: Record<LaneKind, string> = {
    Scene: 'Scene, Targets',
    Phase: 'PhaseMachine, Signal<Unit>',
    Fields: 'Field<T>',
    Scalars: 'Scalar<T>',
    Spec: 'Spec:* → Program',
    Program: 'Program → Program',
    Output: 'Program',
  };
  return hints[kind] || '';
}

/**
 * Droppable lane component.
 * Supports collapse/expand and displays flow style indicator.
 * Click sets active lane for palette filtering.
 */
function DroppableLane({
  store,
  lane,
  isActive,
  isSuggested,
  portColorMap,
  onInputBindingSlotClick,
  getInputBusSubscription,
  onOutputSendAffordanceClick,
  getOutputBusPublications,
}: {
  store: EditorStore;
  lane: Lane;
  isActive: boolean;
  isSuggested: boolean;
  portColorMap: Map<string, string>;
  onInputBindingSlotClick: (e: React.MouseEvent, port: PortRef) => void;
  getInputBusSubscription: (blockId: string, slotId: string) => { busName: string; listenerId: string } | null;
  onOutputSendAffordanceClick: (e: React.MouseEvent, port: PortRef) => void;
  getOutputBusPublications: (blockId: string, slotId: string) => Array<{ publisherId: string; busId: string; busName: string }>;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `lane-${lane.id}`,
    data: {
      type: 'lane',
      laneId: lane.id,
      laneName: lane.id, // Legacy compatibility
    },
  });

  const laneColor = LANE_KIND_COLORS[lane.kind];
  const isCollapsed = lane.collapsed;
  const isPinned = lane.pinned;
  const showTypeHints = store.settings.showTypeHints;
  const typeHint = getLaneTypeHint(lane.kind);

  const handleHeaderClick = (e: React.MouseEvent) => {
    // Set active lane on click (for palette filtering)
    store.setActiveLane(lane.id);

    // Double-click toggles collapse
    if (e.detail === 2) {
      store.toggleLaneCollapsed(lane.id);
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.toggleLaneCollapsed(lane.id);
  };

  return (
    <div
      ref={setNodeRef}
      className={`lane ${isOver ? 'drop-target' : ''} ${isCollapsed ? 'collapsed' : ''} ${lane.flowStyle} ${isActive ? 'active' : ''} ${isSuggested ? 'suggested' : ''}`}
      data-lane={lane.id}
      data-lane-kind={lane.kind}
      data-flow-style={lane.flowStyle}
      style={{
        '--lane-color': laneColor,
      } as React.CSSProperties}
    >
      <div className="lane-header" onClick={handleHeaderClick}>
        <div className="lane-color-bar" style={{ backgroundColor: laneColor }} />
        <div className="lane-info">
          <div className="lane-title-row">
            <span className="lane-chevron" onClick={handleChevronClick}>
              {isCollapsed ? '▸' : '▾'}
            </span>
            <h3 className="lane-label">{lane.label}</h3>
            <span className="lane-kind-badge" style={{ backgroundColor: laneColor }}>
              {lane.kind}
            </span>
            {showTypeHints && typeHint && (
              <span className="lane-type-hint" title={`Expected types: ${typeHint}`}>
                ({typeHint})
              </span>
            )}
            {isPinned && <span className="lane-pinned-badge">📌</span>}
            <span className={`lane-flow-badge ${lane.flowStyle}`}>
              {lane.flowStyle === 'chain' ? '→' : '⤵'}
            </span>
          </div>
          {!isCollapsed && <p className="lane-description">{lane.description}</p>}
        </div>
        <div className="lane-block-count">{lane.blockIds.length}</div>
      </div>

      {!isCollapsed && (
        <div className="lane-content">
          {lane.blockIds.length === 0 && (
            <div className="lane-empty">
              {isOver ? 'Drop here' : 'Drag blocks here'}
            </div>
          )}

          {lane.blockIds.map((blockId, index) => {
            const block = store.blocks.find((b) => b.id === blockId);
            if (!block) return null;

            const isSelected = store.uiState.selectedBlockId === blockId;

            return (
              <DraggablePatchBlock
                key={blockId}
                block={block}
                laneId={lane.id}
                index={index}
                laneColor={laneColor}
                isSelected={isSelected}
                onSelect={() => store.selectBlock(blockId)}
                store={store}
                portColorMap={portColorMap}
                onInputBindingSlotClick={onInputBindingSlotClick}
                getInputBusSubscription={getInputBusSubscription}
                onOutputSendAffordanceClick={onOutputSendAffordanceClick}
                getOutputBusPublications={getOutputBusPublications}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Context menu for port operations (including bus unsubscribe).
 */
function PortContextMenu({
  store,
  isOpen,
  position,
  portRef,
  onClose,
  busSubscription,
}: {
  store: EditorStore;
  isOpen: boolean;
  position: { x: number; y: number };
  portRef: PortRef | null;
  onClose: () => void;
  busSubscription: { busName: string; listenerId: string } | null;
}) {
  if (!isOpen || !portRef) return null;

  const handleUnsubscribe = () => {
    if (busSubscription) {
      store.removeListener(busSubscription.listenerId);
      onClose();
    }
  };

  return (
    <div
      className="port-context-menu"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1001,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {busSubscription && (
        <div className="port-context-menu-item" onClick={handleUnsubscribe}>
          Disconnect from {busSubscription.busName}
        </div>
      )}
      {!busSubscription && (
        <div className="port-context-menu-item disabled">No bus subscription</div>
      )}
    </div>
  );
}

/**
 * PatchBay renders lanes with blocks.
 * Per lanes-overview.md: visual hierarchy from Scene → Output
 */
export const PatchBay = observer(({ store }: PatchBayProps) => {
  const activeLaneId = store.uiState.activeLaneId;
  const draggingLaneKind = store.uiState.draggingLaneKind;

  // Bus picker state (input ports)
  const [busPickerState, setBusPickerState] = useState<{
    isOpen: boolean;
    portRef: PortRef | null;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    portRef: null,
    position: { x: 0, y: 0 },
  });

  // Publish menu state (output ports)
  const [publishMenuState, setPublishMenuState] = useState<{
    isOpen: boolean;
    portRef: PortRef | null;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    portRef: null,
    position: { x: 0, y: 0 },
  });

  // Context menu state
  const [contextMenuState, setContextMenuState] = useState<{
    isOpen: boolean;
    portRef: PortRef | null;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    portRef: null,
    position: { x: 0, y: 0 },
  });

  // Build port color map for visual connection indication
  const portColorMap = buildPortColorMap(store.connections);

  // Store reference for badge click handler
  if (typeof window !== 'undefined') {
    (window as any).__editorStore__ = store;
  }

  // Get bus subscription for an input port
  const getInputBusSubscription = (blockId: string, slotId: string): { busName: string; listenerId: string } | null => {
    const listener = store.listeners.find(
      (l) => l.to.blockId === blockId && l.to.port === slotId && l.enabled
    );
    if (!listener) return null;

    const bus = store.buses.find((b) => b.id === listener.busId);
    if (!bus) return null;

    return {
      busName: bus.name,
      listenerId: listener.id,
    };
  };

  // Get bus publications for an output port
  const getOutputBusPublications = (blockId: string, slotId: string): Array<{ publisherId: string; busId: string; busName: string }> => {
    const publishers = store.publishers.filter(
      (p) => p.from.blockId === blockId && p.from.port === slotId
    );

    return publishers.map((pub) => {
      const bus = store.buses.find((b) => b.id === pub.busId);
      return {
        publisherId: pub.id,
        busId: pub.busId,
        busName: bus?.name || 'Unknown',
      };
    });
  };

  // Handle binding slot click (opens bus picker for input ports)
  const handleInputBindingSlotClick = (e: React.MouseEvent, portRef: PortRef) => {
    setBusPickerState({
      isOpen: true,
      portRef,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  // Handle send affordance click (opens publish menu for output ports)
  const handleOutputSendAffordanceClick = (e: React.MouseEvent, portRef: PortRef) => {
    setPublishMenuState({
      isOpen: true,
      portRef,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  // Handle port right-click (opens context menu)
  const handlePortContextMenu = (e: React.MouseEvent, portRef: PortRef) => {
    e.preventDefault();
    e.stopPropagation();

    // Only show context menu for input ports with bus subscription
    if (portRef.direction === 'input') {
      const subscription = getInputBusSubscription(portRef.blockId, portRef.slotId);
      setContextMenuState({
        isOpen: true,
        portRef,
        position: { x: e.clientX, y: e.clientY },
      });
    }
  };

  // Click anywhere in patch-bay (except ports/blocks which stop propagation) clears selections
  const handleBackgroundClick = () => {
    // Clear port selection - blocks already clear this via selectBlock
    // This handles clicks on lane backgrounds, headers, empty areas, etc.
    if (store.uiState.selectedPort) {
      store.setSelectedPort(null);
    }

    // Close context menu
    if (contextMenuState.isOpen) {
      setContextMenuState({ isOpen: false, portRef: null, position: { x: 0, y: 0 } });
    }
  };

  const currentContextMenuSubscription = contextMenuState.portRef
    ? getInputBusSubscription(contextMenuState.portRef.blockId, contextMenuState.portRef.slotId)
    : null;

  return (
    <div className="patch-bay" onClick={handleBackgroundClick}>
      <LayoutSelector store={store} />
      <div className="patch-bay-lanes" onClick={handleBackgroundClick}>
        {store.lanes.map((lane) => (
          <DroppableLane
            key={lane.id}
            store={store}
            lane={lane}
            isActive={lane.id === activeLaneId}
            isSuggested={draggingLaneKind !== null && lane.kind === draggingLaneKind}
            portColorMap={portColorMap}
            onInputBindingSlotClick={handleInputBindingSlotClick}
            getInputBusSubscription={getInputBusSubscription}
            onOutputSendAffordanceClick={handleOutputSendAffordanceClick}
            getOutputBusPublications={getOutputBusPublications}
          />
        ))}
      </div>

      {/* Bus picker dropdown (input ports) */}
      {busPickerState.portRef && (
        <BusPicker
          store={store}
          isOpen={busPickerState.isOpen}
          onClose={() => setBusPickerState({ isOpen: false, portRef: null, position: { x: 0, y: 0 } })}
          portRef={busPickerState.portRef}
          position={busPickerState.position}
        />
      )}

      {/* Publish menu (output ports) */}
      {publishMenuState.portRef && (
        <PublishMenu
          store={store}
          isOpen={publishMenuState.isOpen}
          onClose={() => setPublishMenuState({ isOpen: false, portRef: null, position: { x: 0, y: 0 } })}
          portRef={publishMenuState.portRef}
          position={publishMenuState.position}
        />
      )}

      {/* Port context menu */}
      <PortContextMenu
        store={store}
        isOpen={contextMenuState.isOpen}
        position={contextMenuState.position}
        portRef={contextMenuState.portRef}
        onClose={() => setContextMenuState({ isOpen: false, portRef: null, position: { x: 0, y: 0 } })}
        busSubscription={currentContextMenuSubscription}
      />
    </div>
  );
});
