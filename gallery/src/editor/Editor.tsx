/**
 * Editor Component
 *
 * Main editor container with multi-panel layout:
 * - Top: SettingsToolbar (with Save/Load/Export + StatusBadge)
 * - Left: BlockLibrary + Inspector
 * - Center: Preview + PatchBay + BusBoard
 * - Right: Control Surface
 */

import { observer } from 'mobx-react-lite';
import { useMemo, useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  pointerWithin,
} from '@dnd-kit/core';
import { EditorStore } from './store';
import { BlockLibrary } from './BlockLibrary';
import { PatchBay } from './PatchBay';
import { Inspector } from './Inspector';
import { LogWindow } from './LogWindow';
import { PreviewPanel } from './PreviewPanel';
import { SettingsToolbar } from './SettingsToolbar';
import { ContextMenu } from './ContextMenu';
import { PathManagerModal } from './PathManagerModal';
import { BusBoard } from './BusBoard';
import { createCompilerService, setupAutoCompile } from './compiler';
import { ControlSurfaceStore, ControlSurfacePanel, generateSurfaceForMacro } from './controlSurface';
import type { BlockDefinition } from './blocks';
import type { LaneId } from './types';
import './Editor.css';
import { HelpCenterModal } from './HelpCenter';

type HelpTopic = 'intro' | 'library' | 'inspector' | 'preview' | 'patch' | 'controlSurface';
const TOUR_COMPLETE_KEY = 'loom-editor-tour-complete';

interface HelpModalProps {
  topic: HelpTopic;
  onClose: () => void;
}

