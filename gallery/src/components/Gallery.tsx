/**
 * Gallery - Main gallery container
 */

import { observer } from 'mobx-react-lite';
import { galleryStore } from '../stores/galleryStore';
import { TechniqueSection } from './TechniqueSection';

export const Gallery = observer(() => {
  const techniques = galleryStore.allTechniques;

  const handleExpandAll = () => {
    galleryStore.expandAll();
  };

  const handleCollapseAll = () => {
    galleryStore.collapseAll();
  };

  return (
    <div className="gallery-container">
      <header className="gallery-header">
        <h1>loom99 Animation Gallery</h1>
        <p className="gallery-subtitle">
          Explore 10 animation techniques with logo and text variations
        </p>
        <div className="gallery-controls">
          <button className="btn btn-secondary" onClick={handleExpandAll}>
            Expand All
          </button>
          <button className="btn btn-secondary" onClick={handleCollapseAll}>
            Collapse All
          </button>
        </div>
      </header>

      <div className="gallery-content">
        {techniques.map((technique) => (
          <TechniqueSection key={technique.id} technique={technique} />
        ))}
      </div>

      <footer className="gallery-footer">
        <p>Built with React + Vite + TypeScript</p>
      </footer>
    </div>
  );
});
