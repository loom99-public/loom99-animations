/**
 * LayoutSelector Component
 *
 * Dropdown to switch between lane layouts.
 */

import { observer } from 'mobx-react-lite';
import type { EditorStore } from './store';
import './LayoutSelector.css';

interface LayoutSelectorProps {
  store: EditorStore;
}

export const LayoutSelector = observer(({ store }: LayoutSelectorProps) => {
  const currentLayout = store.currentLayout;
  const layouts = store.availableLayouts;

  return (
    <div className="layout-selector">
      <label className="layout-label">Layout:</label>
      <select
        className="layout-select"
        value={currentLayout.id}
        onChange={(e) => store.switchLayout(e.target.value)}
      >
        {layouts.map((layout) => (
          <option key={layout.id} value={layout.id}>
            {layout.name}
          </option>
        ))}
      </select>
      <span className="layout-hint" title={currentLayout.description}>
        ?
      </span>
    </div>
  );
});
