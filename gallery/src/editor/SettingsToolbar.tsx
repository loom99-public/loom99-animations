/**
 * Settings Toolbar
 *
 * Top toolbar with dropdowns for editor settings:
 * - Lane layout/mode (Simple vs Advanced)
 * - Connection settings
 * - Palette filtering
 */

import { observer } from 'mobx-react-lite';
import { useState, useRef, useEffect } from 'react';
import type { EditorStore } from './store';
import { PRESET_LAYOUTS } from './laneLayouts';
import { StatusBadge } from './StatusBadge';
import './SettingsToolbar.css';

interface SettingsToolbarProps {
  store: EditorStore;
}

/**
 * Dropdown menu component with icon trigger.
 */
function Dropdown({
  icon,
  label,
  children,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={ref} className="toolbar-dropdown">
      <button
        className={`toolbar-dropdown-trigger ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        title={disabled ? `${label} (coming soon)` : label}
        disabled={disabled}
      >
        <span className="dropdown-icon">{icon}</span>
        <span className="dropdown-label">{label}</span>
        <span className="dropdown-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && !disabled && (
        <div className="toolbar-dropdown-menu">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Menu item component.
 */
function MenuItem({
  label,
  checked,
  onClick,
  disabled = false,
  description,
}: {
  label: string;
  checked?: boolean;
  onClick: () => void;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <button
      className={`dropdown-menu-item ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && onClick()}
      disabled={disabled}
    >
      <span className="menu-item-check">{checked ? '✓' : ''}</span>
      <span className="menu-item-content">
        <span className="menu-item-label">{label}</span>
        {description && <span className="menu-item-description">{description}</span>}
      </span>
    </button>
  );
}

/**
 * Menu divider.
 */
function MenuDivider() {
  return <div className="dropdown-menu-divider" />;
}

/**
 * Menu section header.
 */
function MenuHeader({ children }: { children: React.ReactNode }) {
  return <div className="dropdown-menu-header">{children}</div>;
}

/**
 * Lanes icon (grid/rows).
 */
function LanesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="3" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="1" y="6.5" width="14" height="3" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="1" y="11" width="14" height="3" rx="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Connection icon (nodes connected).
 */
function ConnectionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 8H9.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Filter icon.
 */
function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 4H14M4 8H12M6 12H10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Play/Demo icon.
 */
function DemoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 3L13 8L4 13V3Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Settings Toolbar component.
 */