function HelpModal({ topic, onClose }: HelpModalProps) {
  const steps: { title: string; body: React.ReactNode }[] =
    topic === 'intro'
      ? [
          {
            title: 'Welcome to the Loom Editor',
            body: (
              <>
                <p>
                  This editor is a visual playground for procedural SVG animations. Instead of keyframes on a timeline,
                  you connect blocks that describe <strong>where</strong> elements come from, <strong>how</strong> they move,
                  and <strong>how</strong> they look.
                </p>
                <p>
                  You are always looking at a live program: change a block, and the preview updates within a moment.
                </p>
              </>
            ),
          },
          {
            title: 'Library: your block palette',
            body: (
              <ul>
                <li>On the left, the Library holds Sources, Fields, Time, Compose, Render, and ✨ Macros.</li>
                <li>Drag blocks into lanes in the Patch to start building an animation.</li>
                <li>Start with a macro, then tweak or replace its pieces as you learn.</li>
              </ul>
            ),
          },
          {
            title: 'Patch: the animation graph',
            body: (
              <ul>
                <li>The center lanes show how data flows: Scene → Phase → Fields → Spec → Program.</li>
                <li>Connect outputs to inputs to move scenes, fields, and signals through the graph.</li>
                <li>Think of it as a visual program where wires show the "why" behind the motion.</li>
              </ul>
            ),
          },
          {
            title: 'Preview & Control Surface',
            body: (
              <ul>
                <li>The right side shows the live animation and key controls.</li>
                <li>Use Play, Scrub, Seed, and Speed to explore time and variation.</li>
                <li>The Control Surface groups important knobs so you can play without diving into every block.</li>
              </ul>
            ),
          },
          {
            title: 'Try this right now',
            body: (
              <ul>
                <li>Open the <strong>Demos</strong> menu (top center) and load <em>Full Pipeline</em> or <em>Particles</em>.</li>
                <li>Watch how blocks land in lanes, then tweak parameters in the Inspector.</li>
                <li>Change the <strong>seed</strong> and <strong>speed</strong> in the Preview to explore variations.</li>
              </ul>
            ),
          },
        ]
      : topic === 'library'
        ? [
            {
              title: 'Library: building blocks',
              body: (
                <>
                  <p>
                    The Library is your palette of building blocks. Each block does one thing well: load a Scene, generate per-element Fields,
                    define timing, compose motion, or render output.
                  </p>
                  <ul>
                    <li>Drag blocks from the Library into lanes in the Patch.</li>
                    <li>Use the lane filter and categories to find Sources, Fields, Time, Compose, Render, and Macros.</li>
                    <li>Try dropping a ✨ macro first, then tweak or replace its pieces.</li>
                  </ul>
                </>
              ),
            },
          ]
        : topic === 'inspector'
          ? [
              {
                title: 'Inspector: tune every block',
                body: (
                  <>
                    <p>
                      The Inspector shows the details for the selected block: its label, description, and parameters. This is where you fine-tune
                      numbers, toggles, colors, and dropdowns.
                    </p>
                    <ul>
                      <li>Click a block in the Patch to inspect it.</li>
                      <li>Adjust parameters and watch the Preview update.</li>
                      <li>Rename blocks to keep complex patches readable.</li>
                    </ul>
                  </>
                ),
              },
            ]
          : topic === 'preview'
            ? [
                {
                  title: 'Preview: see time come alive',
                  body: (
                    <>
                      <p>
                        The Preview runs your compiled program. It&apos;s the live result of your patch, updated as you edit.
                      </p>
                      <ul>
                        <li>Use play / pause and the scrubber to explore time.</li>
                        <li>Change <strong>seed</strong> to get new random variations of the same rules.</li>
                        <li>Watch the ⏱ / ∞ indicator to see whether your program is finite or ambient.</li>
                      </ul>
                    </>
                  ),
                },
              ]
            : topic === 'patch'
              ? [
                  {
                    title: 'Patch: the graph of your animation',
                    body: (
                      <>
                        <p>
                          The Patch is where you connect blocks into a graph. Lanes organize blocks by role: Scene, Phase, Fields, Spec, Program, Output.
                        </p>
                        <ul>
                          <li>Drag from the Library into lanes; wires flow left-to-right.</li>
                          <li>Connect outputs to inputs to move data between blocks.</li>
                          <li>Use lane descriptions and type hints to keep structure clear.</li>
                        </ul>
                      </>
                    ),
                  },
                ]
              : [
                  {
                    title: 'Control Surface: macro-level controls',
                    body: (
                      <>
                        <p>
                          The Control Surface groups important parameters from multiple blocks into a single panel. It&apos;s designed for live tweaking
                          and sharing patches with less technical users.
                        </p>
                        <ul>
                          <li>When you load a macro, its key controls appear here as knobs, sliders, and toggles.</li>
                          <li>Use it to explore a patch without diving into every individual block.</li>
                          <li>You can still refine details via the Inspector when you need to.</li>
                        </ul>
                      </>
                    ),
                  },
                ];

  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const pointers:
    | { id: 'library' | 'inspector' | 'preview' | 'patch' | 'control'; label: string }[]
    = (() => {
      if (topic === 'intro') {
        if (stepIndex === 1) {
          return [{ id: 'library', label: 'Library' }];
        }
        if (stepIndex === 2) {
          return [{ id: 'patch', label: 'Patch' }];
        }
        if (stepIndex === 3) {
          return [
            { id: 'preview', label: 'Preview' },
            { id: 'control', label: 'Control Surface' },
          ];
        }
        if (stepIndex === 4) {
          return [
            { id: 'patch', label: 'Follow the wiring here' },
            { id: 'preview', label: 'Watch changes here' },
          ];
        }
        return [];
      }
      if (topic === 'library') return [{ id: 'library', label: 'Library' }];
      if (topic === 'inspector') return [{ id: 'inspector', label: 'Inspector' }];
      if (topic === 'preview') return [{ id: 'preview', label: 'Preview' }];
      if (topic === 'patch') return [{ id: 'patch', label: 'Patch' }];
      if (topic === 'controlSurface') return [{ id: 'control', label: 'Control Surface' }];
      return [];
    })();

  const [pointerStyles, setPointerStyles] = useState<Record<string, React.CSSProperties>>({});

  useEffect(() => {
    if (pointers.length === 0) {
      setPointerStyles({});
      return;
    }

    const nextStyles: Record<string, React.CSSProperties> = {};
    const selectorMap: Record<string, string> = {
      library: '.library-panel',
      inspector: '.inspector-panel',
      preview: '.editor-preview',
      patch: '.editor-patch',
      control: '.editor-control-surface',
    };

    pointers.forEach((ptr) => {
      const selector = selectorMap[ptr.id];
      if (!selector || typeof document === 'undefined') return;
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = Math.max(8, rect.top + window.scrollY - 28);
      const left = rect.left + window.scrollX + rect.width / 2;

      nextStyles[ptr.id] = {
        top,
        left,
        transform: 'translateX(-50%)',
      };
    });

    setPointerStyles(nextStyles);
  }, [topic, stepIndex, pointers.length]);

  return (
    <div className="editor-help-overlay" onClick={onClose}>
      {pointers.map((ptr) => (
        <div
          key={ptr.id}
          className={`editor-help-pointer ${ptr.id}`}
          style={pointerStyles[ptr.id]}
        >
          {ptr.label}
        </div>
      ))}
      <div
        className="editor-help-modal"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="editor-help-header">
          <span className="editor-help-title">{step.title}</span>
          <button className="editor-help-close" onClick={onClose} aria-label="Close help">
            ×
          </button>
        </div>
        <div className="editor-help-body">
          {step.body}
        </div>
        <div className="editor-help-footer">
          <div className="editor-help-steps">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`editor-help-dot ${i === stepIndex ? 'active' : ''}`}
              />
            ))}
          </div>
          <div className="editor-help-buttons">
            {!isFirst && (
              <button
                className="editor-help-btn secondary"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                Back
              </button>
            )}
            {!isLast && (
              <button
                className="editor-help-btn primary"
                onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              >
                Next
              </button>
            )}
            {isLast && (
              <button className="editor-help-btn primary" onClick={onClose}>
                Got it, let&apos;s animate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Trash zone that appears when dragging placed blocks.
 */
function TrashZone({ isVisible }: { isVisible: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'trash-zone',
    data: { type: 'trash' },
  });

  if (!isVisible) return null;

  return (
    <div
      ref={setNodeRef}
      className={`trash-zone ${isOver ? 'trash-zone-active' : ''}`}
    >
      <span className="trash-icon">🗑️</span>
      <span className="trash-label">{isOver ? 'Release to delete' : 'Drop to delete'}</span>
    </div>
  );
}

/**
 * Drag overlay that shows the block being dragged.
 */
function DragOverlayContent({
  definition,
  placedBlockLabel,
  placedBlockColor,
}: {
  definition: BlockDefinition | null;
  placedBlockLabel: string | null;
  placedBlockColor: string | null;
}) {
  const label = definition?.label ?? placedBlockLabel;
  const color = definition?.color ?? placedBlockColor ?? '#666';

  if (!label) return null;

  return (
    <div
      className="drag-overlay-block"
      style={{
        backgroundColor: color,
        padding: '8px 12px',
        borderRadius: '6px',
        color: '#fff',
        fontWeight: 500,
        fontSize: '13px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );
}

/**
 * Editor is the root component for the animation editor.
 */
export const Editor = observer(() => {
  // Create store once (memo to avoid recreating on re-renders)
  const store = useMemo(() => new EditorStore(), []);

  // Create control surface store
  const controlSurfaceStore = useMemo(() => new ControlSurfaceStore(store), [store]);

  // Create compiler service
  const compilerService = useMemo(() => createCompilerService(store), [store]);

  // Layout state
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [leftSplit, setLeftSplit] = useState(0.5); // library vs inspector
  const [centerSplit, setCenterSplit] = useState(0.4); // preview vs patch bay
  const [dragging, setDragging] = useState<null | 'left-split' | 'center-split'>(null);
  const leftColumnRef = useRef<HTMLDivElement | null>(null);
  const centerColumnRef = useRef<HTMLDivElement | null>(null);
  const [helpTopic, setHelpTopic] = useState<HelpTopic | null>(null);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [showHelpNudge, setShowHelpNudge] = useState(false);
  const [helpCenterOpen, setHelpCenterOpen] = useState(false);
  const [isPathsModalOpen, setIsPathsModalOpen] = useState(false);

  // Set up auto-compile on patch changes
  useEffect(() => {
    const dispose = setupAutoCompile(store, compilerService, {
      debounce: 30,
    });
    return dispose;
  }, [store, compilerService]);

  // Allow the editor layout to take the full viewport width/height
  useEffect(() => {
    document.body.classList.add('editor-mode');
    return () => {
      document.body.classList.remove('editor-mode');
    };
  }, []);

  // Help nudge on first visit
  useEffect(() => {
    try {
      const complete = typeof window !== 'undefined' && window.localStorage?.getItem(TOUR_COMPLETE_KEY) === '1';
      setHasCompletedTour(complete);
      if (!complete) {
        setShowHelpNudge(true);
        const timeoutId = window.setTimeout(() => {
          setShowHelpNudge(false);
        }, 3000);
        return () => window.clearTimeout(timeoutId);
      }
    } catch {
      // Ignore storage errors
    }
    return;
  }, []);

  const openTour = (topic: HelpTopic) => {
    setHelpCenterOpen(false);
    setHelpTopic(topic);
    setShowHelpNudge(false);
  };

  // Keyboard shortcut for Path Manager
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsPathsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Drag handles for resizers
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragging === 'left-split' && leftColumnRef.current) {
        const rect = leftColumnRef.current.getBoundingClientRect();
        const ratio = (e.clientY - rect.top) / rect.height;
        setLeftSplit(Math.max(0.2, Math.min(0.8, ratio)));
      }
      if (dragging === 'center-split' && centerColumnRef.current) {
        const rect = centerColumnRef.current.getBoundingClientRect();
        const ratio = (e.clientY - rect.top) / rect.height;
        setCenterSplit(Math.max(0.2, Math.min(0.8, ratio)));
      }
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  // Load a default macro on startup and generate its control surface
  useEffect(() => {
    store.addBlock('macro:radialBurst', 'scene');
    // Generate a default surface for the macro
    // Use setTimeout to ensure blocks are fully populated after macro expansion
    setTimeout(() => {
      const blockIds = new Map<string, string>();
      store.blocks.forEach((block) => {
        blockIds.set(block.type, block.id);
      });
      const surface = generateSurfaceForMacro('radialBurst', blockIds);
      if (surface) {
        controlSurfaceStore.setSurface(surface);
      }
    }, 0);
  }, [store, controlSurfaceStore]);

  // Track active drag state
  const [activeDefinition, setActiveDefinition] = useState<BlockDefinition | null>(null);
  const [activePlacedBlock, setActivePlacedBlock] = useState<{
    label: string;
    color: string;
    blockId: string;
  } | null>(null);

  const isDraggingPlacedBlock = activePlacedBlock !== null;

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === 'library-block') {
      setActiveDefinition(data.definition);
      // Set dragging lane kind for highlighting suggested lanes
      store.setDraggingLaneKind(data.definition?.laneKind ?? null);
    } else if (data?.type === 'patch-block') {
      // Dragging a placed block
      const block = store.blocks.find((b) => b.id === data.blockId);
      if (block) {
        setActivePlacedBlock({
          label: block.label,
          color: getBlockColor(block.type),
          blockId: block.id,
        });
      }
    }
  }

  function getBlockColor(blockType: string): string {
    // Import would create circular dep, so inline the lookup
    const colors: Record<string, string> = {
      Scene: '#4a9eff',
      Fields: '#a855f7',
      Time: '#22c55e',
      Math: '#f59e0b',
      Compose: '#ec4899',
      Render: '#ef4444',
    };
    const block = store.blocks.find((b) => b.type === blockType);
    return colors[block?.category ?? 'Compose'] ?? '#666';
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDefinition(null);
    setActivePlacedBlock(null);
    store.setDraggingLaneKind(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Dropping placed block onto another block (reorder/move)
    if (activeData?.type === 'patch-block' && overData?.type === 'patch-target') {
      const blockId = activeData.blockId as string;
      const sourceLaneId = activeData.sourceLaneId as string;
      const targetLaneId = overData.laneId as LaneId;
      const targetIndex = overData.index as number;

      if (sourceLaneId === targetLaneId) {
        if (activeData.sourceIndex !== targetIndex) {
          store.reorderBlockInLane(blockId, targetIndex);
        }
      } else {
        store.moveBlockToLane(blockId, targetLaneId, targetIndex);
      }
      return;
    }

    // Dropping library block onto a lane
    if (activeData?.type === 'library-block' && overData?.type === 'lane') {
      const blockType = activeData.blockType as string;
      const laneId = (overData.laneId ?? overData.laneName) as LaneId;
      store.addBlock(blockType, laneId);
    }

    // Dropping placed block onto trash
    if (activeData?.type === 'patch-block' && overData?.type === 'trash') {
      const blockId = activeData.blockId as string;
      store.removeBlock(blockId);
    }

    // Dropping placed block onto a lane (move/reorder)
    if (activeData?.type === 'patch-block' && overData?.type === 'lane') {
      const blockId = activeData.blockId as string;
      const sourceLaneId = activeData.sourceLaneId as string;
      const targetLaneId = (overData.laneId ?? overData.laneName) as LaneId;

      if (sourceLaneId !== targetLaneId) {
        // Move to different lane
        store.moveBlockToLane(blockId, targetLaneId);
      }
      // Note: reordering within same lane would need drop position info
      // For now, moving to same lane just keeps it in place
    }
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className={`editor ${dragging ? 'dragging' : ''}`}>
        <SettingsToolbar
          store={store}
          onShowHelp={() => {
            if (hasCompletedTour) {
              setHelpCenterOpen(true);
              setHelpTopic(null);
            } else {
              openTour('intro');
            }
          }}
          onOpenPaths={() => setIsPathsModalOpen(true)}
          isPathsModalOpen={isPathsModalOpen}
          showHelpNudge={showHelpNudge}
        />
        <div className="editor-main">
          <div className="editor-left" ref={leftColumnRef}>
            <div
              className={`left-panel library-panel ${libraryCollapsed ? 'collapsed' : ''}`}
              style={{
                flex: libraryCollapsed
                  ? '0 0 auto'
                  : inspectorCollapsed
                    ? '1 1 0'
                    : `${leftSplit} 1 0`,
              }}
            >
              <div className="panel-header">
                <span className="panel-title">Library</span>
                <div className="panel-header-actions">
                  <button
                    className="panel-help-btn"
                    onClick={() => {
                      setHelpCenterOpen(true);
                      setHelpTopic(null);
                    }}
                    title="What is the Library?"
                  >
                    ?
                  </button>
                  <button
                    className="panel-toggle-btn"
                    onClick={() => setLibraryCollapsed((v) => !v)}
                    title={libraryCollapsed ? 'Show library' : 'Hide library'}
                  >
                    {libraryCollapsed ? 'Show' : 'Hide'}
                  </button>
                </div>
              </div>
              {!libraryCollapsed && <BlockLibrary store={store} />}
            </div>

            {!libraryCollapsed && !inspectorCollapsed && (
              <div
                className="vertical-resizer"
                onMouseDown={() => setDragging('left-split')}
                title="Drag to resize Library / Inspector"
              />
            )}

            <div
              className={`left-panel inspector-panel ${inspectorCollapsed ? 'collapsed' : ''}`}
              style={{
                flex: inspectorCollapsed
                  ? '0 0 auto'
                  : libraryCollapsed
                    ? '1 1 0'
                    : `${1 - leftSplit} 1 0`,
              }}
            >
              <div className="panel-header">
                <span className="panel-title">Inspector</span>
                <div className="panel-header-actions">
                  <button
                    className="panel-help-btn"
                    onClick={() => {
                      setHelpCenterOpen(true);
                      setHelpTopic(null);
                    }}
                    title="What is the Inspector?"
                  >
                    ?
                  </button>
                  <button
                    className="panel-toggle-btn"
                    onClick={() => setInspectorCollapsed((v) => !v)}
                    title={inspectorCollapsed ? 'Show inspector' : 'Hide inspector'}
                  >
                    {inspectorCollapsed ? 'Show' : 'Hide'}
                  </button>
                </div>
              </div>
              {!inspectorCollapsed && (
                <div className="inspector-wrapper">
                  <Inspector store={store} />
                </div>
              )}
            </div>
          </div>

          <div className="editor-center" ref={centerColumnRef}>
            <div className="editor-preview" style={{ flex: centerSplit }}>
              <PreviewPanel
                compilerService={compilerService}
                isPlaying={store.uiState.isPlaying}
                store={store}
                onShowHelp={() => {
                  setHelpCenterOpen(true);
                  setHelpTopic(null);
                }}
              />
            </div>

            <div
              className="horizontal-resizer"
              onMouseDown={() => setDragging('center-split')}
              title="Drag to resize Preview / Patch"
            />

            <div className="editor-patch-container" style={{ flex: 1 - centerSplit }}>
              <div className="editor-patch">
                <div className="panel-header patch-header">
                  <span className="panel-title">Patch</span>
                  <div className="panel-header-actions">
                    <button
                      className="panel-help-btn"
                      onClick={() => {
                        setHelpCenterOpen(true);
                        setHelpTopic(null);
                      }}
                      title="What is the Patch?"
                    >
                      ?
                    </button>
                  </div>
                </div>
                <div className="patch-body">
                  <PatchBay store={store} />
                </div>
              </div>

              <div className="editor-bus-board">
                <BusBoard store={store} />
              </div>
            </div>
          </div>

          <div className="editor-right-panel">
            <div className="editor-control-surface">
              <div className="panel-header">
                <span className="panel-title">Control Surface</span>
                <div className="panel-header-actions">
                  <button
                    className="panel-help-btn"
                    onClick={() => {
                      setHelpCenterOpen(true);
                      setHelpTopic(null);
                    }}
                    title="What is the Control Surface?"
                  >
                    ?
                  </button>
                </div>
              </div>
              <div className="control-surface-body">
                <ControlSurfacePanel store={controlSurfaceStore} />
              </div>
            </div>
          </div>
        </div>

        <LogWindow />

        {/* Trash zone appears when dragging placed blocks */}
        <TrashZone isVisible={isDraggingPlacedBlock} />

        {/* Context menu for right-click actions */}
        <ContextMenu store={store} />
      </div>

      <PathManagerModal
        isOpen={isPathsModalOpen}
        onClose={() => setIsPathsModalOpen(false)}
      />

      {helpTopic && (
        <HelpModal
          topic={helpTopic}
          onClose={() => {
            setHelpTopic(null);
            // Mark tour complete if we just finished the intro tour
            if (!hasCompletedTour && topic === 'intro') {
              setHasCompletedTour(true);
              try {
                if (typeof window !== 'undefined') {
                  window.localStorage?.setItem(TOUR_COMPLETE_KEY, '1');
                }
              } catch {
                // ignore
              }
            }
          }}
        />
      )}

      <HelpCenterModal
        isOpen={helpCenterOpen}
        onClose={() => setHelpCenterOpen(false)}
        onRetakeTour={() => {
          setHelpCenterOpen(false);
          openTour('intro');
        }}
      />

      <DragOverlay dropAnimation={null}>
        <DragOverlayContent
          definition={activeDefinition}
          placedBlockLabel={activePlacedBlock?.label ?? null}
          placedBlockColor={activePlacedBlock?.color ?? null}
        />
      </DragOverlay>
    </DndContext>
  );
});
