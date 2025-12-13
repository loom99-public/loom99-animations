/**
 * Inspector Component
 *
 * Property editor for selected block (right panel).
 */

import { observer } from 'mobx-react-lite';
import type { EditorStore } from './store';
import { getBlockDefinition } from './blocks';
import './Inspector.css';

interface InspectorProps {
  store: EditorStore;
}

/**
 * Inspector displays and edits parameters of selected block.
 */
export const Inspector = observer(({ store }: InspectorProps) => {
  const block = store.selectedBlock;

  if (!block) {
    return (
      <div className="inspector">
        <div className="inspector-empty">
          <p>No block selected</p>
          <p className="inspector-hint">Click a block in the patch bay to edit its properties</p>
        </div>
      </div>
    );
  }

  const definition = getBlockDefinition(block.type);
  const blockColor = definition?.color ?? '#666';

  return (
    <div className="inspector">
      <div className="inspector-header" style={{ borderLeftColor: blockColor }}>
        <h2>{block.label}</h2>
        <div className="block-meta">
          <span className="block-id">{block.id}</span>
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
              {Object.entries(block.params).map(([key, value]) => (
                <div key={key} className="param-item">
                  <label className="param-label">{key}</label>
                  <div className="param-value">
                    {typeof value === 'boolean' ? (
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
                        step={value < 1 ? 0.1 : 1}
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
              ))}
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