export const SettingsToolbar = observer(({ store }: SettingsToolbarProps) => {
  const currentLayout = store.currentLayout;

  return (
    <div className="settings-toolbar">
      <div className="toolbar-left">
        <span className="toolbar-title">Loom Editor</span>
      </div>

      <div className="toolbar-center">
        {/* Lane Layout Dropdown */}
        <Dropdown icon={<LanesIcon />} label="Lanes">
          <MenuHeader>Layout Preset</MenuHeader>
          {PRESET_LAYOUTS.map((layout) => (
            <MenuItem
              key={layout.id}
              label={layout.name}
              description={layout.description}
              checked={currentLayout.id === layout.id}
              onClick={() => store.switchLayout(layout.id)}
            />
          ))}
          <MenuDivider />
          <MenuHeader>Mode</MenuHeader>
          <MenuItem
            label="Simple Mode"
            description="Fixed lane structure, guided workflow"
            checked={!store.settings.advancedLaneMode}
            onClick={() => store.setAdvancedLaneMode(false)}
          />
          <MenuItem
            label="Advanced Mode"
            description="Customize lanes freely"
            checked={store.settings.advancedLaneMode}
            onClick={() => store.setAdvancedLaneMode(true)}
            disabled={true}
          />
        </Dropdown>

        {/* Connection Settings Dropdown */}
        <Dropdown icon={<ConnectionIcon />} label="Connections">
          <MenuHeader>Auto-Connect</MenuHeader>
          <MenuItem
            label="Auto-connect on drop"
            description="Wire obvious connections automatically"
            checked={store.settings.autoConnect}
            onClick={() => store.setAutoConnect(!store.settings.autoConnect)}
            disabled={true}
          />
          <MenuDivider />
          <MenuHeader>Display</MenuHeader>
          <MenuItem
            label="Show type hints"
            description="Display port types on hover"
            checked={store.settings.showTypeHints}
            onClick={() => store.setShowTypeHints(!store.settings.showTypeHints)}
          />
          <MenuItem
            label="Highlight compatible"
            description="Glow compatible ports when dragging"
            checked={store.settings.highlightCompatible}
            onClick={() => store.setHighlightCompatible(!store.settings.highlightCompatible)}
          />
          <MenuItem
            label="Warn before disconnect"
            description="Show confirmation when disconnecting"
            checked={store.settings.warnBeforeDisconnect}
            onClick={() => store.setWarnBeforeDisconnect(!store.settings.warnBeforeDisconnect)}
          />
        </Dropdown>

        {/* Palette Filtering Dropdown */}
        <Dropdown icon={<FilterIcon />} label="Palette">
          <MenuHeader>Filtering</MenuHeader>
          <MenuItem
            label="Filter by lane"
            description="Show blocks matching lane type"
            checked={store.settings.filterByLane}
            onClick={() => store.setFilterByLane(!store.settings.filterByLane)}
          />
          <MenuItem
            label="Filter by connection"
            description="Show blocks that can connect to selection"
            checked={store.settings.filterByConnection}
            onClick={() => store.setFilterByConnection(!store.settings.filterByConnection)}
          />
          <MenuDivider />
          <MenuHeader>Display</MenuHeader>
          <MenuItem
            label="Show all blocks"
            description="Always show full library"
            checked={!store.settings.filterByLane && !store.settings.filterByConnection}
            onClick={() => {
              store.setFilterByLane(false);
              store.setFilterByConnection(false);
            }}
          />
        </Dropdown>

        {/* Demos Dropdown */}
        <Dropdown icon={<DemoIcon />} label="Demos">
          <MenuHeader>Load Demo</MenuHeader>
          <MenuItem
            label="Full Pipeline"
            description="Scene → Fields → Phase → Transport"
            onClick={() => store.loadDemoAnimation('fullPipeline')}
          />
          <MenuItem
            label="Line Drawing"
            description="Animated stroke paths"
            onClick={() => store.loadDemoAnimation('lineDrawing')}
          />
          <MenuItem
            label="Particles"
            description="Orbiting particle system"
            onClick={() => store.loadDemoAnimation('particles')}
          />
          <MenuItem
            label="Math + Oscillator"
            description="Constants wired to oscillating dot"
            onClick={() => store.loadDemoAnimation('math')}
          />
          <MenuDivider />
          <MenuHeader>Patch</MenuHeader>
          <MenuItem
            label="Clear All"
            description="Remove all blocks and connections"
            onClick={() => store.clearPatch()}
          />
        </Dropdown>
      </div>

      <div className="toolbar-right">
        <button
          className="toolbar-clear-btn"
          onClick={() => store.clearPatch()}
          title="Clear all blocks and connections"
        >
          Clear All
        </button>

        {/* Action buttons - disabled until Phase 6 */}
        <button
          className="toolbar-action-btn"
          disabled
          title="Save patch (Phase 6)"
        >
          Save
        </button>
        <button
          className="toolbar-action-btn"
          disabled
          title="Load patch (Phase 6)"
        >
          Load
        </button>
        <button
          className="toolbar-action-btn"
          disabled
          title="Export animation (Phase 6)"
        >
          Export
        </button>

        <div className="toolbar-divider" />

        <StatusBadge />

        <span className="toolbar-status">
          {store.blocks.length} blocks · {store.connections.length} connections
        </span>
      </div>
    </div>
  );
});
